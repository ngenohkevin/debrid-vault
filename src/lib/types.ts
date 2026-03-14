export type DownloadStatus = "pending" | "queued" | "resolving" | "downloading" | "moving" | "paused" | "completed" | "error" | "cancelled";
export type Category = "movies" | "tv-shows" | "music";
export type SubtitleStatus = "likely" | "unlikely" | "unknown" | "confirmed" | "none";

export interface DownloadItem {
  id: string;
  name: string;
  category: Category;
  status: DownloadStatus;
  progress: number;
  speed: number;
  size: number;
  downloaded: number;
  eta: number;
  error?: string;
  source: string;
  folder?: string;
  groupId?: string;
  groupName?: string;
  filePath?: string;
  subtitleStatus: SubtitleStatus;
  scheduledFor?: string;
  createdAt: string;
  completedAt?: string;
}

export interface RDUser {
  id: number;
  username: string;
  email: string;
  premium: number;
  expiration: string;
  type: string;
}

export interface RDDownload {
  id: string;
  filename: string;
  mimeType: string;
  filesize: number;
  link: string;
  host: string;
  download: string;
  generated: string;
  subtitleStatus: SubtitleStatus;
}

export interface RDTorrentFile {
  id: number;
  path: string;
  bytes: number;
  selected: number;
}

export interface RDTorrent {
  id: string;
  filename: string;
  hash: string;
  bytes: number;
  host: string;
  split: number;
  progress: number;
  status: string;
  added: string;
  links: string[];
  ended: string;
  speed: number;
  seeders: number;
  subtitleStatus: SubtitleStatus;
}

export interface RDTorrentInfo extends RDTorrent {
  files: RDTorrentFile[];
}

export interface SubtitleTrack {
  index: number;
  language: string;
  title?: string;
  codec: string;
  forced?: boolean;
}

export interface MediaFile {
  name: string;
  path: string;
  size: number;
  modTime: string;
  isDir: boolean;
  category: string;
  hasSubtitles?: boolean;
  subtitleTracks?: SubtitleTrack[];
}

export interface DiskUsage {
  total: number;
  used: number;
  available: number;
  percent: number;
}

export interface StorageInfo {
  nvme: DiskUsage;
  external: DiskUsage;
}

export interface SystemStatus {
  storage: StorageInfo;
  activeDownloads: number;
  totalDownloads: number;
  rdUser: RDUser | null;
}

export interface EngineSettings {
  maxConcurrentDownloads: number;
  maxSegmentsPerFile: number;
  speedLimitMbps: number;
}

export type ScheduleStatus = "scheduled" | "running" | "completed" | "cancelled" | "error";

export interface ScheduledDownload {
  id: string;
  name?: string;
  source: string;
  category: Category;
  folder?: string;
  scheduledAt: string;
  speedLimitMbps: number;
  status: ScheduleStatus;
  error?: string;
  downloadId?: string;
  groupId?: string;
  resumeIds?: string[];
  createdAt: string;
  completedAt?: string;
}
