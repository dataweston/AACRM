"use client";

import { useEffect, useState } from "react";
import { nanoid } from "nanoid";

import { sampleData } from "@/data/sample";
import type { CRMData, Client, Event, Invoice, InvoiceItem, Vendor } from "@/types/crm";

const STORAGE_KEY = "aacrm-storage-v1";

function withGeneratedId(item: Omit<Client, "id">): Client;
function withGeneratedId(item: Omit<Vendor, "id">): Vendor;
function withGeneratedId(item: Omit<Event, "id">): Event;
function withGeneratedId(item: Omit<Invoice, "id">): Invoice;
function withGeneratedId<T extends { id?: string }>(item: T): T & { id: string };
function withGeneratedId<T extends { id?: string }>(item: T) {
  return {
    ...item,
    id: item.id ?? nanoid(),
  };
}

type InvoiceItemInput = InvoiceItem | Omit<InvoiceItem, "id">;

const withInvoiceItemId = (item: InvoiceItemInput): InvoiceItem => {
  if ("id" in item && item.id) {
    return { ...item, id: item.id };
  }

  return { ...item, id: nanoid() };
};

const sanitizeVendorIds = (vendorIds: Event["vendorIds"], vendors: Vendor[]) => {
  if (!Array.isArray(vendorIds)) {
    return [] as string[];
  }

  const validVendorIds = new Set(vendors.map((vendor) => vendor.id));
  const deduped = vendorIds.filter((vendorId) => validVendorIds.has(vendorId));

  return Array.from(new Set(deduped));
};

const normalizeEvent = (event: Omit<Event, "id">, vendors: Vendor[]): Omit<Event, "id"> => {
  const vendorIds = sanitizeVendorIds(event.vendorIds, vendors);

  return {
    ...event,
    vendorIds: vendorIds.length > 0 ? vendorIds : undefined,
  };
};

export function useCrmData() {
  const [data, setData] = useState<CRMData>(sampleData);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as CRMData;
        setData(parsed);
      } catch (error) {
        console.warn("Failed to parse stored CRM data", error);
      }
    }
    setIsHydrated(true);
  }, []);

  useEffect(() => {
    if (!isHydrated || typeof window === "undefined") return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }, [data, isHydrated]);

  const addClient = (client: Omit<Client, "id">) =>
    setData((current) => ({
      ...current,
      clients: [withGeneratedId(client), ...current.clients],
    }));

  const addVendor = (vendor: Omit<Vendor, "id">) =>
    setData((current) => ({
      ...current,
      vendors: [withGeneratedId(vendor), ...current.vendors],
    }));

  const updateVendor = (vendorId: string, vendor: Omit<Vendor, "id">) =>
    setData((current) => ({
      ...current,
      vendors: current.vendors.map((entry) =>
        entry.id === vendorId ? { ...entry, ...vendor, id: vendorId } : entry
      ),
    }));

  const deleteVendor = (vendorId: string) =>
    setData((current) => ({
      ...current,
      vendors: current.vendors.filter((entry) => entry.id !== vendorId),
      events: current.events.map((event) => {
        if (!event.vendorIds?.includes(vendorId)) {
          return event;
        }

        const nextVendorIds = event.vendorIds.filter((id) => id !== vendorId);

        return {
          ...event,
          vendorIds: nextVendorIds.length > 0 ? nextVendorIds : undefined,
        };
      }),
    }));

  const addEvent = (event: Omit<Event, "id">) =>
    setData((current) => ({
      ...current,
      events: [withGeneratedId(normalizeEvent(event, current.vendors)), ...current.events],
    }));

  const updateEvent = (eventId: string, event: Omit<Event, "id">) =>
    setData((current) => ({
      ...current,
      events: current.events.map((entry) =>
        entry.id === eventId
          ? {
              ...entry,
              ...normalizeEvent(event, current.vendors),
              id: eventId,
            }
          : entry
      ),
    }));

  const deleteEvent = (eventId: string) =>
    setData((current) => ({
      ...current,
      events: current.events.filter((entry) => entry.id !== eventId),
    }));

  const addInvoice = (invoice: Omit<Invoice, "id">) =>
    setData((current) => ({
      ...current,
      invoices: [
        {
          ...withGeneratedId(invoice),
          items: invoice.items.map(withInvoiceItemId),
        },
        ...current.invoices,
      ],
    }));

  const normalizeInvoiceItems = (items: InvoiceItemInput[]) =>
    items.map(withInvoiceItemId);

  const updateInvoice = (invoiceId: string, invoice: Omit<Invoice, "id">) =>
    setData((current) => ({
      ...current,
      invoices: current.invoices.map((entry) =>
        entry.id === invoiceId
          ? {
              ...entry,
              ...invoice,
              id: invoiceId,
              items: normalizeInvoiceItems(invoice.items),
            }
          : entry
      ),
    }));

  const deleteInvoice = (invoiceId: string) =>
    setData((current) => ({
      ...current,
      invoices: current.invoices.filter((entry) => entry.id !== invoiceId),
    }));

  const updateClient = (clientId: string, client: Omit<Client, "id">) =>
    setData((current) => ({
      ...current,
      clients: current.clients.map((entry) =>
        entry.id === clientId ? { ...entry, ...client, id: clientId } : entry
      ),
    }));

  const deleteClient = (clientId: string) =>
    setData((current) => ({
      ...current,
      clients: current.clients.filter((entry) => entry.id !== clientId),
    }));

  return {
    data,
    isHydrated,
    addClient,
    updateClient,
    deleteClient,
    addVendor,
    updateVendor,
    deleteVendor,
    addEvent,
    updateEvent,
    deleteEvent,
    addInvoice,
    updateInvoice,
    deleteInvoice,
  };
}
