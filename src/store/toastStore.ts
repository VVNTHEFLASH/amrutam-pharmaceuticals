import { create } from 'zustand';

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info';
  title?: string;
  description: string;
  action?: {
    label: string;
    onPress: () => void;
  };
}

interface ToastStore {
  toasts: ToastMessage[];
  showToast: (
    type: 'success' | 'error' | 'info',
    description: string,
    title?: string,
    action?: { label: string; onPress: () => void }
  ) => void;
  dismissToast: (id: string) => void;
}

export const useToastStore = create<ToastStore>((set) => ({
  toasts: [],
  showToast: (type, description, title, action) => {
    const id = Math.random().toString(36).substring(2, 9);
    const newToast = { id, type, description, title, action };
    set((state) => ({
      // Keep at most 2 toasts simultaneously to avoid clutter
      toasts: [...state.toasts.slice(-1), newToast],
    }));

    // Auto-dismiss after 3 seconds, or 6 seconds if there is an interactive action
    const duration = action ? 6000 : 3000;
    setTimeout(() => {
      set((state) => ({
        toasts: state.toasts.filter((t) => t.id !== id),
      }));
    }, duration);
  },
  dismissToast: (id) =>
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    })),
}));

export const routerRegistry = {
  push: (path: string) => {
    console.warn('[routerRegistry] push not configured:', path);
  }
};
