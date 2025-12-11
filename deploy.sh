#!/bin/bash

# ========================================
# 药物相互作用分析系统 Docker 部署脚本
# ========================================

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 打印带颜色的消息
print_message() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_step() {
    echo -e "${BLUE}[STEP]${NC} $1"
}

# 检查Docker是否安装
check_docker() {
    print_step "检查Docker安装状态..."
    if ! command -v docker &> /dev/null; then
        print_error "Docker未安装，请先安装Docker"
        exit 1
    fi
    
    if ! command -v docker-compose &> /dev/null; then
        print_error "Docker Compose未安装，请先安装Docker Compose"
        exit 1
    fi
    
    print_message "Docker和Docker Compose已安装"
}

# 检查环境变量文件
check_env_file() {
    print_step "检查环境变量文件..."
    if [ ! -f ".env.docker" ]; then
        print_warning ".env.docker文件不存在"
        if [ -f ".env.docker.example" ]; then
            print_message "正在从模板创建.env.docker文件..."
            cp .env.docker.example .env.docker
            print_warning "请编辑.env.docker文件并填入正确的配置值"
            print_warning "特别注意以下配置项："
            print_warning "  - MONGODB_URI: 您的外部MongoDB连接字符串"
            print_warning "  - DEEPSEEK_API_KEY: 您的DeepSeek API密钥"
            echo
            read -p "是否现在编辑.env.docker文件？(y/n): " -n 1 -r
            echo
            if [[ $REPLY =~ ^[Yy]$ ]]; then
                ${EDITOR:-nano} .env.docker
            fi
        else
            print_error "找不到.env.docker.example模板文件"
            exit 1
        fi
    else
        print_message ".env.docker文件存在"
    fi
}

# 创建必要的目录
create_directories() {
    print_step "创建必要的目录..."
    mkdir -p logs
    print_message "目录创建完成"
}

# 构建Docker镜像
build_image() {
    print_step "构建Docker镜像..."
    docker build -t drug-interaction-backend .
    print_message "Docker镜像构建完成"
}

# 启动服务
start_services() {
    print_step "启动服务..."
    docker-compose up -d
    print_message "服务启动完成"
}

# 检查服务状态
check_services() {
    print_step "检查服务状态..."
    sleep 10
    
    if docker-compose ps | grep -q "Up"; then
        print_message "服务运行正常"
        
        # 显示服务信息
        echo
        print_message "服务信息："
        docker-compose ps
        
        echo
        print_message "访问地址："
        echo "  - API服务: http://localhost:3000"
        echo "  - 健康检查: http://localhost:3000/health"
        
    else
        print_error "服务启动失败"
        echo
        print_message "查看日志："
        docker-compose logs
        exit 1
    fi
}

# 显示帮助信息
show_help() {
    echo "用法: $0 [选项]"
    echo
    echo "选项:"
    echo "  -h, --help     显示帮助信息"
    echo "  -s, --stop     停止服务"
    echo "  -r, --restart  重启服务"
    echo "  -l, --logs     查看日志"
    echo "  -c, --clean    清理容器和镜像"
    echo
}

# 停止服务
stop_services() {
    print_step "停止服务..."
    docker-compose down
    print_message "服务已停止"
}

# 重启服务
restart_services() {
    print_step "重启服务..."
    docker-compose restart
    print_message "服务已重启"
}

# 查看日志
show_logs() {
    docker-compose logs -f
}

# 清理资源
clean_resources() {
    print_step "清理Docker资源..."
    docker-compose down -v --rmi all
    docker system prune -f
    print_message "清理完成"
}

# 主函数
main() {
    echo "========================================"
    echo "  药物相互作用分析系统 Docker 部署"
    echo "========================================"
    echo
    
    case "${1:-deploy}" in
        "deploy"|"")
            check_docker
            check_env_file
            create_directories
            build_image
            start_services
            check_services
            print_message "部署完成！"
            ;;
        "stop"|"-s"|"--stop")
            stop_services
            ;;
        "restart"|"-r"|"--restart")
            restart_services
            ;;
        "logs"|"-l"|"--logs")
            show_logs
            ;;
        "clean"|"-c"|"--clean")
            clean_resources
            ;;
        "help"|"-h"|"--help")
            show_help
            ;;
        *)
            print_error "未知选项: $1"
            show_help
            exit 1
            ;;
    esac
}

# 执行主函数
main "$@"
