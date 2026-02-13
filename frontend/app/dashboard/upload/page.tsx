"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Upload,
  Image as ImageIcon,
  Video,
  X,
  Check,
  CloudUpload,
  FileWarning,
  ChevronLeft,
  ChevronRight,
  Bird,
  Loader2,
  Clock,
  ArrowLeft,
} from "lucide-react";
import Link from "next/link";
import PageTransition from "@/app/components/PageTransition";
import { BirdNestAPI, type FileMetadata } from "@/app/lib/api";

// ── Types ───────────────────────────────────────────────────────

interface UploadFile {
  id: string;
  file: File;
  type: "image" | "video";
  status: "pending" | "uploading" | "done" | "error";
  s3Key?: string;
  error?: string;
  preview?: string;
}

interface DetectionResult {
  id: string;
  fileName: string;
  fileType: "image" | "video";
  s3Url: string;
  preview?: string;
  status: "processing" | "done" | "error";
  tags?: Record<string, number>;
  thumbnailUrl?: string; 
  startTime: number;
  elapsedMs: number;
  error?: string;
}

const typeConfig = {
  image: { icon: ImageIcon, color: "text-blue-400", bg: "bg-blue-500/10" },
  video: { icon: Video, color: "text-amber-400", bg: "bg-amber-500/10" },
};

function getFileType(file: File): "image" | "video" {
  if (file.type.startsWith("image/")) return "image";
  return "video";
}

function formatTime(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  const tenths = Math.floor((ms % 1000) / 100);
  if (mins > 0) return `${mins}m ${secs}.${tenths}s`;
  return `${secs}.${tenths}s`;
}

// ── Timer sub-component ─────────────────────────────────────────

function LiveTimer({ startTime }: { startTime: number }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 100);
    return () => clearInterval(interval);
  }, []);
  return <span>{formatTime(now - startTime)}</span>;
}

// ── Main component ──────────────────────────────────────────────

export default function UploadPage() {
  const [files, setFiles] = useState<UploadFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [detections, setDetections] = useState<DetectionResult[]>([]);
  const [activeIdx, setActiveIdx] = useState(0);
  const pollingRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (detections.length > 0 && activeIdx >= detections.length) {
      setActiveIdx(detections.length - 1);
    }
  }, [detections.length, activeIdx]);

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

  const startPolling = useCallback(
    (detectionId: string, s3Url: string) => {
      if (pollingRef.current.has(detectionId)) return;
      pollingRef.current.add(detectionId);

      (async () => {
        try {
          const result: FileMetadata = await BirdNestAPI.pollForResults(s3Url);
          const endTime = Date.now();
          setDetections((prev) =>
            prev.map((d) =>
              d.id === detectionId
                ? {
                    ...d,
                    status: "done" as const,
                    tags: result.tags || {},
                    thumbnailUrl: undefined, 
                    elapsedMs: endTime - d.startTime,
                  }
                : d
            )
          );
        } catch (err) {
          const endTime = Date.now();
          setDetections((prev) =>
            prev.map((d) =>
              d.id === detectionId
                ? {
                    ...d,
                    status: "error" as const,
                    error:
                      err instanceof Error ? err.message : "Detection failed",
                    elapsedMs: endTime - d.startTime,
                  }
                : d
            )
          );
        } finally {
          pollingRef.current.delete(detectionId);
        }
      })();
    },
    []
  );

  const uploadAll = async () => {
    const pending = files.filter((f) => f.status === "pending");
    if (pending.length === 0) return;

    setFiles((prev) =>
      prev.map((f) =>
        f.status === "pending" ? { ...f, status: "uploading" as const } : f
      )
    );

    for (const pf of pending) {
      try {
          const result = await BirdNestAPI.uploadFile(pf.file);

          if (result.success && result.s3_url) {
            setFiles((prev) =>
              prev.map((f) =>
                f.id === pf.id
                  ? { ...f, status: "done" as const, s3Key: result.key }
                  : f
              )
            );

            const s3Url = result.s3_url;
            const detId = pf.id + "-det";
            
            const newDetection: DetectionResult = {
              id: detId,
              fileName: pf.file.name,
              fileType: getFileType(pf.file),
              s3Url: s3Url,
              preview: s3Url, 
              status: "processing",
              startTime: Date.now(),
              elapsedMs: 0,
            };

            setDetections((prev) => {
              setActiveIdx(prev.length);
              return [...prev, newDetection];
            });
            
            startPolling(detId, s3Url);
            
          } else {
            setFiles((prev) =>
              prev.map((f) =>
                f.id === pf.id
                  ? { ...f, status: "error" as const, error: result.error || "Upload failed" }
                  : f
              )
            );
          }

      } catch (error: any) {
          setFiles((prev) =>
            prev.map((f) =>
              f.id === pf.id
                ? { ...f, status: "error" as const, error: error.message || "Network Error" }
                : f
            )
          );
      }
    }
  };

  const goLeft = () => setActiveIdx((i) => Math.max(0, i - 1));
  const goRight = () =>
    setActiveIdx((i) => Math.min(detections.length - 1, i + 1));

  const activeDet = detections[activeIdx] ?? null;

  return (
    <PageTransition>
      <Link href="/dashboard">
        <motion.div
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.95 }}
          className="mb-4 flex h-9 w-9 items-center justify-center rounded-full border border-border bg-bg-surface/60 text-text-secondary transition-colors hover:border-accent-gold/40 hover:text-accent-gold"
        >
          <ArrowLeft className="h-4 w-4" />
        </motion.div>
      </Link>
      <div className="mx-auto max-w-4xl">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-text-primary">Upload Media</h1>
          <p className="mt-1 text-sm text-text-secondary">
            Drop your bird images or video clips for model detection!
          </p>
        </div>

        <motion.div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          animate={isDragging ? { scale: 1.02, borderColor: "rgba(201,168,76,0.5)" } : { scale: 1 }}
          className={`relative flex flex-col items-center justify-center rounded-2xl border-2 border-dashed p-12 transition-colors duration-300 ${
            isDragging ? "border-accent-gold/50 bg-accent-gold/5" : "border-border hover:border-border-light hover:bg-bg-surface/30"
          }`}
        >
          <motion.div
            animate={isDragging ? { y: -8, scale: 1.1 } : { y: 0, scale: 1 }}
            transition={{ type: "spring", stiffness: 300 }}
          >
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-accent-gold/10">
              <CloudUpload className={`h-8 w-8 ${isDragging ? "text-accent-gold" : "text-text-tertiary"} transition-colors`} />
            </div>
          </motion.div>
          <p className="mb-1 text-base font-semibold text-text-primary">
            {isDragging ? "Release to upload" : "Drag & drop files here"}
          </p>
          <p className="mb-4 text-sm text-text-tertiary">Images and video files supported</p>
          <label className="cursor-pointer">
            <motion.span
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              className="inline-flex items-center gap-2 rounded-lg bg-accent-gold/10 px-4 py-2 text-sm font-medium text-accent-gold transition-colors hover:bg-accent-gold/20"
            >
              <Upload className="h-4 w-4" />
              Browse Files
            </motion.span>
            <input type="file" multiple accept="image/*,video/*" onChange={(e) => e.target.files && handleFiles(e.target.files)} className="hidden" />
          </label>
           
          <div className="mt-6 flex gap-3">
            {[{ icon: ImageIcon, label: "Images", color: "text-blue-400/60" }, { icon: Video, label: "Video", color: "text-amber-400/60" }].map(({ icon: Icon, label, color }) => (
              <span key={label} className={`flex items-center gap-1.5 text-xs ${color}`}>
                <Icon className="h-3.5 w-3.5" />
                {label}
              </span>
            ))}
          </div>
        </motion.div>

        <AnimatePresence>
          {files.length > 0 && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mt-6">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-text-secondary">{files.length} file{files.length > 1 ? "s" : ""} selected</h2>
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
                      <motion.div key={f.id} layout initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20, height: 0 }} className="flex items-center gap-4 rounded-xl border border-border bg-bg-surface/60 p-4">
                        {f.preview ? (
                          <div className="h-12 w-12 overflow-hidden rounded-lg"><img src={f.preview} alt="" className="h-full w-full object-cover" /></div>
                        ) : (
                          <div className={`flex h-12 w-12 items-center justify-center rounded-lg ${config.bg}`}><Icon className={`h-5 w-5 ${config.color}`} /></div>
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-text-primary">{f.file.name}</p>
                          <p className="text-xs text-text-tertiary">{(f.file.size / 1024 / 1024).toFixed(2)} MB</p>
                          {f.status === "uploading" && (
                            <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-bg-hover"><motion.div className="h-full rounded-full bg-accent-gold" initial={{ width: "0%" }} animate={{ width: "90%" }} transition={{ duration: 8, ease: "easeOut" }} /></div>
                          )}
                          {f.status === "done" && f.s3Key && <p className="mt-1 truncate text-[10px] text-accent-emerald">{f.s3Key}</p>}
                          {f.status === "error" && f.error && <p className="mt-1 truncate text-[10px] text-danger">{f.error}</p>}
                        </div>
                        {f.status === "done" ? (
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-accent-emerald/10"><Check className="h-4 w-4 text-accent-emerald" /></div>
                        ) : f.status === "error" ? (
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-danger/10"><FileWarning className="h-4 w-4 text-danger" /></div>
                        ) : (
                          <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={() => removeFile(f.id)} className="flex h-8 w-8 items-center justify-center rounded-full text-text-tertiary transition-colors hover:bg-danger/10 hover:text-danger"><X className="h-4 w-4" /></motion.button>
                        )}
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="mt-8">
          <div className="mb-4 flex items-center gap-2">
            <h2 className="text-sm font-semibold text-text-primary">Detection Results</h2>
            {detections.length > 1 && <span className="ml-auto text-xs text-text-tertiary">{activeIdx + 1} / {detections.length}</span>}
          </div>

          <div className="relative overflow-hidden rounded-2xl border border-border bg-bg-surface/60">
            {detections.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16">
                <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-bg-hover/60"><Bird className="h-6 w-6 text-text-tertiary" /></div>
                <p className="text-sm font-medium text-text-secondary">Detection results will appear here</p>
                <p className="mt-1 max-w-xs text-center text-xs text-text-tertiary">Upload your bird images or videos and the YOLOv5 model will automatically identify species. Results for each upload will be shown in this section.</p>
              </div>
            ) : (
              <div className="relative">
                {detections.length > 1 && activeIdx > 0 && (
                  <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={goLeft} className="absolute left-3 top-1/2 z-10 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur-sm transition-colors hover:bg-black/70"><ChevronLeft className="h-5 w-5" /></motion.button>
                )}
                {detections.length > 1 && activeIdx < detections.length - 1 && (
                  <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={goRight} className="absolute right-3 top-1/2 z-10 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur-sm transition-colors hover:bg-black/70"><ChevronRight className="h-5 w-5" /></motion.button>
                )}

                <AnimatePresence mode="wait">
                  {activeDet && (
                    <motion.div key={activeDet.id} initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -40 }} transition={{ duration: 0.25 }}>
                      {activeDet.status === "processing" ? (
                        <div className="flex flex-col items-center py-14">
                          <div className="relative mb-5">
                            {activeDet.preview ? (
                              <div className="relative h-40 w-40 overflow-hidden rounded-2xl border border-border">
                                <img src={activeDet.preview} alt="" className="h-full w-full object-cover opacity-60" />
                                <div className="absolute inset-0 flex items-center justify-center bg-black/30"><Loader2 className="h-8 w-8 animate-spin text-accent-gold" /></div>
                              </div>
                            ) : (
                              <div className="flex h-40 w-40 items-center justify-center rounded-2xl border border-border bg-bg-deep"><Loader2 className="h-8 w-8 animate-spin text-accent-gold" /></div>
                            )}
                          </div>
                          <p className="text-sm font-semibold text-text-primary">Analyzing <span className="text-accent-gold">{activeDet.fileName}</span></p>
                          <p className="mt-1 text-xs text-text-tertiary">AI is identifying bird species...</p>
                          <div className="mt-4 flex items-center gap-1.5 rounded-full bg-accent-gold/10 px-3 py-1.5 text-xs font-medium text-accent-gold"><Clock className="h-3.5 w-3.5" /><LiveTimer startTime={activeDet.startTime} /></div>
                        </div>
                      ) : activeDet.status === "error" ? (
                        <div className="flex flex-col items-center py-14">
                          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-danger/10"><FileWarning className="h-6 w-6 text-danger" /></div>
                          <p className="text-sm font-semibold text-text-primary">Detection failed for <span className="text-danger">{activeDet.fileName}</span></p>
                          <p className="mt-1 text-xs text-text-tertiary">{activeDet.error}</p>
                          <div className="mt-3 flex items-center gap-1.5 text-xs text-text-tertiary"><Clock className="h-3 w-3" />{formatTime(activeDet.elapsedMs)}</div>
                        </div>
                      ) : (
                        <div className="p-5">
                          <div className="flex flex-col gap-5 sm:flex-row">
                            <div className="shrink-0">
                                {activeDet.fileType === 'video' && activeDet.preview ? (
                                    <video src={activeDet.preview} className="h-56 w-56 rounded-xl border border-border object-cover sm:h-48 sm:w-48" controls />
                                ) : activeDet.s3Url || activeDet.preview ? (
                                    <img src={activeDet.s3Url || activeDet.preview} alt="" className="h-56 w-56 rounded-xl border border-border object-cover sm:h-48 sm:w-48" onError={(e) => { console.error("❌ Image Load Error:", e.currentTarget.src); e.currentTarget.style.border = "2px solid red"; }} />
                                ) : (
                                    <div className="flex h-48 w-48 items-center justify-center rounded-xl border border-border bg-bg-deep"><Video className="h-10 w-10 text-text-tertiary" /></div>
                                )}
                            </div>
                            <div className="flex-1">
                              <div className="mb-1 flex items-center gap-2"><Check className="h-4 w-4 text-accent-emerald" /><h3 className="text-base font-semibold text-text-primary">Detection Complete</h3></div>
                              <p className="mb-4 truncate text-xs text-text-tertiary">{activeDet.fileName}</p>
                              {activeDet.tags && Object.keys(activeDet.tags).length > 0 ? (
                                <div className="space-y-2">
                                  {Object.entries(activeDet.tags).map(([species, count]) => (
                                    <div key={species} className="flex items-center justify-between rounded-lg border border-border bg-bg-deep px-4 py-2.5">
                                      <div className="flex items-center gap-2.5"><Bird className="h-4 w-4 text-accent-gold" /><span className="text-sm font-semibold capitalize text-text-primary">{species}</span></div>
                                      <span className="rounded-full bg-accent-emerald/10 px-2.5 py-0.5 text-xs font-bold text-accent-emerald">{count}</span>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <p className="text-sm text-text-tertiary">No species detected.</p>
                              )}
                            </div>
                          </div>
                          <div className="mt-4 flex items-center justify-end gap-1.5 border-t border-border pt-3 text-[11px] text-text-tertiary"><Clock className="h-3 w-3" />Processed in {formatTime(activeDet.elapsedMs)}</div>
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>

                {detections.length > 1 && (
                  <div className="flex items-center justify-center gap-1.5 border-t border-border py-3">
                    {detections.map((d, i) => (
                      <button key={d.id} onClick={() => setActiveIdx(i)} className={`h-2 rounded-full transition-all duration-200 ${i === activeIdx ? "w-5 bg-accent-gold" : d.status === "processing" ? "w-2 bg-accent-gold/30" : d.status === "error" ? "w-2 bg-danger/40" : "w-2 bg-accent-emerald/40"}`} />
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </PageTransition>
  );
}