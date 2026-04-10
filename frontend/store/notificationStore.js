"use client";

import { create } from "zustand";

const useNotificationStore = create((set) => ({
  notifications: [],
  unreadCount: 0,
  isOpen: false,
  isLoading: false,
  error: "",
  setNotifications: (notifications, unreadCount) => set({ notifications, unreadCount }),
  setUnreadCount: (unreadCount) => set({ unreadCount }),
  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),
  openDrawer: () => set({ isOpen: true }),
  toggleDrawer: () => set((state) => ({ isOpen: !state.isOpen })),
  closeDrawer: () => set({ isOpen: false }),
  clearNotifications: () => set({ notifications: [], unreadCount: 0, error: "" }),
  resetNotifications: () =>
    set({ notifications: [], unreadCount: 0, isOpen: false, isLoading: false, error: "" }),
}));

export default useNotificationStore;
