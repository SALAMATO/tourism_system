"""
Display Handler - 专门处理AI输出的文本显示和格式化
适配千问3.5-plus云端模型的输出格式
"""

import re
from typing import Generator


class DisplayHandler:
    """文本显示处理器"""
    
    def __init__(self):
        self.chunk_size = 20  # 流式输出的块大小
    
    def format_output(self, text: str) -> str:
        """
        格式化输出文本，添加适当的结构和换行
        
        Args:
            text: 原始文本
            
        Returns:
            str: 格式化后的文本
        """
        if not text:
            return ""
        
        lines = text.split('\n')
        formatted_lines = []
        in_list = False
        
        for line in lines:
            line = line.strip()
            
            # 跳过空行
            if not line:
                if formatted_lines and formatted_lines[-1]:
                    formatted_lines.append('')
                continue
            
            # 标题 (# ## ### ####)
            if line.startswith('#'):
                # 标题前添加空行（除非是第一行）
                if formatted_lines and formatted_lines[-1]:
                    formatted_lines.append('')
                formatted_lines.append(line)
                formatted_lines.append('')  # 标题后空行
                in_list = False
                continue
            
            # 数字列表 (1. 2. 3. 等)
            if line[0].isdigit() and '. ' in line[:4]:
                if not in_list and formatted_lines and formatted_lines[-1]:
                    formatted_lines.append('')  # 列表开始前空行
                formatted_lines.append(line)
                in_list = True
                continue
            
            # 项目符号列表 (• - *)
            if line.startswith(('• ', '- ', '* ')):
                if not in_list and formatted_lines and formatted_lines[-1]:
                    formatted_lines.append('')  # 列表开始前空行
                formatted_lines.append(line)
                in_list = True
                continue
            
            # 普通段落
            if in_list:
                formatted_lines.append('')  # 列表结束后空行
                in_list = False
            
            formatted_lines.append(line)
            formatted_lines.append('')  # 段落后空行
        
        # 清理多个连续空行
        result = []
        prev_blank = False
        for line in formatted_lines:
            if not line:
                if not prev_blank:
                    result.append(line)
                prev_blank = True
            else:
                result.append(line)
                prev_blank = False
        
        return '\n'.join(result)
    
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
