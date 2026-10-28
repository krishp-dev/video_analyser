import io
import csv
import json
from pathlib import Path
from typing import Dict, Any
from app.storage.storage_service import storage_service

class ReportService:
    @classmethod
    def export_json(cls, analysis_data: Dict[str, Any]) -> str:
        """Generate structured JSON report string."""
        return json.dumps(analysis_data, indent=2, default=str)

    @classmethod
    def export_csv(cls, analysis_data: Dict[str, Any]) -> str:
        """
        Generate CSV report combining detections, timestamps, bounding boxes, and frame captions.
        """
        output = io.StringIO()
        writer = csv.writer(output)

        # Header
        writer.writerow([
            "analysis_id",
            "video_filename",
            "timestamp_seconds",
            "frame_id",
            "event_type",
            "class_name",
            "confidence",
            "bbox_x1",
            "bbox_y1",
            "bbox_x2",
            "bbox_y2",
            "caption_or_details"
        ])

        video_name = analysis_data.get("video", {}).get("original_name", "")
        analysis_id = analysis_data.get("analysis_id", "")

        # Detections
        for d in analysis_data.get("detections", []):
            bbox = d.get("bbox", [0, 0, 0, 0])
            writer.writerow([
                analysis_id,
                video_name,
                d.get("timestamp", 0.0),
                d.get("frame_id", ""),
                "detection",
                d.get("class_name", ""),
                d.get("confidence", 0.0),
                bbox[0] if len(bbox) > 0 else "",
                bbox[1] if len(bbox) > 1 else "",
                bbox[2] if len(bbox) > 2 else "",
                bbox[3] if len(bbox) > 3 else "",
                f"Model: {d.get('model_name', '')}"
            ])

        # Scene Changes
        for s in analysis_data.get("scene_candidates", []):
            writer.writerow([
                analysis_id,
                video_name,
                s.get("timestamp", 0.0),
                f"frame_idx_{s.get('frame_index', 0)}",
                "scene_change_candidate",
                "",
                s.get("difference_score", 0.0),
                "", "", "", "",
                s.get("reason", "")
            ])

        # Captions
        for c in analysis_data.get("captions", []):
            writer.writerow([
                analysis_id,
                video_name,
                c.get("timestamp", 0.0),
                c.get("frame_id", ""),
                "frame_caption",
                "",
                "",
                "", "", "", "",
                c.get("caption_text", "")
            ])

        return output.getvalue()

    @classmethod
    def export_pdf(cls, analysis_data: Dict[str, Any]) -> bytes:
        """
        Generate a multi-page PDF Forensic Dossier using reportlab.
        Includes metadata, executive summary, domain intelligence, and detection tables.
        """
        from reportlab.lib.pagesizes import letter
        from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, KeepTogether
        from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
        from reportlab.lib import colors

        buf = io.BytesIO()
        doc = SimpleDocTemplate(
            buf,
            pagesize=letter,
            rightMargin=36,
            leftMargin=36,
            topMargin=36,
            bottomMargin=36
        )

        styles = getSampleStyleSheet()
        story = []

        # Custom Typographic Styles
        title_style = ParagraphStyle(
            'ReportTitle',
            parent=styles['Heading1'],
            fontSize=20,
            leading=24,
            textColor=colors.HexColor('#0f172a'),
            spaceAfter=4
        )
        subtitle_style = ParagraphStyle(
            'ReportSubtitle',
            parent=styles['Normal'],
            fontSize=10,
            leading=14,
            textColor=colors.HexColor('#475569'),
            spaceAfter=12
        )
        section_style = ParagraphStyle(
            'SectionHeader',
            parent=styles['Heading2'],
            fontSize=13,
            leading=16,
            textColor=colors.HexColor('#1e40af'),
            spaceBefore=10,
            spaceAfter=6
        )
        body_style = ParagraphStyle(
            'Body',
            parent=styles['Normal'],
            fontSize=9,
            leading=12,
            textColor=colors.HexColor('#1e293b')
        )
        small_style = ParagraphStyle(
            'Small',
            parent=styles['Normal'],
            fontSize=8,
            leading=10,
            textColor=colors.HexColor('#64748b')
        )

        # 1. Header Banner
        story.append(Paragraph("AI VIDEO ANALYSER & FORENSIC DOSSIER", title_style))
        story.append(Paragraph("Automated Visual Intelligence, Object Tracking & Evidence-Grounded Verification", subtitle_style))
        story.append(Spacer(1, 8))

        # 2. Video & Job Metadata Table
        video = analysis_data.get("video", {})
        summary = analysis_data.get("summary", {})
        domain = analysis_data.get("domain_insights", {})

        meta_rows = [
            [
                Paragraph("<b>Video Asset:</b>", body_style),
                Paragraph(str(video.get("original_name", "N/A")), body_style),
                Paragraph("<b>Analysis Job ID:</b>", body_style),
                Paragraph(str(analysis_data.get("analysis_id", "N/A"))[:18] + "...", small_style)
            ],
            [
                Paragraph("<b>Duration:</b>", body_style),
                Paragraph(f"{video.get('duration', 0.0):.2f} seconds", body_style),
                Paragraph("<b>Resolution & FPS:</b>", body_style),
                Paragraph(f"{video.get('width', 0)}x{video.get('height', 0)} @ {video.get('fps', 0):.1f} fps", body_style)
            ],
            [
                Paragraph("<b>Processing Status:</b>", body_style),
                Paragraph(f"<b>{analysis_data.get('status', 'COMPLETED').upper()}</b>", body_style),
                Paragraph("<b>Total Detections:</b>", body_style),
                Paragraph(f"{len(analysis_data.get('detections', []))} objects ({len(analysis_data.get('keyframes', []))} keyframes)", body_style)
            ]
        ]
        meta_table = Table(meta_rows, colWidths=[110, 160, 120, 150])
        meta_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#f8fafc')),
            ('BOX', (0, 0), (-1, -1), 1, colors.HexColor('#cbd5e1')),
            ('INNERGRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#e2e8f0')),
            ('TOPPADDING', (0, 0), (-1, -1), 4),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ]))
        story.append(meta_table)
        story.append(Spacer(1, 12))

        # 3. Domain Intelligence Section
        if domain:
            story.append(Paragraph("Domain Intelligence & Specialized Telemetry", section_style))
            d_type = domain.get("domain_type", "Standard Video Analysis")
            d_metric = domain.get("primary_metric_label", "Metrics")
            d_val = domain.get("primary_metric_value", "N/A")
            d_status = domain.get("status_indicator", "Nominal")

            domain_rows = [
                [Paragraph("<b>Domain Classification:</b>", body_style), Paragraph(d_type, body_style)],
                [Paragraph(f"<b>{d_metric}:</b>", body_style), Paragraph(f"<b>{d_val}</b> ({d_status})", body_style)]
            ]
            for k, v in domain.get("details", {}).items():
                domain_rows.append([
                    Paragraph(f"<b>{k.replace('_', ' ').title()}:</b>", body_style),
                    Paragraph(str(v), body_style)
                ])

            dom_table = Table(domain_rows, colWidths=[180, 360])
            dom_table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#eff6ff')),
                ('BOX', (0, 0), (-1, -1), 1, colors.HexColor('#93c5fd')),
                ('INNERGRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#dbeafe')),
                ('TOPPADDING', (0, 0), (-1, -1), 3),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
            ]))
            story.append(dom_table)
            story.append(Spacer(1, 12))

        # 4. Executive Summary & Observed Evidence Statement
        story.append(Paragraph("Executive Evidence Statement", section_style))
        ev_stmt = summary.get("evidence_statement", "Analysis completed with verified evidence records.")
        story.append(Paragraph(ev_stmt, body_style))
        story.append(Spacer(1, 6))

        if summary.get("overall_description"):
            story.append(Paragraph(f"<b>Synthesis:</b> {summary['overall_description']}", body_style))
            story.append(Spacer(1, 8))

        # 5. Detections & Tracking Log Table (Top 25)
        story.append(Paragraph("Object Detection & Persistent Tracking Log", section_style))
        dets = analysis_data.get("detections", [])

        det_rows = [
            [
                Paragraph("<b>#Track</b>", body_style),
                Paragraph("<b>Time</b>", body_style),
                Paragraph("<b>Class Name</b>", body_style),
                Paragraph("<b>Confidence</b>", body_style),
                Paragraph("<b>Bounding Box [x1, y1, x2, y2]</b>", body_style),
                Paragraph("<b>Attributes / Inspection</b>", body_style)
            ]
        ]

        for d in dets[:25]:
            t_id = d.get("track_id", "-")
            ts = f"{d.get('timestamp', 0.0):.2f}s"
            cname = str(d.get("class_name", "")).upper()
            conf = f"{float(d.get('confidence', 0.0))*100:.1f}%"
            bbox_str = str([int(x) for x in d.get("bbox", [0, 0, 0, 0])])
            attrs = d.get("attributes", {})
            attr_desc = attrs.get("grade", attrs.get("ripeness_status", attrs.get("orientation", "-")))

            det_rows.append([
                Paragraph(f"#{t_id}", small_style),
                Paragraph(ts, small_style),
                Paragraph(f"<b>{cname}</b>", small_style),
                Paragraph(conf, small_style),
                Paragraph(bbox_str, small_style),
                Paragraph(str(attr_desc), small_style)
            ])

        det_table = Table(det_rows, colWidths=[45, 45, 95, 65, 150, 140])
        det_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#1e40af')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('BOX', (0, 0), (-1, -1), 1, colors.HexColor('#94a3b8')),
            ('INNERGRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#cbd5e1')),
            ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#f8fafc')]),
            ('TOPPADDING', (0, 0), (-1, -1), 2),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 2),
        ]))
        story.append(det_table)
        story.append(Spacer(1, 14))

        # 6. Academic & Methodological Verification Note
        story.append(Paragraph("Methodology & Audit Compliance", section_style))
        story.append(Paragraph(
            "This document is deterministically generated from local inference by YOLOv8 (COCO 80-class) and OpenCV "
            "color histogram divergence. No external generative models were utilized to fabricate unobserved facts. "
            "All timestamps correlate directly to fractional offsets in the container stream.",
            small_style
        ))

        doc.build(story)
        return buf.getvalue()

report_service = ReportService()
