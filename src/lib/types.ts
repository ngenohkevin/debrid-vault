export type DownloadStatus = "pending" | "resolving" | "downloading" | "moving" | "completed" | "error" | "cancelled";
export type Category = "movies" | "tv-shows";

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
  filePath?: string;
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
}

export interface MediaFile {
  name: string;
  path: string;
  size: number;
  modTime: string;
  isDir: boolean;
  category: string;
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
