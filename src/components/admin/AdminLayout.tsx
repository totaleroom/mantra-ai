import { Outlet, useLocation } from "react-router-dom";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import AdminSidebar from "./AdminSidebar";

const pageTitles: Record<string, string> = {
  "/admin": "Control Tower",
  "/admin/clients": "Client Management",
  "/admin/inbox": "Inbox",
  "/admin/devices": "Device & Connection",
  "/admin/knowledge": "Knowledge Base",
  "/admin/monitoring": "Monitoring",
  "/admin/settings": "Settings",
};

export default function AdminLayout() {
  const location = useLocation();
  const pageTitle = pageTitles[location.pathname] || "";

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <AdminSidebar />
        <main className="flex-1">
          <header className="flex h-14 items-center gap-3 border-b border-border px-4">
            <SidebarTrigger />
            {pageTitle && (
              <span className="text-sm font-semibold text-muted-foreground">{pageTitle}</span>
            )}
          </header>
          <div className="p-6">
            <Outlet />
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}
