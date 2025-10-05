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
  status: "scheduled" | "in-progress" | "wrap-up";
}

export interface InvoiceItem {
  id: string;
  description: string;
  amount: number;
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
}

export interface CRMData {
  clients: Client[];
  vendors: Vendor[];
  events: Event[];
  invoices: Invoice[];
}
