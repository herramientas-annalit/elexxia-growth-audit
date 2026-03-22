/**
 * Storage stub — no se usa S3 en esta versión standalone.
 * El audio se transcribe directamente en el endpoint /api/transcribe-audio.
 */
export async function storagePut(
  _key: string,
  _buffer: Buffer,
  _mimeType: string
): Promise<{ url: string; key: string }> {
  throw new Error(
    "Storage S3 no configurado. Usa el endpoint /api/transcribe-audio para audio directo."
  );
}
