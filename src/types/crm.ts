export type ClientStatus = "lead" | "booked" | "planning" | "completed";

export interface Client {
  id: string;
  name: string;
  email: string;
  phone?: string;
  status: ClientStatus;
  eventDate?: string;
  budget?: number;
  notes?: string;
}

export interface Vendor {
  id: string;
  name: string;
  service: string;
  cost?: number;
  email?: string;
  phone?: string;
  website?: string;
  preferredContact?: "email" | "phone" | "text";
  notes?: string;
}

export interface Event {
  id: string;
  name: string;
  date: string;
  clientId: string;
  venue: string;
  coordinator: string;
  timeline?: string;
  vendorIds?: string[];
  status: "contacted" | "bid" | "confirmed";
  estimate?: number;
  deposit?: number;
  depositPaid?: boolean;
}

export interface InvoiceItem {
  id: string;
  description: string;
  amount: number;
}

export type InvoiceWixStatus = "not_created" | "generated" | "sent" | "paid";

export interface InvoiceWixDetails {
  status: InvoiceWixStatus;
  invoiceId?: string;
  paymentLink?: string;
  lastActionAt?: string;
}

export interface Invoice {
  id: string;
  clientId: string;
  issueDate: string;
  dueDate: string;
  status: "draft" | "sent" | "paid" | "overdue";
  total: number;
  items: InvoiceItem[];
  notes?: string;
  wix?: InvoiceWixDetails;
}

export interface CRMData {
  clients: Client[];
  vendors: Vendor[];
  events: Event[];
  invoices: Invoice[];
}
