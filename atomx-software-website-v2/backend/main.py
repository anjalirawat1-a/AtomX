from __future__ import annotations
from collections import deque
from datetime import datetime, timezone
from typing import Dict, List
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

app = FastAPI(title="AtomX Mine Subsidence API", version="1.0.0")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_credentials=False, allow_methods=["*"], allow_headers=["*"])

class Telemetry(BaseModel):
    node_id: str = Field(min_length=1, max_length=32)
    timestamp: str | None = None
    tilt_deg: float
    displacement_mm: float
    vibration_g: float
    temperature_c: float | None = None
    humidity_pct: float | None = None
    rssi_dbm: int | None = None

STORE: Dict[str, deque] = {}
ALERTS: deque = deque(maxlen=100)

def clamp(x: float, lo: float = 0, hi: float = 100) -> float:
    return max(lo, min(hi, x))

def score_packet(p: Telemetry) -> dict:
    t = clamp(abs(p.tilt_deg) / 5.0, 0, 1)
    d = clamp(abs(p.displacement_mm) / 20.0, 0, 1)
    v = clamp(abs(p.vibration_g) / 0.5, 0, 1)
    score = (0.34 * t + 0.36 * d + 0.30 * v) * 100
    if t > 0.55 and d > 0.45:
        score += 9
    if d > 0.65 and v > 0.50:
        score += 10
    score = round(clamp(score))
    level = "critical" if score >= 75 else "warning" if score >= 45 else "normal"
    return {
        "risk_score": score,
        "risk_level": level,
        "contributors": {
            "tilt": round(t * 100, 1),
            "displacement": round(d * 100, 1),
            "vibration": round(v * 100, 1),
        },
    }

@app.get("/api/health")
def health():
    return {"status": "ok", "service": "atomx-api", "utc": datetime.now(timezone.utc).isoformat()}

@app.post("/api/ingest")
def ingest(packet: Telemetry):
    packet.timestamp = packet.timestamp or datetime.now(timezone.utc).isoformat()
    scored = score_packet(packet)
    record = {**packet.model_dump(), **scored}
    STORE.setdefault(packet.node_id, deque(maxlen=500)).append(record)
    if scored["risk_level"] in {"warning", "critical"}:
        ALERTS.appendleft({
            "timestamp": packet.timestamp,
            "node_id": packet.node_id,
            "type": scored["risk_level"],
            "risk_score": scored["risk_score"],
            "message": "Multi-sensor deformation threshold exceeded"
        })
    return {"accepted": True, **scored}

@app.get("/api/nodes")
def nodes():
    out=[]
    for node_id, rows in STORE.items():
        if rows:
            out.append(rows[-1])
    return out

@app.get("/api/telemetry/latest/{node_id}")
def latest(node_id: str):
    rows=STORE.get(node_id)
    if not rows:
        raise HTTPException(404, "No telemetry for this node")
    return rows[-1]

@app.get("/api/telemetry/history/{node_id}")
def history(node_id: str, limit: int = 120):
    rows=STORE.get(node_id)
    if not rows:
        return []
    limit=max(1,min(limit,500))
    return list(rows)[-limit:]

@app.get("/api/alerts")
def alerts():
    return list(ALERTS)

@app.get("/api/risk")
def overall_risk():
    latest_rows=[rows[-1] for rows in STORE.values() if rows]
    if not latest_rows:
        return {"risk_score": 0, "risk_level": "normal", "nodes": 0}
    scores=sorted([r["risk_score"] for r in latest_rows], reverse=True)
    avg=sum(scores)/len(scores)
    overall=round(clamp(scores[0]*0.62 + avg*0.38))
    return {"risk_score": overall, "risk_level": "critical" if overall>=75 else "warning" if overall>=45 else "normal", "nodes": len(scores)}
