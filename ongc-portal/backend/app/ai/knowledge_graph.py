import json
from sqlalchemy import text
from app.database import AsyncSessionLocal
from app.ai.llm_client import llm

ENTITY_TYPES = [
    "Project", "Department", "Employee", "Location", "Asset",
    "Budget", "Contract", "Vendor", "Regulation", "Document",
]

RELATION_PATTERNS = [
    "manages", "belongs_to", "located_in", "reports_to",
    "has_budget", "contracts_with", "approves", "monitors",
    "produces", "regulates", "owns", "operates",
]

class KnowledgeGraph:
    async def extract_entities_from_text(self, text: str, file_id: str = None) -> dict:
        prompt = f"""Extract entities and relationships from the following text.
Return ONLY a JSON object with "entities" (array of {{name, type, properties}}) and "relationships" (array of {{source, target, relationship, properties}}).

Entity types: {', '.join(ENTITY_TYPES)}
Relationship types: {', '.join(RELATION_PATTERNS)}

Text:
{text[:3000]}

JSON:"""
        response = await llm.generate(prompt, "You are a knowledge graph extraction expert. Return only valid JSON.")
        try:
            cleaned = response.strip()
            if cleaned.startswith("```json"):
                cleaned = cleaned[7:]
            if cleaned.startswith("```"):
                cleaned = cleaned[3:]
            if cleaned.endswith("```"):
                cleaned = cleaned[:-3]
            cleaned = cleaned.strip()
            data = json.loads(cleaned)
        except json.JSONDecodeError:
            return {"entities": [], "relationships": []}

        created_entities = []
        created_relations = []
        async with AsyncSessionLocal() as db:
            for ent in data.get("entities", []):
                try:
                    result = await db.execute(
                        text("""
                            INSERT INTO kg_entities (name, type, properties)
                            VALUES (:name, :type, :properties::jsonb)
                            RETURNING id
                        """),
                        {
                            "name": ent.get("name", ""),
                            "type": ent.get("type", "Document"),
                            "properties": json.dumps({**ent.get("properties", {}), "source_file": file_id}),
                        }
                    )
                    eid = result.scalar()
                    created_entities.append({**ent, "id": str(eid)})
                except Exception:
                    pass

            for rel in data.get("relationships", []):
                source_name = rel.get("source", "")
                target_name = rel.get("target", "")
                source_res = await db.execute(
                    text("SELECT id FROM kg_entities WHERE name = :name LIMIT 1"),
                    {"name": source_name}
                )
                source_row = source_res.fetchone()
                target_res = await db.execute(
                    text("SELECT id FROM kg_entities WHERE name = :name LIMIT 1"),
                    {"name": target_name}
                )
                target_row = target_res.fetchone()
                if source_row and target_row:
                    try:
                        await db.execute(
                            text("""
                                INSERT INTO kg_relationships (source_id, target_id, relationship, properties)
                                VALUES (:source_id, :target_id, :relationship, :properties::jsonb)
                            """),
                            {
                                "source_id": source_row[0],
                                "target_id": target_row[0],
                                "relationship": rel.get("relationship", "related_to"),
                                "properties": json.dumps(rel.get("properties", {})),
                            }
                        )
                        created_relations.append(rel)
                    except Exception:
                        pass
            await db.commit()
        return {"entities": created_entities, "relationships": created_relations}

    async def get_all_entities(self) -> list[dict]:
        async with AsyncSessionLocal() as db:
            result = await db.execute(text("SELECT id, name, type, properties FROM kg_entities ORDER BY name"))
            rows = result.fetchall()
            return [
                {"id": str(r[0]), "name": r[1], "type": r[2], "properties": r[3]}
                for r in rows
            ]

    async def get_all_relationships(self) -> list[dict]:
        async with AsyncSessionLocal() as db:
            result = await db.execute(text("""
                SELECT r.id, r.relationship, r.properties,
                       s.name as source_name, s.type as source_type,
                       t.name as target_name, t.type as target_type
                FROM kg_relationships r
                JOIN kg_entities s ON s.id = r.source_id
                JOIN kg_entities t ON t.id = r.target_id
            """))
            rows = result.fetchall()
            return [
                {
                    "id": str(r[0]),
                    "relationship": r[1],
                    "properties": r[2],
                    "source": {"name": r[3], "type": r[4]},
                    "target": {"name": r[5], "type": r[6]},
                }
                for r in rows
            ]

    async def query_graph(self, natural_query: str) -> dict:
        prompt = f"""Given the knowledge graph with entities and relationships, convert this natural language query into a lookup.

Available entity types: {', '.join(ENTITY_TYPES)}
Available relationship types: {', '.join(RELATION_PATTERNS)}

Query: {natural_query}

Return ONLY a JSON with filters: {{"entity_type": "...", "name_contains": "...", "relationship": "..."}}
Use null for fields that are not specified."""
        response = await llm.generate(prompt, "You are a knowledge graph query translator. Return only valid JSON.")
        try:
            cleaned = response.strip()
            if cleaned.startswith("```json"):
                cleaned = cleaned[7:]
            if cleaned.startswith("```"):
                cleaned = cleaned[3:]
            if cleaned.endswith("```"):
                cleaned = cleaned[:-3]
            filters = json.loads(cleaned.strip())
        except json.JSONDecodeError:
            return {"entities": [], "relationships": [], "error": "Could not parse query"}

        async with AsyncSessionLocal() as db:
            query = "SELECT id, name, type, properties FROM kg_entities WHERE 1=1"
            params = {}
            if filters.get("entity_type"):
                query += " AND type = :entity_type"
                params["entity_type"] = filters["entity_type"]
            if filters.get("name_contains"):
                query += " AND name ILIKE :name_contains"
                params["name_contains"] = f"%{filters['name_contains']}%"

            result = await db.execute(text(query), params)
            entities = [
                {"id": str(r[0]), "name": r[1], "type": r[2], "properties": r[3]}
                for r in result.fetchall()
            ]

            rel_query = """
                SELECT r.relationship, s.name, s.type, t.name, t.type
                FROM kg_relationships r
                JOIN kg_entities s ON s.id = r.source_id
                JOIN kg_entities t ON t.id = r.target_id
                WHERE 1=1
            """
            rel_params = {}
            if filters.get("relationship"):
                rel_query += " AND r.relationship = :relationship"
                rel_params["relationship"] = filters["relationship"]
            if entities:
                entity_ids = [e["id"] for e in entities]
                rel_query += " AND (s.id = ANY(:entity_ids) OR t.id = ANY(:entity_ids))"
                rel_params["entity_ids"] = entity_ids

            rel_result = await db.execute(text(rel_query), rel_params)
            relationships = [
                {"relationship": r[0], "source": r[1], "source_type": r[2], "target": r[3], "target_type": r[4]}
                for r in rel_result.fetchall()
            ]

        return {"entities": entities, "relationships": relationships, "filters": filters}

    async def get_graph_data(self) -> dict:
        entities = await self.get_all_entities()
        relationships = await self.get_all_relationships()
        nodes = [{"id": e["id"], "label": e["name"], "type": e["type"]} for e in entities]
        edges = [
            {"id": r["id"], "source": r["source"]["name"], "target": r["target"]["name"],
             "label": r["relationship"], "source_type": r["source"]["type"], "target_type": r["target"]["type"]}
            for r in relationships
        ]
        return {"nodes": nodes, "edges": edges}

    async def get_stats(self) -> dict:
        async with AsyncSessionLocal() as db:
            ent_count = await db.execute(text("SELECT COUNT(*) FROM kg_entities"))
            rel_count = await db.execute(text("SELECT COUNT(*) FROM kg_relationships"))
            type_dist = await db.execute(text("SELECT type, COUNT(*) as cnt FROM kg_entities GROUP BY type ORDER BY cnt DESC"))
            return {
                "entity_count": ent_count.scalar() or 0,
                "relationship_count": rel_count.scalar() or 0,
                "type_distribution": {r[0]: r[1] for r in type_dist.fetchall()},
            }

kg = KnowledgeGraph()
