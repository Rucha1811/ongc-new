import { useState, useEffect } from "react";
import { api } from "../api";

const COLORS = ["#0b3d91","#1B5E20","#E65100","#B71C1C","#7B1FA2","#00695C","#1565c0","#2E7D32","#F57C00","#6A1B9A"];

export default function ActivityAnalytics({ user }) {
  const [period, setPeriod] = useState("week");
  const [data, setData] = useState(null);
  const [targets, setTargets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      api.activitySummary(period),
      api.listTargets(),
    ]).then(([d, t]) => {
      setData(d);
      setTargets(t || []);
    }).catch(() => {
      setData(null);
      setTargets([]);
    }).finally(() => setLoading(false));
  }, [period]);

  const handleExport = async () => {
    setExporting(true);
    try { await api.exportActivity(period); }
    catch(e) { alert("Export failed: "+e.message); }
    finally { setExporting(false); }
  };

  if (loading) return <div style={{ textAlign:"center", padding:40, color:"#aaa" }}>Loading analytics…</div>;
  if (!data) return <div style={{ textAlign:"center", padding:40, color:"#aaa" }}>Failed to load analytics.</div>;

  const maxAppSec = Math.max(...Object.values(data.approvalsBySection || {}), 1);
  const maxAppCls = Math.max(...Object.values(data.approvalsByClassification || {}), 1);
  const maxUpSec = Math.max(...Object.values(data.uploadsBySection || {}), 1);
  const maxDate = Math.max(...Object.values(data.byDate || {}), 1);

  return (
    <div>
      <div style={{ fontSize:18, fontWeight:700, color:"#0b3d91", marginBottom:16, display:"flex", alignItems:"center", gap:8, padding:"0 0 4px 0", borderBottom:"2px solid #e8edf2" }}>
        Work Analytics
        <span style={{ fontSize:12, color:"#5a6a7a", fontWeight:400, marginLeft:8 }}>Last {period === "week" ? "7 days" : "30 days"}</span>
      </div>

      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
        <div style={{ display:"flex", gap:8 }}>
          {["week","month"].map(p => (
            <button key={p} onClick={() => setPeriod(p)} style={{
              padding:"6px 16px", borderRadius:6, border:"none", cursor:"pointer", fontWeight:600, fontSize:13,
              background: period === p ? "#0b3d91" : "#e0e0e0",
              color: period === p ? "#fff" : "#333",
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

      {/* Stat cards */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(4, 1fr)", gap:12, marginBottom:16 }}>
        {[
          { label:"Uploads", value:data.totalUploads, color:"#1565c0", bg:"#E3F2FD" },
          { label:"Approved", value:data.totalApprovals, color:"#1B5E20", bg:"#E8F5E9" },
          { label:"Rejected", value:data.totalRejections, color:"#B71C1C", bg:"#FFEBEE" },
          { label:"Pending Now", value:data.totalPending, color:"#E65100", bg:"#FFF3E0" },
        ].map(s => (
          <div key={s.label} style={{ background:s.bg, borderRadius:8, padding:14, textAlign:"center", boxShadow:"0 1px 4px rgba(0,0,0,0.06)" }}>
            <div style={{ fontSize:11, fontWeight:600, color:s.color, opacity:0.7, textTransform:"uppercase", letterSpacing:0.5 }}>{s.label}</div>
            <div style={{ fontSize:28, fontWeight:800, color:s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      {targets.length > 0 && (
        <div style={{ background:"#fff", borderRadius:8, boxShadow:"0 1px 4px rgba(0,0,0,0.06)", padding:16, marginBottom:16 }}>
          <div style={{ fontSize:14, fontWeight:700, color:"#0b3d91", marginBottom:14 }}>Goal vs Accomplishment</div>
          {targets.map(t => {
            const maxVal = Math.max(Number(t.target_value) || 1, Number(t.achieved) || 1);
            const goalH = (Number(t.target_value) / maxVal) * 100;
            const achH = (Number(t.achieved) / maxVal) * 100;
            return (
              <div key={t.id} style={{ marginBottom:16, display:"flex", alignItems:"center", gap:16 }}>
                <div style={{ minWidth:120, flexShrink:0 }}>
                  <div style={{ fontSize:12, fontWeight:600, color:"#333" }}>{t.title}</div>
                  {t.section && <div style={{ fontSize:10, color:"#888" }}>{t.section}</div>}
                </div>
                <svg width={80} height={120} viewBox="0 0 80 120">
                  <text x={18} y={115} textAnchor="middle" fontSize={9} fill="#c62828">Goal</text>
                  <text x={62} y={115} textAnchor="middle" fontSize={9} fill="#1B5E20">Done</text>
                  <rect x={8} y={110 - goalH} width={20} height={goalH} fill="#c62828" rx={3} />
                  <rect x={52} y={110 - achH} width={20} height={achH} fill="#1B5E20" rx={3} />
                  <text x={18} y={110 - goalH - 3} textAnchor="middle" fontSize={8} fontWeight={700} fill="#c62828">{t.target_value}</text>
                  <text x={62} y={110 - achH - 3} textAnchor="middle" fontSize={8} fontWeight={700} fill="#1B5E20">{t.achieved}</text>
                </svg>
              </div>
            );
          })}
        </div>
      )}

      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16, marginBottom:16 }}>
        {/* Approvals by Section */}
        <div style={{ background:"#fff", borderRadius:8, boxShadow:"0 1px 4px rgba(0,0,0,0.06)", padding:16 }}>
          <div style={{ fontSize:14, fontWeight:700, color:"#0b3d91", marginBottom:12 }}>Approvals by Section</div>
          {Object.keys(data.approvalsBySection || {}).length === 0 ? (
            <div style={{ color:"#aaa", textAlign:"center", padding:24 }}>No approvals in this period.</div>
          ) : (
            <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
              {Object.entries(data.approvalsBySection).map(([k,v],i) => (
                <div key={k} style={{ display:"flex", alignItems:"center", gap:8 }}>
                  <div style={{ width:70, fontSize:11, color:"#5a6a7a", textAlign:"right", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{k}</div>
                  <div style={{ flex:1, height:16, background:"#f0f4f8", borderRadius:8, overflow:"hidden" }}>
                    <div style={{ width:`${(v/maxAppSec)*100}%`, height:"100%", background:"#1B5E20", borderRadius:8, transition:"width 0.6s", minWidth: v>0?6:0 }}/>
                  </div>
                  <div style={{ fontSize:12, fontWeight:700, color:"#1B5E20", minWidth:20 }}>{v}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Approvals by Classification */}
        <div style={{ background:"#fff", borderRadius:8, boxShadow:"0 1px 4px rgba(0,0,0,0.06)", padding:16 }}>
          <div style={{ fontSize:14, fontWeight:700, color:"#0b3d91", marginBottom:12 }}>Approvals by Classification</div>
          {Object.keys(data.approvalsByClassification || {}).length === 0 ? (
            <div style={{ color:"#aaa", textAlign:"center", padding:24 }}>No approvals in this period.</div>
          ) : (
            <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
              {Object.entries(data.approvalsByClassification).map(([k,v],i) => (
                <div key={k} style={{ display:"flex", alignItems:"center", gap:8 }}>
                  <div style={{ width:100, fontSize:11, color:"#5a6a7a", textAlign:"right", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{k}</div>
                  <div style={{ flex:1, height:16, background:"#f0f4f8", borderRadius:8, overflow:"hidden" }}>
                    <div style={{ width:`${(v/maxAppCls)*100}%`, height:"100%", background:"#1565c0", borderRadius:8, transition:"width 0.6s", minWidth: v>0?6:0 }}/>
                  </div>
                  <div style={{ fontSize:12, fontWeight:700, color:"#1565c0", minWidth:20 }}>{v}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Uploads by Section */}
      <div style={{ background:"#fff", borderRadius:8, boxShadow:"0 1px 4px rgba(0,0,0,0.06)", padding:16, marginBottom:16 }}>
        <div style={{ fontSize:14, fontWeight:700, color:"#0b3d91", marginBottom:12 }}>Uploads by Section</div>
        {Object.keys(data.uploadsBySection || {}).length === 0 ? (
          <div style={{ color:"#aaa", textAlign:"center", padding:24 }}>No uploads in this period.</div>
        ) : (
          <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
            {Object.entries(data.uploadsBySection).map(([k,v],i) => (
              <div key={k} style={{ display:"flex", alignItems:"center", gap:8 }}>
                <div style={{ width:80, fontSize:11, color:"#5a6a7a", textAlign:"right", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{k}</div>
                <div style={{ flex:1, height:16, background:"#f0f4f8", borderRadius:8, overflow:"hidden" }}>
                  <div style={{ width:`${(v/maxUpSec)*100}%`, height:"100%", background:"#1565c0", borderRadius:8, transition:"width 0.6s", minWidth: v>0?6:0 }}/>
                </div>
                <div style={{ fontSize:12, fontWeight:700, color:"#1565c0", minWidth:20 }}>{v}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Activity Timeline */}
      <div style={{ background:"#fff", borderRadius:8, boxShadow:"0 1px 4px rgba(0,0,0,0.06)", padding:16, marginBottom:16 }}>
        <div style={{ fontSize:14, fontWeight:700, color:"#0b3d91", marginBottom:12 }}>Activity Timeline</div>
        {Object.keys(data.byDate || {}).length === 0 ? (
          <div style={{ color:"#aaa", textAlign:"center", padding:24 }}>No activity in this period.</div>
        ) : (
          <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
            {Object.entries(data.byDate).slice(-14).map(([k,v]) => (
              <div key={k} style={{ display:"flex", alignItems:"center", gap:8 }}>
                <div style={{ width:80, fontSize:10, color:"#5a6a7a", textAlign:"right" }}>{k.slice(5)}</div>
                <div style={{ flex:1, height:14, background:"#f0f4f8", borderRadius:7, overflow:"hidden" }}>
                  <div style={{ width:`${(v/maxDate)*100}%`, height:"100%", background:"#0b3d91", borderRadius:7, transition:"width 0.6s", minWidth: v>0?6:0 }}/>
                </div>
                <div style={{ fontSize:11, fontWeight:700, color:"#0b3d91", minWidth:18 }}>{v}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Pending files */}
      {data.pendingFiles && data.pendingFiles.length > 0 && (
        <div style={{ background:"#fff", borderRadius:8, boxShadow:"0 1px 4px rgba(0,0,0,0.06)", padding:16, marginBottom:16 }}>
          <div style={{ fontSize:14, fontWeight:700, color:"#E65100", marginBottom:12 }}>⏳ Files Pending Approval ({data.pendingFiles.length})</div>
          <table style={{ width:"100%", borderCollapse:"collapse", fontSize:13 }}>
            <thead>
              <tr>
                <th style={{ background:"#f8f9fa", padding:"8px 10px", textAlign:"left", fontWeight:600, fontSize:12, borderBottom:"2px solid #e0e0e0" }}>File</th>
                <th style={{ background:"#f8f9fa", padding:"8px 10px", textAlign:"left", fontWeight:600, fontSize:12, borderBottom:"2px solid #e0e0e0" }}>Section</th>
                <th style={{ background:"#f8f9fa", padding:"8px 10px", textAlign:"left", fontWeight:600, fontSize:12, borderBottom:"2px solid #e0e0e0" }}>Classification</th>
                <th style={{ background:"#f8f9fa", padding:"8px 10px", textAlign:"left", fontWeight:600, fontSize:12, borderBottom:"2px solid #e0e0e0" }}>Uploaded</th>
                <th style={{ background:"#f8f9fa", padding:"8px 10px", textAlign:"left", fontWeight:600, fontSize:12, borderBottom:"2px solid #e0e0e0" }}>Days</th>
              </tr>
            </thead>
            <tbody>
              {data.pendingFiles.map(f => (
                <tr key={f.id}>
                  <td style={{ padding:"6px 10px", borderBottom:"1px solid #f0f0f0", fontSize:12 }}>{f.fileName}</td>
                  <td style={{ padding:"6px 10px", borderBottom:"1px solid #f0f0f0", fontSize:12 }}>{f.section}</td>
                  <td style={{ padding:"6px 10px", borderBottom:"1px solid #f0f0f0", fontSize:12 }}>{f.classification}</td>
                  <td style={{ padding:"6px 10px", borderBottom:"1px solid #f0f0f0", fontSize:11, color:"#5a6a7a" }}>{f.uploadDate ? new Date(f.uploadDate).toLocaleDateString() : "-"}</td>
                  <td style={{ padding:"6px 10px", borderBottom:"1px solid #f0f0f0", fontSize:12, fontWeight:700, color: f.daysPending > 7 ? "#B71C1C" : "#E65100" }}>{f.daysPending}d</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Recent file activity */}
      <div style={{ background:"#fff", borderRadius:8, boxShadow:"0 1px 4px rgba(0,0,0,0.06)", padding:16 }}>
        <div style={{ fontSize:14, fontWeight:700, color:"#0b3d91", marginBottom:12 }}>Recent File Activity</div>
        {(!data.recentActivity || data.recentActivity.length === 0) ? (
          <div style={{ color:"#aaa", textAlign:"center", padding:24 }}>No file activity in this period.</div>
        ) : (
          <table style={{ width:"100%", borderCollapse:"collapse", fontSize:13 }}>
            <thead>
              <tr>
                <th style={{ background:"#f8f9fa", color:"#344054", padding:"8px 10px", textAlign:"left", fontWeight:600, fontSize:12, borderBottom:"2px solid #e0e0e0" }}>Action</th>
                <th style={{ background:"#f8f9fa", color:"#344054", padding:"8px 10px", textAlign:"left", fontWeight:600, fontSize:12, borderBottom:"2px solid #e0e0e0" }}>Details</th>
                <th style={{ background:"#f8f9fa", color:"#344054", padding:"8px 10px", textAlign:"left", fontWeight:600, fontSize:12, borderBottom:"2px solid #e0e0e0" }}>Date</th>
              </tr>
            </thead>
            <tbody>
              {data.recentActivity.map(log => (
                <tr key={log.id}>
                  <td style={{ padding:"6px 10px", borderBottom:"1px solid #f0f0f0" }}>
                    <span style={{
                      display:"inline-block", padding:"2px 8px", borderRadius:4, fontSize:11, fontWeight:600,
                      background: log.action === "upload" ? "#E3F2FD" : log.action === "approve" ? "#E8F5E9" : "#FFEBEE",
                      color: log.action === "upload" ? "#1565c0" : log.action === "approve" ? "#1B5E20" : "#B71C1C",
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
