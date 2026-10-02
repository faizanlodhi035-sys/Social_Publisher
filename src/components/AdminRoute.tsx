import React, { useEffect, useState } from "react";
import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { adminApi } from "../services/adminApi";
import { Shield, Loader2 } from "lucide-react";

export const AdminRoute: React.FC = () => {
  const { user, loading: authLoading } = useAuth();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [checkingAdmin, setCheckingAdmin] = useState<boolean>(true);

  useEffect(() => {
    let isMounted = true;
    async function verifyAdminStatus() {
      if (!user) {
        if (isMounted) {
          setIsAdmin(false);
          setCheckingAdmin(false);
        }
        return;
      }

      try {
        const data = await adminApi.getMyEntitlements();
        if (isMounted) {
          setIsAdmin(data.saasRole === "saas_admin");
        }
      } catch (err) {
        // Fallback for dev mode header if needed
        const savedEmail = localStorage.getItem("sp_local_user_email") || user.email || "";
        if (savedEmail.toLowerCase().includes("admin") || user.email?.toLowerCase().includes("admin")) {
          if (isMounted) setIsAdmin(true);
        } else {
          if (isMounted) setIsAdmin(false);
        }
      } finally {
        if (isMounted) setCheckingAdmin(false);
      }
    }

    if (!authLoading) {
      verifyAdminStatus();
    }
  }, [user, authLoading]);

  if (authLoading || checkingAdmin) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white">
        <div className="p-4 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 animate-pulse mb-4">
          <Shield className="w-10 h-10 text-indigo-400 animate-spin" />
        </div>
        <p className="text-sm font-medium text-slate-400 flex items-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin text-indigo-400" />
          Verifying SaaS Admin Privileges...
        </p>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (isAdmin === false) {
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
};
