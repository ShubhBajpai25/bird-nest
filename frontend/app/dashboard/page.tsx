"use client";

import { motion } from "framer-motion";
import {
  Bird,
  Upload,
  Image as ImageIcon,
  Search,
  TrendingUp,
  Feather,
  TreePine,
} from "lucide-react";
import Link from "next/link";
import PageTransition from "@/app/components/PageTransition";

const stats = [
  { label: "Total Uploads", value: "1,284", icon: Upload, trend: "+12%" },
  { label: "Species Found", value: "47", icon: Feather, trend: "+3" },
  { label: "Images Tagged", value: "892", icon: ImageIcon, trend: "+8%" },
  { label: "Searches", value: "156", icon: Search, trend: "+24%" },
];

const recentBirds = [
  {
    name: "Indian Peafowl",
    species: "Pavo cristatus",
    count: 3,
    color: "bg-blue-500/20 text-blue-400",
  },
  {
    name: "House Crow",
    species: "Corvus splendens",
    count: 12,
    color: "bg-zinc-500/20 text-zinc-400",
  },
  {
    name: "Common Kingfisher",
    species: "Alcedo atthis",
    count: 2,
    color: "bg-cyan-500/20 text-cyan-400",
  },
  {
    name: "Rose-ringed Parakeet",
    species: "Psittacula krameri",
    count: 7,
    color: "bg-emerald-500/20 text-emerald-400",
  },
  {
    name: "Asian Koel",
    species: "Eudynamys scolopaceus",
    count: 5,
    color: "bg-purple-500/20 text-purple-400",
  },
];

const quickActions = [
  {
    label: "Upload Media",
    href: "/dashboard/upload",
    icon: Upload,
    desc: "Add new images, audio or video",
  },
  {
    label: "Browse Gallery",
    href: "/dashboard/gallery",
    icon: ImageIcon,
    desc: "View your bird collection",
  },
  {
    label: "Search Birds",
    href: "/dashboard/search",
    icon: Search,
    desc: "Find species in your library",
  },
];

export default function DashboardPage() {
  return (
    <PageTransition>
      <div className="max-w-6xl">
        <div className="mb-8">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-3"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent-emerald/10">
              <TreePine className="h-5 w-5 text-accent-emerald" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-text-primary">
                Dashboard
              </h1>
              <p className="text-sm text-text-secondary">
                Welcome back to your bird detection hub
              </p>
            </div>
          </motion.div>
        </div>

        <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 stagger-children">
          {stats.map((stat) => {
            const Icon = stat.icon;
            return (
              <div
                key={stat.label}
                className="group rounded-xl border border-border bg-bg-surface/60 p-5 transition-all duration-300 hover:border-border-light hover:bg-bg-surface"
              >
                <div className="flex items-center justify-between">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent-gold/10 transition-colors group-hover:bg-accent-gold/15">
                    <Icon className="h-4 w-4 text-accent-gold" />
                  </div>
                  <span className="flex items-center gap-1 text-xs font-medium text-accent-emerald">
                    <TrendingUp className="h-3 w-3" />
                    {stat.trend}
                  </span>
                </div>
                <p className="mt-3 text-2xl font-bold text-text-primary">
                  {stat.value}
                </p>
                <p className="text-xs text-text-secondary">{stat.label}</p>
              </div>
            );
          })}
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="lg:col-span-1">
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-text-secondary">
              Quick Actions
            </h2>
            <div className="space-y-3 stagger-children">
              {quickActions.map((action) => {
                const Icon = action.icon;
                return (
                  <Link key={action.href} href={action.href}>
                    <motion.div
                      whileHover={{ x: 4, scale: 1.01 }}
                      whileTap={{ scale: 0.99 }}
                      className="group flex items-center gap-4 rounded-xl border border-border bg-bg-surface/60 p-4 transition-all duration-300 hover:border-accent-gold/30 hover:bg-bg-surface"
                    >
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent-gold/10 transition-colors group-hover:bg-accent-gold/15">
                        <Icon className="h-5 w-5 text-accent-gold" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-text-primary">
                          {action.label}
                        </p>
                        <p className="text-xs text-text-tertiary">
                          {action.desc}
                        </p>
                      </div>
                    </motion.div>
                  </Link>
                );
              })}
            </div>
          </div>

          <div className="lg:col-span-2">
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-text-secondary">
              Recent Detections
            </h2>
            <div className="overflow-hidden rounded-xl border border-border bg-bg-surface/60">
              <div className="divide-y divide-border">
                {recentBirds.map((bird, i) => (
                  <motion.div
                    key={bird.name}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.08 }}
                    className="flex items-center justify-between px-5 py-3.5 transition-colors hover:bg-bg-hover/50"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`flex h-8 w-8 items-center justify-center rounded-lg ${bird.color}`}
                      >
                        <Bird className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-text-primary">
                          {bird.name}
                        </p>
                        <p className="text-xs italic text-text-tertiary">
                          {bird.species}
                        </p>
                      </div>
                    </div>
                    <span className="rounded-full bg-bg-hover px-2.5 py-1 text-xs font-medium text-text-secondary">
                      {bird.count} sightings
                    </span>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </PageTransition>
  );
}
