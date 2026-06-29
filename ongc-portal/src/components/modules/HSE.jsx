import { useState, useEffect } from "react";
import { api } from "../../api";
import { S, th, td } from "../shared/styles";
import ExcelUploadModal from "../ExcelUploadModal";



export function HSE({ user, onToast }) {
  const [pageCats, setPageCats] = useState([]);
  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showExcelModal, setShowExcelModal] = useState(false);
  const [form, setForm] = useState({ date:"", incident_type:"", location:"", description:"", action_taken:"" });
  const [showForm, setShowForm] = useState(false);
  const canEdit = user?.role === "admin" || user?.role === "ops_manager" || user?.role === "data_creator";
  const [stats] = useState({
    daysWithoutIncident: 185, totalInspections: 24, complianceRate: "97.2%",
    activeDrills: 3, lastInspection: "2025-06-14", pendingActions: 2,
  });

  useEffect(() => { api.getLookups("pagecat_HSE").then(d => setPageCats(d.map(x=>x.value))).catch(() => {}); }, []);

  const load = async () => {
    setLoading(true);
    const d = await api.listHSEIncidents().catch(() => []);
    setIncidents(d || []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const handleCreate = async () => {
    if (!form.incident_type || !form.description) { onToast?.("Type and description required", "error"); return; }
    const fd = new FormData();
    Object.entries(form).forEach(([k,v]) => { if (v) fd.append(k, v); });
    await api.createHSEIncident(fd).catch(() => { onToast?.("Failed to create", "error"); return; });
    onToast?.("Incident recorded", "success");
    setForm({ date:"", incident_type:"", location:"", description:"", action_taken:"" });
    setShowForm(false);
    load();
  };

  const handleDelete = async (id) => {
    if (!confirm("Delete this record?")) return;
    await api.deleteHSEIncident(id).catch(() => { onToast?.("Failed to delete", "error"); return; });
    onToast?.("Deleted", "success");
    load();
  };

  if (loading) return <div style={S.page}><div style={{textAlign:"center",padding:40,fontSize:14,color:"#888"}}>Loading HSE data...</div></div>;

  return (
    <div style={S.page}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
        <div style={S.title}>HSE Dashboard</div>
        <div style={{display:"flex",gap:6}}>
          {canEdit && <button style={{padding:"5px 12px",border:"none",borderRadius:4,background:"#0b3d91",color:"#fff",fontWeight:600,fontSize:12,cursor:"pointer"}} onClick={()=>setShowForm(!showForm)}>{showForm?"Close":"+ Add"}</button>}
          {canEdit && <button style={{padding:"5px 12px",border:"none",borderRadius:4,background:"#0b3d91",color:"#fff",fontWeight:600,fontSize:12,cursor:"pointer"}} onClick={()=>setShowExcelModal(true)}>📥 Excel</button>}
        </div>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:12,marginBottom:20}}>
        {[["Days Without Incident",stats.daysWithoutIncident,"#1B5E20"],["Compliance Rate",stats.complianceRate,"#0b3d91"],["Pending Actions",stats.pendingActions,"#E65100"]].map(([l,v,c])=>(
          <div key={l} style={{...S.card,textAlign:"center"}}>
            <div style={{fontSize:12,color:"#666",fontWeight:600}}>{l}</div>
            <div style={{fontSize:28,fontWeight:800,color:c}}>{v}</div>
          </div>
        ))}
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:12,marginBottom:20}}>
        {[["Total Inspections",stats.totalInspections],["Active Drills",stats.activeDrills],["Last Inspection",stats.lastInspection]].map(([l,v])=>(
          <div key={l} style={S.card}>
            <div style={{fontSize:14,color:"#666",fontWeight:600}}>{l}</div>
            <div style={{fontSize:18,fontWeight:700,color:"#1a1a2e"}}>{v}</div>
          </div>
        ))}
      </div>
      {showForm && canEdit ? (
        <div style={{background:"#fff",borderRadius:8,padding:"24px 32px",boxShadow:"0 1px 4px rgba(0,0,0,0.1)",maxWidth:800,margin:"0 auto"}}>
          <div style={S.sectionTitle}>New Incident / Observation</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
            <div style={S.field}><label style={S.label}>Date</label><input style={S.input} type="date" value={form.date} onChange={e=>setForm(p=>({...p,date:e.target.value}))} /></div>
            <div style={S.field}><label style={S.label}>Type *</label><input style={S.input} value={form.incident_type} onChange={e=>setForm(p=>({...p,incident_type:e.target.value}))} placeholder="Near Miss / Safety Observation" /></div>
            <div style={S.field}><label style={S.label}>Location</label><input style={S.input} value={form.location} onChange={e=>setForm(p=>({...p,location:e.target.value}))} /></div>
            <div style={S.field}><label style={S.label}>Action Taken</label><input style={S.input} value={form.action_taken} onChange={e=>setForm(p=>({...p,action_taken:e.target.value}))} /></div>
            <div style={{...S.field,gridColumn:"span 2"}}><label style={S.label}>Description *</label><textarea style={S.input} rows={2} value={form.description} onChange={e=>setForm(p=>({...p,description:e.target.value}))} /></div>
          </div>
          <div style={{display:"flex",gap:8,marginTop:16}}>
            <button style={S.btnSm()} onClick={handleCreate}>Create</button>
            <button style={{...S.btnSm("#888")}} onClick={()=>setShowForm(false)}>Cancel</button>
          </div>
        </div>
      ) : ( <>
      {pageCats.length > 0 && (
        <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:10,alignItems:"center"}}>
          <span style={{fontSize:12,fontWeight:600,color:"#666"}}>Categories:</span>
          {pageCats.map(c => (
            <span key={c} style={{display:"inline-block",padding:"2px 10px",borderRadius:12,fontSize:12,fontWeight:600,background:"#e8edf2",color:"#0b3d91"}}>{c}</span>
          ))}
        </div>
      )}
      <div style={S.section}>
        <div style={S.sectionTitle}>Incidents / Observations</div>
        <table style={{width:"100%",borderCollapse:"collapse"}}>
          <thead><tr><th style={th}>Date</th><th style={th}>Type</th><th style={th}>Location</th><th style={th}>Description</th><th style={th}>Action Taken</th>{canEdit && <th style={th}>Actions</th>}</tr></thead>
          <tbody>{incidents.map((d,i)=>(
            <tr key={d.id} style={{background:i%2===0?"#fff":"#f8f9fa"}}>
              <td style={td}>{d.date ? String(d.date).slice(0,10) : ""}</td><td style={td}>{d.incident_type}</td><td style={td}>{d.location}</td><td style={td}>{d.description}</td><td style={td}>{d.action_taken}</td>
              {canEdit && <td style={td}><button style={{fontSize:12,padding:"2px 8px",border:"none",borderRadius:3,background:"#ffebee",color:"#c62828",cursor:"pointer"}} onClick={()=>handleDelete(d.id)}>Del</button></td>}
            </tr>
          ))}</tbody>
        </table>
      </div>
      <ExcelUploadModal show={showExcelModal} onClose={()=>setShowExcelModal(false)} onToast={onToast} apiPreview={api.excelHSEPreview} apiImport={api.excelHSEImport} fields="hse_incident" onSuccess={()=>{load()}} />
      </> )}
    </div>
  );
}

