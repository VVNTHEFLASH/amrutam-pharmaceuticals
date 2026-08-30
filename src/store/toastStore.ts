import { create } from 'zustand';

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info';
  title?: string;
  description: string;
}

interface ToastStore {
  toasts: ToastMessage[];
  showToast: (type: 'success' | 'error' | 'info', description: string, title?: string) => void;
  dismissToast: (id: string) => void;
}

export const useToastStore = create<ToastStore>((set) => ({
  toasts: [],
  showToast: (type, description, title) => {
    const id = Math.random().toString(36).substring(2, 9);
    const newToast = { id, type, description, title };
    set((state) => ({
      // Keep at most 2 toasts simultaneously to avoid clutter
      toasts: [...state.toasts.slice(-1), newToast],
    }));

    // Auto-dismiss after 3 seconds
    setTimeout(() => {
      set((state) => ({
        toasts: state.toasts.filter((t) => t.id !== id),
      }));
    }, 3000);
  },
  dismissToast: (id) =>
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    })),
}));
