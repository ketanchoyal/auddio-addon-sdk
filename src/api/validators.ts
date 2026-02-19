import { z } from "zod";

// Manifest types
export const ConfigFieldTypeSchema = z.enum([
  "text",
  "password",
  "number",
  "dropdown",
  "checkbox",
  "textarea",
]);

export const ConfigOptionSchema = z.object({
  value: z.string(),
  label: z.string(),
});

export const ConfigFieldSchema = z.object({
  id: z.string(),
  label: z.string(),
  type: ConfigFieldTypeSchema,
  required: z.boolean(),
  default: z.any().optional(),
  placeholder: z.string().optional(),
  help: z.string().optional(),
  options: z.array(ConfigOptionSchema).optional(),
});

export const AddonTypeSchema = z.enum(["UNIFIED", "SCRAPER", "DEBRID"]);
export const CapabilitySchema = z.enum(["SEARCH", "CHECK_CACHE", "RESOLVE"]);

export const ManifestSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  version: z.string().regex(/^\d+\.\d+\.\d+$/),
  protocolVersion: z.string().regex(/^\d+\.\d+\.\d+$/),
  description: z.string().optional(),
  type: AddonTypeSchema,
  capabilities: z.array(CapabilitySchema),
  icon: z.string().url().nullable().optional(),
  endpoints: z.object({
    search: z.string().optional(),
    checkCache: z.string().optional(),
    resolve: z.string().optional(),
  }),
  config: z
    .object({
      fields: z.array(ConfigFieldSchema),
    })
    .optional(),
  author: z.string().optional(),
  repository: z.url().optional(),
  license: z.string().optional(),
});

export type Manifest = z.infer<typeof ManifestSchema>;

export const SearchRequestSchema = z.object({
  title: z.string().min(1, "Title is required"),
  author: z.string().optional(),
  narrator: z.string().optional(),
  isbn: z.string().optional(),
  limit: z.number().int().positive().max(100).optional(),
});

export type SearchRequest = z.infer<typeof SearchRequestSchema>;

export const CheckCacheRequestSchema = z.object({
  provider: z.string().min(1),
  apiKey: z.string().min(1),
  infoHashes: z
    .array(z.string().regex(/^[a-fA-F0-9]{40}$/, "Invalid info hash format"))
    .min(1)
    .max(100),
});

export type CheckCacheRequest = z.infer<typeof CheckCacheRequestSchema>;

export const ResolveRequestSchema = z.object({
  provider: z.string().min(1),
  apiKey: z.string().min(1),
  infoHash: z.string().regex(/^[a-fA-F0-9]{40}$/, "Invalid info hash format"),
  fileIds: z.array(z.number().int()).optional(),
  torrentId: z.string().optional(),
});

export type ResolveRequest = z.infer<typeof ResolveRequestSchema>;

export interface SearchResult {
  infoHash: string;
  magnetUrl?: string;
  title: string;
  author?: string | null;
  narrator?: string | null;
  series?: string | null;
  seriesIndex?: number | null;
  format?: string | null;
  bitrate?: string | null;
  quality?: string | null;
  size: number;
  sizeFormatted?: string;
  seeders: number;
  leechers: number;
  source: string;
  sourceUrl?: string | null;
  uploadDate?: string | null;
  score?: number;
}

export interface SearchResponse {
  results: SearchResult[];
  total: number;
  query: {
    title: string;
    author?: string;
    narrator?: string;
    isbn?: string;
  };
}

export interface CacheStatus {
  cached: boolean;
  torrentId?: string;
  files?: Array<{
    id?: string;
    filename: string;
    size: number;
    torrentId?: string;
    path?: string;
  }>;
}

export type CheckCacheResponse = Record<string, CacheStatus>;

export interface ResolveResponse {
  torrentId: string;
  infoHash: string;
  status:
    | "ready"
    | "partial"
    | "downloading"
    | "queued"
    | "error"
    | "selection_required";
  progress?: number;
  files: Array<{
    id?: string;
    filename: string;
    url: string;
    size: number;
    status?: "ready" | "downloading" | "queued" | "error";
    mimeType?: string;
    duration?: number | null;
    bitrate?: number | null;
    path?: string;
  }>;
  totalSize: number;
  message?: string;
  candidates?: Array<{
    id: number;
    filename: string;
    path?: string;
    size: number;
    selected: boolean;
  }>;
}

export const ProgressRequestSchema = z.object({
  apiKey: z.string().min(1),
  torrentId: z.string(),
});

export type ProgressRequest = z.infer<typeof ProgressRequestSchema>;

export const ProgressResponseSchema = z.object({
  infoHash: z.string(),
  rdTorrentId: z.string().nullable(),
  status: z.enum([
    "queued",
    "downloading",
    "downloaded",
    "selection_required",
    "error",
    "stale",
    "not_found",
  ]),
  progress: z.number().min(0).max(100),
  filename: z.string().nullable(),
  files: z.array(
    z.object({
      id: z.string().optional(),
      filename: z.string(),
      path: z.string().optional(),
      size: z.number(),
      status: z.enum(["ready", "downloading", "queued", "error"]).optional(),
    }),
  ),
});

export type ProgressResponse = z.infer<typeof ProgressResponseSchema>;
