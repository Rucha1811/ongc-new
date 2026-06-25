import { useState } from "react";

const FIELD_OPTIONS = {
  target: [
    { value: "title", label: "Title" },
    { value: "target_value", label: "Target Value" },
    { value: "unit", label: "Unit" },
    { value: "section", label: "Section" },
    { value: "fiscal_year", label: "Fiscal Year" },
    { value: "description", label: "Description" },
  ],
  highlight: [
    { value: "title", label: "Title" },
    { value: "description", label: "Description" },
    { value: "author", label: "Author" },
    { value: "icon", label: "Icon" },
  ],
  report: [
    { value: "title", label: "Title" },
    { value: "category", label: "Category" },
    { value: "author", label: "Author" },
    { value: "status", label: "Status" },
  ],
  project: [
    { value: "project_name", label: "Project Name" },
    { value: "number", label: "SIG No." },
    { value: "survey_type", label: "Survey Type" },
    { value: "contractor_name", label: "Contractor / Agency" },
    { value: "area_name", label: "Area Name" },
    { value: "section", label: "Section" },
    { value: "gp_code", label: "GP Code" },
    { value: "year_field_season", label: "Field Season" },
    { value: "target_vs_achievement", label: "Volume" },
    { value: "project_highlights", label: "Remarks" },
    { value: "location", label: "Location" },
    { value: "category", label: "Category" },
    { value: "party_chief", label: "Party Chief" },
    { value: "start_date", label: "Start Date" },
    { value: "end_date", label: "End Date" },
    { value: "status", label: "Status" },
  ],
};

export default function ExcelUploadModal({ show, onClose, onToast, apiPreview, apiImport, fields, onSuccess }) {
  const [excelFile, setExcelFile] = useState(null);
  const [excelPreview, setExcelPreview] = useState(null);
  const [excelMapping, setExcelMapping] = useState({});
  const [excelLoading, setExcelLoading] = useState(false);

  if (!show) return null;

  const fieldOpts = FIELD_OPTIONS[fields] || FIELD_OPTIONS.project;

  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",zIndex:1000,display:"flex",alignItems:"center",justifyContent:"center"}}
      onClick={() => { onClose(); setExcelPreview(null); setExcelFile(null); }}>
      <div style={{background:"#fff",borderRadius:12,padding:24,maxWidth:700,width:"90%",maxHeight:"85vh",overflow:"auto"}}
        onClick={e => e.stopPropagation()}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
          <div style={{fontSize:18,fontWeight:700,color:"#0b3d91"}}>Upload Excel</div>
          <button style={{background:"none",border:"none",fontSize:20,cursor:"pointer",color:"#666"}}
            onClick={() => { onClose(); setExcelPreview(null); setExcelFile(null); }}>✕</button>
        </div>

        {!excelPreview ? (
          <div>
            <p style={{fontSize:13,color:"#666",marginBottom:12}}>Select an Excel file (.xlsx) to bulk import. Column names are auto-detected.</p>
            <input type="file" accept=".xlsx" onChange={async e => {
              const file = e.target.files?.[0];
              if (!file) return;
              setExcelFile(file);
              setExcelLoading(true);
              try {
                const fd = new FormData();
                fd.append("file", file);
                const data = await apiPreview(fd);
                setExcelPreview(data);
                if (data.auto) setExcelMapping(data.auto_mapping);
                else setExcelMapping({});
              } catch (err) {
                onToast?.(err.message, "error");
                setExcelPreview(null);
                setExcelFile(null);
              }
              setExcelLoading(false);
            }} />
            {excelLoading && <div style={{textAlign:"center",padding:20,color:"#999"}}>Reading Excel file...</div>}
          </div>
        ) : (
          <div>
            <div style={{marginBottom:12,fontSize:13,color:"#555"}}>
              Sheet: <strong>{excelPreview.sheet_name}</strong> · {excelPreview.row_count} rows · {excelPreview.columns.length} columns
              {excelPreview.sheets?.length > 1 && (
                <select style={{marginLeft:12,padding:"4px 8px",border:"1px solid #ddd",borderRadius:4,fontSize:12}}
                  value={excelPreview.sheet_name}
                  onChange={async e => {
                    setExcelLoading(true);
                    try {
                      const fd = new FormData();
                      fd.append("file", excelFile);
                      fd.append("sheet_name", e.target.value);
                      const data = await apiPreview(fd);
                      setExcelPreview(data);
                      if (data.auto) setExcelMapping(data.auto_mapping);
                      else setExcelMapping({});
                    } catch (err) {
                      onToast?.(err.message, "error");
                    }
                    setExcelLoading(false);
                  }}>
                  {excelPreview.sheets.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              )}
            </div>

            {excelPreview.duplicate_count > 0 && (
              <div style={{padding:"8px 12px",background:"#FFF3E0",borderRadius:6,fontSize:12,color:"#E65100",marginBottom:12}}>
                ⚠ {excelPreview.duplicate_count} row(s) have the same title as existing records. They will be <strong>skipped</strong> on import.
              </div>
            )}

            {excelPreview.auto ? (
              <div style={{padding:"8px 12px",background:"#E8F5E9",borderRadius:6,fontSize:12,color:"#1B5E20",marginBottom:12}}>
                ✓ All columns auto-matched. Ready to import.
              </div>
            ) : (
              <>
                <div style={{fontSize:12,fontWeight:600,marginBottom:8,color:"#333"}}>
                  Some column names couldn't be auto-matched. Please map them:
                </div>
                {excelPreview.columns.map(col => (
                  <div key={col} style={{display:"flex",gap:8,alignItems:"center",marginBottom:6}}>
                    <span style={{minWidth:120,fontSize:12,fontWeight:600,color: excelPreview.auto_mapping[col] ? "#1B5E20" : "#c62828"}}>{col}</span>
                    <span style={{color:"#999"}}>→</span>
                    <select style={{flex:1,padding:"4px 8px",border:"1px solid #ddd",borderRadius:4,fontSize:12}}
                      value={excelMapping[col] || excelPreview.auto_mapping[col] || ""}
                      onChange={e => setExcelMapping(m => ({...m, [col]: e.target.value}))}>
                      <option value="">— Skip this column —</option>
                      {fieldOpts.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
                    </select>
                  </div>
                ))}
              </>
            )}

            <div style={{marginTop:12,fontSize:12,color:"#999"}}>
              Preview: {excelPreview.preview.map((row,i) => (
                <div key={i} style={{padding:"2px 0",borderBottom:"1px solid #f0f0f0"}}>
                  Row {i+1}: {excelPreview.columns.map(c => row[c]).join(" | ")}
                </div>
              ))}
            </div>

            <div style={{display:"flex",gap:8,justifyContent:"flex-end",marginTop:16}}>
              <button style={{padding:"8px 16px",border:"1px solid #ddd",borderRadius:4,background:"#fff",cursor:"pointer",fontSize:13}}
                onClick={() => { setExcelPreview(null); setExcelFile(null); }}>Back</button>
              <button style={{padding:"8px 16px",border:"none",borderRadius:4,background:"#0b3d91",color:"#fff",cursor:"pointer",fontSize:13,fontWeight:600}}
                onClick={async () => {
                  setExcelLoading(true);
                  try {
                    const fd = new FormData();
                    fd.append("file", excelFile);
                    fd.append("mapping", JSON.stringify(excelMapping));
                    fd.append("conflict", "skip");
                    if (excelPreview.sheet_name) fd.append("sheet_name", excelPreview.sheet_name);
                    const data = await apiImport(fd);
                    onToast?.(data.msg || `${data.imported} imported successfully`, "success");
                    onClose();
                    setExcelPreview(null);
                    setExcelFile(null);
                    setExcelMapping({});
                    if (onSuccess) onSuccess();
                  } catch (err) {
                    onToast?.(err.message, "error");
                  }
                  setExcelLoading(false);
                }}>{excelLoading ? "Importing..." : `Import ${excelPreview.row_count} rows`}</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
