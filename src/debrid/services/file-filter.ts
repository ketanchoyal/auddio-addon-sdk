import type { TorrentFile } from "../providers/interface";

export function filterAudioFiles(files: TorrentFile[]): TorrentFile[] {
  const audioExtensions = /\.(mp3|m4b|m4a|aac|flac|ogg|opus|wav)$/i;
  const minSize = 1024 * 1024;

  return files.filter((file) => {
    const isAudio = audioExtensions.test(file.filename);
    const isNotSample = !file.filename.toLowerCase().includes("sample");
    const isReasonableSize = file.size > minSize;

    return isAudio && isNotSample && isReasonableSize;
  });
}
