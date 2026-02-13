"use client";

import { motion } from "framer-motion";
import {
  Bird,
  Upload,
  Image as ImageIcon,
  TreePine,
  Camera,
  Sparkles,
  ShieldAlert,
  MapPin,
} from "lucide-react";
import Link from "next/link";
import PageTransition from "@/app/components/PageTransition";

const actions = [
  {
    label: "Upload Media",
    href: "/dashboard/upload",
    icon: Camera,
    desc: "Upload a photo to scan and retrieve species information along with a fun fact about the bird.",
  },
  {
    label: "Browse Gallery",
    href: "/dashboard/gallery",
    icon: ImageIcon,
    desc: "View your recently scanned birds, manage tags, search by species, and more.",
  },
];

const commonAustralianBirds = [
  { name: "Australian Magpie", species: "Gymnorhina tibicen", color: "bg-zinc-500/20 text-zinc-400" },
  { name: "Rainbow Lorikeet", species: "Trichoglossus moluccanus", color: "bg-emerald-500/20 text-emerald-400" },
  { name: "Sulphur-crested Cockatoo", species: "Cacatua galerita", color: "bg-yellow-500/20 text-yellow-400" },
  { name: "Laughing Kookaburra", species: "Dacelo novaeguineae", color: "bg-amber-500/20 text-amber-400" },
  { name: "Galah", species: "Eolophus roseicapilla", color: "bg-pink-500/20 text-pink-400" },
  { name: "Australian White Ibis", species: "Threskiornis molucca", color: "bg-slate-500/20 text-slate-400" },
  { name: "Noisy Miner", species: "Manorina melanocephala", color: "bg-orange-500/20 text-orange-400" },
  { name: "Willie Wagtail", species: "Rhipidura leucophrys", color: "bg-sky-500/20 text-sky-400" },
  { name: "Magpie-lark", species: "Grallina cyanoleuca", color: "bg-indigo-500/20 text-indigo-400" },
  { name: "Superb Fairywren", species: "Malurus cyaneus", color: "bg-blue-500/20 text-blue-400" },
];

const endangeredAustralianBirds = [
  { name: "Swift Parrot", species: "Lathamus discolor", habitat: "Tasmania & southeast mainland forests", color: "bg-emerald-500/20 text-emerald-400" },
  { name: "Regent Honeyeater", species: "Anthochaera phrygia", habitat: "Dry eucalypt woodlands, NSW & VIC", color: "bg-yellow-500/20 text-yellow-400" },
  { name: "Orange-bellied Parrot", species: "Neophema chrysogaster", habitat: "Southwest Tasmania & coastal Victoria", color: "bg-orange-500/20 text-orange-400" },
  { name: "Black-throated Finch", species: "Poephila cincta", habitat: "Grassy woodlands, northern QLD", color: "bg-zinc-500/20 text-zinc-400" },
  { name: "Helmeted Honeyeater", species: "Lichenostomus melanops cassidix", habitat: "Mountain ash forests, central VIC", color: "bg-amber-500/20 text-amber-400" },
  { name: "Norfolk Island Green Parrot", species: "Cyanoramphus cookii", habitat: "Norfolk Island subtropical rainforest", color: "bg-lime-500/20 text-lime-400" },
  { name: "Western Ground Parrot", species: "Pezoporus flaviventris", habitat: "Coastal heathlands, southwest WA", color: "bg-teal-500/20 text-teal-400" },
  { name: "Mallee Emu-wren", species: "Stipiturus mallee", habitat: "Mallee spinifex, VIC & SA border", color: "bg-rose-500/20 text-rose-400" },
  { name: "Plains-wanderer", species: "Pedionomus torquatus", habitat: "Native grasslands, NSW & VIC", color: "bg-cyan-500/20 text-cyan-400" },
  { name: "Christmas Island Frigatebird", species: "Fregata andrewsi", habitat: "Christmas Island coastal cliffs", color: "bg-purple-500/20 text-purple-400" },
];

export default function DashboardPage() {
  return (
    <PageTransition>
      <div className="max-w-6xl">
        {/* Header */}
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

        {/* Actions */}
        <div className="mb-10">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-text-secondary">
            Actions
          </h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 stagger-children">
            {actions.map((action) => {
              const Icon = action.icon;
              return (
                <Link key={action.href} href={action.href}>
                  <motion.div
                    whileHover={{ y: -2, scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                    className="group flex h-full flex-col rounded-xl border border-border bg-bg-surface/60 p-5 transition-all duration-300 hover:border-accent-gold/30 hover:bg-bg-surface"
                  >
                    <div className="mb-3 flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent-gold/10 transition-colors group-hover:bg-accent-gold/15">
                        <Icon className="h-5 w-5 text-accent-gold" />
                      </div>
                      <p className="text-sm font-semibold text-text-primary">
                        {action.label}
                      </p>
                    </div>
                    <p className="text-xs leading-relaxed text-text-tertiary">
                      {action.desc}
                    </p>
                  </motion.div>
                </Link>
              );
            })}
          </div>
        </div>

        {/* Bird Info Sections */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Most Common Australian Birds */}
          <div>
            <div className="mb-4 flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-accent-gold" />
              <h2 className="text-sm font-semibold uppercase tracking-wider text-text-secondary">
                Most Common Birds in Australia
              </h2>
            </div>
            <div className="overflow-hidden rounded-xl border border-border bg-bg-surface/60">
              <div className="divide-y divide-border">
                {commonAustralianBirds.map((bird, i) => (
                  <motion.div
                    key={bird.name}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="flex items-center gap-3 px-5 py-3 transition-colors hover:bg-bg-hover/50"
                  >
                    <div
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${bird.color}`}
                    >
                      <Bird className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-text-primary">
                        {bird.name}
                      </p>
                      <p className="text-xs italic text-text-tertiary">
                        {bird.species}
                      </p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>

          {/* Top 10 Endangered Australian Birds */}
          <div>
            <div className="mb-4 flex items-center gap-2">
              <ShieldAlert className="h-4 w-4 text-danger" />
              <h2 className="text-sm font-semibold uppercase tracking-wider text-text-secondary">
                Top 10 Endangered Birds in Australia
              </h2>
            </div>
            <div className="overflow-hidden rounded-xl border border-border bg-bg-surface/60">
              <div className="divide-y divide-border">
                {endangeredAustralianBirds.map((bird, i) => (
                  <motion.div
                    key={bird.name}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="flex items-center gap-3 px-5 py-3 transition-colors hover:bg-bg-hover/50"
                  >
                    <div
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${bird.color}`}
                    >
                      <Bird className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-text-primary">
                        {bird.name}
                      </p>
                      <p className="text-xs italic text-text-tertiary">
                        {bird.species}
                      </p>
                      <p className="mt-0.5 flex items-center gap-1 text-[11px] text-text-secondary">
                        <MapPin className="h-3 w-3 shrink-0" />
                        {bird.habitat}
                      </p>
                    </div>
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
