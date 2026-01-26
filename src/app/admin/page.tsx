"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

// Info tooltip component for column descriptions
const InfoTooltip = ({ text }: { text: string }) => (
    <span className="group relative inline-flex ml-1 cursor-help">
        <svg className="w-3.5 h-3.5 text-slate-500 hover:text-cyan-400 transition" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
        </svg>
        <span className="invisible group-hover:visible absolute left-full top-1/2 -translate-y-1/2 ml-2 px-3 py-1.5 text-xs text-white bg-slate-900 border border-slate-600 rounded-md shadow-lg whitespace-nowrap z-[100]">
            {text}
        </span>
    </span>
);

// Table header with optional info tooltip
const TableHeader = ({ children, info, className = "text-left" }: { children: React.ReactNode; info?: string; className?: string }) => (
    <th className={`${className} px-6 py-4 text-slate-300 font-medium text-sm`}>
        <span className="inline-flex items-center gap-1">
            {children}
            {info && <InfoTooltip text={info} />}
        </span>
    </th>
);

interface User {
    id: string;
    email: string | null;
    username: string | null;
    name: string | null;
    emailVerified: string | null;
    image: string | null;
    manychatId: string | null;
    whatsapp: string | null;
    go: boolean;
    mcn: boolean;
    createdAt: string;
    updatedAt: string;
    profiles: Array<{
        id: string;
        username: string;
        displayName: string;
    }>;
    aiGeneratedPages: Array<{
        id: string;
        slug: string;
        prompt: string;
        isPublished: boolean;
    }>;
    _count: {
        profiles: number;
        aiGeneratedPages: number;
        refreshTokens: number;
    };
    commission?: {
        id: string;
        paidCommission: string | null;
        pendingCommission: string | null;
        cancelledCommission: string | null;
        cancelledPercentage: number | null;
        agencyPercentage: number | null;
        agencyEarning: string | null;
        createdAt: string;
        updatedAt: string;
    } | null;
}

interface KasbonData {
    id: string;
    userId: string;
    amount: string;
    status: "REQUESTED" | "PENDING" | "COMPLETED" | "REJECTED";
    note: string | null;
    adminNote: string | null;
    createdAt: string;
    updatedAt: string;
    user: {
        id: string;
        username: string | null;
        email: string | null;
        name: string | null;
        whatsapp: string | null;
    };
}

interface Statistics {
    totalUsers: number;
    verifiedUsers: number;
    totalProfiles: number;
    totalAIPages: number;
    newUsersThisWeek: number;
    newUsersThisMonth: number;
}

interface CurrentUser {
    id: string;
    username: string;
    email: string;
    name: string;
}



const CopyButton = ({ text, className = "" }: { text: string; className?: string }) => {
    const [copied, setCopied] = useState(false);

    const handleCopy = (e: React.MouseEvent) => {
        e.stopPropagation();
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="relative inline-flex items-center">
            <button
                onClick={handleCopy}
                className={`p-1 text-slate-500 hover:text-white transition rounded ${className}`}
                title="Copy to clipboard"
            >
                {copied ? (
                    <svg className="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                ) : (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" />
                    </svg>
                )}
            </button>
            {copied && (
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-slate-800 text-emerald-400 text-xs font-bold rounded shadow-xl whitespace-nowrap border border-slate-700 animate-in fade-in slide-in-from-bottom-1 z-50">
                    Copied!
                </div>
            )}
        </div>
    );
};

export default function AdminPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
    const [users, setUsers] = useState<User[]>([]);
    const [statistics, setStatistics] = useState<Statistics | null>(null);
    const [activeTab, setActiveTab] = useState<"statistics" | "accounts" | "commissions" | "kasbons">("statistics");
    const [error, setError] = useState("");
    const [searchQuery, setSearchQuery] = useState("");
    const [pagination, setPagination] = useState({
        page: 1,
        limit: 10,
        totalCount: 0,
        totalPages: 0,
        hasMore: false,
    });
    const [sortConfig, setSortConfig] = useState({ field: "createdAt", order: "desc" });
    const [filterConfig, setFilterConfig] = useState("all");

    // Commission tab state
    const [commissionUsers, setCommissionUsers] = useState<User[]>([]);
    const [commissionPagination, setCommissionPagination] = useState({
        page: 1,
        limit: 10,
        totalCount: 0,
        totalPages: 0,
        hasMore: false,
    });
    const [commissionSearch, setCommissionSearch] = useState("");
    const [commissionSort, setCommissionSort] = useState({ field: "updatedAt", order: "desc" });

    // Kasbon tab state
    const [kasbons, setKasbons] = useState<KasbonData[]>([]);
    const [kasbonPagination, setKasbonPagination] = useState({
        page: 1,
        limit: 10,
        totalCount: 0,
        totalPages: 0,
        hasMore: false,
    });
    const [kasbonSearch, setKasbonSearch] = useState("");
    const [kasbonStatusFilter, setKasbonStatusFilter] = useState("all");
    const [kasbonSort, setKasbonSort] = useState({ field: "createdAt", order: "desc" });
    const [selectedKasbon, setSelectedKasbon] = useState<KasbonData | null>(null);
    const [showKasbonModal, setShowKasbonModal] = useState(false);
    const [kasbonUpdateStatus, setKasbonUpdateStatus] = useState("");
    const [kasbonAdminNote, setKasbonAdminNote] = useState("");
    const [kasbonUpdating, setKasbonUpdating] = useState(false);

    // Commission import state
    const [commissionImporting, setCommissionImporting] = useState(false);
    const [showImportModal, setShowImportModal] = useState(false);
    const [importProgress, setImportProgress] = useState(0);
    const [importMessage, setImportMessage] = useState("");
    const [importSummary, setImportSummary] = useState<{
        totalRowsInCSV: number;
        uniqueCreators: number;
        matchedUsers: number;
        commissionsCreated: number;
    } | null>(null);
    const [importError, setImportError] = useState<string | null>(null);

    // Bulk user import state
    const [showBulkImportModal, setShowBulkImportModal] = useState(false);
    const [bulkImporting, setBulkImporting] = useState(false);
    const [bulkImportProgress, setBulkImportProgress] = useState(0);
    const [bulkImportMessage, setBulkImportMessage] = useState("");
    const [bulkImportSummary, setBulkImportSummary] = useState<{
        totalInCSV: number;
        skipped: number;
        created: number;
    } | null>(null);
    const [bulkImportError, setBulkImportError] = useState<string | null>(null);

    // Modal states
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [showViewModal, setShowViewModal] = useState(false);
    const [selectedUser, setSelectedUser] = useState<User | null>(null);

    // Form states
    const [formData, setFormData] = useState({
        username: "",
        email: "",
        password: "",
        name: "",
        go: false,
        mcn: false,
        manychatId: "",
        whatsapp: "",
    });
    const [createdUser, setCreatedUser] = useState<{ username: string, password: string } | null>(null);
    const [formLoading, setFormLoading] = useState(false);
    const [formError, setFormError] = useState("");

    // Check if user is admin
    useEffect(() => {
        checkAuth();
    }, []);

    const checkAuth = async () => {
        try {
            const res = await fetch("/api/auth/me");
            if (!res.ok) {
                router.push("/login?redirect=/admin");
                return;
            }

            const data = await res.json();
            if (data.user.username !== "entropi") {
                router.push("/");
                return;
            }

            setCurrentUser(data.user);
            fetchUsers();
        } catch {
            router.push("/login?redirect=/admin");
        }
    };

    // Debounce search
    useEffect(() => {
        const timeoutId = setTimeout(() => {
            fetchUsers(1);
        }, 500);
        return () => clearTimeout(timeoutId);
    }, [searchQuery]);

    // Fetch on sort/filter change
    useEffect(() => {
        fetchUsers(1);
    }, [sortConfig, filterConfig]);

    const fetchUsers = async (page = pagination.page, forceStats = false) => {
        // Don't set full page loading for pagination/search updates to keep UI responsive
        // setLoading(true); 
        try {
            const params: Record<string, string> = {
                page: page.toString(),
                limit: pagination.limit.toString(),
                search: searchQuery,
                sort: sortConfig.field,
                order: sortConfig.order,
                filter: filterConfig,
            };

            // Only fetch stats if we don't have them or forced (e.g. after create/delete)
            if (forceStats || !statistics) {
                params.includeStats = "true";
            }

            const queryParams = new URLSearchParams(params);

            const res = await fetch(`/api/admin/users?${queryParams}`);
            if (!res.ok) {
                throw new Error("Failed to fetch users");
            }

            const data = await res.json();
            setUsers(data.users);
            if (data.pagination) {
                setPagination(data.pagination);
            }
            if (data.statistics) {
                setStatistics(data.statistics);
            }
        } catch (err) {
            setError("Failed to load users");
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    // Fetch commissions
    const fetchCommissions = async (page = commissionPagination.page) => {
        try {
            const params = new URLSearchParams({
                page: page.toString(),
                limit: commissionPagination.limit.toString(),
                search: commissionSearch,
                sort: commissionSort.field,
                order: commissionSort.order,
            });

            const res = await fetch(`/api/admin/commissions?${params}`);
            if (!res.ok) {
                throw new Error("Failed to fetch commissions");
            }

            const data = await res.json();
            setCommissionUsers(data.users);
            if (data.pagination) {
                setCommissionPagination(data.pagination);
            }
        } catch (err) {
            setError("Failed to load commissions");
            console.error(err);
        }
    };

    // Debounce commission search
    useEffect(() => {
        if (activeTab === "commissions") {
            const timeoutId = setTimeout(() => {
                fetchCommissions(1);
            }, 500);
            return () => clearTimeout(timeoutId);
        }
    }, [commissionSearch]);

    // Fetch commissions on sort change or tab switch
    useEffect(() => {
        if (activeTab === "commissions") {
            fetchCommissions(1);
        }
    }, [commissionSort, activeTab]);

    const handleCommissionImport = async (file: File) => {
        // Reset and show modal
        setCommissionImporting(true);
        setShowImportModal(true);
        setImportProgress(0);
        setImportMessage("Starting import...");
        setImportSummary(null);
        setImportError(null);

        try {
            const formData = new FormData();
            formData.append("file", file);

            const res = await fetch("/api/admin/commissions/import", {
                method: "POST",
                body: formData,
            });

            const reader = res.body?.getReader();
            const decoder = new TextDecoder();

            if (!reader) {
                throw new Error("Failed to read response");
            }

            let buffer = "";

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                buffer += decoder.decode(value, { stream: true });

                // Parse SSE messages
                const lines = buffer.split("\n\n");
                buffer = lines.pop() || "";

                for (const line of lines) {
                    if (line.startsWith("data: ")) {
                        try {
                            const data = JSON.parse(line.slice(6));
                            setImportProgress(data.progress || 0);
                            setImportMessage(data.message || "");

                            if (data.error) {
                                setImportError(data.message);
                            }

                            if (data.summary) {
                                setImportSummary(data.summary);
                                // Refresh the commissions list
                                fetchCommissions(1);
                            }
                        } catch (e) {
                            console.error("Failed to parse SSE message:", e);
                        }
                    }
                }
            }
        } catch (err) {
            console.error(err);
            setImportError("An error occurred during import");
            setImportProgress(0);
        } finally {
            setCommissionImporting(false);
        }
    };

    const handleCommissionPageChange = (newPage: number) => {
        if (newPage >= 1 && newPage <= commissionPagination.totalPages) {
            fetchCommissions(newPage);
        }
    };

    // Fetch kasbons
    const fetchKasbons = async (page = kasbonPagination.page) => {
        try {
            const params = new URLSearchParams({
                page: page.toString(),
                limit: kasbonPagination.limit.toString(),
                search: kasbonSearch,
                status: kasbonStatusFilter,
                sort: kasbonSort.field,
                order: kasbonSort.order,
            });

            const res = await fetch(`/api/admin/kasbons?${params}`);
            if (!res.ok) {
                throw new Error("Failed to fetch kasbons");
            }

            const data = await res.json();
            setKasbons(data.kasbons);
            if (data.pagination) {
                setKasbonPagination(data.pagination);
            }
        } catch (err) {
            setError("Failed to load kasbons");
            console.error(err);
        }
    };

    // Debounce kasbon search
    useEffect(() => {
        if (activeTab === "kasbons") {
            const timeoutId = setTimeout(() => {
                fetchKasbons(1);
            }, 500);
            return () => clearTimeout(timeoutId);
        }
    }, [kasbonSearch]);

    // Fetch kasbons on filter/sort change or tab switch
    useEffect(() => {
        if (activeTab === "kasbons") {
            fetchKasbons(1);
        }
    }, [kasbonStatusFilter, kasbonSort, activeTab]);

    const handleKasbonPageChange = (newPage: number) => {
        if (newPage >= 1 && newPage <= kasbonPagination.totalPages) {
            fetchKasbons(newPage);
        }
    };

    const handleKasbonStatusUpdate = async () => {
        if (!selectedKasbon || !kasbonUpdateStatus) return;

        setKasbonUpdating(true);
        try {
            const res = await fetch(`/api/admin/kasbons/${selectedKasbon.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    status: kasbonUpdateStatus,
                    adminNote: kasbonAdminNote || null,
                }),
            });

            if (res.ok) {
                setShowKasbonModal(false);
                setSelectedKasbon(null);
                setKasbonUpdateStatus("");
                setKasbonAdminNote("");
                fetchKasbons(kasbonPagination.page);
            } else {
                const data = await res.json();
                setError(data.error || "Failed to update kasbon");
            }
        } catch (err) {
            console.error(err);
            setError("Failed to update kasbon");
        } finally {
            setKasbonUpdating(false);
        }
    };

    const handlePageChange = (newPage: number) => {
        if (newPage >= 1 && newPage <= pagination.totalPages) {
            fetchUsers(newPage);
        }
    };

    const handleCreateUser = async (e: React.FormEvent) => {
        e.preventDefault();
        setFormLoading(true);
        setFormError("");

        try {
            const res = await fetch("/api/admin/users", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(formData),
            });

            const data = await res.json();

            if (!res.ok) {
                setFormError(data.error || "Failed to create user");
                return;
            }

            setCreatedUser({
                username: formData.username,
                password: formData.password
            });
            setFormData({ username: "", email: "", password: "", name: "", go: false, mcn: false, manychatId: "", whatsapp: "" });
            fetchUsers(pagination.page, true);
        } catch {
            setFormError("An error occurred");
        } finally {
            setFormLoading(false);
        }
    };

    // Bulk import handler
    const handleBulkImport = async (file: File) => {
        setBulkImporting(true);
        setShowBulkImportModal(true);
        setBulkImportProgress(0);
        setBulkImportMessage("Starting bulk import...");
        setBulkImportSummary(null);
        setBulkImportError(null);

        try {
            const formData = new FormData();
            formData.append("file", file);

            const res = await fetch("/api/admin/users/bulk", {
                method: "POST",
                body: formData,
            });

            const reader = res.body?.getReader();
            const decoder = new TextDecoder();

            if (!reader) {
                throw new Error("Failed to read response");
            }

            let buffer = "";

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                buffer += decoder.decode(value, { stream: true });

                const lines = buffer.split("\n\n");
                buffer = lines.pop() || "";

                for (const line of lines) {
                    if (line.startsWith("data: ")) {
                        try {
                            const data = JSON.parse(line.slice(6));
                            setBulkImportProgress(data.progress || 0);
                            setBulkImportMessage(data.message || "");

                            if (data.error) {
                                setBulkImportError(data.message);
                            }

                            if (data.summary) {
                                setBulkImportSummary(data.summary);
                                fetchUsers(1, true);
                            }
                        } catch (e) {
                            console.error("Failed to parse SSE message:", e);
                        }
                    }
                }
            }
        } catch (err) {
            console.error(err);
            setBulkImportError("An error occurred during bulk import");
            setBulkImportProgress(0);
        } finally {
            setBulkImporting(false);
        }
    };

    const handleEditUser = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedUser) return;

        setFormLoading(true);
        setFormError("");

        try {
            const updateData: Record<string, string | boolean> = {};
            if (formData.username) updateData.username = formData.username;
            if (formData.email) updateData.email = formData.email;
            if (formData.password) updateData.password = formData.password;
            if (formData.name) updateData.name = formData.name;
            updateData.go = formData.go;
            updateData.mcn = formData.mcn;
            updateData.whatsapp = formData.whatsapp;

            const res = await fetch(`/api/admin/users/${selectedUser.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(updateData),
            });

            const data = await res.json();

            if (!res.ok) {
                setFormError(data.error || "Failed to update user");
                return;
            }

            setShowEditModal(false);
            setSelectedUser(null);
            setFormData({ username: "", email: "", password: "", name: "", go: false, mcn: false, manychatId: "", whatsapp: "" });
            fetchUsers(pagination.page);
        } catch {
            setFormError("An error occurred");
        } finally {
            setFormLoading(false);
        }
    };

    const handleDeleteUser = async () => {
        if (!selectedUser) return;

        setFormLoading(true);
        setFormError("");

        try {
            const res = await fetch(`/api/admin/users/${selectedUser.id}`, {
                method: "DELETE",
            });

            const data = await res.json();

            if (!res.ok) {
                setFormError(data.error || "Failed to delete user");
                return;
            }

            setShowDeleteModal(false);
            setSelectedUser(null);
            fetchUsers(pagination.page, true);
        } catch {
            setFormError("An error occurred");
        } finally {
            setFormLoading(false);
        }
    };

    const openEditModal = (user: User) => {
        setSelectedUser(user);
        setFormData({
            username: user.username || "",
            email: user.email || "",
            password: "",
            name: user.name || "",
            go: user.go || false,
            mcn: user.mcn || false,
            manychatId: user.manychatId || "",
            whatsapp: user.whatsapp || "",
        });
        setFormError("");
        setShowEditModal(true);
    };

    const openDeleteModal = (user: User) => {
        setSelectedUser(user);
        setFormError("");
        setShowDeleteModal(true);
    };

    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleDateString("en-US", {
            year: "numeric",
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        });
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
                <div className="text-emerald-400 text-lg">Loading...</div>
            </div>
        );
    }

    if (!currentUser) {
        return null;
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
            {/* Header */}
            <header className="bg-slate-900/80 backdrop-blur-xl border-b border-slate-800 sticky top-0 z-50">
                <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                        <h1 className="text-2xl font-bold bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
                            Admin Dashboard
                        </h1>
                        <span className="px-3 py-1 bg-emerald-500/10 border border-emerald-500/30 rounded-full text-emerald-400 text-xs font-medium">
                            {currentUser.username}
                        </span>
                    </div>
                    <button
                        onClick={() => router.push("/")}
                        className="text-slate-400 hover:text-white transition text-sm"
                    >
                        ← Back to Home
                    </button>
                </div>
            </header>

            <div className="max-w-7xl mx-auto px-6 py-8">
                {/* Tabs */}
                <div className="flex space-x-2 mb-8">
                    <button
                        onClick={() => setActiveTab("statistics")}
                        className={`px-6 py-3 rounded-xl font-medium transition ${activeTab === "statistics"
                            ? "bg-gradient-to-r from-emerald-500 to-cyan-500 text-white"
                            : "bg-slate-800/50 text-slate-400 hover:text-white hover:bg-slate-800"
                            }`}
                    >
                        📊 Statistics
                    </button>
                    <button
                        onClick={() => setActiveTab("accounts")}
                        className={`px-6 py-3 rounded-xl font-medium transition ${activeTab === "accounts"
                            ? "bg-gradient-to-r from-emerald-500 to-cyan-500 text-white"
                            : "bg-slate-800/50 text-slate-400 hover:text-white hover:bg-slate-800"
                            }`}
                    >
                        👥 Accounts
                    </button>
                    <button
                        onClick={() => setActiveTab("commissions")}
                        className={`px-6 py-3 rounded-xl font-medium transition ${activeTab === "commissions"
                            ? "bg-gradient-to-r from-emerald-500 to-cyan-500 text-white"
                            : "bg-slate-800/50 text-slate-400 hover:text-white hover:bg-slate-800"
                            }`}
                    >
                        💰 Commissions
                    </button>
                    <button
                        onClick={() => setActiveTab("kasbons")}
                        className={`px-6 py-3 rounded-xl font-medium transition ${activeTab === "kasbons"
                            ? "bg-gradient-to-r from-emerald-500 to-cyan-500 text-white"
                            : "bg-slate-800/50 text-slate-400 hover:text-white hover:bg-slate-800"
                            }`}
                    >
                        🏦 Kasbons
                    </button>
                </div>

                {error && (
                    <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-lg mb-6">
                        {error}
                    </div>
                )}

                {/* Statistics Tab */}
                {activeTab === "statistics" && statistics && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        <StatCard
                            title="Total Users"
                            value={statistics.totalUsers}
                            icon="👥"
                            color="emerald"
                        />
                        <StatCard
                            title="Verified Users"
                            value={statistics.verifiedUsers}
                            icon="✅"
                            color="cyan"
                        />
                        <StatCard
                            title="Total Profiles"
                            value={statistics.totalProfiles}
                            icon="🔗"
                            color="purple"
                        />
                        <StatCard
                            title="AI Generated Pages"
                            value={statistics.totalAIPages}
                            icon="🤖"
                            color="pink"
                        />
                        <StatCard
                            title="New Users (This Week)"
                            value={statistics.newUsersThisWeek}
                            icon="📈"
                            color="amber"
                        />
                        <StatCard
                            title="New Users (This Month)"
                            value={statistics.newUsersThisMonth}
                            icon="📅"
                            color="blue"
                        />
                    </div>
                )}

                {/* Accounts Tab */}
                {activeTab === "accounts" && (
                    <div>
                        {/* Filter and Sort Bar */}
                        <div className="flex flex-col md:flex-row gap-4 mb-6">
                            {/* Search Input */}
                            <div className="flex-1 relative">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                    <svg className="w-5 h-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                    </svg>
                                </div>
                                <input
                                    type="text"
                                    placeholder="Search by username..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full pl-12 pr-4 py-3 bg-slate-800/50 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition"
                                />
                                {searchQuery && (
                                    <button
                                        onClick={() => setSearchQuery("")}
                                        className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-500 hover:text-white transition"
                                    >
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                    </button>
                                )}
                            </div>

                            {/* Filter Dropdown */}
                            <div className="relative">
                                <select
                                    value={filterConfig}
                                    onChange={(e) => setFilterConfig(e.target.value)}
                                    className="appearance-none w-full md:w-40 px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
                                >
                                    <option value="all">All Users</option>
                                    <option value="go">GO Users</option>
                                    <option value="mcn">MCN Users</option>
                                    <option value="go_and_mcn">MCN & GO Users</option>
                                    <option value="verified">Verified</option>
                                </select>
                                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-slate-400">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                    </svg>
                                </div>
                            </div>

                            {/* Sort Dropdown */}
                            <div className="relative">
                                <select
                                    value={`${sortConfig.field}-${sortConfig.order}`}
                                    onChange={(e) => {
                                        const [field, order] = e.target.value.split("-");
                                        setSortConfig({ field, order });
                                    }}
                                    className="appearance-none w-full md:w-48 px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
                                >
                                    <option value="createdAt-desc">Newest First</option>
                                    <option value="createdAt-asc">Oldest First</option>
                                    <option value="username-asc">Username A-Z</option>
                                    <option value="username-desc">Username Z-A</option>
                                    <option value="email-asc">Email A-Z</option>
                                </select>
                                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-slate-400">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                    </svg>
                                </div>
                            </div>

                            <button
                                onClick={() => {
                                    setFormData({ username: "", email: "", password: "", name: "", go: false, mcn: false, manychatId: "", whatsapp: "" });
                                    setCreatedUser(null);
                                    setFormError("");
                                    setShowCreateModal(true);
                                }}
                                className="px-6 py-3 bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600 text-white font-medium rounded-xl transition whitespace-nowrap"
                            >
                                + Add User
                            </button>
                            <div className="relative">
                                <input
                                    type="file"
                                    accept=".csv"
                                    onChange={(e) => {
                                        const file = e.target.files?.[0];
                                        if (file) {
                                            handleBulkImport(file);
                                            e.target.value = "";
                                        }
                                    }}
                                    className="hidden"
                                    id="bulk-import-input"
                                    disabled={bulkImporting}
                                />
                                <label
                                    htmlFor="bulk-import-input"
                                    className={`inline-flex items-center gap-2 px-6 py-3 rounded-xl font-medium transition cursor-pointer whitespace-nowrap ${bulkImporting
                                        ? "bg-slate-700 text-slate-400 cursor-not-allowed"
                                        : "bg-slate-800 border border-slate-700 hover:bg-slate-700 text-slate-300 hover:text-white"
                                        }`}
                                >
                                    {bulkImporting ? (
                                        <>
                                            <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                            </svg>
                                            Importing...
                                        </>
                                    ) : (
                                        <>
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                                            </svg>
                                            Import CSV
                                        </>
                                    )}
                                </label>
                            </div>
                        </div>

                        {/* Results Count and Pagination Info */}
                        <div className="flex items-center justify-between mb-4">
                            <p className="text-slate-400 text-sm">
                                {searchQuery ? (
                                    <>
                                        Found <span className="text-white font-medium">{pagination.totalCount}</span> matches
                                    </>
                                ) : (
                                    <>
                                        Total: <span className="text-white font-medium">{pagination.totalCount}</span> accounts
                                    </>
                                )}
                            </p>
                        </div>

                        {/* Users Table */}
                        <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-2xl overflow-hidden mb-6">
                            <div className="overflow-x-auto">
                                <table className="w-full table-auto min-w-[1000px]">
                                    <thead>
                                        <tr className="bg-slate-800/50 border-b border-slate-700">
                                            <th className="text-left px-4 py-4 text-slate-300 font-medium text-sm w-[220px] sticky left-0 bg-slate-900 z-10"><span className="inline-flex items-center gap-1">User<InfoTooltip text="Username and display name" /></span></th>
                                            <th className="text-left px-4 py-4 text-slate-300 font-medium text-sm w-auto"><span className="inline-flex items-center gap-1">Email<InfoTooltip text="Email address and verification status" /></span></th>
                                            <th className="text-left px-4 py-4 text-slate-300 font-medium text-sm w-[100px]"><span className="inline-flex items-center gap-1">Status<InfoTooltip text="GO: Green Official | MCN: Multi-Channel Network" /></span></th>
                                            <th className="text-left px-4 py-4 text-slate-300 font-medium text-sm w-[100px]"><span className="inline-flex items-center gap-1">Profiles<InfoTooltip text="Number of link-in-bio profiles" /></span></th>
                                            <th className="text-left px-4 py-4 text-slate-300 font-medium text-sm w-[180px]"><span className="inline-flex items-center gap-1">Created<InfoTooltip text="Account registration date" /></span></th>
                                            <th className="text-right px-2 py-4 text-slate-300 font-medium text-sm w-[90px]"><span className="inline-flex items-center justify-end gap-1">Actions<InfoTooltip text="View, edit, or delete account" /></span></th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {users.length === 0 ? (
                                            <tr>
                                                <td colSpan={6} className="px-6 py-12 text-center">
                                                    <div className="text-slate-500">
                                                        {searchQuery ? (
                                                            <>
                                                                <svg className="w-12 h-12 mx-auto mb-4 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                                                </svg>
                                                                <p>No accounts found matching "{searchQuery}"</p>
                                                            </>
                                                        ) : (
                                                            <p>No accounts found</p>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        ) : (
                                            users.map((user) => (
                                                <tr key={user.id} className="border-b border-slate-800 hover:bg-slate-800/30 transition">
                                                    <td className="px-6 py-4 sticky left-0 bg-slate-900 z-10 shadow-[2px_0_4px_-1px_rgba(0,0,0,0.3)]">
                                                        <div className="flex items-center space-x-3">
                                                            <div className="flex flex-col">
                                                                <div className="flex items-center gap-2">
                                                                    <div className="text-white font-medium">{user.username || "No username"}</div>
                                                                    {user.username && <CopyButton text={user.username} />}
                                                                </div>
                                                                <div className="flex items-center gap-2">
                                                                    <div className="text-slate-500 text-sm">{user.name || "No name"}</div>
                                                                    {user.name && <CopyButton text={user.name} />}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 text-slate-400">
                                                        <div className="flex items-center gap-2">
                                                            {user.email || "-"}
                                                            {user.email && <CopyButton text={user.email} />}
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <div className="flex flex-col gap-1">
                                                            <div className="flex gap-1">
                                                                {user.go && (
                                                                    <span className="px-2 py-0.5 bg-blue-500/20 text-blue-400 rounded text-xs font-medium">
                                                                        GO
                                                                    </span>
                                                                )}
                                                                {user.mcn && (
                                                                    <span className="px-2 py-0.5 bg-purple-500/20 text-purple-400 rounded text-xs font-medium">
                                                                        MCN
                                                                    </span>
                                                                )}
                                                                {!user.go && !user.mcn && (
                                                                    <span className="text-slate-600 text-xs">-</span>
                                                                )}
                                                            </div>
                                                            {user.manychatId && (
                                                                <div className="flex items-center gap-2 mt-1">
                                                                    <span className="text-slate-500 text-xs font-mono">
                                                                        MC: {user.manychatId}
                                                                    </span>
                                                                    <CopyButton text={user.manychatId} />
                                                                </div>
                                                            )}
                                                            {user.whatsapp && (
                                                                <div className="flex items-center gap-2 mt-1">
                                                                    <span className="text-green-500 text-xs font-mono">
                                                                        WA: {user.whatsapp}
                                                                    </span>
                                                                    <CopyButton text={user.whatsapp} />
                                                                </div>
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <span className="px-2 py-1 bg-emerald-500/10 text-emerald-400 rounded text-sm">
                                                            {user._count.profiles} profiles
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 text-slate-400 text-sm">{formatDate(user.createdAt)}</td>
                                                    <td className="px-2 py-4">
                                                        <div className="flex items-center justify-end space-x-1">
                                                            {/* View */}
                                                            <button
                                                                onClick={() => {
                                                                    setSelectedUser(user);
                                                                    setShowViewModal(true);
                                                                }}
                                                                className="p-2 text-slate-400 hover:text-cyan-400 hover:bg-slate-700 rounded-lg transition"
                                                                title="View details"
                                                            >
                                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                                                </svg>
                                                            </button>
                                                            {/* Edit */}
                                                            <button
                                                                onClick={() => openEditModal(user)}
                                                                className="p-2 text-slate-400 hover:text-emerald-400 hover:bg-slate-700 rounded-lg transition"
                                                                title="Edit user"
                                                            >
                                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                                                </svg>
                                                            </button>
                                                            {/* Delete */}
                                                            {user.username !== "entropi" && (
                                                                <button
                                                                    onClick={() => openDeleteModal(user)}
                                                                    className="p-2 text-slate-400 hover:text-red-400 hover:bg-slate-700 rounded-lg transition"
                                                                    title="Delete user"
                                                                >
                                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                                    </svg>
                                                                </button>
                                                            )}
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Pagination Controls */}
                        {pagination.totalPages > 1 && (
                            <div className="flex items-center justify-between px-4 py-3 bg-slate-900/50 border border-slate-800 rounded-xl">
                                <div className="flex items-center text-sm text-slate-400">
                                    <span>
                                        Showing page <span className="font-medium text-white">{pagination.page}</span> of{" "}
                                        <span className="font-medium text-white">{pagination.totalPages}</span>
                                    </span>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <button
                                        onClick={() => handlePageChange(pagination.page - 1)}
                                        disabled={pagination.page <= 1}
                                        className="px-4 py-2 text-sm font-medium text-slate-300 bg-slate-800 border border-slate-700 rounded-lg hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
                                    >
                                        Previous
                                    </button>
                                    <div className="flex items-center space-x-1">
                                        {[...Array(pagination.totalPages)].map((_, i) => {
                                            const pageNum = i + 1;
                                            // Show first, last, current, and surrounding pages
                                            if (
                                                pageNum === 1 ||
                                                pageNum === pagination.totalPages ||
                                                (pageNum >= pagination.page - 1 && pageNum <= pagination.page + 1)
                                            ) {
                                                return (
                                                    <button
                                                        key={pageNum}
                                                        onClick={() => handlePageChange(pageNum)}
                                                        className={`w-8 h-8 flex items-center justify-center text-sm font-medium rounded-lg transition ${pageNum === pagination.page
                                                            ? "bg-gradient-to-r from-emerald-500 to-cyan-500 text-white"
                                                            : "bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white"
                                                            }`}
                                                    >
                                                        {pageNum}
                                                    </button>
                                                );
                                            } else if (
                                                (pageNum === pagination.page - 2 && pageNum > 1) ||
                                                (pageNum === pagination.page + 2 && pageNum < pagination.totalPages)
                                            ) {
                                                return (
                                                    <span key={pageNum} className="text-slate-600 px-1">
                                                        ...
                                                    </span>
                                                );
                                            }
                                            return null;
                                        })}
                                    </div>
                                    <button
                                        onClick={() => handlePageChange(pagination.page + 1)}
                                        disabled={pagination.page >= pagination.totalPages}
                                        className="px-4 py-2 text-sm font-medium text-slate-300 bg-slate-800 border border-slate-700 rounded-lg hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
                                    >
                                        Next
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Commissions Tab */}
                {activeTab === "commissions" && (
                    <div>
                        {/* Search and Sort Bar */}
                        <div className="flex flex-col md:flex-row gap-4 mb-6">
                            {/* Search Input */}
                            <div className="flex-1 relative">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                    <svg className="w-5 h-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                    </svg>
                                </div>
                                <input
                                    type="text"
                                    placeholder="Search by username, email, or name..."
                                    value={commissionSearch}
                                    onChange={(e) => setCommissionSearch(e.target.value)}
                                    className="w-full pl-12 pr-4 py-3 bg-slate-800/50 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition"
                                />
                                {commissionSearch && (
                                    <button
                                        onClick={() => setCommissionSearch("")}
                                        className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-500 hover:text-white transition"
                                    >
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                    </button>
                                )}
                            </div>

                            {/* Sort Dropdown */}
                            <div className="relative">
                                <select
                                    value={`${commissionSort.field}-${commissionSort.order}`}
                                    onChange={(e) => {
                                        const [field, order] = e.target.value.split("-");
                                        setCommissionSort({ field, order });
                                    }}
                                    className="appearance-none w-full md:w-56 px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
                                >
                                    <option value="updatedAt-desc">Last Updated</option>
                                    <option value="paidCommission-desc">Highest Paid</option>
                                    <option value="paidCommission-asc">Lowest Paid</option>
                                    <option value="pendingCommission-desc">Highest Pending</option>
                                    <option value="pendingCommission-asc">Lowest Pending</option>
                                    <option value="cancelledCommission-desc">Highest Cancelled</option>
                                    <option value="cancelledCommission-asc">Lowest Cancelled</option>
                                    <option value="agencyPercentage-desc">Highest Agency %</option>
                                    <option value="agencyPercentage-asc">Lowest Agency %</option>
                                    <option value="agencyEarning-desc">Highest Agency Earning</option>
                                    <option value="agencyEarning-asc">Lowest Agency Earning</option>
                                    <option value="username-asc">Username A-Z</option>
                                    <option value="username-desc">Username Z-A</option>
                                    <option value="createdAt-desc">Newest First</option>
                                    <option value="createdAt-asc">Oldest First</option>
                                </select>
                                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-slate-400">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                    </svg>
                                </div>
                            </div>

                            {/* Update Commissions Button */}
                            <div className="relative">
                                <input
                                    type="file"
                                    accept=".csv"
                                    onChange={(e) => {
                                        const file = e.target.files?.[0];
                                        if (file) {
                                            handleCommissionImport(file);
                                            e.target.value = ""; // Reset input
                                        }
                                    }}
                                    className="hidden"
                                    id="commission-csv-input"
                                    disabled={commissionImporting}
                                />
                                <label
                                    htmlFor="commission-csv-input"
                                    className={`inline-flex items-center gap-2 px-6 py-3 rounded-xl font-medium transition cursor-pointer whitespace-nowrap ${commissionImporting
                                        ? "bg-slate-700 text-slate-400 cursor-not-allowed"
                                        : "bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white"
                                        }`}
                                >
                                    {commissionImporting ? (
                                        <>
                                            <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                            </svg>
                                            Importing...
                                        </>
                                    ) : (
                                        <>
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                                            </svg>
                                            Update Commissions
                                        </>
                                    )}
                                </label>
                            </div>
                        </div>

                        {/* Results Count */}
                        <div className="flex items-center justify-between mb-4">
                            <p className="text-slate-400 text-sm">
                                {commissionSearch ? (
                                    <>
                                        Found <span className="text-white font-medium">{commissionPagination.totalCount}</span> matches
                                    </>
                                ) : (
                                    <>
                                        Total: <span className="text-white font-medium">{commissionPagination.totalCount}</span> users with commissions
                                    </>
                                )}
                            </p>
                        </div>

                        {/* Commissions Table */}
                        <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-2xl overflow-hidden mb-6">
                            <div className="overflow-x-auto">
                                <table className="w-full table-auto min-w-[1400px]">
                                    <thead>
                                        <tr className="bg-slate-800/50 border-b border-slate-700">
                                            <th className="text-left px-3 py-4 text-slate-300 font-medium text-sm w-[220px] sticky left-0 bg-slate-900 z-10"><span className="inline-flex items-center gap-1">User<InfoTooltip text="Creator's username" /></span></th>
                                            <th className="text-left px-3 py-4 text-slate-300 font-medium text-sm w-[140px]"><span className="inline-flex items-center gap-1">Paid<InfoTooltip text="Amount already paid" /></span></th>
                                            <th className="text-left px-3 py-4 text-slate-300 font-medium text-sm w-[140px]"><span className="inline-flex items-center gap-1">Pending<InfoTooltip text="Amount pending (non-cancelled)" /></span></th>
                                            <th className="text-left px-3 py-4 text-slate-300 font-medium text-sm w-[140px]"><span className="inline-flex items-center gap-1">Cancelled<InfoTooltip text="Sum from cancelled orders" /></span></th>
                                            <th className="text-left px-3 py-4 text-slate-300 font-medium text-sm w-[100px]"><span className="inline-flex items-center gap-1">Cancel%<InfoTooltip text="Cancelled / Total × 100" /></span></th>
                                            <th className="text-left px-3 py-4 text-slate-300 font-medium text-sm w-[100px]"><span className="inline-flex items-center gap-1">Agency%<InfoTooltip text="Highest agency rate from CSV" /></span></th>
                                            <th className="text-left px-3 py-4 text-slate-300 font-medium text-sm w-[140px]"><span className="inline-flex items-center gap-1">Est. Earning<InfoTooltip text="Agency% × Pending" /></span></th>
                                            <th className="text-left px-3 py-4 text-slate-300 font-medium text-sm w-[180px]"><span className="inline-flex items-center gap-1">Updated<InfoTooltip text="Last data update" /></span></th>
                                            <th className="text-right px-2 py-4 text-slate-300 font-medium text-sm w-[70px]"><span className="inline-flex items-center justify-end gap-1">Action<InfoTooltip text="View details" /></span></th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {commissionUsers.length === 0 ? (
                                            <tr>
                                                <td colSpan={9} className="px-6 py-12 text-center">
                                                    <div className="text-slate-500">
                                                        {commissionSearch ? (
                                                            <>
                                                                <svg className="w-12 h-12 mx-auto mb-4 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                                                </svg>
                                                                <p>No users found matching "{commissionSearch}"</p>
                                                            </>
                                                        ) : (
                                                            <>
                                                                <svg className="w-12 h-12 mx-auto mb-4 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                                </svg>
                                                                <p>No users with commissions yet</p>
                                                            </>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        ) : (
                                            commissionUsers.map((user) => (
                                                <tr key={user.id} className="border-b border-slate-800 hover:bg-slate-800/30 transition">
                                                    <td className="px-6 py-4 sticky left-0 bg-slate-900 z-10 shadow-[2px_0_4px_-1px_rgba(0,0,0,0.3)]">
                                                        <div className="flex items-center space-x-3">
                                                            <div>
                                                                <div className="text-white font-medium">{user.username || "No username"}</div>
                                                                <div className="text-slate-500 text-sm">{user.name || user.email || "-"}</div>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <span className="text-emerald-400 font-medium">
                                                            {user.commission?.paidCommission
                                                                ? `Rp${Number(user.commission.paidCommission).toLocaleString("id-ID")}`
                                                                : "-"}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <span className="text-amber-400 font-medium">
                                                            {user.commission?.pendingCommission
                                                                ? `Rp${Number(user.commission.pendingCommission).toLocaleString("id-ID")}`
                                                                : "-"}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <span className="text-red-400 font-medium">
                                                            {user.commission?.cancelledCommission
                                                                ? `Rp${Number(user.commission.cancelledCommission).toLocaleString("id-ID")}`
                                                                : "-"}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <span className="text-orange-400 font-medium">
                                                            {user.commission?.cancelledPercentage != null
                                                                ? `${user.commission.cancelledPercentage}%`
                                                                : "-"}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <span className="text-cyan-400 font-medium">
                                                            {user.commission?.agencyPercentage != null
                                                                ? `${user.commission.agencyPercentage}%`
                                                                : "-"}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <span className="text-purple-400 font-medium">
                                                            {user.commission?.agencyEarning
                                                                ? `Rp${Number(user.commission.agencyEarning).toLocaleString("id-ID")}`
                                                                : "-"}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 text-slate-400 text-sm">
                                                        {user.commission?.updatedAt ? formatDate(user.commission.updatedAt) : "-"}
                                                    </td>
                                                    <td className="px-2 py-4">
                                                        <div className="flex items-center justify-end">
                                                            <button
                                                                onClick={() => {
                                                                    setSelectedUser(user);
                                                                    setShowViewModal(true);
                                                                }}
                                                                className="p-2 text-slate-400 hover:text-cyan-400 hover:bg-slate-700 rounded-lg transition"
                                                                title="View details"
                                                            >
                                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                                                </svg>
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Pagination Controls */}
                        {commissionPagination.totalPages > 1 && (
                            <div className="flex items-center justify-between px-4 py-3 bg-slate-900/50 border border-slate-800 rounded-xl">
                                <div className="flex items-center text-sm text-slate-400">
                                    <span>
                                        Showing page <span className="font-medium text-white">{commissionPagination.page}</span> of{" "}
                                        <span className="font-medium text-white">{commissionPagination.totalPages}</span>
                                    </span>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <button
                                        onClick={() => handleCommissionPageChange(commissionPagination.page - 1)}
                                        disabled={commissionPagination.page <= 1}
                                        className="px-4 py-2 text-sm font-medium text-slate-300 bg-slate-800 border border-slate-700 rounded-lg hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
                                    >
                                        Previous
                                    </button>
                                    <button
                                        onClick={() => handleCommissionPageChange(commissionPagination.page + 1)}
                                        disabled={commissionPagination.page >= commissionPagination.totalPages}
                                        className="px-4 py-2 text-sm font-medium text-slate-300 bg-slate-800 border border-slate-700 rounded-lg hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
                                    >
                                        Next
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Kasbons Tab */}
                {activeTab === "kasbons" && (
                    <div>
                        {/* Search, Filter, and Sort Bar */}
                        <div className="flex flex-col md:flex-row gap-4 mb-6">
                            {/* Search Input */}
                            <div className="flex-1 relative">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                    <svg className="w-5 h-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                    </svg>
                                </div>
                                <input
                                    type="text"
                                    placeholder="Search by username, email, or name..."
                                    value={kasbonSearch}
                                    onChange={(e) => setKasbonSearch(e.target.value)}
                                    className="w-full pl-12 pr-4 py-3 bg-slate-800/50 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition"
                                />
                                {kasbonSearch && (
                                    <button
                                        onClick={() => setKasbonSearch("")}
                                        className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-500 hover:text-white transition"
                                    >
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                    </button>
                                )}
                            </div>

                            {/* Status Filter */}
                            <div className="relative">
                                <select
                                    value={kasbonStatusFilter}
                                    onChange={(e) => setKasbonStatusFilter(e.target.value)}
                                    className="appearance-none w-full md:w-44 px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
                                >
                                    <option value="all">All Status</option>
                                    <option value="REQUESTED">Requested</option>
                                    <option value="PENDING">Pending</option>
                                    <option value="COMPLETED">Completed</option>
                                    <option value="REJECTED">Rejected</option>
                                </select>
                                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-slate-400">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                    </svg>
                                </div>
                            </div>

                            {/* Sort Dropdown */}
                            <div className="relative">
                                <select
                                    value={`${kasbonSort.field}-${kasbonSort.order}`}
                                    onChange={(e) => {
                                        const [field, order] = e.target.value.split("-");
                                        setKasbonSort({ field, order });
                                    }}
                                    className="appearance-none w-full md:w-48 px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
                                >
                                    <option value="createdAt-desc">Newest First</option>
                                    <option value="createdAt-asc">Oldest First</option>
                                    <option value="amount-desc">Highest Amount</option>
                                    <option value="amount-asc">Lowest Amount</option>
                                    <option value="updatedAt-desc">Last Updated</option>
                                </select>
                                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-slate-400">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                    </svg>
                                </div>
                            </div>
                        </div>

                        {/* Results Count */}
                        <div className="flex items-center justify-between mb-4">
                            <p className="text-slate-400 text-sm">
                                {kasbonSearch || kasbonStatusFilter !== "all" ? (
                                    <>
                                        Found <span className="text-white font-medium">{kasbonPagination.totalCount}</span> matches
                                    </>
                                ) : (
                                    <>
                                        Total: <span className="text-white font-medium">{kasbonPagination.totalCount}</span> kasbon requests
                                    </>
                                )}
                            </p>
                        </div>

                        {/* Kasbons Table */}
                        <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-2xl overflow-hidden mb-6">
                            <div className="overflow-x-auto">
                                <table className="w-full table-auto min-w-[1000px]">
                                    <thead>
                                        <tr className="bg-slate-800/50 border-b border-slate-700">
                                            <th className="text-left px-4 py-4 text-slate-300 font-medium text-sm w-[220px] sticky left-0 bg-slate-900 z-10"><span className="inline-flex items-center gap-1">User<InfoTooltip text="Requesting user" /></span></th>
                                            <th className="text-left px-4 py-4 text-slate-300 font-medium text-sm w-[150px]"><span className="inline-flex items-center gap-1">Amount<InfoTooltip text="Requested amount in IDR" /></span></th>
                                            <th className="text-left px-4 py-4 text-slate-300 font-medium text-sm w-[120px]"><span className="inline-flex items-center gap-1">Status<InfoTooltip text="REQUESTED → PENDING → COMPLETED/REJECTED" /></span></th>
                                            <th className="text-left px-4 py-4 text-slate-300 font-medium text-sm w-auto"><span className="inline-flex items-center gap-1">Note<InfoTooltip text="Optional note from user" /></span></th>
                                            <th className="text-left px-4 py-4 text-slate-300 font-medium text-sm w-[180px]"><span className="inline-flex items-center gap-1">Created<InfoTooltip text="Request submission date" /></span></th>
                                            <th className="text-left px-4 py-4 text-slate-300 font-medium text-sm w-[180px]"><span className="inline-flex items-center gap-1">Updated<InfoTooltip text="Last status update" /></span></th>
                                            <th className="text-right px-2 py-4 text-slate-300 font-medium text-sm w-[90px]"><span className="inline-flex items-center justify-end gap-1">Actions<InfoTooltip text="Approve, reject, or complete" /></span></th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {kasbons.length === 0 ? (
                                            <tr>
                                                <td colSpan={7} className="px-6 py-12 text-center">
                                                    <div className="text-slate-500">
                                                        {kasbonSearch || kasbonStatusFilter !== "all" ? (
                                                            <>
                                                                <svg className="w-12 h-12 mx-auto mb-4 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                                                </svg>
                                                                <p>No kasbon requests found</p>
                                                            </>
                                                        ) : (
                                                            <>
                                                                <svg className="w-12 h-12 mx-auto mb-4 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                                                </svg>
                                                                <p>No kasbon requests yet</p>
                                                            </>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        ) : (
                                            kasbons.map((kasbon) => (
                                                <tr key={kasbon.id} className="border-b border-slate-800 hover:bg-slate-800/30 transition">
                                                    <td className="px-6 py-4 sticky left-0 bg-slate-900 z-10 shadow-[2px_0_4px_-1px_rgba(0,0,0,0.3)]">
                                                        <div className="flex items-center space-x-3">
                                                            <div>
                                                                <div className="text-white font-medium">{kasbon.user.username || "No username"}</div>
                                                                <div className="text-slate-500 text-sm">{kasbon.user.name || kasbon.user.email || "-"}</div>
                                                                {kasbon.user.whatsapp && (
                                                                    <div className="text-green-500 text-xs">WA: {kasbon.user.whatsapp}</div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <span className="text-amber-400 font-bold">
                                                            Rp {Number(kasbon.amount).toLocaleString("id-ID")}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${kasbon.status === "REQUESTED" ? "bg-blue-500/20 text-blue-400" :
                                                            kasbon.status === "PENDING" ? "bg-amber-500/20 text-amber-400" :
                                                                kasbon.status === "COMPLETED" ? "bg-emerald-500/20 text-emerald-400" :
                                                                    "bg-red-500/20 text-red-400"
                                                            }`}>
                                                            {kasbon.status}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 text-slate-400 text-sm max-w-xs truncate">
                                                        {kasbon.note || "-"}
                                                    </td>
                                                    <td className="px-6 py-4 text-slate-400 text-sm">
                                                        {formatDate(kasbon.createdAt)}
                                                    </td>
                                                    <td className="px-6 py-4 text-slate-400 text-sm">
                                                        {formatDate(kasbon.updatedAt)}
                                                    </td>
                                                    <td className="px-2 py-4">
                                                        <div className="flex items-center justify-end">
                                                            <button
                                                                onClick={() => {
                                                                    setSelectedKasbon(kasbon);
                                                                    setKasbonUpdateStatus(kasbon.status);
                                                                    setKasbonAdminNote(kasbon.adminNote || "");
                                                                    setShowKasbonModal(true);
                                                                }}
                                                                className="p-2 text-slate-400 hover:text-emerald-400 hover:bg-slate-700 rounded-lg transition"
                                                                title="Update status"
                                                            >
                                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                                                </svg>
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Pagination Controls */}
                        {kasbonPagination.totalPages > 1 && (
                            <div className="flex items-center justify-between px-4 py-3 bg-slate-900/50 border border-slate-800 rounded-xl">
                                <div className="flex items-center text-sm text-slate-400">
                                    <span>
                                        Showing page <span className="font-medium text-white">{kasbonPagination.page}</span> of{" "}
                                        <span className="font-medium text-white">{kasbonPagination.totalPages}</span>
                                    </span>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <button
                                        onClick={() => handleKasbonPageChange(kasbonPagination.page - 1)}
                                        disabled={kasbonPagination.page <= 1}
                                        className="px-4 py-2 text-sm font-medium text-slate-300 bg-slate-800 border border-slate-700 rounded-lg hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
                                    >
                                        Previous
                                    </button>
                                    <button
                                        onClick={() => handleKasbonPageChange(kasbonPagination.page + 1)}
                                        disabled={kasbonPagination.page >= kasbonPagination.totalPages}
                                        className="px-4 py-2 text-sm font-medium text-slate-300 bg-slate-800 border border-slate-700 rounded-lg hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
                                    >
                                        Next
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Kasbon Status Update Modal */}
            {showKasbonModal && selectedKasbon && (
                <Modal title="Update Kasbon Status" onClose={() => setShowKasbonModal(false)}>
                    <div className="space-y-4">
                        <div className="p-4 bg-slate-800/50 rounded-xl">
                            <p className="text-slate-400 text-sm mb-1">User</p>
                            <p className="text-white font-medium">{selectedKasbon.user.username || selectedKasbon.user.email}</p>
                        </div>
                        <div className="p-4 bg-slate-800/50 rounded-xl">
                            <p className="text-slate-400 text-sm mb-1">Amount</p>
                            <p className="text-amber-400 font-bold text-lg">Rp {Number(selectedKasbon.amount).toLocaleString("id-ID")}</p>
                        </div>
                        {selectedKasbon.note && (
                            <div className="p-4 bg-slate-800/50 rounded-xl">
                                <p className="text-slate-400 text-sm mb-1">User Note</p>
                                <p className="text-white">{selectedKasbon.note}</p>
                            </div>
                        )}
                        <div>
                            <label className="block text-sm font-medium text-slate-400 mb-2">Status</label>
                            <select
                                value={kasbonUpdateStatus}
                                onChange={(e) => setKasbonUpdateStatus(e.target.value)}
                                className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                            >
                                <option value="REQUESTED">Requested</option>
                                <option value="PENDING">Pending</option>
                                <option value="COMPLETED">Completed</option>
                                <option value="REJECTED">Rejected</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-400 mb-2">Admin Note (optional)</label>
                            <textarea
                                value={kasbonAdminNote}
                                onChange={(e) => setKasbonAdminNote(e.target.value)}
                                placeholder="Add a note for the user..."
                                rows={3}
                                className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
                            />
                        </div>
                        <div className="flex space-x-3 pt-2">
                            <button
                                onClick={() => setShowKasbonModal(false)}
                                className="flex-1 px-4 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleKasbonStatusUpdate}
                                disabled={kasbonUpdating}
                                className="flex-1 px-4 py-3 bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600 text-white font-medium rounded-lg transition disabled:opacity-50"
                            >
                                {kasbonUpdating ? "Updating..." : "Update Status"}
                            </button>
                        </div>
                    </div>
                </Modal>
            )}

            {/* Create User Modal */}
            {
                showCreateModal && (
                    <Modal title={createdUser ? "User Created Successfully" : "Create New User"} onClose={() => setShowCreateModal(false)}>
                        {createdUser ? (
                            <div className="space-y-6">
                                <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl">
                                    <div className="flex items-center space-x-3 mb-2">
                                        <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400">
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                            </svg>
                                        </div>
                                        <h3 className="text-lg font-medium text-emerald-400">Account Created!</h3>
                                    </div>
                                    <p className="text-slate-400 text-sm">
                                        Please copy the credentials below. The password will not be visible again.
                                    </p>
                                </div>

                                <div className="space-y-4">
                                    <div>
                                        <label className="text-xs font-medium text-slate-500 uppercase tracking-wider">Username</label>
                                        <div className="flex items-center justify-between p-3 bg-slate-900 rounded-lg border border-slate-700">
                                            <span className="text-white font-mono">{createdUser.username}</span>
                                            <button
                                                onClick={() => navigator.clipboard.writeText(createdUser.username)}
                                                className="text-slate-400 hover:text-white transition"
                                                title="Copy username"
                                            >
                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                                </svg>
                                            </button>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="text-xs font-medium text-slate-500 uppercase tracking-wider">Password</label>
                                        <div className="flex items-center justify-between p-3 bg-slate-900 rounded-lg border border-slate-700">
                                            <span className="text-white font-mono">{createdUser.password}</span>
                                            <button
                                                onClick={() => navigator.clipboard.writeText(createdUser.password)}
                                                className="text-slate-400 hover:text-white transition"
                                                title="Copy password"
                                            >
                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                                </svg>
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex justify-end pt-2">
                                    <button
                                        onClick={() => {
                                            setCreatedUser(null);
                                            setShowCreateModal(false);
                                        }}
                                        className="px-6 py-2 bg-slate-800 hover:bg-slate-700 text-white font-medium rounded-lg transition"
                                    >
                                        Close
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <form onSubmit={handleCreateUser} className="space-y-4">
                                {formError && (
                                    <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-lg text-sm">
                                        {formError}
                                    </div>
                                )}
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-300 mb-2">Username *</label>
                                        <input
                                            type="text"
                                            value={formData.username}
                                            onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                                            className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-300 mb-2">Email</label>
                                        <input
                                            type="email"
                                            value={formData.email}
                                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                            className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-2">Password *</label>
                                    <div className="relative">
                                        <input
                                            type="text"
                                            value={formData.password}
                                            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                            className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 pr-24"
                                            required
                                        />
                                        <button
                                            type="button"
                                            onClick={() => {
                                                const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*";
                                                let pass = "";
                                                for (let i = 0; i < 12; i++) pass += chars[Math.floor(Math.random() * chars.length)];
                                                setFormData({ ...formData, password: pass });
                                            }}
                                            className="absolute right-2 top-1.5 px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs font-medium rounded transition"
                                        >
                                            Generate
                                        </button>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-2">Name</label>
                                    <input
                                        type="text"
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-2">ManyChat ID</label>
                                    <input
                                        type="text"
                                        value={formData.manychatId}
                                        onChange={(e) => setFormData({ ...formData, manychatId: e.target.value })}
                                        className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                        placeholder="Optional"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-2">WhatsApp</label>
                                    <input
                                        type="text"
                                        value={formData.whatsapp}
                                        onChange={(e) => setFormData({ ...formData, whatsapp: e.target.value })}
                                        className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                        placeholder="Optional - e.g. 6281234567890"
                                    />
                                </div>

                                <div className="flex gap-6 pt-2">
                                    <label className="flex items-center space-x-3 cursor-pointer group">
                                        <input
                                            type="checkbox"
                                            checked={formData.go}
                                            onChange={(e) => setFormData({ ...formData, go: e.target.checked })}
                                            className="w-5 h-5 rounded border-slate-600 bg-slate-800 text-blue-500 focus:ring-blue-500/50 transition"
                                        />
                                        <span className="text-slate-300 group-hover:text-white transition">GO User</span>
                                    </label>
                                    <label className="flex items-center space-x-3 cursor-pointer group">
                                        <input
                                            type="checkbox"
                                            checked={formData.mcn}
                                            onChange={(e) => setFormData({ ...formData, mcn: e.target.checked })}
                                            className="w-5 h-5 rounded border-slate-600 bg-slate-800 text-purple-500 focus:ring-purple-500/50 transition"
                                        />
                                        <span className="text-slate-300 group-hover:text-white transition">MCN User</span>
                                    </label>
                                </div>

                                <div className="flex justify-end space-x-3 pt-6 border-t border-slate-800">
                                    <button
                                        type="button"
                                        onClick={() => setShowCreateModal(false)}
                                        className="px-4 py-2 text-slate-400 hover:text-white transition"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={formLoading}
                                        className="px-6 py-2 bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600 text-white font-medium rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {formLoading ? "Creating..." : "Create User"}
                                    </button>
                                </div>
                            </form>
                        )}
                    </Modal>
                )
            }

            {/* Edit User Modal */}
            {
                showEditModal && selectedUser && (
                    <Modal title={`Edit User: ${selectedUser.username || selectedUser.email}`} onClose={() => setShowEditModal(false)}>
                        <form onSubmit={handleEditUser} className="space-y-4">
                            {formError && (
                                <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-lg text-sm">
                                    {formError}
                                </div>
                            )}
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-2">Username</label>
                                <input
                                    type="text"
                                    value={formData.username}
                                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                                    className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-2">Email</label>
                                <input
                                    type="email"
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                    className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-2">New Password</label>
                                <input
                                    type="password"
                                    value={formData.password}
                                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                    placeholder="Leave blank to keep current password"
                                    className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-2">Name</label>
                                <input
                                    type="text"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-2">WhatsApp</label>
                                <input
                                    type="text"
                                    value={formData.whatsapp}
                                    onChange={(e) => setFormData({ ...formData, whatsapp: e.target.value })}
                                    placeholder="e.g., 6281234567890"
                                    className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                />
                            </div>
                            <div className="flex gap-6 pt-2">
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={formData.go}
                                        onChange={(e) => setFormData({ ...formData, go: e.target.checked })}
                                        className="w-5 h-5 rounded border-slate-600 bg-slate-800 text-emerald-500 focus:ring-emerald-500 focus:ring-offset-0 cursor-pointer"
                                    />
                                    <span className="text-blue-400 font-medium">GO</span>
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={formData.mcn}
                                        onChange={(e) => setFormData({ ...formData, mcn: e.target.checked })}
                                        className="w-5 h-5 rounded border-slate-600 bg-slate-800 text-emerald-500 focus:ring-emerald-500 focus:ring-offset-0 cursor-pointer"
                                    />
                                    <span className="text-purple-400 font-medium">MCN</span>
                                </label>
                            </div>
                            <div className="flex justify-end space-x-3 pt-4">
                                <button
                                    type="button"
                                    onClick={() => setShowEditModal(false)}
                                    className="px-4 py-2 text-slate-400 hover:text-white transition"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={formLoading}
                                    className="px-6 py-2 bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600 text-white font-medium rounded-lg transition disabled:opacity-50"
                                >
                                    {formLoading ? "Saving..." : "Save Changes"}
                                </button>
                            </div>
                        </form>
                    </Modal>
                )
            }

            {/* Delete Confirmation Modal */}
            {
                showDeleteModal && selectedUser && (
                    <Modal title="Delete User" onClose={() => setShowDeleteModal(false)}>
                        <div className="space-y-4">
                            {formError && (
                                <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-lg text-sm">
                                    {formError}
                                </div>
                            )}
                            <p className="text-slate-300">
                                Are you sure you want to delete the user <strong className="text-white">{selectedUser.username || selectedUser.email}</strong>?
                            </p>
                            <p className="text-red-400 text-sm">
                                This action cannot be undone. All associated profiles, pages, and data will be permanently deleted.
                            </p>
                            <div className="flex justify-end space-x-3 pt-4">
                                <button
                                    onClick={() => setShowDeleteModal(false)}
                                    className="px-4 py-2 text-slate-400 hover:text-white transition"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleDeleteUser}
                                    disabled={formLoading}
                                    className="px-6 py-2 bg-red-500 hover:bg-red-600 text-white font-medium rounded-lg transition disabled:opacity-50"
                                >
                                    {formLoading ? "Deleting..." : "Delete User"}
                                </button>
                            </div>
                        </div>
                    </Modal>
                )
            }

            {/* View User Modal */}
            {
                showViewModal && selectedUser && (
                    <Modal title="User Details" onClose={() => setShowViewModal(false)}>
                        <div className="space-y-4">
                            {/* Avatar and basic info */}
                            <div className="flex items-center space-x-4 pb-4 border-b border-slate-700">
                                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-emerald-500 to-cyan-500 flex items-center justify-center text-white text-2xl font-bold">
                                    {(selectedUser.username || selectedUser.email || "?")[0].toUpperCase()}
                                </div>
                                <div>
                                    <div className="text-xl font-semibold text-white">{selectedUser.username || "No username"}</div>
                                    <div className="text-slate-400">{selectedUser.name || "No name"}</div>
                                    <div className="flex gap-2 mt-1">
                                        {selectedUser.go && (
                                            <span className="px-2 py-0.5 bg-blue-500/20 text-blue-400 rounded text-xs font-medium">GO</span>
                                        )}
                                        {selectedUser.mcn && (
                                            <span className="px-2 py-0.5 bg-purple-500/20 text-purple-400 rounded text-xs font-medium">MCN</span>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Details */}
                            <div className="space-y-3">
                                <div className="flex justify-between">
                                    <span className="text-slate-400">Email</span>
                                    <span className="text-white">{selectedUser.email || "-"}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-slate-400">User ID</span>
                                    <span className="text-slate-300 font-mono text-sm">{selectedUser.id}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-slate-400">ManyChat ID</span>
                                    <div className="flex items-center gap-2">
                                        <span className="text-slate-300 font-mono text-sm">{selectedUser.manychatId || "-"}</span>
                                        {selectedUser.manychatId && <CopyButton text={selectedUser.manychatId} />}
                                    </div>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-slate-400">WhatsApp</span>
                                    <div className="flex items-center gap-2">
                                        <span className="text-green-400 font-mono text-sm">{selectedUser.whatsapp || "-"}</span>
                                        {selectedUser.whatsapp && <CopyButton text={selectedUser.whatsapp} />}
                                    </div>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-slate-400">Created</span>
                                    <span className="text-white">{formatDate(selectedUser.createdAt)}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-slate-400">Updated</span>
                                    <span className="text-white">{formatDate(selectedUser.updatedAt)}</span>
                                </div>
                            </div>

                            {/* Stats */}
                            <div className="grid grid-cols-3 gap-3 pt-4 border-t border-slate-700">
                                <div className="bg-slate-800/50 rounded-lg p-3 text-center">
                                    <div className="text-emerald-400 text-xl font-bold">{selectedUser._count.profiles}</div>
                                    <div className="text-slate-400 text-xs">Profiles</div>
                                </div>
                                <div className="bg-slate-800/50 rounded-lg p-3 text-center">
                                    <div className="text-cyan-400 text-xl font-bold">{selectedUser._count.aiGeneratedPages}</div>
                                    <div className="text-slate-400 text-xs">AI Pages</div>
                                </div>
                                <div className="bg-slate-800/50 rounded-lg p-3 text-center">
                                    <div className="text-purple-400 text-xl font-bold">{selectedUser._count.refreshTokens}</div>
                                    <div className="text-slate-400 text-xs">Sessions</div>
                                </div>
                            </div>

                            {/* Commission Info */}
                            {selectedUser.commission && (
                                <div className="pt-4 border-t border-slate-700">
                                    <div className="text-sm font-medium text-slate-300 mb-3">💰 Commission</div>
                                    <div className="grid grid-cols-3 gap-3">
                                        <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-3">
                                            <div className="text-xs text-slate-400 mb-1">Paid</div>
                                            <div className="text-emerald-400 font-bold">
                                                {selectedUser.commission.paidCommission
                                                    ? `Rp${Number(selectedUser.commission.paidCommission).toLocaleString("id-ID")}`
                                                    : "-"}
                                            </div>
                                        </div>
                                        <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3">
                                            <div className="text-xs text-slate-400 mb-1">Pending</div>
                                            <div className="text-amber-400 font-bold">
                                                {selectedUser.commission.pendingCommission
                                                    ? `Rp${Number(selectedUser.commission.pendingCommission).toLocaleString("id-ID")}`
                                                    : "-"}
                                            </div>
                                        </div>
                                        <div className="bg-cyan-500/10 border border-cyan-500/30 rounded-lg p-3">
                                            <div className="text-xs text-slate-400 mb-1">Agency %</div>
                                            <div className="text-cyan-400 font-bold">
                                                {selectedUser.commission.agencyPercentage != null
                                                    ? `${selectedUser.commission.agencyPercentage}%`
                                                    : "-"}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Profiles List */}
                            {selectedUser.profiles.length > 0 && (
                                <div className="pt-4 border-t border-slate-700">
                                    <div className="text-sm font-medium text-slate-300 mb-2">Profiles</div>
                                    <div className="space-y-2 max-h-32 overflow-y-auto">
                                        {selectedUser.profiles.map((profile) => (
                                            <a
                                                key={profile.id}
                                                href={`https://entro.ly/${profile.username}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="flex items-center justify-between p-2 bg-slate-800/50 hover:bg-slate-700/50 rounded-lg transition group"
                                            >
                                                <div className="flex items-center gap-2">
                                                    <span className="text-emerald-400">🔗</span>
                                                    <span className="text-white group-hover:text-emerald-400 transition">{profile.displayName}</span>
                                                </div>
                                                <span className="text-slate-500 text-sm">@{profile.username}</span>
                                            </a>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* AI Pages List */}
                            {selectedUser.aiGeneratedPages.length > 0 && (
                                <div className="pt-4 border-t border-slate-700">
                                    <div className="text-sm font-medium text-slate-300 mb-2">AI Pages</div>
                                    <div className="space-y-2 max-h-32 overflow-y-auto">
                                        {selectedUser.aiGeneratedPages.map((page) => (
                                            <a
                                                key={page.id}
                                                href={`https://entro.ly/${page.slug}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="flex items-center justify-between p-2 bg-slate-800/50 hover:bg-slate-700/50 rounded-lg transition group"
                                            >
                                                <div className="flex items-center gap-2">
                                                    <span className="text-cyan-400">🤖</span>
                                                    <span className="text-white group-hover:text-cyan-400 transition truncate max-w-[200px]">
                                                        {page.prompt.substring(0, 30)}{page.prompt.length > 30 ? "..." : ""}
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    {page.isPublished ? (
                                                        <span className="px-1.5 py-0.5 bg-emerald-500/20 text-emerald-400 rounded text-xs">Live</span>
                                                    ) : (
                                                        <span className="px-1.5 py-0.5 bg-slate-600/50 text-slate-400 rounded text-xs">Draft</span>
                                                    )}
                                                    <span className="text-slate-500 text-sm">/{page.slug}</span>
                                                </div>
                                            </a>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <div className="flex justify-end pt-2">
                                <button
                                    onClick={() => setShowViewModal(false)}
                                    className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition"
                                >
                                    Close
                                </button>
                            </div>
                        </div>
                    </Modal>
                )
            }

            {/* Import Progress Modal */}
            {showImportModal && (
                <Modal title="Importing Commissions" onClose={() => !commissionImporting && setShowImportModal(false)}>
                    <div className="space-y-6">
                        {/* Progress Bar */}
                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-slate-300 text-sm">{importMessage}</span>
                                <span className="text-emerald-400 font-bold text-lg">{importProgress}%</span>
                            </div>
                            <div className="w-full h-3 bg-slate-800 rounded-full overflow-hidden">
                                <div
                                    className={`h-full transition-all duration-300 rounded-full ${importError
                                        ? "bg-red-500"
                                        : importProgress === 100
                                            ? "bg-gradient-to-r from-emerald-500 to-cyan-500"
                                            : "bg-gradient-to-r from-amber-500 to-orange-500"
                                        }`}
                                    style={{ width: `${importProgress}%` }}
                                />
                            </div>
                        </div>

                        {/* Error Message */}
                        {importError && (
                            <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-lg">
                                {importError}
                            </div>
                        )}

                        {/* Success Summary */}
                        {importSummary && !importError && (
                            <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-4 space-y-3">
                                <div className="flex items-center gap-2 text-emerald-400">
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    <span className="font-bold">Import Successful!</span>
                                </div>
                                <div className="grid grid-cols-2 gap-3 text-sm">
                                    <div className="bg-slate-800/50 rounded-lg p-3">
                                        <div className="text-slate-500">Orders in CSV</div>
                                        <div className="text-white font-bold">{importSummary.totalRowsInCSV.toLocaleString()}</div>
                                    </div>
                                    <div className="bg-slate-800/50 rounded-lg p-3">
                                        <div className="text-slate-500">Unique Creators</div>
                                        <div className="text-white font-bold">{importSummary.uniqueCreators.toLocaleString()}</div>
                                    </div>
                                    <div className="bg-slate-800/50 rounded-lg p-3">
                                        <div className="text-slate-500">Matched Users</div>
                                        <div className="text-amber-400 font-bold">{importSummary.matchedUsers.toLocaleString()}</div>
                                    </div>
                                    <div className="bg-slate-800/50 rounded-lg p-3">
                                        <div className="text-slate-500">Commissions Created</div>
                                        <div className="text-emerald-400 font-bold">{importSummary.commissionsCreated.toLocaleString()}</div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Close Button */}
                        <div className="flex justify-end">
                            <button
                                onClick={() => setShowImportModal(false)}
                                disabled={commissionImporting}
                                className={`px-6 py-2 rounded-lg font-medium transition ${commissionImporting
                                    ? "bg-slate-700 text-slate-500 cursor-not-allowed"
                                    : "bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600 text-white"
                                    }`}
                            >
                                {commissionImporting ? "Please wait..." : "Close"}
                            </button>
                        </div>
                    </div>
                </Modal>
            )}
            {/* Bulk Import Progress Modal */}
            {showBulkImportModal && (
                <Modal title="Bulk Import Users" onClose={() => !bulkImporting && setShowBulkImportModal(false)}>
                    <div className="space-y-6">
                        {/* Progress Bar */}
                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-slate-300 text-sm">{bulkImportMessage}</span>
                                <span className="text-emerald-400 font-bold text-lg">{bulkImportProgress}%</span>
                            </div>
                            <div className="w-full h-3 bg-slate-800 rounded-full overflow-hidden">
                                <div
                                    className={`h-full transition-all duration-300 rounded-full ${bulkImportError
                                        ? "bg-red-500"
                                        : bulkImportProgress === 100
                                            ? "bg-gradient-to-r from-emerald-500 to-cyan-500"
                                            : "bg-gradient-to-r from-amber-500 to-orange-500"
                                        }`}
                                    style={{ width: `${bulkImportProgress}%` }}
                                />
                            </div>
                        </div>

                        {/* Error Message */}
                        {bulkImportError && (
                            <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-lg">
                                {bulkImportError}
                            </div>
                        )}

                        {/* Success Summary */}
                        {bulkImportSummary && !bulkImportError && (
                            <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-4 space-y-3">
                                <div className="flex items-center gap-2 text-emerald-400">
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    <span className="font-bold">Import Successful!</span>
                                </div>
                                <div className="grid grid-cols-2 gap-3 text-sm">
                                    <div className="bg-slate-800/50 rounded-lg p-3">
                                        <div className="text-slate-500">Total Users</div>
                                        <div className="text-white font-bold">{bulkImportSummary.totalInCSV?.toLocaleString() || 0}</div>
                                    </div>
                                    <div className="bg-slate-800/50 rounded-lg p-3">
                                        <div className="text-slate-500">Skipped (Exist)</div>
                                        <div className="text-amber-400 font-bold">{bulkImportSummary.skipped?.toLocaleString() || 0}</div>
                                    </div>
                                    <div className="bg-slate-800/50 rounded-lg p-3 col-span-2">
                                        <div className="text-slate-500">Created Successfully</div>
                                        <div className="text-emerald-400 font-bold">{bulkImportSummary.created?.toLocaleString() || 0}</div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Close Button */}
                        <div className="flex justify-end">
                            <button
                                onClick={() => setShowBulkImportModal(false)}
                                disabled={bulkImporting}
                                className={`px-6 py-2 rounded-lg font-medium transition ${bulkImporting
                                    ? "bg-slate-700 text-slate-500 cursor-not-allowed"
                                    : "bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600 text-white"
                                    }`}
                            >
                                {bulkImporting ? "Please wait..." : "Close"}
                            </button>
                        </div>
                    </div>
                </Modal>
            )}
        </div >
    );
}

// Stat Card Component
function StatCard({ title, value, icon, color }: { title: string; value: number; icon: string; color: string }) {
    const colorClasses: Record<string, string> = {
        emerald: "from-emerald-500/20 to-emerald-500/5 border-emerald-500/30",
        cyan: "from-cyan-500/20 to-cyan-500/5 border-cyan-500/30",
        purple: "from-purple-500/20 to-purple-500/5 border-purple-500/30",
        pink: "from-pink-500/20 to-pink-500/5 border-pink-500/30",
        amber: "from-amber-500/20 to-amber-500/5 border-amber-500/30",
        blue: "from-blue-500/20 to-blue-500/5 border-blue-500/30",
    };

    return (
        <div className={`bg-gradient-to-br ${colorClasses[color]} border rounded-2xl p-6`}>
            <div className="flex items-center justify-between mb-4">
                <span className="text-3xl">{icon}</span>
            </div>
            <div className="text-3xl font-bold text-white mb-1">{value}</div>
            <div className="text-slate-400 text-sm">{title}</div>
        </div>
    );
}

// Modal Component
function Modal({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
            <div className="relative bg-slate-900 border border-slate-800 rounded-2xl p-6 w-full max-w-md mx-4 shadow-2xl">
                <h2 className="text-xl font-bold text-white mb-6">{title}</h2>
                {children}
            </div>
        </div>
    );
}
