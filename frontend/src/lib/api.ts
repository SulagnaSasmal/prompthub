const BASE = "/api/v1";

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("token");
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${BASE}${path}`, { ...options, headers });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(JSON.stringify(err.detail ?? err));
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

export const api = {
  auth: {
    login: (username: string, password: string) =>
      request<{ access_token: string }>("/auth/login", {
        method: "POST",
        body: JSON.stringify({ username, password }),
      }),
    register: (data: object) =>
      request<object>("/auth/register", { method: "POST", body: JSON.stringify(data) }),
  },
  prompts: {
    list: (params?: Record<string, string>) => {
      const q = params ? "?" + new URLSearchParams(params).toString() : "";
      return request<import("./types").Prompt[]>(`/prompts${q}`);
    },
    get: (id: string) => request<import("./types").Prompt>(`/prompts/${id}`),
    create: (data: object) =>
      request<import("./types").Prompt>("/prompts", { method: "POST", body: JSON.stringify(data) }),
    update: (id: string, data: object) =>
      request<import("./types").Prompt>(`/prompts/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
  },
  versions: {
    list: (promptId: string) =>
      request<import("./types").Version[]>(`/prompts/${promptId}/versions`),
    create: (promptId: string, data: object) =>
      request<import("./types").Version>(`/prompts/${promptId}/versions`, {
        method: "POST",
        body: JSON.stringify(data),
      }),
    diff: (versionId: string, otherId: string) =>
      request<import("./types").DiffOut>(`/versions/${versionId}/diff/${otherId}`),
    transition: (versionId: string, toStatus: string, comment?: string) =>
      request<import("./types").Version>(`/versions/${versionId}/transition`, {
        method: "POST",
        body: JSON.stringify({ to_status: toStatus, comment }),
      }),
  },
  evaluations: {
    list: (versionId: string) =>
      request<import("./types").Evaluation[]>(`/versions/${versionId}/evaluations`),
    create: (versionId: string, data: object) =>
      request<import("./types").Evaluation>(`/versions/${versionId}/evaluations`, {
        method: "POST",
        body: JSON.stringify(data),
      }),
  },
  tests: {
    list: (versionId: string) =>
      request<import("./types").TestCase[]>(`/versions/${versionId}/tests`),
    create: (versionId: string, data: object) =>
      request<import("./types").TestCase>(`/versions/${versionId}/tests`, {
        method: "POST",
        body: JSON.stringify(data),
      }),
    recordResult: (testCaseId: string, result: string, evidence?: string) =>
      request<import("./types").TestCase>(`/tests/${testCaseId}`, {
        method: "PATCH",
        body: JSON.stringify({ result, evidence }),
      }),
  },
  governance: {
    list: (versionId: string) =>
      request<import("./types").GovernanceCheck[]>(`/versions/${versionId}/governance-checks`),
    create: (versionId: string, data: object) =>
      request<import("./types").GovernanceCheck>(`/versions/${versionId}/governance-checks`, {
        method: "POST",
        body: JSON.stringify(data),
      }),
  },
  dashboard: {
    metrics: () => request<import("./types").DashboardMetrics>("/dashboard/metrics"),
  },
};

// Extend types for DiffOut
declare module "./types" {
  interface DiffOut {
    version_a: string;
    version_b: string;
    text_a: string;
    text_b: string;
    diff_lines: string[];
  }
}
