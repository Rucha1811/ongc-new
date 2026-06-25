import { useState, useEffect } from "react";
import { api } from "../api";
import FileUploadForm from "./FileUploadForm";
import ExcelUploadModal from "./ExcelUploadModal";

const S = {
  page: { padding:0, margin:0 },
  title: { fontSize:22, fontWeight:700, marginBottom:20, color:"#0b3d91" },
  section: { background:"#fff", borderRadius:8, padding:16, marginBottom:16, boxShadow:"0 1px 4px rgba(0,0,0,0.1)" },
  sectionTitle: { fontSize:16, fontWeight:600, marginBottom:16, paddingBottom:8, borderBottom:"1px solid #eee", color:"#333" },
  grid: { display:"grid", gridTemplateColumns:"1fr 1fr", gap:16 },
  full: { display:"grid", gridTemplateColumns:"1fr", gap:12 },
  field: { display:"flex", flexDirection:"column", gap:4 },
  label: { fontSize:15, fontWeight:600, color:"#555" },
  required: { color:"#e74c3c", marginLeft:2 },
  input: { padding:"10px 14px", border:"1px solid #d0d5dd", borderRadius:6, fontSize:16, outline:"none" },
  select: { padding:"10px 14px", border:"1px solid #d0d5dd", borderRadius:6, fontSize:16, outline:"none", background:"#fff" },
  textarea: { padding:"10px 14px", border:"1px solid #d0d5dd", borderRadius:6, fontSize:16, outline:"none", minHeight:60, fontFamily:"inherit" },
  btn: { padding:"10px 24px", border:"none", borderRadius:4, cursor:"pointer", fontSize:15, fontWeight:600 },
  addBtn: { padding:"6px 14px", border:"1px dashed #0b3d91", borderRadius:4, cursor:"pointer", fontSize:13, color:"#0b3d91", background:"transparent", marginTop:8 },
  removeBtn: { color:"#e74c3c", cursor:"pointer", fontSize:16, marginLeft:8, background:"none", border:"none" },
  card: { background:"#fff", borderRadius:8, padding:16, boxShadow:"0 1px 4px rgba(0,0,0,0.1)", cursor:"pointer", transition:"box-shadow 0.2s" },
};
export default function ProjectCreation({ user, onToast }) {
  const role = user?.role || "viewer";
  const canCreate = role === "admin" || role === "ops_manager";
  const [view, setView] = useState("list");
  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState(null);
  const [loading, setLoading] = useState(true);

  const [projectNames, setProjectNames] = useState([]);
  const [surveyTypes, setSurveyTypes] = useState([]);
  const [contractorNames, setContractorNames] = useState([]);
  const [areaNames, setAreaNames] = useState([]);
  const [sections, setSections] = useState([]);
  const [seasons, setSeasons] = useState([]);
  const [projectPeriods, setProjectPeriods] = useState([]);
  const [projectCategories, setProjectCategories] = useState([]);
  const [surveyGridParams, setSurveyGridParams] = useState([]);
  const [acquisitionGeometry, setAcquisitionGeometry] = useState([]);
  const [instrumentParams, setInstrumentParams] = useState([]);
  const [sensorTypes, setSensorTypes] = useState([]);
  const [sourceParams, setSourceParams] = useState([]);

  const [form, setForm] = useState({
    project_name: "", number: "", survey_type: "", contractor_name: "",
    area_name: "", section: "", gp_code: "", category: "", location: "",
    party_chief: "", year_field_season: "",
    start_date: "", end_date: "", project_period: "",
    target_vs_achievement: "", survey_objective: "", xy_coordinates: "",
    survey_grid_params: "", acquisition_geometry: "",
    instrument_parameters: "", sensor_type: "", source_parameters: "",
    total_cost: "", per_unit_cost: "", project_highlights: "",
  });

  const [events, setEvents] = useState([{ event_date: "", description: "" }]);
  const [projectMap, setProjectMap] = useState(null);
  const [kmlFile, setKmlFile] = useState(null);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [showExcelModal, setShowExcelModal] = useState(false);
  const [projectFiles, setProjectFiles] = useState([]);
  const [allFiles, setAllFiles] = useState([]);
  const [pFilter, setPFilter] = useState({ season:"", category:"", status:"", type:"", search:"", section:"", sortBy:"" });

  const fetchProjects = async () => {
    setLoading(true);
    try {
      const [projData, fileData] = await Promise.all([
        api.listProjects(),
        api.listFiles().catch(() => []),
      ]);
      setProjects(projData);
      setAllFiles(Array.isArray(fileData) ? fileData : []);
      const fileList = Array.isArray(fileData) ? fileData : [];
      const grouped = {};
      (projData || []).forEach(p => {
        const name = p.project_name;
        if (name) {
          grouped[name] = fileList.filter(f => {
            const fn = f.project_name || f.projectName || "";
            return fn === name;
          });
        }
      });
      setProjectFiles(grouped);
    } catch { setProjects([]); setProjectFiles({}); setAllFiles([]); }
    setLoading(false);
  };

  const fetchAllLookups = async () => {
    const types = ["project_name","survey_type","contractor_name","area_name","section","season","project_period","project_category","survey_grid_params","acquisition_geometry","instrument_parameters","sensor_type","source_parameters"];
    const results = await Promise.allSettled(types.map(t => api.getLookups(t)));
    const vals = results.map(r => r.status === "fulfilled" ? r.value.map(x => x.value) : []);
    setProjectNames(vals[0]); setSurveyTypes(vals[1]); setContractorNames(vals[2]);
    setAreaNames(vals[3]); setSections(vals[4]); setSeasons(vals[5]);
    setProjectPeriods(vals[6]); setProjectCategories(vals[7]);
    setSurveyGridParams(vals[8]); setAcquisitionGeometry(vals[9]);
    setInstrumentParams(vals[10]); setSensorTypes(vals[11]); setSourceParams(vals[12]);
  };

  useEffect(() => { fetchProjects(); fetchAllLookups(); }, []);

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  const addEvent = () => setEvents(e => [...e, { event_date: "", description: "" }]);
  const removeEvent = (i) => setEvents(e => e.filter((_, idx) => idx !== i));
  const setEvent = (i, k) => (e) => setEvents(ev => {
    const n = [...ev]; n[i] = { ...n[i], [k]: e.target.value }; return n;
  });

  const openForm = () => {
    setForm({
      project_name: "", number: "", survey_type: "", contractor_name: "",
      area_name: user?.area || "", section: user?.section || "", gp_code: "", category: "", location: "",
      party_chief: user?.name || "", year_field_season: "",
      start_date: "", end_date: "", project_period: "",
      target_vs_achievement: "", survey_objective: "", xy_coordinates: "",
      survey_grid_params: "", acquisition_geometry: "",
      instrument_parameters: "", sensor_type: "", source_parameters: "",
      total_cost: "", per_unit_cost: "", project_highlights: "",
    });
    setEvents([{ event_date: "", description: "" }]);
    setProjectMap(null);
    setKmlFile(null);
    setEditingId(null);
    setView("form");
  };

  const startEdit = (p) => {
    setForm({
      project_name: p.project_name || "",
      number: p.number || "",
      survey_type: p.survey_type || "",
      contractor_name: p.contractor_name || "",
      area_name: p.area_name || "",
      section: p.section || "",
      gp_code: p.gp_code || "",
      category: p.category || "",
      location: p.location || "",
      party_chief: p.party_chief || "",
      year_field_season: p.year_field_season || "",
      start_date: p.start_date || "",
      end_date: p.end_date || "",
      project_period: p.project_period || "",
      target_vs_achievement: p.target_vs_achievement || "",
      survey_objective: p.survey_objective || "",
      xy_coordinates: p.xy_coordinates || "",
      survey_grid_params: p.survey_grid_params || "",
      acquisition_geometry: p.acquisition_geometry || "",
      instrument_parameters: p.instrument_parameters || "",
      sensor_type: p.sensor_type || "",
      source_parameters: p.source_parameters || "",
      total_cost: p.total_cost || "",
      per_unit_cost: p.per_unit_cost || "",
      project_highlights: p.project_highlights || "",
    });
    setEvents([{ event_date: "", description: "" }]);
    setProjectMap(null);
    setKmlFile(null);
    setEditingId(p.id);
    setView("form");
  };

  const openDetail = async (id) => {
    try {
      const d = await api.getProject(id);
      setSelectedProject(d);
      setView("detail");
    } catch { onToast?.("Failed to load project", "error"); }
  };

  const handleSubmit = async () => {
    const required = ["project_name","number","survey_type","contractor_name","area_name","section","category","location","party_chief","year_field_season","start_date","end_date","project_period","survey_grid_params","acquisition_geometry","instrument_parameters","sensor_type","source_parameters"];
    for (const field of required) {
      if (!form[field]) {
        onToast?.(`${field.replace(/_/g," ").replace(/\b\w/g,l=>l.toUpperCase())} is required`, "error");
        return;
      }
    }
    setSaving(true);
    try {
      if (editingId) {
        const clean = {};
        Object.entries(form).forEach(([k, v]) => {
          if (v !== undefined && v !== null && v !== "") clean[k] = v;
        });
        await api.updateProject(editingId, clean);
        onToast?.("Project updated successfully", "success");
      } else {
        const fd = new FormData();
        Object.entries(form).forEach(([k, v]) => {
          if (v !== undefined && v !== null && v !== "") fd.append(k, v);
        });
        fd.append("events_json", JSON.stringify(events.filter(e => e.event_date && e.description)));
        if (kmlFile) fd.append("kml_file", kmlFile);
        if (projectMap) fd.append("project_map", projectMap);
        fd.append("related_files", "[]");
        await api.createProject(fd);
        onToast?.("Project created successfully", "success");
      }
      setEditingId(null);
      setView("list");
      fetchProjects();
    } catch (e) {
      onToast?.(e.message || "Failed to save project", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("Delete this project?")) return;
    try {
      await api.deleteProject(id);
      onToast?.("Project deleted", "success");
      if (view === "detail") setView("list");
      fetchProjects();
    } catch (e) {
      onToast?.(e.message || "Delete failed", "error");
    }
  };

  const renderSelect = (label, key, options, required = true) => (
    <div style={S.field}>
      <label style={S.label}>{label}{required && <span style={S.required}>*</span>}</label>
      <select style={S.select} value={form[key]} onChange={set(key)}>
        <option value="">Select {label}</option>
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  );

  const renderInput = (label, key, type = "text", placeholder = "", required = true) => (
    <div style={S.field}>
      <label style={S.label}>{label}{required && <span style={S.required}>*</span>}</label>
      <input style={S.input} type={type} value={form[key]} onChange={set(key)} placeholder={placeholder} />
    </div>
  );

  const renderTextarea = (label, key, required = false) => (
    <div style={S.field}>
      <label style={S.label}>{label}{required && <span style={S.required}>*</span>}</label>
      <textarea style={S.textarea} value={form[key]} onChange={set(key)} />
    </div>
  );

  // ─── PROJECT LIST VIEW ───
  if (view === "list") {
    const seasons = [...new Set(projects.map(p=>p.year_field_season).filter(Boolean))].sort();
    const categories = [...new Set(projects.map(p=>p.category).filter(Boolean))].sort();
    const types = [...new Set(projects.map(p=>p.survey_type).filter(Boolean))].sort();
    const statuses = [...new Set(projects.map(p=>p.status||"Active").filter(Boolean))].sort();
    const filtered = projects.filter(p => {
      if (pFilter.season && p.year_field_season !== pFilter.season) return false;
      if (pFilter.category && p.category !== pFilter.category) return false;
      if (pFilter.status && (p.status||"Active") !== pFilter.status) return false;
      if (pFilter.type && p.survey_type !== pFilter.type) return false;
      if (pFilter.section && (p.section||p.gp_code) !== pFilter.section) return false;
      if (pFilter.search && !p.project_name.toLowerCase().includes(pFilter.search.toLowerCase())) return false;
      return true;
    }).sort((a,b) => {
      const s = pFilter.sortBy;
      if (!s) return 0;
      if (s === "name") return a.project_name.localeCompare(b.project_name);
      if (s === "season") return (a.year_field_season||"").localeCompare(b.year_field_season||"");
      if (s === "category") return (a.category||"").localeCompare(b.category||"");
      if (s === "status") return (a.status||"Active").localeCompare(b.status||"Active");
      if (s === "type") return (a.survey_type||"").localeCompare(b.survey_type||"");
      if (s === "section") return (a.section||a.gp_code||"").localeCompare(b.section||b.gp_code||"");
      if (s === "newest") return new Date(b.created_at||0).getTime() - new Date(a.created_at||0).getTime();
      if (s === "oldest") return new Date(a.created_at||0).getTime() - new Date(b.created_at||0).getTime();
      return 0;
    });

    const sel = { padding:"6px 10px", border:"1px solid #ddd", borderRadius:4, fontSize:12, outline:"none", background:"#fff", color:"#333" };

    return (
      <>
      <div style={S.page}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
          <div style={S.title}>Projects (Inhouse/Outsourced)</div>
          <div style={{display:"flex",gap:8}}>
            {role === "admin" || role === "ops_manager" ? <button style={{...S.btn,background:"#2E7D32",color:"#fff",fontSize:13}} onClick={() => setShowExcelModal(true)}>📥 Upload Excel</button> : null}
            {canCreate && <button style={{ ...S.btn, background:"#0b3d91", color:"#fff" }} onClick={openForm}>+ Create New Project</button>}
          </div>
        </div>

        <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:16,alignItems:"center"}}>
          <input style={{...S.input,width:160,fontSize:12}} placeholder="Search project name..." value={pFilter.search} onChange={e=>setPFilter(p=>({...p,search:e.target.value}))} />
          <select style={{...sel,fontSize:11}} value={pFilter.sortBy} onChange={e=>setPFilter(p=>({...p,sortBy:e.target.value}))}>
            <option value="">Sort by…</option>
            <option value="name">Name A-Z</option>
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
            <option value="season">Season</option>
            <option value="section">Section / GP</option>
            <option value="category">Category</option>
            <option value="type">Survey Type</option>
            <option value="status">Status</option>
          </select>
          <select style={sel} value={pFilter.season} onChange={e=>setPFilter(p=>({...p,season:e.target.value}))}><option value="">All Seasons</option>{seasons.map(s=>(<option key={s} value={s}>{s}</option>))}</select>
          <select style={sel} value={pFilter.category} onChange={e=>setPFilter(p=>({...p,category:e.target.value}))}><option value="">All Categories</option>{categories.map(c=>(<option key={c} value={c}>{c}</option>))}</select>
          <select style={sel} value={pFilter.section} onChange={e=>setPFilter(p=>({...p,section:e.target.value}))}><option value="">All Sections</option>{[...new Set(projects.map(p=>p.section||p.gp_code).filter(Boolean))].sort().map(s=>(<option key={s} value={s}>{s}</option>))}</select>
          <select style={sel} value={pFilter.type} onChange={e=>setPFilter(p=>({...p,type:e.target.value}))}><option value="">All Types</option>{types.map(t=>(<option key={t} value={t}>{t}</option>))}</select>
          <select style={sel} value={pFilter.status} onChange={e=>setPFilter(p=>({...p,status:e.target.value}))}><option value="">All Status</option>{statuses.map(s=>(<option key={s} value={s}>{s}</option>))}</select>
          {Object.values(pFilter).some(v=>v) && <button style={{...sel,color:"#c62828",cursor:"pointer"}} onClick={()=>setPFilter({season:"",category:"",status:"",type:"",search:"",section:"",sortBy:""})}>Clear</button>}
          <span style={{fontSize:11,color:"#999",marginLeft:"auto"}}>{filtered.length} of {projects.length} projects</span>
        </div>

        {loading ? (
          <div style={{ textAlign:"center", padding:40, color:"#999" }}>Loading projects...</div>
        ) : (
          <>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>{
              filtered.length===0 ? (
                <div style={{textAlign:"center",padding:40,color:"#999",gridColumn:"1/-1"}}>{projects.length===0 ? 'No projects found. Click "Create New Project" to add one.' : "No projects match the current filters."}</div>
              ) : filtered.map(p => {
                const pf = projectFiles[p.project_name] || [];
                const pfApproved = pf.filter(f=>f.status==="Approved").length;
                const pfPending = pf.filter(f=>f.status==="Pending").length;
                const pfRejected = pf.filter(f=>f.status==="Rejected").length;
                return (
                <div key={p.id} style={S.card} onClick={() => openDetail(p.id)}
                  onMouseEnter={e => e.currentTarget.style.boxShadow="0 2px 8px rgba(0,0,0,0.15)"}
                  onMouseLeave={e => e.currentTarget.style.boxShadow="0 1px 4px rgba(0,0,0,0.1)"}
                >
                  <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:6 }}>
                    <div style={{ fontSize:15, fontWeight:700, color:"#0b3d91" }}>{p.project_name}</div>
                    {p.category && <span style={{ fontSize:10, padding:"2px 8px", borderRadius:3, background:"#E3F2FD", color:"#1565C0", fontWeight:600 }}>{p.category}</span>}
                  </div>
                  <div style={{ fontSize:12, color:"#666", display:"grid", gridTemplateColumns:"1fr 1fr", gap:4 }}>
                    {p.number && <div><strong>No:</strong> {p.number}</div>}
                    {p.survey_type && <div><strong>Type:</strong> {p.survey_type}</div>}
                    {p.contractor_name && <div><strong>Contractor:</strong> {p.contractor_name}</div>}
                    {p.area_name && <div><strong>Area:</strong> {p.area_name}</div>}
                    {p.section && <div><strong>Section:</strong> {p.section}</div>}
                    {p.gp_code && <div><strong>GP:</strong> {p.gp_code}</div>}
                    {p.location && <div><strong>Location:</strong> {p.location}</div>}
                    {p.year_field_season && <div><strong>Season:</strong> {p.year_field_season}</div>}
                  </div>
                  <div style={{ marginTop:8, fontSize:11, display:"flex", gap:8, flexWrap:"wrap", alignItems:"center" }}>
                    <span style={{fontWeight:600,color:p.status==="Completed"?"#1B5E20":p.status==="Active"?"#1565C0":"#888"}}>● {p.status||"Active"}</span>
                    <span style={{color:"#999"}}>Created: {p.created_at ? new Date(p.created_at).toLocaleDateString() : ""}</span>
                    <span style={{flex:1}} />
                    {role === "admin" || role === "ops_manager" ? (
                      <>
                        <button style={{padding:"2px 8px",border:"1px solid #1565C0",borderRadius:3,background:"#fff",color:"#1565C0",cursor:"pointer",fontSize:11}}
                          onClick={e => { e.stopPropagation(); startEdit(p); }}>Edit</button>
                        <button style={{padding:"2px 8px",border:"1px solid #c62828",borderRadius:3,background:"#fff",color:"#c62828",cursor:"pointer",fontSize:11}}
                          onClick={e => { e.stopPropagation(); handleDelete(p.id); }}>Delete</button>
                      </>
                    ) : null}
                  </div>
                  {pf.length > 0 && (
                    <div style={{marginTop:6,padding:"6px 8px",background:"#f5f7fa",borderRadius:6,display:"flex",gap:12,fontSize:11}}>
                      <span><strong style={{color:"#1B5E20"}}>{pfApproved}</strong> Approved</span>
                      <span><strong style={{color:"#E65100"}}>{pfPending}</strong> Pending</span>
                      <span><strong style={{color:"#C62828"}}>{pfRejected}</strong> Rejected</span>
                      <span style={{color:"#888"}}>| {pf.length} total files</span>
                    </div>
                  )}
                </div>
              );})}
            </div>
          </>
        )}
      </div>

      {/* ─── EXCEL UPLOAD MODAL ─── */}
      <ExcelUploadModal
        show={showExcelModal}
        onClose={() => setShowExcelModal(false)}
        onToast={onToast}
        apiPreview={api.excelPreview}
        apiImport={api.excelImport}
        fields="project"
        onSuccess={() => { fetchProjects(); }}
      />
      </>
    );
  }

  // ─── PROJECT DETAIL VIEW ───
  if (view === "detail" && selectedProject) {
    const p = selectedProject;
    return <ProjectDetailView project={p} onToast={onToast} onBack={() => { setView("list"); fetchProjects(); }} onDelete={() => handleDelete(p.id)} user={user} />;
  }

  // ─── CREATE PROJECT FORM ───
  return (
    <div style={S.page}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
        <div style={S.title}>{editingId ? "Edit Project" : "Create New Project"}</div>
        <button style={{ ...S.btn, background:"#eee", color:"#333", fontSize:13 }} onClick={() => { setEditingId(null); setView("list"); }}>← Back to Projects</button>
      </div>

      <div style={S.section}>
        <div style={{ ...S.sectionTitle, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
          <span>Basic Information</span>
          {user?.section && <span style={{ fontSize:11, fontWeight:400, color:"#2E7D32" }}>Pre-filled from your profile</span>}
        </div>
        <div style={S.grid}>
          {renderInput("Project Name", "project_name", "text", "Enter project name")}
          {renderInput("Number (SIG No. / Survey No.)", "number", "text", "e.g. SIG-532")}
          {renderSelect("Category", "category", projectCategories)}
          {renderInput("Location", "location", "text", "e.g. Linch, Jambusar")}
          {renderSelect("Survey Type", "survey_type", surveyTypes)}
          {renderSelect("Contractor Name", "contractor_name", contractorNames)}
          {renderSelect("Area Name", "area_name", areaNames)}
          {renderSelect("Section / GPxx", "section", sections)}
          {renderInput("GP Code (for historical)", "gp_code", "text", "e.g. GP-05")}
          {renderInput("Party Chief / Project Coordinator", "party_chief", "text", "Enter name")}
          {renderSelect("Year / Field Season", "year_field_season", seasons)}
        </div>
      </div>

      <div style={S.section}>
        <div style={S.sectionTitle}>Project Period</div>
        <div style={S.grid}>
          {renderInput("Start Date", "start_date", "date")}
          {renderInput("End Date", "end_date", "date")}
          {renderSelect("Project Period", "project_period", projectPeriods)}
        </div>
      </div>

      <div style={S.section}>
        <div style={S.sectionTitle}>Chronology of Events</div>
        {events.map((ev, i) => (
          <div key={i} style={{ display:"flex", gap:8, alignItems:"center", marginBottom:8 }}>
            <input style={{ ...S.input, width:160 }} type="date" value={ev.event_date} onChange={setEvent(i, "event_date")} />
            <input style={{ ...S.input, flex:1 }} type="text" value={ev.description} onChange={setEvent(i, "description")} placeholder="Event description" />
            {events.length > 1 && <button style={S.removeBtn} onClick={() => removeEvent(i)}>×</button>}
          </div>
        ))}
        <button style={S.addBtn} onClick={addEvent}>+ Add Event</button>
      </div>

      <div style={S.section}>
        <div style={S.sectionTitle}>Technical Details</div>
        <div style={S.grid}>
          {renderSelect("Survey Grid Parameters", "survey_grid_params", surveyGridParams)}
          {renderSelect("Acquisition Geometry", "acquisition_geometry", acquisitionGeometry)}
          {renderSelect("Instrument Parameters", "instrument_parameters", instrumentParams)}
          {renderSelect("Sensor Type", "sensor_type", sensorTypes)}
          {renderSelect("Source Parameters", "source_parameters", sourceParams)}
        </div>
        <div style={{ ...S.full, marginTop:12 }}>
          {renderTextarea("Target vs Achievement", "target_vs_achievement")}
          {renderTextarea("Survey Objective / Targeted Depth", "survey_objective")}
          {renderTextarea("XY Coordinates of the Area", "xy_coordinates")}
        </div>
      </div>

      <div style={S.section}>
        <div style={S.sectionTitle}>Project Cost</div>
        <div style={S.grid}>
          {renderInput("Total Cost of the Project", "total_cost", "number", "", false)}
          {renderInput("Per Unit Project Cost", "per_unit_cost", "number", "", false)}
        </div>
      </div>

      <div style={S.section}>
        <div style={S.sectionTitle}>Highlights & Documents</div>
        <div style={S.full}>
          {renderTextarea("Project Highlights", "project_highlights")}
        </div>
        <div style={{ ...S.grid, marginTop:12 }}>
          <div style={S.field}>
            <label style={S.label}>KML File (Coordinates)</label>
            <input style={S.input} type="file" accept=".kml,.kmz" onChange={e => setKmlFile(e.target.files[0])} />
          </div>
          <div style={S.field}>
            <label style={S.label}>Project Map</label>
            <input style={S.input} type="file" accept="image/*,.pdf" onChange={e => setProjectMap(e.target.files[0])} />
          </div>
        </div>
      </div>

      <div style={{ display:"flex", gap:12, justifyContent:"flex-end" }}>
        <button style={{ ...S.btn, background:"#0b3d91", color:"#fff", opacity:saving?0.6:1 }} onClick={handleSubmit} disabled={saving}>
          {saving ? "Saving..." : editingId ? "Save Changes" : "Create Project"}
        </button>
      </div>
    </div>
  );
}

function ProjectDetailView({ project, onToast, onBack, onDelete, user }) {
  const p = project;
  const [projectFiles, setProjectFiles] = useState([]);
  const [fileTab, setFileTab] = useState("all");
  const [loadingFiles, setLoadingFiles] = useState(false);
  const [rejectModal, setRejectModal] = useState(null);
  const [rejectReason, setRejectReason] = useState("");
  const [search, setSearch] = useState("");
  const [searchResults, setSearchResults] = useState(null);
  const [searching, setSearching] = useState(false);
  const [classFilter, setClassFilter] = useState("");
  const [seasonFilter, setSeasonFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [fileTypeFilter, setFileTypeFilter] = useState("");
  const [dataTypeFilter, setDataTypeFilter] = useState("");
  const [blockFilter, setBlockFilter] = useState("");
  const [sortBy, setSortBy] = useState("name");
  const [sortDir, setSortDir] = useState("asc");
  const [editingType, setEditingType] = useState(null);
  const [editingClass, setEditingClass] = useState(null);
  const [projectStatus, setProjectStatus] = useState(p.status || "Active");
  const [projStatusLoading, setProjStatusLoading] = useState(false);

  const [classifs, setClassifs] = useState(["General / Available for All","Sensitive / Internal Use","Confidential","Highly Confidential / Restricted"]);

  const actualClassifs = [...new Set(projectFiles.map(f => f.classification).filter(Boolean))];

  const role = user?.role || "viewer";
  const canApprove = role === "admin" || role === "ops_manager";
  const canCreate = role === "admin" || role === "ops_manager";

  const fetchProjectFiles = async () => {
    setLoadingFiles(true);
    try {
      const data = await api.searchFiles({ project_name: p.project_name });
      setProjectFiles(data || []);
      setSearchResults(null);
    } catch { setProjectFiles([]); }
    setLoadingFiles(false);
  };

  useEffect(() => { fetchProjectFiles(); }, [p.project_name]);

  const [lookups, setLookups] = useState({ seasons:[], categories:[], blocks:[], fileTypes:[], dataTypes:[] });
  useEffect(() => {
    Promise.all([
      api.getLookups("season").then(r => (r||[]).map(x=>x.value)).catch(() => []),
      api.getLookups("category").then(r => (r||[]).map(x=>x.value)).catch(() => []),
      api.getLookups("block").then(r => (r||[]).map(x=>x.value)).catch(() => []),
      api.getLookups("file_type").then(r => (r||[]).map(x=>x.value)).catch(() => []),
      api.getLookups("data_type").then(r => (r||[]).map(x=>x.value)).catch(() => []),
      api.getLookups("classification").then(r => setClassifs((r||[]).map(x=>x.value))).catch(() => {}),
    ]).then(([seasons, categories, blocks, fileTypes, dataTypes]) => {
      setLookups({ seasons, categories, blocks, fileTypes, dataTypes });
    });
  }, []);

  const startYear = p.start_date ? p.start_date.split("-")[0] : (p.year_field_season?.match(/\d{4}/)?.[0] || "");

  const handleStatusChange = async (newStatus) => {
    setProjStatusLoading(true);
    try {
      await api.updateProject(p.id, { status: newStatus });
      setProjectStatus(newStatus);
      onToast?.(`Project status changed to "${newStatus}"`, "success");
    } catch (e) {
      onToast?.(e.message || "Failed to update status", "error");
    }
    setProjStatusLoading(false);
  };

  const handleUpdateFileType = async (fileId, newType) => {
    try {
      await api.updateFile(fileId, { file_type: newType });
      onToast?.("File type updated", "success");
      fetchProjectFiles();
    } catch (e) {
      onToast?.(e.message || "Update failed", "error");
    }
    setEditingType(null);
  };

  const handleUpdateClassification = async (fileId, newClass) => {
    try {
      await api.updateFile(fileId, { classification: newClass });
      onToast?.("Classification updated", "success");
      fetchProjectFiles();
    } catch (e) {
      onToast?.(e.message || "Update failed", "error");
    }
    setEditingClass(null);
  };

  const handleSearch = async () => {
    if (!search.trim()) { setSearchResults(null); return; }
    setSearching(true);
    try {
      const data = await api.searchFiles({ search: search.trim(), project_name: p.project_name });
      setSearchResults(data || []);
    } catch { setSearchResults([]); }
    setSearching(false);
  };

  const handleApprove = async (file) => {
    try {
      await api.approveFile(file.id, file.classification);
      onToast?.(`"${file.fileName}" approved`, "success");
      fetchProjectFiles();
    } catch (e) {
      onToast?.(e.message || "Approve failed", "error");
    }
  };

  const handleReject = async () => {
    if (!rejectModal || !rejectReason.trim()) return;
    try {
      await api.rejectFile(rejectModal.id, rejectReason.trim());
      onToast?.(`"${rejectModal.fileName}" rejected`, "success");
      setRejectModal(null);
      setRejectReason("");
      fetchProjectFiles();
    } catch (e) {
      onToast?.(e.message || "Reject failed", "error");
    }
  };

  const displayedFiles = (searchResults || projectFiles).filter(f => {
    if (classFilter && f.classification !== classFilter) return false;
    if (seasonFilter && f.season !== seasonFilter) return false;
    if (categoryFilter && f.category !== categoryFilter) return false;
    if (fileTypeFilter && f.file_type !== fileTypeFilter) return false;
    if (dataTypeFilter && f.data_type !== dataTypeFilter) return false;
    if (blockFilter && f.block !== blockFilter) return false;
    return true;
  }).sort((a, b) => {
    const d = sortDir === "desc" ? -1 : 1;
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
    const va = g(a, sortBy), vb = g(b, sortBy);
    return va < vb ? -1 * d : va > vb ? 1 * d : 0;
  });

  const allSeasons = [...new Set([...lookups.seasons, ...projectFiles.map(x=>x.season).filter(Boolean)])].sort();
  const allCategories = [...new Set([...lookups.categories, ...projectFiles.map(x=>x.category).filter(Boolean)])].sort();
  const allBlocks = [...new Set([...lookups.blocks, ...projectFiles.map(x=>x.block).filter(Boolean)])].sort();
  const allFileTypes = [...new Set([...lookups.fileTypes, ...projectFiles.map(x=>x.file_type).filter(Boolean)])].sort();
  const allDataTypes = [...new Set([...lookups.dataTypes, ...projectFiles.map(x=>x.data_type).filter(Boolean)])].sort();

  const sel = { padding:"8px 14px", border:"1px solid #ddd", borderRadius:4, fontSize:15, outline:"none", background:"#fff", color:"#333" };
  const sortToggle = (k) => { if (sortBy === k) setSortDir(d => d === "asc" ? "desc" : "asc"); else { setSortBy(k); setSortDir("asc"); } };
  const sortArrow = (k) => sortBy === k ? (sortDir === "asc" ? " ▲" : " ▼") : "";
  const thSort = (k, l) => (
    <th style={{padding:"8px 12px",textAlign:"left",borderBottom:"2px solid #e0e4e8",fontWeight:600,color:"#333",background:"#f5f7fa",fontSize:15,cursor:"pointer",userSelect:"none",whiteSpace:"nowrap"}} onClick={() => sortToggle(k)}>
      {l}{sortArrow(k)}
    </th>
  );

  const statusCounts = projectFiles.reduce((a, f) => {
    const s = f.status || "Unknown";
    a[s] = (a[s] || 0) + 1;
    return a;
  }, {});

  const fileTabs = [
    { key: "all", label: `All (${projectFiles.length})` },
    { key: "Approved", label: `Approved (${statusCounts["Approved"] || 0})` },
    { key: "Pending", label: `Pending (${statusCounts["Pending"] || 0})` },
    { key: "Rejected", label: `Rejected (${statusCounts["Rejected"] || 0})` },
  ];

  const badge = (label, color) => <span style={{ display:"inline-block", background:color+"18", color, padding:"2px 8px", borderRadius:10, fontSize:11, fontWeight:600 }}>{label}</span>;

  return (
    <div style={{ padding:0 }}>
      {rejectModal && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.5)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:9999 }} onClick={() => setRejectModal(null)}>
          <div style={{ background:"#fff", borderRadius:10, padding:24, width:420, maxWidth:"90vw", boxShadow:"0 8px 32px rgba(0,0,0,0.3)" }} onClick={e => e.stopPropagation()}>
            <div style={{ fontSize:16, fontWeight:700, color:"#C62828", marginBottom:12 }}>Reject File</div>
            <div style={{ fontSize:13, color:"#666", marginBottom:8 }}>Reason for rejecting <strong>{rejectModal.fileName}</strong>:</div>
            <textarea style={{ width:"100%", padding:"8px 10px", border:"1px solid #ddd", borderRadius:4, fontSize:13, minHeight:80, fontFamily:"inherit", outline:"none" }} value={rejectReason} onChange={e => setRejectReason(e.target.value)} placeholder="Enter rejection reason..." autoFocus />
            <div style={{ display:"flex", gap:8, justifyContent:"flex-end", marginTop:12 }}>
              <button style={{ padding:"8px 20px", border:"none", borderRadius:4, cursor:"pointer", fontSize:13, fontWeight:600, background:"#eee", color:"#333" }} onClick={() => setRejectModal(null)}>Cancel</button>
              <button style={{ padding:"8px 20px", border:"none", borderRadius:4, cursor:"pointer", fontSize:13, fontWeight:600, background:"#C62828", color:"#fff", opacity:rejectReason.trim()?1:0.5 }} onClick={handleReject} disabled={!rejectReason.trim()}>Confirm Reject</button>
            </div>
          </div>
        </div>
      )}

      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
        <button style={{ padding:"10px 24px", border:"none", borderRadius:4, cursor:"pointer", fontSize:13, fontWeight:600, background:"#eee", color:"#333" }} onClick={onBack}>← Back to Projects</button>
        <div style={{display:"flex",alignItems:"center",gap:12}}>
          <span style={{fontSize:18,fontWeight:700,color:"#0b3d91"}}>{p.project_name}</span>
          {canApprove ? (
            <select value={projectStatus} onChange={e => handleStatusChange(e.target.value)} disabled={projStatusLoading}
              style={{fontSize:12,padding:"2px 8px",borderRadius:4,border:"1px solid",borderColor:projectStatus==="Active"?"#1B5E20":"#E65100",background:projectStatus==="Active"?"#E8F5E9":"#FFF3E0",color:projectStatus==="Active"?"#1B5E20":"#E65100",fontWeight:600,outline:"none",cursor:"pointer"}}>
              <option value="Active">Active</option>
              <option value="Completed">Completed</option>
              <option value="On Hold">On Hold</option>
              <option value="Cancelled">Cancelled</option>
            </select>
          ) : (
            <span style={{fontSize:12,padding:"2px 10px",borderRadius:4,background:projectStatus==="Active"?"#E8F5E9":"#FFF3E0",color:projectStatus==="Active"?"#1B5E20":"#E65100",fontWeight:600}}>{projectStatus}</span>
          )}
        </div>
        <button style={{ padding:"10px 24px", border:"none", borderRadius:4, cursor:"pointer", fontSize:13, fontWeight:600, background:"#e74c3c", color:"#fff" }} onClick={onDelete}>Delete</button>
      </div>

      {role !== "viewer" && (
        <FileUploadForm user={user} projectName={p.project_name} onUpload={fetchProjectFiles} onToast={onToast} />
      )}

      <div style={S.section}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8 }}>
          <div style={S.sectionTitle}>Project Files ({projectFiles.length})</div>
          <div style={{ display:"flex", gap:4 }}>
            {fileTabs.map(t => (
              <button key={t.key} onClick={() => setFileTab(t.key)}
                style={{ padding:"5px 14px", borderRadius:4, border:"none", cursor:"pointer", fontSize:11, fontWeight:600, background: fileTab === t.key ? "#0b3d91" : "#e0e0e0", color: fileTab === t.key ? "#fff" : "#555" }}>
                {t.label}
              </button>
            ))}
          </div>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10,marginBottom:12}}>
          {[["Total Files",projectFiles.length,"#1565C0"],["Approved",(statusCounts["Approved"]||0),"#2E7D32"],["Pending",(statusCounts["Pending"]||0),"#E65100"],["Rejected",(statusCounts["Rejected"]||0),"#C62828"]].map(([l,v,c])=>(
            <div key={l} style={{background:"#f9fafb",borderRadius:8,padding:"10px 16px",textAlign:"center"}}>
              <div style={{fontSize:20,fontWeight:800,color:c}}>{v}</div>
              <div style={{fontSize:10,color:"#888",fontWeight:600,textTransform:"uppercase",marginTop:2}}>{l}</div>
            </div>
          ))}
        </div>

        <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:12,alignItems:"center"}}>
          <input style={{...S.input,width:200,fontSize:15}} placeholder="Keyword / semantic search..." value={search}
            onChange={e => setSearch(e.target.value)}
            onKeyDown={e => e.key==="Enter" && handleSearch()} />
          <button style={{padding:"6px 12px",border:"none",borderRadius:4,cursor:"pointer",fontSize:14,fontWeight:600,background:"#0b3d91",color:"#fff"}} onClick={handleSearch}>
            {searching ? "…" : "Search"}
          </button>
          {searchResults && <button style={{padding:"6px 12px",border:"1px solid #ddd",borderRadius:4,cursor:"pointer",fontSize:14,background:"#fff",color:"#666"}}
            onClick={() => { setSearch(""); setSearchResults(null); }}>Clear</button>}
          <select style={sel} value={seasonFilter} onChange={e => setSeasonFilter(e.target.value)}>
            <option value="">All Seasons</option>
            {allSeasons.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <select style={sel} value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)}>
            <option value="">All Categories</option>
            {allCategories.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <select style={sel} value={classFilter} onChange={e => setClassFilter(e.target.value)}>
            <option value="">All Classifications</option>
            {actualClassifs.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <select style={sel} value={fileTypeFilter} onChange={e => setFileTypeFilter(e.target.value)}>
            <option value="">All File Types</option>
            {allFileTypes.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <select style={sel} value={dataTypeFilter} onChange={e => setDataTypeFilter(e.target.value)}>
            <option value="">All Data Types</option>
            {allDataTypes.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <select style={sel} value={blockFilter} onChange={e => setBlockFilter(e.target.value)}>
            <option value="">All Blocks</option>
            {allBlocks.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <select style={sel} value={sortBy} onChange={e => setSortBy(e.target.value)}>
            <option value="name">Sort: Name</option><option value="date">Sort: Date</option>
            <option value="project">Sort: Project</option><option value="type">Sort: Type</option>
            <option value="category">Sort: Category</option><option value="season">Sort: Season</option>
            <option value="classification">Sort: Classification</option><option value="status">Sort: Status</option>
          </select>
          <button style={{...sel,cursor:"pointer"}} onClick={() => setSortDir(d => d === "asc" ? "desc" : "asc")}>
            {sortDir === "asc" ? "↑ Asc" : "↓ Desc"}
          </button>
        </div>

        {searchResults !== null && (
          <div style={{fontSize:12,color:"#666",marginBottom:8}}>
            Search results: {searchResults.length} file{searchResults.length!==1?"s":""} found — includes exact + semantic matches
          </div>
        )}

        {loadingFiles || searching ? (
          <div style={{ fontSize:13, color:"#999", padding:20, textAlign:"center" }}>Loading files...</div>
        ) : displayedFiles.length === 0 ? (
          <div style={{ fontSize:13, color:"#999", padding:20, textAlign:"center" }}>No files found.</div>
        ) : (
          <table style={{ width:"100%", borderCollapse:"collapse", fontSize:12 }}>
            <thead>
              <tr style={{ background:"#f5f7fa" }}>
                <th style={{padding:"8px 10px",textAlign:"left",borderBottom:"2px solid #e0e4e8",color:"#666",fontSize:11,textTransform:"uppercase"}}>#</th>
                {thSort("name","File Name")}
                <th style={{padding:"8px 10px",textAlign:"left",borderBottom:"2px solid #e0e4e8",color:"#666",fontSize:11,textTransform:"uppercase"}}>Type <span style={{fontWeight:400,color:"#999"}}>(click to change)</span></th>
                {thSort("category","Category")}
                {thSort("classification","Classification")}
                <th style={{padding:"8px 10px",textAlign:"left",borderBottom:"2px solid #e0e4e8",color:"#666",fontSize:11,textTransform:"uppercase"}}>Uploaded By</th>
                {thSort("date","Date")}
                {thSort("status","Status")}
                {canApprove && <th style={{padding:"8px 10px",textAlign:"left",borderBottom:"2px solid #e0e4e8",color:"#666",fontSize:11,textTransform:"uppercase"}}>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {displayedFiles
                .filter(f => fileTab === "all" || f.status === fileTab)
                .map((f, i) => (
                <tr key={f.id} style={{ borderBottom:"1px solid #f0f4f8" }}>
                  <td style={{ padding:"8px 10px", color:"#999" }}>{i + 1}</td>
                  <td style={{ padding:"8px 10px", fontWeight:500, color:"#0b3d91" }}>
                    {f.fileName || f.file_name}
                    {f.snippet && <div style={{ fontSize:11, color:"#555", marginTop:3, padding:"3px 6px", background:"#fafafa", borderRadius:4, borderLeft:"3px solid #90caf9", lineHeight:1.3, fontWeight:400 }}>{f.snippet}</div>}
                  </td>
                  <td style={{ padding:"8px 10px" }}>
                    {editingType === f.id ? (
                      <select style={{ ...S.select, fontSize:11, padding:"2px 6px" }} value={f.fileType || f.file_type || ""} onChange={e => handleUpdateFileType(f.id, e.target.value)} autoFocus onBlur={() => setEditingType(null)}>
                        {allFileTypes.map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                    ) : (
                      <span style={{ background:"#E3F2FD", color:"#1565c0", padding:"2px 6px", borderRadius:4, fontWeight:700, fontSize:11, cursor:"pointer", borderBottom:"2px dotted #1565c0" }} onClick={() => setEditingType(f.id)} title="Click to change file type">{f.fileType || f.file_type} (edit)</span>
                    )}
                  </td>
                  <td style={{ padding:"8px 10px", color:"#555" }}>{f.category || "—"}</td>
                  <td style={{ padding:"8px 10px" }}>
                    {editingClass === f.id ? (
                      <select style={{ ...S.select, fontSize:11, padding:"2px 6px" }} value={f.classification || ""} onChange={e => handleUpdateClassification(f.id, e.target.value)} autoFocus onBlur={() => setEditingClass(null)}>
                        {classifs.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    ) : (
                      <span style={{ cursor:"pointer", borderBottom:"2px dotted" }} onClick={() => setEditingClass(f.id)} title="Click to change classification">
                        {badge(f.classification, f.classification === "Confidential" ? "#C62828" : f.classification === "Highly Confidential / Restricted" ? "#E65100" : f.classification === "Sensitive / Internal Use" ? "#E65100" : "#2E7D32")}
                      </span>
                    )}
                  </td>
                  <td style={{ padding:"8px 10px" }}>{f.uploadedByName}</td>
                  <td style={{ padding:"8px 10px" }}>{f.uploadDate ? new Date(f.uploadDate).toLocaleDateString() : ""}</td>
                  <td style={{ padding:"8px 10px" }}>{badge(f.status, f.status === "Approved" ? "#2E7D32" : f.status === "Pending" ? "#E65100" : "#C62828")}</td>
                    {canApprove && (
                    <td style={{ padding:"8px 10px" }}>
                      {f.status === "Pending" && f.uploadedBy !== user?.id ? (
                        (user?.role === "admin" || f.uploaded_by_role !== "ops_manager") ? (
                          <div style={{ display:"flex", gap:4 }}>
                            <button style={{ padding:"3px 10px", border:"none", borderRadius:4, cursor:"pointer", fontSize:10, fontWeight:600, background:"#2E7D32", color:"#fff" }} onClick={() => handleApprove(f)} title="Approve">Approve</button>
                            <button style={{ padding:"3px 10px", border:"none", borderRadius:4, cursor:"pointer", fontSize:10, fontWeight:600, background:"#C62828", color:"#fff" }} onClick={() => setRejectModal(f)} title="Reject">Reject</button>
                          </div>
                        ) : (
                          <span style={{fontSize:10,color:"#999",fontStyle:"italic"}}>Ops manager</span>
                        )
                      ) : f.uploadedBy === user?.id ? (
                        <span style={{fontSize:10,color:"#999",fontStyle:"italic"}}>Own upload</span>
                      ) : (
                        <span style={{ fontSize:11, color:"#999" }}>—</span>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div style={S.section}>
        <div style={S.sectionTitle}>Project Details</div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:8, fontSize:13 }}>
            {p.number && <div><strong>Number:</strong> {p.number}</div>}
            {p.survey_type && <div><strong>Survey Type:</strong> {p.survey_type}</div>}
            {p.contractor_name && <div><strong>Contractor:</strong> {p.contractor_name}</div>}
            {p.area_name && <div><strong>Area:</strong> {p.area_name}</div>}
            {p.section && <div><strong>Section:</strong> {p.section}</div>}
            {p.category && <div><strong>Category:</strong> {p.category}</div>}
            {p.location && <div><strong>Location:</strong> {p.location}</div>}
            {p.party_chief && <div><strong>Party Chief:</strong> {p.party_chief}</div>}
          {p.year_field_season && <div><strong>Field Season:</strong> {p.year_field_season}</div>}
          {p.start_date && <div><strong>Start:</strong> {p.start_date}</div>}
          {p.end_date && <div><strong>End:</strong> {p.end_date}</div>}
          {p.project_period && <div><strong>Period:</strong> {p.project_period}</div>}
          {p.total_cost !== null && <div><strong>Total Cost:</strong> ₹{p.total_cost}</div>}
          {p.per_unit_cost !== null && <div><strong>Per Unit Cost:</strong> ₹{p.per_unit_cost}</div>}
        </div>
        {p.target_vs_achievement && <div style={{ marginTop:12, fontSize:13 }}><strong>Target vs Achievement:</strong><br/>{p.target_vs_achievement}</div>}
        {p.survey_objective && <div style={{ marginTop:8, fontSize:13 }}><strong>Survey Objective:</strong><br/>{p.survey_objective}</div>}
        {p.project_highlights && <div style={{ marginTop:8, fontSize:13 }}><strong>Highlights:</strong><br/>{p.project_highlights}</div>}
      </div>

      {p.events && p.events.length > 0 && (
        <div style={S.section}>
          <div style={S.sectionTitle}>Chronology of Events</div>
          {p.events.map((ev, i) => (
            <div key={i} style={{ display:"flex", gap:12, padding:"6px 0", borderBottom:"1px solid #f0f4f8", fontSize:13 }}>
              <span style={{ fontWeight:600, minWidth:100 }}>{ev.event_date}</span>
              <span>{ev.description}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
