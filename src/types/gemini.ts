// ===== File Search Store Types =====

export interface FileSearchStore {
  name: string;
  displayName: string;
  createTime: string;
  updateTime: string;
  activeDocumentsCount: string;
  pendingDocumentsCount: string;
  failedDocumentsCount: string;
  sizeBytes: string;
}

export interface FileSearchDocument {
  name: string;
  displayName: string;
  customMetadata: CustomMetadata[];
  updateTime: string;
  createTime: string;
  state: DocumentState;
  sizeBytes: string;
  mimeType: string;
}

export type DocumentState = 'STATE_UNSPECIFIED' | 'STATE_PENDING' | 'STATE_ACTIVE' | 'STATE_FAILED';

export interface CustomMetadata {
  key: string;
  stringValue?: string;
  stringListValue?: { values: string[] };
  numericValue?: number;
}

export interface ChunkingConfig {
  whiteSpaceConfig: {
    maxTokensPerChunk: number;
    maxOverlapTokens: number;
  };
}

export interface UploadConfig {
  displayName?: string;
  customMetadata?: CustomMetadata[];
  chunkingConfig?: ChunkingConfig;
  mimeType?: string;
}

export interface Operation {
  name: string;
  metadata?: Record<string, unknown>;
  done: boolean;
  error?: {
    code: number;
    message: string;
  };
  response?: Record<string, unknown>;
}

// ===== Upload Management Types =====

export type UploadStatus = 'pending' | 'uploading' | 'processing' | 'completed' | 'failed' | 'skipped';

export interface UploadFileItem {
  id: string;
  file: File;
  fileName: string;
  fileSize: number;
  status: UploadStatus;
  progress: number;
  error?: string;
  documentName?: string;
  hash?: string;
}

export interface UploadSession {
  id: string;
  storeId: string;
  totalFiles: number;
  completedFiles: number;
  failedFiles: number;
  skippedFiles: number;
  status: 'active' | 'paused' | 'completed' | 'failed';
  startTime: string;
  files: UploadFileItem[];
  chunkingConfig?: ChunkingConfig;
  metadata?: CustomMetadata[];
}

export interface UploadProgress {
  totalFiles: number;
  completedFiles: number;
  failedFiles: number;
  skippedFiles: number;
  percentage: number;
  currentFile?: string;
}

// ===== Chat Types =====

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  citations?: Citation[];
  isStreaming?: boolean;
}

export interface Citation {
  title: string;
  uri?: string;
  startIndex?: number;
  endIndex?: number;
  chunk?: string;
}

export interface ChatConfig {
  model: string;
  storeNames: string[];
  metadataFilter?: string;
  temperature?: number;
}

// ===== API Response Types =====

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  nextPageToken?: string;
  totalCount?: number;
}
