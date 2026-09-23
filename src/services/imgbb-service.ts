import { Platform } from 'react-native';

const IMGBB_API_KEY = process.env.EXPO_PUBLIC_IMGBB_API_KEY || 'b05bea423d1022e784db4df1df5e211d';

/**
 * Uploads a local image (file URI, blob, or base64) to ImgBB CDN hosting.
 * Returns the permanent public HTTP/HTTPS URL from ImgBB (e.g. https://i.ibb.co/...).
 * If offline or upload fails, falls back gracefully to the input URI.
 */
export async function uploadImageToImgBB(uri: string | null | undefined): Promise<string | null> {
  if (!uri) return null;

  // If it's already a hosted public URL, return it directly
  if (uri.startsWith('http://') || uri.startsWith('https://')) {
    return uri;
  }

  try {
    const formData = new FormData();

    if (Platform.OS === 'web') {
      const response = await fetch(uri);
      const blob = await response.blob();
      formData.append('image', blob, `photo_${Date.now()}.jpg`);
    } else {
      // React Native Native (iOS / Android)
      const cleanUri = uri.startsWith('file://') || uri.startsWith('content://') ? uri : `file://${uri}`;
      formData.append('image', {
        uri: cleanUri,
        name: `photo_${Date.now()}.jpg`,
        type: 'image/jpeg',
      } as any);
    }

    const uploadUrl = `https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`;
    console.log('[ImgBB] Uploading image to ImgBB...');

    const res = await fetch(uploadUrl, {
      method: 'POST',
      body: formData,
    });

    const json = await res.json();

    if (json && json.success && json.data && (json.data.url || json.data.display_url)) {
      const hostedUrl = json.data.url || json.data.display_url;
      console.log('[ImgBB] Upload successful:', hostedUrl);
      return hostedUrl;
    } else {
      console.warn('[ImgBB] API upload returned non-success:', json);
      return uri;
    }
  } catch (err) {
    console.error('[ImgBB] Upload exception:', err);
    return uri;
  }
}
