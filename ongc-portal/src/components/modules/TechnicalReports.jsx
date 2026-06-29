import { useState, useEffect } from "react";
import { api } from "../../api";
import { S, th, td, badge } from "../shared/styles";
import { MiniUpload } from "../shared/MiniUpload";
import { FileTableSection } from "../shared/FileTableSection";
import ExcelUploadModal from "../ExcelUploadModal";



export function TechnicalReports({ user, onToast }) {
  const [tabs] = useState(["Reconnaissance Reports","Project Reports","Operations Reports","Field Observer Logs"]);
  const [active, setActive] = useState("Project Reports");
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ title:"", category:"Project Reports", author:"", status:"Draft" });
  const [fv, setFv] = useState(0);
  const [pageCats, setPageCats] = useState([]);
  const canEdit = user?.role === "admin" || user?.role === "ops_manager" || user?.role === "data_creator";
  const statusOpts = ["Draft","Submitted","Under Review","Approved","Rejected"];
  const trToast = (msg, type) => { if (onToast) onToast(msg, type); else alert(msg); };
  const [showExcelReportModal, setShowExcelReportModal] = useState(false);
  const [showUp, setShowUp] = useState(false);

  const load = async () => {
    setLoading(true);
    const data = await api.listTechnicalReports().catch(() => []);
    setReports(data || []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);
  useEffect(() => { api.getLookups("pagecat_Technical_Reports").then(d => setPageCats(d.map(x=>x.value))).catch(() => {}); }, []);

  const rows = reports.filter(r => !active || r.category === active);

  const openNew = () => { setEditing(null); setForm({ title:"", category:active, author: user?.name || "", status:"Draft" }); setShowForm(true); };
  const openEdit = (r) => { setEditing(r); setForm({ title:r.title, category:r.category, author:r.author, status:r.status }); setShowForm(true); };

  const handleSave = async () => {
    if (!form.title) { onToast?.("Title is required", "error"); return; }
    if (editing) {
      await api.updateTechnicalReport(editing.id, form).catch(() => { onToast?.("Failed to update", "error"); return; });
      onToast?.("Report updated", "success");
    } else {
      await api.createTechnicalReport(form.title, form.category, form.author, form.status).catch(() => { onToast?.("Failed to create", "error"); return; });
      onToast?.("Report created", "success");
    }
    setShowForm(false); setEditing(null); load();
  };

  const handleDelete = async (id) => {
    if (!confirm("Delete this report?")) return;
    await api.deleteTechnicalReport(id).catch(() => { onToast?.("Failed to delete", "error"); return; });
    onToast?.("Report deleted", "success");
    load();
  };

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
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16, flexWrap:"wrap", gap:8 }}>
        <div style={S.title}>Technical Reports</div>
        <div style={{display:"flex",gap:6}}>
          {canEdit && <button style={{...S.btnSm(),display:"flex",alignItems:"center",gap:4}} onClick={openNew}>+ Add Report</button>}
          {canEdit && <button style={{padding:"5px 12px",border:"none",borderRadius:4,background:"#0b3d91",color:"#fff",fontWeight:600,fontSize:12,cursor:"pointer"}} onClick={()=>setShowExcelReportModal(true)}>📥 Excel</button>}
          <button style={{padding:"5px 12px",border:"none",borderRadius:4,background:showUp?"#e74c3c":"#0b3d91",color:"#fff",fontWeight:600,fontSize:12,cursor:"pointer",display:"flex",alignItems:"center",gap:4}} onClick={()=>setShowUp(!showUp)}>
            {showUp ? "Close" : "Upload"}
          </button>
        </div>
      </div>

      {showUp && <MiniUpload user={user} section="Technical Reports" fields={{title:"Report Title",author:"Author",category:"Category"}} onUpload={() => setFv(x=>x+1)} onToast={trToast} />}

      <div style={{ display:"flex", gap:4, marginBottom:16, flexWrap:"wrap" }}>
        {tabs.map(t => (
          <button key={t} style={{ padding:"6px 14px", borderRadius:4, border:"none", cursor:"pointer", fontWeight:600, fontSize:14, background:active===t?"#0b3d91":"#e0e0e0", color:active===t?"#fff":"#333" }} onClick={()=>setActive(t)}>{t}</button>
        ))}
      </div>

      {showForm && (
        <div style={{...S.section, background:"#f8faff", border:"1px solid #d0d8e8", marginBottom:16}}>
          <div style={{...S.sectionTitle, border:"none", marginBottom:12}}>{editing ? "Edit Report" : "New Report"}</div>
          <div style={{display:"flex",flexDirection:"column",gap:10}}>
            <input style={S.input} value={form.title} onChange={e=>setForm(p=>({...p,title:e.target.value}))} placeholder="Report title" />
            <div style={{display:"flex",gap:12}}>
              <div style={S.field}><label style={S.label}>Category</label><select style={S.select} value={form.category} onChange={e=>setForm(p=>({...p,category:e.target.value}))}>{tabs.map(t=><option key={t} value={t}>{t}</option>)}</select></div>
              <div style={S.field}><label style={S.label}>Author</label><input style={S.input} value={form.author} onChange={e=>setForm(p=>({...p,author:e.target.value}))} /></div>
              <div style={S.field}><label style={S.label}>Status</label><select style={S.select} value={form.status} onChange={e=>setForm(p=>({...p,status:e.target.value}))}>{statusOpts.map(s=><option key={s} value={s}>{s}</option>)}</select></div>
            </div>
            <div style={{display:"flex",gap:8}}>
              <button style={S.btnSm()} onClick={handleSave}>{editing ? "Update" : "Create"}</button>
              <button style={{...S.btnSm("#999")}} onClick={()=>{setShowForm(false);setEditing(null);}}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      <div style={S.section}>
        {rows.length === 0 ? (
          <div style={{textAlign:"center",padding:"20px",color:"#999",fontSize:13}}>No reports in this category. {canEdit && 'Click "+ Add Report" to create one.'}</div>
        ) : (
          <table style={{width:"100%",borderCollapse:"collapse"}}>
            <thead><tr><th style={th}>Report Title</th><th style={th}>Date</th><th style={th}>Author</th><th style={th}>Status</th><th style={th}>Category</th>{canEdit && <th style={th}>Actions</th>}</tr></thead>
            <tbody>{rows.map((d,i)=>(
              <tr key={d.id} style={{background:i%2===0?"#fff":"#f8f9fa"}}>
                <td style={td}>{d.title}</td><td style={td}>{d.created_at ? new Date(d.created_at).toLocaleDateString() : ""}</td><td style={td}>{d.author}</td>
                <td style={td}><span style={badge(d.status==="Approved"?"#1B5E20":d.status==="Submitted"||d.status==="Under Review"?"#1565c0":"#666")}>{d.status}</span></td>
                <td style={td}>{d.category}</td>
                {canEdit && <td style={td}><div style={{display:"flex",gap:4}}><button style={{fontSize:13,padding:"2px 8px",border:"none",borderRadius:3,background:"#e3f2fd",color:"#1565c0",cursor:"pointer"}} onClick={()=>openEdit(d)}>Edit</button><button style={{fontSize:13,padding:"2px 8px",border:"none",borderRadius:3,background:"#ffebee",color:"#c62828",cursor:"pointer"}} onClick={()=>handleDelete(d.id)}>Del</button></div></td>}
              </tr>
            ))}</tbody>
          </table>
        )}
      </div>
      <FileTableSection section="Technical Reports" version={fv} />

      <ExcelUploadModal
        show={showExcelReportModal}
        onClose={() => setShowExcelReportModal(false)}
        onToast={onToast}
        apiPreview={api.excelReportPreview}
        apiImport={api.excelReportImport}
        fields="report"
        onSuccess={() => { load(); }}
      />
    </div>
  );
}

