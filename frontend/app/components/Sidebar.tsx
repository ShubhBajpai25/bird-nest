"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  Bird,
  LayoutDashboard,
  Upload,
  Image as ImageIcon,
  LogOut,
} from "lucide-react";
import { signOut } from "aws-amplify/auth";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/dashboard/upload", label: "Upload", icon: Upload },
  { href: "/dashboard/gallery", label: "Gallery", icon: ImageIcon },
];

export default function TopNav() {
  const pathname = usePathname();
  const router = useRouter();

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch {
      // ignore
    }
    router.push("/login");
  };

  return (
    <motion.header
      initial={{ y: -60 }}
      animate={{ y: 0 }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      className="fixed left-0 right-0 top-0 z-40 flex h-14 items-center justify-between border-b border-border bg-bg-elevated/90 px-6 backdrop-blur-md"
    >
      {/* Left: Logo */}
      <Link href="/dashboard" className="flex items-center gap-2.5">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent-gold/10">
          <Bird className="h-5 w-5 text-accent-gold" />
        </div>
        <span className="text-base font-bold tracking-tight text-text-primary">
          BirdNest
        </span>
      </Link>

      {/* Center: Tabs */}
      <nav className="flex items-center gap-1">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link key={item.href} href={item.href}>
              <motion.div
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                className={`relative flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-sm font-medium transition-colors duration-200 ${
                  isActive
                    ? "text-accent-gold"
                    : "text-text-secondary hover:text-text-primary"
                }`}
              >
                <Icon className="h-4 w-4" />
                {item.label}
                {isActive && (
                  <motion.div
                    layoutId="topnav-active"
                    className="absolute -bottom-[13px] left-2 right-2 h-[2px] rounded-full bg-accent-gold"
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  />
                )}
              </motion.div>
            </Link>
          );
        })}
      </nav>

      {/* Right: Sign Out */}
      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.97 }}
        onClick={handleSignOut}
        className="flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium text-text-secondary transition-colors duration-200 hover:bg-danger/10 hover:text-danger"
      >
        <LogOut className="h-4 w-4" />
        Sign Out
      </motion.button>
    </motion.header>
  );
}
