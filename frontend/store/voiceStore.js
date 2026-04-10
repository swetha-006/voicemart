"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";


const useVoiceStore = create(
  persist(
    (set) => ({
      voiceEnabled: true,
      isListening: false,
      transcript: "",
      interimTranscript: "",
      lastCommand: "",
      searchQuery: "",
      focusedProductId: null,
      products: [],
      selectedProduct: null,
      isPanelOpen: true,
      setVoiceEnabled: (voiceEnabled) => set({ voiceEnabled }),
      setListening: (isListening) => set({ isListening }),
      setTranscript: (transcript) => set({ transcript }),
      setInterimTranscript: (interimTranscript) => set({ interimTranscript }),
      setLastCommand: (lastCommand) => set({ lastCommand }),
      setSearchQuery: (searchQuery) => set({ searchQuery }),
      setProducts: (products) => set({ products }),
      setFocusedProductId: (focusedProductId) => set({ focusedProductId }),
      openProduct: (product) =>
        set({ selectedProduct: product, focusedProductId: product?.id || null }),
      closeProduct: () => set({ selectedProduct: null }),
      togglePanel: () => set((state) => ({ isPanelOpen: !state.isPanelOpen })),
      clearTranscript: () => set({ transcript: "", interimTranscript: "" }),
    }),
    {
      name: "voicemart-voice",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        voiceEnabled: state.voiceEnabled,
        searchQuery: state.searchQuery,
        isPanelOpen: state.isPanelOpen,
      }),
    }
  )
);


export default useVoiceStore;
