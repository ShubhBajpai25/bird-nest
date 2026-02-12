// services/api.js

const API_URL = process.env.NEXT_PUBLIC_API_URL;

export const BirdNestAPI = {
  
  /**
   * 1. UPLOAD FILES (Two-Step Process)
   * Handles Images and Videos of any size.
   */
  uploadFile: async (file) => {
    try {
      const filename = encodeURIComponent(file.name);
      const fileType = encodeURIComponent(file.type);
      
      const response = await fetch(`${API_URL}/upload?fileName=${filename}&fileType=${fileType}`, {
        method: 'POST',
      });
      
      if (!response.ok) throw new Error('Failed to get upload URL');
      
      // Get the s3_url from the response
      const { uploadUrl, key, s3_url } = await response.json(); 

      await fetch(uploadUrl, {
        method: 'PUT',
        headers: { 'Content-Type': file.type },
        body: file,
      });

      // Return the s3_url so the component uses it for polling
      return { success: true, key, s3_url }; 
    } catch (error) {
      console.error("Upload Error:", error);
      return { success: false, error: error.message };
    }
  },

  /**
   * 2. TAG SEARCH
   * Returns files matching specific tags (e.g., { "crow": 1 })
   */
  searchByTags: async (tags) => {
    // tags example: { "crow": 1, "pigeon": 1 }
    const response = await fetch(`${API_URL}/search/tags`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tags }),
    });
    return response.json();
  },

  /**
   * 3. THUMBNAIL SEARCH (Reverse Lookup)
   * You have a thumbnail URL, you want the original video/image.
   */
  searchByThumbnail: async (thumbnailUrl) => {
    const response = await fetch(`${API_URL}/search/thumbnail`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ thumbnail_url: thumbnailUrl }),
    });
    return response.json();
  },

  /**
   * 4. FILE SEARCH (Metadata Lookup)
   * Get tags and details for a specific file URL.
   */
  searchByFile: async (s3Url) => {
    const response = await fetch(`${API_URL}/search/file`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ s3_url: s3Url }),
    });
    return response.json();
  },

  /**
   * 5. DELETE FILE
   * Removes from S3 and DB.
   */
  deleteFiles: async (urls) => {
    // urls: ["https://.../image.jpg"]
    const response = await fetch(`${API_URL}/file`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ urls }),
    });
    return response.json();
  },

  /**
   * 6. UPDATE TAGS
   * Manually fix tags if the AI got it wrong.
   */
  updateTags: async (urls, operation, tags) => {
    // operation: 1 (add), 0 (remove)
    // tags: ["crow, 1"]
    const response = await fetch(`${API_URL}/tags`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ urls, operation, tags }),
    });
    return response.json();
  },

  pollForResults: async (s3Url, attempts = 10) => {
    for (let i = 0; i < attempts; i++) {
      // Wait 1 second between checks
      await new Promise(r => setTimeout(r, 1000));
      
      const data = await BirdNestAPI.searchByFile(s3Url);
      
      // Check if the Vision Lambda has finished (tags exist)
      if (data && data.tags && Object.keys(data.tags).length > 0) {
        return data; // Success! Return the full item with tags
      }
    }
    throw new Error("Timeout: AI took too long to process.");
  }

};