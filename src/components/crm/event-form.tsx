"use client";

import { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { Client, Event as EventType } from "@/types/crm";

type EventFormMode = "create" | "edit";

interface EventFormProps {
  mode?: EventFormMode;
  initialEvent?: EventType | null;
  onSubmit: (event: Omit<EventType, "id">, id?: string) => void;
  onCancel?: () => void;
  onDelete?: (id: string) => void;
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

export function EventForm({
  mode = "create",
  initialEvent,
  onSubmit,
  onCancel,
  onDelete,
  clients,
}: EventFormProps) {
  const [form, setForm] = useState(() => createDefaultForm());
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (mode === "edit" && initialEvent) {
      setForm({
        name: initialEvent.name,
        date: initialEvent.date,
        clientId: initialEvent.clientId,
        venue: initialEvent.venue,
        coordinator: initialEvent.coordinator,
        timeline: initialEvent.timeline ?? "",
        status: initialEvent.status,
      });
      setErrors({});
    } else if (mode === "create") {
      setForm(createDefaultForm());
      setErrors({});
    }
  }, [mode, initialEvent?.id]);

  const knownClientIds = useMemo(() => new Set(clients.map((client) => client.id)), [clients]);

  const validate = () => {
    const nextErrors: Record<string, string> = {};

    if (!form.name.trim()) {
      nextErrors.name = "Event name is required.";
    }

    if (!form.date) {
      nextErrors.date = "Event date is required.";
    } else if (Number.isNaN(new Date(form.date).getTime())) {
      nextErrors.date = "Enter a valid date.";
    }

    if (!form.clientId) {
      nextErrors.clientId = "Select a client.";
    } else if (!knownClientIds.has(form.clientId)) {
      nextErrors.clientId = "Client no longer exists.";
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

    const payload: Omit<EventType, "id"> = {
      name: form.name.trim(),
      date: form.date,
      clientId: form.clientId,
      venue: form.venue.trim(),
      coordinator: form.coordinator.trim(),
      timeline: form.timeline.trim() ? form.timeline.trim() : undefined,
      status: form.status,
    };

    onSubmit(payload, mode === "edit" ? initialEvent?.id : undefined);

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
          {mode === "edit" ? "Update event" : "Quick add event"}
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
              aria-invalid={Boolean(errors.name)}
            />
            {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
          </div>
          <div className="grid gap-2 sm:grid-cols-2 sm:gap-4">
            <div className="grid gap-2">
              <Label htmlFor="event-date">Date *</Label>
              <Input
                id="event-date"
                type="date"
                value={form.date}
                onChange={(event) => setForm((prev) => ({ ...prev, date: event.target.value }))}
                aria-invalid={Boolean(errors.date)}
              />
              {errors.date && <p className="text-xs text-destructive">{errors.date}</p>}
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
          <div className="flex flex-wrap items-center gap-2">
            <Button type="submit" className="justify-self-start">
              {mode === "edit" ? "Save changes" : "Add event"}
            </Button>
            {mode === "edit" && (
              <>
                <Button type="button" variant="outline" onClick={handleCancel}>
                  Cancel
                </Button>
                {initialEvent && onDelete && (
                  <Button
                    type="button"
                    variant="ghost"
                    className="text-destructive hover:text-destructive"
                    onClick={() => onDelete(initialEvent.id)}
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
