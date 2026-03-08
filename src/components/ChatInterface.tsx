import { useState, useRef, useEffect, useCallback } from 'react';
import type { Message, Conversation } from '../types';
import { streamChat } from '../api';
import { MarkdownMessage } from './MarkdownMessage';

const STORAGE_KEY = 'ai-chat-conversations';
const LEGACY_KEY = 'ai-chat-messages';

function CopyButton({ text, className = '' }: { text: string; className?: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };
  return (
    <button
      type="button"
      onClick={handleCopy}
      className={`rounded p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 ${className}`}
      title="复制"
    >
      {copied ? (
        <span className="text-xs text-[#07C160]">已复制</span>
      ) : (
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
        </svg>
      )}
    </button>
  );
}

function isValidMessage(m: unknown): m is Message {
  return (
    typeof m === 'object' &&
    m !== null &&
    'role' in m &&
    (m as Message).role in { user: 1, assistant: 1 } &&
    typeof (m as Message).content === 'string' &&
    typeof (m as Message).timestamp === 'number'
  );
}

function isValidConversation(c: unknown): c is Conversation {
  if (typeof c !== 'object' || c === null || !('id' in c) || !('title' in c) || !('messages' in c) || !('createdAt' in c))
    return false;
  const conv = c as Conversation;
  return (
    typeof conv.id === 'string' &&
    typeof conv.title === 'string' &&
    typeof conv.createdAt === 'number' &&
    Array.isArray(conv.messages) &&
    conv.messages.every(isValidMessage)
  );
}

function loadConversationsFromStorage(): Conversation[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const data = JSON.parse(raw);
      if (Array.isArray(data) && data.every(isValidConversation)) return data;
    }
    // 迁移旧版单对话数据
    const legacy = localStorage.getItem(LEGACY_KEY);
    if (legacy) {
      const list = JSON.parse(legacy);
      const messages = Array.isArray(list) ? list.filter(isValidMessage) : [];
      if (messages.length > 0) {
        const firstUser = messages.find((m) => m.role === 'user');
        const title = firstUser ? firstUser.content.slice(0, 20).trim() || '新对话' : '新对话';
        const conv: Conversation = {
          id: crypto.randomUUID(),
          title: title.length >= 20 ? title + '…' : title,
          messages,
          createdAt: messages[0]?.timestamp ?? Date.now(),
        };
        const next = [conv];
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
        try {
          localStorage.removeItem(LEGACY_KEY);
        } catch {
          /**/
        }
        return next;
      }
    }
  } catch {
    /**/
  }
  return [];
}

function saveConversationsToStorage(conversations: Conversation[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(conversations));
  } catch {
    /**/
  }
}

function generateId() {
  return crypto.randomUUID();
}

/** 曹操头像：圆形 + 曹字，古典风格 */
function CaoCaoAvatar({ size = 40, className = '' }: { size?: number; className?: string }) {
  return (
    <div
      className={`flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-amber-800 to-amber-950 text-white font-bold shadow-inner ${className}`}
      style={{ width: size, height: size, fontSize: size * 0.5 }}
      title="曹操"
    >
      曹
    </div>
  );
}

const SUGGESTED_PROMPTS = [
  '写一篇小学生日记',
  '分析一段代码',
  '写一份周报',
  '今天适合吃什么？',
  '写一首古诗',
  '如何学好英语',
];

export function ChatInterface() {
  const [conversations, setConversations] = useState<Conversation[]>(loadConversationsFromStorage);
  const [currentId, setCurrentId] = useState<string | null>(() => {
    const list = loadConversationsFromStorage();
    return list.length > 0 ? list[0].id : null;
  });
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(() =>
    typeof window !== 'undefined' ? !window.matchMedia('(max-width: 768px)').matches : true
  );
  const listEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const current = currentId ? conversations.find((c) => c.id === currentId) : null;
  const messages = current?.messages ?? [];

  const updateCurrentMessages = useCallback(
    (updater: (prev: Message[]) => Message[]) => {
      if (!currentId) return;
      setConversations((prev) =>
        prev.map((c) => (c.id === currentId ? { ...c, messages: updater(c.messages) } : c))
      );
    },
    [currentId]
  );

  const updateCurrentTitle = useCallback(
    (title: string) => {
      if (!currentId) return;
      setConversations((prev) => prev.map((c) => (c.id === currentId ? { ...c, title } : c)));
    },
    [currentId]
  );

  const updateConversationById = useCallback((id: string, updater: (prev: Message[]) => Message[]) => {
    setConversations((prev) => prev.map((c) => (c.id === id ? { ...c, messages: updater(c.messages) } : c)));
  }, []);

  // 新消息出现时自动滚动到底部
  useEffect(() => {
    const el = scrollContainerRef.current;
    if (el) el.scrollTop = el.scrollHeight;
    listEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // 对话列表更新后自动保存
  useEffect(() => {
    const timer = setTimeout(() => saveConversationsToStorage(conversations), 500);
    return () => clearTimeout(timer);
  }, [conversations]);

  const handleNewConversation = () => {
    const conv: Conversation = {
      id: generateId(),
      title: '新对话',
      messages: [],
      createdAt: Date.now(),
    };
    setConversations((prev) => [conv, ...prev]);
    setCurrentId(conv.id);
    setError(null);
    inputRef.current?.focus();
  };

  const handleSelectConversation = (id: string) => {
    setCurrentId(id);
    setError(null);
    if (window.matchMedia('(max-width: 768px)').matches) setSidebarOpen(false);
  };

  const handleDeleteConversation = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setConversations((prev) => prev.filter((c) => c.id !== id));
    if (currentId === id) {
      const rest = conversations.filter((c) => c.id !== id);
      setCurrentId(rest.length > 0 ? rest[0].id : null);
    }
    setError(null);
  };

  const handleClear = () => {
    if (!currentId) return;
    setConversations((prev) => prev.map((c) => (c.id === currentId ? { ...c, messages: [] } : c)));
    setError(null);
  };

  const sendMessage = useCallback(
    async (text: string) => {
      if (!text.trim() || loading) return;
      setError(null);
      const userMessage: Message = {
        role: 'user',
        content: text.trim(),
        timestamp: Date.now(),
      };
      const assistantMessage: Message = {
        role: 'assistant',
        content: '',
        timestamp: Date.now(),
      };
      const history: Message[] = currentId
        ? [...(conversations.find((c) => c.id === currentId)?.messages ?? []), userMessage]
        : [userMessage];
      let conversationId = currentId;

      if (!currentId) {
        const newId = generateId();
        const title = text.length > 20 ? text.slice(0, 20).trim() + '…' : text.trim();
        const newConv: Conversation = {
          id: newId,
          title,
          messages: [userMessage, assistantMessage],
          createdAt: Date.now(),
        };
        setConversations((prev) => [newConv, ...prev]);
        setCurrentId(newId);
        conversationId = newId;
      } else {
        updateCurrentMessages((prev) => [...prev, userMessage]);
        updateCurrentMessages((prev) => [...prev, assistantMessage]);
        const conv = conversations.find((c) => c.id === currentId);
        if (conv?.title === '新对话' || !conv?.messages.length) {
          const title = text.length > 20 ? text.slice(0, 20).trim() + '…' : text.trim();
          updateCurrentTitle(title);
        }
      }

      setLoading(true);
      const updateMessages = (updater: (prev: Message[]) => Message[]) =>
        updateConversationById(conversationId!, updater);

      try {
        await streamChat({
          messages: history,
          onChunk(chunk) {
            updateMessages((prev) => {
              const next = [...prev];
              const last = next[next.length - 1];
              if (last.role === 'assistant') next[next.length - 1] = { ...last, content: last.content + chunk };
              return next;
            });
          },
          onDone() {
            setLoading(false);
            inputRef.current?.focus();
          },
          onError(err) {
            setError(err.message);
            updateMessages((prev) => {
              const next = [...prev];
              const last = next[next.length - 1];
              if (last.role === 'assistant' && !last.content)
                next[next.length - 1] = { ...last, content: '回复失败，请查看下方错误说明或重新发送。' };
              return next;
            });
            setLoading(false);
          },
        });
      } catch {
        setLoading(false);
      }
    },
    [
      loading,
      currentId,
      conversations,
      updateCurrentMessages,
      updateCurrentTitle,
      updateConversationById,
    ]
  );

  const handleSend = async () => {
    const text = input.trim();
    if (!text) return;
    setInput('');
    await sendMessage(text);
  };

  const handleSuggestedPrompt = (text: string) => {
    sendMessage(text);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const sortedConversations = [...conversations].sort((a, b) => b.createdAt - a.createdAt);

  return (
    <div className="flex flex-1 min-h-0 gap-0 bg-[#f5f5f5] relative overflow-hidden">
      {/* 移动端遮罩：点击关闭侧边栏 */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/30 md:hidden"
          aria-hidden
          onClick={() => setSidebarOpen(false)}
        />
      )}
      {/* 左侧：品牌 + 历史记录（小屏抽屉 + 大屏可收起，宽度缩小） */}
      <aside
        className={`
          shrink-0 flex flex-col border-r border-gray-200 bg-[#fafafa] transition-transform duration-200 ease-out
          w-52 max-w-[85vw]
          fixed md:relative inset-y-0 left-0 z-40 md:z-auto
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        <div className="flex items-center justify-between gap-2 px-3 py-3 border-b border-gray-100">
          <div className="flex items-center gap-2 min-w-0">
            <CaoCaoAvatar size={32} />
            <span className="text-base font-semibold text-gray-800 truncate">曹操</span>
          </div>
          <button
            type="button"
            onClick={() => setSidebarOpen(false)}
            className="rounded p-1.5 text-gray-500 hover:bg-gray-200"
            title="收起侧边栏"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <button
          type="button"
          onClick={handleNewConversation}
          className="mx-2 mt-2 flex items-center justify-center gap-1.5 rounded-lg py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-[#e8f4ec] focus:outline-none focus:ring-1 focus:ring-[#07C160]/30"
          style={{ backgroundColor: sortedConversations.length === 0 ? 'rgba(7, 193, 96, 0.12)' : undefined }}
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          新对话
        </button>
        <div className="flex-1 overflow-y-auto px-2 py-2">
          {sortedConversations.length === 0 ? (
            <p className="px-2 py-4 text-center text-xs text-gray-400">暂无历史对话</p>
          ) : (
            <ul className="space-y-0.5">
              {sortedConversations.map((c) => (
                <li
                  key={c.id}
                  className={`group/item flex items-center gap-1 rounded-lg transition-colors ${
                    c.id === currentId ? 'bg-[#e8f4ec]' : 'hover:bg-gray-100'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => handleSelectConversation(c.id)}
                    className={`min-w-0 flex-1 rounded-lg px-3 py-2.5 text-left text-sm text-gray-900 transition-colors ${
                      c.id === currentId ? 'text-gray-900' : 'text-gray-600'
                    }`}
                  >
                    <span className="line-clamp-2 block">{c.title}</span>
                  </button>
                  <button
                    type="button"
                    onClick={(e) => handleDeleteConversation(e, c.id)}
                    className="shrink-0 rounded p-1.5 text-gray-400 opacity-0 transition-opacity hover:bg-red-50 hover:text-red-500 group-hover/item:opacity-100"
                    title="删除对话"
                  >
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="border-t border-gray-100 px-4 py-3">
          <a
            href="#"
            className="text-xs text-gray-400 hover:text-gray-600"
            onClick={(e) => e.preventDefault()}
          >
            关于曹操
          </a>
        </div>
      </aside>

      {/* 右侧：当前对话（手机端全宽，桌面端最大 3xl） */}
      <div className="flex min-w-0 flex-1 flex-col bg-white w-full">
        <div className="flex flex-col flex-1 min-h-0 w-full max-w-3xl mx-auto bg-white overflow-hidden">
          {/* 顶部工具栏：展开侧边栏 + 清空 + 刷新 */}
          <div className="shrink-0 flex items-center justify-between gap-2 px-3 py-2 border-b border-gray-100">
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              className={`rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-700 ${sidebarOpen ? 'hidden' : ''}`}
              title="展开侧边栏"
              aria-label="展开侧边栏"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <div className="flex-1" />
            {current && messages.length > 0 && (
              <button
                type="button"
                onClick={handleClear}
                disabled={loading}
                className="rounded-lg px-3 py-1.5 text-xs text-gray-500 hover:bg-gray-100 hover:text-gray-700 disabled:opacity-50"
              >
                清空对话
              </button>
            )}
            <button
              type="button"
              onClick={() => currentId && setCurrentId(currentId)}
              className="rounded-lg px-2 py-1.5 text-xs text-gray-500 hover:bg-gray-100 hover:text-gray-700"
              title="刷新"
            >
              刷新
            </button>
          </div>
          {/* 消息列表 */}
          <div ref={scrollContainerRef} className="flex-1 overflow-y-auto overflow-x-hidden p-3 sm:p-4 space-y-3 min-h-0">
            {!current ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <p className="text-gray-500 text-sm">点击左侧「新对话」开始</p>
                <button
                  type="button"
                  onClick={handleNewConversation}
                  className="mt-4 rounded-lg bg-[#07C160] px-4 py-2 text-sm font-medium text-white hover:bg-[#06AD56]"
                >
                  新对话
                </button>
              </div>
            ) : messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12">
                <div className="flex items-center gap-3 mb-6">
                  <CaoCaoAvatar size={48} />
                  <p className="text-xl text-gray-800">你好，我是曹操</p>
                </div>
                <p className="text-sm text-gray-500 mb-6">有什么想聊的？可以试试下面这些</p>
                <div className="flex flex-wrap justify-center gap-2 max-w-xl">
                  {SUGGESTED_PROMPTS.map((prompt) => (
                    <button
                      key={prompt}
                      type="button"
                      onClick={() => handleSuggestedPrompt(prompt)}
                      disabled={loading}
                      className="rounded-full border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-700 shadow-sm transition-colors hover:border-[#07C160]/50 hover:bg-[#f0fdf4] disabled:opacity-50"
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}
            {current && messages.map((msg) => (
              <div
                key={msg.timestamp}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`chat-bubble relative max-w-[75%] px-4 py-2.5 group transition-all duration-200 hover:shadow-md ${
                    msg.role === 'user'
                      ? 'rounded-2xl rounded-br-md bg-gradient-to-br from-[#95EC69] to-[#7dd957] text-gray-900 shadow-[0_2px_8px_rgba(117,217,87,0.25)]'
                      : 'rounded-2xl rounded-bl-md bg-white text-gray-800 shadow-[0_2px_12px_rgba(0,0,0,0.06)] border border-gray-100/80 hover:shadow-[0_4px_16px_rgba(0,0,0,0.08)]'
                  }`}
                >
                  {msg.role === 'user' ? (
                    <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">{msg.content}</p>
                  ) : (
                    <>
                      <MarkdownMessage content={msg.content || '…'} />
                      {msg.content && (
                        <CopyButton text={msg.content} className="absolute top-1.5 right-1.5 opacity-60 group-hover:opacity-100 transition-opacity" />
                      )}
                    </>
                  )}
                </div>
              </div>
            ))}
            {current && loading && messages[messages.length - 1]?.role === 'assistant' && !messages[messages.length - 1]?.content && (
              <div className="flex justify-start">
                <div className="rounded-2xl rounded-bl-md bg-white px-4 py-2.5 shadow-[0_2px_12px_rgba(0,0,0,0.06)] border border-gray-100/80">
                  <span className="inline-block w-2 h-2 rounded-full bg-gray-400 animate-pulse" />
                </div>
              </div>
            )}
            <div ref={listEndRef} />
          </div>

          {/* 错误提示 */}
          {error && (
            <div className="px-4 py-2.5 bg-red-50 text-red-700 text-sm border-t border-red-100">
              <p className="font-medium">请求出错</p>
              <p className="mt-0.5 text-red-600">{error}</p>
              <p className="mt-1 text-xs text-red-500">可重新发送消息重试</p>
            </div>
          )}

          {/* 底部输入区：仅当前有对话时显示（豆包风格圆角输入框） */}
          {current && (
            <div className="shrink-0 border-t border-gray-100 bg-white p-4">
              {loading && (
                <p className="text-xs text-gray-500 mb-2 flex items-center gap-1.5">
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#07C160] animate-pulse" />
                  思考中...
                </p>
              )}
              <div className="flex gap-2 items-end rounded-2xl border border-gray-200 bg-gray-50/50 pl-4 pr-2 py-2 focus-within:border-[#07C160]/50 focus-within:bg-white focus-within:ring-1 focus-within:ring-[#07C160]/20">
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={loading ? '思考中...' : '发消息输入...'}
                  rows={1}
                  disabled={loading}
                  className="flex-1 resize-none bg-transparent py-2.5 text-sm focus:outline-none disabled:text-gray-500 min-h-[40px] max-h-32"
                />
                <button
                  type="button"
                  onClick={handleSend}
                  disabled={loading || !input.trim()}
                  className="shrink-0 rounded-full p-2.5 text-[#07C160] hover:bg-[#07C160]/10 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  title="发送"
                >
                  <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
                  </svg>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
