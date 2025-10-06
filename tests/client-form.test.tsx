import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";

import { ClientForm } from "@/components/crm/client-form";

describe("ClientForm", () => {
  it("blocks submission until required fields are valid", async () => {
    const handleSubmit = vi.fn();
    const user = userEvent.setup();

    render(<ClientForm onSubmit={handleSubmit} />);

    const addButton = screen.getByRole("button", { name: /add client/i });
    const nameInput = screen.getByLabelText(/name \*/i);
    const emailInput = screen.getByLabelText(/email \*/i);
    const notesInput = screen.getByLabelText(/notes/i);

    await user.click(addButton);

    expect(handleSubmit).not.toHaveBeenCalled();
    expect(screen.getByText("Client name is required.")).toBeInTheDocument();
    expect(screen.getByText("Email is required.")).toBeInTheDocument();

    await user.type(nameInput, "A");
    await user.type(emailInput, "invalid");
    await user.click(addButton);

    expect(handleSubmit).not.toHaveBeenCalled();
    expect(nameInput).toHaveAttribute("aria-invalid", "true");
    expect(emailInput).toHaveAttribute("aria-invalid", "true");

    await user.type(nameInput, "my");
    await user.clear(emailInput);
    await user.type(emailInput, "client@example.com");
    await user.type(notesInput, "  needs timeline  ");
    await user.click(addButton);

    expect(handleSubmit).toHaveBeenCalledTimes(1);
    expect(handleSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "Amy",
        email: "client@example.com",
        notes: "needs timeline",
      }),
      undefined
    );
  });
});
