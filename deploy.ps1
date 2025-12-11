# ========================================
# 药物相互作用分析系统 Docker 部署脚本 (PowerShell版本)
# ========================================

param(
    [string]$Action = "deploy"
)

# 颜色定义
$Colors = @{
    Red = "Red"
    Green = "Green"
    Yellow = "Yellow"
    Blue = "Blue"
    White = "White"
}

# 打印带颜色的消息
function Write-ColorMessage {
    param(
        [string]$Message,
        [string]$Color = "White"
    )
    Write-Host $Message -ForegroundColor $Colors[$Color]
}

function Write-Info {
    param([string]$Message)
    Write-ColorMessage "[INFO] $Message" "Green"
}

function Write-Warning {
    param([string]$Message)
    Write-ColorMessage "[WARNING] $Message" "Yellow"
}

function Write-Error {
    param([string]$Message)
    Write-ColorMessage "[ERROR] $Message" "Red"
}

function Write-Step {
    param([string]$Message)
    Write-ColorMessage "[STEP] $Message" "Blue"
}

# 检查Docker是否安装
function Test-DockerInstallation {
    Write-Step "检查Docker安装状态..."
    
    try {
        $null = Get-Command docker -ErrorAction Stop
        Write-Info "Docker已安装"
    }
    catch {
        Write-Error "Docker未安装，请先安装Docker Desktop"
        exit 1
    }
    
    try {
        $null = Get-Command docker-compose -ErrorAction Stop
        Write-Info "Docker Compose已安装"
    }
    catch {
        Write-Error "Docker Compose未安装，请先安装Docker Compose"
        exit 1
    }
}

# 检查环境变量文件
function Test-EnvFile {
    Write-Step "检查环境变量文件..."
    
    if (-not (Test-Path ".env.docker")) {
        Write-Warning ".env.docker文件不存在"
        
        if (Test-Path ".env.docker.example") {
            Write-Info "正在从模板创建.env.docker文件..."
            Copy-Item ".env.docker.example" ".env.docker"
            
            Write-Warning "请编辑.env.docker文件并填入正确的配置值"
            Write-Warning "特别注意以下配置项："
            Write-Warning "  - MONGODB_URI: 您的外部MongoDB连接字符串"
            Write-Warning "  - DEEPSEEK_API_KEY: 您的DeepSeek API密钥"
            
            $choice = Read-Host "是否现在编辑.env.docker文件？(y/n)"
            if ($choice -eq 'y' -or $choice -eq 'Y') {
                & notepad ".env.docker"
            }
        }
        else {
            Write-Error "找不到.env.docker.example模板文件"
            exit 1
        }
    }
    else {
        Write-Info ".env.docker文件存在"
    }
}

# 创建必要的目录
function New-RequiredDirectories {
    Write-Step "创建必要的目录..."
    
    if (-not (Test-Path "logs")) {
        New-Item -ItemType Directory -Path "logs" -Force | Out-Null
    }
    
    Write-Info "目录创建完成"
}

# 构建Docker镜像
function Build-DockerImage {
    Write-Step "构建Docker镜像..."
    
    try {
        docker build -t drug-interaction-backend .
        Write-Info "Docker镜像构建完成"
    }
    catch {
        Write-Error "Docker镜像构建失败: $($_.Exception.Message)"
        exit 1
    }
}

# 启动服务
function Start-Services {
    Write-Step "启动服务..."
    
    try {
        docker-compose up -d
        Write-Info "服务启动完成"
    }
    catch {
        Write-Error "服务启动失败: $($_.Exception.Message)"
        exit 1
    }
}

# 检查服务状态
function Test-Services {
    Write-Step "检查服务状态..."
    
    Start-Sleep -Seconds 10
    
    try {
        $status = docker-compose ps
        if ($status -match "Up") {
            Write-Info "服务运行正常"
            
            Write-Host ""
            Write-Info "服务信息："
            docker-compose ps
            
            Write-Host ""
            Write-Info "访问地址："
            Write-Host "  - API服务: http://localhost:3000" -ForegroundColor White
            Write-Host "  - 健康检查: http://localhost:3000/health" -ForegroundColor White
        }
        else {
            Write-Error "服务启动失败"
            Write-Host ""
            Write-Info "查看日志："
            docker-compose logs
            exit 1
        }
    }
    catch {
        Write-Error "检查服务状态失败: $($_.Exception.Message)"
        exit 1
    }
}

# 停止服务
function Stop-Services {
    Write-Step "停止服务..."
    
    try {
        docker-compose down
        Write-Info "服务已停止"
    }
    catch {
        Write-Error "停止服务失败: $($_.Exception.Message)"
    }
}

# 重启服务
function Restart-Services {
    Write-Step "重启服务..."
    
    try {
        docker-compose restart
        Write-Info "服务已重启"
    }
    catch {
        Write-Error "重启服务失败: $($_.Exception.Message)"
    }
}

# 查看日志
function Show-Logs {
    try {
        docker-compose logs -f
    }
    catch {
        Write-Error "查看日志失败: $($_.Exception.Message)"
    }
}

# 清理资源
function Clear-Resources {
    Write-Step "清理Docker资源..."
    
    try {
        docker-compose down -v --rmi all
        docker system prune -f
        Write-Info "清理完成"
    }
    catch {
        Write-Error "清理资源失败: $($_.Exception.Message)"
    }
}

# 显示帮助信息
function Show-Help {
    Write-Host "用法: .\deploy.ps1 [选项]" -ForegroundColor White
    Write-Host ""
    Write-Host "选项:" -ForegroundColor White
    Write-Host "  -Action deploy    部署服务 (默认)" -ForegroundColor White
    Write-Host "  -Action stop      停止服务" -ForegroundColor White
    Write-Host "  -Action restart   重启服务" -ForegroundColor White
    Write-Host "  -Action logs      查看日志" -ForegroundColor White
    Write-Host "  -Action clean     清理容器和镜像" -ForegroundColor White
    Write-Host ""
    Write-Host "示例:" -ForegroundColor White
    Write-Host "  .\deploy.ps1                    # 部署服务" -ForegroundColor White
    Write-Host "  .\deploy.ps1 -Action stop       # 停止服务" -ForegroundColor White
    Write-Host "  .\deploy.ps1 -Action restart    # 重启服务" -ForegroundColor White
    Write-Host "  .\deploy.ps1 -Action logs       # 查看日志" -ForegroundColor White
    Write-Host "  .\deploy.ps1 -Action clean      # 清理资源" -ForegroundColor White
}

# 主函数
function Main {
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host "  药物相互作用分析系统 Docker 部署" -ForegroundColor Cyan
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host ""
    
    switch ($Action.ToLower()) {
        "deploy" {
            Test-DockerInstallation
            Test-EnvFile
            New-RequiredDirectories
            Build-DockerImage
            Start-Services
            Test-Services
            Write-Info "部署完成！"
        }
        "stop" {
            Stop-Services
        }
        "restart" {
            Restart-Services
        }
        "logs" {
            Show-Logs
        }
        "clean" {
            Clear-Resources
        }
        "help" {
            Show-Help
        }
        default {
            Write-Error "未知选项: $Action"
            Show-Help
            exit 1
        }
    }
}

# 执行主函数
Main
