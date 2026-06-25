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
  getModuleSummary: () => request("GET", "/api/dashboard/module-summary"),

  // FILES
  listFiles: (section) => request("GET", section ? `/api/files/?section=${encodeURIComponent(section)}` : "/api/files/"),
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
  parseExcel: (file) => {
    const fd = new FormData();
    fd.append("file", file);
    const headers = {};
    if (_token) headers["Authorization"] = `Bearer ${_token}`;
    return fetch(`${BASE}/api/files/parse-excel`, {
      method: "POST", headers, body: fd,
    }).then(async (res) => {
      if (!res.ok) {
        let err;
        try { const d = await res.json(); err = d.detail || "Parse failed"; } catch { err = "Parse failed"; }
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
  updateFile: (fileId, data) => request("PATCH", `/api/files/${fileId}`, data),

  // USERS
  listUsers: () => request("GET", "/api/users/"),
  createUser: (payload) => request("POST", "/api/users/create", payload),
  updateUserRole: (userId, role_name) => request("PUT", `/api/users/${userId}/role`, { role_name }),
  updateUserProfile: (userId, payload) => request("PUT", `/api/users/${userId}/profile`, payload),
  deriveFields: (section, area) => request("GET", `/api/users/derive?section=${encodeURIComponent(section)}&area=${encodeURIComponent(area||"")}`),
  listSectionConfig: () => request("GET", "/api/users/section-config"),

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

  // ─── PROJECTS ───
  listProjects: () => request("GET", "/api/projects/"),
  getProject: (id) => request("GET", `/api/projects/${id}`),
  updateProject: (id, data) => request("PATCH", `/api/projects/${id}`, data),
  createProject: (formData) => {
    const headers = {};
    if (_token) headers["Authorization"] = `Bearer ${_token}`;
    return fetch(`${BASE}/api/projects/create`, {
      method: "POST", headers, body: formData,
    }).then(async (res) => {
      if (!res.ok) { let d; try { d = await res.json(); throw new Error(d.detail || "Create failed"); } catch(e) { throw e; } }
      return res.json();
    });
  },
  deleteProject: (id) => request("DELETE", `/api/projects/${id}`),
  excelPreview: (formData) => {
    const headers = {};
    if (_token) headers["Authorization"] = `Bearer ${_token}`;
    return fetch(`${BASE}/api/projects/upload-excel/preview`, {
      method: "POST", headers, body: formData,
    }).then(async (res) => {
      if (!res.ok) { let d; try { d = await res.json(); throw new Error(d.detail || "Preview failed"); } catch(e) { throw e; } }
      return res.json();
    });
  },
  excelImport: (formData) => {
    const headers = {};
    if (_token) headers["Authorization"] = `Bearer ${_token}`;
    return fetch(`${BASE}/api/projects/upload-excel/import`, {
      method: "POST", headers, body: formData,
    }).then(async (res) => {
      if (!res.ok) { let d; try { d = await res.json(); throw new Error(d.detail || "Import failed"); } catch(e) { throw e; } }
      return res.json();
    });
  },
  uploadProjectFile: (projectId, formData) => {
    const headers = {};
    if (_token) headers["Authorization"] = `Bearer ${_token}`;
    return fetch(`${BASE}/api/projects/${projectId}/upload`, {
      method: "POST", headers, body: formData,
    }).then(async (res) => {
      if (!res.ok) { let d; try { d = await res.json(); throw new Error(d.detail || "Upload failed"); } catch(e) { throw e; } }
      return res.json();
    });
  },

  // ─── TARGETS ───
  listTargets: () => request("GET", "/api/targets/"),
  createTarget: (title, target_value, unit = "SKM", section = null, fiscal_year = null, description = null) => {
    const params = new URLSearchParams();
    params.set("title", title);
    params.set("target_value", String(target_value));
    params.set("unit", unit);
    if (section) params.set("section", section);
    if (fiscal_year) params.set("fiscal_year", fiscal_year);
    if (description) params.set("description", description);
    const headers = { "Content-Type": "application/x-www-form-urlencoded" };
    if (_token) headers["Authorization"] = `Bearer ${_token}`;
    return fetch(`${BASE}/api/targets/create`, {
      method: "POST", headers, body: params,
    }).then(async (res) => {
      if (!res.ok) { let d; try { d = await res.json(); throw new Error(d.detail || "Create failed"); } catch(e) { throw e; } }
      return res.json();
    });
  },
  addAccomplishment: (targetId, value, description) => {
    const params = new URLSearchParams();
    params.set("value", String(value));
    if (description) params.set("description", description);
    const headers = { "Content-Type": "application/x-www-form-urlencoded" };
    if (_token) headers["Authorization"] = `Bearer ${_token}`;
    return fetch(`${BASE}/api/targets/${targetId}/accomplish`, {
      method: "POST", headers, body: params,
    }).then(async (res) => {
      if (!res.ok) { let d; try { d = await res.json(); throw new Error(d.detail || "Failed"); } catch(e) { throw e; } }
      return res.json();
    });
  },
  deleteTarget: (targetId) => request("DELETE", `/api/targets/${targetId}`),
  excelTargetPreview: (formData) => {
    const headers = {};
    if (_token) headers["Authorization"] = `Bearer ${_token}`;
    return fetch(`${BASE}/api/targets/upload-excel/preview`, {
      method: "POST", headers, body: formData,
    }).then(async (res) => {
      if (!res.ok) { let d; try { d = await res.json(); throw new Error(d.detail || "Preview failed"); } catch(e) { throw e; } }
      return res.json();
    });
  },
  excelTargetImport: (formData) => {
    const headers = {};
    if (_token) headers["Authorization"] = `Bearer ${_token}`;
    return fetch(`${BASE}/api/targets/upload-excel/import`, {
      method: "POST", headers, body: formData,
    }).then(async (res) => {
      if (!res.ok) { let d; try { d = await res.json(); throw new Error(d.detail || "Import failed"); } catch(e) { throw e; } }
      return res.json();
    });
  },

  // ─── HIGHLIGHTS ───
  listHighlights: () => request("GET", "/api/highlights/"),
  createHighlight: (title, description, author, icon) => {
    const params = new URLSearchParams();
    params.set("title", title);
    params.set("description", description);
    if (author) params.set("author", author);
    if (icon) params.set("icon", icon);
    const headers = { "Content-Type": "application/x-www-form-urlencoded" };
    if (_token) headers["Authorization"] = `Bearer ${_token}`;
    return fetch(`${BASE}/api/highlights/create`, { method: "POST", headers, body: params }).then(r=>r.json());
  },
  updateHighlight: (id, data) => {
    const params = new URLSearchParams();
    Object.entries(data).forEach(([k,v]) => { if (v) params.set(k, v); });
    const headers = { "Content-Type": "application/x-www-form-urlencoded" };
    if (_token) headers["Authorization"] = `Bearer ${_token}`;
    return fetch(`${BASE}/api/highlights/${id}`, { method: "PUT", headers, body: params }).then(r=>r.json());
  },
  deleteHighlight: (id) => request("DELETE", `/api/highlights/${id}`),
  excelHighlightPreview: (formData) => {
    const headers = {};
    if (_token) headers["Authorization"] = `Bearer ${_token}`;
    return fetch(`${BASE}/api/highlights/upload-excel/preview`, {
      method: "POST", headers, body: formData,
    }).then(async (res) => {
      if (!res.ok) { let d; try { d = await res.json(); throw new Error(d.detail || "Preview failed"); } catch(e) { throw e; } }
      return res.json();
    });
  },
  excelHighlightImport: (formData) => {
    const headers = {};
    if (_token) headers["Authorization"] = `Bearer ${_token}`;
    return fetch(`${BASE}/api/highlights/upload-excel/import`, {
      method: "POST", headers, body: formData,
    }).then(async (res) => {
      if (!res.ok) { let d; try { d = await res.json(); throw new Error(d.detail || "Import failed"); } catch(e) { throw e; } }
      return res.json();
    });
  },

  // ─── TECHNICAL REPORTS ───
  listTechnicalReports: (category) => request("GET", category ? `/api/technical-reports/?category=${encodeURIComponent(category)}` : "/api/technical-reports/"),
  createTechnicalReport: (title, category, author, status) => {
    const params = new URLSearchParams();
    params.set("title", title);
    if (category) params.set("category", category);
    if (author) params.set("author", author);
    if (status) params.set("status", status);
    const headers = { "Content-Type": "application/x-www-form-urlencoded" };
    if (_token) headers["Authorization"] = `Bearer ${_token}`;
    return fetch(`${BASE}/api/technical-reports/create`, { method: "POST", headers, body: params }).then(r=>r.json());
  },
  updateTechnicalReport: (id, data) => {
    const params = new URLSearchParams();
    Object.entries(data).forEach(([k,v]) => { if (v) params.set(k, v); });
    const headers = { "Content-Type": "application/x-www-form-urlencoded" };
    if (_token) headers["Authorization"] = `Bearer ${_token}`;
    return fetch(`${BASE}/api/technical-reports/${id}`, { method: "PUT", headers, body: params }).then(r=>r.json());
  },
  deleteTechnicalReport: (id) => request("DELETE", `/api/technical-reports/${id}`),
  excelReportPreview: (formData) => {
    const headers = {};
    if (_token) headers["Authorization"] = `Bearer ${_token}`;
    return fetch(`${BASE}/api/technical-reports/upload-excel/preview`, {
      method: "POST", headers, body: formData,
    }).then(async (res) => {
      if (!res.ok) { let d; try { d = await res.json(); throw new Error(d.detail || "Preview failed"); } catch(e) { throw e; } }
      return res.json();
    });
  },
  excelReportImport: (formData) => {
    const headers = {};
    if (_token) headers["Authorization"] = `Bearer ${_token}`;
    return fetch(`${BASE}/api/technical-reports/upload-excel/import`, {
      method: "POST", headers, body: formData,
    }).then(async (res) => {
      if (!res.ok) { let d; try { d = await res.json(); throw new Error(d.detail || "Import failed"); } catch(e) { throw e; } }
      return res.json();
    });
  },

  // ─── REPORT BUILDER ───
  listReportTemplates: () => request("GET", "/api/report-builder/templates"),
  createReportTemplate: (name, description, period_type, sections) => {
    const params = new URLSearchParams();
    params.set("name", name);
    if (description) params.set("description", description);
    params.set("period_type", period_type);
    params.set("sections", JSON.stringify(sections));
    const headers = {};
    if (getToken()) headers["Authorization"] = `Bearer ${getToken()}`;
    return fetch(`${BASE}/api/report-builder/templates/create`, {
      method: "POST", headers: {...headers, "Content-Type": "application/x-www-form-urlencoded"}, body: params,
    }).then(async (r) => { if (!r.ok) { const d = await r.json(); throw new Error(d.detail || "Failed"); } return r.json(); });
  },
  updateReportTemplate: (id, data) => {
    const params = new URLSearchParams();
    Object.entries(data).forEach(([k,v]) => { if (v) params.set(k, v); });
    if (data.sections) params.set("sections", JSON.stringify(data.sections));
    const headers = {};
    if (getToken()) headers["Authorization"] = `Bearer ${getToken()}`;
    return fetch(`${BASE}/api/report-builder/templates/${id}`, {
      method: "PUT", headers: {...headers, "Content-Type": "application/x-www-form-urlencoded"}, body: params,
    }).then(async (r) => { if (!r.ok) { const d = await r.json(); throw new Error(d.detail || "Failed"); } return r.json(); });
  },
  deleteReportTemplate: (id) => request("DELETE", `/api/report-builder/templates/${id}`),
  listReportPeriods: (template_id) => request("GET", template_id ? `/api/report-builder/periods?template_id=${template_id}` : "/api/report-builder/periods"),
  createReportPeriod: (template_id, label, start_date, end_date) => {
    const params = new URLSearchParams();
    params.set("template_id", template_id); params.set("label", label);
    if (start_date) params.set("start_date", start_date);
    if (end_date) params.set("end_date", end_date);
    const headers = {};
    if (getToken()) headers["Authorization"] = `Bearer ${getToken()}`;
    return fetch(`${BASE}/api/report-builder/periods/create`, {
      method: "POST", headers: {...headers, "Content-Type": "application/x-www-form-urlencoded"}, body: params,
    }).then(async (r) => { if (!r.ok) { const d = await r.json(); throw new Error(d.detail || "Failed"); } return r.json(); });
  },
  closeReportPeriod: (id) => request("POST", `/api/report-builder/periods/${id}/close`),
  updatePeriodAssignments: (period_id, assignments) => {
    const params = new URLSearchParams();
    params.set("assignments", JSON.stringify(assignments));
    const headers = {};
    if (getToken()) headers["Authorization"] = `Bearer ${getToken()}`;
    return fetch(`${BASE}/api/report-builder/periods/${period_id}/assignments`, {
      method: "PUT", headers: {...headers, "Content-Type": "application/x-www-form-urlencoded"}, body: params,
    }).then(async (r) => { if (!r.ok) { const d = await r.json(); throw new Error(d.detail || "Failed"); } return r.json(); });
  },
  getPeriodAssignments: (period_id) => request("GET", `/api/report-builder/periods/${period_id}/assignments`),
  listReportSubmissions: (period_id, section_key, assigned_to) => {
    let url = "/api/report-builder/submissions?";
    if (period_id) url += `period_id=${period_id}&`;
    if (section_key) url += `section_key=${section_key}&`;
    if (assigned_to) url += `assigned_to=${assigned_to}&`;
    return request("GET", url);
  },
  saveReportSubmission: (period_id, section_key, assigned_to, field_values, status) => {
    const params = new URLSearchParams();
    params.set("period_id", period_id); params.set("section_key", section_key);
    if (assigned_to) params.set("assigned_to", assigned_to);
    params.set("field_values", JSON.stringify(field_values));
    params.set("status", status);
    const headers = {};
    if (getToken()) headers["Authorization"] = `Bearer ${getToken()}`;
    return fetch(`${BASE}/api/report-builder/submissions/save`, {
      method: "POST", headers: {...headers, "Content-Type": "application/x-www-form-urlencoded"}, body: params,
    }).then(async (r) => { if (!r.ok) { const d = await r.json(); throw new Error(d.detail || "Failed"); } return r.json(); });
  },
  exportReport: (period_id, format) => {
    const headers = {};
    if (getToken()) headers["Authorization"] = `Bearer ${getToken()}`;
    return fetch(`${BASE}/api/report-builder/export/${period_id}?format=${format}`, { headers }).then(async (r) => {
      if (!r.ok) { const d = await r.json(); throw new Error(d.detail || "Export failed"); }
      if (format === "json") return r.json();
      const blob = await r.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a"); a.href = url;
      a.download = `report.${format}`;
      document.body.appendChild(a); a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      return { success: true };
    });
  },

  // ─── LOOKUPS (dropdown data from DB) ───
  getLookups: (type) => request("GET", `/api/lookup/${type}`),
  addLookup: (type, value, sort_order = 0) =>
    request("POST", `/api/lookup/${type}`, { value, sort_order }),
  updateLookup: (type, id, payload) =>
    request("PUT", `/api/lookup/${type}/${id}`, payload),
  deleteLookup: (type, id) => request("DELETE", `/api/lookup/${type}/${id}`),

  // ─── PROGRESS REPORTS ───
  listProgressReports: () => request("GET", "/api/progress-reports/"),
  createProgressReport: (formData) => {
    const headers = {};
    if (_token) headers["Authorization"] = `Bearer ${_token}`;
    return fetch(`${BASE}/api/progress-reports/create`, { method: "POST", headers, body: formData }).then(async (r) => { if (!r.ok) { const d = await r.json(); throw new Error(d.detail || "Failed"); } return r.json(); });
  },
  updateProgressReport: (id, formData) => {
    const headers = {};
    if (_token) headers["Authorization"] = `Bearer ${_token}`;
    return fetch(`${BASE}/api/progress-reports/${id}`, { method: "PUT", headers, body: formData }).then(async (r) => { if (!r.ok) { const d = await r.json(); throw new Error(d.detail || "Failed"); } return r.json(); });
  },
  deleteProgressReport: (id) => request("DELETE", `/api/progress-reports/${id}`),
  excelProgressPreview: (formData) => {
    const headers = {};
    if (_token) headers["Authorization"] = `Bearer ${_token}`;
    return fetch(`${BASE}/api/progress-reports/upload-excel/preview`, { method: "POST", headers, body: formData }).then(async (r) => { if (!r.ok) { const d = await r.json(); throw new Error(d.detail || "Preview failed"); } return r.json(); });
  },
  excelProgressImport: (formData) => {
    const headers = {};
    if (_token) headers["Authorization"] = `Bearer ${_token}`;
    return fetch(`${BASE}/api/progress-reports/upload-excel/import`, { method: "POST", headers, body: formData }).then(async (r) => { if (!r.ok) { const d = await r.json(); throw new Error(d.detail || "Import failed"); } return r.json(); });
  },

  // ─── MANPOWER STATUS ───
  listManpowerStatus: () => request("GET", "/api/manpower-status/"),
  createManpowerStatus: (formData) => {
    const headers = {};
    if (_token) headers["Authorization"] = `Bearer ${_token}`;
    return fetch(`${BASE}/api/manpower-status/create`, { method: "POST", headers, body: formData }).then(async (r) => { if (!r.ok) { const d = await r.json(); throw new Error(d.detail || "Failed"); } return r.json(); });
  },
  updateManpowerStatus: (id, formData) => {
    const headers = {};
    if (_token) headers["Authorization"] = `Bearer ${_token}`;
    return fetch(`${BASE}/api/manpower-status/${id}`, { method: "PUT", headers, body: formData }).then(async (r) => { if (!r.ok) { const d = await r.json(); throw new Error(d.detail || "Failed"); } return r.json(); });
  },
  deleteManpowerStatus: (id) => request("DELETE", `/api/manpower-status/${id}`),
  excelManpowerPreview: (formData) => {
    const headers = {};
    if (_token) headers["Authorization"] = `Bearer ${_token}`;
    return fetch(`${BASE}/api/manpower-status/upload-excel/preview`, { method: "POST", headers, body: formData }).then(async (r) => { if (!r.ok) { const d = await r.json(); throw new Error(d.detail || "Preview failed"); } return r.json(); });
  },
  excelManpowerImport: (formData) => {
    const headers = {};
    if (_token) headers["Authorization"] = `Bearer ${_token}`;
    return fetch(`${BASE}/api/manpower-status/upload-excel/import`, { method: "POST", headers, body: formData }).then(async (r) => { if (!r.ok) { const d = await r.json(); throw new Error(d.detail || "Import failed"); } return r.json(); });
  },

  // ─── CONTRACT STATUS ───
  listContractStatus: () => request("GET", "/api/contract-status/"),
  createContractStatus: (formData) => {
    const headers = {};
    if (_token) headers["Authorization"] = `Bearer ${_token}`;
    return fetch(`${BASE}/api/contract-status/create`, { method: "POST", headers, body: formData }).then(async (r) => { if (!r.ok) { const d = await r.json(); throw new Error(d.detail || "Failed"); } return r.json(); });
  },
  updateContractStatus: (id, formData) => {
    const headers = {};
    if (_token) headers["Authorization"] = `Bearer ${_token}`;
    return fetch(`${BASE}/api/contract-status/${id}`, { method: "PUT", headers, body: formData }).then(async (r) => { if (!r.ok) { const d = await r.json(); throw new Error(d.detail || "Failed"); } return r.json(); });
  },
  deleteContractStatus: (id) => request("DELETE", `/api/contract-status/${id}`),
  excelContractPreview: (formData) => {
    const headers = {};
    if (_token) headers["Authorization"] = `Bearer ${_token}`;
    return fetch(`${BASE}/api/contract-status/upload-excel/preview`, { method: "POST", headers, body: formData }).then(async (r) => { if (!r.ok) { const d = await r.json(); throw new Error(d.detail || "Preview failed"); } return r.json(); });
  },
  excelContractImport: (formData) => {
    const headers = {};
    if (_token) headers["Authorization"] = `Bearer ${_token}`;
    return fetch(`${BASE}/api/contract-status/upload-excel/import`, { method: "POST", headers, body: formData }).then(async (r) => { if (!r.ok) { const d = await r.json(); throw new Error(d.detail || "Import failed"); } return r.json(); });
  },

  // ─── FUND MANAGEMENT ───
  listFundManagement: () => request("GET", "/api/fund-management/"),
  createFundManagement: (formData) => {
    const headers = {};
    if (_token) headers["Authorization"] = `Bearer ${_token}`;
    return fetch(`${BASE}/api/fund-management/create`, { method: "POST", headers, body: formData }).then(async (r) => { if (!r.ok) { const d = await r.json(); throw new Error(d.detail || "Failed"); } return r.json(); });
  },
  updateFundManagement: (id, formData) => {
    const headers = {};
    if (_token) headers["Authorization"] = `Bearer ${_token}`;
    return fetch(`${BASE}/api/fund-management/${id}`, { method: "PUT", headers, body: formData }).then(async (r) => { if (!r.ok) { const d = await r.json(); throw new Error(d.detail || "Failed"); } return r.json(); });
  },
  deleteFundManagement: (id) => request("DELETE", `/api/fund-management/${id}`),
  excelFundPreview: (formData) => {
    const headers = {};
    if (_token) headers["Authorization"] = `Bearer ${_token}`;
    return fetch(`${BASE}/api/fund-management/upload-excel/preview`, { method: "POST", headers, body: formData }).then(async (r) => { if (!r.ok) { const d = await r.json(); throw new Error(d.detail || "Preview failed"); } return r.json(); });
  },
  excelFundImport: (formData) => {
    const headers = {};
    if (_token) headers["Authorization"] = `Bearer ${_token}`;
    return fetch(`${BASE}/api/fund-management/upload-excel/import`, { method: "POST", headers, body: formData }).then(async (r) => { if (!r.ok) { const d = await r.json(); throw new Error(d.detail || "Import failed"); } return r.json(); });
  },

  // ─── DATA PROCESSING ───
  listDataProcessing: (section) => request("GET", section ? `/api/data-processing/?section=${encodeURIComponent(section)}` : "/api/data-processing/"),
  createDataProcessing: (formData) => {
    const headers = {};
    if (_token) headers["Authorization"] = `Bearer ${_token}`;
    return fetch(`${BASE}/api/data-processing/create`, { method: "POST", headers, body: formData }).then(async (r) => { if (!r.ok) { const d = await r.json(); throw new Error(d.detail || "Failed"); } return r.json(); });
  },
  updateDataProcessing: (id, formData) => {
    const headers = {};
    if (_token) headers["Authorization"] = `Bearer ${_token}`;
    return fetch(`${BASE}/api/data-processing/${id}`, { method: "PUT", headers, body: formData }).then(async (r) => { if (!r.ok) { const d = await r.json(); throw new Error(d.detail || "Failed"); } return r.json(); });
  },
  deleteDataProcessing: (id) => request("DELETE", `/api/data-processing/${id}`),
  excelDataPreview: (formData) => {
    const headers = {};
    if (_token) headers["Authorization"] = `Bearer ${_token}`;
    return fetch(`${BASE}/api/data-processing/upload-excel/preview`, { method: "POST", headers, body: formData }).then(async (r) => { if (!r.ok) { const d = await r.json(); throw new Error(d.detail || "Preview failed"); } return r.json(); });
  },
  excelDataImport: (formData) => {
    const headers = {};
    if (_token) headers["Authorization"] = `Bearer ${_token}`;
    return fetch(`${BASE}/api/data-processing/upload-excel/import`, { method: "POST", headers, body: formData }).then(async (r) => { if (!r.ok) { const d = await r.json(); throw new Error(d.detail || "Import failed"); } return r.json(); });
  },

  // ─── REGIONAL LAB ───
  listRegionalLab: (section) => request("GET", section ? `/api/regional-lab/?section=${encodeURIComponent(section)}` : "/api/regional-lab/"),
  createRegionalLab: (formData) => {
    const headers = {};
    if (_token) headers["Authorization"] = `Bearer ${_token}`;
    return fetch(`${BASE}/api/regional-lab/create`, { method: "POST", headers, body: formData }).then(async (r) => { if (!r.ok) { const d = await r.json(); throw new Error(d.detail || "Failed"); } return r.json(); });
  },
  updateRegionalLab: (id, formData) => {
    const headers = {};
    if (_token) headers["Authorization"] = `Bearer ${_token}`;
    return fetch(`${BASE}/api/regional-lab/${id}`, { method: "PUT", headers, body: formData }).then(async (r) => { if (!r.ok) { const d = await r.json(); throw new Error(d.detail || "Failed"); } return r.json(); });
  },
  deleteRegionalLab: (id) => request("DELETE", `/api/regional-lab/${id}`),
  excelLabPreview: (formData) => {
    const headers = {};
    if (_token) headers["Authorization"] = `Bearer ${_token}`;
    return fetch(`${BASE}/api/regional-lab/upload-excel/preview`, { method: "POST", headers, body: formData }).then(async (r) => { if (!r.ok) { const d = await r.json(); throw new Error(d.detail || "Preview failed"); } return r.json(); });
  },
  excelLabImport: (formData) => {
    const headers = {};
    if (_token) headers["Authorization"] = `Bearer ${_token}`;
    return fetch(`${BASE}/api/regional-lab/upload-excel/import`, { method: "POST", headers, body: formData }).then(async (r) => { if (!r.ok) { const d = await r.json(); throw new Error(d.detail || "Import failed"); } return r.json(); });
  },

  // ─── REPORTING APPRAISALS ───
  listReportingAppraisals: (section) => request("GET", section ? `/api/reporting-appraisals/?section=${encodeURIComponent(section)}` : "/api/reporting-appraisals/"),
  createReportingAppraisal: (formData) => {
    const headers = {};
    if (_token) headers["Authorization"] = `Bearer ${_token}`;
    return fetch(`${BASE}/api/reporting-appraisals/create`, { method: "POST", headers, body: formData }).then(async (r) => { if (!r.ok) { const d = await r.json(); throw new Error(d.detail || "Failed"); } return r.json(); });
  },
  updateReportingAppraisal: (id, formData) => {
    const headers = {};
    if (_token) headers["Authorization"] = `Bearer ${_token}`;
    return fetch(`${BASE}/api/reporting-appraisals/${id}`, { method: "PUT", headers, body: formData }).then(async (r) => { if (!r.ok) { const d = await r.json(); throw new Error(d.detail || "Failed"); } return r.json(); });
  },
  deleteReportingAppraisal: (id) => request("DELETE", `/api/reporting-appraisals/${id}`),
  excelAppraisalPreview: (formData) => {
    const headers = {};
    if (_token) headers["Authorization"] = `Bearer ${_token}`;
    return fetch(`${BASE}/api/reporting-appraisals/upload-excel/preview`, { method: "POST", headers, body: formData }).then(async (r) => { if (!r.ok) { const d = await r.json(); throw new Error(d.detail || "Preview failed"); } return r.json(); });
  },
  excelAppraisalImport: (formData) => {
    const headers = {};
    if (_token) headers["Authorization"] = `Bearer ${_token}`;
    return fetch(`${BASE}/api/reporting-appraisals/upload-excel/import`, { method: "POST", headers, body: formData }).then(async (r) => { if (!r.ok) { const d = await r.json(); throw new Error(d.detail || "Import failed"); } return r.json(); });
  },

  // ─── PENDING ISSUES ───
  listPendingIssues: () => request("GET", "/api/pending-issues/"),
  createPendingIssue: (formData) => {
    const headers = {};
    if (_token) headers["Authorization"] = `Bearer ${_token}`;
    return fetch(`${BASE}/api/pending-issues/create`, { method: "POST", headers, body: formData }).then(async (r) => { if (!r.ok) { const d = await r.json(); throw new Error(d.detail || "Failed"); } return r.json(); });
  },
  updatePendingIssue: (id, formData) => {
    const headers = {};
    if (_token) headers["Authorization"] = `Bearer ${_token}`;
    return fetch(`${BASE}/api/pending-issues/${id}`, { method: "PUT", headers, body: formData }).then(async (r) => { if (!r.ok) { const d = await r.json(); throw new Error(d.detail || "Failed"); } return r.json(); });
  },
  deletePendingIssue: (id) => request("DELETE", `/api/pending-issues/${id}`),
  excelIssuePreview: (formData) => {
    const headers = {};
    if (_token) headers["Authorization"] = `Bearer ${_token}`;
    return fetch(`${BASE}/api/pending-issues/upload-excel/preview`, { method: "POST", headers, body: formData }).then(async (r) => { if (!r.ok) { const d = await r.json(); throw new Error(d.detail || "Preview failed"); } return r.json(); });
  },
  excelIssueImport: (formData) => {
    const headers = {};
    if (_token) headers["Authorization"] = `Bearer ${_token}`;
    return fetch(`${BASE}/api/pending-issues/upload-excel/import`, { method: "POST", headers, body: formData }).then(async (r) => { if (!r.ok) { const d = await r.json(); throw new Error(d.detail || "Import failed"); } return r.json(); });
  },

  // ─── HSE INCIDENTS ───
  listHSEIncidents: () => request("GET", "/api/hse-incidents/"),
  createHSEIncident: (formData) => {
    const headers = {};
    if (_token) headers["Authorization"] = `Bearer ${_token}`;
    return fetch(`${BASE}/api/hse-incidents/create`, { method: "POST", headers, body: formData }).then(async (r) => { if (!r.ok) { const d = await r.json(); throw new Error(d.detail || "Failed"); } return r.json(); });
  },
  updateHSEIncident: (id, formData) => {
    const headers = {};
    if (_token) headers["Authorization"] = `Bearer ${_token}`;
    return fetch(`${BASE}/api/hse-incidents/${id}`, { method: "PUT", headers, body: formData }).then(async (r) => { if (!r.ok) { const d = await r.json(); throw new Error(d.detail || "Failed"); } return r.json(); });
  },
  deleteHSEIncident: (id) => request("DELETE", `/api/hse-incidents/${id}`),
  excelHSEPreview: (formData) => {
    const headers = {};
    if (_token) headers["Authorization"] = `Bearer ${_token}`;
    return fetch(`${BASE}/api/hse-incidents/upload-excel/preview`, { method: "POST", headers, body: formData }).then(async (r) => { if (!r.ok) { const d = await r.json(); throw new Error(d.detail || "Preview failed"); } return r.json(); });
  },
  excelHSEImport: (formData) => {
    const headers = {};
    if (_token) headers["Authorization"] = `Bearer ${_token}`;
    return fetch(`${BASE}/api/hse-incidents/upload-excel/import`, { method: "POST", headers, body: formData }).then(async (r) => { if (!r.ok) { const d = await r.json(); throw new Error(d.detail || "Import failed"); } return r.json(); });
  },

  // ─── AWP ITEMS ───
  listAWPItems: () => request("GET", "/api/awp-items/"),
  createAWPItem: (formData) => {
    const headers = {};
    if (_token) headers["Authorization"] = `Bearer ${_token}`;
    return fetch(`${BASE}/api/awp-items/create`, { method: "POST", headers, body: formData }).then(async (r) => { if (!r.ok) { const d = await r.json(); throw new Error(d.detail || "Failed"); } return r.json(); });
  },
  updateAWPItem: (id, formData) => {
    const headers = {};
    if (_token) headers["Authorization"] = `Bearer ${_token}`;
    return fetch(`${BASE}/api/awp-items/${id}`, { method: "PUT", headers, body: formData }).then(async (r) => { if (!r.ok) { const d = await r.json(); throw new Error(d.detail || "Failed"); } return r.json(); });
  },
  deleteAWPItem: (id) => request("DELETE", `/api/awp-items/${id}`),
  excelAWPPreview: (formData) => {
    const headers = {};
    if (_token) headers["Authorization"] = `Bearer ${_token}`;
    return fetch(`${BASE}/api/awp-items/upload-excel/preview`, { method: "POST", headers, body: formData }).then(async (r) => { if (!r.ok) { const d = await r.json(); throw new Error(d.detail || "Preview failed"); } return r.json(); });
  },
  excelAWPImport: (formData) => {
    const headers = {};
    if (_token) headers["Authorization"] = `Bearer ${_token}`;
    return fetch(`${BASE}/api/awp-items/upload-excel/import`, { method: "POST", headers, body: formData }).then(async (r) => { if (!r.ok) { const d = await r.json(); throw new Error(d.detail || "Import failed"); } return r.json(); });
  },
};
