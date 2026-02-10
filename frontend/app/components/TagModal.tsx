"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Plus, Tag } from "lucide-react";

interface TagModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageName: string;
  initialTags: string[];
  onSave: (tags: string[]) => void;
}

export default function TagModal({
  isOpen,
  onClose,
  imageName,
  initialTags,
  onSave,
}: TagModalProps) {
  const [tags, setTags] = useState<string[]>(initialTags);
  const [newTag, setNewTag] = useState("");

  useEffect(() => {
    setTags(initialTags);
  }, [initialTags]);

  const addTag = () => {
    if (newTag.trim() && !tags.includes(newTag.trim())) {
      setTags([...tags, newTag.trim()]);
      setNewTag("");
    }
  };

  const removeTag = (tag: string) => {
    setTags(tags.filter((t) => t !== tag));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addTag();
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
                  <p className="text-xs text-text-tertiary">{imageName}</p>
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
                {tags.map((tag) => (
                  <motion.span
                    key={tag}
                    layout
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    className="flex items-center gap-1.5 rounded-full bg-accent-emerald/10 px-3 py-1.5 text-xs font-medium text-accent-emerald"
                  >
                    {tag}
                    <button
                      onClick={() => removeTag(tag)}
                      className="ml-0.5 rounded-full p-0.5 transition-colors hover:bg-accent-emerald/20"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </motion.span>
                ))}
              </AnimatePresence>
              {tags.length === 0 && (
                <p className="text-sm text-text-tertiary">
                  No tags yet. Add one below.
                </p>
              )}
            </div>

            <div className="mt-5 flex gap-2">
              <input
                type="text"
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Add a tag..."
                className="flex-1 rounded-lg border border-border bg-bg-deep px-3 py-2 text-sm text-text-primary placeholder:text-text-tertiary focus:border-accent-gold/50 focus:outline-none focus:ring-1 focus:ring-accent-gold/30 transition-all duration-200"
              />
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={addTag}
                className="flex items-center gap-1.5 rounded-lg bg-accent-gold/10 px-3 py-2 text-sm font-medium text-accent-gold transition-colors hover:bg-accent-gold/20"
              >
                <Plus className="h-4 w-4" />
                Add
              </motion.button>
            </div>

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
                onClick={() => {
                  onSave(tags);
                  onClose();
                }}
                className="rounded-lg bg-accent-gold px-4 py-2 text-sm font-semibold text-bg-deep transition-colors hover:bg-accent-gold-light"
              >
                Save Tags
              </motion.button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
