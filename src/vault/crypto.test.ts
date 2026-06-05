import { describe, expect, it } from "vitest";
import { decryptVault, encryptVault } from "./crypto";

describe("vault crypto", () => {
  it("encrypts and decrypts a vault payload with a passphrase", async () => {
    const payload = {
      version: 1,
      keys: [{ id: "key-1", keyValue: "sk-or-v1-secret" }],
    };

    const envelope = await encryptVault(payload, "correct horse battery staple");
    const decrypted = await decryptVault(envelope, "correct horse battery staple");

    expect(envelope.ciphertext).not.toContain("sk-or-v1-secret");
    expect(decrypted).toEqual(payload);
  });

  it("rejects when decrypting with the wrong passphrase", async () => {
    const envelope = await encryptVault({ version: 1, keys: [] }, "right passphrase");

    await expect(decryptVault(envelope, "wrong passphrase")).rejects.toThrow("Unable to decrypt vault");
  });
});

