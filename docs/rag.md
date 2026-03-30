
## gemini apikey
GEMINI_API_KEY=AIzaSyBf5NB9d0I_fzwJb0l1QpaLGojmmRTdbv8
## file search store id：
speakersstore-2khza5o7af4m

## gemini file search store metadata
{
  "file_name": "files/8yxp25fmrj3h",
  "customMetadata": [
    {
      "key": "displayName",
      "stringValue": "20250616-李阳-十点读书"
    },
    {
      "key": "storePath",
      "stringValue": "https://generativelanguage.googleapis.com/v1beta/files/8yxp25fmrj3h"
    },
    {
      "key": "mimeType",
      "stringValue": "text/plain"
    },
    {
      "key": "sizeBytes",
      "numericValue": 9097
    },
    {
      "key": "recordId",
      "stringValue": "c728ea1f-f68b-4a71-84a6-cd764c701ee7"
    },
    {
      "key": "speaker",
      "stringValue": "李阳"
    },
    {
      "key": "title",
      "stringValue": "十点读书"
    },
    {
      "key": "topic",
      "stringValue": "十点读书"
    },
    {
      "key": "subject",
      "stringValue": "十点读书"
    },
    {
      "key": "startTime",
      "stringValue": "2025-6-16 22:08:59"
    },
    {
    "key": "startDate",
    "stringValue": "2025-6-16"
    },
    {
      "key": "timestamp",
      "stringValue": "1750082939000"
    },
    {
      "key": "duration",
      "numericValue": 2308476
    },
    {
      "key": "mentioned",
      "stringListValue": {
          "values": ["李阳","张总","孙老师","莫言","张宏伟"]
      }
    },
    {
      "key": "tags",
      "stringListValue": {
          "values": ["癌症与自我调理","视力觉察与老花","积极乐观与韧性","生活优先与重整"]
      }
    }
  ]
}

## postgres databases 


postgresql://admin:cHczwTs7JeYfeMpH@124.223.68.223:35432:35432/postgres

数据库里已经有8千多条数据

## 数据库表结构
CREATE TABLE IF NOT EXISTS rag_metadata (
    -- 基本信息
    id SERIAL PRIMARY KEY,                   -- 自增 ID (Postgres 使用 SERIAL)
    unique_id VARCHAR(64) UNIQUE,            -- 唯一 ID md5( utterance_id + speaker + start_time + type)
    record_id VARCHAR(64) NOT NULL,          -- 腾讯会议记录 ID
    utterance_id VARCHAR(64) NOT NULL,       -- 分享者分享片段 ID 
    
    -- 文件关联 (用于管理 Google File Search Store)
    file_name VARCHAR(100),                  -- 存储如 "files/f3ouvvj14tdq"
    file_path VARCHAR(255),                           -- 存储完整路径
    store_path VARCHAR(255),                 -- 存储路径 gemini api file search store id
    
    -- 业务内容
    speaker VARCHAR(50),                     -- 发言人
    title VARCHAR(255),                      -- 会议标题
    topic VARCHAR(100),                      -- 话题
    subject VARCHAR(100),                    -- 主题
    content TEXT,                            -- 原始转录文本
    
    -- 时间维度 (Postgres 建议用 timestamptz 带时区)
    start_time TIMESTAMPTZ,                  -- 北京时间 (2026-03-26 07:44:40+08)
    raw_timestamp BIGINT,                    -- 原始毫秒值
    duration_ms INTEGER,                     -- 持续时间
    
    -- RAG 增强字段 (使用 JSONB 性能更好，支持索引)
    summary TEXT,                            -- AI 生成的摘要
    mentioned JSONB,                         -- 提到的人名数组: ["atai", "狮子"]
    tags JSONB,                              -- 标签数组: ["慢生活", "觉察"]
    
    -- 系统字段
    status VARCHAR(20) DEFAULT 'pending',    -- 状态: pending, uploaded, indexed, error
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP, -- 记录入库时间
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP, -- 记录更新时间
    deleted_at TIMESTAMPTZ DEFAULT NULL               -- 记录删除时间
);

-- 为常用搜索字段创建索引，提高查询速度
CREATE INDEX IF NOT EXISTS idx_rag_speaker ON rag_metadata(speaker);
CREATE INDEX IF NOT EXISTS idx_rag_start_time ON rag_metadata(start_time);

CREATE INDEX idx_rag_tags_gin ON rag_metadata USING GIN (tags);
CREATE INDEX idx_rag_mentioned_gin ON rag_metadata USING GIN (mentioned);

-- 表注释
COMMENT ON TABLE rag_metadata IS 'RAG 系统元数据存储表，用于关联原始会议记录与向量库文件';

-- 字段注释
COMMENT ON COLUMN rag_metadata.id IS '自增主键';
COMMENT ON COLUMN rag_metadata.unique_id IS '唯一 ID md5( utterance_id + speaker + start_time + type)';
COMMENT ON COLUMN rag_metadata.record_id IS '外部业务系统原始记录 ID';
COMMENT ON COLUMN rag_metadata.utterance_id IS '单条发言的唯一标识 ID';
COMMENT ON COLUMN rag_metadata.file_name IS 'Google File Search Store 返回的文件资源名称 (files/xxx)';
COMMENT ON COLUMN rag_metadata.file_path IS '文件的存储路径';
COMMENT ON COLUMN rag_metadata.store_path IS 'gemini api file search store id';
COMMENT ON COLUMN rag_metadata.speaker IS '发言人姓名';
COMMENT ON COLUMN rag_metadata.title IS '会议或文档的总标题';
COMMENT ON COLUMN rag_metadata.topic IS '会议话题';
COMMENT ON COLUMN rag_metadata.subject IS '会议主题';
COMMENT ON COLUMN rag_metadata.content IS '原始转录文本全文';
COMMENT ON COLUMN rag_metadata.start_time IS '转换后的北京时间 (带时区)';
COMMENT ON COLUMN rag_metadata.raw_timestamp IS '原始 Unix 毫秒时间戳';
COMMENT ON COLUMN rag_metadata.duration_ms IS '发言持续时长 (毫秒)';
COMMENT ON COLUMN rag_metadata.summary IS 'AI 自动生成的文本摘要';
COMMENT ON COLUMN rag_metadata.mentioned IS 'JSONB 格式，存储该段对话中提到的人名列表';
COMMENT ON COLUMN rag_metadata.tags IS 'JSONB 格式，存储 AI 提取的关键词标签';
COMMENT ON COLUMN rag_metadata.status IS '数据处理状态：pending(待处理), uploaded(已上传文件), indexed(向量库已索引), error(出错)';
COMMENT ON COLUMN rag_metadata.created_at IS '记录入库时间';
COMMENT ON COLUMN rag_metadata.updated_at IS '记录更新时间';
COMMENT ON COLUMN rag_metadata.deleted_at IS '记录删除时间';



