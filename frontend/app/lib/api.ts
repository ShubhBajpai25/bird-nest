import { getCurrentUser } from 'aws-amplify/auth';

const API_URL = process.env.NEXT_PUBLIC_API_URL || "";

// ── Response types ──────────────────────────────────────────────

export interface UploadResult {
  success: boolean;
  key?: string;
  s3_url?: string;
  error?: string;
}

export interface FileMetadata {
  s3_url: string;
  file_type?: string;
  tags?: Record<string, number>;
  detected_species_list?: string[];
  processed_at?: string;
  user_id?: string;
}

export interface GalleryItem {
  url: string;
  s3_url?: string;
  file_type?: string;
  tags: Record<string, number>;
  metadataLoaded: boolean;
}

// ── API client ──────────────────────────────────────────────────

export const BirdNestAPI = {
  /**
   * Helper: Retrieve the unique Cognito sub (User ID)
   */
  async getUserId(): Promise<string> {
    try {
      const user = await getCurrentUser();
      return user.userId; 
    } catch (error) {
      console.warn("User not logged in:", error);
      return "anonymous-user";
    }
  },

  /**
   * Upload a file with userId tracking.
   */
  uploadFile: async (file: File): Promise<UploadResult> => {
    try {
      const userId = await BirdNestAPI.getUserId();
      const filename = encodeURIComponent(file.name);
      const fileType = encodeURIComponent(file.type);

      // Pass userId as a query parameter so the Lambda knows who owns the file
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
          "x-amz-meta-userid": userId // Also store in S3 metadata for the Detection Lambda
        },
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
   * Get full metadata for a given s3_url.
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
   * Fetch user-specific gallery items.
   */
  getGallery: async (): Promise<FileMetadata[]> => {
    const userId = await BirdNestAPI.getUserId();
    const res = await fetch(`${API_URL}/gallery?userId=${userId}`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    });
    if (!res.ok) throw new Error("Failed to fetch gallery");
    return res.json();
  },

  /**
   * Poll DynamoDB until detection tags appear.
   */
  pollForResults: async (
    s3Url: string,
    attempts = 30
  ): Promise<FileMetadata> => {
    for (let i = 0; i < attempts; i++) {
      await new Promise((r) => setTimeout(r, 1000));
      try {
        const data = await BirdNestAPI.searchByFile(s3Url);
        // If status is 'pending', the hybrid Lambda is working but AI isn't done
        if (data && data.tags && Object.keys(data.tags).length > 0) {
          return data;
        }
      } catch (err) {
        console.log("Polling...", err);
      }
    }
    throw new Error("Timeout: AI took too long to process.");
  },
};

export const S3_BUCKET_URL = "https://birdnest-app-storage.s3.amazonaws.com";