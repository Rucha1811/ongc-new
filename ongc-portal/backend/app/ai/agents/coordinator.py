from app.ai.llm_client import llm
from app.ai.rag_pipeline import rag
from app.ai.vector_store import vector_store
from app.ai.knowledge_graph import kg
import time

def _classify_query(query: str) -> str:
    q = query.lower()
    if any(w in q for w in ["chart", "graph", "plot", "visualize", "trend", "compare", "kpi", "dashboard"]):
        return "analytics"
    if any(w in q for w in ["sql", "database", "data", "production", "refinery", "drilling", "output", "report"]):
        if any(w in q for w in ["chart", "graph", "compare", "trend"]):
            return "analytics"
        return "database"
    if any(w in q for w in ["graph", "relationship", "entity", "show me all", "who manages", "which department", "connected to"]):
        return "knowledge_graph"
    if any(w in q for w in ["policy", "regulation", "compliance", "safety", "guideline", "standard", "rule"]):
        return "compliance"
    if any(w in q for w in ["generate report", "create report", "summary report", "quarterly", "annual report"]):
        return "reporting"
    return "search"

class CoordinatorAgent:
    async def process(self, query: str, user_id: str = None, conversation_history: list = None,
                       user_role: str = None, user_classifications: list[str] = None) -> dict:
        start = time.time()
        agent_type = _classify_query(query)

        if agent_type == "search":
            result = await rag.query(query, user_id, user_role, user_classifications, conversation_history)
        elif agent_type == "database":
            result = await DatabaseAgent().process(query)
        elif agent_type == "analytics":
            result = await AnalyticsAgent().process(query)
        elif agent_type == "knowledge_graph":
            result = await kg.query_graph(query)
            result["agent"] = "knowledge_graph"
        elif agent_type == "compliance":
            result = await ComplianceAgent().process(query, user_id=user_id, user_role=user_role,
                                                      user_classifications=user_classifications)
        elif agent_type == "reporting":
            result = await ReportingAgent().process(query)
        else:
            result = await rag.query(query, user_id, user_role, user_classifications, conversation_history)

        result["agent_type"] = agent_type
        result["processing_time_ms"] = int((time.time() - start) * 1000)
        return result

class DatabaseAgent:
    async def process(self, query: str) -> dict:
        from app.ai.sql_agent import sql_agent
        return await sql_agent.query(query)

class AnalyticsAgent:
    async def process(self, query: str) -> dict:
        from app.ai.sql_agent import sql_agent
        sql_result = await sql_agent.query(query)
        if "error" in sql_result:
            return sql_result
        chart = await self._generate_chart(query, sql_result.get("data", []), sql_result.get("columns", []))
        sql_result["chart"] = chart
        return sql_result

    async def _generate_chart(self, query: str, data: list, columns: list) -> dict:
        if not data or not columns:
            return None
        prompt = f"""Given this data with columns {columns} and rows {data[:5]}, suggest the best chart type.
Choose from: bar, pie, line, table, kpi.
Return ONLY a JSON: {{"type": "bar", "x_column": "...", "y_column": "...", "title": "..."}}"""
        resp = await llm.generate(prompt, "You are a data visualization expert. Return only JSON.")
        try:
            import json as j
            cleaned = resp.strip()
            if cleaned.startswith("```json"):
                cleaned = cleaned[7:]
            if cleaned.startswith("```"):
                cleaned = cleaned[3:]
            if cleaned.endswith("```"):
                cleaned = cleaned[:-3]
            chart_config = j.loads(cleaned.strip())
        except Exception:
            chart_config = {"type": "table", "title": query[:50]}

        import plotly.graph_objects as go
        import plotly.express as px
        import pandas as pd
        import json
        import base64
        import io

        df = pd.DataFrame(data, columns=columns)
        fig = None
        try:
            if chart_config["type"] == "bar" and chart_config.get("x_column") and chart_config.get("y_column"):
                fig = px.bar(df, x=chart_config["x_column"], y=chart_config["y_column"],
                            title=chart_config.get("title", ""), color=chart_config["x_column"])
            elif chart_config["type"] == "pie":
                xcol = chart_config.get("x_column") or columns[0]
                ycol = chart_config.get("y_column") or columns[-1]
                fig = px.pie(df, names=xcol, values=ycol, title=chart_config.get("title", ""))
            elif chart_config["type"] == "line":
                xcol = chart_config.get("x_column") or columns[0]
                ycol = chart_config.get("y_column") or columns[-1]
                fig = px.line(df, x=xcol, y=ycol, title=chart_config.get("title", ""))
        except Exception:
            pass

        if fig:
            chart_json = json.loads(fig.to_json())
            img_bytes = fig.to_image(format="png", width=800, height=400)
            img_b64 = base64.b64encode(img_bytes).decode("utf-8")
            chart_config["plotly_json"] = chart_json
            chart_config["image_base64"] = img_b64
        else:
            chart_config["image_base64"] = None
            chart_config["table_data"] = data[:20]
            chart_config["columns"] = columns

        return chart_config


class ComplianceAgent:
    async def process(self, query: str, user_id: str = None, user_role: str = None,
                       user_classifications: list[str] = None) -> dict:
        embedding = await llm.embed(query)
        if user_id and user_role:
            results = await vector_store.hybrid_search_with_permissions(
                query, embedding, user_id, user_role,
                user_classifications or [], 5
            )
        else:
            results = await vector_store.hybrid_search(query, embedding, 5)
        context = "\n\n".join(
            f"[from {r['file_name']}]: {r['text'][:500]}" for r in results
        ) if results else "No specific policy documents found."
        prompt = f"""Relevant policy/regulation documents:
{context}

Question: {query}

Review the question against the policies above. Determine:
1. Is there a relevant policy? If so, what does it say?
2. Any compliance requirements or restrictions?

If no policies directly address the question, state that clearly."""
        answer = await llm.generate(prompt, "You are a compliance and regulatory expert for ONGC.")
        return {"answer": answer, "sources": [{"file_name": r["file_name"], "file_id": r["file_id"]} for r in results[:3]]}

class ReportingAgent:
    async def process(self, query: str) -> dict:
        from app.ai.sql_agent import sql_agent
        from app.ai.rag_pipeline import rag

        sql_data = await sql_agent.query(query)
        rag_context = await rag.query(query)

        prompt = f"""Generate a structured report based on:
Database info: {str(sql_data.get("data", [])[:3]) if sql_data.get("data") else "No data"}
Document context: {rag_context.get("answer", "No documents")[:1000]}

Create a report with:
1. Executive Summary
2. Key Findings
3. Data Highlights
4. Recommendations"""
        answer = await llm.generate(prompt, "You are a report generation expert for ONGC.")
        return {
            "answer": answer,
            "sql_data": sql_data.get("data", [])[:10],
            "documents": rag_context.get("sources", [])[:3],
            "agent": "reporting",
        }

coordinator = CoordinatorAgent()
