const apiBase = (import.meta.env.VITE_API_BASE_URL ?? "").replace(/\/$/, "");
let csrfToken;

async function request(path, options = {}) {
  const response = await fetch(`${apiBase}${path}`, {
    ...options,
    credentials: "include",
    headers: {
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...(options.headers ?? {}),
    },
  });

  if (response.status === 204) return null;
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(body.error ?? "The request could not be completed");
    error.status = response.status;
    throw error;
  }
  return body;
}

async function withCsrf(path, method, data) {
  if (!csrfToken) {
    const result = await request("/api/auth/csrf");
    csrfToken = result.csrfToken;
  }
  try {
    return await request(path, {
      method,
      headers: { "X-CSRF-Token": csrfToken },
      ...(data === undefined ? {} : { body: JSON.stringify(data) }),
    });
  } catch (error) {
    if (error.status === 403) csrfToken = undefined;
    throw error;
  }
}

export const api = {
  submitInquiry: (data) => request("/api/inquiries", { method: "POST", body: JSON.stringify(data) }),
  login: (data) => withCsrf("/api/auth/login", "POST", data),
  logout: async () => {
    const result = await withCsrf("/api/auth/logout", "POST");
    csrfToken = undefined;
    return result;
  },
  currentAdmin: () => request("/api/auth/me"),
  inquiries: (params) => request(`/api/inquiries?${new URLSearchParams(params)}`),
  updateStatus: (id, status) => withCsrf(`/api/inquiries/${encodeURIComponent(id)}/status`, "PATCH", { status }),
};
