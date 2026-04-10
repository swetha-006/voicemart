"use client";

import { Bell } from "lucide-react";

import useNotificationStore from "@/store/notificationStore";


export default function NotificationBell() {
  const unreadCount = useNotificationStore((s) => s.unreadCount);
  const isOpen = useNotificationStore((s) => s.isOpen);
  const toggleDrawer = useNotificationStore((s) => s.toggleDrawer);

  return (
    <button
      type="button"
      onClick={toggleDrawer}
      className={`relative rounded-full border p-3 text-white transition ${
        isOpen
          ? "border-cyan-300/80 bg-cyan-500/20 shadow-neon"
          : "border-cyan-400/25 bg-cyan-500/10 hover:border-cyan-300/70 hover:bg-cyan-500/20"
      }`}
      aria-label="Notifications"
      aria-expanded={isOpen}
    >
      <Bell className="h-5 w-5" />
      {unreadCount > 0 && (
        <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-neon-pink px-1 text-[10px] font-bold text-white">
          {unreadCount > 99 ? "99+" : unreadCount}
        </span>
      )}
    </button>
  );
}
