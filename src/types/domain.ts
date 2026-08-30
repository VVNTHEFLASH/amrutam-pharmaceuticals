export interface Doctor {
  id: string; // stable identifier like "doc-1", "doc-2"
  name: string;
  specialty: string;
  imageUrl: string;
  rating: number;
  experience: number; // in years
  consultationFee: number;
  availableDays: string[]; // e.g. ["Monday", "Wednesday"]
}

export interface Product {
  id: string; // stable identifier like "prod-1", "prod-2"
  name: string;
  category: string;
  price: number;
  description: string;
  imageUrl: string;
  rating: number;
  stock: number;
}

export interface HealthRecord {
  id: string; // stable identifier like "rec-1", "rec-2"
  patientName: string;
  doctorName: string;
  date: string; // YYYY-MM-DD
  diagnosis: string;
  treatment: string;
  prescription: string;
  attachmentUrl?: string;
}

export interface Booking {
  id: string; // Client-generated UUID or custom unique ID
  doctorId: string;
  doctorName: string;
  dateTime: string;      // ISO string
  patientName: string;
  notes?: string;
  status: 'pending' | 'synchronized' | 'failed';
  createdAt: string;
}

export interface CartItem {
  productId: string;
  product: Product;
  quantity: number;
}
