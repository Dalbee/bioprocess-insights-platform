from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
import pandas as pd
import os

app = FastAPI()

# CORS Configuration: Allows the React Frontend to talk to this Python Backend
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
    
    # 2. Digital Twin Logic: Calculate the "Predicted" Temperature
    # We maintain a sliding window of the last 5 points to determine the slope
    temp_buffer.append(row['Temperature'])
    if len(temp_buffer) > 5:
        temp_buffer.pop(0)
    
    predicted_temp = None
    if len(temp_buffer) == 5:
        # Simple Linear Projection: (Current - 4 steps ago) / time_delta
        slope = (temp_buffer[-1] - temp_buffer[0]) / 4
        predicted_temp = round(temp_buffer[-1] + (slope * 2), 2)

    # 3. Calculate Deviation: How far are we from the "Perfect" 37°C and 7.0 pH?
    temp_deviation = abs(row['Temperature'] - 37.0)
    ph_deviation = abs(row['pH'] - 7.0)
    
    # 4. Calculate Health Score: Starts at 100, drops as deviations increase
    # This simulates a real-time "Batch Quality Index"
    health_score = 100 - (temp_deviation * 15) - (ph_deviation * 40)
    health_score = max(0, min(100, health_score)) # Constrain between 0-100
    
    # 5. Anomaly Logic: Flags "Out of Spec" conditions for the UI alert
    is_anomaly = row['Temperature'] > 40.0 or row['Impeller_Speed'] < 100.0
    
    return {
        "status": "success",
        "data": {
            **row,
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
    """
    if os.path.exists(DATA_PATH):
        return FileResponse(
            path=DATA_PATH, 
            filename="bioprocess_batch_report.csv", 
            media_type="text/csv"
        )
    return {"error": "File not found"}

# Server Entry Point: Must be at the bottom to ensure all routes are registered
if __name__ == "__main__":
    import uvicorn
    # Render provides a $PORT environment variable; we default to 8000 for local testing
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)