import pandas as pd
import numpy as np

# Create a simulated Bioreactor Dataset (350 batches)
np.random.seed(42)
n_rows = 350

data = {
    'Temperature': np.random.normal(37, 0.5, n_rows),        # Mean 37°C
    'Impeller_Speed': np.random.normal(250, 10, n_rows),     # Mean 250 RPM
    'pH': np.random.normal(7.0, 0.1, n_rows),               # Mean 7.0 pH
    'Dissolved_Oxygen': np.random.normal(30, 2, n_rows),     # Mean 30%
    'Yield': np.random.normal(85, 5, n_rows)                # Yield percentage
}

df = pd.DataFrame(data)

# Inject some "Anomalies" (Critical for your Data Analytics demo!)
# Batch 50 is running too hot
df.at[50, 'Temperature'] = 42.0 
# Batch 100 has a stirrer failure
df.at[100, 'Impeller_Speed'] = 50.0 

# Save it to your data folder
import os
# --- IMPROVED SAVE LOGIC ---
import os

# Get the directory where THIS script is saved (the /backend folder)
current_folder = os.path.dirname(os.path.abspath(__file__))

# Go one level up from /backend to the root, then into /data
data_folder = os.path.join(current_folder, '..', 'data')

# Create the folder if it's missing
os.makedirs(data_folder, exist_ok=True)

# Define the final file path
file_path = os.path.join(data_folder, 'bioreactor-yields.csv')

# Save the file
df.to_csv(file_path, index=False)

print(f" Success! Created: {os.path.abspath(file_path)}")