import { getSupabaseClient, isSupabaseConfigured } from './client';

const BUCKET_NAME = 'member-avatars';

export async function uploadMemberAvatar(
  memberCode: string,
  file: File
): Promise<{ success: boolean; url?: string; error?: string }> {
  // 1. Validate file type
  const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
  if (!validTypes.includes(file.type)) {
    return { success: false, error: 'Invalid file format. Please upload a JPG, PNG, or WebP image.' };
  }

  // 2. Validate file size (max 3MB)
  if (file.size > 3 * 1024 * 1024) {
    return { success: false, error: 'File size exceeds 3MB limit. Please upload a smaller image.' };
  }

  const client = getSupabaseClient();
  if (!isSupabaseConfigured() || !client) {
    // In local demo mode, create local object URL
    const localUrl = URL.createObjectURL(file);
    return { success: true, url: localUrl };
  }

  try {
    const fileExt = file.name.split('.').pop() || 'jpg';
    const filePath = `avatars/${memberCode.toLowerCase()}_${Date.now()}.${fileExt}`;

    const { error: uploadError } = await client.storage
      .from(BUCKET_NAME)
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: true,
      });

    if (uploadError) {
      // If bucket does not exist yet or storage policy blocked, return descriptive error
      return { success: false, error: `Storage upload error: ${uploadError.message}` };
    }

    const { data } = client.storage.from(BUCKET_NAME).getPublicUrl(filePath);
    return { success: true, url: data.publicUrl };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false, error: msg };
  }
}

export async function deleteMemberAvatar(fileUrl: string): Promise<boolean> {
  const client = getSupabaseClient();
  if (!isSupabaseConfigured() || !client || !fileUrl) return true;

  try {
    const urlObj = new URL(fileUrl);
    const pathParts = urlObj.pathname.split(`${BUCKET_NAME}/`);
    if (pathParts.length > 1) {
      const filePath = pathParts[1];
      await client.storage.from(BUCKET_NAME).remove([filePath]);
    }
    return true;
  } catch {
    return false;
  }
}
