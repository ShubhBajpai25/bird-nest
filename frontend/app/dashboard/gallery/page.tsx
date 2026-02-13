"use client";

import { useState, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Trash2,
  Tag,
  Bird,
  Search,
  Loader2,
  Image as ImageIcon,
  AlertCircle,
  Upload,
  X,
  Hash,
  Camera,
  ChevronUp,
  ChevronDown,
} from "lucide-react";
import PageTransition from "@/app/components/PageTransition";
import TagModal from "@/app/components/TagModal";
import { BirdNestAPI, type GalleryItem, type FileMetadata } from "@/app/lib/api";

export default function GalleryPage() {
  const [items, setItems] = useState<GalleryItem[]>([]);
  const [searchSpecies, setSearchSpecies] = useState("");
  const [minCount, setMinCount] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadingMetadataFor, setLoadingMetadataFor] = useState<Set<string>>(
    new Set()
  );

  // Image search state
  const [imageSearchOpen, setImageSearchOpen] = useState(false);
  const [searchImageFile, setSearchImageFile] = useState<File | null>(null);
  const [searchImagePreview, setSearchImagePreview] = useState<string | null>(
    null
  );
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [imageSearchResult, setImageSearchResult] = useState<FileMetadata | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  // Tag modal state
  const [selectedItem, setSelectedItem] = useState<GalleryItem | null>(null);
  const [tagModalOpen, setTagModalOpen] = useState(false);
  const [isLoadingTags, setIsLoadingTags] = useState(false);
  const [deletingUrl, setDeletingUrl] = useState<string | null>(null);

  // Auto-load metadata for all items when results come in
  useEffect(() => {
    const loadMeta = async (item: GalleryItem) => {
      if (item.metadataLoaded || loadingMetadataFor.has(item.url)) return;
      setLoadingMetadataFor((prev) => new Set(prev).add(item.url));
      try {
        const metadata = await BirdNestAPI.getFileMetadata(item.url);
        setItems((prev) =>
          prev.map((i) =>
            i.url === item.url
              ? {
                  ...i,
                  s3_url: metadata.s3_url,
                  thumbnail_s3_url: metadata.thumbnail_s3_url,
                  file_type: metadata.file_type,
                  tags: metadata.tags || {},
                  metadataLoaded: true,
                }
              : i
          )
        );
      } catch {
        // Silently fail metadata load for individual items
      } finally {
        setLoadingMetadataFor((prev) => {
          const next = new Set(prev);
          next.delete(item.url);
          return next;
        });
      }
    };
    items.forEach((item) => {
      if (!item.metadataLoaded) loadMeta(item);
    });
  }, [items, loadingMetadataFor]);

  // Species search
  const handleSearch = async () => {
    if (!searchSpecies.trim()) return;
    setIsSearching(true);
    setError(null);
    setImageSearchResult(null);
    try {
      const speciesList = searchSpecies
        .split(",")
        .map((s) => s.trim().toLowerCase())
        .filter(Boolean);

      const tags: Record<string, number> = {};
      const count = parseInt(minCount) || 1;
      for (const s of speciesList) tags[s] = count;

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

  // Image upload search
  const handleImageSelect = useCallback((file: File) => {
    setSearchImageFile(file);
    setSearchImagePreview(URL.createObjectURL(file));
    setImageSearchResult(null);
  }, []);

  const handleImageDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file && file.type.startsWith("image/")) handleImageSelect(file);
    },
    [handleImageSelect]
  );

  const clearImageSearch = () => {
    setSearchImageFile(null);
    setSearchImagePreview(null);
    setImageSearchResult(null);
  };

  const handleImageSearch = async () => {
    if (!searchImageFile) return;
    setIsUploadingImage(true);
    setError(null);
    setImageSearchResult(null);
    try {
      const uploadResult = await BirdNestAPI.uploadFile(searchImageFile);
      if (!uploadResult.success || !uploadResult.s3_url) {
        throw new Error(uploadResult.error || "Upload failed");
      }
      const metadata = await BirdNestAPI.pollForResults(uploadResult.s3_url);
      setImageSearchResult(metadata);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Image search failed"
      );
    } finally {
      setIsUploadingImage(false);
    }
  };

  // Delete
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

  // Tag modal
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
            Browse your bird collection by species or search by image
          </p>
        </div>

        {/* Search bar */}
        <div className="mb-8 overflow-hidden rounded-2xl border border-border bg-bg-surface/60 transition-all duration-300">
          {/* Top row: species + count + search button + image toggle */}
          <div className="flex items-center gap-3 p-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-tertiary" />
              <input
                type="text"
                value={searchSpecies}
                onChange={(e) => setSearchSpecies(e.target.value)}
                onKeyDown={handleSearchKeyDown}
                placeholder='Search species (e.g. "crow, pigeon")'
                className="w-full rounded-lg border border-border bg-bg-deep py-2.5 pl-10 pr-4 text-sm text-text-primary placeholder:text-text-tertiary transition-all duration-200 focus:border-accent-gold/50 focus:outline-none focus:ring-1 focus:ring-accent-gold/30"
              />
            </div>
            <div className="relative w-24">
              <Hash className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-text-tertiary" />
              <input
                type="number"
                value={minCount}
                onChange={(e) => setMinCount(e.target.value)}
                placeholder="Min"
                min="1"
                className="w-full rounded-lg border border-border bg-bg-deep py-2.5 pl-9 pr-3 text-sm text-text-primary placeholder:text-text-tertiary transition-all duration-200 focus:border-accent-gold/50 focus:outline-none focus:ring-1 focus:ring-accent-gold/30"
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
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setImageSearchOpen((v) => !v)}
              className={`flex h-10 w-10 items-center justify-center rounded-lg border transition-all duration-200 ${
                imageSearchOpen
                  ? "border-accent-gold/50 bg-accent-gold/10 text-accent-gold"
                  : "border-border bg-bg-deep text-text-tertiary hover:border-border-light hover:text-text-secondary"
              }`}
            >
              <Camera className="h-4 w-4" />
            </motion.button>
          </div>

          {/* Expandable image search area */}
          <AnimatePresence>
            {imageSearchOpen && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.25 }}
                className="overflow-hidden"
              >
                <div className="border-t border-border px-4 pb-4 pt-3">
                  <div className="mb-2 flex items-center gap-1.5 text-xs font-medium text-text-secondary">
                    <Camera className="h-3.5 w-3.5" />
                    Search by Image
                  </div>

                  {searchImagePreview ? (
                    <div className="flex items-start gap-4">
                      <div className="relative shrink-0 overflow-hidden rounded-lg">
                        <img
                          src={searchImagePreview}
                          alt="Search preview"
                          className="h-32 w-32 rounded-lg object-cover"
                        />
                        <motion.button
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          onClick={clearImageSearch}
                          className="absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-white backdrop-blur-sm"
                        >
                          <X className="h-3 w-3" />
                        </motion.button>
                      </div>
                      <div className="flex-1">
                        <p className="mb-1 text-sm font-medium text-text-primary">
                          {searchImageFile?.name}
                        </p>
                        <p className="mb-3 text-xs text-text-tertiary">
                          {searchImageFile &&
                            (searchImageFile.size / 1024 / 1024).toFixed(2)}{" "}
                          MB
                        </p>
                        <motion.button
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={handleImageSearch}
                          disabled={isUploadingImage}
                          className="flex items-center gap-2 rounded-lg bg-accent-gold px-4 py-2 text-sm font-semibold text-bg-deep transition-colors hover:bg-accent-gold-light disabled:opacity-50"
                        >
                          {isUploadingImage ? (
                            <>
                              <Loader2 className="h-4 w-4 animate-spin" />
                              Analyzing...
                            </>
                          ) : (
                            <>
                              <Bird className="h-4 w-4" />
                              Identify Species
                            </>
                          )}
                        </motion.button>

                        {/* Image search result inline */}
                        {imageSearchResult && imageSearchResult.tags && (
                          <div className="mt-3 space-y-1.5">
                            <p className="text-xs font-medium text-accent-emerald">
                              Species detected:
                            </p>
                            <div className="flex flex-wrap gap-1.5">
                              {Object.entries(imageSearchResult.tags).map(
                                ([sp, ct]) => (
                                  <span
                                    key={sp}
                                    className="flex items-center gap-1 rounded-full bg-accent-emerald/10 px-2.5 py-1 text-xs font-medium text-accent-emerald"
                                  >
                                    <Bird className="h-3 w-3" />
                                    <span className="capitalize">{sp}</span>
                                    <span className="rounded-full bg-accent-emerald/20 px-1.5 text-[10px]">
                                      {ct}
                                    </span>
                                  </span>
                                )
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div
                      onDragOver={(e) => {
                        e.preventDefault();
                        setIsDragging(true);
                      }}
                      onDragLeave={() => setIsDragging(false)}
                      onDrop={handleImageDrop}
                      className={`flex flex-col items-center rounded-xl border-2 border-dashed p-6 transition-colors ${
                        isDragging
                          ? "border-accent-gold/50 bg-accent-gold/5"
                          : "border-border hover:border-border-light"
                      }`}
                    >
                      <Upload className="mb-2 h-6 w-6 text-text-tertiary" />
                      <p className="mb-1 text-sm font-medium text-text-secondary">
                        Drop an image here to identify species
                      </p>
                      <label className="cursor-pointer text-xs font-medium text-accent-gold transition-colors hover:text-accent-gold-light">
                        or click to browse
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleImageSelect(file);
                          }}
                          className="hidden"
                        />
                      </label>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
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
              Type a species name above or upload an image to identify birds
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
              Try a different species name or lower minimum count
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
                      {item.metadataLoaded ? (
                        Object.keys(item.tags).length > 0 ? (
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
                        )
                      ) : (
                        <div className="mt-2 flex items-center gap-1.5 text-[10px] text-text-tertiary">
                          <Loader2 className="h-3 w-3 animate-spin" />
                          Loading details...
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
