import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import { Streamdown } from 'streamdown';

export interface AiMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface FilterState {
  keyword: string;
  speaker: string;
  topic: string;
  startDateFrom: string;
  startDateTo: string;
  tags: string[];
  status: string;
}

interface RagAiTabProps {
  storeId: string;
  filter: FilterState;
  showError: (msg: string) => void;
  aiQuestion: string;
  setAiQuestion: (q: string) => void;
}

const availableModels = ['gemini-2.5-pro', 'gemini-2.5-flash', 'gemini-2.0-flash-lite', 'gemini-2.0-flash'];

export function RagAiTab({ storeId, filter, showError, aiQuestion, setAiQuestion }: RagAiTabProps) {
  const { success: showSuccess } = useToast();
  const [aiMessages, setAiMessages] = useState<AiMessage[]>([]);
  const [aiTyping, setAiTyping] = useState(false);
  const [streamingResponse, setStreamingResponse] = useState('');
  const [useFilterInAi, setUseFilterInAi] = useState(true);
  const [selectedModel, setSelectedModel] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [aiMessages]);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      showSuccess('📋 复制成功');
    }).catch(() => {
      showError('复制失败，请重试');
    });
  };

  const handleFeedback = (idx: number, isPositive: boolean) => {
    // Phase C: Future API Call telemetry goes here
    showSuccess(isPositive ? '✨ 感谢您的正面反馈！' : '🔁 我们将持续优化模型与检索性能。');
  };

  const handleAiQuery = async () => {
    if (!aiQuestion.trim() || aiTyping) return;

    const question = aiQuestion.trim();
    setAiMessages((prev) => [...prev, { role: 'user', content: question }]);
    setAiQuestion('');
    setAiTyping(true);

    try {
      const body: Record<string, unknown> = {
        question,
        storeId: storeId || undefined,
        model: selectedModel || undefined,
        includeContext: useFilterInAi,
      };

      if (useFilterInAi) {
        body.filter = {
          speaker: filter.speaker || undefined,
          topic: filter.topic || undefined,
          startDateFrom: filter.startDateFrom || undefined,
          startDateTo: filter.startDateTo || undefined,
          tags: filter.tags.length > 0 ? filter.tags : undefined,
          keyword: filter.keyword || undefined,
        };
      }

      const response = await fetch('/api/rag/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!response.ok) throw new Error('Request failed');

      const reader = response.body?.getReader();
      const decoder = new TextDecoder('utf-8');
      if (!reader) throw new Error('No reader');

      let textBuffer = '';
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        textBuffer += chunk;
        setStreamingResponse(textBuffer);
      }
      
      // Once stream is completely finished, commit to regular AI messages state
      setAiMessages((prev) => [
        ...prev,
        { role: 'assistant', content: textBuffer },
      ]);
      setStreamingResponse('');
    } catch {
      showError('AI 查询失败，请检查网络或后备服务配置。');
    } finally {
      setAiTyping(false);
    }
  };

  return (
    <div className="tab-pane ai-tab fade-in">
      <div className="ai-config-panel">
        <div className="ai-config-row">
          <select className="filter-select config-select" value={selectedModel} onChange={(e) => setSelectedModel(e.target.value)} disabled={aiTyping}>
            <option value="">推荐模型自动选择</option>
            {availableModels.map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
          <label className="toggle-label glass-label">
            <input type="checkbox" checked={useFilterInAi} onChange={(e) => setUseFilterInAi(e.target.checked)} disabled={aiTyping} />
            <span className="toggle-text">限定当前搜索范围</span>
          </label>
          {aiMessages.length > 0 && <Button variant="ghost" size="sm" onClick={() => setAiMessages([])} disabled={aiTyping}>清空</Button>}
        </div>
      </div>

      <div className="ai-messages custom-scroll">
        {aiMessages.length === 0 && (
          <div className="ai-welcome animation-slideUp">
            <div className="ai-brand">✨</div>
            <h3>有什么我可以帮您的？</h3>
            <p>向AI大模型提问，获取对现有文档数据的深度洞察</p>
            <div className="quick-questions">
              {['提取最近的会议纪要', '总结不同发言人的核心观点', '分析高频标签出现的上下文'].map((q) => (
                <button key={q} className="quick-q" onClick={() => setAiQuestion(q)}>{q}</button>
              ))}
            </div>
          </div>
        )}

        {aiMessages.map((msg, idx) => (
          <div key={idx} className={`ai-message ${msg.role} animation-slideUp`}>
            <div className="ai-bubble">
              <div className="msg-role">{msg.role === 'user' ? 'You' : 'AI'}</div>
              {msg.role === 'user' ? (
                <div className="msg-content">{msg.content}</div>
              ) : (
                <div className="ai-response">
                  <Streamdown>{msg.content}</Streamdown>
                  <div className="ai-feedback-actions mt-xs fade-in">
                    <button className="feedback-btn action-copy" onClick={() => handleCopy(msg.content)} title="复制内容">
                      📋 复制
                    </button>
                    <div className="feedback-eval">
                      <button className="feedback-btn tag-chip small" onClick={() => handleFeedback(idx, true)} title="赞同">👍 有用</button>
                      <button className="feedback-btn tag-chip small" onClick={() => handleFeedback(idx, false)} title="反对">👎 待改进</button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
        {streamingResponse && (
          <div className="ai-message assistant animation-slideUp">
            <div className="ai-bubble">
              <div className="msg-role">AI</div>
              <div className="ai-response">
                <Streamdown>{streamingResponse}</Streamdown>
              </div>
            </div>
          </div>
        )}
        {aiTyping && !streamingResponse && (
          <div className="ai-message assistant typing-indicator fade-in">
            <div className="ai-bubble">
              <span className="dot"></span><span className="dot"></span><span className="dot"></span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="ai-input-area glass-panel">
        <div className="ai-input-wrapper">
          <textarea
            className="ai-textarea custom-scroll"
            placeholder="询问关于库中数据的细节..."
            value={aiQuestion}
            onChange={(e) => setAiQuestion(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleAiQuery();
              }
            }}
            disabled={aiTyping}
            rows={2}
          />
          <Button
            className="send-btn"
            onClick={handleAiQuery}
            disabled={aiTyping || !aiQuestion.trim()}
          >
            {aiTyping ? '···' : '↑发送'}
          </Button>
        </div>
      </div>

      <style jsx>{`
        .ai-tab { display: flex; flex-direction: column; height: 600px; background: var(--bg-cell); border-radius: var(--radius-card); border: 1px solid var(--border-color); overflow: hidden; position: relative; box-shadow: var(--shadow-md); }
        .ai-config-panel { padding: 12px 20px; border-bottom: 1px solid var(--border-color); background: var(--bg-hover); display: flex; align-items: center; justify-content: space-between; }
        .ai-config-row { display: flex; align-items: center; gap: 16px; }
        .config-select { height: 32px; padding: 0 12px; font-size: 13px; border-radius: 6px; width: 200px; }
        .glass-label { display: flex; align-items: center; gap: 8px; cursor: pointer; font-size: 13px; font-weight: 500; }
        .toggle-text { color: var(--text-primary); }

        .ai-messages { flex: 1; padding: 24px; overflow-y: auto; display: flex; flex-direction: column; gap: 24px; }
        .custom-scroll::-webkit-scrollbar { width: 6px; }
        .custom-scroll::-webkit-scrollbar-thumb { background: var(--border-color-strong); border-radius: 10px; }
        .custom-scroll::-webkit-scrollbar-track { background: transparent; }

        .ai-welcome { margin: auto; max-width: 500px; text-align: center; color: var(--text-primary); }
        .ai-brand { font-size: 56px; margin-bottom: 20px; filter: drop-shadow(0 0 20px rgba(7, 193, 96, 0.4)); animation: pulse 3s infinite; }
        .ai-welcome h3 { font-size: 24px; font-weight: 800; margin-bottom: 12px; }
        .ai-welcome p { font-size: 14px; color: var(--text-secondary); margin-bottom: 32px; }
        .quick-questions { display: flex; flex-direction: column; gap: 12px; }
        .quick-q { background: var(--bg-hover); border: 1px solid var(--border-color); padding: 14px 20px; border-radius: var(--radius-button); font-size: 14px; font-weight: 500; color: var(--text-primary); transition: all 0.2s; cursor: pointer; display: flex; align-items: center; justify-content: center; }
        .quick-q:hover { background: var(--bg-page); border-color: var(--primary); color: var(--primary); transform: translateY(-2px); box-shadow: var(--shadow-sm); }

        .ai-message { display: flex; }
        .ai-message.user { justify-content: flex-end; }
        .ai-bubble { max-width: 80%; }
        .msg-role { font-size: 11px; font-weight: 700; color: var(--text-tertiary); margin-bottom: 6px; margin-left: 2px; text-transform: uppercase; letter-spacing: 0.5px; }
        .ai-message.user .msg-role { text-align: right; margin-right: 2px; }
        .msg-content { background: var(--primary); color: white; padding: 14px 20px; border-radius: 20px 20px 0 20px; font-size: 15px; line-height: 1.6; box-shadow: 0 4px 14px rgba(7,193,96,0.25); }
        .ai-response { background: var(--bg-page); color: var(--text-primary); padding: 16px 24px; border-radius: 20px 20px 20px 0; font-size: 15px; line-height: 1.7; border: 1px solid var(--border-color); box-shadow: var(--shadow-sm); }

        .ai-input-area { padding: 20px; background: rgba(255, 255, 255, 0.8); backdrop-filter: blur(12px); border-top: 1px solid var(--border-color); display: flex; gap: 16px; align-items: flex-end; position: sticky; bottom: 0; z-index: 10; }
        :global([data-theme="dark"]) .ai-input-area { background: rgba(25, 25, 25, 0.8); }
        .ai-input-wrapper { flex: 1; display: flex; gap: 16px; align-items: flex-end; }
        .ai-textarea { flex: 1; height: 50px; min-height: 50px; max-height: 150px; padding: 14px 20px; border-radius: 25px; border: 1px solid var(--border-color-strong); background: var(--bg-cell); font-size: 15px; resize: none; transition: all 0.2s; line-height: 1.5; outline: none; }
        .ai-textarea:focus { border-color: var(--primary); box-shadow: 0 0 0 3px rgba(7,193,96,0.1); }
        :global(.send-btn) { border-radius: 25px !important; padding: 0 28px !important; height: 50px !important; font-size: 16px !important; font-weight: 600 !important; }
        
        .typing-indicator .ai-bubble { background: var(--bg-page); padding: 16px 24px; border-radius: 20px 20px 20px 0; border: 1px solid var(--border-color); display: flex; gap: 4px; align-items: center; }
        .dot { width: 6px; height: 6px; background: var(--text-tertiary); border-radius: 50%; animation: typing 1.4s infinite ease-in-out; }
        .dot:nth-child(1) { animation-delay: -0.32s; }
        .dot:nth-child(2) { animation-delay: -0.16s; }
        @keyframes typing { 0%, 80%, 100% { transform: scale(0); } 40% { transform: scale(1); } }
        
        .ai-feedback-actions { display: flex; justify-content: space-between; align-items: center; padding-top: 12px; margin-top: 12px; border-top: 1px solid var(--border-color); }
        .feedback-btn { background: transparent; border: none; color: var(--text-secondary); font-size: 13px; cursor: pointer; transition: all 0.2s; padding: 4px 8px; border-radius: 4px; }
        .feedback-btn:hover { background: var(--bg-hover); color: var(--primary); }
        .feedback-eval { display: flex; gap: 8px; }
      `}</style>
    </div>
  );
}
