import { useState, useEffect, useCallback, useRef } from "react";
import { api, setToken } from "./api";
import ActivityAnalytics from "./components/ActivityAnalytics";


const SECTIONS = ["GP-03","GP-06","GP-15","GP-16","GP-36","GP-61","GP-81","REL","RCC","HSE","Contracts","Operations"];
const CATEGORIES = ["General Admin","Accounts","HR(Manpower)","Legal/Arbitration/CourtCase","Contracts CorrespondanceLetter","Contract Execution Chronology","Contractual Bill Summary","Crop Compensation / Farmers","CSR Initiative","Equipment/Electronics","Navigation/Survey Data","Permissions / Statutory Clearances","Requisitions Asset/Basin","Annual Work Porgram (AWP)","Project Report","Operations/Acquisition Report","Observer Report","Processing Report","Survey Geometry/SPS Data","Uphole Reports","Activity Reports","Reconnaissance Survey Report","Atlas / Summary Report","Technical Report/Presentation","SOPs/Workflow/Processing Flow","Field QC Report","Minutes of Meeting/MRM","PPE/Kits & Liveries","Audit ATR/Compliances","VCC Presentation","Legacy Data / Acquisition Chronology","Data Entry Formats","Explosives/PESO","Instrument Calibration / Testing Reports","Daily Progress Report (DPR)","Field Trouble Reports","Crew Deployment / Field Roster","Training / Induction Records","Data Submission Records","Procurement Details","Technology/Innovation","Asset Condemnation","Training Records","Vehicles / Records","Handing/Taking Over","Experimental Plan/Report","Block Wise Coverage","Basin QCG Report and ATR","Important Orders and Circulars","Communication with Contractors","Bank / RCA Account","DISHA Approvals","RTI / Complaint Letters"];
const SEASONS = ["2025-26","2024-25","2023-24","2022-23","2021-22","2020-21","2019-20","2018-19","2017-18","2016-17","2015-16","2014-15","2013-14","2012-13","2011-12","2010-11","2009-10","2008-09","2007-08","2006-07","2005-06","2004-05","2003-04","2002-03","2001-02","2000-01","1999-00","1998-99","1997-98","1996-97","1995-96","1994-95","1993-94","1992-93","1991-92","1990-91","1989-90","1988-89","1987-88","1986-87","1985-86","1984-85","1983-84","1982-83","1981-82","1980-81","1979-80","1978-79","1977-78","1976-77","1975-76","1974-75","1973-74","1972-73","1971-72","1970-71","1969-70","1968-69","1967-68","1966-67","1965-66","1964-65","1963-64","1962-63","1961-62","1960-61","1959-60","1958-59","1957-58","1956-57"];
const BLOCKS = ["Ankleshwar","Ahmedabad","Mehsana","Rajasthan","Other"];
const CLASSIFICATIONS = ["General / Available for All","Sensitive / Internal Use","Confidential","Highly Confidential / Restricted"];
const FILE_TYPES = ["PDF","DOCX","XLSX","PPT","TXT","DAT","CSV","ZIP"];
const DATA_TYPES = ["Seismic 2D/3D/3C/4D","LFPS","VSP","Any Other Data"];
const ROLE_LABELS = { admin:"Admin (Full Control)", ops_manager:"Operations Manager", data_creator:"Data Creator/Editor", viewer:"End User/Viewer" };
const MENU_ITEMS = { admin:["Dashboard","Upload File","File Records","Pending Approval","Approved Files","Rejected Files","Reports","Activity Analytics","Users","Access Permissions","Settings","Logout"], ops_manager:["Dashboard","Upload File","File Records","Pending Approval","Approved Files","Rejected Files","Reports","Activity Analytics","Logout"], data_creator:["Dashboard","Upload File","My Files","Reports","Logout"], viewer:["Dashboard","File Records","Approved Files","Reports","Logout"] };

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
    status: f.status,
    uploadedBy: f.uploaded_by,
    uploadedByName: f.uploaded_by_name || f.uploaded_by,
    uploadDate: f.upload_date ? f.upload_date.split("T")[0] : "",
    fileSize: f.file_size || "—",
    filePath: f.file_path || "",
  };
}

const S = {
  app: { fontFamily:"'Segoe UI',system-ui,Arial,sans-serif", minHeight:"100vh", background:"#f0f2f5", color:"#1a1a2e" },
  header: { width:"100%", height:56, background:"linear-gradient(135deg,#0b3d91,#1565c0)", color:"#fff", display:"flex", alignItems:"center", justifyContent:"center", padding:"0 24px", position:"fixed", top:0, left:0, right:0, zIndex:1000, boxSizing:"border-box" },
  headerTitle: { fontSize:15, fontWeight:700, textAlign:"center", color:"#fff", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis", flex:1, letterSpacing:0.3 },
  headerRight: { display:"flex", alignItems:"center", gap:16, fontSize:13, flexShrink:0 },
  sidebar: { position:"fixed", top:56, left:0, width:220, height:"calc(100vh - 56px)", background:"#1a2632", overflowY:"auto", zIndex:999, paddingTop:0 },
  sideLink: (active) => ({ display:"block", color: active?"#fff":"rgba(255,255,255,0.8)", textDecoration:"none", padding:"12px 20px", borderLeft: active?"3px solid #42a5f5":"3px solid transparent", background: active?"rgba(255,255,255,0.08)":"transparent", cursor:"pointer", fontSize:14, fontWeight: active?600:400, transition:"all 0.2s" }),
  main: { marginLeft:220, marginTop:56, padding:"20px 32px", width:"calc(100% - 220px)", minHeight:"calc(100vh - 56px)", boxSizing:"border-box" },
  card: { background:"#fff", borderRadius:8, boxShadow:"0 1px 4px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)", padding:16, marginBottom:16, overflow:"auto" },
  btn: (variant="primary") => ({ padding:"8px 18px", borderRadius:6, border:"none", cursor:"pointer", fontWeight:600, fontSize:13, background: variant==="primary"?"#0b3d91":variant==="success"?"#1B5E20":variant==="danger"?"#B71C1C":variant==="warning"?"#E65100":"#6c757d", color:"#fff", transition:"all 0.15s", boxShadow:"0 1px 3px rgba(0,0,0,0.12)" }),
  btnSm: (variant="primary") => ({ padding:"5px 12px", borderRadius:5, border:"none", cursor:"pointer", fontWeight:600, fontSize:12, background: variant==="primary"?"#0b3d91":variant==="success"?"#1B5E20":variant==="danger"?"#B71C1C":variant==="warning"?"#E65100":"#6c757d", color:"#fff", transition:"all 0.15s" }),
  input: { width:"100%", padding:"8px 12px", marginTop:4, marginBottom:12, border:"1px solid #d0d5dd", borderRadius:6, fontSize:14, boxSizing:"border-box", background:"#fff", transition:"border-color 0.15s" },
  select: { width:"100%", padding:"8px 12px", marginTop:4, marginBottom:12, border:"1px solid #d0d5dd", borderRadius:6, fontSize:14, background:"#fff", boxSizing:"border-box", transition:"border-color 0.15s" },
  label: { fontWeight:600, fontSize:13, color:"#344054", marginBottom:2, display:"block" },
  table: { width:"100%", borderCollapse:"collapse", fontSize:14 },
  th: { background:"#f8f9fa", color:"#344054", padding:"10px 12px", textAlign:"left", fontWeight:600, fontSize:13, borderBottom:"2px solid #e0e0e0", whiteSpace:"nowrap" },
  td: { padding:"10px 12px", borderBottom:"1px solid #f0f0f0", verticalAlign:"middle", fontSize:13, color:"#1a1a2e" },
  badge: (color, bg) => ({ display:"inline-block", padding:"3px 10px", borderRadius:12, fontSize:12, fontWeight:600, color, background:bg||"#f5f5f5" }),
  sectionTitle: { fontSize:18, fontWeight:700, color:"#0b3d91", marginBottom:16, display:"flex", alignItems:"center", gap:8, padding:"0 0 4px 0", borderBottom:"2px solid #e8edf2" },
  formGroup: { marginBottom:4 },
  footer: { width:"100%", background:"#1d2b36", color:"#fff", padding:"15px 20px", position:"fixed", bottom:0, left:0, zIndex:1000, boxSizing:"border-box" },
  footerMenu: { display:"flex", justifyContent:"center", gap:30 },
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
            {!n.is_read && <button onClick={() => onMarkRead(n.id)} style={{ background:"#0b3d91", border:"none", color:"#fff", borderRadius:4, padding:"2px 8px", cursor:"pointer", fontSize:11, fontWeight:600, whiteSpace:"nowrap", marginTop:2 }}>✔</button>}
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

  return (
    <div style={S.app}>
      <div style={S.header}>
        <div style={S.headerTitle}>Advance Data Repository by Geophysical Services | Digital Platform for Secure Storage, Data Management and Access!</div>
      </div>
      <div style={S.sidebar}>
        <a style={S.sideLink(false)} href="#">Geophysical Services</a>
        <a style={S.sideLink(false)} href="#">Field Parties</a>
        <a style={S.sideLink(false)} href="#">Data Processing Center</a>
        <a style={S.sideLink(false)} href="#">Electronics Lab</a>
        <br/>
        <a style={S.sideLink(false)} href="https://ongcindia.com/">ONGC India</a>
      </div>
      <div style={S.main}>
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
          <h3 style={{ margin:"0 0 12px 0", color:"#0b3d91", fontSize:15 }}>Default Seed Accounts</h3>
          <div style={{ display:"flex", gap:12, flexWrap:"wrap" }}>
            {[["Admin","100001","admin123"],["Ops Manager","100002","ops123"],["Data Creator","100003","user123"],["Viewer","100004","view123"]].map(([role,cpfv,pass])=>(
              <div key={cpfv} style={{ display:"flex", alignItems:"center", gap:8, background:"#f4f6f9", borderRadius:6, padding:"8px 12px", fontSize:12 }}>
                <span style={{ fontWeight:700, color:"#0b3d91" }}>{role}:</span>
                <span style={{ color:"#555" }}>{cpfv} / {pass}</span>
                <button type="button" style={{ padding:"3px 10px", fontSize:11, background:"#0b3d91", color:"#fff", border:"none", borderRadius:3, cursor:"pointer", fontWeight:600 }} onClick={()=>{setCpf(cpfv);setPwd(pass);}}>Use</button>
              </div>
            ))}
          </div>
        </div>
        <div style={{ width:"100%", maxWidth:540, margin:"0 auto" }}>
          <h2 style={{ textAlign:"center", color:"#0b3d91", marginBottom:16, fontSize:18 }}>Office Gallery</h2>
          <div style={{ width:"100%", height:200, background:"linear-gradient(135deg,#0b3d91,#1565c0)", borderRadius:8, marginBottom:15, display:"flex", alignItems:"center", justifyContent:"center", color:"#fff", fontSize:16, fontWeight:600 }}>ONGC — Vadodara Headquarters</div>
          <div style={{ width:"100%", height:200, background:"linear-gradient(135deg,#1a237e,#283593)", borderRadius:8, display:"flex", alignItems:"center", justifyContent:"center", color:"#fff", fontSize:16, fontWeight:600 }}>Geophysical Services — WON Basin</div>
        </div>
      </div>
      <div style={S.footer}>
        <div style={S.footerMenu}>
          <a style={S.footerLink} href="https://ongcindia.com/">About ONGC</a>
          <a style={S.footerLink} href="http://10.203.50.150/about_us/">About Geophysical Services</a>
          <a style={S.footerLink} href="http://vdaeureka.ongc.co.in/">Eureka</a>
          <a style={S.footerLink} href="https://reports.ongc.co.in/">ONGC Reports</a>
          <a style={S.footerLink} href="https://sparktriangle.com/">Digital Library</a>
          <a style={S.footerLink} href="http://10.205.55.76:8080/Upload/Vadodara_Directory.htm">Help Desk</a>
        </div>
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
      <div style={S.sectionTitle}>📊 Admin Dashboard</div>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:16, marginBottom:16 }}>
        {[["Total Files",stats.total,"#0b3d91"],["Pending Approval",stats.pending,"#E65100"],["Approved",stats.approved,"#1B5E20"],["Rejected",stats.rejected,"#B71C1C"]].map(([l,v,c])=>(
          <div key={l} style={{ background:`linear-gradient(135deg,${c},${c}dd)`, borderRadius:10, padding:20, color:"#fff", minWidth:0, boxShadow:"0 2px 8px rgba(0,0,0,0.12)", cursor:"pointer" }} onClick={() => setDrill({ title:`Files with status: ${l}`, filterKey:"status", filterValue:l==="Total Files"?"":l })}>
            <div style={{ fontSize:12, fontWeight:600, opacity:0.85, marginBottom:8, textTransform:"uppercase", letterSpacing:0.5 }}>{l}</div>
            <div style={{ fontSize:32, fontWeight:800 }}>{v}</div>
          </div>
        ))}
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:16, marginBottom:16 }}>
        <div style={{ ...S.card, minWidth:0 }}><div style={{ fontSize:14, fontWeight:700, color:"#0b3d91", marginBottom:12 }}>Files by Section</div><BarChart data={stats.bySection || {}} onItemClick={k => setDrill({ title:`Files in Section: ${k}`, filterKey:"section", filterValue:k })} /></div>
        <div style={{ ...S.card, minWidth:0 }}><div style={{ fontSize:14, fontWeight:700, color:"#0b3d91", marginBottom:12 }}>Files by Type</div><BarChart data={stats.byType || {}} onItemClick={k => setDrill({ title:`Files of Type: ${k}`, filterKey:"file_type", filterValue:k })} /></div>
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
      <div style={S.sectionTitle}>⚙️ Operations Manager Dashboard</div>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:16, marginBottom:16 }}>
        {[["Accessible Files",stats.total,"#1565c0"],["Pending Approval",stats.pending,"#E65100"],["Approved",stats.approved,"#1B5E20"],["Rejected",stats.rejected,"#B71C1C"]].map(([l,v,c])=>(
          <div key={l} style={{ background:`linear-gradient(135deg,${c},${c}dd)`, borderRadius:10, padding:20, color:"#fff", minWidth:0, boxShadow:"0 2px 8px rgba(0,0,0,0.12)", cursor:"pointer" }} onClick={() => setDrill({ title:`Files with status: ${l}`, filterKey:"status", filterValue:l==="Accessible Files"?"":l })}><div style={{ fontSize:12, fontWeight:600, opacity:0.85, marginBottom:8, textTransform:"uppercase", letterSpacing:0.5 }}>{l}</div><div style={{ fontSize:32, fontWeight:800 }}>{v}</div></div>
        ))}
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(2,1fr)", gap:16, marginBottom:16 }}>
        <div style={{ ...S.card, minWidth:0 }}><div style={{ fontSize:14, fontWeight:700, color:"#0b3d91", marginBottom:12 }}>Files by Section</div><BarChart data={stats.bySection || {}} onItemClick={k => setDrill({ title:`Files in Section: ${k}`, filterKey:"section", filterValue:k })} /></div>
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
  const [myFiles, setMyFiles] = useState([]); const [loading, setLoading] = useState(true);
  const [drill, setDrill] = useState(null);
  useEffect(() => {
    Promise.all([api.getStats(), api.listFiles()]).then(([, all]) => {
      const normalized = (all || []).map(normalizeFile); setMyFiles(normalized.filter(f => f.uploadedBy === user.id));
    }).catch(()=>{ setMyFiles([]); }).finally(()=>setLoading(false));
  }, [user.id]);
  if (loading) return <Spinner />;
  return (
    <div>
      <div style={S.sectionTitle}>📁 Data Creator Dashboard</div>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:16, marginBottom:16 }}>
        {[["My Uploads",myFiles.length,"#0b3d91"],["My Pending",myFiles.filter(f=>f.status==="Pending").length,"#E65100"],["My Approved",myFiles.filter(f=>f.status==="Approved").length,"#1B5E20"]].map(([l,v,c])=>(
          <div key={l} style={{ background:`linear-gradient(135deg,${c},${c}dd)`, borderRadius:10, padding:20, color:"#fff", minWidth:0, boxShadow:"0 2px 8px rgba(0,0,0,0.12)", cursor:"pointer" }} onClick={() => { const s = l==="My Uploads"?"":l.replace("My ",""); setDrill({ title:`${l} (${v})`, filterKey:"status", filterValue:s }); }}><div style={{ fontSize:12, fontWeight:600, opacity:0.85, marginBottom:8, textTransform:"uppercase", letterSpacing:0.5 }}>{l}</div><div style={{ fontSize:32, fontWeight:800 }}>{v}</div></div>
        ))}
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(2,1fr)", gap:16, marginBottom:16 }}>
        <div style={{ ...S.card, minWidth:0 }}><div style={{ fontSize:14, fontWeight:700, color:"#0b3d91", marginBottom:12 }}>My Files by Status</div><PieChart data={{ Approved:myFiles.filter(f=>f.status==="Approved").length, Pending:myFiles.filter(f=>f.status==="Pending").length, Rejected:myFiles.filter(f=>f.status==="Rejected").length }} onItemClick={k => setDrill({ title:`My ${k} Files`, filterKey:"status", filterValue:k })} /></div>
        <div style={{ ...S.card, minWidth:0 }}><div style={{ fontSize:14, fontWeight:700, color:"#0b3d91", marginBottom:12 }}>My Files by Type</div><BarChart data={myFiles.reduce((a,f)=>{a[f.fileType]=(a[f.fileType]||0)+1;return a;},{})} onItemClick={k => setDrill({ title:`My ${k} Files`, filterKey:"file_type", filterValue:k })} /></div>
      </div>
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
      <div style={S.sectionTitle}>👁️ Data Viewer Dashboard</div>
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

function ActionButtonForFile({ f }) {
  const restricted = ["Confidential", "Highly Confidential / Restricted"].includes(f.classification);
  const isSeed = f.filePath && f.filePath.includes("seed_");
  const handleView = async () => {
    try {
      const res = await api.viewFile(f.id);
      if (!res.ok) throw new Error("View failed");
      const blob = await res.blob(); const url = URL.createObjectURL(blob);
      window.open(url, "_blank"); URL.revokeObjectURL(url);
    } catch(e) { alert("View failed: "+e.message); }
  };
  if (isSeed) return <span style={{ fontSize:11, color:"#999", fontStyle:"italic" }}>Mock Data</span>;
  return restricted ? <button style={S.btnSm("secondary")} onClick={handleView}>👁 View</button> : <DownloadButton fileId={f.id} fileName={f.fileName} />;
}

function UploadFile({ onToast }) {
  const empty = { fileType:"", projectName:"", sigNumber:"", dataType:"", section:"", category:"", season:"", block:"", mlBlock:"", location:"", classification:"" };
  const [form, setForm] = useState(empty); const [fileInput, setFileInput] = useState(null); const [loading, setLoading] = useState(false); const fileRef = useRef(null);
  const [fileTypes, setFileTypes] = useState(FILE_TYPES);
  const [dataTypes, setDataTypes] = useState(DATA_TYPES);
  const [sections, setSections] = useState(SECTIONS);
  const [categories, setCategories] = useState(CATEGORIES);
  const [seasons, setSeasons] = useState(SEASONS);
  const [blocks, setBlocks] = useState(BLOCKS);
  const set = (k,v) => setForm(f=>({...f,[k]:v}));
  useEffect(() => {
    api.getLookups("file_type").then(d => setFileTypes(d.map(x=>x.value))).catch(() => {});
    api.getLookups("data_type").then(d => setDataTypes(d.map(x=>x.value))).catch(() => {});
    api.getLookups("section").then(d => setSections(d.map(x=>x.value))).catch(() => {});
    api.getLookups("category").then(d => setCategories(d.map(x=>x.value))).catch(() => {});
    api.getLookups("season").then(d => setSeasons(d.map(x=>x.value))).catch(() => {});
    api.getLookups("block").then(d => setBlocks(d.map(x=>x.value))).catch(() => {});
  }, []);
  const handleSubmit = async () => {
    if (!form.fileType||!form.projectName||!form.dataType||!form.section||!form.category||!form.season||!form.block||!form.classification) { onToast("Please fill all required fields", "error"); return; }
    if (!fileInput) { onToast("Please select a file to upload", "error"); return; }
    const fd = new FormData();
    fd.append("file", fileInput);
    fd.append("file_name", form.projectName + "_" + form.category + "_" + form.season + "." + form.fileType.toLowerCase());
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
    fd.append("file_size", `${(fileInput.size / 1024 / 1024).toFixed(2)} MB`);
    setLoading(true);
    try { await api.uploadFile(fd); onToast("File uploaded successfully! Pending approval.", "success"); setForm(empty); setFileInput(null); if (fileRef.current) fileRef.current.value = ""; } catch(e) { onToast(e.message || "Upload failed", "error"); } finally { setLoading(false); }
  };
  return (
    <div>
      <div style={S.sectionTitle}>⬆️ File Meta Registration Form</div>
      <div style={S.card}>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16 }}>
          <div style={S.formGroup}><label style={S.label}>Upload File *</label><input ref={fileRef} style={S.input} type="file" onChange={e=>setFileInput(e.target.files[0]||null)} /><div style={{ fontSize:11, color:"#999", marginTop:4 }}>Prescribed File Size: Max 1 GB</div></div>
          <div style={S.formGroup}><label style={S.label}>File Type *</label><select style={S.select} value={form.fileType} onChange={e=>set("fileType",e.target.value)}><option value="">Select File Type</option>{fileTypes.map(t=><option key={t}>{t}</option>)}</select></div>
          <div style={S.formGroup}><label style={S.label}>Project Name *</label><input style={S.input} placeholder="e.g. Long-Offset 2D" value={form.projectName} onChange={e=>set("projectName",e.target.value)} /></div>
          <div style={S.formGroup}><label style={S.label}>SIG Number</label><input style={S.input} placeholder="e.g. SIG-532" value={form.sigNumber} onChange={e=>set("sigNumber",e.target.value)} /></div>
          <div style={S.formGroup}><label style={S.label}>Data Type *</label><select style={S.select} value={form.dataType} onChange={e=>set("dataType",e.target.value)}><option value="">Select Data Type</option>{dataTypes.map(t=><option key={t}>{t}</option>)}</select></div>
          <div style={S.formGroup}><label style={S.label}>Section Name *</label><select style={S.select} value={form.section} onChange={e=>set("section",e.target.value)}><option value="">Select Section</option>{sections.map(s=><option key={s}>{s}</option>)}</select></div>
          <div style={{ ...S.formGroup, gridColumn:"1/-1" }}><label style={S.label}>Category *</label><select style={S.select} value={form.category} onChange={e=>set("category",e.target.value)}><option value="">Select Category</option>{categories.map(c=><option key={c}>{c}</option>)}</select></div>
          <div style={S.formGroup}><label style={S.label}>Relevant Year / Field Season *</label><select style={S.select} value={form.season} onChange={e=>set("season",e.target.value)}><option value="">Select Field Season</option>{seasons.map(s=><option key={s}>{s}</option>)}</select></div>
          <div style={S.formGroup}><label style={S.label}>Block Name (Tectonic Block) *</label><select style={S.select} value={form.block} onChange={e=>set("block",e.target.value)}><option value="">Select Tectonic Block</option>{blocks.map(b=><option key={b}>{b}</option>)}</select></div>
          <div style={S.formGroup}><label style={S.label}>ML / PML / OLAP Block</label><input style={S.input} placeholder="e.g. CB-ONHP-2022/2" value={form.mlBlock} onChange={e=>set("mlBlock",e.target.value)} /></div>
          <div style={S.formGroup}><label style={S.label}>Area Name / Location</label><input style={S.input} placeholder="e.g. Jambusar" value={form.location} onChange={e=>set("location",e.target.value)} /></div>
          <div style={{ ...S.formGroup, gridColumn:"1/-1" }}><label style={S.label}>Data Classification *</label>
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
          <button style={{ ...S.btn(), padding:"10px 32px", fontSize:14 }} onClick={handleSubmit} disabled={loading}>{loading ? "Uploading…" : "Submit for Approval"}</button>
          <button style={{ ...S.btn("secondary"), padding:"10px 24px", fontSize:14 }} onClick={()=>{setForm(empty);setFileInput(null);if(fileRef.current)fileRef.current.value="";}}>Reset</button>
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
  const setF = (k,v) => setFilters(f=>({...f,[k]:v||undefined}));
  useEffect(() => {
    api.getLookups("section").then(d => setSections(d.map(x=>x.value))).catch(() => {});
    api.getLookups("file_type").then(d => setFileTypes(d.map(x=>x.value))).catch(() => {});
    api.getLookups("data_type").then(d => setDataTypes(d.map(x=>x.value))).catch(() => {});
    api.getLookups("season").then(d => setSeasons(d.map(x=>x.value))).catch(() => {});
    api.getLookups("block").then(d => setBlocks(d.map(x=>x.value))).catch(() => {});
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
      <div style={S.sectionTitle}>📂 {statusFilter ? statusFilter+" Files" : "File Records"}<span style={{ fontSize:14, background:"#0b3d91", color:"#fff", borderRadius:12, padding:"2px 10px" }}>{files.length}</span></div>
      <div style={S.card}>
        <div style={{ display:"grid", gridTemplateColumns:"2fr 1fr 1fr 1fr 1fr 1fr", gap:12, alignItems:"end" }}>
          <div><label style={S.label}>🔍 Search</label><input style={S.input} placeholder="File name, project, SIG, category, location…" value={search} onChange={e=>setSearch(e.target.value)} /></div>
          <div><label style={S.label}>Section</label><select style={S.select} onChange={e=>setF("section",e.target.value)}><option value="">All</option>{sections.map(s=><option key={s}>{s}</option>)}</select></div>
          <div><label style={S.label}>File Type</label><select style={S.select} onChange={e=>setF("file_type",e.target.value)}><option value="">All</option>{fileTypes.map(t=><option key={t}>{t}</option>)}</select></div>
          <div><label style={S.label}>Data Type</label><select style={S.select} onChange={e=>setF("data_type",e.target.value)}><option value="">All</option>{dataTypes.map(t=><option key={t}>{t}</option>)}</select></div>
          <div><label style={S.label}>Season</label><select style={S.select} onChange={e=>setF("season",e.target.value)}><option value="">All</option>{seasons.slice(0,10).map(s=><option key={s}>{s}</option>)}</select></div>
          <div><label style={S.label}>Block</label><select style={S.select} onChange={e=>setF("block",e.target.value)}><option value="">All</option>{blocks.map(b=><option key={b}>{b}</option>)}</select></div>
        </div>
      </div>
      {!statusFilter && (
        <div style={{ ...S.card, marginBottom:4 }}>
          <div style={{ display:"flex", gap:8, alignItems:"center" }}>
            <label style={{ ...S.label, marginBottom:0, marginRight:8 }}>Classification:</label>
            {["", ...CLASSIFICATIONS].map(c=>(
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
                  <td style={S.td}><span style={{ color:"#0b3d91", fontWeight:600 }}>{f.fileName}</span><br/><span style={{ fontSize:12, color:"#999" }}>{f.fileSize}</span></td>
                  <td style={S.td}><span style={{ background:"#E3F2FD", color:"#1565c0", padding:"2px 8px", borderRadius:4, fontSize:13, fontWeight:700 }}>{f.fileType}</span></td>
                  <td style={S.td}>{f.uploadDate}</td><td style={S.td}>{f.projectName}</td><td style={S.td}>{f.sigNumber||"N/A"}</td>
                  <td style={S.td}>{f.dataType}</td><td style={S.td}>{f.section}</td><td style={S.td}>{f.category}</td>
                  <td style={S.td}>{f.season}</td><td style={S.td}>{f.block}</td><td style={S.td}>{f.location}</td>
                  <td style={S.td}><span style={{ ...S.badge(classColor[f.classification]||"#333"), border:`1px solid ${classColor[f.classification]||"#ccc"}`, fontSize:12 }}>{f.classification}</span></td>
                  <td style={S.td}><span style={{ ...S.badge(statusColor[f.status], statusBg[f.status]) }}>{f.status}</span></td>
                  <td style={S.td}>{canApprove && f.status==="Pending" ? (
                    <div style={{ display:"flex", gap:4, alignItems:"center" }} onClick={e=>e.stopPropagation()}>
                      {["admin","ops_manager"].includes(user.role) && (
                        <select style={{ fontSize:11, padding:"2px 4px", border:"1px solid #ccc", borderRadius:3, maxWidth:100 }}
                          value={approveClass[f.id] || ""}
                          onChange={e=>setApproveClass(p=>({...p,[f.id]:e.target.value}))}>
                          <option value="">Keep as-is</option>
                          {CLASSIFICATIONS.map(c=><option key={c} value={c}>{c}</option>)}
                        </select>
                      )}
                      <button style={S.btnSm("success")} onClick={()=>handleApprove(f)}>✓ Approve</button>
                      <button style={S.btnSm("danger")} onClick={()=>{setRejectModal(f); setRejectReason("");}}>✗ Reject</button>
                    </div>
                  ) : <ActionButtonForFile f={f} />}</td>
                </tr>
              ))}</tbody>
            </table>
        )}
      </div>
      {selected && (
        <div style={{ ...S.card, border:"2px solid #0b3d91" }}>
          <div style={{ fontSize:16, fontWeight:700, color:"#0b3d91", marginBottom:12, paddingBottom:8, borderBottom:"1px solid #f0f0f0" }}>📄 File Details: {selected.fileName}</div>
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
            <div style={{ fontSize:16, fontWeight:700, color:"#B71C1C", marginBottom:12 }}>✗ Reject File</div>
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

function Reports() {
  const [stats, setStats] = useState(null); const [files, setFiles] = useState([]); const [loading, setLoading] = useState(true);
  useEffect(() => {
    Promise.all([api.getStats(), api.listFiles()]).then(([s, f]) => { setStats(s); setFiles((f||[]).map(normalizeFile)); })
      .catch(()=>{ setStats({ total:0, pending:0, approved:0, rejected:0, bySection:{}, byClassification:{}, byType:{} }); setFiles([]); }).finally(()=>setLoading(false));
  }, []);
  if (loading) return <Spinner />;
  return (
    <div>
      <div style={S.sectionTitle}>📈 Reports & Analytics</div>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:4, marginBottom:4 }}>
          {[["Total Files",stats.total],["Approved",stats.approved],["Pending",stats.pending],["Rejected",stats.rejected]].map(([l,v])=>(
            <div key={l} style={{ background:"#fff", borderRadius:6, padding:8, textAlign:"center", boxShadow:"0 1px 3px rgba(0,0,0,0.08)", minWidth:0 }}><div style={{ fontSize:22, fontWeight:800, color:"#0b3d91" }}>{v}</div><div style={{ fontSize:11, color:"#6c757d", textTransform:"uppercase", fontWeight:600 }}>{l}</div></div>
          ))}
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(2,1fr)", gap:4, marginBottom:4 }}>
          <div style={{ ...S.card, minWidth:0 }}><div style={{ fontSize:14, fontWeight:700, color:"#0b3d91", marginBottom:4 }}>Files by Section</div><BarChart data={stats.bySection || {}} /></div>
          <div style={{ ...S.card, minWidth:0 }}><div style={{ fontSize:14, fontWeight:700, color:"#0b3d91", marginBottom:4 }}>Classification Breakdown</div><PieChart data={stats.byClassification || {}} /></div>
          <div style={{ ...S.card, minWidth:0 }}><div style={{ fontSize:14, fontWeight:700, color:"#0b3d91", marginBottom:4 }}>Files by Type</div><BarChart data={stats.byType || {}} /></div>
          <div style={{ ...S.card, minWidth:0 }}><div style={{ fontSize:14, fontWeight:700, color:"#0b3d91", marginBottom:4 }}>Files by Data Type</div><BarChart data={files.reduce((a,f)=>{a[f.dataType]=(a[f.dataType]||0)+1;return a;},{})} /></div>
        </div>
        <div style={S.card}><div style={{ fontSize:14, fontWeight:700, color:"#0b3d91", marginBottom:4 }}>Files by Tectonic Block</div><BarChart data={files.reduce((a,f)=>{a[f.block]=(a[f.block]||0)+1;return a;},{})} /></div>
    </div>
  );
}

function ConfirmDialog({ message, onConfirm, onCancel, loading }) {
  const [pwd, setPwd] = useState("");
  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.5)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:9999 }} onClick={onCancel}>
      <div style={{ background:"#fff", borderRadius:12, padding:24, width:380, boxShadow:"0 8px 32px rgba(0,0,0,0.3)" }} onClick={e=>e.stopPropagation()}>
        <div style={{ fontSize:16, fontWeight:700, color:"#B71C1C", marginBottom:4 }}>⚠️ Confirm Access Grant</div>
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

  const loadData = () => {
    setLoading(true);
    Promise.all([api.listUsers(), api.listPermissions()]).then(([u, p]) => {
      setAllUsers(u||[]);
      setPermUsers((u||[]).filter(x => x.role !== "admin"));
      setPermissions(p || []);
    }).catch(() => {}).finally(() => setLoading(false));
  };
  /* eslint-disable-next-line react-hooks/set-state-in-effect */
  useEffect(() => { loadData(); }, []);

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
      <div style={S.sectionTitle}>🔐 User-Level Classification Access Control</div>
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
      <div style={S.card}>
        <div style={{ fontSize:14, fontWeight:700, color:"#0b3d91", marginBottom:8 }}>
          Grant per-User Classification Access
          <span style={{ fontSize:12, fontWeight:400, color:"#5a6a7a", marginLeft:12 }}>Click a ☐ to toggle access. Admin password required to confirm.</span>
        </div>
        {loading && permUsers.length === 0 ? <Spinner /> : (
          <div style={{ overflowX:"auto" }}>
            <table style={S.table}>
              <thead>
                <tr>
                  <th style={S.th}>User</th>
                  <th style={S.th}>Current Role</th>
                  {CLASSIFICATIONS.map(c => <th key={c} style={{ ...S.th, background:classColor[c], textAlign:"center" }}>{c}</th>)}
                </tr>
              </thead>
              <tbody>
                {permUsers.map(u => (
                  <tr key={u.id}>
                    <td style={S.td}>
                      <strong>{u.name}</strong><br/>
                      <span style={{ fontSize:11, color:"#999" }}>{u.cpf}</span>
                    </td>
                    <td style={S.td}>
                      <span style={{ ...S.badge("#0b3d91","#E3F2FD") }}>{ROLE_LABELS[u.role] || u.role}</span>
                    </td>
                    {CLASSIFICATIONS.map(c => {
                      const granted = hasPermission(u.id, c);
                      return (
                        <td key={c} style={{ ...S.td, textAlign:"center", cursor:"pointer" }}
                          onClick={() => handleToggle(u.id, c, granted)}>
                          <span style={{ fontSize:22, color: granted ? classColor[c] : "#ccc", transition:"color 0.2s" }}
                            onMouseEnter={e => { if (!granted) e.target.style.color = "#0b3d91"; }}
                            onMouseLeave={e => { if (!granted) e.target.style.color = "#ccc"; }}>
                            {granted ? "☑" : "☐"}
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
  const [createForm, setCreateForm] = useState({ cpf:"", name:"", password:"", designation:"", section:"", role_name:"viewer" });
  const setCF = (k,v) => setCreateForm(f=>({...f,[k]:v}));
  const handleCreate = async () => {
    try {
      if (!createForm.cpf || !createForm.password) { onToast("CPF and password required","error"); return; }
      await api.createUser(createForm);
      onToast("User created successfully","success");
      setCreateForm({ cpf:"", name:"", password:"", designation:"", section:"", role_name:"viewer" });
      loadUsers();
    } catch(e) { onToast(e.message || "Create failed","error"); }
  };
  const loadUsers = () => {
    setLoading(true);
    api.listUsers().then(data => setUsers((data||[]).map(u => ({ ...u, role: u.role?.name || u.role_name || "viewer" })))).catch(()=>setUsers([])).finally(()=>setLoading(false));
  };
  useEffect(() => { loadUsers(); }, []);
  const handleRoleChange = async (userId, newRole) => {
    try {
      await api.updateUserRole(userId, newRole);
      onToast("Role updated successfully","success");
      setEditingRole(null);
      loadUsers();
    } catch(e) { onToast(e.message || "Role update failed","error"); }
  };
  return (
    <div>
      <div style={S.sectionTitle}>👥 User Management</div>
      <div style={S.card}>
        {loading ? <Spinner /> : users.length === 0 ? <div style={{ color:"#aaa", textAlign:"center", padding:24 }}>No users found. Run the seed script to populate initial data.</div> : (
          <table style={S.table}>
            <thead><tr>{["CPF","Name","Designation","Section","Level","Role","Actions"].map(h=><th key={h} style={S.th}>{h}</th>)}</tr></thead>
            <tbody>{users.map(u=>(
              <tr key={u.id}>
                <td style={S.td}>{u.cpf}</td>
                <td style={S.td}><strong>{u.name}</strong></td>
                <td style={S.td}>{u.designation}</td>
                <td style={S.td}>{u.section}</td>
                <td style={S.td}>Level-{u.level}</td>
                <td style={S.td}>
                  {editingRole === u.id ? (
                    <select style={{ ...S.select, width:140, fontSize:11 }} value={u.role} onChange={e => handleRoleChange(u.id, e.target.value)}>
                      <option value="admin">admin</option><option value="ops_manager">ops_manager</option><option value="data_creator">data_creator</option><option value="viewer">viewer</option>
                    </select>
                  ) : (
                    <span style={{ ...S.badge(u.role === "admin" ? "#B71C1C" : "#0b3d91", "#E3F2FD") }}>{ROLE_LABELS[u.role] || u.role}</span>
                  )}
                </td>
                <td style={S.td}>
                  {u.role === "admin" ? (
                    <span style={{ fontSize:11, color:"#999" }}>Protected</span>
                  ) : editingRole === u.id ? (
                    <button style={S.btnSm("secondary")} onClick={() => setEditingRole(null)}>Cancel</button>
                  ) : (
                    <button style={S.btnSm("primary")} onClick={() => setEditingRole(u.id)}>Change Role</button>
                  )}
                </td>
              </tr>
            ))}</tbody>
          </table>
        )}
      </div>
      <div style={{ ...S.card, marginTop:4 }}>
        <div style={{ fontSize:14, fontWeight:700, color:"#0b3d91", marginBottom:4 }}>Access Hierarchy Diagram</div>
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
      <div style={{ ...S.card, marginTop:4 }}>
        <div style={{ fontSize:14, fontWeight:700, color:"#0b3d91", marginBottom:4 }}>Create New User (Admin only)</div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:12 }}>
            <input style={S.input} placeholder="CPF" value={createForm.cpf} onChange={e=>setCF('cpf', e.target.value)} />
            <input style={S.input} placeholder="Name" value={createForm.name} onChange={e=>setCF('name', e.target.value)} />
            <input style={S.input} placeholder="Password" value={createForm.password} onChange={e=>setCF('password', e.target.value)} />
            <input style={S.input} placeholder="Designation" value={createForm.designation} onChange={e=>setCF('designation', e.target.value)} />
            <input style={S.input} placeholder="Section" value={createForm.section} onChange={e=>setCF('section', e.target.value)} />
            <select style={S.select} value={createForm.role_name} onChange={e=>setCF('role_name', e.target.value)}>
              <option value="viewer">viewer</option><option value="data_creator">data_creator</option><option value="ops_manager">ops_manager</option><option value="admin">admin</option>
            </select>
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

  useEffect(() => {
    const types = ["section","category","season","block","file_type","data_type","classification"];
    types.forEach(t => {
      api.getLookups(t).then(d => setLookups(p => ({...p, [t]: d}))).catch(() => {});
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

  return (
    <div>
      <div style={S.sectionTitle}>⚙️ Portal Settings</div>
      <div style={S.card}>
        <div style={{ fontSize:14, fontWeight:700, color:"#0b3d91", marginBottom:4 }}>System Configuration</div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
          {[["Portal Name","Advance Data Repository (ADR)"],["Organization","ONGC — Geophysical Services, WON Basin"],["Location","Vadodara, Gujarat"],["Max File Size","1 GB"],["Backup Frequency","Weekly (Auto)"],["Authentication","Domain CPF Login"],["Version","1.0.0"],["Backend","FastAPI + PostgreSQL"],["API Base","http://localhost:8000"]].map(([k,v])=>(
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
                <button style={{ ...S.btnSm("danger"), padding:"2px 8px", fontSize:11 }} onClick={() => handleDelete(item.id)}>✕</button>
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

  const navItems = user ? (MENU_ITEMS[user.role] || []) : [];

  const handleLogin = (u, token) => { setToken(token); setUser(u); sessionStorage.setItem("auth_user", JSON.stringify(u)); setPage("Dashboard"); };
  const handleLogout = () => { setToken(null); setUser(null); sessionStorage.removeItem("auth_user"); sessionStorage.removeItem("auth_token"); setPage("Dashboard"); };

  const renderDashboard = () => {
    if (user.role === "admin") return <AdminDashboard user={user} key={refresh} />;
    if (user.role === "ops_manager") return <OpsDashboard user={user} key={refresh} />;
    if (user.role === "data_creator") return <CreatorDashboard user={user} key={refresh} />;
    return <ViewerDashboard user={user} key={refresh} />;
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
      case "Users": return <UserManagement user={user} onToast={showToast} key={refresh} />;
      case "Access Permissions": return <AccessPermissions user={user} onToast={showToast} />;

      case "Settings": return <Settings user={user} />;
      case "Activity Analytics": return <ActivityAnalytics user={user} />;
      default: return renderDashboard();
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
      <div style={{...S.header, justifyContent:"flex-start", gap:16}}>
        <div style={S.headerTitle}>Advance Data Repository by Geophysical Services | Digital Platform for Secure Storage, Data Management and Access!</div>
        <div style={S.headerRight}>
          <span style={{ fontWeight:700, fontSize:14 }}>{user.name}</span>
          <span style={{ fontSize:12, opacity:0.8 }}>({ROLE_LABELS[user.role]})</span>
          <span style={{ fontSize:12, opacity:0.8 }}>Level: {user.level}</span>
          <div style={{ position:"relative", display:"inline-block" }}>
            <span onClick={() => { fetchNotifs(); setShowNotif(s=>!s); }} style={{ cursor:"pointer", position:"relative", fontSize:18, lineHeight:1, padding:"4px 6px" }}>
              🔔{notifCount > 0 && <span style={{ position:"absolute", top:-4, right:-4, background:"#e74c3c", color:"#fff", fontSize:10, fontWeight:700, padding:"1px 5px", borderRadius:8, minWidth:16, textAlign:"center" }}>{notifCount}</span>}
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

      <div style={S.sidebar}>
        <div style={{ padding:"12px 16px", borderBottom:"1px solid #2f3f4c", fontSize:11, color:"rgba(255,255,255,0.5)", textTransform:"uppercase", letterSpacing:1 }}>Navigation</div>
        {navItems.filter(m=>m!=="Logout").map(m=>(
          <a key={m} style={S.sideLink(page===m)} onClick={()=>setPage(m)}>
            {m}
          </a>
        ))}
      </div>

      <div style={S.main}>{renderPage()}</div>

      {toast && <Toast msg={toast.msg} type={toast.type} onClose={()=>setToast(null)} />}
    </div>
  );
}
