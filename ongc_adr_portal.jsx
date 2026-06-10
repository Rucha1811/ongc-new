import { useState, useEffect, useCallback } from "react";

// ─────────────────────────────────────────────────────────────────────────────
// MOCK BACKEND (in-memory store + simulated API)
// ─────────────────────────────────────────────────────────────────────────────
const USERS_DB = [
  { id: 1, cpf: "100001", password: "admin123", name: "Sh. Sandip Kumar Kaur", role: "admin", designation: "CGM(Geophysics-Surface)", section: "HGS", level: 2 },
  { id: 2, cpf: "100002", password: "ops123", name: "Sh. Rajiv Sharma", role: "ops_manager", designation: "DGM Operations", section: "Operations", level: 3 },
  { id: 3, cpf: "100003", password: "user123", name: "Sh. Mahavir Singh", role: "data_creator", designation: "Senior Geophysicist", section: "GP-36", level: 4 },
  { id: 4, cpf: "100004", password: "view123", name: "Smt. Priya Patel", role: "viewer", designation: "Field Geophysicist", section: "GP-03", level: 0 },
];

const initFiles = [
  { id: 1, fileName: "GP-36 Monthly Report May_2025.pdf", fileType: "PDF", projectName: "Long-Offset 2D", sigNumber: "SIG-532", dataType: "Seismic 2D/3D/3C/4D", section: "GP-81", category: "Project Report", season: "2024-25", block: "Ankleshwar", mlBlock: "CB-ONHP-2022/2", location: "Linch and Jotana", classification: "General / Available for All", status: "Approved", uploadedBy: 3, uploadedByName: "Sh. Mahavir Singh", uploadDate: "2025-05-14", fileSize: "2.4 MB" },
  { id: 2, fileName: "Observer Report GP-16 May_2025.pdf", fileType: "PDF", projectName: "VSP Survey Valod", sigNumber: "G533", dataType: "Seismic 2D/3D/3C/4D", section: "GP-16", category: "Observer Report", season: "2024-25", block: "Ahmedabad", mlBlock: "CB-ONHP-2022/1", location: "Valod", classification: "General / Available for All", status: "Approved", uploadedBy: 3, uploadedByName: "Sh. Mahavir Singh", uploadDate: "2025-05-14", fileSize: "1.8 MB" },
  { id: 3, fileName: "Crop Compensation Records Q4 2024-25.xlsx", fileType: "XLSX", projectName: "LFPS Rajasthan", sigNumber: "SIG-601", dataType: "LFPS", section: "RCC", category: "Crop Compensation / Farmers", season: "2024-25", block: "Rajasthan", mlBlock: "RJ-ONHP-2021/1", location: "Barmer", classification: "Sensitive / Internal Use", status: "Approved", uploadedBy: 2, uploadedByName: "Sh. Rajiv Sharma", uploadDate: "2025-04-20", fileSize: "890 KB" },
  { id: 4, fileName: "Contract Bill Summary FY2024-25.xlsx", fileType: "XLSX", projectName: "3D Seismic Mehsana", sigNumber: "SIG-490", dataType: "Seismic 2D/3D/3C/4D", section: "Contracts", category: "Contractual Bill Summary", season: "2024-25", block: "Mehsana", mlBlock: "MH-ONHP-2020/3", location: "Mehsana", classification: "Highly Confidential / Restricted", status: "Approved", uploadedBy: 2, uploadedByName: "Sh. Rajiv Sharma", uploadDate: "2025-03-31", fileSize: "3.1 MB" },
  { id: 5, fileName: "M_s Agarwal Court Case Details.docx", fileType: "DOCX", projectName: "2D Kutch Survey", sigNumber: "SIG-410", dataType: "Any Other Data", section: "REL", category: "Legal/Arbitration/CourtCase", season: "2023-24", block: "Ankleshwar", mlBlock: "GK-ONHP-2021/2", location: "Kutch", classification: "Confidential", status: "Approved", uploadedBy: 1, uploadedByName: "Sh. Sandip Kumar Kaur", uploadDate: "2024-11-10", fileSize: "780 KB" },
  { id: 6, fileName: "Well Coordinates GP-06 2024-25.csv", fileType: "CSV", projectName: "Navigation Survey GP-06", sigNumber: "SIG-522", dataType: "Seismic 2D/3D/3C/4D", section: "GP-06", category: "Navigation/Survey Data", season: "2024-25", block: "Ahmedabad", mlBlock: "AH-ONHP-2022/1", location: "Jambusar", classification: "Confidential", status: "Pending", uploadedBy: 3, uploadedByName: "Sh. Mahavir Singh", uploadDate: "2025-05-20", fileSize: "450 KB" },
  { id: 7, fileName: "DPR May 2025 GP-36.pdf", fileType: "PDF", projectName: "Long-Offset 2D", sigNumber: "SIG-532", dataType: "Seismic 2D/3D/3C/4D", section: "GP-36", category: "Daily Progress Report (DPR)", season: "2024-25", block: "Ankleshwar", mlBlock: "CB-ONHP-2022/2", location: "Linch", classification: "General / Available for All", status: "Pending", uploadedBy: 3, uploadedByName: "Sh. Mahavir Singh", uploadDate: "2025-05-22", fileSize: "1.2 MB" },
  { id: 8, fileName: "VCC Presentation 81st GPS Vadodara.pptx", fileType: "PPT", projectName: "Annual Operations Review", sigNumber: "N/A", dataType: "Any Other Data", section: "GP-81", category: "VCC Presentation", season: "2024-25", block: "Ankleshwar", mlBlock: "N/A", location: "Vadodara", classification: "General / Available for All", status: "Rejected", uploadedBy: 3, uploadedByName: "Sh. Mahavir Singh", uploadDate: "2025-04-15", fileSize: "15.6 MB" },
];

let filesDB = [...initFiles];
let nextFileId = 9;

const canAccessFile = (user, file) => {
  if (!user) return false;
  const classMap = { "General / Available for All": 0, "Sensitive / Internal Use": 3, "Confidential": 3, "Highly Confidential / Restricted": 2 };
  const minLevel = classMap[file.classification] ?? 0;
  if (file.classification === "General / Available for All") return true;
  if (user.role === "admin") return true;
  if (user.role === "ops_manager") return file.classification !== "Highly Confidential / Restricted" || user.level <= 3;
  if (user.role === "data_creator") return file.uploadedBy === user.id || file.classification === "General / Available for All" || file.classification === "Sensitive / Internal Use";
  if (user.role === "viewer") return file.classification === "General / Available for All";
  return false;
};

const BACKEND = {
  login: (cpf, password) => {
    const user = USERS_DB.find(u => u.cpf === cpf && u.password === password);
    return user ? { success: true, user } : { success: false, error: "Invalid CPF or password" };
  },
  getFiles: (user, filters = {}) => {
    let files = filesDB.filter(f => canAccessFile(user, f));
    if (filters.search) { const s = filters.search.toLowerCase(); files = files.filter(f => f.fileName.toLowerCase().includes(s) || f.projectName.toLowerCase().includes(s) || f.sigNumber.toLowerCase().includes(s) || f.category.toLowerCase().includes(s) || f.location.toLowerCase().includes(s)); }
    if (filters.status) files = files.filter(f => f.status === filters.status);
    if (filters.section) files = files.filter(f => f.section === filters.section);
    if (filters.fileType) files = files.filter(f => f.fileType === filters.fileType);
    if (filters.dataType) files = files.filter(f => f.dataType === filters.dataType);
    if (filters.season) files = files.filter(f => f.season === filters.season);
    if (filters.block) files = files.filter(f => f.block === filters.block);
    if (filters.classification) files = files.filter(f => f.classification === filters.classification);
    return files;
  },
  uploadFile: (user, meta) => {
    if (!["admin","ops_manager","data_creator"].includes(user.role)) return { success: false, error: "Permission denied" };
    const newFile = { id: nextFileId++, ...meta, status: "Pending", uploadedBy: user.id, uploadedByName: user.name, uploadDate: new Date().toISOString().split("T")[0], fileSize: `${(Math.random()*10+0.5).toFixed(1)} MB` };
    filesDB.push(newFile);
    return { success: true, file: newFile };
  },
  approveFile: (user, fileId) => {
    if (!["admin","ops_manager"].includes(user.role)) return { success: false, error: "Permission denied" };
    const f = filesDB.find(f => f.id === fileId);
    if (!f) return { success: false, error: "File not found" };
    f.status = "Approved"; return { success: true };
  },
  rejectFile: (user, fileId) => {
    if (!["admin","ops_manager"].includes(user.role)) return { success: false, error: "Permission denied" };
    const f = filesDB.find(f => f.id === fileId);
    if (!f) return { success: false, error: "File not found" };
    f.status = "Rejected"; return { success: true };
  },
  getStats: (user) => {
    const accessible = filesDB.filter(f => canAccessFile(user, f));
    return { total: accessible.length, pending: accessible.filter(f=>f.status==="Pending").length, approved: accessible.filter(f=>f.status==="Approved").length, rejected: accessible.filter(f=>f.status==="Rejected").length, bySection: accessible.reduce((a,f)=>{a[f.section]=(a[f.section]||0)+1;return a;},{}), byType: accessible.reduce((a,f)=>{a[f.fileType]=(a[f.fileType]||0)+1;return a;},{}), byClassification: accessible.reduce((a,f)=>{a[f.classification]=(a[f.classification]||0)+1;return a;},{}), recentActivity: accessible.sort((a,b)=>b.id-a.id).slice(0,5) };
  },
  getUsers: (user) => { if (user.role !== "admin") return []; return USERS_DB; },
  updateUserRole: (admin, userId, newRole) => { if (admin.role !== "admin") return {success:false}; const u = USERS_DB.find(u=>u.id===userId); if(u){u.role=newRole;return{success:true,user:u};}return{success:false}; },
};

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────
const SECTIONS = ["GP-03","GP-06","GP-15","GP-16","GP-36","GP-61","GP-81","REL","RCC","HSE","Contracts","Operations"];
const CATEGORIES = ["General Admin","Accounts","HR(Manpower)","Legal/Arbitration/CourtCase","Contracts CorrespondanceLetter","Contract Execution Chronology","Contractual Bill Summary","Crop Compensation / Farmers","CSR Initiative","Equipment/Electronics","Navigation/Survey Data","Permissions / Statutory Clearances","Requisitions Asset/Basin","Annual Work Porgram (AWP)","Project Report","Operations/Acquisition Report","Observer Report","Processing Report","Survey Geometry/SPS Data","Uphole Reports","Activity Reports","Reconnaissance Survey Report","Atlas / Summary Report","Technical Report/Presentation","SOPs/Workflow/Processing Flow","Field QC Report","Minutes of Meeting/MRM","PPE/Kits & Liveries","Audit ATR/Compliances","VCC Presentation","Legacy Data / Acquisition Chronology","Data Entry Formats","Explosives/PESO","Instrument Calibration / Testing Reports","Daily Progress Report (DPR)","Field Trouble Reports","Crew Deployment / Field Roster","Training / Induction Records","Data Submission Records","Procurement Details","Technology/Innovation","Asset Condemnation","Training Records","Vehicles / Records","Handing/Taking Over","Experimental Plan/Report","Block Wise Coverage","Basin QCG Report and ATR","Important Orders and Circulars","Communication with Contractors","Bank / RCA Account","DISHA Approvals","RTI / Complaint Letters"];
const SEASONS = ["2025-26","2024-25","2023-24","2022-23","2021-22","2020-21","2019-20","2018-19","2017-18","2016-17","2015-16","2014-15","2013-14","2012-13","2011-12","2010-11","2009-10","2008-09","2007-08","2006-07","2005-06","2004-05","2003-04","2002-03","2001-02","2000-01","1999-00","1998-99","1997-98","1996-97","1995-96","1994-95","1993-94","1992-93","1991-92","1990-91","1989-90","1988-89","1987-88","1986-87","1985-86","1984-85","1983-84","1982-83","1981-82","1980-81","1979-80","1978-79","1977-78","1976-77","1975-76","1974-75","1973-74","1972-73","1971-72","1970-71","1969-70","1968-69","1967-68","1966-67","1965-66","1964-65","1963-64","1962-63","1961-62","1960-61","1959-60","1958-59","1957-58","1956-57"];
const BLOCKS = ["Ankleshwar","Ahmedabad","Mehsana","Rajasthan","Other"];
const CLASSIFICATIONS = ["General / Available for All","Sensitive / Internal Use","Confidential","Highly Confidential / Restricted"];
const FILE_TYPES = ["PDF","DOCX","XLSX","PPT","TXT","DAT","CSV","ZIP"];
const DATA_TYPES = ["Seismic 2D/3D/3C/4D","LFPS","VSP","Any Other Data"];
const ROLE_LABELS = { admin:"Admin (Full Control)", ops_manager:"Operations Manager", data_creator:"Data Creator/Editor", viewer:"End User/Viewer" };
const MENU_ITEMS = { admin:["Dashboard","Upload File","File Records","Pending Approval","Approved Files","Rejected Files","Reports","Users","Settings","Logout"], ops_manager:["Dashboard","Upload File","File Records","Pending Approval","Approved Files","Rejected Files","Reports","Logout"], data_creator:["Dashboard","Upload File","My Files","Reports","Logout"], viewer:["Dashboard","File Records","Approved Files","Reports","Logout"] };

const classColor = { "General / Available for All":"#1B5E20","Sensitive / Internal Use":"#E65100","Confidential":"#B71C1C","Highly Confidential / Restricted":"#7B1FA2" };
const statusColor = { "Approved":"#1B5E20","Pending":"#E65100","Rejected":"#B71C1C" };
const statusBg = { "Approved":"#E8F5E9","Pending":"#FFF3E0","Rejected":"#FFEBEE" };

// ─────────────────────────────────────────────────────────────────────────────
// STYLES
// ─────────────────────────────────────────────────────────────────────────────
const S = {
  app: { fontFamily:"'Segoe UI',system-ui,sans-serif", minHeight:"100vh", background:"#f0f4f8", color:"#1a1a2e" },
  header: { background:"#0b3d91", color:"#fff", padding:"0 24px", height:64, display:"flex", alignItems:"center", justifyContent:"space-between", boxShadow:"0 2px 8px rgba(0,0,0,0.2)", position:"fixed", top:0, left:0, right:0, zIndex:1000 },
  headerTitle: { fontSize:18, fontWeight:700, letterSpacing:0.5, display:"flex", alignItems:"center", gap:10 },
  headerRight: { display:"flex", alignItems:"center", gap:16, fontSize:13 },
  sidebar: { position:"fixed", top:64, left:0, width:220, height:"calc(100vh - 64px)", background:"#1d2b3e", overflowY:"auto", zIndex:999 },
  sideLink: (active) => ({ display:"flex", alignItems:"center", gap:10, padding:"12px 20px", color: active?"#fff":"rgba(255,255,255,0.75)", background: active?"#0b3d91":"transparent", borderLeft: active?"3px solid #4fc3f7":"3px solid transparent", cursor:"pointer", fontSize:14, transition:"all 0.2s", textDecoration:"none" }),
  main: { marginLeft:220, marginTop:64, padding:24, minHeight:"calc(100vh - 64px)" },
  card: { background:"#fff", borderRadius:10, boxShadow:"0 1px 4px rgba(0,0,0,0.08)", padding:20 },
  statCard: (color) => ({ background:color||"#fff", borderRadius:10, padding:20, color:"#fff", minWidth:140 }),
  btn: (variant="primary") => ({ padding:"8px 16px", borderRadius:6, border:"none", cursor:"pointer", fontWeight:600, fontSize:13, background: variant==="primary"?"#0b3d91":variant==="success"?"#1B5E20":variant==="danger"?"#B71C1C":variant==="warning"?"#E65100":"#6c757d", color:"#fff", transition:"opacity 0.2s" }),
  btnSm: (variant="primary") => ({ padding:"4px 10px", borderRadius:4, border:"none", cursor:"pointer", fontWeight:600, fontSize:11, background: variant==="primary"?"#0b3d91":variant==="success"?"#1B5E20":variant==="danger"?"#B71C1C":variant==="warning"?"#E65100":"#6c757d", color:"#fff" }),
  input: { padding:"8px 12px", border:"1px solid #d0d7e2", borderRadius:6, fontSize:13, width:"100%", boxSizing:"border-box", background:"#fff" },
  select: { padding:"8px 12px", border:"1px solid #d0d7e2", borderRadius:6, fontSize:13, width:"100%", boxSizing:"border-box", background:"#fff" },
  label: { fontSize:12, fontWeight:600, color:"#5a6a7a", marginBottom:4, display:"block", textTransform:"uppercase", letterSpacing:0.5 },
  table: { width:"100%", borderCollapse:"collapse", fontSize:13 },
  th: { background:"#0b3d91", color:"#fff", padding:"10px 12px", textAlign:"left", fontWeight:600, fontSize:12 },
  td: { padding:"10px 12px", borderBottom:"1px solid #f0f4f8", verticalAlign:"middle" },
  badge: (color, bg) => ({ display:"inline-block", padding:"2px 8px", borderRadius:12, fontSize:11, fontWeight:700, color, background:bg||"#f0f4f8" }),
  sectionTitle: { fontSize:20, fontWeight:700, color:"#0b3d91", marginBottom:16, display:"flex", alignItems:"center", gap:8 },
  grid2: { display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(220px,1fr))", gap:16, marginBottom:24 },
  grid4: { display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(150px,1fr))", gap:16, marginBottom:24 },
  formRow: { display:"grid", gridTemplateColumns:"1fr 1fr", gap:16, marginBottom:16 },
  formGroup: { marginBottom:16 },
  loginPage: { minHeight:"100vh", background:"linear-gradient(135deg,#0b3d91 0%,#1565c0 50%,#0d47a1 100%)", display:"flex", flexDirection:"column" },
  loginBox: { background:"rgba(255,255,255,0.95)", borderRadius:12, padding:36, width:420, boxShadow:"0 8px 40px rgba(0,0,0,0.25)" },
};

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENTS
// ─────────────────────────────────────────────────────────────────────────────

function Toast({ msg, type, onClose }) {
  useEffect(()=>{ const t=setTimeout(onClose,3500); return ()=>clearTimeout(t); },[onClose]);
  return (
    <div style={{ position:"fixed", bottom:24, right:24, zIndex:9999, background: type==="success"?"#1B5E20":type==="error"?"#B71C1C":"#0b3d91", color:"#fff", padding:"12px 20px", borderRadius:8, boxShadow:"0 4px 16px rgba(0,0,0,0.2)", fontSize:14, fontWeight:600, maxWidth:360 }}>
      {msg}
    </div>
  );
}

function BarChart({ data, label }) {
  const max = Math.max(...Object.values(data), 1);
  return (
    <div style={{ display:"flex", flexDirection:"column", gap:8, marginTop:8 }}>
      {Object.entries(data).map(([k,v])=>(
        <div key={k} style={{ display:"flex", alignItems:"center", gap:8 }}>
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

function PieChart({ data }) {
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
          <path key={i} d={describeArc(s.start, s.start+s.pct)} fill={s.color} stroke="#fff" strokeWidth={1}/>
        ))}
      </svg>
      <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
        {segments.map((s,i)=>(
          <div key={i} style={{ display:"flex", alignItems:"center", gap:6, fontSize:12 }}>
            <div style={{ width:12, height:12, borderRadius:3, background:s.color, flexShrink:0 }}/>
            <span style={{ color:"#5a6a7a" }}>{s.key}: <strong style={{ color:"#1a1a2e" }}>{s.value}</strong></span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// LOGIN PAGE
// ─────────────────────────────────────────────────────────────────────────────
function LoginPage({ onLogin }) {
  const [cpf, setCpf] = useState("");
  const [pwd, setPwd] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);
  const [hint, setHint] = useState(false);

  const handle = () => {
    setLoading(true); setErr("");
    setTimeout(()=>{
      const res = BACKEND.login(cpf, pwd);
      if (res.success) onLogin(res.user);
      else { setErr(res.error); setLoading(false); }
    }, 600);
  };

  return (
    <div style={S.loginPage}>
      <div style={{ background:"rgba(0,0,0,0.2)", padding:"14px 32px", display:"flex", alignItems:"center", gap:12 }}>
        <div style={{ width:44, height:44, background:"#fff", borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center", fontWeight:900, color:"#0b3d91", fontSize:16 }}>OIL</div>
        <div>
          <div style={{ color:"#fff", fontWeight:800, fontSize:16, letterSpacing:0.5 }}>ONGC — Advance Data Repository</div>
          <div style={{ color:"rgba(255,255,255,0.75)", fontSize:12 }}>Geophysical Services, WON Basin, Vadodara</div>
        </div>
      </div>
      <div style={{ flex:1, display:"flex" }}>
        <div style={{ flex:1, display:"flex", flexDirection:"column", justifyContent:"center", padding:"40px 60px" }}>
          <div style={{ color:"#fff", fontSize:36, fontWeight:800, lineHeight:1.2, marginBottom:16 }}>Structured Data<br/>Management Portal</div>
          <div style={{ color:"rgba(255,255,255,0.8)", fontSize:14, maxWidth:400, lineHeight:1.8, marginBottom:32 }}>Secure centralized repository for geophysical data, operations reports, contracts, and technical documentation.</div>
          <div style={{ display:"flex", gap:24, flexWrap:"wrap" }}>
            {[["📊","Data Driven Decisions"],["🔒","Hierarchical Access Control"],["🔍","Smart Search Engine"],["📁","Structured Archival"]].map(([ic,lb])=>(
              <div key={lb} style={{ display:"flex", alignItems:"center", gap:8, color:"rgba(255,255,255,0.85)", fontSize:13 }}>
                <span style={{ fontSize:18 }}>{ic}</span>{lb}
              </div>
            ))}
          </div>
          <div style={{ marginTop:32, background:"rgba(255,255,255,0.1)", borderRadius:8, padding:16, maxWidth:400 }}>
            <div style={{ color:"rgba(255,255,255,0.7)", fontSize:11, marginBottom:8, fontWeight:700, textTransform:"uppercase" }}>Sidebar Quick Links</div>
            {["Geophysical Services","Field Parties","Data Processing Center","Electronics Lab"].map(m=>(
              <div key={m} style={{ color:"rgba(255,255,255,0.85)", fontSize:13, padding:"4px 0", borderBottom:"1px solid rgba(255,255,255,0.1)" }}>{m}</div>
            ))}
          </div>
        </div>
        <div style={{ width:480, display:"flex", alignItems:"center", justifyContent:"center", padding:40 }}>
          <div style={S.loginBox}>
            <div style={{ textAlign:"center", marginBottom:28 }}>
              <div style={{ fontSize:22, fontWeight:800, color:"#0b3d91", marginBottom:4 }}>User Login</div>
              <div style={{ fontSize:13, color:"#6c757d" }}>Sign in with your CPF / Domain credentials</div>
            </div>
            <div style={S.formGroup}>
              <label style={S.label}>CPF Login / Domain</label>
              <input style={S.input} placeholder="Enter CPF Number" value={cpf} onChange={e=>setCpf(e.target.value)} onKeyDown={e=>e.key==="Enter"&&handle()} />
            </div>
            <div style={S.formGroup}>
              <label style={S.label}>Password</label>
              <input style={S.input} type="password" placeholder="Domain Password" value={pwd} onChange={e=>setPwd(e.target.value)} onKeyDown={e=>e.key==="Enter"&&handle()} />
            </div>
            {err && <div style={{ color:"#B71C1C", fontSize:13, marginBottom:12, padding:"8px 12px", background:"#FFEBEE", borderRadius:6 }}>{err}</div>}
            <button style={{ ...S.btn(), width:"100%", padding:"12px", fontSize:14 }} onClick={handle} disabled={loading}>
              {loading ? "Authenticating…" : "Login to Portal"}
            </button>
            <div style={{ marginTop:20, textAlign:"center" }}>
              <button style={{ background:"none", border:"none", color:"#0b3d91", cursor:"pointer", fontSize:12, textDecoration:"underline" }} onClick={()=>setHint(h=>!h)}>
                Demo Accounts {hint?"▲":"▼"}
              </button>
            </div>
            {hint && (
              <div style={{ marginTop:12, background:"#f0f4f8", borderRadius:8, padding:12, fontSize:12 }}>
                {USERS_DB.map(u=>(
                  <div key={u.id} style={{ padding:"4px 0", borderBottom:"1px solid #e0e0e0", display:"flex", justifyContent:"space-between" }}>
                    <span><strong>{ROLE_LABELS[u.role]}</strong></span>
                    <span style={{ color:"#5a6a7a" }}>{u.cpf} / {u.password}</span>
                    <button style={{ ...S.btnSm(), fontSize:10, padding:"2px 8px" }} onClick={()=>{setCpf(u.cpf);setPwd(u.password);}}>Use</button>
                  </div>
                ))}
              </div>
            )}
            <div style={{ marginTop:20, textAlign:"center", fontSize:11, color:"#aaa" }}>
              <a href="https://ongcindia.com/" style={{ color:"#0b3d91", marginRight:8 }}>About ONGC</a>
              <a href="http://vdaeureka.ongc.co.in/" style={{ color:"#0b3d91" }}>Eureka</a>
            </div>
          </div>
        </div>
      </div>
      <div style={{ background:"rgba(0,0,0,0.25)", padding:"12px 32px", display:"flex", justifyContent:"center", gap:32 }}>
        {["About ONGC","About Geophysical Services","Eureka","ONGC Reports","Help Desk"].map(l=>(
          <span key={l} style={{ color:"rgba(255,255,255,0.75)", fontSize:12, cursor:"pointer" }}>{l}</span>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ADMIN DASHBOARD
// ─────────────────────────────────────────────────────────────────────────────
function AdminDashboard({ user }) {
  const stats = BACKEND.getStats(user);
  const files = BACKEND.getFiles(user);
  return (
    <div>
      <div style={S.sectionTitle}>📊 Admin Dashboard — Full Access</div>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:16, marginBottom:24 }}>
        {[["Total Files",stats.total,"#0b3d91"],["Pending Approval",stats.pending,"#E65100"],["Approved",stats.approved,"#1B5E20"],["Rejected",stats.rejected,"#B71C1C"]].map(([l,v,c])=>(
          <div key={l} style={{ background:c, borderRadius:10, padding:20, color:"#fff" }}>
            <div style={{ fontSize:12, fontWeight:600, opacity:0.85, marginBottom:6, textTransform:"uppercase" }}>{l}</div>
            <div style={{ fontSize:36, fontWeight:800 }}>{v}</div>
          </div>
        ))}
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:16, marginBottom:24 }}>
        <div style={S.card}>
          <div style={{ fontSize:14, fontWeight:700, color:"#0b3d91", marginBottom:12 }}>Files by Section</div>
          <BarChart data={stats.bySection} />
        </div>
        <div style={S.card}>
          <div style={{ fontSize:14, fontWeight:700, color:"#0b3d91", marginBottom:12 }}>Files by Type</div>
          <BarChart data={stats.byType} />
        </div>
        <div style={S.card}>
          <div style={{ fontSize:14, fontWeight:700, color:"#0b3d91", marginBottom:12 }}>Classification Distribution</div>
          <PieChart data={stats.byClassification} />
        </div>
      </div>
      <div style={S.card}>
        <div style={{ fontSize:14, fontWeight:700, color:"#0b3d91", marginBottom:12 }}>Recent Activity</div>
        <table style={S.table}>
          <thead><tr>{["File Name","Section","Category","Uploaded By","Date","Status"].map(h=><th key={h} style={S.th}>{h}</th>)}</tr></thead>
          <tbody>
            {stats.recentActivity.map(f=>(
              <tr key={f.id}>
                <td style={S.td}><span style={{ color:"#0b3d91", fontWeight:600 }}>{f.fileName}</span></td>
                <td style={S.td}>{f.section}</td>
                <td style={S.td}>{f.category}</td>
                <td style={S.td}>{f.uploadedByName}</td>
                <td style={S.td}>{f.uploadDate}</td>
                <td style={S.td}><span style={{ ...S.badge(statusColor[f.status], statusBg[f.status]) }}>{f.status}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// OPS MANAGER DASHBOARD
// ─────────────────────────────────────────────────────────────────────────────
function OpsDashboard({ user }) {
  const stats = BACKEND.getStats(user);
  const pendingFiles = BACKEND.getFiles(user, { status:"Pending" });
  return (
    <div>
      <div style={S.sectionTitle}>⚙️ Operations Manager Dashboard</div>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:16, marginBottom:24 }}>
        {[["Accessible Files",stats.total,"#1565c0"],["Pending Approval",stats.pending,"#E65100"],["Approved",stats.approved,"#1B5E20"],["Rejected",stats.rejected,"#B71C1C"]].map(([l,v,c])=>(
          <div key={l} style={{ background:c, borderRadius:10, padding:20, color:"#fff" }}>
            <div style={{ fontSize:12, fontWeight:600, opacity:0.85, marginBottom:6, textTransform:"uppercase" }}>{l}</div>
            <div style={{ fontSize:36, fontWeight:800 }}>{v}</div>
          </div>
        ))}
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16, marginBottom:24 }}>
        <div style={S.card}>
          <div style={{ fontSize:14, fontWeight:700, color:"#0b3d91", marginBottom:12 }}>Files by Section</div>
          <BarChart data={stats.bySection} />
        </div>
        <div style={S.card}>
          <div style={{ fontSize:14, fontWeight:700, color:"#0b3d91", marginBottom:12 }}>Status Distribution</div>
          <PieChart data={{ Approved:stats.approved, Pending:stats.pending, Rejected:stats.rejected }} />
        </div>
      </div>
      {pendingFiles.length > 0 && (
        <div style={S.card}>
          <div style={{ fontSize:14, fontWeight:700, color:"#E65100", marginBottom:12 }}>⏳ Pending Approvals ({pendingFiles.length})</div>
          <table style={S.table}>
            <thead><tr>{["File","Section","Category","Classification","Uploader","Date"].map(h=><th key={h} style={S.th}>{h}</th>)}</tr></thead>
            <tbody>{pendingFiles.map(f=>(
              <tr key={f.id}>
                <td style={S.td}>{f.fileName}</td>
                <td style={S.td}>{f.section}</td>
                <td style={S.td}>{f.category}</td>
                <td style={S.td}><span style={{ ...S.badge(classColor[f.classification],"#fff"), border:`1px solid ${classColor[f.classification]}` }}>{f.classification}</span></td>
                <td style={S.td}>{f.uploadedByName}</td>
                <td style={S.td}>{f.uploadDate}</td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// DATA CREATOR DASHBOARD
// ─────────────────────────────────────────────────────────────────────────────
function CreatorDashboard({ user }) {
  const stats = BACKEND.getStats(user);
  const myFiles = BACKEND.getFiles(user).filter(f=>f.uploadedBy===user.id);
  return (
    <div>
      <div style={S.sectionTitle}>📁 Data Creator Dashboard</div>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:16, marginBottom:24 }}>
        {[["My Uploads",myFiles.length,"#0b3d91"],["My Pending",myFiles.filter(f=>f.status==="Pending").length,"#E65100"],["My Approved",myFiles.filter(f=>f.status==="Approved").length,"#1B5E20"]].map(([l,v,c])=>(
          <div key={l} style={{ background:c, borderRadius:10, padding:20, color:"#fff" }}>
            <div style={{ fontSize:12, fontWeight:600, opacity:0.85, marginBottom:6, textTransform:"uppercase" }}>{l}</div>
            <div style={{ fontSize:36, fontWeight:800 }}>{v}</div>
          </div>
        ))}
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16, marginBottom:24 }}>
        <div style={S.card}>
          <div style={{ fontSize:14, fontWeight:700, color:"#0b3d91", marginBottom:12 }}>My Files by Status</div>
          <PieChart data={{ Approved:myFiles.filter(f=>f.status==="Approved").length, Pending:myFiles.filter(f=>f.status==="Pending").length, Rejected:myFiles.filter(f=>f.status==="Rejected").length }} />
        </div>
        <div style={S.card}>
          <div style={{ fontSize:14, fontWeight:700, color:"#0b3d91", marginBottom:12 }}>My Files by Type</div>
          <BarChart data={myFiles.reduce((a,f)=>{a[f.fileType]=(a[f.fileType]||0)+1;return a;},{})} />
        </div>
      </div>
      <div style={S.card}>
        <div style={{ fontSize:14, fontWeight:700, color:"#0b3d91", marginBottom:12 }}>My Recent Uploads</div>
        <table style={S.table}>
          <thead><tr>{["File Name","Type","Category","Season","Status"].map(h=><th key={h} style={S.th}>{h}</th>)}</tr></thead>
          <tbody>{myFiles.slice(0,6).map(f=>(
            <tr key={f.id}>
              <td style={S.td}>{f.fileName}</td>
              <td style={S.td}>{f.fileType}</td>
              <td style={S.td}>{f.category}</td>
              <td style={S.td}>{f.season}</td>
              <td style={S.td}><span style={{ ...S.badge(statusColor[f.status], statusBg[f.status]) }}>{f.status}</span></td>
            </tr>
          ))}</tbody>
        </table>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// VIEWER DASHBOARD
// ─────────────────────────────────────────────────────────────────────────────
function ViewerDashboard({ user }) {
  const files = BACKEND.getFiles(user, { status:"Approved" });
  const stats = BACKEND.getStats(user);
  return (
    <div>
      <div style={S.sectionTitle}>👁️ Data Viewer Dashboard</div>
      <div style={{ background:"#E3F2FD", borderRadius:8, padding:16, marginBottom:24, border:"1px solid #90CAF9" }}>
        <div style={{ fontWeight:700, color:"#1565c0", marginBottom:4 }}>Access Level: Level-0 — General User</div>
        <div style={{ color:"#5a6a7a", fontSize:13 }}>You have read-only access to General / Available for All data. Confidential and internal files are not visible to this account.</div>
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(2,1fr)", gap:16, marginBottom:24 }}>
        {[["Available Files",stats.total,"#0b3d91"],["Accessible Approved",files.length,"#1B5E20"]].map(([l,v,c])=>(
          <div key={l} style={{ background:c, borderRadius:10, padding:20, color:"#fff" }}>
            <div style={{ fontSize:12, fontWeight:600, opacity:0.85, marginBottom:6, textTransform:"uppercase" }}>{l}</div>
            <div style={{ fontSize:36, fontWeight:800 }}>{v}</div>
          </div>
        ))}
      </div>
      <div style={S.card}>
        <div style={{ fontSize:14, fontWeight:700, color:"#0b3d91", marginBottom:12 }}>Available Files (General Access)</div>
        <table style={S.table}>
          <thead><tr>{["File Name","Type","Project","Section","Category","Season","Download"].map(h=><th key={h} style={S.th}>{h}</th>)}</tr></thead>
          <tbody>{files.map(f=>(
            <tr key={f.id}>
              <td style={S.td}><span style={{ color:"#0b3d91", fontWeight:600 }}>{f.fileName}</span></td>
              <td style={S.td}>{f.fileType}</td>
              <td style={S.td}>{f.projectName}</td>
              <td style={S.td}>{f.section}</td>
              <td style={S.td}>{f.category}</td>
              <td style={S.td}>{f.season}</td>
              <td style={S.td}><button style={S.btnSm("success")}>⬇ Download</button></td>
            </tr>
          ))}</tbody>
        </table>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// UPLOAD FILE FORM
// ─────────────────────────────────────────────────────────────────────────────
function UploadFile({ user, onToast }) {
  const empty = { fileName:"", fileType:"", projectName:"", sigNumber:"", dataType:"", section:"", category:"", season:"", block:"", mlBlock:"", location:"", classification:"" };
  const [form, setForm] = useState(empty);
  const [submitted, setSubmitted] = useState(false);

  const set = (k,v) => setForm(f=>({...f,[k]:v}));

  const handleSubmit = () => {
    if (!form.fileType||!form.projectName||!form.dataType||!form.section||!form.category||!form.season||!form.block||!form.classification) {
      onToast("Please fill all required fields", "error"); return;
    }
    const meta = { ...form, fileName: form.fileName || `${form.projectName}_${form.category}_${form.season}.${form.fileType.toLowerCase()}` };
    const res = BACKEND.uploadFile(user, meta);
    if (res.success) { setSubmitted(true); onToast("File uploaded successfully! Pending approval.", "success"); setTimeout(()=>setSubmitted(false), 3000); setForm(empty); }
    else onToast(res.error, "error");
  };

  return (
    <div>
      <div style={S.sectionTitle}>⬆️ File Meta Registration Form</div>
      {submitted && <div style={{ background:"#E8F5E9", border:"1px solid #4CAF50", borderRadius:8, padding:16, marginBottom:16, color:"#1B5E20", fontWeight:600 }}>✅ File submitted successfully and is pending approval.</div>}
      <div style={S.card}>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16 }}>
          <div style={S.formGroup}>
            <label style={S.label}>Upload File *</label>
            <input style={S.input} type="file" />
            <div style={{ fontSize:11, color:"#999", marginTop:4 }}>Prescribed File Size: Max 1 GB</div>
          </div>
          <div style={S.formGroup}>
            <label style={S.label}>File Type *</label>
            <select style={S.select} value={form.fileType} onChange={e=>set("fileType",e.target.value)}>
              <option value="">Select File Type</option>
              {FILE_TYPES.map(t=><option key={t}>{t}</option>)}
            </select>
          </div>
          <div style={S.formGroup}>
            <label style={S.label}>Project Name *</label>
            <input style={S.input} placeholder="e.g. Long-Offset 2D" value={form.projectName} onChange={e=>set("projectName",e.target.value)} />
          </div>
          <div style={S.formGroup}>
            <label style={S.label}>SIG Number</label>
            <input style={S.input} placeholder="e.g. SIG-532" value={form.sigNumber} onChange={e=>set("sigNumber",e.target.value)} />
          </div>
          <div style={S.formGroup}>
            <label style={S.label}>Data Type *</label>
            <select style={S.select} value={form.dataType} onChange={e=>set("dataType",e.target.value)}>
              <option value="">Select Data Type</option>
              {DATA_TYPES.map(t=><option key={t}>{t}</option>)}
            </select>
          </div>
          <div style={S.formGroup}>
            <label style={S.label}>Section Name *</label>
            <select style={S.select} value={form.section} onChange={e=>set("section",e.target.value)}>
              <option value="">Select Section</option>
              {SECTIONS.map(s=><option key={s}>{s}</option>)}
            </select>
          </div>
          <div style={{ ...S.formGroup, gridColumn:"1/-1" }}>
            <label style={S.label}>Category *</label>
            <select style={S.select} value={form.category} onChange={e=>set("category",e.target.value)}>
              <option value="">Select Category</option>
              {CATEGORIES.map(c=><option key={c}>{c}</option>)}
            </select>
          </div>
          <div style={S.formGroup}>
            <label style={S.label}>Relevant Year / Field Season *</label>
            <select style={S.select} value={form.season} onChange={e=>set("season",e.target.value)}>
              <option value="">Select Field Season</option>
              {SEASONS.map(s=><option key={s}>{s}</option>)}
            </select>
          </div>
          <div style={S.formGroup}>
            <label style={S.label}>Block Name (Tectonic Block) *</label>
            <select style={S.select} value={form.block} onChange={e=>set("block",e.target.value)}>
              <option value="">Select Tectonic Block</option>
              {BLOCKS.map(b=><option key={b}>{b}</option>)}
            </select>
          </div>
          <div style={S.formGroup}>
            <label style={S.label}>ML / PML / OLAP Block</label>
            <input style={S.input} placeholder="e.g. CB-ONHP-2022/2" value={form.mlBlock} onChange={e=>set("mlBlock",e.target.value)} />
          </div>
          <div style={S.formGroup}>
            <label style={S.label}>Area Name / Location</label>
            <input style={S.input} placeholder="e.g. Jambusar" value={form.location} onChange={e=>set("location",e.target.value)} />
          </div>
          <div style={{ ...S.formGroup, gridColumn:"1/-1" }}>
            <label style={S.label}>Data Classification *</label>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:8 }}>
              {CLASSIFICATIONS.map(c=>(
                <label key={c} style={{ display:"flex", alignItems:"center", gap:8, padding:"10px 12px", border:`2px solid ${form.classification===c?classColor[c]:"#e0e0e0"}`, borderRadius:6, cursor:"pointer", background: form.classification===c?classColor[c]+"15":"#fff" }}>
                  <input type="radio" name="classification" value={c} checked={form.classification===c} onChange={e=>set("classification",e.target.value)} />
                  <span style={{ fontSize:12, fontWeight:600, color:classColor[c] }}>{c}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
        <div style={{ marginTop:20, paddingTop:16, borderTop:"1px solid #f0f4f8", display:"flex", gap:12 }}>
          <button style={{ ...S.btn(), padding:"10px 32px", fontSize:14 }} onClick={handleSubmit}>Submit for Approval</button>
          <button style={{ ...S.btn("secondary"), padding:"10px 24px", fontSize:14 }} onClick={()=>setForm(empty)}>Reset</button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// FILE RECORDS (with search + filters)
// ─────────────────────────────────────────────────────────────────────────────
function FileRecords({ user, statusFilter, onToast, onRefresh }) {
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState({});
  const [selected, setSelected] = useState(null);

  const setF = (k,v) => setFilters(f=>({...f,[k]:v||undefined}));

  const files = BACKEND.getFiles(user, { search, ...(statusFilter?{status:statusFilter}:{}), ...filters });

  const handleApprove = (f) => { BACKEND.approveFile(user, f.id); onToast(`File "${f.fileName}" approved.`, "success"); onRefresh(); };
  const handleReject = (f) => { BACKEND.rejectFile(user, f.id); onToast(`File "${f.fileName}" rejected.`, "error"); onRefresh(); };

  const canApprove = ["admin","ops_manager"].includes(user.role);

  return (
    <div>
      <div style={S.sectionTitle}>
        📂 {statusFilter ? statusFilter+" Files" : "File Records"}
        <span style={{ fontSize:14, background:"#0b3d91", color:"#fff", borderRadius:12, padding:"2px 10px" }}>{files.length}</span>
      </div>
      <div style={{ ...S.card, marginBottom:16 }}>
        <div style={{ display:"grid", gridTemplateColumns:"2fr 1fr 1fr 1fr 1fr 1fr", gap:12, alignItems:"end" }}>
          <div>
            <label style={S.label}>🔍 Search</label>
            <input style={S.input} placeholder="File name, project, SIG, category, location…" value={search} onChange={e=>setSearch(e.target.value)} />
          </div>
          <div>
            <label style={S.label}>Section</label>
            <select style={S.select} onChange={e=>setF("section",e.target.value)}>
              <option value="">All</option>{SECTIONS.map(s=><option key={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label style={S.label}>File Type</label>
            <select style={S.select} onChange={e=>setF("fileType",e.target.value)}>
              <option value="">All</option>{FILE_TYPES.map(t=><option key={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label style={S.label}>Data Type</label>
            <select style={S.select} onChange={e=>setF("dataType",e.target.value)}>
              <option value="">All</option>{DATA_TYPES.map(t=><option key={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label style={S.label}>Season</label>
            <select style={S.select} onChange={e=>setF("season",e.target.value)}>
              <option value="">All</option>{SEASONS.slice(0,10).map(s=><option key={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label style={S.label}>Block</label>
            <select style={S.select} onChange={e=>setF("block",e.target.value)}>
              <option value="">All</option>{BLOCKS.map(b=><option key={b}>{b}</option>)}
            </select>
          </div>
        </div>
      </div>
      {!statusFilter && (
        <div style={{ ...S.card, marginBottom:16 }}>
          <div style={{ display:"flex", gap:8, alignItems:"center" }}>
            <label style={{ ...S.label, marginBottom:0, marginRight:8 }}>Classification:</label>
            {["", ...CLASSIFICATIONS].map(c=>(
              <button key={c} style={{ padding:"4px 12px", borderRadius:12, border:`1px solid ${c?classColor[c]:"#ccc"}`, background: (filters.classification===c&&c)?classColor[c]+"22":"transparent", color:c?classColor[c]:"#5a6a7a", cursor:"pointer", fontSize:12, fontWeight:600 }}
                onClick={()=>setF("classification",c)}>{c||"All"}</button>
            ))}
          </div>
        </div>
      )}
      <div style={S.card}>
        {files.length === 0 ? (
          <div style={{ textAlign:"center", padding:40, color:"#aaa" }}>No files found matching your criteria.</div>
        ) : (
          <div style={{ overflowX:"auto" }}>
            <table style={S.table}>
              <thead>
                <tr>{["File Name","Type","Upload Date","Project","SIG No.","Data Type","Section","Category","Season","Block","Location","Classification","Status",canApprove?"Actions":"Download"].map(h=><th key={h} style={S.th}>{h}</th>)}</tr>
              </thead>
              <tbody>
                {files.map(f=>(
                  <tr key={f.id} style={{ cursor:"pointer" }} onClick={()=>setSelected(f===selected?null:f)}>
                    <td style={S.td}><span style={{ color:"#0b3d91", fontWeight:600 }}>{f.fileName}</span><br/><span style={{ fontSize:11, color:"#999" }}>{f.fileSize}</span></td>
                    <td style={S.td}><span style={{ background:"#E3F2FD", color:"#1565c0", padding:"2px 8px", borderRadius:4, fontSize:11, fontWeight:700 }}>{f.fileType}</span></td>
                    <td style={S.td}>{f.uploadDate}</td>
                    <td style={S.td}>{f.projectName}</td>
                    <td style={S.td}>{f.sigNumber||"N/A"}</td>
                    <td style={S.td}>{f.dataType}</td>
                    <td style={S.td}>{f.section}</td>
                    <td style={S.td}>{f.category}</td>
                    <td style={S.td}>{f.season}</td>
                    <td style={S.td}>{f.block}</td>
                    <td style={S.td}>{f.location}</td>
                    <td style={S.td}><span style={{ ...S.badge(classColor[f.classification]||"#333"), border:`1px solid ${classColor[f.classification]||"#ccc"}`, fontSize:10 }}>{f.classification}</span></td>
                    <td style={S.td}><span style={{ ...S.badge(statusColor[f.status], statusBg[f.status]) }}>{f.status}</span></td>
                    <td style={S.td}>
                      {canApprove && f.status==="Pending" ? (
                        <div style={{ display:"flex", gap:4 }} onClick={e=>e.stopPropagation()}>
                          <button style={S.btnSm("success")} onClick={()=>handleApprove(f)}>✓ Approve</button>
                          <button style={S.btnSm("danger")} onClick={()=>handleReject(f)}>✗ Reject</button>
                        </div>
                      ) : <button style={S.btnSm("primary")}>⬇ Download</button>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {selected && (
        <div style={{ ...S.card, marginTop:16, border:"2px solid #0b3d91" }}>
          <div style={{ fontSize:16, fontWeight:700, color:"#0b3d91", marginBottom:12 }}>📄 File Details: {selected.fileName}</div>
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
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// REPORTS PAGE
// ─────────────────────────────────────────────────────────────────────────────
function Reports({ user }) {
  const stats = BACKEND.getStats(user);
  const files = BACKEND.getFiles(user);
  return (
    <div>
      <div style={S.sectionTitle}>📈 Reports & Analytics</div>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:16, marginBottom:24 }}>
        {[["Total Files",stats.total],["Approved",stats.approved],["Pending",stats.pending],["Rejected",stats.rejected]].map(([l,v])=>(
          <div key={l} style={{ background:"#fff", borderRadius:10, padding:16, textAlign:"center", boxShadow:"0 1px 4px rgba(0,0,0,0.08)" }}>
            <div style={{ fontSize:28, fontWeight:800, color:"#0b3d91" }}>{v}</div>
            <div style={{ fontSize:12, color:"#6c757d", textTransform:"uppercase", fontWeight:600 }}>{l}</div>
          </div>
        ))}
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16, marginBottom:24 }}>
        <div style={S.card}>
          <div style={{ fontSize:14, fontWeight:700, color:"#0b3d91", marginBottom:16 }}>Files by Section</div>
          <BarChart data={stats.bySection} />
        </div>
        <div style={S.card}>
          <div style={{ fontSize:14, fontWeight:700, color:"#0b3d91", marginBottom:16 }}>Classification Breakdown</div>
          <PieChart data={stats.byClassification} />
        </div>
        <div style={S.card}>
          <div style={{ fontSize:14, fontWeight:700, color:"#0b3d91", marginBottom:16 }}>Files by Type</div>
          <BarChart data={stats.byType} />
        </div>
        <div style={S.card}>
          <div style={{ fontSize:14, fontWeight:700, color:"#0b3d91", marginBottom:16 }}>Files by Data Type</div>
          <BarChart data={files.reduce((a,f)=>{a[f.dataType]=(a[f.dataType]||0)+1;return a;},{})} />
        </div>
      </div>
      <div style={S.card}>
        <div style={{ fontSize:14, fontWeight:700, color:"#0b3d91", marginBottom:12 }}>Files by Tectonic Block</div>
        <BarChart data={files.reduce((a,f)=>{a[f.block]=(a[f.block]||0)+1;return a;},{})} />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ACCESS PERMISSIONS TABLE
// ─────────────────────────────────────────────────────────────────────────────
function AccessPermissions({ user }) {
  const fileData = [
    { name:"Project / Operations Report", classification:"General / Available for All" },
    { name:"Survey Data", classification:"General / Available for All" },
    { name:"Technical Presentation", classification:"General / Available for All" },
    { name:"Crop Compensation Payment Records", classification:"Sensitive / Internal Use" },
    { name:"Contract Bill Payment Summary", classification:"Highly Confidential / Restricted" },
    { name:"M/s Xyz Court Case Details", classification:"Confidential" },
    { name:"M/s Well Coordinates", classification:"Confidential" },
    { name:"Data Interpretation Reports", classification:"Confidential" },
  ];
  return (
    <div>
      <div style={S.sectionTitle}>🔐 Data Access Permission Matrix</div>
      <div style={{ ...S.card, marginBottom:24 }}>
        <div style={{ fontSize:14, fontWeight:700, color:"#0b3d91", marginBottom:16 }}>Hierarchical Access Control Rules</div>
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
      <div style={S.card}>
        <div style={{ fontSize:14, fontWeight:700, color:"#0b3d91", marginBottom:16 }}>Uploaded Data Access Permission Based on Classification</div>
        <table style={S.table}>
          <thead>
            <tr>
              <th style={S.th}>Sr No</th>
              <th style={S.th}>File / Data Name</th>
              <th style={{ ...S.th, background:"#1B5E20" }}>General / Available for All</th>
              <th style={{ ...S.th, background:"#E65100" }}>Sensitive / Internal Use</th>
              <th style={{ ...S.th, background:"#B71C1C" }}>Confidential</th>
              <th style={{ ...S.th, background:"#7B1FA2" }}>Highly Confidential / Restricted</th>
            </tr>
          </thead>
          <tbody>
            {fileData.map((f,i)=>(
              <tr key={i}>
                <td style={{ ...S.td, textAlign:"center" }}>{i+1}</td>
                <td style={S.td}><strong>{f.name}</strong></td>
                {CLASSIFICATIONS.map(c=>(
                  <td key={c} style={{ ...S.td, textAlign:"center" }}>
                    {f.classification===c ? <span style={{ fontSize:18, color:classColor[c] }}>☑</span> : <span style={{ fontSize:18, color:"#ccc" }}>☐</span>}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div style={{ ...S.card, marginTop:16 }}>
        <div style={{ fontSize:14, fontWeight:700, color:"#0b3d91", marginBottom:16 }}>Role-Based Governance Matrix</div>
        <table style={S.table}>
          <thead><tr>
            <th style={S.th}>Capability</th>
            <th style={{ ...S.th, background:"#1B5E20" }}>Admin (Full Control)</th>
            <th style={{ ...S.th, background:"#1565c0" }}>Data Creator / Editor</th>
            <th style={{ ...S.th, background:"#6c757d" }}>End User / Data Viewer</th>
          </tr></thead>
          <tbody>
            {[["Upload Capability","✅ Yes","✅ Yes","❌ No"],["Edit & Version Control","✅ Yes","✅ Own data only","❌ No"],["Download Capabilities","✅ Yes","✅ Yes","✅ Read-only / Download"],["Hierarchy Maintenance","✅ Yes","❌ No","❌ No"],["Approve/Reject Files","✅ Yes","❌ No","❌ No"]].map(([cap,...vals])=>(
              <tr key={cap}>
                <td style={{ ...S.td, fontWeight:600 }}>{cap}</td>
                {vals.map((v,i)=><td key={i} style={{ ...S.td, textAlign:"center", color: v.includes("✅")?"#1B5E20":v.includes("❌")?"#B71C1C":"#0b3d91", fontWeight:600 }}>{v}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// USER MANAGEMENT (Admin only)
// ─────────────────────────────────────────────────────────────────────────────
function UserManagement({ user, onToast, onRefresh }) {
  const [users, setUsers] = useState(BACKEND.getUsers(user));
  const changeRole = (uid, newRole) => {
    const res = BACKEND.updateUserRole(user, uid, newRole);
    if (res.success) { setUsers(BACKEND.getUsers(user)); onToast("User role updated.", "success"); }
  };
  return (
    <div>
      <div style={S.sectionTitle}>👥 User Management</div>
      <div style={S.card}>
        <table style={S.table}>
          <thead><tr>{["CPF","Name","Designation","Section","Level","Role","Change Role"].map(h=><th key={h} style={S.th}>{h}</th>)}</tr></thead>
          <tbody>{users.map(u=>(
            <tr key={u.id}>
              <td style={S.td}>{u.cpf}</td>
              <td style={S.td}><strong>{u.name}</strong></td>
              <td style={S.td}>{u.designation}</td>
              <td style={S.td}>{u.section}</td>
              <td style={S.td}>Level-{u.level}</td>
              <td style={S.td}><span style={{ ...S.badge("#0b3d91","#E3F2FD") }}>{ROLE_LABELS[u.role]}</span></td>
              <td style={S.td}>
                {u.id !== user.id ? (
                  <select style={{ ...S.select, width:"auto" }} value={u.role} onChange={e=>changeRole(u.id,e.target.value)}>
                    <option value="admin">Admin</option>
                    <option value="ops_manager">Ops Manager</option>
                    <option value="data_creator">Data Creator</option>
                    <option value="viewer">Viewer</option>
                  </select>
                ) : <span style={{ color:"#aaa", fontSize:12 }}>You</span>}
              </td>
            </tr>
          ))}</tbody>
        </table>
      </div>
      <div style={{ ...S.card, marginTop:16 }}>
        <div style={{ fontSize:14, fontWeight:700, color:"#0b3d91", marginBottom:12 }}>Access Hierarchy Diagram</div>
        <div style={{ display:"flex", alignItems:"center", gap:0, flexWrap:"wrap" }}>
          {[["Level-II","Head GS (Admin)","#B71C1C"],["→","","transparent"],["Level-III","Ops Manager","#E65100"],["→","","transparent"],["Level-IV","Data Creator","#1B5E20"],["→","","transparent"],["Level-0","All ONGC","#1565c0"]].map(([l,d,c],i)=>(
            l==="→" ? <div key={i} style={{ fontSize:24, color:"#aaa", margin:"0 4px" }}>→</div> :
            <div key={i} style={{ background:c+"15", border:`1px solid ${c}`, borderRadius:8, padding:"8px 16px", textAlign:"center" }}>
              <div style={{ fontSize:11, fontWeight:800, color:c }}>{l}</div>
              <div style={{ fontSize:12, color:"#1a1a2e", fontWeight:600 }}>{d}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SETTINGS
// ─────────────────────────────────────────────────────────────────────────────
function Settings({ user }) {
  return (
    <div>
      <div style={S.sectionTitle}>⚙️ Portal Settings</div>
      <div style={S.card}>
        <div style={{ fontSize:14, fontWeight:700, color:"#0b3d91", marginBottom:16 }}>System Configuration</div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16 }}>
          {[["Portal Name","Advance Data Repository (ADR)"],["Organization","ONGC — Geophysical Services, WON Basin"],["Location","Vadodara, Gujarat"],["Max File Size","1 GB"],["Backup Frequency","Weekly (Auto)"],["Authentication","Domain CPF Login"],["Version","1.0.0"],["Last Backup","25 May 2026"]].map(([k,v])=>(
            <div key={k} style={{ display:"flex", justifyContent:"space-between", padding:"10px 0", borderBottom:"1px solid #f0f4f8" }}>
              <span style={{ fontSize:13, color:"#5a6a7a", fontWeight:600 }}>{k}</span>
              <span style={{ fontSize:13, color:"#1a1a2e" }}>{v}</span>
            </div>
          ))}
        </div>
        <div style={{ marginTop:20, padding:"16px", background:"#E8F5E9", borderRadius:8, border:"1px solid #4CAF50" }}>
          <div style={{ fontWeight:700, color:"#1B5E20", marginBottom:4 }}>✅ Data Security: Auto Backup Enabled</div>
          <div style={{ fontSize:13, color:"#5a6a7a" }}>Automated weekly backup for all uploaded data. All files are secured with hierarchical access control.</div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN APP
// ─────────────────────────────────────────────────────────────────────────────
export default function App() {
  const [user, setUser] = useState(null);
  const [page, setPage] = useState("Dashboard");
  const [toast, setToast] = useState(null);
  const [refresh, setRefresh] = useState(0);
  const [sideCollapsed, setSideCollapsed] = useState(false);

  const showToast = useCallback((msg, type) => setToast({ msg, type }), []);
  const doRefresh = useCallback(() => setRefresh(r=>r+1), []);

  const navItems = user ? (MENU_ITEMS[user.role] || []) : [];

  const renderDashboard = () => {
    if (user.role === "admin") return <AdminDashboard user={user} />;
    if (user.role === "ops_manager") return <OpsDashboard user={user} />;
    if (user.role === "data_creator") return <CreatorDashboard user={user} />;
    return <ViewerDashboard user={user} />;
  };

  const renderPage = () => {
    switch(page) {
      case "Dashboard": return renderDashboard();
      case "Upload File": return <UploadFile user={user} onToast={showToast} key={refresh} />;
      case "File Records": return <FileRecords user={user} onToast={showToast} onRefresh={doRefresh} key={refresh} />;
      case "My Files": return <FileRecords user={user} onToast={showToast} onRefresh={doRefresh} key={refresh} />;
      case "Pending Approval": return <FileRecords user={user} statusFilter="Pending" onToast={showToast} onRefresh={doRefresh} key={refresh} />;
      case "Approved Files": return <FileRecords user={user} statusFilter="Approved" onToast={showToast} onRefresh={doRefresh} key={refresh} />;
      case "Rejected Files": return <FileRecords user={user} statusFilter="Rejected" onToast={showToast} onRefresh={doRefresh} key={refresh} />;
      case "Reports": return <Reports user={user} key={refresh} />;
      case "Users": return <UserManagement user={user} onToast={showToast} onRefresh={doRefresh} key={refresh} />;
      case "Access Permissions": return <AccessPermissions user={user} />;
      case "Settings": return <Settings user={user} />;
      default: return renderDashboard();
    }
  };

  if (!user) return (
    <div style={S.app}>
      <LoginPage onLogin={(u)=>{ setUser(u); setPage("Dashboard"); }} />
      {toast && <Toast msg={toast.msg} type={toast.type} onClose={()=>setToast(null)} />}
    </div>
  );

  return (
    <div style={S.app}>
      {/* HEADER */}
      <div style={S.header}>
        <div style={S.headerTitle}>
          <div style={{ width:36, height:36, background:"#fff", borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center", fontWeight:900, color:"#0b3d91", fontSize:12, flexShrink:0 }}>OIL</div>
          <div>
            <div style={{ fontSize:15, fontWeight:800, letterSpacing:0.5 }}>Advance Data Repository</div>
            <div style={{ fontSize:11, opacity:0.8 }}>Geophysical Services, WON Basin, Vadodara</div>
          </div>
        </div>
        <div style={S.headerRight}>
          <div style={{ background:"rgba(255,255,255,0.15)", borderRadius:6, padding:"6px 12px", textAlign:"right" }}>
            <div style={{ fontWeight:700, fontSize:13 }}>{user.name}</div>
            <div style={{ fontSize:11, opacity:0.8 }}>{ROLE_LABELS[user.role]}</div>
          </div>
          <div style={{ background:"rgba(255,255,255,0.15)", borderRadius:6, padding:"6px 12px", textAlign:"center" }}>
            <div style={{ fontSize:10, opacity:0.8 }}>Level</div>
            <div style={{ fontWeight:700 }}>{user.level}</div>
          </div>
          <button style={{ background:"rgba(255,255,255,0.2)", border:"none", color:"#fff", padding:"6px 14px", borderRadius:6, cursor:"pointer", fontSize:12, fontWeight:600 }} onClick={()=>setUser(null)}>Logout</button>
        </div>
      </div>

      {/* SIDEBAR */}
      <div style={S.sidebar}>
        <div style={{ padding:"12px 16px", borderBottom:"1px solid rgba(255,255,255,0.1)", fontSize:11, color:"rgba(255,255,255,0.5)", textTransform:"uppercase", letterSpacing:1 }}>
          Navigation
        </div>
        {navItems.filter(m=>m!=="Logout").map(m=>(
          <a key={m} style={S.sideLink(page===m)} onClick={()=>setPage(m)}>
            <span>{ m==="Dashboard"?"🏠":m==="Upload File"?"⬆️":m==="File Records"||m==="My Files"?"📂":m==="Pending Approval"?"⏳":m==="Approved Files"?"✅":m==="Rejected Files"?"❌":m==="Reports"?"📈":m==="Users"?"👥":m==="Settings"?"⚙️":"📄"}</span>
            {m}
          </a>
        ))}
        {user.role === "admin" && (
          <a style={S.sideLink(page==="Access Permissions")} onClick={()=>setPage("Access Permissions")}>
            🔐 Access Permissions
          </a>
        )}
        <div style={{ position:"absolute", bottom:80, left:0, right:0, padding:"0 12px" }}>
          <div style={{ fontSize:10, color:"rgba(255,255,255,0.4)", textAlign:"center", marginBottom:8 }}>Quick Links</div>
          {["Geophysical Services","Field Parties","Data Processing Center","Electronics Lab"].map(l=>(
            <div key={l} style={{ color:"rgba(255,255,255,0.6)", fontSize:11, padding:"5px 8px", cursor:"pointer", borderRadius:4 }}>{l}</div>
          ))}
        </div>
        <a style={{ ...S.sideLink(false), position:"absolute", bottom:20, left:0, right:0, borderTop:"1px solid rgba(255,255,255,0.1)" }} onClick={()=>setUser(null)}>
          🚪 Logout
        </a>
      </div>

      {/* MAIN */}
      <div style={S.main}>
        {renderPage()}
      </div>

      {toast && <Toast msg={toast.msg} type={toast.type} onClose={()=>setToast(null)} />}
    </div>
  );
}
