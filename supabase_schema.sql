-- Amrutam Pharmaceuticals Supabase Schema

-- 1. Create Doctors Table
CREATE TABLE public.doctors (
    id text PRIMARY KEY,
    seed_index integer NOT NULL UNIQUE,
    name text NOT NULL,
    specialty text NOT NULL,
    image_url text NOT NULL,
    rating double precision NOT NULL,
    experience integer NOT NULL,
    consultation_fee integer NOT NULL,
    available_days text[] NOT NULL,
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL
);

-- 2. Create Products Table
CREATE TABLE public.products (
    id text PRIMARY KEY,
    seed_index integer NOT NULL UNIQUE,
    name text NOT NULL,
    category text NOT NULL,
    price integer NOT NULL,
    description text NOT NULL,
    image_url text NOT NULL,
    rating double precision NOT NULL,
    stock integer NOT NULL,
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL
);

-- 3. Create Health Records Table
CREATE TABLE public.health_records (
    id text PRIMARY KEY,
    seed_index integer NOT NULL UNIQUE,
    patient_name text NOT NULL,
    doctor_name text NOT NULL,
    date date NOT NULL,
    diagnosis text NOT NULL,
    treatment text NOT NULL,
    prescription text NOT NULL,
    attachment_url text,
    type text NOT NULL,
    tags text[] NOT NULL,
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL
);

-- 4. Enable Row Level Security (RLS)
ALTER TABLE public.doctors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.health_records ENABLE ROW LEVEL SECURITY;

-- 5. Create Public Select-Only Read Policies (Frontend clients can only SELECT)
CREATE POLICY "Allow public read access" ON public.doctors FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Allow public read access" ON public.products FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Allow public read access" ON public.health_records FOR SELECT TO anon, authenticated USING (true);

-- Note: Seeding is performed using the service_role key, which bypasses RLS. 
-- Frontend has no INSERT/UPDATE/DELETE policies, satisfying security rules.

-- 6. Create Indexes
-- Optimize specialty, rating, consultation_fee, and availableDays (GIN array search) for doctors
CREATE INDEX idx_doctors_specialty ON public.doctors (specialty);
CREATE INDEX idx_doctors_rating ON public.doctors (rating DESC);
CREATE INDEX idx_doctors_consultation_fee ON public.doctors (consultation_fee ASC);
CREATE INDEX idx_doctors_available_days ON public.doctors USING gin (available_days);

-- Optimize category, price, and rating for products
CREATE INDEX idx_products_category ON public.products (category);
CREATE INDEX idx_products_price ON public.products (price ASC);
CREATE INDEX idx_products_rating ON public.products (rating DESC);

-- Optimize type, date, and tags (GIN array search) for health records
CREATE INDEX idx_health_records_type ON public.health_records (type);
CREATE INDEX idx_health_records_date ON public.health_records (date DESC);
CREATE INDEX idx_health_records_tags ON public.health_records USING gin (tags);
