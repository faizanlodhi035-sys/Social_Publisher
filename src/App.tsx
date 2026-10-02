import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";

import DashboardLayout from "./layouts/DashboardLayout";
import Dashboard from "./pages/Dashboard";
import CreatePost from "./pages/CreatePost";
import Content from "./pages/Content";
import Accounts from "./pages/Accounts";
import Calendar from "./pages/Calendar";
import Analytics from "./pages/Analytics";
import AITools from "./pages/AITools";
import MediaLibrary from "./pages/MediaLibrary";
import Settings from "./pages/Settings";
import Login from "./pages/Login";

import { useEffect } from "react";
import { settingsStorage } from "./services/settingsStorage";
import { AuthProvider } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";

import { AdminRoute } from "./components/AdminRoute";
import { AdminLayout } from "./layouts/AdminLayout";
import { AdminDashboard } from "./pages/admin/AdminDashboard";
import { AdminUsers } from "./pages/admin/AdminUsers";
import { AdminUserDetail } from "./pages/admin/AdminUserDetail";
import { AdminPlans } from "./pages/admin/AdminPlans";
import { AdminCoupons } from "./pages/admin/AdminCoupons";
import { AdminBenefits } from "./pages/admin/AdminBenefits";
import { AdminAudit } from "./pages/admin/AdminAudit";

function App() {
  useEffect(() => {
    const { theme } = settingsStorage.getAppearance();
    const root = document.documentElement;
    root.classList.remove("dark");
    if (
      theme === "dark" ||
      (theme === "system" &&
        window.matchMedia("(prefers-color-scheme: dark)").matches)
    ) {
      root.classList.add("dark");
    }
  }, []);

  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public Auth Route */}
          <Route path="/login" element={<Login />} />

          {/* Protected Dashboard Routes */}
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <DashboardLayout>
                  <Dashboard />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <DashboardLayout>
                  <Dashboard />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />

          {/* Create Post */}
          <Route
            path="/create-post"
            element={
              <ProtectedRoute>
                <DashboardLayout>
                  <CreatePost />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />

          {/* Content */}
          <Route
            path="/content"
            element={
              <ProtectedRoute>
                <DashboardLayout>
                  <Content />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />

          {/* Accounts */}
          <Route
            path="/accounts"
            element={
              <ProtectedRoute>
                <DashboardLayout>
                  <Accounts />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />

          {/* Calendar */}
          <Route
            path="/calendar"
            element={
              <ProtectedRoute>
                <DashboardLayout>
                  <Calendar />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />

          {/* Analytics */}
          <Route
            path="/analytics"
            element={
              <ProtectedRoute>
                <DashboardLayout>
                  <Analytics />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />

          {/* AI Tools */}
          <Route
            path="/ai-tools"
            element={
              <ProtectedRoute>
                <DashboardLayout>
                  <AITools />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />

          {/* Media Library */}
          <Route
            path="/media"
            element={
              <ProtectedRoute>
                <DashboardLayout>
                  <MediaLibrary />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />

          {/* Settings */}
          <Route
            path="/settings"
            element={
              <ProtectedRoute>
                <DashboardLayout>
                  <Settings />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />

          {/* SaaS Admin Panel Routes */}
          <Route element={<AdminRoute />}>
            <Route element={<AdminLayout />}>
              <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />
              <Route path="/admin/dashboard" element={<AdminDashboard />} />
              <Route path="/admin/users" element={<AdminUsers />} />
              <Route path="/admin/users/:userId" element={<AdminUserDetail />} />
              <Route path="/admin/plans" element={<AdminPlans />} />
              <Route path="/admin/coupons" element={<AdminCoupons />} />
              <Route path="/admin/benefits" element={<AdminBenefits />} />
              <Route path="/admin/audit" element={<AdminAudit />} />
            </Route>
          </Route>

          {/* Unknown routes */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;