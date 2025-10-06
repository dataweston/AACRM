"use client";

import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { Client, ClientStatus } from "@/types/crm";

type ClientFormMode = "create" | "edit";

interface ClientFormProps {
  mode?: ClientFormMode;
  initialClient?: Client | null;
  onSubmit: (client: Omit<Client, "id">, id?: string) => void;
  onCancel?: () => void;
  onDelete?: (id: string) => void;
}

const createDefaultForm = () => ({
  name: "",
  email: "",
  phone: "",
  status: "lead" as ClientStatus,
  eventDate: "",
  budget: "",
  notes: "",
});

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const phonePattern = /^[0-9+().\-\s]{7,}$/;

export function ClientForm({
  mode = "create",
  initialClient,
  onSubmit,
  onCancel,
  onDelete,
}: ClientFormProps) {
  const [form, setForm] = useState(() => createDefaultForm());
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (mode === "edit" && initialClient) {
      setForm({
        name: initialClient.name,
        email: initialClient.email,
        phone: initialClient.phone ?? "",
        status: initialClient.status,
        eventDate: initialClient.eventDate ?? "",
        budget: typeof initialClient.budget === "number" ? String(initialClient.budget) : "",
        notes: initialClient.notes ?? "",
      });
      setErrors({});
    } else if (mode === "create") {
      setForm(createDefaultForm());
      setErrors({});
    }
  }, [mode, initialClient]);

  const validate = () => {
    const nextErrors: Record<string, string> = {};

    if (!form.name.trim()) {
      nextErrors.name = "Client name is required.";
    } else if (form.name.trim().length < 2) {
      nextErrors.name = "Use at least two characters.";
    }

    if (!form.email.trim()) {
      nextErrors.email = "Email is required.";
    } else if (!emailPattern.test(form.email.trim())) {
      nextErrors.email = "Enter a valid email address.";
    }

    if (form.phone && !phonePattern.test(form.phone.trim())) {
      nextErrors.phone = "Enter a valid phone number (digits, spaces, or symbols).";
    }

    if (form.eventDate) {
      const dateValue = new Date(form.eventDate);
      if (Number.isNaN(dateValue.getTime())) {
        nextErrors.eventDate = "Enter a valid event date.";
      }
    }

    if (form.budget) {
      const budgetValue = Number(form.budget);
      if (Number.isNaN(budgetValue) || budgetValue < 0) {
        nextErrors.budget = "Budget must be a positive number.";
      }
    }

    return nextErrors;
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextErrors = validate();
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    const payload: Omit<Client, "id"> = {
      name: form.name.trim(),
      email: form.email.trim(),
      phone: form.phone.trim() ? form.phone.trim() : undefined,
      status: form.status,
      eventDate: form.eventDate || undefined,
      budget: form.budget ? Number(form.budget) : undefined,
      notes: form.notes.trim() ? form.notes.trim() : undefined,
    };

    onSubmit(payload, mode === "edit" ? initialClient?.id : undefined);

    if (mode === "create") {
      setForm(createDefaultForm());
      setErrors({});
    } else {
      onCancel?.();
    }
  };

  const handleCancel = () => {
    setForm(createDefaultForm());
    setErrors({});
    onCancel?.();
  };

  return (
    <Card className="bg-muted/40">
      <CardHeader>
        <CardTitle className="text-base font-semibold text-foreground">
          {mode === "edit" ? "Update client" : "Quick add client"}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form className="grid gap-4" onSubmit={handleSubmit}>
          <div className="grid gap-2">
            <Label htmlFor="client-name">Name *</Label>
            <Input
              id="client-name"
              placeholder="Client full name"
              value={form.name}
              onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
              aria-invalid={Boolean(errors.name)}
            />
            {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
          </div>
          <div className="grid gap-2">
            <Label htmlFor="client-email">Email *</Label>
            <Input
              id="client-email"
              type="email"
              placeholder="contact@email.com"
              value={form.email}
              onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
              aria-invalid={Boolean(errors.email)}
            />
            {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
          </div>
          <div className="grid gap-2 sm:grid-cols-2 sm:gap-4">
            <div className="grid gap-2">
              <Label htmlFor="client-phone">Phone</Label>
              <Input
                id="client-phone"
                placeholder="555-0123"
                value={form.phone}
                onChange={(event) => setForm((prev) => ({ ...prev, phone: event.target.value }))}
                aria-invalid={Boolean(errors.phone)}
              />
              {errors.phone && <p className="text-xs text-destructive">{errors.phone}</p>}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="client-status">Status</Label>
              <Select
                id="client-status"
                value={form.status}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, status: event.target.value as ClientStatus }))
                }
              >
                <option value="lead">Lead</option>
                <option value="booked">Booked</option>
                <option value="planning">Planning</option>
                <option value="completed">Completed</option>
              </Select>
            </div>
          </div>
          <div className="grid gap-2 sm:grid-cols-2 sm:gap-4">
            <div className="grid gap-2">
              <Label htmlFor="client-event-date">Event date</Label>
              <Input
                id="client-event-date"
                type="date"
                value={form.eventDate}
                onChange={(event) => setForm((prev) => ({ ...prev, eventDate: event.target.value }))}
                aria-invalid={Boolean(errors.eventDate)}
              />
              {errors.eventDate && <p className="text-xs text-destructive">{errors.eventDate}</p>}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="client-budget">Budget (USD)</Label>
              <Input
                id="client-budget"
                type="number"
                min="0"
                value={form.budget}
                onChange={(event) => setForm((prev) => ({ ...prev, budget: event.target.value }))}
                aria-invalid={Boolean(errors.budget)}
              />
              {errors.budget && <p className="text-xs text-destructive">{errors.budget}</p>}
            </div>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="client-notes">Notes</Label>
            <Textarea
              id="client-notes"
              placeholder="Key preferences, inspiration links, or special requests."
              value={form.notes}
              onChange={(event) => setForm((prev) => ({ ...prev, notes: event.target.value }))}
              rows={3}
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button type="submit" className="justify-self-start">
              {mode === "edit" ? "Save changes" : "Add client"}
            </Button>
            {mode === "edit" && (
              <>
                <Button type="button" variant="outline" onClick={handleCancel}>
                  Cancel
                </Button>
                {initialClient && onDelete && (
                  <Button
                    type="button"
                    variant="ghost"
                    className="text-destructive hover:text-destructive"
                    onClick={() => onDelete(initialClient.id)}
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
