"use client";

import { Suspense, useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

import Image from "next/image";

function LoginForm() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const redirect = searchParams.get("redirect") || "/";

    const [identifier, setIdentifier] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [checkingSession, setCheckingSession] = useState(true);

    // Check if user is already logged in
    useEffect(() => {
        const checkSession = async () => {
            try {
                const res = await fetch("/api/auth/me", {
                    credentials: "include",
                });

                if (res.ok) {
                    // User is already logged in, redirect them
                    if (redirect.startsWith("http")) {
                        window.location.href = redirect;
                    } else {
                        router.push(redirect);
                    }
                    return;
                }
            } catch {
                // Session check failed, show login form
            }
            setCheckingSession(false);
        };

        checkSession();
    }, [redirect, router]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setLoading(true);

        try {
            const res = await fetch(`/api/auth/login?redirect=${encodeURIComponent(redirect)}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ identifier, password }),
            });

            const data = await res.json();

            if (!res.ok) {
                setError(data.error || "Login failed");
                return;
            }

            // Redirect to original destination or home
            if (redirect.startsWith("http")) {
                window.location.href = redirect;
            } else {
                router.push(redirect);
            }
        } catch {
            setError("An error occurred. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    // Show loading while checking session
    if (checkingSession) {
        return (
            <div className="w-full max-w-md text-center">
                <div className="text-slate-400">Checking session...</div>
            </div>
        );
    }

    return (
        <div className="w-full max-w-md">
            {/* Logo */}
            <div className="text-center mb-8 flex flex-col items-center">
                <div className="w-20 h-20 relative mb-4 flex items-center justify-center p-2">
                    <Image
                        src="/logo.ico"
                        alt="Entro.ly Logo"
                        width={80}
                        height={80}
                        className="object-contain"
                        priority
                    />
                </div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
                    Entro.ly SSO
                </h1>
                <p className="text-slate-400 mt-2">Sign in to continue</p>
            </div>

            {/* Card */}
            <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-2xl p-8 shadow-2xl">
                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Error */}
                    {error && (
                        <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-lg text-sm">
                            {error}
                        </div>
                    )}

                    {/* Identifier (Username or Email) */}
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">
                            Username or Email
                        </label>
                        <input
                            type="text"
                            value={identifier}
                            onChange={(e) => setIdentifier(e.target.value)}
                            className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition"
                            placeholder="Enter username or email"
                            required
                        />
                    </div>

                    {/* Password */}
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">
                            Password
                        </label>
                        <div className="relative">
                            <input
                                type={showPassword ? "text" : "password"}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition pr-12"
                                placeholder="Enter password"
                                required
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-300"
                            >
                                {showPassword ? "Hide" : "Show"}
                            </button>
                        </div>
                    </div>

                    {/* Submit */}
                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-3 px-4 bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600 text-white font-semibold rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading ? "Signing in..." : "Sign In"}
                    </button>

                    <div className="relative">
                        <div className="absolute inset-0 flex items-center">
                            <span className="w-full border-t border-slate-700" />
                        </div>
                        <div className="relative flex justify-center text-xs uppercase">
                            <span className="bg-slate-900 px-2 text-slate-500">Or continue with</span>
                        </div>
                    </div>

                    <button
                        type="button"
                        onClick={() => window.location.href = `/api/auth/tiktok/login${redirect !== "/" ? `?redirect=${encodeURIComponent(redirect)}` : ""}`}
                        className="w-full py-3 px-4 bg-[#000000] hover:bg-[#111111] border border-slate-700 text-white font-semibold rounded-lg transition flex items-center justify-center gap-2"
                    >
                        <svg width="20" height="20" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path fillRule="evenodd" clipRule="evenodd" d="M11.8078 2.37893C15.1742 2.65042 18.2393 4.22543 20.3521 6.64936L20.3546 5.37817V26.7909C20.3546 32.9038 15.3993 37.8591 9.28639 37.8591C3.17352 37.8591 -1.7818 32.9038 -1.7818 26.7909C-1.7818 20.678 3.17352 15.7226 9.28639 15.7226C9.64689 15.7226 10.0028 15.74 10.3533 15.7739V21.6833C10.0051 21.6441 9.65012 21.6236 9.28639 21.6236C6.43236 21.6236 4.1187 23.9372 4.1187 26.7913C4.1187 29.6453 6.43236 31.959 9.28639 31.959C12.1404 31.959 14.4541 29.6453 14.4541 26.7913V0H20.3521C20.3521 0 20.3521 2.37682 20.3521 2.37893H11.8078Z" fill="white" transform="translate(19.8519 3.06409)" />
                            <path fillRule="evenodd" clipRule="evenodd" d="M16.5332 9.07168C14.0044 8.27137 11.6661 6.8488 9.77196 4.95462C7.87781 3.06045 6.45524 0.722137 5.65492 -1.80664H0.0384521C0.971053 2.9309 2.14668 4.67384 3.593 6.12015C5.03932 7.56647 6.78225 8.7421 7.9198 9.6747V20.2116L16.5332 9.07168Z" fill="white" transform="translate(31.3341 19.4678)" />
                        </svg>
                        TikTok
                    </button>
                </form>

                {/* Footer */}
                <div className="mt-6 text-center text-slate-400 text-sm">
                    Don&apos;t have an account?{" "}
                    <Link
                        href={`/register${redirect !== "/" ? `?redirect=${encodeURIComponent(redirect)}` : ""}`}
                        className="text-emerald-400 hover:text-emerald-300 font-medium"
                    >
                        Sign up
                    </Link>
                </div>
            </div>

            {/* Branding */}
            <p className="text-center text-slate-500 text-xs mt-6">
                Secure authentication for Entro.ly services
            </p>
        </div>
    );
}

function LoadingFallback() {
    return (
        <div className="w-full max-w-md animate-pulse">
            <div className="text-center mb-8">
                <div className="h-9 w-48 bg-slate-800 rounded mx-auto"></div>
                <div className="h-5 w-32 bg-slate-800 rounded mx-auto mt-2"></div>
            </div>
            <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-8">
                <div className="space-y-6">
                    <div className="h-12 bg-slate-800 rounded"></div>
                    <div className="h-12 bg-slate-800 rounded"></div>
                    <div className="h-12 bg-slate-800 rounded"></div>
                </div>
            </div>
        </div>
    );
}

export default function LoginPage() {
    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 px-4">
            <Suspense fallback={<LoadingFallback />}>
                <LoginForm />
            </Suspense>
        </div>
    );
}
