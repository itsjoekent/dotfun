import { isCompactReplayLayoutValid, type CompactReplayLayout } from './game';

export const PLAY_PAYLOAD_VERSION = 3 as const;

export type PlayPayloadDifficulty = 'easy' | 'normal' | 'hard';

/**
 * Short keys: m/o my/opp (f=four-letter, v=five-letter), a/t/d ai/timer,
 * g = compact layout { b, p, c, l }.
 */
export interface PlayPayload {
  v: typeof PLAY_PAYLOAD_VERSION;
  m: { f: string; v: string };
  o: { f: string; v: string };
  a: PlayPayloadDifficulty;
  t: boolean;
  d: number;
  g: CompactReplayLayout;
}

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]!);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64UrlToBytes(s: string): Uint8Array | null {
  try {
    const pad = s.length % 4 === 0 ? '' : '='.repeat(4 - (s.length % 4));
    const base64 = s.replace(/-/g, '+').replace(/_/g, '/') + pad;
    const bin = atob(base64);
    const out = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  } catch {
    return null;
  }
}

function validateDifficulty(x: unknown): x is PlayPayloadDifficulty {
  return x === 'easy' || x === 'normal' || x === 'hard';
}

function validatePayload(data: unknown): data is PlayPayload {
  if (!data || typeof data !== 'object') return false;
  const d = data as Record<string, unknown>;
  if (d.v !== PLAY_PAYLOAD_VERSION) return false;
  if (!d.m || typeof d.m !== 'object') return false;
  const m = d.m as Record<string, unknown>;
  if (typeof m.f !== 'string' || typeof m.v !== 'string') return false;
  if (!d.o || typeof d.o !== 'object') return false;
  const o = d.o as Record<string, unknown>;
  if (typeof o.f !== 'string' || typeof o.v !== 'string') return false;
  if (!validateDifficulty(d.a) || typeof d.t !== 'boolean' || typeof d.d !== 'number') {
    return false;
  }
  if (!d.g || !isCompactReplayLayoutValid(d.g)) return false;
  return true;
}

export function encodePlayPayload(payload: PlayPayload): string {
  const json = JSON.stringify(payload);
  return bytesToBase64Url(new TextEncoder().encode(json));
}

export function buildLetterStrikePlayUrl(encoded: string): string {
  if (typeof window === 'undefined') return '';
  const url = new URL(window.location.href);
  url.search = '';
  url.hash = '';
  url.searchParams.set('play', encoded);
  return url.toString();
}

export function decodePlayPayload(raw: string): PlayPayload | null {
  const bytes = base64UrlToBytes(raw.trim());
  if (!bytes) return null;
  try {
    const json = new TextDecoder().decode(bytes);
    const data: unknown = JSON.parse(json);
    if (!validatePayload(data)) return null;
    return data;
  } catch {
    return null;
  }
}
