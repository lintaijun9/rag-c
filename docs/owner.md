
## 需求
我要开发一个 google file search store 的管理系统，
支持对 gemini  file search store
元数据管理，支持上万个小文件 10k 左右的上传，进行 CRUD增删改查。

## 功能：
1. 上传文件，数量 1 万个，每个 10k 左右
1.1 支持增量上传
1.2 支持端点续传
2. 支持分块配置
3. 支持为上传的文件添加 文件元数据

4. 支持按整个 store 查询，也支持选择具体一个或者几个文件进行查询
5. 提供 aichat查询 数据，并支持流式响应，使用 steamdown 库实现
6. 支持展示引用

## 技术要求：
1. 使用 nodejs、typescript
2. 使用 steamdown 库实现 ai  chat 流式响应

apikey：我可以配置到 env 上


## 参考
https://ai.google.dev/gemini-api/docs/file-search?hl=zh-cn

请生成提示词。



# Google Gemini File Search Store 管理系统 - 开发提示词

## 项目概述

开发一个基于 Node.js + TypeScript 的 Google Gemini File Search Store 管理系统，支持对 File Search Store 进行完整的元数据管理，支持上万个小文件（10KB 左右）的上传、查询和 AI 聊天。

## 核心功能需求

### 1. 文件上传管理

#### 1.1 批量上传
- 支持单次上传 10,000 个文件，每个文件约 10KB
- 支持并发上传控制（避免触发 API 限流）
- 支持上传进度追踪和状态管理

#### 1.2 增量上传
- 检测文件是否已存在（基于文件名或内容哈希）
- 仅上传新增或变更的文件
- 支持文件版本管理

#### 1.3 断点续传
- 支持上传失败后的续传
- 记录上传断点位置
- 支持从上次失败点继续上传

### 2. 分块配置 (Chunking Configuration)

支持自定义分块策略：
\`\`\`typescript
interface ChunkingConfig {
  whiteSpaceConfig: {
    maxTokensPerChunk: number;    // 每块最大 token 数 (推荐 200-512)
    maxOverlapTokens: number;     // 重叠 token 数 (推荐 20-50)
  }
}
\`\`\`

### 3. 文件元数据管理

支持为每个文件添加自定义元数据：
\`\`\`typescript
interface CustomMetadata {
  key: string;
  stringValue?: string;
  numericValue?: number;
}

// 示例
[
  { key: "author", stringValue: "John Doe" },
  { key: "category", stringValue: "technical" },
  { key: "year", numericValue: 2024 },
  { key: "department", stringValue: "engineering" }
]
\`\`\`

### 4. 查询功能

#### 4.1 Store 级别查询
- 支持对整个 File Search Store 进行语义搜索
- 支持元数据过滤查询

#### 4.2 文件级别查询
- 支持选择单个或多个文件进行查询
- 支持按文件 ID/名称过滤
- 支持元数据条件过滤（遵循 AIP-160 过滤语法）

\`\`\`typescript
// 元数据过滤示例
metadataFilter: 'author="John Doe" AND category="technical"'
metadataFilter: 'year >= 2023 AND department="engineering"'
\`\`\`

### 5. AI Chat 查询

#### 5.1 流式响应
- 使用 steamdown 库实现 AI Chat 流式响应
- 支持 Server-Sent Events (SSE)
- 支持 Markdown 流式渲染

#### 5.2 引用展示
- 展示回答的引用来源（groundingMetadata）
- 显示引用文件名称和片段
- 支持点击引用查看原文

## 技术架构

### 技术栈
- **运行时**: Node.js 18+
- **语言**: TypeScript 5+
- **框架**: next.js
- **AI SDK**: @google/genai
- **流式处理**: steamdown
- **配置管理**: dotenv / config

### 环境配置

\`\`\`bash
# .env
GEMINI_API_KEY=your_api_key_here
PORT=3000
NODE_ENV=development

# 上传配置
MAX_FILE_SIZE=104857600      # 100MB
MAX_FILES_PER_BATCH=10000    # 10000 个文件
CONCURRENT_UPLOADS=10        # 并发上传数

# 分块配置
DEFAULT_MAX_TOKENS_PER_CHUNK=512
DEFAULT_MAX_OVERLAP_TOKENS=50

# Store 配置
DEFAULT_STORE_NAME=my-file-search-store
\`\`\`

### 项目结构

\`\`\`
google-file-search-manager/
├── src/
│   ├── index.ts                    # 入口文件
│   ├── config/
│   │   ├── index.ts                # 配置管理
│   │   └── env.ts                  # 环境变量
│   ├── services/
│   │   ├── gemini.service.ts       # Gemini API 服务
│   │   ├── fileUpload.service.ts   # 文件上传服务
│   │   ├── store.service.ts        # Store 管理服务
│   │   ├── document.service.ts     # 文档管理服务
│   │   └── chat.service.ts         # AI Chat 服务
│   ├── controllers/
│   │   ├── upload.controller.ts    # 上传控制器
│   │   ├── store.controller.ts     # Store 控制器
│   │   ├── query.controller.ts     # 查询控制器
│   │   └── chat.controller.ts      # Chat 控制器
│   ├── middleware/
│   │   ├── auth.middleware.ts      # 认证中间件
│   │   ├── rateLimit.middleware.ts # 限流中间件
│   │   └── error.middleware.ts     # 错误处理
│   ├── types/
│   │   ├── gemini.types.ts         # Gemini 类型定义
│   │   └── api.types.ts            # API 类型定义
│   ├── utils/
│   │   ├── fileHash.ts             # 文件哈希工具
│   │   ├── chunking.ts             # 分块工具
│   │   └── streamResponse.ts       # 流式响应工具
│   └── models/
│       ├── uploadQueue.ts          # 上传队列
│       └── metadata.ts             # 元数据模型
├── tests/
├── package.json
├── tsconfig.json
└── README.md
\`\`\`


## 注意事项

### 1. API 限制
- 单文件最大：100 MB
- Store 总大小限制（按用户等级）：
  - 免费版：1 GB
  - Tier 1: 10 GB
  - Tier 2: 100 GB
  - Tier 3: 1 TB
- 建议单个 Store 不超过 20 GB 以保证检索性能

### 2. 支持的文件类型
- 应用文件：PDF, DOCX, XLSX, PPTX, JSON, TXT 等
- 文本文件：Markdown, HTML, CSV, Code files 等
- 完整列表参考官方文档

### 3. 支持的模型
- Gemini 3.1 Pro Preview
- Gemini 3 Flash Preview
- Gemini 2.5 Pro
- Gemini 2.5 Flash-Lite

### 4. 定价
- 索引时嵌入：$0.15 / 1M tokens
- 存储：免费
- 查询时嵌入：免费
- 检索文档 tokens：按正常上下文 tokens 计费

## 测试建议

1. **单元测试**: 测试各服务的核心功能
2. **集成测试**: 测试完整的上传-查询流程
3. **负载测试**: 测试 10,000 文件批量上传的性能
4. **错误处理测试**: 测试网络错误、API 限流等情况

## 下一步

1. 完成基础框架搭建
2. 实现核心文件上传功能
3. 实现元数据管理
4. 实现 AI Chat 流式响应
5. 添加前端界面（可选）
6. 部署和监控
`;

return prompt;