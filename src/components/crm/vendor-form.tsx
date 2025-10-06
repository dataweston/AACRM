"use client";

import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { Vendor } from "@/types/crm";

type VendorFormMode = "create" | "edit";

interface VendorFormProps {
  mode?: VendorFormMode;
  initialVendor?: Vendor | null;
  onSubmit: (vendor: Omit<Vendor, "id">, id?: string) => void;
  onCancel?: () => void;
  onDelete?: (id: string) => void;
}

const createDefaultForm = () => ({
  name: "",
  service: "",
  cost: "",
  email: "",
  phone: "",
  website: "",
  preferredContact: "email" as "email" | "phone" | "text",
  notes: "",
});

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const phonePattern = /^[0-9+().\-\s]{7,}$/;

export function VendorForm({
  mode = "create",
  initialVendor,
  onSubmit,
  onCancel,
  onDelete,
}: VendorFormProps) {
  const [form, setForm] = useState(() => createDefaultForm());
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (mode === "edit" && initialVendor) {
      setForm({
        name: initialVendor.name,
        service: initialVendor.service,
        cost: typeof initialVendor.cost === "number" ? String(initialVendor.cost) : "",
        email: initialVendor.email ?? "",
        phone: initialVendor.phone ?? "",
        website: initialVendor.website ?? "",
        preferredContact: initialVendor.preferredContact ?? "email",
        notes: initialVendor.notes ?? "",
      });
      setErrors({});
    } else if (mode === "create") {
      setForm(createDefaultForm());
      setErrors({});
    }
  }, [mode, initialVendor?.id]);

  const validate = () => {
    const nextErrors: Record<string, string> = {};

    if (!form.name.trim()) {
      nextErrors.name = "Vendor name is required.";
    }

    if (!form.service.trim()) {
      nextErrors.service = "Service is required.";
    }

    if (form.email && !emailPattern.test(form.email.trim())) {
      nextErrors.email = "Enter a valid email.";
    }

    if (form.cost) {
      const parsedCost = Number.parseFloat(form.cost);
      if (Number.isNaN(parsedCost) || parsedCost < 0) {
        nextErrors.cost = "Enter a valid cost or leave blank.";
      }
    }

    if (form.phone && !phonePattern.test(form.phone.trim())) {
      nextErrors.phone = "Enter a valid phone number.";
    }

    if (form.website) {
      try {
        const url = new URL(form.website.trim());
        if (!url.protocol.startsWith("http")) {
          nextErrors.website = "Include http:// or https://";
        }
      } catch {
        nextErrors.website = "Enter a valid URL.";
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

    const payload: Omit<Vendor, "id"> = {
      name: form.name.trim(),
      service: form.service.trim(),
      cost: form.cost.trim() ? Number.parseFloat(form.cost) : undefined,
      email: form.email.trim() ? form.email.trim() : undefined,
      phone: form.phone.trim() ? form.phone.trim() : undefined,
      website: form.website.trim() ? form.website.trim() : undefined,
      preferredContact: form.preferredContact,
      notes: form.notes.trim() ? form.notes.trim() : undefined,
    };

    onSubmit(payload, mode === "edit" ? initialVendor?.id : undefined);

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
          {mode === "edit" ? "Update vendor" : "Quick add vendor"}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form className="grid gap-4" onSubmit={handleSubmit}>
          <div className="grid gap-2">
            <Label htmlFor="vendor-name">Vendor name *</Label>
            <Input
              id="vendor-name"
              placeholder="Company or contact"
              value={form.name}
              onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
              aria-invalid={Boolean(errors.name)}
            />
            {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
          </div>
          <div className="grid gap-2">
            <Label htmlFor="vendor-service">Service *</Label>
            <Input
              id="vendor-service"
              placeholder="Photography, rentals, decor..."
              value={form.service}
              onChange={(event) => setForm((prev) => ({ ...prev, service: event.target.value }))}
              aria-invalid={Boolean(errors.service)}
            />
            {errors.service && <p className="text-xs text-destructive">{errors.service}</p>}
          </div>
          <div className="grid gap-2">
            <Label htmlFor="vendor-cost">Typical cost</Label>
            <Input
              id="vendor-cost"
              type="number"
              min="0"
              step="0.01"
              placeholder="Average spend with this vendor"
              value={form.cost}
              onChange={(event) => setForm((prev) => ({ ...prev, cost: event.target.value }))}
              aria-invalid={Boolean(errors.cost)}
            />
            {errors.cost && <p className="text-xs text-destructive">{errors.cost}</p>}
          </div>
          <div className="grid gap-2 sm:grid-cols-2 sm:gap-4">
            <div className="grid gap-2">
              <Label htmlFor="vendor-email">Email</Label>
              <Input
                id="vendor-email"
                type="email"
                placeholder="hello@vendor.com"
                value={form.email}
                onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
                aria-invalid={Boolean(errors.email)}
              />
              {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="vendor-phone">Phone</Label>
              <Input
                id="vendor-phone"
                placeholder="555-0155"
                value={form.phone}
                onChange={(event) => setForm((prev) => ({ ...prev, phone: event.target.value }))}
                aria-invalid={Boolean(errors.phone)}
              />
              {errors.phone && <p className="text-xs text-destructive">{errors.phone}</p>}
            </div>
          </div>
          <div className="grid gap-2 sm:grid-cols-2 sm:gap-4">
            <div className="grid gap-2">
              <Label htmlFor="vendor-website">Website</Label>
              <Input
                id="vendor-website"
                placeholder="https://vendor.com"
                value={form.website}
                onChange={(event) => setForm((prev) => ({ ...prev, website: event.target.value }))}
                aria-invalid={Boolean(errors.website)}
              />
              {errors.website && <p className="text-xs text-destructive">{errors.website}</p>}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="vendor-preferred-contact">Preferred contact</Label>
              <Select
                id="vendor-preferred-contact"
                value={form.preferredContact}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    preferredContact: event.target.value as "email" | "phone" | "text",
                  }))
                }
              >
                <option value="email">Email</option>
                <option value="phone">Phone</option>
                <option value="text">Text</option>
              </Select>
            </div>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="vendor-notes">Notes</Label>
            <Textarea
              id="vendor-notes"
              placeholder="Availability, preferred booking window, payment terms..."
              value={form.notes}
              onChange={(event) => setForm((prev) => ({ ...prev, notes: event.target.value }))}
              rows={3}
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button type="submit" className="justify-self-start">
              {mode === "edit" ? "Save changes" : "Add vendor"}
            </Button>
            {mode === "edit" && (
              <>
                <Button type="button" variant="outline" onClick={handleCancel}>
                  Cancel
                </Button>
                {initialVendor && onDelete && (
                  <Button
                    type="button"
                    variant="ghost"
                    className="text-destructive hover:text-destructive"
                    onClick={() => onDelete(initialVendor.id)}
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
