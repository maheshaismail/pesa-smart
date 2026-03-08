import { openDB, type IDBPDatabase } from 'idb';

const DB_NAME = 'pesasmart-offline';
const DB_VERSION = 1;
const TX_STORE = 'pending_transactions';

interface PendingTransaction {
  id?: number;
  amount: number;
  type: 'income' | 'expense';
  category: string;
  description: string;
  transaction_date: string;
  created_at: string;
  synced: boolean;
}

let dbPromise: Promise<IDBPDatabase> | null = null;

function getDB() {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(TX_STORE)) {
          const store = db.createObjectStore(TX_STORE, { keyPath: 'id', autoIncrement: true });
          store.createIndex('synced', 'synced');
        }
      },
    });
  }
  return dbPromise;
}

export async function saveOfflineTransaction(tx: Omit<PendingTransaction, 'id' | 'synced' | 'created_at'>) {
  const db = await getDB();
  await db.add(TX_STORE, {
    ...tx,
    created_at: new Date().toISOString(),
    synced: false,
  });
}

export async function getPendingTransactions(): Promise<PendingTransaction[]> {
  const db = await getDB();
  const index = db.transaction(TX_STORE).store.index('synced');
  return index.getAll(IDBKeyRange.only(false));
}

export async function markTransactionSynced(id: number) {
  const db = await getDB();
  const tx = await db.get(TX_STORE, id);
  if (tx) {
    tx.synced = true;
    await db.put(TX_STORE, tx);
  }
}

export async function clearSyncedTransactions() {
  const db = await getDB();
  const tx = db.transaction(TX_STORE, 'readwrite');
  const index = tx.store.index('synced');
  let cursor = await index.openCursor(IDBKeyRange.only(true));
  while (cursor) {
    await cursor.delete();
    cursor = await cursor.continue();
  }
}

export async function getPendingCount(): Promise<number> {
  const pending = await getPendingTransactions();
  return pending.length;
}

export function isOnline(): boolean {
  return navigator.onLine;
}
