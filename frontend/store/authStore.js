"use client";

import { jwtDecode } from "jwt-decode";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";


const STORAGE_KEY = "voicemart-auth";
let logoutTimer;


const setCookie = (name, value, maxAge) => {
  if (typeof document === "undefined") {
    return;
  }
  document.cookie = `${name}=${encodeURIComponent(
    value
  )}; path=/; max-age=${maxAge}; samesite=lax`;
};


const clearCookie = (name) => {
  if (typeof document === "undefined") {
    return;
  }
  document.cookie = `${name}=; path=/; max-age=0; samesite=lax`;
};


const syncCookies = (token, user) => {
  if (!token) {
    clearCookie("voicemart_token");
    clearCookie("voicemart_role");
    clearCookie("voicemart_exp");
    return;
  }

  try {
    const decoded = jwtDecode(token);
    const exp = decoded.exp || 0;
    const maxAge = Math.max(exp - Math.floor(Date.now() / 1000), 0);

    setCookie("voicemart_token", token, maxAge);
    setCookie("voicemart_role", user?.role || decoded.role || "customer", maxAge);
    setCookie("voicemart_exp", String(exp), maxAge);
  } catch (error) {
    clearCookie("voicemart_token");
    clearCookie("voicemart_role");
    clearCookie("voicemart_exp");
  }
};


const scheduleAutoLogout = (token, logout) => {
  if (typeof window === "undefined") {
    return;
  }

  window.clearTimeout(logoutTimer);

  try {
    const decoded = jwtDecode(token);
    const expiryMs = (decoded.exp || 0) * 1000 - Date.now();
    if (expiryMs <= 0) {
      logout(false);
      return;
    }
    logoutTimer = window.setTimeout(() => logout(true), expiryMs);
  } catch (error) {
    logout(false);
  }
};


const useAuthStore = create(
  persist(
    (set, get) => ({
      token: null,
      user: null,
      isAuthenticated: false,
      isHydrated: false,
      setAuth: ({ token, user }) => {
        syncCookies(token, user);
        set({ token, user, isAuthenticated: Boolean(token), isHydrated: true });
        scheduleAutoLogout(token, get().logout);
      },
      hydrateAuth: () => {
        const { token, user } = get();

        if (!token) {
          set({ isHydrated: true, isAuthenticated: false });
          return;
        }

        try {
          const decoded = jwtDecode(token);
          if (!decoded.exp || decoded.exp * 1000 <= Date.now()) {
            get().logout(false);
            return;
          }
          syncCookies(token, user);
          scheduleAutoLogout(token, get().logout);
          set({ isHydrated: true, isAuthenticated: true });
        } catch (error) {
          get().logout(false);
        }
      },
      updateUser: (nextUser) => {
        const mergedUser = { ...get().user, ...nextUser };
        syncCookies(get().token, mergedUser);
        set({ user: mergedUser });
      },
      logout: (notify = true) => {
        if (typeof window !== "undefined") {
          window.clearTimeout(logoutTimer);
        }
        syncCookies(null, null);
        set({ token: null, user: null, isAuthenticated: false, isHydrated: true });
        if (typeof window !== "undefined" && notify) {
          window.dispatchEvent(new CustomEvent("voicemart:session-ended"));
        }
      },
    }),
    {
      name: STORAGE_KEY,
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        token: state.token,
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
      onRehydrateStorage: () => (state) => {
        state?.hydrateAuth();
      },
    }
  )
);


export default useAuthStore;
