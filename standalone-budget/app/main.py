from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database import engine, Base
from app.routes import acquisition_targets, manpower
from app import static_viewer

Base.metadata.create_all(bind=engine)

app = FastAPI(title="Budget Targets & Manpower API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(acquisition_targets.router)
app.include_router(manpower.router)
app.include_router(static_viewer.router)


@app.get("/")
def root():
    return {"status": "ok", "app": "Budget Targets & Manpower"}
