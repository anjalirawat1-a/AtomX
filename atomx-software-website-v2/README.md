# AtomX software website v2

A polished, interactive SIH 2026 software prototype for the AtomX mine-subsidence monitoring system.

## What is included
- `frontend/` — static deployable website (HTML/CSS/JS)
- `backend/` — FastAPI prototype API copied from the previous AtomX build

## Frontend features
- Public project landing page
- Interactive mine plan
- Full-screen control room
- Demo feed and Hardware API modes
- Live telemetry simulation
- Risk state changes
- Scenario injector (normal / deformation / vibration / critical)
- Sensor-node drill-down drawer
- Node health screen
- Alert queue with acknowledgements
- JSON snapshot export
- Backend connection tester
- Responsive mobile layout

## Run locally
Open `frontend/index.html` in a browser, or serve the folder:

```bash
cd frontend
python -m http.server 5500
```

Then open `http://127.0.0.1:5500`.

## Deploy to Vercel
Deploy the `frontend` folder as a static site. No build command is required.

## Backend
```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

Switch the website to **Hardware API** and set the backend URL in **System**.

## Judge demo suggestion
1. Start on the landing page.
2. Click **Run interactive demo**.
3. Switch between telemetry, nodes and alerts.
4. Trigger **Progressive deformation**, then **Critical event**.
5. Open NODE-02 on the mine map.
6. Acknowledge the alert.
7. Export the current snapshot.
8. For the physical demo, use Hardware API mode with the Raspberry Pi/FastAPI backend.

Keep simulated conditions clearly labelled as demo data. Use real sensor data when the physical node is connected.
