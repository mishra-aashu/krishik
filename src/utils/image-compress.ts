import * as ImageManipulator from 'expo-image-manipulator';
import * as FileSystem from 'expo-file-system/legacy';
import { Platform } from 'react-native';

/**
 * Resizes the image to a maximum width of 600px and compresses it to 50% quality.
 * Returns a base64 data URI if possible, or the local file URI if base64 is not generated.
 */
export async function compressAndResizeImage(uri: string): Promise<string> {
  try {
    if (!uri) return '';
    
    // Perform manipulation: resize to width 600 (height adjusts automatically), compress to 50% quality
    const result = await ImageManipulator.manipulateAsync(
      uri,
      [{ resize: { width: 600 } }],
      { compress: 0.5, format: ImageManipulator.SaveFormat.JPEG, base64: true }
    );
    
    // Return base64 on web, but on native we return the file URI to save to disk
    if (Platform.OS === 'web' && result.base64) {
      return `data:image/jpeg;base64,${result.base64}`;
    }
    return result.uri;
  } catch (err) {
    console.warn('[Image Compress] Error manipulating image:', err);
    return uri; // Fallback to original URI if something goes wrong
  }
}

/**
 * Saves a temporary image file to the permanent local file system on native platforms.
 * Returns a virtualized URI starting with 'local://' for easy storage.
 * On Web, it returns the base64 or temporary URI directly.
 */
export async function saveImageToLocalFileSystem(tempUri: string): Promise<string> {
  if (Platform.OS === 'web' || tempUri.startsWith('data:image')) {
    return tempUri; // On Web or base64, just return as-is
  }

  try {
    // Ensure the folder exists
    const folderUri = `${FileSystem.documentDirectory}krishik_images/`;
    const folderInfo = await FileSystem.getInfoAsync(folderUri);
    if (!folderInfo.exists) {
      await FileSystem.makeDirectoryAsync(folderUri, { intermediates: true });
    }

    // Generate unique file name
    const fileName = `${Date.now()}_${Math.round(Math.random() * 10000)}.jpg`;
    const destinationUri = `${folderUri}${fileName}`;

    await FileSystem.copyAsync({
      from: tempUri,
      to: destinationUri,
    });

    // Return virtual URI
    return `local://${fileName}`;
  } catch (err) {
    console.warn('[Storage] Failed to save image to local file system:', err);
    return tempUri; // Fallback to original URI if copy fails
  }
}

/**
 * Resolves a virtual URI (like local://filename.jpg) into an absolute path on Native,
 * or returns it directly on Web.
 */
export function resolveLocalImageUri(virtualUri: string | null | undefined): string | null {
  if (!virtualUri) return null;
  if (Platform.OS === 'web' || virtualUri.startsWith('data:image') || !virtualUri.startsWith('local://')) {
    return virtualUri;
  }
  const fileName = virtualUri.substring(8); // Strip 'local://'
  return `${FileSystem.documentDirectory}krishik_images/${fileName}`;
}
