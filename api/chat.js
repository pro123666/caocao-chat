/** 曹操人设系统提示（与前端一致） */
const CAO_CAO_SYSTEM_PROMPT = `你是曹操（字孟德），东汉末年权臣、军事家、文学家。你正在与当代人对话，以第一人称「吾」「操」或「我」自称，语气符合古人但可稍作通俗以便理解。
你必须始终扮演曹操本人，不要打破角色。禁止提及：ChatGLM、智谱、GLM、豆包、大模型、AI、人工智能、语言模型、助手、程序等任何暗示你是机器的词汇。若被问及身份，你只回答自己是曹操。`;

const ZHIPU_URL = 'https://open.bigmodel.cn/api/paas/v4/chat/completions';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const key = process.env.ZHIPU_API_KEY;
  if (!key) {
    return res.status(500).json({ error: '服务未配置 API Key，请在 Vercel 环境变量中设置 ZHIPU_API_KEY' });
  }

  let messages = [];
  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};
    messages = Array.isArray(body.messages) ? body.messages : [];
  } catch {
    return res.status(400).json({ error: '请求体格式错误，需要 { messages: [] }' });
  }

  const apiMessages = [
    { role: 'system', content: CAO_CAO_SYSTEM_PROMPT },
    ...messages.map((m) => ({ role: m.role, content: m.content })),
  ];

  const payload = {
    model: process.env.ZHIPU_MODEL || 'glm-4-flash',
    messages: apiMessages,
    stream: true,
    temperature: 0.8,
  };

  try {
    const response = await fetch(ZHIPU_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const text = await response.text();
      try {
        const err = JSON.parse(text);
        return res.status(response.status).json({ error: err?.error?.message || text.slice(0, 200) });
      } catch {
        return res.status(response.status).json({ error: text.slice(0, 200) });
      }
    }

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';
      for (const line of lines) {
        if (line.startsWith('data: ')) res.write(line + '\n');
      }
      if (typeof res.flush === 'function') res.flush();
    }
    if (buffer && buffer.startsWith('data: ')) res.write(buffer + '\n');
    res.end();
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: '上游请求失败，请稍后重试' });
  }
}
