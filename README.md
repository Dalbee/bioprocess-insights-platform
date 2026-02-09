# Bioprocess Insight Platform (BIP) 🧬
![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)
**A Real-time Bioreactor Monitoring Dashboard for Industrial Fermentation**

## 🧪 Project Overview
This platform simulates a live connection to a **Sartorius Biostat®** controller, providing real-time data visualization and automated anomaly detection for critical process parameters (CPPs). It utilizes a **Triad Microservice Architecture** to bridge the gap between historical data and live operational compliance.

---

## 🌍 Live Deployment
The platform is fully orchestrated across a distributed cloud architecture:

- **Frontend Dashboard:** [https://bioprocess-insights-platform.vercel.app/] (Hosted on Vercel)
- **Backend API:** [https://bioprocess-insights-platform.onrender.com] (Hosted on Render)

### 🏗️ Cloud Architecture
- **CI/CD:** Automatic deployments triggered via GitHub Actions.

- **Environment Management:** Utilizes `VITE_API_URL` environment variables to dynamically switch between local development and production API endpoints.

- **Cross-Origin Resource Sharing (CORS):** Backend configured to securely communicate with the Vercel-hosted frontend.

### System Architecture & Data Pipeline
This system utilizes a **Decoupled Triad Architecture**:
1. **Python Engine:** The "SCADA" layer—handles high-frequency mathematical projections and Digital Twin logic.
2. **.NET Service:** The "Compliance" layer—ensures all interactions are logged for regulatory review.
3. **React HMI:** The "Human-Machine Interface"—orchestrates data from both backends into a unified real-time view. 

![BIP Architecture Preview](./assets/system-architecture-and-data-pipeline-diagram.png)

### Project Architecture Diagram
![BIP Architecture Preview](./assets/bioprocess-high-architecture-diagram.png)

---

## 📸 Dashboard Preview
![BIP Dashboard Preview](./assets/dashboard-preview.png)

---

### 🚀 Key Features
- **Real-time API:** Built with FastAPI to stream multivariate sensor data every 1000ms.
- **Digital Twin Projection:** Predictive modeling that anticipates temperature shifts before they occur.
- **Interactive Dashboard:** Live charting of Temperature, pH, and DO2 using React & Recharts.
- **Batch Health Scoring:** Algorithmic calculation of batch viability based on setpoint deviations.
- **Anomaly Detection:** Automated flagging of out-of-spec batches (e.g., thermal spikes or agitation failure).
- **Data Portability:** One-click CSV export of the bioreactor yield reports.

### 🚨 Industrial UI/UX Features
- **Deterministic Alarms:** High-contrast pulsing animations for "Critical" batch states, optimized for operator reaction time.
- **Dynamic Status Badging:** At-a-glance "Optimal / Sub-Optimal / Critical" indicators based on real-time health scoring.

---

### 🛡️ GxP Compliance & Audit Trail
In biopharmaceutical manufacturing, **Data Integrity** is non-negotiable (21 CFR Part 11). This platform includes a dedicated **.NET Audit Microservice** that:
- **Immutable Logging:** Records every operator action (Setpoint changes, Data exports) in a secure audit trail.
- **Microservice Coordination:** Demonstrates a polyglot architecture where the React HMI communicates with both the Python Engine and the .NET Compliance Service simultaneously.
- **Lead Scientist Authorization:** Simulates a permission-based logging system where actions are tied to specific user roles.

---

## 🛠️ Tech Stack
- **Backend (Data Engine):** Python 3.12, FastAPI, Pandas
- **Backend (Compliance/Audit):** .NET 10, C#, ASP.NET Core
- **Frontend (HMI):** React (TypeScript), Recharts, Lucide-React
- **Styling:** CSS-in-JS & GxP Alarm Animations (Custom CSS Keyframes)


---

## 🚦 Getting Started

### 1. Prerequisites
- Python 3.10+ 
- Node.js (v18+)
- npm or yarn


### 2. Backend Setup
Navigate to the `backend` directory, create a virtual environment, and install dependencies:

```bash
cd backend
python -m venv venv
# Windows:
.\venv\Scripts\activate 
# Mac/Linux:
source venv/bin/activate

pip install -r requirements.txt
python main.py

```

### 3. Frontend Setup
In a new terminal, navigate to the frontend directory:

```bash
cd frontend
npm install
npm run dev
```

### 4. Compliance Service Setup (.NET)
In a new terminal, navigate to the audit service directory:
```bash
cd AuditService
dotnet run
```

### 4. Code Standards & Quality
- **Type Safety:** Utilizes strict TypeScript interfaces for multivariate sensor data.
- **Environment Awareness:** Implemented dynamic API routing to switch between `localhost` and `production` cloud endpoints automatically.


###  5. 🌐 Local Access
Once both services are started, the platform is available at:

| Component | URL |
| :--- | :--- |
| **BIP Dashboard (Frontend)** | `http://localhost:5173` |
| **Data Stream (API)** | `http://127.0.0.1:8000/api/v1/process-data` |
| **Interactive API Docs** | `http://127.0.0.1:8000/docs` |

---

## 📡 API Documentation

This platform utilizes a multi-service API architecture to separate real-time process simulation from regulatory compliance logging.

### 🐍 Python Data Engine (SCADA & Digital Twin)
| Endpoint | Method | Description |
| :--- | :--- | :--- |
| `/api/v1/process-data` | `GET` | **Primary Data Stream:** Returns real-time telemetry, health scores, and twin projections. |
| `/api/v1/control` | `POST` | **HMI Control:** Receives setpoint changes (e.g., RPM) to update the Digital Twin simulation state. |
| `/api/v1/download-report` | `GET` | **Export Engine:** Streams the full `bioreactor-yields.csv` file for offline analysis. |

### 🛡️ .NET Compliance Service (GxP Audit)
| Endpoint | Method | Description |
| :--- | :--- | :--- |
| `/api/audit` | `POST` | **Compliance Logging:** Records immutable logs of operator actions, user IDs, and timestamps for 21 CFR Part 11. |

---

### 🛠️ Sample Payloads

#### 1. Control Signal (POST to Python)
Sent when the operator adjusts the Impeller Agitation slider.
```json
{
  "rpm": 450
}
```

#### 2. Audit Log (POST to .NET)
Sent simultaneously with control signals to ensure data integrity.
```json
{
  "action": "Setpoint Change",
  "user": "Lead Scientist",
  "details": "Operator adjusted Impeller Speed to 450 RPM"
}
``` 
---

## 🛠️ Implementation Highlights & Challenges

### 1. Full-Stack Monorepo Architecture
One of the primary challenges was managing two distinct environments (Python/FastAPI and Node/Vite) within a single repository. 
- **Solution:** Implemented a structured directory approach, isolating the `venv` within the `/backend` and `node_modules` within the `/frontend`. This ensures that dependency conflicts are non-existent and the root directory remains clean.

### 2. Relative Path Resolution
Since the backend service runs from within the `/backend` folder but needs to access data in the root-level `/data` folder, standard file paths would often break.
- **Solution:** Used Python's `os.path.abspath(__file__)` to create a dynamic `BASE_DIR`. This allows the application to resolve the CSV path correctly regardless of whether the script is launched from the root or the subfolder / (regardless of the environment).

### 3. Real-Time Data Simulation
To mimic a live Biostat® controller without having a physical bioreactor connected, I implemented a global index tracker in FastAPI.
- **Logic:** The API iterates through historical CSV rows on every request, calculates "derived metrics" (Health Score) on the fly, and loops back to the start, providing a continuous "live" data stream for the frontend to consume.

### 4. Cross-Origin Resource Sharing (CORS) in a Triad Architecture
Managing three independent services (React on `:5173`, FastAPI on `:8000`, and .NET on `:5197`) presented a significant CORS challenge. 
- **Solution:** Configured the FastAPI `CORSMiddleware` and the .NET `UseCors` policy to specifically whitelist the frontend origin. This ensures secure, authenticated communication across the different ports of the "Triad."

### 5. Transactional Integrity for GxP Compliance
A critical requirement was ensuring that process changes in the Python Engine were always documented in the .NET Audit Service.
- **Solution:** Implemented a **Transaction Coordinator** pattern in the React `handleRpmChange` function. The HMI triggers both the control signal and the audit log simultaneously. If the audit service is unavailable, the system provides a console warning to alert the operator of the integrity gap.

### 6. Real-Time Data Synchronization & Physics Simulation
To move beyond static playback, I needed the HMI to reflect real-world physics (Oxygen transfer) based on manual operator input.
- **Solution:** Integrated a global state in the FastAPI backend that intercepts historical CSV data and modifies the Dissolved Oxygen ($DO_2$) values on-the-fly using the formula: $DO_2 \approx (RPM_{user} / 300) \times DO_{2,historical}$.

### 7. Dynamic Visual Feedback for Operator Safety
Implementing "At-a-glance" observability required the HMI to translate complex health scores into immediate visual cues.
- **Solution:** Developed a conditional CSS engine that monitors the `health_score`. When the score drops below 70%, it dynamically applies a `critical-pulse` keyframe animation to the status badge, mimicking the physical LED alarm towers found on industrial Biostat® controllers.

---

## 🧠 Business Logic & Calculations

### 1. Batch Health Score
The health score is a simulated Quality Index ($Q$) calculated based on the deviation from the ideal setpoints ($T_{set} = 37°C$, $pH_{set} = 7.0$):

$$Health = 100 - (|T_{actual} - 37| \times 15) - (|pH_{actual} - 7| \times 40)$$

### 2. Anomaly Triggers
A batch is flagged as an Anomaly if:
- Temperature > $40.0°C$
- Impeller Speed < $100.0\ RPM$

### 3. Digital Twin & Predictive Analytics
The platform features a **Digital Twin** layer that uses a moving-window linear regression to predict process trends:
- **Calibration Phase:** Upon startup, the system enters a 5-second "Warm-up" to populate the sliding buffer required for accurate slope calculation.
- **Trend Analysis:** Predicts Temperature 60 seconds into the future based on the current $\Delta T / \Delta t$.
- **Predictive Alarms:** Early warning system that triggers if the Digital Twin deviates from the safety setpoints before the physical sensors do /reach the threshold.


### 4. Closed-Loop Simulation (Oxygen Transfer)
To simulate real-world physics, the platform links Impeller Agitation ($RPM$) to Dissolved Oxygen ($DO_2$):
$$DO_2 \approx \left(\frac{RPM_{manual}}{300}\right) \times DO_{2,historical}$$
This allows the Digital Twin to react dynamically when an operator adjusts the slider in the Control Panel.


---

## 📂 Repository Structure

```Plaintext
├── backend/               # FastAPI Server & Digital Twin Logic
├── AuditService/          # .NET 10 Compliance & Audit Microservice
├── frontend/              # React/TypeScript HMI & Dashboard
├── data/                  # Source CSV files (bioreactor-yields.csv)
├── .gitignore             # Git exclusion rules
└── README.md              # Project Documentation
```
---

## 📜 License
This project is licensed under the MIT License - see the LICENSE file for details.
