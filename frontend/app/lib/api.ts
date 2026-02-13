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
  
  // 1. Get User ID (Safe Wrapper)
  async getUserId(): Promise<string> {
    try {
      const user = await getCurrentUser();
      return user.userId;
    } catch (error) {
      console.warn("User not logged in, defaulting to anonymous");
      return "anonymous-user";
    }
  },

  // 2. Upload File (With Metadata Linking)
  uploadFile: async (file: File): Promise<UploadResult> => {
    try {
      const userId = await BirdNestAPI.getUserId();
      const filename = encodeURIComponent(file.name);
      const fileType = encodeURIComponent(file.type);

      // Step A: Get Presigned URL
      // We pass userId so the backend can SIGN it into the URL
      const res = await fetch(
        `${API_URL}/upload?fileName=${filename}&fileType=${fileType}&userId=${userId}`,
        { method: "POST" }
      );

      if (!res.ok) throw new Error("Failed to get upload URL");
      const { uploadUrl, key, s3_url } = await res.json();

      // Step B: Upload to S3
      // CRITICAL: This header must match what the backend signed!
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
      console.error("Upload error:", err);
      return { success: false, error: err instanceof Error ? err.message : "Upload failed" };
    }
  },

  // 3. Search By Tags
  // Updated Path: Assuming your Search Lambda is on POST /tags
  searchByTags: async (tags: Record<string, number>): Promise<TagSearchResponse> => {
    // If your API Gateway path is just /tags for both PUT and POST:
    const res = await fetch(`${API_URL}/tags`, { 
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tags }),
    });
    if (!res.ok) throw new Error("Tag search failed");
    return res.json();
  },

  // src/app/lib/api.ts (Snippet for updateTags)

  updateTags: async (
    urls: string[],
    operation: 0 | 1,
    tags: string[] | Record<string, number> // <--- Accepts BOTH formats
  ): Promise<TagUpdateResponse> => {
    
    let formattedTags: string[] = [];

    // Scenario A: UI sent ["crow,1", "magpie,2"] -> Pass it through
    if (Array.isArray(tags)) {
      formattedTags = tags;
    } 
    // Scenario B: UI sent {"crow": 1, "magpie": 2} -> Convert it
    else {
      formattedTags = Object.entries(tags).map(([species, count]) => {
        return `${species},${count}`;
      });
    }

    // Debug: Log what we are actually sending to AWS
    console.log("Sending to Lambda:", { urls, operation, tags: formattedTags });

    const res = await fetch(`${API_URL}/tags`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ 
        urls, 
        operation, 
        tags: formattedTags // <--- Guaranteed to be ["string,1"]
      }),
    });

    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`Tag update failed: ${errorText}`);
    }
    
    return res.json();
  },

  // 5. Delete Files
  deleteFiles: async (urls: string[]): Promise<DeleteResponse> => {
    const res = await fetch(`${API_URL}/file`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ urls }),
    });
    if (!res.ok) throw new Error("Delete failed");
    return res.json();
  },

  // 6. Get Gallery (User Specific)
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

  pollForResults: async (s3Url: string, attempts = 30): Promise<FileMetadata> => {
    for (let i = 0; i < attempts; i++) {
      await new Promise((r) => setTimeout(r, 1000));
      try {
        const data = await BirdNestAPI.searchByFile(s3Url);
        if (data && data.tags && Object.keys(data.tags).length > 0) {
          return data;
        }
      } catch { /* ignore */ }
    }
    throw new Error("Timeout: AI took too long to process.");
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
      additions.push(`${species},${count - oldCount}`); // Fixed space after comma
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