import React, { useEffect, useState } from "react";
import { adminApi, type PlanDefinition } from "../../services/adminApi";
import { CreditCard, RefreshCw, Edit2, AlertTriangle } from "lucide-react";

export const AdminPlans: React.FC = () => {
  const [plans, setPlans] = useState<PlanDefinition[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Edit Modal State
  const [selectedPlan, setSelectedPlan] = useState<PlanDefinition | null>(null);
  const [saving, setSaving] = useState(false);

  const fetchPlans = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await adminApi.getPlans();
      setPlans(data);
    } catch (err: any) {
      setError(err.message || "Failed to load plans");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlans();
  }, []);

  const handleSavePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPlan) return;
    setSaving(true);
    try {
      await adminApi.savePlan(selectedPlan);
      setSelectedPlan(null);
      await fetchPlans();
    } catch (err: any) {
      alert(err.message || "Failed to save plan");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-slate-400">
        <RefreshCw className="w-8 h-8 animate-spin text-purple-500 mb-3" />
        <p className="text-sm font-medium">Loading Subscription Plan Entitlement Matrix...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <CreditCard className="w-6 h-6 text-purple-400" /> Subscription Plans & Entitlements
          </h1>
          <p className="text-sm text-slate-400">
            Define base tier quotas, AI generation caps, max social account connections, and feature flags.
          </p>
        </div>
        <button
          onClick={fetchPlans}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800/80 hover:bg-slate-800 text-slate-200 text-xs font-semibold border border-slate-700/60 transition-colors self-start sm:self-auto"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Refresh Plans
        </button>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Plan Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {plans.map((p) => (
          <div
            key={p.id}
            className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800/80 flex flex-col justify-between hover:border-purple-500/40 transition-all shadow-sm relative group"
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-purple-500/10 text-purple-300 border border-purple-500/20">
                  {p.id}
                </span>
                <button
                  onClick={() => setSelectedPlan(p)}
                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-purple-600 hover:text-white text-slate-400 transition-colors"
                  title="Edit Plan Entitlements"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
              </div>

              <h2 className="text-lg font-bold text-white mb-1">{p.name}</h2>
              <p className="text-xs text-slate-400 mb-4 line-clamp-2">{p.description}</p>

              <div className="text-2xl font-black text-white mb-4">
                ${p.monthlyPrice} <span className="text-xs font-normal text-slate-400">/ mo</span>
              </div>

              <div className="space-y-2 text-xs border-t border-slate-800/80 pt-4 text-slate-300">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Social Accounts:</span>
                  <span className="font-bold text-white">{p.maxSocialAccounts}</span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Monthly Posts:</span>
                  <span className="font-bold text-white">{p.maxPosts}</span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Scheduled Posts:</span>
                  <span className="font-bold text-white">{p.maxScheduledPosts}</span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-slate-400">AI Generations:</span>
                  <span className="font-bold font-mono text-purple-300">{p.maxAiGenerations}</span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Media Storage:</span>
                  <span className="font-bold text-white">{p.maxStorageMB} MB</span>
                </div>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-800/80">
              <button
                onClick={() => setSelectedPlan(p)}
                className="w-full py-2 rounded-xl bg-slate-800/80 hover:bg-purple-600 hover:text-white text-slate-200 text-xs font-semibold border border-slate-700/60 transition-all"
              >
                Edit Boundaries
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Edit Plan Modal */}
      {selectedPlan && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-lg w-full shadow-2xl">
            <h3 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
              <Edit2 className="w-5 h-5 text-purple-400" /> Edit Plan Limits: {selectedPlan.name}
            </h3>
            <p className="text-xs text-slate-400 mb-6">
              Updates apply dynamically to all active users assigned to this plan tier.
            </p>

            <form onSubmit={handleSavePlan} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Plan Name</label>
                  <input
                    type="text"
                    value={selectedPlan.name}
                    onChange={(e) => setSelectedPlan({ ...selectedPlan, name: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white focus:outline-none focus:border-purple-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Monthly Price ($)</label>
                  <input
                    type="number"
                    value={selectedPlan.monthlyPrice}
                    onChange={(e) => setSelectedPlan({ ...selectedPlan, monthlyPrice: Number(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white focus:outline-none focus:border-purple-500"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Max Social Accounts</label>
                  <input
                    type="number"
                    value={selectedPlan.maxSocialAccounts}
                    onChange={(e) => setSelectedPlan({ ...selectedPlan, maxSocialAccounts: Number(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white focus:outline-none focus:border-purple-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Max Monthly Posts</label>
                  <input
                    type="number"
                    value={selectedPlan.maxPosts}
                    onChange={(e) => setSelectedPlan({ ...selectedPlan, maxPosts: Number(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white focus:outline-none focus:border-purple-500"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Max Scheduled Posts</label>
                  <input
                    type="number"
                    value={selectedPlan.maxScheduledPosts}
                    onChange={(e) => setSelectedPlan({ ...selectedPlan, maxScheduledPosts: Number(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white focus:outline-none focus:border-purple-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Max AI Generations</label>
                  <input
                    type="number"
                    value={selectedPlan.maxAiGenerations}
                    onChange={(e) => setSelectedPlan({ ...selectedPlan, maxAiGenerations: Number(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white focus:outline-none focus:border-purple-500"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Description</label>
                <textarea
                  rows={2}
                  value={selectedPlan.description}
                  onChange={(e) => setSelectedPlan({ ...selectedPlan, description: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white focus:outline-none focus:border-purple-500"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setSelectedPlan(null)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold hover:bg-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold transition-colors disabled:opacity-50"
                >
                  {saving ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
