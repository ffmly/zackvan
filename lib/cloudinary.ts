import type { CloudinaryImage } from '@/lib/types';

export interface UploadSignature {
  signature: string;
  timestamp: number;
  folder: string;
  apiKey: string;
  cloudName: string;
}

export async function fetchUploadSignature(folder?: string): Promise<UploadSignature> {
  const res = await fetch('/api/cloudinary/sign', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(folder ? { folder } : {}),
  });
  if (!res.ok) {
    throw new Error('Could not start the image upload. Try again.');
  }
  return (await res.json()) as UploadSignature;
}

export function uploadToCloudinary(
  file: File,
  signature: UploadSignature,
  onProgress?: (percent: number) => void,
): Promise<CloudinaryImage> {
  return new Promise((resolve, reject) => {
    const endpoint = `https://api.cloudinary.com/v1_1/${signature.cloudName}/image/upload`;
    const form = new FormData();
    form.append('file', file);
    form.append('api_key', signature.apiKey);
    form.append('timestamp', String(signature.timestamp));
    form.append('signature', signature.signature);
    form.append('folder', signature.folder);

    const xhr = new XMLHttpRequest();
    xhr.open('POST', endpoint);
    xhr.upload.addEventListener('progress', (e) => {
      if (e.lengthComputable && onProgress) {
        onProgress(Math.round((e.loaded / e.total) * 100));
      }
    });
    xhr.addEventListener('load', () => {
      try {
        const data = JSON.parse(xhr.responseText);
        if (xhr.status >= 200 && xhr.status < 300 && data.secure_url) {
          resolve({
            url: data.secure_url as string,
            publicId: data.public_id as string,
          });
        } else {
          reject(new Error(data?.error?.message ?? 'Upload failed.'));
        }
      } catch {
        reject(new Error('Unexpected response from Cloudinary.'));
      }
    });
    xhr.addEventListener('error', () => reject(new Error('Network error during upload.')));
    xhr.addEventListener('abort', () => reject(new Error('Upload cancelled.')));
    xhr.send(form);
  });
}

export function cloudinaryThumb(url: string, width = 800): string {
  return url.replace('/upload/', `/upload/w_${width},q_auto,f_auto/`);
}
