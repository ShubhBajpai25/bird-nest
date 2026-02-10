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
} from "lucide-react";
import PageTransition from "@/app/components/PageTransition";

interface SearchResult {
  id: string;
  name: string;
  species: string;
  thumbnail: string;
  count: number;
  confidence: number;
}

const mockResults: SearchResult[] = [
  {
    id: "1",
    name: "House Crow",
    species: "Corvus splendens",
    thumbnail:
      "https://images.unsplash.com/photo-1583244685026-d8519b5e3d21?w=400&h=300&fit=crop",
    count: 12,
    confidence: 97,
  },
  {
    id: "2",
    name: "Jungle Crow",
    species: "Corvus macrorhynchos",
    thumbnail:
      "https://images.unsplash.com/photo-1591608971362-f08b2a75731a?w=400&h=300&fit=crop",
    count: 5,
    confidence: 89,
  },
  {
    id: "3",
    name: "Indian Robin",
    species: "Copsychus fulicatus",
    thumbnail:
      "https://images.unsplash.com/photo-1606567595334-d39972c85dbe?w=400&h=300&fit=crop",
    count: 3,
    confidence: 85,
  },
  {
    id: "4",
    name: "Common Myna",
    species: "Acridotheres tristis",
    thumbnail:
      "https://images.unsplash.com/photo-1552728089-57bdde30beb3?w=400&h=300&fit=crop",
    count: 8,
    confidence: 92,
  },
];

export default function SearchPage() {
  const [species, setSpecies] = useState("");
  const [minCount, setMinCount] = useState("");
  const [thumbnailUrl, setThumbnailUrl] = useState("");
  const [searchImagePreview, setSearchImagePreview] = useState<string | null>(
    null
  );
  const [results, setResults] = useState<SearchResult[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const handleSearch = () => {
    setHasSearched(true);
    if (species) {
      const filtered = mockResults.filter(
        (r) =>
          r.species.toLowerCase().includes(species.toLowerCase()) ||
          r.name.toLowerCase().includes(species.toLowerCase())
      );
      const countFiltered = minCount
        ? filtered.filter((r) => r.count >= parseInt(minCount))
        : filtered;
      setResults(countFiltered.length ? countFiltered : mockResults);
    } else {
      setResults(mockResults);
    }
  };

  const handleImageUpload = useCallback((file: File) => {
    setSearchImagePreview(URL.createObjectURL(file));
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file && file.type.startsWith("image/")) handleImageUpload(file);
    },
    [handleImageUpload]
  );

  const clearImageSearch = () => {
    setSearchImagePreview(null);
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
          <div className="sticky top-8 rounded-2xl border border-border bg-bg-surface/60 p-5">
            <div className="mb-5 flex items-center gap-2">
              <SlidersHorizontal className="h-4 w-4 text-accent-gold" />
              <h2 className="text-sm font-semibold text-text-primary">
                Advanced Search
              </h2>
            </div>

            <div className="mb-4">
              <label className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-text-secondary">
                <Bird className="h-3.5 w-3.5" />
                Filter by Species
              </label>
              <input
                type="text"
                value={species}
                onChange={(e) => setSpecies(e.target.value)}
                placeholder='e.g. "Crow"'
                className="w-full rounded-lg border border-border bg-bg-deep px-3 py-2.5 text-sm text-text-primary placeholder:text-text-tertiary transition-all duration-200 focus:border-accent-gold/50 focus:outline-none focus:ring-1 focus:ring-accent-gold/30"
              />
            </div>

            <div className="mb-4">
              <label className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-text-secondary">
                <Hash className="h-3.5 w-3.5" />
                Minimum Count
              </label>
              <input
                type="number"
                value={minCount}
                onChange={(e) => setMinCount(e.target.value)}
                placeholder='e.g. "2"'
                min="0"
                className="w-full rounded-lg border border-border bg-bg-deep px-3 py-2.5 text-sm text-text-primary placeholder:text-text-tertiary transition-all duration-200 focus:border-accent-gold/50 focus:outline-none focus:ring-1 focus:ring-accent-gold/30"
              />
            </div>

            <div className="my-5 h-px bg-gradient-to-r from-transparent via-border-light to-transparent" />

            <div className="mb-4">
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
                        if (file) handleImageUpload(file);
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

            <div className="mb-5">
              <label className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-text-secondary">
                <LinkIcon className="h-3.5 w-3.5" />
                Search by Thumbnail URL
              </label>
              <input
                type="url"
                value={thumbnailUrl}
                onChange={(e) => setThumbnailUrl(e.target.value)}
                placeholder="https://example.com/bird.jpg"
                className="w-full rounded-lg border border-border bg-bg-deep px-3 py-2.5 text-sm text-text-primary placeholder:text-text-tertiary transition-all duration-200 focus:border-accent-gold/50 focus:outline-none focus:ring-1 focus:ring-accent-gold/30"
              />
            </div>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleSearch}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-accent-gold py-2.5 text-sm font-semibold text-bg-deep transition-colors hover:bg-accent-gold-light"
            >
              <Search className="h-4 w-4" />
              Search
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
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 stagger-children">
              {results.map((result) => (
                <motion.div
                  key={result.id}
                  whileHover={{ y: -2 }}
                  className="group overflow-hidden rounded-xl border border-border bg-bg-surface/60 transition-all duration-300 hover:border-border-light"
                >
                  <div className="relative aspect-[16/10] overflow-hidden">
                    <img
                      src={result.thumbnail}
                      alt={result.name}
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                    <div className="absolute right-2 top-2 rounded-full bg-black/50 px-2 py-0.5 text-[10px] font-bold text-accent-emerald backdrop-blur-sm">
                      {result.confidence}% match
                    </div>
                  </div>
                  <div className="p-4">
                    <h3 className="text-sm font-semibold text-text-primary">
                      {result.name}
                    </h3>
                    <p className="text-xs italic text-text-tertiary">
                      {result.species}
                    </p>
                    <div className="mt-2 flex items-center gap-1.5 text-xs text-text-secondary">
                      <Bird className="h-3.5 w-3.5 text-accent-gold" />
                      {result.count} sightings
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>
    </PageTransition>
  );
}
