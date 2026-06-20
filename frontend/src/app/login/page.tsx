"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { PageHelp } from "@/components/help/PageHelp";
import { useAuth } from "@/components/layout/AuthProvider";

export default function LoginPage() {
  const [mode, setMode] = useState<"login" | "register" | "forgot" | "reset">("login");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [resetToken, setResetToken] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");
    try {
      if (mode === "forgot") {
        const response = await api.auth.forgotPassword(email);
        setMessage(response.reset_token ? `${response.message} Demo token: ${response.reset_token}` : response.message);
        if (response.reset_token) setResetToken(response.reset_token);
        setMode("reset");
        return;
      }
      if (mode === "reset") {
        const response = await api.auth.resetPassword(resetToken, password);
        setMessage(response.message);
        setPassword("");
        setResetToken("");
        setMode("login");
        return;
      }
      if (mode === "register") {
        await api.auth.register({
          username,
          email,
          full_name: fullName || undefined,
          password,
          roles: "author,reviewer,approver",
        });
      }
      const { access_token } = await api.auth.login(username, password);
      // Decode JWT to get user info
      const payload = JSON.parse(atob(access_token.split(".")[1]));
      login(access_token, {
        user_id: payload.sub,
        username,
        email: "",
        roles: payload.roles,
        is_active: true,
      });
      router.replace("/library");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  }

  function useDemoAccount() {
    setMode("login");
    setUsername("admin");
    setPassword("Prompthub2026!");
    setError("");
    setMessage("Demo admin credentials filled. Sign in to explore the seeded workspace.");
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-sm rounded-lg border border-slate-200 bg-white p-8 shadow-sm">
        <div className="mb-1 flex items-center gap-2">
          <h1 className="text-xl font-bold text-slate-900">
            {mode === "login" && "Sign in to PromptHub"}
            {mode === "register" && "Create your PromptHub account"}
            {mode === "forgot" && "Reset your password"}
            {mode === "reset" && "Choose a new password"}
          </h1>
          <PageHelp
            title="Use this page to access PromptHub."
            description="Sign in to your workspace, create an author account for demos, or reset a password with the reset flow."
            steps={[
              "Use the demo admin account to explore the seeded workspace quickly.",
              "Create an author account when you want a separate test user.",
              "Choose Forgot password when you need a reset token and then set a new password.",
              "After sign-in, open Working Library to find or create workflows.",
            ]}
          />
        </div>
        <p className="text-sm text-slate-500 mb-6">Governed Writing Workspace</p>
        {mode === "login" && (
          <div className="mb-5 rounded-lg border border-brand-100 bg-brand-50 p-3 text-sm text-slate-700">
            <p className="font-semibold text-slate-900">Demo access</p>
            <p className="mt-1">Username: <span className="font-mono">admin</span></p>
            <p>Password: <span className="font-mono">Prompthub2026!</span></p>
            <button
              type="button"
              onClick={useDemoAccount}
              className="mt-3 rounded-md bg-brand-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-700"
            >
              Fill demo account
            </button>
          </div>
        )}
        <form onSubmit={handleSubmit} className="space-y-4">
          {(mode === "login" || mode === "register") && (
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-slate-700 mb-1">Username</label>
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
          )}
          {(mode === "register" || mode === "forgot") && (
            <>
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
            </>
          )}
          {mode === "register" && (
            <>
              <div>
                <label htmlFor="full_name" className="block text-sm font-medium text-slate-700 mb-1">Full name</label>
                <input
                  id="full_name"
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
            </>
          )}
          {mode === "reset" && (
            <div>
              <label htmlFor="reset_token" className="block text-sm font-medium text-slate-700 mb-1">Reset token</label>
              <textarea
                id="reset_token"
                value={resetToken}
                onChange={(e) => setResetToken(e.target.value)}
                required
                rows={3}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
          )}
          {mode !== "forgot" && (
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-slate-700 mb-1">
                {mode === "reset" ? "New password" : "Password"}
              </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
            </div>
          )}
          {error && <p className="text-sm text-red-600">{error}</p>}
          {message && <p className="text-sm text-emerald-700">{message}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-brand-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-brand-700 disabled:opacity-60 transition-colors"
          >
            {loading && "Working..."}
            {!loading && mode === "login" && "Sign in"}
            {!loading && mode === "register" && "Create account"}
            {!loading && mode === "forgot" && "Send reset link"}
            {!loading && mode === "reset" && "Update password"}
          </button>
        </form>
        {mode === "login" && (
          <button
            type="button"
            onClick={() => {
              setMode("forgot");
              setError("");
              setMessage("");
            }}
            className="mt-4 w-full text-center text-sm text-slate-500 hover:text-slate-900"
          >
            Forgot password?
          </button>
        )}
        <button
          type="button"
          onClick={() => {
            setMode((current) => (current === "login" ? "register" : "login"));
            setError("");
            setMessage("");
          }}
          className="mt-4 w-full text-center text-sm text-brand-600 hover:text-brand-700"
        >
          {mode === "login" ? "Create an author account" : "Use an existing account"}
        </button>
      </div>
    </div>
  );
}
