from fastapi import FastAPI
from py2neo import Graph, Node, Relationship
from models import Application

app = FastAPI()
graph = Graph("bolt://localhost:7687", auth=("neo4j", "password"))


@app.post("/applications")
async def create_application(app: Application):
    tx = graph.begin()
    node = Node("Application",
                application_id=app.application_id,
                application_name=app.application_name,
                capability_name=app.capability_name,
                api_name=app.api_name,
                api_endpoint=app.api_endpoint)
    tx.create(node)

    # Create relationships
    for upstream_id in app.upstream_applications:
        upstream_node = graph.nodes.match("Application", application_id=upstream_id).first()
        if upstream_node:
            rel = Relationship(upstream_node, "FEEDS_INTO", node)
            tx.create(rel)

    for downstream_id in app.downstream_applications:
        downstream_node = graph.nodes.match("Application", application_id=downstream_id).first()
        if downstream_node:
            rel = Relationship(node, "FEEDS_INTO", downstream_node)
            tx.create(rel)

    tx.commit()
    return {"message": "Application created"}


@app.get("/applications/{application_id}/supply-chain")
async def get_supply_chain(application_id: str, depth: int = 5):
    query = """
    MATCH (a:Application {application_id: $app_id})
    CALL apoc.path.subgraphAll(a, {maxLevel: $depth, relationshipFilter: 'FEEDS_INTO>'})
    YIELD nodes, relationships
    RETURN nodes, relationships
    """
    result = graph.run(query, app_id=application_id, depth=depth).data()
    return result