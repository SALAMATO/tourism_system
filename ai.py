"""
LowSkyAI - Low Altitude Tourism AI Assistant
Supports 8K context, streaming, and tool calling (web search and website data access)
"""

import os
from typing import Dict, List, Optional, Any, Generator
import json
import re


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
            from ai_tools import ai_tools
            self.tools = ai_tools
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
        """Process tool calls in text"""
        if not self.tools:
            return text
        
        # Match tool call pattern
        pattern = r'\[TOOL:([a-zA-Z_]+)(?:\|([^\]]+))?\]'
        matches = re.findall(pattern, text)
        
        # Remove all tool call markers from text first
        for tool_name, params_str in matches:
            tool_call = f"[TOOL:{tool_name}|{params_str}]" if params_str else f"[TOOL:{tool_name}]"
            text = text.replace(tool_call, "")
        
        # Execute tools and collect results
        results = []
        for tool_name, params_str in matches:
            params = {}
            if params_str:
                for param in params_str.split('|'):
                    param = param.strip()
                    if '=' in param:
                        key, value = param.split('=', 1)
                        params[key.strip()] = value.strip()
            
            # Execute tool
            try:
                result = self.tools.execute_tool(tool_name, **params)
                if result and not result.startswith("暂无"):
                    results.append(result)
            except Exception as e:
                pass  # Silently ignore errors
        
        # Add results to text if any
        if results:
            text = text.strip() + "\n\n" + "\n\n".join(results)
        
        return text.strip()

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
    
    def chat_stream(
        self,
        message: str,
        context: Optional[Dict[str, Any]] = None
    ) -> Generator[str, None, None]:
        """Streaming chat generator"""
        if not self.current_model or self.current_model not in self.models:
            yield json.dumps({"error": "No AI model configured"})
            return
        
        self.conversation_history.append({
            "role": "user",
            "content": message
        })
        
        config = self.models[self.current_model]
        
        full_content = ""
        tool_call_pattern = r'\[TOOL:[a-zA-Z_]+(?:\|[^\]]+)?\]'
        
        for chunk in self._call_ollama_stream(message, config):
            full_content += chunk
            # Aggressively filter out ALL tool calls before yielding
            # Match [TOOL:anything] pattern
            filtered_chunk = re.sub(r'\[TOOL:[^\]]+\]', '', chunk)
            if filtered_chunk.strip():
                yield filtered_chunk
        
        # Process tool calls after streaming is complete
        if self.tools and "[TOOL:" in full_content:
            tool_results = self._process_tool_calls(full_content)
            # Extract only the new content (tool results)
            if tool_results != full_content:
                # Remove original content and tool markers, keep only results
                clean_original = re.sub(tool_call_pattern, '', full_content).strip()
                if tool_results.startswith(clean_original):
                    new_content = tool_results[len(clean_original):].strip()
                    if new_content:
                        yield "\n\n" + new_content
                full_content = tool_results
        
        self.conversation_history.append({
            "role": "assistant",
            "content": full_content
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
