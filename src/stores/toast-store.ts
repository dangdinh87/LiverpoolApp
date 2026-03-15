import { create } from "zustand";

export type ToastType = "success" | "error" | "favourite" | "info";

export interface ToastData {
  type: ToastType;
  message: string;
}

interface ToastState {
  toast: ToastData | null;
  show: (data: ToastData) => void;
  dismiss: () => void;
}

export const useToastStore = create<ToastState>((set) => ({
  toast: null,
  show: (data) => set({ toast: data }),
  dismiss: () => set({ toast: null }),
}));

/** Shorthand hook for showing toasts */
export const useToast = () => {
  const { show, dismiss } = useToastStore();
  return { show, dismiss };
};
