"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";

import VoiceAssistant from "@/components/voice/VoiceAssistant";
import { speakText } from "@/lib/speech";
import useAuthStore from "@/store/authStore";
import useCartStore from "@/store/cartStore";
import useNotificationStore from "@/store/notificationStore";

import CartDrawer from "./CartDrawer";
import Footer from "./Footer";
import Navbar from "./Navbar";
import NotificationDrawer from "./NotificationDrawer";
import ProductModal from "./ProductModal";


const protectedPrefixes = ["/cart", "/checkout", "/orders", "/profile", "/admin"];
const customerOnlyPrefixes = ["/cart", "/checkout", "/orders", "/profile"];
const adminOnlyPrefixes = ["/admin"];


export default function ClientShell({ children }) {
  const pathname = usePathname();
  const router = useRouter();

  const logout = useAuthStore((state) => state.logout);
  const user = useAuthStore((state) => state.user);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const isHydrated = useAuthStore((state) => state.isHydrated);

  const fetchCart = useCartStore((state) => state.fetchCart);
  const resetCart = useCartStore((state) => state.resetCart);
  const resetNotifications = useNotificationStore((state) => state.resetNotifications);

  useEffect(() => {
    if (!useAuthStore.persist.hasHydrated()) {
      useAuthStore.persist.rehydrate();
    }
  }, []);

  useEffect(() => {
    if (!isHydrated) {
      return;
    }

    const isProtectedRoute = protectedPrefixes.some(
      (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
    );
    const isCustomerOnlyRoute = customerOnlyPrefixes.some(
      (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
    );
    const isAdminOnlyRoute = adminOnlyPrefixes.some(
      (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
    );

    if (!isAuthenticated && isProtectedRoute) {
      router.push("/login");
      return;
    }

    if (isAuthenticated && user?.role === "admin" && isCustomerOnlyRoute) {
      speakText("Customer shopping pages are available on customer accounts only.");
      router.push("/admin");
      return;
    }

    if (isAuthenticated && user?.role !== "admin" && isAdminOnlyRoute) {
      speakText("Admin pages are restricted to administrator accounts.");
      router.push("/");
    }
  }, [isAuthenticated, isHydrated, pathname, router, user?.role]);

  useEffect(() => {
    const isProtectedRoute = protectedPrefixes.some(
      (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
    );

    const handleUnauthorized = async () => {
      logout(false);
      resetCart();
      resetNotifications();
      await speakText("Your session has expired. Please log in again.");
      router.push("/login");
    };

    const handleSessionEnded = async () => {
      resetCart();
      resetNotifications();
      if (isProtectedRoute) {
        await speakText("You have been logged out.");
        router.push("/login");
      }
    };

    window.addEventListener("voicemart:unauthorized", handleUnauthorized);
    window.addEventListener("voicemart:session-ended", handleSessionEnded);

    return () => {
      window.removeEventListener("voicemart:unauthorized", handleUnauthorized);
      window.removeEventListener("voicemart:session-ended", handleSessionEnded);
    };
  }, [logout, pathname, resetCart, resetNotifications, router]);

  useEffect(() => {
    if (!isHydrated) {
      return;
    }

    if (isAuthenticated && user?.role === "customer") {
      fetchCart().catch(() => {
        resetCart();
      });
      return;
    }

    resetCart();
    resetNotifications();
  }, [fetchCart, isAuthenticated, isHydrated, resetCart, resetNotifications, user?.role]);

  return (
    <div className="matrix-bg min-h-screen bg-base-night text-slate-100">
      <div className="pointer-events-none fixed inset-0 z-0 bg-[radial-gradient(circle_at_top,rgba(6,182,212,0.14),transparent_40%)]" />
      <div className="pointer-events-none fixed inset-0 z-0 bg-[radial-gradient(circle_at_80%_10%,rgba(124,58,237,0.14),transparent_35%)]" />
      <Navbar />
      <main className="relative z-10 mx-auto min-h-[calc(100vh-9rem)] max-w-7xl px-4 pb-28 pt-28 sm:px-6 lg:px-8">
        {children}
      </main>
      <Footer />
      <CartDrawer />
      <NotificationDrawer />
      <ProductModal />
      <VoiceAssistant />
    </div>
  );
}
