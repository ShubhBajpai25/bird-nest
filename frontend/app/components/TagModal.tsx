"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Plus, Tag, Loader2 } from "lucide-react";
import { BirdNestAPI, computeTagDiff } from "@/app/lib/api";

interface TagModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageName: string;
  imageUrl: string;
  initialTags: Record<string, number>;
  onSaved: () => void;
}

export default function TagModal({
  isOpen,
  onClose,
  imageName,
  imageUrl,
  initialTags,
  onSaved,
}: TagModalProps) {
  const [tags, setTags] = useState<Record<string, number>>({ ...initialTags });
  const [newSpecies, setNewSpecies] = useState("");
  const [newCount, setNewCount] = useState("1");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setTags({ ...initialTags });
    setError(null);
  }, [initialTags]);

  const addTag = () => {
    const species = newSpecies.trim().toLowerCase();
    const count = parseInt(newCount) || 1;
    if (species && count > 0) {
      setTags((prev) => ({
        ...prev,
        [species]: (prev[species] || 0) + count,
      }));
      setNewSpecies("");
      setNewCount("1");
    }
  };

  const removeTag = (species: string) => {
    setTags((prev) => {
      const next = { ...prev };
      delete next[species];
      return next;
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addTag();
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    setError(null);
    try {
      const { additions, removals } = computeTagDiff(initialTags, tags);

      if (removals.length > 0) {
        await BirdNestAPI.updateTags([imageUrl], 0, removals);
      }
      if (additions.length > 0) {
        await BirdNestAPI.updateTags([imageUrl], 1, additions);
      }

      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save tags");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
            className="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-border bg-bg-elevated p-6 shadow-2xl"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent-gold/10">
                  <Tag className="h-4 w-4 text-accent-gold" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-text-primary">
                    Edit Tags
                  </h3>
                  <p className="max-w-[240px] truncate text-xs text-text-tertiary">
                    {imageName}
                  </p>
                </div>
              </div>
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={onClose}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-text-tertiary transition-colors hover:bg-bg-hover hover:text-text-primary"
              >
                <X className="h-4 w-4" />
              </motion.button>
            </div>

            <div className="mt-5 flex flex-wrap gap-2">
              <AnimatePresence mode="popLayout">
                {Object.entries(tags).map(([species, count]) => (
                  <motion.span
                    key={species}
                    layout
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    className="flex items-center gap-1.5 rounded-full bg-accent-emerald/10 px-3 py-1.5 text-xs font-medium text-accent-emerald"
                  >
                    {species}
                    <span className="rounded-full bg-accent-emerald/20 px-1.5 text-[10px]">
                      {count}
                    </span>
                    <button
                      onClick={() => removeTag(species)}
                      className="ml-0.5 rounded-full p-0.5 transition-colors hover:bg-accent-emerald/20"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </motion.span>
                ))}
              </AnimatePresence>
              {Object.keys(tags).length === 0 && (
                <p className="text-sm text-text-tertiary">
                  No tags yet. Add one below.
                </p>
              )}
            </div>

            <div className="mt-5 flex gap-2">
              <input
                type="text"
                value={newSpecies}
                onChange={(e) => setNewSpecies(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Species name..."
                className="flex-1 rounded-lg border border-border bg-bg-deep px-3 py-2 text-sm text-text-primary placeholder:text-text-tertiary focus:border-accent-gold/50 focus:outline-none focus:ring-1 focus:ring-accent-gold/30 transition-all duration-200"
              />
              <input
                type="number"
                value={newCount}
                onChange={(e) => setNewCount(e.target.value)}
                onKeyDown={handleKeyDown}
                min="1"
                placeholder="#"
                className="w-16 rounded-lg border border-border bg-bg-deep px-2 py-2 text-center text-sm text-text-primary placeholder:text-text-tertiary focus:border-accent-gold/50 focus:outline-none focus:ring-1 focus:ring-accent-gold/30 transition-all duration-200"
              />
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={addTag}
                className="flex items-center gap-1.5 rounded-lg bg-accent-gold/10 px-3 py-2 text-sm font-medium text-accent-gold transition-colors hover:bg-accent-gold/20"
              >
                <Plus className="h-4 w-4" />
              </motion.button>
            </div>

            {error && (
              <p className="mt-3 text-xs text-danger">{error}</p>
            )}

            <div className="mt-6 flex justify-end gap-3">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={onClose}
                className="rounded-lg px-4 py-2 text-sm font-medium text-text-secondary transition-colors hover:bg-bg-hover hover:text-text-primary"
              >
                Cancel
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleSave}
                disabled={isSaving}
                className="flex items-center gap-2 rounded-lg bg-accent-gold px-4 py-2 text-sm font-semibold text-bg-deep transition-colors hover:bg-accent-gold-light disabled:opacity-60"
              >
                {isSaving && (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                )}
                Save Tags
              </motion.button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
