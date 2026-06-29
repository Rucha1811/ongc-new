import { useState, useEffect } from "react";
import { api } from "../../api";
import { S, th, td, C2 } from "../shared/styles";

const MONTHS = ["apr","may","jun","jul","aug","sep","oct","nov","dec","jan","feb","mar"];
const MONTH_LABELS = ["Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec","Jan","Feb","Mar"];

function emptyMonthly() {
  const o = {};
  MONTHS.forEach(m => { o[m] = ""; o[m+"_ach"] = ""; });
  return o;
}

export function KPITargetsAWP({ user, onToast }) {
  const [berData, setBerData] = useState([]);
  const [berLoading, setBerLoading] = useState(false);
  const [projects, setProjects] = useState([]);
  const [berForm, setBerForm] = useState({ project_name:"", project_type:"", type:"BE", financial_year:"", basin:"", editing:null, ...emptyMonthly() });
  const [berMonthly, setBerMonthly] = useState(null);
  const [berYearly, setBerYearly] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => { loadBer(); }, []);

  useEffect(() => {
    api.listProjects().then(setProjects).catch(() => setProjects([]));
  }, []);

  const surveyTypeMap = {
    "2D Seismic":"2D", "3D Seismic":"3D", "VSP":"VSP",
    "Dual 2D+3D":"Dual 2D+3D","Review":"Review",
  };

  const [berProjId, setBerProjId] = useState("");

  const loadBerRecord = async (project_name, type, financial_year) => {
    if (!project_name || !type || !financial_year) return;
    const records = await api.stage2Targets(financial_year, type, project_name).catch(() => []);
    const match = records?.[0];
    if (match) {
      const m = emptyMonthly();
      MONTHS.forEach(mm => {
        if (match[mm]) m[mm] = match[mm];
        if (match[mm+"_ach"]) m[mm+"_ach"] = match[mm+"_ach"];
      });
      setBerForm(prev => ({ ...prev, editing:match.id, ...m }));
    } else {
      setBerForm(prev => ({ ...prev, editing:null, ...emptyMonthly() }));
    }
  };

  const handleBerProjectChange = (projectId) => {
    setBerProjId(projectId);
    const p = projects.find(x => x.id === Number(projectId));
    if (!p) return;
    const fy = "2026-27";
    const berType = "BE";
    setBerForm({
      project_name:p.project_name,
      project_type:surveyTypeMap[p.survey_type] || p.survey_type || "",
      type:berType,
      financial_year:fy,
      basin:p.area_name || "",
      editing:null,
      ...emptyMonthly()
    });
    setBerMonthly(null);
    setBerYearly(null);
    loadBerRecord(p.project_name, berType, fy);
  };

  const loadBer = async () => {
    setBerLoading(true);
    const d = await api.stage2Targets().catch(() => []);
    setBerData(d || []);
    setBerLoading(false);
  };

  const loadBerAnalytics = async (projectName, fy) => {
    if (!projectName) { setBerMonthly(null); setBerYearly(null); return; }
    const m = await api.stage2Monthly(fy, projectName).catch(() => []);
    const y = await api.stage2Yearly(fy, projectName).catch(() => []);
    setBerMonthly(m || []);
    setBerYearly(y || []);
  };

  useEffect(() => {
    loadBerAnalytics(berForm.project_name, berForm.financial_year);
  }, [berForm.project_name, berForm.financial_year, berForm.type]);

  const handleBerSubmit = async () => {
    if (!berForm.project_name || !berForm.type || !berForm.financial_year) {
      onToast?.("Project name, type, and financial year required", "error"); return;
    }
    setSaving(true);
    const body = {
      project_name: berForm.project_name,
      project_type: berForm.project_type || null,
      type: berForm.type,
      financial_year: berForm.financial_year,
      basin: berForm.basin || null,
    };
    MONTHS.forEach(m => {
      if (berForm[m]) body[m] = Number(berForm[m]);
      if (berForm[m+"_ach"]) body[m+"_ach"] = Number(berForm[m+"_ach"]);
    });
    if (berForm.editing) {
      await api.stage2UpdateTarget(berForm.editing, body).catch(() => { onToast?.("Failed to update","error"); return; });
      onToast?.("Updated","success");
    } else {
      await api.stage2CreateTarget(body).catch(() => { onToast?.("Failed to create","error"); return; });
      onToast?.("Created","success");
    }
    setSaving(false);
    setBerForm(prev => ({ ...prev, editing:null, ...emptyMonthly() }));
    loadBer();
    loadBerRecord(berForm.project_name, berForm.type, berForm.financial_year);
    loadBerAnalytics(berForm.project_name, berForm.financial_year);
  };

  const handleBerDelete = async (id) => {
    if (!confirm("Delete this acquisition target?")) return;
    await api.stage2DeleteTarget(id).catch(() => { onToast?.("Failed to delete","error"); return; });
    onToast?.("Deleted","success");
    loadBer();
    if (berForm.editing === id) {
      setBerForm(prev => ({ ...prev, editing:null, ...emptyMonthly() }));
    }
  };

  const startBerEdit = (item) => {
    const m = emptyMonthly();
    MONTHS.forEach(mm => {
      if (item[mm]) m[mm] = item[mm];
      if (item[mm+"_ach"]) m[mm+"_ach"] = item[mm+"_ach"];
    });
    const p = projects.find(x => x.project_name === item.project_name);
    if (p) setBerProjId(String(p.id));
    setBerForm({ ...m, project_name:item.project_name, project_type:item.project_type||"", type:item.type, financial_year:item.financial_year, basin:item.basin||"", editing:item.id });
  };

  const canEdit = user?.role === "admin" || user?.role === "ops_manager" || user?.role === "data_creator";

  return (
    <div style={S.page}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:8}}>
        <div style={S.title}>KPI / Targets / AWP</div>
      </div>
      <div style={{...S.section,marginTop:32}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:8,marginBottom:16}}>
          <div style={{fontSize:16,fontWeight:700,color:C2.dark}}>BE / RE Acquisition Targets</div>
          <button style={{...S.btnSm(),background:"#2e7d32",color:"#fff",fontSize:11}} onClick={async () => {
            const r = await api.stage2Export();
            if (!r.ok) { onToast?.("Export failed","error"); return; }
            const blob = await r.blob(); const url = URL.createObjectURL(blob);
            const a = document.createElement("a"); a.href = url; a.download = "all_acquisition_targets.xlsx";
            a.click(); URL.revokeObjectURL(url);
          }}>Export All</button>
        </div>

        {/* Project + BE/RE selector row */}
        <div style={{display:"flex",gap:12,alignItems:"end",flexWrap:"wrap",marginBottom:16}}>
          <div style={S.field}>
            <label style={S.label}>Select Project</label>
            <select style={{...S.select,minWidth:220}} value={berProjId} onChange={e=>handleBerProjectChange(e.target.value)}>
              <option value="">— Choose —</option>
              {projects.filter(p=>p.survey_type).map(p => (
                <option key={p.id} value={p.id}>{p.project_name}</option>
              ))}
            </select>
          </div>
          {berForm.project_name && (
            <>
              <div style={S.field}>
                <label style={S.label}>BE / RE</label>
                <div style={{display:"flex",gap:4}}>
                  <button
                    style={{padding:"6px 16px", background:berForm.type==="BE"?"#1565c0":"#e0e0e0", color:berForm.type==="BE"?"#fff":"#555", border:"none", borderRadius:4, cursor:"pointer", fontWeight:600, fontSize:12}}
                    onClick={() => { setBerForm(p=>({...p,type:"BE",editing:null,...emptyMonthly()})); loadBerRecord(berForm.project_name, "BE", berForm.financial_year); }}
                  >BE</button>
                  <button
                    style={{padding:"6px 16px", background:berForm.type==="RE"?"#c62828":"#e0e0e0", color:berForm.type==="RE"?"#fff":"#555", border:"none", borderRadius:4, cursor:"pointer", fontWeight:600, fontSize:12}}
                    onClick={() => { setBerForm(p=>({...p,type:"RE",editing:null,...emptyMonthly()})); loadBerRecord(berForm.project_name, "RE", berForm.financial_year); }}
                  >RE</button>
                </div>
              </div>
              <div style={S.field}>
                <label style={S.label}>FY</label>
                <input style={{...S.input,width:100}} value={berForm.financial_year} onChange={e=>{const fy=e.target.value; setBerForm(p=>({...p,financial_year:fy,editing:null,...emptyMonthly()})); loadBerRecord(berForm.project_name, berForm.type, fy);}} placeholder="2025-26" />
              </div>
              <button style={{...S.btnSm(),background:"#2e7d32",color:"#fff",border:"none"}} onClick={async () => {
                const r = await api.stage2Export(berForm.project_name, berForm.financial_year, berForm.type);
                if (!r.ok) { onToast?.("Export failed","error"); return; }
                const blob = await r.blob(); const url = URL.createObjectURL(blob);
                const a = document.createElement("a"); a.href = url;
                a.download = `${berForm.project_name}_${berForm.type}_${berForm.financial_year}.xlsx`;
                a.click(); URL.revokeObjectURL(url);
              }}>Export Excel</button>
            </>
          )}
        </div>

        {/* Monthly form */}
        {berForm.project_name && (
          <div style={{background:"#f8faff",borderRadius:8,padding:16,border:"1px solid #e0e8f5",marginBottom:16}}>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr",gap:12,marginBottom:16}}>
              <div style={S.field}><label style={S.label}>Project</label><input style={S.input} value={berForm.project_name} disabled /></div>
              <div style={S.field}><label style={S.label}>Project Type</label>
                <select style={S.select} value={berForm.project_type} onChange={e=>setBerForm(p=>({...p,project_type:e.target.value}))}>
                  <option value="">Select…</option>
                  <option value="2D">2D</option><option value="3D">3D</option>
                  <option value="VSP">VSP</option><option value="Dual 2D+3D">Dual 2D+3D</option>
                </select>
              </div>
              <div style={S.field}><label style={S.label}>Basin</label><input style={S.input} value={berForm.basin} onChange={e=>setBerForm(p=>({...p,basin:e.target.value}))} placeholder="WON" /></div>
              <div style={S.field}><label style={S.label}>Status</label>
                <input style={S.input} value={berForm.editing ? `Editing (ID: ${berForm.editing})` : "New Record"} disabled />
              </div>
            </div>
            <div style={{fontSize:13,fontWeight:600,color:"#555",marginBottom:8}}>Monthly Targets &amp; Achievements <span style={{fontWeight:400,color:"#aaa"}}>(in SKM)</span></div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:8}}>
              {MONTHS.map((m,i) => (
                <div key={m} style={{background:"#fff",borderRadius:6,padding:8,border:"1px solid #e8edf5"}}>
                  <div style={{fontSize:11,fontWeight:600,color:"#888",marginBottom:4}}>{MONTH_LABELS[i]}</div>
                  <input style={{...S.input,fontSize:11,padding:"3px 6px",marginBottom:4}} type="number" placeholder="Target" value={berForm[m]} onChange={e=>setBerForm(p=>({...p,[m]:e.target.value}))} />
                  <input style={{...S.input,fontSize:11,padding:"3px 6px"}} type="number" placeholder="Achieved" value={berForm[m+"_ach"]} onChange={e=>setBerForm(p=>({...p,[m+"_ach"]:e.target.value}))} />
                </div>
              ))}
            </div>
            <div style={{display:"flex",gap:12,marginTop:16}}>
              <button style={{...S.btnSm(),flex:1}} onClick={handleBerSubmit} disabled={saving}>
                {saving ? "Saving..." : berForm.editing ? "✏️ Update Target" : "💾 Save New Target"}
              </button>
              <button style={{...S.btnSm(),flex:0.5,background:"#f5f5f5",color:"#555"}} onClick={() => { setBerForm(p=>({...p,editing:null,...emptyMonthly()})); loadBerRecord(berForm.project_name, berForm.type, berForm.financial_year); }}>
                Reset
              </button>
            </div>
          </div>
        )}

        {/* Existing records table for this project */}
        {berForm.project_name && berData.filter(d => d.project_name === berForm.project_name).length > 0 && (
          <div style={{overflowX:"auto",marginBottom:16}}>
            <div style={{fontSize:13,fontWeight:600,color:"#555",marginBottom:8}}>Records for {berForm.project_name}</div>
            <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
              <thead>
                <tr style={{background:"#f0f4ff"}}>
                  <th style={th}>Type</th>
                  <th style={th}>FY</th>
                  <th style={th}>Proj. Type</th>
                  <th style={th}>Basin</th>
                  <th style={th}>Total</th>
                  <th style={th}>Achieved</th>
                  <th style={th}>%</th>
                  {canEdit && <th style={th}></th>}
                </tr>
              </thead>
              <tbody>
                {berData.filter(d => d.project_name === berForm.project_name).map(item => {
                  const total = Number(item.total || 0);
                  const ach = Number(item.total_ach || 0);
                  const pct = total > 0 ? Math.round((ach / total) * 100) : 0;
                  return (
                    <tr key={item.id} style={{borderBottom:"1px solid #f0f0f0",cursor:"pointer",background:berForm.editing===item.id?"#fff8e1":"transparent"}} onClick={()=>startBerEdit(item)}>
                      <td style={td}><span style={{background:item.type==="BE"?"#e3f2fd":"#fce4ec",color:item.type==="BE"?"#1565c0":"#c62828",padding:"2px 8px",borderRadius:4,fontWeight:600,fontSize:11}}>{item.type}</span></td>
                      <td style={td}>{item.financial_year}</td>
                      <td style={td}>{item.project_type ? <span style={{background:"#f3e5f5",color:"#6a1b9a",padding:"2px 8px",borderRadius:4,fontWeight:600,fontSize:11}}>{item.project_type}</span> : "—"}</td>
                      <td style={td}>{item.basin || "—"}</td>
                      <td style={td}>{total.toLocaleString()}</td>
                      <td style={td}>{ach.toLocaleString()}</td>
                      <td style={td}>{pct}%</td>
                      {canEdit && (
                        <td style={td}>
                          <button style={{fontSize:11,padding:"2px 6px",border:"none",borderRadius:3,background:"#ffebee",color:"#c62828",cursor:"pointer"}} onClick={e=>{e.stopPropagation();handleBerDelete(item.id)}}>Delete</button>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Project-specific mini analytics */}
        {berForm.project_name && (
          <div style={{marginTop:12}}>
            <div style={{fontSize:14,fontWeight:600,color:C2.dark,marginBottom:12}}>Analytics: {berForm.project_name} ({berForm.type})</div>
            {berYearly && (() => {
              const y = berYearly[berForm.type.toLowerCase()];
              if (!y) return null;
              return (
                <div style={{display:"flex",gap:12,marginBottom:16,flexWrap:"wrap"}}>
                  <div style={{background:"#fff",borderRadius:8,padding:"12px 18px",boxShadow:"0 1px 4px rgba(0,0,0,0.08)",textAlign:"center",flex:1,minWidth:120}}>
                    <div style={{fontSize:22,fontWeight:700,color:berForm.type==="BE"?"#1565c0":"#c62828"}}>{Number(y.target||0).toLocaleString()}</div>
                    <div style={{fontSize:11,color:"#888"}}>{berForm.type} Target</div>
                    <div style={{fontSize:11,color:"#555"}}>Ach: {Number(y.achieved||0).toLocaleString()}</div>
                  </div>
                </div>
              );
            })()}
            {berMonthly && (() => {
              const prefix = berForm.type === "BE" ? "be_" : "re_";
              const entries = Object.entries(berMonthly).filter(([_, v]) => Number(v[prefix+"target"]||0) > 0 || Number(v[prefix+"achieved"]||0) > 0);
              if (entries.length === 0) return null;
              const maxVal = Math.max(...entries.map(([_, v]) => Math.max(Number(v[prefix+"target"]||0), Number(v[prefix+"achieved"]||0), 1)), 1);
              return (
                <div style={{background:"#fff",borderRadius:8,padding:16,boxShadow:"0 1px 4px rgba(0,0,0,0.08)"}}>
                  <div style={{fontSize:13,fontWeight:600,color:"#555",marginBottom:12}}>Monthly Target vs Achievement</div>
                  <div style={{display:"flex",gap:6,alignItems:"end",minHeight:160}}>
                    {entries.map(([monthLabel, v]) => {
                      const tgt = Number(v[prefix+"target"]||0);
                      const ach = Number(v[prefix+"achieved"]||0);
                      const tH = (tgt / maxVal) * 120;
                      const aH = (ach / maxVal) * 120;
                      return (
                        <div key={monthLabel} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center"}}>
                          <div style={{display:"flex",gap:4,alignItems:"end",height:130}}>
                            <div title={`Target: ${tgt}`} style={{width:16,background:berForm.type==="BE"?"#1565c0":"#c62828",borderRadius:"4px 4px 0 0",height:Math.max(tH,1),transition:"height 0.3s"}} />
                            <div title={`Ach: ${ach}`} style={{width:16,background:"#4caf50",borderRadius:"4px 4px 0 0",height:Math.max(aH,1),transition:"height 0.3s"}} />
                          </div>
                          <div style={{fontSize:9,color:"#888",marginTop:4}}>{monthLabel}</div>
                          <div style={{fontSize:8,color:berForm.type==="BE"?"#1565c0":"#c62828"}}>{tgt}</div>
                          <div style={{fontSize:8,color:"#4caf50"}}>{ach}</div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })()}
            {!berMonthly && !berYearly && (
              <div style={{textAlign:"center",padding:12,color:"#aaa",fontSize:12}}>No analytics data for this project yet.</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
