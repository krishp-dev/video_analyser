

# Video Analyser: AI-Based Video Analysis and Summarization System

**Formal Academic Title:** AI-Based Video Analyser and Summarization System  
**Category:** Artificial Intelligence, Machine Learning, Deep Learning, and Computer Vision  
**Course Level:** Capstone Computer Vision & AI Engineering Project  

---

## 1. Project Overview

**Video Analyser** is a local, privacy-preserving artificial intelligence computer vision application designed to ingest videos, extract representative keyframes, perform object detection, generate visual frame descriptions, identify candidate scene shifts, and synthesize evidence-grounded chronological summaries without fabricating external facts or relying on paid cloud APIs.

---

## 2. Problem Statement & Objectives

### Problem Statement
The exponential growth of digital video content across surveillance, online education, robotics, and archival workflows has made manual video inspection prohibitively time-consuming. Commercial cloud solutions often expose sensitive video feeds to third parties, incur recurring subscription costs, and utilize hallucinating generative LLMs that invent unobserved events.

### Objectives
1. **Local & Privacy-Preserving Execution:** Run computer vision inference locally with native CPU support and optional CUDA GPU acceleration.
2. **Multi-Stage Computer Vision Pipeline:** Deconstruct video analysis into independent, verifiable stages: metadata extraction, frame sampling, scene shift detection, object detection, keyframe selection, visual captioning, and evidence summarization.
3. **Multi-Object Tracking (MOT):** Assign persistent centroid track IDs (`#1 Apple`, `#2 Car`) across consecutive frames for instance consistency and motion tracking.
4. **Domain-Specific Intelligence & Quality Inspection:** Autonomous crop ripeness scoring (HSV color-space analysis, ripeness %, commercial grade estimation), traffic flow velocity metrics, and facility occupancy tracking.
5. **Semantic "Ask Video" Search:** Natural language multi-modal search allowing users to query detected objects, quality attributes, and scene events with fractional timestamp seeking.
6. **Virtual Tripwire & ROI HUD:** Interactive virtual line crossing boundary in the video player HUD for ingress/egress counting.
7. **Evidence Grounding & Executive Reporting:** Deterministic summaries grounded strictly in observed bounding boxes and scene transitions, exportable as JSON, CSV, and multi-page forensic PDF dossiers.

---

## 3. Technology Stack

### Backend
- **Language & Runtime:** Python 3.11 / 3.12 / 3.14
- **Web Framework:** FastAPI (RESTful API, background processing, range-request streaming)
- **ASGI Server:** Uvicorn
- **Computer Vision & Video Decoding:** OpenCV (`cv2.VideoCapture`) & FFmpeg / FFprobe
- **Object Detection Model:** Ultralytics YOLO (`yolov8n.pt`, 80 COCO classes)
- **Image Captioning Model:** Hugging Face Transformers (`Salesforce/blip-image-captioning-base`)
- **Image Processing & Numerics:** Pillow (PIL), NumPy, SciPy
- **Data Validation:** Pydantic V2
- **Persistent Storage:** SQLite with WAL mode and foreign key constraints
- **Test Automation:** pytest & FastAPI TestClient

### Frontend
- **Framework:** React 18 with TypeScript
- **Build Tool:** Vite
- **Styling:** Vanilla Tailwind CSS with customized dark-mode palette
- **Icons:** Lucide React
- **Video Playback:** Native HTML5 Video with byte-range HTTP streaming

---

## 4. System Architecture & Folder Structure

```
video-analyser/
├── backend/
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py              # FastAPI application entrypoint & middleware
│   │   ├── config.py            # Environment configuration & hardware discovery
│   │   ├── api/                 # REST endpoints
│   │   │   ├── health.py        # System health & diagnostic status
│   │   │   ├── uploads.py       # Video upload & byte-range streaming
│   │   │   └── analyses.py      # Job lifecycle, keyframes, exports & deletion
│   │   ├── schemas/             # Pydantic schemas
│   │   │   ├── video.py
│   │   │   └── analysis.py
│   │   ├── services/            # Core CV and AI services
│   │   │   ├── video_service.py     # Container validation & dual-engine metadata
│   │   │   ├── frame_service.py     # Uniform PTS frame sampling
│   │   │   ├── scene_service.py     # 2D HSV histogram & luminance change detection
│   │   │   ├── detection_service.py # YOLO model caching, centroid tracking & overlays
│   │   │   ├── domain_service.py    # Produce ripeness inspection & domain telemetry
│   │   │   ├── caption_service.py   # BLIP image captioning & failure handling
│   │   │   ├── keyframe_service.py  # Multi-criteria keyframe selection & deduplication
│   │   │   ├── summary_service.py   # Deterministic evidence-grounded summarizer
│   │   │   └── report_service.py    # JSON, CSV & formal PDF dossier generators
│   │   ├── workers/
│   │   │   └── analysis_worker.py   # In-process asynchronous worker & stage tracker
│   │   ├── storage/
│   │   │   └── storage_service.py   # Path traversal safeguards & file management
│   │   └── db/
│   │       ├── database.py          # SQLite schema initialization & transactions
│   │       └── models.py
│   ├── tests/
│   │   ├── test_api.py          # Endpoint tests, validation & E2E integration
│   │   └── test_services.py     # CV algorithmic tests on synthetic video
│   ├── requirements.txt
│   ├── .env.example
│   └── README.md
├── frontend/
│   ├── src/
│   │   ├── components/          # Reusable UI components
│   │   │   ├── Navbar.tsx
│   │   │   ├── Sidebar.tsx
│   │   │   ├── VideoPlayer.tsx  # Seek player with synchronized overlays
│   │   │   ├── Timeline.tsx     # Clickable temporal markers
│   │   │   └── KeyframeModal.tsx
│   │   ├── pages/               # Application views
│   │   │   ├── OverviewPage.tsx
│   │   │   ├── UploadPage.tsx
│   │   │   ├── ProcessingPage.tsx
│   │   │   ├── ResultsPage.tsx
│   │   │   ├── HistoryPage.tsx
│   │   │   ├── AboutPage.tsx
│   │   │   └── SettingsPage.tsx
│   │   ├── services/
│   │   │   └── api.ts           # REST API client
│   │   ├── types/
│   │   │   └── index.ts         # TypeScript definitions
│   │   ├── utils/
│   │   │   └── formatters.ts
│   │   ├── App.tsx
│   │   ├── main.tsx
│   │   └── index.css
│   ├── package.json
│   ├── vite.config.ts
│   ├── tailwind.config.js
│   ├── tsconfig.json
│   ├── .env.example
│   └── README.md
├── data/                        # Runtime storage (git-ignored)
│   ├── uploads/                 # Ingested video files
│   ├── processed/               # Extracted frames & keyframes
│   ├── reports/                 # Stored exports
│   └── video_analyser.db        # SQLite database file
├── .gitignore
├── README.md
└── PROJECT_DOCUMENTATION.md
```

---

## 5. Prerequisites & Environment Setup

### System Requirements
- **Operating System:** Windows 10/11, macOS, or Linux
- **Python:** 3.11, 3.12, or 3.14
- **Node.js:** Node.js 18+ and npm
- **Hardware:** Minimum 4GB RAM (8GB+ recommended); supports CPU execution out-of-the-box

---

## 6. Installation & Execution Guide

### Step 1: Clone or Navigate to the Project Root
```bash
cd "C:\Users\Krish Patel\.gemini\antigravity-ide\scratch\video-analyser"
```

### Step 2: Install Backend Dependencies
```bash
cd backend
python -m pip install -r requirements.txt
```

### Step 3: Install Frontend Dependencies
```bash
cd ../frontend
npm install
```

---

## 7. Starting the Application

### 1. Launch the Backend Server
In your first terminal:
```bash
cd "C:\Users\Krish Patel\.gemini\antigravity-ide\scratch\video-analyser\backend"
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```
The backend API and Swagger UI will be available at:
- **API Health Check:** `http://127.0.0.1:8000/api/health`
- **Interactive Documentation (Swagger):** `http://127.0.0.1:8000/docs`

### 2. Launch the Frontend Development Server
In your second terminal:
```bash
cd "C:\Users\Krish Patel\.gemini\antigravity-ide\scratch\video-analyser\frontend"
npm run dev
```
Open your browser to:
- **Frontend Dashboard:** `http://localhost:5173`

---

## 8. Executing Automated Tests

### Backend Unit & Integration Tests (12 Automated Tests)
Run pytest inside the `backend` directory:
```bash
cd "C:\Users\Krish Patel\.gemini\antigravity-ide\scratch\video-analyser\backend"
python -m pytest tests -v
```

### Frontend TypeScript Verification & Production Build
```bash
cd "C:\Users\Krish Patel\.gemini\antigravity-ide\scratch\video-analyser\frontend"
npm run build
```

---

## 9. Model Caching & Hardware Execution

- **YOLOv8 Object Detector (`yolov8n.pt`):** Automatically cached under `data/models/`. Nano model size (~6 MB) ensures rapid CPU inference with low memory overhead.
- **BLIP Captioning Model (`Salesforce/blip-image-captioning-base`):** Cached in standard Hugging Face / PyTorch cache. Independently togglable in the upload settings. If the caption model is disabled or fails to initialize, object detection and keyframe selection proceed normally, logging a clear warning rather than fabricating fake outputs.
- **Hardware Device Fallback:** The backend dynamically checks `torch.cuda.is_available()`. If no CUDA GPU is detected, it operates safely in CPU mode.

---

## 10. Known Limitations & Academic Boundary

1. **Object Detection vs. Action Recognition:** YOLO identifies object bounding boxes (e.g. `person`, `car`, `dog`) on individual frames. It does not infer temporal human intent, narrative storyline, or complex actions.
2. **Scene Shift Heuristics:** Candidate scene changes are derived from HSV color histogram Bhattacharyya distance and mean absolute pixel difference. They indicate visual cuts, not semantic chaptering.
3. **No Paid Cloud APIs:** All processing is conducted locally without external LLM calls or cloud API dependencies.

---

## 11. Recommended Workspace Setting

To open and explore this project directly in Antigravity IDE / VS Code, open the folder:
`C:\Users\Krish Patel\.gemini\antigravity-ide\scratch\video-analyser`
