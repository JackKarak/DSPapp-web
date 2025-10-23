/**
 * File Upload Utilities for React Native + Supabase
 * 
 * Handles file uploads from React Native to Supabase Storage
 * with proper binary handling for mobile platforms
 */

import { supabase } from './supabase';
import Constants from 'expo-constants';

// Get Supabase URL from config
const supabaseUrl = Constants.expoConfig?.extra?.supabaseUrl || 'https://brjmujpjbmzhjepxamek.supabase.co';

export interface UploadResult {
  success: boolean;
  filePath?: string;
  error?: string;
}

/**
 * Upload a file to Supabase Storage from React Native
 * Uses FormData approach which is compatible with React Native
 * 
 * @param uri - File URI from DocumentPicker or ImagePicker
 * @param bucket - Supabase storage bucket name
 * @param folder - Folder path within the bucket
 * @param fileName - Desired file name
 * @param mimeType - File MIME type
 * @returns Upload result with file path or error
 */
export async function uploadFileToStorage(
  uri: string,
  bucket: string,
  folder: string,
  fileName: string,
  mimeType?: string
): Promise<UploadResult> {
  try {
    // Construct full path
    const filePath = folder ? `${folder}/${fileName}` : fileName;

    // Create FormData
    const formData = new FormData();
    
    // Add file to FormData
    // @ts-ignore - React Native's FormData accepts objects with uri
    formData.append('file', {
      uri: uri,
      name: fileName,
      type: mimeType || 'application/octet-stream',
    });

    // Get auth token for upload
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return {
        success: false,
        error: 'Not authenticated',
      };
    }

    // Upload using fetch with proper headers
    const storageUrl = `${supabaseUrl}/storage/v1/object/${bucket}/${filePath}`;
    const response = await fetch(storageUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${session.access_token}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json();
      return {
        success: false,
        error: errorData.message || 'Upload failed',
      };
    }

    return {
      success: true,
      filePath: filePath,
    };
  } catch (error: any) {
    console.error('File upload error:', error);
    return {
      success: false,
      error: error.message || 'Failed to upload file',
    };
  }
}

/**
 * Get public URL for a file in Supabase Storage
 * 
 * @param bucket - Supabase storage bucket name
 * @param filePath - Path to file in bucket
 * @returns Public URL or null if error
 */
export function getPublicUrl(bucket: string, filePath: string): string | null {
  try {
    const { data } = supabase.storage
      .from(bucket)
      .getPublicUrl(filePath);

    return data.publicUrl;
  } catch (error) {
    console.error('Error getting public URL:', error);
    return null;
  }
}

/**
 * Delete a file from Supabase Storage
 * 
 * @param bucket - Supabase storage bucket name
 * @param filePath - Path to file in bucket
 * @returns Success status
 */
export async function deleteFile(bucket: string, filePath: string): Promise<boolean> {
  try {
    const { error } = await supabase.storage
      .from(bucket)
      .remove([filePath]);

    if (error) {
      console.error('Error deleting file:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('File deletion error:', error);
    return false;
  }
}
