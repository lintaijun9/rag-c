"use client";

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
} from "react";

export type Locale = "zh" | "en";

const translations = {
  zh: {
    // Navigation
    "nav.dashboard": "仪表盘",
    "nav.stores": "知识库",
    "nav.chat": "AI 对话",
    "nav.rag": "RAG 查询",
    "nav.settings": "设置",

    // RAG Search
    "rag.title": "RAG 智能查询",
    "rag.subtitle": "从知识库元数据中精准检索，结合 AI 深度分析",
    "rag.totalRecords": "记录总数",
    "rag.speakers": "发言人数",
    "rag.totalDuration": "总时长",
    "rag.filters": "筛选条件",
    "rag.keywordPlaceholder": "搜索内容、摘要、标题...",
    "rag.speaker": "发言人",
    "rag.allSpeakers": "全部发言人",
    "rag.topic": "话题",
    "rag.allTopics": "全部话题",
    "rag.dateRange": "日期范围",
    "rag.status": "状态",
    "rag.allStatuses": "全部状态",
    "rag.tags": "标签",
    "rag.clearFilters": "清除筛选",
    "rag.speakerBreakdown": "发言人分布",
    "rag.dataSearch": "数据检索",
    "rag.aiQuery": "AI 问答",
    "rag.searchHint": "使用上方筛选条件搜索 RAG 数据库记录",
    "rag.hotTags": "热门标签",
    "rag.resultCount": "共 {count} 条记录，第 {page}/{totalPages} 页",
    "rag.recordDetail": "记录详情",
    "rag.recordTitle": "标题",
    "rag.startTime": "开始时间",
    "rag.duration": "时长",
    "rag.summary": "摘要",
    "rag.mentioned": "提及人员",
    "rag.content": "原文",
    "rag.fileId": "文件 ID",
    "rag.askAboutThis": "AI 分析此记录",
    "rag.defaultModel": "默认模型",
    "rag.applyFilters": "带入筛选条件",
    "rag.activeFilters": "当前筛选",
    "rag.aiWelcome": "使用当前筛选条件，向 AI 提问关于这些数据的问题",
    "rag.q1": "📊 这些数据中最常讨论的话题是什么？",
    "rag.q2": "👥 各位发言人的主要观点是什么？",
    "rag.q3": "🔍 请总结这些记录的核心内容",
    "rag.askPlaceholder": "向 AI 提问，例如：这些记录中有哪些关键内容？",
    "rag.prev": "上一页",
    "rag.next": "下一页",

    // Dashboard
    "dashboard.title": "仪表盘",
    "dashboard.totalStores": "知识库总数",
    "dashboard.totalDocuments": "文档总数",
    "dashboard.totalSize": "总存储大小",
    "dashboard.recentStores": "最近的知识库",
    "dashboard.quickActions": "快速操作",
    "dashboard.createStore": "创建知识库",
    "dashboard.startChat": "开始对话",

    // Stores
    "stores.title": "知识库管理",
    "stores.create": "创建知识库",
    "stores.delete": "删除",
    "stores.confirmDelete": "确定要删除此知识库吗？此操作不可撤销。",
    "stores.name": "名称",
    "stores.displayName": "显示名称",
    "stores.documents": "文档数",
    "stores.size": "大小",
    "stores.created": "创建时间",
    "stores.actions": "操作",
    "stores.empty": "暂无知识库，请创建一个",
    "stores.createPlaceholder": "输入知识库名称",
    "stores.viewDocuments": "查看文档",
    "stores.uploadFiles": "上传文件",
    "stores.activeDocuments": "活跃文档",
    "stores.pendingDocuments": "处理中",
    "stores.failedDocuments": "失败",

    // Documents
    "documents.title": "文档管理",
    "documents.upload": "上传文件",
    "documents.delete": "删除",
    "documents.name": "文件名",
    "documents.status": "状态",
    "documents.size": "大小",
    "documents.type": "类型",
    "documents.metadata": "元数据",
    "documents.created": "创建时间",
    "documents.empty": "暂无文档",
    "documents.confirmDelete": "确定要删除此文档吗？",
    "documents.backToStore": "返回知识库",

    // Upload
    "upload.title": "上传文件",
    "upload.dropzone": "拖拽文件到此处，或点击选择文件",
    "upload.selectFiles": "选择文件",
    "upload.selectedCount": "已选择 {count} 个文件",
    "upload.startUpload": "开始上传",
    "upload.uploading": "上传中...",
    "upload.progress": "进度: {completed}/{total}",
    "upload.completed": "上传完成",
    "upload.failed": "上传失败",
    "upload.cancel": "取消",

    // Chunking Config
    "chunking.title": "分块配置",
    "chunking.maxTokens": "每块最大 Token 数",
    "chunking.overlap": "重叠 Token 数",

    // Metadata
    "metadata.title": "文件元数据",
    "metadata.addField": "添加字段",
    "metadata.key": "键",
    "metadata.value": "值",
    "metadata.type": "类型",
    "metadata.string": "字符串",
    "metadata.number": "数字",
    "metadata.remove": "删除",

    // Chat
    "chat.title": "AI 对话",
    "chat.placeholder": "输入您的问题...",
    "chat.send": "发送",
    "chat.selectStore": "选择知识库",
    "chat.selectModel": "选择模型",
    "chat.noStore": "请先选择一个知识库",
    "chat.citations": "引用来源",
    "chat.filter": "元数据过滤",
    "chat.filterPlaceholder": '例如: author="John"',
    "chat.model": "模型",
    "chat.thinking": "思考中...",
    "chat.welcome": "欢迎使用 AI 对话，请选择知识库并输入问题开始。",
    "chat.clearHistory": "清空对话",

    // Settings
    "settings.title": "设置",
    "settings.language": "语言",
    "settings.theme": "主题模式",
    "settings.themeLight": "浅色",
    "settings.themeDark": "深色",
    "settings.themeSystem": "跟随系统",
    "settings.user": "用户信息",
    "settings.logout": "退出",
    "settings.apiKey": "API 密钥",
    "settings.apiKeyConfigured": "已配置",
    "settings.apiKeyNotConfigured": "未配置",
    "settings.about": "关于",
    "settings.version": "版本",

    // Common
    "common.loading": "加载中...",
    "common.error": "错误",
    "common.success": "成功",
    "common.confirm": "确认",
    "common.cancel": "取消",
    "common.save": "保存",
    "common.close": "关闭",
    "common.search": "搜索",
    "common.refresh": "刷新",
    "common.noData": "暂无数据",
    "common.retry": "重试",
    "common.back": "返回",
    "common.actions": "操作",
  },
  en: {
    // Navigation
    "nav.dashboard": "Dashboard",
    "nav.stores": "Stores",
    "nav.chat": "AI Chat",
    "nav.rag": "RAG Search",
    "nav.settings": "Settings",

    // RAG Search
    "rag.title": "RAG Intelligent Search",
    "rag.subtitle": "Precisely search knowledge base metadata with AI-powered analysis",
    "rag.totalRecords": "Total Records",
    "rag.speakers": "Speakers",
    "rag.totalDuration": "Total Duration",
    "rag.filters": "Filters",
    "rag.keywordPlaceholder": "Search content, summary, title...",
    "rag.speaker": "Speaker",
    "rag.allSpeakers": "All Speakers",
    "rag.topic": "Topic",
    "rag.allTopics": "All Topics",
    "rag.dateRange": "Date Range",
    "rag.status": "Status",
    "rag.allStatuses": "All Statuses",
    "rag.tags": "Tags",
    "rag.clearFilters": "Clear Filters",
    "rag.speakerBreakdown": "Speaker Breakdown",
    "rag.dataSearch": "Data Search",
    "rag.aiQuery": "AI Query",
    "rag.searchHint": "Use the filters above to search RAG database records",
    "rag.hotTags": "Popular Tags",
    "rag.resultCount": "{count} records, page {page} of {totalPages}",
    "rag.recordDetail": "Record Detail",
    "rag.recordTitle": "Title",
    "rag.startTime": "Start Time",
    "rag.duration": "Duration",
    "rag.summary": "Summary",
    "rag.mentioned": "Mentioned People",
    "rag.content": "Full Content",
    "rag.fileId": "File ID",
    "rag.askAboutThis": "Ask AI about this",
    "rag.defaultModel": "Default model",
    "rag.applyFilters": "Apply filters",
    "rag.activeFilters": "Active filters",
    "rag.aiWelcome": "Ask AI questions about data matching your current filters",
    "rag.q1": "📊 What are the most discussed topics in these records?",
    "rag.q2": "👥 What are the main points made by each speaker?",
    "rag.q3": "🔍 Please summarize the key content of these records",
    "rag.askPlaceholder": "Ask AI a question, e.g.: What are the key insights from these records?",
    "rag.prev": "Previous",
    "rag.next": "Next",

    // Dashboard
    "dashboard.title": "Dashboard",
    "dashboard.totalStores": "Total Stores",
    "dashboard.totalDocuments": "Total Documents",
    "dashboard.totalSize": "Total Size",
    "dashboard.recentStores": "Recent Stores",
    "dashboard.quickActions": "Quick Actions",
    "dashboard.createStore": "Create Store",
    "dashboard.startChat": "Start Chat",

    // Stores
    "stores.title": "Store Management",
    "stores.create": "Create Store",
    "stores.delete": "Delete",
    "stores.confirmDelete":
      "Are you sure you want to delete this store? This action cannot be undone.",
    "stores.name": "Name",
    "stores.displayName": "Display Name",
    "stores.documents": "Documents",
    "stores.size": "Size",
    "stores.created": "Created",
    "stores.actions": "Actions",
    "stores.empty": "No stores yet. Create one to get started.",
    "stores.createPlaceholder": "Enter store name",
    "stores.viewDocuments": "View Documents",
    "stores.uploadFiles": "Upload Files",
    "stores.activeDocuments": "Active",
    "stores.pendingDocuments": "Pending",
    "stores.failedDocuments": "Failed",

    // Documents
    "documents.title": "Document Management",
    "documents.upload": "Upload Files",
    "documents.delete": "Delete",
    "documents.name": "File Name",
    "documents.status": "Status",
    "documents.size": "Size",
    "documents.type": "Type",
    "documents.metadata": "Metadata",
    "documents.created": "Created",
    "documents.empty": "No documents yet.",
    "documents.confirmDelete": "Are you sure you want to delete this document?",
    "documents.backToStore": "Back to Store",

    // Upload
    "upload.title": "Upload Files",
    "upload.dropzone": "Drag and drop files here, or click to select",
    "upload.selectFiles": "Select Files",
    "upload.selectedCount": "{count} files selected",
    "upload.startUpload": "Start Upload",
    "upload.uploading": "Uploading...",
    "upload.progress": "Progress: {completed}/{total}",
    "upload.completed": "Upload Complete",
    "upload.failed": "Upload Failed",
    "upload.cancel": "Cancel",

    // Chunking Config
    "chunking.title": "Chunking Configuration",
    "chunking.maxTokens": "Max Tokens Per Chunk",
    "chunking.overlap": "Overlap Tokens",

    // Metadata
    "metadata.title": "File Metadata",
    "metadata.addField": "Add Field",
    "metadata.key": "Key",
    "metadata.value": "Value",
    "metadata.type": "Type",
    "metadata.string": "String",
    "metadata.number": "Number",
    "metadata.remove": "Remove",

    // Chat
    "chat.title": "AI Chat",
    "chat.placeholder": "Enter your question...",
    "chat.send": "Send",
    "chat.selectStore": "Select Store",
    "chat.selectModel": "Select Model",
    "chat.noStore": "Please select a store first",
    "chat.citations": "Citations",
    "chat.filter": "Metadata Filter",
    "chat.filterPlaceholder": 'e.g. author="John"',
    "chat.model": "Model",
    "chat.thinking": "Thinking...",
    "chat.welcome":
      "Welcome to AI Chat. Select a store and ask a question to begin.",
    "chat.clearHistory": "Clear History",

    // Settings
    "settings.title": "Settings",
    "settings.language": "Language",
    "settings.theme": "Theme",
    "settings.themeLight": "Light",
    "settings.themeDark": "Dark",
    "settings.themeSystem": "System",
    "settings.user": "User Info",
    "settings.logout": "Logout",
    "settings.apiKey": "API Key",
    "settings.apiKeyConfigured": "Configured",
    "settings.apiKeyNotConfigured": "Not Configured",
    "settings.about": "About",
    "settings.version": "Version",

    // Common
    "common.loading": "Loading...",
    "common.error": "Error",
    "common.success": "Success",
    "common.confirm": "Confirm",
    "common.cancel": "Cancel",
    "common.save": "Save",
    "common.close": "Close",
    "common.search": "Search",
    "common.refresh": "Refresh",
    "common.noData": "No data",
    "common.retry": "Retry",
    "common.back": "Back",
    "common.actions": "Actions",
  },
} as const;

type TranslationKey = keyof typeof translations.zh;

interface I18nContextType {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: TranslationKey, params?: Record<string, string | number>) => string;
}

const I18nContext = createContext<I18nContextType | null>(null);

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("zh");

  useEffect(() => {
    const saved = localStorage.getItem("locale") as Locale | null;
    if (saved && (saved === "zh" || saved === "en")) {
      setLocaleState(saved);
    }
  }, []);

  const setLocale = useCallback((newLocale: Locale) => {
    setLocaleState(newLocale);
    localStorage.setItem("locale", newLocale);
    document.documentElement.lang = newLocale === "zh" ? "zh-CN" : "en";
  }, []);

  const t = useCallback(
    (key: TranslationKey, params?: Record<string, string | number>): string => {
      let text: string =
        (translations[locale] as Record<string, string>)[key] || key;
      if (params) {
        Object.entries(params).forEach(([k, v]) => {
          text = text.replace(`{${k}}`, String(v));
        });
      }
      return text;
    },
    [locale],
  );

  return (
    <I18nContext.Provider value={{ locale, setLocale, t }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error("useI18n must be used within I18nProvider");
  }
  return context;
}
