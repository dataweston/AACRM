import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { formatCurrency } from "@/lib/format";

const mockCrmFunctions = {
  addClient: vi.fn(),
  updateClient: vi.fn(),
  deleteClient: vi.fn(),
  addVendor: vi.fn(),
  updateVendor: vi.fn(),
  deleteVendor: vi.fn(),
  addEvent: vi.fn(),
  updateEvent: vi.fn(),
  deleteEvent: vi.fn(),
  addInvoice: vi.fn(),
  updateInvoice: vi.fn(),
  deleteInvoice: vi.fn(),
};

const mockedData = {
  clients: [
    {
      id: "client-1",
      name: "Client One",
      email: "one@example.com",
      status: "lead" as const,
    },
    {
      id: "client-2",
      name: "Client Two",
      email: "two@example.com",
      status: "booked" as const,
    },
  ],
  vendors: [
    {
      id: "vendor-1",
      name: "Vendor One",
      service: "Catering",
      cost: 800,
    },
  ],
  events: [
    {
      id: "event-proposed",
      name: "Proposed Event",
      date: "2025-08-01",
      clientId: "client-1",
      venue: "Venue A",
      coordinator: "Coordinator A",
      status: "proposed" as const,
      estimate: 1000,
      vendorIds: [],
    },
    {
      id: "event-bid",
      name: "Bid Event",
      date: "2025-09-15",
      clientId: "client-2",
      venue: "Venue B",
      coordinator: "Coordinator B",
      status: "bid" as const,
      estimate: 2000,
      vendorIds: [],
    },
    {
      id: "event-contacted",
      name: "Contacted Event",
      date: "2025-10-20",
      clientId: "client-1",
      venue: "Venue C",
      coordinator: "Coordinator C",
      status: "contacted" as const,
      estimate: 500,
      vendorIds: [],
    },
    {
      id: "event-confirmed",
      name: "Confirmed Event",
      date: "2025-07-04",
      clientId: "client-2",
      venue: "Venue D",
      coordinator: "Coordinator D",
      status: "confirmed" as const,
      estimate: 4000,
      deposit: 1000,
      vendorIds: ["vendor-1"],
    },
  ],
  invoices: [
    {
      id: "invoice-1",
      clientId: "client-1",
      issueDate: "2025-01-01",
      dueDate: "2025-01-31",
      status: "sent" as const,
      total: 1500,
      items: [
        { id: "item-1", description: "Planning", amount: 1500 },
      ],
    },
  ],
};

vi.mock("@/components/auth/auth-provider", () => ({
  useAuth: () => ({
    session: {
      user: { name: "Alyssa", email: "alyssa@example.com" },
      signedInAt: "2024-01-01T00:00:00.000Z",
    },
    status: "authenticated" as const,
    signInWithGoogle: vi.fn(),
    signOut: vi.fn(),
  }),
}));

vi.mock("@/hooks/use-crm-data", () => ({
  useCrmData: () => ({
    data: mockedData,
    isHydrated: true,
    ...mockCrmFunctions,
  }),
}));

import HomePage from "@/app/page";

describe("pipeline calculations", () => {
  it("treats proposed events the same as bid sent for pipeline totals", async () => {
    render(<HomePage />);

    const user = userEvent.setup();
    await user.click(screen.getByRole("tab", { name: /Leads and ARR/i }));

    const pipelineCard = screen.getByText(/Pipeline value/i).closest("div");
    expect(pipelineCard).not.toBeNull();

    const proposedLabel = within(pipelineCard as HTMLElement).getByText("Proposed", {
      selector: "p",
    });

    expect(proposedLabel.parentElement).toHaveTextContent(formatCurrency(3500));
  });
});
