# Bioprocess Insight Platform (BIP) 🧬
![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)
**A Real-time Bioreactor Monitoring Dashboard for Industrial Fermentation**

## 🧪 Project Overview
This platform simulates a live connection to a **Sartorius Biostat®** controller, providing real-time data visualization and automated anomaly detection for critical process parameters (CPPs). It bridges the gap between raw CSV historical data and live operational visibility.

### 🚀 Key Features
- **Real-time API:** Built with FastAPI to stream multivariate sensor data every 1000ms.
- **Interactive Dashboard:** Live charting of Temperature, pH, and DO2 using React & Recharts.
- **Batch Health Scoring:** Algorithmic calculation of batch viability based on setpoint deviations.
- **Anomaly Detection:** Automated flagging of out-of-spec batches (e.g., thermal spikes or agitation failure).
- **Data Portability:** One-click CSV export of the bioreactor yield reports.

## 🛠️ Tech Stack
- **Backend:** Python 3.12, FastAPI, Pandas
- **Frontend:** React (TypeScript), Recharts, Lucide-React
- **Styling:** CSS-in-JS (Modern Dark-Mode UI)

---

## 🚦 Getting Started

### 1. Prerequisites
- Python 3.10+ 
- Node.js (v18+)
- npm or yarn

---

### 2. Backend Setup
Navigate to the `backend` directory, create a virtual environment, and install dependencies:

```bash
cd backend
python -m venv venv
# Activate venv:
# Windows: .\venv\Scripts\activate | Mac/Linux: source venv/bin/activate
pip install -r requirements.txt
python main.py

```
--- 

### 3. Frontend Setup
In a new terminal, navigate to the frontend directory:

```bash
cd frontend
npm install
npm start
```

---
## 📡 API Documentation


| Endpoint | Method | Description |
| :--- | :--- | :--- |
| `/api/v1/process-data` | `GET` | Returns the latest bioreactor telemetry (Temp, pH, DO2), calculated health score, and anomaly flags. |
| `/api/v1/download-report` | `GET` | Streams the full `bioreactor-yields.csv` source file for local data analysis and reporting. |
---

## 🧠 Business Logic & Calculations

### Batch Health Score
The health score is a simulated Quality Index ($Q$) calculated based on the deviation from the ideal setpoints ($T_{set} = 37°C$, $pH_{set} = 7.0$):

$$Health = 100 - (|T_{actual} - 37| \times 15) - (|pH_{actual} - 7| \times 40)$$

### Anomaly Triggers
A batch is flagged as an Anomaly if:
- Temperature > $40.0°C$
- Impeller Speed < $100.0\ RPM$

---

## 📂 Repository Structure

```Plaintext
├── backend/               # FastAPI Server & Business Logic
├── frontend/              # React/TypeScript Dashboard
├── data/                  # Source CSV files (bioreactor-yields.csv)
├── .gitignore             # Git exclusion rules
└── README.md              # Project Documentation
```
---

## 📜 License
This project is licensed under the MIT License - see the LICENSE file for details.
