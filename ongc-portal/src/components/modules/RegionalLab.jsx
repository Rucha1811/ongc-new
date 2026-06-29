import { useState, useEffect } from "react";
import { api } from "../../api";
import { S, th, td, badge, C0 } from "../shared/styles";
import { DonutSimple } from "../shared/Charts";
import ExcelUploadModal from "../ExcelUploadModal";



const REL_TABS_KEY = "rel_tabs";
function getRelTabs() {
  try { const d = JSON.parse(localStorage.getItem(REL_TABS_KEY)); if (Array.isArray(d) && d.length) return d; } catch {}
  return ["Gr-I","Gr-II"];
}

export function RegionalLab({ initialTab, user, onToast }) {
  const [tabs, setTabs] = useState(getRelTabs);
  const [active, setActive] = useState(initialTab || tabs[0]);
  const [pageCats, setPageCats] = useState([]);
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showExcelModal, setShowExcelModal] = useState(false);
  const [form, setForm] = useState({ equipment:"", status:"Operational", last_calibration:"", next_due:"" });
  const [showForm, setShowForm] = useState(false);
  const canEdit = user?.role === "admin" || user?.role === "ops_manager" || user?.role === "data_creator";

  useEffect(() => {
    setActive(initialTab || tabs[0]);
  }, [initialTab]);
  useEffect(() => {
    api.getLookups("pagecat_Regional_Electronics_Lab").then(d => setPageCats(d.map(x=>x.value))).catch(() => {});
  }, []);

  useEffect(() => {
    const stored = getRelTabs();
    if (stored.length !== tabs.length || stored.some((t,i)=>t!==tabs[i])) setTabs(stored);
  }, []);

  const load = async (section) => {
    setLoading(true);
    const d = await api.listRegionalLab(section || active).catch(() => []);
    setData(d || []);
    setLoading(false);
  };
  useEffect(() => { load(active); }, [active]);

  const addTab = () => {
    const name = prompt("Enter new Lab section:");
    if (name && name.trim() && !tabs.includes(name.trim())) {
      const next = [...tabs, name.trim()];
      setTabs(next);
      localStorage.setItem(REL_TABS_KEY, JSON.stringify(next));
    }
  };

  const handleCreate = async () => {
    if (!form.equipment) { onToast?.("Equipment name required", "error"); return; }
    const fd = new FormData();
    fd.append("section", active);
    Object.entries(form).forEach(([k,v]) => { if (v) fd.append(k, v); });
    await api.createRegionalLab(fd).catch(() => { onToast?.("Failed to create", "error"); return; });
    onToast?.("Equipment record created", "success");
    setForm({ equipment:"", status:"Operational", last_calibration:"", next_due:"" });
    setShowForm(false);
    load(active);
  };

  const handleDelete = async (id) => {
    if (!confirm("Delete this record?")) return;
    await api.deleteRegionalLab(id).catch(() => { onToast?.("Failed to delete", "error"); return; });
    onToast?.("Deleted", "success");
    load(active);
  };

  const rows = data.filter(r => !r.section || r.section === active);
  const byStatus = rows.reduce((a,r)=>{a[r.status]=(a[r.status]||0)+1;return a;},{});
  const operational = rows.filter(r=>r.status==="Operational").length;
  const total = rows.length;

  if (loading) return <div style={S.page}><div style={{textAlign:"center",padding:40,fontSize:14,color:"#888"}}>Loading lab equipment...</div></div>;

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
        <div style={S.title}>Regional Electronics Lab — {active}</div>
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
          <div style={S.sectionTitle}>New Equipment Record</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:12}}>
            <div style={S.field}><label style={S.label}>Equipment *</label><input style={S.input} value={form.equipment} onChange={e=>setForm(p=>({...p,equipment:e.target.value}))} /></div>
            <div style={S.field}><label style={S.label}>Status</label><select style={S.select} value={form.status} onChange={e=>setForm(p=>({...p,status:e.target.value}))}><option>Operational</option><option>Under Repair</option><option>Decommissioned</option></select></div>
            <div style={S.field}><label style={S.label}>Last Calibration</label><input style={S.input} type="date" value={form.last_calibration} onChange={e=>setForm(p=>({...p,last_calibration:e.target.value}))} /></div>
            <div style={S.field}><label style={S.label}>Next Due</label><input style={S.input} value={form.next_due} onChange={e=>setForm(p=>({...p,next_due:e.target.value}))} /></div>
          </div>
          <div style={{display:"flex",gap:8,marginTop:16}}>
            <button style={S.btnSm()} onClick={handleCreate}>Create</button>
            <button style={{...S.btnSm("#888")}} onClick={()=>setShowForm(false)}>Cancel</button>
          </div>
        </div>
      ) : ( <>
      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10,marginBottom:16}}>
        {[["Total Equipment",total,C0.blue],["Operational",operational,C0.green],["Non-Operational",total-operational,C0.orange]].map(([l,v,c])=>(
          <div key={l} style={{background:"#fff",borderRadius:8,padding:"12px 16px",textAlign:"center",boxShadow:"0 1px 4px rgba(0,0,0,0.08)"}}>
            <div style={{fontSize:22,fontWeight:800,color:c}}>{v}</div>
            <div style={{fontSize:13,color:"#888",fontWeight:600,textTransform:"uppercase",marginTop:2}}>{l}</div>
          </div>
        ))}
      </div>

      {Object.keys(byStatus).length>0 && (
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:16}}>
          <div style={S.section}>
            <div style={S.sectionTitle}>Equipment Status</div>
            <DonutSimple data={byStatus} colors={[C0.green,C0.orange,C0.red,C0.purple]} size={120}/>
          </div>
        </div>
      )}

      <div style={S.section}>
        <div style={S.sectionTitle}>{active} Equipment Details</div>
        <table style={{width:"100%",borderCollapse:"collapse"}}>
          <thead><tr><th style={th}>Equipment</th><th style={th}>Status</th><th style={th}>Last Calibration</th><th style={th}>Next Due</th>{canEdit && <th style={th}>Actions</th>}</tr></thead>
          <tbody>{rows.map((d,i)=>(
            <tr key={d.id} style={{background:i%2===0?"#fff":"#f8f9fa"}}>
              <td style={td}>{d.equipment}</td>
              <td style={td}><span style={badge(d.status==="Operational"?"#1B5E20":d.status==="Under Repair"?"#E65100":"#666")}>{d.status}</span></td>
              <td style={td}>{d.last_calibration}</td><td style={td}>{d.next_due}</td>
              {canEdit && <td style={td}><button style={{fontSize:12,padding:"2px 8px",border:"none",borderRadius:3,background:"#ffebee",color:"#c62828",cursor:"pointer"}} onClick={()=>handleDelete(d.id)}>Del</button></td>}
            </tr>
          ))}</tbody>
        </table>
      </div>
      <ExcelUploadModal show={showExcelModal} onClose={()=>setShowExcelModal(false)} onToast={onToast} apiPreview={api.excelLabPreview} apiImport={api.excelLabImport} fields="regional_lab" onSuccess={()=>{load(active)}} />
      </> )}
    </div>
  );
}
