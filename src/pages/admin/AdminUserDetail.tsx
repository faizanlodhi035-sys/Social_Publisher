import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { adminApi, type UserProfile, type EffectiveEntitlements, type UserBenefit } from "../../services/adminApi";
import {
  User,
  Gift,
  CheckCircle2,
  XCircle,
  ArrowLeft,
  RefreshCw,
  Sparkles,
  Zap,
  HardDrive,
  Calendar,
  AlertTriangle,
  Trash2,
} from "lucide-react";

export const AdminUserDetail: React.FC = () => {
  const { userId } = useParams<{ userId: string }>();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [entitlements, setEntitlements] = useState<EffectiveEntitlements | null>(null);
  const [benefits, setBenefits] = useState<UserBenefit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Benefit modal state
  const [showBenefitModal, setShowBenefitModal] = useState(false);
  const [benefitType, setBenefitType] = useState<string>("extra_ai");
  const [benefitValue, setBenefitValue] = useState<number>(50);
  const [benefitReason, setBenefitReason] = useState<string>("");
  const [submittingBenefit, setSubmittingBenefit] = useState(false);

  const fetchDetails = async () => {
    if (!userId) return;
    setLoading(true);
    setError(null);
    try {
      const detailData = await adminApi.getUserDetail(userId);
      setUser(detailData.user);
      setEntitlements(detailData.entitlements);
      setBenefits(detailData.benefits || []);
    } catch (err: any) {
      setError(err.message || "Failed to load user details");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDetails();
  }, [userId]);

  const handleGrantBenefit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) return;
    setSubmittingBenefit(true);
    try {
      await adminApi.grantBenefit({
        userId,
        type: benefitType,
        value: Number(benefitValue) || benefitValue,
        reason: benefitReason || "Admin manual grant",
      });
      setShowBenefitModal(false);
      setBenefitReason("");
      await fetchDetails();
    } catch (err: any) {
      alert(err.message || "Failed to grant benefit");
    } finally {
      setSubmittingBenefit(false);
    }
  };

  const handleRevokeBenefit = async (benefitId: string) => {
    if (!confirm("Revoke this user benefit?")) return;
    try {
      await adminApi.revokeBenefit(benefitId);
      await fetchDetails();
    } catch (err: any) {
      alert(err.message || "Failed to revoke benefit");
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-slate-400">
        <RefreshCw className="w-8 h-8 animate-spin text-indigo-500 mb-3" />
        <p className="text-sm font-medium">Loading User Profile and SaaS Entitlements...</p>
      </div>
    );
  }

  if (error || !user) {
    return (
      <div className="space-y-4 max-w-4xl mx-auto">
        <Link to="/admin/users" className="inline-flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-white">
          <ArrowLeft className="w-4 h-4" /> Back to Users
        </Link>
        <div className="p-6 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-center gap-3">
          <AlertTriangle className="w-6 h-6 shrink-0" />
          <span>{error || "User doc not found."}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      {/* Back Button & Title Header */}
      <div>
        <Link
          to="/admin/users"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-white transition-colors mb-4"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Users List
        </Link>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/80 p-6 rounded-2xl border border-slate-800/80">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-lg shadow-md shadow-indigo-500/20">
              {user.displayName?.[0]?.toUpperCase() || user.email[0].toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-white">{user.displayName || user.email.split("@")[0]}</h1>
                {user.saasRole === "saas_admin" && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                    SaaS Admin
                  </span>
                )}
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    user.status === "suspended"
                      ? "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                      : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                  }`}
                >
                  {user.status === "suspended" ? "Suspended" : "Active"}
                </span>
              </div>
              <p className="text-xs font-mono text-slate-400 mt-0.5">{user.email} (UID: {user.uid})</p>
            </div>
          </div>

          <button
            onClick={() => setShowBenefitModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md shadow-indigo-600/20 transition-all self-start sm:self-auto"
          >
            <Gift className="w-4 h-4" /> Grant User Benefit
          </button>
        </div>
      </div>

      {/* Grid: Entitlements vs User Metadata */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Effective Entitlements Breakdown */}
        <div className="md:col-span-2 bg-slate-900/80 border border-slate-800/80 rounded-2xl p-6 space-y-6">
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-4">
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-purple-400" /> Calculated Entitlements
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Base Plan ({entitlements?.plan.name}) + Active Granted Benefits
              </p>
            </div>
            <span className="px-3 py-1 rounded-xl text-xs font-bold uppercase bg-purple-500/10 text-purple-300 border border-purple-500/20">
              {entitlements?.plan.id}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800/60">
              <div className="text-[11px] font-semibold text-slate-400 flex items-center gap-1.5 mb-1">
                <User className="w-3.5 h-3.5 text-indigo-400" /> Social Accounts
              </div>
              <div className="text-xl font-extrabold text-white">{entitlements?.maxSocialAccounts}</div>
              <div className="text-[10px] text-slate-500 mt-1">Base: {entitlements?.plan.maxSocialAccounts}</div>
            </div>

            <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800/60">
              <div className="text-[11px] font-semibold text-slate-400 flex items-center gap-1.5 mb-1">
                <Zap className="w-3.5 h-3.5 text-amber-400" /> AI Generations
              </div>
              <div className="text-xl font-extrabold text-white">{entitlements?.maxAiGenerations}</div>
              <div className="text-[10px] text-slate-500 mt-1">Base: {entitlements?.plan.maxAiGenerations}</div>
            </div>

            <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800/60">
              <div className="text-[11px] font-semibold text-slate-400 flex items-center gap-1.5 mb-1">
                <Calendar className="w-3.5 h-3.5 text-emerald-400" /> Scheduled Posts
              </div>
              <div className="text-xl font-extrabold text-white">{entitlements?.maxScheduledPosts}</div>
              <div className="text-[10px] text-slate-500 mt-1">Base: {entitlements?.plan.maxScheduledPosts}</div>
            </div>

            <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800/60">
              <div className="text-[11px] font-semibold text-slate-400 flex items-center gap-1.5 mb-1">
                <HardDrive className="w-3.5 h-3.5 text-pink-400" /> Storage Limit
              </div>
              <div className="text-xl font-extrabold text-white">{entitlements?.maxStorageMB} MB</div>
              <div className="text-[10px] text-slate-500 mt-1">Media storage cap</div>
            </div>
          </div>

          {/* Feature Flags */}
          <div>
            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-3">Feature Flags</h3>
            <div className="flex flex-wrap gap-2">
              {Object.entries(entitlements?.featureFlags || {}).map(([flag, enabled]) => (
                <span
                  key={flag}
                  className={`px-3 py-1 rounded-xl text-xs font-semibold border flex items-center gap-1.5 ${
                    enabled
                      ? "bg-emerald-500/10 text-emerald-300 border-emerald-500/20"
                      : "bg-slate-800/60 text-slate-500 border-slate-700/60"
                  }`}
                >
                  {enabled ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                  {flag}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* User Account Details */}
        <div className="bg-slate-900/80 border border-slate-800/80 rounded-2xl p-6 space-y-4">
          <h2 className="text-base font-bold text-white border-b border-slate-800/80 pb-3">User Profile</h2>
          
          <div className="space-y-3 text-xs">
            <div>
              <span className="text-slate-500 font-medium block">Primary Workspace ID</span>
              <span className="text-slate-200 font-mono">{user.primaryWorkspaceId}</span>
            </div>

            <div>
              <span className="text-slate-500 font-medium block">Account Registered</span>
              <span className="text-slate-200">{new Date(user.createdAt).toLocaleString()}</span>
            </div>

            <div>
              <span className="text-slate-500 font-medium block">Last Active</span>
              <span className="text-slate-200">{user.lastActivityAt ? new Date(user.lastActivityAt).toLocaleString() : "N/A"}</span>
            </div>

            <div className="pt-2 border-t border-slate-800/60">
              <span className="text-slate-500 font-medium block">Security Note</span>
              <span className="text-[11px] text-slate-400">
                Connected platform OAuth access tokens are stored in encrypted server secrets and not rendered to frontend client.
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Granted Benefits Table */}
      <div className="bg-slate-900/80 border border-slate-800/80 rounded-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Gift className="w-4 h-4 text-amber-400" /> Granted User Benefits
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Specific feature unlocks, extra AI credits, or custom limits isolated for this user.
            </p>
          </div>
        </div>

        {benefits.length === 0 ? (
          <div className="text-center py-8 text-xs text-slate-500">
            No specific user benefits currently granted to this user.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/60 text-slate-400 uppercase font-semibold border-b border-slate-800/80">
                <tr>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">Value</th>
                  <th className="py-3 px-4">Reason</th>
                  <th className="py-3 px-4">Granted At</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Revoke</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {benefits.map((b) => (
                  <tr key={b.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-amber-300">{b.type}</td>
                    <td className="py-3 px-4 font-bold text-white">+{b.value}</td>
                    <td className="py-3 px-4 text-slate-400">{b.reason}</td>
                    <td className="py-3 px-4 text-slate-400">{new Date(b.createdAt).toLocaleDateString()}</td>
                    <td className="py-3 px-4">
                      {b.active ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          Active
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-800 text-slate-500">
                          Revoked
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right">
                      {b.active && (
                        <button
                          onClick={() => handleRevokeBenefit(b.id)}
                          className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 transition-colors"
                          title="Revoke benefit"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Grant Benefit Modal */}
      {showBenefitModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-md w-full shadow-2xl">
            <h3 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
              <Gift className="w-5 h-5 text-indigo-400" /> Grant Special Benefit
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              Add entitlement override specifically for <span className="font-semibold text-slate-200">{user.email}</span>.
            </p>

            <form onSubmit={handleGrantBenefit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Benefit Type</label>
                <select
                  value={benefitType}
                  onChange={(e) => setBenefitType(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-indigo-500"
                >
                  <option value="extra_ai">Extra AI Generations</option>
                  <option value="extra_accounts">Extra Social Accounts</option>
                  <option value="extra_posts">Extra Monthly Posts</option>
                  <option value="free_days">Free Subscription Days</option>
                  <option value="feature_unlock">Feature Unlock</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Benefit Value</label>
                <input
                  type="text"
                  value={benefitValue}
                  onChange={(e) => setBenefitValue(e.target.value as any)}
                  placeholder="e.g. 50 or feature_name"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-indigo-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Reason / Note</label>
                <input
                  type="text"
                  value={benefitReason}
                  onChange={(e) => setBenefitReason(e.target.value)}
                  placeholder="e.g. VIP promo reward, customer support credit"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-indigo-500"
                  required
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowBenefitModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold hover:bg-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingBenefit}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition-colors disabled:opacity-50"
                >
                  {submittingBenefit ? "Granting..." : "Grant Benefit"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
