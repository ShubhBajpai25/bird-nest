"use client";

import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Trash2,
  Tag,
  Bird,
  Search,
  Loader2,
  Image as ImageIcon,
  AlertCircle,
  ArrowLeft,
} from "lucide-react";
import Link from "next/link";
import PageTransition from "@/app/components/PageTransition";
import TagModal from "@/app/components/TagModal";
import { BirdNestAPI, type GalleryItem } from "@/app/lib/api";

export default function GalleryPage() {
  // Full gallery fetched from backend
  const [galleryItems, setGalleryItems] = useState<GalleryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Local search filter
  const [searchTerm, setSearchTerm] = useState("");

  // Tag modal state
  const [selectedItem, setSelectedItem] = useState<GalleryItem | null>(null);
  const [tagModalOpen, setTagModalOpen] = useState(false);
  const [deletingUrl, setDeletingUrl] = useState<string | null>(null);

  // Fetch gallery on mount
  useEffect(() => {
    const fetchGallery = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const data = await BirdNestAPI.getGallery();
        const items: GalleryItem[] = data.map((m) => ({
          url: m.s3_url,
          s3_url: m.s3_url,
          thumbnail_s3_url: m.thumbnail_s3_url,
          file_type: m.file_type,
          tags: m.tags || {},
          metadataLoaded: true,
        }));
        setGalleryItems(items);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load gallery");
      } finally {
        setIsLoading(false);
      }
    };
    fetchGallery();
  }, []);

  // Local filter: match search term against stringified tags
  const filteredItems = useMemo(() => {
    if (!searchTerm.trim()) return galleryItems;
    const term = searchTerm.toLowerCase();
    return galleryItems.filter(
      (item) =>
        JSON.stringify(item.tags).toLowerCase().includes(term) ||
        extractName(item.url).toLowerCase().includes(term)
    );
  }, [galleryItems, searchTerm]);

  // Delete
  const handleDelete = async (item: GalleryItem) => {
    setDeletingUrl(item.url);
    try {
      await BirdNestAPI.deleteFiles([item.url]);
      setGalleryItems((prev) => prev.filter((i) => i.url !== item.url));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed");
    } finally {
      setDeletingUrl(null);
    }
  };

  // Tag modal
  const openTagModal = (item: GalleryItem) => {
    setSelectedItem(item);
    setTagModalOpen(true);
  };

  const handleTagsSaved = async () => {
    // Re-fetch gallery to get updated tags
    try {
      const data = await BirdNestAPI.getGallery();
      const items: GalleryItem[] = data.map((m) => ({
        url: m.s3_url,
        s3_url: m.s3_url,
        thumbnail_s3_url: m.thumbnail_s3_url,
        file_type: m.file_type,
        tags: m.tags || {},
        metadataLoaded: true,
      }));
      setGalleryItems(items);
    } catch {
      // Silently fail refresh
    }
  };

  return (
    <PageTransition>
      {/* Back to Dashboard */}
      <Link href="/dashboard">
        <motion.div
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.95 }}
          className="mb-4 flex h-9 w-9 items-center justify-center rounded-full border border-border bg-bg-surface/60 text-text-secondary transition-colors hover:border-accent-gold/40 hover:text-accent-gold"
        >
          <ArrowLeft className="h-4 w-4" />
        </motion.div>
      </Link>
      <div className="mx-auto max-w-5xl">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-text-primary">Gallery</h1>
          <p className="mt-1 text-sm text-text-secondary">
            Browse your bird collection
          </p>
        </div>

        {/* Search bar */}
        <div className="mb-8 overflow-hidden rounded-2xl border border-border bg-bg-surface/60 transition-all duration-300">
          <div className="p-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-tertiary" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder='Filter by species (e.g. "crow")'
                className="w-full rounded-lg border border-border bg-bg-deep py-2.5 pl-10 pr-4 text-sm text-text-primary placeholder:text-text-tertiary transition-all duration-200 focus:border-accent-gold/50 focus:outline-none focus:ring-1 focus:ring-accent-gold/30"
              />
            </div>
          </div>
        </div>

        {/* Error banner */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 flex items-center gap-2 rounded-lg border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger"
          >
            <AlertCircle className="h-4 w-4 shrink-0" />
            {error}
            <button
              onClick={() => setError(null)}
              className="ml-auto text-xs underline"
            >
              Dismiss
            </button>
          </motion.div>
        )}

        {/* Gallery content */}
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-24">
            <Loader2 className="mb-4 h-8 w-8 animate-spin text-accent-gold" />
            <p className="text-sm font-medium text-text-secondary">
              Loading your gallery...
            </p>
          </div>
        ) : galleryItems.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border py-24"
          >
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-bg-surface">
              <ImageIcon className="h-7 w-7 text-text-tertiary" />
            </div>
            <p className="text-sm font-medium text-text-secondary">
              Your gallery is empty
            </p>
            <p className="mt-1 text-xs text-text-tertiary">
              Upload images from the Scan page to get started
            </p>
          </motion.div>
        ) : filteredItems.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border py-24"
          >
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-bg-surface">
              <Bird className="h-7 w-7 text-text-tertiary" />
            </div>
            <p className="text-sm font-medium text-text-secondary">
              No matches for &ldquo;{searchTerm}&rdquo;
            </p>
            <p className="mt-1 text-xs text-text-tertiary">
              Try a different species name
            </p>
          </motion.div>
        ) : (
          <>
            <p className="mb-4 text-sm text-text-secondary">
              {filteredItems.length} of {galleryItems.length} item
              {galleryItems.length !== 1 ? "s" : ""}
              {searchTerm.trim() ? ` matching "${searchTerm}"` : ""}
            </p>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 stagger-children">
              <AnimatePresence mode="popLayout">
                {filteredItems.map((item) => (
                  <motion.div
                    key={item.url}
                    layout
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    className="group relative overflow-hidden rounded-xl border border-border bg-bg-surface/60 transition-all duration-300 hover:border-border-light hover:shadow-lg hover:shadow-black/20"
                  >
                    <div className="relative aspect-[4/3] overflow-hidden bg-bg-deep">
                      <img
                        src={item.url}
                        alt={extractName(item.url)}
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = "none";
                        }}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

                      <div className="absolute bottom-3 right-3 flex gap-2 translate-y-2 opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100">
                        <motion.button
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          onClick={() => openTagModal(item)}
                          className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/10 text-white backdrop-blur-sm transition-colors hover:bg-accent-gold/30 hover:text-accent-gold"
                        >
                          <Tag className="h-4 w-4" />
                        </motion.button>
                        <motion.button
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          onClick={() => handleDelete(item)}
                          disabled={deletingUrl === item.url}
                          className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/10 text-white backdrop-blur-sm transition-colors hover:bg-danger/30 hover:text-danger disabled:opacity-50"
                        >
                          {deletingUrl === item.url ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                        </motion.button>
                      </div>

                      {item.file_type && (
                        <div className="absolute left-3 top-3 flex items-center gap-1.5 rounded-full bg-black/40 px-2.5 py-1 backdrop-blur-sm">
                          <Bird className="h-3 w-3 text-accent-gold" />
                          <span className="text-[10px] font-medium text-white">
                            {item.file_type}
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="p-4">
                      <h3 className="truncate text-sm font-semibold text-text-primary">
                        {extractName(item.url)}
                      </h3>
                      {Object.keys(item.tags).length > 0 ? (
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {Object.entries(item.tags).map(
                            ([species, count]) => (
                              <span
                                key={species}
                                className="flex items-center gap-1 rounded-full bg-accent-emerald/10 px-2 py-0.5 text-[10px] font-medium text-accent-emerald/80"
                              >
                                <Bird className="h-2.5 w-2.5" />
                                <span className="capitalize">{species}</span>
                                <span className="opacity-60">({count})</span>
                              </span>
                            )
                          )}
                        </div>
                      ) : (
                        <p className="mt-1.5 text-[10px] text-text-tertiary">
                          No species tagged
                        </p>
                      )}
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </>
        )}

        {selectedItem && (
          <TagModal
            key={selectedItem.url}
            isOpen={tagModalOpen}
            onClose={() => setTagModalOpen(false)}
            imageName={extractName(selectedItem.url)}
            imageUrl={selectedItem.url}
            initialTags={selectedItem.tags}
            onSaved={handleTagsSaved}
          />
        )}
      </div>
    </PageTransition>
  );
}

function extractName(url: string) {
  try {
    const parts = url.split("/");
    const filename = parts[parts.length - 1];
    return decodeURIComponent(filename).replace(/[-_]/g, " ").split(".")[0];
  } catch {
    return "Media file";
  }
}
