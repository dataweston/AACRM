"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ChangeEvent, ClipboardEvent, DragEvent, KeyboardEvent } from "react";
import { Apple, Globe, Mail, Phone, Search, Sparkles } from "lucide-react";
import { ClientForm } from "@/components/crm/client-form";
import { EventForm } from "@/components/crm/event-form";
import { InvoiceForm } from "@/components/crm/invoice-form";
import { VendorForm } from "@/components/crm/vendor-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useCrmData } from "@/hooks/use-crm-data";
import { formatCurrency, formatDate } from "@/lib/format";
import type { Client, Event as EventRecord, Invoice, Vendor } from "@/types/crm";
import { cn } from "@/lib/utils";
import { useAuth } from "@/components/auth/auth-provider";

const CLIENT_PIPELINE: { id: Client["status"]; label: string; accent: string }[] = [
  { id: "lead", label: "Leads", accent: "bg-amber-100 text-amber-800" },
  { id: "booked", label: "Booked", accent: "bg-emerald-100 text-emerald-700" },
  { id: "planning", label: "Planning", accent: "bg-sky-100 text-sky-700" },
  { id: "completed", label: "Wrapped", accent: "bg-rose-100 text-rose-700" },
];

const invoiceStatusStyles: Record<Invoice["status"], string> = {
  draft: "bg-muted text-muted-foreground",
  sent: "bg-secondary text-secondary-foreground",
  paid: "bg-emerald-100 text-emerald-700",
  overdue: "bg-destructive/20 text-destructive",
};

const clientStatusLabels: Record<Client["status"], string> = {
  lead: "Lead",
  booked: "Booked",
  planning: "In planning",
  completed: "Completed",
};

const eventStatusLabels: Record<EventRecord["status"], string> = {
  contacted: "Contacted",
  bid: "Bid sent",
  confirmed: "Confirmed",
};

const preferredContactLabels: Record<NonNullable<Vendor["preferredContact"]>, string> = {
  email: "Email",
  phone: "Phone",
  text: "Text",
};

export default function HomePage() {
  const {
    data,
    isHydrated,
    addClient,
    updateClient,
    deleteClient,
    addVendor,
    updateVendor,
    deleteVendor,
    addEvent,
    updateEvent,
    deleteEvent,
    addInvoice,
    updateInvoice,
    deleteInvoice,
  } = useCrmData();
  const [activeTab, setActiveTab] = useState("overview");
  const [vendorSearch, setVendorSearch] = useState("");
  const [vendorServiceFilter, setVendorServiceFilter] = useState<string>("all");
  const [editingClientId, setEditingClientId] = useState<string | null>(null);
  const [editingVendorId, setEditingVendorId] = useState<string | null>(null);
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [editingInvoiceId, setEditingInvoiceId] = useState<string | null>(null);
  const [recordsTab, setRecordsTab] = useState<"clients" | "events" | "vendors">("clients");
  const handleRecordsTabChange = useCallback((value: string) => {
    if (value === "clients" || value === "events" || value === "vendors") {
      setRecordsTab(value);
    }
  }, []);
  const [isOffline, setIsOffline] = useState(false);
  const { session, status, signInWithApple, signOut } = useAuth();
  const [appleName, setAppleName] = useState("");
  const [appleEmail, setAppleEmail] = useState("");
  const [appleError, setAppleError] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const updateStatus = () => {
      setIsOffline(!window.navigator.onLine);
    };

    updateStatus();
    window.addEventListener("online", updateStatus);
    window.addEventListener("offline", updateStatus);

    return () => {
      window.removeEventListener("online", updateStatus);
      window.removeEventListener("offline", updateStatus);
    };
  }, []);
  const [draggingClientId, setDraggingClientId] = useState<string | null>(null);
  const [activeDropColumn, setActiveDropColumn] = useState<Client["status"] | null>(null);
  const [isImportDragActive, setIsImportDragActive] = useState(false);
  const [importSummary, setImportSummary] = useState<string | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [, setDropzoneDepth] = useState(0);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const editingClient = useMemo(
    () => (editingClientId ? data.clients.find((client) => client.id === editingClientId) ?? null : null),
    [data.clients, editingClientId]
  );
  const editingVendor = useMemo(
    () => (editingVendorId ? data.vendors.find((vendor) => vendor.id === editingVendorId) ?? null : null),
    [data.vendors, editingVendorId]
  );
  const editingEvent = useMemo(
    () => (editingEventId ? data.events.find((event) => event.id === editingEventId) ?? null : null),
    [data.events, editingEventId]
  );
  const editingInvoice = useMemo(
    () => (editingInvoiceId ? data.invoices.find((invoice) => invoice.id === editingInvoiceId) ?? null : null),
    [data.invoices, editingInvoiceId]
  );

  const confirmRemoval = (message: string) =>
    typeof window === "undefined" ? true : window.confirm(message);

  const handleClientSubmit = (values: Omit<Client, "id">, id?: string) => {
    if (id) {
      updateClient(id, values);
      setEditingClientId(null);
    } else {
      addClient(values);
    }
  };

  const handleClientDelete = (id: string) => {
    if (!confirmRemoval("Delete this client? This action cannot be undone.")) {
      return;
    }
    deleteClient(id);
    setEditingClientId((current) => (current === id ? null : current));
  };

  const handleEventEditRequest = (eventId: string) => {
    if (!eventId) return;
    setEditingEventId(eventId);
    setRecordsTab("events");
    setActiveTab("records");
  };

  const handleClientEditRequest = (clientId: string) => {
    if (!clientId) return;
    setEditingClientId(clientId);
    setRecordsTab("clients");
    setActiveTab("records");
  };

  const isClientDrag = (event: DragEvent<HTMLElement>) => {
    const transfer = event.dataTransfer;
    if (!transfer) return false;
    return Array.from(transfer.types ?? []).includes("application/aacrm-client-id");
  };

  const handleDragStart = (event: DragEvent<HTMLDivElement>, clientId: string) => {
    setDraggingClientId(clientId);
    event.dataTransfer.setData("application/aacrm-client-id", clientId);
    event.dataTransfer.effectAllowed = "move";
  };

  const handleDragEnd = () => {
    setDraggingClientId(null);
    setActiveDropColumn(null);
  };

  const handleColumnDragOver = (event: DragEvent<HTMLDivElement>, status: Client["status"]) => {
    if (!isClientDrag(event)) return;
    event.preventDefault();
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = "move";
    }
    setActiveDropColumn(status);
  };

  const handleColumnDragLeave = (event: DragEvent<HTMLDivElement>, status: Client["status"]) => {
    if (!isClientDrag(event)) return;
    if (!event.currentTarget.contains(event.relatedTarget as Node)) {
      setActiveDropColumn((current) => (current === status ? null : current));
    }
  };

  const handleColumnDrop = (event: DragEvent<HTMLDivElement>, status: Client["status"]) => {
    if (!isClientDrag(event)) return;
    event.preventDefault();
    const clientId = event.dataTransfer.getData("application/aacrm-client-id");
    setActiveDropColumn(null);
    setDraggingClientId(null);
    if (!clientId) return;
    const client = data.clients.find((entry) => entry.id === clientId);
    if (!client || client.status === status) {
      return;
    }
    const { id: _clientId, ...clientWithoutId } = client;
    void _clientId;
    updateClient(clientId, { ...clientWithoutId, status });
  };

  const normalizeStatus = (value?: string): Client["status"] => {
    if (!value) return "lead";
    const normalized = value.trim().toLowerCase();
    if (["lead", "booked", "planning", "completed"].includes(normalized)) {
      return normalized as Client["status"];
    }
    if (normalized.includes("book")) return "booked";
    if (normalized.includes("plan")) return "planning";
    if (normalized.includes("wrap") || normalized.includes("complete")) return "completed";
    return "lead";
  };

  const parseDateValue = (value?: string) => {
    if (!value) return undefined;
    const trimmed = value.trim();
    if (!trimmed) return undefined;
    const parsed = new Date(trimmed);
    if (Number.isNaN(parsed.getTime())) return undefined;
    return parsed.toISOString().slice(0, 10);
  };

  const parseBudgetValue = (value?: string) => {
    if (!value) return undefined;
    const cleaned = value.replace(/[^0-9.,-]/g, "").replace(/,/g, "");
    if (!cleaned) return undefined;
    const amount = Number.parseFloat(cleaned);
    return Number.isNaN(amount) ? undefined : amount;
  };

  const splitLine = (line: string) => {
    const pipeParts = line.split("|").map((part) => part.trim()).filter(Boolean);
    if (pipeParts.length > 1) return pipeParts;
    const commaParts = line.split(",").map((part) => part.trim()).filter((part) => part.length > 0);
    if (commaParts.length > 1) return commaParts;
    const dashParts = line.split(" - ").map((part) => part.trim()).filter(Boolean);
    if (dashParts.length > 1) return dashParts;
    return [line.trim()];
  };

  const parseClientsFromText = (text: string) => {
    const created: Omit<Client, "id">[] = [];
    const skipped: string[] = [];

    text
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line.length > 0)
      .forEach((line) => {
        const fields = splitLine(line).map((field) => field.replace(/\t+/g, " ").trim());
        if (fields.length === 0 || !fields[0]) {
          skipped.push(line);
          return;
        }

        const [name, email = "", phone, statusRaw, eventDateRaw, budgetRaw, ...notesParts] = fields;
        const notes = notesParts.join(", ").trim();

        if (!name) {
          skipped.push(line);
          return;
        }

        created.push({
          name,
          email,
          phone: phone && phone.length > 0 ? phone : undefined,
          status: normalizeStatus(statusRaw),
          eventDate: parseDateValue(eventDateRaw),
          budget: parseBudgetValue(budgetRaw),
          notes: notes.length > 0 ? notes : undefined,
        });
      });

    return { created, skipped };
  };

  const readFileAsText = (file: File) =>
    new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(typeof reader.result === "string" ? reader.result : "");
      reader.onerror = () => reject(reader.error);
      reader.readAsText(file);
    });

  const processImportPayload = async (files: File[], plainText: string) => {
    try {
      setImportSummary(null);
      setImportError(null);

      const textFragments: string[] = [];

      if (plainText) {
        textFragments.push(plainText);
      }

      for (const file of files) {
        if (file.type.startsWith("text/") || /\.(txt|csv)$/i.test(file.name)) {
          const content = await readFileAsText(file);
          if (content) {
            textFragments.push(content);
          }
        } else {
          setImportError("Only text drops or .txt/.csv files are supported.");
          return;
        }
      }

      const combined = textFragments.join("\n");
      if (!combined.trim()) {
        setImportError("Drop text snippets or text files to import clients.");
        return;
      }

      const { created, skipped } = parseClientsFromText(combined);

      if (created.length === 0) {
        setImportError("No recognizable client rows were found in that drop.");
        return;
      }

      created.forEach((client) => addClient(client));

      const summary: string[] = [];
      summary.push(`Added ${created.length} client${created.length === 1 ? "" : "s"}.`);
      if (skipped.length > 0) {
        summary.push(`Skipped ${skipped.length} line${skipped.length === 1 ? "" : "s"} that we couldn't parse.`);
      }
      setImportSummary(summary.join(" "));
      if (skipped.length > 0) {
        setImportError("Some lines were skipped. Confirm they follow the Name | Email | Phone | Status pattern.");
      }
    } catch (error) {
      console.error("Failed to import dropped text", error);
      setImportError("We couldn't process that drop. Please try again with a text snippet or .txt file.");
    }
  };

  const handleImportDrop = (event: DragEvent<HTMLDivElement>) => {
    if (isClientDrag(event)) return;
    event.preventDefault();
    event.stopPropagation();
    setIsImportDragActive(false);
    setDropzoneDepth(0);

    const dataTransfer = event.dataTransfer;
    const files = Array.from(dataTransfer?.files ?? []);
    const plainText = dataTransfer?.getData("text/plain") ?? "";

    void processImportPayload(files, plainText);
  };

  const handleImportDragOver = (event: DragEvent<HTMLDivElement>) => {
    if (isClientDrag(event)) return;
    event.preventDefault();
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = "copy";
    }
    setIsImportDragActive(true);
  };

  const handleImportDragEnter = (event: DragEvent<HTMLDivElement>) => {
    if (isClientDrag(event)) return;
    event.preventDefault();
    setDropzoneDepth((depth) => depth + 1);
    setIsImportDragActive(true);
  };

  const handleImportDragLeave = (event: DragEvent<HTMLDivElement>) => {
    if (isClientDrag(event)) return;
    event.preventDefault();
    setDropzoneDepth((depth) => {
      const next = Math.max(0, depth - 1);
      if (next === 0) {
        setIsImportDragActive(false);
      }
      return next;
    });
  };

  const handleImportFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const fileList = event.target.files;
    const files = fileList ? Array.from(fileList) : [];
    if (files.length === 0) {
      event.target.value = "";
      return;
    }

    void processImportPayload(files, "");
    event.target.value = "";
  };

  const handleImportPaste = (event: ClipboardEvent<HTMLDivElement>) => {
    const clipboard = event.clipboardData;
    if (!clipboard) return;

    const text = clipboard.getData("text/plain") || clipboard.getData("text") || "";
    const files = Array.from(clipboard.files ?? []);

    if (!text && files.length === 0) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    void processImportPayload(files, text);
  };

  const handleImportZoneClick = () => {
    setImportError(null);
    setImportSummary(null);
    fileInputRef.current?.click();
  };

  const handleImportZoneKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      handleImportZoneClick();
    }
  };

  const handleVendorSubmit = (values: Omit<Vendor, "id">, id?: string) => {
    if (id) {
      updateVendor(id, values);
      setEditingVendorId(null);
    } else {
      addVendor(values);
    }
  };

  const handleVendorDelete = (id: string) => {
    if (!confirmRemoval("Remove this vendor from your roster?")) {
      return;
    }
    deleteVendor(id);
    setEditingVendorId((current) => (current === id ? null : current));
  };

  const handleEventSubmit = (values: Omit<EventRecord, "id">, id?: string) => {
    if (id) {
      updateEvent(id, values);
      setEditingEventId(null);
    } else {
      addEvent(values);
    }
  };

  const handleEventDelete = (id: string) => {
    if (!confirmRemoval("Delete this event from your production calendar?")) {
      return;
    }
    deleteEvent(id);
    setEditingEventId((current) => (current === id ? null : current));
  };

  const handleInvoiceSubmit = (values: Omit<Invoice, "id">, id?: string) => {
    if (id) {
      updateInvoice(id, values);
      setEditingInvoiceId(null);
    } else {
      addInvoice(values);
    }
  };

  const handleInvoiceDelete = (id: string) => {
    if (!confirmRemoval("Delete this invoice? You can’t undo this.")) {
      return;
    }
    deleteInvoice(id);
    setEditingInvoiceId((current) => (current === id ? null : current));
  };

  const overview = useMemo(() => {
    const vendorCostMap = new Map(data.vendors.map((vendor) => [vendor.id, vendor.cost ?? 0]));
    const confirmedEvents = data.events.filter((event) => event.status === "confirmed");
    const totalConfirmedEstimate = confirmedEvents.reduce(
      (sum, event) => sum + (event.estimate ?? 0),
      0
    );
    const totalConfirmedDeposits = confirmedEvents.reduce(
      (sum, event) => sum + (event.deposit ?? 0),
      0
    );
    const pipelineConfirmed = Math.max(totalConfirmedEstimate - totalConfirmedDeposits, 0);
    const confirmedVendorCost = confirmedEvents.reduce((sum, event) => {
      const eventVendorCost = (event.vendorIds ?? []).reduce(
        (vendorSum, vendorId) => vendorSum + (vendorCostMap.get(vendorId) ?? 0),
        0
      );
      return sum + eventVendorCost;
    }, 0);
    const confirmedAfterVendorCost = Math.max(pipelineConfirmed - confirmedVendorCost, 0);
    const pipelineProposed = data.events
      .filter((event) => event.status !== "confirmed")
      .reduce((sum, event) => sum + (event.estimate ?? 0), 0);
    const pipeline = CLIENT_PIPELINE.map((column) => ({
      ...column,
      items: data.clients.filter((client) => client.status === column.id),
    }));

    const upcomingEvents = [...data.events]
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .slice(0, 4);

    const heldDeposits = data.events.reduce(
      (accumulator, event) => {
        if (event.depositPaid && typeof event.deposit === "number") {
          return {
            total: accumulator.total + event.deposit,
            count: accumulator.count + 1,
          };
        }

        return accumulator;
      },
      { total: 0, count: 0 }
    );

    const recentInvoices = [...data.invoices]
      .sort((a, b) => new Date(b.issueDate).getTime() - new Date(a.issueDate).getTime())
      .slice(0, 4);

    return {
      totalClients: data.clients.length,
      pipeline,
      pipelineConfirmed,
      pipelineProposed,
      confirmedAfterVendorCost,
      upcomingEvents,
      heldDeposits: heldDeposits.total,
      heldDepositCount: heldDeposits.count,
      recentInvoices,
    };
  }, [data]);

  const clientMap = useMemo(() => {
    const map = new Map<string, Client>();
    data.clients.forEach((client) => map.set(client.id, client));
    return map;
  }, [data.clients]);

  const vendorMap = useMemo(() => {
    const map = new Map<string, Vendor>();
    data.vendors.forEach((vendor) => map.set(vendor.id, vendor));
    return map;
  }, [data.vendors]);

  const vendorServiceCounts = useMemo(() => {
    const counts = data.vendors.reduce<Record<string, number>>((accumulator, vendor) => {
      const key = vendor.service?.trim() || "Other";
      accumulator[key] = (accumulator[key] ?? 0) + 1;
      return accumulator;
    }, {});

    return Object.entries(counts)
      .map(([service, count]) => ({ service, count }))
      .sort((a, b) => a.service.localeCompare(b.service));
  }, [data.vendors]);

  const filteredVendors = useMemo(() => {
    const searchValue = vendorSearch.trim().toLowerCase();

    return data.vendors.filter((vendor) => {
      const matchesService =
        vendorServiceFilter === "all" || vendor.service.toLowerCase() === vendorServiceFilter.toLowerCase();

      if (!matchesService) {
        return false;
      }

      if (!searchValue) {
        return true;
      }

      const haystack = [vendor.name, vendor.service, vendor.notes]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return haystack.includes(searchValue);
    });
  }, [data.vendors, vendorSearch, vendorServiceFilter]);

  const hasVendorFilters = useMemo(
    () => vendorServiceFilter !== "all" || vendorSearch.trim().length > 0,
    [vendorSearch, vendorServiceFilter]
  );

  const handleResetVendorFilters = () => {
    setVendorSearch("");
    setVendorServiceFilter("all");
  };

  if (status === "loading") {
    return (
      <main className="mx-auto flex min-h-screen max-w-5xl items-center justify-center px-6">
        <Card className="w-full max-w-md border-dashed border-muted-foreground/40 bg-card/70 text-center">
          <CardHeader className="space-y-3">
            <CardTitle className="flex items-center justify-center gap-2 text-lg font-semibold">
              <Sparkles className="h-5 w-5 text-primary" />
              Checking your sign-in
            </CardTitle>
            <CardDescription className="text-sm text-muted-foreground">
              aacrm is verifying your saved Apple session.
            </CardDescription>
          </CardHeader>
        </Card>
      </main>
    );
  }

  if (!session) {
    return (
      <main className="mx-auto flex min-h-screen max-w-5xl items-center justify-center px-6">
        <Card className="w-full max-w-md border border-primary/30 bg-background/80 text-center shadow-lg">
          <CardHeader className="space-y-3">
            <CardTitle className="flex items-center justify-center gap-2 text-lg font-semibold text-foreground">
              <Apple className="h-6 w-6 text-foreground" />
              Sign in to your studio workspace
            </CardTitle>
            <CardDescription className="text-sm text-muted-foreground">
              Use your Apple ID email to unlock event records, invoices, and vendor data stored locally on this
              device.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-left">
            <div className="space-y-3">
              <Input
                id="apple-name"
                placeholder="Name (optional)"
                value={appleName}
                onChange={(event) => setAppleName(event.target.value)}
              />
              <Input
                id="apple-email"
                type="email"
                placeholder="Apple ID email"
                value={appleEmail}
                onChange={(event) => setAppleEmail(event.target.value)}
              />
              {appleError && <p className="text-xs text-destructive">{appleError}</p>}
            </div>
            <Button
              type="button"
              className="w-full justify-center bg-foreground text-background hover:bg-foreground/90"
              onClick={() => {
                try {
                  signInWithApple({ name: appleName, email: appleEmail });
                  setAppleError(null);
                  setAppleName("");
                  setAppleEmail("");
                } catch (error) {
                  setAppleError(
                    error instanceof Error ? error.message : "Unable to sign in with the provided Apple ID."
                  );
                }
              }}
            >
              Continue with Apple
            </Button>
            <p className="text-xs text-muted-foreground">
              Sessions are saved to this device so you can keep working even when you go offline.
            </p>
          </CardContent>
        </Card>
      </main>
    );
  }

  if (!isHydrated) {
    return (
      <main className="mx-auto flex min-h-screen max-w-5xl items-center justify-center px-6">
        <Card className="w-full max-w-md border-dashed border-muted-foreground/40 bg-card/70 text-center">
          <CardHeader className="space-y-3">
            <CardTitle className="flex items-center justify-center gap-2 text-lg font-semibold">
              <Sparkles className="h-5 w-5 text-primary" />
              Warming up your studio dashboard
            </CardTitle>
            <CardDescription className="text-sm text-muted-foreground">
              aacrm is syncing your saved records.
            </CardDescription>
          </CardHeader>
        </Card>
      </main>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/50 bg-background/80 backdrop-blur">
        <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3 text-xs sm:text-sm">
          <div className="flex items-center gap-3 text-muted-foreground">
            <span className="font-semibold uppercase tracking-[0.35em] text-foreground">AACRM</span>
            <span aria-hidden className="hidden h-4 border-l border-border/60 sm:inline" />
            <span>Signed in as {session.user?.name || session.user?.email || "your team"}</span>
          </div>
          <div className="flex items-center gap-2">
            {isOffline && (
              <Badge variant="outline" className="border-amber-300 bg-amber-100 text-amber-800">
                Offline mode
              </Badge>
            )}
            <Button type="button" size="sm" variant="outline" onClick={() => signOut()}>
              Sign out
            </Button>
          </div>
        </div>
      </header>
      <section className="border-b border-border/60 bg-[radial-gradient(circle_at_top,_#f9dfb1,_transparent_45%),_#fff]">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-10 sm:py-14">
          <p className="text-3xl font-semibold lowercase tracking-tight text-foreground sm:text-4xl">
            welcome, alyssa.
          </p>
        </div>
      </section>

      <main className="mx-auto w-full max-w-6xl px-4 py-10 sm:py-12">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="flex w-full flex-wrap justify-start gap-2 bg-muted/70 p-2 text-xs sm:text-sm">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="records">Records</TabsTrigger>
            <TabsTrigger value="billing">Billing</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              <Card className="bg-card/90">
                <CardHeader className="pb-2 space-y-3">
                  <CardDescription>Pipeline value</CardDescription>
                  <div className="flex flex-wrap gap-6">
                    <div className="space-y-1">
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">Confirmed</p>
                      <p className="text-3xl font-semibold text-foreground">
                        {formatCurrency(overview.pipelineConfirmed)}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">Proposed</p>
                      <p className="text-3xl font-semibold text-foreground">
                        {formatCurrency(overview.pipelineProposed)}
                      </p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="text-xs text-muted-foreground">
                  Confirmed reflects signed work minus collected deposits. Proposed totals active bids and outreach.
                </CardContent>
              </Card>
              <Card className="bg-card/90">
                <CardHeader className="pb-2">
                  <CardDescription>Confirmed after vendor cost</CardDescription>
                  <CardTitle className="text-3xl font-semibold">
                    {formatCurrency(overview.confirmedAfterVendorCost)}
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-xs text-muted-foreground">
                  Projects margin once vendor commitments are covered.
                </CardContent>
              </Card>
              <Card className="bg-primary text-primary-foreground">
                <CardHeader className="pb-2">
                  <CardDescription className="text-primary-foreground/80">
                    Currently held deposits
                  </CardDescription>
                  <CardTitle className="text-3xl font-semibold">
                    {formatCurrency(overview.heldDeposits)}
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-xs text-primary-foreground/80">
                  {overview.heldDepositCount === 0
                    ? "Mark deposits as received in event records to track retainers."
                    : `${overview.heldDepositCount} deposit${
                        overview.heldDepositCount === 1 ? "" : "s"
                      } received across active events.`}
                </CardContent>
              </Card>
            </section>

            <section className="grid gap-6 xl:grid-cols-[2fr_1fr]">
              <Card className="bg-card/90">
                <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <CardTitle>Client pipeline</CardTitle>
                    <CardDescription>
                      Drag clients between stages or drop a text list to capture new leads in seconds.
                    </CardDescription>
                  </div>
                  <Badge variant="neutral">{overview.totalClients} in play</Badge>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                    {overview.pipeline.map((column) => (
                      <div
                        key={column.id}
                        className={cn(
                          "space-y-3 rounded-2xl border border-border/70 bg-muted/40 p-4 transition",
                          activeDropColumn === column.id &&
                            "border-primary/70 bg-primary/5 shadow-sm"
                        )}
                        data-status={column.id}
                        onDragEnter={(event) => handleColumnDragOver(event, column.id)}
                        onDragOver={(event) => handleColumnDragOver(event, column.id)}
                        onDragLeave={(event) => handleColumnDragLeave(event, column.id)}
                        onDrop={(event) => handleColumnDrop(event, column.id)}
                      >
                        <div className="flex items-center justify-between text-sm font-semibold text-foreground">
                          <span>{column.label}</span>
                          <span className="text-xs text-muted-foreground">{column.items.length}</span>
                        </div>
                        {column.items.length === 0 ? (
                          <p className="text-xs text-muted-foreground">
                            No records yet. Drop a card here or import a client list below.
                          </p>
                        ) : (
                          <div className="space-y-3">
                            {column.items.map((client) => (
                              <div
                                key={client.id}
                                className={cn(
                                  "space-y-2 rounded-xl border border-border/70 bg-background/70 p-3 text-xs transition",
                                  draggingClientId === client.id ? "opacity-50" : "hover:border-primary/50 hover:shadow-sm"
                                )}
                                draggable
                                onDragStart={(event) => handleDragStart(event, client.id)}
                                onDragEnd={handleDragEnd}
                                aria-grabbed={draggingClientId === client.id}
                                role="button"
                                tabIndex={0}
                                onClick={() => handleClientEditRequest(client.id)}
                                onKeyDown={(event) => {
                                  if (event.key === "Enter" || event.key === " ") {
                                    event.preventDefault();
                                    handleClientEditRequest(client.id);
                                  }
                                }}
                              >
                                <div className="flex items-center justify-between">
                                  <p className="font-medium text-foreground">{client.name}</p>
                                  <Badge className={cn("px-2 py-0.5 text-[10px] font-semibold", column.accent)}>
                                    {clientStatusLabels[client.status]}
                                  </Badge>
                                </div>
                                <div className="space-y-1 text-muted-foreground">
                                  {client.eventDate && <p>Event · {formatDate(client.eventDate)}</p>}
                                  {typeof client.budget === "number" && (
                                    <p>Budget · {formatCurrency(client.budget)}</p>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                  <div
                    className={cn(
                      "flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-border/60 bg-muted/30 p-6 text-center text-xs text-muted-foreground transition",
                      isImportDragActive && "border-primary/60 bg-primary/5 text-primary"
                    )}
                    role="button"
                    tabIndex={0}
                    aria-label="Import clients by pasting, dropping, or uploading text files"
                    onClick={handleImportZoneClick}
                    onKeyDown={handleImportZoneKeyDown}
                    onPaste={handleImportPaste}
                    onDragEnter={handleImportDragEnter}
                    onDragLeave={handleImportDragLeave}
                    onDragOver={handleImportDragOver}
                    onDrop={handleImportDrop}
                  >
                    <p className="text-sm font-medium text-foreground">Click or drop text to add clients</p>
                    <p className="max-w-md">
                      Paste, drop, or upload lines formatted like
                      <span className="mx-1 rounded bg-background px-1 py-0.5 font-mono text-[11px] text-foreground">
                        Name | Email | Phone | Status | Event Date | Budget | Notes
                      </span>
                      or choose a .txt/.csv file.
                    </p>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".txt,.csv,text/plain"
                      multiple
                      className="sr-only"
                      onChange={handleImportFileChange}
                    />
                  </div>
                  {(importSummary || importError) && (
                    <div className="space-y-1 text-xs">
                      {importSummary && <p className="text-foreground">{importSummary}</p>}
                      {importError && <p className="text-destructive">{importError}</p>}
                    </div>
                  )}
                </CardContent>
              </Card>

            </section>

            <section className="grid gap-6 lg:grid-cols-2">
              <Card className="bg-card/90">
                <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <CardTitle>Upcoming events</CardTitle>
                    <CardDescription>Timeline-ready snapshot of the next celebrations</CardDescription>
                  </div>
                  <Badge variant="neutral">{overview.upcomingEvents.length} scheduled</Badge>
                </CardHeader>
                <CardContent className="space-y-4">
                  {overview.upcomingEvents.length === 0 && (
                    <p className="text-sm text-muted-foreground">Add an event to populate your schedule.</p>
                  )}
                  {overview.upcomingEvents.map((event) => {
                    const client = clientMap.get(event.clientId);
                    const assignedVendors = (event.vendorIds ?? [])
                      .map((vendorId) => vendorMap.get(vendorId) ?? null)
                      .filter((vendor): vendor is Vendor => Boolean(vendor));
                    const vendorSummary = assignedVendors
                      .map((vendor) => `${vendor.name} (${formatCurrency(vendor.cost ?? 0)})`)
                      .join(", ");
                    return (
                      <button
                        key={event.id}
                        type="button"
                        onClick={() => handleEventEditRequest(event.id)}
                        className={cn(
                          "w-full space-y-2 rounded-xl border border-border/70 bg-muted/40 p-4 text-left",
                          "transition hover:border-primary/60 hover:shadow-sm",
                          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
                        )}
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div>
                            <h3 className="text-base font-semibold text-foreground">{event.name}</h3>
                            <p className="text-xs uppercase tracking-wider text-muted-foreground">
                              {formatDate(event.date)} · {event.venue}
                            </p>
                          </div>
                          <Badge variant="neutral" className="capitalize">
                            {eventStatusLabels[event.status]}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Lead planner · {event.coordinator || "Unassigned"}
                        </p>
                        {client && (
                          <p className="text-xs text-muted-foreground">Client · {client.name}</p>
                        )}
                        {typeof event.estimate === "number" && (
                          <p className="text-xs text-muted-foreground">
                            Estimate · {formatCurrency(event.estimate)}
                          </p>
                        )}
                        {typeof event.deposit === "number" && (
                          <p className="text-xs text-muted-foreground">
                            Deposit {event.depositPaid ? "received" : "due"} · {formatCurrency(event.deposit)}
                          </p>
                        )}
                        {assignedVendors.length > 0 && (
                          <p className="text-xs text-muted-foreground">
                            Vendors · {vendorSummary}
                          </p>
                        )}
                        {event.timeline && (
                          <p className="text-xs text-muted-foreground/80">{event.timeline}</p>
                        )}
                      </button>
                    );
                  })}
                </CardContent>
              </Card>

              <Card className="bg-card/90">
                <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <CardTitle>Recent invoices</CardTitle>
                    <CardDescription>Track billing status at a glance</CardDescription>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => setActiveTab("billing")}>
                    Manage billing
                  </Button>
                </CardHeader>
                <CardContent className="space-y-3">
                  {overview.recentInvoices.length === 0 && (
                    <p className="text-sm text-muted-foreground">
                      Create your first invoice to see activity here.
                    </p>
                  )}
                  {overview.recentInvoices.map((invoice) => {
                    const client = clientMap.get(invoice.clientId);
                    return (
                      <div
                        key={invoice.id}
                        className="space-y-2 rounded-xl border border-border/70 bg-muted/40 p-4 text-sm"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div>
                            <p className="font-semibold text-foreground">Invoice {invoice.id}</p>
                            <p className="text-xs text-muted-foreground">
                              Issued {formatDate(invoice.issueDate)} · Due {formatDate(invoice.dueDate)}
                            </p>
                          </div>
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge className={`${invoiceStatusStyles[invoice.status]} capitalize`}>
                              {invoice.status}
                            </Badge>
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                setActiveTab("billing");
                                setEditingInvoiceId(invoice.id);
                              }}
                            >
                              Edit
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              className="text-destructive hover:text-destructive"
                              onClick={() => handleInvoiceDelete(invoice.id)}
                            >
                              Delete
                            </Button>
                          </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                          {client && <span>{client.name}</span>}
                          <span>Total {formatCurrency(invoice.total)}</span>
                          <span>{invoice.items.length} line items</span>
                        </div>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            </section>
          </TabsContent>

          <TabsContent value="records" className="space-y-8">
            <Tabs value={recordsTab} onValueChange={handleRecordsTabChange} className="space-y-6">
              <TabsList className="flex w-full flex-wrap gap-2 bg-muted/70 p-2 text-xs sm:text-sm">
                <TabsTrigger value="clients">Clients</TabsTrigger>
                <TabsTrigger value="events">Events</TabsTrigger>
                <TabsTrigger value="vendors">Vendors</TabsTrigger>
              </TabsList>

              <TabsContent value="clients" className="space-y-6">
                <section className="grid gap-6 lg:grid-cols-[1fr_1.1fr]">
                  <ClientForm
                    mode={editingClient ? "edit" : "create"}
                    initialClient={editingClient ?? undefined}
                    onSubmit={handleClientSubmit}
                    onCancel={() => setEditingClientId(null)}
                    onDelete={handleClientDelete}
                  />
                  <Card className="bg-card/90">
                    <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <CardTitle>Client roster</CardTitle>
                        <CardDescription>Recent activity and event context</CardDescription>
                      </div>
                      <Badge variant="neutral">{data.clients.length} total</Badge>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {data.clients.map((client) => (
                        <div key={client.id} className="space-y-3 rounded-xl border border-border/80 bg-muted/40 p-4">
                          <div className="flex flex-wrap items-center justify-between gap-3">
                            <div>
                              <h3 className="text-base font-semibold text-foreground">{client.name}</h3>
                              <p className="text-xs text-muted-foreground">{client.email}</p>
                            </div>
                            <div className="flex flex-wrap items-center gap-2">
                              <Badge className="capitalize bg-primary/10 text-primary">
                                {clientStatusLabels[client.status]}
                              </Badge>
                              <Button
                                type="button"
                                size="sm"
                                variant="ghost"
                                onClick={() => setEditingClientId(client.id)}
                              >
                                Edit
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                variant="ghost"
                                className="text-destructive hover:text-destructive"
                                onClick={() => handleClientDelete(client.id)}
                              >
                                Delete
                              </Button>
                            </div>
                          </div>
                          <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                            {client.phone && <span>{client.phone}</span>}
                            {client.eventDate && <span>Event · {formatDate(client.eventDate)}</span>}
                            {typeof client.budget === "number" && (
                              <span>Budget · {formatCurrency(client.budget)}</span>
                            )}
                          </div>
                          {client.notes && (
                            <p className="text-sm text-muted-foreground/90">{client.notes}</p>
                          )}
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                </section>
              </TabsContent>

              <TabsContent value="events" className="space-y-6">
                <section className="grid gap-6 lg:grid-cols-[1fr_1.1fr]">
                  <EventForm
                    mode={editingEvent ? "edit" : "create"}
                    initialEvent={editingEvent ?? undefined}
                    onSubmit={handleEventSubmit}
                    onCancel={() => setEditingEventId(null)}
                    onDelete={handleEventDelete}
                    clients={data.clients}
                    vendors={data.vendors}
                  />
                  <Card className="bg-card/90">
                    <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <CardTitle>Production calendar</CardTitle>
                        <CardDescription>Keep venues, leads, and status aligned</CardDescription>
                      </div>
                      <Badge variant="neutral">{data.events.length} events</Badge>
                    </CardHeader>
                    <CardContent className="space-y-3">
                    {data.events.map((event) => {
                      const client = clientMap.get(event.clientId);
                      const assignedVendors = (event.vendorIds ?? [])
                        .map((vendorId) => vendorMap.get(vendorId) ?? null)
                        .filter((vendor): vendor is Vendor => Boolean(vendor));
                      const vendorSummary = assignedVendors
                        .map((vendor) => `${vendor.name} (${formatCurrency(vendor.cost ?? 0)})`)
                        .join(", ");
                      return (
                          <div key={event.id} className="space-y-2 rounded-xl border border-border/80 bg-muted/40 p-4">
                            <div className="flex flex-wrap items-center justify-between gap-3">
                              <div>
                                <h3 className="text-base font-semibold text-foreground">{event.name}</h3>
                                <p className="text-xs text-muted-foreground">
                                  {formatDate(event.date)} · {event.venue}
                                </p>
                              </div>
                              <div className="flex flex-wrap items-center gap-2">
                                <Badge variant="neutral" className="capitalize">
                                  {eventStatusLabels[event.status]}
                                </Badge>
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleEventEditRequest(event.id)}
                                >
                                  Edit
                                </Button>
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="ghost"
                                  className="text-destructive hover:text-destructive"
                                  onClick={() => handleEventDelete(event.id)}
                                >
                                  Delete
                                </Button>
                              </div>
                            </div>
                            <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                              {client && <span>Client · {client.name}</span>}
                              {event.coordinator && <span>Lead · {event.coordinator}</span>}
                            </div>
                            {typeof event.estimate === "number" && (
                              <p className="text-xs text-muted-foreground">
                                Estimate · {formatCurrency(event.estimate)}
                              </p>
                            )}
                            {typeof event.deposit === "number" && (
                              <p className="text-xs text-muted-foreground">
                                Deposit {event.depositPaid ? "received" : "due"} · {formatCurrency(event.deposit)}
                              </p>
                            )}
                            {assignedVendors.length > 0 && (
                              <p className="text-xs text-muted-foreground">
                                Vendors · {vendorSummary}
                              </p>
                            )}
                            {event.timeline && (
                              <p className="text-xs text-muted-foreground/80">{event.timeline}</p>
                            )}
                          </div>
                        );
                      })}
                    </CardContent>
                  </Card>
                </section>
              </TabsContent>

              <TabsContent value="vendors" className="space-y-6">
                <section className="grid gap-6 lg:grid-cols-[1fr_1.1fr]">
                  <VendorForm
                    mode={editingVendor ? "edit" : "create"}
                    initialVendor={editingVendor ?? undefined}
                    onSubmit={handleVendorSubmit}
                    onCancel={() => setEditingVendorId(null)}
                    onDelete={handleVendorDelete}
                  />
                  <Card className="bg-card/90">
                    <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <CardTitle>Vendor roster</CardTitle>
                        <CardDescription>Trusted partners and sourcing notes</CardDescription>
                      </div>
                      <Badge variant="neutral">
                        {filteredVendors.length} of {data.vendors.length} vendors
                      </Badge>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div className="relative w-full sm:max-w-xs">
                          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                          <Input
                            value={vendorSearch}
                            onChange={(event) => setVendorSearch(event.target.value)}
                            placeholder="Search vendor or service"
                            className="pl-9"
                            aria-label="Search vendors"
                          />
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setVendorServiceFilter("all")}
                            className={cn(
                              "flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium transition",
                              vendorServiceFilter === "all"
                                ? "border-primary/40 bg-primary/10 text-primary"
                                : "border-border/60 bg-muted/40 text-muted-foreground hover:border-border/80 hover:text-foreground"
                            )}
                          >
                            All
                            <span className="rounded-full bg-background px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
                              {data.vendors.length}
                            </span>
                          </button>
                          {vendorServiceCounts.map(({ service, count }) => (
                            <button
                              key={service}
                              type="button"
                              onClick={() => setVendorServiceFilter(service)}
                              className={cn(
                                "flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium transition",
                                vendorServiceFilter.toLowerCase() === service.toLowerCase()
                                  ? "border-primary/40 bg-primary/10 text-primary"
                                  : "border-border/60 bg-muted/40 text-muted-foreground hover:border-border/80 hover:text-foreground"
                              )}
                            >
                              {service}
                              <span className="rounded-full bg-background px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
                                {count}
                              </span>
                            </button>
                          ))}
                          {hasVendorFilters && (
                            <Button type="button" variant="ghost" size="sm" onClick={handleResetVendorFilters}>
                              Clear filters
                            </Button>
                          )}
                        </div>
                      </div>
                      {filteredVendors.length === 0 ? (
                        <p className="rounded-xl border border-dashed border-border/70 bg-muted/40 p-6 text-sm text-muted-foreground">
                          {hasVendorFilters
                            ? "No vendors match your filters right now. Adjust your search or add a new partner."
                            : "Add your first vendor to start building your partner roster."}
                        </p>
                      ) : (
                        filteredVendors.map((vendor) => (
                          <div key={vendor.id} className="space-y-3 rounded-xl border border-border/80 bg-muted/40 p-4">
                          <div className="flex flex-wrap items-center justify-between gap-3">
                            <div>
                              <h3 className="text-base font-semibold text-foreground">{vendor.name}</h3>
                              <p className="text-xs text-muted-foreground">
                                {vendor.service} · {formatCurrency(vendor.cost ?? 0)}
                              </p>
                            </div>
                              <div className="flex flex-wrap items-center gap-2">
                                {vendor.preferredContact ? (
                                  <Badge variant="neutral" className="capitalize">
                                    Prefers {preferredContactLabels[vendor.preferredContact]}
                                  </Badge>
                                ) : (
                                  <Badge variant="neutral">Flexible contact</Badge>
                                )}
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => setEditingVendorId(vendor.id)}
                                >
                                  Edit
                                </Button>
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="ghost"
                                  className="text-destructive hover:text-destructive"
                                  onClick={() => handleVendorDelete(vendor.id)}
                                >
                                  Delete
                                </Button>
                              </div>
                            </div>
                            <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                              {vendor.email && <span>{vendor.email}</span>}
                              {vendor.phone && <span>{vendor.phone}</span>}
                              {vendor.website && <span>{vendor.website}</span>}
                            </div>
                            {(vendor.email || vendor.phone || vendor.website) && (
                              <div className="flex flex-wrap items-center gap-2 text-xs">
                                {vendor.email && (
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    className="h-8 rounded-full px-3"
                                    asChild
                                  >
                                    <a href={`mailto:${vendor.email}`} className="inline-flex items-center gap-1.5">
                                      <Mail className="h-4 w-4" /> Email
                                    </a>
                                  </Button>
                                )}
                                {vendor.phone && (
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    className="h-8 rounded-full px-3"
                                    asChild
                                  >
                                    <a href={`tel:${vendor.phone}`} className="inline-flex items-center gap-1.5">
                                      <Phone className="h-4 w-4" /> Call
                                    </a>
                                  </Button>
                                )}
                                {vendor.website && (
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    className="h-8 rounded-full px-3"
                                    asChild
                                  >
                                    <a
                                      href={vendor.website}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="inline-flex items-center gap-1.5"
                                    >
                                      <Globe className="h-4 w-4" /> Site
                                    </a>
                                  </Button>
                                )}
                              </div>
                            )}
                            {vendor.notes && (
                              <p className="text-sm text-muted-foreground/90">{vendor.notes}</p>
                            )}
                          </div>
                        ))
                      )}
                    </CardContent>
                  </Card>
                </section>
              </TabsContent>
            </Tabs>
          </TabsContent>

          <TabsContent value="billing" className="space-y-6">
            <section className="grid gap-6 lg:grid-cols-[1fr_1.1fr]">
              <InvoiceForm
                mode={editingInvoice ? "edit" : "create"}
                initialInvoice={editingInvoice ?? undefined}
                onSubmit={handleInvoiceSubmit}
                onCancel={() => setEditingInvoiceId(null)}
                onDelete={handleInvoiceDelete}
                clients={data.clients}
              />
              <Card className="bg-card/90">
                <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <CardTitle>Invoices</CardTitle>
                    <CardDescription>Monitor cash flow by status</CardDescription>
                  </div>
                  <Badge variant="neutral">{data.invoices.length} invoices</Badge>
                </CardHeader>
                <CardContent className="space-y-3">
                  {data.invoices.map((invoice) => {
                    const client = clientMap.get(invoice.clientId);
                    return (
                      <div key={invoice.id} className="space-y-3 rounded-xl border border-border/80 bg-muted/40 p-4">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div>
                            <h3 className="text-base font-semibold text-foreground">Invoice {invoice.id}</h3>
                            <p className="text-xs text-muted-foreground">
                              Issued {formatDate(invoice.issueDate)} · Due {formatDate(invoice.dueDate)}
                            </p>
                          </div>
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge className={`${invoiceStatusStyles[invoice.status]} capitalize`}>
                              {invoice.status}
                            </Badge>
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              onClick={() => setEditingInvoiceId(invoice.id)}
                            >
                              Edit
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              className="text-destructive hover:text-destructive"
                              onClick={() => handleInvoiceDelete(invoice.id)}
                            >
                              Delete
                            </Button>
                          </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                          {client && <span>{client.name}</span>}
                          <span>Total {formatCurrency(invoice.total)}</span>
                          <span>{invoice.items.length} line items</span>
                        </div>
                        {invoice.notes && (
                          <p className="text-sm text-muted-foreground/90">{invoice.notes}</p>
                        )}
                        <Separator className="my-2 bg-border" />
                        <ul className="space-y-2 text-sm text-muted-foreground/90">
                          {invoice.items.map((item) => (
                            <li key={item.id} className="flex items-center justify-between text-xs sm:text-sm">
                              <span>{item.description}</span>
                              <span>{formatCurrency(item.amount)}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            </section>
          </TabsContent>

        </Tabs>
      </main>
    </div>
  );
}
