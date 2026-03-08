/** 消息角色 */
export type MessageRole = 'user' | 'assistant';

/** 单条聊天消息 */
export interface Message {
  /** 角色：用户或 AI 助手 */
  role: MessageRole;
  /** 消息内容 */
  content: string;
  /** 时间戳（毫秒） */
  timestamp: number;
}

/** 单次对话（历史记录项） */
export interface Conversation {
  /** 唯一 id */
  id: string;
  /** 标题（如首条用户消息截断） */
  title: string;
  /** 消息列表 */
  messages: Message[];
  /** 创建时间（毫秒） */
  createdAt: number;
}
