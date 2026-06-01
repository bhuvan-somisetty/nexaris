import { api } from './api';
import axios from 'axios';

export async function uploadImageToCloudinary(file: File, folder = 'nexaris/products'): Promise<string> {
  // 1. Get signature, timestamp, API Key, and Cloud Name from NestJS backend
  const signResponse = await api.get(`/upload/sign?folder=${folder}`);
  const { signature, timestamp, apiKey, cloudName } = signResponse.data;

  // 2. Build multi-part form payload for Cloudinary API
  const formData = new FormData();
  formData.append('file', file);
  formData.append('api_key', apiKey);
  formData.append('timestamp', timestamp.toString());
  formData.append('signature', signature);
  formData.append('folder', folder);

  // 3. Post directly to Cloudinary's secure upload URL
  const cloudinaryUrl = `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`;
  const uploadResponse = await axios.post(cloudinaryUrl, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });

  // Return the secure URL pointing to Cloudinary's global CDN
  return uploadResponse.data.secure_url;
}
