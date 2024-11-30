// src/lib/compress.ts

import imageCompression from 'browser-image-compression';

/**
 * Compresses an image file to reduce its size.
 * @param file - The image file to compress.
 * @returns A Promise that resolves with the compressed image file.
 */
export async function compressImage(file: File): Promise<File> {
  const options = {
    maxSizeMB: 1, // Max size in MB
    maxWidthOrHeight: 600, // Resize the image to this width/height
    useWebWorker: true, // Use web worker for faster processing
  };

  try {
    const compressedBlob = await imageCompression(file, options);

    // Convert the Blob to a File
    const compressedFile = new File([compressedBlob], file.name, {
      type: file.type,
      lastModified: Date.now(),
    });

    return compressedFile;
  } catch (error) {
    console.error('Image compression failed:', error);
    throw error;
  }
}
