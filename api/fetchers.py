"""
新闻和政策爬虫算法模块
用于从各类网站提取标题、作者、内容等信息
支持传统HTML网站和API接口型网站
"""

import requests
from lxml import html
import re
from datetime import datetime
import logging
import json

logger = logging.getLogger(__name__)


class ContentFetcher:
    """内容爬取基类"""
    
    def __init__(self, url):
        self.url = url
        self.tree = None
        self.response = None
        
    def fetch_page(self):
        """获取网页内容"""
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
            'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
            'Accept-Encoding': 'gzip, deflate, br',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1',
            'Sec-Fetch-Dest': 'document',
            'Sec-Fetch-Mode': 'navigate',
            'Sec-Fetch-Site': 'none',
            'Cache-Control': 'max-age=0',
        }
        
        try:
            self.response = requests.get(self.url, headers=headers, timeout=15, allow_redirects=True)
            logger.info(f"请求状态码: {self.response.status_code}, 内容长度: {len(self.response.content)}")
            
            # 改进的编码检测
            if self.response.encoding == 'ISO-8859-1' or self.response.encoding is None:
                # 尝试从Content-Type头部获取编码
                content_type = self.response.headers.get('Content-Type', '')
                if 'charset' in content_type:
                    charset = content_type.split('charset=')[-1].strip().strip('"').strip("'")
                    self.response.encoding = charset
                    logger.info(f"从Content-Type获取编码: {charset}")
                else:
                    # 使用apparent_encoding
                    detected_encoding = self.response.apparent_encoding
                    if detected_encoding and detected_encoding.lower() != 'iso-8859-1':
                        self.response.encoding = detected_encoding
                        logger.info(f"使用apparent_encoding: {detected_encoding}")
                    else:
                        # 默认使用UTF-8
                        self.response.encoding = 'utf-8'
                        logger.info("使用默认编码: utf-8")
            
            logger.info(f"最终使用编码: {self.response.encoding}")
            
            # 解析HTML
            self.tree = html.fromstring(self.response.content)
            return True
            
        except requests.Timeout:
            raise Exception('请求超时，请检查网络连接或稍后重试')
        except requests.RequestException as e:
            logger.error(f"网络请求失败: {str(e)}")
            raise Exception(f'网络请求失败: {str(e)}')
        except Exception as e:
            logger.error(f"解析失败: {str(e)}", exc_info=True)
            raise Exception(f'解析失败: {str(e)}')
    
    def extract_title(self):
        """提取标题"""
        title_selectors = [
            # 常见的文章标题class
            '//h1[@class="article_title"]/text()',
            '//h1[@class="title"]/text()',
            '//h2[@class="title"]/text()',
            '//div[@class="title"]/text()',
            '//div[@class="article-title"]/text()',
            '//div[@id="title"]/text()',
            # 腾讯新闻等媒体网站
            '//h1[@class="LEFT-tit"]/text()',
            '//h1[@class="content-title"]/text()',
            '//div[@class="LEFT-tit"]/text()',
            '//div[@class="content-title"]/text()',
            # 通用选择器
            '//div[@class="article"]//h1/text()',
            '//div[@class="content"]//h1/text()',
            '//article//h1/text()',
            '//main//h1/text()',
            '//h1/text()',
            '//h2/text()',
            # meta标签
            '//meta[@property="og:title"]/@content',
            '//meta[@name="title"]/@content',
            # 最后才用title标签
            '//title/text()',
        ]
        
        # 无效标题关键词列表
        invalid_keywords = [
            '即将离开', '是否继续', '404', '页面不存在',
            '访问错误', '正在跳转', '加载中', '腾讯网',
            '新浪网', '网易', '_手机', '_新闻',
        ]
        
        for selector in title_selectors:
            result = self.tree.xpath(selector)
            if result:
                temp_title = result[0].strip()
                
                # 检查是否包含无效关键词
                if any(keyword in temp_title for keyword in invalid_keywords):
                    logger.info(f"跳过无效标题: {temp_title}")
                    continue
                
                # 清理标题
                temp_title = self._clean_title(temp_title)
                
                if temp_title and len(temp_title) > 5:
                    logger.info(f"提取到标题: {temp_title}")
                    return temp_title
        
        return None
    
    def _clean_title(self, title):
        """清理标题"""
        # 移除网站名称和分隔符
        title = re.sub(r'[-_|]\s*[\u4e00-\u9fa5]+网.*$', '', title)
        title = re.sub(r'[-_|]\s*腾讯新闻.*$', '', title)
        title = re.sub(r'[-_|]\s*新浪新闻.*$', '', title)
        title = re.sub(r'[-_|]\s*网易新闻.*$', '', title)
        title = re.sub(r'_.*$', '', title)
        return title.strip()
    
    def extract_author(self):
        """提取作者/来源"""
        author_selectors = [
            '//span[@class="author"]/text()',
            '//div[@class="author"]/text()',
            '//span[@class="source"]/text()',
            '//div[@class="source"]/text()',
            '//meta[@name="author"]/@content',
            '//span[contains(@class, "author")]/text()',
            '//div[contains(@class, "author")]/text()',
            '//p[@class="author"]/text()',
            # 腾讯新闻等媒体网站
            '//span[@class="LEFT-name"]/text()',
            '//div[@class="LEFT-name"]/text()',
            '//span[@class="author-name"]/text()',
            '//div[@class="author-name"]/text()',
            '//span[contains(@class, "source")]/text()',
            '//div[contains(@class, "source")]/text()',
            # 通用模式
            '//span[contains(text(), "来源")]/following-sibling::text()',
            '//span[contains(text(), "作者")]/following-sibling::text()',
            '//div[contains(text(), "来源")]/following-sibling::text()',
            '//div[contains(text(), "作者")]/following-sibling::text()',
        ]
        
        for selector in author_selectors:
            result = self.tree.xpath(selector)
            if result:
                author = result[0].strip()
                # 清理作者信息
                author = re.sub(r'^(来源|作者|责编|编辑|记者)[:：]\s*', '', author)
                author = re.sub(r'\s*(来源|作者|责编|编辑|记者)\s*$', '', author)
                if author and 1 < len(author) < 50:
                    logger.info(f"提取到作者: {author}")
                    return author
        
        # 从URL推断来源
        author = self._infer_author_from_url()
        logger.info(f"从URL推断作者: {author}")
        return author
    
    def _infer_author_from_url(self):
        """从URL推断作者/来源"""
        url_mapping = {
            'ndrc.gov.cn': '国家发展改革委',
            'mee.gov.cn': '生态环境部',
            'caac.gov.cn': '中国民用航空局',
            'mot.gov.cn': '交通运输部',
            'gov.cn': '政府网站',
            'qq.com': '腾讯新闻',
            'sina.com': '新浪新闻',
            'sina.cn': '新浪新闻',
            '163.com': '网易新闻',
            'people.com': '人民网',
            'xinhuanet.com': '新华网',
        }
        
        for domain, author in url_mapping.items():
            if domain in self.url:
                return author
        
        return '未知作者'
    
    def extract_content(self):
        """提取内容 - 支持小标题和格式化"""
        content_parts = []
        
        # 查找内容容器
        container = self._find_content_container()
        
        if container is not None:
            # 改进的提取方法：按顺序提取所有元素，保留结构
            # 提取h2-h6标题、p段落、strong加粗等
            elements = container.xpath('.//*[self::h2 or self::h3 or self::h4 or self::h5 or self::h6 or self::p or self::div[@class="subtitle"] or self::strong]')
            
            logger.info(f"找到 {len(elements)} 个内容元素")
            
            for element in elements:
                tag = element.tag
                text = element.text_content().strip()
                
                if not text or len(text) < 3:
                    continue
                
                # 小标题（h2-h6）- 自动加粗
                if tag in ['h2', 'h3', 'h4', 'h5', 'h6']:
                    if len(text) < 100:  # 标题通常较短
                        formatted_text = f"**{text}**"
                        content_parts.append(formatted_text)
                        logger.info(f"提取到小标题: {text}")
                        continue
                
                # 加粗文本（strong, b）
                if tag in ['strong', 'b']:
                    if len(text) < 100:
                        formatted_text = f"**{text}**"
                        content_parts.append(formatted_text)
                        continue
                
                # 普通段落
                if tag == 'p' and len(text) > 10:
                    # 检查段落内是否有加粗元素
                    strong_elements = element.xpath('.//strong | .//b')
                    if strong_elements:
                        # 处理段落内的加粗
                        formatted_text = self._format_paragraph_with_bold(element)
                        content_parts.append(formatted_text)
                    else:
                        content_parts.append(text)
                    continue
                
                # div元素（可能是段落）
                if tag == 'div' and len(text) > 20:
                    # 避免重复（如果内容已经被子元素提取）
                    if text not in ' '.join(content_parts):
                        content_parts.append(text)
            
            # 如果提取的内容太少，使用备用方法
            if len(content_parts) < 3:
                logger.info("内容太少，使用备用提取方法")
                content_parts = self._extract_content_fallback(container)
        
        # 备用方法: 直接搜索所有相关标签
        if not content_parts:
            logger.info("尝试全局搜索内容元素")
            # 提取所有标题和段落
            all_elements = self.tree.xpath('//h2 | //h3 | //h4 | //p')
            logger.info(f"全局找到 {len(all_elements)} 个元素")
            
            for element in all_elements:
                text = element.text_content().strip()
                tag = element.tag
                
                if not text or len(text) < 10:
                    continue
                
                # 标题加粗
                if tag in ['h2', 'h3', 'h4'] and len(text) < 100:
                    content_parts.append(f"**{text}**")
                else:
                    content_parts.append(text)
        
        # 合并内容
        if content_parts:
            # 去重但保持顺序
            unique_parts = []
            seen = set()
            for part in content_parts:
                # 简化的去重逻辑（只去除完全相同的）
                if part not in seen:
                    seen.add(part)
                    unique_parts.append(part)
            
            content = '\n\n'.join(unique_parts)
            # 清理多余的空行
            content = re.sub(r'\n\s*\n\s*\n+', '\n\n', content)
            content = content.strip()
            
            logger.info(f"最终内容长度: {len(content)}, 段落数: {len(unique_parts)}")
            return content
        
        return None
    
    def _format_paragraph_with_bold(self, element):
        """格式化包含加粗元素的段落"""
        from lxml import html as lxml_html
        
        # 获取段落的HTML
        html_content = lxml_html.tostring(element, encoding='unicode')
        
        # 将<strong>和<b>标签转换为Markdown格式
        html_content = re.sub(r'<strong>(.*?)</strong>', r'**\\1**', html_content)
        html_content = re.sub(r'<b>(.*?)</b>', r'**\\1**', html_content)
        
        # 移除其他HTML标签
        text = re.sub(r'<[^>]+>', '', html_content)
        
        # 清理多余空白
        text = re.sub(r'\s+', ' ', text).strip()
        
        return text
    
    def _extract_content_fallback(self, container):
        """备用内容提取方法"""
        content_parts = []
        
        # 提取所有p标签
        paragraphs = container.xpath('.//p')
        for p in paragraphs:
            text = p.text_content().strip()
            if text and len(text) > 10:
                content_parts.append(text)
        
        # 如果还是不够，提取div
        if len(content_parts) < 3:
            divs = container.xpath('.//div')
            for div in divs:
                if div.text and len(div.text.strip()) > 20:
                    text = div.text.strip()
                    if text not in content_parts:
                        content_parts.append(text)
        
        return content_parts

    def _find_content_container(self):
        """查找内容容器"""
        container_selectors = [
            # 政府网站常用
            '//div[@class="article_content"]',
            '//div[@class="article-content"]',
            '//div[@class="content"]',
            '//div[@class="article_con"]',
            '//div[@id="content"]',
            '//div[@id="article"]',
            '//div[@id="articleContent"]',
            '//div[@id="article_content"]',
            '//div[@class="TRS_Editor"]',
            # 媒体网站常用
            '//div[@class="LEFT-con"]',
            '//div[@class="content-article"]',
            '//div[@id="Cnt-Main-Article-QQ"]',
            '//div[@class="article-body"]',
            '//div[@class="post-content"]',
            # 通用选择器
            '//article',
            '//main',
            '//div[contains(@class, "content")]',
            '//div[contains(@class, "article")]',
            '//div[@class="main-content"]',
            '//div[@class="text"]',
            '//div[@class="con"]',
        ]
        
        for selector in container_selectors:
            containers = self.tree.xpath(selector)
            if containers:
                logger.info(f"找到内容容器: {selector}")
                return containers[0]
        
        return None


class NewsFetcher(ContentFetcher):
    """新闻爬取器 - 支持传统HTML和API接口"""
    
    def __init__(self, url):
        super().__init__(url)
        self.api_data = None  # 存储API数据
    
    def fetch_page(self):
        """获取网页内容 - 智能判断使用HTML还是API"""
        # 检查是否是腾讯新闻
        if 'news.qq.com' in self.url and '/rain/a/' in self.url:
            logger.info("检测到腾讯新闻，尝试使用API接口")
            try:
                return self._fetch_qq_news_api()
            except Exception as e:
                logger.warning(f"API获取失败，尝试传统方法: {str(e)}")
                return super().fetch_page()
        else:
            # 使用父类的传统方法
            return super().fetch_page()
    
    def _fetch_qq_news_api(self):
        """通过API获取腾讯新闻内容"""
        try:
            # 从URL提取文章ID
            match = re.search(r'/([A-Z0-9]+)$', self.url)
            if not match:
                raise Exception('无法从URL提取文章ID')
            
            article_id = match.group(1)
            logger.info(f"腾讯新闻文章ID: {article_id}")
            
            # 腾讯新闻API接口
            api_url = f'https://pacaio.match.qq.com/irs/rcd?cid={article_id}'
            
            headers = {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Referer': self.url,
                'Accept': 'application/json',
            }
            
            response = requests.get(api_url, headers=headers, timeout=15)
            logger.info(f"API请求状态码: {response.status_code}")
            
            if response.status_code != 200:
                raise Exception(f'API请求失败: {response.status_code}')
            
            # 解析JSON数据
            try:
                data = response.json()
                logger.info(f"API返回数据: {json.dumps(data, ensure_ascii=False)[:200]}...")
                self.api_data = data
                self.response = response
                return True
            except json.JSONDecodeError as e:
                logger.error(f"JSON解析失败: {str(e)}")
                raise Exception('API返回数据格式错误')
                
        except Exception as e:
            logger.error(f"腾讯新闻API获取失败: {str(e)}")
            raise
    
    def extract_title(self):
        """提取标题"""
        # 如果有API数据，从API提取
        if self.api_data:
            try:
                title = self.api_data.get('title', '')
                if title:
                    logger.info(f"从API提取到标题: {title}")
                    return title
            except Exception as e:
                logger.error(f"从API提取标题失败: {str(e)}")
        
        # 使用父类方法（HTML解析）
        if self.tree is not None:
            return super().extract_title()
        
        return None
    
    def extract_author(self):
        """提取作者/来源"""
        # 如果有API数据，从API提取
        if self.api_data:
            try:
                author = (self.api_data.get('source', '') or 
                         self.api_data.get('media', '') or 
                         self.api_data.get('author', '') or
                         '腾讯新闻')
                logger.info(f"从API提取到作者: {author}")
                return author
            except Exception as e:
                logger.error(f"从API提取作者失败: {str(e)}")
        
        # 使用父类方法
        if self.tree is not None:
            return super().extract_author()
        
        return '腾讯新闻'
    
    def extract_content(self):
        """提取内容"""
        # 如果有API数据，从API提取
        if self.api_data:
            try:
                content_parts = []
                
                # 提取摘要
                abstract = self.api_data.get('abstract', '')
                if abstract:
                    content_parts.append(abstract)
                
                # 提取正文内容
                content = self.api_data.get('content', '')
                if content:
                    # 清理HTML标签
                    content = re.sub(r'<[^>]+>', '', content)
                    # 清理多余空白
                    content = re.sub(r'\s+', ' ', content)
                    content = content.strip()
                    if content:
                        content_parts.append(content)
                
                # 尝试其他可能的字段
                for key in ['info', 'text', 'body']:
                    if key in self.api_data:
                        value = self.api_data[key]
                        if isinstance(value, str):
                            value = re.sub(r'<[^>]+>', '', value)
                            value = re.sub(r'\s+', ' ', value).strip()
                            if value and value not in content_parts:
                                content_parts.append(value)
                        elif isinstance(value, dict) and 'content' in value:
                            value_content = value['content']
                            value_content = re.sub(r'<[^>]+>', '', value_content)
                            value_content = re.sub(r'\s+', ' ', value_content).strip()
                            if value_content and value_content not in content_parts:
                                content_parts.append(value_content)
                
                if content_parts:
                    final_content = '\n\n'.join(content_parts)
                    logger.info(f"从API提取到内容，长度: {len(final_content)}")
                    return final_content
                    
            except Exception as e:
                logger.error(f"从API提取内容失败: {str(e)}")
        
        # 使用父类方法
        if self.tree is not None:
            return super().extract_content()
        
        return None
    
    def extract_publish_date(self):
        """提取发布日期"""
        # 如果有API数据，从API提取
        if self.api_data:
            try:
                # 尝试从API数据提取时间戳
                timestamp = self.api_data.get('timestamp', 0) or self.api_data.get('time', 0)
                if timestamp:
                    # 转换时间戳为日期
                    dt = datetime.fromtimestamp(int(timestamp))
                    publish_date = dt.strftime('%Y-%m-%d')
                    logger.info(f"从API提取到发布日期: {publish_date}")
                    return publish_date
                
                # 尝试从其他字段提取
                for key in ['pubtime', 'publish_time', 'publishTime', 'date']:
                    pub_time = self.api_data.get(key, '')
                    if pub_time:
                        # 尝试解析日期字符串
                        date_match = re.search(r'(\d{4})[/-](\d{2})[/-](\d{2})', str(pub_time))
                        if date_match:
                            year, month, day = date_match.groups()
                            publish_date = f"{year}-{month}-{day}"
                            logger.info(f"从API提取到发布日期: {publish_date}")
                            return publish_date
                        
            except Exception as e:
                logger.error(f"从API提取日期失败: {str(e)}")
        
        # 从URL中提取 - 支持多种格式
        # 格式1: /202408/t20240821_xxx.html
        url_date_match = re.search(r'/(\d{4})(\d{2})/[ta](\d{8})', self.url)
        if url_date_match:
            year = url_date_match.group(1)
            month = url_date_match.group(2)
            full_date = url_date_match.group(3)
            day = full_date[6:8]
            publish_date = f"{year}-{month}-{day}"
            logger.info(f"从URL提取到发布日期: {publish_date}")
            return publish_date
        
        # 格式2:  (腾讯新闻格式)
        url_date_match2 = re.search(r'/(\d{4})(\d{2})(\d{2})[A-Z]', self.url)
        if url_date_match2:
            year, month, day = url_date_match2.groups()
            publish_date = f"{year}-{month}-{day}"
            logger.info(f"从URL提取到发布日期: {publish_date}")
            return publish_date
        
        # 格式3: /2024/08/21/
        url_date_match3 = re.search(r'/(\d{4})/(\d{2})/(\d{2})/', self.url)
        if url_date_match3:
            year, month, day = url_date_match3.groups()
            publish_date = f"{year}-{month}-{day}"
            logger.info(f"从URL提取到发布日期: {publish_date}")
            return publish_date
        
        # 使用当前日期
        publish_date = datetime.now().strftime('%Y-%m-%d')
        logger.info(f"使用当前日期: {publish_date}")
        return publish_date
    
    def fetch(self):
        """爬取新闻"""
        self.fetch_page()
        
        title = self.extract_title()
        if not title:
            raise Exception('无法提取标题，请检查URL或手动输入')
        
        author = self.extract_author()
        publish_date = self.extract_publish_date()
        
        content = self.extract_content()
        if not content or len(content) < 50:
            raise Exception(f'无法提取内容或内容过短（{len(content) if content else 0}字符），请检查URL或手动输入')
        
        return {
            'title': title,
            'author': author,
            'publish_date': publish_date,
            'content': content,
            'url': self.url
        }


class PolicyFetcher(ContentFetcher):
    """政策爬取器"""
    
    def extract_publish_date(self):
        """提取发布日期"""
        date_selectors = [
            '//span[@class="date"]/text()',
            '//div[@class="date"]/text()',
            '//span[@class="time"]/text()',
            '//div[@class="time"]/text()',
            '//span[contains(@class, "date")]/text()',
            '//span[contains(@class, "time")]/text()',
            '//meta[@name="publishdate"]/@content',
            '//meta[@property="article:published_time"]/@content',
        ]
        
        for selector in date_selectors:
            result = self.tree.xpath(selector)
            if result:
                date_str = result[0].strip()
                # 尝试解析日期
                date_patterns = [
                    r'(\d{4})[年/-](\d{1,2})[月/-](\d{1,2})',
                    r'(\d{4})(\d{2})(\d{2})',
                ]
                for pattern in date_patterns:
                    match = re.search(pattern, date_str)
                    if match:
                        year, month, day = match.groups()
                        publish_date = f"{year}-{month.zfill(2)}-{day.zfill(2)}"
                        logger.info(f"提取到发布日期: {publish_date}")
                        return publish_date
        
        # 从URL中提取
        url_date_match = re.search(r'/(\d{4})(\d{2})/t(\d{8})', self.url)
        if url_date_match:
            year = url_date_match.group(1)
            month = url_date_match.group(2)
            full_date = url_date_match.group(3)
            day = full_date[6:8]
            publish_date = f"{year}-{month}-{day}"
            logger.info(f"从URL提取到发布日期: {publish_date}")
            return publish_date
        
        # 使用当前日期
        publish_date = datetime.now().strftime('%Y-%m-%d')
        logger.info(f"使用当前日期: {publish_date}")
        return publish_date
    
    def fetch(self):
        """爬取政策"""
        self.fetch_page()
        
        title = self.extract_title()
        if not title:
            raise Exception('无法提取标题，请检查URL或手动输入')
        
        department = self.extract_author()  # 政策的"作者"就是发布部门
        publish_date = self.extract_publish_date()
        
        content = self.extract_content()
        if not content or len(content) < 50:
            raise Exception(f'无法提取内容或内容过短（{len(content) if content else 0}字符），请检查URL或手动输入')
        
        return {
            'title': title,
            'department': department,
            'publish_date': publish_date,
            'content': content,
            'url': self.url
        }
