import { useState, useEffect } from 'react';
import axios from 'axios';
import { XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { Activity, AlertCircle, Droplets, Thermometer, Wind, CheckCircle, Download, Settings, UserCheck, History, Zap, Monitor, X, Cpu } from 'lucide-react';

/** * API CONFIGURATION:
 * Dynamically switches between the local development server and the 
 * production cloud server (Render). VITE_API_URL is set in the 
 * deployment platform's environment variables.
 */
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';
const AUDIT_SERVICE_URL = import.meta.env.VITE_AUDIT_SERVICE_URL || 'http://localhost:5197/api/audit';

function App() {
  const [history, setHistory] = useState<any[]>([]);
  const [latest, setLatest] = useState<any>(null);
  const [simRpm, setSimRpm] = useState(300);
  
  // UI Logic States
  const [showTwin, setShowTwin] = useState(true);
  const [showLogs, setShowLogs] = useState(false);
  const [auditHistory, setAuditHistory] = useState<any[]>([]);

  /**
   * IDENTITY MANAGEMENT (Digital Signature):
   * Tracks the currently authenticated user role to ensure all GxP 
   * audit logs are attributed to a specific individual.
   */
  const [currentUser, setCurrentUser] = useState("Lead Scientist");

  /**
   * COMPLIANCE LOGGING (GxP):
   * Communicates with the .NET Audit Microservice to ensure data integrity
   * and record operator interactions for 21 CFR Part 11 compliance.
   */
  const logAuditAction = async (action: string, details: string) => {
    try {
      await fetch(AUDIT_SERVICE_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: action,
          user: currentUser, // MODIFIED: Now dynamically pulls from state instead of hardcoded string
          details: details
        })
      });
    } catch (error) {
      console.warn("Audit service unavailable. Integrity check bypassed for local dev.");
    }
  };

  /**
   * Data Fetching Logic
   * Retrieves immutable logs from the .NET backend. 
   * Reverse is used to show the most recent compliance events first.
   */
  const fetchAuditLogs = async () => {
    try {
      const res = await axios.get(AUDIT_SERVICE_URL);
      setAuditHistory(res.data.reverse()); 
      setShowLogs(true);
    } catch (e) {
      alert("Audit Service Offline");
    }
  };

  /**
   * AUDIT DATA EXPORT (Compliance Reporting):
   * Fetches the database records from the .NET service and triggers a CSV 
   * download. This provides the "receipts" for the Lead Scientist.
   */
  const handleAuditExport = async () => {
    try {
      const res = await axios.get(AUDIT_SERVICE_URL);
      const data = res.data;

      // Formatting CSV with headers and quoted details to prevent delimiter breakage
      const headers = "ID,Timestamp,User,Action,Details\n";
      const rows = data.map((log: any) => 
        `${log.id},${log.timestamp},${log.user},${log.action},"${log.details}"`
      ).join("\n");

      const blob = new Blob([headers + rows], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Audit_Trail_${new Date().toISOString().split('T')[0]}.csv`;
      link.click();
      
      await logAuditAction("Audit Export", "User downloaded a physical copy of the verified audit trail.");
    } catch (e) {
      console.error("Export failed", e);
    }
  };

  useEffect(() => {
    // Polling mechanism: Mimics a WebSocket stream by requesting 
    // updates every 1000ms from the FastAPI simulation engine.
    const timer = setInterval(async () => {
      try {
        const res = await axios.get(`${API_BASE_URL}/api/v1/process-data`);
        const newData = res.data.data;
      
        if (newData) {
          // BATCH TRANSITION LOGIC:
          // Detects if the backend has incremented the Batch ID. 
          // If a new batch starts, we wipe the chart history to provide a clean visual break.
          setHistory(prev => {
            if (prev.length > 0 && prev[prev.length - 1].batch_id !== newData.batch_id) {
              return [newData]; 
            }
            return [...prev.slice(-19), newData];
          });

          setLatest(newData);

          // NEW: If the backend AI Pilot is adjusting RPM, sync the UI slider
          if (newData.auto_pilot_active) {
            setSimRpm(newData.Impeller_Speed);
          }
        }
      } catch (e) {
        // Graceful degradation: Logs error without crashing the UI
        console.log("Searching for backend service...");
      }
    }, 1000);
  
    return () => clearInterval(timer); // Memory cleanup on component unmount
  }, []);

  /**
   * PROCESS CONTROL (HMI):
   * Sends control signals to the Python Digital Twin to alter the
   * simulation state and logs the change to the Audit Service.
   */
  const handleRpmChange = async (newRpm: number) => {
    setSimRpm(newRpm);
    try {
      await axios.post(`${API_BASE_URL}/api/v1/control`, { rpm: newRpm });
      // LOGGING: Captures the specific setpoint value for the audit trail.
      await logAuditAction("Setpoint Change", `Operator adjusted Impeller Speed to ${newRpm} RPM`);
    } catch (e) {
      console.error("Control signal failed.");
    }
  };

  /**
   * Chaos Engineering
   * Manually triggers a bioprocess failure to test system resilience
   * and GxP alarm response.
   */
  const triggerAnomaly = async () => {
    try {
      await axios.post(`${API_BASE_URL}/api/v1/trigger-anomaly`);
      await logAuditAction("Anomaly Injection", "User manually triggered a Dissolved Oxygen deviation event.");
    } catch (e) { console.error("Anomaly trigger failed."); }
  };

  /**
   * RECOVERY INTERVENTION:
   * Clears the manual failure state in the backend and records the 
   * corrective action in the audit trail for regulatory compliance.
   */
  const resetAnomaly = async () => {
    try {
      await axios.post(`${API_BASE_URL}/api/v1/reset-anomaly`);
      await logAuditAction("Anomaly Reset", "Operator cleared the O2 failure and restored normal operations.");
    } catch (e) { console.error("Reset failed."); }
  };

  /**
   * DATA PORTABILITY:
   * Triggers the FastAPI FileResponse and logs the export event.
   */
  const handleExport = () => {
    logAuditAction("Data Export", "User downloaded full batch historical report (CSV).");
    window.location.href = `${API_BASE_URL}/api/v1/download-report`;
  };

  return (
    <div style={{ 
      padding: '30px', 
      backgroundColor: '#020617', 
      color: '#f8fafc', 
      height: '100vh', 
      width: '100vw', 
      display: 'flex', 
      flexDirection: 'column', 
      boxSizing: 'border-box', 
      overflow: 'hidden' // Prevents unnecessary scrollbars
    }}>
      
      {/* Header Section */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <div>
            <h1 style={{ margin: 0, fontSize: '1.8rem' }}>
              Bioprocess <span style={{ color: '#38bdf8' }}>Insight Platform</span>
            </h1>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '4px' }}>
              <p style={{ color: '#94a3b8', margin: 0 }}>Sartorius Biostat® Simulation Engine v1.0</p>
              {/* BATCH IDENTIFIER: Dynamically displays the current production run ID */}
              {latest?.batch_id && (
                <span style={{ 
                  fontSize: '0.7rem', color: '#38bdf8', background: '#38bdf822', 
                  padding: '2px 8px', borderRadius: '4px', border: '1px solid #38bdf844',
                  fontWeight: 'bold', fontFamily: 'monospace' 
                }}>
                  ID: {latest.batch_id}
                </span>
              )}
            </div>
          </div>

          {/* BATCH STATUS BADGE: Interactive Pulse for GxP Compliance Alarms */}
          <div 
            className={latest?.health_score <= 70 ? "critical-pulse" : ""}
            style={{ 
              padding: '6px 14px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 'bold',
              backgroundColor: latest?.health_score > 90 ? '#065f46' : latest?.health_score > 70 ? '#92400e' : '#7f1d1d',
              color: latest?.health_score > 90 ? '#34d399' : latest?.health_score > 70 ? '#fbbf24' : '#fca5a5',
              display: 'inline-block', transition: 'all 0.3s ease',
              border: latest?.health_score <= 70 ? '1px solid #7f1d1d' : 'none'
            }}>
            {latest?.health_score > 90 ? "OPTIMAL GROWTH" : latest?.health_score > 70 ? "SUB-OPTIMAL" : "CRITICAL ALARM"}
          </div>

          {/* NEW: AI PILOT STATUS BADGE (Displays only when automated correction is running) */}
          {latest?.auto_pilot_active && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 14px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 'bold', backgroundColor: '#1e3a8a', color: '#60a5fa', border: '1px solid #3b82f6' }}>
              <Cpu size={14} /> AI PILOT ACTIVE
            </div>
          )}
        </div>

        <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
          
          {/* DIGITAL SIGNATURE SELECTOR: 
              Enhanced UI for user accountability. 
          */}
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '12px', 
            background: '#0f172a', 
            padding: '8px 16px', 
            borderRadius: '12px', 
            border: '1px solid #38bdf844' // Subtle blue glow
          }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
               <span style={{ fontSize: '0.6rem', color: '#38bdf8', fontWeight: 800, letterSpacing: '0.05rem' }}>E-SIGNATURE ROLE</span>
               <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                 <UserCheck size={14} color="#38bdf8" />
                 <select 
                    value={currentUser}
                    onChange={(e) => setCurrentUser(e.target.value)}
                    style={{ 
                      background: 'transparent', 
                      color: '#f8fafc', 
                      border: 'none', 
                      outline: 'none', 
                      cursor: 'pointer',
                      fontSize: '0.9rem',
                      fontWeight: 600
                    }}
                  >
                    <option value="Lead Scientist" style={{backgroundColor: '#0f172a'}}>Lead Scientist</option>
                    <option value="Lab Technician" style={{backgroundColor: '#0f172a'}}>Lab Technician</option>
                    <option value="QA Auditor" style={{backgroundColor: '#0f172a'}}>QA Auditor</option>
                  </select>
               </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <button onClick={handleExport} style={btnStyle} title="Export Scientific Sensor Data">
              <Download size={18} /> Export Data
            </button>
            <button onClick={handleAuditExport} style={{ ...btnStyle, backgroundColor: '#334155', borderColor: '#475569' }} title="Export 21 CFR Part 11 Compliance Logs">
              <History size={18} /> Export Audit
            </button>
          </div>
        </div>
      </div>

      {/* KPI Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '15px', marginBottom: '25px' }}>
        <StatCard label="Temperature" value={latest?.Temperature} unit="°C" icon={<Thermometer color="#38bdf8"/>} color="#38bdf8" />
        <StatCard label="pH Level" value={latest?.pH} unit="pH" icon={<Activity color="#4ade80"/>} color="#4ade80" />
        
        {/* NEW: Impeller card now glows Blue when AI Pilot is influencing the setpoint */}
        <StatCard 
          label="Impeller Speed" 
          value={latest?.Impeller_Speed} 
          unit="RPM" 
          icon={<Wind color={latest?.auto_pilot_active ? "#60a5fa" : "#fbbf24"}/>} 
          color={latest?.auto_pilot_active ? "#3b82f6" : "#fbbf24"}
          isAuto={latest?.auto_pilot_active}
        />
        
        <StatCard label="Dissolved O₂" value={latest?.Dissolved_Oxygen} unit="%" icon={<Droplets color="#818cf8"/>} color="#818cf8" />
        <StatCard label="Batch Health" value={latest?.health_score} unit="%" icon={<CheckCircle color={latest?.health_score > 85 ? "#4ade80" : "#ef4444"}/>} color={latest?.health_score > 85 ? "#4ade80" : "#ef4444"} />
      </div>

      {/* Main Content Area */}
      <div style={{ display: 'flex', gap: '20px', flex: 1, minHeight: 0 }}>
        
        {/* Chart Section */}
        <div style={{ background: '#0f172a', padding: '24px', borderRadius: '16px', border: '1px solid #1e293b', flex: 3, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
          
          {/** Cockpit-style Status Indicators
           * Merges real-time "Signs" with chart headers for maximum data-to-ink ratio.
           */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
            <h3 style={{ margin: 0, color: '#94a3b8' }}>Real-time Bioprocess Trends & Digital Twin Projection</h3>
            <div style={{ display: 'flex', gap: '10px' }}>
               
               {/* RESTORED: Vital for tracking manual anomaly states in the dashboard */}
               {latest?.is_anomaly && (
                  <div className="critical-pulse" style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.65rem', fontWeight: 700, color: '#ef4444', background: '#ef444415', padding: '4px 10px', borderRadius: '6px', border: '1px solid #ef4444' }}>
                    <AlertCircle size={12} /> ANOMALY DETECTED
                  </div>
               )}

               {showTwin && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.65rem', fontWeight: 700, color: '#818cf8', background: '#818cf815', padding: '4px 10px', borderRadius: '6px', border: '1px solid #818cf844' }}>
                    <Monitor size={12} /> DIGITAL TWIN ACTIVE
                  </div>
               )}
            </div>
          </div>

          <div style={{ flex: 1, width: '100%', minHeight: 0 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={history}>
                <defs>
                {/* Original Blue Gradient */}
                  <linearGradient id="colorTemp" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#38bdf8" stopOpacity={0}/>
                  </linearGradient>
                {/* New Digital Twin Gradient (Purple/Indigo) */}
                  <linearGradient id="colorTwin" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#818cf8" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#818cf8" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis dataKey="timestamp" stroke="#475569" tick={{fontSize: 12}} />
                <YAxis domain={['auto', 'auto']} stroke="#475569" tick={{fontSize: 12}} />
                <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '8px' }} />
              
              {/* PRIMARY DATA: The actual CSV sensor data */}
                <Area type="monotone" dataKey="Temperature" stroke="#38bdf8" fillOpacity={1} fill="url(#colorTemp)" strokeWidth={3} isAnimationActive={false} />
              
              {/* DIGITAL TWIN: Predictive projection from the backend buffer */}
                {showTwin && (
                  <Area type="monotone" dataKey="digital_twin_temp" stroke="#818cf8" strokeDasharray="5 5" fill="url(#colorTwin)" strokeWidth={2} isAnimationActive={false} name="Twin Prediction" />
                )}
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Process Control Sidebar */}
        <div style={{ background: '#0f172a', padding: '24px', borderRadius: '16px', border: '1px solid #1e293b', flex: 1 }}>
          <h3 style={{ marginTop: 0, color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Settings size={18} /> Control Panel
          </h3>
          <p style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '20px' }}>Adjusting parameters affects the Digital Twin simulation in real-time.</p>
          
          {/** * Interaction Group
            * Provides immediate toggles for the user to manipulate the UI and backend state.
            */}
          <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
            <button onClick={() => setShowTwin(!showTwin)} style={{ ...btnStyle, flex: 1, padding: '8px', fontSize: '0.75rem', backgroundColor: showTwin ? '#1e293b' : '#020617' }}>
              <Monitor size={14} /> {showTwin ? "Hide Twin" : "Show Twin"}
            </button>
            
            {/* TOGGLE LOGIC: Show Reset button ONLY if system is in an anomaly state */}
            {latest?.is_anomaly ? (
              <button onClick={resetAnomaly} style={{ ...btnStyle, flex: 1, padding: '8px', fontSize: '0.75rem', color: '#4ade80', borderColor: '#065f46' }}>
                <CheckCircle size={14} /> Reset O₂
              </button>
            ) : (
              <button onClick={triggerAnomaly} style={{ ...btnStyle, flex: 1, padding: '8px', fontSize: '0.75rem', color: '#fca5a5', borderColor: '#7f1d1d' }}>
                <Zap size={14} /> Fail O₂
              </button>
            )}
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '10px', color: '#cbd5e1' }}>
              Impeller Agitation: {simRpm.toFixed(0)} RPM 
              {latest?.auto_pilot_active && <span style={{color: '#60a5fa', marginLeft: '8px', fontWeight: 'bold'}}>(AI ACTIVE)</span>}
            </label>
            <input 
              type="range" min="50" max="600" value={simRpm} 
              onChange={(e) => handleRpmChange(parseInt(e.target.value))}
              style={{ width: '100%', cursor: 'pointer', accentColor: '#38bdf8' }}
            />
          </div>
          <div style={{ padding: '15px', borderRadius: '10px', backgroundColor: '#020617', border: '1px solid #1e293b' }}>
             <p style={{ fontSize: '0.75rem', color: '#94a3b8', margin: 0 }}>
               <strong>Operational Impact:</strong> Lowering RPM below 150 will simulate mass transfer limitations, causing a sharp drop in DO₂ levels.
             </p>
          </div>

          {/* AUDIT HISTORY SHORTCUT */}
          <button 
            onClick={fetchAuditLogs}
            style={{ ...btnStyle, width: '100%', marginTop: '20px', justifyContent: 'center', backgroundColor: 'transparent', borderColor: '#1e293b' }}
          >
            <History size={16} /> View Audit Logs
          </button>
        </div>
      </div>

      {/* --- AUDIT LOG MODAL (21 CFR Part 11) --- */}
      {showLogs && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: 'rgba(0,0,0,0.85)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
          <div style={{ backgroundColor: '#0f172a', width: '80%', maxHeight: '80%', borderRadius: '16px', border: '1px solid #1e293b', padding: '30px', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
              <h2 style={{ margin: 0 }}>Verified Audit Trail (Immutable)</h2>
              <X cursor="pointer" onClick={() => setShowLogs(false)} />
            </div>
            <div style={{ overflowY: 'auto', flex: 1 }}>
              <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #1e293b', color: '#94a3b8' }}>
                    <th style={{ padding: '12px' }}>Timestamp</th>
                    <th>User</th>
                    <th>Action</th>
                    <th>Details</th>
                  </tr>
                </thead>
                <tbody>
                  {auditHistory.map((log, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid #020617' }}>
                      <td style={{ padding: '12px', fontSize: '0.85rem' }}>{new Date(log.timestamp).toLocaleString()}</td>
                      <td style={{ fontWeight: 'bold', color: '#38bdf8' }}>{log.user}</td>
                      <td>{log.action}</td>
                      <td style={{ color: '#94a3b8', fontSize: '0.85rem' }}>{log.details}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Updated StatCard with AI Pilot Glow Logic
const StatCard = ({ label, value, unit, icon, color, isAuto }: any) => (
  <div style={{ 
    background: '#0f172a', padding: '24px', borderRadius: '16px', 
    border: isAuto ? `1px solid ${color}` : '1px solid #1e293b', 
    position: 'relative', overflow: 'hidden',
    transition: 'all 0.5s ease',
    boxShadow: isAuto ? `0 0 15px ${color}33` : 'none'
  }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
      <span style={{ color: '#94a3b8', fontSize: '0.875rem' }}>{label}</span>
      {icon}
    </div>
    <div style={{ fontSize: '1.875rem', fontWeight: 700 }}>
      {typeof value === 'number' ? value.toFixed(label === "Impeller Speed" ? 0 : 2) : '--'}
      <span style={{ fontSize: '1rem', color: '#475569', marginLeft: '6px' }}>{unit}</span>
    </div>
    <div style={{ height: '4px', background: color, width: '100%', position: 'absolute', bottom: 0, left: 0, opacity: isAuto ? 1 : 0.6 }} />
  </div>
);

const btnStyle = {
  display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: '#1e293b', 
  color: 'white', border: '1px solid #334155', padding: '10px 20px', 
  borderRadius: '10px', cursor: 'pointer', fontWeight: 600
};

export default App;