from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from py2neo import Graph, Node, Relationship
from typing import List, Optional
import logging

app = FastAPI()
graph = Graph("bolt://localhost:7687", auth=("neo4j", "password"))
logging.basicConfig(level=logging.INFO)

# Data Model
class Application(BaseModel):
    application_id: str
    application_name: str
    capability_name: str
    api_name: str
    api_endpoint: str
    upstream_applications: Optional[List[str]] = []
    downstream_applications: Optional[List[str]] = []

# Helper function to create/update application node
def upsert_application(tx, app: Application):
    node = Node("Application",
                application_id=app.application_id,
                application_name=app.application_name,
                capability_name=app.capability_name,
                api_name=app.api_name,
                api_endpoint=app.api_endpoint)
    tx.merge(node, "Application", "application_id")
    return node

# Use Case 1: Create/Update Application
@app.post("/applications")
async def create_application(app: Application):
    try:
        tx = graph.begin()
        app_node = upsert_application(tx, app)

        # Clear existing relationships
        tx.run("MATCH (a:Application {application_id: $app_id})-[r:FEEDS_INTO]->() DELETE r", app_id=app.application_id)
        tx.run("MATCH (a:Application {application_id: $app_id})<-[r:FEEDS_INTO]-() DELETE r", app_id=app.application_id)

        # Add upstream relationships
        for upstream_id in app.upstream_applications:
            upstream_node = graph.nodes.match("Application", application_id=upstream_id).first()
            if upstream_node:
                tx.create(Relationship(upstream_node, "FEEDS_INTO", app_node))
            else:
                logging.warning(f"Upstream app {upstream_id} not found.")

        # Add downstream relationships
        for downstream_id in app.downstream_applications:
            downstream_node = graph.nodes.match("Application", application_id=downstream_id).first()
            if downstream_node:
                tx.create(Relationship(app_node, "FEEDS_INTO", downstream_node))
            else:
                logging.warning(f"Downstream app {downstream_id} not found.")

        tx.commit()
        return {"message": f"Application {app.application_id} created/updated"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Use Case 2: Get Supply Chain
@app.get("/applications/{application_id}/supply-chain")
async def get_supply_chain(application_id: str, depth: int = 5):
    try:
        query = """
        MATCH (a:Application {application_id: $app_id})
        CALL apoc.path.subgraphAll(a, {maxLevel: $depth, relationshipFilter: 'FEEDS_INTO>'})
        YIELD nodes, relationships
        UNWIND nodes AS node
        UNWIND relationships AS rel
        RETURN COLLECT(DISTINCT {id: node.application_id, name: node.application_name}) AS nodes,
               COLLECT(DISTINCT {from: startNode(rel).application_id, to: endNode(rel).application_id}) AS edges
        """
        result = graph.run(query, app_id=application_id, depth=depth).data()[0]
        return {"nodes": result["nodes"], "edges": result["edges"]}
    except Exception as e:
        raise HTTPException(status_code=404, detail=f"Application {application_id} not found or error: {str(e)}")

# Get all applications (for dropdowns)
@app.get("/applications")
async def get_all_applications():
    try:
        query = "MATCH (a:Application) RETURN a.application_id, a.application_name"
        result = graph.run(query).data()
        return [{"id": r["a.application_id"], "name": r["a.application_name"]} for r in result]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Run the app
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)