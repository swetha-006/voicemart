"use client";

import { useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertCircle,
  Bell,
  CheckCheck,
  LoaderCircle,
  Package,
  ShoppingBag,
  Truck,
  X,
  XCircle,
} from "lucide-react";

import { customerApi } from "@/lib/api";
import useAuthStore from "@/store/authStore";
import useNotificationStore from "@/store/notificationStore";


const TYPE_META = {
  WELCOME:         { icon: ShoppingBag, color: "text-cyber-cyan",   bg: "bg-cyan-500/15" },
  ORDER_PLACED:    { icon: Package,     color: "text-emerald-300",  bg: "bg-emerald-500/15" },
  ORDER_PROCESSING:{ icon: Bell,        color: "text-cyber-purple", bg: "bg-purple-500/15" },
  ORDER_SHIPPED:   { icon: Truck,       color: "text-cyber-cyan",   bg: "bg-cyan-500/15" },
  ORDER_DELIVERED: { icon: CheckCheck,  color: "text-emerald-300",  bg: "bg-emerald-500/15" },
  ORDER_STATUS:    { icon: Bell,        color: "text-cyber-purple", bg: "bg-purple-500/15" },
  ORDER_CANCELLED: { icon: XCircle,     color: "text-neon-pink",    bg: "bg-pink-500/15" },
};

function NotificationIcon({ type }) {
  const meta = TYPE_META[type] || TYPE_META.WELCOME;
  const Icon = meta.icon;
  return (
    <div className={`rounded-full p-2 ${meta.bg}`}>
      <Icon className={`h-4 w-4 ${meta.color}`} />
    </div>
  );
}

export default function NotificationDrawer() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const user = useAuthStore((s) => s.user);
  const notifications = useNotificationStore((s) => s.notifications);
  const unreadCount = useNotificationStore((s) => s.unreadCount);
  const isOpen = useNotificationStore((s) => s.isOpen);
  const isLoading = useNotificationStore((s) => s.isLoading);
  const error = useNotificationStore((s) => s.error);
  const setNotifications = useNotificationStore((s) => s.setNotifications);
  const setUnreadCount = useNotificationStore((s) => s.setUnreadCount);
  const setLoading = useNotificationStore((s) => s.setLoading);
  const setError = useNotificationStore((s) => s.setError);
  const closeDrawer = useNotificationStore((s) => s.closeDrawer);
  const clearNotifications = useNotificationStore((s) => s.clearNotifications);
  const resetNotifications = useNotificationStore((s) => s.resetNotifications);

  const load = async ({ markRead = false } = {}) => {
    setLoading(true);
    setError("");
    try {
      const payload = await customerApi.getNotifications();
      setNotifications(payload.data.notifications, payload.data.unread_count);
      if (markRead && payload.data.unread_count > 0) {
        await customerApi.markNotificationsRead();
        setNotifications(
          payload.data.notifications.map((notification) => ({ ...notification, is_read: true })),
          0
        );
      }
    } catch (error) {
      clearNotifications();
      setError("We could not load your notifications right now.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated && user?.role === "customer") {
      load();
      const interval = setInterval(() => {
        if (typeof document === "undefined" || document.visibilityState === "visible") {
          load();
        }
      }, 45000);
      return () => clearInterval(interval);
    }

    resetNotifications();
    return undefined;
  }, [clearNotifications, isAuthenticated, resetNotifications, user?.role]);

  const handleMarkRead = async () => {
    try {
      await customerApi.markNotificationsRead();
      setUnreadCount(0);
      setNotifications(notifications.map((n) => ({ ...n, is_read: true })), 0);
    } catch (error) {
      setError("We could not mark your notifications as read.");
    }
  };

  useEffect(() => {
    if (isOpen) {
      load({ markRead: true });
    }
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
            onClick={closeDrawer}
          />
          <motion.aside
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 260 }}
            className="fixed right-0 top-0 z-[80] flex h-full w-full max-w-sm flex-col border-l border-cyan-500/15 bg-slate-950/95 backdrop-blur-xl"
          >
            <div className="flex items-center justify-between border-b border-cyan-500/10 px-5 py-4">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-cyber-cyan">Inbox</p>
                <h2 className="font-display text-xl text-white">Notifications</h2>
              </div>
              <div className="flex items-center gap-2">
                {unreadCount > 0 && (
                  <button
                    type="button"
                    onClick={handleMarkRead}
                    className="flex items-center gap-1 rounded-full border border-cyan-500/20 px-3 py-1.5 text-xs text-slate-300 hover:text-white"
                  >
                    <CheckCheck className="h-3.5 w-3.5" />
                    Mark all read
                  </button>
                )}
                <button
                  type="button"
                  onClick={closeDrawer}
                  className="rounded-full border border-slate-700 p-2 text-slate-400 hover:text-white"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto">
              {isLoading ? (
                <div className="flex flex-col items-center justify-center gap-3 py-20 text-center">
                  <LoaderCircle className="h-10 w-10 animate-spin text-cyber-cyan" />
                  <p className="text-slate-400">Loading notifications...</p>
                </div>
              ) : error ? (
                <div className="flex flex-col items-center justify-center gap-3 px-6 py-20 text-center">
                  <AlertCircle className="h-10 w-10 text-neon-pink" />
                  <p className="text-slate-300">{error}</p>
                  <button
                    type="button"
                    onClick={() => load()}
                    className="rounded-full border border-cyan-400/30 px-4 py-2 text-sm text-slate-100 transition hover:border-cyan-300/70 hover:bg-cyan-500/10"
                  >
                    Retry
                  </button>
                </div>
              ) : notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-3 py-20 text-center">
                  <Bell className="h-10 w-10 text-slate-600" />
                  <p className="text-slate-400">No notifications yet</p>
                </div>
              ) : (
                <ul className="divide-y divide-cyan-500/10">
                  {notifications.map((n) => (
                    <li
                      key={n.id}
                      className={`flex gap-3 px-5 py-4 ${!n.is_read ? "bg-cyan-500/5" : ""}`}
                    >
                      <NotificationIcon type={n.type} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-slate-200">{n.message}</p>
                        <p className="mt-1 text-xs text-slate-500">
                          {new Date(n.created_at).toLocaleString()}
                        </p>
                      </div>
                      {!n.is_read && (
                        <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-cyber-cyan" />
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
