import { Doctor, HealthRecord, Product } from '@/types/domain';

const S_NAMES = ['Aarav', 'Aditi', 'Amit', 'Amrita', 'Ananya', 'Arjun', 'Dev', 'Divya', 'Ganesh', 'Ira', 'Karan', 'Kavya', 'Manish', 'Neha', 'Pranav'];
const S_LAST = ['Sharma', 'Verma', 'Gupta', 'Patel', 'Mehta', 'Joshi', 'Rao', 'Nair', 'Iyer', 'Reddy'];
const SPECIALTIES = ['Ayurvedic Specialist', 'General Physician', 'Homeopathic Specialist', 'Dermatologist', 'Pediatrician', 'Cardiologist', 'Dentist', 'Neurologist'];
const CATS = ['Ayurvedic Medicine', 'Homeopathy', 'Wellness & Nutrition', 'Personal Care', 'Baby Care', 'Devices'];
const PREFIX = ['Amrutam', 'Himalaya', 'Vicco', 'Patanjali', 'Dabur', 'Zandu'];
const ADJ = ['Classic', 'Premium', 'Herbal', 'Natural', 'Organic', 'Pure'];
const NOUN = ['Churn', 'Oil', 'Capsules', 'Tablet', 'Syrup', 'Balm', 'Powder'];
const DIAGNOSES = ['Seasonal Influenza', 'Gastroenteritis', 'Dermatitis', 'Hypertension', 'Diabetes', 'Migraine'];
const TREATMENTS = ['Rest & Hydration', 'Oral medication', 'Topical cream', 'Daily tablet', 'Diet check', 'Pain relievers'];
const PRESCRIPTIONS = ['Tab. Paracetamol', 'Cap. Probiotic', 'Cream Hydrocortisone', 'Tab. Amlodipine', 'Tab. Metformin', 'Tab. Naproxen'];

function seededRandom(seedValue: number): number {
  const x = Math.sin(seedValue) * 10000;
  return x - Math.floor(x);
}

export function getDoctorByIndex(i: number): Doctor {
  const seed = i + 1000;
  const r1 = seededRandom(seed + 1);
  const r2 = seededRandom(seed + 2);
  const r3 = seededRandom(seed + 3);
  const r4 = seededRandom(seed + 4);
  const r5 = seededRandom(seed + 5);

  const name = `Dr. ${S_NAMES[Math.floor(r1 * S_NAMES.length)]} ${S_LAST[Math.floor(r2 * S_LAST.length)]}`;
  const specialty = SPECIALTIES[Math.floor(r3 * SPECIALTIES.length)];
  const experience = Math.floor(r4 * 25) + 3;
  const rating = parseFloat((4.0 + r5 * 1.0).toFixed(1));
  const consultationFee = (Math.floor(r1 * 15) + 3) * 100;

  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const availableDays: string[] = [];
  for (let d = 0; d < days.length; d++) {
    if (seededRandom(seed + 100 + d) > 0.45) availableDays.push(days[d]);
  }
  if (availableDays.length === 0) availableDays.push('Monday');

  return {
    id: `doc-${i + 1}`,
    name,
    specialty,
    imageUrl: `https://example.com/images/doctors/doc-${i + 1}.jpg`,
    rating,
    experience,
    consultationFee,
    availableDays,
  };
}

export function getProductByIndex(i: number): Product {
  const seed = i + 20000;
  const r1 = seededRandom(seed + 1);
  const r2 = seededRandom(seed + 2);
  const r3 = seededRandom(seed + 3);
  const r4 = seededRandom(seed + 4);
  const r5 = seededRandom(seed + 5);

  const category = CATS[Math.floor(r1 * CATS.length)];
  const name = `${PREFIX[Math.floor(r2 * PREFIX.length)]} ${ADJ[Math.floor(r3 * ADJ.length)]} ${NOUN[Math.floor(r4 * NOUN.length)]}`;
  const price = (Math.floor(r5 * 90) + 10) * 10 - 1;
  const description = `Premium ${category} by ${PREFIX[Math.floor(r2 * PREFIX.length)]}. Formulated with pure biological ingredients.`;
  const rating = parseFloat((3.5 + r4 * 1.5).toFixed(1));
  const stock = Math.floor(r3 * 100) + 5;

  return {
    id: `prod-${i + 1}`,
    name,
    category,
    price,
    description,
    imageUrl: `https://example.com/images/products/prod-${i + 1}.jpg`,
    rating,
    stock,
  };
}

export function getHealthRecordByIndex(i: number): HealthRecord {
  const seed = i + 50000;
  const r1 = seededRandom(seed + 1);
  const r2 = seededRandom(seed + 2);
  const r3 = seededRandom(seed + 3);
  const r4 = seededRandom(seed + 4);

  const patientName = `${S_NAMES[Math.floor(r1 * S_NAMES.length)]} ${S_LAST[Math.floor(r2 * S_LAST.length)]}`;
  const doctorName = `Dr. ${S_NAMES[Math.floor(r3 * S_NAMES.length)]} ${S_LAST[Math.floor(r4 * S_LAST.length)]}`;

  const di = Math.floor(r1 * DIAGNOSES.length);
  const dateObj = new Date(2026, 7, 30);
  dateObj.setDate(dateObj.getDate() - Math.floor(r2 * 365));

  return {
    id: `rec-${i + 1}`,
    patientName,
    doctorName,
    date: dateObj.toISOString().split('T')[0],
    diagnosis: DIAGNOSES[di],
    treatment: TREATMENTS[di],
    prescription: PRESCRIPTIONS[di],
    attachmentUrl: r3 > 0.55 ? `https://example.com/attachments/rec-${i + 1}.pdf` : undefined,
  };
}

export const TOTAL_DOCTORS = 5000;
export const TOTAL_PRODUCTS = 20000;
export const TOTAL_HEALTH_RECORDS = 10000;

export function generateDoctors(offset: number, limit: number): Doctor[] {
  const start = Math.max(0, offset);
  const end = Math.min(TOTAL_DOCTORS, start + limit);
  const results: Doctor[] = [];
  for (let i = start; i < end; i++) {
    results.push(getDoctorByIndex(i));
  }
  return results;
}

export function generateProducts(offset: number, limit: number): Product[] {
  const start = Math.max(0, offset);
  const end = Math.min(TOTAL_PRODUCTS, start + limit);
  const results: Product[] = [];
  for (let i = start; i < end; i++) {
    results.push(getProductByIndex(i));
  }
  return results;
}

export function generateHealthRecords(offset: number, limit: number): HealthRecord[] {
  const start = Math.max(0, offset);
  const end = Math.min(TOTAL_HEALTH_RECORDS, start + limit);
  const results: HealthRecord[] = [];
  for (let i = start; i < end; i++) {
    results.push(getHealthRecordByIndex(i));
  }
  return results;
}
