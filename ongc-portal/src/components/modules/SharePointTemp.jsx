import { useState, useEffect } from "react";
import { api } from "../../api";
import { S, th, td, badge } from "../shared/styles";



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

