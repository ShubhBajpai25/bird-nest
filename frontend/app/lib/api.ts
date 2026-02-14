import { getCurrentUser } from 'aws-amplify/auth';

const API_URL = process.env.NEXT_PUBLIC_API_URL || "";

// ── Interfaces ──────────────────────────────────────────────────
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

export interface GalleryItem {
  url: string;
  s3_url?: string;
  thumbnail_s3_url?: string;
  file_type?: string;
  tags: Record<string, number>;
  metadataLoaded: boolean;
}

// ── API Client ──────────────────────────────────────────────────
export const BirdNestAPI = {
  
  // 1. Get User ID
  async getUserId(): Promise<string> {
    try {
      const user = await getCurrentUser();
      return user.userId;
    } catch (error) {
      console.warn("User not logged in, defaulting to anonymous");
      return "anonymous-user";
    }
  },

  // 2. Upload File
  uploadFile: async (file: File): Promise<UploadResult> => {
    try {
      const userId = await BirdNestAPI.getUserId();
      const filename = encodeURIComponent(file.name);
      const fileType = encodeURIComponent(file.type);

      const res = await fetch(
        `${API_URL}/upload?fileName=${filename}&fileType=${fileType}&userId=${userId}`,
        { method: "POST" }
      );

      if (!res.ok) throw new Error("Failed to get upload URL");
      const { uploadUrl, key, s3_url } = await res.json();

      const upload = await fetch(uploadUrl, {
        method: "PUT",
        headers: { 
          "Content-Type": file.type,
          "x-amz-meta-userid": userId 
        },
        body: file,
      });

      if (!upload.ok) throw new Error("Failed to upload to S3");

      return { success: true, key, s3_url };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : "Upload failed" };
    }
  },

  // 3. Search By Tags
  searchByTags: async (tags: Record<string, number>): Promise<TagSearchResponse> => {
    const res = await fetch(`${API_URL}/search/tags`, { 
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tags }),
    });
    if (!res.ok) throw new Error("Tag search failed");
    return res.json();
  },

  // 4. Update Tags
  updateTags: async (
    urls: string[],
    operation: 0 | 1,
    tags: string[] | Record<string, number>
  ): Promise<TagUpdateResponse> => {
    let formattedTags: string[] = [];
    if (Array.isArray(tags)) {
      formattedTags = tags;
    } else {
      formattedTags = Object.entries(tags).map(([k, v]) => `${k},${v}`);
    }

    const res = await fetch(`${API_URL}/search/tags`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ urls, operation, tags: formattedTags }),
    });
    
    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`Tag update failed: ${errorText}`);
    }
    return res.json();
  },

  // 5. Delete Files
  deleteFiles: async (urls: string[]): Promise<DeleteResponse> => {
    const res = await fetch(`${API_URL}/search/file`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ urls }),
    });
    if (!res.ok) throw new Error("Delete failed");
    return res.json();
  },

  // 6. Get Gallery
  getGallery: async (): Promise<FileMetadata[]> => {
    const userId = await BirdNestAPI.getUserId();
    const res = await fetch(`${API_URL}/gallery?userId=${userId}`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    });
    if (!res.ok) throw new Error("Failed to fetch gallery");
    return res.json();
  },

  // Helpers
  searchByThumbnail: async (thumbnailUrl: string): Promise<ThumbnailSearchResponse> => {
    const res = await fetch(`${API_URL}/search/thumbnail`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ thumbnail_url: thumbnailUrl }),
    });
    if (!res.ok) throw new Error("Thumbnail search failed");
    return res.json();
  },

  searchByFile: async (s3Url: string): Promise<FileMetadata> => {
    const res = await fetch(`${API_URL}/search/file`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ s3_url: s3Url }),
    });
    if (!res.ok) throw new Error("File search failed");
    return res.json();
  },

  // 1. The Core Fetch Function (Single Check)
  checkAnalysisStatus: async (s3Url: string): Promise<FileMetadata | null> => {
    try {
      const res = await fetch(`${API_URL}/search/file`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ s3_url: s3Url }),
      });
      
      if (!res.ok) return null;
      
      const data = await res.json();
      // Only return data if tags are actually present
      if (data && data.tags && Object.keys(data.tags).length > 0) {
        return data;
      }
      return null; // Pending or empty
    } catch (err) {
      return null; // Network glitch, treat as pending
    }
  },

  // 2. The "Await" Wrapper (Replaces Polling in UI)
  // Usage: const result = await BirdNestAPI.waitForAnalysis(url);
  waitForAnalysis: async (s3Url: string, timeoutMs = 30000): Promise<FileMetadata> => {
    const startTime = Date.now();
    let delay = 500; // Start fast (500ms)

    while (Date.now() - startTime < timeoutMs) {
      // Check the DB
      const result = await BirdNestAPI.checkAnalysisStatus(s3Url);
      
      if (result) {
        return result; // ✅ Found it! Return immediately.
      }

      // ⏳ Wait before checking again
      await new Promise((r) => setTimeout(r, delay));
      
      // Backoff strategy: Increase delay slightly (max 2s) to save bandwidth
      delay = Math.min(delay * 1.1, 2000); 
    }

    throw new Error("Analysis timed out. Please check the Gallery later.");
  },
};

export const S3_BUCKET_URL = "https://birdnest-app-storage.s3.amazonaws.com";

// ── Tag Diff Helper ─────────────────────────────────────────────
export function computeTagDiff(
  oldTags: Record<string, number>,
  newTags: Record<string, number>
) {
  const additions: string[] = [];
  const removals: string[] = [];

  for (const [species, count] of Object.entries(newTags)) {
    const oldCount = oldTags[species] || 0;
    if (count > oldCount) {
      additions.push(`${species},${count - oldCount}`);
    } else if (count < oldCount) {
      removals.push(`${species},${oldCount - count}`);
    }
  }

  for (const [species, count] of Object.entries(oldTags)) {
    if (!(species in newTags)) {
      removals.push(`${species},${count}`);
    }
  }

  return { additions, removals };
}