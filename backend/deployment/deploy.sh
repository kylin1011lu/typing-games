#!/bin/bash

# 从 .env 文件加载配置（如果存在）
if [ -f .env ]; then
  export $(cat .env | grep -v '^#' | xargs)
fi

# 配置信息（可通过环境变量覆盖）
SERVER_USER="${SERVER_USER:-root}"
SERVER_IP="${SERVER_IP:-your-server-ip}"
REMOTE_PATH="${REMOTE_PATH:-/var/www/typing-games/backend}"
APP_NAME="${APP_NAME:-typing-games-backend}"
NODE_ENV="${NODE_ENV:-production}"

# 检查必要的配置
if [ "$SERVER_IP" = "your-server-ip" ]; then
  echo "错误: 请在 .env 文件中设置 SERVER_IP"
  exit 1
fi

# 确保脚本在错误时停止执行
set -e

echo "开始部署..."

# 切换到项目根目录（从deployment文件夹回到上级目录）
cd "$(dirname "$0")/.."

# 1. 同步文件到服务器（排除本地数据和上传文件）
echo "同步文件到服务器..."
rsync -avz \
  --exclude 'node_modules' \
  --exclude 'deployment' \
  ./ $SERVER_USER@$SERVER_IP:$REMOTE_PATH/

# 2. 在远程服务器上执行部署步骤
echo "在远程服务器上执行部署..."
ssh $SERVER_USER@$SERVER_IP << EOF
  cd $REMOTE_PATH

  # 安装依赖
  echo "安装依赖..."
  npm install

  # 检查 PM2 是否已安装
  if ! command -v pm2 &> /dev/null; then
    echo "正在安装 PM2..."
    npm install -g pm2
  fi

  # 重启或启动服务
  echo "重启服务..."
  if pm2 list | grep -q "$APP_NAME"; then
    pm2 restart $APP_NAME --update-env
  else
    # 设置环境变量并启动
    pm2 start server.js \
      --name $APP_NAME \
      --env production \
      -i 1
  fi

  # 设置 PM2 开机自启
  pm2 startup || true

  # 保存 PM2 进程列表
  pm2 save

  # 显示应用状态
  pm2 list
EOF

echo "部署完成！"
