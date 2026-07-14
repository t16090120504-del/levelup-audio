import { create } from 'zustand';

interface UIState {
  isMiniPlayerVisible: boolean;
  activeModal: string | null;
  modalData: unknown;

  setMiniPlayerVisible: (visible: boolean) => void;
  openModal: (name: string, data?: unknown) => void;
  closeModal: () => void;
}

export const useUIStore = create<UIState>()((set) => ({
  isMiniPlayerVisible: false,
  activeModal: null,
  modalData: null,

  setMiniPlayerVisible: (visible) => {
    set({ isMiniPlayerVisible: visible });
  },

  openModal: (name, data) => {
    set({ activeModal: name, modalData: data ?? null });
  },

  closeModal: () => {
    set({ activeModal: null, modalData: null });
  },
}));
