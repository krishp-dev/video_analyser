import sqlite3
import json
from pathlib import Path
from contextlib import contextmanager
from app.config import settings

def get_db_path() -> Path:
    settings.DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    return settings.DB_PATH

def init_db():
    """Initialize database tables with indexes and foreign keys."""
    db_path = get_db_path()
    conn = sqlite3.connect(db_path)
    conn.execute("PRAGMA journal_mode=WAL;")
    conn.execute("PRAGMA foreign_keys=ON;")
    cursor = conn.cursor()

    cursor.executescript("""
    CREATE TABLE IF NOT EXISTS videos (
        id TEXT PRIMARY KEY,
        filename TEXT NOT NULL,
        original_name TEXT NOT NULL,
        file_size INTEGER NOT NULL,
        duration REAL NOT NULL,
        fps REAL NOT NULL,
        width INTEGER NOT NULL,
        height INTEGER NOT NULL,
        total_frames INTEGER,
        format TEXT NOT NULL,
        mime_type TEXT,
        storage_path TEXT NOT NULL,
        created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS analysis_jobs (
        id TEXT PRIMARY KEY,
        video_id TEXT NOT NULL,
        status TEXT NOT NULL,
        stage TEXT NOT NULL,
        progress_current INTEGER DEFAULT 0,
        progress_total INTEGER DEFAULT 0,
        progress_percentage REAL DEFAULT 0.0,
        config_json TEXT NOT NULL,
        warnings_json TEXT DEFAULT '[]',
        errors_json TEXT DEFAULT '[]',
        summary_text TEXT,
        processing_duration REAL,
        model_yolo TEXT,
        model_caption TEXT,
        started_at TEXT,
        completed_at TEXT,
        created_at TEXT NOT NULL,
        FOREIGN KEY (video_id) REFERENCES videos(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS sampled_frames (
        id TEXT PRIMARY KEY,
        analysis_id TEXT NOT NULL,
        frame_index INTEGER NOT NULL,
        timestamp REAL NOT NULL,
        width INTEGER NOT NULL,
        height INTEGER NOT NULL,
        file_path TEXT NOT NULL,
        status TEXT NOT NULL,
        FOREIGN KEY (analysis_id) REFERENCES analysis_jobs(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS detections (
        id TEXT PRIMARY KEY,
        frame_id TEXT NOT NULL,
        analysis_id TEXT NOT NULL,
        class_name TEXT NOT NULL,
        confidence REAL NOT NULL,
        bbox_x1 REAL NOT NULL,
        bbox_y1 REAL NOT NULL,
        bbox_x2 REAL NOT NULL,
        bbox_y2 REAL NOT NULL,
        timestamp REAL NOT NULL,
        model_name TEXT NOT NULL,
        FOREIGN KEY (frame_id) REFERENCES sampled_frames(id) ON DELETE CASCADE,
        FOREIGN KEY (analysis_id) REFERENCES analysis_jobs(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS captions (
        id TEXT PRIMARY KEY,
        frame_id TEXT NOT NULL,
        analysis_id TEXT NOT NULL,
        timestamp REAL NOT NULL,
        caption_text TEXT NOT NULL,
        model_name TEXT NOT NULL,
        status TEXT NOT NULL,
        FOREIGN KEY (frame_id) REFERENCES sampled_frames(id) ON DELETE CASCADE,
        FOREIGN KEY (analysis_id) REFERENCES analysis_jobs(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS scene_candidates (
        id TEXT PRIMARY KEY,
        analysis_id TEXT NOT NULL,
        timestamp REAL NOT NULL,
        frame_index INTEGER NOT NULL,
        difference_score REAL NOT NULL,
        reason TEXT NOT NULL,
        FOREIGN KEY (analysis_id) REFERENCES analysis_jobs(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS keyframes (
        id TEXT PRIMARY KEY,
        analysis_id TEXT NOT NULL,
        frame_id TEXT NOT NULL,
        timestamp REAL NOT NULL,
        preview_path TEXT NOT NULL,
        selection_reason TEXT NOT NULL,
        detections_count INTEGER DEFAULT 0,
        caption_text TEXT,
        FOREIGN KEY (analysis_id) REFERENCES analysis_jobs(id) ON DELETE CASCADE,
        FOREIGN KEY (frame_id) REFERENCES sampled_frames(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_jobs_video ON analysis_jobs(video_id);
    CREATE INDEX IF NOT EXISTS idx_frames_analysis ON sampled_frames(analysis_id);
    CREATE INDEX IF NOT EXISTS idx_detections_analysis ON detections(analysis_id);
    CREATE INDEX IF NOT EXISTS idx_detections_frame ON detections(frame_id);
    CREATE INDEX IF NOT EXISTS idx_captions_analysis ON captions(analysis_id);
    CREATE INDEX IF NOT EXISTS idx_scenes_analysis ON scene_candidates(analysis_id);
    CREATE INDEX IF NOT EXISTS idx_keyframes_analysis ON keyframes(analysis_id);
    """)

    # Schema migrations for advanced analytics
    for col_def, tbl in [
        ("track_id INTEGER DEFAULT 1", "detections"),
        ("attributes_json TEXT DEFAULT '{}'", "detections"),
        ("domain_insights_json TEXT DEFAULT '{}'", "analysis_jobs")
    ]:
        col_name = col_def.split()[0]
        try:
            conn.execute(f"ALTER TABLE {tbl} ADD COLUMN {col_def};")
        except Exception:
            pass

    conn.commit()
    conn.close()

@contextmanager
def get_db():
    """Provide a transactional database connection."""
    conn = sqlite3.connect(get_db_path(), timeout=30.0)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys=ON;")
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()
