import { useEffect, useState } from "react";
import { Users, Smartphone, BookOpen, BarChart3, LogOut, MessageSquare, Settings, LayoutDashboard } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import logoHorizontal from "@/assets/logo_mantra_horizontal.png";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";

const navItems = [
  { title: "Dashboard", url: "/admin", icon: LayoutDashboard, exact: true },
  { title: "Clients", url: "/admin/clients", icon: Users },
  { title: "Inbox", url: "/admin/inbox", icon: MessageSquare, badgeKey: "inbox" },
  { title: "Device & Connection", url: "/admin/devices", icon: Smartphone },
  { title: "Knowledge Base", url: "/admin/knowledge", icon: BookOpen },
  { title: "Monitoring", url: "/admin/monitoring", icon: BarChart3 },
  { title: "Settings", url: "/admin/settings", icon: Settings },
];

export default function AdminSidebar() {
  const { signOut } = useAuth();
  const [humanCount, setHumanCount] = useState(0);

  const fetchHumanCount = async () => {
    const { count } = await supabase
      .from("wa_conversations" as any)
      .select("id", { count: "exact", head: true })
      .eq("handled_by", "HUMAN")
      .eq("status", "active");
    setHumanCount(count || 0);
  };

  useEffect(() => {
    fetchHumanCount();

    const channel = supabase
      .channel("sidebar-escalation")
      .on("postgres_changes", {
        event: "*",
        schema: "public",
        table: "wa_conversations",
      }, () => {
        fetchHumanCount();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  return (
    <Sidebar>
      <div className="flex h-16 items-center border-b border-sidebar-border px-4">
        <img src={logoHorizontal} alt="Mantra AI" className="h-7 object-contain" width={105} height={28} />
      </div>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      end={item.exact}
                      className="hover:bg-sidebar-accent"
                      activeClassName="bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                    >
                      <item.icon className="mr-2 h-4 w-4" />
                      <span className="flex-1">{item.title}</span>
                      {item.badgeKey === "inbox" && humanCount > 0 && (
                        <span className="ml-auto flex h-5 min-w-[20px] items-center justify-center rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold animate-pulse">
                          {humanCount}
                        </span>
                      )}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border p-4">
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start gap-2 text-muted-foreground"
          onClick={signOut}
        >
          <LogOut className="h-4 w-4" />
          Logout
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
