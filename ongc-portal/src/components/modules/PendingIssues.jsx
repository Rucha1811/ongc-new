import { useState, useEffect } from "react";
import { api } from "../../api";
import { S, th, td, badge } from "../shared/styles";
import ExcelUploadModal from "../ExcelUploadModal";



export function PendingIssues({ user, onToast }) {
  const [issues, setIssues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showExcelModal, setShowExcelModal] = useState(false);
  const [form, setForm] = useState({ description:"", raised_by:"", date:"", edc:"", status:"Open" });
  const [showForm, setShowForm] = useState(false);
  const canEdit = user?.role === "admin" || user?.role === "ops_manager" || user?.role === "data_creator";

  const load = async () => {
    setLoading(true);
    const d = await api.listPendingIssues().catch(() => []);
    setIssues(d || []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const handleCreate = async () => {
    if (!form.description) { onToast?.("Description required", "error"); return; }
    const fd = new FormData();
    Object.entries(form).forEach(([k,v]) => fd.append(k, v));
    await api.createPendingIssue(fd).catch(() => { onToast?.("Failed to create", "error"); return; });
    onToast?.("Issue created", "success");
    setForm({ description:"", raised_by:"", date:"", edc:"", status:"Open" });
    setShowForm(false);
    load();
  };

  const handleDelete = async (id) => {
    if (!confirm("Delete this issue?")) return;
    await api.deletePendingIssue(id).catch(() => { onToast?.("Failed to delete", "error"); return; });
    onToast?.("Deleted", "success");
    load();
  };

  const pending = issues.filter(i => i.status !== "Resolved").length;
  const resolved = issues.filter(i => i.status === "Resolved").length;

  if (loading) return <div style={S.page}><div style={{textAlign:"center",padding:40,fontSize:14,color:"#888"}}>Loading issues...</div></div>;

  return (
    <div style={S.page}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
        <div style={S.title}>Pending vs Resolved Issues</div>
        <div style={{display:"flex",gap:6}}>
          {canEdit && <button style={{padding:"5px 12px",border:"none",borderRadius:4,background:"#0b3d91",color:"#fff",fontWeight:600,fontSize:12,cursor:"pointer"}} onClick={()=>setShowForm(!showForm)}>{showForm?"Close":"+ Add"}</button>}
          {canEdit && <button style={{padding:"5px 12px",border:"none",borderRadius:4,background:"#0b3d91",color:"#fff",fontWeight:600,fontSize:12,cursor:"pointer"}} onClick={()=>setShowExcelModal(true)}>📥 Excel</button>}
        </div>
      </div>
      {showForm && canEdit ? (
        <div style={{background:"#fff",borderRadius:8,padding:"24px 32px",boxShadow:"0 1px 4px rgba(0,0,0,0.1)",maxWidth:800,margin:"0 auto"}}>
          <div style={S.sectionTitle}>New Issue</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
            <div style={S.field}><label style={S.label}>Description *</label><input style={S.input} value={form.description} onChange={e=>setForm(p=>({...p,description:e.target.value}))} /></div>
            <div style={S.field}><label style={S.label}>Raised By</label><input style={S.input} value={form.raised_by} onChange={e=>setForm(p=>({...p,raised_by:e.target.value}))} /></div>
            <div style={S.field}><label style={S.label}>Date</label><input style={S.input} type="date" value={form.date} onChange={e=>setForm(p=>({...p,date:e.target.value}))} /></div>
            <div style={S.field}><label style={S.label}>EDC</label><input style={S.input} type="date" value={form.edc} onChange={e=>setForm(p=>({...p,edc:e.target.value}))} /></div>
            <div style={S.field}><label style={S.label}>Status</label><select style={S.select} value={form.status} onChange={e=>setForm(p=>({...p,status:e.target.value}))}><option>Open</option><option>In Progress</option><option>Resolved</option></select></div>
          </div>
          <div style={{display:"flex",gap:8,marginTop:16}}>
            <button style={S.btnSm()} onClick={handleCreate}>Create</button>
            <button style={{...S.btnSm("#888")}} onClick={()=>setShowForm(false)}>Cancel</button>
          </div>
        </div>
      ) : ( <>
      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:12,marginBottom:20}}>
        {[["Total Issues",issues.length,"#0b3d91"],["Pending",pending,"#E65100"],["Resolved",resolved,"#1B5E20"]].map(([l,v,c])=>(
          <div key={l} style={{...S.card,textAlign:"center"}}>
            <div style={{fontSize:12,color:"#666",fontWeight:600}}>{l}</div>
            <div style={{fontSize:24,fontWeight:800,color:c}}>{v}</div>
          </div>
        ))}
      </div>
      <div style={S.section}>
        <table style={{width:"100%",borderCollapse:"collapse"}}>
          <thead><tr><th style={th}>#</th><th style={th}>Issue Description</th><th style={th}>Raised By</th><th style={th}>Date</th><th style={th}>EDC</th><th style={th}>Status</th>{canEdit && <th style={th}>Actions</th>}</tr></thead>
          <tbody>{issues.map((d,i)=>(
            <tr key={d.id} style={{background:i%2===0?"#fff":"#f8f9fa"}}>
              <td style={td}>{d.id}</td><td style={td}>{d.description}</td><td style={td}>{d.raised_by}</td>
              <td style={td}>{d.date ? String(d.date).slice(0,10) : ""}</td>
              <td style={{...td,fontWeight:600,color:d.status!=="Resolved"&&new Date(d.edc)<new Date()?"#e74c3c":"#333"}}>{d.edc ? String(d.edc).slice(0,10) : ""}</td>
              <td style={td}><span style={badge(d.status==="Resolved"?"#1B5E20":d.status==="In Progress"?"#1565c0":"#E65100")}>{d.status}</span></td>
              {canEdit && <td style={td}><button style={{fontSize:12,padding:"2px 8px",border:"none",borderRadius:3,background:"#ffebee",color:"#c62828",cursor:"pointer"}} onClick={()=>handleDelete(d.id)}>Del</button></td>}
            </tr>
          ))}</tbody>
        </table>
      </div>
      <ExcelUploadModal show={showExcelModal} onClose={()=>setShowExcelModal(false)} onToast={onToast} apiPreview={api.excelIssuePreview} apiImport={api.excelIssueImport} fields="pending_issue" onSuccess={()=>{load()}} />
      </> )}
    </div>
  );
}

