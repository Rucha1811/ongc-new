import { useState, useEffect } from "react";
import { api } from "../../api";
import { S, th } from "../shared/styles";
import { MiniUpload } from "../shared/MiniUpload";
import { FileTableSection } from "../shared/FileTableSection";
import ExcelUploadModal from "../ExcelUploadModal";



export function Highlights({ user, onToast }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ title:"", description:"", author:"", icon:"🏆" });
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [pageCats, setPageCats] = useState([]);
  const [fv, setFv] = useState(0);
  const canEdit = user?.role === "admin" || user?.role === "ops_manager" || user?.role === "data_creator";
  const hlToast = (msg, type) => { if (onToast) onToast(msg, type); else alert(msg); };
  const [showExcelHighlightModal, setShowExcelHighlightModal] = useState(false);

  const load = async () => {
    setLoading(true);
    const data = await api.listHighlights().catch(() => []);
    setItems(data || []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const openNew = () => { setEditing(null); setForm({ title:"", description:"", author: user?.name || "" }); setShowForm(true); };
  const openEdit = (h) => { setEditing(h); setForm({ title:h.title, description:h.description, author:h.author }); setShowForm(true); };

  const handleSave = async () => {
    if (!form.title || !form.description) { onToast?.("Title and description required", "error"); return; }
    if (editing) {
      await api.updateHighlight(editing.id, form).catch(() => { onToast?.("Failed to update", "error"); return; });
      onToast?.("Highlight updated", "success");
    } else {
      await api.createHighlight(form.title, form.description, form.author).catch(() => { onToast?.("Failed to create", "error"); return; });
      onToast?.("Highlight created", "success");
    }
    setShowForm(false); setEditing(null); load();
  };

  const handleDelete = async (id) => {
    if (!confirm("Delete this highlight?")) return;
    await api.deleteHighlight(id).catch(() => { onToast?.("Failed to delete", "error"); return; });
    onToast?.("Highlight deleted", "success");
    load();
  };

  if (loading) return <div style={S.page}><div style={{textAlign:"center",padding:40,fontSize:14,color:"#888"}}>Loading highlights...</div></div>;
  const [showUp, setShowUp] = useState(false);

  return (
    <div style={S.page}>
      {pageCats.length > 0 && (
        <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:10,alignItems:"center"}}>
          <span style={{fontSize:12,fontWeight:600,color:"#666"}}>Categories:</span>
          {pageCats.map(c => (
            <span key={c} style={{display:"inline-block",padding:"2px 10px",borderRadius:12,fontSize:12,fontWeight:600,background:"#e8edf2",color:"#0b3d91"}}>{c}</span>
          ))}
        </div>
      )}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:24, flexWrap:"wrap", gap:8 }}>
        <div style={S.title}>Highlights</div>
        <div style={{display:"flex",gap:6}}>
          {canEdit && <button style={{...S.btnSm(),display:"flex",alignItems:"center",gap:4}} onClick={openNew}>+ Add Highlight</button>}
          {canEdit && <button style={{padding:"5px 12px",border:"none",borderRadius:4,background:"#0b3d91",color:"#fff",fontWeight:600,fontSize:12,cursor:"pointer"}} onClick={()=>setShowExcelHighlightModal(true)}>📥 Excel</button>}
          <button style={{padding:"5px 12px",border:"none",borderRadius:4,background:showUp?"#e74c3c":"#0b3d91",color:"#fff",fontWeight:600,fontSize:12,cursor:"pointer",display:"flex",alignItems:"center",gap:4}} onClick={()=>setShowUp(!showUp)}>
            {showUp ? "Close" : "Upload"}
          </button>
        </div>
      </div>

      {showUp && <MiniUpload user={user} section="Highlights" fields={{title:"Title",category:"Category"}} onUpload={() => setFv(x=>x+1)} onToast={hlToast} />}

      {showForm && (
        <div style={{...S.section, background:"#f8faff", border:"1px solid #d0d8e8"}}>
          <div style={{...S.sectionTitle, border:"none", marginBottom:12}}>{editing ? "Edit Highlight" : "New Highlight"}</div>
          <div style={{display:"flex",flexDirection:"column",gap:10}}>
            <input style={S.input} value={form.title} onChange={e=>setForm(p=>({...p,title:e.target.value}))} placeholder="Highlight title" />
            <textarea style={S.textarea} value={form.description} onChange={e=>setForm(p=>({...p,description:e.target.value}))} placeholder="Description of the achievement..." rows={3} />
            <div style={{display:"flex",gap:12,alignItems:"center"}}>
              <input style={{...S.input,flex:1}} value={form.author} onChange={e=>setForm(p=>({...p,author:e.target.value}))} placeholder="Author name" />
            </div>
            <div style={{display:"flex",gap:8}}>
              <button style={S.btnSm()} onClick={handleSave}>{editing ? "Update" : "Create"}</button>
              <button style={{...S.btnSm("#999")}} onClick={()=>{setShowForm(false);setEditing(null);}}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {items.length === 0 ? (
        <div style={{textAlign:"center",padding:"40px 20px",color:"#999",fontSize:14}}>
          No highlights yet. {canEdit ? 'Click "+ Add Highlight" to create the first one.' : ""}
        </div>
      ) : (
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
          {items.map(h => (
            <div key={h.id} style={{...S.card, borderLeft:"4px solid #0b3d91", position:"relative"}}>
              {canEdit && (
                <div style={{position:"absolute",top:8,right:8,display:"flex",gap:4}}>
                  <button style={{fontSize:12,padding:"2px 8px",border:"none",borderRadius:3,background:"#e3f2fd",color:"#1565c0",cursor:"pointer"}} onClick={()=>openEdit(h)}>Edit</button>
                  <button style={{fontSize:12,padding:"2px 8px",border:"none",borderRadius:3,background:"#ffebee",color:"#c62828",cursor:"pointer"}} onClick={()=>handleDelete(h.id)}>Del</button>
                </div>
              )}
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
                <div style={{fontSize:15,fontWeight:700,color:"#0b3d91"}}>{h.title}</div>
                <span style={{fontSize:14,color:"#999"}}>{h.created_at ? new Date(h.created_at).toLocaleDateString() : ""}</span>
              </div>
              <div style={{fontSize:13,color:"#555",lineHeight:1.5,marginBottom:8}}>{h.description}</div>
              <div style={{fontSize:14,color:"#888",fontStyle:"italic"}}>— {h.author}</div>
            </div>
          ))}
        </div>
      )}
      <FileTableSection section="Highlights" version={fv} />

      <ExcelUploadModal
        show={showExcelHighlightModal}
        onClose={() => setShowExcelHighlightModal(false)}
        onToast={onToast}
        apiPreview={api.excelHighlightPreview}
        apiImport={api.excelHighlightImport}
        fields="highlight"
        onSuccess={() => { load(); }}
      />
    </div>
  );
}

