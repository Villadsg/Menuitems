import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { FileService } from '$lib/fileService';

/**
 * File upload endpoint
 */
export const POST: RequestHandler = async ({ request }) => {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const bucket = (formData.get('bucket') as string) || 'photos';

    if (!file) {
      return json({ success: false, error: 'No file provided' }, { status: 400 });
    }

    const result = await FileService.uploadFile(file, bucket);
    return json({ success: true, data: result });
  } catch (error: any) {
    console.error('File upload error:', error);
    return json({ success: false, error: error.message }, { status: 500 });
  }
};

/**
 * File deletion endpoint
 */
export const DELETE: RequestHandler = async ({ request }) => {
  try {
    const { filePath, bucket } = await request.json();

    if (!filePath) {
      return json({ success: false, error: 'No file path provided' }, { status: 400 });
    }

    const result = await FileService.deleteFile(filePath, bucket || 'photos');
    return json({ success: true, data: result });
  } catch (error: any) {
    console.error('File deletion error:', error);
    return json({ success: false, error: error.message }, { status: 500 });
  }
};
