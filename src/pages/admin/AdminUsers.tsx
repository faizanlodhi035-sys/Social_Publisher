import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { adminApi, type UserProfile, type PlanDefinition } from "../../services/adminApi";
import {
  Users,
  Search,
  CheckCircle2,
  XCircle,
  Shield,
  CreditCard,
  ChevronRight,
  RefreshCw,
  AlertTriangle,
  UserCheck,
  UserX,
} from "lucide-react";

export const AdminUsers: React.FC = () => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [plans, setPlans] = useState<PlanDefinition[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [planFilter, setPlanFilter] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [error, setError] = useState<string | null>(null);

  // Modal / Action state
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [actionType, setActionType] = useState<"suspend" | "plan" | null>(null);
  const [suspendReason, setSuspendReason] = useState("");
  const [newPlanId, setNewPlanId] = useState("free");
  const [actionLoading, setActionLoading] = useState(false);

  const fetchUsers = async () => {
    setLoading(true);
    setError(null);
    try {
      const [userList, planList] = await Promise.all([
        adminApi.getUsers({ search, status: statusFilter, plan: planFilter, role: roleFilter }),
        adminApi.getPlans(),
      ]);
      setUsers(userList);
      setPlans(planList);
    } catch (err: any) {
      setError(err.message || "Failed to load users");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [search, statusFilter, planFilter, roleFilter]);

  const handleSuspend = async () => {
    if (!selectedUser) return;
    setActionLoading(true);
    try {
      await adminApi.suspendUser(selectedUser.uid, suspendReason);
      await fetchUsers();
      setSelectedUser(null);
      setActionType(null);
      setSuspendReason("");
    } catch (err: any) {
      alert(err.message || "Failed to suspend user");
    } finally {
      setActionLoading(false);
    }
  };

  const handleActivate = async (user: UserProfile) => {
    if (!confirm(`Reactivate user account for ${user.email}?`)) return;
    try {
      await adminApi.activateUser(user.uid);
      await fetchUsers();
    } catch (err: any) {
      alert(err.message || "Failed to activate user");
    }
  };

  const handleChangePlan = async () => {
    if (!selectedUser) return;
    setActionLoading(true);
    try {
      await adminApi.updateUserPlan(selectedUser.uid, newPlanId);
      await fetchUsers();
      setSelectedUser(null);
      setActionType(null);
    } catch (err: any) {
      alert(err.message || "Failed to update plan");
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <Users className="w-6 h-6 text-indigo-400" /> User Management
          </h1>
          <p className="text-sm text-slate-400">
            Audit, inspect entitlements, suspend/reactivate, and assign subscription plans across all customer tenants.
          </p>
        </div>
        <button
          onClick={fetchUsers}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800/80 hover:bg-slate-800 text-slate-200 text-xs font-semibold border border-slate-700/60 transition-colors self-start sm:self-auto"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Refresh List
        </button>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Filter Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 bg-slate-900/80 p-4 rounded-2xl border border-slate-800/80">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Search email, UID, or name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-950/80 border border-slate-700/60 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="bg-slate-950/80 border border-slate-700/60 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
        >
          <option value="">All Statuses</option>
          <option value="active">Active</option>
          <option value="suspended">Suspended</option>
        </select>

        <select
          value={planFilter}
          onChange={(e) => setPlanFilter(e.target.value)}
          className="bg-slate-950/80 border border-slate-700/60 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
        >
          <option value="">All Plans</option>
          <option value="free">Free</option>
          <option value="basic">Basic</option>
          <option value="pro">Pro</option>
          <option value="custom">Custom</option>
        </select>

        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="bg-slate-950/80 border border-slate-700/60 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
        >
          <option value="">All Roles</option>
          <option value="user">User</option>
          <option value="saas_admin">SaaS Admin</option>
        </select>
      </div>

      {/* User Table */}
      <div className="bg-slate-900/80 border border-slate-800/80 rounded-2xl overflow-hidden shadow-sm">
        {loading ? (
          <div className="p-12 text-center text-slate-400 text-xs">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto text-indigo-500 mb-2" />
            Fetching registered users...
          </div>
        ) : users.length === 0 ? (
          <div className="p-12 text-center text-slate-500 text-xs">
            No matching users found.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/60 text-slate-400 uppercase font-semibold border-b border-slate-800/80">
                <tr>
                  <th className="py-3.5 px-4">User Info</th>
                  <th className="py-3.5 px-4">SaaS Role</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4">Current Plan</th>
                  <th className="py-3.5 px-4">Primary Workspace</th>
                  <th className="py-3.5 px-4">Created At</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {users.map((u) => {
                  const isSuspended = u.status === "suspended";
                  const isAdmin = u.saasRole === "saas_admin";

                  return (
                    <tr key={u.uid} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-white">{u.displayName || "User"}</div>
                        <div className="text-slate-400 font-mono text-[11px]">{u.email}</div>
                      </td>

                      <td className="py-3.5 px-4">
                        {isAdmin ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-semibold text-[10px] bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                            <Shield className="w-3 h-3" /> SaaS Admin
                          </span>
                        ) : (
                          <span className="px-2.5 py-0.5 rounded-full font-semibold text-[10px] bg-slate-800 text-slate-400 border border-slate-700">
                            User
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-4">
                        {isSuspended ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-semibold text-[10px] bg-rose-500/10 text-rose-400 border border-rose-500/20">
                            <XCircle className="w-3 h-3" /> Suspended
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-semibold text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            <CheckCircle2 className="w-3 h-3" /> Active
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-4">
                        <span className="px-2.5 py-1 rounded-lg font-bold uppercase text-[10px] bg-purple-500/10 text-purple-300 border border-purple-500/20">
                          {u.userPlan || "free"}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 font-mono text-[11px] text-slate-400">
                        {u.primaryWorkspaceId}
                      </td>

                      <td className="py-3.5 px-4 text-slate-400 whitespace-nowrap">
                        {new Date(u.createdAt).toLocaleDateString()}
                      </td>

                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-2">
                          <Link
                            to={`/admin/users/${u.uid}`}
                            className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-semibold transition-colors inline-flex items-center gap-1"
                          >
                            Details <ChevronRight className="w-3 h-3" />
                          </Link>

                          <button
                            onClick={() => {
                              setSelectedUser(u);
                              setNewPlanId(u.userPlan || "free");
                              setActionType("plan");
                            }}
                            className="px-2.5 py-1.5 rounded-lg bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 border border-purple-500/20 text-[11px] font-semibold transition-colors"
                          >
                            Change Plan
                          </button>

                          {isSuspended ? (
                            <button
                              onClick={() => handleActivate(u)}
                              className="px-2.5 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 text-[11px] font-semibold transition-colors inline-flex items-center gap-1"
                            >
                              <UserCheck className="w-3 h-3" /> Reactivate
                            </button>
                          ) : (
                            <button
                              onClick={() => {
                                setSelectedUser(u);
                                setActionType("suspend");
                              }}
                              className="px-2.5 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 text-[11px] font-semibold transition-colors inline-flex items-center gap-1"
                            >
                              <UserX className="w-3 h-3" /> Suspend
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modals */}
      {selectedUser && actionType === "suspend" && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-md w-full shadow-2xl">
            <h3 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
              <UserX className="w-5 h-5 text-rose-400" /> Suspend Account
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              Suspending <span className="font-semibold text-slate-200">{selectedUser.email}</span> will block access to protected SaaS features while retaining user workspace data intact.
            </p>

            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Reason for Suspension
            </label>
            <textarea
              rows={3}
              value={suspendReason}
              onChange={(e) => setSuspendReason(e.target.value)}
              placeholder="e.g. Terms of Service violation, suspicious activity..."
              className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-rose-500 mb-6"
            />

            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setSelectedUser(null);
                  setActionType(null);
                }}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold hover:bg-slate-700"
              >
                Cancel
              </button>
              <button
                disabled={actionLoading}
                onClick={handleSuspend}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold transition-colors disabled:opacity-50"
              >
                {actionLoading ? "Suspending..." : "Confirm Suspension"}
              </button>
            </div>
          </div>
        </div>
      )}

      {selectedUser && actionType === "plan" && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-md w-full shadow-2xl">
            <h3 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-purple-400" /> Assign Subscription Plan
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              Select new plan entitlement for <span className="font-semibold text-slate-200">{selectedUser.email}</span>.
            </p>

            <label className="block text-xs font-semibold text-slate-300 mb-1">Target Plan</label>
            <select
              value={newPlanId}
              onChange={(e) => setNewPlanId(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-purple-500 mb-6"
            >
              {plans.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.id.toUpperCase()}) - ${p.monthlyPrice}/mo
                </option>
              ))}
            </select>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setSelectedUser(null);
                  setActionType(null);
                }}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold hover:bg-slate-700"
              >
                Cancel
              </button>
              <button
                disabled={actionLoading}
                onClick={handleChangePlan}
                className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold transition-colors disabled:opacity-50"
              >
                {actionLoading ? "Updating..." : "Update Plan"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
