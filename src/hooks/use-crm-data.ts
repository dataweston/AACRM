"use client";

import { useEffect, useState } from "react";
import { initFirebase, getFirestoreDb, onAuthChanged, getFirebaseAuth } from "@/lib/firebase";
import { doc, onSnapshot, setDoc } from "firebase/firestore";
import { nanoid } from "nanoid";

import { sampleData } from "@/data/sample";
import type {
  CRMData,
  Client,
  Event,
  Invoice,
  InvoiceItem,
  InvoiceWixDetails,
  Vendor,
} from "@/types/crm";

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

const sanitizeVendorCosts = (vendorCosts: Event["vendorCosts"], vendorIds: string[]) => {
  if (!vendorCosts || typeof vendorCosts !== "object") {
    return {} as Record<string, number>;
  }

  const validVendorIds = new Set(vendorIds);

  return Object.entries(vendorCosts).reduce<Record<string, number>>((accumulator, [vendorId, value]) => {
    if (!validVendorIds.has(vendorId)) {
      return accumulator;
    }

    const parsedValue =
      typeof value === "number"
        ? value
        : typeof value === "string"
          ? Number(value)
          : Number.NaN;

    if (Number.isNaN(parsedValue) || parsedValue < 0 || !Number.isFinite(parsedValue)) {
      return accumulator;
    }

    accumulator[vendorId] = parsedValue;
    return accumulator;
  }, {});
};

const normalizeEvent = (event: Omit<Event, "id">, vendors: Vendor[]): Omit<Event, "id"> => {
  const vendorIds = sanitizeVendorIds(event.vendorIds, vendors);
  const vendorCosts = sanitizeVendorCosts(event.vendorCosts, vendorIds);
  const hasVendorCosts = Object.keys(vendorCosts).length > 0;
  const venueCost =
    typeof event.venueCost === "number" && !Number.isNaN(event.venueCost) && event.venueCost >= 0
      ? event.venueCost
      : undefined;

  return {
    ...event,
    vendorIds: vendorIds.length > 0 ? vendorIds : undefined,
    vendorCosts: hasVendorCosts ? vendorCosts : undefined,
    venueCost,
  };
};

const ensureWixDetails = (wix?: InvoiceWixDetails): InvoiceWixDetails => ({
  status: wix?.status ?? "not_created",
  invoiceId: wix?.invoiceId,
  paymentLink: wix?.paymentLink,
  lastActionAt: wix?.lastActionAt,
});

export function useCrmData() {
  const [data, setData] = useState<CRMData>(sampleData);
  const [isHydrated, setIsHydrated] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // initialize firebase if env present
    if (process.env.NEXT_PUBLIC_FIREBASE_API_KEY) {
      try {
        initFirebase({
          apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY ?? "",
          authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ?? "",
          projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? "",
          storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ?? "",
          messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ?? "",
          appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID ?? "",
        });
      } catch (_error) {
        // ignore
      }
    }

    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as CRMData;
        setData({
          ...parsed,
          invoices: parsed.invoices.map((invoice) => ({
            ...invoice,
            wix: ensureWixDetails(invoice.wix),
          })),
        });
      } catch (_error) {
        console.warn("Failed to parse stored CRM data", _error);
      }
    }

    // subscribe to firebase auth changes to sync per-user data
    const auth = getFirebaseAuth();
    if (auth) {
      const unsubscribeAuth = onAuthChanged((user) => {
        const uid = user?.uid ?? null;
        setUserId(uid);
        if (uid) {
          const db = getFirestoreDb();
          if (!db) return;
          const ref = doc(db, "crms", uid);
          // subscribe to remote changes
          return onSnapshot(ref, (snapshot) => {
            const remote = snapshot.data() as CRMData | undefined;
            if (remote) {
              setData({
                ...remote,
                invoices: remote.invoices.map((invoice) => ({ ...invoice, wix: ensureWixDetails(invoice.wix) })),
              });
            }
          });
        }
      });

      return () => unsubscribeAuth();
    }

    setIsHydrated(true);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    // always persist locally
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));

    // if we have a signed in user and firestore available, persist remotely
    if (userId) {
      const db = getFirestoreDb();
      if (db) {
        const ref = doc(db, "crms", userId);
        void setDoc(ref, data, { merge: true }).catch((err) => {
          // ignore write failures (e.g., offline) — firestore will handle retries
          console.warn("Failed to write CRM data to Firestore", err);
        });
      }
    }
  }, [data, userId]);

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
        const nextVendorCosts = event.vendorCosts ? { ...event.vendorCosts } : {};
        if (nextVendorCosts[vendorId] !== undefined) {
          delete nextVendorCosts[vendorId];
        }

        return {
          ...event,
          vendorIds: nextVendorIds.length > 0 ? nextVendorIds : undefined,
          vendorCosts: Object.keys(nextVendorCosts).length > 0 ? nextVendorCosts : undefined,
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
          ...withGeneratedId({
            ...invoice,
            wix: ensureWixDetails(invoice.wix),
          }),
          items: invoice.items.map(withInvoiceItemId),
        },
        ...current.invoices.map((entry) => ({
          ...entry,
          wix: ensureWixDetails(entry.wix),
        })),
      ],
    }));

  const normalizeInvoiceItems = (items: InvoiceItemInput[]) =>
    items.map(withInvoiceItemId);

  const buildWixInvoiceLink = (invoiceId: string) =>
    `https://manage.wix.com/dashboard/business-tools/invoices/${invoiceId}`;

  const generateWixInvoice = (invoiceId: string) =>
    setData((current) => ({
      ...current,
      invoices: current.invoices.map((entry) => {
        if (entry.id !== invoiceId) {
          return {
            ...entry,
            wix: ensureWixDetails(entry.wix),
          };
        }

        const wix = ensureWixDetails(entry.wix);
        const wixInvoiceId = wix.invoiceId ?? `wix-${invoiceId}-${nanoid(6)}`;
        const paymentLink = wix.paymentLink ?? buildWixInvoiceLink(wixInvoiceId);

        return {
          ...entry,
          wix: {
            ...wix,
            invoiceId: wixInvoiceId,
            paymentLink,
            status: "generated",
            lastActionAt: new Date().toISOString(),
          },
        };
      }),
    }));

  const sendWixInvoice = (invoiceId: string) =>
    setData((current) => ({
      ...current,
      invoices: current.invoices.map((entry) => {
        if (entry.id !== invoiceId) {
          return {
            ...entry,
            wix: ensureWixDetails(entry.wix),
          };
        }

        const wix = ensureWixDetails(entry.wix);
        const wixInvoiceId = wix.invoiceId ?? `wix-${invoiceId}-${nanoid(6)}`;
        const paymentLink = wix.paymentLink ?? buildWixInvoiceLink(wixInvoiceId);

        return {
          ...entry,
          status: entry.status === "paid" ? entry.status : "sent",
          wix: {
            ...wix,
            invoiceId: wixInvoiceId,
            paymentLink,
            status: "sent",
            lastActionAt: new Date().toISOString(),
          },
        };
      }),
    }));

  const collectWixPayment = (invoiceId: string) =>
    setData((current) => ({
      ...current,
      invoices: current.invoices.map((entry) => {
        if (entry.id !== invoiceId) {
          return {
            ...entry,
            wix: ensureWixDetails(entry.wix),
          };
        }

        const wix = ensureWixDetails(entry.wix);
        const wixInvoiceId = wix.invoiceId ?? `wix-${invoiceId}-${nanoid(6)}`;
        const paymentLink = wix.paymentLink ?? buildWixInvoiceLink(wixInvoiceId);

        return {
          ...entry,
          status: "paid",
          wix: {
            ...wix,
            invoiceId: wixInvoiceId,
            paymentLink,
            status: "paid",
            lastActionAt: new Date().toISOString(),
          },
        };
      }),
    }));

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
              wix: ensureWixDetails(invoice.wix ?? entry.wix),
            }
          : {
              ...entry,
              wix: ensureWixDetails(entry.wix),
            }
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
    generateWixInvoice,
    sendWixInvoice,
    collectWixPayment,
  };
}
