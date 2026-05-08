"""
LangChain SQL 数据库查询工具
实现流程：用户提问 → AI生成SQL → 数据库执行 → 返回数据 → AI整理回答

使用方式（与 SQLDatabaseChain 接口保持一致）：
    from ai.db_tools import SQLDatabaseChain, get_db, get_llm
    db_chain = SQLDatabaseChain.from_llm(llm, db)
    result = db_chain.run("最近有哪些安全隐患？")
"""

from pathlib import Path
from typing import Optional
import hashlib
import time


# ── 数据库表结构说明（供 AI 生成 SQL 时参考） ────────────────────────────
DB_SCHEMA_DESCRIPTION = """
本系统使用 SQLite 数据库，包含以下数据表（均为低空旅游系统数据）：

【destinations】低空旅游目的地
  - id, name(目的地名称), city(所属城市), location(地理位置)
  - state(省份/州), country(国家), is_domestic(是否国内 0/1)
  - description(详细介绍), category(类别), price_range(价格区间)
  - duration(游玩时长), best_season(最佳季节)
  - features(JSON数组-特色亮点), rating(评分0-10), views(浏览次数)
  - is_hot(是否热门 0/1), is_featured(首页推荐 0/1)
  - recommendation_type(JSON数组-推荐类型: default/nearby/managed/selected)
  - sort_order(排序值), publish_date(发布日期)
  - created_at, updated_at

【policies】政策法规
  - id, title(标题), level(政策级别), category(分类)
  - department(发布部门), publish_date(发布日期), content(内容)
  - views(浏览次数), created_at, updated_at

【news】新闻资讯
  - id, title(标题), category(分类), author(作者)
  - content(内容), publish_date(发布日期), views(浏览次数)
  - created_at, updated_at

【safety_alerts】安全隐患预警
  - id, title(标题), risk_level(风险等级: 高/中/低)
  - category(隐患类别), description(描述), prevention(预防措施)
  - emergency_plan(应急预案), report_date(报告日期)
  - status(状态: 待处理/处理中/已解决), created_at, updated_at

【statistics】低空旅游统计数据
  - id, region(地区), year(年份), tourist_count(游客数量万人次)
  - revenue(营收万元), flight_count(航班次数), aircraft_count(航空器数量)
  - growth_rate(增长率%), created_at, updated_at

【messages】用户留言
  - id, message_type(消息类型), content(内容), reply(回复)
  - status(状态), likes_count(点赞数), created_at, updated_at

【china_cities】中国城市经纬度数据（可选表）
  - country(国家), state(省份), city(城市名称)
  - latitude(纬度), longitude(经度), is_domestic(是否国内 0/1)
  - 注意：此表需要单独导入，用于地理位置查询和距离计算

注意：
- 日期字段格式为 ISO 8601（如 '2024-01-01'）
- 只生成 SELECT 查询，禁止 INSERT/UPDATE/DELETE
- 查询结果限制在合理范围内（LIMIT 20以内）
"""


# ══════════════════════════════════════════════════════════════════════
# SQLDatabaseChain —— 与官方旧版接口保持一致的替代实现
# 用法：
#   db_chain = SQLDatabaseChain.from_llm(llm, db)
#   result   = db_chain.run("最近有哪些安全隐患？")
# ══════════════════════════════════════════════════════════════════════
class SQLDatabaseChain:
    """
    SQLDatabaseChain 的现代实现。
    与旧版 langchain.chains.SQLDatabaseChain 接口兼容：
        - SQLDatabaseChain.from_llm(llm, db)  → 创建实例
        - chain.run(question)                 → 返回自然语言结果
    """

    def __init__(self, llm, db):
        self._llm = llm
        self._db = db

    # ── 类方法工厂（与旧版 from_llm 签名一致） ───────────────────────────
    @classmethod
    def from_llm(cls, llm, db, **kwargs) -> "SQLDatabaseChain":
        """
        Args:
            llm: ChatOpenAI 或任何 LangChain LLM 实例
            db:  langchain_community.utilities.SQLDatabase 实例
        """
        return cls(llm=llm, db=db)

    # ── 主入口（与旧版 chain.run() 一致） ────────────────────────────────
    def run(self, question: str) -> str:
        """
        流程：
          1. 用户问题 + 表结构 → AI 生成 SQL
          2. 执行 SQL
          3. 原始结果 → AI 整理成自然语言回答
        """
        # Step 1 —— 生成 SQL
        sql = self._generate_sql(question)

        # Step 2 —— 执行 SQL
        raw_result = self._execute_sql(sql)

        # Step 3 —— 整理回答
        return self._format_answer(question, raw_result)

    # ── Step 1：自然语言 → SQL ───────────────────────────────────────────
    def _generate_sql(self, question: str) -> str:
        from langchain_core.messages import HumanMessage, SystemMessage

        system_msg = SystemMessage(content=f"""\
你是一个专业的 SQL 生成助手。根据用户问题和数据库表结构，生成正确的 SQLite SELECT 语句。

{DB_SCHEMA_DESCRIPTION}

规则：
1. 只生成 SELECT 语句，禁止 INSERT/UPDATE/DELETE
2. 添加合理的 LIMIT（最多20条）
3. 只返回 SQL 语句本身，不要加任何解释、不要加 markdown 代码块
4. 字段名和表名必须与上方表结构完全一致
5. 日期比较用 DATE() 函数
6. 凡是查询 created_at / updated_at 字段，必须用 STRFTIME('%Y-%m-%d %H:%M:%S', created_at) 格式化，去除微秒部分
7. 统计数据（statistics 表）查询时，不要 SELECT created_at 和 updated_at，只查业务字段
8. 统计数据字段对应关系：tourist_count=游客人数(万人次), revenue=营收(万元), flight_count=航班次数, aircraft_count=航空器数量, growth_rate=增长率(%)
9. destinations表的features和recommendation_type是JSON数组字段，SQLite中使用json_each()或LIKE进行查询
10. 地理位置查询可以使用china_cities表（如果存在）关联destinations表的city字段，获取经纬度进行距离计算
11. 【重要】查询 news 表时，绝对不要 SELECT content 字段，只查询 id, title, category, author, publish_date, views 等元数据字段
12. 【重要】查询 policies 表时，也尽量不要 SELECT content 字段，除非用户明确要求查看政策全文
13. 【重要】查询 safety_alerts 表时，绝对不要 SELECT description、prevention、emergency_plan 字段，只查询 id, title, risk_level, category, report_date, status 等元数据字段
""")
        human_msg = HumanMessage(content=f"用户问题：{question}")

        response = self._llm.invoke([system_msg, human_msg])
        sql = response.content.strip()

        # 清理可能的 markdown 标记
        sql = sql.replace('```sql', '').replace('```', '').strip()

        # 安全检查：只允许 SELECT
        if not sql.upper().lstrip().startswith('SELECT'):
            raise ValueError(f"AI 生成了非 SELECT 语句，已拒绝执行: {sql[:80]}")

        return sql

    # ── Step 2：执行 SQL ─────────────────────────────────────────────────
    def _execute_sql(self, sql: str) -> str:
        try:
            result = self._db.run(sql)
            return result if result else "（查询结果为空）"
        except Exception as e:
            raise RuntimeError(f"SQL 执行错误: {e}\nSQL: {sql}")

    # ── Step 3：整理回答 ─────────────────────────────────────────────────
    def _format_answer(self, question: str, raw_result: str) -> str:
        from langchain_core.messages import HumanMessage, SystemMessage

        system_msg = SystemMessage(content="""\
你是低空旅游信息管理系统的 AI 助手。

你的任务是：根据用户问题和数据库查询结果，生成清晰、专业、友好的中文回答。

【回答规则】

1. 如果数据库结果为空：
   - 回复：“暂无相关数据，请尝试其他查询条件。”

2. 如果只有一条数据：
   - 用简洁的文字描述

3. 如果有多条数据：
   - 必须使用标准 Markdown 表格格式展示
   - 表格格式示例：
     ```
     | 列名1 | 列名2 | 列名3 |
     | --- | --- | --- |
     | 数据1 | 数据2 | 数据3 |
     ```
   - 表头和数据之间必须有分隔行（使用 ---）
   - 每个单元格的数据前后各有一个空格

4. 输出要求：
   - 语言简洁
   - 重点突出
   - 不解释数据库结构
   - 不暴露 SQL 语句
   - 开头使用友好的引导语，如“以下是相关的旅游目的地信息：”

5. 时间格式要求：
   - 只保留到秒
   - 示例：2026-02-25 10:11:37
   - 不显示微秒

6. 不展示以下字段：
   - id
   - created_at
   - updated_at

7. 统计数据表格列名必须使用中文：

| 地区 | 年份 | 万人次 | 营收(万元) | 航班次数 | 航空器数量 | 增长率(%) |
| --- | --- | --- | --- | --- | --- | --- |
| 广东省 | 2024 | 110.0 | 85000.0 | 3200 | 45 | 28.5% |

8. 【旅游目的地特殊处理】
   - 如果查询结果包含 destinations 表的数据，项目名称必须使用 Markdown 链接格式
   - 链接格式：[项目名称](/destination-detail.html?id=ID值)
   - 示例格式：
     ```
     以下是相关的旅游目的地信息：

     | 项目名称 | 所在城市 | 地点 | 所在国家 | 价格 | 持续时间 | 适合季节 |
     | --- | --- | --- | --- | --- | --- | --- |
     | [直升机鸟瞰长城](/destination-detail.html?id=1) | 北京 | 八达岭长城 | 中国 | US$480.00/人 | 2小时15分钟 | 春秋两季 |
     | [拉斯维加斯大道直升机夜航](/destination-detail.html?id=2) | 拉斯维加斯 | Las Vegas | 美国 | 低至 US$109.71/人 | 12分钟 | 全年 |

     点击项目名称可查看完整目的地信息
     ```

9. 【新闻资讯特殊处理】
   - 如果查询结果包含 news 表的数据，不要展示 content 字段
   - 在表格中只显示：标题、分类、作者、发布日期、浏览量
   - 标题必须使用 Markdown 链接格式：[标题文本](/news/news-detail.html/?id=ID值)
   - 在表格后添加提示：“点击标题可查看完整新闻内容”
   - 示例格式：
     ```
     以下是相关的新闻资讯：

     | 标题 | 分类 | 作者 | 发布日期 | 浏览量 |
     | --- | --- | --- | --- | --- |
     | [低空旅游新政发布](/news/news-detail.html/?id=1) | 政策动态 | 张记者 | 2026-05-01 | 1234 |
     | [直升机观光项目上线](/news/news-detail.html/?id=2) | 行业动态 | 李编辑 | 2026-04-28 | 856 |

     点击标题可查看完整新闻内容
     ```

10. 【政策法规特殊处理】
    - 如果查询结果包含 policies 表的数据且没有 content 字段，只显示元数据
    - 标题必须使用 Markdown 链接格式：[标题文本](/policies/policy-detail.html?id=ID值)
    - 在表格后添加提示：“点击标题可查看完整政策内容”
    - 示例格式：
      ```
      以下是相关的政策法规：

      | 标题 | 级别 | 分类 | 发布部门 | 发布日期 |
      | --- | --- | --- | --- | --- |
      | [低空旅游管理办法](/policies/policy-detail.html?id=1) | 国家级 | 管理规定 | 民航局 | 2026-03-01 |
      | [无人机飞行管理条例](/policies/policy-detail.html?id=2) | 省级 | 安全管理 | 省政府 | 2026-02-15 |

      点击标题可查看完整政策内容
      ```

11. 【安全预警特殊处理】
    - 如果查询结果包含 safety_alerts 表的数据，绝对不要展示 description、prevention、emergency_plan 字段
    - 在表格中只显示：标题、风险等级、隐患类别、报告日期、状态
    - 标题必须使用 JavaScript 弹窗链接格式，调用 showSafetyAlertDetail(ID值) 函数
    - 链接格式：<a href="javascript:void(0)" onclick="showSafetyAlertDetail(ID值)">标题文本</a>
    - 在表格后添加提示：“点击标题可查看详情、预防措施和应急预案”
    - 示例格式：
      ```
      以下是相关的安全隐患预警：

      | 标题 | 风险等级 | 隐患类别 | 报告日期 | 状态 |
      | --- | --- | --- | --- | --- |
      | <a href="javascript:void(0)" onclick="showSafetyAlertDetail(1)">某景区直升机起降点风速超标</a> | 高 | 气象条件 | 2026-05-01 | 处理中 |
      | <a href="javascript:void(0)" onclick="showSafetyAlertDetail(2)">无人机禁飞区违规飞行</a> | 中 | 违规操作 | 2026-04-28 | 待处理 |

      点击标题可查看详情、预防措施和应急预案
      ```

请严格按照以上格式要求回答，确保表格规范美观。
"""
                                   )
        human_msg = HumanMessage(content=f"""\
用户问题：{question}

数据库查询结果：
{raw_result}

请根据以上结果，用中文回答用户问题。
""")

        response = self._llm.invoke([system_msg, human_msg])
        return response.content.strip()


# ══════════════════════════════════════════════════════════════════════
# 便捷工厂函数 —— 复刻用户示例中的 get_db() / get_llm() 用法
# ══════════════════════════════════════════════════════════════════════

def get_db():
    """
    获取 SQLDatabase 实例（连接本项目的 SQLite）。

    用法：
        db = get_db()
    """
    from langchain_community.utilities import SQLDatabase

    base_dir = Path(__file__).resolve().parent.parent
    db_path = base_dir / 'db.sqlite3'

    return SQLDatabase.from_uri(
        f"sqlite:///{db_path}",
        include_tables=[
            'destinations', 'policies', 'news',
            'safety_alerts', 'statistics', 'messages'
        ],
        sample_rows_in_table_info=2,
    )


# ── 数据库查询专用模型配置（统一从 config.py 读取） ─────────────────────
try:
    from .config import DB_MODEL as DB_MODEL_NAME, DB_MAX_TOKENS, DB_TEMPERATURE
except ImportError:
    # 兜底默认值
    DB_MODEL_NAME = 'qwen-turbo'
    DB_MAX_TOKENS = 512
    DB_TEMPERATURE = 0.2


def get_llm(api_key: str, api_base: str = None, model_name: str = None):
    """
    获取数据库查询专用 LLM。
    模型参数统一由 config.py 中的 DB_MODEL / DB_MAX_TOKENS / DB_TEMPERATURE 控制。
    无论传入什么 model_name，数据库模式始终使用 config.DB_MODEL。
    """
    from langchain_openai import ChatOpenAI
    try:
        from .config import QIANWEN_BASE_URL
    except ImportError:
        QIANWEN_BASE_URL = 'https://dashscope.aliyuncs.com/compatible-mode/v1'

    return ChatOpenAI(
        model=DB_MODEL_NAME,
        api_key=api_key,
        base_url=api_base or QIANWEN_BASE_URL,
        temperature=DB_TEMPERATURE,
        max_tokens=DB_MAX_TOKENS,
    )


# ══════════════════════════════════════════════════════════════════════
# DatabaseQueryTool —— 供 ai_tools.py 内部调用的高层封装
# ══════════════════════════════════════════════════════════════════════
class DatabaseQueryTool:
    """
    高层封装：持有 llm_config，懒加载 db/llm，对外只暴露 query()。
    由 ai_tools.AITools._get_db_tool() 使用。
    """

    def __init__(self, llm_config: Optional[dict] = None):
        self.llm_config = llm_config or {}
        self._chain: Optional[SQLDatabaseChain] = None
        # 内存缓存（短期）：{question_hash: (result, timestamp)}
        self._cache: dict = {}
        self._cache_ttl = 300  # 内存缓存有效期5分钟
        # 数据库缓存配置
        self._db_cache_enabled = True  # 是否启用数据库缓存
        self._db_cache_ttl = 86400  # 数据库缓存有效期24小时（秒）

    def _get_chain(self) -> SQLDatabaseChain:
        """懒加载：首次调用时创建 SQLDatabaseChain"""
        if self._chain is not None:
            return self._chain

        if not self.llm_config.get('api_key'):
            raise RuntimeError("LLM 未配置 api_key，无法执行数据库查询")

        # 连接数据库
        db = get_db()

        # 创建 LLM
        llm = get_llm(
            api_key=self.llm_config['api_key'],
            api_base=self.llm_config.get('api_base'),
            model_name=self.llm_config.get('model_name'),
        )

        # 创建链（与用户示例写法一致）
        self._chain = SQLDatabaseChain.from_llm(llm, db)
        return self._chain

    def query(self, question: str) -> str:
        """
        主入口：自然语言 → SQL → 执行 → 整理回答
        
        支持语义相似度匹配，意思相近的问题可以共享缓存

        用法：
            tool = DatabaseQueryTool(llm_config={...})
            result = tool.query("最近有哪些安全隐患？")
        """
        try:
            import hashlib
            import time
            from django.utils import timezone
            from datetime import timedelta
            
            # 1. 生成标准化问题（用于语义匹配）
            normalized_question = self._normalize_question(question)
            
            # 2. 生成精确哈希（用于精确匹配）
            exact_hash = hashlib.md5(question.encode('utf-8')).hexdigest()
            
            # 3. 生成语义哈希（用于相似问题匹配）
            semantic_hash = hashlib.md5(normalized_question.encode('utf-8')).hexdigest()
            
            print(f"📝 原始问题: {question}")
            print(f"🔧 标准化后: {normalized_question}")
            
            # 4. 先检查内存缓存（精确匹配）
            if exact_hash in self._cache:
                cached_result, cached_time = self._cache[exact_hash]
                if time.time() - cached_time < self._cache_ttl:
                    return cached_result
            
            # 5. 检查数据库缓存（三级匹配策略）
            if self._db_cache_enabled:
                try:
                    from api.models import AICache
                    
                    db_cache = None
                    
                    # 5.1 第一级：精确匹配（question_hash）
                    print(f"🔍 正在查询数据库缓存（精确匹配）...")
                    print(f"   - exact_hash: {exact_hash}")
                    db_cache = AICache.objects.filter(
                        question_hash=exact_hash,
                        is_valid=True
                    ).first()
                    
                    if db_cache:
                        print(f"✅ 精确匹配成功！")
                    
                    # 5.2 第二级：标准化问题匹配（normalized_question）
                    if not db_cache and normalized_question:
                        print(f"🔍 精确匹配未找到，尝试标准化问题匹配...")
                        print(f"   - normalized_question: '{normalized_question}'")
                        db_cache = AICache.objects.filter(
                            normalized_question=normalized_question,
                            is_valid=True
                        ).first()
                        
                        if db_cache:
                            print(f"✅ 标准化问题匹配成功！原问题: '{db_cache.question}'")
                    
                    # 5.3 第三级：语义哈希匹配（使用 semantic_hash 查询 question_hash 字段）
                    if not db_cache:
                        print(f"🔍 标准化问题未找到，尝试语义哈希匹配...")
                        print(f"   - semantic_hash: {semantic_hash}")
                        db_cache = AICache.objects.filter(
                            question_hash=semantic_hash,
                            is_valid=True
                        ).first()
                        
                        if db_cache:
                            print(f"✅ 语义哈希匹配成功！原问题: '{db_cache.question}'")
                    
                    # 5.4 检查缓存是否有效且未过期
                    if db_cache and not db_cache.is_expired():
                        # 命中数据库缓存
                        print(f"✅ 数据库缓存命中！ID: {db_cache.id}, 已命中{db_cache.hit_count}次")
                        db_cache.hit_count += 1
                        db_cache.save(update_fields=['hit_count'])
                        
                        # 同时更新内存缓存（使用精确哈希）
                        self._cache[exact_hash] = (db_cache.answer, time.time())
                        
                        # 如果有标准化问题，也缓存标准化问题的哈希
                        if normalized_question:
                            normalized_hash = hashlib.md5(normalized_question.encode('utf-8')).hexdigest()
                            if normalized_hash != exact_hash:
                                self._cache[normalized_hash] = (db_cache.answer, time.time())
                        
                        return db_cache.answer
                    else:
                        # 缓存不存在、已过期或无效
                        if db_cache:
                            print(f"⚠️ 数据库缓存已过期或无效，将更新缓存")
                            print(f"   - 缓存ID: {db_cache.id}")
                            print(f"   - 过期时间: {db_cache.expires_at}")
                            print(f"   - 当前时间: {timezone.now()}")
                        else:
                            print(f"ℹ️  数据库缓存未找到")
                except Exception as e:
                    print(f"❌ 数据库缓存查询失败: {e}")
                    import traceback
                    traceback.print_exc()
            
            # 6. 缓存未命中，执行实际查询
            chain = self._get_chain()
            result = chain.run(question)
            
            # 7. 分析涉及的表名（用于后续缓存失效）
            tables_involved = self._extract_tables_from_question(question)
            
            # 8. 存入内存缓存（同时存储精确和语义哈希）
            self._cache[exact_hash] = (result, time.time())
            if exact_hash != semantic_hash:
                self._cache[semantic_hash] = (result, time.time())
            
            # 9. 存入数据库缓存（使用精确哈希作为主键）
            if self._db_cache_enabled:
                try:
                    from api.models import AICache
                    expires_at = timezone.now() + timedelta(seconds=self._db_cache_ttl)
                    
                    print(f"💾 正在保存缓存到数据库...")
                    print(f"   - 原始问题: {question[:50]}...")
                    print(f"   - 标准化问题: {normalized_question[:50] if normalized_question else 'None'}...")
                    print(f"   - exact_hash: {exact_hash}")
                    print(f"   - semantic_hash: {semantic_hash}")
                    print(f"   - 表名: {tables_involved}")
                    print(f"   - 过期时间: {expires_at}")
                    
                    # 使用 get_or_create 避免 UNIQUE 约束冲突
                    # 优先使用 exact_hash 作为唯一键，确保相同问题能精确匹配
                    cache_entry, created = AICache.objects.get_or_create(
                        question_hash=exact_hash,  # 使用精确哈希作为唯一键
                        defaults={
                            'question': question[:500],  # 保存原始问题
                            'normalized_question': normalized_question[:500] if normalized_question else None,  # 保存标准化问题
                            'answer': result,
                            'query_type': 'db_query',
                            'tables_involved': tables_involved,
                            'cache_key': f"db_query:{exact_hash}",
                            'is_valid': True,
                            'hit_count': 0,
                            'expires_at': expires_at
                        }
                    )
                    
                    if not created:
                        # 如果记录已存在，更新它
                        cache_entry.question = question[:500]
                        cache_entry.normalized_question = normalized_question[:500] if normalized_question else None
                        cache_entry.answer = result
                        cache_entry.query_type = 'db_query'
                        cache_entry.tables_involved = tables_involved
                        cache_entry.cache_key = f"db_query:{exact_hash}"
                        cache_entry.is_valid = True
                        cache_entry.hit_count = 0  # 重置命中次数
                        cache_entry.expires_at = expires_at
                        cache_entry.save()
                        print(f"✅ 缓存已更新，ID: {cache_entry.id}")
                    else:
                        print(f"✅ 缓存保存成功，ID: {cache_entry.id}")
                        
                        # 如果 exact_hash 和 semantic_hash 不同，也保存一份 semantic_hash 的缓存
                        # 这样可以通过语义哈希进行模糊匹配
                        if exact_hash != semantic_hash:
                            try:
                                semantic_cache, semantic_created = AICache.objects.get_or_create(
                                    question_hash=semantic_hash,
                                    defaults={
                                        'question': question[:500],
                                        'normalized_question': normalized_question[:500] if normalized_question else None,
                                        'answer': result,
                                        'query_type': 'db_query',
                                        'tables_involved': tables_involved,
                                        'cache_key': f"db_query:{semantic_hash}",
                                        'is_valid': True,
                                        'hit_count': 0,
                                        'expires_at': expires_at
                                    }
                                )
                                if semantic_created:
                                    print(f"✅ 语义哈希缓存保存成功，ID: {semantic_cache.id}")
                                else:
                                    # 更新现有语义哈希缓存
                                    semantic_cache.answer = result
                                    semantic_cache.expires_at = expires_at
                                    semantic_cache.is_valid = True
                                    semantic_cache.save()
                                    print(f"✅ 语义哈希缓存已更新，ID: {semantic_cache.id}")
                            except Exception as e:
                                print(f"⚠️ 语义哈希缓存保存失败: {e}")
                except Exception as e:
                    print(f"❌ 数据库缓存保存失败: {e}")
                    import traceback
                    traceback.print_exc()
            
            # 10. 清理过期内存缓存
            self._cleanup_cache()
            
            return result
        except Exception as e:
            return f"[数据库查询失败] {str(e)}"
    
    def _cleanup_cache(self):
        """清理过期内存缓存"""
        current_time = time.time()
        expired_keys = [
            key for key, (_, timestamp) in self._cache.items()
            if current_time - timestamp >= self._cache_ttl
        ]
        for key in expired_keys:
            del self._cache[key]
    
    def _extract_tables_from_question(self, question: str) -> list:
        """
        从问题中提取可能涉及的数据库表名
        用于后续数据变更时清除相关缓存
        """
        tables = []
        question_lower = question.lower()
        
        # 关键词映射到表名（包括简洁的查询指令）
        table_keywords = {
            'destinations': ['目的地', '旅游', '景点', 'destination', 'travel', '旅游地'],
            'policies': ['政策', '法规', 'policy', 'regulation', '政策法规'],
            'news': ['新闻', '资讯', '消息', 'news', '新闻资讯'],
            'safety_alerts': ['安全', '隐患', '预警', 'safety', 'alert', '安全预警'],
            'statistics': ['统计', '数据', '游客数量', '航班', 'statistics', '统计数据'],
            'messages': ['留言', '评论', '反馈', 'message'],
        }
        
        for table_name, keywords in table_keywords.items():
            if any(keyword in question_lower for keyword in keywords):
                tables.append(table_name)
        
        return tables
    
    def _normalize_question(self, question: str) -> str:
        """
        标准化问题，将语义相近的问题转换为相同的形式
        
        例如：
        - "有哪些热门旅游目的地？" → "热门 旅游 目的地"
        - "热门的旅游地有哪些？" → "热门 旅游 目的地"
        - "推荐一些旅游景点" → "推荐 旅游 景点"
        
        策略：
        1. 去除标点符号和语气词
        2. 同义词归一化（长短语优先）
        3. 提取关键名词和动词
        4. 保持原始顺序（不按字母排序，避免中文乱序）
        """
        import re
        
        # 1. 转小写
        normalized = question.lower()
        
        # 2. 去除标点符号（替换为空格，便于后续分词）
        normalized = re.sub(r'[\uff0c\u3001\uff1f\uff01\u3002\uff0c]', ' ', normalized)
        
        # 3. 同义词归一化（重要：长短语优先，避免短词先替换导致长词无法匹配）
        # 按长度降序排列，确保长短语先被替换
        synonyms = {
            # 简洁查询指令（直接映射到核心名词）- 最长，优先匹配
            '查询旅游地': '旅游目的地',
            '查询政策法规': '政策',
            '查询统计数据': '统计',
            '查询安全预警': '安全',
            '查询新闻资讯': '新闻',
            '查询旅游目的地': '旅游目的地',  # ✅ 完整匹配，优先于下面的规则
            # 注意：不要添加 '查询目的地' 这样的规则，会导致 "查询旅游目的地" 被错误替换
            
            # 单独的查询动词 + 单独的名词（用于处理 "查询 政策" 这种有空格的情况）
            '查询政策': '政策',
            '查询新闻': '新闻',
            '查询统计': '统计',
            '查询安全': '安全',
            
            # 旅游目的地相关（这些不会与上面的规则冲突）
            '旅游地': '旅游目的地',
            '旅行地': '旅游目的地',
            '旅游景点': '旅游目的地',
            '旅游景区': '旅游目的地',
            '景点': '旅游目的地',
            '景区': '旅游目的地',
            '游玩地': '旅游目的地',
            # 注意：不要添加 '目的地': '旅游目的地'，会导致 "旅游目的地" 被重复替换
            
            # 查询动词（统一替换为空，后续会被清理）
            '查找': '',
            '搜索': '',
            '查询': '',
            '看看': '',
            '找': '',
            
            # 旅游相关
            '游玩': '旅游',
            '旅行': '旅游',
            
            # 形容词
            '热门': '热门',
            '流行': '热门',
            '火爆': '热门',
            '受欢迎': '热门',
            
            # 政策相关
            '规定': '政策',
            '条例': '政策',
            '办法': '政策',
            '通知': '政策',
            '法规': '政策',
            
            # 新闻相关
            '资讯': '新闻',
            '消息': '新闻',
            '动态': '新闻',
            
            # 安全相关
            '危险': '安全',
            '风险': '安全',
            '隐患': '安全',
            '预警': '安全',
        }
        
        # 按key长度降序排序，确保长短语优先匹配
        sorted_synonyms = sorted(synonyms.items(), key=lambda x: len(x[0]), reverse=True)
        
        # 调试模式：打印替换过程
        # print(f"\n🔧 开始同义词替换: '{normalized}'")
        
        for synonym, standard in sorted_synonyms:
            if synonym in normalized:
                old_normalized = normalized
                normalized = normalized.replace(synonym, standard)
                # 只在发生变化时打印（用于调试）
                # if old_normalized != normalized:
                #     print(f"   替换: '{synonym}' → '{standard}'")
                #     print(f"   结果: '{old_normalized}' → '{normalized}'")
        
        # print(f"✅ 同义词替换完成: '{normalized}'\n")
        
        # 4. 去除语气词和助词（在同义词替换之后）
        # 注意：只去除独立的停用词，不破坏已标准化的核心词汇
        stop_words = [
            '了', '吗', '呢', '吧', '啊', '呀', '哦', '嘛',
            '哪些', '什么', '怎么', '如何', '请问', '帮我',
            '一下', '一些', '几个', '多少', '有没有'
        ]
        
        # 先处理多字停用词（避免破坏单字）
        for word in stop_words:
            if len(word) > 1:  # 只处理长度>1的停用词
                normalized = normalized.replace(word, ' ')
        
        # 对于单字停用词，使用更智能的方式：只在它们是独立词时才去除
        # 这里我们采用简单策略：不单独去除'的'、'有'等常见单字
        # 因为它们可能是核心词汇的一部分（如"旅游目的地"中的"的"）
        single_char_stops = ['了', '吗', '呢', '吧', '啊', '呀', '哦', '嘛']
        for word in single_char_stops:
            normalized = normalized.replace(word, ' ')
        
        # 5. 清理多余空格
        normalized = re.sub(r'\s+', ' ', normalized).strip()
        
        # 6. 如果标准化后为空或太短，返回原始问题的简化版
        if not normalized or len(normalized) < 2:
            # 只保留中文字符和英文字母
            simplified = re.sub(r'[^\u4e00-\u9fa5a-zA-Z0-9]', '', question)
            return simplified[:50] if simplified else question[:50]
        
        return normalized

    def get_schema_summary(self) -> str:
        """返回数据库表结构描述字符串"""
        return DB_SCHEMA_DESCRIPTION


# ── 全局单例（由 ai_tools.py 使用） ─────────────────────────────────────
_db_query_tool: Optional[DatabaseQueryTool] = None


def get_db_tool(llm_config: Optional[dict] = None) -> DatabaseQueryTool:
    """获取（或创建）全局 DatabaseQueryTool 实例"""
    global _db_query_tool
    if _db_query_tool is None:
        _db_query_tool = DatabaseQueryTool(llm_config=llm_config)
    elif llm_config and _db_query_tool.llm_config != llm_config:
        # 配置变更时重建
        _db_query_tool = DatabaseQueryTool(llm_config=llm_config)
    return _db_query_tool
