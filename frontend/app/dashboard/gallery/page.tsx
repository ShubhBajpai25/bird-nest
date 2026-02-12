"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Trash2,
  Tag,
  Bird,
  Search,
  Loader2,
  Image as ImageIcon,
  AlertCircle,
} from "lucide-react";
import PageTransition from "@/app/components/PageTransition";
import TagModal from "@/app/components/TagModal";
import { BirdNestAPI, type GalleryItem } from "@/app/lib/api";

export default function GalleryPage() {
  const [items, setItems] = useState<GalleryItem[]>([]);
  const [searchSpecies, setSearchSpecies] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [selectedItem, setSelectedItem] = useState<GalleryItem | null>(null);
  const [tagModalOpen, setTagModalOpen] = useState(false);
  const [isLoadingTags, setIsLoadingTags] = useState(false);
  const [deletingUrl, setDeletingUrl] = useState<string | null>(null);

  const handleSearch = async () => {
    if (!searchSpecies.trim()) return;
    setIsSearching(true);
    setError(null);
    try {
      const speciesList = searchSpecies
        .split(",")
        .map((s) => s.trim().toLowerCase())
        .filter(Boolean);

      const tags: Record<string, number> = {};
      for (const s of speciesList) tags[s] = 1;

      const result = await BirdNestAPI.searchByTags(tags);
      const galleryItems: GalleryItem[] = (result.links || []).map((url) => ({
        url,
        tags: {},
        metadataLoaded: false,
      }));
      setItems(galleryItems);
      setHasSearched(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Search failed");
    } finally {
      setIsSearching(false);
    }
  };

  const handleDelete = async (item: GalleryItem) => {
    setDeletingUrl(item.url);
    try {
      await BirdNestAPI.deleteFiles([item.url]);
      setItems((prev) => prev.filter((i) => i.url !== item.url));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed");
    } finally {
      setDeletingUrl(null);
    }
  };

  const openTagModal = async (item: GalleryItem) => {
    setIsLoadingTags(true);
    setSelectedItem(item);
    try {
      if (!item.metadataLoaded) {
        const metadata = await BirdNestAPI.getFileMetadata(item.url);
        const updated: GalleryItem = {
          ...item,
          s3_url: metadata.s3_url,
          thumbnail_s3_url: metadata.thumbnail_s3_url,
          file_type: metadata.file_type,
          tags: metadata.tags || {},
          metadataLoaded: true,
        };
        setItems((prev) =>
          prev.map((i) => (i.url === item.url ? updated : i))
        );
        setSelectedItem(updated);
      }
      setTagModalOpen(true);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load file metadata"
      );
    } finally {
      setIsLoadingTags(false);
    }
  };

  const handleTagsSaved = () => {
    if (searchSpecies.trim()) handleSearch();
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleSearch();
  };

  const extractName = (url: string) => {
    try {
      const parts = url.split("/");
      const filename = parts[parts.length - 1];
      return decodeURIComponent(filename).replace(/[-_]/g, " ").split(".")[0];
    } catch {
      return "Media file";
    }
  };

  return (
    <PageTransition>
      <div>
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-text-primary">Gallery</h1>
          <p className="mt-1 text-sm text-text-secondary">
            Search by species to browse your bird collection
          </p>
        </div>

        <div className="mb-8 flex gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-tertiary" />
            <input
              type="text"
              value={searchSpecies}
              onChange={(e) => setSearchSpecies(e.target.value)}
              onKeyDown={handleSearchKeyDown}
              placeholder='Search species (comma-separated, e.g. "crow, pigeon")'
              className="w-full rounded-lg border border-border bg-bg-surface/60 py-2.5 pl-10 pr-4 text-sm text-text-primary placeholder:text-text-tertiary transition-all duration-200 focus:border-accent-gold/50 focus:outline-none focus:ring-1 focus:ring-accent-gold/30"
            />
          </div>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleSearch}
            disabled={isSearching || !searchSpecies.trim()}
            className="flex items-center gap-2 rounded-lg bg-accent-gold px-5 py-2.5 text-sm font-semibold text-bg-deep transition-colors hover:bg-accent-gold-light disabled:opacity-40"
          >
            {isSearching ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Search className="h-4 w-4" />
            )}
            Search
          </motion.button>
        </div>

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

        {!hasSearched ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border py-24"
          >
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-bg-surface">
              <ImageIcon className="h-7 w-7 text-text-tertiary" />
            </div>
            <p className="text-sm font-medium text-text-secondary">
              Search for species to view your gallery
            </p>
            <p className="mt-1 text-xs text-text-tertiary">
              e.g. &quot;crow&quot;, &quot;pigeon, eagle&quot;
            </p>
          </motion.div>
        ) : items.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border py-24"
          >
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-bg-surface">
              <Bird className="h-7 w-7 text-text-tertiary" />
            </div>
            <p className="text-sm font-medium text-text-secondary">
              No results found
            </p>
            <p className="mt-1 text-xs text-text-tertiary">
              Try a different species name
            </p>
          </motion.div>
        ) : (
          <>
            <p className="mb-4 text-sm text-text-secondary">
              {items.length} result{items.length !== 1 ? "s" : ""} found
            </p>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 stagger-children">
              <AnimatePresence mode="popLayout">
                {items.map((item) => (
                  <motion.div
                    key={item.url}
                    layout
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
                          disabled={isLoadingTags}
                          className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/10 text-white backdrop-blur-sm transition-colors hover:bg-accent-gold/30 hover:text-accent-gold disabled:opacity-50"
                        >
                          {isLoadingTags &&
                          selectedItem?.url === item.url ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Tag className="h-4 w-4" />
                          )}
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
                      {item.metadataLoaded &&
                        Object.keys(item.tags).length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-1.5">
                            {Object.entries(item.tags).map(
                              ([species, count]) => (
                                <span
                                  key={species}
                                  className="rounded-full bg-accent-emerald/10 px-2 py-0.5 text-[10px] font-medium text-accent-emerald/70"
                                >
                                  {species}{" "}
                                  <span className="opacity-60">({count})</span>
                                </span>
                              )
                            )}
                          </div>
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
