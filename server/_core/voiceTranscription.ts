import { ENV } from "./env";

export type TranscribeOptions = {
  audioUrl: string;
  language?: string;
  prompt?: string;
};

export type WhisperSegment = {
  id: number;
  seek: number;
  start: number;
  end: number;
  text: string;
  tokens: number[];
  temperature: number;
  avg_logprob: number;
  compression_ratio: number;
  no_speech_prob: number;
};

export type WhisperResponse = {
  task: "transcribe";
  language: string;
  duration: number;
  text: string;
  segments: WhisperSegment[];
};

export type TranscriptionResponse = WhisperResponse;

export type TranscriptionError = {
  error: string;
  code: "FILE_TOO_LARGE" | "INVALID_FORMAT" | "TRANSCRIPTION_FAILED" | "UPLOAD_FAILED" | "SERVICE_ERROR";
  details?: string;
};

function getFileExtension(mimeType: string): string {
  const mimeToExt: Record<string, string> = {
    'audio/webm': 'webm',
    'audio/mp3': 'mp3',
    'audio/mpeg': 'mp3',
    'audio/wav': 'wav',
    'audio/wave': 'wav',
    'audio/ogg': 'ogg',
    'audio/m4a': 'm4a',
    'audio/mp4': 'm4a',
  };
  return mimeToExt[mimeType] || 'webm';
}

export async function transcribeAudio(
  options: TranscribeOptions
): Promise<TranscriptionResponse | TranscriptionError> {
  try {
    if (!ENV.openaiApiKey) {
      return { error: "OpenAI API key not configured", code: "SERVICE_ERROR" };
    }

    // Download audio from URL
    const dlRes = await fetch(options.audioUrl);
    if (!dlRes.ok) {
      return { error: "Failed to download audio file", code: "INVALID_FORMAT", details: `HTTP ${dlRes.status}` };
    }
    const audioBuffer = Buffer.from(await dlRes.arrayBuffer());
    const mimeType = dlRes.headers.get('content-type') || 'audio/webm';

    if (audioBuffer.length > 16 * 1024 * 1024) {
      return { error: "Audio file exceeds 16MB limit", code: "FILE_TOO_LARGE" };
    }

    const formData = new FormData();
    const filename = `audio.${getFileExtension(mimeType)}`;
    const audioBlob = new Blob([new Uint8Array(audioBuffer)], { type: mimeType });
    formData.append('file', audioBlob, filename);
    formData.append('model', 'whisper-1');
    formData.append('response_format', 'verbose_json');
    if (options.language) formData.append('language', options.language);
    if (options.prompt) formData.append('prompt', options.prompt);

    const whisperRes = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${ENV.openaiApiKey}` },
      body: formData,
    });

    if (!whisperRes.ok) {
      const err = await whisperRes.text().catch(() => "");
      return { error: "Transcription failed", code: "TRANSCRIPTION_FAILED", details: err };
    }

    return (await whisperRes.json()) as WhisperResponse;
  } catch (error) {
    return {
      error: "Voice transcription failed",
      code: "SERVICE_ERROR",
      details: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
