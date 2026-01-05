# 🏎️ 打字赛车多人对战游戏 - 快速启动指南

## 📁 项目结构

```
typing-games/
├── backend/                 # 后端服务器
│   ├── server.js           # Node.js + Socket.io 服务器
│   ├── package.json        # 依赖配置
│   └── README.md           # 服务器文档
└── games/typing-racer-multiplayer/  # 前端游戏
    ├── index.html          # 游戏大厅（昵称、创建/加入房间）
    ├── room.html           # 房间等待页面（准备、倒计时）
    ├── game.html           # 游戏对战页面（4赛道竞速）
    ├── client.js           # Socket.io 客户端
    └── styles.css          # 样式文件
```

## 🚀 启动步骤

### 1. 启动后端服务器

```bash
# 进入后端目录
cd backend

# 安装依赖（首次运行）
npm install

# 启动服务器
npm start

# 或使用开发模式（自动重启）
npm run dev
```

服务器将运行在：`http://localhost:3000`

### 2. 启动前端游戏

**方式一：使用 VS Code Live Server**
1. 在 VS Code 中打开 `games/typing-racer-multiplayer/index.html`
2. 右键选择 "Open with Live Server"
3. 游戏将在浏览器中打开

**方式二：直接打开文件**
1. 用浏览器直接打开 `games/typing-racer-multiplayer/index.html`
2. 注意：需要确保服务器已启动

**方式三：使用 Python 简单服务器**
```bash
cd games/typing-racer-multiplayer
python3 -m http.server 8080
# 然后访问 http://localhost:8080
```

## 🎮 游戏流程

1. **输入昵称**
   - 首次进入会弹出昵称输入框
   - 昵称保存在 localStorage 中

2. **创建或加入房间**
   - 创建房间：设置房间名称、最大人数、难度
   - 加入房间：输入6位房间号或点击房间列表

3. **房间等待**
   - 非房主点击"准备"
   - 房主等所有人准备后点击"开始游戏"
   - 3秒倒计时后进入游戏

4. **开始比赛**
   - 输入20个单词
   - 实时显示4条赛道和排名
   - 按回车键提交单词

5. **查看结果**
   - 游戏结束后显示排名
   - 可选择"再来一局"或"返回大厅"

## 🔧 配置说明

### 修改服务器地址

如果部署到线上，需要修改前端的服务器地址：

**修改以下3个文件中的 serverUrl：**
- `games/typing-racer-multiplayer/index.html` (第80行)
- `games/typing-racer-multiplayer/room.html` (第172行)
- `games/typing-racer-multiplayer/game.html` (第316行)

```javascript
// 本地开发
const serverUrl = 'http://localhost:3000';

// 线上部署（替换为你的服务器地址）
const serverUrl = 'https://your-server.com';
```

### 修改单词库

编辑 `backend/server.js` 第17-21行的 `wordBank` 对象：

```javascript
const wordBank = {
    easy: ['cat', 'dog', ...],
    medium: ['apple', 'happy', ...],
    hard: ['computer', 'rainbow', ...]
};
```

### 修改房间过期时间

编辑 `backend/server.js` 第173行：

```javascript
expiresAt: now + (60 * 60 * 1000) // 1小时，可修改为其他时间
```

## 📊 健康检查

访问 `http://localhost:3000/health` 查看服务器状态：

```json
{
  "status": "ok",
  "timestamp": 1704326400000,
  "rooms": 2,
  "players": 5
}
```

## 🐛 常见问题

### 1. 前端无法连接服务器
- 确认后端服务器已启动
- 检查防火墙是否阻止端口 3000
- 查看浏览器控制台错误信息

### 2. 房间列表为空
- 刷新页面
- 创建新房间测试
- 检查服务器控制台日志

### 3. 游戏卡顿
- 关闭其他占用资源的程序
- 检查网络连接
- 减少浏览器标签页

### 4. 输入无反应
- 点击输入框确保聚焦
- 检查是否使用了正确的键盘布局
- 刷新页面重试

## 🚢 部署建议

### 后端部署

**推荐平台：**
- Railway (https://railway.app)
- Render (https://render.com)
- Heroku (https://heroku.com)

**部署步骤（以 Railway 为例）：**
1. 注册 Railway 账号
2. 新建项目，选择 "Deploy from GitHub"
3. 连接你的仓库
4. 设置根目录为 `backend`
5. Railway 会自动检测 Node.js 项目并部署

### 前端部署

**推荐平台：**
- Vercel (https://vercel.com)
- Netlify (https://netlify.com)
- GitHub Pages

**部署步骤（以 Vercel 为例）：**
1. 注册 Vercel 账号
2. 导入 GitHub 仓库
3. 设置根目录为 `games/typing-racer-multiplayer`
4. 部署前记得修改 serverUrl 为后端地址

## 📝 待优化功能

- [ ] 添加音效（完成单词、错误提示、游戏结束）
- [ ] 添加动画效果（赛车移动、排名变化）
- [ ] 添加聊天功能
- [ ] 添加游戏回放
- [ ] 添加个人统计数据
- [ ] 添加排行榜
- [ ] 支持自定义单词库

## 📞 技术支持

遇到问题请查看：
- 后端日志：`backend` 目录下的终端输出
- 前端日志：浏览器开发者工具 Console 面板
- 网络请求：浏览器开发者工具 Network 面板

---

**祝你游戏愉快！🎉**
