"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import {
  Bird,
  LayoutDashboard,
  Upload,
  Image as ImageIcon,
  LogOut,
} from "lucide-react";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/dashboard/upload", label: "Upload", icon: Upload },
  { href: "/dashboard/gallery", label: "Gallery", icon: ImageIcon },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <motion.aside
      initial={{ x: -280 }}
      animate={{ x: 0 }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      className="fixed left-0 top-0 z-40 flex h-screen w-64 flex-col border-r border-border bg-bg-elevated"
    >
      <div className="flex items-center gap-3 px-6 py-6">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent-gold/10">
          <Bird className="h-6 w-6 text-accent-gold" />
        </div>
        <div>
          <h1 className="text-lg font-bold text-text-primary tracking-tight">BirdNest</h1>
          <p className="text-[10px] text-text-tertiary tracking-wide uppercase">Bird Detection Hub</p>
        </div>
      </div>

      <div className="mx-4 h-px bg-gradient-to-r from-transparent via-border-light to-transparent" />

      <nav className="mt-6 flex flex-1 flex-col gap-1 px-3">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link key={item.href} href={item.href}>
              <motion.div
                whileHover={{ x: 4 }}
                whileTap={{ scale: 0.98 }}
                className={`relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors duration-200 ${
                  isActive
                    ? "bg-accent-gold/10 text-accent-gold"
                    : "text-text-secondary hover:bg-bg-hover hover:text-text-primary"
                }`}
              >
                {isActive && (
                  <motion.div
                    layoutId="sidebar-active"
                    className="absolute left-0 top-1/2 h-6 w-1 -translate-y-1/2 rounded-r-full bg-accent-gold"
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  />
                )}
                <Icon className="h-[18px] w-[18px]" />
                {item.label}
              </motion.div>
            </Link>
          );
        })}
      </nav>

      <div className="mx-4 h-px bg-gradient-to-r from-transparent via-border-light to-transparent" />
      <div className="p-3">
        <Link href="/login">
          <motion.div
            whileHover={{ x: 4 }}
            whileTap={{ scale: 0.98 }}
            className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-text-secondary transition-colors duration-200 hover:bg-danger/10 hover:text-danger"
          >
            <LogOut className="h-[18px] w-[18px]" />
            Sign Out
          </motion.div>
        </Link>
      </div>
    </motion.aside>
  );
}
