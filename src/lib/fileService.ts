import { promises as fs } from 'fs';
import path from 'path';

// Storage directory for photos
const STORAGE_DIR = path.join(process.cwd(), 'data', 'photos');

/**
 * FileService - Replaces Supabase Storage with local file system operations
 * Maintains the same interface for easy migration
 */
export const FileService = {

  /**
   * Initialize storage directory
   */
  async init() {
    try {
      await fs.mkdir(STORAGE_DIR, { recursive: true });
    } catch (error) {
      console.error('Failed to create storage directory:', error);
    }
  },

  /**
   * Upload a file to local storage
   */
  async uploadFile(file: File, bucket: string = 'photos') {
    await this.init();

    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}.${fileExt}`;
    const filePath = path.join(STORAGE_DIR, fileName);

    // Convert File to Buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Write file to disk
    await fs.writeFile(filePath, buffer);

    return {
      path: fileName,
      fullPath: filePath
    };
  },

  /**
   * Delete a file from local storage
   */
  async deleteFile(filePath: string, bucket: string = 'photos') {
    const fullPath = path.join(STORAGE_DIR, filePath);

    try {
      await fs.unlink(fullPath);
      return { success: true };
    } catch (error) {
      console.error('Failed to delete file:', error);
      throw error;
    }
  },

  /**
   * Get public URL for a file (local path)
   */
  getPublicUrl(fileId: string) {
    // Return a path that can be served by the app
    return `/data/photos/${fileId}`;
  },

  /**
   * Create signed URL (for compatibility - same as public URL in local mode)
   */
  async createSignedUrl(fileId: string, expirySeconds: number = 3600) {
    return {
      signedUrl: this.getPublicUrl(fileId),
      path: fileId
    };
  },

  /**
   * Check if file exists
   */
  async fileExists(fileId: string): Promise<boolean> {
    const fullPath = path.join(STORAGE_DIR, fileId);
    try {
      await fs.access(fullPath);
      return true;
    } catch {
      return false;
    }
  },

  /**
   * Get file buffer (useful for processing)
   */
  async getFileBuffer(fileId: string): Promise<Buffer> {
    const fullPath = path.join(STORAGE_DIR, fileId);
    return await fs.readFile(fullPath);
  },

  /**
   * List all files in storage
   */
  async listFiles(bucket: string = 'photos'): Promise<string[]> {
    await this.init();

    try {
      const files = await fs.readdir(STORAGE_DIR);
      return files;
    } catch (error) {
      console.error('Failed to list files:', error);
      return [];
    }
  }
};
