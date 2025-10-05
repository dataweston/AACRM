"use client";

import { useMemo, useState } from "react";
import {
  ArrowUpRight,
  CalendarDays,
  Download,
  Globe,
  Link2,
  Mail,
  Phone,
  Plus,
  Search,
  Sparkles,
} from "lucide-react";
import { format } from "date-fns";

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
import type { Client, Invoice, Vendor } from "@/types/crm";
import { cn } from "@/lib/utils";

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

const preferredContactLabels: Record<NonNullable<Vendor["preferredContact"]>, string> = {
  email: "Email",
  phone: "Phone",
  text: "Text",
};

export default function HomePage() {
  const { data, isHydrated, addClient, addVendor, addEvent, addInvoice } = useCrmData();
  const [activeTab, setActiveTab] = useState("overview");
  const [vendorSearch, setVendorSearch] = useState("");
  const [vendorServiceFilter, setVendorServiceFilter] = useState<string>("all");

  const handleExport = () => {
    if (typeof window === "undefined") return;

    const sanitize = (value: string | number | undefined | null) => {
      if (value === undefined || value === null) return "";
      const stringValue = String(value).replace(/"/g, '""');
      return /[",\n]/.test(stringValue) ? `"${stringValue}"` : stringValue;
    };

    const lines: string[] = [];
    const pushRow = (cells: (string | number | undefined | null)[]) => {
      lines.push(cells.map(sanitize).join(","));
    };

    pushRow(["Clients"]);
    pushRow(["Name", "Email", "Phone", "Status", "Event Date", "Budget", "Notes"]);
    data.clients.forEach((client) =>
      pushRow([
        client.name,
        client.email,
        client.phone,
        clientStatusLabels[client.status],
        client.eventDate ? formatDate(client.eventDate) : "",
        typeof client.budget === "number" ? client.budget : "",
        client.notes,
      ])
    );
    lines.push("");

    pushRow(["Vendors"]);
    pushRow(["Name", "Service", "Email", "Phone", "Website", "Preferred Contact", "Notes"]);
    data.vendors.forEach((vendor) =>
      pushRow([
        vendor.name,
        vendor.service,
        vendor.email,
        vendor.phone,
        vendor.website,
        vendor.preferredContact,
        vendor.notes,
      ])
    );
    lines.push("");

    pushRow(["Events"]);
    pushRow(["Name", "Date", "Client", "Venue", "Coordinator", "Status", "Timeline"]);
    data.events.forEach((event) => {
      const client = data.clients.find((entry) => entry.id === event.clientId);
      pushRow([
        event.name,
        formatDate(event.date),
        client?.name,
        event.venue,
        event.coordinator,
        event.status,
        event.timeline,
      ]);
    });
    lines.push("");

    pushRow(["Invoices"]);
    pushRow(["Invoice #", "Client", "Issue Date", "Due Date", "Status", "Total", "Notes"]);
    data.invoices.forEach((invoice) => {
      const client = data.clients.find((entry) => entry.id === invoice.clientId);
      pushRow([
        invoice.id,
        client?.name,
        formatDate(invoice.issueDate),
        formatDate(invoice.dueDate),
        invoice.status,
        invoice.total,
        invoice.notes,
      ]);
    });

    const csvContent = lines.join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = window.URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `aacrm-roster-${format(new Date(), "yyyyMMdd-HHmm")}.csv`;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    window.URL.revokeObjectURL(url);
  };

  const overview = useMemo(() => {
    const activeClients = data.clients.filter((client) => client.status !== "completed");
    const bookedRevenue = data.clients
      .filter((client) => client.status === "booked" || client.status === "planning")
      .reduce((sum, client) => sum + (client.budget ?? 0), 0);
    const outstandingInvoices = data.invoices
      .filter((invoice) => invoice.status === "sent" || invoice.status === "overdue")
      .reduce((sum, invoice) => sum + invoice.total, 0);

    const nextEvent = [...data.events]
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .find((event) => new Date(event.date) >= new Date());

    const pipeline = CLIENT_PIPELINE.map((column) => ({
      ...column,
      items: data.clients.filter((client) => client.status === column.id),
    }));

    const upcomingEvents = [...data.events]
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .slice(0, 4);

    const recentInvoices = [...data.invoices]
      .sort((a, b) => new Date(b.issueDate).getTime() - new Date(a.issueDate).getTime())
      .slice(0, 4);

    return {
      totalClients: data.clients.length,
      activeClients: activeClients.length,
      bookedRevenue,
      outstandingInvoices,
      nextEvent,
      pipeline,
      upcomingEvents,
      recentInvoices,
    };
  }, [data]);

  const clientMap = useMemo(() => {
    const map = new Map<string, Client>();
    data.clients.forEach((client) => map.set(client.id, client));
    return map;
  }, [data.clients]);

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
      <section className="border-b border-border/60 bg-[radial-gradient(circle_at_top,_#f9dfb1,_transparent_45%),_#fff]">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-10 sm:py-14">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-2xl space-y-4">
              <Badge className="w-fit bg-primary/10 text-xs font-semibold uppercase tracking-[0.3em] text-primary">
                aacrm
              </Badge>
              <h1 className="text-3xl font-semibold leading-tight text-foreground sm:text-4xl">
                The modern event relationship hub for boutique wedding studios
              </h1>
              <p className="text-base text-muted-foreground">
                Keep clients, vendors, run-of-show logistics, and billing in one mobile-first workspace.
                aacrm focuses on the essentials so you can move from inquiry to celebration without the
                noise of enterprise platforms.
              </p>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  className="bg-primary text-primary-foreground hover:bg-primary/90"
                  onClick={() => setActiveTab("records")}
                >
                  <Plus className="mr-2 h-4 w-4" /> Add a record
                </Button>
                <Button type="button" variant="outline" onClick={handleExport}>
                  <Download className="mr-2 h-4 w-4" /> Export CSV snapshot
                </Button>
              </div>
            </div>
            <Card className="w-full max-w-sm border border-primary/30 bg-primary/5">
              <CardHeader>
                <CardTitle className="text-base font-semibold text-primary">
                  Wix-ready embed
                </CardTitle>
                <CardDescription className="text-sm text-primary/80">
                  Drop the deployed URL into a Wix <em>Custom Embed</em> block and gate the page with member
                  access for your internal team.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-muted-foreground">
                <p className="flex items-center gap-2 text-foreground">
                  <Link2 className="h-4 w-4 text-primary" /> Works in responsive Wix layouts
                </p>
                <p className="flex items-center gap-2">
                  <CalendarDays className="h-4 w-4 text-primary" /> Keep your event pipeline visible on the
                  go
                </p>
                <p className="flex items-center gap-2">
                  <ArrowUpRight className="h-4 w-4 text-primary" /> Launch in a modal or dedicated studio
                  page
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      <main className="mx-auto w-full max-w-6xl px-4 py-10 sm:py-12">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="flex w-full flex-wrap justify-start gap-2 bg-muted/70 p-2 text-xs sm:text-sm">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="records">Records</TabsTrigger>
            <TabsTrigger value="billing">Billing</TabsTrigger>
            <TabsTrigger value="embed">Embed guide</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <Card className="bg-card/90">
                <CardHeader className="pb-2">
                  <CardDescription>Active clients</CardDescription>
                  <CardTitle className="text-3xl font-semibold">
                    {overview.activeClients}
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-xs text-muted-foreground">
                  {overview.totalClients} total relationships tracked
                </CardContent>
              </Card>
              <Card className="bg-card/90">
                <CardHeader className="pb-2">
                  <CardDescription>Pipeline value</CardDescription>
                  <CardTitle className="text-3xl font-semibold">
                    {formatCurrency(overview.bookedRevenue)}
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-xs text-muted-foreground">
                  Sum of budgets for booked + planning events
                </CardContent>
              </Card>
              <Card className="bg-card/90">
                <CardHeader className="pb-2">
                  <CardDescription>Outstanding invoices</CardDescription>
                  <CardTitle className="text-3xl font-semibold">
                    {formatCurrency(overview.outstandingInvoices)}
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-xs text-muted-foreground">
                  Awaiting payment from confirmed clients
                </CardContent>
              </Card>
              <Card className="bg-primary text-primary-foreground">
                <CardHeader className="pb-2">
                  <CardDescription className="text-primary-foreground/80">
                    Next milestone
                  </CardDescription>
                  <CardTitle className="text-2xl font-semibold">
                    {overview.nextEvent ? overview.nextEvent.name : "No upcoming events"}
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-xs text-primary-foreground/80">
                  {overview.nextEvent
                    ? `${formatDate(overview.nextEvent.date)} · ${overview.nextEvent.venue}`
                    : "Add your next celebration to stay ahead."}
                </CardContent>
              </Card>
            </section>

            <section className="grid gap-6 xl:grid-cols-[2fr_1fr]">
              <Card className="bg-card/90">
                <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <CardTitle>Client pipeline</CardTitle>
                    <CardDescription>Drag-free Kanban snapshot for your studio review</CardDescription>
                  </div>
                  <Badge variant="neutral">{overview.totalClients} in play</Badge>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                    {overview.pipeline.map((column) => (
                      <div key={column.id} className="space-y-3 rounded-2xl border border-border/70 bg-muted/40 p-4">
                        <div className="flex items-center justify-between text-sm font-semibold text-foreground">
                          <span>{column.label}</span>
                          <span className="text-xs text-muted-foreground">{column.items.length}</span>
                        </div>
                        {column.items.length === 0 ? (
                          <p className="text-xs text-muted-foreground">
                            No records yet. Add a client to populate this column.
                          </p>
                        ) : (
                          <div className="space-y-3">
                            {column.items.map((client) => (
                              <div
                                key={client.id}
                                className="space-y-2 rounded-xl border border-border/70 bg-background/70 p-3 text-xs"
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
                </CardContent>
              </Card>

              <Card className="bg-secondary/40">
                <CardHeader>
                  <CardTitle className="text-lg text-secondary-foreground">Weekly studio rhythm</CardTitle>
                  <CardDescription className="text-secondary-foreground/80">
                    Use these prompts during Monday standup to keep momentum.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 text-sm text-secondary-foreground/90">
                  <div className="rounded-xl border border-secondary-foreground/20 bg-card/80 p-4">
                    <h3 className="text-base font-semibold text-foreground">Lead review</h3>
                    <p className="mt-2 text-sm text-muted-foreground">
                      Confirm new inquiries, move them into booked or schedule discovery calls.
                    </p>
                  </div>
                  <div className="rounded-xl border border-secondary-foreground/20 bg-card/80 p-4">
                    <h3 className="text-base font-semibold text-foreground">Vendor sync</h3>
                    <p className="mt-2 text-sm text-muted-foreground">
                      Reconfirm holds, note travel requirements, and share styling references.
                    </p>
                  </div>
                  <div className="rounded-xl border border-secondary-foreground/20 bg-card/80 p-4">
                    <h3 className="text-base font-semibold text-foreground">Cash flow check</h3>
                    <p className="mt-2 text-sm text-muted-foreground">
                      Review overdue invoices and send gentle reminders before the weekend rush.
                    </p>
                  </div>
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
                    return (
                      <div
                        key={event.id}
                        className="space-y-2 rounded-xl border border-border/70 bg-muted/40 p-4"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div>
                            <h3 className="text-base font-semibold text-foreground">{event.name}</h3>
                            <p className="text-xs uppercase tracking-wider text-muted-foreground">
                              {formatDate(event.date)} · {event.venue}
                            </p>
                          </div>
                          <Badge variant="neutral" className="capitalize">
                            {event.status.replace("-", " ")}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Lead planner · {event.coordinator || "Unassigned"}
                        </p>
                        {client && (
                          <p className="text-xs text-muted-foreground">Client · {client.name}</p>
                        )}
                        {event.timeline && (
                          <p className="text-xs text-muted-foreground/80">{event.timeline}</p>
                        )}
                      </div>
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
                          <Badge className={`${invoiceStatusStyles[invoice.status]} capitalize`}>
                            {invoice.status}
                          </Badge>
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
            <Tabs defaultValue="clients" className="space-y-6">
              <TabsList className="flex w-full flex-wrap gap-2 bg-muted/70 p-2 text-xs sm:text-sm">
                <TabsTrigger value="clients">Clients</TabsTrigger>
                <TabsTrigger value="events">Events</TabsTrigger>
                <TabsTrigger value="vendors">Vendors</TabsTrigger>
              </TabsList>

              <TabsContent value="clients" className="space-y-6">
                <section className="grid gap-6 lg:grid-cols-[1fr_1.1fr]">
                  <ClientForm onSubmit={addClient} />
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
                            <Badge className="capitalize bg-primary/10 text-primary">
                              {clientStatusLabels[client.status]}
                            </Badge>
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
                  <EventForm onSubmit={addEvent} clients={data.clients} vendors={data.vendors} />
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
                        return (
                          <div key={event.id} className="space-y-2 rounded-xl border border-border/80 bg-muted/40 p-4">
                            <div className="flex flex-wrap items-center justify-between gap-3">
                              <div>
                                <h3 className="text-base font-semibold text-foreground">{event.name}</h3>
                                <p className="text-xs text-muted-foreground">
                                  {formatDate(event.date)} · {event.venue}
                                </p>
                              </div>
                              <Badge variant="neutral" className="capitalize">
                                {event.status.replace("-", " ")}
                              </Badge>
                            </div>
                            <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                              {client && <span>Client · {client.name}</span>}
                              {event.coordinator && <span>Lead · {event.coordinator}</span>}
                            </div>
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
                  <VendorForm onSubmit={addVendor} />
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
                                <p className="text-xs text-muted-foreground">{vendor.service}</p>
                              </div>
                              {vendor.preferredContact ? (
                                <Badge variant="neutral" className="capitalize">
                                  Prefers {preferredContactLabels[vendor.preferredContact]}
                                </Badge>
                              ) : (
                                <Badge variant="neutral">Flexible contact</Badge>
                              )}
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
              <InvoiceForm onSubmit={addInvoice} clients={data.clients} />
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
                          <Badge className={`${invoiceStatusStyles[invoice.status]} capitalize`}>
                            {invoice.status}
                          </Badge>
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

          <TabsContent value="embed" className="space-y-6" id="integrations">
            <section className="grid gap-6 xl:grid-cols-[1fr_1.1fr]">
              <Card className="bg-card/90">
                <CardHeader>
                  <CardTitle>Wix embed launch checklist</CardTitle>
                  <CardDescription>
                    Publish aacrm and surface it securely to your internal coordination team.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 text-sm text-muted-foreground">
                  <ol className="list-decimal space-y-3 pl-5">
                    <li>
                      Deploy this Next.js app to Vercel (recommended) or a similar host and copy the
                      production URL (e.g. <code>https://studio.yourdomain.com</code>).
                    </li>
                    <li>
                      In Wix, add <strong>Embed → Custom Embed → Embed a Site</strong> to your internal
                      dashboard and paste the URL.
                    </li>
                    <li>
                      Set height to <code>100%</code>, enable <em>auto resize</em>, and allow scrolling so the CRM
                      remains mobile responsive inside Wix.
                    </li>
                    <li>
                      Use Wix Member Areas or password protection to limit access to your planning team.
                    </li>
                  </ol>
                  <Separator className="my-4 bg-border" />
                  <p>
                    Need offline backups? Export a CSV snapshot anytime and store it in your shared drive.
                  </p>
                  <Button type="button" variant="outline" className="w-full justify-center gap-2" onClick={handleExport}>
                    <Download className="h-4 w-4" /> Export roster CSV
                  </Button>
                </CardContent>
              </Card>

              <Card className="bg-secondary/50">
                <CardHeader>
                  <CardTitle className="text-lg text-secondary-foreground">Automation starters</CardTitle>
                  <CardDescription className="text-secondary-foreground/80">
                    Extend aacrm with nocode flows as you scale operations.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 text-sm text-secondary-foreground/90">
                  <div className="rounded-xl border border-secondary-foreground/20 bg-card/70 p-4">
                    <h3 className="text-base font-semibold text-foreground">Zapier hand-offs</h3>
                    <p className="mt-2 text-sm text-muted-foreground">
                      Send new clients to ClickUp, Google Sheets, or HoneyBook to keep legacy workflows in
                      sync.
                    </p>
                  </div>
                  <div className="rounded-xl border border-secondary-foreground/20 bg-card/70 p-4">
                    <h3 className="text-base font-semibold text-foreground">Slack nudges</h3>
                    <p className="mt-2 text-sm text-muted-foreground">
                      Trigger reminders when invoices go overdue or when a new vendor is added to the roster.
                    </p>
                  </div>
                  <div className="rounded-xl border border-secondary-foreground/20 bg-card/70 p-4">
                    <h3 className="text-base font-semibold text-foreground">Airtable backups</h3>
                    <p className="mt-2 text-sm text-muted-foreground">
                      Use the CSV export as a nightly import into Airtable for reporting and archiving.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </section>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
