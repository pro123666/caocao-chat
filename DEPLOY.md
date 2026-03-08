# 部署为公开网页（所有人可访问）

把「曹操」智能体部署到公网后，任何人打开链接即可使用，无需配置 API Key。

## 原理

- **开发环境**：前端直连智谱 API，需在本地 `.env` 配置 `VITE_ZHIPU_API_KEY`。
- **生产环境**：前端只请求本站 `/api/chat`，由 **服务端代理** 携带 API Key 再请求智谱，Key 不暴露给访客。

## 方式一：Vercel（推荐）

1. **推送代码到 GitHub**  
   在项目目录执行：
   ```bash
   git init
   git add .
   git commit -m "feat: 曹操智能体"
   git remote add origin https://github.com/你的用户名/你的仓库名.git
   git push -u origin main
   ```

2. **在 Vercel 创建项目**  
   - 打开 [vercel.com](https://vercel.com)，用 GitHub 登录。  
   - 点击 **Add New → Project**，导入该仓库。  
   - **Framework Preset** 选 Vite，**Root Directory** 保持默认。  
   - **Build Command**：`npm run build`  
   - **Output Directory**：`dist`  
   保持默认即可（与 `vercel.json` 一致）。

3. **配置环境变量**  
   - 在项目 **Settings → Environment Variables** 中新增：
     - **Name**：`ZHIPU_API_KEY`  
     - **Value**：你的智谱 API Key（与本地 `.env` 中一致）  
   - 可选：`ZHIPU_MODEL`，不填则默认 `glm-4-flash`。

4. **部署**  
   保存后重新 **Deploy**，或等 Git 推送后自动部署。  
   部署完成后会得到类似 `https://xxx.vercel.app` 的地址，**所有人打开该链接即可使用**，无需再填 Key。

## 方式二：Netlify

1. 代码推送到 GitHub（同上）。
2. 在 [Netlify](https://netlify.com) 选择 **Import from Git**，选中该仓库。
3. **Build command**：`npm run build`  
   **Publish directory**：`dist`
4. **Environment variables** 中添加：  
   - `ZHIPU_API_KEY` = 你的智谱 API Key
5. Netlify 默认不会识别 `api/` 为 serverless，需要把代理做成 **Netlify Function**（把当前 `api/chat.js` 迁到 `netlify/functions/chat.js` 并稍改导出格式），或改用 Vercel。

建议优先用 **Vercel**，本项目已按 Vercel 的 API 路由写好。

## 方式三：自有服务器 / 其他平台

- **前端**：执行 `npm run build`，把 `dist` 目录放到任意静态托管（Nginx、OSS、CDN 等）。
- **代理接口**：在能设置环境变量的后端（Node、Python、Java 等）实现一个 `POST /api/chat`：
  - 从环境变量读取 `ZHIPU_API_KEY`；
  - 请求体为 `{ "messages": [ { "role", "content" }, ... ] }`；
  - 在请求智谱前在 `messages` 最前面插入曹操人设的 `system` 消息；
  - 流式转发智谱的 SSE 响应给前端。
- **前端请求地址**：部署后前端访问的域名需与提供 `/api/chat` 的域名一致（同源），否则要配置 CORS 或反向代理。

## 安全说明

- API Key 只配置在 **服务端环境变量** 中，不要写进前端代码或提交到 Git。
- 若使用 Vercel，Key 只在服务端可见，访客无法在浏览器里拿到。

## 本地预览“生产模式”

不部署也能在本地模拟生产行为（走代理）：

1. 使用 Vercel CLI：`npx vercel dev`（需先 `npm i -g vercel` 并登录），在本地会同时起前端和 `api/chat`，并读取本地 `.env` 中的 `ZHIPU_API_KEY`（或 Vercel 项目环境变量）。
2. 或自建一个最小 Node 服务：用 `express` 挂载 `dist` 并实现 `POST /api/chat` 转发到智谱（逻辑参考 `api/chat.js`），用环境变量存 Key。

完成上述任一种部署后，把生成的链接发给他人，即可实现「所有人都能访问的曹操智能体」网页。
