import { useState, useEffect } from "react";
import { api } from "../api";

const S = {
  page: { padding: "16px 20px", maxWidth:"none", margin:0 },
  title: { fontSize:20, fontWeight:700, color:"#0b3d91", marginBottom:16 },
  card: { background:"#fff", borderRadius:10, padding:20, boxShadow:"0 1px 4px rgba(0,0,0,0.08)" },
  section: { background:"#fff", borderRadius:10, padding:20, marginBottom:16, boxShadow:"0 1px 4px rgba(0,0,0,0.08)" },
  sectionTitle: { fontSize:15, fontWeight:700, color:"#0b3d91", marginBottom:12, borderBottom:"2px solid #e0e4e8", paddingBottom:6 },
  input: { width:"100%", padding:"8px 12px", border:"1px solid #ddd", borderRadius:4, fontSize:14, outline:"none", marginBottom:8, boxSizing:"border-box" },
  textarea: { width:"100%", padding:"8px 12px", border:"1px solid #ddd", borderRadius:4, fontSize:14, outline:"none", marginBottom:8, minHeight:60, fontFamily:"inherit", boxSizing:"border-box" },
  select: { padding:"8px 12px", border:"1px solid #ddd", borderRadius:4, fontSize:14, outline:"none", background:"#fff", marginBottom:8 },
  btn: (bg="#0b3d91") => ({ padding:"6px 14px", border:"none", borderRadius:4, background:bg, color:"#fff", fontWeight:600, fontSize:13, cursor:"pointer", display:"inline-flex", alignItems:"center", gap:4 }),
  btnSm: (bg="#0b3d91") => ({ padding:"4px 10px", border:"none", borderRadius:3, background:bg, color:"#fff", fontWeight:600, fontSize:12, cursor:"pointer" }),
  tag: { display:"inline-block", padding:"2px 10px", borderRadius:12, fontSize:12, fontWeight:600, background:"#e8edf2", color:"#0b3d91", marginRight:4, marginBottom:4 },
};

const FIELD_TYPES = ["text","textarea","number","date","select"];

const SEED_TEMPLATES = [
  {
    name:"Weekly Operations Report", period_type:"weekly",
    description:"Standard weekly report for field operations, drilling progress, equipment, HSE, and issues.",
    sections:[
      { key:"ops_update", title:"Operations Update", fields:[
        { key:"location", label:"Location / Rig", type:"text", required:true },
        { key:"activity", label:"Current Activity", type:"text", required:true },
        { key:"progress", label:"Progress (%)", type:"number", required:true },
        { key:"planned", label:"Next Week Plan", type:"textarea" },
      ]},
      { key:"drilling", title:"Drilling Progress", fields:[
        { key:"well_name", label:"Well Name", type:"text" },
        { key:"depth", label:"Current Depth (m)", type:"number" },
        { key:"target_depth", label:"Target Depth (m)", type:"number" },
        { key:"remarks", label:"Remarks", type:"textarea" },
      ]},
      { key:"equipment", title:"Equipment Status", fields:[
        { key:"equip_name", label:"Equipment", type:"text" },
        { key:"status", label:"Status", type:"select" },
        { key:"downtime", label:"Downtime (hrs)", type:"number" },
      ]},
      { key:"hse", title:"HSE Report", fields:[
        { key:"incidents", label:"Incidents (if any)", type:"textarea" },
        { key:"safety_observations", label:"Safety Observations", type:"textarea" },
        { key:"manhours", label:"Man-hours (LTI-free)", type:"number" },
      ]},
      { key:"issues", title:"Issues & Resolutions", fields:[
        { key:"issues_list", label:"Issues Identified", type:"textarea" },
        { key:"resolution", label:"Resolution / Action Taken", type:"textarea" },
        { key:"escalation", label:"Escalation Needed?", type:"text" },
      ]},
    ],
  },
  {
    name:"Monthly Progress Report", period_type:"monthly",
    description:"Comprehensive monthly progress report covering projects, targets, manpower, budget, and challenges.",
    sections:[
      { key:"exec_summary", title:"Executive Summary", fields:[
        { key:"highlights", label:"Key Highlights", type:"textarea", required:true },
        { key:"overall_status", label:"Overall Status", type:"select", required:true },
        { key:"summary", label:"Brief Summary", type:"textarea", required:true },
      ]},
      { key:"project_progress", title:"Project Progress", fields:[
        { key:"projects_completed", label:"Projects Completed", type:"number" },
        { key:"projects_ongoing", label:"Projects Ongoing", type:"number" },
        { key:"projects_planned", label:"Projects Planned", type:"number" },
        { key:"details", label:"Project-wise Details", type:"textarea" },
      ]},
      { key:"targets", title:"Targets vs Achievement", fields:[
        { key:"target_volume", label:"Target Volume (SKM)", type:"number" },
        { key:"achieved_volume", label:"Achieved Volume (SKM)", type:"number" },
        { key:"pct_achievement", label:"Achievement (%)", type:"number" },
        { key:"deviation", label:"Reasons for Deviation", type:"textarea" },
      ]},
      { key:"manpower", title:"Manpower Status", fields:[
        { key:"total_staff", label:"Total Staff", type:"number" },
        { key:"field_staff", label:"Field Staff", type:"number" },
        { key:"office_staff", label:"Office Staff", type:"number" },
        { key:"vacancies", label:"Vacancies", type:"number" },
      ]},
      { key:"budget", title:"Budget Utilization", fields:[
        { key:"allocated", label:"Budget Allocated (₹)", type:"number" },
        { key:"utilized", label:"Budget Utilized (₹)", type:"number" },
        { key:"remaining", label:"Remaining (₹)", type:"number" },
        { key:"notes", label:"Notes", type:"textarea" },
      ]},
      { key:"challenges", title:"Challenges & Recommendations", fields:[
        { key:"challenges", label:"Challenges Faced", type:"textarea" },
        { key:"recommendations", label:"Recommendations", type:"textarea" },
      ]},
    ],
  },
  {
    name:"Quarterly Performance Review", period_type:"quarterly",
    description:"Quarterly review covering overall performance, KPI achievements, technical milestones, financial review, and roadmap.",
    sections:[
      { key:"overview", title:"Quarter Overview", fields:[
        { key:"quarter", label:"Quarter", type:"text", required:true },
        { key:"major_achievements", label:"Major Achievements", type:"textarea", required:true },
        { key:"key_metrics", label:"Key Metrics Summary", type:"textarea" },
      ]},
      { key:"kpi", title:"KPI Summary", fields:[
        { key:"kpi_1", label:"KPI 1 — Name & Value", type:"text" },
        { key:"kpi_2", label:"KPI 2 — Name & Value", type:"text" },
        { key:"kpi_3", label:"KPI 3 — Name & Value", type:"text" },
        { key:"overall_kpi", label:"Overall KPI Achievement (%)", type:"number" },
      ]},
      { key:"technical", title:"Technical Achievements", fields:[
        { key:"new_tech", label:"New Technology/Process Adopted", type:"textarea" },
        { key:"innovation", label:"Innovations", type:"textarea" },
        { key:"publications", label:"Papers / Publications", type:"textarea" },
      ]},
      { key:"financial", title:"Financial Review", fields:[
        { key:"budget_allocated", label:"Budget Allocated (₹ Cr)", type:"number" },
        { key:"expenditure", label:"Expenditure (₹ Cr)", type:"number" },
        { key:"savings", label:"Savings / Overrun", type:"text" },
      ]},
      { key:"team", title:"Team Performance", fields:[
        { key:"headcount", label:"Team Headcount", type:"number" },
        { key:"training", label:"Training / Certifications Completed", type:"textarea" },
        { key:"attrition", label:"Attrition / New Joiners", type:"textarea" },
      ]},
      { key:"road_ahead", title:"Road Ahead", fields:[
        { key:"next_q_plan", label:"Next Quarter Plan", type:"textarea" },
        { key:"strategic", label:"Strategic Initiatives", type:"textarea" },
        { key:"risks", label:"Risks & Mitigation", type:"textarea" },
      ]},
    ],
  },
];

function SectionEditor({ section, onChange }) {
  const upd = (key, val) => onChange({ ...section, [key]: val });
  const addField = () => upd("fields", [...(section.fields||[]), { key:"", label:"", type:"text", required:false }]);
  const updField = (i, f) => {
    const fs = [...(section.fields||[])]; fs[i] = f; upd("fields", fs);
  };
  const delField = (i) => {
    const fs = (section.fields||[]).filter((_, idx) => idx !== i);
    upd("fields", fs);
  };
  return (
    <div style={{ background:"#f8faff", borderRadius:8, padding:16, marginBottom:12, border:"1px solid #d0d8e8" }}>
      <div style={{ display:"flex", gap:8, marginBottom:8, alignItems:"center" }}>
        <input style={{ ...S.input, marginBottom:0, flex:1 }} placeholder="Section title (e.g. Operations Update)" value={section.title||""} onChange={e => upd("title", e.target.value)} />
        <input style={{ ...S.input, marginBottom:0, width:180 }} placeholder="Key (e.g. operations)" value={section.key||""} onChange={e => upd("key", e.target.value)} />
      </div>
      <div style={{ fontSize:13, fontWeight:600, color:"#555", marginBottom:6 }}>Fields:</div>
      {(section.fields||[]).map((f, i) => (
        <div key={i} style={{ display:"flex", gap:6, alignItems:"center", marginBottom:6, flexWrap:"wrap" }}>
          <input style={{ ...S.input, marginBottom:0, width:140 }} placeholder="Key" value={f.key} onChange={e => updField(i, {...f, key:e.target.value})} />
          <input style={{ ...S.input, marginBottom:0, width:160 }} placeholder="Label" value={f.label} onChange={e => updField(i, {...f, label:e.target.value})} />
          <select style={{ ...S.select, marginBottom:0 }} value={f.type} onChange={e => updField(i, {...f, type:e.target.value})}>
            {FIELD_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          <label style={{ fontSize:12, color:"#666", display:"flex", alignItems:"center", gap:3, whiteSpace:"nowrap" }}>
            <input type="checkbox" checked={!!f.required} onChange={e => updField(i, {...f, required:e.target.checked})} /> Required
          </label>
          <button style={{ ...S.btnSm("#c62828") }} onClick={() => delField(i)}>X</button>
        </div>
      ))}
      <button style={{ ...S.btnSm("#0b3d91") }} onClick={addField}>+ Add Field</button>
    </div>
  );
}

export default function ReportBuilder({ user, onToast }) {
  const [templates, setTemplates] = useState([]);
  const [periods, setPeriods] = useState([]);
  const [users, setUsers] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("templates");

  const [showTemplateForm, setShowTemplateForm] = useState(false);
  const [tf, setTf] = useState({ name:"", description:"", period_type:"monthly", sections:[] });
  const [editingTemplate, setEditingTemplate] = useState(null);

  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [showPeriodForm, setShowPeriodForm] = useState(false);
  const [pf, setPf] = useState({ label:"", start_date:"", end_date:"" });

  const [viewPeriod, setViewPeriod] = useState(null);
  const [activeSection, setActiveSection] = useState(null);
  const [sectionForm, setSectionForm] = useState({});
  const [exporting, setExporting] = useState(false);

  const [assignPeriod, setAssignPeriod] = useState(null);
  const [assignments, setAssignments] = useState({});

  const [seedMsg, setSeedMsg] = useState(null);

  const canEdit = user?.role === "admin" || user?.role === "ops_manager";

  const rbToast = (msg, type) => { if (onToast) onToast(msg, type); else alert(msg); };

  const load = async () => {
    setLoading(true);
    try {
      const [t, p, u, s] = await Promise.all([
        api.listReportTemplates(),
        api.listReportPeriods(),
        api.listUsers(),
        api.listReportSubmissions(),
      ]);
      setTemplates(t||[]);
      setPeriods(p||[]);
      setUsers(u||[]);
      setSubmissions(s||[]);
    } catch(e) {
      setTemplates([]); setPeriods([]); setUsers([]); setSubmissions([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleSeedTemplates = async () => {
    let count = 0;
    for (const seed of SEED_TEMPLATES) {
      try {
        await api.createReportTemplate(seed.name, seed.description, seed.period_type, seed.sections);
        count++;
      } catch(e) { /* skip duplicates */ }
    }
    setSeedMsg(`${count} template${count!==1?"s":""} added`);
    setTimeout(() => setSeedMsg(null), 3000);
    load();
  };

  const handleCreateTemplate = async () => {
    if (!tf.name || !tf.sections.length) { rbToast("Name and at least one section required", "error"); return; }
    try {
      await api.createReportTemplate(tf.name, tf.description, tf.period_type, tf.sections);
      rbToast("Template created", "success");
      setShowTemplateForm(false);
      setTf({ name:"", description:"", period_type:"monthly", sections:[] });
      load();
    } catch(e) { rbToast(e.message, "error"); }
  };

  const handleDeleteTemplate = async (id) => {
    if (!confirm("Delete this template? All related periods and submissions will also be deleted.")) return;
    try {
      await api.deleteReportTemplate(id);
      rbToast("Template deleted", "success");
      load();
    } catch(e) { rbToast(e.message, "error"); }
  };

  const handleCreatePeriod = async () => {
    if (!pf.label || !selectedTemplate) { rbToast("Period label required", "error"); return; }
    try {
      await api.createReportPeriod(selectedTemplate, pf.label, pf.start_date||null, pf.end_date||null);
      rbToast("Period created", "success");
      setShowPeriodForm(false);
      setPf({ label:"", start_date:"", end_date:"" });
      load();
    } catch(e) { rbToast(e.message, "error"); }
  };

  const handleClosePeriod = async (id) => {
    if (!confirm("Close this period? Submissions will be locked.")) return;
    try {
      await api.closeReportPeriod(id);
      rbToast("Period closed", "success");
      load();
    } catch(e) { rbToast(e.message, "error"); }
  };

  const handleExport = async (periodId, format) => {
    setExporting(true);
    try {
      await api.exportReport(periodId, format);
      rbToast(`Report exported as ${format.toUpperCase()}`, "success");
    } catch(e) { rbToast(e.message, "error"); }
    finally { setExporting(false); }
  };

  const openAssign = async (period) => {
    setAssignPeriod(period);
    try {
      const a = await api.getPeriodAssignments(period.id);
      setAssignments(a || {});
    } catch { setAssignments({}); }
  };

  const handleSaveAssignments = async () => {
    if (!assignPeriod) return;
    try {
      await api.updatePeriodAssignments(assignPeriod.id, assignments);
      rbToast("Assignments saved", "success");
      setAssignPeriod(null);
      load();
    } catch(e) { rbToast(e.message, "error"); }
  };

  const openSectionForm = (periodId, section, sub, currentAssignments) => {
    setViewPeriod(periodId);
    setActiveSection(section);
    const existing = sub ? sub.field_values : {};
    const defaults = {};
    (section.fields||[]).forEach(f => { defaults[f.key] = existing[f.key] || ""; });
    setSectionForm(defaults);
  };

  const handleSaveSection = async (status) => {
    if (!viewPeriod || !activeSection) return;
    try {
      await api.saveReportSubmission(
        viewPeriod,
        activeSection.key,
        user.id,
        sectionForm,
        status
      );
      rbToast(`Section ${status === "submitted" ? "submitted" : "saved as draft"}`, "success");
      setActiveSection(null);
      load();
    } catch(e) { rbToast(e.message, "error"); }
  };

  const templateSections = (t) => {
    if (!t) return [];
    if (Array.isArray(t.sections)) return t.sections;
    try { return JSON.parse(t.sections); } catch { return []; }
  };

  const getSubmission = (periodId, sectionKey) => {
    return submissions.find(s => s.period_id === periodId && s.section_key === sectionKey);
  };

  if (loading) return <div style={{ textAlign:"center", padding:40, color:"#999", fontSize:14 }}>Loading…</div>;

  return (
    <div style={S.page}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16, flexWrap:"wrap", gap:8 }}>
        <div style={S.title}>Report Builder</div>
        <div style={{ display:"flex", gap:6 }}>
          {["templates","periods","fill","view"].map(t => (
            <button key={t} onClick={() => setTab(t)}
              style={{ padding:"5px 12px", borderRadius:4, border:"none", cursor:"pointer", fontWeight:600, fontSize:12,
                background: tab===t ? "#0b3d91" : "#e0e0e0", color: tab===t ? "#fff" : "#333" }}>
              {t === "templates" ? "Templates" : t === "periods" ? "Periods" : t === "fill" ? "Fill Report" : "View Report"}
            </button>
          ))}
        </div>
      </div>

      {/* ── Tab: Templates ── */}
      {tab === "templates" && (
        <div>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12, flexWrap:"wrap", gap:8 }}>
            <div style={{ fontSize:14, fontWeight:700, color:"#333" }}>{templates.length} Template{templates.length!==1?"s":""}</div>
            <div style={{ display:"flex", gap:6 }}>
              {templates.length === 0 && <button style={S.btn("#2E7D32")} onClick={handleSeedTemplates}>+ Add Sample Templates</button>}
              {canEdit && <button style={S.btn()} onClick={() => { setShowTemplateForm(true); setEditingTemplate(null); setTf({ name:"", description:"", period_type:"monthly", sections:[] }); }}>+ New Template</button>}
            </div>
          </div>
          {seedMsg && <div style={{ padding:"8px 14px", background:"#E8F5E9", borderRadius:6, color:"#1B5E20", fontSize:13, fontWeight:600, marginBottom:12 }}>{seedMsg}</div>}

          {showTemplateForm && (
            <div style={S.section}>
              <div style={S.sectionTitle}>{editingTemplate ? "Edit Template" : "New Report Template"}</div>
              <div style={{ display:"flex", gap:8, flexWrap:"wrap", marginBottom:8 }}>
                <input style={{ ...S.input, marginBottom:0, flex:1, minWidth:200 }} placeholder="Template name (e.g. Weekly Operations Report)" value={tf.name} onChange={e => setTf(p=>({...p,name:e.target.value}))} />
                <select style={{ ...S.select, marginBottom:0 }} value={tf.period_type} onChange={e => setTf(p=>({...p,period_type:e.target.value}))}>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                  <option value="quarterly">Quarterly</option>
                </select>
              </div>
              <textarea style={S.textarea} placeholder="Description (optional)" value={tf.description} onChange={e => setTf(p=>({...p,description:e.target.value}))} />

              <div style={{ fontSize:14, fontWeight:600, color:"#333", marginBottom:8 }}>Sections:</div>
              {tf.sections.map((sec, i) => (
                <SectionEditor key={i} section={sec} onChange={(updated) => {
                  const s = [...tf.sections]; s[i] = updated; setTf(p=>({...p, sections:s}));
                }} />
              ))}
              <button style={S.btn("#2E7D32")} onClick={() => setTf(p=>({...p, sections:[...p.sections, { key:"", title:"", fields:[] }]}))}>+ Add Section</button>
              <div style={{ marginTop:12, display:"flex", gap:8 }}>
                <button style={S.btn()} onClick={handleCreateTemplate}>Create Template</button>
                <button style={S.btn("#888")} onClick={() => { setShowTemplateForm(false); setEditingTemplate(null); }}>Cancel</button>
              </div>
            </div>
          )}

          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(320px, 1fr))", gap:12 }}>
            {templates.map(t => {
              const secs = templateSections(t);
              const templatePeriods = periods.filter(p => p.template_id === t.id);
              return (
                <div key={t.id} style={S.card}>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:8 }}>
                    <div>
                      <div style={{ fontSize:15, fontWeight:700, color:"#0b3d91" }}>{t.name}</div>
                      <div style={{ fontSize:11, color:"#888", marginTop:2 }}>{t.period_type} | {templatePeriods.length} period{templatePeriods.length!==1?"s":""}</div>
                    </div>
                    {canEdit && <button style={S.btnSm("#c62828")} onClick={() => handleDeleteTemplate(t.id)}>Del</button>}
                  </div>
                  {t.description && <div style={{ fontSize:12, color:"#666", marginBottom:8 }}>{t.description}</div>}
                  <div style={{ fontSize:12, color:"#555", marginBottom:4 }}>Sections ({secs.length}):</div>
                  <div style={{ display:"flex", flexWrap:"wrap", gap:4 }}>
                    {secs.map((sec, i) => (
                      <span key={i} style={S.tag}>{sec.title || sec.key || `Section ${i+1}`}</span>
                    ))}
                  </div>
                </div>
              );
            })}
            {templates.length === 0 && <div style={{ color:"#999", fontSize:13, padding:20, textAlign:"center" }}>No templates yet. Click "Add Sample Templates" to get started instantly or create one manually.</div>}
          </div>
        </div>
      )}

      {/* ── Tab: Periods ── */}
      {tab === "periods" && (
        <div>
          <div style={{ display:"flex", gap:8, marginBottom:12, flexWrap:"wrap" }}>
            <select style={S.select} value={selectedTemplate||""} onChange={e => setSelectedTemplate(Number(e.target.value)||null)}>
              <option value="">All Templates</option>
              {templates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
            {selectedTemplate && canEdit && <button style={S.btn()} onClick={() => { setShowPeriodForm(true); setPf({ label:"", start_date:"", end_date:"" }); }}>+ New Period</button>}
          </div>

          {showPeriodForm && selectedTemplate && (
            <div style={S.section}>
              <div style={S.sectionTitle}>Create New Period</div>
              <div style={{ display:"flex", gap:8, flexWrap:"wrap", alignItems:"flex-end" }}>
                <div style={{ flex:1, minWidth:150 }}>
                  <label style={{ fontSize:12, fontWeight:600, color:"#555", display:"block", marginBottom:2 }}>Label *</label>
                  <input style={{ ...S.input, marginBottom:0 }} placeholder="e.g. June 2025 / Week 25" value={pf.label} onChange={e => setPf(p=>({...p,label:e.target.value}))} />
                </div>
                <div>
                  <label style={{ fontSize:12, fontWeight:600, color:"#555", display:"block", marginBottom:2 }}>Start</label>
                  <input style={{ ...S.input, marginBottom:0, width:150 }} type="date" value={pf.start_date} onChange={e => setPf(p=>({...p,start_date:e.target.value}))} />
                </div>
                <div>
                  <label style={{ fontSize:12, fontWeight:600, color:"#555", display:"block", marginBottom:2 }}>End</label>
                  <input style={{ ...S.input, marginBottom:0, width:150 }} type="date" value={pf.end_date} onChange={e => setPf(p=>({...p,end_date:e.target.value}))} />
                </div>
                <button style={S.btn()} onClick={handleCreatePeriod}>Create</button>
                <button style={S.btn("#888")} onClick={() => setShowPeriodForm(false)}>Cancel</button>
              </div>
            </div>
          )}

          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(340px, 1fr))", gap:12 }}>
            {(selectedTemplate ? periods.filter(p => p.template_id === selectedTemplate) : periods).map(p => {
              const t = templates.find(tm => tm.id === p.template_id);
              const secs = t ? templateSections(t) : [];
              const assignedCount = Object.keys(p.section_assignments || {}).filter(k => p.section_assignments[k]).length;
              return (
                <div key={p.id} style={S.card}>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:6 }}>
                    <div>
                      <div style={{ fontSize:14, fontWeight:700, color:"#0b3d91" }}>{p.label}</div>
                      <div style={{ fontSize:11, color:"#888" }}>{t?.name || "Unknown template"}</div>
                    </div>
                    <span style={{ display:"inline-block", padding:"2px 8px", borderRadius:8, fontSize:11, fontWeight:600,
                      background: p.is_open ? "#E8F5E9" : "#FFEBEE", color: p.is_open ? "#1B5E20" : "#C62828" }}>
                      {p.is_open ? "Open" : "Closed"}
                    </span>
                  </div>
                  <div style={{ fontSize:11, color:"#666", marginBottom:4 }}>
                    {p.start_date && <span>{p.start_date} to {p.end_date || "—"}</span>}
                  </div>
                  <div style={{ fontSize:11, color:"#888", marginBottom:8 }}>
                    Assignments: {assignedCount}/{secs.length} sections
                  </div>
                  <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
                    {canEdit && p.is_open && <button style={S.btnSm("#0b3d91")} onClick={() => openAssign(p)}>Assign</button>}
                    {p.is_open && <button style={S.btnSm("#E65100")} onClick={() => { setViewPeriod(p.id); setActiveSection(null); setTab("fill"); }}>Fill</button>}
                    <button style={S.btnSm("#2E7D32")} onClick={() => { setViewPeriod(p.id); setTab("view"); }}>View</button>
                    {p.is_open && canEdit && <button style={S.btnSm("#c62828")} onClick={() => handleClosePeriod(p.id)}>Close</button>}
                  </div>
                </div>
              );
            })}
            {periods.length === 0 && <div style={{ color:"#999", fontSize:13, padding:20, textAlign:"center" }}>No periods yet. Create a template first, then add periods.</div>}
          </div>
        </div>
      )}

      {/* ── Assign Users Modal ── */}
      {assignPeriod && (() => {
        const t = templates.find(tm => tm.id === assignPeriod.template_id);
        const secs = t ? templateSections(t) : [];
        return (
          <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.4)", zIndex:1000, display:"flex", alignItems:"center", justifyContent:"center" }}
            onClick={e => { if (e.target === e.currentTarget) setAssignPeriod(null); }}>
            <div style={{ background:"#fff", borderRadius:12, padding:24, maxWidth:600, width:"90%", maxHeight:"80vh", overflowY:"auto" }}>
              <div style={{ fontSize:16, fontWeight:700, color:"#0b3d91", marginBottom:4 }}>Assign Users to Sections</div>
              <div style={{ fontSize:12, color:"#888", marginBottom:16 }}>{t?.name} — {assignPeriod.label}</div>
              {secs.map(sec => (
                <div key={sec.key} style={{ marginBottom:12, padding:"10px 12px", background:"#f8faff", borderRadius:8, border:"1px solid #d0d8e8" }}>
                  <div style={{ fontSize:13, fontWeight:600, color:"#333", marginBottom:6 }}>{sec.title || sec.key}</div>
                  <select style={{ ...S.select, marginBottom:0, width:"100%" }}
                    value={assignments[sec.key] || ""}
                    onChange={e => setAssignments(p => ({...p, [sec.key]: e.target.value ? Number(e.target.value) : null}))}>
                    <option value="">— Not assigned —</option>
                    {users.map(u => (
                      <option key={u.id} value={u.id}>{u.name} ({u.role})</option>
                    ))}
                  </select>
                </div>
              ))}
              <div style={{ display:"flex", gap:8, marginTop:12 }}>
                <button style={S.btn()} onClick={handleSaveAssignments}>Save Assignments</button>
                <button style={S.btn("#888")} onClick={() => setAssignPeriod(null)}>Cancel</button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ── Tab: Fill Report ── */}
      {tab === "fill" && (
        <div>
          {!viewPeriod && (
            <div>
              <div style={{ fontSize:14, fontWeight:700, color:"#333", marginBottom:12 }}>
                {canEdit ? "Select a period to fill sections" : "My Assigned Sections"}
              </div>
              <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(300px, 1fr))", gap:12 }}>
                {periods.filter(p => p.is_open).map(p => {
                  const t = templates.find(tm => tm.id === p.template_id);
                  const secs = t ? templateSections(t) : [];
                  const mySections = canEdit
                    ? secs
                    : secs.filter(sec => (p.section_assignments || {})[sec.key] === user.id);
                  if (!mySections.length) return null;
                  return (
                    <div key={p.id} style={S.card}>
                      <div style={{ fontSize:14, fontWeight:700, color:"#0b3d91", marginBottom:2 }}>{t?.name}</div>
                      <div style={{ fontSize:12, color:"#888", marginBottom:8 }}>{p.label}</div>
                      <div style={{ display:"flex", flexWrap:"wrap", gap:4, marginBottom:8 }}>
                        {mySections.map(sec => {
                          const sub = getSubmission(p.id, sec.key);
                          return (
                            <button key={sec.key} onClick={() => openSectionForm(p.id, sec, sub, p.section_assignments)}
                              style={{ padding:"4px 10px", borderRadius:4, border:"1px solid", cursor:"pointer", fontWeight:600, fontSize:11,
                                borderColor: sub?.status === "submitted" ? "#2E7D32" : sub?.status === "draft" ? "#E65100" : "#ccc",
                                background: activeSection?.key === sec.key && viewPeriod === p.id ? "#0b3d91" : "#fff",
                                color: activeSection?.key === sec.key && viewPeriod === p.id ? "#fff" : sub?.status === "submitted" ? "#2E7D32" : sub?.status === "draft" ? "#E65100" : "#333" }}>
                              {sec.title || sec.key} {sub?.status === "submitted" ? "✓" : sub?.status === "draft" ? "⚡" : ""}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
                {periods.filter(p => p.is_open).every(p => {
                  const secs = templateSections(templates.find(tm => tm.id === p.template_id));
                  const mySections = canEdit ? secs : secs.filter(sec => (p.section_assignments || {})[sec.key] === user.id);
                  return !mySections.length;
                }) && <div style={{ color:"#999", fontSize:13, padding:20, textAlign:"center" }}>{canEdit ? "No open periods." : "No sections assigned to you yet."}</div>}
              </div>
            </div>
          )}

          {(viewPeriod || activeSection) && (() => {
            const p = periods.find(pr => pr.id === viewPeriod);
            const t = templates.find(tm => tm.id === p?.template_id);
            const secs = t ? templateSections(t) : [];
            const mySections = canEdit ? secs : secs.filter(sec => (p?.section_assignments || {})[sec.key] === user.id);
            if (!p || !t) return null;
            return (
              <div>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}>
                  <div>
                    <div style={{ fontSize:14, fontWeight:700, color:"#0b3d91" }}>{t.name} — {p.label}</div>
                    <div style={{ fontSize:11, color:"#888" }}>Fill your assigned sections below</div>
                  </div>
                  <button style={S.btnSm("#888")} onClick={() => { setViewPeriod(null); setActiveSection(null); }}>Back</button>
                </div>

                <div style={{ display:"flex", gap:6, marginBottom:12, flexWrap:"wrap" }}>
                  {mySections.map(sec => {
                    const sub = getSubmission(viewPeriod, sec.key);
                    return (
                      <button key={sec.key} onClick={() => openSectionForm(viewPeriod, sec, sub, p.section_assignments)}
                        style={{ padding:"5px 12px", borderRadius:4, border:"1px solid", cursor:"pointer", fontWeight:600, fontSize:12,
                          borderColor: sub?.status === "submitted" ? "#2E7D32" : sub?.status === "draft" ? "#E65100" : "#ccc",
                          background: activeSection?.key === sec.key ? "#0b3d91" : "#fff",
                          color: activeSection?.key === sec.key ? "#fff" : sub?.status === "submitted" ? "#2E7D32" : sub?.status === "draft" ? "#E65100" : "#333" }}>
                        {sec.title || sec.key} {sub?.status === "submitted" ? "✓" : sub?.status === "draft" ? "⚡" : ""}
                      </button>
                    );
                  })}
                </div>

                {activeSection && (
                  <div style={S.section}>
                    <div style={S.sectionTitle}>{activeSection.title || activeSection.key}</div>
                    {(activeSection.fields||[]).map(f => (
                      <div key={f.key} style={{ marginBottom:12 }}>
                        <label style={{ fontSize:13, fontWeight:600, color:"#333", display:"block", marginBottom:2 }}>
                          {f.label||f.key} {f.required && <span style={{color:"red"}}>*</span>}
                        </label>
                        {f.type === "textarea" ? (
                          <textarea style={S.textarea} value={sectionForm[f.key]||""} onChange={e => setSectionForm(p=>({...p,[f.key]:e.target.value}))} placeholder={f.label} />
                        ) : f.type === "number" ? (
                          <input style={S.input} type="number" value={sectionForm[f.key]||""} onChange={e => setSectionForm(p=>({...p,[f.key]:e.target.value}))} placeholder={f.label} />
                        ) : f.type === "date" ? (
                          <input style={S.input} type="date" value={sectionForm[f.key]||""} onChange={e => setSectionForm(p=>({...p,[f.key]:e.target.value}))} />
                        ) : f.type === "select" ? (
                          <select style={S.select} value={sectionForm[f.key]||""} onChange={e => setSectionForm(p=>({...p,[f.key]:e.target.value}))}>
                            <option value="">Select...</option>
                            <option value="Operational">Operational</option>
                            <option value="Under Maintenance">Under Maintenance</option>
                            <option value="Not Available">Not Available</option>
                            <option value="Completed">Completed</option>
                            <option value="In Progress">In Progress</option>
                            <option value="On Track">On Track</option>
                            <option value="At Risk">At Risk</option>
                            <option value="Delayed">Delayed</option>
                          </select>
                        ) : (
                          <input style={S.input} value={sectionForm[f.key]||""} onChange={e => setSectionForm(p=>({...p,[f.key]:e.target.value}))} placeholder={f.label} />
                        )}
                      </div>
                    ))}
                    <div style={{ display:"flex", gap:8, marginTop:8 }}>
                      <button style={S.btn("#E65100")} onClick={() => handleSaveSection("draft")}>Save as Draft</button>
                      <button style={S.btn("#2E7D32")} onClick={() => handleSaveSection("submitted")}>Submit</button>
                      <button style={S.btn("#888")} onClick={() => setActiveSection(null)}>Cancel</button>
                    </div>
                  </div>
                )}
              </div>
            );
          })()}
        </div>
      )}

      {/* ── Tab: View Report ── */}
      {tab === "view" && (
        <div>
          {!viewPeriod && (
            <div>
              <div style={{ fontSize:14, fontWeight:700, color:"#333", marginBottom:12 }}>Select a period to view the compiled report</div>
              <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(300px, 1fr))", gap:12 }}>
                {periods.map(p => {
                  const t = templates.find(tm => tm.id === p.template_id);
                  const secs = t ? templateSections(t) : [];
                  const filledCount = submissions.filter(s => s.period_id === p.id && s.status === "submitted").length;
                  return (
                    <div key={p.id} style={{ ...S.card, cursor:"pointer" }} onClick={() => setViewPeriod(p.id)}>
                      <div style={{ fontSize:14, fontWeight:700, color:"#0b3d91", marginBottom:2 }}>{t?.name}</div>
                      <div style={{ fontSize:12, color:"#888", marginBottom:4 }}>{p.label}</div>
                      <div style={{ fontSize:11, color:"#666" }}>
                        {filledCount}/{secs.length} sections submitted
                        <span style={{ marginLeft:8, display:"inline-block", padding:"1px 6px", borderRadius:6, fontSize:10, fontWeight:600,
                          background: p.is_open ? "#E8F5E9" : "#FFEBEE", color: p.is_open ? "#1B5E20" : "#C62828" }}>
                          {p.is_open ? "Open" : "Closed"}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {viewPeriod && (() => {
            const p = periods.find(pr => pr.id === viewPeriod);
            const t = templates.find(tm => tm.id === p?.template_id);
            const secs = t ? templateSections(t) : [];
            if (!p || !t) return null;
            return (
              <div>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12, flexWrap:"wrap", gap:8 }}>
                  <div>
                    <div style={{ fontSize:16, fontWeight:700, color:"#0b3d91" }}>{t.name}</div>
                    <div style={{ fontSize:12, color:"#888" }}>Period: {p.label} | {p.start_date || ""} {p.end_date ? `to ${p.end_date}` : ""} | {p.is_open ? "Open" : "Closed"}</div>
                  </div>
                  <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
                    {["json","html","text","docx","pptx","pdf"].map(fmt => (
                      <button key={fmt} style={S.btnSm(fmt==="pdf"?"#c62828":fmt==="docx"?"#0b3d91":fmt==="pptx"?"#E65100":"#555")}
                        onClick={() => handleExport(viewPeriod, fmt)} disabled={exporting}>
                        {fmt.toUpperCase()}
                      </button>
                    ))}
                    <button style={S.btnSm("#888")} onClick={() => setViewPeriod(null)}>Back</button>
                  </div>
                </div>

                {secs.map(sec => {
                  const sub = getSubmission(viewPeriod, sec.key);
                  const vals = sub?.field_values || {};
                  const assignedUserId = (p.section_assignments || {})[sec.key];
                  const assignedUser = users.find(u => u.id === assignedUserId);
                  return (
                    <div key={sec.key} style={S.section}>
                      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8 }}>
                        <div style={{ fontSize:14, fontWeight:700, color:"#0b3d91" }}>{sec.title || sec.key}</div>
                        <div style={{ display:"flex", gap:8, alignItems:"center" }}>
                          <span style={{ fontSize:11, color:"#888" }}>Assigned: {assignedUser?.name || sub?.assigned_to_name || "—"}</span>
                          <span style={{ display:"inline-block", padding:"2px 6px", borderRadius:6, fontSize:10, fontWeight:600,
                            background: sub?.status === "submitted" ? "#E8F5E9" : sub?.status === "draft" ? "#FFF3E0" : "#f0f0f0",
                            color: sub?.status === "submitted" ? "#1B5E20" : sub?.status === "draft" ? "#E65100" : "#999" }}>
                            {sub?.status || "pending"}
                          </span>
                        </div>
                      </div>
                      {(sec.fields||[]).map(f => {
                        const v = vals[f.key];
                        return (
                          <div key={f.key} style={{ display:"flex", padding:"6px 0", borderBottom:"1px solid #f0f4f8" }}>
                            <div style={{ width:200, fontSize:13, fontWeight:600, color:"#555", flexShrink:0 }}>{f.label||f.key}</div>
                            <div style={{ fontSize:13, color:"#333" }}>{v || <span style={{color:"#ccc"}}>—</span>}</div>
                          </div>
                        );
                      })}
                      {!sub && <div style={{ fontSize:12, color:"#ccc", fontStyle:"italic" }}>Not yet filled</div>}
                    </div>
                  );
                })}
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
}
