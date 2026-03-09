"""
LowSkyAI - Low Altitude Tourism AI Assistant
Supports 8K context, streaming, and tool calling (web search and website data access)
集成display_handler处理文本显示
"""

import os
from typing import Dict, List, Optional, Any, Generator
from openai import OpenAI
import json
import re
from .display_handler import display_handler


class AIModelConfig:
    """AI Model Configuration"""
    
    def __init__(
        self,
        model_name: str,
        api_key: str,
        api_base: Optional[str] = None,
        max_tokens: int = 8000,
        temperature: float = 0.7,
        **kwargs
    ):
        self.model_name = model_name
        self.api_key = api_key
        self.api_base = api_base
        self.max_tokens = max_tokens
        self.temperature = temperature
        self.extra_params = kwargs


class LowSkyAI:
    """LowSkyAI Core Class"""
    
    def __init__(self):
        self.models: Dict[str, AIModelConfig] = {}
        self.current_model: Optional[str] = None
        self.conversation_history: List[Dict[str, str]] = []
        self.system_prompt = self._get_system_prompt()
        self.tools = None
        self._init_tools()
        
    def _init_tools(self):
        """Initialize tools"""
        try:
            from .ai_tools import AITools
            self.tools = AITools()
        except ImportError:
            print("Warning: ai_tools module not found, tool calling disabled")
        
    def _get_system_prompt(self) -> str:
        """Get system prompt"""
        try:
            prompt_file = os.path.join(os.path.dirname(__file__), 'system_prompt.txt')
            if os.path.exists(prompt_file):
                with open(prompt_file, 'r', encoding='utf-8') as f:
                    return f.read()
        except Exception as e:
            print(f"Failed to load system prompt: {e}")
        
        return """You are LowSkyAI, an AI assistant for low-altitude tourism.

When users ask about latest info or 2026 data, directly use [TOOL:search_web|query=keywords].
When users ask about website data, directly use [TOOL:get_news|limit=5] or other tools.
Do not ask users if they want to call tools, just call them directly.

Be professional and friendly."""

    def add_model(
        self,
        model_id: str,
        model_name: str,
        api_key: str = "",
        api_base: Optional[str] = None,
        max_tokens: int = 8000,
        temperature: float = 0.7,
        **kwargs
    ) -> bool:
        """Add AI model configuration"""
        try:
            config = AIModelConfig(
                model_name=model_name,
                api_key=api_key,
                api_base=api_base,
                max_tokens=max_tokens,
                temperature=temperature,
                **kwargs
            )
            self.models[model_id] = config
            
            if self.current_model is None:
                self.current_model = model_id
                
            return True
        except Exception as e:
            print(f"Failed to add model: {str(e)}")
            return False
    
    def remove_model(self, model_id: str) -> bool:
        """Remove AI model configuration"""
        if model_id in self.models:
            del self.models[model_id]
            if self.current_model == model_id:
                self.current_model = next(iter(self.models.keys()), None)
            return True
        return False
    
    def switch_model(self, model_id: str) -> bool:
        """Switch current model"""
        if model_id in self.models:
            self.current_model = model_id
            return True
        return False
    
    def get_models(self) -> Dict[str, Dict[str, Any]]:
        """Get all configured models"""
        return {
            model_id: {
                "model_name": config.model_name,
                "max_tokens": config.max_tokens,
                "temperature": config.temperature,
                "is_current": model_id == self.current_model
            }
            for model_id, config in self.models.items()
        }
    
    def _process_tool_calls(self, text: str) -> str:
        """Process tool calls in text using display_handler"""
        if not self.tools:
            return text
        
        # 提取工具调用
        tool_calls = display_handler.extract_tool_calls(text)
        
        # 过滤工具标记
        filtered_text = display_handler.filter_tool_calls(text)
        
        # 执行工具并收集结果
        results = []
        for tool_name, params in tool_calls:
            try:
                result = self.tools.execute_tool(tool_name, **params)
                if result and not result.startswith("暂无"):
                    results.append(result)
            except Exception as e:
                pass  # Silently ignore errors
        
        # 合并内容和工具结果
        if results:
            tool_results_text = "\n\n".join(results)
            return display_handler.merge_content_with_tool_results(filtered_text, tool_results_text)
        
        return filtered_text

    def chat(
        self,
        message: str,
        context: Optional[Dict[str, Any]] = None,
        stream: bool = True
    ) -> Dict[str, Any]:
        """Send message and get AI reply"""
        if not self.current_model or self.current_model not in self.models:
            return {
                "success": False,
                "error": "No AI model configured"
            }
        
        # Limit conversation history to prevent residual text
        if len(self.conversation_history) > 10:
            self.conversation_history = self.conversation_history[-10:]
        
        self.conversation_history.append({
            "role": "user",
            "content": message
        })
        
        response = self._call_ai_model(message, context, stream)
        
        if response.get("success") and response.get("content"):
            processed_content = self._process_tool_calls(response["content"])
            response["content"] = processed_content
        
        if response.get("success"):
            self.conversation_history.append({
                "role": "assistant",
                "content": response.get("content", "")
            })
        
        return response
    
    def _call_cloud_stream(self, message: str, config: AIModelConfig) -> Generator[str, None, None]:
        """Call Alibaba Cloud Qianwen API with streaming"""
        try:
            # Initialize OpenAI client for Alibaba Cloud
            client = OpenAI(
                api_key=config.api_key,
                base_url=config.api_base or "https://dashscope.aliyuncs.com/compatible-mode/v1"
            )
            
            # Call API with streaming
            completion = client.chat.completions.create(
                model=config.model_name,
                messages=self.conversation_history,
                temperature=config.temperature,
                max_tokens=config.max_tokens,
                stream=True
            )
            
            # Stream response
            for chunk in completion:
                if chunk.choices and len(chunk.choices) > 0:
                    delta = chunk.choices[0].delta
                    if hasattr(delta, 'content') and delta.content:
                        yield delta.content
                        
        except Exception as e:
            yield f"Error calling cloud API: {str(e)}"
    
    def chat_stream(
        self,
        message: str,
        context: Optional[Dict[str, Any]] = None
    ) -> Generator[str, None, None]:
        """Streaming chat generator with pre-formatted output using display_handler"""
        if not self.current_model or self.current_model not in self.models:
            yield json.dumps({"error": "No AI model configured"})
            return
        
        # Limit conversation history
        if len(self.conversation_history) > 10:
            self.conversation_history = self.conversation_history[-10:]
        
        self.conversation_history.append({
            "role": "user",
            "content": message
        })
        
        config = self.models[self.current_model]
        
        # Step 1: Collect all AI output
        full_content = ""
        for chunk in self._call_cloud_stream(message, config):
            full_content += chunk
        
        # Step 2: Process tools and filter tool calls using display_handler
        if self.tools and "[TOOL:" in full_content:
            processed_content = self._process_tool_calls(full_content)
        else:
            processed_content = display_handler.filter_tool_calls(full_content)
        
        # Step 3: Format content with proper structure using display_handler
        formatted_content = display_handler.format_output(processed_content)
        
        # Step 4: Stream the formatted content using display_handler
        for chunk in display_handler.stream_formatted_output(formatted_content):
            yield chunk
        
        # Save to history
        self.conversation_history.append({
            "role": "assistant",
            "content": formatted_content
        })
    
    def _call_ai_model(
        self,
        message: str,
        context: Optional[Dict[str, Any]],
        stream: bool
    ) -> Dict[str, Any]:
        """Call AI model API"""
        config = self.models[self.current_model]
        
        if "qwen" in config.model_name.lower() or "ollama" in config.model_name.lower():
            return self._call_ollama(message, config, stream)
        elif "gpt" in config.model_name.lower():
            return self._call_openai(message, config, stream)
        elif "claude" in config.model_name.lower():
            return self._call_anthropic(message, config, stream)
        
        return {
            "success": True,
            "content": f"Simulated reply. Your question: {message}",
            "model": config.model_name,
            "tokens_used": 0
        }
    
    def _call_ollama(
        self,
        message: str,
        config: AIModelConfig,
        stream: bool
    ) -> Dict[str, Any]:
        """Call Ollama local model API"""
        try:
            import requests
            
            api_base = config.api_base or "http://localhost:11434"
            url = f"{api_base}/api/chat"
            
            messages = [
                {"role": "system", "content": self.system_prompt}
            ]
            messages.extend(self.conversation_history)
            messages.append({"role": "user", "content": message})
            
            payload = {
                "model": config.model_name,
                "messages": messages,
                "stream": False,
                "options": {
                    "temperature": config.temperature,
                    "num_predict": config.max_tokens
                }
            }
            
            response = requests.post(url, json=payload, timeout=120)
            response.raise_for_status()
            
            result = response.json()
            
            return {
                "success": True,
                "content": result.get("message", {}).get("content", ""),
                "model": config.model_name,
                "tokens_used": result.get("eval_count", 0)
            }
            
        except ImportError:
            return {
                "success": False,
                "error": "Please install requests: pip install requests"
            }
        except Exception as e:
            try:
                import requests
                if isinstance(e, requests.exceptions.ConnectionError):
                    return {
                        "success": False,
                        "error": "Cannot connect to Ollama. Please run: ollama serve"
                    }
                elif isinstance(e, requests.exceptions.Timeout):
                    return {
                        "success": False,
                        "error": "Request timeout"
                    }
            except:
                pass
            
            return {
                "success": False,
                "error": f"Ollama call failed: {str(e)}"
            }
    
    def _call_ollama_stream(
        self,
        message: str,
        config: AIModelConfig
    ) -> Generator[str, None, None]:
        """Call Ollama streaming API"""
        try:
            import requests
            
            api_base = config.api_base or "http://localhost:11434"
            url = f"{api_base}/api/chat"
            
            messages = [
                {"role": "system", "content": self.system_prompt}
            ]
            messages.extend(self.conversation_history)
            messages.append({"role": "user", "content": message})
            
            payload = {
                "model": config.model_name,
                "messages": messages,
                "stream": True,
                "options": {
                    "temperature": config.temperature,
                    "num_predict": config.max_tokens
                }
            }
            
            response = requests.post(url, json=payload, stream=True, timeout=120)
            response.raise_for_status()
            
            for line in response.iter_lines():
                if line:
                    try:
                        chunk = json.loads(line)
                        content = chunk.get("message", {}).get("content", "")
                        if content:
                            yield content
                    except json.JSONDecodeError:
                        continue
                        
        except Exception as e:
            yield json.dumps({"error": f"Stream call failed: {str(e)}"})
    
    def _call_openai(self, message: str, config: AIModelConfig, stream: bool) -> Dict[str, Any]:
        return {"success": False, "error": "OpenAI interface not implemented"}
    
    def _call_anthropic(self, message: str, config: AIModelConfig, stream: bool) -> Dict[str, Any]:
        return {"success": False, "error": "Claude interface not implemented"}
    
    def clear_history(self):
        """Clear conversation history"""
        self.conversation_history = []
    
    def get_history(self, limit: int = 10) -> List[Dict[str, str]]:
        """Get conversation history"""
        return self.conversation_history[-limit:]
    
    def export_conversation(self) -> str:
        """Export conversation as JSON"""
        return json.dumps(self.conversation_history, ensure_ascii=False, indent=2)
    
    def set_system_prompt(self, prompt: str):
        """Set custom system prompt"""
        self.system_prompt = prompt


# Global AI instance
lowsky_ai = LowSkyAI()


# Convenience functions
def add_ai_model(model_id: str, model_name: str, api_key: str = "", **kwargs) -> bool:
    return lowsky_ai.add_model(model_id, model_name, api_key, **kwargs)


def chat_with_ai(message: str, context: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    return lowsky_ai.chat(message, context)


def get_ai_models() -> Dict[str, Dict[str, Any]]:
    return lowsky_ai.get_models()
