"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { Client } from "@/types/crm";

interface EventFormProps {
  onSubmit: (event: {
    name: string;
    date: string;
    clientId: string;
    venue: string;
    coordinator: string;
    timeline?: string;
    status: "scheduled" | "in-progress" | "wrap-up";
  }) => void;
  clients: Client[];
}

const createDefaultForm = () => ({
  name: "",
  date: "",
  clientId: "",
  venue: "",
  coordinator: "",
  timeline: "",
  status: "scheduled" as "scheduled" | "in-progress" | "wrap-up",
});

export function EventForm({ onSubmit, clients }: EventFormProps) {
  const [form, setForm] = useState(() => createDefaultForm());

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!form.name || !form.date || !form.clientId) return;
    onSubmit({
      name: form.name,
      date: form.date,
      clientId: form.clientId,
      venue: form.venue,
      coordinator: form.coordinator,
      timeline: form.timeline || undefined,
      status: form.status,
    });
    setForm(createDefaultForm());
  };

  return (
    <Card className="bg-muted/40">
      <CardHeader>
        <CardTitle className="text-base font-semibold text-foreground">
          Quick add event
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form className="grid gap-4" onSubmit={handleSubmit}>
          <div className="grid gap-2">
            <Label htmlFor="event-name">Event name *</Label>
            <Input
              id="event-name"
              placeholder="Event or celebration"
              value={form.name}
              onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
              required
            />
          </div>
          <div className="grid gap-2 sm:grid-cols-2 sm:gap-4">
            <div className="grid gap-2">
              <Label htmlFor="event-date">Date *</Label>
              <Input
                id="event-date"
                type="date"
                value={form.date}
                onChange={(event) => setForm((prev) => ({ ...prev, date: event.target.value }))}
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="event-status">Status</Label>
              <Select
                id="event-status"
                value={form.status}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    status: event.target.value as "scheduled" | "in-progress" | "wrap-up",
                  }))
                }
              >
                <option value="scheduled">Scheduled</option>
                <option value="in-progress">In progress</option>
                <option value="wrap-up">Wrap up</option>
              </Select>
            </div>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="event-client">Client *</Label>
            <Select
              id="event-client"
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
          <div className="grid gap-2 sm:grid-cols-2 sm:gap-4">
            <div className="grid gap-2">
              <Label htmlFor="event-venue">Venue</Label>
              <Input
                id="event-venue"
                placeholder="Venue or location"
                value={form.venue}
                onChange={(event) => setForm((prev) => ({ ...prev, venue: event.target.value }))}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="event-coordinator">Coordinator</Label>
              <Input
                id="event-coordinator"
                placeholder="Lead coordinator"
                value={form.coordinator}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, coordinator: event.target.value }))
                }
              />
            </div>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="event-timeline">Timeline</Label>
            <Textarea
              id="event-timeline"
              placeholder="High-level flow, call times, or rehearsal details."
              value={form.timeline}
              onChange={(event) => setForm((prev) => ({ ...prev, timeline: event.target.value }))}
              rows={3}
            />
          </div>
          <Button type="submit" className="justify-self-start">
            Add event
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
