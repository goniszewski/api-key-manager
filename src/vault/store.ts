import type { VaultEnvelope } from "./crypto";

const DB_NAME = "api-key-manager";
const STORE_NAME = "vault";
const VAULT_ID = "primary";

type VaultRow = {
  id: string;
  envelope: VaultEnvelope;
};

export async function loadVaultEnvelope(): Promise<VaultEnvelope | null> {
  const db = await openDatabase();
  return requestToPromise<VaultRow | undefined>(
    db.transaction(STORE_NAME, "readonly").objectStore(STORE_NAME).get(VAULT_ID),
  ).then((row) => row?.envelope ?? null);
}

export async function saveVaultEnvelope(envelope: VaultEnvelope): Promise<void> {
  const db = await openDatabase();
  await requestToPromise(
    db.transaction(STORE_NAME, "readwrite").objectStore(STORE_NAME).put({
      id: VAULT_ID,
      envelope,
    } satisfies VaultRow),
  );
}

export async function deleteVaultEnvelope(): Promise<void> {
  const db = await openDatabase();
  await requestToPromise(db.transaction(STORE_NAME, "readwrite").objectStore(STORE_NAME).delete(VAULT_ID));
}

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "id" });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("Unable to open vault database"));
  });
}

function requestToPromise<T = unknown>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("IndexedDB request failed"));
  });
}

