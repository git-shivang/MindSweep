import { TASK_EXTRACTION_PROMPT } from '@/constants/prompts';

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_WHISPER_URL = 'https://api.groq.com/openai/v1/audio/transcriptions';
const GROQ_MODEL = 'llama-3.3-70b-versatile';
const GROQ_WHISPER_MODEL = 'whisper-large-v3-turbo';

export type ExtractedTask = {
  title: string;
  dueDate: string | null;
  priority: 'High' | 'Medium' | 'Low';
};

export type GroqServiceErrorCode =
  | 'MISSING_API_KEY'
  | 'NETWORK'
  | 'API'
  | 'PARSE'
  | 'VALIDATION';

export class GroqServiceError extends Error {
  code: GroqServiceErrorCode;
  cause?: unknown;

  constructor(message: string, code: GroqServiceErrorCode, cause?: unknown) {
    super(message);
    this.name = 'GroqServiceError';
    this.code = code;
    this.cause = cause;
  }
}

type GroqChatCompletionResponse = {
  choices?: Array<{
    message?: {
      content?: string | null;
    };
  }>;
  error?: {
    message?: string;
    type?: string;
  };
};

const PRIORITIES = new Set(['High', 'Medium', 'Low']);

function normalizeDueDate(value: unknown): string | null {
  if (value === null || value === undefined || value === '') {
    return null;
  }
  if (typeof value === 'string') {
    return value.trim() || null;
  }
  return String(value);
}

function validateExtractedTask(value: unknown, index: number): ExtractedTask {
  if (!value || typeof value !== 'object') {
    throw new GroqServiceError(
      `Task at index ${index} is not a valid object.`,
      'VALIDATION',
    );
  }

  const task = value as Record<string, unknown>;
  const title = typeof task.title === 'string' ? task.title.trim() : '';
  const priority = task.priority;

  if (!title) {
    throw new GroqServiceError(
      `Task at index ${index} is missing a valid title.`,
      'VALIDATION',
    );
  }

  if (typeof priority !== 'string' || !PRIORITIES.has(priority)) {
    throw new GroqServiceError(
      `Task at index ${index} has an invalid priority. Expected High, Medium, or Low.`,
      'VALIDATION',
    );
  }

  return {
    title,
    dueDate: normalizeDueDate(task.dueDate),
    priority: priority as ExtractedTask['priority'],
  };
}

function extractJsonArray(content: string): string {
  const trimmed = content.trim();

  const fencedMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fencedMatch?.[1]) {
    return fencedMatch[1].trim();
  }

  const arrayMatch = trimmed.match(/\[[\s\S]*\]/);
  if (arrayMatch?.[0]) {
    return arrayMatch[0];
  }

  return trimmed;
}

function parseTasksFromContent(content: string): ExtractedTask[] {
  try {
    const jsonText = extractJsonArray(content);
    const parsed: unknown = JSON.parse(jsonText);

    if (!Array.isArray(parsed)) {
      throw new GroqServiceError(
        'Groq response was valid JSON but not an array of tasks.',
        'PARSE',
      );
    }

    return parsed.map((task, index) => validateExtractedTask(task, index));
  } catch (error) {
    if (error instanceof GroqServiceError) {
      throw error;
    }

    throw new GroqServiceError(
      'Failed to parse Groq response as task JSON.',
      'PARSE',
      error,
    );
  }
}

export async function extractTasksFromGroq(brainDump: string): Promise<ExtractedTask[]> {
  const trimmedInput = brainDump.trim();
  if (!trimmedInput) {
    return [];
  }

  const apiKey = process.env.EXPO_PUBLIC_GROQ_API_KEY;
  if (!apiKey?.trim()) {
    throw new GroqServiceError(
      'Groq API key is missing. Set EXPO_PUBLIC_GROQ_API_KEY in your .env file.',
      'MISSING_API_KEY',
    );
  }

  let response: Response;

  try {
    response = await fetch(GROQ_API_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey.trim()}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: GROQ_MODEL,
        messages: [
          { role: 'system', content: TASK_EXTRACTION_PROMPT },
          { role: 'user', content: trimmedInput },
        ],
        temperature: 0.2,
      }),
    });
  } catch (error) {
    throw new GroqServiceError(
      'Network error while calling Groq API.',
      'NETWORK',
      error,
    );
  }

  let data: GroqChatCompletionResponse;

  try {
    data = (await response.json()) as GroqChatCompletionResponse;
  } catch (error) {
    throw new GroqServiceError(
      'Failed to read Groq API response.',
      'API',
      error,
    );
  }

  if (!response.ok) {
    const message =
      data.error?.message ??
      `Groq API request failed with status ${response.status}.`;
    throw new GroqServiceError(message, 'API', data);
  }

  const content = data.choices?.[0]?.message?.content;

  if (!content?.trim()) {
    throw new GroqServiceError(
      'Groq API returned an empty response.',
      'API',
      data,
    );
  }

  return parseTasksFromContent(content);
}

export async function transcribeAudio(uri: string): Promise<string> {
  const apiKey = process.env.EXPO_PUBLIC_GROQ_API_KEY;
  if (!apiKey?.trim()) {
    throw new GroqServiceError(
      'Groq API key is missing. Set EXPO_PUBLIC_GROQ_API_KEY in your .env file.',
      'MISSING_API_KEY',
    );
  }

  const formData = new FormData();
  // M4A is an MPEG-4 audio container — Groq requires the audio/mp4 MIME type
  formData.append('file', { uri, type: 'audio/mp4', name: 'recording.m4a' } as any);
  formData.append('model', GROQ_WHISPER_MODEL);
  formData.append('response_format', 'json');

  let response: Response;
  try {
    response = await fetch(GROQ_WHISPER_URL, {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey.trim()}` },
      body: formData,
    });
  } catch (error) {
    throw new GroqServiceError('Network error during transcription.', 'NETWORK', error);
  }

  let data: { text?: string; error?: { message?: string } };
  try {
    data = await response.json();
  } catch (error) {
    throw new GroqServiceError('Failed to read transcription response.', 'API', error);
  }

  if (!response.ok) {
    const message = data.error?.message ?? `Transcription failed with status ${response.status}.`;
    console.error('[Groq Whisper] error', response.status, JSON.stringify(data));
    throw new GroqServiceError(message, 'API', data);
  }

  const text = data.text?.trim();
  if (!text) {
    throw new GroqServiceError('Transcription returned empty text.', 'PARSE', data);
  }

  return text;
}
