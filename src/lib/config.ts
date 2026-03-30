// Environment configuration
export const config = {
  geminiApiKey: process.env.GEMINI_API_KEY || "",
  port: parseInt(process.env.PORT || "3000", 10),
  nodeEnv: process.env.NODE_ENV || "development",

  // Upload settings
  maxFileSize: parseInt(process.env.MAX_FILE_SIZE || "104857600", 10),
  maxFilesPerBatch: parseInt(process.env.MAX_FILES_PER_BATCH || "10000", 10),
  concurrentUploads: parseInt(process.env.CONCURRENT_UPLOADS || "10", 10),

  // Chunking settings
  defaultMaxTokensPerChunk: parseInt(
    process.env.DEFAULT_MAX_TOKENS_PER_CHUNK || "512",
    10,
  ),
  defaultMaxOverlapTokens: parseInt(
    process.env.DEFAULT_MAX_OVERLAP_TOKENS || "50",
    10,
  ),

  // Store settings
  defaultStoreName: process.env.DEFAULT_STORE_NAME || "my-file-search-store",

  // Default model
  defaultModel: process.env.DEFAULT_MODEL || "gemini-2.5-flash",
} as const;
