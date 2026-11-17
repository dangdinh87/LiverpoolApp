import { useMemo } from "react";
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

/** Shorthand hook for showing toasts without subscribing to `toast` changes. */
export const useToast = () => {
  const show = useToastStore((s) => s.show);
  const dismiss = useToastStore((s) => s.dismiss);
  return useMemo(() => ({ show, dismiss }), [show, dismiss]);
};
