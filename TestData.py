from neo4j import GraphDatabase
import random
import string
import networkx as nx
from tqdm import tqdm

# Neo4j connection configuration
URI = "bolt://localhost:7687"
AUTH = ("neo4j", "password")  # Replace with your password


def generate_random_id(length=8):
    """Generate a random application ID."""
    return ''.join(random.choices(string.ascii_uppercase + string.digits, k=length))


def generate_random_name():
    """Generate a random application name."""
    prefixes = ['App', 'Service', 'System', 'Platform', 'Tool', 'API', 'Gateway', 'Database', 'Analytics', 'Monitor']
    suffixes = ['Manager', 'Handler', 'Controller', 'Service', 'Engine', 'Core', 'Portal', 'Hub', 'Center', 'Suite']
    domains = ['Payment', 'User', 'Order', 'Inventory', 'Shipping', 'Billing', 'Customer', 'Product', 'Account',
               'Report',
               'Finance', 'HR', 'Sales', 'Marketing', 'Support', 'Security', 'Data', 'Integration', 'Workflow',
               'Document']

    return f"{random.choice(domains)}{random.choice(prefixes)}{random.choice(suffixes)}"


def create_interconnected_test_data(num_apps=10000, min_connections=5):
    """Generate test data ensuring each app has minimum required connections."""
    print("Generating applications...")
    applications = []
    app_dict = {}  # For quick lookup

    # Generate applications with additional fields
    for _ in tqdm(range(num_apps)):
        app = {
            'applicationId': generate_random_id(),
            'applicationName': generate_random_name(),
            'capabilityName': f"Capability_{generate_random_id(4)}",
            'apiName': f"API_{generate_random_id(4)}",
            'apiEndpoint': f"/api/v1/{generate_random_id(6)}",
            'upstream': set(),
            'downstream': set()
        }
        applications.append(app)
        app_dict[app['applicationId']] = app

    print("\nCreating relationships...")
    # Ensure minimum connections for each application
    for app in tqdm(applications):
        # Continue adding connections until minimums are met
        while len(app['upstream']) < min_connections or len(app['downstream']) < min_connections:
            other_app = random.choice(applications)

            # Skip if same app or already connected
            if (other_app['applicationId'] == app['applicationId'] or
                    other_app['applicationId'] in app['upstream'] or
                    other_app['applicationId'] in app['downstream']):
                continue

            # Decide direction based on which minimum isn't met
            if len(app['upstream']) < min_connections:
                # Add as upstream
                app['upstream'].add(other_app['applicationId'])
                other_app['downstream'].add(app['applicationId'])
            else:
                # Add as downstream
                app['downstream'].add(other_app['applicationId'])
                other_app['upstream'].add(app['applicationId'])

    # Convert sets to lists for JSON serialization
    print("\nFinalizing relationships...")
    relationships = []
    for app in tqdm(applications):
        relationships.append({
            'app': {
                'applicationId': app['applicationId'],
                'applicationName': app['applicationName']
            },
            'upstream': [
                {'applicationId': up_id, 'applicationName': app_dict[up_id]['applicationName']}
                for up_id in app['upstream']
            ],
            'downstream': [
                {'applicationId': down_id, 'applicationName': app_dict[down_id]['applicationName']}
                for down_id in app['downstream']
            ]
        })

    return relationships


def insert_data(driver, relationships):
    with driver.session() as session:
        # Clear existing data
        print("Clearing existing data...")
        session.run("MATCH (n) DETACH DELETE n")

        # Create applications and relationships in batches
        batch_size = 100
        total_batches = len(relationships) // batch_size + (1 if len(relationships) % batch_size else 0)

        print(f"\nInserting data in {total_batches} batches...")

        for i in range(0, len(relationships), batch_size):
            batch = relationships[i:i + batch_size]

            # Create applications in batch
            apps_query = """
                UNWIND $apps AS app
                MERGE (a:Application {
                    applicationId: app.applicationId
                })
                SET 
                    a.applicationName = app.applicationName,
                    a.capabilityName = app.capabilityName,
                    a.apiName = app.apiName,
                    a.apiEndpoint = app.apiEndpoint
            """
            session.run(apps_query, {
                'apps': [rel['app'] for rel in batch]
            })

            # Create relationships in batch
            rels_query = """
                UNWIND $rels AS rel
                MATCH (a:Application {applicationId: rel.mainAppId})
                MATCH (b:Application {applicationId: rel.relatedId})
                MERGE (b)-[:PROVIDES_TO]->(a)
            """

            # Prepare relationships data
            rels_data = []
            for rel in batch:
                for upstream in rel['upstream']:
                    rels_data.append({
                        'mainAppId': rel['app']['applicationId'],
                        'relatedId': upstream['applicationId']
                    })

            if rels_data:
                session.run(rels_query, {'rels': rels_data})


def verify_connectivity(driver):
    with driver.session() as session:
        print("\nVerifying network connectivity...")

        # Check basic statistics
        stats = session.run("""
            MATCH (n:Application)
            OPTIONAL MATCH (n)-[r1:UPSTREAM]->()
            OPTIONAL MATCH ()-[r2:UPSTREAM]->(n)
            WITH n, 
                 count(DISTINCT r1) as outDegree,
                 count(DISTINCT r2) as inDegree
            RETURN 
                count(n) as nodeCount,
                sum(outDegree) as relationshipCount,
                avg(outDegree) as avgUpstream,
                avg(inDegree) as avgDownstream,
                min(outDegree) as minUpstream,
                min(inDegree) as minDownstream,
                max(outDegree) as maxUpstream,
                max(inDegree) as maxDownstream
        """).single()

        print(f"""
Network Statistics:
------------------
Total Applications: {stats['nodeCount']:,}
Total Relationships: {stats['relationshipCount']:,}
Average Upstream Connections: {stats['avgUpstream']:.2f}
Average Downstream Connections: {stats['avgDownstream']:.2f}
Minimum Upstream Connections: {stats['minUpstream']}
Minimum Downstream Connections: {stats['minDownstream']}
Maximum Upstream Connections: {stats['maxUpstream']}
Maximum Downstream Connections: {stats['maxDownstream']}
        """)

        # Sample of highly connected nodes
        print("\nMost connected applications:")
        highly_connected = session.run("""
            MATCH (n:Application)
            OPTIONAL MATCH (n)-[out:UPSTREAM]->()
            OPTIONAL MATCH ()-[in:UPSTREAM]->(n)
            WITH n, count(DISTINCT out) as outDegree, count(DISTINCT in) as inDegree,
                 count(DISTINCT out) + count(DISTINCT in) as totalConnections
            ORDER BY totalConnections DESC
            LIMIT 5
            RETURN n.applicationName as name, 
                   outDegree as upstream,
                   inDegree as downstream,
                   totalConnections
        """)

        for record in highly_connected:
            print(f"""
App: {record['name']}
- Upstream connections: {record['upstream']}
- Downstream connections: {record['downstream']}
- Total connections: {record['totalConnections']}""")


def main():
    try:
        print("Starting test data generation...")
        relationships = create_interconnected_test_data(num_apps=10000, min_connections=5)

        print("\nConnecting to Neo4j...")
        driver = GraphDatabase.driver(URI, auth=AUTH)

        print("Inserting data...")
        insert_data(driver, relationships)

        verify_connectivity(driver)

        print("\nData generation complete!")

    except Exception as e:
        print(f"\nError: {str(e)}")
        if hasattr(e, 'message'):
            print(f"Details: {e.message}")
    finally:
        if 'driver' in locals():
            driver.close()


if __name__ == "__main__":
    main()