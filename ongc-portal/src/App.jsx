import { useState, useEffect, useCallback, useRef } from "react";
import { api, setToken, getToken } from "./api";
import ActivityAnalytics from "./components/ActivityAnalytics";
import ProjectCreation from "./components/ProjectCreation";
import AnalyticalDashboard from "./components/AnalyticalDashboard";
import { KPITargetsAWP, ProgressReport, ManpowerStatus, ContractStatus, FundManagement, Operations, DataProcessing, RegionalLab, ReportingAppraisals, PendingIssues, Highlights, TechnicalReports, SharePointTemp, HSE, AWP } from "./components/NewModules";
import ReportBuilder from "./components/ReportBuilder";


const SECTIONS = ["GP-03","GP-05","GP-06","GP-15","GP-16","GP-18","GP-18V","GP-24","GP-24V","GP-25","GP-26","GP-26V","GP-35","GP-36","GP-61","GP-81","GP-82","GP-85","REL","RCC","HSE","Contracts","Operations"];
const GEO_LOCATIONS = ["Ahmedabad","Ankleshwar","Mehsana","Rajasthan","Delhi","Mumbai","Kolkata"];
const CATEGORIES = ["Historical Seismic Data","General Admin","Accounts","HR(Manpower)","Legal/Arbitration/CourtCase","Contracts CorrespondanceLetter","Contract Execution Chronology","Contractual Bill Summary","Crop Compensation / Farmers","CSR Initiative","Equipment/Electronics","Navigation/Survey Data","Permissions / Statutory Clearances","Requisitions Asset/Basin","Annual Work Porgram (AWP)","Project Report","Operations/Acquisition Report","Observer Report","Processing Report","Survey Geometry/SPS Data","Uphole Reports","Activity Reports","Reconnaissance Survey Report","Atlas / Summary Report","Technical Report/Presentation","SOPs/Workflow/Processing Flow","Field QC Report","Minutes of Meeting/MRM","PPE/Kits & Liveries","Audit ATR/Compliances","VCC Presentation","Legacy Data / Acquisition Chronology","Data Entry Formats","Explosives/PESO","Instrument Calibration / Testing Reports","Daily Progress Report (DPR)","Field Trouble Reports","Crew Deployment / Field Roster","Training / Induction Records","Data Submission Records","Procurement Details","Technology/Innovation","Asset Condemnation","Training Records","Vehicles / Records","Handing/Taking Over","Experimental Plan/Report","Block Wise Coverage","Basin QCG Report and ATR","Important Orders and Circulars","Communication with Contractors","Bank / RCA Account","DISHA Approvals","RTI / Complaint Letters"];
const SEASONS = ["2025-26","2024-25","2023-24","2022-23","2021-22","2020-21","2019-20","2018-19","2017-18","2016-17","2015-16","2014-15","2013-14","2012-13","2011-12","2010-11","2009-10","2008-09","2007-08","2006-07","2005-06","2004-05","2003-04","2002-03","2001-02","2000-01","1999-00","1998-99","1997-98","1996-97","1995-96","1994-95","1993-94","1992-93","1991-92","1990-91","1989-90","1988-89","1987-88","1986-87","1985-86","1984-85","1983-84","1982-83","1981-82","1980-81","1979-80","1978-79","1977-78","1976-77","1975-76","1974-75","1973-74","1972-73","1971-72","1970-71","1969-70","1968-69","1967-68","1966-67","1965-66","1964-65","1963-64","1962-63","1961-62","1960-61","1959-60","1958-59","1957-58","1956-57"];
const BLOCKS = ["Ankleshwar","Ahmedabad","Cambay","Mehsana","Rajasthan","Other"];
const CLASSIFICATIONS = ["General / Available for All","Sensitive / Internal Use","Confidential","Highly Confidential / Restricted"];
const FILE_TYPES = ["PDF","DOCX","XLSX","PPT","TXT","DAT","CSV","ZIP"];
const DATA_TYPES = ["Seismic 2D/3D/3C/4D","LFPS","VSP","Any Other Data"];
const ROLE_LABELS = { admin:"Admin (Full Control)", ops_manager:"Operations Manager", data_creator:"Data Creator/Editor", viewer:"End User/Viewer" };

const SUBMENU_CONFIG = {
  "Operations": { key:"ops_tabs", defaults:["Base Office","Contracts","HSE","GP-03","GP-06"] },
  "Data Processing": { key:"dp_tabs", defaults:["PG-I","PG-II"] },
  "Regional Electronics Lab": { key:"rel_tabs", defaults:["Gr-I","Gr-II"] },
  "Reporting / Appraisals": { key:"report_tabs", defaults:["Fortnight","Monthly","Quarterly","Half-Yearly","DO Report","Consolidated Financial"] },
};
function getSubmenuTabs(label) {
  const c = SUBMENU_CONFIG[label];
  if (!c) return [];
  try { const d = JSON.parse(localStorage.getItem(c.key)); if (Array.isArray(d) && d.length) return d; } catch {}
  return c.defaults;
}
function saveSubmenuTabs(label, tabs) {
  const c = SUBMENU_CONFIG[label];
  if (!c) return;
  localStorage.setItem(c.key, JSON.stringify(tabs));
}

const MENU = [
  { label:"Dashboard", page:"Dashboard", roles:["admin","ops_manager","data_creator","viewer"], levels:[0,2,3,4] },
  { label:"KPI / Targets / AWP", page:"kpi-awp", roles:["admin","ops_manager"], levels:[2,3] },
  { label:"Projects (Inhouse/Outsourced)", page:"projects", roles:["admin","ops_manager"], levels:[2,3] },
  { label:"Progress Report", page:"progress-report", roles:["admin","ops_manager","data_creator","viewer"], levels:[2,3,4] },
  { label:"Manpower Status", page:"manpower-status", roles:["admin","ops_manager","data_creator","viewer"], levels:[2,3,4] },
  { label:"Contract / Tendering Status", page:"contract-status", roles:["admin","ops_manager","data_creator","viewer"], levels:[2,3,4] },
  { label:"Fund Management", page:"fund-management", roles:["admin","ops_manager","data_creator","viewer"], levels:[2,3,4] },
  { label:"Operations", submenu:getSubmenuTabs("Operations"), roles:["admin","ops_manager"], levels:[2,3] },
  { label:"Data Processing (RCC)", submenu:getSubmenuTabs("Data Processing"), roles:["admin","ops_manager","data_creator","viewer"], levels:[2,3,4] },
  { label:"Regional Electronics Lab (REL)", submenu:getSubmenuTabs("Regional Electronics Lab"), roles:["admin","ops_manager","data_creator","viewer"], levels:[2,3,4] },
  { label:"Reporting / Appraisals", submenu:getSubmenuTabs("Reporting / Appraisals"), roles:["admin","ops_manager","data_creator","viewer"], levels:[2,3,4] },
  { label:"Pending vs Resolved Issues", page:"pending-issues", roles:["admin","ops_manager","data_creator","viewer"], levels:[2,3,4] },
  { label:"Highlights", page:"highlights", roles:["admin","ops_manager"], levels:[2,3] },
  { label:"Technical Reports", page:"tech-reports", roles:["admin","ops_manager"], levels:[2,3] },
  { label:"Share Point (Temporary File)", page:"sharepoint", roles:["admin","ops_manager"], levels:[2,3] },
  { label:"AWP / My Annual Work Plan", page:"awp", roles:["admin","ops_manager","data_creator","viewer"], levels:[2,3,4] },
  { label:"HSE", page:"hse", roles:["admin","ops_manager","data_creator","viewer"], levels:[2,3,4] },
  { label:"Reports", submenu: [
    "Overview",
    { label:"File Distribution", children: ["By Section", "By Classification", "By Type", "By Block"] },
    { label:"Performance", children: ["Goal vs Accomplishment", "Activity Analytics"] },
  ], roles:["admin","ops_manager"], levels:[2,3] },
  { label:"Report Builder", page:"report-builder", roles:["admin","ops_manager"], levels:[2,3] },
  { label:"Activity Analytics", page:"activity-analytics", roles:["admin","ops_manager","data_creator","viewer"], levels:[0,2,3,4] },
  { label:"Users", page:"users", roles:["admin"], levels:[2] },
  { label:"Access Permissions", page:"access-permissions", roles:["admin"], levels:[2] },
  { label:"User Settings", page:"settings", roles:["admin","ops_manager"], levels:[2,3] },
  { label:"Log Out", action:"logout", roles:["admin","ops_manager","data_creator","viewer"], levels:[0,2,3,4] },
];

const classColor = { "General / Available for All":"#1B5E20","Sensitive / Internal Use":"#E65100","Confidential":"#B71C1C","Highly Confidential / Restricted":"#7B1FA2" };
const statusColor = { "Approved":"#1B5E20","Pending":"#E65100","Rejected":"#B71C1C" };
const statusBg = { "Approved":"#E8F5E9","Pending":"#FFF3E0","Rejected":"#FFEBEE" };

function normalizeFile(f) {
  return {
    id: f.id,
    fileName: f.file_name,
    fileType: f.file_type?.toUpperCase(),
    projectName: f.project_name,
    sigNumber: f.sig_number,
    dataType: f.data_type,
    section: f.section,
    category: f.category,
    season: f.season,
    block: f.block,
    mlBlock: f.ml_block,
    location: f.location,
    classification: f.classification,
    contractorName: f.contractor_name,
    status: f.status,
    uploadedBy: f.uploaded_by,
    uploadedByName: f.uploaded_by_name || f.uploaded_by,
    uploadDate: f.upload_date ? f.upload_date.split("T")[0] : "",
    fileSize: f.file_size || "—",
    filePath: f.file_path || "",
    snippet: f.snippet,
    summary: f.summary,
  };
}

const S = {
  app: { fontFamily:"'Segoe UI',system-ui,Arial,sans-serif", minHeight:"100vh", background:"#f0f2f5", color:"#1a1a2e" },
  header: { width:"100%", height:56, background:"linear-gradient(135deg,#0b3d91,#1565c0)", color:"#fff", display:"flex", alignItems:"center", justifyContent:"center", padding:"0 24px", position:"fixed", top:0, left:0, right:0, zIndex:1000, boxSizing:"border-box" },
  headerTitle: { fontSize:16, fontWeight:700, color:"#fff", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis", letterSpacing:0.3, flexShrink:0 },
  headerRight: { display:"flex", alignItems:"center", gap:16, fontSize:14, flexShrink:0 },
   sidebar: { position:"fixed", top:56, left:0, width:240, height:"calc(100vh - 56px)", background:"#16202c", overflowY:"auto", overflowX:"hidden", zIndex:999, paddingTop:0, transition:"transform 0.2s ease" },
   sideLink: (active) => ({ display:"flex", alignItems:"center", gap:10, color:"#fff", textDecoration:"none", padding:"10px 16px", borderLeft: active?"3px solid #42a5f5":"3px solid transparent", background: active?"rgba(255,255,255,0.12)":"transparent", cursor:"pointer", fontSize:15, fontWeight:600, transition:"all 0.12s", overflow:"hidden" }),
   main: { marginLeft:240, marginTop:56, padding:"20px 24px", width:"calc(100% - 240px)", minHeight:"calc(100vh - 56px)", boxSizing:"border-box" },
  card: { background:"#fff", borderRadius:8, boxShadow:"0 1px 4px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)", padding:16, marginBottom:16, overflow:"auto" },
  btn: (variant="primary") => ({ padding:"8px 18px", borderRadius:6, border:"none", cursor:"pointer", fontWeight:600, fontSize:14, background: variant==="primary"?"#0b3d91":variant==="success"?"#1B5E20":variant==="danger"?"#B71C1C":variant==="warning"?"#E65100":"#6c757d", color:"#fff", transition:"all 0.15s", boxShadow:"0 1px 3px rgba(0,0,0,0.12)" }),
  btnSm: (variant="primary") => ({ padding:"5px 12px", borderRadius:5, border:"none", cursor:"pointer", fontWeight:600, fontSize:13, background: variant==="primary"?"#0b3d91":variant==="success"?"#1B5E20":variant==="danger"?"#B71C1C":variant==="warning"?"#E65100":"#6c757d", color:"#fff", transition:"all 0.15s" }),
   input: { width:"100%", padding:"10px 14px", marginTop:4, marginBottom:12, border:"1px solid #d0d5dd", borderRadius:6, fontSize:17, boxSizing:"border-box", background:"#fff", transition:"border-color 0.15s" },
   select: { width:"100%", padding:"10px 14px", marginTop:4, marginBottom:12, border:"1px solid #d0d5dd", borderRadius:6, fontSize:17, background:"#fff", boxSizing:"border-box", transition:"border-color 0.15s" },
   label: { fontWeight:600, fontSize:16, color:"#344054", marginBottom:2, display:"block" },
  table: { width:"100%", borderCollapse:"collapse", fontSize:14 },
   th: { background:"#f8f9fa", color:"#344054", padding:"12px 14px", textAlign:"left", fontWeight:600, fontSize:16, borderBottom:"2px solid #e0e0e0", whiteSpace:"nowrap" },
   td: { padding:"12px 14px", borderBottom:"1px solid #f0f0f0", verticalAlign:"middle", fontSize:16, color:"#1a1a2e" },
  badge: (color, bg) => ({ display:"inline-block", padding:"3px 10px", borderRadius:12, fontSize:13, fontWeight:600, color, background:bg||"#f5f5f5" }),
  sectionTitle: { fontSize:18, fontWeight:700, color:"#0b3d91", marginBottom:16, display:"flex", alignItems:"center", gap:8, padding:"0 0 4px 0", borderBottom:"2px solid #e8edf2" },
  formGroup: { marginBottom:4 },
  footer: { width:"100%", background:"#1d2b36", color:"#fff", padding:"10px 20px", position:"fixed", bottom:0, left:0, zIndex:1000, boxSizing:"border-box" },
  footerToggle: { cursor:"pointer", textAlign:"center", padding:"6px 0", fontSize:11, color:"rgba(255,255,255,0.6)", userSelect:"none" },
  footerMenu: { display:"flex", justifyContent:"center", gap:30, padding:"6px 0" },
  footerLink: { color:"#fff", textDecoration:"none", fontSize:14 },
};

function Toast({ msg, type, onClose }) {
  useEffect(()=>{ const t=setTimeout(onClose,3500); return ()=>clearTimeout(t); },[onClose]);
  return (
    <div style={{ position:"fixed", bottom:24, right:24, zIndex:9999, background: type==="success"?"#1B5E20":type==="error"?"#B71C1C":"#0b3d91", color:"#fff", padding:"12px 20px", borderRadius:8, boxShadow:"0 4px 16px rgba(0,0,0,0.2)", fontSize:14, fontWeight:600, maxWidth:360 }}>
      {msg}
    </div>
  );
}

function NotificationDropdown({ notifs, onMarkRead, onMarkAllRead, onClose }) {
  const ref = useRef(null);
  const unread = notifs.filter(n => !n.is_read);
  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) onClose(); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose]);
  return (
    <div ref={ref} style={{ position:"absolute", top:"100%", right:0, width:380, maxHeight:360, overflowY:"auto", background:"#fff", borderRadius:8, boxShadow:"0 8px 24px rgba(0,0,0,0.15)", border:"1px solid #e0e0e0", zIndex:2000, padding:0, marginTop:4 }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"10px 14px", borderBottom:"1px solid #f0f0f0", background:"#f8f9fa", borderRadius:"8px 8px 0 0" }}>
        <span style={{ fontWeight:700, fontSize:13, color:"#0b3d91" }}>Notifications</span>
        {unread.length > 0 && <button onClick={onMarkAllRead} style={{ background:"none", border:"none", color:"#0b3d91", cursor:"pointer", fontSize:12, fontWeight:600, padding:0 }}>Mark all read</button>}
      </div>
      {notifs.length === 0 ? (
        <div style={{ padding:"24px 14px", textAlign:"center", fontSize:13, color:"#999" }}>No notifications</div>
      ) : (
        notifs.map(n => (
          <div key={n.id} style={{ padding:"10px 14px", borderBottom:"1px solid #f5f5f5", display:"flex", gap:8, alignItems:"flex-start", background: n.is_read ? "#fff" : "#f0f7ff" }}>
            <div style={{ flex:1, fontSize:13, color:"#1a1a2e", lineHeight:1.4 }}>{n.message}</div>
            {!n.is_read && <button onClick={() => onMarkRead(n.id)} style={{ background:"#0b3d91", border:"none", color:"#fff", borderRadius:4, padding:"2px 8px", cursor:"pointer", fontSize:11, fontWeight:600, whiteSpace:"nowrap", marginTop:2 }}>Mark Read</button>}
          </div>
        ))
      )}
    </div>
  );
}

function DrillDownModal({ drill, onClose }) {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    if (!drill) return;
    setLoading(true);
    const params = {};
    params[drill.filterKey] = drill.filterValue;
    api.searchFiles(params).then(data => {
      setFiles((data || []).map(normalizeFile));
    }).catch(() => setFiles([])).finally(() => setLoading(false));
  }, [drill]);
  if (!drill) return null;
  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.5)", zIndex:3000, display:"flex", alignItems:"center", justifyContent:"center" }} onClick={onClose}>
      <div style={{ background:"#fff", borderRadius:10, width:"90%", maxWidth:900, maxHeight:"80vh", overflow:"auto", padding:24, boxShadow:"0 8px 32px rgba(0,0,0,0.2)" }} onClick={e=>e.stopPropagation()}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
          <div style={{ fontSize:18, fontWeight:700, color:"#0b3d91" }}>{drill.title}</div>
          <button onClick={onClose} style={{ background:"none", border:"none", fontSize:22, cursor:"pointer", color:"#666", padding:"0 4px" }}>×</button>
        </div>
        {loading ? <Spinner /> : files.length === 0 ? (
          <div style={{ textAlign:"center", padding:40, color:"#aaa" }}>No files found.</div>
        ) : (
          <table style={S.table}>
            <thead><tr><th style={S.th}>#</th><th style={S.th}>File Name</th><th style={S.th}>Type</th><th style={S.th}>Section</th><th style={S.th}>Category</th><th style={S.th}>Uploaded By</th><th style={S.th}>Date</th><th style={S.th}>Status</th></tr></thead>
            <tbody>{files.map((f,i)=>(
              <tr key={f.id}>
                <td style={S.td}>{i+1}</td>
                <td style={S.td}><span style={{ color:"#0b3d91", fontWeight:600 }}>{f.fileName}</span></td>
                <td style={S.td}>{f.fileType}</td>
                <td style={S.td}>{f.section}</td>
                <td style={S.td}>{f.category}</td>
                <td style={S.td}>{f.uploadedByName}</td>
                <td style={S.td}>{f.uploadDate}</td>
                <td style={S.td}><span style={{ ...S.badge(statusColor[f.status], statusBg[f.status]) }}>{f.status}</span></td>
              </tr>
            ))}</tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function Spinner() {
  return <div style={{ textAlign:"center", padding:40, color:"#0b3d91", fontSize:14 }}>Loading…</div>;
}

function BarChart({ data, onItemClick }) {
  const max = Math.max(...Object.values(data), 1);
  return (
    <div style={{ display:"flex", flexDirection:"column", gap:8, marginTop:8 }}>
      {Object.entries(data).map(([k,v])=>(
        <div key={k} style={{ display:"flex", alignItems:"center", gap:8, cursor: onItemClick?"pointer":"default" }} onClick={() => onItemClick && onItemClick(k)}>
          <div style={{ width:110, fontSize:11, color:"#5a6a7a", textAlign:"right", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{k}</div>
          <div style={{ flex:1, height:18, background:"#f0f4f8", borderRadius:9, overflow:"hidden" }}>
            <div style={{ width:`${(v/max)*100}%`, height:"100%", background:"#0b3d91", borderRadius:9, transition:"width 0.6s", minWidth: v>0?8:0 }}/>
          </div>
          <div style={{ fontSize:12, fontWeight:700, color:"#0b3d91", minWidth:24 }}>{v}</div>
        </div>
      ))}
    </div>
  );
}

function PieChart({ data, onItemClick }) {
  const total = Object.values(data).reduce((a,b)=>a+b,0);
  const colors = ["#0b3d91","#1B5E20","#E65100","#B71C1C","#7B1FA2","#00695C"];
  const entries = Object.entries(data);
  let cumulative = 0;
  const segments = entries.map(([k,v],i)=>{
    const pct = total ? (v/total) : 0;
    const start = cumulative;
    cumulative += pct;
    return { key:k, value:v, pct, start, color:colors[i%colors.length] };
  });
  const describeArc = (start, end) => {
    if (end - start >= 1) return `M 50 50 L 50 10 A 40 40 0 1 1 ${50 + 40*Math.sin(2*Math.PI*(end-0.001))} ${50 - 40*Math.cos(2*Math.PI*(end-0.001))} Z`;
    const s = { x: 50 + 40*Math.sin(2*Math.PI*start), y: 50 - 40*Math.cos(2*Math.PI*start) };
    const e = { x: 50 + 40*Math.sin(2*Math.PI*end), y: 50 - 40*Math.cos(2*Math.PI*end) };
    const large = (end-start) > 0.5 ? 1 : 0;
    return `M 50 50 L ${s.x} ${s.y} A 40 40 0 ${large} 1 ${e.x} ${e.y} Z`;
  };
  return (
    <div style={{ display:"flex", alignItems:"center", gap:16, flexWrap:"wrap" }}>
      <svg width={100} height={100} viewBox="0 0 100 100">
        {total===0 ? <circle cx={50} cy={50} r={40} fill="#f0f4f8"/> : segments.map((s,i)=>(
          <path key={i} d={describeArc(s.start, s.start+s.pct)} fill={s.color} stroke="#fff" strokeWidth={1} style={{ cursor:onItemClick?"pointer":"default" }} onClick={() => onItemClick && onItemClick(s.key)}/>
        ))}
      </svg>
      <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
        {segments.map((s,i)=>(
          <div key={i} style={{ display:"flex", alignItems:"center", gap:6, fontSize:12, cursor:onItemClick?"pointer":"default" }} onClick={() => onItemClick && onItemClick(s.key)}>
            <div style={{ width:12, height:12, borderRadius:3, background:s.color, flexShrink:0 }}/>
            <span style={{ color:"#5a6a7a" }}>{s.key}: <strong style={{ color:"#1a1a2e" }}>{s.value}</strong></span>
          </div>
        ))}
      </div>
    </div>
  );
}

function LoginPage({ onLogin }) {
  const [cpf, setCpf] = useState("");
  const [pwd, setPwd] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);
  const [footOpen, setFootOpen] = useState(false);

  const handle = async () => {
    if (!cpf || !pwd) { setErr("Please enter CPF and password."); return; }
    setLoading(true); setErr("");
    try {
      const res = await api.login(cpf, pwd);
      setToken(res.access_token);
      const user = { ...res.user, role: res.user.role_name || res.user.role };
      onLogin(user, res.access_token);
    } catch(e) {
      setErr(e.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  const loginMain = {
    marginLeft:240, marginTop:56, padding:"20px 24px",
    width:"calc(100% - 240px)",
    minHeight:"calc(100vh - 56px)", boxSizing:"border-box",
  };

  return (
    <div style={S.app}>
      <div style={S.header}>
        <div style={S.headerTitle}>Data Vision — Geophysical Services | Digital Platform for Secure Storage, Data Management and Access!</div>
      </div>
      <div style={{ position:"fixed", top:56, left:0, width:240, height:"calc(100vh - 56px)", background:"#16202c", overflowY:"auto", overflowX:"hidden", zIndex:999, paddingTop:0 }}>
        <div style={{ padding:"10px 16px", borderBottom:"1px solid #2f3f4c", fontSize:12, fontWeight:700, color:"#fff", textTransform:"uppercase", letterSpacing:1 }}>Geophysical Services</div>
        <a style={{...S.sideLink(false), borderLeft:"3px solid transparent"}} href="#">About Us</a>
        <a style={{...S.sideLink(false), borderLeft:"3px solid transparent"}} href="#">Field Parties</a>
        <a style={{...S.sideLink(false), borderLeft:"3px solid transparent"}} href="#">Data Processing Center</a>
        <a style={{...S.sideLink(false), borderLeft:"3px solid transparent"}} href="#">Electronics Lab</a>
        <div style={{ padding:"10px 16px", borderBottom:"1px solid #2f3f4c", borderTop:"1px solid #2f3f4c", fontSize:12, fontWeight:700, color:"#fff", textTransform:"uppercase", letterSpacing:1, marginTop:8 }}>External Links</div>
        <a style={S.sideLink(false)} href="https://ongcindia.com/">ONGC India</a>
      </div>
      <div style={loginMain}>
        <div style={{ background:"#fff", borderRadius:8, padding:20, marginBottom:20 }}>
          <h2 style={{ textAlign:"left", color:"#0b3d91", margin:"0 0 16px 0" }}>User Login / Registration</h2>
          <form onSubmit={e=>{e.preventDefault();handle();}}>
            <table style={{ width:"auto", borderCollapse:"collapse" }}>
              <tbody>
                <tr>
                  <td style={{ padding:"8px 12px 8px 0", fontWeight:"bold", fontSize:13 }}><label>CPF Login / Domain</label></td>
                  <td style={{ padding:"8px 0" }}>
                    <input type="text" style={{ ...S.input, margin:0, minWidth:220 }} placeholder="CPF Number" value={cpf} onChange={e=>setCpf(e.target.value)} />
                  </td>
                </tr>
                <tr>
                  <td style={{ padding:"8px 12px 8px 0", fontWeight:"bold", fontSize:13 }}><label>Password</label></td>
                  <td style={{ padding:"8px 0" }}>
                    <input type="password" style={{ ...S.input, margin:0, minWidth:220 }} placeholder="Domain Password" value={pwd} onChange={e=>setPwd(e.target.value)} />
                  </td>
                </tr>
                {err && <tr><td colSpan={2} style={{ padding:"4px 0" }}><div style={{ color:"#B71C1C", fontSize:13, padding:"6px 10px", background:"#FFEBEE", borderRadius:4 }}>{err}</div></td></tr>}
                <tr>
                  <td colSpan={2} style={{ textAlign:"right", paddingTop:12 }}>
                    <button type="submit" style={{ padding:"6px 16px", fontSize:15, background:"#0b3d91", color:"#fff", border:"none", borderRadius:4, cursor:"pointer", fontWeight:600 }} disabled={loading}>
                      {loading ? "Authenticating…" : "Submit"}
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </form>
        </div>
        <div style={{ background:"#fff", borderRadius:8, padding:20, marginBottom:20 }}>
          <h3 style={{ margin:"0 0 12px 0", color:"#0b3d91", fontSize:15 }}>Test Accounts — click any to auto-fill</h3>
          {[
            { label:"Admin — full access", color:"#B71C1C", users:[
              {cpf:"100001",pw:"admin123",name:"Sh. Sandip Kumar Kaur",area:"All",cat:"—",om:"—"},
              {cpf:"100005",pw:"Rucha",name:"Rucha",area:"All",cat:"—",om:"—"},
            ]},
            { label:"Ops Managers — manage their allocated areas", color:"#E65100", users:[
              {cpf:"100002",pw:"ops123",name:"Rajiv Sharma",area:"Operations",cat:"—",om:"—"},
              {cpf:"100018",pw:"gpops",name:"Sanjay Gupta",area:"GP-03/06/15/16/36/61/81",cat:"—",om:"—"},
              {cpf:"100019",pw:"relops",name:"Ravi Agarwal",area:"REL/RCC/HSE/Contracts",cat:"—",om:"—"},
              {cpf:"100027",pw:"assetops",name:"Vikas Sharma",area:"GP-03/06 (Ahmedabad)",cat:"—",om:"—"},
              {cpf:"100050",pw:"ankops",name:"Anil Kapoor",area:"GP-61/81 (Ankleshwar)",cat:"—",om:"—"},
              {cpf:"100051",pw:"mehops",name:"Sunil Dutt",area:"GP-15/16 (Mehsana)",cat:"—",om:"—"},
              {cpf:"100052",pw:"rajops",name:"Rajendra Singh",area:"GP-36 (Rajasthan)",cat:"—",om:"—"},
            ]},
            { label:"Data Creators — under Sanjay Gupta (GP Sections)", color:"#1B5E20", users:[
              {cpf:"100003",pw:"user123",name:"Mahavir Singh",area:"GP-36",cat:"Seismic Data",om:"Sanjay Gupta",loc:"Linch"},
              {cpf:"100006",pw:"gp0303",name:"Anil Verma",area:"GP-03",cat:"Seismic Data",om:"Sanjay Gupta",loc:"Jambusar"},
              {cpf:"100030",pw:"gp3603",name:"Amit Kumar",area:"GP-36",cat:"Seismic Data",om:"Sanjay Gupta",loc:"Linch"},
              {cpf:"100007",pw:"gp0606",name:"Vikram Singh",area:"GP-06",cat:"Well Data",om:"Sanjay Gupta",loc:"Gandhar"},
              {cpf:"100008",pw:"gp1515",name:"Rakesh Patel",area:"GP-15",cat:"Seismic Data",om:"Sanjay Gupta",loc:"Mehsana"},
              {cpf:"100009",pw:"gp1616",name:"Suresh Nair",area:"GP-16",cat:"Seismic Data",om:"Sanjay Gupta",loc:"Valod"},
              {cpf:"100010",pw:"gp6161",name:"Meena Joshi",area:"GP-61",cat:"Seismic Data",om:"Sanjay Gupta",loc:"Ankleshwar"},
              {cpf:"100011",pw:"gp8181",name:"Deepak Yadav",area:"GP-81",cat:"Well Data",om:"Sanjay Gupta",loc:"Cambay"},
              {cpf:"100031",pw:"gp0306",name:"Sunita Devi",area:"GP-03",cat:"Well Data",om:"Sanjay Gupta",loc:"Jambusar"},
              {cpf:"100032",pw:"gpgp15",name:"Rajesh Verma",area:"GP-15",cat:"Seismic Data",om:"Sanjay Gupta",loc:"Mehsana"},
            ]},
            { label:"Data Creators — under Ravi Agarwal (Support Services)", color:"#1B5E20", users:[
              {cpf:"100012",pw:"relrel",name:"Pooja Sharma",area:"REL",cat:"Legal",om:"Ravi Agarwal",loc:"Vadodara"},
              {cpf:"100033",pw:"relrel2",name:"Neelam Joshi",area:"REL",cat:"Legal",om:"Ravi Agarwal",loc:"Vadodara"},
              {cpf:"100013",pw:"rccrcc",name:"Manoj Tiwari",area:"RCC",cat:"Accounts",om:"Ravi Agarwal",loc:"Vadodara"},
              {cpf:"100034",pw:"rccrcc2",name:"Vijay Patil",area:"RCC",cat:"Accounts",om:"Ravi Agarwal",loc:"Vadodara"},
              {cpf:"100014",pw:"hsehse",name:"Sunil Kumar",area:"HSE",cat:"HSE",om:"Ravi Agarwal",loc:"Vadodara"},
              {cpf:"100035",pw:"hsehse2",name:"Anita Sharma",area:"HSE",cat:"HSE",om:"Ravi Agarwal",loc:"Ankleshwar"},
              {cpf:"100015",pw:"concon",name:"Arjun Mehta",area:"Contracts",cat:"Contracts",om:"Ravi Agarwal",loc:"Ahmedabad"},
              {cpf:"100036",pw:"concon2",name:"Rohit Singh",area:"Contracts",cat:"Contracts",om:"Ravi Agarwal",loc:"Vadodara"},
            ]},
            { label:"Data Creators — under Vikas Sharma (Ahmedabad)", color:"#2E7D32", users:[
              {cpf:"100023",pw:"ahmedabad",name:"Hemant Desai",area:"GP-03",cat:"Seismic Data",om:"Vikas Sharma",loc:"Ahmedabad"},
              {cpf:"100037",pw:"ahm002",name:"Suresh Rathod",area:"GP-06",cat:"Seismic Data",om:"Vikas Sharma",loc:"Ahmedabad"},
            ]},
            { label:"Data Creators — under Anil Kapoor (Ankleshwar)", color:"#2E7D32", users:[
              {cpf:"100024",pw:"ankleshwar",name:"Prakash Nair",area:"GP-61",cat:"Well Data",om:"Anil Kapoor",loc:"Ankleshwar"},
              {cpf:"100038",pw:"ank002",name:"Geeta Reddy",area:"GP-61",cat:"Well Data",om:"Anil Kapoor",loc:"Ankleshwar"},
            ]},
            { label:"Data Creators — under Sunil Dutt (Mehsana)", color:"#2E7D32", users:[
              {cpf:"100025",pw:"mehsana",name:"Dinesh Patel",area:"GP-15",cat:"Seismic Data",om:"Sunil Dutt",loc:"Mehsana"},
              {cpf:"100039",pw:"meh002",name:"Mohan Lal",area:"GP-15",cat:"Seismic Data",om:"Sunil Dutt",loc:"Mehsana"},
            ]},
            { label:"Data Creators — under Rajendra Singh (Rajasthan)", color:"#2E7D32", users:[
              {cpf:"100026",pw:"rajasthan",name:"Kamla Devi",area:"GP-36",cat:"Seismic Data",om:"Rajendra Singh",loc:"Barmer"},
              {cpf:"100040",pw:"raj002",name:"Shanti Devi",area:"GP-36",cat:"Seismic Data",om:"Rajendra Singh",loc:"Jaisalmer"},
            ]},
            { label:"Viewers (read-only access)", color:"#1565c0", users:[
              {cpf:"100004",pw:"view123",name:"Priya Patel",area:"GP-03",cat:"Seismic Data",om:"Sanjay Gupta",loc:"Jambusar"},
              {cpf:"100020",pw:"vie036",name:"Neha Kapoor",area:"GP-36",cat:"Seismic Data",om:"Sanjay Gupta",loc:"Linch"},
              {cpf:"100021",pw:"vie003",name:"Rahul Bose",area:"GP-03",cat:"Seismic Data",om:"Sanjay Gupta",loc:"Jambusar"},
              {cpf:"100041",pw:"vie0362",name:"Kavita Singh",area:"GP-36",cat:"Seismic Data",om:"Sanjay Gupta",loc:"Linch"},
              {cpf:"100042",pw:"vie061",name:"Arun Kumar",area:"GP-06",cat:"Well Data",om:"Sanjay Gupta",loc:"Gandhar"},
              {cpf:"100022",pw:"vieree",name:"Karan Mehta",area:"REL",cat:"Legal",om:"Ravi Agarwal",loc:"Vadodara"},
              {cpf:"100043",pw:"viercc",name:"Divya Sharma",area:"RCC",cat:"Accounts",om:"Ravi Agarwal",loc:"Vadodara"},
              {cpf:"100044",pw:"viehse",name:"Pankaj Jain",area:"HSE",cat:"HSE",om:"Ravi Agarwal",loc:"Vadodara"},
              {cpf:"100028",pw:"vieahm",name:"Sanjay Mehta",area:"GP-03",cat:"Seismic Data",om:"Vikas Sharma",loc:"Ahmedabad"},
              {cpf:"100029",pw:"vieank",name:"Rohan Joshi",area:"GP-61",cat:"Well Data",om:"Anil Kapoor",loc:"Ankleshwar"},
              {cpf:"100045",pw:"viemeh",name:"Megha Desai",area:"GP-15",cat:"Seismic Data",om:"Sunil Dutt",loc:"Mehsana"},
              {cpf:"100046",pw:"vieraj",name:"Ravi Raj",area:"GP-36",cat:"Seismic Data",om:"Rajendra Singh",loc:"Barmer"},
            ]},
          ].map(group => (
            <div key={group.label} style={{ marginBottom:12 }}>
              <div style={{ fontWeight:700, fontSize:13, color:group.color, marginBottom:6 }}>{group.label}</div>
              <table style={{ width:"100%", borderCollapse:"collapse", fontSize:12 }}>
                <thead>
                  <tr style={{ background:"#f4f6f9" }}>
                    <th style={{ textAlign:"left", padding:"4px 8px", fontWeight:600, color:"#555" }}>Name</th>
                    <th style={{ textAlign:"left", padding:"4px 8px", fontWeight:600, color:"#555" }}>Section</th>
                    <th style={{ textAlign:"left", padding:"4px 8px", fontWeight:600, color:"#555" }}>Category</th>
                    <th style={{ textAlign:"left", padding:"4px 8px", fontWeight:600, color:"#555" }}>Location</th>
                    <th style={{ textAlign:"left", padding:"4px 8px", fontWeight:600, color:"#555" }}>Ops Mgr</th>
                    <th style={{ textAlign:"left", padding:"4px 8px", fontWeight:600, color:"#555" }}>Credentials</th>
                    <th style={{ padding:"4px 8px", width:50 }}></th>
                  </tr>
                </thead>
                <tbody>
                  {group.users.map(u => (
                    <tr key={u.cpf} style={{ borderTop:"1px solid #eee" }}>
                      <td style={{ padding:"4px 8px", fontWeight:600, color:"#333" }}>{u.name}</td>
                      <td style={{ padding:"4px 8px", color:"#666" }}>{u.area || "—"}</td>
                      <td style={{ padding:"4px 8px", color:"#666" }}>{u.cat || "—"}</td>
                      <td style={{ padding:"4px 8px", color:"#888", fontSize:11 }}>{u.loc || "—"}</td>
                      <td style={{ padding:"4px 8px", color:"#888", fontSize:11 }}>{u.om || "—"}</td>
                      <td style={{ padding:"4px 8px", color:"#888", fontFamily:"monospace", fontSize:11 }}>{u.cpf}/{u.pw}</td>
                      <td style={{ padding:"4px 8px" }}>
                        <button type="button" style={{ padding:"2px 10px", fontSize:10, background:group.color, color:"#fff", border:"none", borderRadius:3, cursor:"pointer", fontWeight:600 }} onClick={()=>{setCpf(u.cpf);setPwd(u.pw);}}>Use</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </div>
        <div style={{ width:"100%", maxWidth:540, margin:"0 auto" }}>
          <h2 style={{ textAlign:"center", color:"#0b3d91", marginBottom:16, fontSize:18 }}>Office Gallery</h2>
          <div style={{ width:"100%", height:200, background:"linear-gradient(135deg,#0b3d91,#1565c0)", borderRadius:8, marginBottom:15, display:"flex", alignItems:"center", justifyContent:"center", color:"#fff", fontSize:16, fontWeight:600 }}>ONGC — Vadodara Headquarters</div>
          <div style={{ width:"100%", height:200, background:"linear-gradient(135deg,#1a237e,#283593)", borderRadius:8, display:"flex", alignItems:"center", justifyContent:"center", color:"#fff", fontSize:16, fontWeight:600 }}>Geophysical Services — WON Basin</div>
        </div>
      </div>
      <div style={S.footer}>
        <div style={S.footerToggle} onClick={() => setFootOpen(o => !o)}>{footOpen ? "▼ Hide Links" : "▲ Quick Links"}</div>
        {footOpen && <div style={S.footerMenu}>
          <a style={S.footerLink} href="https://ongcindia.com/">About ONGC</a>
          <a style={S.footerLink} href="http://10.203.50.150/about_us/">About Geophysical Services</a>
          <a style={S.footerLink} href="http://vdaeureka.ongc.co.in/">Eureka</a>
          <a style={S.footerLink} href="https://reports.ongc.co.in/">ONGC Reports</a>
          <a style={S.footerLink} href="https://sparktriangle.com/">Digital Library</a>
          <a style={S.footerLink} href="http://10.205.55.76:8080/Upload/Vadodara_Directory.htm">Help Desk</a>
        </div>}
      </div>
    </div>
  );
}

function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [drill, setDrill] = useState(null);
  useEffect(() => {
    api.getStats().then(setStats).catch(()=>setStats({ total:0, pending:0, approved:0, rejected:0, bySection:{}, byType:{}, byClassification:{}, recentActivity:[] })).finally(()=>setLoading(false));
  }, []);
  if (loading) return <Spinner />;
  const recentActivity = (stats.recentActivity || []).map(f => ({ ...f, fileName: f.fileName || f.file_name, uploadDate: f.uploadDate || (f.upload_date ? f.upload_date.split("T")[0] : ""), uploadedByName: f.uploadedByName || f.uploaded_by }));
  return (
    <div>
      <div style={S.sectionTitle}>Admin Dashboard</div>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:16, marginBottom:16 }}>
        {[["Total Files",stats.total,"#0b3d91"],["Pending Approval",stats.pending,"#E65100"],["Approved",stats.approved,"#1B5E20"],["Rejected",stats.rejected,"#B71C1C"]].map(([l,v,c])=>(
          <div key={l} style={{ background:`linear-gradient(135deg,${c},${c}dd)`, borderRadius:10, padding:20, color:"#fff", minWidth:0, boxShadow:"0 2px 8px rgba(0,0,0,0.12)", cursor:"pointer" }} onClick={() => setDrill({ title:`Files with status: ${l}`, filterKey:"status", filterValue:l==="Total Files"?"":l })}>
            <div style={{ fontSize:12, fontWeight:600, opacity:0.85, marginBottom:8, textTransform:"uppercase", letterSpacing:0.5 }}>{l}</div>
            <div style={{ fontSize:32, fontWeight:800 }}>{v}</div>
          </div>
        ))}
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:16, marginBottom:16 }}>
        <div style={{ ...S.card, minWidth:0 }}><div style={{ fontSize:14, fontWeight:700, color:"#0b3d91", marginBottom:12 }}>Files by Section</div><PieChart data={stats.bySection || {}} onItemClick={k => setDrill({ title:`Files in Section: ${k}`, filterKey:"section", filterValue:k })} /></div>
        <div style={{ ...S.card, minWidth:0 }}><div style={{ fontSize:14, fontWeight:700, color:"#0b3d91", marginBottom:12 }}>Files by Type</div><PieChart data={stats.byType || {}} onItemClick={k => setDrill({ title:`Files of Type: ${k}`, filterKey:"file_type", filterValue:k })} /></div>
        <div style={{ ...S.card, minWidth:0 }}><div style={{ fontSize:14, fontWeight:700, color:"#0b3d91", marginBottom:12 }}>Classification Distribution</div><PieChart data={stats.byClassification || {}} onItemClick={k => setDrill({ title:`Files classified as: ${k}`, filterKey:"classification", filterValue:k })} /></div>
      </div>
      <div style={S.card}>
        <div style={{ fontSize:15, fontWeight:700, color:"#0b3d91", marginBottom:12, paddingBottom:8, borderBottom:"1px solid #f0f0f0" }}>Recent Activity</div>
        {recentActivity.length === 0 ? <div style={{ color:"#aaa", textAlign:"center", padding:24 }}>No recent activity yet.</div> : (
          <table style={S.table}>
            <thead><tr>{["File Name","Section","Category","Uploaded By","Date","Status"].map(h=><th key={h} style={S.th}>{h}</th>)}</tr></thead>
            <tbody>{recentActivity.map(f=>(
              <tr key={f.id}>
                <td style={S.td}><span style={{ color:"#0b3d91", fontWeight:600 }}>{f.fileName}</span></td>
                <td style={S.td}>{f.section}</td><td style={S.td}>{f.category}</td>
                <td style={S.td}>{f.uploadedByName}</td><td style={S.td}>{f.uploadDate}</td>
                <td style={S.td}><span style={{ ...S.badge(statusColor[f.status], statusBg[f.status]) }}>{f.status}</span></td>
              </tr>
            ))}</tbody>
          </table>
        )}
      </div>
      <DrillDownModal drill={drill} onClose={() => setDrill(null)} />
    </div>
  );
}

function OpsDashboard() {
  const [stats, setStats] = useState(null); const [pendingFiles, setPendingFiles] = useState([]); const [loading, setLoading] = useState(true);
  const [drill, setDrill] = useState(null);
  useEffect(() => {
    Promise.all([api.getStats(), api.searchFiles({ status: "Pending" })]).then(([s, pf]) => {
      setStats(s); setPendingFiles((pf || []).map(normalizeFile));
    }).catch(()=>{ setStats({ total:0, pending:0, approved:0, rejected:0, bySection:{}, byType:{}, byClassification:{} }); setPendingFiles([]); }).finally(()=>setLoading(false));
  }, []);
  if (loading) return <Spinner />;
  return (
    <div>
      <div style={S.sectionTitle}>Operations Manager Dashboard</div>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:16, marginBottom:16 }}>
        {[["Accessible Files",stats.total,"#1565c0"],["Pending Approval",stats.pending,"#E65100"],["Approved",stats.approved,"#1B5E20"],["Rejected",stats.rejected,"#B71C1C"]].map(([l,v,c])=>(
          <div key={l} style={{ background:`linear-gradient(135deg,${c},${c}dd)`, borderRadius:10, padding:20, color:"#fff", minWidth:0, boxShadow:"0 2px 8px rgba(0,0,0,0.12)", cursor:"pointer" }} onClick={() => setDrill({ title:`Files with status: ${l}`, filterKey:"status", filterValue:l==="Accessible Files"?"":l })}><div style={{ fontSize:12, fontWeight:600, opacity:0.85, marginBottom:8, textTransform:"uppercase", letterSpacing:0.5 }}>{l}</div><div style={{ fontSize:32, fontWeight:800 }}>{v}</div></div>
        ))}
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(2,1fr)", gap:16, marginBottom:16 }}>
        <div style={{ ...S.card, minWidth:0 }}><div style={{ fontSize:14, fontWeight:700, color:"#0b3d91", marginBottom:12 }}>Files by Section</div><PieChart data={stats.bySection || {}} onItemClick={k => setDrill({ title:`Files in Section: ${k}`, filterKey:"section", filterValue:k })} /></div>
        <div style={{ ...S.card, minWidth:0 }}><div style={{ fontSize:14, fontWeight:700, color:"#0b3d91", marginBottom:12 }}>Status Distribution</div><PieChart data={{ Approved:stats.approved, Pending:stats.pending, Rejected:stats.rejected }} onItemClick={k => setDrill({ title:`Files with status: ${k}`, filterKey:"status", filterValue:k })} /></div>
      </div>
      {pendingFiles.length > 0 && (
        <div style={S.card}>
          <div style={{ fontSize:15, fontWeight:700, color:"#E65100", marginBottom:12, paddingBottom:8, borderBottom:"1px solid #f0f0f0" }}>⏳ Pending Approvals ({pendingFiles.length})</div>
          <table style={S.table}>
            <thead><tr>{["File","Section","Category","Classification","Uploader","Date"].map(h=><th key={h} style={S.th}>{h}</th>)}</tr></thead>
            <tbody>{pendingFiles.map(f=>(
              <tr key={f.id}>
                <td style={S.td}>{f.fileName}</td><td style={S.td}>{f.section}</td><td style={S.td}>{f.category}</td>
                <td style={S.td}><span style={{ ...S.badge(classColor[f.classification],"#fff"), border:`1px solid ${classColor[f.classification]}` }}>{f.classification}</span></td>
                <td style={S.td}>{f.uploadedByName}</td><td style={S.td}>{f.uploadDate}</td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      )}
      <DrillDownModal drill={drill} onClose={() => setDrill(null)} />
    </div>
  );
}

function CreatorDashboard({ user }) {
  const [myFiles, setMyFiles] = useState([]); const [moduleData, setModuleData] = useState(null); const [loading, setLoading] = useState(true);
  const [drill, setDrill] = useState(null);
  useEffect(() => {
    setLoading(true);
    Promise.all([api.getStats(), api.listFiles(), api.getModuleSummary()]).then(([, all, ms]) => {
      const normalized = (all || []).map(normalizeFile); setMyFiles(normalized.filter(f => f.uploadedBy === user.id));
      setModuleData(ms);
    }).catch(()=>{ setMyFiles([]); setModuleData(null); }).finally(()=>setLoading(false));
  }, [user.id]);
  if (loading) return <Spinner />;
  const modules = moduleData?.modules || {};
  const moduleList = Object.entries(modules).filter(([,v]) => v.total > 0);
  const recentAcross = moduleList.flatMap(([k,v]) => (v.recent || []).map(r => ({ ...r, moduleKey: k, moduleLabel: v.label }))).sort((a,b) => (b.created_at||"").localeCompare(a.created_at||"")).slice(0,10);
  const MODULE_ICONS = { progressReports:"📊", manpowerStatus:"👥", contractStatus:"📄", fundManagement:"💰", dataProcessing:"🖥️", regionalLab:"🔬", reportingAppraisals:"📋", pendingIssues:"⚠️", hseIncidents:"🚨", awpItems:"🎯" };
  const MODULE_COLORS = { progressReports:"#0b3d91", manpowerStatus:"#2E7D32", contractStatus:"#E65100", fundManagement:"#6A1B9A", dataProcessing:"#00838F", regionalLab:"#4E342E", reportingAppraisals:"#37474F", pendingIssues:"#C62828", hseIncidents:"#BF360C", awpItems:"#1565C0" };
  return (
    <div>
      <div style={S.sectionTitle}>Data Creator Dashboard</div>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:16, marginBottom:16 }}>
        {[["My Uploads",myFiles.length,"#0b3d91"],["My Pending",myFiles.filter(f=>f.status==="Pending").length,"#E65100"],["My Approved",myFiles.filter(f=>f.status==="Approved").length,"#1B5E20"]].map(([l,v,c])=>(
          <div key={l} style={{ background:`linear-gradient(135deg,${c},${c}dd)`, borderRadius:10, padding:20, color:"#fff", minWidth:0, boxShadow:"0 2px 8px rgba(0,0,0,0.12)", cursor:"pointer" }} onClick={() => { const s = l==="My Uploads"?"":l.replace("My ",""); setDrill({ title:`${l} (${v})`, filterKey:"status", filterValue:s }); }}><div style={{ fontSize:12, fontWeight:600, opacity:0.85, marginBottom:8, textTransform:"uppercase", letterSpacing:0.5 }}>{l}</div><div style={{ fontSize:32, fontWeight:800 }}>{v}</div></div>
        ))}
      </div>
      {moduleList.length > 0 && (
        <>
          <div style={{ fontSize:15, fontWeight:700, color:"#0b3d91", marginBottom:12 }}>My Module Activity</div>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(150px,1fr))", gap:12, marginBottom:16 }}>
            {moduleList.map(([k,v]) => (
              <div key={k} style={{ background:`linear-gradient(135deg,${MODULE_COLORS[k]||"#555"},${MODULE_COLORS[k]||"#555"}dd)`, borderRadius:10, padding:16, color:"#fff", minWidth:0, boxShadow:"0 2px 8px rgba(0,0,0,0.12)" }}>
                <div style={{ fontSize:20, marginBottom:4 }}>{MODULE_ICONS[k]||"📁"}</div>
                <div style={{ fontSize:11, fontWeight:600, opacity:0.85, marginBottom:4, textTransform:"uppercase", letterSpacing:0.3 }}>{v.label}</div>
                <div style={{ fontSize:24, fontWeight:800 }}>{v.total}</div>
              </div>
            ))}
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16, marginBottom:16 }}>
            <div style={S.card}>
              <div style={{ fontSize:14, fontWeight:700, color:"#0b3d91", marginBottom:12 }}>Module Distribution</div>
              <PieChart data={Object.fromEntries(moduleList.map(([k,v]) => [v.label, v.total]))} />
            </div>
            <div style={S.card}>
              <div style={{ fontSize:14, fontWeight:700, color:"#0b3d91", marginBottom:12 }}>My Files by Status</div>
              <PieChart data={{ Approved:myFiles.filter(f=>f.status==="Approved").length, Pending:myFiles.filter(f=>f.status==="Pending").length, Rejected:myFiles.filter(f=>f.status==="Rejected").length }} onItemClick={k => setDrill({ title:`My ${k} Files`, filterKey:"status", filterValue:k })} />
            </div>
          </div>
          <div style={S.card}>
            <div style={{ fontSize:15, fontWeight:700, color:"#0b3d91", marginBottom:12, paddingBottom:8, borderBottom:"1px solid #f0f0f0" }}>Recent Module Activity</div>
            {recentAcross.length === 0 ? <div style={{ color:"#aaa", textAlign:"center", padding:24 }}>No module activity yet.</div> : (
              <table style={S.table}>
                <thead><tr>{["Module","Item","Status","Date"].map(h=><th key={h} style={S.th}>{h}</th>)}</tr></thead>
                <tbody>{recentAcross.map((r,i) => (
                  <tr key={`${r.moduleKey}-${r.id}-${i}`}>
                    <td style={S.td}><span style={{ fontSize:16, marginRight:6 }}>{MODULE_ICONS[r.moduleKey]||"📁"}</span>{r.moduleLabel}</td>
                    <td style={S.td}><span style={{ fontWeight:600 }}>{r.name || `#${r.id}`}</span></td>
                    <td style={S.td}>{r.status ? <span style={{ ...S.badge(statusColor[r.status]||"#888", statusBg[r.status]||"#eee") }}>{r.status}</span> : <span style={{ color:"#aaa" }}>—</span>}</td>
                    <td style={S.td}>{r.created_at ? new Date(r.created_at).toLocaleDateString() : "—"}</td>
                  </tr>
                ))}</tbody>
              </table>
            )}
          </div>
        </>
      )}
      <div style={S.card}>
        <div style={{ fontSize:15, fontWeight:700, color:"#0b3d91", marginBottom:12, paddingBottom:8, borderBottom:"1px solid #f0f0f0" }}>My Recent Uploads</div>
        {myFiles.length === 0 ? <div style={{ color:"#aaa", textAlign:"center", padding:24 }}>No uploads yet.</div> : (
          <table style={S.table}>
            <thead><tr>{["File Name","Type","Category","Season","Status"].map(h=><th key={h} style={S.th}>{h}</th>)}</tr></thead>
            <tbody>{myFiles.slice(0,6).map(f=>(
              <tr key={f.id}>
                <td style={S.td}>{f.fileName}</td><td style={S.td}>{f.fileType}</td><td style={S.td}>{f.category}</td><td style={S.td}>{f.season}</td>
                <td style={S.td}><span style={{ ...S.badge(statusColor[f.status], statusBg[f.status]) }}>{f.status}</span></td>
              </tr>
            ))}</tbody>
          </table>
        )}
      </div>
      <DrillDownModal drill={drill} onClose={() => setDrill(null)} />
    </div>
  );
}

function ViewerDashboard() {
  const [stats, setStats] = useState(null); const [approvedFiles, setApprovedFiles] = useState([]); const [loading, setLoading] = useState(true);
  const [drill, setDrill] = useState(null);
  useEffect(() => {
    Promise.all([api.getStats(), api.searchFiles({ status: "Approved" })]).then(([s, af]) => {
      setStats(s); setApprovedFiles((af || []).map(normalizeFile).filter(f => f.classification === "General / Available for All"));
    }).catch(()=>{ setStats({ total:0, approved:0 }); setApprovedFiles([]); }).finally(()=>setLoading(false));
  }, []);
  if (loading) return <Spinner />;
  return (
    <div>
      <div style={S.sectionTitle}>Data Viewer Dashboard</div>
      <div style={{ background:"#E3F2FD", borderRadius:8, padding:16, marginBottom:16, border:"1px solid #90CAF9" }}>
        <div style={{ fontWeight:700, color:"#1565c0", marginBottom:6, fontSize:14 }}>Access Level: Level-0 — General User</div>
        <div style={{ color:"#5a6a7a", fontSize:13 }}>You have read-only access to General / Available for All data.</div>
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(2,1fr)", gap:16, marginBottom:16 }}>
        {[["Total Files",stats?.total||0,"#0b3d91"],["Accessible Approved",approvedFiles.length,"#1B5E20"]].map(([l,v,c])=>(
          <div key={l} style={{ background:`linear-gradient(135deg,${c},${c}dd)`, borderRadius:10, padding:20, color:"#fff", minWidth:0, boxShadow:"0 2px 8px rgba(0,0,0,0.12)", cursor:"pointer" }} onClick={() => setDrill({ title:l==="Total Files"?"All Files":`${l} (${v})`, filterKey: l==="Total Files"?"":"status", filterValue: l==="Total Files"?"":"Approved" })}><div style={{ fontSize:12, fontWeight:600, opacity:0.85, marginBottom:8, textTransform:"uppercase", letterSpacing:0.5 }}>{l}</div><div style={{ fontSize:32, fontWeight:800 }}>{v}</div></div>
        ))}
      </div>
      <div style={S.card}>
        <div style={{ fontSize:15, fontWeight:700, color:"#0b3d91", marginBottom:12, paddingBottom:8, borderBottom:"1px solid #f0f0f0" }}>Available Files (General Access)</div>
        {approvedFiles.length === 0 ? <div style={{ color:"#aaa", textAlign:"center", padding:24 }}>No general files available yet.</div> : (
          <table style={S.table}>
            <thead><tr>{["File Name","Type","Project","Section","Category","Season","Download"].map(h=><th key={h} style={S.th}>{h}</th>)}</tr></thead>
            <tbody>{approvedFiles.map(f=>(
              <tr key={f.id}>
                <td style={S.td}><span style={{ color:"#0b3d91", fontWeight:600 }}>{f.fileName}</span></td>
                <td style={S.td}>{f.fileType}</td><td style={S.td}>{f.projectName}</td><td style={S.td}>{f.section}</td>
                <td style={S.td}>{f.category}</td><td style={S.td}>{f.season}</td>
                <td style={S.td}><DownloadButton fileId={f.id} fileName={f.fileName} /></td>
              </tr>
            ))}</tbody>
          </table>
        )}
      </div>
      <DrillDownModal drill={drill} onClose={() => setDrill(null)} />
    </div>
  );
}

function DownloadButton({ fileId, fileName }) {
  const [loading, setLoading] = useState(false);
  const handleDownload = async () => {
    setLoading(true);
    try {
      const res = await api.downloadFile(fileId);
      if (res.status === 403) {
        const vres = await api.viewFile(fileId);
        if (!vres.ok) throw new Error("View failed");
        const blob = await vres.blob(); const url = URL.createObjectURL(blob);
        window.open(url, "_blank"); URL.revokeObjectURL(url);
      } else {
        if (!res.ok) throw new Error("Download failed");
        const blob = await res.blob(); const url = URL.createObjectURL(blob);
        const a = document.createElement("a"); a.href = url; a.download = fileName; a.click(); URL.revokeObjectURL(url);
      }
    } catch(e) { alert("Download failed: " + e.message); } finally { setLoading(false); }
  };
  return <button style={S.btnSm("success")} onClick={handleDownload} disabled={loading}>{loading ? "…" : "⬇ Download"}</button>;
}

function ActionButtonForFile({ f, searchTerm }) {
  const restricted = ["Confidential", "Highly Confidential / Restricted"].includes(f.classification);
  const isSeed = f.filePath && f.filePath.includes("seed_");
  const [showSummary, setShowSummary] = useState(false);
  const handleView = () => {
    const token = getToken();
    const isPdf = f.fileType === "PDF" || (f.fileName || "").toLowerCase().endsWith(".pdf");
    if (isPdf && searchTerm) {
      window.open(`/api/files/pdfviewer/${f.id}?token=${token}&search=${encodeURIComponent(searchTerm)}`, "_blank");
    } else {
      window.open(`/api/files/view/${f.id}?token=${token}`, "_blank");
    }
  };
  const hasSummary = f.summary && f.summary.trim();
  if (isSeed) return <span style={{ fontSize:11, color:"#999", fontStyle:"italic" }}>Mock Data</span>;
  return <div style={{ display:"flex", gap:4, alignItems:"center" }}>{restricted ? <button style={S.btnSm("secondary")} onClick={handleView}>View</button> : <DownloadButton fileId={f.id} fileName={f.fileName} />}{hasSummary && <button style={S.btnSm("primary")} onClick={e=>{e.stopPropagation();setShowSummary(!showSummary);}}>Summary</button>}{showSummary && <div style={{ position:"fixed", top:0, left:0, right:0, bottom:0, background:"rgba(0,0,0,0.4)", zIndex:1000, display:"flex", alignItems:"center", justifyContent:"center" }} onClick={e=>{e.stopPropagation();setShowSummary(false);}}><div style={{ background:"#fff", borderRadius:10, padding:24, maxWidth:600, width:"90%", maxHeight:"70vh", overflowY:"auto", boxShadow:"0 8px 32px rgba(0,0,0,0.3)" }} onClick={e=>e.stopPropagation()}><div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}><span style={{ fontSize:16, fontWeight:700, color:"#0b3d91" }}>Summary — {f.fileName}</span><button style={{ background:"none", border:"none", fontSize:20, cursor:"pointer", color:"#999" }} onClick={()=>setShowSummary(false)}>×</button></div><div style={{ fontSize:14, lineHeight:1.6, color:"#333" }}>{f.summary}</div></div></div>}</div>;
}

function UploadFile({ user, onToast }) {
  const empty = { fileType:"", projectName:"", sigNumber:"", dataType:"", section: user?.area || "", category: user?.user_category || "", season:"", block:"", mlBlock:"", location:"", classification:"", contractorName:"" };
  const [form, setForm] = useState(empty); const [fileInput, setFileInput] = useState(null); const [loading, setLoading] = useState(false); const fileRef = useRef(null);
  const [fileTypes, setFileTypes] = useState(FILE_TYPES);
  const [dataTypes, setDataTypes] = useState(DATA_TYPES);
  const [sections, setSections] = useState(SECTIONS);
  const [categories, setCategories] = useState(CATEGORIES);
  const [seasons, setSeasons] = useState(SEASONS);
  const [blocks, setBlocks] = useState(BLOCKS);
  const [projectNames, setProjectNames] = useState([]);
  const [classifications, setClassifications] = useState(CLASSIFICATIONS);
  const [autoFileName, setAutoFileName] = useState("");
  const set = (k,v) => setForm(f=>({...f,[k]:v}));
  useEffect(() => {
    api.getLookups("file_type").then(d => setFileTypes(d.map(x=>x.value))).catch(() => {});
    api.getLookups("data_type").then(d => setDataTypes(d.map(x=>x.value))).catch(() => {});
    api.getLookups("section").then(d => {
      const vals = d.map(x=>x.value);
      setSections(vals);
      if (user?.area) {
        const m = vals.filter(v => v === user.area || v.startsWith(user.area));
        if (m.length > 0) set("section", m[0]);
      }
    }).catch(() => {});
    api.getLookups("category").then(d => {
      const vals = d.map(x=>x.value);
      setCategories(vals);
      if (user?.user_category) {
        const m = vals.filter(v => v === user.user_category || v.startsWith(user.user_category));
        if (m.length > 0) set("category", m[0]);
      }
    }).catch(() => {});
    api.getLookups("season").then(d => setSeasons(d.map(x=>x.value))).catch(() => {});
    api.getLookups("block").then(d => setBlocks(d.map(x=>x.value))).catch(() => {});
    api.getLookups("classification").then(d => setClassifications(d.map(x=>x.value))).catch(() => {});
    api.getLookups("project_name").then(d => {
      const vals = d.map(x=>x.value);
      setProjectNames(vals);
    }).catch(() => {});
  }, []);
  useEffect(() => {
    const ext = form.fileType?.toLowerCase() || "pdf";
    const parts = [
      form.projectName?.match(/\d{4}/)?.[0] || "",
      form.section || "",
      form.sigNumber || "",
      form.dataType || "",
      form.location || "",
      form.contractorName || "",
    ];
    const seq = String(Date.now()).slice(-4);
    const name = parts.filter(Boolean).join("_") + (parts.some(Boolean) ? `_${seq}` : "") + "." + ext;
    setAutoFileName(name);
  }, [form]);
  const handleSubmit = async () => {
    if (!form.fileType||!form.projectName||!form.dataType||!form.section||!form.category||!form.season||!form.block||!form.classification) { onToast("Please fill all required fields", "error"); return; }
    if (!fileInput) { onToast("Please select a file to upload", "error"); return; }
    const fd = new FormData();
    fd.append("file", fileInput);
    fd.append("file_name", autoFileName);
    fd.append("file_type", form.fileType);
    if (form.projectName) fd.append("project_name", form.projectName);
    if (form.sigNumber) fd.append("sig_number", form.sigNumber);
    if (form.dataType) fd.append("data_type", form.dataType);
    if (form.section) fd.append("section", form.section);
    if (form.category) fd.append("category", form.category);
    if (form.season) fd.append("season", form.season);
    if (form.block) fd.append("block", form.block);
    if (form.mlBlock) fd.append("ml_block", form.mlBlock);
    if (form.location) fd.append("location", form.location);
    if (form.classification) fd.append("classification", form.classification);
    if (form.contractorName) fd.append("contractor_name", form.contractorName);
    fd.append("file_size", `${(fileInput.size / 1024 / 1024).toFixed(2)} MB`);
    setLoading(true);
    try { await api.uploadFile(fd); onToast("File uploaded successfully! Pending approval.", "success"); setForm(empty); setFileInput(null); setAutoFileName(""); if (fileRef.current) fileRef.current.value = ""; } catch(e) { onToast(e.message || "Upload failed", "error"); } finally { setLoading(false); }
  };
  return (
    <div>
      <div style={S.sectionTitle}>⬆️ File Meta Registration Form</div>
      <div style={S.card}>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16 }}>
          <div style={S.formGroup}><label style={S.label}>Upload File *</label><input ref={fileRef} style={S.input} type="file" onChange={e=>setFileInput(e.target.files[0]||null)} /><div style={{ fontSize:11, color:"#999", marginTop:4 }}>Prescribed File Size: Max 1 GB</div></div>
          <div style={S.formGroup}><label style={S.label}>File Type *</label><select style={S.select} value={form.fileType} onChange={e=>set("fileType",e.target.value)}><option value="">Select File Type</option>{fileTypes.map(t=><option key={t}>{t}</option>)}</select></div>
          <div style={S.formGroup}><label style={S.label}>Project Name *</label><select style={S.select} value={form.projectName} onChange={e=>set("projectName",e.target.value)}><option value="">Select Project Name</option>{projectNames.map(n=><option key={n}>{n}</option>)}</select></div>
          <div style={S.formGroup}><label style={S.label}>SIG Number</label><input style={S.input} placeholder="e.g. SIG-532" value={form.sigNumber} onChange={e=>set("sigNumber",e.target.value)} /></div>
          <div style={S.formGroup}><label style={S.label}>Data Type *</label><select style={S.select} value={form.dataType} onChange={e=>set("dataType",e.target.value)}><option value="">Select Data Type</option>{dataTypes.map(t=><option key={t}>{t}</option>)}</select></div>
          <div style={S.formGroup}><label style={S.label}>Section Name *</label><select style={S.select} value={form.section} onChange={e=>set("section",e.target.value)}><option value="">Select Section</option>{sections.map(s=><option key={s}>{s}</option>)}</select></div>
          <div style={S.formGroup}><label style={S.label}>Contractor Name</label><input style={S.input} placeholder="e.g. XYZ Contractors" value={form.contractorName} onChange={e=>set("contractorName",e.target.value)} /></div>
          <div style={S.formGroup}><label style={S.label}>Area Name / Location</label><input style={S.input} placeholder="e.g. Jambusar" value={form.location} onChange={e=>set("location",e.target.value)} /></div>
          <div style={{ ...S.formGroup, gridColumn:"1/-1" }}><label style={S.label}>Category *</label><select style={S.select} value={form.category} onChange={e=>set("category",e.target.value)}><option value="">Select Category</option>{categories.map(c=><option key={c}>{c}</option>)}</select></div>
          <div style={S.formGroup}><label style={S.label}>Relevant Year / Field Season *</label><select style={S.select} value={form.season} onChange={e=>set("season",e.target.value)}><option value="">Select Field Season</option>{seasons.map(s=><option key={s}>{s}</option>)}</select></div>
          <div style={S.formGroup}><label style={S.label}>Block Name (Tectonic Block) *</label><select style={S.select} value={form.block} onChange={e=>set("block",e.target.value)}><option value="">Select Tectonic Block</option>{blocks.map(b=><option key={b}>{b}</option>)}</select></div>
          <div style={S.formGroup}><label style={S.label}>ML / PML / OLAP Block</label><input style={S.input} placeholder="e.g. CB-ONHP-2022/2" value={form.mlBlock} onChange={e=>set("mlBlock",e.target.value)} /></div>
          <div style={{ ...S.formGroup, gridColumn:"1/-1" }}><label style={S.label}>Data Classification *</label>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:8 }}>
              {classifications.map(c=>(
                <label key={c} style={{ display:"flex", alignItems:"center", gap:8, padding:"10px 12px", border:`2px solid ${form.classification===c?classColor[c]:"#e0e0e0"}`, borderRadius:6, cursor:"pointer", background: form.classification===c?classColor[c]+"15":"#fff" }}>
                  <input type="radio" name="classification" value={c} checked={form.classification===c} onChange={e=>set("classification",e.target.value)} />
                  <span style={{ fontSize:12, fontWeight:600, color:classColor[c] }}>{c}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
        {autoFileName && (
          <div style={{ marginTop:12, padding:"8px 12px", background:"#f0f7ff", borderRadius:4, border:"1px solid #bbdefb", fontSize:12, color:"#0b3d91" }}>
            <strong>Auto-generated filename:</strong> {autoFileName}
          </div>
        )}
        <div style={{ marginTop:20, paddingTop:16, borderTop:"1px solid #f0f4f8", display:"flex", gap:12 }}>
          <button style={{ ...S.btn(), padding:"10px 32px", fontSize:14 }} onClick={handleSubmit} disabled={loading}>{loading ? "Uploading…" : "Submit for Approval"}</button>
          <button style={{ ...S.btn("secondary"), padding:"10px 24px", fontSize:14 }} onClick={()=>{setForm(empty);setFileInput(null);if(fileRef.current)fileRef.current.value="";setAutoFileName("");}}>Reset</button>
        </div>
      </div>
    </div>
  );
}

function FileRecords({ user, statusFilter, onToast, onRefresh }) {
  const [search, setSearch] = useState(""); const [filters, setFilters] = useState({}); const [files, setFiles] = useState([]); const [loading, setLoading] = useState(true); const [selected, setSelected] = useState(null);
  const [approveClass, setApproveClass] = useState({});
  const [sections, setSections] = useState(SECTIONS);
  const [fileTypes, setFileTypes] = useState(FILE_TYPES);
  const [dataTypes, setDataTypes] = useState(DATA_TYPES);
  const [seasons, setSeasons] = useState(SEASONS);
  const [blocks, setBlocks] = useState(BLOCKS);
  const [classificationsFR, setClassificationsFR] = useState(CLASSIFICATIONS);
  const setF = (k,v) => setFilters(f=>({...f,[k]:v||undefined}));
  useEffect(() => {
    api.getLookups("section").then(d => setSections(d.map(x=>x.value))).catch(() => {});
    api.getLookups("file_type").then(d => setFileTypes(d.map(x=>x.value))).catch(() => {});
    api.getLookups("data_type").then(d => setDataTypes(d.map(x=>x.value))).catch(() => {});
    api.getLookups("season").then(d => setSeasons(d.map(x=>x.value))).catch(() => {});
    api.getLookups("block").then(d => setBlocks(d.map(x=>x.value))).catch(() => {});
    api.getLookups("classification").then(d => setClassificationsFR(d.map(x=>x.value))).catch(() => {});
  }, []);
  const fetchFiles = useCallback(async () => {
    setLoading(true);
    try {
      const params = { search: search||undefined, ...(statusFilter?{status:statusFilter}:{}), ...filters };
      Object.keys(params).forEach(k => params[k] === undefined && delete params[k]);
      const data = await api.searchFiles(params);
      setFiles((data || []).map(normalizeFile));
    } catch { setFiles([]); } finally { setLoading(false); }
  }, [search, filters, statusFilter]);
  /* eslint-disable-next-line react-hooks/set-state-in-effect */
  useEffect(() => { fetchFiles(); }, [fetchFiles]);
  const [rejectModal, setRejectModal] = useState(null);
  const [rejectReason, setRejectReason] = useState("");
  const openPdf = (f, e) => {
    if (e) e.stopPropagation();
    const token = getToken();
    const isPdf = f.fileType === "PDF" || (f.fileName || "").toLowerCase().endsWith(".pdf");
    const canDownload = f.status === "Approved" && !["Confidential","Highly Confidential / Restricted"].includes(f.classification);
    if (isPdf && search) {
      window.open(`/api/files/pdfviewer/${f.id}?token=${token}&search=${encodeURIComponent(search)}`, "_blank");
    } else if (isPdf) {
      window.open(`/api/files/view/${f.id}?token=${token}`, "_blank");
    } else if (canDownload) {
      window.open(`/api/files/download/${f.id}?token=${token}`, "_blank");
    } else {
      window.open(`/api/files/view/${f.id}?token=${token}`, "_blank");
    }
  };
  const handleApprove = async (f) => {
    const cls = approveClass[f.id];
    try { await api.approveFile(f.id, cls); onToast(`File "${f.fileName}" approved${cls ? " as "+cls : ""}.`, "success"); fetchFiles(); onRefresh(); }
    catch(e) { onToast(e.message || "Approve failed", "error"); }
  };
  const handleReject = async () => {
    if (!rejectModal) return;
    if (!rejectReason.trim()) return onToast("Please enter a rejection reason.", "error");
    try { await api.rejectFile(rejectModal.id, rejectReason.trim()); onToast(`File "${rejectModal.fileName}" rejected.`, "error"); setRejectModal(null); setRejectReason(""); fetchFiles(); onRefresh(); }
    catch(e) { onToast(e.message || "Reject failed", "error"); }
  };
  const canApprove = ["admin","ops_manager"].includes(user.role);
  return (
    <div>
      <div style={S.sectionTitle}>{statusFilter ? statusFilter+" Files" : "File Records"}<span style={{ fontSize:14, background:"#0b3d91", color:"#fff", borderRadius:12, padding:"2px 10px" }}>{files.length}</span></div>
      <div style={S.card}>
        <div style={{ display:"grid", gridTemplateColumns:"2fr 1fr 1fr 1fr 1fr 1fr", gap:12, alignItems:"end" }}>
          <div><label style={S.label}>Search</label><input style={S.input} placeholder="File name, project, SIG, category, location, PDF content..." value={search} onChange={e=>setSearch(e.target.value)} /></div>
          <div><label style={S.label}>Season</label><select style={S.select} onChange={e=>setF("season",e.target.value)}><option value="">All</option>{seasons.slice(0,10).map(s=><option key={s}>{s}</option>)}</select></div>
          <div><label style={S.label}>Section</label><select style={S.select} onChange={e=>setF("section",e.target.value)}><option value="">All</option>{sections.map(s=><option key={s}>{s}</option>)}</select></div>
          <div><label style={S.label}>File Type</label><select style={S.select} onChange={e=>setF("file_type",e.target.value)}><option value="">All</option>{fileTypes.map(t=><option key={t}>{t}</option>)}</select></div>
          <div><label style={S.label}>Data Type</label><select style={S.select} onChange={e=>setF("data_type",e.target.value)}><option value="">All</option>{dataTypes.map(t=><option key={t}>{t}</option>)}</select></div>
          <div><label style={S.label}>Block</label><select style={S.select} onChange={e=>setF("block",e.target.value)}><option value="">All</option>{blocks.map(b=><option key={b}>{b}</option>)}</select></div>
        </div>
      </div>
      {!statusFilter && (
        <div style={{ ...S.card, marginBottom:4 }}>
          <div style={{ display:"flex", gap:8, alignItems:"center" }}>
            <label style={{ ...S.label, marginBottom:0, marginRight:8 }}>Classification:</label>
            {["", ...classificationsFR].map(c=>(
              <button key={c} style={{ padding:"4px 12px", borderRadius:12, border:`1px solid ${c?classColor[c]:"#ccc"}`, background: (filters.classification===c&&c)?classColor[c]+"22":"transparent", color:c?classColor[c]:"#5a6a7a", cursor:"pointer", fontSize:12, fontWeight:600 }}
                onClick={()=>setF("classification",c)}>{c||"All"}</button>
            ))}
          </div>
        </div>
      )}
      <div style={{ ...S.card, overflowX:"auto" }}>
        {loading ? <Spinner /> : files.length === 0 ? <div style={{ textAlign:"center", padding:40, color:"#aaa" }}>No files found matching your criteria.</div> : (
            <table style={S.table}>
              <thead><tr>{["File Name","Type","Upload Date","Project","SIG No.","Data Type","Section","Category","Season","Block","Location","Classification","Status",canApprove?"Actions":"Download"].map(h=><th key={h} style={S.th}>{h}</th>)}</tr></thead>
              <tbody>{files.map(f=>(
                <tr key={f.id} style={{ cursor:"pointer" }} onClick={()=>setSelected(f===selected?null:f)}>
                  <td style={S.td}><span style={{ color:"#0b3d91", fontWeight:600, cursor:"pointer", textDecoration:"underline", textDecorationColor:"#90caf9" }} onClick={e=>openPdf(f,e)}>{f.fileName}</span><br/><span style={{ fontSize:12, color:"#999" }}>{f.fileSize}</span>{f.snippet && (() => { const isExact = !f.snippet.startsWith("["); const text = f.snippet.replace(/^\[(semantic|vector)\]\s*/,""); return <div style={{ fontSize:11, color:"#333", marginTop:4, padding:"4px 6px", background:"#fafafa", borderRadius:4, borderLeft:"3px solid #ccc", lineHeight:1.4 }}><span style={{ fontSize:10, fontWeight:700, padding:"1px 5px", borderRadius:3, marginRight:6, background:isExact?"#e3f2fd":"#e8f5e9", color:isExact?"#1565c0":"#2e7d32" }}>{isExact?"Exact":"Related"}</span>{text}</div>; })()}</td>
                  <td style={S.td}><span style={{ background:"#E3F2FD", color:"#1565c0", padding:"2px 8px", borderRadius:4, fontSize:13, fontWeight:700 }}>{f.fileType}</span></td>
                  <td style={S.td}>{f.uploadDate}</td><td style={S.td}>{f.projectName}</td><td style={S.td}>{f.sigNumber||"N/A"}</td>
                  <td style={S.td}>{f.dataType}</td><td style={S.td}>{f.section}</td><td style={S.td}>{f.category}</td>
                  <td style={S.td}>{f.season}</td><td style={S.td}>{f.block}</td><td style={S.td}>{f.location}</td>
                  <td style={S.td}><span style={{ ...S.badge(classColor[f.classification]||"#333"), border:`1px solid ${classColor[f.classification]||"#ccc"}`, fontSize:12 }}>{f.classification}</span></td>
                  <td style={S.td}><span style={{ ...S.badge(statusColor[f.status], statusBg[f.status]) }}>{f.status}</span></td>
                  <td style={S.td}>{canApprove && f.status==="Pending" ? (
                    <div style={{ display:"flex", gap:4, alignItems:"center" }} onClick={e=>e.stopPropagation()}>
                      {["admin","ops_manager"].includes(user.role) && (
                        <select style={{ fontSize:15, padding:"2px 4px", border:"1px solid #ccc", borderRadius:3, maxWidth:100 }}
                          value={approveClass[f.id] || ""}
                          onChange={e=>setApproveClass(p=>({...p,[f.id]:e.target.value}))}>
                          <option value="">Keep as-is</option>
                          {classificationsFR.map(c=><option key={c} value={c}>{c}</option>)}
                        </select>
                      )}
                      <button style={S.btnSm("success")} onClick={()=>handleApprove(f)}>Approve</button>
                      <button style={S.btnSm("danger")} onClick={()=>{setRejectModal(f); setRejectReason("");}}>Reject</button>
                    </div>
                  ) : <ActionButtonForFile f={f} searchTerm={search} />}</td>
                </tr>
              ))}</tbody>
            </table>
        )}
      </div>
      {selected && (
        <div style={{ ...S.card, border:"2px solid #0b3d91" }}>
          <div style={{ fontSize:16, fontWeight:700, color:"#0b3d91", marginBottom:12, paddingBottom:8, borderBottom:"1px solid #f0f0f0" }}>File Details: {selected.fileName}</div>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:12 }}>
            {[["File Type",selected.fileType],["Project",selected.projectName],["SIG Number",selected.sigNumber||"N/A"],["Data Type",selected.dataType],["Section",selected.section],["Category",selected.category],["Field Season",selected.season],["Block",selected.block],["ML/PML/OLAP",selected.mlBlock||"N/A"],["Location",selected.location],["Classification",selected.classification],["Status",selected.status],["Uploaded By",selected.uploadedByName],["Upload Date",selected.uploadDate],["File Size",selected.fileSize]].map(([k,v])=>(
              <div key={k} style={{ background:"#f8f9fa", borderRadius:6, padding:"8px 12px" }}>
                <div style={{ fontSize:11, color:"#6c757d", fontWeight:600 }}>{k}</div>
                <div style={{ fontSize:13, fontWeight:600, color:"#1a1a2e" }}>{v}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {rejectModal && (
        <div style={{ position:"fixed", top:0, left:0, width:"100vw", height:"100vh", background:"rgba(0,0,0,0.5)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:9999 }} onClick={()=>setRejectModal(null)}>
          <div style={{ background:"#fff", borderRadius:10, padding:24, width:420, maxWidth:"90vw", boxShadow:"0 8px 32px rgba(0,0,0,0.3)" }} onClick={e=>e.stopPropagation()}>
            <div style={{ fontSize:16, fontWeight:700, color:"#B71C1C", marginBottom:12 }}>Reject File</div>
            <div style={{ fontSize:13, color:"#5a6a7a", marginBottom:8 }}>File: <strong>{rejectModal.fileName}</strong></div>
            <label style={S.label}>Reason for rejection *</label>
            <textarea style={{ ...S.input, minHeight:80, resize:"vertical" }} value={rejectReason} onChange={e=>setRejectReason(e.target.value)} placeholder="Enter the reason why this file is being rejected..." autoFocus />
            <div style={{ display:"flex", gap:8, justifyContent:"flex-end" }}>
              <button style={S.btn("secondary")} onClick={()=>setRejectModal(null)}>Cancel</button>
              <button style={S.btn("danger")} onClick={handleReject}>Confirm Reject</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Reports({ section, subsection, user }) {
  const [stats, setStats] = useState(null);
  const [files, setFiles] = useState([]);
  const [targets, setTargets] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    Promise.all([api.getStats(), api.listFiles(), api.listTargets()])
      .then(([s, f, t]) => { setStats(s); setFiles((f||[]).map(normalizeFile)); setTargets(t||[]); })
      .catch(()=>{ setStats({ total:0, pending:0, approved:0, rejected:0, bySection:{}, byClassification:{}, byType:{} }); setFiles([]); setTargets([]); })
      .finally(()=>setLoading(false));
  }, []);
  if (loading) return <Spinner />;

  const titles = { Overview:"Reports & Analytics", "File Distribution":"File Distribution Report", Performance:"Performance Report" };
  const subs = { "By Section":"By Section", "By Classification":"By Classification", "By Type":"By Type", "By Block":"By Tectonic Block", "Goal vs Accomplishment":"Goal vs Accomplishment", "Activity Analytics":"Activity Analytics" };

  const renderOverview = () => (
    <div>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:8, marginBottom:16 }}>
        {[["Total Files",stats.total,"#0b3d91"],["Approved",stats.approved,"#1B5E20"],["Pending",stats.pending,"#E65100"],["Rejected",stats.rejected,"#B71C1C"]].map(([l,v,c])=>(
          <div key={l} style={{ background:"#fff", borderRadius:8, padding:"12px 16px", textAlign:"center", boxShadow:"0 1px 4px rgba(0,0,0,0.08)" }}>
            <div style={{ fontSize:24, fontWeight:800, color:c }}>{v}</div>
            <div style={{ fontSize:11, color:"#6c757d", fontWeight:600, textTransform:"uppercase", marginTop:2 }}>{l}</div>
          </div>
        ))}
      </div>
      {targets.length > 0 && (
        <div style={{ background:"#fff", borderRadius:8, boxShadow:"0 1px 4px rgba(0,0,0,0.08)", padding:16, marginBottom:16 }}>
          <div style={{ fontSize:14, fontWeight:700, color:"#0b3d91", marginBottom:14 }}>Goal vs Accomplishment</div>
          <div style={{display:"flex",gap:20,flexWrap:"wrap"}}>
            {targets.map(t => {
              const maxVal = Math.max(Number(t.target_value) || 1, Number(t.achieved) || 1);
              const goalH = (Number(t.target_value) / maxVal) * 100;
              const achH = (Number(t.achieved) / maxVal) * 100;
              return (
                <div key={t.id} style={{ textAlign:"center" }}>
                  <div style={{ fontSize:11, fontWeight:600, color:"#333", marginBottom:4 }}>{t.title}</div>
                  {t.section && <div style={{ fontSize:10, color:"#888" }}>{t.section}</div>}
                  <svg width={70} height={120} viewBox="0 0 70 120">
                    <text x={15} y={115} textAnchor="middle" fontSize={8} fill="#c62828">Goal</text>
                    <text x={55} y={115} textAnchor="middle" fontSize={8} fill="#1B5E20">Done</text>
                    <rect x={5} y={110-goalH} width={20} height={goalH} fill="#c62828" rx={3}/>
                    <rect x={45} y={110-achH} width={20} height={achH} fill="#1B5E20" rx={3}/>
                    <text x={15} y={110-goalH-3} textAnchor="middle" fontSize={8} fontWeight={700} fill="#c62828">{t.target_value}</text>
                    <text x={55} y={110-achH-3} textAnchor="middle" fontSize={8} fontWeight={700} fill="#1B5E20">{t.achieved}</text>
                  </svg>
                </div>
              );
            })}
          </div>
        </div>
      )}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(2,1fr)", gap:12, marginBottom:16 }}>
        <div style={{ background:"#fff", borderRadius:8, boxShadow:"0 1px 4px rgba(0,0,0,0.08)", padding:16 }}>
          <div style={{ fontSize:14, fontWeight:700, color:"#0b3d91", marginBottom:8 }}>Files by Section</div>
          <PieChart data={stats.bySection || {}} />
        </div>
        <div style={{ background:"#fff", borderRadius:8, boxShadow:"0 1px 4px rgba(0,0,0,0.08)", padding:16 }}>
          <div style={{ fontSize:14, fontWeight:700, color:"#0b3d91", marginBottom:8 }}>Classification Breakdown</div>
          <PieChart data={stats.byClassification || {}} />
        </div>
        <div style={{ background:"#fff", borderRadius:8, boxShadow:"0 1px 4px rgba(0,0,0,0.08)", padding:16 }}>
          <div style={{ fontSize:14, fontWeight:700, color:"#0b3d91", marginBottom:8 }}>Files by Type</div>
          <PieChart data={stats.byType || {}} />
        </div>
        <div style={{ background:"#fff", borderRadius:8, boxShadow:"0 1px 4px rgba(0,0,0,0.08)", padding:16 }}>
          <div style={{ fontSize:14, fontWeight:700, color:"#0b3d91", marginBottom:8 }}>Files by Data Type</div>
          <PieChart data={files.reduce((a,f)=>{a[f.dataType]=(a[f.dataType]||0)+1;return a;},{})} />
        </div>
      </div>
      <div style={{ background:"#fff", borderRadius:8, boxShadow:"0 1px 4px rgba(0,0,0,0.08)", padding:16, marginBottom:16 }}>
        <div style={{ fontSize:14, fontWeight:700, color:"#0b3d91", marginBottom:8 }}>Files by Tectonic Block</div>
        <PieChart data={files.reduce((a,f)=>{a[f.block]=(a[f.block]||0)+1;return a;},{})} />
      </div>
    </div>
  );

  const renderFileDist = () => (
    <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
      {(!subsection || subsection === "By Section") && <div style={{ background:"#fff", borderRadius:8, boxShadow:"0 1px 4px rgba(0,0,0,0.08)", padding:16, gridColumn:"1/-1" }}><div style={{ fontSize:14, fontWeight:700, color:"#0b3d91", marginBottom:8 }}>Files by Section</div><PieChart data={stats.bySection || {}} /></div>}
      {(!subsection || subsection === "By Classification") && <div style={{ background:"#fff", borderRadius:8, boxShadow:"0 1px 4px rgba(0,0,0,0.08)", padding:16, gridColumn:"1/-1" }}><div style={{ fontSize:14, fontWeight:700, color:"#0b3d91", marginBottom:8 }}>Classification Breakdown</div><PieChart data={stats.byClassification || {}} /></div>}
      {(!subsection || subsection === "By Type") && <div style={{ background:"#fff", borderRadius:8, boxShadow:"0 1px 4px rgba(0,0,0,0.08)", padding:16, gridColumn:"1/-1" }}><div style={{ fontSize:14, fontWeight:700, color:"#0b3d91", marginBottom:8 }}>Files by Type</div><PieChart data={stats.byType || {}} /></div>}
      {(!subsection || subsection === "By Block") && <div style={{ background:"#fff", borderRadius:8, boxShadow:"0 1px 4px rgba(0,0,0,0.08)", padding:16, gridColumn:"1/-1" }}><div style={{ fontSize:14, fontWeight:700, color:"#0b3d91", marginBottom:8 }}>Files by Tectonic Block</div><PieChart data={files.reduce((a,f)=>{a[f.block]=(a[f.block]||0)+1;return a;},{})} /></div>}
    </div>
  );

  const renderPerf = () => (
    <div>
      {(!subsection || subsection === "Goal vs Accomplishment") && targets.length > 0 && (
        <div style={{ background:"#fff", borderRadius:8, boxShadow:"0 1px 4px rgba(0,0,0,0.08)", padding:16, marginBottom:16 }}>
          <div style={{ fontSize:14, fontWeight:700, color:"#0b3d91", marginBottom:14 }}>Goal vs Accomplishment</div>
          <div style={{display:"flex",gap:20,flexWrap:"wrap"}}>
            {targets.map(t => {
              const maxVal = Math.max(Number(t.target_value) || 1, Number(t.achieved) || 1);
              const gH = (Number(t.target_value) / maxVal) * 100;
              const aH = (Number(t.achieved) / maxVal) * 100;
              return (
                <div key={t.id} style={{textAlign:"center"}}>
                  <div style={{fontSize:11,fontWeight:600,color:"#333",marginBottom:4}}>{t.title}</div>
                  {t.section && <div style={{fontSize:10,color:"#888"}}>{t.section}</div>}
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
      {(!subsection || subsection === "Goal vs Accomplishment") && targets.length === 0 && <div style={{textAlign:"center",padding:40,color:"#999",fontSize:14}}>No performance targets defined yet.</div>}
      {(!subsection || subsection === "Activity Analytics") && <ActivityAnalytics user={user} />}
    </div>
  );

  if (!section || section === "Overview") return renderOverview();
  const label = subs[section] || section;
  return (
    <div>
      <div style={{ fontSize:18, fontWeight:700, color:"#0b3d91", marginBottom:16, borderBottom:"2px solid #e8edf2", paddingBottom:8 }}>{label}</div>
      {section === "File Distribution" && renderFileDist()}
      {section === "Performance" && renderPerf()}
    </div>
  );
}

function ConfirmDialog({ message, onConfirm, onCancel, loading }) {
  const [pwd, setPwd] = useState("");
  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.5)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:9999 }} onClick={onCancel}>
      <div style={{ background:"#fff", borderRadius:12, padding:24, width:380, boxShadow:"0 8px 32px rgba(0,0,0,0.3)" }} onClick={e=>e.stopPropagation()}>
        <div style={{ fontSize:16, fontWeight:700, color:"#B71C1C", marginBottom:4 }}>Confirm Access Grant</div>
        <div style={{ fontSize:13, color:"#5a6a7a", marginBottom:16, lineHeight:1.5 }}>{message}</div>
        <div style={S.formGroup}>
          <label style={S.label}>Enter Admin Password to confirm</label>
          <input style={S.input} type="password" placeholder="Your password" value={pwd} onChange={e=>setPwd(e.target.value)} onKeyDown={e=>e.key==="Enter"&&!loading&&onConfirm(pwd)} />
        </div>
        <div style={{ display:"flex", gap:8, justifyContent:"flex-end" }}>
          <button style={S.btn("secondary")} onClick={onCancel} disabled={loading}>Cancel</button>
          <button style={{ ...S.btn("danger") }} onClick={()=>onConfirm(pwd)} disabled={loading || !pwd}>{loading ? "Confirming…" : "Confirm Grant"}</button>
        </div>
      </div>
    </div>
  );
}

function AccessPermissions({ onToast }) {
  const [allUsers, setAllUsers] = useState([]);
  const [permUsers, setPermUsers] = useState([]);
  const [permissions, setPermissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [confirm, setConfirm] = useState(null);
  const [search, setSearch] = useState("");
  const [classifs, setClassifs] = useState(CLASSIFICATIONS);

  const loadData = () => {
    setLoading(true);
    Promise.all([api.listUsers(), api.listPermissions()]).then(([u, p]) => {
      setAllUsers(u||[]);
      setPermUsers((u||[]).filter(x => x.role !== "admin"));
      setPermissions(p || []);
    }).catch(() => {}).finally(() => setLoading(false));
  };
  /* eslint-disable-next-line react-hooks/set-state-in-effect */
  useEffect(() => { loadData(); api.getLookups("classification").then(d => setClassifs(d.map(x=>x.value))).catch(() => {}); }, []);

  const hasPermission = (userId, classification) => {
    return permissions.some(p => p.user_id === userId && p.classification === classification && !p.is_expired);
  };

  const handleToggle = (userId, classification, currentlyGranted) => {
    setConfirm({ userId, classification, grant: !currentlyGranted });
  };

  const handleConfirm = async (adminPassword) => {
    if (!confirm) return;
    setLoading(true);
    try {
      await api.togglePermission(confirm.userId, confirm.classification, confirm.grant, adminPassword);
      onToast(`Access ${confirm.grant ? "granted" : "revoked"} successfully`, "success");
      setConfirm(null);
      loadData();
    } catch(e) {
      onToast(e.message || "Failed to update permission", "error");
      setLoading(false);
    }
  };

  return (
    <div>
      <div style={S.sectionTitle}>User-Level Classification Access Control</div>
      <div style={{ ...S.card, marginBottom:4 }}>
        <div style={{ fontSize:14, fontWeight:700, color:"#0b3d91", marginBottom:8 }}>Hierarchical Access Control Rules</div>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:12 }}>
          {[["Level-0","All ONGC Users","General data only (read-only)","#1565c0"],["Level-IV","Data Creator/Editor","Upload, edit own data","#1B5E20"],["Level-III","Operations Manager","Level III + IV access","#E65100"],["Level-II","Head Geophysical Services","Full access to all levels","#B71C1C"]].map(([lv,role,desc,c])=>(
            <div key={lv} style={{ background:c+"15", border:`1px solid ${c}`, borderRadius:8, padding:14 }}>
              <div style={{ fontWeight:800, color:c, fontSize:14 }}>{lv}</div>
              <div style={{ fontWeight:700, color:"#1a1a2e", fontSize:13, margin:"4px 0" }}>{role}</div>
              <div style={{ fontSize:12, color:"#5a6a7a" }}>{desc}</div>
            </div>
          ))}
        </div>
      </div>
      <div style={{display:"flex",gap:12,marginBottom:12,alignItems:"center"}}>
        <input style={{...S.input,margin:0,maxWidth:320}} placeholder="Search users by name, CPF, role..." value={search} onChange={e=>setSearch(e.target.value)} />
        <span style={{fontSize:12,color:"#888"}}>{permUsers.length} users</span>
      </div>
      <div style={S.card}>
        <div style={{ fontSize:14, fontWeight:700, color:"#0b3d91", marginBottom:8 }}>
          Grant per-User Classification Access
          <span style={{ fontSize:12, fontWeight:400, color:"#5a6a7a", marginLeft:12 }}>Click a checkbox to toggle access. Admin password required to confirm.</span>
        </div>
        {loading && permUsers.length === 0 ? <Spinner /> : (
          <div style={{ overflowX:"auto" }}>
            <table style={S.table}>
              <thead>
                <tr>
                  <th style={S.th}>User</th>
                  <th style={S.th}>Current Role</th>
                  {classifs.map(c => <th key={c} style={{ ...S.th, background:classColor[c], textAlign:"center" }}>{c}</th>)}
                </tr>
              </thead>
              <tbody>
                {permUsers.filter(u => {
                  const q = search.toLowerCase();
                  if (!q) return true;
                  return (u.name||"").toLowerCase().includes(q) || (u.cpf||"").toLowerCase().includes(q) || (u.role||"").toLowerCase().includes(q);
                }).map(u => (
                  <tr key={u.id}>
                    <td style={S.td}>
                      <strong>{u.name}</strong><br/>
                      <span style={{ fontSize:11, color:"#999" }}>{u.cpf}</span>
                    </td>
                    <td style={S.td}>
                      <span style={{ ...S.badge("#0b3d91","#E3F2FD") }}>{ROLE_LABELS[u.role] || u.role}</span>
                    </td>
                    {classifs.map(c => {
                      const granted = hasPermission(u.id, c);
                      return (
                        <td key={c} style={{ ...S.td, textAlign:"center", cursor:"pointer" }}
                          onClick={() => handleToggle(u.id, c, granted)}>
                          <span style={{ fontSize:22, color: granted ? classColor[c] : "#ccc", transition:"color 0.2s" }}
                            onMouseEnter={e => { if (!granted) e.target.style.color = "#0b3d91"; }}
                            onMouseLeave={e => { if (!granted) e.target.style.color = "#ccc"; }}>
                            {granted ? "ON" : ""}
                          </span>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <div style={{ ...S.card, marginTop:4 }}>
        <div style={{ fontSize:14, fontWeight:700, color:"#0b3d91", marginBottom:8 }}>Current Permission Grants</div>
        {permissions.length === 0 ? <div style={{ color:"#aaa", textAlign:"center", padding:16, fontSize:13 }}>No permissions granted yet.</div> : (
          <table style={{ ...S.table, fontSize:12 }}>
            <thead><tr>{["User","Classification","Granted By","Granted At","Expires At","Status"].map(h=><th key={h} style={S.th}>{h}</th>)}</tr></thead>
            <tbody>{permissions.map(p => {
              const u = allUsers.find(x => x.id === p.user_id);
              const g = allUsers.find(x => x.id === p.granted_by);
              return (
                <tr key={p.id}>
                  <td style={S.td}>{u?.name || p.user_id}</td>
                  <td style={S.td}><span style={{ ...S.badge(classColor[p.classification]||"#333","#fff"), border:`1px solid ${classColor[p.classification]||"#ccc"}`, fontSize:10 }}>{p.classification}</span></td>
                  <td style={S.td}>{g?.name || p.granted_by}</td>
                  <td style={S.td}>{p.granted_at ? new Date(p.granted_at).toLocaleString() : "—"}</td>
                  <td style={S.td}>{p.expires_at ? new Date(p.expires_at).toLocaleString() : "—"}</td>
                  <td style={S.td}>{p.is_expired ? <span style={{ ...S.badge("#B71C1C","#FFEBEE") }}>Expired</span> : <span style={{ ...S.badge("#1B5E20","#E8F5E9") }}>Active</span>}</td>
                </tr>
              );
            })}</tbody>
          </table>
        )}
      </div>
      {confirm && (
        <ConfirmDialog
          message={`Are you sure you want to ${confirm.grant ? "grant" : "revoke"} access to "${confirm.classification}" files for ${permUsers.find(u => u.id === confirm.userId)?.name || "this user"}?`}
          onConfirm={handleConfirm}
          onCancel={() => setConfirm(null)}
          loading={loading}
        />
      )}
    </div>
  );
}

function UserManagement({ onToast }) {
  const [users, setUsers] = useState([]); const [loading, setLoading] = useState(true);
  const [editingRole, setEditingRole] = useState(null);
  const [editingProfile, setEditingProfile] = useState(null);
  const [profileForm, setProfileForm] = useState({});
  const [areas, setAreas] = useState(GEO_LOCATIONS);
  const [categories, setCategories] = useState([]);
  const [opsManagers, setOpsManagers] = useState([]);
  const [sections, setSections] = useState(SECTIONS);
  const [createForm, setCreateForm] = useState({ cpf:"", password:"", section:"", area:"", role_name:"viewer" });
  const [derivedInfo, setDerivedInfo] = useState(null);
  const [search, setSearch] = useState("");
  const setCF = (k,v) => setCreateForm(f=>({...f,[k]:v}));

  useEffect(() => {
    api.getLookups("user_category").then(d => setCategories(d.map(x=>x.value))).catch(() => {});
  }, []);

  useEffect(() => {
    if (createForm.section) {
      api.deriveFields(createForm.section).then(d => {
        setDerivedInfo(d);
        if (d.location && !createForm.area) {
          setCF("area", d.location);
        }
      }).catch(() => setDerivedInfo(null));
    } else {
      setDerivedInfo(null);
    }
  }, [createForm.section]);

  const loadUsers = () => {
    setLoading(true);
    api.listUsers().then(data => {
      const mapped = (data||[]).map(u => ({ ...u, role: u.role?.name || u.role_name || "viewer" }));
      setUsers(mapped);
      setOpsManagers(mapped.filter(u => u.role === "ops_manager" || u.role === "admin"));
    }).catch(()=>setUsers([])).finally(()=>setLoading(false));
  };
  useEffect(() => { loadUsers(); }, []);

  const handleCreate = async () => {
    try {
      if (!createForm.cpf || !createForm.password) { onToast("CPF and password required","error"); return; }
      const payload = {
        cpf: createForm.cpf,
        password: createForm.password,
        section: createForm.section,
        area: createForm.area,
        role_name: createForm.role_name,
      };
      await api.createUser(payload);
      onToast("User created successfully","success");
      setCreateForm({ cpf:"", password:"", section:"", area:"", role_name:"viewer" });
      setDerivedInfo(null);
      loadUsers();
    } catch(e) { onToast(e.message || "Create failed","error"); }
  };

  const handleRoleChange = async (userId, newRole) => {
    try {
      await api.updateUserRole(userId, newRole);
      onToast("Role updated successfully","success");
      setEditingRole(null);
      loadUsers();
    } catch(e) { onToast(e.message || "Role update failed","error"); }
  };

  const startEditProfile = (u) => {
    setEditingProfile(u.id);
    setProfileForm({ section: u.section||"", area: u.area||"", user_category: u.user_category||"", designation: u.designation||"", ops_manager_id: u.ops_manager_id||"" });
  };

  useEffect(() => {
    if (editingProfile && profileForm.section) {
      api.deriveFields(profileForm.section).then(d => {
        setProfileForm(p => ({
          ...p,
          user_category: d.user_category || p.user_category,
          ops_manager_id: d.ops_manager_id || p.ops_manager_id,
        }));
      }).catch(() => {});
    }
  }, [profileForm.section]);

  const handleProfileSave = async (userId) => {
    try {
      const payload = {};
      for (const k of ["section","area","user_category","designation","ops_manager_id"]) {
        if (profileForm[k] !== "") payload[k] = profileForm[k];
      }
      await api.updateUserProfile(userId, payload);
      onToast("Profile updated successfully","success");
      setEditingProfile(null);
      loadUsers();
    } catch(e) { onToast(e.message || "Update failed","error"); }
  };

  return (
    <div>
      <div style={S.sectionTitle}>User Management</div>
      <div style={{display:"flex",gap:12,marginBottom:12,alignItems:"center"}}>
        <input style={{...S.input,margin:0,maxWidth:320}} placeholder="Search by name, CPF, section, area..." value={search} onChange={e=>setSearch(e.target.value)} />
        <span style={{fontSize:12,color:"#888"}}>{users.length} users</span>
      </div>
      <div style={S.card}>
        {loading ? <Spinner /> : users.length === 0 ? <div style={{ color:"#aaa", textAlign:"center", padding:24 }}>No users found.</div> : (
          <table style={S.table}>
            <thead><tr>{["CPF","Name","Designation","Section","Area","Category","Ops Manager","Level","Role","Actions"].map(h=><th key={h} style={S.th}>{h}</th>)}</tr></thead>
            <tbody>{users.filter(u => {
              const q = search.toLowerCase();
              if (!q) return true;
              return (u.name||"").toLowerCase().includes(q) || (u.cpf||"").toLowerCase().includes(q) || (u.section||"").toLowerCase().includes(q) || (u.area||"").toLowerCase().includes(q) || (u.designation||"").toLowerCase().includes(q) || (u.role||"").toLowerCase().includes(q);
            }).map(u=>(
              <tr key={u.id}>
                <td style={S.td}>{u.cpf}</td>
                <td style={S.td}><strong>{u.name}</strong></td>
                <td style={S.td}>{editingProfile === u.id ? <input style={{ ...S.input, margin:0, width:100, fontSize:14 }} value={profileForm.designation} onChange={e=>setProfileForm(p=>({...p,designation:e.target.value}))} /> : u.designation}</td>
                <td style={S.td}>{editingProfile === u.id ? (
                  <select style={{ ...S.select, margin:0, width:110, fontSize:14 }} value={profileForm.section} onChange={e=>{
                    setProfileForm(p=>({...p,section:e.target.value}));
                    api.deriveFields(e.target.value).then(d => setProfileForm(p=>({...p,user_category: d.user_category||p.user_category, ops_manager_id: d.ops_manager_id||p.ops_manager_id}))).catch(()=>{});
                  }}>
                    <option value="">None</option>{sections.map(s=><option key={s}>{s}</option>)}
                  </select>
                ) : u.section}</td>
                <td style={S.td}>{editingProfile === u.id ? (
                  <select style={{ ...S.select, margin:0, width:120, fontSize:14 }} value={profileForm.area} onChange={e=>setProfileForm(p=>({...p,area:e.target.value}))}>
                    <option value="">None</option>{GEO_LOCATIONS.map(a=><option key={a}>{a}</option>)}
                  </select>
                ) : u.area}</td>
                <td style={S.td}>{editingProfile === u.id ? (
                  <span style={{ fontSize:11, color:"#555" }}>{profileForm.user_category || "— (auto)"}</span>
                ) : u.user_category}</td>
                <td style={S.td}>{editingProfile === u.id ? (
                  <span style={{ fontSize:11, color:"#555" }}>{opsManagers.find(o=>o.id===profileForm.ops_manager_id)?.name || "— (auto)"}</span>
                ) : (u.ops_manager_name || "—")}</td>
                <td style={S.td}>Level-{u.level}</td>
                  <td style={S.td}>
                    {editingRole === u.id ? (
                    <select style={{ ...S.select, width:140, fontSize:14, margin:0 }} value={u.role} onChange={e => handleRoleChange(u.id, e.target.value)}>
                      <option value="admin">admin</option><option value="ops_manager">ops_manager</option><option value="data_creator">data_creator</option><option value="viewer">viewer</option>
                    </select>
                  ) : (
                    <span style={{ ...S.badge(u.role === "admin" ? "#B71C1C" : "#0b3d91", "#E3F2FD"), fontSize:12 }}>{ROLE_LABELS[u.role] || u.role}</span>
                  )}
                </td>
                <td style={S.td}>
                  {editingProfile === u.id ? (
                    <div style={{ display:"flex", gap:4 }}>
                      <button style={S.btnSm("success")} onClick={() => handleProfileSave(u.id)}>Save</button>
                      <button style={S.btnSm("secondary")} onClick={() => setEditingProfile(null)}>Cancel</button>
                    </div>
                  ) : editingRole === u.id ? (
                    <button style={S.btnSm("secondary")} onClick={() => setEditingRole(null)}>Cancel</button>
                  ) : u.role === "admin" ? (
                    <span style={{ fontSize:11, color:"#999" }}>Protected</span>
                  ) : (
                    <div style={{ display:"flex", gap:4 }}>
                      <button style={S.btnSm("primary")} onClick={() => startEditProfile(u)}>Edit Details</button>
                      <button style={S.btnSm("secondary")} onClick={() => setEditingRole(u.id)}>Change Role</button>
                    </div>
                  )}
                </td>
              </tr>
            ))}</tbody>
          </table>
        )}
      </div>
      <div style={{ ...S.card, marginTop:4 }}>
        <div style={{ fontSize:14, fontWeight:700, color:"#0b3d91", marginBottom:4 }}>Create New User (Admin only)</div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:12 }}>
            <input style={S.input} placeholder="CPF" value={createForm.cpf} onChange={e=>setCF('cpf', e.target.value)} />
            <input style={S.input} type="password" placeholder="Password" value={createForm.password} onChange={e=>setCF('password', e.target.value)} />
            <select style={S.select} value={createForm.section} onChange={e=>setCF('section', e.target.value)}>
              <option value="">— Section (Dept) —</option>{sections.map(s=><option key={s}>{s}</option>)}
            </select>
            <select style={S.select} value={createForm.area} onChange={e=>setCF('area', e.target.value)}>
              <option value="">— Location (Area) —</option>{areas.map(a=><option key={a}>{a}</option>)}
            </select>
            <select style={S.select} value={createForm.role_name} onChange={e=>setCF('role_name', e.target.value)}>
              <option value="viewer">viewer</option><option value="data_creator">data_creator</option><option value="ops_manager">ops_manager</option><option value="admin">admin</option>
            </select>
            <div style={{ display:"flex", alignItems:"center", gap:8, fontSize:12, color:"#555", padding:"6px 0" }}>
              {derivedInfo ? (
                <>Category: <strong>{derivedInfo.user_category || "—"}</strong> &nbsp;|&nbsp; Ops Mgr: <strong>{opsManagers.find(o=>o.id===derivedInfo.ops_manager_id)?.name || "—"}</strong></>
              ) : (
                <span style={{ color:"#aaa" }}>Select section to auto-fill details</span>
              )}
            </div>
          </div>
          <div style={{ marginTop:12 }}><button style={S.btn()} onClick={handleCreate}>Create User</button></div>
      </div>
    </div>
  );
}

function Settings({ user }) {
  const [lookups, setLookups] = useState({});
  const [activeTab, setActiveTab] = useState("section");
  const [newValue, setNewValue] = useState("");
  const [pageCatTab, setPageCatTab] = useState("progress-report");
  const [pageCatNew, setPageCatNew] = useState("");
  const [pageCatLookups, setPageCatLookups] = useState({});

  const PAGE_CATEGORIES = [
    ["progress-report","Progress Report"],["manpower-status","Manpower Status"],
    ["contract-status","Contract Status"],["fund-management","Fund Management"],
    ["Operations","Operations"],["Data Processing","Data Processing"],
    ["Regional Electronics Lab","Regional Electronics Lab"],
    ["Reporting / Appraisals","Reporting / Appraisals"],
    ["pending-issues","Pending Issues"],["highlights","Highlights"],
    ["tech-reports","Technical Reports"],["HSE","HSE"],["sharepoint","SharePoint"],
  ];
  const PAGE_CAT_MAP = Object.fromEntries(PAGE_CATEGORIES);
  const pageCatType = (page) => `pagecat_${page.replace(/[^a-z0-9]/gi,"_")}`;

  useEffect(() => {
    const types = ["section","category","season","block","file_type","data_type","classification"];
    types.forEach(t => {
      api.getLookups(t).then(d => setLookups(p => ({...p, [t]: d}))).catch(() => {});
    });
    PAGE_CATEGORIES.forEach(([page]) => {
      api.getLookups(pageCatType(page)).then(d => setPageCatLookups(p => ({...p, [page]: d}))).catch(() => {});
    });
  }, []);

  const handleAdd = async () => {
    if (!newValue.trim()) return;
    try {
      await api.addLookup(activeTab, newValue.trim());
      setNewValue("");
      const d = await api.getLookups(activeTab);
      setLookups(p => ({...p, [activeTab]: d}));
    } catch(e) { alert(e.message); }
  };

  const handleDelete = async (id) => {
    if (!confirm("Delete this option?")) return;
    try {
      await api.deleteLookup(activeTab, id);
      const d = await api.getLookups(activeTab);
      setLookups(p => ({...p, [activeTab]: d}));
    } catch(e) { alert(e.message); }
  };

  const labels = { section:"Sections", category:"Categories", season:"Seasons", block:"Blocks", file_type:"File Types", data_type:"Data Types", classification:"Classifications" };

  const handlePageCatAdd = async () => {
    if (!pageCatNew.trim()) return;
    try {
      await api.addLookup(pageCatType(pageCatTab), pageCatNew.trim());
      setPageCatNew("");
      const d = await api.getLookups(pageCatType(pageCatTab));
      setPageCatLookups(p => ({...p, [pageCatTab]: d}));
    } catch(e) { alert(e.message); }
  };

  const handlePageCatDelete = async (id) => {
    if (!confirm("Delete this category?")) return;
    try {
      await api.deleteLookup(pageCatType(pageCatTab), id);
      const d = await api.getLookups(pageCatType(pageCatTab));
      setPageCatLookups(p => ({...p, [pageCatTab]: d}));
    } catch(e) { alert(e.message); }
  };

  return (
    <div>
      <div style={S.sectionTitle}>Portal Settings</div>
      <div style={S.card}>
        <div style={{ fontSize:14, fontWeight:700, color:"#0b3d91", marginBottom:4 }}>System Configuration</div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
          {[["Portal Name","Data Vision"],["Organization","ONGC — Geophysical Services, WON Basin"],["Location","Vadodara, Gujarat"],["Max File Size","1 GB"],["Backup Frequency","Weekly (Auto)"],["Authentication","Domain CPF Login"],["Version","1.0.0"],["Backend","FastAPI + PostgreSQL"],["API Base","http://localhost:8000"]].map(([k,v])=>(
            <div key={k} style={{ display:"flex", justifyContent:"space-between", padding:"10px 0", borderBottom:"1px solid #f0f4f8" }}>
              <span style={{ fontSize:13, color:"#5a6a7a", fontWeight:600 }}>{k}</span>
              <span style={{ fontSize:13, color:"#1a1a2e" }}>{v}</span>
            </div>
          ))}
        </div>
      </div>

      {user?.role === "admin" && (
        <div style={{ ...S.card, marginTop:4 }}>
          <div style={{ fontSize:14, fontWeight:700, color:"#0b3d91", marginBottom:8 }}>Dropdown Options Manager</div>
          <div style={{ display:"flex", gap:4, marginBottom:8, flexWrap:"wrap" }}>
            {Object.keys(labels).map(t => (
              <button key={t} style={{ padding:"4px 12px", borderRadius:4, border:"none", cursor:"pointer", fontWeight:600, fontSize:12, background: activeTab===t?"#0b3d91":"#e0e0e0", color: activeTab===t?"#fff":"#333" }} onClick={() => setActiveTab(t)}>{labels[t]}</button>
            ))}
          </div>
          <div style={{ display:"flex", gap:8, marginBottom:8 }}>
            <input style={{ ...S.input, marginBottom:0 }} placeholder={`New ${labels[activeTab]?.slice(0,-1) || "value"}...`} value={newValue} onChange={e => setNewValue(e.target.value)} onKeyDown={e => e.key === "Enter" && handleAdd()} />
            <button style={{ ...S.btnSm("primary"), whiteSpace:"nowrap" }} onClick={handleAdd}>Add</button>
          </div>
          <div style={{ maxHeight:250, overflowY:"auto" }}>
            {(lookups[activeTab] || []).map(item => (
              <div key={item.id} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"4px 8px", borderBottom:"1px solid #f0f4f8" }}>
                <span style={{ fontSize:13 }}>{item.value}</span>
                <button style={{ ...S.btnSm("danger"), padding:"2px 8px", fontSize:11 }} onClick={() => handleDelete(item.id)}>X</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {user?.role === "admin" && (
        <div style={{ ...S.card, marginTop:4 }}>
          <div style={{ fontSize:14, fontWeight:700, color:"#0b3d91", marginBottom:8 }}>Page Categories Manager</div>
          <div style={{ fontSize:12, color:"#888", marginBottom:8 }}>Manage per-page category options. Each page/section can have its own category list.</div>
          <div style={{ display:"flex", gap:4, marginBottom:8, flexWrap:"wrap" }}>
            {PAGE_CATEGORIES.map(([page, label]) => (
              <button key={page} style={{ padding:"4px 12px", borderRadius:4, border:"none", cursor:"pointer", fontWeight:600, fontSize:11, background: pageCatTab===page?"#0b3d91":"#e0e0e0", color: pageCatTab===page?"#fff":"#333" }} onClick={() => setPageCatTab(page)}>{label}</button>
            ))}
          </div>
          <div style={{ display:"flex", gap:8, marginBottom:8 }}>
            <input style={{ ...S.input, marginBottom:0 }} placeholder={`New category for ${PAGE_CAT_MAP[pageCatTab] || pageCatTab}...`} value={pageCatNew} onChange={e => setPageCatNew(e.target.value)} onKeyDown={e => e.key === "Enter" && handlePageCatAdd()} />
            <button style={{ ...S.btnSm("primary"), whiteSpace:"nowrap" }} onClick={handlePageCatAdd}>Add</button>
          </div>
          <div style={{ maxHeight:250, overflowY:"auto" }}>
            {(pageCatLookups[pageCatTab] || []).map(item => (
              <div key={item.id} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"4px 8px", borderBottom:"1px solid #f0f4f8" }}>
                <span style={{ fontSize:13 }}>{item.value}</span>
                <button style={{ ...S.btnSm("danger"), padding:"2px 8px", fontSize:11 }} onClick={() => handlePageCatDelete(item.id)}>X</button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function App() {
  const [user, setUser] = useState(() => {
    const stored = sessionStorage.getItem("auth_user");
    return stored ? JSON.parse(stored) : null;
  });
  const [page, setPage] = useState("Dashboard");
  const [toast, setToast] = useState(null);
  const [refresh, setRefresh] = useState(0);
  const [notifCount, setNotifCount] = useState(0);
  const [notifList, setNotifList] = useState([]);
  const [showNotif, setShowNotif] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const PAGE_LABELS = {};
  MENU.forEach(item => {
    if (item.page) PAGE_LABELS[item.page] = item.label;
    if (item.submenu) {
      item.submenu.forEach(child => {
        if (typeof child === "string") {
          PAGE_LABELS[`${item.label}-${child.replace(/\s+/g,"-")}`] = `${item.label} > ${child}`;
        } else {
          PAGE_LABELS[`${item.label}-${child.label}`] = `${item.label} > ${child.label}`;
          child.children.forEach(gc => {
            PAGE_LABELS[`${item.label}-${child.label}-${gc.replace(/\s+/g,"-")}`] = `${item.label} > ${child.label} > ${gc}`;
          });
        }
      });
    }
  });
  const currentPageLabel = PAGE_LABELS[page] || page;

  const fetchNotifs = useCallback(async () => {
    try {
      const ns = await api.listNotifications();
      setNotifList(ns);
      setNotifCount(ns.filter(n => !n.is_read).length);
    } catch {}
  }, []);

  useEffect(() => {
    if (!user) return;
    fetchNotifs();
    const iv = setInterval(fetchNotifs, 15000);
    return () => clearInterval(iv);
  }, [user, fetchNotifs]);

  const showToast = useCallback((msg, type) => setToast({ msg, type }), []);
  const doRefresh = useCallback(() => setRefresh(r=>r+1), []);

  const [expanded, setExpanded] = useState({});
  const toggleExpand = (label) => setExpanded(p => ({...p, [label]: !p[label]}));
  const [nestedExpanded, setNestedExpanded] = useState({});
  const toggleNested = (parent, child) => setNestedExpanded(p => ({...p, [`${parent}-${child}`]: !p[`${parent}-${child}`]}));
  const [subPages, setSubPages] = useState({});
  const setSubPage = (parent, child) => setSubPages(p => ({...p, [parent]: child}));
  const handleNavClick = (item) => {
    if (item.action === "logout") handleLogout();
    else if (item.page) setPage(item.page);
  };
  const handleSubNavClick = (parent, child) => {
    setSubPage(parent, child);
    setPage(`${parent}-${child.replace(/\s+/g,"-")}`);
  };
  const handleNestedNavClick = (parent, child, grandchild) => {
    setSubPage(parent, `${child}-${grandchild}`);
    setPage(`${parent}-${child}-${grandchild.replace(/\s+/g,"-")}`);
  };

  const handleLogin = (u, token) => { setToken(token); setUser(u); sessionStorage.setItem("auth_user", JSON.stringify(u)); setPage("Dashboard"); };
  const handleLogout = () => { setToken(null); setUser(null); sessionStorage.removeItem("auth_user"); sessionStorage.removeItem("auth_token"); setPage("Dashboard"); };

  const renderDashboard = () => user.role === "data_creator" ? <CreatorDashboard key={refresh} user={user} /> : <AnalyticalDashboard key={refresh} user={user} onToast={showToast} />;

  const canAccess = (pageName) => {
    for (const item of MENU) {
      if (!item.roles.includes(user.role)) continue;
      if (item.levels && !item.levels.includes(user.level)) continue;
      if (item.page === pageName) return true;
      if (item.submenu) {
        for (const child of item.submenu) {
          if (typeof child === "string") {
            const key = `${item.label}-${child.replace(/\s+/g,"-")}`;
            if (key === pageName) return true;
          } else if (child.children) {
            for (const gc of child.children) {
              const key = `${item.label}-${child.label}-${gc.replace(/\s+/g,"-")}`;
              if (key === pageName) return true;
            }
          }
        }
      }
    }
    return false;
  };

  const renderPage = () => {
    switch(page) {
      case "Dashboard": return renderDashboard();
      case "file-records": return canAccess("file-records") ? <FileRecords user={user} onToast={showToast} onRefresh={doRefresh} key={refresh} /> : renderDashboard();
      case "my-files": return canAccess("my-files") ? <FileRecords user={user} onToast={showToast} onRefresh={doRefresh} key={refresh} /> : renderDashboard();
      case "pending-approval": return canAccess("pending-approval") ? <FileRecords user={user} statusFilter="Pending" onToast={showToast} onRefresh={doRefresh} key={refresh} /> : renderDashboard();
      case "approved-files": return canAccess("approved-files") ? <FileRecords user={user} statusFilter="Approved" onToast={showToast} onRefresh={doRefresh} key={refresh} /> : renderDashboard();
      case "rejected-files": return canAccess("rejected-files") ? <FileRecords user={user} statusFilter="Rejected" onToast={showToast} onRefresh={doRefresh} key={refresh} /> : renderDashboard();
      case "users": return canAccess("users") ? <UserManagement user={user} onToast={showToast} key={refresh} /> : renderDashboard();
      case "access-permissions": return canAccess("access-permissions") ? <AccessPermissions user={user} onToast={showToast} /> : renderDashboard();
      case "settings": return canAccess("settings") ? <Settings user={user} /> : renderDashboard();
      case "activity-analytics": return <ActivityAnalytics user={user} />;

      // New modules
      case "kpi-awp": return <KPITargetsAWP user={user} onToast={showToast} />;
      case "projects": return <ProjectCreation user={user} onToast={showToast} />;
      case "progress-report": return canAccess("progress-report") ? <ProgressReport user={user} onToast={showToast} /> : renderDashboard();
      case "manpower-status": return canAccess("manpower-status") ? <ManpowerStatus user={user} onToast={showToast} /> : renderDashboard();
      case "contract-status": return canAccess("contract-status") ? <ContractStatus user={user} onToast={showToast} /> : renderDashboard();
      case "fund-management": return canAccess("fund-management") ? <FundManagement user={user} onToast={showToast} /> : renderDashboard();
      case "pending-issues": return canAccess("pending-issues") ? <PendingIssues user={user} onToast={showToast} /> : renderDashboard();
      case "highlights": return canAccess("highlights") ? <Highlights user={user} onToast={showToast} /> : renderDashboard();
      case "tech-reports": return canAccess("tech-reports") ? <TechnicalReports user={user} onToast={showToast} /> : renderDashboard();
      case "sharepoint": return canAccess("sharepoint") ? <SharePointTemp user={user} onToast={showToast} /> : renderDashboard();
      case "awp": return canAccess("awp") ? <AWP user={user} onToast={showToast} /> : renderDashboard();
      case "hse": return canAccess("hse") ? <HSE user={user} onToast={showToast} /> : renderDashboard();
      case "report-builder": return <ReportBuilder user={user} onToast={showToast} />;

      default: {
        for (const item of MENU) {
          if (item.submenu && item.roles.includes(user.role) && (!item.levels || item.levels.includes(user.level))) {
            for (const child of item.submenu) {
              if (typeof child === "string") {
                const key = `${item.label}-${child.replace(/\s+/g,"-")}`;
                if (page === key) {
                  if (item.label === "Operations") return <Operations key={child} initialTab={child} user={user} onToast={showToast} />;
                  if (item.label === "Data Processing (RCC)") return <DataProcessing key={child} initialTab={child} user={user} onToast={showToast} />;
                  if (item.label === "Regional Electronics Lab (REL)") return <RegionalLab key={child} initialTab={child} user={user} onToast={showToast} />;
                  if (item.label === "Reporting / Appraisals") return <ReportingAppraisals key={child} initialTab={child} user={user} onToast={showToast} />;
                  if (item.label === "Reports") return <Reports key={child} section={child} user={user} />;
                }
              } else if (child.children) {
                for (const gc of child.children) {
                  const key = `${item.label}-${child.label}-${gc.replace(/\s+/g,"-")}`;
                  if (page === key) {
                    if (item.label === "Reports") return <Reports key={`${child.label}-${gc}`} section={child.label} subsection={gc} user={user} />;
                  }
                }
              }
            }
          }
        }
        return renderDashboard();
      }
    }
  };

  if (!user) return (
    <div style={S.app}>
      <LoginPage onLogin={handleLogin} />
      {toast && <Toast msg={toast.msg} type={toast.type} onClose={()=>setToast(null)} />}
    </div>
  );

  return (
    <div style={S.app}>
      <div style={{...S.header, justifyContent:"flex-start", gap:12}}>
        <button onClick={()=>setSidebarOpen(o=>!o)} style={{ background:"none", border:"none", color:"#fff", fontSize:20, cursor:"pointer", padding:"4px 8px", display:"flex", flexDirection:"column", gap:4, lineHeight:1 }}>
          <span style={{display:"block",width:22,height:2,background:"#fff",borderRadius:2}}></span>
          <span style={{display:"block",width:22,height:2,background:"#fff",borderRadius:2}}></span>
          <span style={{display:"block",width:22,height:2,background:"#fff",borderRadius:2}}></span>
        </button>
        <div style={S.headerTitle}>Data Vision — Geophysical Services</div>
        <div style={{fontSize:12,opacity:0.7,padding:"2px 10px",background:"rgba(255,255,255,0.15)",borderRadius:4,whiteSpace:"nowrap"}}>{currentPageLabel}</div>
        <div style={{flex:1}}></div>
        <div style={S.headerRight}>
          <span style={{ fontWeight:700, fontSize:14 }}>{user.name}</span>
          <span style={{ fontSize:12, opacity:0.8 }}>({ROLE_LABELS[user.role]})</span>
          <span style={{ fontSize:12, opacity:0.8 }}>Level: {user.level}</span>
          <div style={{ position:"relative", display:"inline-block" }}>
            <span onClick={() => { fetchNotifs(); setShowNotif(s=>!s); }} style={{ cursor:"pointer", position:"relative", fontSize:18, lineHeight:1, padding:"4px 6px" }}>
              Notifications{notifCount > 0 && <span style={{ position:"absolute", top:-2, right:-8, background:"#e74c3c", color:"#fff", fontSize:10, fontWeight:700, padding:"1px 5px", borderRadius:8, minWidth:16, textAlign:"center" }}>{notifCount}</span>}
            </span>
            {showNotif && <NotificationDropdown
              notifs={notifList}
              onMarkRead={async (id) => { await api.markNotificationRead(id); fetchNotifs(); }}
              onMarkAllRead={async () => { await api.markAllNotificationsRead(); fetchNotifs(); }}
              onClose={() => setShowNotif(false)}
            />}
          </div>
          <button style={{ background:"rgba(255,255,255,0.2)", border:"none", color:"#fff", padding:"6px 14px", borderRadius:4, cursor:"pointer", fontSize:12, fontWeight:600 }} onClick={handleLogout}>Logout</button>
        </div>
      </div>

      <div style={{...S.sidebar, transform: sidebarOpen ? "translateX(0)" : "translateX(-100%)" }}>
        <div style={{ padding:"10px 16px", borderBottom:"1px solid #2f3f4c", fontSize:11, color:"#fff", textTransform:"uppercase", letterSpacing:1 }}>Main Menu</div>
        {MENU.filter(item => item.roles.includes(user.role) && (!item.levels || item.levels.includes(user.level))).map(item => {
          if (item.submenu) {
            const isExpanded = expanded[item.label];
            return (
              <div key={item.label}>
                <div style={{...S.sideLink(false), fontWeight:600, padding:"10px 16px", cursor:"pointer"}} onClick={() => toggleExpand(item.label)}>
              <span style={{flex:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",color:"#fff"}}>{item.label}</span>
                  <span style={{fontSize:10,color:"#fff",transition:"transform 0.15s",transform:isExpanded?"rotate(90deg)":"rotate(0)"}}>▶</span>
                </div>
                {isExpanded && <div>
                  {item.submenu.map(child =>
                    typeof child === "string" ? (
                      <a key={child} style={{...S.sideLink(page === `${item.label}-${child.replace(/\s+/g,"-")}`), paddingLeft:40}} onClick={() => handleSubNavClick(item.label, child)}>
                        <span style={{overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{child}</span>
                      </a>
                    ) : (
                      <div key={child.label}>
                        <div style={{...S.sideLink(page.startsWith(`${item.label}-${child.label}`)), paddingLeft:40, cursor:"pointer"}} onClick={() => { toggleNested(item.label, child.label); handleSubNavClick(item.label, child.label); }}>
                          <span style={{flex:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{child.label}</span>
                          <span style={{fontSize:10,color:"#fff",transition:"transform 0.15s",transform:nestedExpanded[`${item.label}-${child.label}`]?"rotate(90deg)":"rotate(0)"}}>▶</span>
                        </div>
                        {nestedExpanded[`${item.label}-${child.label}`] && <div>
                          {child.children.map(gc => (
                            <a key={gc} style={{...S.sideLink(page === `${item.label}-${child.label}-${gc.replace(/\s+/g,"-")}`), paddingLeft:56}} onClick={() => handleNestedNavClick(item.label, child.label, gc)}>
                              <span style={{overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{gc}</span>
                            </a>
                          ))}
                        </div>}
                      </div>
                    )
                  )}
                </div>}
              </div>
            );
          }
          const isLogout = item.action === "logout";
          return (
             <a key={item.label} style={S.sideLink(page === item.page)} onClick={() => {
              if (isLogout) handleLogout();
              else if (item.page) setPage(item.page);
            }}>
              <span style={{flex:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{item.label}</span>
            </a>
          );
        })}
      </div>

      <div style={{...S.main, marginLeft: sidebarOpen ? 240 : 0, width: sidebarOpen ? "calc(100% - 240px)" : "100%" }}>{renderPage()}</div>

      {toast && <Toast msg={toast.msg} type={toast.type} onClose={()=>setToast(null)} />}
    </div>
  );
}
