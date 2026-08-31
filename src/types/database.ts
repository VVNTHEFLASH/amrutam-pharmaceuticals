import { DayOfWeek } from './domain';

export interface Database {
  public: {
    Tables: {
      doctors: {
        Row: { id: string; seed_index: number; name: string; specialty: string; image_url: string; rating: number; experience: number; consultation_fee: number; available_days: DayOfWeek[]; created_at: string; updated_at: string; };
        Insert: { id: string; seed_index: number; name: string; specialty: string; image_url: string; rating: number; experience: number; consultation_fee: number; available_days: DayOfWeek[]; created_at?: string; updated_at?: string; };
        Update: { id?: string; seed_index?: number; name?: string; specialty?: string; image_url?: string; rating?: number; experience?: number; consultation_fee?: number; available_days?: DayOfWeek[]; created_at?: string; updated_at?: string; };
        Relationships: [];
      };
      products: {
        Row: { id: string; seed_index: number; name: string; category: string; price: number; description: string; image_url: string; rating: number; stock: number; created_at: string; updated_at: string; };
        Insert: { id: string; seed_index: number; name: string; category: string; price: number; description: string; image_url: string; rating: number; stock: number; created_at?: string; updated_at?: string; };
        Update: { id?: string; seed_index?: number; name?: string; category?: string; price?: number; description?: string; image_url?: string; rating?: number; stock?: number; created_at?: string; updated_at?: string; };
        Relationships: [];
      };
      health_records: {
        Row: { id: string; seed_index: number | null; user_id: string | null; patient_name: string; doctor_name: string; date: string; diagnosis: string; treatment: string; prescription: string; attachment_url: string | null; type: string; tags: string[]; created_at: string; updated_at: string; };
        Insert: { id: string; seed_index?: number | null; user_id?: string | null; patient_name: string; doctor_name: string; date: string; diagnosis: string; treatment: string; prescription: string; attachment_url?: string | null; type: string; tags: string[]; created_at?: string; updated_at?: string; };
        Update: { id?: string; seed_index?: number | null; user_id?: string | null; patient_name?: string; doctor_name?: string; date?: string; diagnosis?: string; treatment?: string; prescription?: string; attachment_url?: string | null; type?: string; tags?: string[]; created_at?: string; updated_at?: string; };
        Relationships: [];
      };
      bookings: {
        Row: { id: string; user_id: string; doctor_id: string; doctor_name: string; date_time: string; patient_name: string; notes: string | null; status: string; created_at: string; updated_at: string; };
        Insert: { id: string; user_id: string; doctor_id: string; doctor_name: string; date_time: string; patient_name: string; notes?: string | null; status: string; created_at?: string; updated_at?: string; };
        Update: { id?: string; user_id?: string; doctor_id?: string; doctor_name?: string; date_time?: string; patient_name?: string; notes?: string | null; status?: string; created_at?: string; updated_at?: string; };
        Relationships: [];
      };
      profiles: {
        Row: { id: string; full_name: string | null; phone: string | null; avatar_url: string | null; created_at: string; updated_at: string; };
        Insert: { id: string; full_name?: string | null; phone?: string | null; avatar_url?: string | null; created_at?: string; updated_at?: string; };
        Update: { id?: string; full_name?: string | null; phone?: string | null; avatar_url?: string | null; created_at?: string; updated_at?: string; };
        Relationships: [];
      };
      wishlist_items: {
        Row: { id: string; user_id: string; product_id: string; created_at: string; };
        Insert: { id?: string; user_id: string; product_id: string; created_at?: string; };
        Update: { id?: string; user_id?: string; product_id?: string; created_at?: string; };
        Relationships: [];
      };
      carts: {
        Row: { id: string; user_id: string; created_at: string; updated_at: string; };
        Insert: { id?: string; user_id: string; created_at?: string; updated_at?: string; };
        Update: { id?: string; user_id?: string; created_at?: string; updated_at?: string; };
        Relationships: [];
      };
      cart_items: {
        Row: { id: string; cart_id: string; product_id: string; quantity: number; created_at: string; updated_at: string; };
        Insert: { id?: string; cart_id: string; product_id: string; quantity: number; created_at?: string; updated_at?: string; };
        Update: { id?: string; cart_id?: string; product_id?: string; quantity?: number; created_at?: string; updated_at?: string; };
        Relationships: [];
      };
    };
    Views: {};
    Functions: {};
    Enums: {};
  };
}



