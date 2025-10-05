"use client";

import { useState } from "react";
import { format } from "date-fns";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { Client } from "@/types/crm";

interface InvoiceFormProps {
  onSubmit: (invoice: {
    clientId: string;
    issueDate: string;
    dueDate: string;
    status: "draft" | "sent" | "paid" | "overdue";
    total: number;
    items: { id?: string; description: string; amount: number }[];
    notes?: string;
  }) => void;
  clients: Client[];
}

interface InvoiceItemFormState {
  description: string;
  amount: string;
}

const defaultItem: InvoiceItemFormState = { description: "", amount: "" };

const createDefaultForm = () => ({
  clientId: "",
  issueDate: format(new Date(), "yyyy-MM-dd"),
  dueDate: "",
  status: "draft" as "draft" | "sent" | "paid" | "overdue",
  total: "",
  notes: "",
});

export function InvoiceForm({ onSubmit, clients }: InvoiceFormProps) {
  const [form, setForm] = useState(() => createDefaultForm());
  const [items, setItems] = useState<InvoiceItemFormState[]>([{ ...defaultItem }]);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!form.clientId || !form.issueDate || !form.dueDate) return;

    const cleanedItems = items
      .filter((item) => item.description && item.amount)
      .map((item) => ({
        description: item.description,
        amount: Number(item.amount),
      }));

    const total = form.total
      ? Number(form.total)
      : cleanedItems.reduce((sum, item) => sum + item.amount, 0);

    if (!total || cleanedItems.length === 0) return;

    onSubmit({
      clientId: form.clientId,
      issueDate: form.issueDate,
      dueDate: form.dueDate,
      status: form.status,
      total,
      items: cleanedItems,
      notes: form.notes || undefined,
    });

    setForm(createDefaultForm());
    setItems([{ ...defaultItem }]);
  };

  return (
    <Card className="bg-muted/40">
      <CardHeader>
        <CardTitle className="text-base font-semibold text-foreground">
          Quick invoice draft
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
              required
            >
              <option value="">Select client</option>
              {clients.map((client) => (
                <option key={client.id} value={client.id}>
                  {client.name}
                </option>
              ))}
            </Select>
          </div>
          <div className="grid gap-2 sm:grid-cols-3 sm:gap-4">
            <div className="grid gap-2">
              <Label htmlFor="invoice-issue">Issue date *</Label>
              <Input
                id="invoice-issue"
                type="date"
                value={form.issueDate}
                onChange={(event) => setForm((prev) => ({ ...prev, issueDate: event.target.value }))}
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="invoice-due">Due date *</Label>
              <Input
                id="invoice-due"
                type="date"
                value={form.dueDate}
                onChange={(event) => setForm((prev) => ({ ...prev, dueDate: event.target.value }))}
                required
              />
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
                        required
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
                        required
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
              />
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
          <Button type="submit" className="justify-self-start">
            Save invoice draft
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
