import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { Activity, AlertCircle, Droplets, Thermometer, Wind, CheckCircle, Download } from 'lucide-react';

function App() {
  const [history, setHistory] = useState<any[]>([]);
  const [latest, setLatest] = useState<any>(null);

  useEffect(() => {
    const timer = setInterval(async () => {
      try {
        const res = await axios.get('http://127.0.0.1:8000/api/v1/process-data');
        const newData = res.data.data;
        if (newData) {
          setLatest(newData);
          setHistory(prev => [...prev.slice(-19), newData]);
        }
      } catch (e) {
        console.log("Searching for backend...");
      }
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleExport = () => {
    // This triggers the browser to call the backend download route
    window.location.href = 'http://127.0.0.1:8000/api/v1/download-report';
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
        <div>
          <h1 style={{ margin: 0, fontSize: '1.8rem' }}>
            Bioprocess <span style={{ color: '#38bdf8' }}>Insight Platform</span>
          </h1>
          <p style={{ color: '#94a3b8', margin: '4px 0 0 0' }}>Sartorius Biostat® Simulation Engine v1.0</p>
        </div>

        <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
          {/* Anomaly Alert: Re-added here */}
          {latest?.is_anomaly && (
            <div style={{ 
            background: '#450a0a', 
            color: '#fca5a5', 
            padding: '10px 20px', 
            borderRadius: '10px', 
            border: '1px solid #7f1d1d', 
            display: 'flex', 
            alignItems: 'center', 
            gap: '8px',
            fontWeight: 600,
            fontSize: '0.9rem',
            animation: 'pulse 2s infinite' // Optional: adds that high-stakes blinking effect
          }}>
            <AlertCircle size={18} />
            ANOMALY DETECTED
          </div>
        )}

        <button 
          onClick={handleExport}
          style={{ 
            display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: '#1e293b', 
            color: 'white', border: '1px solid #334155', padding: '10px 20px', 
            borderRadius: '10px', cursor: 'pointer', fontWeight: 600
          }}>
          <Download size={18} /> Export CSV
        </button>
      </div>
    </div>

      {/* KPI Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '15px', marginBottom: '25px' }}>
        <StatCard label="Temperature" value={latest?.Temperature} unit="°C" icon={<Thermometer color="#38bdf8"/>} color="#38bdf8" />
        <StatCard label="pH Level" value={latest?.pH} unit="pH" icon={<Activity color="#4ade80"/>} color="#4ade80" />
        <StatCard label="Impeller Speed" value={latest?.Impeller_Speed} unit="RPM" icon={<Wind color="#fbbf24"/>} color="#fbbf24" />
        <StatCard label="Dissolved O₂" value={latest?.Dissolved_Oxygen} unit="%" icon={<Droplets color="#818cf8"/>} color="#818cf8" />
        <StatCard label="Batch Health" value={latest?.health_score} unit="%" icon={<CheckCircle color={latest?.health_score > 85 ? "#4ade80" : "#ef4444"}/>} color={latest?.health_score > 85 ? "#4ade80" : "#ef4444"} />
      </div>

      {/* Chart Section - FIXED height and layout */}
      <div style={{ 
        background: '#0f172a', padding: '24px', borderRadius: '16px', 
        border: '1px solid #1e293b', flex: 1, display: 'flex', flexDirection: 'column',
        minHeight: 0 // Crucial for flex child resizing
      }}>
        <h3 style={{ marginTop: 0, color: '#94a3b8' }}>Real-time Bioprocess Trends (Temperature)</h3>
        <div style={{ flex: 1, width: '100%', minHeight: 0 }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={history}>
              <defs>
                <linearGradient id="colorTemp" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#38bdf8" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
              <XAxis dataKey="timestamp" stroke="#475569" tick={{fontSize: 12}} />
              <YAxis domain={['auto', 'auto']} stroke="#475569" tick={{fontSize: 12}} />
              <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '8px' }} />
              <Area type="monotone" dataKey="Temperature" stroke="#38bdf8" fillOpacity={1} fill="url(#colorTemp)" strokeWidth={3} isAnimationActive={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

const StatCard = ({ label, value, unit, icon, color }: any) => (
  <div style={{ background: '#0f172a', padding: '24px', borderRadius: '16px', border: '1px solid #1e293b', position: 'relative', overflow: 'hidden' }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
      <span style={{ color: '#94a3b8', fontSize: '0.875rem' }}>{label}</span>
      {icon}
    </div>
    <div style={{ fontSize: '1.875rem', fontWeight: 700 }}>
      {typeof value === 'number' ? value.toFixed(2) : '--'}
      <span style={{ fontSize: '1rem', color: '#475569', marginLeft: '6px' }}>{unit}</span>
    </div>
    <div style={{ height: '4px', background: color, width: '100%', position: 'absolute', bottom: 0, left: 0, opacity: 0.6 }} />
  </div>
);

export default App;