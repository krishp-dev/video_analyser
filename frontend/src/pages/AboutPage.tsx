import React from 'react';
import {
  BookOpen,
  Cpu,
  Layers,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Code2
} from 'lucide-react';

export const AboutPage: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-200">
      {/* Title Banner */}
      <div className="space-y-2 border-b border-dark-750 pb-5">
        <div className="inline-flex items-center gap-1.5 rounded-full border border-brand-500/30 bg-brand-500/10 px-3 py-1 text-xs font-semibold text-brand-300">
          <span>AI Computer Vision & Video Analysis Project</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
          AI-Based Video Analyser and Summarization System
        </h1>
        <p className="text-sm text-slate-400">
          Academic documentation on methodology, architectural design, computer vision models, and empirical limitations.
        </p>
      </div>

      {/* Abstract Card */}
      <div className="card-surface p-6 space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-brand-400">
          Project Abstract
        </h2>
        <p className="text-sm text-slate-300 leading-relaxed">
          The proliferation of high-resolution digital video content demands automated, evidence-grounded visual analysis systems. This project designs and implements an end-to-end local computer vision system called <strong>Video Analyser</strong>. The system ingests arbitrary video files (MP4, MOV, WebM, AVI), performs adaptive frame sampling, detects candidate scene transitions via HSV histogram and spatial luminance shifts, executes real-time deep learning object detection using YOLO, synthesizes visual descriptions with Salesforce BLIP, selects representative deduplicated keyframes, and compiles an evidence-grounded chronological summary without fabricating external facts.
        </p>
      </div>

      {/* Core Objectives */}
      <div className="card-surface p-6 space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-brand-400">
          Core Research Objectives
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div className="flex items-start gap-2.5 rounded-xl border border-dark-750 bg-dark-850 p-3.5">
            <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold text-slate-200">Local Execution & Zero Paid APIs:</span>
              <p className="text-slate-400 mt-0.5">Operates completely on consumer hardware (CPU or CUDA GPU) without external subscriptions or cloud leakage.</p>
            </div>
          </div>

          <div className="flex items-start gap-2.5 rounded-xl border border-dark-750 bg-dark-850 p-3.5">
            <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold text-slate-200">Evidence Grounding:</span>
              <p className="text-slate-400 mt-0.5">Summary generation is deterministic and grounded strictly in observed detections, timestamps, and model predictions.</p>
            </div>
          </div>

          <div className="flex items-start gap-2.5 rounded-xl border border-dark-750 bg-dark-850 p-3.5">
            <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold text-slate-200">Multi-Criteria Keyframe Selection:</span>
              <p className="text-slate-400 mt-0.5">Balances scene shifts, temporal uniform anchors, and detection density with visual deduplication.</p>
            </div>
          </div>

          <div className="flex items-start gap-2.5 rounded-xl border border-dark-750 bg-dark-850 p-3.5">
            <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold text-slate-200">Dual-Engine Metadata:</span>
              <p className="text-slate-400 mt-0.5">Robust metadata extraction utilizing FFprobe with seamless fallback to OpenCV VideoCapture.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Model & Algorithm Details */}
      <div className="card-surface p-6 space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-brand-400">
          Computer Vision Architecture & Algorithms
        </h2>

        <div className="space-y-4 text-xs">
          <div className="rounded-xl border border-dark-750 bg-dark-850 p-4 space-y-2">
            <div className="flex items-center gap-2 font-semibold text-slate-200 text-sm">
              <Sparkles className="h-4 w-4 text-brand-400" />
              <span>1. Object Detection (Ultralytics YOLO)</span>
            </div>
            <p className="text-slate-300 leading-relaxed">
              Employs pretrained <code>yolov8n</code>, a convolutional architecture optimized for lightweight real-time bounding box regression. It maps predicted pixel coordinates <code>[x1, y1, x2, y2]</code> directly to the source video resolution, producing class identities and confidence scores for 80 standard COCO categories.
            </p>
          </div>

          <div className="rounded-xl border border-dark-750 bg-dark-850 p-4 space-y-2">
            <div className="flex items-center gap-2 font-semibold text-slate-200 text-sm">
              <Layers className="h-4 w-4 text-violet-400" />
              <span>2. Image Captioning (Salesforce BLIP)</span>
            </div>
            <p className="text-slate-300 leading-relaxed">
              Utilizes Bootstrapped Language-Image Pre-training (BLIP) conditional vision-language generation to describe key scene frames in natural language, enabling rich contextual comprehension beyond static discrete category labels.
            </p>
          </div>

          <div className="rounded-xl border border-dark-750 bg-dark-850 p-4 space-y-2">
            <div className="flex items-center gap-2 font-semibold text-slate-200 text-sm">
              <Code2 className="h-4 w-4 text-amber-400" />
              <span>3. Candidate Scene Boundary Detection</span>
            </div>
            <p className="text-slate-300 leading-relaxed">
              Evaluates frame transitions using a weighted metric combining 70% 2D HSV color histogram Bhattacharyya distance with 30% normalized grayscale absolute luminance difference. Spikes beyond the configurable threshold mark candidate scene cuts.
            </p>
          </div>
        </div>
      </div>

      {/* Important Academic Distinctions */}
      <div className="card-surface p-6 space-y-4 border-amber-500/30">
        <div className="flex items-center gap-2 text-amber-400 font-semibold text-sm">
          <AlertTriangle className="h-4 w-4" />
          <span>Academic Scope & Technical Distinctions</span>
        </div>

        <div className="space-y-2 text-xs text-slate-300 leading-relaxed">
          <p>
            To maintain rigorous academic honesty, the following boundaries are established:
          </p>
          <ul className="list-disc list-inside space-y-1 text-slate-400">
            <li><strong>Object Detection vs. Action Recognition:</strong> Object detection verifies spatial entity presence. It does not infer human action, intentionality, or temporal causality.</li>
            <li><strong>Scene Transitions:</strong> Detected boundaries represent candidate visual shifts, not semantic narrative chaptering.</li>
            <li><strong>Audio Modality:</strong> Acoustic audio transcription and vocal emotion analysis are designated for future multi-modal phases.</li>
          </ul>
        </div>
      </div>
    </div>
  );
};
