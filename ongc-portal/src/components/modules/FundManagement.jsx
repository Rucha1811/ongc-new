import { useState, useEffect } from "react";
import { api } from "../../api";
import { S, th, td } from "../shared/styles";
import ExcelUploadModal from "../ExcelUploadModal";



export function FundManagement({ user, onToast }) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showExcelModal, setShowExcelModal] = useState(false);
  const [form, setForm] = useState({ head:"", allocated:"", spent:"", remaining:"" });
  const [showForm, setShowForm] = useState(false);
  const canEdit = user?.role === "admin" || user?.role === "ops_manager" || user?.role === "data_creator";

  const load = async () => {
    setLoading(true);
    const d = await api.listFundManagement().catch(() => []);
    setData(d || []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const handleCreate = async () => {
    if (!form.head) { onToast?.("Budget head required", "error"); return; }
    const fd = new FormData();
    Object.entries(form).forEach(([k,v]) => fd.append(k, v));
    await api.createFundManagement(fd).catch(() => { onToast?.("Failed to create", "error"); return; });
    onToast?.("Fund record created", "success");
    setForm({ head:"", allocated:"", spent:"", remaining:"" });
    setShowForm(false);
    load();
  };

  const handleDelete = async (id) => {
    if (!confirm("Delete this record?")) return;
    await api.deleteFundManagement(id).catch(() => { onToast?.("Failed to delete", "error"); return; });
    onToast?.("Deleted", "success");
    load();
  };

  const totalAlloc = data.reduce((s,d)=>s+Number(d.allocated||0),0);
  const totalSpent = data.reduce((s,d)=>s+Number(d.spent||0),0);
  const totalRemain = data.reduce((s,d)=>s+Number(d.remaining||0),0);

  if (loading) return <div style={S.page}><div style={{textAlign:"center",padding:40,fontSize:14,color:"#888"}}>Loading fund data...</div></div>;

  return (
    <div style={S.page}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
        <div style={S.title}>Fund Management</div>
        <div style={{display:"flex",gap:6}}>
          {canEdit && <button style={{padding:"5px 12px",border:"none",borderRadius:4,background:"#0b3d91",color:"#fff",fontWeight:600,fontSize:12,cursor:"pointer"}} onClick={()=>setShowForm(!showForm)}>{showForm?"Close":"+ Add"}</button>}
          {canEdit && <button style={{padding:"5px 12px",border:"none",borderRadius:4,background:"#0b3d91",color:"#fff",fontWeight:600,fontSize:12,cursor:"pointer"}} onClick={()=>setShowExcelModal(true)}>📥 Excel</button>}
        </div>
      </div>
      {showForm && canEdit ? (
        <div style={{background:"#fff",borderRadius:8,padding:"24px 32px",boxShadow:"0 1px 4px rgba(0,0,0,0.1)",maxWidth:800,margin:"0 auto"}}>
          <div style={{...S.sectionTitle,fontSize:20}}>New Fund Record</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr",gap:12}}>
            <div style={S.field}><label style={S.label}>Head *</label><input style={S.input} value={form.head} onChange={e=>setForm(p=>({...p,head:e.target.value}))} /></div>
            <div style={S.field}><label style={S.label}>Allocated</label><input style={S.input} type="number" step="0.01" value={form.allocated} onChange={e=>setForm(p=>({...p,allocated:e.target.value}))} /></div>
            <div style={S.field}><label style={S.label}>Spent</label><input style={S.input} type="number" step="0.01" value={form.spent} onChange={e=>setForm(p=>({...p,spent:e.target.value}))} /></div>
            <div style={S.field}><label style={S.label}>Remaining</label><input style={S.input} type="number" step="0.01" value={form.remaining} onChange={e=>setForm(p=>({...p,remaining:e.target.value}))} /></div>
          </div>
          <div style={{display:"flex",gap:8,marginTop:16}}>
            <button style={S.btnSm()} onClick={handleCreate}>Create</button>
            <button style={{...S.btnSm("#888")}} onClick={()=>setShowForm(false)}>Cancel</button>
          </div>
        </div>
      ) : (
        <>
        <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:12,marginBottom:20}}>
        {[["Total Allocated",`₹${totalAlloc.toFixed(1)} Cr`,"#0b3d91"],["Total Spent",`₹${totalSpent.toFixed(1)} Cr`,"#E65100"],["Remaining",`₹${totalRemain.toFixed(1)} Cr`,"#1B5E20"]].map(([l,v,c])=>(
          <div key={l} style={{...S.card,textAlign:"center"}}>
            <div style={{fontSize:12,color:"#666",fontWeight:600}}>{l}</div>
            <div style={{fontSize:24,fontWeight:800,color:c}}>{v}</div>
          </div>
        ))}
      </div>
      <div style={S.section}>
        <table style={{width:"100%",borderCollapse:"collapse"}}>
          <thead><tr><th style={th}>Head</th><th style={th}>Allocated (₹ Cr)</th><th style={th}>Spent (₹ Cr)</th><th style={th}>Remaining (₹ Cr)</th><th style={th}>Utilization</th>{canEdit && <th style={th}>Actions</th>}</tr></thead>
          <tbody>{data.map((d,i)=>(
            <tr key={d.id} style={{background:i%2===0?"#fff":"#f8f9fa"}}>
              <td style={td}>{d.head}</td><td style={td}>{d.allocated}</td><td style={td}>{d.spent}</td><td style={td}>{d.remaining}</td>
              <td style={td}><div style={{width:80,height:6,background:"#eee",borderRadius:3}}><div style={{width:`${(d.spent/d.allocated)*100}%`,height:6,background:d.spent/d.allocated>0.8?"#E65100":"#0b3d91",borderRadius:3}}/></div></td>
              {canEdit && <td style={td}><button style={{fontSize:12,padding:"2px 8px",border:"none",borderRadius:3,background:"#ffebee",color:"#c62828",cursor:"pointer"}} onClick={()=>handleDelete(d.id)}>Del</button></td>}
            </tr>
          ))}</tbody>
        </table>
      </div>
      <ExcelUploadModal show={showExcelModal} onClose={()=>setShowExcelModal(false)} onToast={onToast} apiPreview={api.excelFundPreview} apiImport={api.excelFundImport} fields="fund_management" onSuccess={()=>{load()}} />
      </>)}
    </div>
  );
}
