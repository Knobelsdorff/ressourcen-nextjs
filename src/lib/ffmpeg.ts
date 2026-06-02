import { execFile } from 'child_process';
import { constants } from 'fs';
import { access } from 'fs/promises';
import { promisify } from 'util';
import ffmpegStatic from 'ffmpeg-static';

const execFileAsync = promisify(execFile);

let cachedFfmpegPath: string | undefined;

/**
 * Resolves ffmpeg: bundled binary (Vercel/Linux) or system PATH (local dev fallback).
 */
export async function getFfmpegPath(): Promise<string> {
  if (cachedFfmpegPath) return cachedFfmpegPath;

  if (typeof ffmpegStatic === 'string' && ffmpegStatic.length > 0) {
    await access(ffmpegStatic, constants.X_OK);
    cachedFfmpegPath = ffmpegStatic;
    return ffmpegStatic;
  }

  await execFileAsync('ffmpeg', ['-version']);
  cachedFfmpegPath = 'ffmpeg';
  return 'ffmpeg';
}

export async function ensureFfmpegAvailable(): Promise<string> {
  try {
    return await getFfmpegPath();
  } catch {
    throw new Error('ffmpeg_not_available');
  }
}

export async function transcodeToMp3(inputPath: string, outputPath: string): Promise<void> {
  const ffmpeg = await getFfmpegPath();
  await execFileAsync(ffmpeg, [
    '-y',
    '-i',
    inputPath,
    '-vn',
    '-acodec',
    'libmp3lame',
    '-b:a',
    '128k',
    outputPath,
  ]);
}
