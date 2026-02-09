/**
 * Web-compatible File Upload Utilities
 * 
 * Handles file uploads with proper FormData construction for both web and mobile
 */

import { Platform } from 'react-native';
import { supabase } from './supabase';
import Constants from 'expo-constants';

const supabaseUrl = Constants.expoConfig?.extra?.supabaseUrl || 'https://brjmujpjbmzhjepxamek.supabase.co';

export interface UploadResult {
  success: boolean;
  filePath?: string;
  error?: string;
}

/**
 * Upload a file to Supabase Storage (web and mobile compatible)
 */
export async function uploadFileToStorage(
  uri: string,
  bucket: string,
  folder: string,
  fileName: string,
  mimeType?: string
): Promise<UploadResult> {
  try {
    const filePath = folder ? `${folder}/${fileName}` : fileName;

    // Get auth token
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return { success: false, error: 'Not authenticated' };
    }

    const storageUrl = `${supabaseUrl}/storage/v1/object/${bucket}/${filePath}`;

    if (Platform.OS === 'web') {
      // Web: use File API
      const response = await fetch(uri);
      const blob = await response.blob();
      const file = new File([blob], fileName, { type: mimeType || 'application/octet-stream' });

      const formData = new FormData();
      formData.append('file', file);

      const uploadResponse = await fetch(storageUrl, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
        body: formData,
      });

      if (!uploadResponse.ok) {
        const errorData = await uploadResponse.json();
        return { success: false, error: errorData.message || 'Upload failed' };
      }
    } else {
      // Mobile: use React Native FormData with uri object
      const formData = new FormData();
      // @ts-ignore - React Native's FormData accepts objects with uri
      formData.append('file', {
        uri: uri,
        name: fileName,
        type: mimeType || 'application/octet-stream',
      });

      const uploadResponse = await fetch(storageUrl, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
        body: formData,
      });

      if (!uploadResponse.ok) {
        const errorData = await uploadResponse.json();
        return { success: false, error: errorData.message || 'Upload failed' };
      }
    }

    return { success: true, filePath: filePath };
  } catch (error: any) {
    console.error('File upload error:', error);
    return { success: false, error: error.message || 'Failed to upload file' };
  }
}

/**
 * Get public URL for a file in Supabase Storage
 */
export function getPublicUrl(bucket: string, filePath: string): string | null {
  try {
    const { data } = supabase.storage.from(bucket).getPublicUrl(filePath);
    return data.publicUrl;
  } catch (error) {
    console.error('Error getting public URL:', error);
    return null;
  }
}

/**
 * Delete a file from Supabase Storage
 */
export async function deleteFile(bucket: string, filePath: string): Promise<boolean> {
  try {
    const { error } = await supabase.storage.from(bucket).remove([filePath]);
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
