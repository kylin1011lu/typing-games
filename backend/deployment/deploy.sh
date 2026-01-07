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
  echo "❌ 错误: 请在 .env 文件中设置 SERVER_IP"
  echo "提示: 在 deployment 目录下创建 .env 文件，内容示例:"
  echo "  SERVER_IP=your-server-ip"
  echo "  SERVER_USER=root"
  echo "  REMOTE_PATH=/var/www/typing-games/backend"
  exit 1
fi

# 确保脚本在错误时停止执行
set -e

echo "🚀 开始部署..."
echo "📍 目标服务器: $SERVER_USER@$SERVER_IP"
echo "📂 远程路径: $REMOTE_PATH"
echo ""

# 测试 SSH 连接
echo "🔍 测试 SSH 连接..."
if ! ssh -o ConnectTimeout=10 -o BatchMode=yes $SERVER_USER@$SERVER_IP "echo '✅ SSH 连接成功'" 2>/dev/null; then
  echo "❌ 无法连接到服务器 $SERVER_USER@$SERVER_IP"
  echo ""
  echo "可能的原因:"
  echo "  1. 服务器地址或用户名错误"
  echo "  2. SSH 密钥未配置（请运行 ssh-copy-id $SERVER_USER@$SERVER_IP）"
  echo "  3. 服务器防火墙阻止 SSH 连接"
  echo "  4. 网络连接问题"
  echo ""
  echo "请先手动测试 SSH 连接: ssh $SERVER_USER@$SERVER_IP"
  exit 1
fi
echo ""

# 检查并安装 rsync
echo "🔍 检查远程服务器环境..."
ssh $SERVER_USER@$SERVER_IP << 'EOF'
  # 检查 rsync 是否安装
  if ! command -v rsync &> /dev/null; then
    echo "📦 正在安装 rsync..."
    if command -v yum &> /dev/null; then
      yum install -y rsync
    elif command -v apt-get &> /dev/null; then
      apt-get update && apt-get install -y rsync
    else
      echo "❌ 无法自动安装 rsync，请手动安装: yum install rsync 或 apt-get install rsync"
      exit 1
    fi
  else
    echo "✅ rsync 已安装"
  fi
EOF

# 创建远程目录
echo "📁 创建远程目录..."
ssh $SERVER_USER@$SERVER_IP "mkdir -p $REMOTE_PATH && echo '✅ 目录已创建: $REMOTE_PATH'"
echo ""

# 切换到项目根目录（从deployment文件夹回到上级目录）
cd "$(dirname "$0")/.."

# 1. 同步文件到服务器（排除本地数据和上传文件）
echo "📦 同步文件到服务器..."
if rsync -avz --progress \
  --exclude 'node_modules' \
  --exclude 'deployment' \
  --exclude '.git' \
  --exclude '.env' \
  -e "ssh -o ConnectTimeout=30" \
  ./ $SERVER_USER@$SERVER_IP:$REMOTE_PATH/; then
  echo "✅ 文件同步完成"
else
  echo "❌ 文件同步失败"
  exit 1
fi
echo ""

# 2. 在远程服务器上执行部署步骤
echo "🔧 在远程服务器上执行部署..."
ssh $SERVER_USER@$SERVER_IP "bash -s" << EOF
  cd $REMOTE_PATH

  # 安装依赖
  echo "📦 安装依赖..."
  npm install

  # 检查 PM2 是否已安装
  if ! command -v pm2 &> /dev/null; then
    echo "📦 正在安装 PM2..."
    npm install -g pm2
  fi

  # 重启或启动服务
  echo "🔄 重启服务..."
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
  pm2 startup systemd -u $SERVER_USER --hp /root || true

  # 保存 PM2 进程列表
  pm2 save

  # 显示应用状态
  echo ""
  echo "📊 应用状态:"
  pm2 list
EOF

echo ""
echo "✅ 部署完成！"
echo "📝 查看日志: ssh $SERVER_USER@$SERVER_IP 'pm2 logs $APP_NAME'"
