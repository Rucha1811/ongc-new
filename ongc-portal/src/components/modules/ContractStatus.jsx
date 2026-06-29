import { useState, useEffect } from "react";
import { api } from "../../api";
import { S, th, td, badge } from "../shared/styles";
import { MiniUpload } from "../shared/MiniUpload";
import { FileTableSection } from "../shared/FileTableSection";
import ExcelUploadModal from "../ExcelUploadModal";



export function ContractStatus({ user, onToast }) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fv, setFv] = useState(0);
  const [showUp, setShowUp] = useState(false);
  const [showExcelModal, setShowExcelModal] = useState(false);
  const [form, setForm] = useState({ contract:"", vendor:"", value:"", award_date:"", completion_date:"", status:"Ongoing" });
  const [showForm, setShowForm] = useState(false);
  const canEdit = user?.role === "admin" || user?.role === "ops_manager" || user?.role === "data_creator";

  const load = async () => {
    setLoading(true);
    const d = await api.listContractStatus().catch(() => []);
    setData(d || []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const handleCreate = async () => {
    if (!form.contract) { onToast?.("Contract name required", "error"); return; }
    const fd = new FormData();
    Object.entries(form).forEach(([k,v]) => fd.append(k, v));
    await api.createContractStatus(fd).catch(() => { onToast?.("Failed to create", "error"); return; });
    onToast?.("Contract record created", "success");
    setForm({ contract:"", vendor:"", value:"", award_date:"", completion_date:"", status:"Ongoing" });
    setShowForm(false);
    load();
  };

  const handleDelete = async (id) => {
    if (!confirm("Delete this record?")) return;
    await api.deleteContractStatus(id).catch(() => { onToast?.("Failed to delete", "error"); return; });
    onToast?.("Deleted", "success");
    load();
  };

  if (loading) return <div style={S.page}><div style={{textAlign:"center",padding:40,fontSize:14,color:"#888"}}>Loading contracts...</div></div>;

  return (
    <div style={S.page}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
        <div style={{...S.title,marginBottom:0}}>Contract / Tendering Status</div>
        <div style={{display:"flex",gap:6}}>
          {canEdit && <button style={{padding:"5px 12px",border:"none",borderRadius:4,background:"#0b3d91",color:"#fff",fontWeight:600,fontSize:12,cursor:"pointer"}} onClick={()=>setShowForm(!showForm)}>{showForm?"Close":"+ Add"}</button>}
          {canEdit && <button style={{padding:"5px 12px",border:"none",borderRadius:4,background:"#0b3d91",color:"#fff",fontWeight:600,fontSize:12,cursor:"pointer"}} onClick={()=>setShowExcelModal(true)}>📥 Excel</button>}
          <button style={{padding:"5px 12px",border:"none",borderRadius:4,background:showUp?"#e74c3c":"#0b3d91",color:"#fff",fontWeight:600,fontSize:12,cursor:"pointer"}} onClick={()=>setShowUp(!showUp)}>
            {showUp ? "Close" : "Upload"}
          </button>
        </div>
      </div>
      {showUp && <MiniUpload user={user} section="Contract / Tendering Status" fields={{contractor_name:"Vendor",project_name:"Project",season:"Period"}} onUpload={() => setFv(x=>x+1)} onToast={onToast} />}
      {showForm && canEdit ? (
        <div style={{background:"#fff",borderRadius:8,padding:"24px 32px",boxShadow:"0 1px 4px rgba(0,0,0,0.1)",maxWidth:800,margin:"0 auto"}}>
          <div style={{...S.sectionTitle,fontSize:20}}>New Contract Record</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:12}}>
            <div style={S.field}><label style={S.label}>Contract *</label><input style={S.input} value={form.contract} onChange={e=>setForm(p=>({...p,contract:e.target.value}))} /></div>
            <div style={S.field}><label style={S.label}>Vendor</label><input style={S.input} value={form.vendor} onChange={e=>setForm(p=>({...p,vendor:e.target.value}))} /></div>
            <div style={S.field}><label style={S.label}>Value</label><input style={S.input} value={form.value} onChange={e=>setForm(p=>({...p,value:e.target.value}))} /></div>
            <div style={S.field}><label style={S.label}>Award Date</label><input style={S.input} type="date" value={form.award_date} onChange={e=>setForm(p=>({...p,award_date:e.target.value}))} /></div>
            <div style={S.field}><label style={S.label}>Completion</label><input style={S.input} type="date" value={form.completion_date} onChange={e=>setForm(p=>({...p,completion_date:e.target.value}))} /></div>
            <div style={S.field}><label style={S.label}>Status</label><select style={S.select} value={form.status} onChange={e=>setForm(p=>({...p,status:e.target.value}))}><option>Ongoing</option><option>Completed</option><option>Yet to Start</option></select></div>
          </div>
          <div style={{display:"flex",gap:8,marginTop:16}}>
            <button style={S.btnSm()} onClick={handleCreate}>Create</button>
            <button style={{...S.btnSm("#888")}} onClick={()=>setShowForm(false)}>Cancel</button>
          </div>
        </div>
      ) : (
        <>
        <div style={S.section}>
        <table style={{width:"100%",borderCollapse:"collapse"}}>
          <thead><tr><th style={th}>Contract</th><th style={th}>Vendor</th><th style={th}>Value</th><th style={th}>Award Date</th><th style={th}>Completion</th><th style={th}>Status</th>{canEdit && <th style={th}>Actions</th>}</tr></thead>
          <tbody>{data.map((d,i)=>(
            <tr key={d.id} style={{background:i%2===0?"#fff":"#f8f9fa"}}>
              <td style={td}>{d.contract}</td><td style={td}>{d.vendor}</td><td style={td}>{d.value}</td>
              <td style={td}>{d.award_date}</td><td style={td}>{d.completion_date}</td>
              <td style={td}><span style={badge(d.status==="Completed"?"#1B5E20":d.status==="Ongoing"?"#1565c0":"#E65100")}>{d.status}</span></td>
              {canEdit && <td style={td}><button style={{fontSize:12,padding:"2px 8px",border:"none",borderRadius:3,background:"#ffebee",color:"#c62828",cursor:"pointer"}} onClick={()=>handleDelete(d.id)}>Del</button></td>}
            </tr>
          ))}</tbody>
        </table>
      </div>
      <FileTableSection section="Contract / Tendering Status" version={fv} />
      <ExcelUploadModal show={showExcelModal} onClose={()=>setShowExcelModal(false)} onToast={onToast} apiPreview={api.excelContractPreview} apiImport={api.excelContractImport} fields="contract_status" onSuccess={()=>{load()}} />
      </>)}
    </div>
  );
}

