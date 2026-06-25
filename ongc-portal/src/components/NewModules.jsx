import { useState, useEffect } from "react";
import { api } from "../api";
import FileUploadForm from "./FileUploadForm";
import ExcelUploadModal from "./ExcelUploadModal";

const S = {
  page: { padding:0, maxWidth:"none", margin:0 },
  title: { fontSize:22, fontWeight:700, marginBottom:20, color:"#0b3d91" },
  section: { background:"#fff", borderRadius:8, padding:16, marginBottom:16, boxShadow:"0 1px 4px rgba(0,0,0,0.1)" },
  sectionTitle: { fontSize:16, fontWeight:600, marginBottom:16, paddingBottom:8, borderBottom:"1px solid #eee", color:"#333" },
  grid: { display:"grid", gridTemplateColumns:"1fr 1fr", gap:16 },
  field: { display:"flex", flexDirection:"column", gap:4 },
  label: { fontSize:15, fontWeight:600, color:"#555" },
  input: { padding:"10px 14px", border:"1px solid #d0d5dd", borderRadius:6, fontSize:16, outline:"none" },
  select: { padding:"10px 14px", border:"1px solid #d0d5dd", borderRadius:6, fontSize:16, outline:"none", background:"#fff" },
  btn: { padding:"10px 24px", border:"none", borderRadius:4, cursor:"pointer", fontSize:15, fontWeight:600 },
  btnSm: (bg) => ({ padding:"6px 14px", border:"none", borderRadius:4, cursor:"pointer", fontSize:14, fontWeight:600, background: bg||"#0b3d91", color:"#fff" }),
  card: { background:"#fff", borderRadius:8, padding:16, boxShadow:"0 1px 4px rgba(0,0,0,0.1)" },
};

const mockProjects = ["Long-Offset 2D Cambay","3D Survey Jambusar","VSP Mehsana","2D Reconnaissance Kutch","3D High-Res Ahmedabad"];
const mockBlocks = ["CB-ONHP-2022/1","CB-ONHP-2022/2","Cambay Block","Kutch Block","Mehsana Block","Ahmedabad Block"];

const th = { padding:"8px 12px", textAlign:"left", borderBottom:"2px solid #e0e4e8", fontSize:16, fontWeight:600, color:"#333", background:"#f5f7fa" };
const td = { padding:"8px 12px", borderBottom:"1px solid #f0f4f8", fontSize:16 };
const badge = (bg) => ({ padding:"2px 10px", borderRadius:4, fontSize:15, fontWeight:600, background:bg+"22", color:bg });

// ─── 1. KPI / TARGETS / AWP ───
const C2 = { blue:"#0b3d91", dark:"#1a1a2e", green:"#1B5E20", orange:"#E65100", red:"#c62828" };

export function KPITargetsAWP({ user, onToast }) {
  const [targets, setTargets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ title:"", target_value:"", unit:"SKM", section:"", fiscal_year:"", description:"" });
  const [accom, setAccom] = useState({ target_id:null, value:"", description:"" });

  const loadTargets = async () => {
    setLoading(true);
    const t = await api.listTargets().catch(() => []);
    setTargets(t || []);
    setLoading(false);
  };

  useEffect(() => { loadTargets(); }, []);

  const handleCreate = async () => {
    if (!form.title || !form.target_value) { onToast?.("Title and target value required", "error"); return; }
    await api.createTarget(form.title, Number(form.target_value), form.unit, form.section || null, form.fiscal_year || null, form.description || null).catch(() => { onToast?.("Failed to create target", "error"); return; });
    onToast?.("Target created", "success");
    setForm({ title:"", target_value:"", unit:"SKM", section:"", fiscal_year:"", description:"" });
    loadTargets();
  };

  const handleAccomplish = async () => {
    if (!accom.target_id || !accom.value) { onToast?.("Value required", "error"); return; }
    await api.addAccomplishment(accom.target_id, Number(accom.value), accom.description || null).catch(() => { onToast?.("Failed to record accomplishment", "error"); return; });
    onToast?.("Accomplishment recorded", "success");
    setAccom({ target_id:null, value:"", description:"" });
    loadTargets();
  };

  const handleDelete = async (id) => {
    if (!confirm("Delete this target?")) return;
    await api.deleteTarget(id).catch(() => { onToast?.("Failed to delete", "error"); return; });
    onToast?.("Target deleted", "success");
    loadTargets();
  };

  const totalAchieved = targets.reduce((s, t) => s + Number(t.achieved || 0), 0);
  const totalTarget = targets.reduce((s, t) => s + Number(t.target_value || 0), 0);
  const canEdit = user?.role === "admin" || user?.role === "ops_manager" || user?.role === "data_creator";
  const [showExcelTargetModal, setShowExcelTargetModal] = useState(false);

  if (loading) return <div style={S.page}><div style={{textAlign:"center",padding:40,fontSize:14,color:"#888"}}>Loading targets...</div></div>;

  const KPICard = (label, value, color) => (
    <div style={{background:"#fff",borderRadius:8,padding:"16px 20px",boxShadow:"0 1px 4px rgba(0,0,0,0.1)",textAlign:"center"}}>
      <div style={{fontSize:28,fontWeight:700,color}}>{value}</div>
      <div style={{fontSize:12,color:"#888",marginTop:4}}>{label}</div>
    </div>
  );

  return (
    <div style={S.page}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:8}}>
        <div style={S.title}>KPI / Targets / AWP</div>
        {canEdit && <button style={{padding:"5px 12px",border:"none",borderRadius:4,background:"#0b3d91",color:"#fff",fontWeight:600,fontSize:12,cursor:"pointer"}} onClick={()=>setShowExcelTargetModal(true)}>📥 Excel</button>}
      </div>

      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:12,marginBottom:20}}>
        {KPICard("Total Targets", targets.length, C2.blue)}
        {KPICard("Target Volume", totalTarget.toLocaleString(), C2.orange)}
        {KPICard("Achieved", totalAchieved.toLocaleString(), C2.green)}
      </div>

      {targets.length > 0 && (
        <div style={S.section}>
          <div style={S.sectionTitle}>Goal vs Accomplishment</div>
          {targets.map(t => {
            const maxVal = Math.max(Number(t.target_value) || 1, Number(t.achieved) || 1);
            const goalH = (Number(t.target_value) / maxVal) * 120;
            const achH = (Number(t.achieved) / maxVal) * 120;
            return (
              <div key={t.id} style={{marginBottom:24,display:"flex",alignItems:"center",gap:16}}>
                <div style={{minWidth:140,flexShrink:0}}>
                  <div style={{fontSize:13,fontWeight:600,color:"#333"}}>{t.title}</div>
                  {t.section && <div style={{fontSize:13,color:"#888"}}>{t.section}</div>}
                </div>
                <svg width={90} height={140} viewBox="0 0 90 140">
                  <text x={20} y={135} textAnchor="middle" fontSize={10} fill="#c62828">Goal</text>
                  <text x={70} y={135} textAnchor="middle" fontSize={10} fill="#1B5E20">Done</text>
                  <rect x={10} y={130 - goalH} width={20} height={goalH} fill="#c62828" rx={3} />
                  <rect x={60} y={130 - achH} width={20} height={achH} fill="#1B5E20" rx={3} />
                  <text x={20} y={130 - goalH - 4} textAnchor="middle" fontSize={9} fontWeight={700} fill="#c62828">{t.target_value}</text>
                  <text x={70} y={130 - achH - 4} textAnchor="middle" fontSize={9} fontWeight={700} fill="#1B5E20">{t.achieved}</text>
                </svg>
              </div>
            );
          })}
        </div>
      )}

      {canEdit && (
        <div style={S.section}>
          <div style={S.sectionTitle}>Create New Target</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:12}}>
            <div style={S.field}><label style={S.label}>Title *</label><input style={S.input} value={form.title} onChange={e=>setForm(p=>({...p,title:e.target.value}))} placeholder="Target title" /></div>
            <div style={S.field}><label style={S.label}>Value *</label><input style={S.input} type="number" value={form.target_value} onChange={e=>setForm(p=>({...p,target_value:e.target.value}))} placeholder="500" /></div>
            <div style={S.field}><label style={S.label}>Unit</label><input style={S.input} value={form.unit} onChange={e=>setForm(p=>({...p,unit:e.target.value}))} placeholder="SKM" /></div>
            <div style={S.field}><label style={S.label}>Section</label><input style={S.input} value={form.section} onChange={e=>setForm(p=>({...p,section:e.target.value}))} placeholder="GP-03" /></div>
            <div style={S.field}><label style={S.label}>Fiscal Year</label><input style={S.input} value={form.fiscal_year} onChange={e=>setForm(p=>({...p,fiscal_year:e.target.value}))} placeholder="2025-26" /></div>
            <div style={S.field}><label style={S.label}>Description</label><input style={S.input} value={form.description} onChange={e=>setForm(p=>({...p,description:e.target.value}))} placeholder="Optional description" /></div>
          </div>
          <button style={{...S.btnSm(),marginTop:12}} onClick={handleCreate}>Create Target</button>
        </div>
      )}

      {targets.length > 0 && (
        <div style={S.section}>
          <div style={S.sectionTitle}>Targets &amp; Accomplishments</div>
          {targets.map(t => {
            const pct = Math.min(t.pct, 100);
            const barColor = pct >= 100 ? C2.green : pct >= 75 ? C2.orange : C2.red;
            return (
              <div key={t.id} style={{marginBottom:20,padding:16,background:"#f8faff",borderRadius:8,border:"1px solid #e8edf5"}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:8,flexWrap:"wrap",gap:8}}>
                  <div>
                    <span style={{fontSize:15,fontWeight:700,color:C2.dark}}>{t.title}</span>
                    {t.section && <span style={{fontSize:14,color:"#888",marginLeft:8}}>{t.section}</span>}
                    {t.fiscal_year && <span style={{fontSize:14,color:"#aaa",marginLeft:6}}>({t.fiscal_year})</span>}
                  </div>
                  <div style={{display:"flex",gap:8,alignItems:"center"}}>
                    <span style={{fontSize:12,color:"#666"}}>by {t.created_by_name || "—"}</span>
                    {canEdit && <button style={{fontSize:13,padding:"2px 8px",border:"none",borderRadius:3,background:"#ffebee",color:"#c62828",cursor:"pointer"}} onClick={()=>handleDelete(t.id)}>Delete</button>}
                  </div>
                </div>
                {t.description && <div style={{fontSize:12,color:"#666",marginBottom:8}}>{t.description}</div>}
                <div style={{marginBottom:6}}>
                  <div style={{display:"flex",justifyContent:"space-between",fontSize:14,marginBottom:2}}>
                    <span style={{fontWeight:600,color:"#555"}}>{t.achieved} / {t.target_value} {t.unit}</span>
                    <span style={{fontWeight:700,color:barColor}}>{t.pct}%</span>
                  </div>
                  <div style={{height:8,background:"#f0f4f8",borderRadius:4,overflow:"hidden"}}>
                    <div style={{width:`${pct}%`,height:"100%",background:barColor,borderRadius:4,transition:"width 0.5s"}} />
                  </div>
                </div>
                {t.accomplishments && t.accomplishments.length > 0 && (
                  <div style={{marginTop:10}}>
                    <div style={{fontSize:12,fontWeight:600,color:"#555",marginBottom:6}}>Accomplishments</div>
                    <table style={{width:"100%",borderCollapse:"collapse",fontSize:14}}>
                      <thead>
                        <tr>
                          <th style={{textAlign:"left",padding:"4px 8px",borderBottom:"1px solid #e0e0e0",color:"#888"}}>#</th>
                          <th style={{textAlign:"left",padding:"4px 8px",borderBottom:"1px solid #e0e0e0",color:"#888"}}>Value</th>
                          <th style={{textAlign:"left",padding:"4px 8px",borderBottom:"1px solid #e0e0e0",color:"#888"}}>Description</th>
                          <th style={{textAlign:"left",padding:"4px 8px",borderBottom:"1px solid #e0e0e0",color:"#888"}}>Recorded By</th>
                          <th style={{textAlign:"left",padding:"4px 8px",borderBottom:"1px solid #e0e0e0",color:"#888"}}>Date</th>
                        </tr>
                      </thead>
                      <tbody>
                        {t.accomplishments.map((a, i) => (
                          <tr key={a.id}>
                            <td style={{padding:"4px 8px",borderBottom:"1px solid #f0f0f0"}}>{i + 1}</td>
                            <td style={{padding:"4px 8px",borderBottom:"1px solid #f0f0f0",fontWeight:600}}>{a.value}</td>
                            <td style={{padding:"4px 8px",borderBottom:"1px solid #f0f0f0",color:"#555"}}>{a.description || "—"}</td>
                            <td style={{padding:"4px 8px",borderBottom:"1px solid #f0f0f0"}}>{a.recorded_by_name || "—"}</td>
                            <td style={{padding:"4px 8px",borderBottom:"1px solid #f0f0f0"}}>{a.recorded_at ? a.recorded_at.slice(0, 10) : "—"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {canEdit && targets.length > 0 && (
        <div style={S.section}>
          <div style={S.sectionTitle}>Record Accomplishment</div>
          <div style={{display:"flex",gap:12,alignItems:"end",flexWrap:"wrap"}}>
            <div style={S.field}>
              <label style={S.label}>Target</label>
              <select style={S.select} value={accom.target_id||""} onChange={e=>setAccom(p=>({...p,target_id:Number(e.target.value)}))}>
                <option value="">Select target...</option>
                {targets.map(t => <option key={t.id} value={t.id}>{t.title}</option>)}
              </select>
            </div>
            <div style={S.field}><label style={S.label}>Value *</label><input style={S.input} type="number" value={accom.value} onChange={e=>setAccom(p=>({...p,value:e.target.value}))} placeholder="50" /></div>
            <div style={S.field}><label style={S.label}>Description</label><input style={S.input} value={accom.description} onChange={e=>setAccom(p=>({...p,description:e.target.value}))} placeholder="e.g. Q1 progress" /></div>
            <button style={S.btnSm()} onClick={handleAccomplish}>Record</button>
          </div>
        </div>
      )}

      {targets.length === 0 && !loading && (
        <div style={{textAlign:"center",padding:"40px 20px",color:"#999",fontSize:14}}>No targets created yet. {canEdit ? "Use the form above to create one." : "Contact an admin to set targets."}</div>
      )}

      <ExcelUploadModal
        show={showExcelTargetModal}
        onClose={() => setShowExcelTargetModal(false)}
        onToast={onToast}
        apiPreview={api.excelTargetPreview}
        apiImport={api.excelTargetImport}
        fields="target"
        onSuccess={() => { loadTargets(); }}
      />
    </div>
  );
}

// ─── REUSABLE FILE TABLE WITH FILTERS ───
function FileTableSection({ section, projectName, version = 0 }) {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [f, setF] = useState({ season:"", category:"", classification:"", status:"", file_type:"", data_type:"", block:"", search:"", sortBy:"name", sortDir:"asc" });
  const [searchResults, setSearchResults] = useState(null);
  const [searching, setSearching] = useState(false);
  const [lookups, setLookups] = useState({ seasons:[], categories:[], blocks:[], fileTypes:[], dataTypes:[] });
  const sel = { padding:"8px 14px", border:"1px solid #d0d5dd", borderRadius:6, fontSize:15, outline:"none", background:"#fff", color:"#333" };

  const load = async () => {
    setLoading(true);
    try {
      const p = {};
      if (section && section !== "all") p.section = section;
      if (projectName) p.project_name = projectName;
      const d = await api.searchFiles(p);
      setFiles(Array.isArray(d) ? d : []);
      setSearchResults(null);
    } catch { setFiles([]); }
    setLoading(false);
  };
  useEffect(() => { load(); }, [section, projectName, version]);

  useEffect(() => {
    Promise.all([
      api.getLookups("season").then(r => (r||[]).map(x=>x.value)).catch(() => []),
      api.getLookups("category").then(r => (r||[]).map(x=>x.value)).catch(() => []),
      api.getLookups("block").then(r => (r||[]).map(x=>x.value)).catch(() => []),
      api.getLookups("file_type").then(r => (r||[]).map(x=>x.value)).catch(() => []),
      api.getLookups("data_type").then(r => (r||[]).map(x=>x.value)).catch(() => []),
    ]).then(([seasons, categories, blocks, fileTypes, dataTypes]) => {
      setLookups({ seasons, categories, blocks, fileTypes, dataTypes });
    });
  }, []);

  const handleSearch = async () => {
    if (!f.search.trim()) { setSearchResults(null); return; }
    setSearching(true);
    try {
      const p = { search: f.search.trim() };
      if (section && section !== "all") p.section = section;
      if (projectName) p.project_name = projectName;
      const d = await api.searchFiles(p);
      setSearchResults(d || []);
    } catch { setSearchResults([]); }
    setSearching(false);
  };

  const src = searchResults || files;
  const classifs = [...new Set(files.map(x => x.classification).filter(Boolean))].sort();
  const statuses = [...new Set(files.map(x => x.status).filter(Boolean))].sort();
  const allSeasons = [...new Set([...lookups.seasons, ...files.map(x=>x.season).filter(Boolean)])].sort();
  const allCategories = [...new Set([...lookups.categories, ...files.map(x=>x.category).filter(Boolean)])].sort();
  const allBlocks = [...new Set([...lookups.blocks, ...files.map(x=>x.block).filter(Boolean)])].sort();
  const allFileTypes = [...new Set([...lookups.fileTypes, ...files.map(x=>x.file_type).filter(Boolean)])].sort();
  const allDataTypes = [...new Set([...lookups.dataTypes, ...files.map(x=>x.data_type).filter(Boolean)])].sort();

  const displayed = src.filter(x => {
    if (f.status && x.status !== f.status) return false;
    if (f.season && x.season !== f.season) return false;
    if (f.category && x.category !== f.category) return false;
    if (f.classification && x.classification !== f.classification) return false;
    if (f.file_type && x.file_type !== f.file_type) return false;
    if (f.data_type && x.data_type !== f.data_type) return false;
    if (f.block && x.block !== f.block) return false;
    return true;
  }).sort((a, b) => {
    const d = f.sortDir === "desc" ? -1 : 1;
    const g = (x, k) => {
      if (k==="name") return (x.file_name||"").toLowerCase();
      if (k==="project") return (x.project_name||"").toLowerCase();
      if (k==="type") return (x.file_type||"").toLowerCase();
      if (k==="category") return (x.category||"").toLowerCase();
      if (k==="season") return (x.season||"");
      if (k==="classification") return (x.classification||"");
      if (k==="status") return (x.status||"");
      if (k==="date") return x.created_at||x.upload_date||"";
      return "";
    };
    const va = g(a, f.sortBy), vb = g(b, f.sortBy);
    return va < vb ? -1*d : va > vb ? 1*d : 0;
  });

  const byCategory = files.reduce((a,x)=>{const c=x.category||"Uncategorized";a[c]=(a[c]||0)+1;return a;},{});
  const byType = files.reduce((a,x)=>{const t=x.file_type||"Unknown";a[t]=(a[t]||0)+1;return a;},{});
  const byStatus = {Approved:files.filter(x=>x.status==="Approved").length,Pending:files.filter(x=>x.status==="Pending").length,Rejected:files.filter(x=>x.status==="Rejected").length};
  const byClassification = files.reduce((a,x)=>{const c=x.classification||"Unclassified";a[c]=(a[c]||0)+1;return a;},{});
  const sortToggle = (k) => setF(p => ({ ...p, sortBy: k, sortDir: p.sortBy===k && p.sortDir==="asc" ? "desc" : "asc" }));
  const sortArrow = (k) => f.sortBy===k ? (f.sortDir==="asc" ? " ▲" : " ▼") : "";
  const thS = (k, l) => (
    <th style={{padding:"10px 14px",borderBottom:"2px solid #e0e4e8",fontWeight:600,color:"#333",background:"#f5f7fa",fontSize:15,cursor:"pointer",userSelect:"none",whiteSpace:"nowrap"}}
      onClick={() => sortToggle(k)}>{l}{sortArrow(k)}</th>
  );

  return (
    <div style={S.section}>
      <div style={S.sectionTitle}>Uploaded Files ({files.length})</div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10,marginBottom:16}}>
        {[["Total Files",files.length,C0.blue],["Approved",byStatus.Approved,C0.green],["Pending",byStatus.Pending,C0.orange],["Rejected",byStatus.Rejected,C0.red]].map(([l,v,c])=>(
          <div key={l} style={{background:"#f9fafb",borderRadius:8,padding:"10px 16px",textAlign:"center"}}>
            <div style={{fontSize:20,fontWeight:800,color:c}}>{v}</div>
            <div style={{fontSize:13,color:"#888",fontWeight:600,textTransform:"uppercase",marginTop:2}}>{l}</div>
          </div>
        ))}
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:16}}>
        <div><div style={{fontSize:15,fontWeight:600,color:"#333",marginBottom:8}}>Files by Category</div><DonutSimple data={byCategory} colors={COL0} size={120}/></div>
        <div><div style={{fontSize:15,fontWeight:600,color:"#333",marginBottom:8}}>Status Distribution</div><DonutSimple data={byStatus} colors={[C0.green,C0.orange,C0.red]} size={120}/></div>
        <div><div style={{fontSize:15,fontWeight:600,color:"#333",marginBottom:8}}>Files by Type</div><DonutSimple data={byType} colors={COL0} size={120}/></div>
        <div><div style={{fontSize:15,fontWeight:600,color:"#333",marginBottom:8}}>Classification Breakdown</div><DonutSimple data={byClassification} colors={COL0} size={120}/></div>
      </div>
      <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:12,alignItems:"center"}}>
        <input style={{...S.input,width:200,fontSize:16}} placeholder="Keyword / semantic search…" value={f.search}
          onChange={e => setF(p=>({...p,search:e.target.value}))}
          onKeyDown={e => e.key==="Enter" && handleSearch()} />
        <button style={{padding:"8px 16px",border:"none",borderRadius:4,cursor:"pointer",fontSize:14,fontWeight:600,background:"#0b3d91",color:"#fff"}} onClick={handleSearch}>
          {searching ? "…" : "Search"}
        </button>
        {searchResults && <button style={{padding:"8px 16px",border:"1px solid #ddd",borderRadius:4,cursor:"pointer",fontSize:14,background:"#fff",color:"#666"}}
          onClick={() => { setF(p=>({...p,search:""})); setSearchResults(null); }}>Clear</button>}
        <select style={sel} value={f.season} onChange={e => setF(p=>({...p,season:e.target.value}))}>
          <option value="">All Seasons</option>
          {allSeasons.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <select style={sel} value={f.category} onChange={e => setF(p=>({...p,category:e.target.value}))}>
          <option value="">All Categories</option>
          {allCategories.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <select style={sel} value={f.classification} onChange={e => setF(p=>({...p,classification:e.target.value}))}>
          <option value="">All Classifications</option>
          {classifs.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <select style={sel} value={f.status} onChange={e => setF(p=>({...p,status:e.target.value}))}>
          <option value="">All Status</option>
          {statuses.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <select style={sel} value={f.file_type} onChange={e => setF(p=>({...p,file_type:e.target.value}))}>
          <option value="">All File Types</option>
          {allFileTypes.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <select style={sel} value={f.data_type} onChange={e => setF(p=>({...p,data_type:e.target.value}))}>
          <option value="">All Data Types</option>
          {allDataTypes.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <select style={sel} value={f.block} onChange={e => setF(p=>({...p,block:e.target.value}))}>
          <option value="">All Blocks</option>
          {allBlocks.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <select style={sel} value={f.sortBy} onChange={e => setF(p=>({...p,sortBy:e.target.value}))}>
          <option value="name">Sort: Name</option><option value="date">Sort: Date</option>
          <option value="project">Sort: Project</option><option value="type">Sort: Type</option>
          <option value="category">Sort: Category</option><option value="season">Sort: Season</option>
          <option value="classification">Sort: Classification</option><option value="status">Sort: Status</option>
        </select>
        <button style={{...sel,cursor:"pointer"}} onClick={() => setF(p=>({...p,sortDir:p.sortDir==="asc"?"desc":"asc"}))}>
          {f.sortDir === "asc" ? "↑ Asc" : "↓ Desc"}
        </button>
      </div>

      {searchResults !== null && (
        <div style={{fontSize:14,color:"#666",marginBottom:8}}>
          Search results: {searchResults.length} file{searchResults.length!==1?"s":""} found — includes exact + semantic matches
        </div>
      )}

      {loading || searching ? (
        <div style={{textAlign:"center",padding:20,color:"#888",fontSize:15}}>Loading files...</div>
      ) : displayed.length === 0 ? (
        <div style={{textAlign:"center",padding:20,color:"#999",fontSize:15}}>No files found.</div>
      ) : (
        <div style={{overflowX:"auto"}}>
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:12,minWidth:700}}>
            <thead><tr>
              {thS("name","File Name")}{thS("project","Project")}{thS("category","Category")}{thS("type","Type")}
              {thS("classification","Classification")}{thS("season","Season")}{thS("status","Status")}{thS("date","Uploaded")}
            </tr></thead>
            <tbody>
              {displayed.map((x,i) => (
                <tr key={x.id} style={{background:i%2===0?"#fff":"#f8f9fa",borderBottom:"1px solid #f0f4f8"}}>
                  <td style={{padding:"10px 14px",fontWeight:500,color:"#0b3d91"}}>
                    {x.file_name}
                    {x.snippet && (() => { const isExact = !x.snippet.startsWith("["); const text = x.snippet.replace(/^\[(semantic|vector)\]\s*/,""); return <div style={{fontSize:13,color:"#555",marginTop:3,padding:"3px 6px",background:"#fafafa",borderRadius:4,borderLeft:"3px solid #90caf9",lineHeight:1.3,fontWeight:400}}><span style={{fontSize:14,fontWeight:700,padding:"1px 5px",borderRadius:3,marginRight:6,background:isExact?"#e3f2fd":"#e8f5e9",color:isExact?"#1565c0":"#2e7d32"}}>{isExact?"Exact":"Related"}</span>{text}</div>; })()}
                  </td>
                  <td style={{padding:"10px 14px",color:"#555"}}>{x.project_name || "—"}</td>
                  <td style={{padding:"10px 14px",color:"#555"}}>{x.category || "—"}</td>
                  <td style={{padding:"10px 14px"}}><span style={{background:"#E3F2FD",color:"#1565c0",padding:"2px 6px",borderRadius:4,fontWeight:700,fontSize:13}}>{x.file_type || "—"}</span></td>
                  <td style={{padding:"10px 14px"}}><span style={badge(x.classification||"Unclassified")}>{x.classification||"Unclassified"}</span></td>
                  <td style={{padding:"10px 14px",color:"#555",fontSize:14}}>{x.season || "—"}</td>
                  <td style={{padding:"10px 14px"}}><span style={badge(x.status==="Approved"?"#1B5E20":x.status==="Pending"?"#E65100":"#C62828")}>{x.status||"—"}</span></td>
                  <td style={{padding:"10px 14px",color:"#777",fontSize:14,whiteSpace:"nowrap"}}>
                    {x.created_at ? new Date(x.created_at).toLocaleDateString() : x.upload_date ? new Date(x.upload_date).toLocaleDateString() : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

const DOC_TYPES = ["Report","Data Set","Invoice","Contract","Technical Document","Administrative","Other"];
const CLASSIFICATION_OPTS = ["General / Available for All","Sensitive / Internal Use","Confidential","Highly Confidential / Restricted"];

function MiniUpload({ user, fields, section, onUpload, onToast }) {
  const [file, setFile] = useState(null);
  const [vals, setVals] = useState({});
  const [docType, setDocType] = useState("");
  const [classification, setClassification] = useState("");
  const [description, setDescription] = useState("");
  const [uploading, setUploading] = useState(false);
  const toast = (m,t) => { if (onToast) onToast(m,t); else alert(m); };
  const canUpload = user?.role === "admin" || user?.role === "ops_manager" || user?.role === "data_creator";
  if (!canUpload) return null;

  const handle = async () => {
    if (!file) { toast("Select a file", "error"); return; }
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("file_name", file.name);
      fd.append("file_type", file.name.split(".").pop().toUpperCase());
      fd.append("section", section);
      fd.append("classification", classification || "General / Available for All");
      fd.append("doc_type", docType);
      fd.append("description", description);
      for (const k of Object.keys(fields)) {
        if (vals[k]) fd.append(k, vals[k]);
      }
      await api.uploadFile(fd);
      toast("Uploaded successfully", "success");
      setFile(null);
      setVals({});
      setDocType("");
      setClassification("");
      setDescription("");
      onUpload?.();
    } catch(e) {
      toast(e.message || "Upload failed", "error");
    }
    setUploading(false);
  };

  return (
    <div style={{background:"#f8faff",borderRadius:8,padding:16,marginBottom:20,border:"1px solid #d0d8e8"}}>
      <div style={{fontSize:14,fontWeight:600,marginBottom:12,paddingBottom:6,borderBottom:"1px solid #e0e4e8",color:"#333"}}>
        Upload Document — {section}
      </div>
      <div style={{display:"flex",flexWrap:"wrap",gap:10}}>
        <div style={{display:"flex",flexDirection:"column",gap:2,minWidth:160,flex:1}}>
          <label style={{fontSize:14,fontWeight:600,color:"#555"}}>File *</label>
          <input type="file" style={{padding:"6px 0",fontSize:15}} onChange={e=>setFile(e.target.files?.[0]||null)} />
        </div>
        <div style={{display:"flex",flexDirection:"column",gap:2,minWidth:140}}>
          <label style={{fontSize:14,fontWeight:600,color:"#555"}}>Document Type</label>
          <select style={{padding:"6px 10px",border:"1px solid #ddd",borderRadius:4,fontSize:15,background:"#fff"}} value={docType} onChange={e=>setDocType(e.target.value)}>
            <option value="">— Select —</option>
            {DOC_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div style={{display:"flex",flexDirection:"column",gap:2,minWidth:120}}>
          <label style={{fontSize:14,fontWeight:600,color:"#555"}}>Classification</label>
          <select style={{padding:"6px 10px",border:"1px solid #ddd",borderRadius:4,fontSize:15,background:"#fff"}} value={classification} onChange={e=>setClassification(e.target.value)}>
            <option value="">— Select —</option>
            {CLASSIFICATION_OPTS.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        {Object.entries(fields).map(([key, label]) => (
          <div key={key} style={{display:"flex",flexDirection:"column",gap:2,minWidth:130}}>
            <label style={{fontSize:14,fontWeight:600,color:"#555"}}>{label}</label>
            <input style={{padding:"6px 10px",border:"1px solid #ddd",borderRadius:4,fontSize:15}} value={vals[key]||""} onChange={e=>setVals(p=>({...p,[key]:e.target.value}))} />
          </div>
        ))}
        <div style={{display:"flex",flexDirection:"column",gap:2,minWidth:"100%"}}>
          <label style={{fontSize:14,fontWeight:600,color:"#555"}}>Description / Remarks</label>
          <textarea style={{padding:"6px 10px",border:"1px solid #ddd",borderRadius:4,fontSize:15,resize:"vertical",minHeight:50}} value={description} onChange={e=>setDescription(e.target.value)} placeholder="Brief description of the document..." rows={2} />
        </div>
      </div>
      <div style={{marginTop:12,display:"flex",gap:8}}>
        <button style={{padding:"7px 18px",border:"none",borderRadius:4,background:"#0b3d91",color:"#fff",fontWeight:600,fontSize:15,cursor:"pointer",opacity:uploading||!file?0.6:1}} disabled={uploading||!file} onClick={handle}>
          {uploading ? "Uploading..." : "Upload File"}
        </button>
        <span style={{fontSize:14,color:"#999",alignSelf:"center"}}>Uploaded by: {user?.name || user?.cpf || "—"}</span>
      </div>
    </div>
  );
}

// ─── 2. PROGRESS REPORT ───
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

// ─── 3. MANPOWER STATUS ───
export function ManpowerStatus({ user, onToast }) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fv, setFv] = useState(0);
  const [showUp, setShowUp] = useState(false);
  const [showExcelModal, setShowExcelModal] = useState(false);
  const [form, setForm] = useState({ category:"", total:"", deployed:"", on_leave:"", training:"" });
  const [showForm, setShowForm] = useState(false);
  const canEdit = user?.role === "admin" || user?.role === "ops_manager" || user?.role === "data_creator";

  const load = async () => {
    setLoading(true);
    const d = await api.listManpowerStatus().catch(() => []);
    setData(d || []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const handleCreate = async () => {
    if (!form.category) { onToast?.("Category required", "error"); return; }
    const fd = new FormData();
    Object.entries(form).forEach(([k,v]) => fd.append(k, v));
    await api.createManpowerStatus(fd).catch(() => { onToast?.("Failed to create", "error"); return; });
    onToast?.("Manpower record created", "success");
    setForm({ category:"", total:"", deployed:"", on_leave:"", training:"" });
    setShowForm(false);
    load();
  };

  const handleDelete = async (id) => {
    if (!confirm("Delete this record?")) return;
    await api.deleteManpowerStatus(id).catch(() => { onToast?.("Failed to delete", "error"); return; });
    onToast?.("Deleted", "success");
    load();
  };

  if (loading) return <div style={S.page}><div style={{textAlign:"center",padding:40,fontSize:14,color:"#888"}}>Loading manpower data...</div></div>;

  return (
    <div style={S.page}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
        <div style={{...S.title,marginBottom:0}}>Manpower Status</div>
        <div style={{display:"flex",gap:6}}>
          {canEdit && <button style={{padding:"5px 12px",border:"none",borderRadius:4,background:"#0b3d91",color:"#fff",fontWeight:600,fontSize:12,cursor:"pointer"}} onClick={()=>setShowForm(!showForm)}>{showForm?"Close":"+ Add"}</button>}
          {canEdit && <button style={{padding:"5px 12px",border:"none",borderRadius:4,background:"#0b3d91",color:"#fff",fontWeight:600,fontSize:12,cursor:"pointer"}} onClick={()=>setShowExcelModal(true)}>📥 Excel</button>}
          <button style={{padding:"5px 12px",border:"none",borderRadius:4,background:showUp?"#e74c3c":"#0b3d91",color:"#fff",fontWeight:600,fontSize:12,cursor:"pointer"}} onClick={()=>setShowUp(!showUp)}>
            {showUp ? "Close" : "Upload"}
          </button>
        </div>
      </div>
      {showUp && <MiniUpload user={user} section="Manpower Status" fields={{category:"Category",season:"Period",remarks:"Remarks"}} onUpload={() => setFv(x=>x+1)} onToast={onToast} />}
      {showForm && canEdit ? (
        <div style={{background:"#fff",borderRadius:8,padding:"24px 32px",boxShadow:"0 1px 4px rgba(0,0,0,0.1)",maxWidth:800,margin:"0 auto"}}>
          <div style={{...S.sectionTitle,fontSize:20}}>New Manpower Record</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:12}}>
            <div style={S.field}><label style={S.label}>Category *</label><input style={S.input} value={form.category} onChange={e=>setForm(p=>({...p,category:e.target.value}))} /></div>
            <div style={S.field}><label style={S.label}>Total</label><input style={S.input} type="number" value={form.total} onChange={e=>setForm(p=>({...p,total:e.target.value}))} /></div>
            <div style={S.field}><label style={S.label}>Deployed</label><input style={S.input} type="number" value={form.deployed} onChange={e=>setForm(p=>({...p,deployed:e.target.value}))} /></div>
            <div style={S.field}><label style={S.label}>On Leave</label><input style={S.input} type="number" value={form.on_leave} onChange={e=>setForm(p=>({...p,on_leave:e.target.value}))} /></div>
            <div style={S.field}><label style={S.label}>Training</label><input style={S.input} type="number" value={form.training} onChange={e=>setForm(p=>({...p,training:e.target.value}))} /></div>
          </div>
          <div style={{display:"flex",gap:8,marginTop:16}}>
            <button style={S.btnSm()} onClick={handleCreate}>Create</button>
            <button style={{...S.btnSm("#888")}} onClick={()=>setShowForm(false)}>Cancel</button>
          </div>
        </div>
      ) : (
        <>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
        {data.map((d,i)=>(
          <div key={d.id} style={S.card}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
              <div style={{fontSize:14,fontWeight:700,color:"#0b3d91"}}>{d.category}</div>
              {canEdit && <button style={{fontSize:12,padding:"2px 8px",border:"none",borderRadius:3,background:"#ffebee",color:"#c62828",cursor:"pointer"}} onClick={()=>handleDelete(d.id)}>Del</button>}
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,fontSize:13}}>
              <div><strong>Total:</strong> {d.total}</div>
              <div><strong>Deployed:</strong> {d.deployed}</div>
              <div><strong>On Leave:</strong> {d.on_leave}</div>
              <div><strong>Training:</strong> {d.training}</div>
            </div>
            <div style={{marginTop:8,height:6,background:"#eee",borderRadius:3}}>
              <div style={{width:`${(d.deployed/d.total)*100}%`,height:6,background:d.deployed/d.total>0.8?"#1B5E20":"#E65100",borderRadius:3}}/>
            </div>
          </div>
        ))}
      </div>
      <FileTableSection section="Manpower Status" version={fv} />
      <ExcelUploadModal show={showExcelModal} onClose={()=>setShowExcelModal(false)} onToast={onToast} apiPreview={api.excelManpowerPreview} apiImport={api.excelManpowerImport} fields="manpower_status" onSuccess={()=>{load()}} />
      </>)}
    </div>
  );
}

// ─── 4. CONTRACT / TENDERING STATUS ───
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

// ─── 5. FUND MANAGEMENT ───
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

// ─── 6. OPERATIONS (shows uploaded files per section) ───
const OPS_TABS_KEY = "ops_tabs";
function getOpsTabs() {
  try { const d = JSON.parse(localStorage.getItem(OPS_TABS_KEY)); if (Array.isArray(d) && d.length) return d; } catch {}
  return ["Base Office","Contracts","HSE","GP-03","GP-06"];
}
const C0 = { blue:"#1565C0", green:"#2E7D32", orange:"#E65100", red:"#C62828", purple:"#6A1B9A", teal:"#00838F" };
const COL0 = [C0.blue, C0.green, C0.orange, C0.purple, C0.teal, C0.red];
function HBarSimple({ data, colors, label }) {
  const entries = Object.entries(data);
  const max = Math.max(...Object.values(data), 1);
  if (!entries.length) return <div style={{color:"#aaa",fontSize:12,textAlign:"center",padding:16}}>No {label} data</div>;
  return (
    <div>
      {entries.map(([k,v],i) => (
        <div key={i} style={{marginBottom:8}}>
          <div style={{display:"flex",justifyContent:"space-between",fontSize:14,marginBottom:2}}>
            <span style={{color:"#555",fontWeight:600}}>{k}</span>
            <span style={{color:"#888"}}>{v}</span>
          </div>
          <div style={{height:16,background:"#f0f4f8",borderRadius:8,overflow:"hidden"}}>
            <div style={{width:`${(v/max)*100}%`,height:"100%",background:(Array.isArray(colors)?colors[i%colors.length]:colors)||C0.blue,borderRadius:8,display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontSize:13,fontWeight:700,minWidth:24,transition:"width 0.5s"}}>{v}</div>
          </div>
        </div>
      ))}
    </div>
  );
}
function VBarSimple({ data, color, height=140 }) {
  const entries = Object.entries(data);
  const max = Math.max(...Object.values(data), 1);
  if (!entries.length) return <div style={{color:"#aaa",fontSize:12,textAlign:"center",padding:16}}>No data</div>;
  return (
    <div style={{display:"flex",alignItems:"flex-end",justifyContent:"center",gap:10,height,overflowX:"auto",paddingBottom:20}}>
      {entries.map(([k,v],i) => {
        const h = Math.max((v/max)*(height-24),4);
        return (
          <div key={i} style={{display:"flex",flexDirection:"column",alignItems:"center",minWidth:50}}>
            <div style={{fontSize:12,fontWeight:700,color:color||C0.blue,marginBottom:2}}>{v}</div>
            <div style={{width:36,height,display:"flex",flexDirection:"column",justifyContent:"flex-end"}}>
              <div style={{width:"100%",height,background:"#f0f4f8",borderRadius:4,position:"relative",overflow:"hidden"}}>
                <div style={{position:"absolute",bottom:0,width:"100%",height:h,background:Array.isArray(color)?color[i%color.length]:color||C0.blue,borderRadius:4,transition:"height 0.5s"}}/>
              </div>
            </div>
            <div style={{fontSize:12,color:"#888",marginTop:4,textAlign:"center",maxWidth:60,lineHeight:1.2}}>{k}</div>
          </div>
        );
      })}
    </div>
  );
}
function DonutSimple({ data, colors, size=120 }) {
  const total = Object.values(data).reduce((a,b)=>a+b,0);
  const entries = Object.entries(data).filter(([,v])=>v>0);
  if (!entries.length) return <div style={{color:"#aaa",fontSize:12,textAlign:"center",padding:16}}>No data</div>;
  const r=size/2-4,cx=size/2,cy=size/2;
  let cum=0; const segs=entries.map(([k,v],i)=>{const p=v/total,s=cum;cum+=p;return{key:k,value:v,pct:p,start:s,color:(Array.isArray(colors)?colors[i%colors.length]:colors)||"#ccc"};});
  const arc=(s,e)=>{
    if(e-s>=1)return`M${cx} ${cy} L${cx} ${cy-r} A${r} ${r} 0 1 1 ${cx-0.01} ${cy-r} Z`;
    const sx=cx+r*Math.sin(2*Math.PI*s),sy=cy-r*Math.cos(2*Math.PI*s);
    const ex=cx+r*Math.sin(2*Math.PI*e),ey=cy-r*Math.cos(2*Math.PI*e);
    return`M${cx} ${cy} L${sx} ${sy} A${r} ${r} 0 ${(e-s)>0.5?1:0} 1 ${ex} ${ey} Z`;
  };
  return(
    <div style={{display:"flex",alignItems:"center",gap:16,justifyContent:"center",flexWrap:"wrap"}}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {segs.map((s,i)=><path key={i} d={arc(s.start,s.start+s.pct)} fill={s.color} stroke="#fff" strokeWidth={1.5}/>)}
        <circle cx={cx} cy={cy} r={r*0.55} fill="#fff"/>
        <text x={cx} y={cy+1} textAnchor="middle" fontSize={size*0.12} fontWeight={700} fill="#333">{total}</text>
        <text x={cx} y={cy+size*0.06} textAnchor="middle" fontSize={size*0.065} fill="#aaa">Total</text>
      </svg>
      <div style={{display:"flex",flexDirection:"column",gap:2}}>
        {segs.map((s,i)=><div key={i} style={{display:"flex",alignItems:"center",gap:6,fontSize:14}}><div style={{width:8,height:8,borderRadius:2,background:s.color,flexShrink:0}}/><span style={{color:"#666"}}>{s.key}</span><span style={{fontWeight:700,color:"#333"}}>{s.value}</span><span style={{color:"#999",fontSize:13}}>({(s.pct*100).toFixed(1)}%)</span></div>)}
      </div>
    </div>
  );
}

export function Operations({ initialTab, user }) {
  const [tabs, setTabs] = useState(getOpsTabs);
  const [active, setActive] = useState(initialTab || tabs[0]);
  const [files, setFiles] = useState([]);
  const [stats, setStats] = useState(null);
  const [targets, setTargets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({ season:"", category:"", classification:"", status:"", file_type:"", data_type:"", block:"", search:"", sortBy:"name", sortDir:"asc" });
  const [searchResults, setSearchResults] = useState(null);
  const [searching, setSearching] = useState(false);
  const [pageCats, setPageCats] = useState([]);

  const selStyle = { padding:"8px 14px", border:"1px solid #ddd", borderRadius:4, fontSize:15, outline:"none", background:"#fff", color:"#333" };

  const loadData = async () => {
    setLoading(true);
    try {
      const [s, t] = await Promise.all([
        api.getStats(),
        api.listTargets(),
      ]);
      setStats(s);
      setTargets(t||[]);
    } catch { setStats(null); setTargets([]); }
    setLoading(false);
  };

  const loadFiles = async () => {
    setSearching(true);
    try {
      const data = await api.searchFiles({ section: active });
      setFiles(Array.isArray(data) ? data : []);
      setSearchResults(null);
    } catch { setFiles([]); }
    setSearching(false);
  };

  useEffect(() => { setActive(initialTab || tabs[0]); }, [initialTab]);
  useEffect(() => { loadData(); loadFiles(); }, [active]);

  const addTab = () => {
    const name = prompt("Enter new Operations section name:");
    if (name && name.trim() && !tabs.includes(name.trim())) {
      const next = [...tabs, name.trim()];
      setTabs(next);
      localStorage.setItem(OPS_TABS_KEY, JSON.stringify(next));
    }
  };

  useEffect(() => {
    const stored = getOpsTabs();
    if (stored.length !== tabs.length || stored.some((t,i) => t !== tabs[i])) setTabs(stored);
  }, []);

  useEffect(() => { api.getLookups("pagecat_Operations").then(d => setPageCats(d.map(x=>x.value))).catch(() => {}); }, []);

  const [lookups, setLookups] = useState({ seasons:[], categories:[], blocks:[], fileTypes:[], dataTypes:[] });
  useEffect(() => {
    Promise.all([
      api.getLookups("season").then(r => (r||[]).map(x=>x.value)).catch(() => []),
      api.getLookups("category").then(r => (r||[]).map(x=>x.value)).catch(() => []),
      api.getLookups("block").then(r => (r||[]).map(x=>x.value)).catch(() => []),
      api.getLookups("file_type").then(r => (r||[]).map(x=>x.value)).catch(() => []),
      api.getLookups("data_type").then(r => (r||[]).map(x=>x.value)).catch(() => []),
    ]).then(([seasons, categories, blocks, fileTypes, dataTypes]) => {
      setLookups({ seasons, categories, blocks, fileTypes, dataTypes });
    });
  }, []);

  const handleSearch = async () => {
    if (!filter.search.trim()) { setSearchResults(null); loadFiles(); return; }
    setSearching(true);
    try {
      const data = await api.searchFiles({ search: filter.search.trim(), section: active });
      setSearchResults(data || []);
    } catch { setSearchResults([]); }
    setSearching(false);
  };

  const displayed = (searchResults || files).filter(f => {
    if (filter.status && f.status !== filter.status) return false;
    if (filter.season && f.season !== filter.season) return false;
    if (filter.category && f.category !== filter.category) return false;
    if (filter.classification && f.classification !== filter.classification) return false;
    if (filter.file_type && f.file_type !== filter.file_type) return false;
    if (filter.data_type && f.data_type !== filter.data_type) return false;
    if (filter.block && f.block !== filter.block) return false;
    return true;
  }).sort((a, b) => {
    const d = filter.sortDir === "desc" ? -1 : 1;
    const getVal = (f, key) => {
      if (key === "name") return (f.file_name || "").toLowerCase();
      if (key === "project") return (f.project_name || "").toLowerCase();
      if (key === "type") return (f.file_type || "").toLowerCase();
      if (key === "category") return (f.category || "").toLowerCase();
      if (key === "season") return (f.season || "");
      if (key === "classification") return (f.classification || "");
      if (key === "status") return (f.status || "");
      if (key === "date") return f.created_at || f.upload_date || "";
      return "";
    };
    const va = getVal(a, filter.sortBy);
    const vb = getVal(b, filter.sortBy);
    if (va < vb) return -1 * d;
    if (va > vb) return 1 * d;
    return 0;
  });

  const classifs = [...new Set(files.map(f => f.classification).filter(Boolean))].sort();
  const statuses = [...new Set(files.map(f => f.status).filter(Boolean))].sort();
  const allSeasons = [...new Set([...lookups.seasons, ...files.map(x=>x.season).filter(Boolean)])].sort();
  const allCategories = [...new Set([...lookups.categories, ...files.map(x=>x.category).filter(Boolean)])].sort();
  const allBlocks = [...new Set([...lookups.blocks, ...files.map(x=>x.block).filter(Boolean)])].sort();
  const allFileTypes = [...new Set([...lookups.fileTypes, ...files.map(x=>x.file_type).filter(Boolean)])].sort();
  const allDataTypes = [...new Set([...lookups.dataTypes, ...files.map(x=>x.data_type).filter(Boolean)])].sort();

  const byCategory = files.reduce((a,f)=>{const c=f.category||f.cat||"Uncategorized";a[c]=(a[c]||0)+1;return a;},{});
  const byType = files.reduce((a,f)=>{const t=f.file_type||f.fileType||"Unknown";a[t]=(a[t]||0)+1;return a;},{});
  const byStatus = {Approved:files.filter(f=>f.status==="Approved").length,Pending:files.filter(f=>f.status==="Pending").length,Rejected:files.filter(f=>f.status==="Rejected").length};
  const byClassification = files.reduce((a,f)=>{const c=f.classification||"Unclassified";a[c]=(a[c]||0)+1;return a;},{});
  const secTargets = targets.filter(t => !t.section || t.section === active);
  const badge = (bg) => ({ padding:"2px 10px", borderRadius:4, fontSize:14, fontWeight:600, background:bg+"22", color:bg });
  const sortToggle = (key) => {
    setFilter(f => ({ ...f, sortBy: key, sortDir: f.sortBy === key && f.sortDir === "asc" ? "desc" : "asc" }));
  };
  const sortArrow = (key) => filter.sortBy === key ? (filter.sortDir === "asc" ? " ▲" : " ▼") : "";

  const thSort = (key, label) => (
    <th style={{padding:"8px 12px",borderBottom:"2px solid #e0e4e8",fontWeight:600,color:"#333",background:"#f5f7fa",fontSize:15,cursor:"pointer",userSelect:"none",whiteSpace:"nowrap"}} onClick={() => sortToggle(key)}>
      {label}{sortArrow(key)}
    </th>
  );

  return (
    <div style={S.page}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
        <div style={S.title}>Operations — {active}</div>
      </div>

      <div style={{ display:"flex", gap:4, marginBottom:12, flexWrap:"wrap" }}>
        {tabs.map(t => (
          <button key={t} style={{ padding:"6px 14px", borderRadius:4, border:"none", cursor:"pointer", fontWeight:600, fontSize:14, background:active===t?"#0b3d91":"#e0e0e0", color:active===t?"#fff":"#333" }} onClick={() => setActive(t)}>{t}</button>
        ))}
        <button style={{padding:"6px 14px",borderRadius:4,border:"1px dashed #0b3d91",cursor:"pointer",fontSize:14,color:"#0b3d91",background:"transparent"}} onClick={addTab}>+ Add</button>
      </div>

      {pageCats.length > 0 && (
        <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:10,alignItems:"center"}}>
          <span style={{fontSize:12,fontWeight:600,color:"#666"}}>Categories:</span>
          {pageCats.map(c => (
            <span key={c} style={{display:"inline-block",padding:"2px 10px",borderRadius:12,fontSize:12,fontWeight:600,background:"#e8edf2",color:"#0b3d91"}}>{c}</span>
          ))}
        </div>
      )}

      <FileUploadForm user={user} section={active} onUpload={loadFiles} onToast={null} />

      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10,marginBottom:16}}>
        {[["Total Files",files.length,C0.blue],["Approved",byStatus.Approved,C0.green],["Pending",byStatus.Pending,C0.orange],["Rejected",byStatus.Rejected,C0.red]].map(([l,v,c])=>(
          <div key={l} style={{background:"#fff",borderRadius:8,padding:"12px 16px",textAlign:"center",boxShadow:"0 1px 4px rgba(0,0,0,0.08)"}}>
            <div style={{fontSize:22,fontWeight:800,color:c}}>{v}</div>
            <div style={{fontSize:13,color:"#888",fontWeight:600,textTransform:"uppercase",marginTop:2}}>{l}</div>
          </div>
        ))}
      </div>

      {secTargets.length>0 && (
        <div style={S.section}>
          <div style={S.sectionTitle}>Goal vs Accomplishment</div>
          <div style={{display:"flex",gap:24,flexWrap:"wrap"}}>
            {secTargets.map(t => {
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

      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:16}}>
        <div style={S.section}><div style={S.sectionTitle}>Files by Category</div><DonutSimple data={byCategory} colors={COL0} size={120}/></div>
        <div style={S.section}><div style={S.sectionTitle}>Status Distribution</div><DonutSimple data={byStatus} colors={[C0.green,C0.orange,C0.red]} size={120}/></div>
        <div style={S.section}><div style={S.sectionTitle}>Files by Type</div><DonutSimple data={byType} colors={COL0} size={120}/></div>
        <div style={S.section}><div style={S.sectionTitle}>Classification Breakdown</div><DonutSimple data={byClassification} colors={COL0} size={120}/></div>
      </div>

      <div style={S.section}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
          <div style={S.sectionTitle}>{active} — Uploaded Files ({files.length})</div>
        </div>

        <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:12,alignItems:"center"}}>
          <input style={{...S.input,width:200,fontSize:15}} placeholder="Keyword search…" value={filter.search}
            onChange={e => setFilter(f=>({...f,search:e.target.value}))}
            onKeyDown={e => e.key==="Enter" && handleSearch()} />
          <button style={{padding:"6px 12px",border:"none",borderRadius:4,cursor:"pointer",fontSize:14,fontWeight:600,background:"#0b3d91",color:"#fff"}} onClick={handleSearch}>
            {searching ? "…" : "Search"}
          </button>
          {searchResults && <button style={{padding:"6px 12px",border:"1px solid #ddd",borderRadius:4,cursor:"pointer",fontSize:14,background:"#fff",color:"#666"}} onClick={()=>{setFilter(f=>({...f,search:""}));setSearchResults(null);loadFiles();}}>Clear</button>}
          <select style={selStyle} value={filter.season} onChange={e=>setFilter(f=>({...f,season:e.target.value}))}>
            <option value="">All Seasons</option>
            {allSeasons.map(s=><option key={s} value={s}>{s}</option>)}
          </select>
          <select style={selStyle} value={filter.category} onChange={e=>setFilter(f=>({...f,category:e.target.value}))}>
            <option value="">All Categories</option>
            {allCategories.map(c=><option key={c} value={c}>{c}</option>)}
          </select>
          <select style={selStyle} value={filter.classification} onChange={e=>setFilter(f=>({...f,classification:e.target.value}))}>
            <option value="">All Classifications</option>
            {classifs.map(c=><option key={c} value={c}>{c}</option>)}
          </select>
          <select style={selStyle} value={filter.status} onChange={e=>setFilter(f=>({...f,status:e.target.value}))}>
            <option value="">All Status</option>
            {statuses.map(s=><option key={s} value={s}>{s}</option>)}
          </select>
          <select style={selStyle} value={filter.file_type} onChange={e=>setFilter(f=>({...f,file_type:e.target.value}))}>
            <option value="">All File Types</option>
            {allFileTypes.map(s=><option key={s} value={s}>{s}</option>)}
          </select>
          <select style={selStyle} value={filter.data_type} onChange={e=>setFilter(f=>({...f,data_type:e.target.value}))}>
            <option value="">All Data Types</option>
            {allDataTypes.map(s=><option key={s} value={s}>{s}</option>)}
          </select>
          <select style={selStyle} value={filter.block} onChange={e=>setFilter(f=>({...f,block:e.target.value}))}>
            <option value="">All Blocks</option>
            {allBlocks.map(s=><option key={s} value={s}>{s}</option>)}
          </select>
          <select style={selStyle} value={filter.sortBy} onChange={e=>setFilter(f=>({...f,sortBy:e.target.value}))}>
            <option value="name">Sort: Name</option>
            <option value="date">Sort: Date</option>
            <option value="project">Sort: Project</option>
            <option value="type">Sort: Type</option>
            <option value="category">Sort: Category</option>
            <option value="season">Sort: Season</option>
            <option value="classification">Sort: Classification</option>
            <option value="status">Sort: Status</option>
          </select>
          <button style={{...selStyle,cursor:"pointer"}} onClick={()=>setFilter(f=>({...f,sortDir:f.sortDir==="asc"?"desc":"asc"}))}>
            {filter.sortDir === "asc" ? "↑ Asc" : "↓ Desc"}
          </button>
        </div>

        {searchResults !== null && (
          <div style={{fontSize:12,color:"#666",marginBottom:8}}>
            Search results: {searchResults.length} file{searchResults.length!==1?"s":""} found (keyword + semantic)
          </div>
        )}

        {loading || searching ? (
          <div style={{textAlign:"center",padding:20,color:"#888",fontSize:13}}>Loading files...</div>
        ) : displayed.length === 0 ? (
          <div style={{textAlign:"center",padding:20,color:"#999",fontSize:13}}>No files found for <strong>{active}</strong>.</div>
        ) : (
          <div style={{overflowX:"auto"}}>
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:15,minWidth:700}}>
              <thead><tr>
                {thSort("name","File Name")}
                {thSort("project","Project")}
                {thSort("category","Category")}
                {thSort("type","Type")}
                {thSort("classification","Classification")}
                {thSort("season","Season")}
                {thSort("status","Status")}
                {thSort("date","Uploaded")}
              </tr></thead>
              <tbody>
                {displayed.map((f, i) => (
                  <tr key={f.id || i} style={{background:i%2===0?"#fff":"#f8f9fa"}}>
                    <td style={{padding:"8px 12px",borderBottom:"1px solid #f0f4f8",fontWeight:500,color:"#0b3d91"}}>{f.file_name || f.fileName || "—"}</td>
                    <td style={{padding:"8px 12px",borderBottom:"1px solid #f0f4f8"}}>{f.project_name || f.projectName || "—"}</td>
                    <td style={{padding:"8px 12px",borderBottom:"1px solid #f0f4f8",color:"#555"}}>{f.category || "—"}</td>
                    <td style={{padding:"8px 12px",borderBottom:"1px solid #f0f4f8"}}><span style={badge(f.file_type==="PDF"?"#1565c0":"#6A1B9A")}>{f.file_type || f.fileType || "—"}</span></td>
                    <td style={{padding:"8px 12px",borderBottom:"1px solid #f0f4f8"}}><span style={badge(f.classification?.includes("Confidential")||f.classification?.includes("Sensitive")?"#E65100":"#2E7D32")}>{f.classification || "—"}</span></td>
                    <td style={{padding:"8px 12px",borderBottom:"1px solid #f0f4f8",color:"#555",fontSize:14}}>{f.season || "—"}</td>
                    <td style={{padding:"8px 12px",borderBottom:"1px solid #f0f4f8"}}><span style={badge(f.status==="Approved"?"#1B5E20":f.status==="Rejected"?"#c62828":"#1565c0")}>{f.status || "Pending"}</span></td>
                    <td style={{padding:"8px 12px",borderBottom:"1px solid #f0f4f8",color:"#888",fontSize:14}}>{f.created_at ? f.created_at.slice(0,10) : f.upload_date ? String(f.upload_date).slice(0,10) : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── 7. DATA PROCESSING ───
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

// ─── 8. REGIONAL ELECTRONICS LAB ───
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

// ─── 9. REPORTING / APPRAISALS ───
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

// ─── 10. PENDING VS RESOLVED ISSUES ───
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

// ─── 11. HIGHLIGHTS ───
export function Highlights({ user, onToast }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ title:"", description:"", author:"", icon:"🏆" });
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [pageCats, setPageCats] = useState([]);
  const [fv, setFv] = useState(0);
  const canEdit = user?.role === "admin" || user?.role === "ops_manager" || user?.role === "data_creator";
  const hlToast = (msg, type) => { if (onToast) onToast(msg, type); else alert(msg); };
  const [showExcelHighlightModal, setShowExcelHighlightModal] = useState(false);

  const load = async () => {
    setLoading(true);
    const data = await api.listHighlights().catch(() => []);
    setItems(data || []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const openNew = () => { setEditing(null); setForm({ title:"", description:"", author: user?.name || "" }); setShowForm(true); };
  const openEdit = (h) => { setEditing(h); setForm({ title:h.title, description:h.description, author:h.author }); setShowForm(true); };

  const handleSave = async () => {
    if (!form.title || !form.description) { onToast?.("Title and description required", "error"); return; }
    if (editing) {
      await api.updateHighlight(editing.id, form).catch(() => { onToast?.("Failed to update", "error"); return; });
      onToast?.("Highlight updated", "success");
    } else {
      await api.createHighlight(form.title, form.description, form.author).catch(() => { onToast?.("Failed to create", "error"); return; });
      onToast?.("Highlight created", "success");
    }
    setShowForm(false); setEditing(null); load();
  };

  const handleDelete = async (id) => {
    if (!confirm("Delete this highlight?")) return;
    await api.deleteHighlight(id).catch(() => { onToast?.("Failed to delete", "error"); return; });
    onToast?.("Highlight deleted", "success");
    load();
  };

  if (loading) return <div style={S.page}><div style={{textAlign:"center",padding:40,fontSize:14,color:"#888"}}>Loading highlights...</div></div>;
  const [showUp, setShowUp] = useState(false);

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
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:24, flexWrap:"wrap", gap:8 }}>
        <div style={S.title}>Highlights</div>
        <div style={{display:"flex",gap:6}}>
          {canEdit && <button style={{...S.btnSm(),display:"flex",alignItems:"center",gap:4}} onClick={openNew}>+ Add Highlight</button>}
          {canEdit && <button style={{padding:"5px 12px",border:"none",borderRadius:4,background:"#0b3d91",color:"#fff",fontWeight:600,fontSize:12,cursor:"pointer"}} onClick={()=>setShowExcelHighlightModal(true)}>📥 Excel</button>}
          <button style={{padding:"5px 12px",border:"none",borderRadius:4,background:showUp?"#e74c3c":"#0b3d91",color:"#fff",fontWeight:600,fontSize:12,cursor:"pointer",display:"flex",alignItems:"center",gap:4}} onClick={()=>setShowUp(!showUp)}>
            {showUp ? "Close" : "Upload"}
          </button>
        </div>
      </div>

      {showUp && <MiniUpload user={user} section="Highlights" fields={{title:"Title",category:"Category"}} onUpload={() => setFv(x=>x+1)} onToast={hlToast} />}

      {showForm && (
        <div style={{...S.section, background:"#f8faff", border:"1px solid #d0d8e8"}}>
          <div style={{...S.sectionTitle, border:"none", marginBottom:12}}>{editing ? "Edit Highlight" : "New Highlight"}</div>
          <div style={{display:"flex",flexDirection:"column",gap:10}}>
            <input style={S.input} value={form.title} onChange={e=>setForm(p=>({...p,title:e.target.value}))} placeholder="Highlight title" />
            <textarea style={S.textarea} value={form.description} onChange={e=>setForm(p=>({...p,description:e.target.value}))} placeholder="Description of the achievement..." rows={3} />
            <div style={{display:"flex",gap:12,alignItems:"center"}}>
              <input style={{...S.input,flex:1}} value={form.author} onChange={e=>setForm(p=>({...p,author:e.target.value}))} placeholder="Author name" />
            </div>
            <div style={{display:"flex",gap:8}}>
              <button style={S.btnSm()} onClick={handleSave}>{editing ? "Update" : "Create"}</button>
              <button style={{...S.btnSm("#999")}} onClick={()=>{setShowForm(false);setEditing(null);}}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {items.length === 0 ? (
        <div style={{textAlign:"center",padding:"40px 20px",color:"#999",fontSize:14}}>
          No highlights yet. {canEdit ? 'Click "+ Add Highlight" to create the first one.' : ""}
        </div>
      ) : (
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
          {items.map(h => (
            <div key={h.id} style={{...S.card, borderLeft:"4px solid #0b3d91", position:"relative"}}>
              {canEdit && (
                <div style={{position:"absolute",top:8,right:8,display:"flex",gap:4}}>
                  <button style={{fontSize:12,padding:"2px 8px",border:"none",borderRadius:3,background:"#e3f2fd",color:"#1565c0",cursor:"pointer"}} onClick={()=>openEdit(h)}>Edit</button>
                  <button style={{fontSize:12,padding:"2px 8px",border:"none",borderRadius:3,background:"#ffebee",color:"#c62828",cursor:"pointer"}} onClick={()=>handleDelete(h.id)}>Del</button>
                </div>
              )}
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
                <div style={{fontSize:15,fontWeight:700,color:"#0b3d91"}}>{h.title}</div>
                <span style={{fontSize:14,color:"#999"}}>{h.created_at ? new Date(h.created_at).toLocaleDateString() : ""}</span>
              </div>
              <div style={{fontSize:13,color:"#555",lineHeight:1.5,marginBottom:8}}>{h.description}</div>
              <div style={{fontSize:14,color:"#888",fontStyle:"italic"}}>— {h.author}</div>
            </div>
          ))}
        </div>
      )}
      <FileTableSection section="Highlights" version={fv} />

      <ExcelUploadModal
        show={showExcelHighlightModal}
        onClose={() => setShowExcelHighlightModal(false)}
        onToast={onToast}
        apiPreview={api.excelHighlightPreview}
        apiImport={api.excelHighlightImport}
        fields="highlight"
        onSuccess={() => { load(); }}
      />
    </div>
  );
}

// ─── 12. TECHNICAL REPORTS ───
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
  const [showUp, setShowUp] = useState(false);

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

// ─── 13. SHARE POINT (Temporary File) ───
export function SharePointTemp({ onToast }) {
  const [files, setFiles] = useState([
    { id:1, name:"Daily_Report_2025-06-15.pdf", sharedBy:"R.K. Sharma", role:"Public", expiry:3600, sharedAt:Date.now()-1800 },
    { id:2, name:"Block_Map_Cambay.pdf", sharedBy:"S. Patel", role:"GP-03 Team", expiry:7200, sharedAt:Date.now()-3600 },
    { id:3, name:"Equipment_Schedule.xlsx", sharedBy:"Logistics", role:"Operations", expiry:1800, sharedAt:Date.now()-600 },
  ]);
  const [shareFile, setShareFile] = useState(null);
  const [shareRole, setShareRole] = useState("Public");
  const [shareHours, setShareHours] = useState(24);

  useEffect(() => {
    const iv = setInterval(() => setFiles(p => p.filter(f => Date.now() - f.sharedAt < f.expiry * 1000)), 1000);
    return () => clearInterval(iv);
  }, []);

  const handleShare = () => {
    if (!shareFile) { onToast?.("Select a file to share", "error"); return; }
    setFiles(p => [{ id:Date.now(), name:shareFile.name, sharedBy:"You", role:shareRole, expiry:shareHours*3600, sharedAt:Date.now() }, ...p]);
    setShareFile(null);
    onToast?.(`File shared for ${shareHours} hours (${shareRole})`, "success");
  };

  return (
    <div style={S.page}>
      <div style={S.title}>Share Point (Temporary File)</div>
      <div style={S.section}>
        <div style={S.sectionTitle}>Share a File</div>
        <div style={{ display:"flex", gap:12, alignItems:"end", flexWrap:"wrap" }}>
          <div style={S.field}><label style={S.label}>Select File *</label><input style={S.input} type="file" onChange={e=>setShareFile(e.target.files[0])} /></div>
          <div style={S.field}>
            <label style={S.label}>Access Role</label>
            <select style={S.select} value={shareRole} onChange={e=>setShareRole(e.target.value)}>
              <option value="Public">Public (Anyone with Link)</option>
              <option value="Operations">Operations Only</option>
              <option value="GP-03 Team">GP-03 Team</option>
              <option value="GP-06 Team">GP-06 Team</option>
              <option value="Admin">Admin Only</option>
            </select>
          </div>
          <div style={S.field}>
            <label style={S.label}>Expires In (hours)</label>
            <input style={{...S.input,width:80}} type="number" min={1} max={168} value={shareHours} onChange={e=>setShareHours(Number(e.target.value))} />
          </div>
          <button style={S.btnSm()} onClick={handleShare}>Share</button>
        </div>
      </div>
      <div style={S.section}>
        <div style={S.sectionTitle}>Shared Files</div>
        {files.length === 0 ? (
          <div style={{textAlign:"center",padding:20,color:"#999"}}>No active shared files.</div>
        ) : (
          <table style={{width:"100%",borderCollapse:"collapse"}}>
            <thead><tr><th style={th}>File</th><th style={th}>Shared By</th><th style={th}>Role</th><th style={th}>Expires In</th><th style={th}>Status</th></tr></thead>
            <tbody>{files.map((f,i)=>{
              const remaining = f.expiry - (Date.now() - f.sharedAt)/1000;
              const hrs = Math.floor(remaining/3600);
              const mins = Math.floor((remaining%3600)/60);
              return (
                <tr key={f.id} style={{background:i%2===0?"#fff":"#f8f9fa"}}>
                  <td style={td}><span style={{color:"#0b3d91",cursor:"pointer"}}>{f.name}</span></td>
                  <td style={td}>{f.sharedBy}</td><td style={td}>{f.role}</td>
                  <td style={{...td,fontWeight:600,color:remaining<600?"#e74c3c":"#333"}}>{hrs}h {mins}m</td>
                  <td style={td}><span style={badge(remaining>0?"#1B5E20":"#999")}>{remaining>0?"Active":"Expired"}</span></td>
                </tr>
              );
            })}</tbody>
          </table>
        )}
      </div>
    </div>
  );
}

// ─── 14. HSE ───
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

// ─── 15. AWP / MY ANNUAL WORK PLAN ───
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
