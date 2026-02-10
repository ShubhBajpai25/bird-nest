"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Trash2, Tag, Bird, Filter } from "lucide-react";
import PageTransition from "@/app/components/PageTransition";
import TagModal from "@/app/components/TagModal";

interface BirdImage {
  id: string;
  name: string;
  species: string;
  thumbnail: string;
  tags: string[];
  date: string;
}

const mockImages: BirdImage[] = [
  {
    id: "1",
    name: "Peacock Display",
    species: "Pavo cristatus",
    thumbnail:
      "https://images.unsplash.com/photo-1524820197278-540916411e20?w=400&h=300&fit=crop",
    tags: ["colorful", "display"],
    date: "2025-01-15",
  },
  {
    id: "2",
    name: "Crow on Branch",
    species: "Corvus splendens",
    thumbnail:
      "https://images.unsplash.com/photo-1583244685026-d8519b5e3d21?w=400&h=300&fit=crop",
    tags: ["urban", "perching"],
    date: "2025-01-14",
  },
  {
    id: "3",
    name: "Kingfisher Dive",
    species: "Alcedo atthis",
    thumbnail:
      "https://images.unsplash.com/photo-1579019163248-e7761241d85a?w=400&h=300&fit=crop",
    tags: ["action", "water"],
    date: "2025-01-13",
  },
  {
    id: "4",
    name: "Parakeet Pair",
    species: "Psittacula krameri",
    thumbnail:
      "https://images.unsplash.com/photo-1552728089-57bdde30beb3?w=400&h=300&fit=crop",
    tags: ["pair", "green"],
    date: "2025-01-12",
  },
  {
    id: "5",
    name: "Owl at Dusk",
    species: "Athene brama",
    thumbnail:
      "https://images.unsplash.com/photo-1543549790-8b5f4a028cfb?w=400&h=300&fit=crop",
    tags: ["nocturnal", "eyes"],
    date: "2025-01-11",
  },
  {
    id: "6",
    name: "Eagle Soaring",
    species: "Aquila nipalensis",
    thumbnail:
      "https://images.unsplash.com/photo-1611689342806-0863700ce8e4?w=400&h=300&fit=crop",
    tags: ["flight", "raptor"],
    date: "2025-01-10",
  },
  {
    id: "7",
    name: "Flamingo Flock",
    species: "Phoenicopterus roseus",
    thumbnail:
      "https://images.unsplash.com/photo-1497206365907-f5e630693df0?w=400&h=300&fit=crop",
    tags: ["flock", "pink"],
    date: "2025-01-09",
  },
  {
    id: "8",
    name: "Hummingbird",
    species: "Trochilidae",
    thumbnail:
      "https://images.unsplash.com/photo-1520808663317-647b476a81b9?w=400&h=300&fit=crop",
    tags: ["tiny", "hover"],
    date: "2025-01-08",
  },
  {
    id: "9",
    name: "Robin in Snow",
    species: "Erithacus rubecula",
    thumbnail:
      "https://images.unsplash.com/photo-1606567595334-d39972c85dbe?w=400&h=300&fit=crop",
    tags: ["winter", "red"],
    date: "2025-01-07",
  },
];

export default function GalleryPage() {
  const [images, setImages] = useState<BirdImage[]>(mockImages);
  const [selectedImage, setSelectedImage] = useState<BirdImage | null>(null);
  const [tagModalOpen, setTagModalOpen] = useState(false);

  const deleteImage = (id: string) => {
    setImages((prev) => prev.filter((img) => img.id !== id));
  };

  const openTagModal = (image: BirdImage) => {
    setSelectedImage(image);
    setTagModalOpen(true);
  };

  const saveTags = (tags: string[]) => {
    if (!selectedImage) return;
    setImages((prev) =>
      prev.map((img) =>
        img.id === selectedImage.id ? { ...img, tags } : img
      )
    );
  };

  return (
    <PageTransition>
      <div>
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-text-primary">Gallery</h1>
            <p className="mt-1 text-sm text-text-secondary">
              {images.length} bird images in your collection
            </p>
          </div>
          <div className="flex items-center gap-2 rounded-lg border border-border bg-bg-surface/60 px-3 py-2 text-sm text-text-secondary">
            <Filter className="h-4 w-4" />
            <span>{images.length} items</span>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 stagger-children">
          <AnimatePresence mode="popLayout">
            {images.map((image) => (
              <motion.div
                key={image.id}
                layout
                exit={{ opacity: 0, scale: 0.8 }}
                className="group relative overflow-hidden rounded-xl border border-border bg-bg-surface/60 transition-all duration-300 hover:border-border-light hover:shadow-lg hover:shadow-black/20"
              >
                <div className="relative aspect-[4/3] overflow-hidden">
                  <img
                    src={image.thumbnail}
                    alt={image.name}
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

                  <div className="absolute bottom-3 right-3 flex gap-2 translate-y-2 opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100">
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={() => openTagModal(image)}
                      className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/10 text-white backdrop-blur-sm transition-colors hover:bg-accent-gold/30 hover:text-accent-gold"
                    >
                      <Tag className="h-4 w-4" />
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={() => deleteImage(image.id)}
                      className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/10 text-white backdrop-blur-sm transition-colors hover:bg-danger/30 hover:text-danger"
                    >
                      <Trash2 className="h-4 w-4" />
                    </motion.button>
                  </div>

                  <div className="absolute left-3 top-3 flex items-center gap-1.5 rounded-full bg-black/40 px-2.5 py-1 backdrop-blur-sm">
                    <Bird className="h-3 w-3 text-accent-gold" />
                    <span className="text-[10px] font-medium text-white">
                      {image.species}
                    </span>
                  </div>
                </div>

                <div className="p-4">
                  <h3 className="text-sm font-semibold text-text-primary">
                    {image.name}
                  </h3>
                  <p className="mt-0.5 text-xs text-text-tertiary">
                    {image.date}
                  </p>
                  {image.tags.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {image.tags.map((tag) => (
                        <span
                          key={tag}
                          className="rounded-full bg-accent-emerald/10 px-2 py-0.5 text-[10px] font-medium text-accent-emerald/70"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {selectedImage && (
          <TagModal
            key={selectedImage.id}
            isOpen={tagModalOpen}
            onClose={() => setTagModalOpen(false)}
            imageName={selectedImage.name}
            initialTags={selectedImage.tags}
            onSave={saveTags}
          />
        )}
      </div>
    </PageTransition>
  );
}
