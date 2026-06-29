import { useState, useEffect } from "react";
import { api } from "../../api";
import { S, badge, C0 } from "./styles";
import { DonutSimple, COL0 } from "./Charts";

export function FileTableSection({ section, projectName, version = 0 }) {
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