import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import PageLoader from "@/components/PageLoader";

// Eager: landing (first paint)
import Index from "./pages/Index";

// Lazy: all other pages
const Login = lazy(() => import("./pages/Login"));
const NotFound = lazy(() => import("./pages/NotFound"));
const ProtectedRoute = lazy(() => import("./components/admin/ProtectedRoute"));
const AdminLayout = lazy(() => import("./components/admin/AdminLayout"));
const Dashboard = lazy(() => import("./pages/admin/Dashboard"));
const Clients = lazy(() => import("./pages/admin/Clients"));
const DeviceManager = lazy(() => import("./pages/admin/DeviceManager"));
const KnowledgeBase = lazy(() => import("./pages/admin/KnowledgeBase"));
const Monitoring = lazy(() => import("./pages/admin/Monitoring"));
const Inbox = lazy(() => import("./pages/admin/Inbox"));
const Settings = lazy(() => import("./pages/admin/Settings"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30_000,
      refetchOnWindowFocus: false,
    },
  },
});

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Suspense fallback={<PageLoader />}>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/login" element={<Login />} />
              <Route
                path="/admin"
                element={
                  <ProtectedRoute>
                    <AdminLayout />
                  </ProtectedRoute>
                }
              >
                <Route index element={<Dashboard />} />
                <Route path="clients" element={<Clients />} />
                <Route path="devices" element={<DeviceManager />} />
                <Route path="knowledge" element={<KnowledgeBase />} />
                <Route path="monitoring" element={<Monitoring />} />
                <Route path="inbox" element={<Inbox />} />
                <Route path="settings" element={<Settings />} />
              </Route>
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
