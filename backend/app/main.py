from pathlib import Path
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from contextlib import asynccontextmanager

from app.config import settings
from app.db.database import init_db
from app.api import health, uploads, analyses

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize database tables and folders
    settings.initialize_directories()
    settings.resolve_tools()
    init_db()
    yield

app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="AI-Based Video Analysis and Summarization System REST API",
    lifespan=lifespan
)

# Controlled CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "*"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["Content-Range", "Accept-Ranges", "Content-Length", "Content-Disposition"]
)

# Global safe error handling
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    # Log cleanly without crashing the response
    return JSONResponse(
        status_code=500,
        content={"detail": f"Internal server error: {str(exc)}"}
    )

# Include API routers
app.include_router(health.router, prefix="/api", tags=["Health"])
app.include_router(uploads.router, prefix="/api", tags=["Videos"])
app.include_router(analyses.router, prefix="/api", tags=["Analyses"])

@app.get("/")
def root():
    return {
        "app": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "status": "online",
        "docs_url": "/docs"
    }
