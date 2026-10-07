import { create } from "zustand";

/**
 * Open state of the "menu" sheet, shared by the header hamburger and the "Thêm"
 * tab in the bottom bar (they live in different parts of the DOM: the bar sits
 * after the footer so keyboard order stays header, content, footer, bar).
 *
 * `returnFocusTo` is set when the sheet was opened from something other than the
 * header trigger, so closing hands focus back to that control instead of the
 * hamburger.
 */
interface MenuState {
  open: boolean;
  returnFocusTo: HTMLElement | null;
  setOpen: (open: boolean) => void;
  openFrom: (opener: HTMLElement | null) => void;
  clearReturnFocus: () => void;
}

export const useMenuStore = create<MenuState>((set) => ({
  open: false,
  returnFocusTo: null,
  // Radix calls this for the header trigger and for closing; opening from the trigger means "return to the trigger".
  setOpen: (open) => set(open ? { open, returnFocusTo: null } : { open }),
  openFrom: (opener) => set({ open: true, returnFocusTo: opener }),
  clearReturnFocus: () => set({ returnFocusTo: null }),
}));
