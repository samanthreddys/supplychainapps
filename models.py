from pydantic import BaseModel
from typing import List, Optional

class Application(BaseModel):
    application_id: str
    application_name: str
    capability_name: str
    api_name: str
    api_endpoint: str
    upstream_applications: Optional[List[str]] = []
    downstream_applications: Optional[List[str]] = []