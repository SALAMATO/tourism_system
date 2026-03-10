"""
AI工具函数 - 提供联网搜索、网站数据读取和数据库自然语言查询功能
使用Django ORM直接读取数据库，并集成 LangChain SQL 智能查询
"""

from typing import Dict, List, Any, Optional
from datetime import datetime


class AITools:
    """AI助手工具集"""
    
    def __init__(self):
        # 不再需要base_url，直接使用Django ORM
        # db_tool 延迟初始化，等待 LLM 配置注入
        self._db_tool = None
        self._llm_config: Optional[Dict] = None

    def set_llm_config(self, api_key: str, api_base: str = None, model_name: str = None):
        """
        注入 LLM 配置，用于数据库自然语言查询（db_query 工具）。
        在 LowSkyAI 初始化模型后调用此方法。
        """
        self._llm_config = {
            'api_key': api_key,
            'api_base': api_base or 'https://dashscope.aliyuncs.com/compatible-mode/v1',
            'model_name': model_name or 'qwen-plus',
        }
        # 重置，下次使用时重建
        self._db_tool = None

    def _get_db_tool(self):
        """懒加载数据库查询工具"""
        if self._db_tool is None:
            from .db_tools import get_db_tool
            self._db_tool = get_db_tool(llm_config=self._llm_config)
        return self._db_tool
    
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
        except Exception as e:
            return "搜索暂时不可用，请稍后再试。"
    
    def get_policies(self, limit: int = 5) -> str:
        """
        获取网站政策法规数据（使用Django ORM）
        
        Args:
            limit: 返回数量
            
        Returns:
            str: 政策法规列表
        """
        try:
            from api.models import Policy
            
            policies = Policy.objects.all().order_by('-publish_date')[:limit]
            
            if not policies:
                return "暂无政策法规数据。"
            
            result = "网站政策法规：\n\n"
            for policy in policies:
                result += f"• {policy.title}\n"
                result += f"  发布部门：{policy.department}\n"
                result += f"  政策级别：{policy.level}\n"
                result += f"  发布时间：{policy.publish_date.strftime('%Y-%m-%d')}\n"
                # 返回完整内容（截取前500字符）
                content = policy.content[:500] + '...' if len(policy.content) > 500 else policy.content
                result += f"  内容：{content}\n\n"
            
            return result
        except Exception as e:
            return f"获取政策法规数据失败：{str(e)}"
    
    def get_news(self, limit: int = 5) -> str:
        """
        获取网站新闻资讯数据（使用Django ORM）
        
        Args:
            limit: 返回数量
            
        Returns:
            str: 新闻列表
        """
        try:
            from api.models import News
            
            news_list = News.objects.all().order_by('-publish_date')[:limit]
            
            if not news_list:
                return "暂无新闻资讯数据。"
            
            result = "网站新闻资讯：\n\n"
            for news in news_list:
                result += f"• {news.title}\n"
                result += f"  作者：{news.author}\n"
                result += f"  分类：{news.category}\n"
                result += f"  发布时间：{news.publish_date.strftime('%Y-%m-%d')}\n"
                # 返回完整内容（截取前500字符）
                content = news.content[:500] + '...' if len(news.content) > 500 else news.content
                result += f"  内容：{content}\n\n"
            
            return result
        except Exception as e:
            return f"获取新闻资讯数据失败：{str(e)}"
    
    def get_statistics(self, limit: int = 5) -> str:
        """
        获取网站统计数据（使用Django ORM）
        
        Args:
            limit: 返回数量
            
        Returns:
            str: 统计数据
        """
        try:
            from api.models import Statistic
            
            statistics = Statistic.objects.all().order_by('-year', 'region')[:limit]
            
            if not statistics:
                return "暂无统计数据。"
            
            result = "低空旅游统计数据：\n\n"
            for stat in statistics:
                result += f"• {stat.region} ({stat.year}年)\n"
                result += f"  游客数量：{stat.tourist_count:,.1f} 万人次\n"
                result += f"  营收：{stat.revenue:,.2f} 万元\n"
                result += f"  航班次数：{stat.flight_count:,} 次\n"
                result += f"  航空器数量：{stat.aircraft_count} 架\n"
                result += f"  增长率：{stat.growth_rate}%\n\n"
            
            return result
        except Exception as e:
            return f"获取统计数据失败：{str(e)}"
    
    def get_safety_alerts(self, limit: int = 5) -> str:
        """
        获取安全预警信息（使用Django ORM）
        
        Args:
            limit: 返回数量
            
        Returns:
            str: 安全预警列表
        """
        try:
            from api.models import SafetyAlert
            
            alerts = SafetyAlert.objects.all().order_by('-report_date')[:limit]
            
            if not alerts:
                return "暂无安全预警信息。"
            
            result = "安全隐患预警信息：\n\n"
            for alert in alerts:
                result += f"• {alert.title}\n"
                result += f"  风险等级：{alert.risk_level}\n"
                result += f"  隐患类别：{alert.category}\n"
                result += f"  状态：{alert.status}\n"
                result += f"  报告日期：{alert.report_date.strftime('%Y-%m-%d')}\n"
                result += f"  描述：{alert.description[:200]}...\n"
                result += f"  预防措施：{alert.prevention[:200]}...\n\n"
            
            return result
        except Exception as e:
            return f"获取安全预警信息失败：{str(e)}"
    
    def search_site_content(self, keyword: str) -> str:
        """
        搜索网站内容（使用Django ORM）
        
        Args:
            keyword: 搜索关键词
            
        Returns:
            str: 搜索结果
        """
        try:
            from api.models import Policy, News, Destination
            from django.db.models import Q
            
            # 搜索政策
            policies = Policy.objects.filter(
                Q(title__icontains=keyword) | 
                Q(content__icontains=keyword) |
                Q(department__icontains=keyword)
            )[:3]
            
            # 搜索新闻
            news = News.objects.filter(
                Q(title__icontains=keyword) | 
                Q(content__icontains=keyword)
            )[:3]
            
            # 搜索目的地
            destinations = Destination.objects.filter(
                Q(name__icontains=keyword) | 
                Q(location__icontains=keyword) |
                Q(description__icontains=keyword)
            )[:3]
            
            result = f"网站内搜索：{keyword}\n\n"
            
            if policies:
                result += "相关政策法规：\n"
                for p in policies:
                    result += f"• {p.title} - {p.department}\n"
                result += "\n"
            
            if news:
                result += "相关新闻：\n"
                for n in news:
                    result += f"• {n.title} - {n.publish_date.strftime('%Y-%m-%d')}\n"
                result += "\n"
            
            if destinations:
                result += "相关旅游目的地：\n"
                for d in destinations:
                    result += f"• {d.name} - {d.location}\n"
                result += "\n"
            
            if not policies and not news and not destinations:
                result += "未找到相关内容。\n"
            
            return result
        except Exception as e:
            return f"搜索失败：{str(e)}"
    
    def db_query(self, question: str) -> str:
        """
        自然语言数据库查询（LangChain SQL Agent）
        流程：用户问题 → AI生成SQL → 数据库执行 → 返回数据 → AI整理回答

        Args:
            question: 用户的自然语言问题，例如 "统计各地区游客数量" 

        Returns:
            str: AI 整理后的查询结果
        """
        try:
            tool = self._get_db_tool()
            result = tool.query(question)
            return result
        except Exception as e:
            return f"数据库查询失败：{str(e)}"

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
            "db_query": self.db_query,
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
            "description": "联网搜索最新信息（使用必应搜索）",
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
            "parameters": {
                "limit": "返回数量（默认5）"
            }
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
        },
        {
            "name": "db_query",
            "description": "自然语言数据库查询：将问题转为SQL执行并返回结构化结果。适用于统计分析、数据汇总、多条件筛选等复杂查询",
            "parameters": {
                "question": "自然语言查询问题，例如：各地区游客数量排名、高风险安全预警列表、最新10条政策"
            }
        }
    ]
