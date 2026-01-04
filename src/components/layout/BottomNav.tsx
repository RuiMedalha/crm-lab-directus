import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Kanban,
  Inbox,
  Users,
  Plug,
} from "lucide-react";

const navItems = [
  { icon: LayoutDashboard, label: "Painel", path: "/" },
  { icon: Kanban, label: "Pipeline", path: "/pipeline" },
  { icon: Inbox, label: "Leads", path: "/inbox" },
  { icon: Users, label: "Contactos", path: "/contactos" },
  { icon: Plug, label: "Integrações", path: "/integracoes" },
];

export function BottomNav() {
  const location = useLocation();

  return (
    <nav className="fixed bottom-0 left-0 right-0 md:hidden bg-card border-t border-border z-50">
      <div className="flex items-center justify-around h-16 px-2">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          const Icon = item.icon;

          return (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                "flex flex-col items-center justify-center flex-1 py-2 transition-colors",
                isActive
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Icon className="w-5 h-5" />
              <span className="text-[10px] mt-1 font-medium">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
