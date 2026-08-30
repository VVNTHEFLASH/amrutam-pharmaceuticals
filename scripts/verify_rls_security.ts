import * as fs from 'fs';
import * as path from 'path';
import { createClient } from '@supabase/supabase-js';

function loadEnv() {
  const envPath = path.resolve(process.cwd(), '.env.local');
  if (!fs.existsSync(envPath)) process.exit(1);
  const content = fs.readFileSync(envPath, 'utf-8');
  for (const line of content.split('\n')) {
    const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?$/);
    if (match) {
      const key = match[1];
      let value = match[2] || '';
      if (value.startsWith('"') && value.endsWith('"')) value = value.substring(1, value.length - 1);
      process.env[key] = value.trim();
    }
  }
}
loadEnv();

const url = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const sRole = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const anon = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';
if (!url || !sRole || !anon) process.exit(1);

const admin = createClient(url, sRole, { auth: { persistSession: false, autoRefreshToken: false } });
const clientA = createClient(url, anon, { auth: { persistSession: false, autoRefreshToken: false } });
const clientB = createClient(url, anon, { auth: { persistSession: false, autoRefreshToken: false } });

// Skeleton run function to be appended
async function run() {
  const ts = Date.now();
  const emA = `rls-a-${ts}@example.com`, emB = `rls-b-${ts}@example.com`, pass = 'TestPass123!';
  let uA: any, uB: any, cartId: string | null = null;
  const hrId = `hr-rls-${ts}`, bkId = `bk-rls-${ts}`;

  try {
    // Seed dummy doctor and products to satisfy foreign keys
    const { error: ed } = await admin.from('doctors').upsert({ id: 'doc-rls-test', seed_index: 999991, name: 'Dr. Test', specialty: 'General', image_url: 'http', rating: 5, experience: 10, consultation_fee: 100, available_days: ['Monday'] });
    if (ed) throw new Error(`doctor upsert failed: ${ed.message}`);
    const { error: ep1}  = await admin.from('products').upsert({ id: 'prod-rls-test', seed_index: 999992, name: 'Prod Test 1', category: 'General', price: 10, description: 'Desc', image_url: 'http', rating: 4.5, stock: 100 });
    if (ep1) throw new Error(`product 1 upsert failed: ${ep1.message}`);
    const { error: ep2 } = await admin.from('products').upsert({ id: 'prod-rls-test-2', seed_index: 999993, name: 'Prod Test 2', category: 'General', price: 10, description: 'Desc', image_url: 'http', rating: 4.5, stock: 100 });
    if (ep2) throw new Error(`product 2 upsert failed: ${ep2.message}`);

    const { data: user1, error: e1 } = await admin.auth.admin.createUser({ email: emA, password: pass, email_confirm: true, user_metadata: { full_name: 'A', phone: '1' } });
    if (e1 || !user1.user) throw new Error(e1?.message);
    uA = user1.user;
    const { data: user2, error: e2 } = await admin.auth.admin.createUser({ email: emB, password: pass, email_confirm: true, user_metadata: { full_name: 'B', phone: '2' } });
    if (e2 || !user2.user) throw new Error(e2?.message);
    uB = user2.user;

    await new Promise(r => setTimeout(r, 2000));
    await clientA.auth.signInWithPassword({ email: emA, password: pass });
    await clientB.auth.signInWithPassword({ email: emB, password: pass });

    const { error: eHr } = await clientA.from('health_records').insert({ id: hrId, patient_name: 'A', doctor_name: 'Dr', date: '2026-08-30', diagnosis: 'Flu', treatment: 'R', prescription: 'M', type: 'Private', tags: ['t'], user_id: uA.id });
    if (eHr) throw new Error(eHr.message);
    const { error: eBk } = await clientA.from('bookings').insert({ id: bkId, user_id: uA.id, doctor_id: 'doc-rls-test', doctor_name: 'Dr', date_time: '2026-08-30T10:00:00Z', patient_name: 'A', status: 'synchronized' });
    if (eBk) throw new Error(eBk.message);

    const { error: eWl } = await clientA.from('wishlist_items').insert({ user_id: uA.id, product_id: 'prod-rls-test' });
    if (eWl) throw new Error(`wishlist insert failed: ${eWl.message}`);
    const { data: c, error: eC } = await clientA.from('carts').insert({ user_id: uA.id }).select('id').single();
    if (eC || !c) throw new Error(eC?.message);
    cartId = c.id;
    await clientA.from('cart_items').insert({ cart_id: cartId, product_id: 'prod-rls-test', quantity: 3 });

    // Profiles SELECT/UPDATE
    const { data: pS } = await clientB.from('profiles').select().eq('id', uA.id);
    if (pS && pS.length > 0) throw new Error('leak: profiles select');
    await clientB.from('profiles').update({ full_name: 'Hacked' }).eq('id', uA.id);
    const { data: pV } = await admin.from('profiles').select('full_name').eq('id', uA.id).single();
    if (pV?.full_name === 'Hacked') throw new Error('breach: profiles update');

    // Health Records SELECT/UPDATE/DELETE
    const { data: hrS } = await clientB.from('health_records').select().eq('id', hrId);
    if (hrS && hrS.length > 0) throw new Error('leak: health_records select');
    await clientB.from('health_records').update({ diagnosis: 'Hacked' }).eq('id', hrId);
    const { data: hrV } = await admin.from('health_records').select('diagnosis').eq('id', hrId).single();
    if (hrV?.diagnosis === 'Hacked') throw new Error('breach: health_records update');
    await clientB.from('health_records').delete().eq('id', hrId);
    const { data: hrDV } = await admin.from('health_records').select().eq('id', hrId).single();
    if (!hrDV) throw new Error('breach: health_records delete');

    // Bookings SELECT/UPDATE/DELETE
    const { data: bkS } = await clientB.from('bookings').select().eq('id', bkId);
    if (bkS && bkS.length > 0) throw new Error('leak: bookings select');
    await clientB.from('bookings').update({ patient_name: 'Hacked' }).eq('id', bkId);
    const { data: bkV } = await admin.from('bookings').select('patient_name').eq('id', bkId).single();
    if (bkV?.patient_name === 'Hacked') throw new Error('breach: bookings update');
    await clientB.from('bookings').delete().eq('id', bkId);
    const { data: bkDV } = await admin.from('bookings').select().eq('id', bkId).single();
    if (!bkDV) throw new Error('breach: bookings delete');

    // Wishlist SELECT/DELETE
    const { data: wlS } = await clientB.from('wishlist_items').select().eq('user_id', uA.id);
    if (wlS && wlS.length > 0) throw new Error('leak: wishlist select');
    await clientB.from('wishlist_items').delete().eq('user_id', uA.id);
    const { data: wlV } = await admin.from('wishlist_items').select().eq('user_id', uA.id);
    if (!wlV || wlV.length === 0) throw new Error('breach: wishlist delete');

    // Carts & Cart Items
    const { data: cS } = await clientB.from('carts').select().eq('id', cartId);
    if (cS && cS.length > 0) throw new Error('leak: carts select');
    const { data: ciS } = await clientB.from('cart_items').select().eq('cart_id', cartId);
    if (ciS && ciS.length > 0) throw new Error('leak: cart_items select');
    const { error: ciI } = await clientB.from('cart_items').insert({ cart_id: cartId, product_id: 'prod-rls-test-2', quantity: 2 });
    if (!ciI) {
      const { data: cr } = await admin.from('cart_items').select().eq('cart_id', cartId).eq('product_id', 'prod-rls-test-2');
      if (cr && cr.length > 0) throw new Error('breach: cart_items insert');
    }
    await clientB.from('cart_items').update({ quantity: 100 }).eq('cart_id', cartId);
    const { data: ciV } = await admin.from('cart_items').select('quantity').eq('cart_id', cartId).eq('product_id', 'prod-rls-test').single();
    if (ciV?.quantity === 100) throw new Error('breach: cart_items update');
    await clientB.from('cart_items').delete().eq('cart_id', cartId);
    const { data: ciDV } = await admin.from('cart_items').select().eq('cart_id', cartId);
    if (!ciDV || ciDV.length === 0) throw new Error('breach: cart_items delete');

    console.log('🏆 ALL SECURE CROSS-TENANT RLS POLICIES VERIFIED CORRECTLY!');
    process.exit(0);

  } catch (err: any) {
    console.error('💥 FAILURE:', err.message);
    process.exit(1);
  } finally {
    try {
      if (cartId) await admin.from('cart_items').delete().eq('cart_id', cartId);
      if (uA) {
        await admin.from('carts').delete().eq('user_id', uA.id);
        await admin.from('wishlist_items').delete().eq('user_id', uA.id);
        await admin.from('bookings').delete().eq('user_id', uA.id);
        await admin.from('health_records').delete().eq('id', hrId);
        await admin.auth.admin.deleteUser(uA.id);
      }
      if (uB) await admin.auth.admin.deleteUser(uB.id);
      await admin.from('products').delete().eq('id', 'prod-rls-test-2');
      await admin.from('products').delete().eq('id', 'prod-rls-test');
      await admin.from('doctors').delete().eq('id', 'doc-rls-test');
    } catch {}
  }
}
run();
