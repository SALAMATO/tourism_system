"""
Display Handler - 专门处理AI输出的文本显示和格式化
适配千问3.5-plus云端模型的输出格式
"""

import re
from typing import Generator


class DisplayHandler:
    """文本显示处理器"""
    
    def __init__(self):
        self.chunk_size = 3  # 流式输出的块大小
    
    def format_output(self, text: str) -> str:
        """
        格式化输出文本 - 简化版，不做过度处理
        
        Args:
            text: 原始文本
            
        Returns:
            str: 格式化后的文本
        """
        if not text:
            return ""
        
        # 只做最基本的清理，保持原始格式
        # 移除多余的空行（超过2个连续换行变成2个）
        text = re.sub(r'\n{3,}', '\n\n', text)
        
        # 移除行尾的空白字符
        lines = text.split('\n')
        cleaned_lines = [line.rstrip() for line in lines]
        
        return '\n'.join(cleaned_lines)
    
    def filter_tool_calls(self, text: str) -> str:
        """
        过滤工具调用标记
        
        Args:
            text: 包含工具调用标记的文本
            
        Returns:
            str: 过滤后的文本
        """
        if not text:
            return ''
        
        # 移除 [TOOL:...] 标记
        filtered = re.sub(r'\[TOOL:[^\]]+\]', '', text)
        
        # 移除空行
        filtered = re.sub(r'^\s*[\r\n]+', '', filtered, flags=re.MULTILINE)
        
        return filtered.strip()
    
    def stream_formatted_output(self, content: str) -> Generator[str, None, None]:
        """
        流式输出格式化后的内容
        
        Args:
            content: 要输出的内容
            
        Yields:
            str: 内容块
        """
        if not content:
            return
        
        # 按块大小分割内容
        for i in range(0, len(content), self.chunk_size):
            yield content[i:i + self.chunk_size]
    
    def process_markdown_for_display(self, text: str) -> str:
        """
        处理Markdown文本以便前端显示
        保留Markdown标记，让前端JavaScript处理渲染
        
        Args:
            text: Markdown文本
            
        Returns:
            str: 处理后的文本
        """
        if not text:
            return ""
        
        # 只做基本的清理，保留所有Markdown标记
        # 移除多余的空行（超过2个连续换行）
        text = re.sub(r'\n{3,}', '\n\n', text)
        
        return text.strip()
    
    def extract_tool_calls(self, text: str) -> list:
        """
        从文本中提取工具调用
        
        Args:
            text: 包含工具调用的文本
            
        Returns:
            list: 工具调用列表 [(tool_name, params_dict), ...]
        """
        pattern = r'\[TOOL:([a-zA-Z_]+)(?:\|([^\]]+))?\]'
        matches = re.findall(pattern, text)
        
        tool_calls = []
        for tool_name, params_str in matches:
            params = {}
            if params_str:
                for param in params_str.split('|'):
                    param = param.strip()
                    if '=' in param:
                        key, value = param.split('=', 1)
                        params[key.strip()] = value.strip()
            
            tool_calls.append((tool_name, params))
        
        return tool_calls
    
    def merge_content_with_tool_results(self, original_content: str, tool_results: str) -> str:
        """
        合并原始内容和工具结果
        
        Args:
            original_content: 原始AI输出（已过滤工具标记）
            tool_results: 工具执行结果
            
        Returns:
            str: 合并后的内容
        """
        if not tool_results or tool_results == original_content:
            return original_content
        
        # 如果工具结果以原始内容开头，提取新增部分
        clean_original = original_content.strip()
        if tool_results.startswith(clean_original):
            new_content = tool_results[len(clean_original):].strip()
            if new_content:
                return clean_original + "\n\n" + new_content
        
        return original_content + "\n\n" + tool_results
    
    def clean_response(self, text: str) -> str:
        """
        清理响应文本，移除不必要的内容
        
        Args:
            text: 原始响应文本
            
        Returns:
            str: 清理后的文本
        """
        if not text:
            return ""
        
        # 移除工具调用标记
        text = self.filter_tool_calls(text)
        
        # 移除多余空白
        text = re.sub(r' +', ' ', text)  # 多个空格变一个
        text = re.sub(r'\n{3,}', '\n\n', text)  # 多个换行变两个
        
        return text.strip()


# 全局实例
display_handler = DisplayHandler()
