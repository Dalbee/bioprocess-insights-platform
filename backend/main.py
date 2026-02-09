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
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_PATH = os.path.join(BASE_DIR, "..", "data", "bioreactor-yields.csv")

# Data Initialization: Loads the CSV into memory or creates an empty fallback
try:
    df = pd.read_csv(DATA_PATH)
    print(f"API Online: Loaded {len(df)} rows from {DATA_PATH}")
except Exception as e:
    print(f"Error: Could not find CSV at {DATA_PATH}")
    df = pd.DataFrame()

# Tracker for the sliding data simulation
current_index = 0

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
    global current_index, temp_buffer
    if df.empty:
        return {"error": "No data available"}
    
    # 1. Get current row and increment index (loops back to 0 at end of file)
    row = df.iloc[current_index].to_dict()
    current_index = (current_index + 1) % len(df)
    
    # 2. CLOSED-LOOP SIMULATION LOGIC:
    # We use the user's manual RPM to influence biological outcomes.
    user_rpm = sim_adjustments["manual_rpm"]
    
    # Integrated Anomaly Logic
    # If the manual_anomaly flag is True, we force DO2 to crash to near zero,
    # simulating a sparger failure or sensor fault.
    if sim_adjustments["manual_anomaly"]:
        simulated_do2 = round(row['Dissolved_Oxygen'] * 0.05, 2) # 95% drop
    else:
        simulated_do2 = round((user_rpm / 300.0) * row['Dissolved_Oxygen'], 2)
    
    # 3. Digital Twin Logic: Calculate the "Predicted" Temperature
    # We maintain a sliding window of the last 5 points to determine the slope
    temp_buffer.append(row['Temperature'])
    if len(temp_buffer) > 5:
        temp_buffer.pop(0)
    
    predicted_temp = None
    if len(temp_buffer) == 5:
        # Simple Linear Projection: (Current - 4 steps ago) / time_delta
        slope = (temp_buffer[-1] - temp_buffer[0]) / 4
        predicted_temp = round(temp_buffer[-1] + (slope * 2), 2)

    # 4. Calculate Deviation: How far are we from the "Perfect" 37°C and 7.0 pH?
    temp_deviation = abs(row['Temperature'] - 37.0)
    ph_deviation = abs(row['pH'] - 7.0)
    
    # Enhanced Health Score
    # Now includes the anomaly state in the health calculation.
    do2_penalty = 50 if sim_adjustments["manual_anomaly"] else 0
    
    # 5. Calculate Health Score: Starts at 100, drops as deviations increase
    # This simulates a real-time "Batch Quality Index" that operators would monitor.
    health_score = 100 - (temp_deviation * 15) - (ph_deviation * 40) - do2_penalty
    health_score = max(0, min(100, health_score)) 
    
    # 6. Anomaly Logic: Flags "Out of Spec" conditions for the UI alert
    # Now triggers if health is low OR the manual anomaly is active.
    is_anomaly = health_score < 70 or sim_adjustments["manual_anomaly"]
    
    return {
        "status": "success",
        "data": {
            **row,
            "Impeller_Speed": user_rpm,
            "Dissolved_Oxygen": simulated_do2,
            "health_score": round(health_score, 1),
            "is_anomaly": is_anomaly,
            "digital_twin_temp": predicted_temp,
            "timestamp": pd.Timestamp.now().strftime("%H:%M:%S")
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