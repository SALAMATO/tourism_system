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
                # 自动配置Qwen模型
                lowsky_ai.add_model(
                    model_id="qwen3.5",
                    model_name="qwen3.5:9b",
                    api_key="",
                    api_base="http://localhost:11434",
                    max_tokens=8000,
                    temperature=0.7,
                    stream="true"
                )
                print("AI model auto-configured: qwen3.5:9b")
        except Exception as e:
            print(f"AI model auto-config failed: {e}")
            print("Please run manually: python configure_qwen.py")
