const API_URL = process.env.NEXT_PUBLIC_API_URL || "";

// ── Response types ──────────────────────────────────────────────

export interface UploadResult {
  success: boolean;
  key?: string;
  s3_url?: string;
  error?: string;
}

export interface TagSearchResponse {
  links: string[];
}

export interface ThumbnailSearchResponse {
  thumbnail_s3_url: string;
  s3_url: string;
}

export interface FileMetadata {
  s3_url: string;
  thumbnail_s3_url?: string;
  file_type?: string;
  tags?: Record<string, number>;
  detected_species_list?: string[];
}

export interface DeleteResponse {
  deleted: string[];
}

export interface TagUpdateResponse {
  message: string;
}

// ── Gallery item (used by frontend components) ──────────────────

export interface GalleryItem {
  url: string;
  s3_url?: string;
  thumbnail_s3_url?: string;
  file_type?: string;
  tags: Record<string, number>;
  metadataLoaded: boolean;
}

// ── API client ──────────────────────────────────────────────────

export const BirdNestAPI = {
  /**
   * Upload a file via presigned URL (two-step).
   * Step A: Get presigned URL from Lambda.
   * Step B: PUT file directly to S3.
   */
  uploadFile: async (file: File): Promise<UploadResult> => {
    try {
      const filename = encodeURIComponent(file.name);
      const fileType = encodeURIComponent(file.type);

      const res = await fetch(
        `${API_URL}/upload?fileName=${filename}&fileType=${fileType}`,
        { method: "POST" }
      );

      if (!res.ok) throw new Error("Failed to get upload URL");
      const { uploadUrl, key, s3_url } = await res.json();

      const upload = await fetch(uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": file.type },
        body: file,
      });
      if (!upload.ok) throw new Error("Failed to upload to S3");

      return { success: true, key, s3_url };
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Upload failed";
      console.error("Upload error:", err);
      return { success: false, error: msg };
    }
  },

  /**
   * Search by species tags with minimum counts.
   * Returns a list of matching thumbnail / s3 URLs.
   */
  searchByTags: async (
    tags: Record<string, number>
  ): Promise<TagSearchResponse> => {
    const res = await fetch(`${API_URL}/search/tags`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tags }),
    });
    if (!res.ok) throw new Error("Tag search failed");
    return res.json();
  },

  /**
   * Reverse-lookup: thumbnail URL -> original media file info.
   */
  searchByThumbnail: async (
    thumbnailUrl: string
  ): Promise<ThumbnailSearchResponse> => {
    const res = await fetch(`${API_URL}/search/thumbnail`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ thumbnail_url: thumbnailUrl }),
    });
    if (!res.ok) throw new Error("Thumbnail search failed");
    return res.json();
  },

  /**
   * Get full metadata (tags, file_type, etc.) for a given s3_url.
   */
  searchByFile: async (s3Url: string): Promise<FileMetadata> => {
    const res = await fetch(`${API_URL}/search/file`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ s3_url: s3Url }),
    });
    if (!res.ok) throw new Error("File search failed");
    return res.json();
  },

  /**
   * Delete files from S3 and DB.
   */
  deleteFiles: async (urls: string[]): Promise<DeleteResponse> => {
    const res = await fetch(`${API_URL}/file`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ urls }),
    });
    if (!res.ok) throw new Error("Delete failed");
    return res.json();
  },

  /**
   * Add or remove tags on one or more files.
   * @param urls      file URLs (thumbnail or s3)
   * @param operation 1 = add, 0 = remove
   * @param tags      e.g. ["crow, 2", "pigeon, 1"]
   */
  updateTags: async (
    urls: string[],
    operation: 0 | 1,
    tags: string[]
  ): Promise<TagUpdateResponse> => {
    const res = await fetch(`${API_URL}/tags`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ urls, operation, tags }),
    });
    if (!res.ok) throw new Error("Tag update failed");
    return res.json();
  },

  /**
   * Helper: resolve any URL (thumbnail or s3) to full file metadata.
   */
  getFileMetadata: async (url: string): Promise<FileMetadata> => {
    let s3Url = url;
    if (url.includes("thumb")) {
      const thumbResult = await BirdNestAPI.searchByThumbnail(url);
      s3Url = thumbResult.s3_url;
    }
    return BirdNestAPI.searchByFile(s3Url);
  },

  /**
   * Poll DynamoDB until the AI detection tags appear for a given S3 URL.
   * Retries up to `attempts` times with a 1-second delay between each.
   */
  pollForResults: async (
    s3Url: string,
    attempts = 30
  ): Promise<FileMetadata> => {
    for (let i = 0; i < attempts; i++) {
      await new Promise((r) => setTimeout(r, 1000));
      try {
        const data = await BirdNestAPI.searchByFile(s3Url);
        if (data && data.tags && Object.keys(data.tags).length > 0) {
          return data;
        }
      } catch {
        // File not yet indexed — keep polling
      }
    }
    throw new Error("Timeout: AI took too long to process.");
  },
};

export const S3_BUCKET_URL = "https://birdnest-app-storage.s3.amazonaws.com";

// ── Tag diff helper (used by TagModal) ──────────────────────────

export function computeTagDiff(
  oldTags: Record<string, number>,
  newTags: Record<string, number>
) {
  const additions: string[] = [];
  const removals: string[] = [];

  for (const [species, count] of Object.entries(newTags)) {
    const oldCount = oldTags[species] || 0;
    if (count > oldCount) {
      additions.push(`${species}, ${count - oldCount}`);
    } else if (count < oldCount) {
      removals.push(`${species}, ${oldCount - count}`);
    }
  }

  for (const [species, count] of Object.entries(oldTags)) {
    if (!(species in newTags)) {
      removals.push(`${species}, ${count}`);
    }
  }

  return { additions, removals };
}
