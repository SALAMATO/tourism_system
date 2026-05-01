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
                Q(description__icontains=keyword) |
                Q(city__icontains=keyword)
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

    def get_destinations(self, limit: int = 5, city: str = None, category: str = None, is_hot: bool = None) -> str:
        """
        获取网站旅游目的地数据（使用Django ORM）
        
        Args:
            limit: 返回数量
            city: 城市筛选（可选）
            category: 类别筛选（可选）
            is_hot: 是否热门筛选（可选）
            
        Returns:
            str: 旅游目的地列表
        """
        try:
            from api.models import Destination
            from django.db.models import Q
            
            # 构建查询条件
            query = Destination.objects.all()
            
            if city:
                query = query.filter(city__icontains=city)
            
            if category:
                query = query.filter(category__icontains=category)
            
            if is_hot is not None:
                query = query.filter(is_hot=is_hot)
            
            destinations = query.order_by('-is_hot', '-rating', '-views')[:limit]
            
            if not destinations:
                return "暂无旅游目的地数据。"
            
            result = "低空旅游目的地信息：\n\n"
            for dest in destinations:
                result += f"• {dest.name}\n"
                result += f"  城市：{dest.city}\n"
                if dest.state:
                    result += f"  省份：{dest.state}\n"
                result += f"  位置：{dest.location}\n"
                result += f"  类别：{dest.category}\n"
                result += f"  价格区间：{dest.price_range}\n"
                result += f"  游玩时长：{dest.duration}\n"
                result += f"  最佳季节：{dest.best_season}\n"
                result += f"  评分：{dest.rating}/10\n"
                result += f"  浏览次数：{dest.views:,}\n"
                if dest.is_hot:
                    result += f"  🔥 热门目的地\n"
                if dest.is_featured:
                    result += f"  ⭐ 首页推荐\n"
                
                # 显示特色亮点
                if dest.features and isinstance(dest.features, list):
                    result += f"  特色：{', '.join(dest.features[:5])}\n"
                
                # 显示简介（截取前300字符）
                desc = dest.description[:300] + '...' if len(dest.description) > 300 else dest.description
                result += f"  简介：{desc}\n\n"
            
            return result
        except Exception as e:
            return f"获取旅游目的地数据失败：{str(e)}"
    
    def search_destinations(self, keyword: str, limit: int = 5) -> str:
        """
        搜索旅游目的地（支持名称、位置、描述搜索）
        
        Args:
            keyword: 搜索关键词
            limit: 返回数量
            
        Returns:
            str: 搜索结果
        """
        try:
            from api.models import Destination
            from django.db.models import Q
            
            destinations = Destination.objects.filter(
                Q(name__icontains=keyword) | 
                Q(city__icontains=keyword) |
                Q(location__icontains=keyword) |
                Q(description__icontains=keyword) |
                Q(category__icontains=keyword)
            ).order_by('-is_hot', '-rating', '-views')[:limit]
            
            if not destinations:
                return f"未找到与'{keyword}'相关的旅游目的地。"
            
            result = f"搜索关键词：{keyword}\n\n找到 {len(destinations)} 个相关目的地：\n\n"
            for dest in destinations:
                result += f"• {dest.name}\n"
                result += f"  城市：{dest.city}\n"
                result += f"  位置：{dest.location}\n"
                result += f"  类别：{dest.category}\n"
                result += f"  评分：{dest.rating}/10\n"
                if dest.is_hot:
                    result += f"  🔥 热门\n"
                desc = dest.description[:200] + '...' if len(dest.description) > 200 else dest.description
                result += f"  简介：{desc}\n\n"
            
            return result
        except Exception as e:
            return f"搜索旅游目的地失败：{str(e)}"
    
    def get_current_time(self) -> str:
        """获取当前时间"""
        now = datetime.now()
        return f"当前时间：{now.strftime('%Y年%m月%d日 %H:%M:%S')}"
    
    def get_user_location(self, request=None) -> str:
        """
        获取用户IP地址和地理位置信息
        
        Args:
            request: Django请求对象（可选）
            
        Returns:
            str: 用户IP和位置信息
        """
        try:
            from api.utils import get_client_ip, parse_location_by_ip
            from django.conf import settings
            
            print("\n" + "="*60)
            print("🔍 [AI工具] get_user_location 被调用")
            print("="*60)
            
            # 如果没有request对象，尝试从Django设置中获取
            if request is None:
                print("❌ 错误：request对象为None")
                # 尝试从全局变量或上下文中获取
                try:
                    # 这里返回一个提示信息，实际使用时需要传入request
                    return "提示：此工具需要在有HTTP请求的上下文中使用，以获取用户的真实IP地址。"
                except:
                    return "无法获取用户位置信息（缺少请求上下文）"
            
            print(f"✅ request对象存在")
            
            # 获取客户端IP
            ip = get_client_ip(request)
            print(f"📍 客户端IP: {ip}")
            
            # 检查Session缓存（24小时有效期）
            cached_location = request.session.get('user_location_cache')
            print(f"💾 Session缓存: {cached_location is not None}")
            
            if cached_location:
                import time
                cache_time = cached_location.get('timestamp', 0)
                current_time = time.time()
                cache_age = current_time - cache_time
                
                print(f"⏰ 缓存时间: {cache_age:.0f}秒前")
                print(f"📊 缓存数据: city={cached_location.get('city')}, province={cached_location.get('province')}")
                
                # 如果缓存未过期（24小时内），直接返回缓存数据
                if current_time - cache_time < 86400:  # 24小时 = 86400秒
                    print("✅ 使用Session缓存的位置信息")
                    location_info = (
                        f"用户位置信息（来自缓存）：\n"
                        f"• IP地址：{ip}\n"
                        f"• 国家：{cached_location.get('country', '中国')}\n"
                        f"• 省份：{cached_location.get('province', '')}\n"
                        f"• 城市：{cached_location.get('city', '')}\n"
                        f"• 纬度：{cached_location.get('latitude', '')}\n"
                        f"• 经度：{cached_location.get('longitude', '')}"
                    )
                    print("="*60 + "\n")
                    return location_info
                else:
                    print("⚠️ 缓存已过期，将重新获取")
            
            # 缓存过期或不存在，调用API获取新位置
            print("🌐 调用高德地图API获取位置...")
            result = parse_location_by_ip(ip)
            
            if result:
                print(f"✅ API返回成功: {result}")
                # 更新Session缓存
                import time
                request.session['user_location_cache'] = {
                    'country': result.get('country', '中国'),
                    'province': result.get('province', ''),
                    'city': result.get('city', ''),
                    'latitude': result.get('latitude', ''),
                    'longitude': result.get('longitude', ''),
                    'timestamp': time.time()
                }
                print("💾 已更新Session缓存")
                
                location_info = (
                    f"用户位置信息：\n"
                    f"• IP地址：{ip}\n"
                    f"• 国家：{result.get('country', '中国')}\n"
                    f"• 省份：{result.get('province', '')}\n"
                    f"• 城市：{result.get('city', '')}\n"
                    f"• 纬度：{result.get('latitude', '')}\n"
                    f"• 经度：{result.get('longitude', '')}"
                )
                print("="*60 + "\n")
                return location_info
            else:
                print("❌ API返回失败")
                print("="*60 + "\n")
                return f"无法解析IP地址 {ip} 的位置信息"
                
        except Exception as e:
            import traceback
            print(f"❌ 异常: {str(e)}")
            print(traceback.format_exc())
            print("="*60 + "\n")
            return f"获取用户位置失败：{str(e)}"
    
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
            "get_destinations": self.get_destinations,
            "search_destinations": self.search_destinations,
            "get_user_location": self.get_user_location,
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
        },
        {
            "name": "get_destinations",
            "description": "获取旅游目的地列表，支持按城市、类别、热门程度筛选",
            "parameters": {
                "limit": "返回数量（默认5）",
                "city": "城市名称（可选）",
                "category": "类别（可选）",
                "is_hot": "是否热门（可选，true/false）"
            }
        },
        {
            "name": "search_destinations",
            "description": "搜索旅游目的地，支持名称、位置、描述、类别的关键词搜索",
            "parameters": {
                "keyword": "搜索关键词",
                "limit": "返回数量（默认5）"
            }
        },
        {
            "name": "get_user_location",
            "description": "获取当前用户的IP地址和地理位置信息（国家、省份、城市、经纬度），用于提供个性化推荐",
            "parameters": {}
        }
    ]
