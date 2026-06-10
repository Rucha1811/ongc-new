import { useState, useEffect } from "react";
import { api } from "../api";

const COLORS = ["#0b3d91","#1B5E20","#E65100","#B71C1C","#7B1FA2","#00695C","#1565c0","#2E7D32", "#F57C00"];

export default function ActivityAnalytics({ user }) {
  const [period, setPeriod] = useState("week");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    setLoading(true);
    api.activitySummary(period)
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [period]);

  const handleExport = async () => {
    setExporting(true);
    try { await api.exportActivity(period); }
    catch(e) { alert("Export failed: "+e.message); }
    finally { setExporting(false); }
  };

  const actionLabels = {
    login: "Logins",
    upload: "File Uploads",
    approve: "Approvals",
    reject: "Rejections",
  };

  if (loading) return <div style={{ textAlign:"center", padding:40, color:"#aaa" }}>Loading activity data…</div>;
  if (!data) return <div style={{ textAlign:"center", padding:40, color:"#aaa" }}>Failed to load activity data.</div>;

  const byAction = data.byAction || {};
  const byDate = data.byDate || {};
  const maxAction = Math.max(...Object.values(byAction), 1);
  const maxDate = Math.max(...Object.values(byDate), 1);

  return (
    <div>
      <div style={{ fontSize:18, fontWeight:700, color:"#0b3d91", marginBottom:16, display:"flex", alignItems:"center", gap:8, padding:"0 0 4px 0", borderBottom:"2px solid #e8edf2" }}>
        📊 Activity Analytics
        <span style={{ fontSize:12, color:"#5a6a7a", fontWeight:400, marginLeft:8 }}>Last {period === "week" ? "7 days" : "30 days"}</span>
      </div>

      {/* Period toggle + export */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
        <div style={{ display:"flex", gap:8 }}>
          {["week","month"].map(p => (
            <button key={p} onClick={() => setPeriod(p)} style={{
              padding:"6px 16px", borderRadius:6, border:"none", cursor:"pointer", fontWeight:600, fontSize:13,
              background: period === p ? "#0b3d91" : "#e0e0e0",
              color: period === p ? "#fff" : "#333",
              transition:"all 0.15s",
            }}>{p === "week" ? "Last Week" : "Last Month"}</button>
          ))}
        </div>
        <button onClick={handleExport} disabled={exporting} style={{
          padding:"6px 16px", borderRadius:6, border:"none", cursor:"pointer", fontWeight:600, fontSize:13,
          background:"#1B5E20", color:"#fff", display:"flex", alignItems:"center", gap:6, opacity: exporting?0.7:1,
        }}>
          ⬇ {exporting ? "Exporting…" : "Export Excel"}
        </button>
      </div>

      {/* Total activity count */}
      <div style={{ background:"linear-gradient(135deg,#0b3d91,#1565c0)", borderRadius:10, padding:16, color:"#fff", marginBottom:16, boxShadow:"0 2px 8px rgba(0,0,0,0.12)" }}>
        <div style={{ fontSize:12, fontWeight:600, opacity:0.85, textTransform:"uppercase", letterSpacing:0.5, marginBottom:4 }}>Total Activities</div>
        <div style={{ fontSize:36, fontWeight:800 }}>{data.total}</div>
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16, marginBottom:16 }}>
        {/* By Action */}
        <div style={{ background:"#fff", borderRadius:8, boxShadow:"0 1px 4px rgba(0,0,0,0.06)", padding:16, overflow:"auto" }}>
          <div style={{ fontSize:14, fontWeight:700, color:"#0b3d91", marginBottom:12 }}>By Action Type</div>
          {Object.keys(byAction).length === 0 ? (
            <div style={{ color:"#aaa", textAlign:"center", padding:24 }}>No activity in this period.</div>
          ) : (
            <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
              {Object.entries(byAction).map(([k,v],i) => (
                <div key={k} style={{ display:"flex", alignItems:"center", gap:8 }}>
                  <div style={{ width:80, fontSize:11, color:"#5a6a7a", textAlign:"right", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{actionLabels[k] || k}</div>
                  <div style={{ flex:1, height:18, background:"#f0f4f8", borderRadius:9, overflow:"hidden" }}>
                    <div style={{ width:`${(v/maxAction)*100}%`, height:"100%", background: COLORS[i % COLORS.length], borderRadius:9, transition:"width 0.6s", minWidth: v>0?8:0 }}/>
                  </div>
                  <div style={{ fontSize:12, fontWeight:700, color:"#0b3d91", minWidth:24 }}>{v}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* By Date */}
        <div style={{ background:"#fff", borderRadius:8, boxShadow:"0 1px 4px rgba(0,0,0,0.06)", padding:16, overflow:"auto" }}>
          <div style={{ fontSize:14, fontWeight:700, color:"#0b3d91", marginBottom:12 }}>Activity Timeline</div>
          {Object.keys(byDate).length === 0 ? (
            <div style={{ color:"#aaa", textAlign:"center", padding:24 }}>No activity in this period.</div>
          ) : (
            <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
              {Object.entries(byDate).slice(-14).map(([k,v]) => (
                <div key={k} style={{ display:"flex", alignItems:"center", gap:8 }}>
                  <div style={{ width:80, fontSize:10, color:"#5a6a7a", textAlign:"right", whiteSpace:"nowrap" }}>{k}</div>
                  <div style={{ flex:1, height:14, background:"#f0f4f8", borderRadius:7, overflow:"hidden" }}>
                    <div style={{ width:`${(v/maxDate)*100}%`, height:"100%", background:"#1565c0", borderRadius:7, transition:"width 0.6s", minWidth: v>0?6:0 }}/>
                  </div>
                  <div style={{ fontSize:11, fontWeight:700, color:"#0b3d91", minWidth:18 }}>{v}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Recent activity log table */}
      <div style={{ background:"#fff", borderRadius:8, boxShadow:"0 1px 4px rgba(0,0,0,0.06)", padding:16, overflow:"auto" }}>
        <div style={{ fontSize:14, fontWeight:700, color:"#0b3d91", marginBottom:12 }}>Recent Activity Log</div>
        {(!data.logs || data.logs.length === 0) ? (
          <div style={{ color:"#aaa", textAlign:"center", padding:24 }}>No activity logs in this period.</div>
        ) : (
          <table style={{ width:"100%", borderCollapse:"collapse", fontSize:13 }}>
            <thead>
              <tr>
                <th style={{ background:"#f8f9fa", color:"#344054", padding:"8px 10px", textAlign:"left", fontWeight:600, fontSize:12, borderBottom:"2px solid #e0e0e0" }}>#</th>
                <th style={{ background:"#f8f9fa", color:"#344054", padding:"8px 10px", textAlign:"left", fontWeight:600, fontSize:12, borderBottom:"2px solid #e0e0e0" }}>Action</th>
                <th style={{ background:"#f8f9fa", color:"#344054", padding:"8px 10px", textAlign:"left", fontWeight:600, fontSize:12, borderBottom:"2px solid #e0e0e0" }}>Details</th>
                <th style={{ background:"#f8f9fa", color:"#344054", padding:"8px 10px", textAlign:"left", fontWeight:600, fontSize:12, borderBottom:"2px solid #e0e0e0" }}>Date & Time</th>
              </tr>
            </thead>
            <tbody>
              {data.logs.map((log, i) => (
                <tr key={log.id}>
                  <td style={{ padding:"6px 10px", borderBottom:"1px solid #f0f0f0", fontSize:12, color:"#5a6a7a" }}>{i+1}</td>
                  <td style={{ padding:"6px 10px", borderBottom:"1px solid #f0f0f0" }}>
                    <span style={{
                      display:"inline-block", padding:"2px 8px", borderRadius:4, fontSize:11, fontWeight:600,
                      background: log.action === "login" ? "#E3F2FD" : log.action === "upload" ? "#E8F5E9" : log.action === "approve" ? "#FFF3E0" : log.action === "reject" ? "#FFEBEE" : "#f5f5f5",
                      color: log.action === "login" ? "#1565c0" : log.action === "upload" ? "#1B5E20" : log.action === "approve" ? "#E65100" : log.action === "reject" ? "#B71C1C" : "#333",
                    }}>{log.action}</span>
                  </td>
                  <td style={{ padding:"6px 10px", borderBottom:"1px solid #f0f0f0", fontSize:12, color:"#1a1a2e" }}>{log.details || "-"}</td>
                  <td style={{ padding:"6px 10px", borderBottom:"1px solid #f0f0f0", fontSize:11, color:"#5a6a7a" }}>
                    {log.timestamp ? new Date(log.timestamp).toLocaleString() : "-"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
