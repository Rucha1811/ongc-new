export const S = {
  page: { padding:0, maxWidth:"none", margin:0 },
  title: { fontSize:22, fontWeight:700, marginBottom:20, color:"#0b3d91" },
  section: { background:"#fff", borderRadius:8, padding:16, marginBottom:16, boxShadow:"0 1px 4px rgba(0,0,0,0.1)" },
  sectionTitle: { fontSize:16, fontWeight:600, marginBottom:16, paddingBottom:8, borderBottom:"1px solid #eee", color:"#333" },
  grid: { display:"grid", gridTemplateColumns:"1fr 1fr", gap:16 },
  field: { display:"flex", flexDirection:"column", gap:4 },
  label: { fontSize:15, fontWeight:600, color:"#555" },
  input: { padding:"10px 14px", border:"1px solid #d0d5dd", borderRadius:6, fontSize:16, outline:"none" },
  select: { padding:"10px 14px", border:"1px solid #d0d5dd", borderRadius:6, fontSize:16, outline:"none", background:"#fff" },
  btn: { padding:"10px 24px", border:"none", borderRadius:4, cursor:"pointer", fontSize:15, fontWeight:600 },
  btnSm: (bg) => ({ padding:"6px 14px", border:"none", borderRadius:4, cursor:"pointer", fontSize:14, fontWeight:600, background: bg||"#0b3d91", color:"#fff" }),
  btnActive: () => ({ padding:"5px 12px", border:"none", borderRadius:4, cursor:"pointer", fontSize:12, fontWeight:600, background:"#0b3d91", color:"#fff" }),
  btnInactive: () => ({ padding:"5px 12px", border:"1px solid #d0d5dd", borderRadius:4, cursor:"pointer", fontSize:12, fontWeight:600, background:"#fff", color:"#555" }),
  card: { background:"#fff", borderRadius:8, padding:16, boxShadow:"0 1px 4px rgba(0,0,0,0.1)" },
};

export const mockProjects = ["Long-Offset 2D Cambay","3D Survey Jambusar","VSP Mehsana","2D Reconnaissance Kutch","3D High-Res Ahmedabad"];
export const mockBlocks = ["CB-ONHP-2022/1","CB-ONHP-2022/2","Cambay Block","Kutch Block","Mehsana Block","Ahmedabad Block"];

export const th = { padding:"8px 12px", textAlign:"left", borderBottom:"2px solid #e0e4e8", fontSize:16, fontWeight:600, color:"#333", background:"#f5f7fa" };
export const td = { padding:"8px 12px", borderBottom:"1px solid #f0f4f8", fontSize:16 };
export const badge = (bg) => ({ padding:"2px 10px", borderRadius:4, fontSize:15, fontWeight:600, background:bg+"22", color:bg });

export const C2 = { blue:"#0b3d91", dark:"#1a1a2e", green:"#1B5E20", orange:"#E65100", red:"#c62828" };

export const C0 = { blue:"#1565C0", green:"#2E7D32", orange:"#E65100", red:"#C62828", purple:"#6A1B9A", teal:"#00838F" };
