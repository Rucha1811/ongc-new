import { useState, useEffect } from "react";
import { api } from "../../api";

const S = {
  page: { padding:0, maxWidth:"none", margin:0 },
  title: { fontSize:22, fontWeight:700, marginBottom:20, color:"#0b3d91" },
  section: { background:"#fff", borderRadius:8, padding:16, marginBottom:16, boxShadow:"0 1px 4px rgba(0,0,0,0.1)" },
  card: { background:"#fff", borderRadius:8, padding:16, boxShadow:"0 1px 4px rgba(0,0,0,0.1)" },
  input: { padding:"10px 14px", border:"1px solid #d0d5dd", borderRadius:6, fontSize:16, outline:"none" },
  select: { padding:"10px 14px", border:"1px solid #d0d5dd", borderRadius:6, fontSize:16, outline:"none", background:"#fff" },
};

const LEVEL_ORDER = ["E7","E6","E5","E4","E3","E2","E1","E0","<E0","F3","F2","F1","A4","A3","A2","A1","W5","W4","W3","W2","W1","S1","S2","Other"];

function sortLevel(a, b) {
  const ai = LEVEL_ORDER.indexOf(a), bi = LEVEL_ORDER.indexOf(b);
  return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
}

function disciplineFromDesig(desig) {
  if (!desig) return "Unknown";
  const d = desig.toLowerCase();
  if (d.includes("geophysicist") || d.includes("geophy")) return "Geophysics";
  if (d.includes("survey")) return "Survey";
  if (d.includes("electron") || d.includes("e&t")) return "Electronics";
  if (d.includes("programm") || d.includes("sci. asst")) return "Programming / Sci. Asst";
  if (d.includes("driver") || d.includes("winch")) return "Driver / Winch";
  if (d.includes("mechanic") || d.includes("mechanical")) return "Mechanical";
  if (d.includes("engineer")) return "Engineering";
  if (d.includes("worker") || d.includes("office") || d.includes("attendant") || d.includes("mvd")) return "Support";
  if (d.includes("assistant") || d.includes("deputy")) return "Assistant";
  if (d.includes("manager") || d.includes("chief") || d.includes("head")) return "Management";
  return "Other";
}

const CHART_COLORS = ["#0b3d91","#2e7d32","#E65100","#6a1b9a","#00838f","#c62828","#558b2f","#283593","#ad1457","#4e342e","#78909c","#f57f17"];

function VerticalBar({ data, label, colorMap }) {
  const maxVal = Math.max(...Object.values(data), 1);
  const entries = Object.entries(data).sort(([a],[b]) => {
    if (label === "Level") return sortLevel(a, b);
    return b.toLowerCase() < a.toLowerCase() ? 1 : -1;
  });
  const barW = Math.min(40, Math.max(16, 360 / entries.length));
  const svgW = Math.max(400, entries.length * (barW + 8) + 40);
  return (
    <div>
      <div style={{fontSize:14,fontWeight:700,color:"#0b3d91",marginBottom:8}}>{label} Wise Manpower</div>
      <svg width={svgW} height={200} viewBox={`0 0 ${svgW} 200`}>
        {entries.map(([k, v], i) => {
          const h = (v / maxVal) * 140;
          const x = 20 + i * (barW + 8);
          const c = colorMap?.[k] || CHART_COLORS[i % CHART_COLORS.length];
          return (
            <g key={k}>
              <rect x={x} y={150 - h} width={barW} height={h} fill={c} rx={3}>
                <title>{k}: {v}</title>
              </rect>
              <text x={x + barW / 2} y={148 - h - 4} textAnchor="middle" fontSize={10} fontWeight={700} fill={c}>{v}</text>
              <text x={x + barW / 2} y={170} textAnchor="middle" fontSize={9} fill="#555">{k}</text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

function PieChart({ data, label }) {
  const total = Object.values(data).reduce((s, v) => s + v, 0) || 1;
  const entries = Object.entries(data).sort(([,a],[,b]) => b - a);
  const cx = 100, cy = 100, r = 80;
  let cumAngle = -Math.PI / 2;
  const slices = entries.map(([k, v]) => {
    const angle = (v / total) * 2 * Math.PI;
    const start = cumAngle;
    const end = cumAngle + angle;
    cumAngle = end;
    return { key: k, value: v, start, end, pct: Math.round((v / total) * 100) };
  });
  const hasSmall = slices.filter(s => s.pct < 3).length > 0;
  const shown = hasSmall ? slices.filter(s => s.pct >= 3) : slices;
  return (
    <div>
      <div style={{fontSize:14,fontWeight:700,color:"#0b3d91",marginBottom:8}}>{label} Wise Manpower</div>
      <div style={{display:"flex",alignItems:"center",gap:16,flexWrap:"wrap"}}>
        <svg width={200} height={200} viewBox="0 0 200 200">
          {slices.map((s, i) => {
            const x1 = cx + r * Math.cos(s.start), y1 = cy + r * Math.sin(s.start);
            const x2 = cx + r * Math.cos(s.end), y2 = cy + r * Math.sin(s.end);
            const large = s.end - s.start > Math.PI ? 1 : 0;
            const c = CHART_COLORS[i % CHART_COLORS.length];
            if (s.value / total >= 0.001) {
              return <path key={s.key} d={`M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} Z`} fill={c}><title>{s.key}: {s.value} ({s.pct}%)</title></path>;
            }
            return null;
          })}
        </svg>
        <div style={{fontSize:12,lineHeight:1.6}}>
          {shown.map((s, i) => (
            <div key={s.key} style={{display:"flex",alignItems:"center",gap:6}}>
              <span style={{display:"inline-block",width:10,height:10,borderRadius:2,background:CHART_COLORS[i % CHART_COLORS.length]}} />
              <span style={{fontWeight:600,color:"#333"}}>{s.key}</span>
              <span style={{color:"#888"}}>{s.value} ({s.pct}%)</span>
            </div>
          ))}
          {hasSmall && <div style={{color:"#999",fontSize:11,marginTop:4}}>{slices.filter(s => s.pct < 3).length} small items omitted</div>}
        </div>
      </div>
    </div>
  );
}

export function ManpowerStatus({ user, onToast }) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showDir, setShowDir] = useState(false);
  const [search, setSearch] = useState("");

  const load = async () => {
    setLoading(true);
    const emps = await api.stage2Manpower().catch(() => []);
    setData(emps || []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const bySection = {};
  const byLevel = {};
  const byDiscipline = {};
  for (const e of data) {
    const sec = e.section || "Unknown";
    bySection[sec] = (bySection[sec] || 0) + 1;
    const lvl = e.level || "Unknown";
    byLevel[lvl] = (byLevel[lvl] || 0) + 1;
    const disc = disciplineFromDesig(e.designation);
    byDiscipline[disc] = (byDiscipline[disc] || 0) + 1;
  }

  const sections = Object.keys(bySection).sort();
  const allLevels = Object.keys(byLevel).sort(sortLevel);

  const filtered = data.filter(e => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (e.name||"").toLowerCase().includes(q) ||
      (e.designation||"").toLowerCase().includes(q) ||
      (e.cpf_no||"").includes(q) ||
      (e.assignment||"").toLowerCase().includes(q);
  });

  if (loading) return <div style={S.page}><div style={{textAlign:"center",padding:40,fontSize:14,color:"#888"}}>Loading manpower data...</div></div>;

  return (
    <div style={S.page}>
      <div style={{...S.title,marginBottom:12}}>Manpower Status — Geophysical Services</div>

      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:12,marginBottom:16}}>
        <div style={{background:"#fff",borderRadius:8,padding:"14px 18px",boxShadow:"0 1px 4px rgba(0,0,0,0.08)",textAlign:"center"}}>
          <div style={{fontSize:26,fontWeight:800,color:"#0b3d91"}}>{data.length}</div>
          <div style={{fontSize:11,color:"#888",fontWeight:600,marginTop:2}}>Total Employees</div>
        </div>
        <div style={{background:"#fff",borderRadius:8,padding:"14px 18px",boxShadow:"0 1px 4px rgba(0,0,0,0.08)",textAlign:"center"}}>
          <div style={{fontSize:26,fontWeight:800,color:"#2e7d32"}}>{sections.length}</div>
          <div style={{fontSize:11,color:"#888",fontWeight:600,marginTop:2}}>Sections / Parties</div>
        </div>
        <div style={{background:"#fff",borderRadius:8,padding:"14px 18px",boxShadow:"0 1px 4px rgba(0,0,0,0.08)",textAlign:"center"}}>
          <div style={{fontSize:26,fontWeight:800,color:"#E65100"}}>{allLevels.length}</div>
          <div style={{fontSize:11,color:"#888",fontWeight:600,marginTop:2}}>Levels</div>
        </div>
      </div>

      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16,marginBottom:16}}>
        <div style={S.card}>
          <VerticalBar data={byLevel} label="Level" />
        </div>
        <div style={S.card}>
          <VerticalBar data={byDiscipline} label="Discipline" />
        </div>
      </div>

      <div style={{...S.card,marginBottom:16}}>
        <PieChart data={bySection} label="Section" />
      </div>

      <div style={S.card}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
          <div style={{fontSize:14,fontWeight:700,color:"#0b3d91"}}>
            Employee Directory {search && <span style={{fontWeight:400,color:"#888"}}>({filtered.length} found)</span>}
          </div>
          <button style={{padding:"4px 12px",border:"1px solid #d0d5dd",borderRadius:4,background:"#fff",color:"#555",fontWeight:600,fontSize:12,cursor:"pointer"}}
            onClick={() => setShowDir(!showDir)}>{showDir ? "Hide" : "Show"}</button>
        </div>
        {showDir && (
          <>
            <div style={{display:"flex",gap:10,flexWrap:"wrap",marginBottom:12}}>
              <input style={{...S.input,flex:1,minWidth:200}} placeholder="Search by name, designation, CPF, assignment…" value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            {filtered.length === 0 ? (
              <div style={{textAlign:"center",padding:20,color:"#999",fontSize:14}}>No employees found.</div>
            ) : (
              <div style={{overflowX:"auto",maxHeight:500,overflowY:"auto"}}>
                <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
                  <thead>
                    <tr style={{background:"#f5f7fa",position:"sticky",top:0}}>
                      <th style={{textAlign:"left",padding:"6px 10px",borderBottom:"2px solid #e0e4e8",fontWeight:600,color:"#555"}}>CPF No</th>
                      <th style={{textAlign:"left",padding:"6px 10px",borderBottom:"2px solid #e0e4e8",fontWeight:600,color:"#555"}}>Name</th>
                      <th style={{textAlign:"left",padding:"6px 10px",borderBottom:"2px solid #e0e4e8",fontWeight:600,color:"#555"}}>Designation</th>
                      <th style={{textAlign:"left",padding:"6px 10px",borderBottom:"2px solid #e0e4e8",fontWeight:600,color:"#555"}}>Section</th>
                      <th style={{textAlign:"center",padding:"6px 10px",borderBottom:"2px solid #e0e4e8",fontWeight:600,color:"#555"}}>Level</th>
                      <th style={{textAlign:"left",padding:"6px 10px",borderBottom:"2px solid #e0e4e8",fontWeight:600,color:"#555"}}>Assignment</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((e, i) => (
                      <tr key={e.id} style={{background:i%2===0?"#fff":"#f8f9fa",borderBottom:"1px solid #f0f4f8"}}>
                        <td style={{padding:"5px 10px",fontWeight:500,color:"#333",fontSize:13}}>{e.cpf_no || "—"}</td>
                        <td style={{padding:"5px 10px",fontWeight:600,color:"#0b3d91",fontSize:13}}>{e.name}</td>
                        <td style={{padding:"5px 10px",color:"#555",fontSize:12}}><span style={{background:"#e8eaf6",color:"#283593",padding:"1px 5px",borderRadius:3}}>{e.designation || "—"}</span></td>
                        <td style={{padding:"5px 10px",fontSize:12}}><span style={{background:"#e0f2f1",color:"#00695c",padding:"1px 6px",borderRadius:3,fontWeight:600}}>{e.section}</span></td>
                        <td style={{padding:"5px 10px",textAlign:"center",fontSize:12}}><span style={{background:"#fce4ec",color:"#c62828",padding:"1px 6px",borderRadius:3,fontWeight:700}}>{e.level || "—"}</span></td>
                        <td style={{padding:"5px 10px",color:"#555",fontSize:12}}>{e.assignment || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
