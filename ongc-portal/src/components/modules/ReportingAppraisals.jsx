import { useState, useEffect } from "react";
import { api } from "../../api";
import { S, th, td, badge, C0 } from "../shared/styles";
import { VBarSimple, DonutSimple, COL0 } from "../shared/Charts";
import ExcelUploadModal from "../ExcelUploadModal";



const REPORT_TABS_KEY = "report_tabs";
function getReportTabs() {
  try { const d = JSON.parse(localStorage.getItem(REPORT_TABS_KEY)); if (Array.isArray(d) && d.length) return d; } catch {}
  return ["Fortnight","Monthly","Quarterly","Half-Yearly","DO Report","Consolidated Financial"];
}

export function ReportingAppraisals({ initialTab, user, onToast }) {
  const [tabs, setTabs] = useState(getReportTabs);
  const [active, setActive] = useState(initialTab || tabs[0]);
  const [stats, setStats] = useState(null);
  const [targets, setTargets] = useState([]);
  const [pageCats, setPageCats] = useState([]);
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showExcelModal, setShowExcelModal] = useState(false);
  const [form, setForm] = useState({ period:"", submitted:"", by:"", status:"Draft" });
  const [showForm, setShowForm] = useState(false);
  const canEdit = user?.role === "admin" || user?.role === "ops_manager" || user?.role === "data_creator";

  const addTab = () => {
    const name = prompt("Enter new report type:");
    if (name && name.trim() && !tabs.includes(name.trim())) {
      const next = [...tabs, name.trim()];
      setTabs(next);
      localStorage.setItem(REPORT_TABS_KEY, JSON.stringify(next));
    }
  };

  useEffect(() => {
    const stored = getReportTabs();
    if (stored.length !== tabs.length || stored.some((t,i)=>t!==tabs[i])) setTabs(stored);
  }, []);

  useEffect(() => { setActive(initialTab || tabs[0]); }, [initialTab]);
  useEffect(() => { api.getLookups("pagecat_Reporting___Appraisals").then(d => setPageCats(d.map(x=>x.value))).catch(() => {}); }, []);

  useEffect(() => {
    Promise.all([api.getStats(), api.listTargets()])
      .then(([s,t]) => { setStats(s); setTargets(t||[]); })
      .catch(() => { setStats(null); setTargets([]); });
  }, []);

  const load = async (section) => {
    setLoading(true);
    const d = await api.listReportingAppraisals(section || active).catch(() => []);
    setData(d || []);
    setLoading(false);
  };
  useEffect(() => { load(active); }, [active]);

  const handleCreate = async () => {
    if (!form.period) { onToast?.("Period required", "error"); return; }
    const fd = new FormData();
    fd.append("section", active);
    Object.entries(form).forEach(([k,v]) => { if (v) fd.append(k, v); });
    await api.createReportingAppraisal(fd).catch(() => { onToast?.("Failed to create", "error"); return; });
    onToast?.("Report record created", "success");
    setForm({ period:"", submitted:"", by:"", status:"Draft" });
    setShowForm(false);
    load(active);
  };

  const handleDelete = async (id) => {
    if (!confirm("Delete this record?")) return;
    await api.deleteReportingAppraisal(id).catch(() => { onToast?.("Failed to delete", "error"); return; });
    onToast?.("Deleted", "success");
    load(active);
  };

  const rows = data.filter(r => !r.section || r.section === active);
  const byStatus = rows.reduce((a,r)=>{a[r.status]=(a[r.status]||0)+1;return a;},{});
  const byAuthor = rows.reduce((a,r)=>{a[r.by]=(a[r.by]||0)+1;return a;},{});
  const monthlyLabels = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const mockTimeline = monthlyLabels.map(m => ({month:m,count:Math.floor(Math.random()*3)+1}));

  if (loading) return <div style={S.page}><div style={{textAlign:"center",padding:40,fontSize:14,color:"#888"}}>Loading reports...</div></div>;

  return (
    <div style={S.page}>
      {pageCats.length > 0 && (
        <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:10,alignItems:"center"}}>
          <span style={{fontSize:12,fontWeight:600,color:"#666"}}>Categories:</span>
          {pageCats.map(c => (
            <span key={c} style={{display:"inline-block",padding:"2px 10px",borderRadius:12,fontSize:12,fontWeight:600,background:"#e8edf2",color:"#0b3d91"}}>{c}</span>
          ))}
        </div>
      )}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
        <div style={S.title}>Reporting / Appraisals — {active}</div>
        <div style={{display:"flex",gap:6}}>
          {canEdit && <button style={{padding:"5px 12px",border:"none",borderRadius:4,background:"#0b3d91",color:"#fff",fontWeight:600,fontSize:12,cursor:"pointer"}} onClick={()=>setShowForm(!showForm)}>{showForm?"Close":"+ Add"}</button>}
          {canEdit && <button style={{padding:"5px 12px",border:"none",borderRadius:4,background:"#0b3d91",color:"#fff",fontWeight:600,fontSize:12,cursor:"pointer"}} onClick={()=>setShowExcelModal(true)}>📥 Excel</button>}
        </div>
      </div>
      <div style={{ display:"flex", gap:4, marginBottom:16, flexWrap:"wrap" }}>
        {tabs.map(t => (
          <button key={t} style={{ padding:"6px 14px", borderRadius:4, border:"none", cursor:"pointer", fontWeight:600, fontSize:14, background:active===t?"#0b3d91":"#e0e0e0", color:active===t?"#fff":"#333" }} onClick={()=>setActive(t)}>{t}</button>
        ))}
        <button style={{padding:"6px 14px",borderRadius:4,border:"1px dashed #0b3d91",cursor:"pointer",fontSize:14,color:"#0b3d91",background:"transparent"}} onClick={addTab}>+ Add</button>
      </div>

      {showForm && canEdit ? (
        <div style={{background:"#fff",borderRadius:8,padding:"24px 32px",boxShadow:"0 1px 4px rgba(0,0,0,0.1)",maxWidth:800,margin:"0 auto"}}>
          <div style={S.sectionTitle}>New Report Record</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:12}}>
            <div style={S.field}><label style={S.label}>Period *</label><input style={S.input} value={form.period} onChange={e=>setForm(p=>({...p,period:e.target.value}))} /></div>
            <div style={S.field}><label style={S.label}>Submitted Date</label><input style={S.input} type="date" value={form.submitted} onChange={e=>setForm(p=>({...p,submitted:e.target.value}))} /></div>
            <div style={S.field}><label style={S.label}>By</label><input style={S.input} value={form.by} onChange={e=>setForm(p=>({...p,by:e.target.value}))} /></div>
            <div style={S.field}><label style={S.label}>Status</label><select style={S.select} value={form.status} onChange={e=>setForm(p=>({...p,status:e.target.value}))}><option>Draft</option><option>Submitted</option><option>Under Review</option><option>Approved</option></select></div>
          </div>
          <div style={{display:"flex",gap:8,marginTop:16}}>
            <button style={S.btnSm()} onClick={handleCreate}>Create</button>
            <button style={{...S.btnSm("#888")}} onClick={()=>setShowForm(false)}>Cancel</button>
          </div>
        </div>
      ) : ( <>

      {targets.length>0 && (
        <div style={S.section}>
          <div style={S.sectionTitle}>Goal vs Accomplishment</div>
          <div style={{display:"flex",gap:24,flexWrap:"wrap"}}>
            {targets.map(t => {
              const maxV=Math.max(Number(t.target_value)||1,Number(t.achieved)||1);
              const gH=(Number(t.target_value)/maxV)*100;
              const aH=(Number(t.achieved)/maxV)*100;
              return (
                <div key={t.id} style={{textAlign:"center"}}>
                  <div style={{fontSize:14,fontWeight:600,color:"#333",marginBottom:4}}>{t.title}</div>
                  <svg width={70} height={120} viewBox="0 0 70 120">
                    <text x={15} y={115} textAnchor="middle" fontSize={8} fill="#c62828">Goal</text>
                    <text x={55} y={115} textAnchor="middle" fontSize={8} fill="#1B5E20">Done</text>
                    <rect x={5} y={110-gH} width={20} height={gH} fill="#c62828" rx={3}/>
                    <rect x={45} y={110-aH} width={20} height={aH} fill="#1B5E20" rx={3}/>
                    <text x={15} y={110-gH-3} textAnchor="middle" fontSize={8} fontWeight={700} fill="#c62828">{t.target_value}</text>
                    <text x={55} y={110-aH-3} textAnchor="middle" fontSize={8} fontWeight={700} fill="#1B5E20">{t.achieved}</text>
                  </svg>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div style={{display:"grid",gridTemplateColumns:rows.length>0?"1fr 1fr":"1fr",gap:12,marginBottom:16}}>
        {rows.length>0 && (
          <>
            <div style={S.section}>
              <div style={S.sectionTitle}>Submission Status</div>
              <DonutSimple data={byStatus} colors={[C0.green,C0.orange,C0.blue,C0.purple]} size={120}/>
            </div>
          <div style={S.section}>
            <div style={S.sectionTitle}>Reports by Author</div>
            <DonutSimple data={byAuthor} colors={COL0} size={120}/>
          </div>
          </>
        )}
      </div>

      {stats && (
        <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10,marginBottom:16}}>
          {[["Total Files",stats.total,C0.blue],["Approved",stats.approved,C0.green],["Pending",stats.pending,C0.orange],["Rejected",stats.rejected,C0.red]].map(([l,v,c])=>(
            <div key={l} style={{background:"#fff",borderRadius:8,padding:"12px 16px",textAlign:"center",boxShadow:"0 1px 4px rgba(0,0,0,0.08)"}}>
              <div style={{fontSize:22,fontWeight:800,color:c}}>{v}</div>
            <div style={{fontSize:13,color:"#888",fontWeight:600,textTransform:"uppercase",marginTop:2}}>{l}</div>
            </div>
          ))}
        </div>
      )}

      <div style={{display:"grid",gridTemplateColumns:stats?"1fr 1fr":"1fr",gap:12,marginBottom:16}}>
        {stats && (
          <>
        <div style={S.section}>
          <div style={S.sectionTitle}>Files by Section</div>
          <DonutSimple data={stats.bySection||{}} colors={COL0} size={120}/>
        </div>
        <div style={S.section}>
          <div style={S.sectionTitle}>Classification Breakdown</div>
          <DonutSimple data={stats.byClassification||{}} colors={COL0} size={120}/>
        </div>
          </>
        )}
        <div style={S.section}>
          <div style={S.sectionTitle}>Submission Timeline (Estimated)</div>
          <VBarSimple data={mockTimeline.reduce((a,m)=>{a[m.month]=m.count;return a;},{})} color={C0.blue} height={150}/>
        </div>
      </div>

      <div style={S.section}>
        <div style={S.sectionTitle}>{active} Report Details</div>
        {rows.length===0 ? (
          <div style={{textAlign:"center",padding:20,color:"#999",fontSize:13}}>No {active.toLowerCase()} reports yet.</div>
        ) : (
          <table style={{width:"100%",borderCollapse:"collapse"}}>
            <thead><tr><th style={th}>Period</th><th style={th}>Submitted</th><th style={th}>By</th><th style={th}>Status</th>{canEdit && <th style={th}>Actions</th>}</tr></thead>
            <tbody>{rows.map((d,i)=>(
              <tr key={d.id} style={{background:i%2===0?"#fff":"#f8f9fa"}}>
                <td style={td}>{d.period}</td><td style={td}>{d.submitted}</td><td style={td}>{d.by}</td>
                <td style={td}><span style={badge(d.status==="Approved"?"#1B5E20":d.status==="Under Review"?"#E65100":d.status==="Pending"?"#1565c0":"#666")}>{d.status}</span></td>
                {canEdit && <td style={td}><button style={{fontSize:12,padding:"2px 8px",border:"none",borderRadius:3,background:"#ffebee",color:"#c62828",cursor:"pointer"}} onClick={()=>handleDelete(d.id)}>Del</button></td>}
              </tr>
            ))}</tbody>
          </table>
        )}
      </div>
      <ExcelUploadModal show={showExcelModal} onClose={()=>setShowExcelModal(false)} onToast={onToast} apiPreview={api.excelAppraisalPreview} apiImport={api.excelAppraisalImport} fields="reporting_appraisal" onSuccess={()=>{load(active)}} />
      </> )}
    </div>
  );
}

