# Docker 部署指南

## 概述

本项目提供完整的 Docker 容器化部署方案，支持单容器部署 + 外部 MongoDB 服务的架构。

## 项目架构

```
药物相互作用分析系统
├── 应用容器 (Node.js 24 + Alpine)
├── 外部MongoDB数据库
└── Docker网络通信
```

## 文件说明

### 核心配置文件

- **`Dockerfile`**: 容器构建配置，基于 Node.js 24 Alpine 镜像
- **`docker-compose.yml`**: 服务编排配置，单容器部署
- **`.dockerignore`**: Docker 构建排除文件
- **`.env.docker.example`**: 环境变量配置模板
- **`deploy.ps1`**: Windows PowerShell 部署脚本
- **`deploy.sh`**: Linux/macOS Bash 部署脚本

## 快速开始

### 1. 环境准备

确保已安装：

- Docker Desktop (Windows) 或 Docker Engine (Linux/macOS)
- Docker Compose

### 2. 配置环境变量

```bash
# 复制环境变量模板
cp .env.docker.example .env.docker

# 编辑环境变量文件
notepad .env.docker  # Windows
nano .env.docker     # Linux/macOS
```

**重要配置项：**

```env
# 外部MongoDB连接
MONGODB_URI=mongodb://your-mongodb-host:27017/

# DeepSeek API密钥
DEEPSEEK_API_KEY=your-deepseek-api-key

# 数据库名称
DB_NAME=drug_interaction_db
```

### 3. 一键部署

#### Windows (PowerShell)

```powershell
# 部署服务
.\deploy.ps1

# 或指定操作
.\deploy.ps1 -Action deploy
```

#### Linux/macOS (Bash)

```bash
# 赋予执行权限
chmod +x deploy.sh

# 部署服务
./deploy.sh
```

## 部署脚本功能

### PowerShell 脚本 (deploy.ps1)

```powershell
# 部署服务
.\deploy.ps1

# 停止服务
.\deploy.ps1 -Action stop

# 重启服务
.\deploy.ps1 -Action restart

# 查看日志
.\deploy.ps1 -Action logs

# 清理资源
.\deploy.ps1 -Action clean
```

### Bash 脚本 (deploy.sh)

```bash
# 部署服务
./deploy.sh

# 停止服务
./deploy.sh --stop

# 重启服务
./deploy.sh --restart

# 查看日志
./deploy.sh --logs

# 清理资源
./deploy.sh --clean
```

## 手动部署步骤

### 1. 构建镜像

```bash
docker build -t drug-interaction-backend .
```

### 2. 启动服务

```bash
docker-compose up -d
```

### 3. 检查状态

```bash
docker-compose ps
```

### 4. 查看日志

```bash
docker-compose logs -f
```

## 服务访问

部署成功后，可通过以下地址访问服务：

- **API 服务**: http://localhost:3000
- **健康检查**: http://localhost:3000/health
- **API 文档**: http://localhost:3000/api-docs (如果启用 Swagger)

## 环境变量配置详解

### 服务配置

```env
PORT=3000                  # 服务端口
NODE_ENV=production        # 运行环境
```

### 数据库配置

```env
MONGODB_URI=mongodb://host:27017/  # MongoDB连接字符串
DB_NAME=drug_interaction_db        # 数据库名称
```

### API 配置

```env
DEEPSEEK_API_KEY=your-api-key           # DeepSeek API密钥
DEEPSEEK_BASE_URL=https://api.deepseek.com/v1  # API地址
AI_TIMEOUT=300000                        # 请求超时时间(毫秒)
```

### 日志配置

```env
LOG_LEVEL=warn  # 日志级别: error, warn, info, debug
```

## 安全配置

### 1. 敏感信息处理

- API 密钥通过环境变量注入，不写入镜像
- 使用非 root 用户运行容器
- 限制容器资源使用

### 2. 网络安全

- 使用自定义 Docker 网络
- 仅暴露必要端口(3000)
- 建议配合反向代理使用

### 3. 资源限制

```yaml
deploy:
  resources:
    limits:
      memory: 512M # 最大内存限制
      cpus: "0.5" # CPU限制
    reservations:
      memory: 256M # 最小内存保证
      cpus: "0.25" # 最小CPU保证
```

## 监控和健康检查

### 健康检查配置

```yaml
healthcheck:
  test:
    [
      "CMD",
      "node",
      "-e",
      "require('http').get('http://localhost:3000/health', ...)",
    ]
  interval: 30s # 检查间隔
  timeout: 10s # 超时时间
  retries: 3 # 重试次数
  start_period: 40s # 启动等待时间
```

### 日志管理

- 应用日志输出到容器标准输出
- 可选挂载本地日志目录实现持久化
- 支持通过 `docker-compose logs` 查看

## 故障排除

### 常见问题

1. **容器启动失败**

   ```bash
   # 查看详细日志
   docker-compose logs drug-backend

   # 检查环境变量
   docker-compose config
   ```

2. **数据库连接失败**

   - 验证 MongoDB 连接字符串
   - 检查网络连通性
   - 确认数据库权限

3. **API 调用失败**
   - 验证 DeepSeek API 密钥
   - 检查网络连接
   - 查看 API 配额

### 调试命令

```bash
# 进入容器调试
docker-compose exec drug-backend sh

# 重启服务
docker-compose restart

# 重新构建并启动
docker-compose up -d --build
```

## 生产环境建议

### 1. 性能优化

- 根据负载调整资源限制
- 使用负载均衡器
- 启用 GZIP 压缩

### 2. 安全加固

- 使用 HTTPS
- 配置防火墙规则
- 定期更新基础镜像

### 3. 备份策略

- 定期备份 MongoDB 数据
- 备份环境配置文件
- 记录容器镜像版本

## 更新部署

### 应用更新

```bash
# 拉取最新代码
git pull

# 重新构建并部署
docker-compose up -d --build
```

### 配置更新

```bash
# 更新环境变量
vim .env.docker

# 重启服务应用新配置
docker-compose restart
```

## 技术支持

如遇到问题，请检查：

1. Docker 和 Docker Compose 版本
2. 环境变量配置
3. 网络连接状态
4. 容器日志输出

更多技术细节请参考项目源码和 Docker 官方文档。
