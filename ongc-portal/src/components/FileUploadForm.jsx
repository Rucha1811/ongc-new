import { useState, useEffect, useRef } from "react";
import { api } from "../api";

const S = {
  section: { background:"#f8faff", borderRadius:8, padding:20, marginBottom:20, boxShadow:"0 1px 4px rgba(0,0,0,0.1)", border:"1px solid #d0d8e8" },
  sectionTitle: { fontSize:15, fontWeight:600, marginBottom:16, paddingBottom:8, borderBottom:"1px solid #e0e4e8", color:"#333" },
  grid: { display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 },
  field: { display:"flex", flexDirection:"column", gap:4 },
  label: { fontSize:13, fontWeight:600, color:"#555" },
  input: { padding:"8px 10px", border:"1px solid #ddd", borderRadius:4, fontSize:14, outline:"none" },
  select: { padding:"8px 10px", border:"1px solid #ddd", borderRadius:4, fontSize:14, outline:"none", background:"#fff" },
};

const LABEL_MAP = {
  project:["project","project_name","projectname","survey"],
  season:["season","field_season","year","fiscal_year","fieldseason"],
  block:["block","block_name","blockname","area"],
  location:["location","locality","site","village","town"],
  section:["section","section_name","gp","gpxx","department"],
  category:["category","type","classification","doc_type","documenttype"],
  data_type:["data_type","datatype","datatype"],
  sig_number:["sig","sig_no","signumber","number","project_no"],
  contractor:["contractor","vendor","contractorname"],
};

function matchLabel(col) {
  const c = col.toLowerCase().replace(/[\s_-]/g,"");
  for (const [key, aliases] of Object.entries(LABEL_MAP)) {
    if (aliases.some(a => c.includes(a))) return key;
  }
  return null;
}

export default function FileUploadForm({ user, section: prefillSection, projectName, onUpload, onToast }) {
  const [file, setFile] = useState(null);
  const [fileType, setFileType] = useState("");
  const [project, setProject] = useState(projectName || "");
  const [sigNumber, setSigNumber] = useState("");
  const [dataType, setDataType] = useState("");
  const [sec, setSec] = useState(prefillSection || user?.section || "");
  const [category, setCategory] = useState("");
  const [season, setSeason] = useState("");
  const [block, setBlock] = useState("");
  const [mlBlock, setMlBlock] = useState("");
  const [location, setLocation] = useState("");
  const [classification, setClassification] = useState("");
  const [uploading, setUploading] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [parsedInfo, setParsedInfo] = useState(null);
  const fileRef = useRef();

  const [fileTypes, setFileTypes] = useState([]);
  const [projects, setProjects] = useState([]);
  const [dataTypes, setDataTypes] = useState([]);
  const [sections, setSections] = useState([]);
  const [categories, setCategories] = useState([]);
  const [seasons, setSeasons] = useState([]);

  const [classifs, setClassifs] = useState(["General / Available for All","Sensitive / Internal Use","Confidential","Highly Confidential / Restricted"]);

  useEffect(() => {
    api.getLookups("file_type").then(d => setFileTypes(d?.map?.(x=>x.value) || [])).catch(() => {});
    api.listProjects().then(d => setProjects(d || [])).catch(() => {});
    api.getLookups("data_type").then(d => setDataTypes(d?.map?.(x=>x.value) || [])).catch(() => {});
    api.getLookups("section").then(d => setSections(d?.map?.(x=>x.value) || [])).catch(() => {});
    api.getLookups("category").then(d => setCategories(d?.map?.(x=>x.value) || [])).catch(() => {});
    api.getLookups("season").then(d => setSeasons(d?.map?.(x=>x.value) || [])).catch(() => {});
    api.getLookups("classification").then(d => setClassifs(d?.map?.(x=>x.value) || [])).catch(() => {});
  }, []);

  useEffect(() => {
    const p = projects.find(p => p.project_name === project);
    setSigNumber(p?.number || "");
  }, [project, projects]);

  const toast = (msg, type) => { if (onToast) onToast(msg, type); else alert(msg); };

  const handleFileChange = async (e) => {
    const f = e.target.files?.[0] || null;
    setFile(f);
    setParsedInfo(null);
    if (f) {
      const ext = f.name.split(".").pop().toLowerCase();
      setFileType(ext.toUpperCase());
      if (["xlsx","xls","csv"].includes(ext)) {
        setParsing(true);
        try {
          const info = await api.parseExcel(f);
          setParsedInfo(info);
          if (info.columns && info.columns.length) {
            const cols = info.columns.map(c => String(c));
            const matched = {};
            for (const col of cols) {
              const key = matchLabel(col);
              if (key) matched[key] = col;
            }
            if (matched.season && !season) {
              const sample = info.sample_data?.[0];
              if (sample) {
                const idx = cols.indexOf(matched.season);
                if (idx >= 0 && sample[idx]) setSeason(String(sample[idx]));
              }
            }
            if (matched.block && !block) {
              const sample = info.sample_data?.[0];
              if (sample) {
                const idx = cols.indexOf(matched.block);
                if (idx >= 0 && sample[idx]) setBlock(String(sample[idx]));
              }
            }
            if (matched.location && !location) {
              const sample = info.sample_data?.[0];
              if (sample) {
                const idx = cols.indexOf(matched.location);
                if (idx >= 0 && sample[idx]) setLocation(String(sample[idx]));
              }
            }
            if (matched.section && !sec) {
              const sample = info.sample_data?.[0];
              if (sample) {
                const idx = cols.indexOf(matched.section);
                if (idx >= 0 && sample[idx]) setSec(String(sample[idx]));
              }
            }
            if (matched.category) {
              const sample = info.sample_data?.[0];
              if (sample) {
                const idx = cols.indexOf(matched.category);
                if (idx >= 0 && sample[idx]) setCategory(String(sample[idx]));
              }
            }
            if (matched.data_type) {
              const sample = info.sample_data?.[0];
              if (sample) {
                const idx = cols.indexOf(matched.data_type);
                if (idx >= 0 && sample[idx]) setDataType(String(sample[idx]));
              }
            }
            if (matched.project && !projectName) {
              const sample = info.sample_data?.[0];
              if (sample) {
                const idx = cols.indexOf(matched.project);
                if (idx >= 0 && sample[idx]) {
                  const pn = String(sample[idx]);
                  setProject(pn);
                }
              }
            }
            if (matched.sig_number) {
              const sample = info.sample_data?.[0];
              if (sample) {
                const idx = cols.indexOf(matched.sig_number);
                if (idx >= 0 && sample[idx]) setSigNumber(String(sample[idx]));
              }
            }
            if (matched.contractor) {
              // contractor passed as contractor_name in upload
            }
          }
          toast(`Excel parsed: ${info.sheets?.length || 1} sheet(s), ${info.total_rows} data rows`, "success");
        } catch (err) {
          toast("Could not parse Excel. Fill fields manually.", "error");
        }
        setParsing(false);
      }
    }
  };

  const handleUpload = async () => {
    if (!file) { toast("Select a file to upload", "error"); return; }
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("file_name", file.name);
      fd.append("file_type", fileType || file.name.split(".").pop().toUpperCase());
      fd.append("project_name", project);
      fd.append("sig_number", sigNumber);
      fd.append("data_type", dataType);
      fd.append("section", sec);
      fd.append("category", category);
      fd.append("season", season);
      fd.append("block", block);
      fd.append("ml_block", mlBlock);
      fd.append("location", location);
      fd.append("classification", classification);
      await api.uploadFile(fd);
      toast("File uploaded successfully", "success");
      setFile(null);
      setParsedInfo(null);
      fileRef.current && (fileRef.current.value = "");
      setFileType("");
      if (!projectName) setProject("");
      setSigNumber("");
      setDataType("");
      if (!prefillSection) setSec("");
      setCategory("");
      setSeason("");
      setBlock("");
      setMlBlock("");
      setLocation("");
      setClassification("");
      onUpload?.();
    } catch (e) {
      toast(e.message || "Upload failed", "error");
    }
    setUploading(false);
  };

  const canUpload = user?.role === "admin" || user?.role === "ops_manager" || user?.role === "data_creator";

  if (!canUpload) return null;

  return (
    <div style={S.section}>
      <div style={S.sectionTitle}>Upload File</div>
      <div style={S.grid}>
        <div style={S.field}>
          <label style={{...S.label,color:"#e74c3c",fontWeight:600,fontSize:12}}>File *</label>
          <input ref={fileRef} style={S.input} type="file" onChange={handleFileChange} />
          {parsing && <span style={{fontSize:11,color:"#1565c0",marginTop:4}}>Parsing Excel...</span>}
          {parsedInfo && <span style={{fontSize:11,color:"#2E7D32",marginTop:4}}>Excel auto-filled fields from row 1</span>}
          {!parsing && !parsedInfo && <span style={{fontSize:10,color:"#888",marginTop:4}}>Upload .xlsx/.csv → auto-fills fields from 1st row</span>}
        </div>
        <div style={S.field}>
          <label style={{...S.label,fontWeight:600,fontSize:12}}>File Type</label>
          <select style={S.select} value={fileType} onChange={e => setFileType(e.target.value)}>
            <option value="">Auto-detect</option>
            {fileTypes.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div style={S.field}>
          <label style={{...S.label,fontWeight:600,fontSize:12}}>Project Name <span style={{fontSize:10,color:"#999"}}>(blank = general)</span></label>
          {projectName ? (
            <input style={S.input} value={project} disabled />
          ) : (
            <select style={S.select} value={project} onChange={e => setProject(e.target.value)}>
              <option value="">— No project —</option>
              {projects.map(p => <option key={p.id} value={p.project_name}>{p.project_name}</option>)}
            </select>
          )}
        </div>
        <div style={S.field}>
          <label style={{...S.label,fontWeight:600,fontSize:12}}>SIG Number</label>
          <input style={S.input} value={sigNumber} onChange={e => setSigNumber(e.target.value)} placeholder="Auto from project" />
        </div>
        <div style={S.field}>
          <label style={{...S.label,fontWeight:600,fontSize:12}}>Data Type</label>
          <select style={S.select} value={dataType} onChange={e => setDataType(e.target.value)}>
            <option value="">Select</option>
            {dataTypes.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div style={S.field}>
          <label style={{...S.label,fontWeight:600,fontSize:12}}>Section Name</label>
          <select style={S.select} value={sec} onChange={e => setSec(e.target.value)}>
            <option value="">Select</option>
            {sections.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div style={S.field}>
          <label style={{...S.label,fontWeight:600,fontSize:12}}>Category</label>
          <select style={S.select} value={category} onChange={e => setCategory(e.target.value)}>
            <option value="">Select</option>
            {categories.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div style={S.field}>
          <label style={{...S.label,fontWeight:600,fontSize:12}}>Field Season</label>
          <select style={S.select} value={season} onChange={e => setSeason(e.target.value)}>
            <option value="">Select</option>
            {seasons.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div style={S.field}>
          <label style={{...S.label,fontWeight:600,fontSize:12}}>Block Name</label>
          <input style={S.input} value={block} onChange={e => setBlock(e.target.value)} placeholder="e.g. Ankleshwar" list="block-list" />
          <datalist id="block-list">
            <option value="Ankleshwar"/><option value="Ahmedabad"/><option value="Mehsana"/><option value="Rajasthan"/><option value="Other"/>
          </datalist>
        </div>
        <div style={S.field}>
          <label style={{...S.label,fontWeight:600,fontSize:12}}>ML/PML/OLAP Block</label>
          <input style={S.input} value={mlBlock} onChange={e => setMlBlock(e.target.value)} placeholder="e.g. CB-ONHP-2022/1" />
        </div>
        <div style={S.field}>
          <label style={{...S.label,fontWeight:600,fontSize:12}}>Location</label>
          <input style={S.input} value={location} onChange={e => setLocation(e.target.value)} placeholder="e.g. Linch, Jambusar" />
        </div>
        <div style={S.field}>
          <label style={{...S.label,fontWeight:600,fontSize:12}}>Classification</label>
          <select style={S.select} value={classification} onChange={e => setClassification(e.target.value)}>
            <option value="">Select</option>
            {classifs.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      </div>
      {parsedInfo && (
        <div style={{marginTop:12,padding:"8px 12px",background:"#f0fdf4",borderRadius:6,border:"1px solid #bbf7d0",fontSize:12,color:"#166534"}}>
          <strong>Excel Preview:</strong> {parsedInfo.sheets?.map?.(s => `${s.name} (${s.rows} rows)`).join(", ") || `${parsedInfo.total_rows} data rows`}
          {parsedInfo.columns?.length > 0 && <div style={{marginTop:4,color:"#555"}}>Columns: {parsedInfo.columns.join(", ")}</div>}
        </div>
      )}
      <div style={{display:"flex",alignItems:"center",gap:12,marginTop:16}}>
        <button style={{padding:"10px 24px",border:"none",borderRadius:4,cursor:"pointer",fontSize:14,fontWeight:600,background:"#0b3d91",color:"#fff",opacity:uploading||!file?0.6:1}} onClick={handleUpload} disabled={uploading||!file}>
          {uploading ? "Uploading..." : "Upload"}
        </button>
        {user?.role === "admin" && <span style={{fontSize:11,color:"#2E7D32",fontWeight:600}}>Auto-approved</span>}
        {user?.role === "ops_manager" && <span style={{fontSize:11,color:"#E65100",fontWeight:600}}>Needs Admin approval</span>}
      </div>
    </div>
  );
}
