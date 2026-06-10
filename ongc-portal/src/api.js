// ─────────────────────────────────────────────────────────────────────────────
// API SERVICE — connects to FastAPI backend at http://localhost:8000
// ─────────────────────────────────────────────────────────────────────────────
const BASE = "http://localhost:8000";

let _token = sessionStorage.getItem("auth_token");

export function setToken(t) { _token = t; if (t) sessionStorage.setItem("auth_token", t); else sessionStorage.removeItem("auth_token"); }
export function getToken() { return _token; }

async function request(method, path, body, isForm = false) {
  const headers = {};
  if (_token) headers["Authorization"] = `Bearer ${_token}`;
  if (!isForm) headers["Content-Type"] = "application/json";

  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: isForm ? body : body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    let err;
    try { const d = await res.json(); err = d.detail || JSON.stringify(d); } catch { err = "Request failed"; }
    throw new Error(err);
  }
  return res.json();
}

export const api = {
  // AUTH
  login: async (cpf, password) => {
    const form = new URLSearchParams();
    form.append("username", cpf);
    form.append("password", password);
    const res = await fetch(`${BASE}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: form,
    });
    if (!res.ok) {
      let err;
      try { const d = await res.json(); err = d.detail || "Invalid CPF or password"; } catch { err = "Invalid CPF or password"; }
      throw new Error(err);
    }
    return res.json(); // { access_token, token_type, user }
  },

  // DASHBOARD
  getStats: () => request("GET", "/api/dashboard/stats"),

  // FILES
  listFiles: () => request("GET", "/api/files/"),
  searchFiles: (params) => {
    const q = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => { if (v) q.append(k, v); });
    return request("GET", `/api/files/search?${q.toString()}`);
  },
  uploadFile: (formData) => {
    const headers = {};
    if (_token) headers["Authorization"] = `Bearer ${_token}`;
    return fetch(`${BASE}/api/files/upload`, {
      method: "POST", headers, body: formData,
    }).then(async (res) => {
      if (!res.ok) {
        let err;
        try { const d = await res.json(); err = d.detail || "Upload failed"; } catch { err = "Upload failed"; }
        throw new Error(err);
      }
      return res.json();
    });
  },
  downloadFile: (fileId) => {
    const headers = {};
    if (_token) headers["Authorization"] = `Bearer ${_token}`;
    return fetch(`${BASE}/api/files/download/${fileId}`, { headers });
  },
  viewFile: (fileId) => {
    const headers = {};
    if (_token) headers["Authorization"] = `Bearer ${_token}`;
    return fetch(`${BASE}/api/files/view/${fileId}`, { headers });
  },

  // APPROVALS
  approveFile: (fileId, classification) => {
    let url = `/api/approvals/approve/${fileId}`;
    if (classification) url += `?classification=${encodeURIComponent(classification)}`;
    return request("POST", url);
  },
  rejectFile: (fileId, comment) => request("POST", `/api/approvals/reject/${fileId}`, { comment }),

  // USERS
  listUsers: () => request("GET", "/api/users/"),
  createUser: (payload) => request("POST", "/api/users/create", payload),
  updateUserRole: (userId, role_name) => request("PUT", `/api/users/${userId}/role`, { role_name }),

  // NOTIFICATIONS
  listNotifications: () => request("GET", "/api/notifications/"),
  markNotificationRead: (id) => request("POST", `/api/notifications/mark-read/${id}`),
  markAllNotificationsRead: () => request("POST", "/api/notifications/mark-all-read"),

  // ACTIVITY
  activitySummary: (period) => request("GET", `/api/activity/summary?period=${period}`),
  exportActivity: async (period) => {
    const headers = {};
    if (_token) headers["Authorization"] = `Bearer ${_token}`;
    const res = await fetch(`${BASE}/api/activity/export?period=${period}`, { headers });
    if (!res.ok) throw new Error("Export failed");
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `activity_${period}.xlsx`; a.click();
    URL.revokeObjectURL(url);
  },

  // REPORTS
  monthlyReport: () => request("GET", "/api/reports/monthly"),

  // DATABASE BROWSER (admin only)
  listAllTables: () => request("GET", "/api/db/tables"),

  // PERMISSIONS (admin only)
  listPermissions: () => request("GET", "/api/permissions/"),
  togglePermission: (user_id, classification, grant, admin_password) =>
    request("POST", "/api/permissions/toggle", { user_id, classification, grant, admin_password }),

  // ─── AI ASSISTANT ───
  aiChat: (message, conversation_id) =>
    request("POST", "/api/ai/chat", { message, conversation_id }),

  listConversations: () => request("GET", "/api/ai/conversations"),
  createConversation: (title) => request("POST", "/api/ai/conversations", { title }),
  getConversation: (convId) => request("GET", `/api/ai/conversations/${convId}`),
  deleteConversation: (convId) => request("DELETE", `/api/ai/conversations/${convId}`),

  // AI Search
  aiSearch: (query, searchType = "hybrid", topK = 10) =>
    request("POST", "/api/ai/search", { query, search_type: searchType, top_k: topK }),

  // Document Indexing
  indexFile: (fileId) => request("POST", `/api/ai/index-file/${fileId}`),
  indexStatus: (fileId) => request("GET", `/api/ai/index-status/${fileId}`),
  reindexAll: () => request("POST", "/api/ai/reindex-all"),
  vectorStats: () => request("GET", "/api/ai/vector-stats"),

  // Summarize
  summarizeFile: (fileId) => request("GET", `/api/ai/summarize/${fileId}`),
  relatedDocuments: (fileId) => request("GET", `/api/ai/related/${fileId}`),

  // Knowledge Graph
  getKnowledgeGraph: () => request("GET", "/api/ai/knowledge-graph"),
  getKGEntities: () => request("GET", "/api/ai/knowledge-graph/entities"),
  getKGRelationships: () => request("GET", "/api/ai/knowledge-graph/relationships"),
  getKGStats: () => request("GET", "/api/ai/knowledge-graph/stats"),

  // SQL Agent
  sqlQuery: (query) => request("POST", "/api/ai/sql-query", { query }),

  // Report Generation
  generateReport: (topic, format = "pdf") =>
    request("POST", "/api/ai/generate-report", { topic, format }),
  downloadReport: (filePath) =>
    fetch(`${BASE}/api/ai/download-report?file_path=${encodeURIComponent(filePath)}`, {
      headers: _token ? { Authorization: `Bearer ${_token}` } : {},
    }),

  // Audit Logs (admin)
  getAuditLog: (limit = 50) => request("GET", `/api/ai/audit-log?limit=${limit}`),
  getAuditStats: () => request("GET", "/api/ai/audit-stats"),

  // ─── LOOKUPS (dropdown data from DB) ───
  getLookups: (type) => request("GET", `/api/lookup/${type}`),
  addLookup: (type, value, sort_order = 0) =>
    request("POST", `/api/lookup/${type}`, { value, sort_order }),
  updateLookup: (type, id, payload) =>
    request("PUT", `/api/lookup/${type}/${id}`, payload),
  deleteLookup: (type, id) => request("DELETE", `/api/lookup/${type}/${id}`),
};
