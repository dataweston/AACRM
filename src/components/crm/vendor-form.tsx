"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

interface VendorFormProps {
  onSubmit: (vendor: {
    name: string;
    service: string;
    email?: string;
    phone?: string;
    website?: string;
    preferredContact?: "email" | "phone" | "text";
    notes?: string;
  }) => void;
}

const createDefaultForm = () => ({
  name: "",
  service: "",
  email: "",
  phone: "",
  website: "",
  preferredContact: "email" as "email" | "phone" | "text",
  notes: "",
});

export function VendorForm({ onSubmit }: VendorFormProps) {
  const [form, setForm] = useState(() => createDefaultForm());

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!form.name || !form.service) return;
    onSubmit({
      name: form.name,
      service: form.service,
      email: form.email || undefined,
      phone: form.phone || undefined,
      website: form.website || undefined,
      preferredContact: form.preferredContact,
      notes: form.notes || undefined,
    });
    setForm(createDefaultForm());
  };

  return (
    <Card className="bg-muted/40">
      <CardHeader>
        <CardTitle className="text-base font-semibold text-foreground">
          Quick add vendor
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
              required
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="vendor-service">Service *</Label>
            <Input
              id="vendor-service"
              placeholder="Photography, rentals, decor..."
              value={form.service}
              onChange={(event) => setForm((prev) => ({ ...prev, service: event.target.value }))}
              required
            />
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
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="vendor-phone">Phone</Label>
              <Input
                id="vendor-phone"
                placeholder="555-0155"
                value={form.phone}
                onChange={(event) => setForm((prev) => ({ ...prev, phone: event.target.value }))}
              />
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
              />
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
          <Button type="submit" className="justify-self-start">
            Add vendor
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
