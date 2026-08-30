import { doctorRepository } from '../src/services/repositories/doctorRepository';
import { apiMockConfig } from '../src/services/api/apiClient';
import { connectivityService } from '../src/services/connectivity';
import { bookingSyncService, setCustomNowFn } from '../src/services/bookingSyncService';
import { useClientStore } from '../src/store/clientStore';
import { Product } from '../src/types/domain';

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ FAILED: ${message}`);
    process.exit(1);
  }
  console.log(`✅ PASSED: ${message}`);
}

async function waitForSyncToFinish() {
  while (bookingSyncService.getIsSyncing()) {
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
}

export async function runTests() {
  console.log('--- STARTING OFFLINE SYNCHRONIZATION TESTS ---');

  // Wait for store hydration to complete since AsyncStorage is asynchronous
  while (!useClientStore.persist.hasHydrated()) {
    await new Promise((resolve) => setTimeout(resolve, 50));
  }

  // Set virtual current clock to Aug 30, 2026 at 10:00 AM
  setCustomNowFn(() => new Date(2026, 7, 30, 10, 0));

  // Reset store parameters
  useClientStore.getState().clearCart();
  useClientStore.getState().removeSyncedBookings();
  useClientStore.getState().bookingQueue.forEach((b) => {
    useClientStore.getState().removeQueuedBooking(b.id);
  });

  const mockProduct: Product = {
    id: 'prod-1',
    name: 'Amrutam Gold Syrup',
    category: 'Hair Care',
    price: 350,
    description: 'Gold syrup extract',
    imageUrl: 'url',
    rating: 4.8,
    stock: 10,
  };

  // 1. Offline Cart
  connectivityService.forceConnected(false);
  assert(!connectivityService.getIsConnected(), 'Connectivity state is offline');

  const store = useClientStore.getState();
  store.addToCart(mockProduct, 2);
  assert(useClientStore.getState().cart.length === 1, 'Product added offline');
  assert(useClientStore.getState().cart[0].quantity === 2, 'Quantity matches');

  store.updateCartQuantity('prod-1', 4);
  assert(useClientStore.getState().cart[0].quantity === 4, 'Quantity updated offline');

  const savedCart = useClientStore.getState().cart;
  assert(savedCart.length === 1 && savedCart[0].quantity === 4, 'Cart survives state reads');

  store.clearCart();
  assert(useClientStore.getState().cart.length === 0, 'Cart cleared');

  // 2. Offline Booking & Queue Survival
  connectivityService.forceConnected(false);
  const bId = `book-offline-${Date.now()}`;
  store.enqueueBooking({
    id: bId,
    doctorId: 'doc-1',
    doctorName: 'Dr. Shruti Sharma',
    dateTime: new Date(2026, 7, 30, 14, 0).toISOString(),
    patientName: 'Vishnu Sowmiya',
    status: 'pending',
    createdAt: new Date(2026, 7, 30, 11, 0).toISOString(),
  });

  const queue = useClientStore.getState().bookingQueue;
  assert(queue.length === 1, 'Booking queued offline');
  assert(queue[0].id === bId, 'Queue ID matches');

  // 3. Successful Synchronization
  const originalGetAvailableSlots = doctorRepository.getAvailableSlots;
  doctorRepository.getAvailableSlots = async () => [{ time: '02:00 PM', isAvailable: true }];

  connectivityService.forceConnected(true);
  assert(connectivityService.getIsConnected(), 'Connected online');
  await waitForSyncToFinish();

  await bookingSyncService.sync();

  const syncQueue = useClientStore.getState().bookingQueue;
  console.log('SYNC QUEUE RECORD:', syncQueue[0]);
  assert(syncQueue[0].status === 'synchronized', 'Booking successfully synchronized');

  useClientStore.getState().removeQueuedBooking(bId);
  doctorRepository.getAvailableSlots = originalGetAvailableSlots;

  // 4. Expired Booking
  connectivityService.forceConnected(false);
  const expBId = `book-expired-${Date.now()}`;
  store.enqueueBooking({
    id: expBId,
    doctorId: 'doc-1',
    doctorName: 'Dr. Shruti Sharma',
    dateTime: new Date(2026, 7, 30, 14, 0).toISOString(),
    patientName: 'Vishnu Sowmiya',
    status: 'pending',
    createdAt: new Date(2026, 7, 30, 11, 0).toISOString(),
  });

  setCustomNowFn(() => new Date(2026, 7, 30, 15, 0));

  connectivityService.forceConnected(true);
  await waitForSyncToFinish();
  await bookingSyncService.sync();

  const expQueue = useClientStore.getState().bookingQueue;
  const expItem = expQueue.find((b) => b.id === expBId);
  assert(expItem !== undefined, 'Expired booking exists');
  assert(expItem?.status === 'failed', 'Status is failed');
  assert(expItem?.errorReason === 'Selected slot has expired.', 'Expiry error matched');

  useClientStore.getState().removeQueuedBooking(expBId);
  setCustomNowFn(() => new Date(2026, 7, 30, 10, 0));

  // 5. Conflict
  connectivityService.forceConnected(false);
  const confBId = `book-conflict-${Date.now()}`;
  store.enqueueBooking({
    id: confBId,
    doctorId: 'doc-1',
    doctorName: 'Dr. Shruti Sharma',
    dateTime: new Date(2026, 7, 30, 14, 0).toISOString(),
    patientName: 'Vishnu Sowmiya',
    status: 'pending',
    createdAt: new Date(2026, 7, 30, 11, 0).toISOString(),
  });

  doctorRepository.getAvailableSlots = async () => [{ time: '02:00 PM', isAvailable: false }];

  connectivityService.forceConnected(true);
  await waitForSyncToFinish();
  await bookingSyncService.sync();

  const confQueue = useClientStore.getState().bookingQueue;
  const confItem = confQueue.find((b) => b.id === confBId);
  assert(confItem?.status === 'failed', 'Conflict booking failed');
  assert(confItem?.errorReason === 'Slot no longer available.', 'Conflict error matched');

  useClientStore.getState().removeQueuedBooking(confBId);
  doctorRepository.getAvailableSlots = originalGetAvailableSlots;

  // 6. Duplicate Protection
  connectivityService.forceConnected(false);
  const d1 = `dup1-${Date.now()}`;
  store.enqueueBooking({
    id: d1,
    doctorId: 'doc-1',
    doctorName: 'Dr. Shruti Sharma',
    dateTime: new Date(2026, 7, 30, 14, 0).toISOString(),
    patientName: 'Vishnu Sowmiya',
    status: 'synchronized',
    createdAt: new Date(2026, 7, 30, 11, 0).toISOString(),
  });

  const d2 = `dup2-${Date.now()}`;
  store.enqueueBooking({
    id: d2,
    doctorId: 'doc-1',
    doctorName: 'Dr. Shruti Sharma',
    dateTime: new Date(2026, 7, 30, 14, 0).toISOString(),
    patientName: 'Vishnu Sowmiya',
    status: 'pending',
    createdAt: new Date(2026, 7, 30, 11, 0).toISOString(),
  });

  connectivityService.forceConnected(true);
  doctorRepository.getAvailableSlots = async () => [{ time: '02:00 PM', isAvailable: true }];
  await waitForSyncToFinish();

  await bookingSyncService.sync();

  const dupQueue = useClientStore.getState().bookingQueue;
  const dup2Item = dupQueue.find((b) => b.id === d2);
  assert(dup2Item?.status === 'failed', 'Duplicate booking rejected');
  assert(dup2Item?.errorReason === 'Slot already booked.', 'Duplicate error message matches');

  useClientStore.getState().removeQueuedBooking(d1);
  useClientStore.getState().removeQueuedBooking(d2);
  doctorRepository.getAvailableSlots = originalGetAvailableSlots;

  // 7. Retry on Transient Network Failure
  connectivityService.forceConnected(false);
  const transientId = `transient-${Date.now()}`;
  store.enqueueBooking({
    id: transientId,
    doctorId: 'doc-1',
    doctorName: 'Dr. Shruti Sharma',
    dateTime: new Date(2026, 7, 30, 14, 0).toISOString(),
    patientName: 'Vishnu Sowmiya',
    status: 'pending',
    createdAt: new Date(2026, 7, 30, 11, 0).toISOString(),
  });

  apiMockConfig.setMode('NETWORK_FAILURE');
  connectivityService.forceConnected(true);
  await waitForSyncToFinish();

  try {
    await bookingSyncService.sync();
  } catch (e) {
    // Expected throw on network failures
  }

  const retryQueue = useClientStore.getState().bookingQueue;
  const retryItem = retryQueue.find((b) => b.id === transientId);
  assert(retryItem?.status === 'pending', 'Remained pending for future retry');
  assert(!!retryItem?.attempts && retryItem.attempts >= 1, 'Attempts incremented');

  apiMockConfig.setMode('SUCCESS');
  useClientStore.getState().removeQueuedBooking(transientId);

  // 8. Concurrency Protection
  store.enqueueBooking({
    id: 'conc-test',
    doctorId: 'doc-1',
    doctorName: 'Dr. Shruti Sharma',
    dateTime: new Date(2026, 7, 30, 14, 0).toISOString(),
    patientName: 'Vishnu Sowmiya',
    status: 'pending',
    createdAt: new Date(2026, 7, 30, 11, 0).toISOString(),
  });

  doctorRepository.getAvailableSlots = async () => {
    await new Promise((resolve) => setTimeout(resolve, 50));
    return [{ time: '02:00 PM', isAvailable: true }];
  };

  const p1 = bookingSyncService.sync();
  const p2 = bookingSyncService.sync();
  assert(bookingSyncService.getIsSyncing() === true, 'Syncing is correctly in progress');
  await Promise.all([p1, p2]);
  console.log('IS SYNCING AFTER AWAIT:', bookingSyncService.getIsSyncing());
  assert(bookingSyncService.getIsSyncing() === false, 'Sync ended successfully');

  useClientStore.getState().removeQueuedBooking('conc-test');
  doctorRepository.getAvailableSlots = originalGetAvailableSlots;
  setCustomNowFn(null);

  console.log('🎉 ALL OFFLINE SYNCHRONIZATION TESTS PASSED SUCCESSFULLY! 🎉');
}
runTests().catch((e) => {
  console.error(e);
  process.exit(1);
});
