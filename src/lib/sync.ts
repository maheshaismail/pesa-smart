import { supabase } from '@/integrations/supabase/client';
import { getPendingTransactions, markTransactionSynced, clearSyncedTransactions } from './offline-db';

let syncing = false;

export async function syncPendingTransactions(): Promise<number> {
  if (syncing || !navigator.onLine) return 0;
  syncing = true;

  try {
    const pending = await getPendingTransactions();
    if (pending.length === 0) return 0;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return 0;

    let synced = 0;
    for (const tx of pending) {
      try {
        const { error } = await supabase.from('transactions').insert({
          user_id: user.id,
          amount: tx.amount,
          type: tx.type,
          category: tx.category,
          description: tx.description,
          transaction_date: tx.transaction_date,
        });
        if (!error) {
          await markTransactionSynced(tx.id!);
          synced++;
        }
      } catch {
        // Skip failed items, will retry next sync
      }
    }

    await clearSyncedTransactions();
    return synced;
  } finally {
    syncing = false;
  }
}

// Auto-sync when coming online
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    syncPendingTransactions().then(count => {
      if (count > 0) {
        console.log(`Synced ${count} offline transactions`);
      }
    });
  });
}
