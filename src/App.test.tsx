import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import App from "./App";

afterEach(() => {
  window.history.pushState(null, "", "/");
  window.localStorage.clear();
  vi.restoreAllMocks();
});

describe("App", () => {
  it("shows dimmed showcase data before the first real key is added", () => {
    render(<App />);

    expect(screen.getByRole("heading", { name: "API Key Manager" })).toBeInTheDocument();
    expect(screen.getByText("Create a passphrase to save an encrypted vault in this browser.")).toBeInTheDocument();
    const showcase = screen.getByRole("region", { name: "Demo key showcase" });
    expect(within(showcase).getByText("Showcase data")).toBeInTheDocument();
    expect(within(showcase).getByText("OpenRouter production")).toBeInTheDocument();
    expect(within(showcase).getAllByText("Demo").length).toBeGreaterThan(0);
    expect(within(showcase).getByRole("button", { name: "Refresh OpenRouter production" })).toBeDisabled();
    expect(within(showcase).getByRole("button", { name: "Clear showcase data" })).toBeInTheDocument();
    expect(screen.queryByText("No keys yet.")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Refresh metadata" })).toBeInTheDocument();
  });

  it("lets the user clear the showcase data", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole("button", { name: "Clear showcase data" }));

    expect(screen.queryByRole("region", { name: "Demo key showcase" })).not.toBeInTheDocument();
    expect(screen.queryByText("OpenRouter production")).not.toBeInTheDocument();
    expect(screen.getByText("No keys yet.")).toBeInTheDocument();
  });

  it("keeps the showcase hidden after the user clears it", async () => {
    const user = userEvent.setup();
    const { unmount } = render(<App />);

    await user.click(screen.getByRole("button", { name: "Clear showcase data" }));
    unmount();
    render(<App />);

    expect(screen.queryByRole("region", { name: "Demo key showcase" })).not.toBeInTheDocument();
    expect(screen.getByText("No keys yet.")).toBeInTheDocument();
  });

  it("groups keys on the Tags page and keeps comments visible", async () => {
    const user = userEvent.setup();
    render(<App />);

    await addKey(user, {
      label: "OpenRouter production",
      key: "sk-or-v1-test-openrouter-secret",
      tags: "Prod, Routing",
      comment: "Used by public app fallback chain.",
    });
    await addKey(user, {
      label: "OpenAI admin",
      key: "sk-proj-test-openai-secret",
      tags: "Admin, Prod",
      comment: "Only use for organization metadata refresh.",
    });
    await user.click(screen.getByRole("button", { name: "Tags" }));

    const tagFilters = screen.getByRole("region", { name: "Tag filters" });
    expect(within(tagFilters).getByRole("button", { name: "prod 2 keys" })).toBeInTheDocument();
    expect(within(tagFilters).getByRole("button", { name: "routing 1 key" })).toBeInTheDocument();

    const tagPanel = screen.getByRole("region", { name: "Tag prod" });
    const tagSummary = within(tagPanel).getByRole("region", { name: "Tag summary" });
    expect(tagSummary).toHaveClass("summary-strip");
    expect(within(tagPanel).getByText("2 keys")).toBeInTheDocument();
    expect(within(tagPanel).getByText("Only use for organization metadata refresh.")).toBeInTheDocument();
    expect(within(tagPanel).getByRole("button", { name: "Refresh tag metadata" })).toBeInTheDocument();
  });

  it("opens the Tags page from the hash URL", () => {
    window.history.pushState(null, "", "#tags");

    render(<App />);

    expect(screen.getByText("No tags yet.")).toBeInTheDocument();
  });

  it("renders provider cards with favicons and compact metadata", async () => {
    const user = userEvent.setup();
    render(<App />);

    await addKey(user, {
      label: "OpenAI admin",
      key: "sk-proj-test-openai-secret",
      tags: "Admin",
      comment: "Only use for organization metadata refresh.",
    });
    await addKey(user, {
      label: "OpenRouter production",
      key: "sk-or-v1-test-openrouter-secret",
      tags: "Prod",
      comment: "Used by public app fallback chain.",
    });
    await user.click(screen.getByRole("button", { name: "Providers" }));

    const openAi = screen.getByRole("region", { name: "OpenAI provider summary" });
    expect(within(openAi).getByRole("img", { name: "OpenAI favicon" })).toHaveAttribute(
      "src",
      expect.stringContaining("domain=openai.com"),
    );
    expect(within(openAi).getByText("1 key")).toBeInTheDocument();
    expect(within(openAi).getByText("Manual")).toHaveClass("provider-signal");
    expect(within(openAi).getByText("Richer metadata generally requires Admin API.")).toBeInTheDocument();

    const openRouter = screen.getByRole("region", { name: "OpenRouter provider summary" });
    expect(within(openRouter).getByRole("img", { name: "OpenRouter favicon" })).toHaveAttribute(
      "src",
      expect.stringContaining("domain=openrouter.ai"),
    );
    expect(within(openRouter).getByText("1 key")).toBeInTheDocument();
    expect(within(openRouter).getByText("Manual")).toHaveClass("provider-signal");
  });

  it("documents client-only and provider limitations on About", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole("button", { name: "About" }));

    expect(screen.getByRole("table", { name: "Vault limitations and responsibilities" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "Area" })).toBeInTheDocument();
    expect(screen.getByRole("rowheader", { name: "Metadata refresh" })).toBeInTheDocument();
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
    expect(screen.queryByRole("region", { name: "Demo key showcase" })).not.toBeInTheDocument();
    expect(screen.queryByText("OpenRouter production")).not.toBeInTheDocument();
  });

  it("asks for provider confirmation when an OpenAI-compatible key shape is ambiguous", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole("button", { name: "Add key" }));
    await user.type(screen.getByLabelText("Label"), "DeepSeek batch");
    await user.type(screen.getByLabelText("API key"), "sk-deepseek-compatible-secret");

    expect(screen.getByText("OpenAI-style key detected")).toBeInTheDocument();
    expect(screen.getByText(/DeepSeek and other OpenAI-compatible platforms can use the same key shape/i)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "DeepSeek" }));
    await user.type(screen.getByLabelText("Tags"), "Batch");
    await user.type(screen.getByLabelText("Comment"), "Confirmed provider during add.");
    await user.click(screen.getByRole("button", { name: "Save encrypted" }));

    expect(screen.getByText("DeepSeek batch")).toBeInTheDocument();
    expect(screen.getByText("DeepSeek")).toBeInTheDocument();
    expect(screen.getByText("Confirmed provider during add.")).toBeInTheDocument();
  });

  it("lets the user edit and delete a saved key", async () => {
    const user = userEvent.setup();
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(true);
    render(<App />);

    await addKey(user, {
      label: "OpenRouter production",
      key: "sk-or-v1-test-openrouter-secret",
      tags: "Prod",
      comment: "Original comment.",
    });

    await user.click(screen.getByRole("button", { name: "Edit OpenRouter production" }));
    await user.clear(screen.getByLabelText("Label"));
    await user.type(screen.getByLabelText("Label"), "DeepSeek batch");
    await user.clear(screen.getByLabelText("API key"));
    await user.type(screen.getByLabelText("API key"), "sk-deepseek-compatible-secret");
    await user.click(screen.getByRole("button", { name: "DeepSeek" }));
    await user.clear(screen.getByLabelText("Comment"));
    await user.type(screen.getByLabelText("Comment"), "Updated during edit.");
    await user.click(screen.getByRole("button", { name: "Save changes" }));

    expect(screen.getByText("DeepSeek batch")).toBeInTheDocument();
    expect(screen.queryByText("OpenRouter production")).not.toBeInTheDocument();
    expect(screen.getByText("Updated during edit.")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Delete DeepSeek batch" }));

    expect(confirm).toHaveBeenCalledWith('Delete "DeepSeek batch" from this vault?');
    expect(screen.queryByText("DeepSeek batch")).not.toBeInTheDocument();
    expect(screen.getByText("No keys yet.")).toBeInTheDocument();
  });

  it("clears plaintext records and an open edit form when the vault locks", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.type(screen.getByLabelText("Vault passphrase"), "correct horse battery staple");
    await addKey(user, {
      label: "OpenRouter production",
      key: "sk-or-v1-test-openrouter-secret",
      tags: "Prod",
      comment: "Original comment.",
    });
    await user.click(screen.getByRole("button", { name: "Edit OpenRouter production" }));

    expect(screen.getByLabelText("API key")).toHaveValue("sk-or-v1-test-openrouter-secret");

    await user.click(screen.getByRole("button", { name: "Lock vault" }));

    expect(screen.getByLabelText("Vault passphrase")).toHaveValue("");
    expect(screen.queryByText("OpenRouter production")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("API key")).not.toBeInTheDocument();
  });
});

async function addKey(
  user: ReturnType<typeof userEvent.setup>,
  key: {
    label: string;
    key: string;
    tags: string;
    comment: string;
  },
) {
  await user.click(screen.getByRole("button", { name: "Add key" }));
  await user.clear(screen.getByLabelText("Label"));
  await user.type(screen.getByLabelText("Label"), key.label);
  await user.clear(screen.getByLabelText("API key"));
  await user.type(screen.getByLabelText("API key"), key.key);
  await user.clear(screen.getByLabelText("Tags"));
  await user.type(screen.getByLabelText("Tags"), key.tags);
  await user.clear(screen.getByLabelText("Comment"));
  await user.type(screen.getByLabelText("Comment"), key.comment);
  await user.click(screen.getByRole("button", { name: "Save encrypted" }));
}
