import React, { useEffect, useState } from "react";
import { adminApi, type AdminMetrics, type AdminAuditRecord } from "../../services/adminApi";
import {
  Users,
  CreditCard,
  Tag,
  Gift,
  ShieldAlert,
  Activity,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ArrowRight,
  RefreshCw,
} from "lucide-react";
import { Link } from "react-router-dom";

export const AdminDashboard: React.FC = () => {
  const [metrics, setMetrics] = useState<AdminMetrics | null>(null);
  const [recentLogs, setRecentLogs] = useState<AdminAuditRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboardData = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await adminApi.getDashboardMetrics();
      setMetrics(data.metrics);
      setRecentLogs(data.recentAuditLogs || []);
    } catch (err: any) {
      setError(err.message || "Failed to load admin overview metrics");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-slate-400">
        <RefreshCw className="w-8 h-8 animate-spin text-indigo-500 mb-3" />
        <p className="text-sm font-medium">Loading SaaS Admin Dashboard metrics...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Top Banner & Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">SaaS Admin Dashboard</h1>
          <p className="text-sm text-slate-400">
            Real-time multi-tenant overview, subscriptions, promotions, and platform metrics.
          </p>
        </div>
        <button
          onClick={fetchDashboardData}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800/80 hover:bg-slate-800 text-slate-200 text-xs font-semibold border border-slate-700/60 transition-colors shadow-sm self-start sm:self-auto"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Refresh Metrics
        </button>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Billing Boundary Alert Banner */}
      <div className="p-5 rounded-2xl bg-gradient-to-r from-amber-500/10 via-orange-500/5 to-slate-900 border border-amber-500/30 text-amber-300">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-amber-500/20 text-amber-400 mt-0.5">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 font-bold text-sm text-amber-200">
              <span>{metrics?.billingStatus || "BILLING INTEGRATION REQUIRED"}</span>
            </div>
            <p className="text-xs text-amber-300/80 mt-1 leading-relaxed">
              {metrics?.billingNote || "Monetary payment processing requires external provider configuration (e.g., Stripe). Current plans and coupons act as entitlement definitions and promotional overrides."}
            </p>
          </div>
        </div>
      </div>

      {/* Key Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Total Users */}
        <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800/80 hover:border-slate-700/80 transition-all shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Total Registered Users</span>
            <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-white mt-3">{metrics?.totalUsers || 0}</div>
          <div className="flex items-center gap-3 mt-3 text-xs">
            <span className="text-emerald-400 flex items-center gap-1 font-semibold">
              <CheckCircle2 className="w-3.5 h-3.5" /> {metrics?.activeUsers || 0} Active
            </span>
            {metrics?.suspendedUsers ? (
              <span className="text-rose-400 flex items-center gap-1 font-semibold">
                <XCircle className="w-3.5 h-3.5" /> {metrics.suspendedUsers} Suspended
              </span>
            ) : null}
          </div>
        </div>

        {/* Subscriptions */}
        <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800/80 hover:border-slate-700/80 transition-all shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Customer Plan Distribution</span>
            <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400">
              <CreditCard className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-white mt-3">{metrics?.paidUsers || 0} Paid</div>
          <div className="flex items-center gap-3 mt-3 text-xs text-slate-400 font-medium">
            <span>{metrics?.freeUsers || 0} Free Tier users</span>
            <span>•</span>
            <span>{metrics?.totalPlans || 0} Active Plans</span>
          </div>
        </div>

        {/* Promotional Coupons */}
        <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800/80 hover:border-slate-700/80 transition-all shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Promotions & Coupons</span>
            <div className="p-2 rounded-xl bg-pink-500/10 text-pink-400">
              <Tag className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-white mt-3">{metrics?.totalCoupons || 0}</div>
          <div className="text-xs text-slate-400 mt-3 font-medium">
            Active coupon codes configured in database
          </div>
        </div>

        {/* Granted Benefits */}
        <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800/80 hover:border-slate-700/80 transition-all shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">User Benefits Granted</span>
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400">
              <Gift className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-white mt-3">{metrics?.totalBenefitsGranted || 0}</div>
          <div className="text-xs text-slate-400 mt-3 font-medium">
            Custom AI/Account entitlement overrides
          </div>
        </div>
      </div>

      {/* Recent Admin Audit Activity */}
      <div className="bg-slate-900/80 border border-slate-800/80 rounded-2xl p-6 shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Activity className="w-4 h-4 text-indigo-400" />
              Recent SaaS Admin Audit Trail
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Automated log of administrative actions, user suspensions, and plan modifications.
            </p>
          </div>
          <Link
            to="/admin/audit"
            className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 flex items-center gap-1 transition-colors"
          >
            View Full Audit Logs <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {recentLogs.length === 0 ? (
          <div className="text-center py-8 text-xs text-slate-500">
            No admin audit logs recorded yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/60 text-slate-400 uppercase font-semibold border-b border-slate-800/80">
                <tr>
                  <th className="py-3 px-4">Timestamp</th>
                  <th className="py-3 px-4">Action</th>
                  <th className="py-3 px-4">Admin Actor</th>
                  <th className="py-3 px-4">Target User</th>
                  <th className="py-3 px-4">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {recentLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-4 text-slate-400 font-mono whitespace-nowrap">
                      {new Date(log.timestamp).toLocaleString()}
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded-full font-mono text-[10px] font-bold bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                        {log.action}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-300 font-medium">{log.actorAdminEmail}</td>
                    <td className="py-3 px-4 text-slate-400">{log.targetUserId || "System"}</td>
                    <td className="py-3 px-4 text-slate-400 truncate max-w-xs">
                      {JSON.stringify(log.details)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
