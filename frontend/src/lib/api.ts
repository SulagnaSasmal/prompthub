const BASE = "/api/v1";

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("token");
}

function clearSession() {
  if (typeof window === "undefined") return;
  localStorage.removeItem("token");
  localStorage.removeItem("user");
}

function parseErrorMessage(detail: unknown): string {
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) {
    return detail
      .map((item) => {
        if (item && typeof item === "object" && "msg" in item) return String(item.msg);
        return JSON.stringify(item);
      })
      .join(", ");
  }
  if (detail && typeof detail === "object") return JSON.stringify(detail);
  return "Request failed";
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
    if (res.status === 401) clearSession();
    throw new Error(parseErrorMessage(err.detail ?? err));
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
    forgotPassword: (email: string) =>
      request<{ message: string; reset_token?: string }>("/auth/forgot-password", {
        method: "POST",
        body: JSON.stringify({ email }),
      }),
    resetPassword: (token: string, new_password: string) =>
      request<{ message: string }>("/auth/reset-password", {
        method: "POST",
        body: JSON.stringify({ token, new_password }),
      }),
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
  workflows: {
    variables: (versionId: string) =>
      request<import("./types").Variable[]>(`/versions/${versionId}/variables`),
    saveVariables: (versionId: string, data: object[]) =>
      request<import("./types").Variable[]>(`/versions/${versionId}/variables`, {
        method: "POST",
        body: JSON.stringify(data),
      }),
    examples: (versionId: string) =>
      request<import("./types").Example[]>(`/versions/${versionId}/examples`),
    createExample: (versionId: string, data: object) =>
      request<import("./types").Example>(`/versions/${versionId}/examples`, {
        method: "POST",
        body: JSON.stringify(data),
      }),
    run: (versionId: string, input_payload: Record<string, unknown>, apply_style_profile = true) =>
      request<import("./types").Run>(`/versions/${versionId}/run`, {
        method: "POST",
        body: JSON.stringify({ input_payload, apply_style_profile }),
      }),
    runs: (params?: Record<string, string>) => {
      const q = params ? "?" + new URLSearchParams(params).toString() : "";
      return request<import("./types").Run[]>(`/runs${q}`);
    },
    rate: (runId: string, data: object) =>
      request<import("./types").RunRating>(`/runs/${runId}/rating`, {
        method: "POST",
        body: JSON.stringify(data),
      }),
    fieldQuality: (versionId: string) =>
      request<import("./types").FieldQuality>(`/versions/${versionId}/field-quality`),
    promoteExample: (runId: string, note: string) =>
      request<import("./types").Example>(`/runs/${runId}/promote-example`, {
        method: "POST",
        body: JSON.stringify({ note }),
      }),
    promoteTest: (runId: string, note: string) =>
      request<import("./types").TestCase>(`/runs/${runId}/promote-test`, {
        method: "POST",
        body: JSON.stringify({ note }),
      }),
    styleProfiles: () => request<import("./types").StyleProfile[]>("/style-profiles"),
    createStyleProfile: (data: object) =>
      request<import("./types").StyleProfile>("/style-profiles", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    attachStyleProfile: (promptId: string, styleProfileId: string) =>
      request<{ prompt_id: string; style_profile_id: string }>(`/prompts/${promptId}/style-profile/${styleProfileId}`, {
        method: "POST",
      }),
    styleCheck: (style_profile_id: string, text: string) =>
      request<{ style_profile_id: string; flags: import("./types").StyleFlag[] }>("/style-check", {
        method: "POST",
        body: JSON.stringify({ style_profile_id, text }),
      }),
    fetchSource: (source: string, data: object) =>
      request<{ source: string; reference: string; content: string }>(`/integrations/${source}/fetch`, {
        method: "POST",
        body: JSON.stringify(data),
      }),
    comments: (target_type: string, target_id: string) =>
      request<import("./types").Comment[]>(`/comments?${new URLSearchParams({ target_type, target_id })}`),
    createComment: (data: object) =>
      request<import("./types").Comment>("/comments", { method: "POST", body: JSON.stringify(data) }),
  },
  webhooks: {
    list: () => request<import("./types").WebhookEndpoint[]>("/webhooks"),
    create: (data: object) =>
      request<import("./types").WebhookEndpoint>("/webhooks", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    update: (id: string, data: object) =>
      request<import("./types").WebhookEndpoint>(`/webhooks/${id}`, {
        method: "PATCH",
        body: JSON.stringify(data),
      }),
    deliveries: () => request<import("./types").WebhookDelivery[]>("/webhooks/deliveries"),
    retry: (deliveryId: string) =>
      request<import("./types").WebhookDelivery>(`/webhooks/deliveries/${deliveryId}/retry`, {
        method: "POST",
      }),
    retryPending: () =>
      request<import("./types").WebhookDelivery[]>("/webhooks/retry-pending", {
        method: "POST",
      }),
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
