"""
阿里云百炼API配置
所有模型参数统一在此处管理，方便集中修改。
"""

# ── API 基础配置 ──────────────────────────────────────────────────────
QIANWEN_API_KEY = "sk-fd5060ca16c74de99e5e9fd06a56a0bd"
QIANWEN_BASE_URL = "https://dashscope.aliyuncs.com/compatible-mode/v1"

# ── 可用模型列表 ───────────────────────────────────────────────────────
AVAILABLE_MODELS = {
    "qwen3.5-plus": {
        "name": "通义千问Plus",
        "description": "默认AI助手，负责日常对话和问题理解",
        "max_tokens": 2048,
        "temperature": 0.5
    },
    "qwen-turbo": {
        "name": "通义千问Turbo",
        "description": "数据库查询模型，速度最快",
        "max_tokens": 512,
        "temperature": 0.2
    },
    "qwen3-max": {
        "name": "通义千问Max",
        "description": "深度思考模型，用于复杂分析",
        "max_tokens": 4096,
        "temperature": 0.7
    }
}

# ── 默认主模型 ─────────────────────────────────────────────────────────
DEFAULT_MODEL = "qwen3.5-plus"

# ── 数据库查询专用模型配置 ─────────────────────────────────────────────
# 本地数据库模式固定使用此配置，与主模型解耦，便于独立调整
DB_MODEL = "qwen-turbo"             # 固定使用最快模型
DB_MAX_TOKENS = 512                  # 数据库回答无需长输出
DB_TEMPERATURE = 0.2                 # 低随机性，SQL 更准确稳定
