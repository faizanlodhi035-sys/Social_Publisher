import React, { useEffect, useState } from "react";
import { adminApi, type UserBenefit, type UserProfile } from "../../services/adminApi";
import { Gift, Plus, CheckCircle2, XCircle, RefreshCw, AlertTriangle, Trash2 } from "lucide-react";

export const AdminBenefits: React.FC = () => {
  const [benefits, setBenefits] = useState<UserBenefit[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Grant Modal state
  const [showGrantModal, setShowGrantModal] = useState(false);
  const [targetUserId, setTargetUserId] = useState("");
  const [benefitType, setBenefitType] = useState<string>("extra_ai");
  const [benefitValue, setBenefitValue] = useState<number>(100);
  const [reason, setReason] = useState("");
  const [granting, setGranting] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [benefitList, userList] = await Promise.all([
        adminApi.getBenefits(),
        adminApi.getUsers(),
      ]);
      setBenefits(benefitList);
      setUsers(userList);
      if (userList.length > 0 && !targetUserId) {
        setTargetUserId(userList[0].uid);
      }
    } catch (err: any) {
      setError(err.message || "Failed to load benefits");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleGrantBenefit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetUserId) return;
    setGranting(true);
    try {
      await adminApi.grantBenefit({
        userId: targetUserId,
        type: benefitType,
        value: Number(benefitValue) || benefitValue,
        reason: reason || "Admin granted override",
      });
      setShowGrantModal(false);
      setReason("");
      await fetchData();
    } catch (err: any) {
      alert(err.message || "Failed to grant benefit");
    } finally {
      setGranting(false);
    }
  };

  const handleRevokeBenefit = async (benefitId: string) => {
    if (!confirm("Are you sure you want to revoke this user benefit?")) return;
    try {
      await adminApi.revokeBenefit(benefitId);
      await fetchData();
    } catch (err: any) {
      alert(err.message || "Failed to revoke benefit");
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-slate-400">
        <RefreshCw className="w-8 h-8 animate-spin text-amber-500 mb-3" />
        <p className="text-sm font-medium">Loading User Benefit Grants...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <Gift className="w-6 h-6 text-amber-400" /> Granted User Benefits
          </h1>
          <p className="text-sm text-slate-400">
            Grant isolated extra AI credits, social account quota overrides, or custom entitlements to individual users.
          </p>
        </div>
        <button
          onClick={() => setShowGrantModal(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold shadow-md shadow-amber-600/20 transition-all self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" /> Grant Benefit to User
        </button>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Benefits Table */}
      <div className="bg-slate-900/80 border border-slate-800/80 rounded-2xl overflow-hidden shadow-sm">
        {benefits.length === 0 ? (
          <div className="p-12 text-center text-slate-500 text-xs">
            No user-specific benefits currently active.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/60 text-slate-400 uppercase font-semibold border-b border-slate-800/80">
                <tr>
                  <th className="py-3.5 px-4">User</th>
                  <th className="py-3.5 px-4">Benefit Type</th>
                  <th className="py-3.5 px-4">Value</th>
                  <th className="py-3.5 px-4">Reason</th>
                  <th className="py-3.5 px-4">Granted At</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-right">Revoke</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {benefits.map((b) => {
                  const targetUser = users.find((u) => u.uid === b.userId);

                  return (
                    <tr key={b.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-white">
                          {targetUser?.displayName || targetUser?.email || b.userId}
                        </div>
                        <div className="text-[10px] text-slate-500 font-mono">{b.userId}</div>
                      </td>

                      <td className="py-3.5 px-4 font-mono font-bold text-amber-300">
                        {b.type}
                      </td>

                      <td className="py-3.5 px-4 font-bold text-white">
                        +{b.value}
                      </td>

                      <td className="py-3.5 px-4 text-slate-400">{b.reason}</td>

                      <td className="py-3.5 px-4 text-slate-400 whitespace-nowrap">
                        {new Date(b.createdAt).toLocaleDateString()}
                      </td>

                      <td className="py-3.5 px-4">
                        {b.active ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-semibold text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            <CheckCircle2 className="w-3 h-3" /> Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-semibold text-[10px] bg-slate-800 text-slate-500">
                            <XCircle className="w-3 h-3" /> Revoked
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        {b.active && (
                          <button
                            onClick={() => handleRevokeBenefit(b.id)}
                            className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 transition-colors"
                            title="Revoke Benefit"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Grant Modal */}
      {showGrantModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-md w-full shadow-2xl">
            <h3 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
              <Gift className="w-5 h-5 text-amber-400" /> Grant User Benefit
            </h3>
            <p className="text-xs text-slate-400 mb-6">
              Override base plan entitlement for a specific user.
            </p>

            <form onSubmit={handleGrantBenefit} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Target User</label>
                <select
                  value={targetUserId}
                  onChange={(e) => setTargetUserId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-white focus:outline-none focus:border-amber-500"
                  required
                >
                  {users.map((u) => (
                    <option key={u.uid} value={u.uid}>
                      {u.email} ({u.displayName || "User"})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Benefit Type</label>
                <select
                  value={benefitType}
                  onChange={(e) => setBenefitType(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-white focus:outline-none focus:border-amber-500"
                >
                  <option value="extra_ai">Extra AI Generations</option>
                  <option value="extra_accounts">Extra Social Accounts</option>
                  <option value="extra_posts">Extra Monthly Posts</option>
                  <option value="free_days">Free Subscription Days</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Value (Count / Quota)</label>
                <input
                  type="number"
                  value={benefitValue}
                  onChange={(e) => setBenefitValue(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-white focus:outline-none focus:border-amber-500"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Reason / Admin Note</label>
                <input
                  type="text"
                  placeholder="e.g. VIP promotion credit, bug apology bonus"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-white focus:outline-none focus:border-amber-500"
                  required
                />
              </div>

              <div className="flex justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowGrantModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold hover:bg-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={granting}
                  className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold transition-colors disabled:opacity-50"
                >
                  {granting ? "Granting..." : "Grant Benefit"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
