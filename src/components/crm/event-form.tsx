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

type EventStatus = EventType["status"];

type FormState = {
  name: string;
  date: string;
  clientId: string;
  venue: string;
  venueCost: string;
  coordinator: string;
  timeline: string;
  status: EventStatus;
  vendorIds: string[];
  vendorCosts: Record<string, string>;
  estimate: string;
  deposit: string;
  depositPaid: boolean;
};

const EVENT_STATUS_OPTIONS: { value: EventStatus; label: string }[] = [
  { value: "contacted", label: "Contacted" },
  { value: "bid", label: "Bid sent" },
  { value: "proposed", label: "Proposed" },
  { value: "confirmed", label: "Confirmed" },
];

const createDefaultForm = (): FormState => ({
  name: "",
  date: "",
  clientId: "",
  venue: "",
  venueCost: "",
  coordinator: "",
  timeline: "",
  status: "contacted",
  vendorIds: [],
  vendorCosts: {},
  estimate: "",
  deposit: "",
  depositPaid: false,
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
        venueCost:
          typeof initialEvent.venueCost === "number" ? String(initialEvent.venueCost) : "",
        coordinator: initialEvent.coordinator,
        timeline: initialEvent.timeline ?? "",
        status: initialEvent.status,
        vendorIds: initialEvent.vendorIds ? [...initialEvent.vendorIds] : [],
        vendorCosts: Object.entries(initialEvent.vendorCosts ?? {}).reduce<Record<string, string>>(
          (accumulator, [vendorId, value]) => {
            accumulator[vendorId] = String(value);
            return accumulator;
          },
          {}
        ),
        estimate: typeof initialEvent.estimate === "number" ? String(initialEvent.estimate) : "",
        deposit: typeof initialEvent.deposit === "number" ? String(initialEvent.deposit) : "",
        depositPaid: Boolean(initialEvent.depositPaid),
      });
      setErrors({});
    } else if (mode === "create") {
      setForm(createDefaultForm());
      setErrors({});
    }
  }, [mode, initialEvent]);

  const knownClientIds = useMemo(() => new Set(clients.map((client) => client.id)), [clients]);
  const knownVendorIds = useMemo(() => new Set(vendors.map((vendor) => vendor.id)), [vendors]);

  useEffect(() => {
    setForm((previous) => {
      const validVendorIds = previous.vendorIds.filter((vendorId) => knownVendorIds.has(vendorId));
      const validVendorCosts = Object.entries(previous.vendorCosts).reduce<Record<string, string>>(
        (accumulator, [vendorId, value]) => {
          if (knownVendorIds.has(vendorId)) {
            accumulator[vendorId] = value;
          }
          return accumulator;
        },
        {}
      );

      if (
        validVendorIds.length === previous.vendorIds.length &&
        Object.keys(validVendorCosts).length === Object.keys(previous.vendorCosts).length
      ) {
        return previous;
      }

      return {
        ...previous,
        vendorIds: validVendorIds,
        vendorCosts: validVendorCosts,
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

    if (form.venueCost.trim()) {
      const venueCostValue = Number(form.venueCost);
      if (Number.isNaN(venueCostValue) || venueCostValue < 0) {
        nextErrors.venueCost = "Enter a valid venue cost.";
      }
    }

    if (form.estimate.trim()) {
      const estimateValue = Number(form.estimate);
      if (Number.isNaN(estimateValue) || estimateValue < 0) {
        nextErrors.estimate = "Enter a valid estimate.";
      }
    }

    if (form.deposit.trim()) {
      const depositValue = Number(form.deposit);
      if (Number.isNaN(depositValue) || depositValue < 0) {
        nextErrors.deposit = "Enter a valid deposit.";
      }
    }

    if (!form.deposit.trim() && form.depositPaid) {
      nextErrors.depositPaid = "Add a deposit amount before marking it paid.";
    }

    form.vendorIds.forEach((vendorId) => {
      const rawValue = form.vendorCosts[vendorId]?.trim();
      if (!rawValue) {
        return;
      }

      const parsed = Number(rawValue);
      if (Number.isNaN(parsed) || parsed < 0) {
        nextErrors[`vendorCost-${vendorId}`] = "Enter a valid vendor cost.";
      }
    });

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
    const vendorCosts = vendorIds.reduce<Record<string, number>>((accumulator, vendorId) => {
      const rawValue = form.vendorCosts[vendorId]?.trim();
      if (!rawValue) {
        return accumulator;
      }

      const parsed = Number(rawValue);
      if (Number.isNaN(parsed) || parsed < 0) {
        return accumulator;
      }

      accumulator[vendorId] = parsed;
      return accumulator;
    }, {});

    const estimate = form.estimate.trim() ? Number(form.estimate) : undefined;
    const deposit = form.deposit.trim() ? Number(form.deposit) : undefined;
    const depositPaid = deposit !== undefined ? form.depositPaid : false;
    const venueCost = form.venueCost.trim() ? Number(form.venueCost) : undefined;

    const payload: Omit<EventType, "id"> = {
      name: form.name.trim(),
      date: form.date,
      clientId: form.clientId,
      venue: form.venue.trim(),
      venueCost,
      coordinator: form.coordinator.trim(),
      timeline: form.timeline.trim() ? form.timeline.trim() : undefined,
      status: form.status,
      vendorIds: vendorIds.length > 0 ? vendorIds : undefined,
      vendorCosts: Object.keys(vendorCosts).length > 0 ? vendorCosts : undefined,
      estimate,
      deposit,
      depositPaid,
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
      const vendorCosts = { ...previous.vendorCosts };
      if (vendorIds.has(vendorId)) {
        vendorIds.delete(vendorId);
        delete vendorCosts[vendorId];
      } else {
        vendorIds.add(vendorId);
      }

      return {
        ...previous,
        vendorIds: Array.from(vendorIds),
        vendorCosts,
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
                    status: event.target.value as EventStatus,
                  }))
                }
              >
                {EVENT_STATUS_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
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
              <Label htmlFor="event-venue-cost">Venue cost</Label>
              <Input
                id="event-venue-cost"
                type="number"
                min="0"
                step="0.01"
                placeholder="Event-specific venue cost"
                value={form.venueCost}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, venueCost: event.target.value }))
                }
                aria-invalid={Boolean(errors.venueCost)}
              />
              {errors.venueCost && <p className="text-xs text-destructive">{errors.venueCost}</p>}
            </div>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="event-coordinator">Coordinator</Label>
            <Input
              id="event-coordinator"
              placeholder="Lead coordinator"
              value={form.coordinator}
              onChange={(event) => setForm((prev) => ({ ...prev, coordinator: event.target.value }))}
            />
          </div>
          <div className="grid gap-2 sm:grid-cols-2 sm:gap-4">
            <div className="grid gap-2">
              <Label htmlFor="event-estimate">Estimate</Label>
              <Input
                id="event-estimate"
                type="number"
                min="0"
                step="0.01"
                placeholder="Projected total"
                value={form.estimate}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    estimate: event.target.value,
                  }))
                }
                aria-invalid={Boolean(errors.estimate)}
              />
              {errors.estimate && <p className="text-xs text-destructive">{errors.estimate}</p>}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="event-deposit">Deposit</Label>
              <Input
                id="event-deposit"
                type="number"
                min="0"
                step="0.01"
                placeholder="Deposit amount"
                value={form.deposit}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    deposit: event.target.value,
                    depositPaid: prev.depositPaid && event.target.value.trim() ? prev.depositPaid : false,
                  }))
                }
                aria-invalid={Boolean(errors.deposit)}
              />
              {errors.deposit && <p className="text-xs text-destructive">{errors.deposit}</p>}
              <label className="flex items-center gap-2 text-xs text-muted-foreground">
                <input
                  type="checkbox"
                  checked={form.depositPaid}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      depositPaid: event.target.checked,
                    }))
                  }
                  disabled={!form.deposit.trim()}
                  className="h-4 w-4 rounded border border-input text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                />
                <span>Deposit received</span>
              </label>
              {errors.depositPaid && <p className="text-xs text-destructive">{errors.depositPaid}</p>}
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
                const costInputId = `${inputId}-cost`;
                const isChecked = form.vendorIds.includes(vendor.id);
                const vendorCostError = errors[`vendorCost-${vendor.id}`];

                return (
                  <div
                    key={vendor.id}
                    className="rounded-md border border-transparent bg-background/40 p-2 text-sm"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <label htmlFor={inputId} className="flex flex-col">
                        <span className="font-medium text-foreground">{vendor.name}</span>
                        <span className="text-xs text-muted-foreground">{vendor.service}</span>
                      </label>
                      <input
                        id={inputId}
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggleVendorId(vendor.id)}
                        className="mt-1 h-4 w-4 shrink-0 rounded border border-input text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                      />
                    </div>
                    {isChecked && (
                      <div className="mt-3 grid gap-1">
                        <Label htmlFor={costInputId} className="text-xs font-medium text-muted-foreground">
                          Event cost
                        </Label>
                        <Input
                          id={costInputId}
                          type="number"
                          min="0"
                          step="0.01"
                          placeholder="What are you spending with this vendor?"
                          value={form.vendorCosts[vendor.id] ?? ""}
                          onChange={(event) => {
                            const value = event.target.value;
                            setForm((prev) => {
                              const nextVendorCosts = { ...prev.vendorCosts };
                              if (value.trim()) {
                                nextVendorCosts[vendor.id] = value;
                              } else {
                                delete nextVendorCosts[vendor.id];
                              }

                              return {
                                ...prev,
                                vendorCosts: nextVendorCosts,
                              };
                            });
                          }}
                          aria-invalid={Boolean(vendorCostError)}
                        />
                        {vendorCostError && (
                          <p className="text-xs text-destructive">{vendorCostError}</p>
                        )}
                      </div>
                    )}
                  </div>
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
