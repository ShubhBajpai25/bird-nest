"use client";

import { motion } from "framer-motion";
import {
  Camera,
  Image as ImageIcon,
  ArrowRight,
} from "lucide-react";
import Link from "next/link";
import PageTransition from "@/app/components/PageTransition";

export default function DashboardPage() {
  return (
    <PageTransition>
      <div className="flex min-h-[calc(100vh-7rem)] flex-col items-center justify-center">
        {/* Title */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-10 text-center"
        >
          <h1 className="text-3xl font-bold text-text-primary">
            What would you like to do?
          </h1>
          <p className="mt-2 text-sm text-text-secondary">
            Choose an action below to get started
          </p>
        </motion.div>

        {/* Split cards */}
        <div className="flex w-full max-w-4xl flex-col items-stretch gap-6 lg:flex-row">
          {/* Left: Scan */}
          <Link href="/dashboard/upload" className="flex-1">
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2, duration: 0.5 }}
              whileHover={{ y: -4, scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              className="group flex h-full flex-col items-center rounded-2xl border border-border bg-bg-surface/60 p-8 text-center transition-all duration-300 hover:border-accent-gold/30 hover:bg-bg-surface"
            >
              <div className="mb-6 flex h-24 w-24 items-center justify-center rounded-2xl bg-accent-gold/10 transition-colors group-hover:bg-accent-gold/15">
                <Camera className="h-12 w-12 text-accent-gold" />
              </div>
              <h2 className="mb-3 text-xl font-bold text-text-primary">
                Scan
              </h2>
              <p className="mb-6 max-w-xs text-sm leading-relaxed text-text-secondary">
                Scan a recent sighting to know which bird it is and receive a fun fact about the bird!
              </p>
              <div className="mt-auto flex items-center gap-1.5 text-sm font-medium text-accent-gold transition-transform group-hover:translate-x-1">
                Start scanning
                <ArrowRight className="h-4 w-4" />
              </div>
            </motion.div>
          </Link>

          {/* Divider */}
          <div className="hidden items-center lg:flex">
            <div className="h-[60%] w-px bg-gradient-to-b from-transparent via-border-light to-transparent" />
          </div>
          <div className="mx-auto h-px w-[60%] bg-gradient-to-r from-transparent via-border-light to-transparent lg:hidden" />

          {/* Right: Gallery */}
          <Link href="/dashboard/gallery" className="flex-1">
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3, duration: 0.5 }}
              whileHover={{ y: -4, scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              className="group flex h-full flex-col items-center rounded-2xl border border-border bg-bg-surface/60 p-8 text-center transition-all duration-300 hover:border-accent-emerald/30 hover:bg-bg-surface"
            >
              <div className="mb-6 flex h-24 w-24 items-center justify-center rounded-2xl bg-accent-emerald/10 transition-colors group-hover:bg-accent-emerald/15">
                <ImageIcon className="h-12 w-12 text-accent-emerald" />
              </div>
              <h2 className="mb-3 text-xl font-bold text-text-primary">
                Gallery
              </h2>
              <p className="mb-6 max-w-xs text-sm leading-relaxed text-text-secondary">
                Look through your recently scanned birds, search for specific ones based on species or number, or scan another photo to find previously sighted birds in your gallery!
              </p>
              <div className="mt-auto flex items-center gap-1.5 text-sm font-medium text-accent-emerald transition-transform group-hover:translate-x-1">
                Browse gallery
                <ArrowRight className="h-4 w-4" />
              </div>
            </motion.div>
          </Link>
        </div>
      </div>
    </PageTransition>
  );
}
