#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# 从 .env 文件加载配置（如果存在）
if [ -f "$SCRIPT_DIR/.env" ]; then
  set -a
  # shellcheck disable=SC1091
  source "$SCRIPT_DIR/.env"
  set +a
fi

# 配置信息（可通过环境变量覆盖）
DEPLOY_TARGET="${DEPLOY_TARGET:-${GAMEAI_DEPLOY_TARGET:-${SERVER_HOST:-${SERVER_IP:-gameai-aliyun}}}}"
SSH_PORT="${SSH_PORT:-${GAMEAI_SSH_PORT:-22}}"
REMOTE_PATH="${TYPING_GAMES_BACKEND_PATH:-${REMOTE_PATH:-/srv/lab/typing-games/backend}}"
APP_NAME="${APP_NAME:-typing-games-backend}"
NODE_ENV="${NODE_ENV:-production}"
PORT="${PORT:-3002}"
BACKUP_ROOT="${BACKUP_ROOT:-/srv/ops/backups/typing-games-backend}"

SSH_CMD=(ssh -p "$SSH_PORT" "$DEPLOY_TARGET")
RSYNC_SSH="ssh -p $SSH_PORT"

echo "🚀 开始部署..."
echo "📍 目标服务器: $DEPLOY_TARGET"
echo "📂 远程路径: $REMOTE_PATH"
echo ""

# 测试 SSH 连接
echo "🔍 测试 SSH 连接..."
if ! ssh -p "$SSH_PORT" -o ConnectTimeout=10 -o BatchMode=yes "$DEPLOY_TARGET" "echo '✅ SSH 连接成功'" 2>/dev/null; then
  echo "❌ 无法连接到服务器 $DEPLOY_TARGET"
  echo ""
  echo "可能的原因:"
  echo "  1. 服务器地址或 SSH alias 错误"
  echo "  2. SSH 密钥未配置"
  echo "  3. 服务器防火墙阻止 SSH 连接"
  echo "  4. 网络连接问题"
  echo ""
  echo "请先手动测试 SSH 连接: ssh -p $SSH_PORT $DEPLOY_TARGET"
  exit 1
fi
echo ""

# 检查并安装 rsync
echo "🔍 检查远程服务器环境..."
"${SSH_CMD[@]}" << 'EOF'
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
"${SSH_CMD[@]}" "mkdir -p '$REMOTE_PATH' && echo '✅ 目录已创建: $REMOTE_PATH'"
echo ""

# 切换到项目根目录（从 deployment 文件夹回到上级目录）
cd "$SCRIPT_DIR/.."

# 1. 备份当前远端目录
echo "🗄️  备份远端目录..."
"${SSH_CMD[@]}" "set -euo pipefail; mkdir -p '$BACKUP_ROOT'; if [ -d '$REMOTE_PATH' ]; then tar -C '$REMOTE_PATH' -czf '$BACKUP_ROOT/typing-games-backend-\$(date +%Y%m%d-%H%M%S).tgz' .; fi"
echo ""

# 2. 同步文件到服务器（排除本地数据和上传文件）
echo "📦 同步文件到服务器..."
if rsync -avz --progress \
  --exclude 'node_modules' \
  --exclude 'deployment' \
  --exclude '.git' \
  --exclude '.env' \
  -e "$RSYNC_SSH -o ConnectTimeout=30" \
  ./ "$DEPLOY_TARGET:$REMOTE_PATH/"; then
  echo "✅ 文件同步完成"
else
  echo "❌ 文件同步失败"
  exit 1
fi
echo ""

# 3. 在远程服务器上执行部署步骤
echo "🔧 在远程服务器上执行部署..."
"${SSH_CMD[@]}" "bash -s" << EOF
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
  pm2 delete $APP_NAME 2>/dev/null || true
  PORT=$PORT NODE_ENV=$NODE_ENV pm2 start server.js \
    --name $APP_NAME \
    -i 1

  # 设置 PM2 开机自启
  pm2 startup systemd -u root --hp /root || true

  # 保存 PM2 进程列表
  pm2 save

  # 显示应用状态
  echo ""
  echo "📊 应用状态:"
  pm2 list
EOF

echo ""
echo "✅ 部署完成！"
echo "📝 查看日志: ssh -p $SSH_PORT $DEPLOY_TARGET 'pm2 logs $APP_NAME'"
