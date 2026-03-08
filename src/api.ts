import type { Message } from './types';

const API_BASE = 'https://open.bigmodel.cn/api/paas/v4/chat/completions';

/** 从环境变量读取 API Key，Vite 要求客户端变量以 VITE_ 开头 */
function getApiKey(): string {
  const key = import.meta.env.VITE_ZHIPU_API_KEY;
  if (!key || typeof key !== 'string') {
    throw new Error('请设置环境变量 VITE_ZHIPU_API_KEY');
  }
  return key;
}

/** 从环境变量读取模型名，默认 glm-4-flash */
function getModel(): string {
  const model = import.meta.env.VITE_ZHIPU_MODEL;
  return (model && typeof model === 'string') ? model : 'glm-4-flash';
}

/** 曹操人设系统提示：以曹操身份回复，不暴露模型/产品名 */
const CAO_CAO_SYSTEM_PROMPT = `你是曹操（字孟德），东汉末年权臣、军事家、文学家。你正在与当代人对话，以第一人称「吾」「操」或「我」自称，语气符合古人但可稍作通俗以便理解。
你必须始终扮演曹操本人，不要打破角色。禁止提及：ChatGLM、智谱、GLM、豆包、大模型、AI、人工智能、语言模型、助手、程序等任何暗示你是机器的词汇。若被问及身份，你只回答自己是曹操。`;

/** 将 Message[] 转为 API 所需的 messages 格式（首条为 system 设定曹操人设） */
function toApiMessages(messages: Message[]): { role: 'user' | 'assistant' | 'system'; content: string }[] {
  const turnMessages = messages.map((m) => ({
    role: m.role as 'user' | 'assistant',
    content: m.content,
  }));
  return [{ role: 'system', content: CAO_CAO_SYSTEM_PROMPT }, ...turnMessages];
}

/** 将 API 错误转为用户可读的友好提示 */
function getFriendlyErrorMessage(status: number, body: string): string {
  try {
    const err = body ? JSON.parse(body) : {};
    const msg = err?.error?.message ?? (typeof err?.error === 'string' ? err.error : '');
    if (status === 401) return 'API Key 无效或已过期，请检查 .env 中的 VITE_ZHIPU_API_KEY 是否正确。';
    if (status === 429) return '请求过于频繁，请稍后再试。';
    if (status >= 500) return '服务暂时不可用，请稍后再试。';
    if (status === 400 && (msg.includes('model') || msg.includes('参数'))) return `请求参数有误：${msg}`;
    if (msg) return msg;
  } catch {
    // ignore
  }
  if (status === 401) return 'API Key 无效或已过期，请检查 .env 中的 VITE_ZHIPU_API_KEY。';
  if (status === 429) return '请求过于频繁，请稍后再试。';
  if (status >= 500) return '服务暂时不可用，请稍后再试。';
  return `请求失败 (${status})，请稍后重试。`;
}

/** 解析 SSE 行中的 JSON，提取 delta.content */
function parseSSELine(line: string): string | null {
  if (line.startsWith('data: ')) {
    const data = line.slice(6).trim();
    if (data === '[DONE]') return null;
    try {
      const json = JSON.parse(data);
      const content = json?.choices?.[0]?.delta?.content;
      return typeof content === 'string' ? content : null;
    } catch {
      return null;
    }
  }
  return null;
}

export interface StreamChatOptions {
  /** 历史消息（用于多轮对话） */
  messages: Message[];
  /** 收到每个文本片段时调用 */
  onChunk: (text: string) => void;
  /** 流式响应全部结束时调用 */
  onDone?: () => void;
  /** 发生错误时调用 */
  onError?: (error: Error) => void;
}

/**
 * 生产环境 API 地址：
 * - 若配置了 VITE_VERCEL_ORIGIN（国内 CDN 场景），接口直连 Vercel，页面走 CDN；
 * - 否则用同源 /api/chat（直接访问 Vercel 时）。
 */
function getChatUrl(): string {
  if (!import.meta.env.PROD) return API_BASE;
  const origin = import.meta.env.VITE_VERCEL_ORIGIN;
  if (origin && typeof origin === 'string') return origin.replace(/\/$/, '') + '/api/chat';
  return '/api/chat';
}

/** 生产环境走代理，不传 Key；开发环境直连智谱需 Key */
function getRequestInit(messages: Message[]): { method: string; headers: Record<string, string>; body: string } {
  const isProd = import.meta.env.PROD;
  if (isProd) {
    return {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: messages.map((m) => ({ role: m.role, content: m.content })),
      }),
    };
  }
  return {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${getApiKey()}`,
    },
    body: JSON.stringify({
      model: getModel(),
      messages: toApiMessages(messages),
      stream: true,
      temperature: 0.8,
    }),
  };
}

/**
 * 调用智谱 AI Chat Completions API，流式返回回复内容。
 * 生产环境：请求同源 /api/chat，由服务端带 Key 转发。
 * 开发环境：直连智谱，需配置 VITE_ZHIPU_API_KEY。
 */
export async function streamChat(options: StreamChatOptions): Promise<void> {
  const { messages, onChunk, onDone, onError } = options;

  try {
    const res = await fetch(getChatUrl(), getRequestInit(messages));

    if (!res.ok) {
      const text = await res.text();
      const message = getFriendlyErrorMessage(res.status, text);
      throw new Error(message);
    }

    const reader = res.body?.getReader();
    if (!reader) throw new Error('无法读取响应流');

    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';

      for (const line of lines) {
        const content = parseSSELine(line);
        if (content) onChunk(content);
      }
    }

    if (buffer) {
      const content = parseSSELine(buffer);
      if (content) onChunk(content);
    }

    onDone?.();
  } catch (err) {
    const raw = err instanceof Error ? err : new Error(String(err));
    const message =
      raw.message === 'Failed to fetch' || raw.message.includes('NetworkError')
        ? '网络连接失败，请检查网络后重试。'
        : raw.message;
    const error = new Error(message);
    onError?.(error);
    throw error;
  }
}
