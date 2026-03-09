"""
阿里云百炼API配置
"""

# API配置
QIANWEN_API_KEY = "sk-fd5060ca16c74de99e5e9fd06a56a0bd"
QIANWEN_BASE_URL = "https://dashscope.aliyuncs.com/compatible-mode/v1"

# 可用模型
AVAILABLE_MODELS = {
    "qwen3.5-plus": {
        "name": "通义千问Plus",
        "description": "高性能模型，适合复杂任务",
        "max_tokens": 8192
    },
    "qwen-turbo": {
        "name": "通义千问Turbo",
        "description": "快速响应，适合日常对话",
        "max_tokens": 8192
    },
    "qwen3-max": {
        "name": "通义千问Max",
        "description": "最强性能，适合专业任务",
        "max_tokens": 8192
    }
}

# 默认模型
DEFAULT_MODEL = "qwen3.5-plus"
