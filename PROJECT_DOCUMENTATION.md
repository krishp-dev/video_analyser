# PROJECT DOCUMENTATION
## AI-Based Video Analyser and Summarization System
**Academic Semester 7 Capstone Project**

---

### 1. Abstract
Video data represents the single largest category of consumer internet traffic and industrial surveillance imagery. Automated analysis of long-form video streams without external cloud API dependencies is essential for privacy, cost control, and offline utility. This project presents **Video Analyser**, a full-stack, local Artificial Intelligence system engineered to process digital video streams (MP4, MOV, WebM, AVI). The system implements an asynchronous multi-stage computer vision pipeline encompassing video validation, frame-rate adaptive sampling, candidate scene boundary detection using HSV color histograms and pixel intensity differences, real-time object detection via Ultralytics YOLOv8, visual frame captioning with Salesforce BLIP, multi-criteria keyframe extraction, and deterministic evidence-grounded summarization. The architecture features a FastAPI Python backend with SQLite persistence and a modern React/TypeScript dashboard with synchronized video playback, interactive timeline seeking, and JSON/CSV report exports.

---

### 2. Introduction
Modern digital applications produce thousands of hours of video daily across CCTV surveillance, autonomous drones, educational lectures, and medical imaging. Manual scrubbing through hours of footage to locate critical events is inefficient and error-prone. While cloud-based Vision-Language models have emerged, they introduce major challenges: recurring API fees, privacy violations from uploading private footage, and generative hallucinations where non-existent actions are invented.

This project delivers a practical, engineering-grade solution designed to run on commodity workstation hardware (CPU and CUDA GPU) while maintaining strict empirical fidelity to observed visual data.

---

### 3. Problem Definition
To design and build an automated video analysis application that:
1. Safely ingests video files and extracts verified playback metadata.
2. Performs automated frame sampling at configurable temporal intervals.
3. Detects salient scene transitions and representative keyframes.
4. Detects and classifies visible entities with bounding boxes and confidence scores.
5. Synthesizes a natural language chronological summary grounded strictly in observed evidence.
6. Persists analysis history and enables downloadable report generation.

---

### 4. Project Objectives
- **Local Autonomy:** Zero reliance on proprietary cloud APIs (such as OpenAI, Anthropic, or Google Cloud Vision).
- **Evidence-Grounded Summarization:** Ensuring the generated summary cites observed timestamps, object classes, and visual captions rather than hallucinated actions.
- **Hardware Agnosticism:** Seamless execution on CPU with dynamic GPU offloading when CUDA is present.
- **Auditable Outputs:** Exporting all detections, bounding boxes, timestamps, and captions into standard JSON and CSV formats.

---

### 5. Existing System vs. Proposed System

| Dimension | Existing Cloud-Based Systems | Proposed Video Analyser System |
| :--- | :--- | :--- |
| **Privacy & Security** | Videos uploaded to third-party cloud servers | 100% local processing; media never leaves the local disk |
| **Cost Model** | Recurring token / API subscription fees | Open-source, zero runtime cost |
| **Summarization Reliability** | Generative LLMs prone to hallucinating actions | Deterministic evidence-grounded synthesis |
| **Hardware Dependency** | Remote server farm | Standard developer PC / laptop (CPU supported) |
| **Interactivity** | Static text summary | Synchronized video player with interactive timeline seeking |
| **Transparency** | Black-box generative outputs | Traceable evidence: exact bounding boxes, frames, and timestamps |

---

### 6. System Architecture

The application adopts a clean three-tier modular architecture:

```
[ Web Browser: React 18 + TypeScript + Tailwind CSS ]
                      │
            (HTTP / REST API / Range Streaming)
                      │
                      ▼
[ Application Server: FastAPI + Uvicorn + SQLite ]
       │                     │                 │
 (Video Service)     (CV Pipeline)      (Persistence & Storage)
       │                     │                 │
       ▼                     ▼                 ▼
[ OpenCV / FFprobe ]  [ YOLOv8 / BLIP ] [ SQLite DB & Disk Storage ]
```

1. **Presentation Layer (Frontend):** Built with React 18, TypeScript, and Tailwind CSS. Provides an intuitive dashboard with drag-and-drop upload, video player with Range-request streaming, interactive timeline, detection overlay viewer, and keyframe gallery.
2. **Application Layer (FastAPI REST API):** Manages endpoints for validation, background worker execution, state polling, file streaming, and exports.
3. **Computer Vision & Inference Layer:** Decoupled services for frame sampling, HSV histogram comparison, YOLO bounding box detection, and BLIP captioning.
4. **Data & Storage Layer:** SQLite database for job records, detections, and keyframe metadata with safe directory management preventing path traversal.

---

### 7. Functional Requirements

1. **FR-1 Video Ingestion & Validation:**
   - Accepts MP4, MOV, WebM, and AVI containers.
   - Enforces configurable limits: max 100 MB, max 5 minutes duration, max 1080p resolution.
   - Rejects empty, corrupted, and non-video files using container magic byte inspection.
2. **FR-2 Metadata Extraction:**
   - Extracts duration, frame rate (fps), dimensions, total frame count, and video codec using FFprobe and OpenCV.
3. **FR-3 Frame Sampling:**
   - Samples frames at configurable frequency (default 1.0 fps) with accurate presentation timestamps (PTS).
4. **FR-4 Candidate Scene Detection:**
   - Calculates visual difference scores using 2D HSV color histograms and mean absolute luminance difference.
5. **FR-5 Object Detection:**
   - Detects 80 COCO object classes with pixel-coordinate bounding boxes `[x1, y1, x2, y2]` and confidence values.
6. **FR-6 Visual Captioning:**
   - Generates natural language frame descriptions using pretrained Salesforce BLIP.
7. **FR-7 Keyframe Extraction:**
   - Multi-criteria selection based on scene cuts, detection density, and temporal anchors with visual deduplication.
8. **FR-8 Evidence-Grounded Summarization:**
   - Formulates executive descriptions, chronological timeline notes, and explicit limitation disclosures.
9. **FR-9 Interactive Playback & Timeline:**
   - Synchronized seeking when clicking any timestamp, marker, or keyframe card.
10. **FR-10 Report Export & Data Persistence:**
    - Downloads structured JSON and CSV reports; history persists in SQLite across backend restarts.

---

### 8. Non-Functional Requirements

- **NFR-1 Security:** Path traversal protection ensuring file operations remain strictly inside designated data folders.
- **NFR-2 Performance:** Lazy model loading and caching to prevent reloading weights on successive runs.
- **NFR-3 Responsiveness:** Asynchronous worker threading so long-running inference does not block HTTP connections.
- **NFR-4 Fault Tolerance:** Graceful degradation: if image captioning fails or is disabled, object detection and keyframe selection proceed normally.
- **NFR-5 Maintainability:** Strict separation of concerns across schemas, services, API routers, and database models.

---

### 9. Algorithms Used

#### A. Candidate Scene Boundary Detection
For consecutive sampled frames $F_{t-1}$ and $F_t$:
1. Convert images to HSV color space and calculate 2D color histogram $H(H, S)$ with 30 hue bins and 32 saturation bins.
2. Normalize histograms to unit sum.
3. Calculate the Bhattacharyya distance $D_B(H_1, H_2) = \sqrt{1 - \sum \sqrt{H_1(i) \cdot H_2(i)}}$.
4. Compute normalized mean absolute grayscale difference:
   $$\Delta_{pixel} = \frac{1}{W \cdot H} \sum_{x,y} \frac{|I_1(x,y) - I_2(x,y)|}{255}$$
5. Combined difference score:
   $$S_{diff} = 0.70 \cdot D_B + 0.30 \cdot \Delta_{pixel}$$
   If $S_{diff} \ge \tau_{scene}$ (default 0.35), register candidate scene boundary.

#### B. Multi-Criteria Keyframe Selection with Deduplication
1. **Initial Baseline:** Always select the video initial anchor $t=0.0s$.
2. **Scene Candidates:** Add frames corresponding to candidate scene transitions.
3. **Detection Diversity:** Add frames exhibiting highest distinct object class counts.
4. **Temporal Uniform Anchors:** Add evenly spaced anchors across duration $T$.
5. **Deduplication Pass:** Iterate over candidate pool sorted by timestamp; discard frame $F_j$ if $S_{diff}(F_i, F_j) < 0.12$ and $|t_i - t_j| < 5.0s$.
6. Cap total selected keyframes at configured threshold $K_{max}$ (default 10).

---

### 10. Deep Learning Models Used

1. **Ultralytics YOLOv8 (Nano - `yolov8n.pt`):**
   - **Architecture:** Anchor-free single-stage convolutional neural network.
   - **Training Set:** Microsoft COCO (Common Objects in Context - 80 classes).
   - **Parameters:** ~3.2M parameters (~6.2 MB disk footprint).
   - **Inference Speed:** ~15–30ms per frame on CPU; ~3–5ms on GPU.
2. **Salesforce BLIP (`Salesforce/blip-image-captioning-base`):**
   - **Architecture:** Vision Transformer (ViT) encoder coupled with a causal language decoder.
   - **Purpose:** Generates descriptive natural language sentences for key video frames.

---

### 11. Empirical Results & Test Evaluation

The application was tested through an automated test suite implemented in `pytest` and evaluated on Windows 11 with Python 3.14 and Node.js v20.18.

#### Test Execution Summary:
```
============================= test session starts =============================
platform win32 -- Python 3.14.6, pytest-9.1.1
collected 12 items

tests/test_api.py::test_health_endpoint PASSED                           [  8%]
tests/test_api.py::test_root_endpoint PASSED                             [ 16%]
tests/test_api.py::test_invalid_analysis_id_returns_404 PASSED           [ 25%]
tests/test_api.py::test_upload_rejects_empty_file PASSED                 [ 33%]
tests/test_api.py::test_upload_rejects_invalid_extension PASSED          [ 41%]
tests/test_api.py::test_full_analysis_workflow_end_to_end PASSED         [ 50%]
tests/test_services.py::test_video_validation_and_metadata PASSED        [ 58%]
tests/test_services.py::test_video_validation_rejects_corrupted PASSED   [ 66%]
tests/test_services.py::test_frame_sampling PASSED                       [ 75%]
tests/test_services.py::test_scene_change_detection PASSED               [ 83%]
tests/test_services.py::test_summary_generation PASSED                   [ 91%]
tests/test_services.py::test_report_exports PASSED                       [100%]
======================= 12 passed, 1 warning in 14.55s ========================
```

#### Frontend Production Build Verification:
```
vite v5.4.21 building for production...
✓ 1585 modules transformed.
dist/index.html                   1.43 kB │ gzip:  0.78 kB
dist/assets/index-Bicr7rxc.css   35.28 kB │ gzip:  6.51 kB
dist/assets/index-CryILINK.js   242.20 kB │ gzip: 66.78 kB
✓ built in 11.84s
```

---

### 12. Ethical Considerations & System Scope

- **Object Detection vs. Action Recognition:** Object detection verifies visual entity existence. It does not identify individuals, classify facial emotions, or judge intentionality.
- **Privacy Assurance:** Local processing ensures video feeds are never broadcast to public networks or external APIs.

---

### 13. Future Enhancements

1. **Acoustic Transcription:** Integrate local OpenAI Whisper for audio speech-to-text.
2. **Temporal Action Models:** Incorporate SlowFast or VideoMAE for temporal activity classification.
3. **Semantic Vector Search:** Generate frame embeddings using CLIP to enable text search over video collections.

---

### 14. References
1. Ultralytics YOLOv8 Documentation: https://docs.ultralytics.com/
2. Salesforce BLIP: Bootstrapped Language-Image Pre-training (Li et al., ICML 2022).
3. OpenCV Documentation: https://docs.opencv.org/
4. FastAPI Framework: https://fastapi.tiangolo.com/
5. React & Vite Documentation: https://vitejs.dev/
