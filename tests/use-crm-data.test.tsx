import { act, renderHook, waitFor } from "@testing-library/react";

import { useCrmData } from "@/hooks/use-crm-data";

describe("useCrmData", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("adds, updates, and deletes a client", async () => {
    const { result } = renderHook(() => useCrmData());

    await waitFor(() => expect(result.current.isHydrated).toBe(true));

    const initialCount = result.current.data.clients.length;

    act(() => {
      result.current.addClient({
        name: "Test Client",
        email: "test@example.com",
        status: "lead",
      });
    });

    expect(result.current.data.clients.length).toBe(initialCount + 1);
    const createdClient = result.current.data.clients[0];
    expect(createdClient.name).toBe("Test Client");

    act(() => {
      result.current.updateClient(createdClient.id, {
        ...createdClient,
        status: "booked",
      });
    });

    const updatedClient = result.current.data.clients.find((client) => client.id === createdClient.id);
    expect(updatedClient?.status).toBe("booked");

    act(() => {
      result.current.deleteClient(createdClient.id);
    });

    expect(result.current.data.clients.some((client) => client.id === createdClient.id)).toBe(false);
  });

  it("updates invoice totals and regenerates missing item ids", async () => {
    const { result } = renderHook(() => useCrmData());

    await waitFor(() => expect(result.current.isHydrated).toBe(true));

    const existingInvoice = result.current.data.invoices[0];
    const newItems = existingInvoice.items.map((item, index) => ({
      description: `${item.description} v2`,
      amount: item.amount + (index + 1) * 10,
      id: index === 0 ? item.id : undefined,
    }));

    act(() => {
      result.current.updateInvoice(existingInvoice.id, {
        clientId: existingInvoice.clientId,
        issueDate: existingInvoice.issueDate,
        dueDate: existingInvoice.dueDate,
        status: "sent",
        total: newItems.reduce((sum, item) => sum + item.amount, 0),
        items: newItems,
        notes: "Updated scope",
      });
    });

    const updatedInvoice = result.current.data.invoices.find((invoice) => invoice.id === existingInvoice.id);
    expect(updatedInvoice).toBeDefined();
    expect(updatedInvoice?.status).toBe("sent");
    expect(updatedInvoice?.items).toHaveLength(newItems.length);
    updatedInvoice?.items.forEach((item) => {
      expect(item.id).toBeTruthy();
    });
    expect(updatedInvoice?.notes).toBe("Updated scope");
  });
});
