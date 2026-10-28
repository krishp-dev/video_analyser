# Video Analyser — Frontend Application

React 18, TypeScript, Vite, and Tailwind CSS client application for the AI Video Analyser and Summarization System.

## Features
- **Video Ingestion:** Drag and drop upload with live client-side validation and metadata extraction.
- **Interactive Playback:** HTML5 Range-request video streaming with timestamp seeking and bounding box overlays.
- **Interactive Timeline:** Temporal markers distinguishing object detections and candidate scene shifts.
- **Keyframe Gallery:** High-resolution frame preview modal with bounding boxes, extraction rationale, and BLIP caption.
- **Detection Studio:** Class breakdown filter badges with confidence distribution and coordinates.
- **Persistent History:** SQLite-backed historical records surviving server restarts with safe deletion.
- **Export Controls:** Direct downloadable JSON and CSV reports.

## Running Locally
1. Install dependencies:
   ```bash
   npm install
   ```
2. Start development server:
   ```bash
   npm run dev
   ```
   Open `http://localhost:5173` in your browser.
3. Build for production:
   ```bash
   npm run build
   ```
