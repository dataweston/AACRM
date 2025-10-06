"use client";

import { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { Client, Event as EventType, Vendor } from "@/types/crm";

type EventFormMode = "create" | "edit";

interface EventFormProps {
  mode?: EventFormMode;
  initialEvent?: EventType | null;
  onSubmit: (event: Omit<EventType, "id">, id?: string) => void;
  onCancel?: () => void;
  onDelete?: (id: string) => void;
  clients: Client[];
  vendors: Vendor[];
}

type FormState = {
  name: string;
  date: string;
  clientId: string;
  venue: string;
  coordinator: string;
  timeline: string;
  status: "scheduled" | "in-progress" | "wrap-up";
  vendorIds: string[];
};

const createDefaultForm = (): FormState => ({
  name: "",
  date: "",
  clientId: "",
  venue: "",
  coordinator: "",
  timeline: "",
  status: "scheduled" as "scheduled" | "in-progress" | "wrap-up",
  vendorIds: [],
});

export function EventForm({
  mode = "create",
  initialEvent,
  onSubmit,
  onCancel,
  onDelete,
  clients,
  vendors,
}: EventFormProps) {
  const [form, setForm] = useState<FormState>(() => createDefaultForm());
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
        vendorIds: initialEvent.vendorIds ? [...initialEvent.vendorIds] : [],
      });
      setErrors({});
    } else if (mode === "create") {
      setForm(createDefaultForm());
      setErrors({});
    }
  }, [mode, initialEvent?.id]);

  const knownClientIds = useMemo(() => new Set(clients.map((client) => client.id)), [clients]);
  const knownVendorIds = useMemo(() => new Set(vendors.map((vendor) => vendor.id)), [vendors]);

  useEffect(() => {
    setForm((previous) => {
      if (previous.vendorIds.length === 0) {
        return previous;
      }

      const validVendorIds = previous.vendorIds.filter((vendorId) => knownVendorIds.has(vendorId));

      if (validVendorIds.length === previous.vendorIds.length) {
        return previous;
      }

      return {
        ...previous,
        vendorIds: validVendorIds,
      };
    });
  }, [knownVendorIds]);

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

    const vendorIds = form.vendorIds.filter((vendorId) => knownVendorIds.has(vendorId));

    const payload: Omit<EventType, "id"> = {
      name: form.name.trim(),
      date: form.date,
      clientId: form.clientId,
      venue: form.venue.trim(),
      coordinator: form.coordinator.trim(),
      timeline: form.timeline.trim() ? form.timeline.trim() : undefined,
      status: form.status,
      vendorIds: vendorIds.length > 0 ? vendorIds : undefined,
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

  const toggleVendorId = (vendorId: string) => {
    setForm((previous) => {
      const vendorIds = new Set(previous.vendorIds);
      if (vendorIds.has(vendorId)) {
        vendorIds.delete(vendorId);
      } else {
        vendorIds.add(vendorId);
      }

      return {
        ...previous,
        vendorIds: Array.from(vendorIds),
      };
    });
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
            <Label>Vendors</Label>
            <div className="space-y-2 rounded-lg border border-border/60 bg-background/50 p-3">
              {vendors.length === 0 && (
                <p className="text-xs text-muted-foreground">
                  Add vendors to your roster to assign them here.
                </p>
              )}
              {vendors.map((vendor) => {
                const inputId = `event-vendor-${vendor.id}`;
                const isChecked = form.vendorIds.includes(vendor.id);

                return (
                  <label
                    key={vendor.id}
                    htmlFor={inputId}
                    className="flex cursor-pointer items-center justify-between gap-3 rounded-md border border-transparent px-2 py-1 text-sm hover:border-border"
                  >
                    <div className="flex flex-col">
                      <span className="font-medium text-foreground">{vendor.name}</span>
                      <span className="text-xs text-muted-foreground">{vendor.service}</span>
                    </div>
                    <input
                      id={inputId}
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => toggleVendorId(vendor.id)}
                      className="h-4 w-4 rounded border border-input text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    />
                  </label>
                );
              })}
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
