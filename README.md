# 🎮 打字游戏乐园 (Typing Games)

一个专为儿童（6-12岁）设计的渐进式打字学习游戏平台，通过趣味游戏帮助孩子循序渐进地掌握键盘操作和打字技能。

## 🔗 线上体验地址

- 立即体验： https://www.youxiheai.xin/project/typinggames

## ✨ 项目特色

- 🎯 **渐进式学习**：从认识键盘到掌握指法，再到单词练习，循序渐进
- 🎮 **寓教于乐**：7款精心设计的游戏，让学习变得有趣
- 👥 **多人对战**：支持实时多人在线竞技
- 🌈 **儿童友好**：简单直观的界面设计
- 🚀 **无需安装**：基于Web的跨平台体验
- 📈 **即时反馈**：实时显示学习进度和成果

## 🎯 学习路径

### 第一阶段：认识键盘
- **🌾 键盘农场**：通过种植字母种子认识键盘布局
- **🫧 字母泡泡**：消除飘落的字母泡泡，熟悉键位

### 第二阶段：手指分工
- **👋 小手找家**：学习正确的手指位置和标准指法
- **🎵 音符跳跃**：跟随音乐节奏练习指法

### 第三阶段：简单词组
- **🐾 单词救援**：拼写单词救出可爱的小动物
- **🏎️ 打字赛车（单人版）**：输入单词让赛车飞驰

### 第四阶段：多人竞技
- **🏁 打字赛车（多人版）**：实时多人在线竞速对战

## 📂 项目结构

```
typing-games/
├── README.md                      # 项目说明文档
├── START.md                       # 快速启动指南
├── backend/                       # 后端服务器
│   ├── server.js                 # Node.js + Socket.io 服务器
│   ├── package.json              # 依赖配置
│   └── README.md                 # 服务器文档
└── frontend/                      # 前端游戏
    ├── index.html                # 游戏主页（游戏选择）
    ├── styles/
    │   └── main.css              # 全局样式
    ├── games/                    # 游戏集合
    │   ├── keyboard-farm.html    # 键盘农场
    │   ├── bubble-pop.html       # 字母泡泡
    │   ├── finger-home.html      # 小手找家
    │   ├── music-jump.html       # 音符跳跃
    │   ├── word-rescue.html      # 单词救援
    │   ├── typing-racer.html     # 打字赛车（单人版）
    │   └── typing-racer-multiplayer/  # 打字赛车（多人版）
    │       ├── index.html        # 游戏大厅
    │       ├── client.js         # 客户端逻辑
    │       └── styles.css        # 游戏样式
    └── docs/                     # 文档
        └── 多人对战赛车游戏设计文档.md
```

## 🚀 快速开始

### 环境要求

- **Node.js**: >= 18.0.0
- **浏览器**: 现代浏览器（Chrome、Firefox、Safari、Edge）

### 运行单人游戏

单人游戏（前6款）无需后端服务器，直接打开HTML文件即可：

1. 用浏览器直接打开 `frontend/index.html`
2. 选择任意单人游戏开始体验

### 运行多人对战游戏

多人对战游戏需要启动后端服务器：

#### 1. 启动后端服务器

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

#### 2. 启动前端游戏

**方式一：使用 Live Server（推荐）**
1. 安装 VS Code 的 Live Server 扩展
2. 在 VS Code 中打开 `frontend/games/typing-racer-multiplayer/index.html`
3. 右键选择 "Open with Live Server"

**方式二：直接打开文件**
1. 用浏览器直接打开 `frontend/games/typing-racer-multiplayer/index.html`

**方式三：使用 Python 简单服务器**
```bash
# 在 frontend 目录下运行
cd frontend
python -m http.server 8080

# 然后访问：http://localhost:8080/games/typing-racer-multiplayer/
```

#### 3. 开始游戏

1. 输入昵称进入游戏大厅
2. 创建房间或加入现有房间
3. 等待其他玩家加入（支持1-4人）
4. 房主点击"开始游戏"
5. 快速准确地输入单词，完成竞速！

## 🎮 游戏介绍

### 🌾 键盘农场
通过种植字母种子认识键盘上的26个字母，每输入一个字母就能种下一颗种子，收获美味的水果。

### 🫧 字母泡泡
字母泡泡从天而降，快速按下对应的键让泡泡消失，练习快速识别和按键。

### 👋 小手找家
学习标准指法，认识基准键位（ASDF JKL;），让每个手指都找到自己的家。

### 🎵 音符跳跃
跟随音乐节奏输入字母，在欢快的节奏中练习指法，提升肌肉记忆。

### 🐾 单词救援
可爱的小动物被困住了！输入正确的单词就能救出它们，开始学习简单的英文单词拼写。

### 🏎️ 打字赛车（单人版）
输入单词让赛车前进，挑战自己的打字速度，看看能否创造新纪录！

### 🏁 打字赛车（多人版）
与全球玩家实时竞技！创建房间或加入房间，支持1-4人同时对战。通过快速准确地输入单词推进赛车，第一个完成20个单词的玩家获胜！

**特色功能**：
- 实时同步进度
- 三种难度选择（简单/中等/困难）
- 房间系统（创建/加入/准备）
- 倒计时开始
- 实时排名显示
- 比赛结果展示

## 🛠️ 技术栈

### 前端
- **HTML5 + CSS3**：游戏界面和样式
- **原生 JavaScript (ES6+)**：游戏逻辑
- **Socket.io Client**：实时通信（仅多人游戏）

### 后端（仅多人游戏）
- **Node.js + Express**：Web服务器
- **Socket.io**：WebSocket实时通信
- **内存存储**：房间和玩家数据管理

### 特点
- ✅ 零依赖前端（单人游戏）
- ✅ 轻量级架构
- ✅ 无需数据库
- ✅ 即时部署

## 📝 开发说明

### 添加新游戏

1. 在 `frontend/games/` 目录下创建新的HTML文件
2. 在 `frontend/index.html` 中添加游戏卡片
3. 按照现有游戏的结构实现游戏逻辑

### 修改单词库

编辑 `backend/server.js` 中的 `wordBank` 对象：

```javascript
const wordBank = {
    easy: ['cat', 'dog', 'sun', ...],
    medium: ['apple', 'happy', 'water', ...],
    hard: ['computer', 'rainbow', 'elephant', ...]
};
```

### 自定义样式

- 全局样式：编辑 `frontend/styles/main.css`
- 游戏特定样式：在各游戏HTML文件的 `<style>` 标签中修改

## 🎯 适用场景

- 👨‍👩‍👧‍👦 **家庭教育**：家长陪伴孩子一起学习打字
- 🏫 **学校教学**：计算机课程的打字训练工具
- 👨‍🏫 **培训机构**：打字课程的辅助教学软件
- 🎮 **自主学习**：孩子在游戏中自主练习打字

## 📊 学习效果

通过完整的学习路径，孩子将掌握：

1. ✅ 键盘布局的基本认识
2. ✅ 标准的手指分工和指法
3. ✅ 盲打的基本技能
4. ✅ 简单英文单词的拼写
5. ✅ 提升打字速度和准确度
6. ✅ 在竞争中提升学习动力

## 🤝 贡献指南

欢迎提交 Issue 和 Pull Request！

1. Fork 本仓库
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 提交 Pull Request

## 📄 许可证

本项目采用 MIT 许可证 - 详见 [LICENSE](LICENSE) 文件

## 📮 联系方式

如有问题或建议，欢迎：
- 提交 Issue
- 发送 Pull Request
- 在讨论区交流

## 🎉 致谢

感谢所有为这个项目做出贡献的开发者和测试者！

---

**让学习打字成为一场快乐的游戏之旅！** 🎮✨
