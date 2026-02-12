"use client";

import { useState, useCallback } from "react";
import { motion } from "framer-motion";
import {
  Search,
  Bird,
  Image as ImageIcon,
  Upload,
  Link as LinkIcon,
  Hash,
  SlidersHorizontal,
  X,
  Loader2,
  AlertCircle,
  FileText,
} from "lucide-react";
import PageTransition from "@/app/components/PageTransition";
import { BirdNestAPI, type FileMetadata } from "@/app/lib/api";

type ResultItem =
  | { kind: "url"; url: string }
  | { kind: "file"; data: FileMetadata }
  | { kind: "thumbnail"; thumbnail_s3_url: string; s3_url: string };

export default function SearchPage() {
  const [species, setSpecies] = useState("");
  const [minCount, setMinCount] = useState("");
  const [thumbnailUrl, setThumbnailUrl] = useState("");
  const [fileUrl, setFileUrl] = useState("");
  const [searchImageFile, setSearchImageFile] = useState<File | null>(null);
  const [searchImagePreview, setSearchImagePreview] = useState<string | null>(
    null
  );
  const [results, setResults] = useState<ResultItem[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleTagSearch = async () => {
    if (!species.trim()) return;
    setIsSearching(true);
    setError(null);
    try {
      const speciesList = species
        .split(",")
        .map((s) => s.trim().toLowerCase())
        .filter(Boolean);
      const tags: Record<string, number> = {};
      for (const s of speciesList) {
        tags[s] = parseInt(minCount) || 1;
      }
      const result = await BirdNestAPI.searchByTags(tags);
      setResults((result.links || []).map((url) => ({ kind: "url", url })));
      setHasSearched(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Tag search failed");
    } finally {
      setIsSearching(false);
    }
  };

  const handleThumbnailSearch = async () => {
    if (!thumbnailUrl.trim()) return;
    setIsSearching(true);
    setError(null);
    try {
      const result = await BirdNestAPI.searchByThumbnail(thumbnailUrl.trim());
      setResults([{ kind: "thumbnail", ...result }]);
      setHasSearched(true);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Thumbnail search failed"
      );
    } finally {
      setIsSearching(false);
    }
  };

  const handleFileSearch = async () => {
    if (!fileUrl.trim()) return;
    setIsSearching(true);
    setError(null);
    try {
      const result = await BirdNestAPI.searchByFile(fileUrl.trim());
      setResults([{ kind: "file", data: result }]);
      setHasSearched(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "File search failed");
    } finally {
      setIsSearching(false);
    }
  };

  const handleImageUploadForSearch = async () => {
    if (!searchImageFile) return;
    setIsUploading(true);
    setError(null);
    try {
      const result = await BirdNestAPI.uploadFile(searchImageFile);
      if (result.success) {
        setError(null);
        setResults([]);
        setHasSearched(true);
        setSearchImageFile(null);
        setSearchImagePreview(null);
      } else {
        setError(result.error || "Upload failed");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setIsUploading(false);
    }
  };

  const handleSearch = async () => {
    if (species.trim()) {
      await handleTagSearch();
    } else if (thumbnailUrl.trim()) {
      await handleThumbnailSearch();
    } else if (fileUrl.trim()) {
      await handleFileSearch();
    } else if (searchImageFile) {
      await handleImageUploadForSearch();
    }
  };

  const handleImageSelect = useCallback((file: File) => {
    setSearchImageFile(file);
    setSearchImagePreview(URL.createObjectURL(file));
  }, []);

  const handleDrop = useCallback(
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
  };

  const extractName = (url: string) => {
    try {
      const parts = url.split("/");
      return decodeURIComponent(parts[parts.length - 1])
        .replace(/[-_]/g, " ")
        .split(".")[0];
    } catch {
      return "Media file";
    }
  };

  return (
    <PageTransition>
      <div className="flex gap-6">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4 }}
          className="w-80 shrink-0"
        >
          <div className="sticky top-8 space-y-5 rounded-2xl border border-border bg-bg-surface/60 p-5">
            <div className="flex items-center gap-2">
              <SlidersHorizontal className="h-4 w-4 text-accent-gold" />
              <h2 className="text-sm font-semibold text-text-primary">
                Advanced Search
              </h2>
            </div>

            <div>
              <label className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-text-secondary">
                <Bird className="h-3.5 w-3.5" />
                Filter by Species
              </label>
              <input
                type="text"
                value={species}
                onChange={(e) => setSpecies(e.target.value)}
                placeholder='e.g. "crow" or "crow, pigeon"'
                className="w-full rounded-lg border border-border bg-bg-deep px-3 py-2.5 text-sm text-text-primary placeholder:text-text-tertiary transition-all duration-200 focus:border-accent-gold/50 focus:outline-none focus:ring-1 focus:ring-accent-gold/30"
              />
            </div>

            <div>
              <label className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-text-secondary">
                <Hash className="h-3.5 w-3.5" />
                Minimum Count
              </label>
              <input
                type="number"
                value={minCount}
                onChange={(e) => setMinCount(e.target.value)}
                placeholder='e.g. "2"'
                min="1"
                className="w-full rounded-lg border border-border bg-bg-deep px-3 py-2.5 text-sm text-text-primary placeholder:text-text-tertiary transition-all duration-200 focus:border-accent-gold/50 focus:outline-none focus:ring-1 focus:ring-accent-gold/30"
              />
            </div>

            <div className="h-px bg-gradient-to-r from-transparent via-border-light to-transparent" />

            <div>
              <label className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-text-secondary">
                <ImageIcon className="h-3.5 w-3.5" />
                Search by Image
              </label>
              {searchImagePreview ? (
                <div className="relative overflow-hidden rounded-lg">
                  <img
                    src={searchImagePreview}
                    alt=""
                    className="w-full rounded-lg object-cover"
                  />
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={clearImageSearch}
                    className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-black/60 text-white backdrop-blur-sm"
                  >
                    <X className="h-3.5 w-3.5" />
                  </motion.button>
                  <p className="mt-1.5 text-[10px] text-text-tertiary">
                    Click Search to upload for detection
                  </p>
                </div>
              ) : (
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDragging(true);
                  }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={handleDrop}
                  className={`flex flex-col items-center rounded-lg border-2 border-dashed p-4 transition-colors ${
                    isDragging
                      ? "border-accent-gold/50 bg-accent-gold/5"
                      : "border-border"
                  }`}
                >
                  <Upload className="mb-2 h-5 w-5 text-text-tertiary" />
                  <label className="cursor-pointer text-xs font-medium text-accent-gold transition-colors hover:text-accent-gold-light">
                    Upload an image
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
                  <p className="mt-0.5 text-[10px] text-text-tertiary">
                    or drag &amp; drop
                  </p>
                </div>
              )}
            </div>

            <div>
              <label className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-text-secondary">
                <LinkIcon className="h-3.5 w-3.5" />
                Search by Thumbnail URL
              </label>
              <input
                type="url"
                value={thumbnailUrl}
                onChange={(e) => setThumbnailUrl(e.target.value)}
                placeholder="Paste thumbnail S3 URL..."
                className="w-full rounded-lg border border-border bg-bg-deep px-3 py-2.5 text-sm text-text-primary placeholder:text-text-tertiary transition-all duration-200 focus:border-accent-gold/50 focus:outline-none focus:ring-1 focus:ring-accent-gold/30"
              />
            </div>

            <div>
              <label className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-text-secondary">
                <FileText className="h-3.5 w-3.5" />
                Lookup by File URL
              </label>
              <input
                type="url"
                value={fileUrl}
                onChange={(e) => setFileUrl(e.target.value)}
                placeholder="Paste S3 file URL..."
                className="w-full rounded-lg border border-border bg-bg-deep px-3 py-2.5 text-sm text-text-primary placeholder:text-text-tertiary transition-all duration-200 focus:border-accent-gold/50 focus:outline-none focus:ring-1 focus:ring-accent-gold/30"
              />
            </div>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleSearch}
              disabled={isSearching || isUploading}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-accent-gold py-2.5 text-sm font-semibold text-bg-deep transition-colors hover:bg-accent-gold-light disabled:opacity-60"
            >
              {isSearching || isUploading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Search className="h-4 w-4" />
              )}
              {isUploading ? "Uploading..." : "Search"}
            </motion.button>
          </div>
        </motion.div>

        <div className="flex-1">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-text-primary">
              Search Results
            </h1>
            <p className="mt-1 text-sm text-text-secondary">
              {hasSearched
                ? `Found ${results.length} result${results.length !== 1 ? "s" : ""}`
                : "Use the filters to search your bird collection"}
            </p>
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
              className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border py-20"
            >
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-bg-surface">
                <Search className="h-7 w-7 text-text-tertiary" />
              </div>
              <p className="text-sm font-medium text-text-secondary">
                No search yet
              </p>
              <p className="mt-1 text-xs text-text-tertiary">
                Apply filters and click Search to find birds
              </p>
            </motion.div>
          ) : results.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border py-20"
            >
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-bg-surface">
                <Bird className="h-7 w-7 text-text-tertiary" />
              </div>
              <p className="text-sm font-medium text-text-secondary">
                {isUploading
                  ? "Image uploaded! Detection in progress..."
                  : "No results found"}
              </p>
              <p className="mt-1 text-xs text-text-tertiary">
                {isUploading
                  ? "Search by species once processing completes"
                  : "Try different search criteria"}
              </p>
            </motion.div>
          ) : (
            <div className="space-y-4 stagger-children">
              {results.map((item, i) => {
                if (item.kind === "url") {
                  return (
                    <motion.div
                      key={item.url}
                      whileHover={{ y: -2 }}
                      className="group overflow-hidden rounded-xl border border-border bg-bg-surface/60 transition-all duration-300 hover:border-border-light sm:flex"
                    >
                      <div className="relative aspect-[16/10] overflow-hidden sm:aspect-auto sm:w-48 sm:shrink-0">
                        <img
                          src={item.url}
                          alt={extractName(item.url)}
                          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display =
                              "none";
                          }}
                        />
                      </div>
                      <div className="flex flex-1 flex-col justify-center p-4">
                        <h3 className="text-sm font-semibold text-text-primary">
                          {extractName(item.url)}
                        </h3>
                        <p className="mt-1 truncate text-xs text-text-tertiary">
                          {item.url}
                        </p>
                      </div>
                    </motion.div>
                  );
                }

                if (item.kind === "file") {
                  const d = item.data;
                  return (
                    <motion.div
                      key={d.s3_url}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="rounded-xl border border-border bg-bg-surface/60 p-5"
                    >
                      <div className="flex items-start gap-4">
                        {d.thumbnail_s3_url && (
                          <img
                            src={d.thumbnail_s3_url}
                            alt=""
                            className="h-24 w-24 rounded-lg object-cover"
                          />
                        )}
                        <div className="min-w-0 flex-1">
                          <h3 className="text-sm font-semibold text-text-primary">
                            {extractName(d.s3_url)}
                          </h3>
                          <p className="mt-0.5 text-xs text-text-tertiary">
                            Type: {d.file_type || "unknown"}
                          </p>
                          <p className="mt-0.5 truncate text-xs text-text-tertiary">
                            {d.s3_url}
                          </p>
                          {d.tags && Object.keys(d.tags).length > 0 && (
                            <div className="mt-3 flex flex-wrap gap-1.5">
                              {Object.entries(d.tags).map(([sp, ct]) => (
                                <span
                                  key={sp}
                                  className="flex items-center gap-1 rounded-full bg-accent-emerald/10 px-2.5 py-1 text-xs font-medium text-accent-emerald"
                                >
                                  <Bird className="h-3 w-3" />
                                  {sp}
                                  <span className="rounded-full bg-accent-emerald/20 px-1.5 text-[10px]">
                                    {ct}
                                  </span>
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  );
                }

                if (item.kind === "thumbnail") {
                  return (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="rounded-xl border border-border bg-bg-surface/60 p-5"
                    >
                      <h3 className="mb-3 text-sm font-semibold text-text-primary">
                        Thumbnail Reverse Lookup
                      </h3>
                      <div className="space-y-2 text-sm">
                        <div>
                          <span className="text-xs font-medium text-text-secondary">
                            Thumbnail:
                          </span>
                          <p className="mt-0.5 truncate text-xs text-text-tertiary">
                            {item.thumbnail_s3_url}
                          </p>
                        </div>
                        <div>
                          <span className="text-xs font-medium text-text-secondary">
                            Original File:
                          </span>
                          <p className="mt-0.5 truncate text-xs text-accent-gold">
                            {item.s3_url}
                          </p>
                        </div>
                      </div>
                      <img
                        src={item.thumbnail_s3_url}
                        alt=""
                        className="mt-3 max-h-48 rounded-lg object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = "none";
                        }}
                      />
                    </motion.div>
                  );
                }

                return null;
              })}
            </div>
          )}
        </div>
      </div>
    </PageTransition>
  );
}
