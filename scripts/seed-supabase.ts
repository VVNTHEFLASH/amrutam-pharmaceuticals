// @ts-nocheck
import * as fs from 'fs';
import * as path from 'path';
import { createClient } from '@supabase/supabase-js';
import { 
  generateDoctors, 
  generateProducts, 
  generateHealthRecords,
  TOTAL_DOCTORS,
  TOTAL_PRODUCTS,
  TOTAL_HEALTH_RECORDS
} from '../src/services/mockData';

// 1. Manually load `.env.local` to avoid extra npm packages like dotenv
function loadEnv() {
  const envPath = path.resolve(process.cwd(), '.env.local');
  if (!fs.existsSync(envPath)) {
    console.error('⚠️ No .env.local file found. Please create one with Supabase credentials.');
    process.exit(1);
  }
  const content = fs.readFileSync(envPath, 'utf-8');
  for (const line of content.split('\n')) {
    const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?$/);
    if (match) {
      const key = match[1];
      let value = match[2] || '';
      if (value.startsWith('"') && value.endsWith('"')) {
        value = value.substring(1, value.length - 1);
      }
      process.env[key] = value.trim();
    }
  }
}

async function seed() {
  loadEnv();

  const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing EXPO_PUBLIC_SUPABASE_URL or EXPO_PUBLIC_SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY in .env.local');
    process.exit(1);
  }

  const isServiceRole = !!process.env.SUPABASE_SERVICE_ROLE_KEY;
  console.log(`🔌 Connecting to Supabase at: ${supabaseUrl}`);
  console.log(`🔑 Using key type: ${isServiceRole ? 'Service Role Key (bypasses RLS)' : 'Anon/Public Key'}`);

  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false }
  });

  const BATCH_SIZE = 500;

  // --- SEED DOCTORS ---
  console.log('\n👨⚕️ Seeding Doctors...');
  let doctorsUpserted = 0;
  for (let offset = 0; offset < TOTAL_DOCTORS; offset += BATCH_SIZE) {
    const limit = Math.min(BATCH_SIZE, TOTAL_DOCTORS - offset);
    const mockDoctors = generateDoctors(offset, limit);

    const dbBatch = mockDoctors.map((doc, idx) => ({
      id: doc.id,
      seed_index: offset + idx,
      name: doc.name,
      specialty: doc.specialty,
      image_url: doc.imageUrl,
      rating: doc.rating,
      experience: doc.experience,
      consultation_fee: doc.consultationFee,
      available_days: doc.availableDays,
    }));

    const { error } = await supabase.from('doctors').upsert(dbBatch, { onConflict: 'id' });
    if (error) {
      console.error(`❌ Error seeding doctors batch at offset ${offset}:`, error.message);
      process.exit(1);
    }
    doctorsUpserted += dbBatch.length;
    console.log(`   Progress: [${doctorsUpserted}/${TOTAL_DOCTORS}] doctors upserted`);
  }

  // --- SEED PRODUCTS ---
  console.log('\n💊 Seeding Products...');
  let productsUpserted = 0;
  for (let offset = 0; offset < TOTAL_PRODUCTS; offset += BATCH_SIZE) {
    const limit = Math.min(BATCH_SIZE, TOTAL_PRODUCTS - offset);
    const mockProducts = generateProducts(offset, limit);

    const dbBatch = mockProducts.map((prod, idx) => ({
      id: prod.id,
      seed_index: offset + idx,
      name: prod.name,
      category: prod.category,
      price: prod.price,
      description: prod.description,
      image_url: prod.imageUrl,
      rating: prod.rating,
      stock: prod.stock,
    }));

    const { error } = await supabase.from('products').upsert(dbBatch, { onConflict: 'id' });
    if (error) {
      console.error(`❌ Error seeding products batch at offset ${offset}:`, error.message);
      process.exit(1);
    }
    productsUpserted += dbBatch.length;
    console.log(`   Progress: [${productsUpserted}/${TOTAL_PRODUCTS}] products upserted`);
  }

  // --- SEED HEALTH RECORDS ---
  console.log('\n📋 Seeding Health Records...');
  let healthRecordsUpserted = 0;
  for (let offset = 0; offset < TOTAL_HEALTH_RECORDS; offset += BATCH_SIZE) {
    const limit = Math.min(BATCH_SIZE, TOTAL_HEALTH_RECORDS - offset);
    const mockRecords = generateHealthRecords(offset, limit);

    const dbBatch = mockRecords.map((rec, idx) => ({
      id: rec.id,
      seed_index: offset + idx,
      patient_name: rec.patientName,
      doctor_name: rec.doctorName,
      date: rec.date,
      diagnosis: rec.diagnosis,
      treatment: rec.treatment,
      prescription: rec.prescription,
      attachment_url: rec.attachmentUrl || null,
      type: rec.type,
      tags: rec.tags,
    }));

    const { error } = await supabase.from('health_records').upsert(dbBatch, { onConflict: 'id' });
    if (error) {
      console.error(`❌ Error seeding health records batch at offset ${offset}:`, error.message);
      process.exit(1);
    }
    healthRecordsUpserted += dbBatch.length;
    console.log(`   Progress: [${healthRecordsUpserted}/${TOTAL_HEALTH_RECORDS}] health records upserted`);
  }

  console.log('\n✅ Seeding Completed successfully!');
  console.log(`📊 Summary:`);
  console.log(`   - Doctors Upserted: ${doctorsUpserted}`);
  console.log(`   - Products Upserted: ${productsUpserted}`);
  console.log(`   - Health Records Upserted: ${healthRecordsUpserted}`);
}

seed().catch((err) => {
  console.error('❌ Unhandled error during seeding:', err);
  process.exit(1);
});
