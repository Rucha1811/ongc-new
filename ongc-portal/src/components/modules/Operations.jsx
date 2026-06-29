import { useState, useEffect } from "react";
import { api } from "../../api";
import { S, th, td, badge, C0 } from "../shared/styles";
import { DonutSimple, COL0 } from "../shared/Charts";
import FileUploadForm from "../FileUploadForm";
import ExcelUploadModal from "../ExcelUploadModal";



const OPS_TABS_KEY = "ops_tabs";
function getOpsTabs() {
  try { const d = JSON.parse(localStorage.getItem(OPS_TABS_KEY)); if (Array.isArray(d) && d.length) return d; } catch {}
  return ["Base Office","Contracts","HSE","GP-03","GP-06"];
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
  const [hseIncidents, setHseIncidents] = useState([]);
  const [hseLoading, setHseLoading] = useState(false);
  const [showHseForm, setShowHseForm] = useState(false);
  const [showExcelModal, setShowExcelModal] = useState(false);
  const [hseForm, setHseForm] = useState({ date:"", incident_type:"", location:"", description:"", action_taken:"" });
  const [hseStats] = useState({
    daysWithoutIncident: 185, totalInspections: 24, complianceRate: "97.2%",
    activeDrills: 3, lastInspection: "2025-06-14", pendingActions: 2,
  });
  const canEdit = user?.role === "admin" || user?.role === "ops_manager" || user?.role === "data_creator";

  const handleHseCreate = async () => {
    if (!hseForm.incident_type || !hseForm.description) return;
    const fd = new FormData();
    Object.entries(hseForm).forEach(([k,v]) => { if (v) fd.append(k, v); });
    await api.createHSEIncident(fd).catch(() => {});
    setHseForm({ date:"", incident_type:"", location:"", description:"", action_taken:"" });
    setShowHseForm(false);
    loadHse();
  };

  const handleHseDelete = async (id) => {
    if (!confirm("Delete this record?")) return;
    await api.deleteHSEIncident(id).catch(() => {});
    loadHse();
  };

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
  useEffect(() => { loadData(); loadFiles(); if (active === "HSE") loadHse(); }, [active]);

  const loadHse = async () => {
    setHseLoading(true);
    const d = await api.listHSEIncidents().catch(() => []);
    setHseIncidents(d || []);
    setHseLoading(false);
  };

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

      {active === "HSE" ? (
        <>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
            <div style={S.title}>HSE Dashboard</div>
            <div style={{display:"flex",gap:6}}>
              {canEdit && <button style={{padding:"5px 12px",border:"none",borderRadius:4,background:"#0b3d91",color:"#fff",fontWeight:600,fontSize:12,cursor:"pointer"}} onClick={()=>setShowHseForm(o=>!o)}>{showHseForm?"Close":"+ Add"}</button>}
              {canEdit && <button style={{padding:"5px 12px",border:"none",borderRadius:4,background:"#0b3d91",color:"#fff",fontWeight:600,fontSize:12,cursor:"pointer"}} onClick={()=>setShowExcelModal(true)}>📥 Excel</button>}
            </div>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:12,marginBottom:20}}>
            {[["Days Without Incident",hseStats.daysWithoutIncident,"#1B5E20"],["Compliance Rate",hseStats.complianceRate,"#0b3d91"],["Pending Actions",hseStats.pendingActions,"#E65100"]].map(([l,v,c])=>(
              <div key={l} style={{...S.card,textAlign:"center"}}>
                <div style={{fontSize:12,color:"#666",fontWeight:600}}>{l}</div>
                <div style={{fontSize:28,fontWeight:800,color:c}}>{v}</div>
              </div>
            ))}
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:12,marginBottom:20}}>
            {[["Total Inspections",hseStats.totalInspections],["Active Drills",hseStats.activeDrills],["Last Inspection",hseStats.lastInspection]].map(([l,v])=>(
              <div key={l} style={S.card}>
                <div style={{fontSize:14,color:"#666",fontWeight:600}}>{l}</div>
                <div style={{fontSize:18,fontWeight:700,color:"#1a1a2e"}}>{v}</div>
              </div>
            ))}
          </div>
          {showHseForm && canEdit ? (
            <div style={{background:"#fff",borderRadius:8,padding:"24px 32px",boxShadow:"0 1px 4px rgba(0,0,0,0.1)",maxWidth:800,margin:"0 auto"}}>
              <div style={S.sectionTitle}>New Incident / Observation</div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
                <div style={S.field}><label style={S.label}>Date</label><input style={S.input} type="date" value={hseForm.date} onChange={e=>setHseForm(p=>({...p,date:e.target.value}))} /></div>
                <div style={S.field}><label style={S.label}>Type *</label><input style={S.input} value={hseForm.incident_type} onChange={e=>setHseForm(p=>({...p,incident_type:e.target.value}))} placeholder="Near Miss / Safety Observation" /></div>
                <div style={S.field}><label style={S.label}>Location</label><input style={S.input} value={hseForm.location} onChange={e=>setHseForm(p=>({...p,location:e.target.value}))} /></div>
                <div style={S.field}><label style={S.label}>Action Taken</label><input style={S.input} value={hseForm.action_taken} onChange={e=>setHseForm(p=>({...p,action_taken:e.target.value}))} /></div>
                <div style={{...S.field,gridColumn:"span 2"}}><label style={S.label}>Description *</label><textarea style={S.input} rows={2} value={hseForm.description} onChange={e=>setHseForm(p=>({...p,description:e.target.value}))} /></div>
              </div>
              <div style={{display:"flex",gap:8,marginTop:16}}>
                <button style={S.btnSm()} onClick={handleHseCreate}>Create</button>
                <button style={{...S.btnSm("#888")}} onClick={()=>setShowHseForm(false)}>Cancel</button>
              </div>
            </div>
          ) : (
            <>
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
                {hseLoading ? (
                  <div style={{textAlign:"center",padding:20,fontSize:13,color:"#888"}}>Loading HSE data...</div>
                ) : (
                  <table style={{width:"100%",borderCollapse:"collapse"}}>
                    <thead><tr><th style={th}>Date</th><th style={th}>Type</th><th style={th}>Location</th><th style={th}>Description</th><th style={th}>Action Taken</th>{canEdit && <th style={th}>Actions</th>}</tr></thead>
                    <tbody>{hseIncidents.map((d,i)=>(
                      <tr key={d.id} style={{background:i%2===0?"#fff":"#f8f9fa"}}>
                        <td style={td}>{d.date ? String(d.date).slice(0,10) : ""}</td><td style={td}>{d.incident_type}</td><td style={td}>{d.location}</td><td style={td}>{d.description}</td><td style={td}>{d.action_taken}</td>
                        {canEdit && <td style={td}><button style={{fontSize:12,padding:"2px 8px",border:"none",borderRadius:3,background:"#ffebee",color:"#c62828",cursor:"pointer"}} onClick={()=>handleHseDelete(d.id)}>Del</button></td>}
                      </tr>
                    ))}</tbody>
                  </table>
                )}
              </div>
            </>
          )}
          <ExcelUploadModal show={showExcelModal} onClose={()=>setShowExcelModal(false)} onToast={null} apiPreview={api.excelHSEPreview} apiImport={api.excelHSEImport} fields="hse_incident" onSuccess={()=>{loadHse()}} />
        </>
      ) : (
        <>
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
      </>
      )}
    </div>
    );
  }
