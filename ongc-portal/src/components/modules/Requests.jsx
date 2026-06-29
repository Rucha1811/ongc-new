import { useState, useEffect } from "react";
import { api } from "../../api";
import { S, th, td } from "../shared/styles";

export function Requests({ user, onToast }) {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: "", description: "", target_type: "general" });
  const [comment, setComment] = useState("");
  const [actionTarget, setActionTarget] = useState(null);

  const role = user?.role || "viewer";

  const load = async () => {
    setLoading(true);
    const d = await api.listRequests().catch(() => []);
    setRequests(d || []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const handleCreate = async () => {
    if (!form.title) { onToast?.("Title required", "error"); return; }
    await api.createRequest(form.title, form.description, form.target_type).catch(() => {
      onToast?.("Failed to create request", "error");
    });
    onToast?.("Request submitted", "success");
    setForm({ title: "", description: "", target_type: "general" });
    setShowForm(false);
    load();
  };

  const badge = (status) => {
    const colors = { pending: "#f57c00", ops_approved: "#1565c0", approved: "#2e7d32", rejected: "#c62828" };
    const labels = { pending: "Pending", ops_approved: "Ops Approved", approved: "Approved", rejected: "Rejected" };
    return <span style={{ display: "inline-block", padding: "2px 8px", borderRadius: 10, fontSize: 11, fontWeight: 600, color: "#fff", background: colors[status] || "#888" }}>{labels[status] || status}</span>;
  };

  const canAct = (req) => {
    if (role === "admin") return req.status !== "approved" && req.status !== "rejected";
    if (role === "ops_manager") return req.status === "pending";
    return false;
  };

  const handleApproveOps = async (id) => {
    await api.approveOps(id, comment).catch(() => { onToast?.("Failed", "error"); return; });
    onToast?.("Approved at ops level", "success");
    setActionTarget(null); setComment(""); load();
  };
  const handleApproveAdmin = async (id) => {
    await api.approveAdmin(id, comment).catch(() => { onToast?.("Failed", "error"); return; });
    onToast?.("Approved at admin level", "success");
    setActionTarget(null); setComment(""); load();
  };
  const handleReject = async (id) => {
    if (!comment) { onToast?.("Comment required for rejection", "error"); return; }
    await api.rejectRequest(id, comment).catch(() => { onToast?.("Failed", "error"); return; });
    onToast?.("Request rejected", "success");
    setActionTarget(null); setComment(""); load();
  };

  if (loading) return <div style={S.page}><div style={{ textAlign: "center", padding: 40, fontSize: 14, color: "#888" }}>Loading requests...</div></div>;

  return (
    <div style={S.page}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <div style={S.title}>Requests</div>
        <button style={{ padding: "5px 12px", border: "none", borderRadius: 4, background: "#0b3d91", color: "#fff", fontWeight: 600, fontSize: 12, cursor: "pointer" }} onClick={() => setShowForm(!showForm)}>{showForm ? "Close" : "+ New Request"}</button>
      </div>

      {showForm && (
        <div style={{ background: "#fff", borderRadius: 8, padding: "20px 24px", boxShadow: "0 1px 4px rgba(0,0,0,0.1)", maxWidth: 600, margin: "0 auto 16px" }}>
          <div style={S.sectionTitle}>Create Request</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={S.field}><label style={S.label}>Title *</label><input style={S.input} value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} placeholder="What do you need?" /></div>
            <div style={S.field}><label style={S.label}>Description</label><textarea style={S.input} rows={3} value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} placeholder="Provide details..." /></div>
            <div style={S.field}><label style={S.label}>Type</label>
              <select style={S.input} value={form.target_type} onChange={e => setForm(p => ({ ...p, target_type: e.target.value }))}>
                <option value="general">General</option>
                <option value="edit">Edit Access</option>
                <option value="access">Data Access</option>
              </select>
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
            <button style={S.btnSm()} onClick={handleCreate}>Submit</button>
            <button style={{ ...S.btnSm("#888") }} onClick={() => setShowForm(false)}>Cancel</button>
          </div>
        </div>
      )}

      <div style={S.section}>
        <div style={S.sectionTitle}>All Requests</div>
        {(requests.length === 0) ? (
          <div style={{ textAlign: "center", padding: 30, color: "#888", fontSize: 13 }}>No requests yet</div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead><tr>
              <th style={th}>ID</th>
              <th style={th}>Title</th>
              <th style={th}>Type</th>
              <th style={th}>Status</th>
              <th style={th}>Description</th>
              <th style={th}>Ops Comment</th>
              <th style={th}>Admin Comment</th>
              <th style={th}>Actions</th>
            </tr></thead>
            <tbody>{requests.map((r, i) => (
              <tr key={r.id} style={{ background: i % 2 === 0 ? "#fff" : "#f8f9fa" }}>
                <td style={td}>{r.id}</td>
                <td style={{ ...td, fontWeight: 600 }}>{r.title}</td>
                <td style={td}>{r.target_type}</td>
                <td style={td}>{badge(r.status)}</td>
                <td style={{ ...td, maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis" }}>{r.description}</td>
                <td style={{ ...td, fontSize: 12, color: "#666" }}>{r.ops_comment}</td>
                <td style={{ ...td, fontSize: 12, color: "#666" }}>{r.admin_comment}</td>
                <td style={td}>
                  {canAct(r) && actionTarget === r.id ? (
                    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                      <input style={{ ...S.input, fontSize: 11, padding: "2px 6px" }} placeholder="Comment (required for reject)" value={comment} onChange={e => setComment(e.target.value)} />
                      <div style={{ display: "flex", gap: 4 }}>
                        {role === "admin" && <button style={{ fontSize: 11, padding: "2px 8px", border: "none", borderRadius: 3, background: "#2e7d32", color: "#fff", cursor: "pointer" }} onClick={() => handleApproveAdmin(r.id)}>Approve</button>}
                        {role === "ops_manager" && <button style={{ fontSize: 11, padding: "2px 8px", border: "none", borderRadius: 3, background: "#1565c0", color: "#fff", cursor: "pointer" }} onClick={() => handleApproveOps(r.id)}>Approve</button>}
                        <button style={{ fontSize: 11, padding: "2px 8px", border: "none", borderRadius: 3, background: "#c62828", color: "#fff", cursor: "pointer" }} onClick={() => handleReject(r.id)}>Reject</button>
                        <button style={{ fontSize: 11, padding: "2px 8px", border: "none", borderRadius: 3, background: "#888", color: "#fff", cursor: "pointer" }} onClick={() => { setActionTarget(null); setComment(""); }}>Cancel</button>
                      </div>
                    </div>
                  ) : canAct(r) ? (
                    <button style={{ fontSize: 11, padding: "2px 8px", border: "none", borderRadius: 3, background: "#0b3d91", color: "#fff", cursor: "pointer" }} onClick={() => setActionTarget(r.id)}>Act</button>
                  ) : (
                    <span style={{ fontSize: 11, color: "#999" }}>—</span>
                  )}
                </td>
              </tr>
            ))}</tbody>
          </table>
        )}
      </div>
    </div>
  );
}
