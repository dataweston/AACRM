"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { ClientStatus } from "@/types/crm";

interface ClientFormProps {
  onSubmit: (client: {
    name: string;
    email: string;
    phone?: string;
    status: ClientStatus;
    eventDate?: string;
    budget?: number;
    notes?: string;
  }) => void;
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

export function ClientForm({ onSubmit }: ClientFormProps) {
  const [form, setForm] = useState(() => createDefaultForm());

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!form.name || !form.email) return;
    onSubmit({
      name: form.name,
      email: form.email,
      phone: form.phone || undefined,
      status: form.status,
      eventDate: form.eventDate || undefined,
      budget: form.budget ? Number(form.budget) : undefined,
      notes: form.notes || undefined,
    });
    setForm(createDefaultForm());
  };

  return (
    <Card className="bg-muted/40">
      <CardHeader>
        <CardTitle className="text-base font-semibold text-foreground">
          Quick add client
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
              required
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="client-email">Email *</Label>
            <Input
              id="client-email"
              type="email"
              placeholder="contact@email.com"
              value={form.email}
              onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
              required
            />
          </div>
          <div className="grid gap-2 sm:grid-cols-2 sm:gap-4">
            <div className="grid gap-2">
              <Label htmlFor="client-phone">Phone</Label>
              <Input
                id="client-phone"
                placeholder="555-0123"
                value={form.phone}
                onChange={(event) => setForm((prev) => ({ ...prev, phone: event.target.value }))}
              />
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
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="client-budget">Budget (USD)</Label>
              <Input
                id="client-budget"
                type="number"
                min="0"
                value={form.budget}
                onChange={(event) => setForm((prev) => ({ ...prev, budget: event.target.value }))}
              />
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
          <Button type="submit" className="justify-self-start">
            Add client
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
