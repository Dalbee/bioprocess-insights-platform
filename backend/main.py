from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
import pandas as pd
import os

app = FastAPI()

# CORS Configuration: Allows the React Frontend to talk to this Python Backend
# Essential for a microservices architecture where services run on different ports.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_methods=["*"],
    allow_headers=["*"],
)

# Path Logic: Defines paths relative to this script location
# UPDATED for Docker: Since main.py is in 'backend/' and CSV is in 'backend/data/',
# we use the direct relative path from this file's directory.
BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# Define the specific internal path
INTERNAL_DATA_PATH = os.path.join(BASE_DIR, "data", "bioreactor-yields.csv")

if os.path.exists(INTERNAL_DATA_PATH):
    DATA_PATH = INTERNAL_DATA_PATH
elif os.path.exists("/data/bioreactor-yields.csv"):
    DATA_PATH = "/data/bioreactor-yields.csv"
else:
    # Fallback for local development if running from the root folder
    DATA_PATH = os.path.join(BASE_DIR, "..", "data", "bioreactor-yields.csv")

# Data Initialization: Loads the CSV into memory or creates an empty fallback
try:
    df = pd.read_csv(DATA_PATH)
    print(f"-----------------------------------------------")
    print(f"API Online: Loaded {len(df)} rows from {DATA_PATH}")
    print(f"-----------------------------------------------")
except Exception as e:
    print(f"-----------------------------------------------")
    print(f"Error: Could not find CSV at {DATA_PATH}")
    print(f"-----------------------------------------------")
    df = pd.DataFrame()

# Tracker for the sliding data simulation
current_index = 0
batch_count = 1  # Track the current batch run

# Digital Twin Memory: Stores the last 5 Temperature points to calculate trends
# This allows the "Twin" to project future values based on recent history
temp_buffer = []

# New global state for simulation adjustments
# This mimics the "Control Setpoints" on a Sartorius Biostat® controller
# ADDED: manual_anomaly flag to track the "Fail O2" button state
sim_adjustments = {
    "manual_rpm": 300.0,
    "manual_anomaly": False 
}

@app.post("/api/v1/control")
async def update_simulation(data: dict):
    """
    Allows the user to simulate an operator action via the HMI.
    Captures manual setpoint changes (e.g., RPM) to influence the Digital Twin.
    """
    new_rpm = float(data.get("rpm", 300.0))
    sim_adjustments["manual_rpm"] = new_rpm
    return {"status": "Control Signal Received", "new_rpm": new_rpm}

@app.get("/api/v1/process-data")
async def get_process_data():
    """
    Simulates real-time hardware data by iterating through the CSV rows.
    Calculates derived metrics like Health Score and Anomaly detection.
    Integrates a Digital Twin layer for predictive Temperature modeling.
    """
    global current_index, temp_buffer, batch_count
    if df.empty:
        return {"error": "No data available"}
    
    # 1. Get current row and increment index
    row = df.iloc[current_index].to_dict()
    
    # NEW LOGIC: Check if we are about to loop. If so, increment the batch_id.
    # This simulates the transition from 'Batch A' finishing to 'Batch B' starting.
    if current_index + 1 >= len(df):
        current_index = 0
        batch_count += 1
    else:
        current_index += 1
    
    # 2. CLOSED-LOOP SIMULATION LOGIC:
    # We use the user's manual RPM to influence biological outcomes.
    user_rpm = sim_adjustments["manual_rpm"]
    
    # --- BIOPHYSICAL COUPLING ---
    # We calculate a 'Heat Friction' effect. If RPM is very high, 
    # it adds a slight upward bias to the CSV temperature.
    rpm_heat_bias = (user_rpm - 300) / 1000  # Every 100 RPM adds 0.1°C
    simulated_temp = round(row['Temperature'] + rpm_heat_bias, 2)

    # Integrated Anomaly Logic
    if sim_adjustments["manual_anomaly"]:
        simulated_do2 = round(row['Dissolved_Oxygen'] * 0.05, 2) # 95% drop
    else:
        agitation_factor = (user_rpm / 300.0) ** 0.5
        simulated_do2 = round(agitation_factor * row['Dissolved_Oxygen'], 2)

    # --- AUTOMATED CORRECTIVE ACTION (AI PILOT) ---
    auto_pilot_active = False
    if simulated_do2 < 30.0 and not sim_adjustments["manual_anomaly"]:
        sim_adjustments["manual_rpm"] = min(600.0, sim_adjustments["manual_rpm"] + 5.0)
        auto_pilot_active = True
    
    # 3. Digital Twin Logic: Calculate the "Predicted" Temperature
    temp_buffer.append(simulated_temp)
    if len(temp_buffer) > 5:
        temp_buffer.pop(0)
    
    predicted_temp = None
    if len(temp_buffer) == 5:
        slope = (temp_buffer[-1] - temp_buffer[0]) / 4
        predicted_temp = round(temp_buffer[-1] + (slope * 2), 2)

    # 4. Calculate Deviation: Using the coupled simulated_temp
    temp_deviation = abs(simulated_temp - 37.0)
    ph_deviation = abs(row['pH'] - 7.0)
    
    # Enhanced Health Score
    do2_penalty = 50 if sim_adjustments["manual_anomaly"] else 0
    health_score = 100 - (temp_deviation * 15) - (ph_deviation * 40) - do2_penalty
    health_score = max(0, min(100, health_score)) 
    
    # 6. Anomaly Logic: Flags "Out of Spec" conditions
    is_anomaly = health_score < 70 or sim_adjustments["manual_anomaly"]
    
    # --- ROUNDING & DATA PACKAGING ---
    # Final data packet with rounded values and NEW Batch ID tracking
    return {
        "status": "success",
        "data": {
            **row,
            "batch_id": f"B2026-{batch_count:03d}", # Unique identifier Format: B2026-001, B2026-002, etc.
            "Temperature": simulated_temp,
            "Impeller_Speed": round(sim_adjustments["manual_rpm"], 1),
            "Dissolved_Oxygen": round(simulated_do2, 2),
            "pH": round(row['pH'], 2),             # FIXED GHOST DECIMALS
            "Yield": round(row['Yield'], 2),       # FIXED GHOST DECIMALS
            "health_score": round(health_score, 1),
            "is_anomaly": is_anomaly,
            "auto_pilot_active": auto_pilot_active,
            "digital_twin_temp": predicted_temp,
            "timestamp": pd.Timestamp.now(tz='UTC').strftime("%H:%M:%S") # RESTORED: Standardized UTC timestamp
        }
    }

@app.get("/api/v1/download-report")
async def download_report():
    """
    Serves the raw CSV file to the frontend for the 'Export CSV' functionality.
    This action is logged by the .NET Audit Service for compliance.
    """
    if os.path.exists(DATA_PATH):
        return FileResponse(
            path=DATA_PATH, 
            filename="bioprocess_batch_report.csv", 
            media_type="text/csv"
        )
    return {"error": "File not found"}

@app.post("/api/v1/trigger-anomaly")
async def trigger_anomaly():
    """
    State Manipulation
    This endpoint manually overrides the simulation logic to 
    force a failure state in the next data packet.
    """
    try:
        # Explicitly using the dictionary key 
        # to ensure the global state is updated correctly.
        sim_adjustments["manual_anomaly"] = True
        print(f"DEBUG: Anomaly Triggered! Current State: {sim_adjustments}")
        return {
            "status": "success", 
            "message": "O2 Failure Injected",
            "current_state": sim_adjustments["manual_anomaly"]
        }
    except Exception as e:
        # This will now print the EXACT error to your terminal 
        # so we can see what's wrong if it fails again.
        print(f"CRITICAL ERROR in trigger_anomaly: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/v1/reset-anomaly")
async def reset_anomaly():
    """
    RECOVERY LOGIC:
    Clears the manual failure state, allowing the bioreactor 
    to return to steady-state operations.
    """
    try:
        sim_adjustments["manual_anomaly"] = False
        print(f"DEBUG: System Reset! Current State: {sim_adjustments}")
        return {"status": "success", "message": "Anomaly cleared. System recovering..."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Server Entry Point: Must be at the bottom to ensure all routes are registered
if __name__ == "__main__":
    import uvicorn
    # Render provides a $PORT environment variable; we default to 8000 for local testing
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)