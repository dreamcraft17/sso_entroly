import { redirect } from "next/navigation";
import { getAccessToken } from "@/lib/cookies";
import { verifyAccessToken } from "@/lib/jwt-public";

// Prevent static generation - this page uses cookies and JWT verification
export const dynamic = "force-dynamic";

export default async function Home() {
  const accessToken = await getAccessToken();

  if (accessToken) {
    const payload = await verifyAccessToken(accessToken);
    if (payload) {
      // User is logged in, show dashboard
      return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 px-4">
          <div className="text-center">
            <h1 className="text-3xl font-bold bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent mb-4">
              Entro.ly SSO
            </h1>
            <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-2xl p-8 shadow-2xl">
              <p className="text-slate-300 mb-2">Logged in as</p>
              <p className="text-xl font-semibold text-white mb-1">
                {payload.name || payload.username || payload.email}
              </p>
              <p className="text-slate-400 text-sm">{payload.email}</p>

              <div className="mt-6 flex flex-wrap gap-3 justify-center">
                {payload.username === "entropi" && (
                  <a
                    href="/admin"
                    className="px-6 py-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white rounded-lg transition font-medium"
                  >
                    Admin Dashboard
                  </a>
                )}
                <a
                  href="/change-password"
                  className="px-6 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition"
                >
                  Change Password
                </a>
                <form action="/api/auth/logout" method="POST">
                  <button
                    type="submit"
                    className="px-6 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg transition"
                  >
                    Sign Out
                  </button>
                </form>
              </div>
            </div>

            <div className="mt-8 space-y-2 text-sm text-slate-500">
              <p>Your apps:</p>
              <div className="flex gap-4 justify-center">
                <a href="https://entro.ly" className="text-emerald-400 hover:text-emerald-300">
                  entro.ly
                </a>
                <a href="https://rank.entro.ly" className="text-emerald-400 hover:text-emerald-300">
                  rank.entro.ly
                </a>
              </div>
            </div>
          </div>
        </div>
      );
    }
  }

  // Not logged in, redirect to login
  redirect("/login");
}
