# 🐳 Docker 快速部署指南

## 📋 部署概览

本方案采用**单容器部署 + 外部 MongoDB 服务**的架构，为您提供药物相互作用分析系统的完整 Docker 容器化解决方案。

## 🚀 一键部署

### Windows 用户 (推荐)

```powershell
# 1. 配置环境变量
Copy-Item .env.docker.example .env.docker
notepad .env.docker  # 编辑配置

# 2. 一键部署
.\deploy.ps1

# 3. 验证部署
# 访问: http://localhost:3000/health
```

### Linux/macOS 用户

```bash
# 1. 配置环境变量
cp .env.docker.example .env.docker
nano .env.docker  # 编辑配置

# 2. 一键部署
./deploy.sh

# 3. 验证部署
curl http://localhost:3000/health
```

## ⚙️ 环境变量配置

### 必须配置项

```env
# 🔥 重要：外部MongoDB连接
MONGODB_URI=mongodb://your-mongodb-host:27017/

# 🔥 重要：DeepSeek API密钥
DEEPSEEK_API_KEY=your-deepseek-api-key-here

# 数据库名称
DB_NAME=drug_interaction_db
```

### 可选配置项

```env
# 服务配置
PORT=3000
NODE_ENV=production

# API配置
DEEPSEEK_BASE_URL=https://api.deepseek.com/v1
AI_TIMEOUT=300000

# 日志配置
LOG_LEVEL=warn
```

## 📁 创建的文件列表

| 文件名                 | 用途                 | 说明                         |
| ---------------------- | -------------------- | ---------------------------- |
| `Dockerfile`           | 容器构建             | Node.js 24 Alpine + 安全配置 |
| `docker-compose.yml`   | 服务编排             | 单容器部署 + 健康检查        |
| `.dockerignore`        | 构建排除             | 排除不必要文件               |
| `.env.docker.example`  | 环境变量模板         | 配置示例和说明               |
| `deploy.ps1`           | Windows 部署脚本     | PowerShell 自动化脚本        |
| `deploy.sh`            | Linux/macOS 部署脚本 | Bash 自动化脚本              |
| `DOCKER_DEPLOYMENT.md` | 详细文档             | 完整部署指南                 |

## 🛠️ 部署脚本功能

### PowerShell 脚本 (deploy.ps1)

```powershell
.\deploy.ps1              # 部署服务
.\deploy.ps1 -Action stop # 停止服务
.\deploy.ps1 -Action restart # 重启服务
.\deploy.ps1 -Action logs # 查看日志
.\deploy.ps1 -Action clean # 清理资源
```

### Bash 脚本 (deploy.sh)

```bash
./deploy.sh              # 部署服务
./deploy.sh --stop      # 停止服务
./deploy.sh --restart   # 重启服务
./deploy.sh --logs      # 查看日志
./deploy.sh --clean     # 清理资源
```

## 🔍 服务访问地址

部署成功后，可通过以下地址访问：

- **API 服务**: http://localhost:3000
- **健康检查**: http://localhost:3000/health
- **API 文档**: http://localhost:3000/api-docs (如果启用)

## 🔒 安全特性

- ✅ 非 root 用户运行容器
- ✅ 敏感信息环境变量注入
- ✅ 资源使用限制 (512MB 内存, 0.5 CPU)
- ✅ 健康检查监控
- ✅ 自定义 Docker 网络

## 📊 监控和日志

### 健康检查

- 每 30 秒检查一次服务状态
- 自动重启异常容器
- 启动等待时间 40 秒

### 日志管理

```bash
# 查看实时日志
docker-compose logs -f

# 查看容器状态
docker-compose ps

# 查看资源使用
docker stats drug-interaction-backend
```

## 🚨 故障排除

### 常见问题解决

1. **容器启动失败**

   ```powershell
   docker-compose logs drug-backend
   docker-compose config  # 检查配置
   ```

2. **数据库连接失败**

   - 验证 `MONGODB_URI` 配置
   - 检查网络连通性
   - 确认数据库权限

3. **API 调用失败**
   - 验证 `DEEPSEEK_API_KEY` 配置
   - 检查网络连接
   - 查看 API 配额

### 调试命令

```powershell
# 进入容器
docker-compose exec drug-backend sh

# 重启服务
docker-compose restart

# 重新构建
docker-compose up -d --build
```

## 📈 生产环境建议

### 性能优化

- 根据负载调整资源限制
- 使用负载均衡器
- 启用 GZIP 压缩

### 安全加固

- 使用 HTTPS
- 配置防火墙规则
- 定期更新基础镜像

### 备份策略

- 定期备份 MongoDB 数据
- 备份环境配置文件
- 记录容器镜像版本

## 🔄 更新部署

```powershell
# 应用更新
git pull
docker-compose up -d --build

# 配置更新
notepad .env.docker
docker-compose restart
```

## 📞 技术支持

如遇到问题，请检查：

1. ✅ Docker 和 Docker Compose 版本
2. ✅ 环境变量配置正确性
3. ✅ 网络连接状态
4. ✅ 容器日志输出

---

**🎉 部署完成！**

现在您的药物相互作用分析系统已经成功容器化，可以轻松部署到任何支持 Docker 的环境中。
