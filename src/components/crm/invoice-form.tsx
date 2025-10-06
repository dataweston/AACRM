"use client";

import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { nanoid } from "nanoid";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { Client, Invoice, InvoiceWixDetails } from "@/types/crm";

type InvoiceFormMode = "create" | "edit";

interface InvoiceFormProps {
  mode?: InvoiceFormMode;
  initialInvoice?: Invoice | null;
  onSubmit: (invoice: Omit<Invoice, "id">, id?: string) => void;
  onCancel?: () => void;
  onDelete?: (id: string) => void;
  clients: Client[];
}

interface InvoiceItemFormState {
  id?: string;
  description: string;
  amount: string;
}

const defaultItem: InvoiceItemFormState = { description: "", amount: "" };
const defaultWixDetails: InvoiceWixDetails = { status: "not_created" };

const createDefaultForm = () => ({
  clientId: "",
  issueDate: format(new Date(), "yyyy-MM-dd"),
  dueDate: "",
  status: "draft" as "draft" | "sent" | "paid" | "overdue",
  total: "",
  notes: "",
});

export function InvoiceForm({
  mode = "create",
  initialInvoice,
  onSubmit,
  onCancel,
  onDelete,
  clients,
}: InvoiceFormProps) {
  const [form, setForm] = useState(() => createDefaultForm());
  const [items, setItems] = useState<InvoiceItemFormState[]>([{ ...defaultItem }]);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const clientNamesById = useMemo(() => {
    const map = new Map<string, string>();
    clients.forEach((client) => map.set(client.id, client.name));
    return map;
  }, [clients]);

  useEffect(() => {
    if (mode === "edit" && initialInvoice) {
      setForm({
        clientId: initialInvoice.clientId,
        issueDate: initialInvoice.issueDate,
        dueDate: initialInvoice.dueDate,
        status: initialInvoice.status,
        total: initialInvoice.total ? String(initialInvoice.total) : "",
        notes: initialInvoice.notes ?? "",
      });
      setItems(
        initialInvoice.items.length > 0
          ? initialInvoice.items.map((item) => ({
              id: item.id,
              description: item.description,
              amount: String(item.amount),
            }))
          : [{ ...defaultItem }]
      );
      setErrors({});
    } else if (mode === "create") {
      setForm(createDefaultForm());
      setItems([{ ...defaultItem }]);
      setErrors({});
    }
  }, [mode, initialInvoice?.id]);

  const validate = () => {
    const nextErrors: Record<string, string> = {};

    if (!form.clientId) {
      nextErrors.clientId = "Select a client.";
    } else if (!clientNamesById.has(form.clientId)) {
      nextErrors.clientId = "Client no longer exists.";
    }

    if (!form.issueDate) {
      nextErrors.issueDate = "Issue date is required.";
    }

    if (!form.dueDate) {
      nextErrors.dueDate = "Due date is required.";
    } else if (form.issueDate && new Date(form.dueDate) < new Date(form.issueDate)) {
      nextErrors.dueDate = "Due date must be on or after the issue date.";
    }

    const cleanedItems = items
      .map((item) => ({
        id: item.id,
        description: item.description.trim(),
        amount: item.amount.trim(),
      }))
      .filter((item) => item.description || item.amount);

    if (cleanedItems.length === 0) {
      nextErrors.items = "Add at least one line item with an amount.";
    } else {
      for (const item of cleanedItems) {
        if (!item.description) {
          nextErrors.items = "Each line item needs a description.";
          break;
        }
        const amountValue = Number(item.amount);
        if (Number.isNaN(amountValue) || amountValue <= 0) {
          nextErrors.items = "Line item amounts must be positive numbers.";
          break;
        }
      }
    }

    if (form.total) {
      const totalValue = Number(form.total);
      if (Number.isNaN(totalValue) || totalValue <= 0) {
        nextErrors.total = "Total must be a positive number.";
      }
    }

    return { nextErrors, cleanedItems };
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const { nextErrors, cleanedItems } = validate();

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    const parsedItems = cleanedItems.map((item) => ({
      id: item.id ?? nanoid(),
      description: item.description,
      amount: Number(item.amount),
    }));

    const total = form.total
      ? Number(form.total)
      : parsedItems.reduce((sum, item) => sum + item.amount, 0);

    if (!total || Number.isNaN(total)) {
      setErrors((previous) => ({ ...previous, total: "Unable to calculate invoice total." }));
      return;
    }

    const wixDetails: InvoiceWixDetails = initialInvoice?.wix
      ? { ...initialInvoice.wix }
      : { ...defaultWixDetails };

    const payload: Omit<Invoice, "id"> = {
      clientId: form.clientId,
      issueDate: form.issueDate,
      dueDate: form.dueDate,
      status: form.status,
      total,
      items: parsedItems,
      notes: form.notes.trim() ? form.notes.trim() : undefined,
      wix: wixDetails,
    };

    onSubmit(payload, mode === "edit" ? initialInvoice?.id : undefined);

    if (mode === "create") {
      setForm(createDefaultForm());
      setItems([{ ...defaultItem }]);
      setErrors({});
    } else {
      onCancel?.();
    }
  };

  const handleCancel = () => {
    setForm(createDefaultForm());
    setItems([{ ...defaultItem }]);
    setErrors({});
    onCancel?.();
  };

  return (
    <Card className="bg-muted/40">
      <CardHeader>
        <CardTitle className="text-base font-semibold text-foreground">
          {mode === "edit" ? "Update invoice" : "Quick invoice draft"}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form className="grid gap-4" onSubmit={handleSubmit}>
          <div className="grid gap-2">
            <Label htmlFor="invoice-client">Client *</Label>
            <Select
              id="invoice-client"
              value={form.clientId}
              onChange={(event) => setForm((prev) => ({ ...prev, clientId: event.target.value }))}
              aria-invalid={Boolean(errors.clientId)}
            >
              <option value="">Select client</option>
              {clients.map((client) => (
                <option key={client.id} value={client.id}>
                  {client.name}
                </option>
              ))}
            </Select>
            {errors.clientId && <p className="text-xs text-destructive">{errors.clientId}</p>}
          </div>
          <div className="grid gap-2 sm:grid-cols-3 sm:gap-4">
            <div className="grid gap-2">
              <Label htmlFor="invoice-issue">Issue date *</Label>
              <Input
                id="invoice-issue"
                type="date"
                value={form.issueDate}
                onChange={(event) => setForm((prev) => ({ ...prev, issueDate: event.target.value }))}
                aria-invalid={Boolean(errors.issueDate)}
              />
              {errors.issueDate && <p className="text-xs text-destructive">{errors.issueDate}</p>}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="invoice-due">Due date *</Label>
              <Input
                id="invoice-due"
                type="date"
                value={form.dueDate}
                onChange={(event) => setForm((prev) => ({ ...prev, dueDate: event.target.value }))}
                aria-invalid={Boolean(errors.dueDate)}
              />
              {errors.dueDate && <p className="text-xs text-destructive">{errors.dueDate}</p>}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="invoice-status">Status</Label>
              <Select
                id="invoice-status"
                value={form.status}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    status: event.target.value as "draft" | "sent" | "paid" | "overdue",
                  }))
                }
              >
                <option value="draft">Draft</option>
                <option value="sent">Sent</option>
                <option value="paid">Paid</option>
                <option value="overdue">Overdue</option>
              </Select>
            </div>
          </div>

          <div className="grid gap-2">
            <Label>Line items *</Label>
            <div className="grid gap-3">
              {errors.items && <p className="text-xs text-destructive">{errors.items}</p>}
              {items.map((item, index) => (
                <div key={index} className="grid gap-2 rounded-lg border border-dashed border-muted-foreground/30 p-4">
                  <div className="grid gap-2 sm:grid-cols-[1fr_160px] sm:gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor={`invoice-item-description-${index}`}>Description</Label>
                      <Input
                        id={`invoice-item-description-${index}`}
                        placeholder="Service description"
                        value={item.description}
                        onChange={(event) =>
                          setItems((prev) =>
                            prev.map((entry, entryIndex) =>
                              entryIndex === index
                                ? { ...entry, description: event.target.value }
                                : entry
                            )
                          )
                        }
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor={`invoice-item-amount-${index}`}>Amount</Label>
                      <Input
                        id={`invoice-item-amount-${index}`}
                        type="number"
                        min="0"
                        step="0.01"
                        value={item.amount}
                        onChange={(event) =>
                          setItems((prev) =>
                            prev.map((entry, entryIndex) =>
                              entryIndex === index
                                ? { ...entry, amount: event.target.value }
                                : entry
                            )
                          )
                        }
                      />
                    </div>
                  </div>
                  {items.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      className="justify-start text-xs text-muted-foreground hover:text-destructive"
                      onClick={() =>
                        setItems((prev) => prev.filter((_, entryIndex) => entryIndex !== index))
                      }
                    >
                      Remove line
                    </Button>
                  )}
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                className="border-dashed"
                onClick={() => setItems((prev) => [...prev, { ...defaultItem }])}
              >
                Add line item
              </Button>
            </div>
          </div>

          <div className="grid gap-2 sm:grid-cols-2 sm:gap-4">
            <div className="grid gap-2">
              <Label htmlFor="invoice-total">Total (optional)</Label>
              <Input
                id="invoice-total"
                type="number"
                min="0"
                step="0.01"
                value={form.total}
                onChange={(event) => setForm((prev) => ({ ...prev, total: event.target.value }))}
                aria-invalid={Boolean(errors.total)}
              />
              {errors.total && <p className="text-xs text-destructive">{errors.total}</p>}
              <p className="text-xs text-muted-foreground">
                Leave blank to auto-sum line items.
              </p>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="invoice-notes">Invoice notes</Label>
              <Textarea
                id="invoice-notes"
                placeholder="Payment schedule, accepted methods, or next steps."
                value={form.notes}
                onChange={(event) => setForm((prev) => ({ ...prev, notes: event.target.value }))}
                rows={3}
              />
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button type="submit" className="justify-self-start">
              {mode === "edit" ? "Save changes" : "Save invoice draft"}
            </Button>
            {mode === "edit" && (
              <>
                <Button type="button" variant="outline" onClick={handleCancel}>
                  Cancel
                </Button>
                {initialInvoice && onDelete && (
                  <Button
                    type="button"
                    variant="ghost"
                    className="text-destructive hover:text-destructive"
                    onClick={() => onDelete(initialInvoice.id)}
                  >
                    Delete
                  </Button>
                )}
              </>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
