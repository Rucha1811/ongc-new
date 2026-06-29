import { useState, useEffect } from "react";
import { api } from "../../api";
import { S, th, badge, C0 } from "../shared/styles";
import { DonutSimple } from "../shared/Charts";
import ExcelUploadModal from "../ExcelUploadModal";



const DP_TABS_KEY = "dp_tabs";
function getDpTabs() {
  try { const d = JSON.parse(localStorage.getItem(DP_TABS_KEY)); if (Array.isArray(d) && d.length) return d; } catch {}
  return ["PG-I","PG-II"];
}

export function DataProcessing({ initialTab, user, onToast }) {
  const [tabs, setTabs] = useState(getDpTabs);
  const [active, setActive] = useState(initialTab || tabs[0]);
  const [pageCats, setPageCats] = useState([]);
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showExcelModal, setShowExcelModal] = useState(false);
  const [form, setForm] = useState({ section:"", project:"", volume:"", unit:"km²", progress:"", status:"Processing", due_date:"" });
  const [showForm, setShowForm] = useState(false);
  const canEdit = user?.role === "admin" || user?.role === "ops_manager" || user?.role === "data_creator";

  useEffect(() => {
    setActive(initialTab || tabs[0]);
  }, [initialTab]);
  useEffect(() => {
    api.getLookups("pagecat_Data_Processing").then(d => setPageCats(d.map(x=>x.value))).catch(() => {});
  }, []);

  useEffect(() => {
    const stored = getDpTabs();
    if (stored.length !== tabs.length || stored.some((t,i)=>t!==tabs[i])) setTabs(stored);
  }, []);

  const load = async (section) => {
    setLoading(true);
    const d = await api.listDataProcessing(section || active).catch(() => []);
    setData(d || []);
    setLoading(false);
  };
  useEffect(() => { load(active); }, [active]);

  const addTab = () => {
    const name = prompt("Enter new Data Processing section:");
    if (name && name.trim() && !tabs.includes(name.trim())) {
      const next = [...tabs, name.trim()];
      setTabs(next);
      localStorage.setItem(DP_TABS_KEY, JSON.stringify(next));
    }
  };

  const handleCreate = async () => {
    if (!form.project) { onToast?.("Project required", "error"); return; }
    const fd = new FormData();
    fd.append("section", active);
    Object.entries(form).forEach(([k,v]) => { if (v) fd.append(k, v); });
    await api.createDataProcessing(fd).catch(() => { onToast?.("Failed to create", "error"); return; });
    onToast?.("Record created", "success");
    setForm({ section:"", project:"", volume:"", unit:"km²", progress:"", status:"Processing", due_date:"" });
    setShowForm(false);
    load(active);
  };

  const handleDelete = async (id) => {
    if (!confirm("Delete this record?")) return;
    await api.deleteDataProcessing(id).catch(() => { onToast?.("Failed to delete", "error"); return; });
    onToast?.("Deleted", "success");
    load(active);
  };

  const rows = data.filter(r => !r.section || r.section === active);
  const byStatus = {Completed:rows.filter(r=>r.status==="Completed").length,Processing:rows.filter(r=>r.status==="Processing").length,Other:rows.filter(r=>r.status!=="Completed"&&r.status!=="Processing").length};
  const volData = rows.reduce((a,r)=>{a[r.project]=Number(r.volume||0);return a;},{});
  const volMax = Math.max(...Object.values(volData),1);

  if (loading) return <div style={S.page}><div style={{textAlign:"center",padding:40,fontSize:14,color:"#888"}}>Loading data processing...</div></div>;

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
        <div style={S.title}>Data Processing — {active}</div>
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
          <div style={{...S.sectionTitle,fontSize:20}}>New Data Processing Record</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:12}}>
            <div style={S.field}><label style={S.label}>Project *</label><input style={S.input} value={form.project} onChange={e=>setForm(p=>({...p,project:e.target.value}))} /></div>
            <div style={S.field}><label style={S.label}>Volume</label><input style={S.input} type="number" step="0.1" value={form.volume} onChange={e=>setForm(p=>({...p,volume:e.target.value}))} /></div>
            <div style={S.field}><label style={S.label}>Unit</label><input style={S.input} value={form.unit} onChange={e=>setForm(p=>({...p,unit:e.target.value}))} /></div>
            <div style={S.field}><label style={S.label}>Progress %</label><input style={S.input} type="number" value={form.progress} onChange={e=>setForm(p=>({...p,progress:e.target.value}))} /></div>
            <div style={S.field}><label style={S.label}>Status</label><select style={S.select} value={form.status} onChange={e=>setForm(p=>({...p,status:e.target.value}))}><option>Processing</option><option>Completed</option></select></div>
            <div style={S.field}><label style={S.label}>Due Date</label><input style={S.input} type="date" value={form.due_date} onChange={e=>setForm(p=>({...p,due_date:e.target.value}))} /></div>
          </div>
          <div style={{display:"flex",gap:8,marginTop:16}}>
            <button style={S.btnSm()} onClick={handleCreate}>Create</button>
            <button style={{...S.btnSm("#888")}} onClick={()=>setShowForm(false)}>Cancel</button>
          </div>
        </div>
      ) : (
        <>
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10,marginBottom:16}}>
        {[["Total Projects",rows.length,C0.blue],["Completed",byStatus.Completed,C0.green],["In Progress",byStatus.Processing,C0.orange],["Avg Progress",rows.length?Math.round(rows.reduce((s,r)=>s+Number(r.progress||0),0)/rows.length)+"%":"0%",C0.teal]].map(([l,v,c])=>(
          <div key={l} style={{background:"#fff",borderRadius:8,padding:"12px 16px",textAlign:"center",boxShadow:"0 1px 4px rgba(0,0,0,0.08)"}}>
            <div style={{fontSize:22,fontWeight:800,color:c}}>{v}</div>
            <div style={{fontSize:13,color:"#888",fontWeight:600,textTransform:"uppercase",marginTop:2}}>{l}</div>
          </div>
        ))}
      </div>

      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:16}}>
        <div style={S.section}>
          <div style={S.sectionTitle}>Volume by Project</div>
          {Object.entries(volData).length===0 ? <div style={{color:"#aaa",fontSize:12,textAlign:"center",padding:16}}>No data</div> : (
            <div>
              {Object.entries(volData).map(([k,v],i)=>(
                <div key={i} style={{marginBottom:10}}>
                  <div style={{display:"flex",justifyContent:"space-between",fontSize:14,marginBottom:2}}>
                    <span style={{color:"#555",fontWeight:600}}>{k}</span>
                    <span style={{color:"#888"}}>{v} {rows[i]?.unit||""}</span>
                  </div>
                  <div style={{height:18,background:"#f0f4f8",borderRadius:9,overflow:"hidden"}}>
                    <div style={{width:`${(v/volMax)*100}%`,height:"100%",background:C0.blue,borderRadius:9,display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontSize:13,fontWeight:700,minWidth:28,transition:"width 0.5s"}}>{v}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        <div style={S.section}>
          <div style={S.sectionTitle}>Status Distribution</div>
          <DonutSimple data={byStatus} colors={[C0.green,C0.orange,C0.red]} size={120}/>
        </div>
      </div>

      <div style={S.section}>
        <div style={S.sectionTitle}>{active} — Project Progress</div>
        {rows.length===0 ? <div style={{color:"#aaa",fontSize:13,textAlign:"center",padding:20}}>No projects in this section.</div> : (
          <div>
            {rows.map((d,i)=>(
              <div key={d.id} style={{marginBottom:16,padding:12,background:"#f8faff",borderRadius:8,border:"1px solid #e8edf5"}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
                  <span style={{fontSize:14,fontWeight:700,color:"#1a1a2e"}}>{d.project}</span>
                  <div style={{display:"flex",gap:6,alignItems:"center"}}>
                    <span style={badge(d.status==="Completed"?"#1B5E20":"#1565c0")}>{d.status}</span>
                    {canEdit && <button style={{fontSize:12,padding:"2px 8px",border:"none",borderRadius:3,background:"#ffebee",color:"#c62828",cursor:"pointer"}} onClick={()=>handleDelete(d.id)}>Del</button>}
                  </div>
                </div>
                <div style={{display:"flex",gap:16,fontSize:12,color:"#888",marginBottom:6}}>
                  <span>Volume: <strong>{d.volume} {d.unit}</strong></span>
                  <span>Due: <strong>{d.due_date}</strong></span>
                </div>
                <div style={{display:"flex",alignItems:"center",gap:8}}>
                  <div style={{flex:1,height:8,background:"#f0f4f8",borderRadius:4,overflow:"hidden"}}>
                    <div style={{width:`${d.progress}%`,height:"100%",background:d.status==="Completed"?"#1B5E20":"#0b3d91",borderRadius:4,transition:"width 0.5s"}}/>
                  </div>
                  <span style={{fontSize:12,fontWeight:700,color:d.progress===100?"#1B5E20":"#0b3d91"}}>{d.progress}%</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      <ExcelUploadModal show={showExcelModal} onClose={()=>setShowExcelModal(false)} onToast={onToast} apiPreview={api.excelDataPreview} apiImport={api.excelDataImport} fields="data_processing" onSuccess={()=>{load(active)}} />
      </>)}
    </div>
  );
}
