import { useState } from "react";
import { api } from "../../api";

const DOC_TYPES = ["Report","Data Set","Invoice","Contract","Technical Document","Administrative","Other"];
const CLASSIFICATION_OPTS = ["General / Available for All","Sensitive / Internal Use","Confidential","Highly Confidential / Restricted"];

export function MiniUpload({ user, fields, section, onUpload, onToast }) {
  const [file, setFile] = useState(null);
  const [vals, setVals] = useState({});
  const [docType, setDocType] = useState("");
  const [classification, setClassification] = useState("");
  const [description, setDescription] = useState("");
  const [uploading, setUploading] = useState(false);
  const toast = (m,t) => { if (onToast) onToast(m,t); else alert(m); };
  const canUpload = user?.role === "admin" || user?.role === "ops_manager" || user?.role === "data_creator";
  if (!canUpload) return null;

  const handle = async () => {
    if (!file) { toast("Select a file", "error"); return; }
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("file_name", file.name);
      fd.append("file_type", file.name.split(".").pop().toUpperCase());
      fd.append("section", section);
      fd.append("classification", classification || "General / Available for All");
      fd.append("doc_type", docType);
      fd.append("description", description);
      for (const k of Object.keys(fields)) {
        if (vals[k]) fd.append(k, vals[k]);
      }
      await api.uploadFile(fd);
      toast("Uploaded successfully", "success");
      setFile(null);
      setVals({});
      setDocType("");
      setClassification("");
      setDescription("");
      onUpload?.();
    } catch(e) {
      toast(e.message || "Upload failed", "error");
    }
    setUploading(false);
  };

  return (
    <div style={{background:"#f8faff",borderRadius:8,padding:16,marginBottom:20,border:"1px solid #d0d8e8"}}>
      <div style={{fontSize:14,fontWeight:600,marginBottom:12,paddingBottom:6,borderBottom:"1px solid #e0e4e8",color:"#333"}}>
        Upload Document — {section}
      </div>
      <div style={{display:"flex",flexWrap:"wrap",gap:10}}>
        <div style={{display:"flex",flexDirection:"column",gap:2,minWidth:160,flex:1}}>
          <label style={{fontSize:14,fontWeight:600,color:"#555"}}>File *</label>
          <input type="file" style={{padding:"6px 0",fontSize:15}} onChange={e=>setFile(e.target.files?.[0]||null)} />
        </div>
        <div style={{display:"flex",flexDirection:"column",gap:2,minWidth:140}}>
          <label style={{fontSize:14,fontWeight:600,color:"#555"}}>Document Type</label>
          <select style={{padding:"6px 10px",border:"1px solid #ddd",borderRadius:4,fontSize:15,background:"#fff"}} value={docType} onChange={e=>setDocType(e.target.value)}>
            <option value="">— Select —</option>
            {DOC_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div style={{display:"flex",flexDirection:"column",gap:2,minWidth:120}}>
          <label style={{fontSize:14,fontWeight:600,color:"#555"}}>Classification</label>
          <select style={{padding:"6px 10px",border:"1px solid #ddd",borderRadius:4,fontSize:15,background:"#fff"}} value={classification} onChange={e=>setClassification(e.target.value)}>
            <option value="">— Select —</option>
            {CLASSIFICATION_OPTS.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        {Object.entries(fields).map(([key, label]) => (
          <div key={key} style={{display:"flex",flexDirection:"column",gap:2,minWidth:130}}>
            <label style={{fontSize:14,fontWeight:600,color:"#555"}}>{label}</label>
            <input style={{padding:"6px 10px",border:"1px solid #ddd",borderRadius:4,fontSize:15}} value={vals[key]||""} onChange={e=>setVals(p=>({...p,[key]:e.target.value}))} />
          </div>
        ))}
        <div style={{display:"flex",flexDirection:"column",gap:2,minWidth:"100%"}}>
          <label style={{fontSize:14,fontWeight:600,color:"#555"}}>Description / Remarks</label>
          <textarea style={{padding:"6px 10px",border:"1px solid #ddd",borderRadius:4,fontSize:15,resize:"vertical",minHeight:50}} value={description} onChange={e=>setDescription(e.target.value)} placeholder="Brief description of the document..." rows={2} />
        </div>
      </div>
      <div style={{marginTop:12,display:"flex",gap:8}}>
        <button style={{padding:"7px 18px",border:"none",borderRadius:4,background:"#0b3d91",color:"#fff",fontWeight:600,fontSize:15,cursor:"pointer",opacity:uploading||!file?0.6:1}} disabled={uploading||!file} onClick={handle}>
          {uploading ? "Uploading..." : "Upload File"}
        </button>
        <span style={{fontSize:14,color:"#999",alignSelf:"center"}}>Uploaded by: {user?.name || user?.cpf || "—"}</span>
      </div>
    </div>
  );
}
