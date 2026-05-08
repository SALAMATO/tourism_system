from django.apps import AppConfig


class ApiConfig(AppConfig):
    name = 'api'
    
    def ready(self):
        """Django启动时自动配置AI模型"""
        try:
            from ai import lowsky_ai
            from ai.config import QIANWEN_API_KEY, QIANWEN_BASE_URL, DEFAULT_MODEL, AVAILABLE_MODELS
            
            # 检查是否已经配置了模型
            if not lowsky_ai.models:
                # 从config.py读取配置并自动配置阿里云百炼模型
                model_config = AVAILABLE_MODELS.get(DEFAULT_MODEL, {})
                lowsky_ai.add_model(
                    model_id=DEFAULT_MODEL,
                    model_name=DEFAULT_MODEL,  # 使用模型ID作为model_name，而不是中文名称
                    api_key=QIANWEN_API_KEY,
                    api_base=QIANWEN_BASE_URL,
                    max_tokens=model_config.get('max_tokens', 2048),
                    temperature=model_config.get('temperature', 0.5),
                )
                print(f"AI model auto-configured: {DEFAULT_MODEL} (Alibaba Cloud)")
        except Exception as e:
            print(f"AI model auto-config failed: {e}")
            print("Please check API key and network connection")
