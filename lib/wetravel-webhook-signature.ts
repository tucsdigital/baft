import { Webhook } from 'svix';

/** Verify the original body and Svix timestamp; never accept unsigned events. */
export function verifyWeTravelSignature(raw: string, headers: Headers, secret: string): boolean {
  if (!secret.trim()) return false;
  try {
    new Webhook(secret.trim()).verify(raw, {
      'svix-id': headers.get('svix-id') || '',
      'svix-timestamp': headers.get('svix-timestamp') || '',
      'svix-signature': headers.get('svix-signature') || '',
    });
    return true;
  } catch { return false; }
}
