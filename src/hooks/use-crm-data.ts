"use client";

import { useEffect, useState } from "react";
import { nanoid } from "nanoid";

import { sampleData } from "@/data/sample";
import type { CRMData, Client, Event, Invoice, Vendor } from "@/types/crm";

const STORAGE_KEY = "aacrm-storage-v1";

function withGeneratedId<T extends { id?: string }>(item: T) {
  return {
    ...item,
    id: item.id ?? nanoid(),
  };
}

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

  const addEvent = (event: Omit<Event, "id">) =>
    setData((current) => ({
      ...current,
      events: [withGeneratedId(event), ...current.events],
    }));

  const addInvoice = (invoice: Omit<Invoice, "id">) =>
    setData((current) => ({
      ...current,
      invoices: [
        {
          ...withGeneratedId(invoice),
          items: invoice.items.map((item) => ({
            ...item,
            id: item.id ?? nanoid(),
          })),
        },
        ...current.invoices,
      ],
    }));

  return {
    data,
    isHydrated,
    addClient,
    addVendor,
    addEvent,
    addInvoice,
  };
}
