# Video Analyser — Backend Service

FastAPI-powered asynchronous AI computer vision backend for local video analysis, object detection, visual captioning, scene change detection, keyframe selection, and evidence-grounded summarization.

## Architecture & Technology Stack
- **Framework:** FastAPI with Uvicorn server
- **Video Decoding & Metadata:** OpenCV (`cv2.VideoCapture`) & FFmpeg/FFprobe
- **Object Detection:** Ultralytics YOLO (`yolov8n.pt`, COCO 80 classes)
- **Visual Description:** Hugging Face Transformers (`Salesforce/blip-image-captioning-base`)
- **Persistence:** SQLite with WAL mode and foreign key constraints
- **Testing:** pytest with FastAPI TestClient / HTTPX

## Startup Instructions
1. Install Python requirements:
   ```bash
   python -m pip install -r requirements.txt
   ```
2. Start the development server from the `backend` directory:
   ```bash
   uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
   ```
3. Interactive API documentation is available at:
   - Swagger UI: `http://127.0.0.1:8000/docs`
   - ReDoc: `http://127.0.0.1:8000/redoc`

## Running Tests
Execute the backend test suite:
```bash
pytest tests/ -v
```
