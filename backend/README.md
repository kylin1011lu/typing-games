# 打字赛车游戏服务器

## 安装依赖

```bash
npm install
```

## 启动服务器

```bash
# 生产环境
npm start

# 开发环境（自动重启）
npm run dev
```

## 服务器配置

- 默认端口：3000
- WebSocket：Socket.io
- 跨域：已启用 CORS

## API 端点

- `GET /health` - 健康检查

## WebSocket 事件

### 客户端 → 服务器
- `CREATE_ROOM` - 创建房间
- `JOIN_ROOM` - 加入房间
- `LEAVE_ROOM` - 离开房间
- `TOGGLE_READY` - 切换准备状态
- `START_GAME` - 开始游戏（房主）
- `UPDATE_PROGRESS` - 更新游戏进度
- `FINISH_GAME` - 完成游戏

### 服务器 → 客户端
- `ROOM_CREATED` - 房间创建成功
- `ROOM_LIST_UPDATE` - 房间列表更新
- `PLAYER_JOINED` - 玩家加入
- `PLAYER_LEFT` - 玩家离开
- `READY_STATUS_CHANGED` - 准备状态变化
- `GAME_COUNTDOWN` - 游戏倒计时
- `GAME_START` - 游戏开始
- `PROGRESS_UPDATE` - 进度更新
- `PLAYER_FINISHED` - 玩家完成
- `GAME_END` - 游戏结束
- `ERROR` - 错误消息

## 数据存储

使用内存存储（Map对象），无需数据库：
- 房间数据：1小时后自动过期
- 玩家数据：临时存储
- 服务器重启数据丢失（预期行为）

## 部署建议

- Railway
- Render
- Heroku
- DigitalOcean
