# Architectural Feature Progress Report

This document records the progress status of the core features and security layers.

---

## 🔒 Platform & Security Layer
*Verified and integrated in previous runs.*

| Feature | Status | Location / Implementation Details |
| :--- | :--- | :--- |
| **Secure Local Storage** | **Completed** | `src/services/secureStorage.ts`. Encrypted secure store on Native (iOS Keychain/Android Keystore). Web falls back to a non-persistent in-memory Map. |
| **Feature Flags** | **Completed** | `src/services/featureFlags.ts`. Overrides resolving local defaults with higher precedence process variables (`EXPO_PUBLIC_FLAG_*`). |
| **Biometric Gate** | **Completed** | `src/components/biometric-gate.tsx` & `src/app/_layout.tsx`. Protects views with Touch/Face ID and Device PIN, locking foreground instances dynamically. |
| **Biometric Settings** | **Completed** | `src/app/profile.tsx`. Switch options requiring biometric authentication prior to toggle adjustment. |

---

## 📅 Module 1 – Consultations
*Status: 100% Completed & Verified.*

| Feature | Status | Location / Implementation Details |
| :--- | :--- | :--- |
| **Doctor Listing** | **Completed** | `src/app/doctors.tsx` & `src/services/repositories/doctorRepository.ts`. Displays practitioners. |
| **Search** | **Completed** | `src/app/doctors.tsx`. Filters by name/specialty. |
| **Filters** | **Completed** | `src/app/doctors.tsx`. Filter row supporting specialties and day availability. |
| **Doctor Details** | **Completed** | `src/features/consultation/components/DoctorDetail.tsx`. Renders doctor profiles, fees, and slot timelines. |
| **Available Slots** | **Completed** | `src/features/consultation/components/DoctorDetail.tsx`. Renders interactive slots matching selected dates. |
| **Booking Flow** | **Completed** | `src/app/doctors.tsx` & `useConsultation.ts`. Uses offline queue (`bookingQueue`) that auto-syncs. |
| **Upcoming Consultation**| **Completed** | `src/app/bookings.tsx`. "My Bookings" screen showing sync states. |
| **Cancel Booking** | **Completed** | `src/app/bookings.tsx`. Cancel buttons on upcoming booking cards. |
| **Slot conflicts** | **Completed** | `src/__tests__/offline/bookingSyncService.test.ts`. Background sync validation marks overlapped slots as failed. |
| **Expired slots** | **Completed** | `src/features/consultation/utils/dateUtils.ts`. Compares slot time vs `timeProvider` to disable in UI. |
| **Double booking** | **Completed** | `src/services/bookingSyncService.ts`. Prevents identical duplicate entries in local queues. |

---

## 🛒 Module 2 – Shop
*Status: 100% Completed & Verified.*

| Feature | Status | Location / Implementation Details |
| :--- | :--- | :--- |
| **Product Listing** | **Completed** | `src/app/shop.tsx` & `src/services/repositories/productRepository.ts`. Paginated feed. |
| **Infinite Scroll** | **Completed** | `src/features/shop/hooks/useShop.ts`. Paging query limits inside hook appended to FlatList triggers. |
| **Search** | **Completed** | `src/app/shop.tsx`. Real-time keyword filter matching inventories. |
| **Multi-filter** | **Completed** | `src/app/shop.tsx`. Filter options for categories, rating values, and price ranges. |
| **Sorting** | **Completed** | `src/features/shop/hooks/useShop.ts`. Supports sort by rating, price ascending/descending, and name. |
| **Product Details** | **Completed** | `src/features/shop/components/ProductDetail.tsx`. Detailed card overlay template showing descriptions. |
| **Cart** | **Completed** | `src/features/shop/components/CartView.tsx` & `src/store/clientStore.ts`. Renders cart rows in overlay. |
| **Quantity updates** | **Completed** | `src/features/shop/components/CartView.tsx`. Quantity updates restricted by stock inventory limits. |
| **Wishlist** | **Completed** | `src/features/shop/components/WishlistView.tsx`. Toggle action enqueues add/remove actions for synchronization. |
| **Checkout Summary** | **Completed** | `src/features/shop/components/CartView.tsx`. Renders total quantities and final prices. |
| **Persist cart** | **Completed** | `src/store/clientStore.ts`. Zustand `persist` middleware backed by `AsyncStorage`. |

---

## 📋 Module 3 – Health Records
*Status: Partially Completed / Out of Scope (Details below).*

### Record Types

| Sub-Requirement | Status | Details / Reason |
| :--- | :--- | :--- |
| **Lab Report** | **Completed** | Mapped to `'Diagnostic Report'` and `'Lab Result'` records. |
| **Prescription** | **Completed** | Mapped to `'Prescription'` records. |
| **Consultation** | **Out of Scope** | **Reason**: Consultations are handled directly by **Module 1 (upcoming list, cancellation)** under a separate schema. Incorporating them as document records in this timeline is deferred. |
| **Vaccination** | **Completed** | Mapped to `'Immunization'` records. |
| **Allergy** | **Out of Scope**| **Reason**: Allergies are managed separately on the patient profile rather than chronological time-series files. |

### Timeline Features

| Feature | Status | Location / Implementation Details |
| :--- | :--- | :--- |
| **Timeline View** | **Completed** | `src/app/records.tsx`. Displays sorted historical logs. |
| **Filters** | **Completed** | `src/app/records.tsx`. Filters lists by type, tag, year, month, or custom date. |
| **Search** | **Completed** | `src/app/records.tsx`. Queries patient name, doctor, diagnosis, and treatment. |
| **Tags** | **Completed** | `src/app/records.tsx`. Clickable tag filters (e.g. Ayurveda, Routine, Critical). |
| **Attachment Preview**| **Completed** | `src/features/records/components/RecordDetail.tsx`. Renders local thumbnail hooks for images (with full-screen Modal overlay) and PDF files. |
| **Group by Month/Year**| **Completed** | **Design**: Done via interactive Month/Year filters that segment the timeline for performance on large databases. |
