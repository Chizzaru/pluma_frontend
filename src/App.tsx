import { BrowserRouter as Router, Routes, Route } from "react-router-dom";

import PdfSigner from "./pages/PdfSigner";
import BatchPdfSigner from "./BatchPdfSigner";
import AuditLogViewer from "./AuditLogViewer";
import SignatureManagement from "./pages/SignatureManagement";
import Login from "./pages/Login";
import Layout from "./components/Layout";
import CertificateManagement from "./pages/CertificateManagement";
import UserAccountManagement from "./pages/UserAccountManagement";
import UploadManager from "./pages/UploadManager";
import Pluma from "./pages/Pluma";
import AboutUs from "./pages/AboutUs";
import PdfVerifierv2 from "./pages/PdfVerifierv2";
import UserPdfVerifierv2 from "./user/UserPdfVerifierv2";
import UserPdfSigner from "./user/UserPdfSigner";
import { Toaster } from "react-hot-toast";
import OfficeManagement from "./pages/OfficeManagement";
import MyDocument from "./pages/MyDocument";
import Shared from "./pages/Shared";

import { AuthProvider } from "./auth/AuthProvider";
import { RequireAuth } from "./auth/RequireAuth";
import { RequireRole } from "./auth/RequireRole";
import { SettingsProvider } from "./settings/SettingsProvider";
import { ThemeProvider } from "./theme/ThemeProvider";
import type { ReactNode } from "react";
import SignedDocManagement from "./pages/SignedDocManagement";
import Notifications from "./pages/Notifications";
import Dashboard from "./pages/Dashboard";
import ApiPage from "./pages/ApiPage";


interface AppProviderProps{
  children : ReactNode
}

const AppProviders = ({ children } : AppProviderProps) => (
  <AuthProvider>
    <ThemeProvider>
      <SettingsProvider>{children}</SettingsProvider>
    </ThemeProvider>
  </AuthProvider>
);

function App() {
  return (
    <Router basename="/">
      <AppProviders>
        <Routes>

          {/* Public Routes */}
          <Route path="/" element={<Pluma />} />
          <Route path="/login" element={<Login />} />
          <Route path="/public-sign" element={<PdfSigner />} />
          <Route path="/public-verifierv2" element={<PdfVerifierv2 />} />
          <Route path="/public-about-us" element={<AboutUs />} />
          <Route path="/public-verifier" element={<PdfVerifierv2 />} />

          {/* ---------------- Protected Routes ---------------- */}

          <Route
            path="/sign"
            element={
              <RequireAuth>
                <Layout>
                  <UserPdfSigner />
                </Layout>
              </RequireAuth>
            }
          />

          <Route
            path="/verify"
            element={
              <RequireAuth>
                <Layout>
                  <UserPdfVerifierv2 />
                </Layout>
              </RequireAuth>
            }
          />

          <Route
            path="/batch-sign"
            element={
              <RequireAuth>
                <Layout>
                  <BatchPdfSigner />
                </Layout>
              </RequireAuth>
            }
          />

          <Route
            path="/audit-logs"
            element={
              <RequireAuth>
                <Layout>
                  <AuditLogViewer/>
                </Layout>
              </RequireAuth>
            }
          />

          <Route
            path="/documents/signed"
            element={
              <RequireAuth>
                <Layout>
                  <SignedDocManagement/>
                </Layout>
              </RequireAuth>
            }
          />

          <Route
            path="/signatures"
            element={
              <RequireAuth>
                <Layout>
                  <SignatureManagement/>
                </Layout>
              </RequireAuth>
            }
          />

          <Route
            path="/dashboard"
            element={
              <RequireAuth>
                <Layout>
                  <Dashboard/>
                </Layout>
              </RequireAuth>
            }
          />

          <Route
            path="/certificates"
            element={
              <RequireAuth>
                <Layout>
                  <CertificateManagement/>
                </Layout>
              </RequireAuth>
            }
          />

          {/* Admin-only routes example */}
          <Route
            path="/users"
            element={
              <RequireAuth>
                <RequireRole role="ROLE_ADMIN">
                  <Layout>
                    <UserAccountManagement />
                  </Layout>
                </RequireRole>
              </RequireAuth>
            }
          />

          <Route
            path="/offices"
            element={
              <RequireAuth>
                <RequireRole role="ROLE_ADMIN">
                  <Layout>
                    <OfficeManagement />
                  </Layout>
                </RequireRole>
              </RequireAuth>
            }
          />

          {/* Normal authenticated routes */}
          <Route
            path="/documents/my-documentss"
            element={
              <RequireAuth>
                <Layout>
                  <MyDocument />
                </Layout>
              </RequireAuth>
            }
          />

          <Route
            path="my-documents"
            element={
              <RequireAuth>
                <Layout>
                  <UploadManager />
                </Layout>
              </RequireAuth>
            }
          />

          <Route
            path="/notifications"
            element={
              <RequireAuth>
                <Layout>
                  <Notifications />
                </Layout>
              </RequireAuth>
            }
          />

          <Route
            path="/shared"
            element={
              <RequireAuth>
                <Layout>
                  <Shared />
                </Layout>
              </RequireAuth>
            }
          />

          <Route
            path="/connect"
            element={
              <RequireAuth>
                <Layout>
                  <ApiPage />
                </Layout>
              </RequireAuth>
            }
          />

           <Route
            path="my-documents/sign/:id"
            element={
              <RequireAuth>
                <Layout>
                  <UserPdfSigner />
                </Layout>
              </RequireAuth>
            }
          />

          {/* 404 */}
          <Route
            path="*"
            element={
              <div className="flex items-center justify-center min-h-screen bg-[#E7F2EF]">
                <div className="text-center">
                  <h2 className="text-4xl font-bold text-[#19183B] mb-2">404</h2>
                  <p className="text-[#708993] mb-4">Page Not Found</p>
                  <a
                    href="/login"
                    className="text-[#19183B] hover:text-[#708993] font-medium underline"
                  >
                    Return to Login
                  </a>
                </div>
              </div>
            }
          />

        </Routes>

        <Toaster position="top-right" reverseOrder={false} />
      </AppProviders>
    </Router>
  );
}

export default App;
