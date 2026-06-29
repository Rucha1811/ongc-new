import { useState, useEffect } from "react";
import { api } from "../../api";
import { S, th, td, badge } from "../shared/styles";
import ExcelUploadModal from "../ExcelUploadModal";



export function AWP({ user, onToast }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showExcelModal, setShowExcelModal] = useState(false);
  const [form, setForm] = useState({ activity:"", target:"", achieved:"", progress:"", deadline:"", status:"On Track" });
  const [showForm, setShowForm] = useState(false);
  const canEdit = user?.role === "admin" || user?.role === "ops_manager" || user?.role === "data_creator";

  const load = async () => {
    setLoading(true);
    const d = await api.listAWPItems().catch(() => []);
    setItems(d || []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const handleCreate = async () => {
    if (!form.activity) { onToast?.("Activity required", "error"); return; }
    const fd = new FormData();
    Object.entries(form).forEach(([k,v]) => fd.append(k, v));
    await api.createAWPItem(fd).catch(() => { onToast?.("Failed to create", "error"); return; });
    onToast?.("AWP item created", "success");
    setForm({ activity:"", target:"", achieved:"", progress:"", deadline:"", status:"On Track" });
    setShowForm(false);
    load();
  };

  const handleDelete = async (id) => {
    if (!confirm("Delete this item?")) return;
    await api.deleteAWPItem(id).catch(() => { onToast?.("Failed to delete", "error"); return; });
    onToast?.("Deleted", "success");
    load();
  };

  if (loading) return <div style={S.page}><div style={{textAlign:"center",padding:40,fontSize:14,color:"#888"}}>Loading AWP items...</div></div>;

  return (
    <div style={S.page}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
        <div style={S.title}>Annual Work Plan (AWP) - 2025-26</div>
        <div style={{display:"flex",gap:6}}>
          {canEdit && <button style={{padding:"5px 12px",border:"none",borderRadius:4,background:"#0b3d91",color:"#fff",fontWeight:600,fontSize:12,cursor:"pointer"}} onClick={()=>setShowForm(!showForm)}>{showForm?"Close":"+ Add"}</button>}
          {canEdit && <button style={{padding:"5px 12px",border:"none",borderRadius:4,background:"#0b3d91",color:"#fff",fontWeight:600,fontSize:12,cursor:"pointer"}} onClick={()=>setShowExcelModal(true)}>📥 Excel</button>}
        </div>
      </div>
      {showForm && canEdit ? (
        <div style={{background:"#fff",borderRadius:8,padding:"24px 32px",boxShadow:"0 1px 4px rgba(0,0,0,0.1)",maxWidth:800,margin:"0 auto"}}>
          <div style={S.sectionTitle}>New AWP Item</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:12}}>
            <div style={S.field}><label style={S.label}>Activity *</label><input style={S.input} value={form.activity} onChange={e=>setForm(p=>({...p,activity:e.target.value}))} /></div>
            <div style={S.field}><label style={S.label}>Target</label><input style={S.input} value={form.target} onChange={e=>setForm(p=>({...p,target:e.target.value}))} /></div>
            <div style={S.field}><label style={S.label}>Achieved</label><input style={S.input} value={form.achieved} onChange={e=>setForm(p=>({...p,achieved:e.target.value}))} /></div>
            <div style={S.field}><label style={S.label}>Progress</label><input style={S.input} value={form.progress} onChange={e=>setForm(p=>({...p,progress:e.target.value}))} placeholder="e.g. 84.4%" /></div>
            <div style={S.field}><label style={S.label}>Deadline</label><input style={S.input} type="date" value={form.deadline} onChange={e=>setForm(p=>({...p,deadline:e.target.value}))} /></div>
            <div style={S.field}><label style={S.label}>Status</label><select style={S.select} value={form.status} onChange={e=>setForm(p=>({...p,status:e.target.value}))}><option>On Track</option><option>Needs Attention</option><option>Critical</option></select></div>
          </div>
          <div style={{display:"flex",gap:8,marginTop:16}}>
            <button style={S.btnSm()} onClick={handleCreate}>Create</button>
            <button style={{...S.btnSm("#888")}} onClick={()=>setShowForm(false)}>Cancel</button>
          </div>
        </div>
      ) : ( <>
      <div style={S.section}>
        <table style={{width:"100%",borderCollapse:"collapse"}}>
          <thead><tr><th style={th}>Activity</th><th style={th}>Target</th><th style={th}>Achieved</th><th style={th}>Progress</th><th style={th}>Deadline</th><th style={th}>Status</th>{canEdit && <th style={th}>Actions</th>}</tr></thead>
          <tbody>{items.map((d,i)=>(
            <tr key={d.id} style={{background:i%2===0?"#fff":"#f8f9fa"}}>
              <td style={td}>{d.activity}</td><td style={td}>{d.target}</td><td style={td}>{d.achieved}</td>
              <td style={td}><div style={{display:"flex",alignItems:"center",gap:8}}><div style={{width:60,height:6,background:"#eee",borderRadius:3}}><div style={{width:d.progress,height:6,background:d.status==="On Track"?"#1B5E20":d.status==="Critical"?"#e74c3c":"#E65100",borderRadius:3}}/></div>{d.progress}</div></td>
              <td style={{...td,fontWeight:600,color:d.status==="Critical"?"#e74c3c":"#333"}}>{d.deadline ? String(d.deadline).slice(0,10) : ""}</td>
              <td style={td}><span style={badge(d.status==="On Track"?"#1B5E20":d.status==="Needs Attention"?"#E65100":"#e74c3c")}>{d.status}</span></td>
              {canEdit && <td style={td}><button style={{fontSize:12,padding:"2px 8px",border:"none",borderRadius:3,background:"#ffebee",color:"#c62828",cursor:"pointer"}} onClick={()=>handleDelete(d.id)}>Del</button></td>}
            </tr>
          ))}</tbody>
        </table>
      </div>
      <ExcelUploadModal show={showExcelModal} onClose={()=>setShowExcelModal(false)} onToast={onToast} apiPreview={api.excelAWPPreview} apiImport={api.excelAWPImport} fields="awp_item" onSuccess={()=>{load()}} />
      </> )}
    </div>
  );
}
