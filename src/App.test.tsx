import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import App from "./App";

afterEach(() => {
  window.history.pushState(null, "", "/");
});

describe("App", () => {
  it("renders the keys table with comments, tags, and icon refresh actions", () => {
    render(<App />);

    expect(screen.getByRole("heading", { name: "API Key Manager" })).toBeInTheDocument();
    expect(screen.getByText("OpenRouter production")).toBeInTheDocument();
    expect(screen.getByText("Used by public app fallback chain.")).toBeInTheDocument();
    expect(screen.getAllByText("prod").length).toBeGreaterThan(0);
    expect(screen.getByRole("button", { name: "Refresh metadata" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Refresh OpenRouter production" })).toBeInTheDocument();
  });

  it("groups keys on the Tags page and keeps comments visible", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole("button", { name: "Tags" }));

    const tagFilters = screen.getByRole("region", { name: "Tag filters" });
    expect(within(tagFilters).getByRole("button", { name: "prod 2 keys" })).toBeInTheDocument();
    expect(within(tagFilters).getByRole("button", { name: "routing 1 key" })).toBeInTheDocument();

    const tagPanel = screen.getByRole("region", { name: "Tag prod" });
    expect(within(tagPanel).getByText("2 keys")).toBeInTheDocument();
    expect(within(tagPanel).getByText("Only use for organization metadata refresh.")).toBeInTheDocument();
    expect(within(tagPanel).getByRole("button", { name: "Refresh tag metadata" })).toBeInTheDocument();
  });

  it("opens the Tags page from the hash URL", () => {
    window.history.pushState(null, "", "#tags");

    render(<App />);

    expect(screen.getByRole("region", { name: "Tag filters" })).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Tag prod" })).toBeInTheDocument();
  });

  it("documents client-only and provider limitations on About", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole("button", { name: "About" }));

    expect(screen.getByText(/runs entirely in your browser/i)).toBeInTheDocument();
    expect(screen.getByText(/Some providers block browser metadata calls/i)).toBeInTheDocument();
    expect(screen.getByText(/localStorage is not used for plaintext keys/i)).toBeInTheDocument();
  });

  it("auto-detects provider while adding a key and lets the user save tags and comment", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole("button", { name: "Add key" }));
    await user.type(screen.getByLabelText("Label"), "New router key");
    await user.type(screen.getByLabelText("API key"), "sk-or-v1-new-secret-value");
    await user.type(screen.getByLabelText("Tags"), "Prod, Routing");
    await user.type(screen.getByLabelText("Comment"), "Used for smoke tests");

    expect(screen.getByText("OpenRouter detected")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Save encrypted" }));

    expect(screen.getByText("New router key")).toBeInTheDocument();
    expect(screen.getByText("Used for smoke tests")).toBeInTheDocument();
  });
});
