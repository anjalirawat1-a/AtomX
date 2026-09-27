# AtomX Backend

Run locally:

```bash
python -m venv .venv
# Windows: .venv\\Scripts\\activate
# Linux/macOS: source .venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

Interactive API docs: `http://127.0.0.1:8000/docs`

Example gateway payload:

```json
{
  "node_id":"N-02",
  "tilt_deg":1.24,
  "displacement_mm":5.8,
  "vibration_g":0.18,
  "temperature_c":31.8,
  "humidity_pct":63,
  "rssi_dbm":-74
}
```

The scoring function is deliberately explainable for a prototype. For the final SIH demo, replace `score_packet()` with the trained model inference function while preserving the API response shape.
