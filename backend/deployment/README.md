# 云服务器部署指南

## 脚本说明

`deploy.sh` 脚本可以将打字游戏后端部署到任何 Linux 云服务器（VPS）。支持的云平台包括：
- 阿里云 ECS
- 腾讯云 CVM
- AWS EC2
- Azure Virtual Machine
- DigitalOcean Droplet
- 其他 Linux VPS

## 前置要求

### 1. 服务器环境
- **操作系统**: Ubuntu 20.04+ / CentOS 7+ / Debian 10+
- **Node.js**: >= 18.0.0
- **RAM**: 至少 512MB（推荐 1GB+）
- **磁盘**: 至少 1GB 可用空间

### 2. 本地环境
- **SSH 客户端**: 用于连接服务器
- **rsync**: 用于文件同步（Mac/Linux自带，Windows需安装）

### 3. 服务器安全配置
- 开放端口 3000（或自定义端口）
- 配置防火墙规则允许 WebSocket 连接
- 设置 SSH 密钥登录（推荐）

## 快速部署步骤

### 第一步：配置服务器信息

1. 复制环境配置模板：
```bash
cd backend/deployment
cp .env.example .env
```

2. 编辑 `.env` 文件，填写您的服务器信息：
```bash
SERVER_USER=root                              # SSH 用户名
SERVER_IP=123.456.789.123                     # 服务器公网IP
REMOTE_PATH=/var/www/typing-games/backend     # 服务器部署路径
APP_NAME=typing-games-backend                 # PM2 应用名称
NODE_ENV=production                           # 运行环境
PORT=3000                                     # 服务端口
```

### 第二步：配置 SSH 密钥登录（推荐）

避免每次输入密码：

```bash
# 生成 SSH 密钥（如果还没有）
ssh-keygen -t rsa -b 4096

# 将公钥复制到服务器
ssh-copy-id root@your-server-ip

# 测试连接（应该无需密码）
ssh root@your-server-ip
```

### 第三步：服务器初始化（首次部署）

SSH 登录到服务器，安装必要软件：

```bash
# 登录服务器
ssh root@your-server-ip

# 更新系统
apt update && apt upgrade -y  # Ubuntu/Debian
# yum update -y               # CentOS

# 安装 Node.js 18.x
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt install -y nodejs  # Ubuntu/Debian
# yum install -y nodejs  # CentOS

# 验证安装
node -v  # 应显示 v18.x.x
npm -v

# 全局安装 PM2
npm install -g pm2

# 创建部署目录
mkdir -p /var/www/typing-games/backend

# 配置防火墙（Ubuntu/Debian）
ufw allow 3000/tcp
ufw allow 22/tcp
ufw enable

# 配置防火墙（CentOS）
# firewall-cmd --permanent --add-port=3000/tcp
# firewall-cmd --permanent --add-port=22/tcp
# firewall-cmd --reload
```

### 第四步：执行部署

在**本地**项目的 `backend/deployment` 目录下运行：

```bash
cd backend/deployment
chmod +x deploy.sh
./deploy.sh
```

脚本将自动：
1. ✅ 同步代码到服务器
2. ✅ 安装 npm 依赖
3. ✅ 使用 PM2 启动/重启服务
4. ✅ 配置进程守护

### 第五步：验证部署

```bash
# 检查服务状态
ssh root@your-server-ip "pm2 list"

# 查看日志
ssh root@your-server-ip "pm2 logs typing-games-backend"

# 测试服务
curl http://your-server-ip:3000/health
```

应该返回：
```json
{
  "status": "ok",
  "timestamp": 1704585600000,
  "rooms": 0,
  "players": 0
}
```

## 更新前端配置

部署后，需要更新前端的服务器地址：

编辑 `frontend/games/typing-racer-multiplayer/index.html`：
```javascript
// 原来：
const serverUrl = 'http://localhost:3000';

// 改为：
const serverUrl = 'http://your-server-ip:3000';
// 或使用 WebSocket 安全连接（需配置 HTTPS）：
const serverUrl = 'https://your-domain.com';
```

## 常见问题

### Q1: 部署后无法连接？
**检查清单：**
- ✅ 服务器防火墙是否开放 3000 端口
- ✅ 云平台安全组规则是否允许入站 3000 端口
- ✅ PM2 进程是否正常运行：`pm2 list`
- ✅ 查看错误日志：`pm2 logs`

### Q2: WebSocket 连接失败？
**解决方案：**
```bash
# 阿里云/腾讯云需在控制台配置安全组
# 入站规则：允许 TCP 3000 端口，来源 0.0.0.0/0
```

### Q3: 使用域名而非 IP？
**配置 Nginx 反向代理：**

```bash
# 安装 Nginx
apt install nginx -y

# 创建配置文件
cat > /etc/nginx/sites-available/typing-games << 'EOF'
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
EOF

# 启用配置
ln -s /etc/nginx/sites-available/typing-games /etc/nginx/sites-enabled/
nginx -t
systemctl reload nginx

# 配置 SSL（可选，使用 Let's Encrypt）
apt install certbot python3-certbot-nginx -y
certbot --nginx -d your-domain.com
```

### Q4: 内存不足？
**优化 PM2 配置：**
```bash
# 限制内存使用
pm2 start server.js --name typing-games-backend --max-memory-restart 300M
```

### Q5: 如何查看日志？
```bash
# 实时日志
ssh root@your-server-ip "pm2 logs typing-games-backend"

# 历史日志
ssh root@your-server-ip "pm2 logs typing-games-backend --lines 100"
```

### Q6: 如何停止服务？
```bash
ssh root@your-server-ip "pm2 stop typing-games-backend"
ssh root@your-server-ip "pm2 delete typing-games-backend"
```

## 生产环境优化建议

### 1. 使用 HTTPS（推荐）
配置 SSL 证书，保护 WebSocket 连接安全。

### 2. 配置 CORS
在 `backend/server.js` 中限制允许的前端域名：
```javascript
const io = socketIO(server, {
    cors: {
        origin: "https://your-frontend-domain.com",  // 限制来源
        methods: ["GET", "POST"]
    }
});
```

### 3. 进程监控
```bash
# 设置 PM2 开机自启
pm2 startup
pm2 save

# 监控仪表盘
pm2 monit
```

### 4. 数据持久化
如需持久化房间数据，考虑集成 Redis。

## 成本参考

| 云平台 | 配置 | 价格 | 适用场景 |
|--------|------|------|----------|
| 阿里云 ECS | 1核2G | ~¥100/月 | 小型应用 |
| 腾讯云轻量 | 2核4G | ~¥120/月 | 中型应用 |
| AWS EC2 | t2.micro | 免费一年 | 测试环境 |
| DigitalOcean | $5/月 | ~¥35/月 | 国际用户 |

## 技术支持

部署遇到问题？
- 查看 `pm2 logs` 获取详细错误信息
- 检查服务器防火墙和云平台安全组配置
- 确认 Node.js 版本 >= 18.0.0

---

**部署成功后，您的多人打字游戏就可以被全球用户访问了！** 🎮🌍
