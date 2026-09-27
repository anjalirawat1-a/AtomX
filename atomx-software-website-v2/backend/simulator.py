"""End-to-end AtomX API demo.
Run the FastAPI server first, then: python simulator.py critical
"""
import json, math, random, sys, time
from urllib.request import Request, urlopen

API = "http://127.0.0.1:8000/api/ingest"
scenario = (sys.argv[1] if len(sys.argv) > 1 else "normal").lower()

def send(payload):
    req = Request(API, data=json.dumps(payload).encode(), headers={"Content-Type":"application/json"}, method="POST")
    with urlopen(req, timeout=2) as r:
        return json.loads(r.read())

t = 0
while True:
    t += 1
    for i in range(4):
        f=(i+1)/4
        if scenario == "critical":
            tilt=2.4+2.7*f+0.015*t; disp=9+10*f+0.04*t; vib=.26+.28*f
        elif scenario == "progressive":
            tilt=.7+1.9*f+0.006*t; disp=2.4+6.5*f+0.025*t; vib=.08+.12*f
        else:
            tilt=.3+.4*f; disp=1.3+1.4*f; vib=.04+.07*f
        payload={
            "node_id":f"N-{i+1:02d}","tilt_deg":round(tilt+random.uniform(-.06,.06),3),
            "displacement_mm":round(disp+random.uniform(-.18,.18),2),"vibration_g":round(vib+random.uniform(-.012,.012),3),
            "temperature_c":round(31+i*.3+random.uniform(-.2,.2),1),"humidity_pct":round(65-i+random.uniform(-1,1),1),"rssi_dbm":-70-i*2
        }
        result=send(payload)
        print(payload["node_id"], result["risk_score"], result["risk_level"])
    time.sleep(1)
