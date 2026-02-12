"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Upload,
  Image as ImageIcon,
  Music,
  Video,
  X,
  Check,
  CloudUpload,
  FileWarning,
} from "lucide-react";
import PageTransition from "@/app/components/PageTransition";
import { BirdNestAPI } from "@/app/lib/api";

interface UploadFile {
  id: string;
  file: File;
  type: "image" | "audio" | "video";
  status: "pending" | "uploading" | "done" | "error";
  s3Key?: string;
  error?: string;
  preview?: string;
}

const typeConfig = {
  image: { icon: ImageIcon, color: "text-blue-400", bg: "bg-blue-500/10" },
  audio: { icon: Music, color: "text-purple-400", bg: "bg-purple-500/10" },
  video: { icon: Video, color: "text-amber-400", bg: "bg-amber-500/10" },
};

function getFileType(file: File): "image" | "audio" | "video" {
  if (file.type.startsWith("image/")) return "image";
  if (file.type.startsWith("audio/")) return "audio";
  return "video";
}

export default function UploadPage() {
  const [files, setFiles] = useState<UploadFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);

  const handleFiles = useCallback((fileList: FileList) => {
    const newFiles: UploadFile[] = Array.from(fileList).map((file) => ({
      id: Math.random().toString(36).slice(2),
      file,
      type: getFileType(file),
      status: "pending" as const,
      preview: file.type.startsWith("image/")
        ? URL.createObjectURL(file)
        : undefined,
    }));
    setFiles((prev) => [...prev, ...newFiles]);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      if (e.dataTransfer.files.length) handleFiles(e.dataTransfer.files);
    },
    [handleFiles]
  );

  const removeFile = (id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id));
  };

  const uploadAll = async () => {
    const pending = files.filter((f) => f.status === "pending");

    setFiles((prev) =>
      prev.map((f) =>
        f.status === "pending" ? { ...f, status: "uploading" as const } : f
      )
    );

    for (const pf of pending) {
      const result = await BirdNestAPI.uploadFile(pf.file);
      setFiles((prev) =>
        prev.map((f) =>
          f.id === pf.id
            ? result.success
              ? { ...f, status: "done" as const, s3Key: result.key }
              : {
                  ...f,
                  status: "error" as const,
                  error: result.error,
                }
            : f
        )
      );
    }
  };

  return (
    <PageTransition>
      <div className="max-w-4xl">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-text-primary">
            Upload Media
          </h1>
          <p className="mt-1 text-sm text-text-secondary">
            Drop your bird images, audio recordings, or video clips for AI
            detection
          </p>
        </div>

        <motion.div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          animate={
            isDragging
              ? { scale: 1.02, borderColor: "rgba(201,168,76,0.5)" }
              : { scale: 1 }
          }
          className={`relative flex flex-col items-center justify-center rounded-2xl border-2 border-dashed p-12 transition-colors duration-300 ${
            isDragging
              ? "border-accent-gold/50 bg-accent-gold/5"
              : "border-border hover:border-border-light hover:bg-bg-surface/30"
          }`}
        >
          <motion.div
            animate={isDragging ? { y: -8, scale: 1.1 } : { y: 0, scale: 1 }}
            transition={{ type: "spring", stiffness: 300 }}
          >
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-accent-gold/10">
              <CloudUpload
                className={`h-8 w-8 ${isDragging ? "text-accent-gold" : "text-text-tertiary"} transition-colors`}
              />
            </div>
          </motion.div>
          <p className="mb-1 text-base font-semibold text-text-primary">
            {isDragging ? "Release to upload" : "Drag & drop files here"}
          </p>
          <p className="mb-4 text-sm text-text-tertiary">
            Images, audio, and video files supported
          </p>
          <label className="cursor-pointer">
            <motion.span
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              className="inline-flex items-center gap-2 rounded-lg bg-accent-gold/10 px-4 py-2 text-sm font-medium text-accent-gold transition-colors hover:bg-accent-gold/20"
            >
              <Upload className="h-4 w-4" />
              Browse Files
            </motion.span>
            <input
              type="file"
              multiple
              accept="image/*,audio/*,video/*"
              onChange={(e) => e.target.files && handleFiles(e.target.files)}
              className="hidden"
            />
          </label>

          <div className="mt-6 flex gap-3">
            {[
              { icon: ImageIcon, label: "Images", color: "text-blue-400/60" },
              { icon: Music, label: "Audio", color: "text-purple-400/60" },
              { icon: Video, label: "Video", color: "text-amber-400/60" },
            ].map(({ icon: Icon, label, color }) => (
              <span
                key={label}
                className={`flex items-center gap-1.5 text-xs ${color}`}
              >
                <Icon className="h-3.5 w-3.5" />
                {label}
              </span>
            ))}
          </div>
        </motion.div>

        <AnimatePresence>
          {files.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-6"
            >
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-text-secondary">
                  {files.length} file{files.length > 1 ? "s" : ""} selected
                </h2>
                <motion.button
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={uploadAll}
                  disabled={files.every((f) => f.status !== "pending")}
                  className="flex items-center gap-2 rounded-lg bg-accent-gold px-4 py-2 text-sm font-semibold text-bg-deep transition-colors hover:bg-accent-gold-light disabled:opacity-40"
                >
                  <Upload className="h-4 w-4" />
                  Upload All
                </motion.button>
              </div>

              <div className="space-y-2">
                <AnimatePresence mode="popLayout">
                  {files.map((f) => {
                    const config = typeConfig[f.type];
                    const Icon = config.icon;
                    return (
                      <motion.div
                        key={f.id}
                        layout
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20, height: 0 }}
                        className="flex items-center gap-4 rounded-xl border border-border bg-bg-surface/60 p-4"
                      >
                        {f.preview ? (
                          <div className="h-12 w-12 overflow-hidden rounded-lg">
                            <img
                              src={f.preview}
                              alt=""
                              className="h-full w-full object-cover"
                            />
                          </div>
                        ) : (
                          <div
                            className={`flex h-12 w-12 items-center justify-center rounded-lg ${config.bg}`}
                          >
                            <Icon className={`h-5 w-5 ${config.color}`} />
                          </div>
                        )}

                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-text-primary">
                            {f.file.name}
                          </p>
                          <p className="text-xs text-text-tertiary">
                            {(f.file.size / 1024 / 1024).toFixed(2)} MB
                          </p>
                          {f.status === "uploading" && (
                            <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-bg-hover">
                              <motion.div
                                className="h-full rounded-full bg-accent-gold"
                                initial={{ width: "0%" }}
                                animate={{ width: "90%" }}
                                transition={{ duration: 8, ease: "easeOut" }}
                              />
                            </div>
                          )}
                          {f.status === "done" && f.s3Key && (
                            <p className="mt-1 truncate text-[10px] text-accent-emerald">
                              {f.s3Key}
                            </p>
                          )}
                          {f.status === "error" && f.error && (
                            <p className="mt-1 truncate text-[10px] text-danger">
                              {f.error}
                            </p>
                          )}
                        </div>

                        {f.status === "done" ? (
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-accent-emerald/10">
                            <Check className="h-4 w-4 text-accent-emerald" />
                          </div>
                        ) : f.status === "error" ? (
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-danger/10">
                            <FileWarning className="h-4 w-4 text-danger" />
                          </div>
                        ) : (
                          <motion.button
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={() => removeFile(f.id)}
                            className="flex h-8 w-8 items-center justify-center rounded-full text-text-tertiary transition-colors hover:bg-danger/10 hover:text-danger"
                          >
                            <X className="h-4 w-4" />
                          </motion.button>
                        )}
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </PageTransition>
  );
}
