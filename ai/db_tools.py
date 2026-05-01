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
   - 使用 Markdown 表格展示

4. 输出要求：
   - 语言简洁
   - 重点突出
   - 不解释数据库结构
   - 不暴露 SQL 语句

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

8. 示例输出：
以下是相关的统计数据信息：
| 地区 | 年份 | 万人次 | 营收(万元) | 航班次数 | 航空器数量 | 增长率(%) |
| 广东省 | 2024 | 110.0 | 85000.0 | 3200 | 45 | 28.5% |

请严格按照以上规则回答。
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

        用法：
            tool = DatabaseQueryTool(llm_config={...})
            result = tool.query("最近有哪些安全隐患？")
        """
        try:
            chain = self._get_chain()
            return chain.run(question)
        except Exception as e:
            return f"[数据库查询失败] {str(e)}"

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
