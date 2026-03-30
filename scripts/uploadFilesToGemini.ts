import Database from 'better-sqlite3';
import { GoogleGenAI } from '@google/genai';
import * as fs from 'fs';
import * as path from 'path';
import 'dotenv/config';

// -----------------------------------------------------------------------------
// 配置信息 (可根据需要修改)
// -----------------------------------------------------------------------------
const DB_FILE = path.join(process.cwd(), 'gemini_uploads.sqlite');
const TARGET_DIR = process.argv[2] || './data'; // 想要上传的文件夹路径
const BATCH_LIMIT = 50; // 每次执行最多并发/处理的数量（这里为了稳妥我们用串行，代表一次运行最多上传多少文件，设置为 0 表示不限制）
const SLEEP_MS_BETWEEN_UPLOADS = 1500; // API 请求间的等待时间，防止被限流 (1.5s)

// 初始化 Gemini 客户端
if (!process.env.GEMINI_API_KEY) {
  console.error("❌ 环境变量 GEMINI_API_KEY 未设置");
  process.exit(1);
}
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// 初始化 SQLite 数据库
const db = new Database(DB_FILE);

// 创建存储上传记录的表
db.exec(`
  CREATE TABLE IF NOT EXISTS uploads (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    file_path TEXT UNIQUE NOT NULL,
    file_name TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'PENDING', -- 'PENDING', 'UPLOADED', 'FAILED'
    gemini_file_uri TEXT,
    gemini_file_name TEXT,
    mime_type TEXT,
    error_message TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

// 准备 SQL 语句
const insertFileStmt = db.prepare(`
  INSERT OR IGNORE INTO uploads (file_path, file_name, status)
  VALUES (?, ?, 'PENDING')
`);
const getPendingFilesStmt = db.prepare(`
  SELECT id, file_path, file_name FROM uploads
  WHERE status = 'PENDING' OR status = 'FAILED'
  ORDER BY id ASC
`);
const updateSuccessStmt = db.prepare(`
  UPDATE uploads
  SET status = 'UPLOADED', gemini_file_uri = ?, gemini_file_name = ?, mime_type = ?, updated_at = CURRENT_TIMESTAMP
  WHERE id = ?
`);
const updateFailedStmt = db.prepare(`
  UPDATE uploads
  SET status = 'FAILED', error_message = ?, updated_at = CURRENT_TIMESTAMP
  WHERE id = ?
`);

// 辅助方法：生成元信息 (可以从 JSON 读取，这里默认用文件名)
function getMetadataForFile(filePath: string) {
  const baseName = path.basename(filePath);
  // 你可以在此处根据需要加入读取 meta.json 的逻辑
  return {
    displayName: baseName, // 可视化文件名（显示名）
    // name: 'custom-file-name', // 注意：genai 的 API 中通常让系统自动生成 name，不强制指定，若需自定义，取消注释此行并使用规范格式
  };
}

// 辅助方法：判断 MimeType (若需)
function getMimeType(filePath: string): string | undefined {
  const ext = path.extname(filePath).toLowerCase();
  const mimeTypes: Record<string, string> = {
    '.txt': 'text/plain',
    '.md': 'text/plain',
    '.csv': 'text/csv',
    '.pdf': 'application/pdf',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.mp3': 'audio/mpeg',
    '.mp4': 'video/mp4',
  };
  return mimeTypes[ext]; // 如果为 undefined，SDK 常常会猜测
}

// 辅助函数：休眠
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// 获取目录下的所有文件 (递归)
function walkDir(dir: string, fileList: string[] = []) {
  if (!fs.existsSync(dir)) return fileList;
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      walkDir(fullPath, fileList);
    } else {
      fileList.push(fullPath);
    }
  }
  return fileList;
}

// 1. 同步本地文件到数据库
function syncLocalFilesToDb(dir: string) {
  console.log(`📁 正在扫描文件夹: ${dir}`);
  const allFiles = walkDir(dir);
  let addedCount = 0;
  // 忽略隐藏文件，例如 .DS_Store
  const validFiles = allFiles.filter(f => !path.basename(f).startsWith('.'));

  const insertMany = db.transaction((files: string[]) => {
    for (const filePath of files) {
      const fileName = path.basename(filePath);
      const res = insertFileStmt.run(filePath, fileName);
      if (res.changes > 0) addedCount++;
    }
  });

  insertMany(validFiles);
  console.log(`✅ 扫描结束，共发现有效文件: ${validFiles.length} 个。新添加入库: ${addedCount} 个\n`);
}

// 2. 执行上传任务（实现断点续传/重试）
async function processUploads() {
  const pendingFiles = getPendingFilesStmt.all() as { id: number; file_path: string; file_name: string }[];
  
  if (pendingFiles.length === 0) {
    console.log("🎉 所有文件均已上传完成！");
    return;
  }

  console.log(`🚀 待上传 (包含曾经失败) 的文件总数: ${pendingFiles.length}`);

  let limit = BATCH_LIMIT <= 0 ? pendingFiles.length : Math.min(BATCH_LIMIT, pendingFiles.length);

  for (let i = 0; i < limit; i++) {
    const fileRecord = pendingFiles[i];
    console.log(`[${i + 1}/${limit}] ⬆️ 正在上传文件: ${fileRecord.file_name} ...`);

    try {
      if (!fs.existsSync(fileRecord.file_path)) {
        throw new Error("本地文件已不存在");
      }

      // 提取文件元数据信息
      const metadata = getMetadataForFile(fileRecord.file_path);
      const mimeType = getMimeType(fileRecord.file_path);
      
      const config: any = {
        displayName: metadata.displayName,
      };
      if (mimeType) {
        config.mimeType = mimeType;
      }

      // 请求上传 API
      const uploadedFile = await ai.files.upload({
        file: fileRecord.file_path,
        config: config
      });

      // console.log(uploadedFile); // 用于调试

      // 更新成功状态到本地 SQLite
      updateSuccessStmt.run(
        uploadedFile.uri,         // gemini_file_uri
        uploadedFile.name,        // gemini_file_name
        uploadedFile.mimeType || mimeType || '', // mime_type
        fileRecord.id             // sqlite primary key id
      );

      console.log(`   ✔️ 成功: uri='${uploadedFile.uri}', name='${uploadedFile.name}'`);

    } catch (error: any) {
      // 记录失败日志并保存至 SQLite
      const errMessage = error instanceof Error ? error.message : JSON.stringify(error);
      console.error(`   ❌ 失败: ${errMessage}`);
      updateFailedStmt.run(errMessage, fileRecord.id);
    }

    // 防止 API 访问频率过高被限制
    if (i < limit - 1 && SLEEP_MS_BETWEEN_UPLOADS > 0) {
      await sleep(SLEEP_MS_BETWEEN_UPLOADS);
    }
  }

  console.log('\n🏁 本批次上传任务结束。您可以再次运行脚本来继续断点续传。');
}

// -----------------------------------------------------------------------------
// 主逻辑
// -----------------------------------------------------------------------------
async function main() {
  // 1. 同步待上传文件。如果不需要每次挂载扫描，可以注掉。
  syncLocalFilesToDb(TARGET_DIR);

  // 2. 批量串行上传，断点续传
  await processUploads();
}

main().catch(err => {
  console.error("❌ 发生不可预测的错误：", err);
  process.exit(1);
});
