import { useState, useEffect } from "react";
import { api } from "../../api";
import { S, th, td, badge } from "../shared/styles";
import { MiniUpload } from "../shared/MiniUpload";
import { FileTableSection } from "../shared/FileTableSection";
import ExcelUploadModal from "../ExcelUploadModal";



export function ProgressReport({ user, onToast }) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fv, setFv] = useState(0);
  const [showUp, setShowUp] = useState(false);
  const [showExcelModal, setShowExcelModal] = useState(false);
  const [form, setForm] = useState({ project_name:"", block:"", total:"", completed:"", coverage:"", status:"In Progress" });
  const [showForm, setShowForm] = useState(false);
  const canEdit = user?.role === "admin" || user?.role === "ops_manager" || user?.role === "data_creator";

  const load = async () => {
    setLoading(true);
    const d = await api.listProgressReports().catch(() => []);
    setData(d || []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const handleCreate = async () => {
    if (!form.project_name) { onToast?.("Project name required", "error"); return; }
    const fd = new FormData();
    Object.entries(form).forEach(([k,v]) => fd.append(k, v));
    await api.createProgressReport(fd).catch(() => { onToast?.("Failed to create", "error"); return; });
    onToast?.("Progress report created", "success");
    setForm({ project_name:"", block:"", total:"", completed:"", coverage:"", status:"In Progress" });
    setShowForm(false);
    load();
  };

  const handleDelete = async (id) => {
    if (!confirm("Delete this record?")) return;
    await api.deleteProgressReport(id).catch(() => { onToast?.("Failed to delete", "error"); return; });
    onToast?.("Deleted", "success");
    load();
  };

  if (loading) return <div style={S.page}><div style={{textAlign:"center",padding:40,fontSize:14,color:"#888"}}>Loading progress reports...</div></div>;

  return (
    <div style={S.page}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
        <div style={{...S.title,marginBottom:0}}>Progress Report</div>
        <div style={{display:"flex",gap:6}}>
          {canEdit && <button style={{padding:"5px 12px",border:"none",borderRadius:4,background:"#0b3d91",color:"#fff",fontWeight:600,fontSize:12,cursor:"pointer"}} onClick={()=>setShowForm(!showForm)}>{showForm?"Close":"+ Add"}</button>}
          {canEdit && <button style={{padding:"5px 12px",border:"none",borderRadius:4,background:"#0b3d91",color:"#fff",fontWeight:600,fontSize:12,cursor:"pointer"}} onClick={()=>setShowExcelModal(true)}>📥 Excel</button>}
          <button style={{padding:"5px 12px",border:"none",borderRadius:4,background:showUp?"#e74c3c":"#0b3d91",color:"#fff",fontWeight:600,fontSize:12,cursor:"pointer"}} onClick={()=>setShowUp(!showUp)}>
            {showUp ? "Close" : "Upload"}
          </button>
        </div>
      </div>
      {showUp && <MiniUpload user={user} section="Progress Report" fields={{project_name:"Project",block:"Block",season:"Season"}} onUpload={() => setFv(x=>x+1)} onToast={onToast} />}
      {showForm && canEdit ? (
        <div style={{background:"#fff",borderRadius:8,padding:"24px 32px",boxShadow:"0 1px 4px rgba(0,0,0,0.1)",maxWidth:800,margin:"0 auto"}}>
          <div style={{...S.sectionTitle,fontSize:20}}>New Progress Report</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:12}}>
            <div style={S.field}><label style={S.label}>Project *</label><input style={S.input} value={form.project_name} onChange={e=>setForm(p=>({...p,project_name:e.target.value}))} /></div>
            <div style={S.field}><label style={S.label}>Block</label><input style={S.input} value={form.block} onChange={e=>setForm(p=>({...p,block:e.target.value}))} /></div>
            <div style={S.field}><label style={S.label}>Total</label><input style={S.input} type="number" value={form.total} onChange={e=>setForm(p=>({...p,total:e.target.value}))} /></div>
            <div style={S.field}><label style={S.label}>Completed</label><input style={S.input} type="number" value={form.completed} onChange={e=>setForm(p=>({...p,completed:e.target.value}))} /></div>
            <div style={S.field}><label style={S.label}>Coverage</label><input style={S.input} value={form.coverage} onChange={e=>setForm(p=>({...p,coverage:e.target.value}))} /></div>
            <div style={S.field}><label style={S.label}>Status</label><select style={S.select} value={form.status} onChange={e=>setForm(p=>({...p,status:e.target.value}))}><option>In Progress</option><option>Completed</option><option>Just Started</option></select></div>
          </div>
          <div style={{display:"flex",gap:8,marginTop:16}}>
            <button style={S.btnSm()} onClick={handleCreate}>Create</button>
            <button style={{...S.btnSm("#888")}} onClick={()=>setShowForm(false)}>Cancel</button>
          </div>
        </div>
      ) : (
        <>
          <div style={S.section}>
            <div style={S.sectionTitle}>Project Wise / Block Wise Coverage Details</div>
            <table style={{ width:"100%", borderCollapse:"collapse" }}>
          <thead><tr>
            <th style={th}>Project</th><th style={th}>Block</th><th style={th}>Total (km²)</th><th style={th}>Completed (km²)</th><th style={th}>Coverage</th><th style={th}>Status</th>{canEdit && <th style={th}>Actions</th>}
          </tr></thead>
          <tbody>{data.map((d,i)=>(
            <tr key={d.id} style={{ background:i%2===0?"#fff":"#f8f9fa" }}>
              <td style={td}>{d.project_name}</td><td style={td}>{d.block}</td><td style={td}>{d.total}</td><td style={td}>{d.completed}</td>
              <td style={td}><div style={{display:"flex",alignItems:"center",gap:8}}><div style={{width:60,height:6,background:"#eee",borderRadius:3}}><div style={{width:d.coverage,height:6,background:d.coverage==="100%"?"#1B5E20":"#0b3d91",borderRadius:3}}/></div>{d.coverage}</div></td>
              <td style={td}><span style={badge(d.status==="Completed"?"#1B5E20":d.status==="In Progress"?"#1565c0":"#E65100")}>{d.status}</span></td>
              {canEdit && <td style={td}><button style={{fontSize:12,padding:"2px 8px",border:"none",borderRadius:3,background:"#ffebee",color:"#c62828",cursor:"pointer"}} onClick={()=>handleDelete(d.id)}>Del</button></td>}
            </tr>
          ))}</tbody>
        </table>
      </div>
      <FileTableSection section="Progress Report" version={fv} />
      <ExcelUploadModal show={showExcelModal} onClose={()=>setShowExcelModal(false)} onToast={onToast} apiPreview={api.excelProgressPreview} apiImport={api.excelProgressImport} fields="progress_report" onSuccess={()=>{load()}} />
      </>)}
    </div>
  );
}

