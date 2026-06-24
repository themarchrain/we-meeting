#!/bin/bash
# ==================================================
# WeMeeting Docker 镜像构建脚本（国内加速版）
# 使用阿里云 Maven 镜像，适合国内服务器
# ==================================================

set -e

echo "========================================="
echo "  WeMeeting 镜像构建（国内加速）"
echo "========================================="

# 检查 .env 文件
if [ ! -f .env ]; then
    echo "[提示] 未找到 .env 文件，正在从模板复制..."
    cp .env.example .env
    echo "[完成] 已创建 .env，请按需修改配置后重新运行"
    exit 0
fi

# 构建镜像（使用阿里云 Maven 镜像）
echo ""
echo "[1/2] 构建后端镜像（阿里云 Maven）..."
docker build -t wemeeting-backend:latest -f Dockerfile.cn .

echo ""
echo "[2/2] 构建前端镜像..."
docker build -t wemeeting-frontend:latest -f frontend/Dockerfile ./frontend

echo ""
echo "========================================="
echo "  构建完成！"
echo "========================================="
echo ""
echo "镜像列表："
docker images | grep wemeeting
echo ""
echo "运行命令：./run.sh"
