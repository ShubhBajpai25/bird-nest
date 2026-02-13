"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  Bird,
  LogOut,
} from "lucide-react";
import { signOut } from "aws-amplify/auth";

export default function TopNav() {
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
