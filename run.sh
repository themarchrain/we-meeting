#!/bin/bash
# ==================================================
# WeMeeting Docker 启动脚本
# ==================================================

set -e

echo "========================================="
echo "  WeMeeting 启动"
echo "========================================="

# 检查 .env 文件
if [ ! -f .env ]; then
    echo "[错误] 未找到 .env 文件，请先运行 ./build.sh"
    exit 1
fi

# 创建数据目录
mkdir -p data/{mysql,redis,rabbitmq}

# 启动服务
echo ""
echo "[1/1] 启动所有服务..."
docker-compose up -d

echo ""
echo "========================================="
echo "  启动完成！"
echo "========================================="
echo ""
echo "服务状态："
docker-compose ps
echo ""
echo "常用命令："
echo "  查看日志: docker-compose logs -f"
echo "  停止服务: docker-compose down"
echo "  重启服务: docker-compose restart"
echo ""
echo "访问地址："
echo "  前端: http://localhost"
echo "  后端 API: http://localhost/api"
echo "  WebSocket: ws://localhost/ws"
echo "  RabbitMQ 管理: http://localhost:15672"
