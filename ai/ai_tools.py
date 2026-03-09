"""
AI工具函数 - 提供联网搜索和网站数据读取功能
"""

import requests
from typing import Dict, List, Any, Optional
from datetime import datetime
import json


class AITools:
    """AI助手工具集"""
    
    def __init__(self):
        self.base_url = "http://127.0.0.1:8000"
    
    def search_web(self, query: str) -> str:
        """
        联网搜索功能（使用Bing必应搜索）
        
        Args:
            query: 搜索关键词
            
        Returns:
            str: 搜索结果摘要
        """
        try:
            import requests
            from bs4 import BeautifulSoup
            import urllib.parse
            
            # 使用Bing搜索（国内可访问）
            encoded_query = urllib.parse.quote(query)
            url = f"https://cn.bing.com/search?q={encoded_query}"
            
            headers = {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
            
            response = requests.get(url, headers=headers, timeout=10)
            response.raise_for_status()
            
            soup = BeautifulSoup(response.text, 'html.parser')
            
            # 提取搜索结果
            results = []
            for item in soup.select('.b_algo')[:5]:  # 获取前5个结果
                title_elem = item.select_one('h2 a')
                desc_elem = item.select_one('.b_caption p')
                
                if title_elem:
                    title = title_elem.get_text(strip=True)
                    link = title_elem.get('href', '')
                    desc = desc_elem.get_text(strip=True) if desc_elem else ''
                    
                    results.append({
                        'title': title,
                        'link': link,
                        'description': desc[:200]
                    })
            
            if not results:
                return "未找到相关搜索结果。"
            
            # 格式化结果
            summary = f"搜索关键词：{query}\n\n"
            for i, result in enumerate(results, 1):
                summary += f"{i}. {result['title']}\n"
                if result['description']:
                    summary += f"   {result['description']}...\n"
                if result['link']:
                    summary += f"   来源：{result['link']}\n"
                summary += "\n"
            
            return summary
            
        except ImportError:
            return "联网搜索需要安装依赖：pip install requests beautifulsoup4"
        except requests.exceptions.Timeout:
            return "搜索超时，请稍后再试。"
        except requests.exceptions.RequestException as e:
            return "搜索暂时不可用，请稍后再试。"
        except Exception as e:
            return "搜索出现问题，请稍后再试。"
    
    def get_policies(self, limit: int = 5) -> str:
        """
        获取网站政策法规数据
        
        Args:
            limit: 返回数量
            
        Returns:
            str: 政策法规列表
        """
        try:
            response = requests.get(f"{self.base_url}/api/policies/?limit={limit}")
            data = response.json()
            
            if not data:
                return "暂无政策法规数据。"
            
            result = "网站政策法规：\n\n"
            for policy in data[:limit]:
                result += f"• {policy.get('title', '未知标题')}\n"
                result += f"  发布时间：{policy.get('publish_date', '未知')}\n"
                # 返回完整内容而不是摘要
                content = policy.get('content', policy.get('summary', '无内容'))
                result += f"  内容：{content}\n\n"
            
            return result
        except Exception as e:
            return "暂无政策法规数据。"
    
    def get_news(self, limit: int = 5) -> str:
        """
        获取网站新闻资讯数据
        
        Args:
            limit: 返回数量
            
        Returns:
            str: 新闻列表
        """
        try:
            response = requests.get(f"{self.base_url}/api/news/?limit={limit}")
            data = response.json()
            
            if not data:
                return "暂无新闻资讯数据。"
            
            result = "网站新闻资讯：\n\n"
            for news in data[:limit]:
                result += f"• {news.get('title', '未知标题')}\n"
                result += f"  发布时间：{news.get('publish_date', '未知')}\n"
                # 返回完整内容
                content = news.get('content', '无内容')
                result += f"  内容：{content}\n\n"
            
            return result
        except Exception as e:
            return "暂无新闻资讯数据。"
    
    def get_statistics(self, limit: int = 5) -> str:
        """
        获取网站统计数据
        
        Returns:
            str: 统计数据
        """
        try:
            response = requests.get(f"{self.base_url}/api/statistics/")
            data = response.json()
            
            if not data:
                return "暂无统计数据。"
            
            result = "低空旅游统计数据：\n\n"
            for stat in data[:limit]:
                result += f"• {stat.get('region', '未知地区')} ({stat.get('year', '未知年份')})\n"
                result += f"  游客数量：{stat.get('tourist_count', 0):,} 人\n"
                result += f"  收入：{stat.get('revenue', 0):,.2f} 万元\n"
                result += f"  项目数量：{stat.get('project_count', 0)} 个\n\n"
            
            return result
        except Exception as e:
            return "暂无统计数据。"
    
    def get_safety_alerts(self, limit: int = 5) -> str:
        """
        获取安全预警信息
        
        Args:
            limit: 返回数量
            
        Returns:
            str: 安全预警列表
        """
        try:
            response = requests.get(f"{self.base_url}/api/safety-alerts/?limit={limit}")
            data = response.json()
            
            if not data:
                return "暂无安全预警信息。"
            
            result = "安全预警信息：\n\n"
            for alert in data[:limit]:
                result += f"• {alert.get('title', '未知标题')}\n"
                result += f"  级别：{alert.get('level', '未知')}\n"
                result += f"  地区：{alert.get('region', '未知')}\n"
                result += f"  发布时间：{alert.get('alert_time', '未知')}\n\n"
            
            return result
        except Exception as e:
            return "暂无安全预警信息。"
    
    def search_site_content(self, keyword: str) -> str:
        """
        搜索网站内容
        
        Args:
            keyword: 搜索关键词
            
        Returns:
            str: 搜索结果
        """
        try:
            # 搜索政策
            policies = requests.get(f"{self.base_url}/api/policies/?search={keyword}").json()
            # 搜索新闻
            news = requests.get(f"{self.base_url}/api/news/?search={keyword}").json()
            
            result = f"网站内搜索：{keyword}\n\n"
            
            if policies:
                result += "相关政策法规：\n"
                for p in policies[:3]:
                    result += f"• {p.get('title', '未知')}\n"
                result += "\n"
            
            if news:
                result += "相关新闻：\n"
                for n in news[:3]:
                    result += f"• {n.get('title', '未知')}\n"
                result += "\n"
            
            if not policies and not news:
                result += "未找到相关内容。\n"
            
            return result
        except Exception as e:
            return "搜索暂时不可用，请稍后再试。"
    
    def get_current_time(self) -> str:
        """获取当前时间"""
        now = datetime.now()
        return f"当前时间：{now.strftime('%Y年%m月%d日 %H:%M:%S')}"
    
    def execute_tool(self, tool_name: str, **kwargs) -> str:
        """
        执行工具函数
        
        Args:
            tool_name: 工具名称
            **kwargs: 工具参数
            
        Returns:
            str: 执行结果
        """
        tools = {
            "search_web": self.search_web,
            "get_policies": self.get_policies,
            "get_news": self.get_news,
            "get_statistics": self.get_statistics,
            "get_safety_alerts": self.get_safety_alerts,
            "search_site_content": self.search_site_content,
            "get_current_time": self.get_current_time,
        }
        
        if tool_name not in tools:
            return f"未知工具：{tool_name}"
        
        try:
            return tools[tool_name](**kwargs)
        except Exception as e:
            return f"工具执行失败：{str(e)}"


# 全局工具实例
ai_tools = AITools()


def get_available_tools() -> List[Dict[str, Any]]:
    """获取可用工具列表"""
    return [
        {
            "name": "search_web",
            "description": "联网搜索最新信息（使用DuckDuckGo）",
            "parameters": {
                "query": "搜索关键词"
            }
        },
        {
            "name": "get_policies",
            "description": "获取网站的政策法规数据",
            "parameters": {
                "limit": "返回数量（默认5）"
            }
        },
        {
            "name": "get_news",
            "description": "获取网站的新闻资讯",
            "parameters": {
                "limit": "返回数量（默认5）"
            }
        },
        {
            "name": "get_statistics",
            "description": "获取低空旅游统计数据",
            "parameters": {}
        },
        {
            "name": "get_safety_alerts",
            "description": "获取安全预警信息",
            "parameters": {
                "limit": "返回数量（默认5）"
            }
        },
        {
            "name": "search_site_content",
            "description": "搜索网站内容",
            "parameters": {
                "keyword": "搜索关键词"
            }
        },
        {
            "name": "get_current_time",
            "description": "获取当前时间",
            "parameters": {}
        }
    ]
