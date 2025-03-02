from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
from neo4j import GraphDatabase

app = FastAPI()

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # React app's address
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Data models
class ApplicationRelation(BaseModel):
    appId: str
    appName: str


class Application(BaseModel):
    applicationId: str
    applicationName: str
    capabilityName: str
    apiName: str
    apiEndpoint: str
    upstreamApps: List[ApplicationRelation]
    downstreamApps: List[ApplicationRelation]


class GraphDB:
    def __init__(self):
        self.driver = GraphDatabase.driver(
            "neo4j://localhost:7687",
            auth=("neo4j", "password")  # Replace with your Neo4j credentials
        )

    def create_application(self, app: Application):
        with self.driver.session() as session:
            # Create main application node
            session.run("""
                MERGE (a:Application {applicationId: $appId})
                SET a.applicationName = $appName,
                    a.capabilityName = $capName,
                    a.apiName = $apiName,
                    a.apiEndpoint = $apiEndpoint
                """,
                        appId=app.applicationId,
                        appName=app.applicationName,
                        capName=app.capabilityName,
                        apiName=app.apiName,
                        apiEndpoint=app.apiEndpoint
                        )

            # Create relationships for upstream apps
            for upstream in app.upstreamApps:
                if upstream.appId and upstream.appName:  # Only create if data exists
                    session.run("""
                        MERGE (u:Application {applicationId: $upstreamId})
                        SET u.applicationName = $upstreamName
                        MERGE (u)-[:PROVIDES_TO]->(a:Application {applicationId: $mainAppId})
                        """,
                                upstreamId=upstream.appId,
                                upstreamName=upstream.appName,
                                mainAppId=app.applicationId
                                )

            # Create relationships for downstream apps
            for downstream in app.downstreamApps:
                if downstream.appId and downstream.appName:  # Only create if data exists
                    session.run("""
                        MERGE (d:Application {applicationId: $downstreamId})
                        SET d.applicationName = $downstreamName
                        MERGE (a:Application {applicationId: $mainAppId})-[:PROVIDES_TO]->(d)
                        """,
                                downstreamId=downstream.appId,
                                downstreamName=downstream.appName,
                                mainAppId=app.applicationId
                                )


db = GraphDB()


@app.get("/api/applications/{app_id}/supply-chain")
async def get_supply_chain(app_id: str):
    try:
        with db.driver.session() as session:
            result = session.run("""
                MATCH (main:Application {applicationId: $appId})
                OPTIONAL MATCH (upstream:Application)-[:PROVIDES_TO]->(main)
                OPTIONAL MATCH (main)-[:PROVIDES_TO]->(downstream:Application)
                RETURN {
                    applicationId: main.applicationId,
                    applicationName: main.applicationName,
                    capabilityName: main.capabilityName,
                    apiName: main.apiName,
                    apiEndpoint: main.apiEndpoint
                } as mainApp,
                collect(distinct {
                    applicationId: upstream.applicationId,
                    applicationName: upstream.applicationName
                }) as upstreamApps,
                collect(distinct {
                    applicationId: downstream.applicationId,
                    applicationName: downstream.applicationName
                }) as downstreamApps
                """,
                                 appId=app_id
                                 )

            data = result.single()
            if not data:
                raise HTTPException(status_code=404, detail="Application not found")

            return {
                "mainApp": data["mainApp"],
                "upstreamApps": [app for app in data["upstreamApps"] if app["applicationId"] is not None],
                "downstreamApps": [app for app in data["downstreamApps"] if app["applicationId"] is not None]
            }

    except Exception as e:
        print("Error fetching supply chain:", str(e))
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/applications")
async def get_applications():
    try:
        with db.driver.session() as session:
            result = session.run("""
                MATCH (a:Application)
                WHERE a.applicationName IS NOT NULL
                RETURN DISTINCT {
                    applicationId: a.applicationId,
                    applicationName: a.applicationName
                } as application
                ORDER BY application.applicationName
            """)

            applications = []
            for record in result:
                app_data = record["application"]
                if app_data["applicationId"] and app_data["applicationName"]:  # Ensure both values exist
                    applications.append({
                        "applicationId": app_data["applicationId"],
                        "applicationName": app_data["applicationName"]
                    })

            return applications

    except Exception as e:
        print("Error fetching applications:", str(e))
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/applications")
async def create_application(application: Application):
    try:
        print("Received application data:", application.dict())  # Debug print
        db.create_application(application)
        return {"message": "Application created successfully", "status": "success"}
    except Exception as e:
        print("Error creating application:", str(e))  # Debug print
        raise HTTPException(status_code=500, detail=str(e))


# Add a test endpoint to verify the API is running
@app.get("/test")
async def test_endpoint():
    return {"message": "API is working"}


@app.get("/api/applications/{app_id}/apis")
async def get_application_apis(app_id: str):
    try:
        with db.driver.session() as session:
            # Modified query to ensure we get all API-related fields
            result = session.run("""
                MATCH (a:Application {applicationId: $appId})
                RETURN DISTINCT {
                    apiName: a.apiName,
                    apiEndpoint: a.apiEndpoint
                } as api
                WHERE a.apiName IS NOT NULL
                ORDER BY a.apiName
            """, appId=app_id)

            apis = []
            for record in result:
                api_data = record["api"]
                if api_data["apiName"]:  # Only add if apiName exists
                    apis.append({
                        "apiName": api_data["apiName"],
                        "apiEndpoint": api_data["apiEndpoint"]
                    })

            print(f"Found APIs for application {app_id}:", apis)  # Debug log
            return apis

    except Exception as e:
        print("Error fetching application APIs:", str(e))
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/applications/{app_id}/api-supply-chain")
async def get_api_supply_chain(app_id: str, apiName: str):
    try:
        with db.driver.session() as session:
            result = session.run("""
                MATCH (main:Application {applicationId: $appId, apiName: $apiName})
                OPTIONAL MATCH (upstream:Application)-[:PROVIDES_TO]->(main)
                OPTIONAL MATCH (main)-[:PROVIDES_TO]->(downstream:Application)
                WHERE upstream.apiName = $apiName OR downstream.apiName = $apiName
                RETURN {
                    applicationId: main.applicationId,
                    applicationName: main.applicationName,
                    apiName: main.apiName,
                    apiEndpoint: main.apiEndpoint
                } as mainApp,
                collect(distinct {
                    applicationId: upstream.applicationId,
                    applicationName: upstream.applicationName,
                    apiName: upstream.apiName,
                    apiEndpoint: upstream.apiEndpoint
                }) as upstreamApps,
                collect(distinct {
                    applicationId: downstream.applicationId,
                    applicationName: downstream.applicationName,
                    apiName: downstream.apiName,
                    apiEndpoint: downstream.apiEndpoint
                }) as downstreamApps
            """, appId=app_id, apiName=apiName)

            data = result.single()
            if not data:
                raise HTTPException(status_code=404, detail="Application or API not found")

            return {
                "mainApp": data["mainApp"],
                "upstreamApps": [app for app in data["upstreamApps"] if app["applicationId"] is not None],
                "downstreamApps": [app for app in data["downstreamApps"] if app["applicationId"] is not None]
            }

    except Exception as e:
        print("Error fetching API supply chain:", str(e))
        raise HTTPException(status_code=500, detail=str(e))