import { useState, useEffect } from "react";
import { api } from "../api";

const CLASS_COLORS = {
  "General / Available for All": "#1B5E20",
  "Sensitive / Internal Use": "#E65100",
  "Confidential": "#B71C1C",
  "Highly Confidential / Restricted": "#7B1FA2",
};

const CARD = { background: "#fff", borderRadius: 10, boxShadow: "0 1px 4px rgba(0,0,0,0.08)", padding: 20 };
const SECTION_TITLE = { fontSize: 20, fontWeight: 700, color: "#0b3d91", marginBottom: 16, display: "flex", alignItems: "center", gap: 8 };

export default function AIAssistant({ user }) {
  const [query, setQuery] = useState("");
  const [searchType, setSearchType] = useState("hybrid");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [files, setFiles] = useState([]);
  const [indexing, setIndexing] = useState(null);

  useEffect(() => {
    api.listFiles().then(d => setFiles(d || [])).catch(() => {});
  }, []);

  const handleSearch = async () => {
    if (!query.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await api.aiSearch(query, searchType, 20);
      const raw = res.results || [];
      const seen = new Set();
      const deduped = [];
      for (const r of raw) {
        if (!seen.has(r.file_id)) {
          seen.add(r.file_id);
          deduped.push(r);
        }
      }
      setResults(deduped);
    } catch (e) {
      setError(e.message);
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const handleIndex = async (fileId) => {
    setIndexing(fileId);
    try {
      await api.indexFile(fileId);
      setResults([]);
    } catch (e) {
      setError(e.message);
    } finally {
      setIndexing(null);
    }
  };

  const confidenceColor = (c) => {
    if (c >= 80) return { color: "#1B5E20", bg: "#E8F5E9" };
    if (c >= 50) return { color: "#E65100", bg: "#FFF3E0" };
    return { color: "#B71C1C", bg: "#FFEBEE" };
  };

  return (
    <div>
      <div style={SECTION_TITLE}>Search Documents</div>

      <div style={{ ...CARD, marginBottom: 16 }}>
        <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
          <input
            style={{ padding: "10px 14px", border: "1px solid #d0d7e2", borderRadius: 8, fontSize: 14, flex: 1, outline: "none", background: "#fff" }}
            placeholder="Search across all indexed documents…"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleSearch()}
          />
          <select
            style={{ padding: "8px 12px", border: "1px solid #d0d7e2", borderRadius: 8, fontSize: 13, background: "#fff" }}
            value={searchType}
            onChange={e => setSearchType(e.target.value)}
          >
            <option value="keyword">Keyword</option>
            <option value="semantic">Semantic</option>
            <option value="hybrid">Hybrid</option>
          </select>
          <button
            style={{ padding: "10px 24px", borderRadius: 6, border: "none", cursor: "pointer", fontWeight: 600, fontSize: 14, background: "#0b3d91", color: "#fff" }}
            onClick={handleSearch}
            disabled={loading || !query.trim()}
          >
            {loading ? "Searching…" : "Search"}
          </button>
        </div>

        {error && (
          <div style={{ padding: "10px 14px", background: "#FFEBEE", color: "#B71C1C", borderRadius: 6, fontSize: 13, marginBottom: 12 }}>
            {error}
          </div>
        )}

        {!loading && results.length === 0 && query && (
          <div style={{ textAlign: "center", padding: 40, color: "#999", fontSize: 13 }}>No results found.</div>
        )}

        {!loading && results.length === 0 && !query && (
          <div style={{ textAlign: "center", padding: 40, color: "#999", fontSize: 13 }}>Enter a query to search indexed documents.</div>
        )}

        {results.map((r, i) => {
          const cc = confidenceColor(r.confidence || 0);
          return (
            <div key={i} style={{ padding: "14px", marginBottom: 8, background: "#f8f9fa", borderRadius: 8, border: "1px solid #e9ecef" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 13, color: "#0b3d91", fontWeight: 700 }}>
                    {r.file_name}{r.page_number ? ` (Page ${r.page_number})` : ""}
                  </span>
                  {r.classification && (
                    <span style={{ fontSize: 10, fontWeight: 600, padding: "2px 6px", borderRadius: 4, background: CLASS_COLORS[r.classification] + "18", color: CLASS_COLORS[r.classification] }}>
                      {r.classification}
                    </span>
                  )}
                </div>
                <span style={{ fontSize: 12, fontWeight: 700, padding: "2px 8px", borderRadius: 4, background: cc.bg, color: cc.color }}>
                  {r.confidence !== undefined ? `${r.confidence.toFixed(0)}%` : `${((1 - (r.score || 0)) * 100).toFixed(0)}%`}
                </span>
              </div>
              <div style={{ fontSize: 13, color: "#1a1a2e", lineHeight: 1.5, maxHeight: 120, overflow: "hidden" }}>
                {r.text || r.chunk_text}
              </div>
              <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                {r.file_id && (
                  <>
                    <button style={{ fontSize: 11, padding: "4px 10px", background: "#E3F2FD", border: "1px solid #90CAF9", borderRadius: 4, cursor: "pointer", color: "#0b3d91" }}
                      onClick={() => window.open(`/api/files/view/${r.file_id}`, "_blank")}>
                      View
                    </button>
                    <button style={{ fontSize: 11, padding: "4px 10px", background: "#F3E5F5", border: "1px solid #CE93D8", borderRadius: 4, cursor: "pointer", color: "#7B1FA2" }}
                      onClick={() => window.open(`/api/files/download/${r.file_id}`, "_blank")}>
                      Download
                    </button>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div style={{ ...CARD }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: "#0b3d91", marginBottom: 12 }}>Indexed Files</div>
        {files.length === 0 ? (
          <div style={{ color: "#999", fontSize: 13 }}>No files uploaded yet.</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {files.filter(f => f.status === "Approved").map(f => (
              <div key={f.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 0", borderBottom: "1px solid #f0f4f8", fontSize: 13 }}>
                <span style={{ color: "#0b3d91" }}>{f.file_name}</span>
                <button
                  style={{ fontSize: 11, padding: "3px 10px", borderRadius: 4, border: "none", cursor: "pointer", fontWeight: 600, background: "#0b3d91", color: "#fff" }}
                  onClick={() => handleIndex(f.id)}
                  disabled={indexing === f.id}
                >
                  {indexing === f.id ? "Indexing…" : "Index"}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
