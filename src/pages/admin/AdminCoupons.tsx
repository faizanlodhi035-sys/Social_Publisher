import React, { useEffect, useState } from "react";
import { adminApi, type CouponDefinition } from "../../services/adminApi";
import { Tag, Plus, CheckCircle2, XCircle, RefreshCw, AlertTriangle, Copy, Check } from "lucide-react";

export const AdminCoupons: React.FC = () => {
  const [coupons, setCoupons] = useState<CouponDefinition[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Create Coupon modal state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [code, setCode] = useState("");
  const [description, setDescription] = useState("");
  const [benefitType, setBenefitType] = useState<string>("extra_ai");
  const [benefitValue, setBenefitValue] = useState<number>(50);
  const [usageLimit, setUsageLimit] = useState<number>(100);
  const [creating, setCreating] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const fetchCoupons = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await adminApi.getCoupons();
      setCoupons(data);
    } catch (err: any) {
      setError(err.message || "Failed to load coupons");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCoupons();
  }, []);

  const handleCreateCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    try {
      await adminApi.createCoupon({
        code,
        description,
        benefitType: benefitType as any,
        benefitValue: Number(benefitValue),
        usageLimit: Number(usageLimit),
        discountType: "percentage",
        discountValue: 0,
      });
      setShowCreateModal(false);
      setCode("");
      setDescription("");
      await fetchCoupons();
    } catch (err: any) {
      alert(err.message || "Failed to create coupon");
    } finally {
      setCreating(false);
    }
  };

  const handleToggleActive = async (couponId: string, currentActive: boolean) => {
    try {
      await adminApi.toggleCouponActive(couponId, !currentActive);
      await fetchCoupons();
    } catch (err: any) {
      alert(err.message || "Failed to toggle coupon status");
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(text);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-slate-400">
        <RefreshCw className="w-8 h-8 animate-spin text-pink-500 mb-3" />
        <p className="text-sm font-medium">Loading Promotional Coupons...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <Tag className="w-6 h-6 text-pink-400" /> Coupon & Promotional Code System
          </h1>
          <p className="text-sm text-slate-400">
            Create user promotion codes, limit redemptions, and grant extra AI credits or feature upgrades.
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-pink-600 hover:bg-pink-500 text-white text-xs font-semibold shadow-md shadow-pink-600/20 transition-all self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" /> Create Coupon Code
        </button>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Coupons Table */}
      <div className="bg-slate-900/80 border border-slate-800/80 rounded-2xl overflow-hidden shadow-sm">
        {coupons.length === 0 ? (
          <div className="p-12 text-center text-slate-500 text-xs">
            No promotional coupons created yet. Click "Create Coupon Code" above to issue your first promo.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/60 text-slate-400 uppercase font-semibold border-b border-slate-800/80">
                <tr>
                  <th className="py-3.5 px-4">Coupon Code</th>
                  <th className="py-3.5 px-4">Description</th>
                  <th className="py-3.5 px-4">Promotional Benefit</th>
                  <th className="py-3.5 px-4">Usage Count</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {coupons.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-black text-sm text-pink-300 tracking-wider bg-pink-500/10 px-2.5 py-1 rounded-lg border border-pink-500/20">
                          {c.code}
                        </span>
                        <button
                          onClick={() => copyToClipboard(c.code)}
                          className="p-1 text-slate-400 hover:text-white"
                          title="Copy Code"
                        >
                          {copiedCode === c.code ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </td>

                    <td className="py-3.5 px-4 text-slate-300">{c.description}</td>

                    <td className="py-3.5 px-4 font-semibold text-white">
                      +{c.benefitValue} {c.benefitType?.replace("_", " ").toUpperCase()}
                    </td>

                    <td className="py-3.5 px-4 text-slate-300 font-mono">
                      {c.redeemedCount} / {c.usageLimit === 0 ? "∞" : c.usageLimit}
                    </td>

                    <td className="py-3.5 px-4">
                      {c.active ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-semibold text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          <CheckCircle2 className="w-3 h-3" /> Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-semibold text-[10px] bg-slate-800 text-slate-500">
                          <XCircle className="w-3 h-3" /> Inactive
                        </span>
                      )}
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => handleToggleActive(c.id, c.active)}
                        className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-colors ${
                          c.active
                            ? "bg-slate-800 hover:bg-slate-700 text-slate-300"
                            : "bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20"
                        }`}
                      >
                        {c.active ? "Deactivate" : "Activate"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create Coupon Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-md w-full shadow-2xl">
            <h3 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
              <Tag className="w-5 h-5 text-pink-400" /> Create New Coupon Code
            </h3>
            <p className="text-xs text-slate-400 mb-6">
              Customers can enter this code in Settings to redeem promotional benefits.
            </p>

            <form onSubmit={handleCreateCoupon} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Coupon Code (Uppercase)</label>
                <input
                  type="text"
                  placeholder="e.g. LAUNCH2026 or SUMMERAI"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-white uppercase font-mono font-bold tracking-wider focus:outline-none focus:border-pink-500"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Description</label>
                <input
                  type="text"
                  placeholder="e.g. 50 Extra AI generations bonus"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-white focus:outline-none focus:border-pink-500"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Benefit Type</label>
                  <select
                    value={benefitType}
                    onChange={(e) => setBenefitType(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-white focus:outline-none focus:border-pink-500"
                  >
                    <option value="extra_ai">Extra AI Credits</option>
                    <option value="extra_accounts">Extra Accounts</option>
                    <option value="extra_posts">Extra Monthly Posts</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Benefit Value</label>
                  <input
                    type="number"
                    value={benefitValue}
                    onChange={(e) => setBenefitValue(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-white focus:outline-none focus:border-pink-500"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Global Usage Limit (0 = Unlimited)</label>
                <input
                  type="number"
                  value={usageLimit}
                  onChange={(e) => setUsageLimit(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-white focus:outline-none focus:border-pink-500"
                  required
                />
              </div>

              <div className="flex justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold hover:bg-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="px-4 py-2 rounded-xl bg-pink-600 hover:bg-pink-500 text-white text-xs font-semibold transition-colors disabled:opacity-50"
                >
                  {creating ? "Creating..." : "Save Coupon"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
