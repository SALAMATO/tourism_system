@echo off
chcp 65001 >nul
echo ========================================
echo LowSkyAI 快速配置脚本
echo ========================================
echo.

echo [1/4] 检查 Ollama 是否运行...
curl -s http://localhost:11434/api/tags >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Ollama 未运行
    echo.
    echo 请先启动 Ollama:
    echo   方法1: 在开始菜单搜索 "Ollama" 并运行
    echo   方法2: 在命令行运行 "ollama serve"
    echo.
    pause
    exit /b 1
) else (
    echo ✅ Ollama 正在运行
)

echo.
echo [2/4] 检查 Qwen 模型是否已下载...
ollama list | findstr "qwen3.5:9b" >nul 2>&1
if %errorlevel% neq 0 (
    echo ⚠️  Qwen 3.5:9b 模型未找到
    echo.
    set /p download="是否现在下载? (y/n): "
    if /i "%download%"=="y" (
        echo 正在下载 Qwen 3.5:9b 模型（约5.5GB）...
        ollama pull qwen3.5:9b
    ) else (
        echo 跳过下载，请稍后手动运行: ollama pull qwen3.5:9b
        pause
        exit /b 1
    )
) else (
    echo ✅ Qwen 3.5:9b 模型已安装
)

echo.
echo [3/4] 检查 Python 依赖...
python -c "import requests" 2>nul
if %errorlevel% neq 0 (
    echo ⚠️  requests 库未安装
    echo 正在安装...
    pip install requests
) else (
    echo ✅ Python 依赖已满足
)

echo.
echo [4/4] 配置 LowSkyAI...
python configure_qwen.py

echo.
echo ========================================
echo 配置完成！
echo ========================================
echo.
echo 现在您可以：
echo 1. 启动Django服务器: python manage.py runserver
echo 2. 访问系统任意页面
echo 3. 点击右上角的 LowSkyAI 按钮
echo 4. 开始与AI助手对话
echo.
pause
