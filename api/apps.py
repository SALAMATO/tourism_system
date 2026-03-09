from django.apps import AppConfig
from httpx import stream


class ApiConfig(AppConfig):
    name = 'api'
    
    def ready(self):
        """Django启动时自动配置AI模型"""
        try:
            from ai import lowsky_ai
            
            # 检查是否已经配置了模型
            if not lowsky_ai.models:
                # 自动配置阿里云百炼模型
                lowsky_ai.add_model(
                    model_id="qwen",
                    model_name="qwen3.5-plus",  # 使用qwen-plus模型
                    api_key="sk-fd5060ca16c74de99e5e9fd06a56a0bd",
                    api_base="https://dashscope.aliyuncs.com/compatible-mode/v1",
                    max_tokens=8192,
                    temperature=0.7,
                    stream="true"
                )
                print("AI model auto-configured: qwen-plus (Alibaba Cloud)")
        except Exception as e:
            print(f"AI model auto-config failed: {e}")
            print("Please check API key and network connection")
