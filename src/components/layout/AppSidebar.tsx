import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Kanban,
  Factory,
  Settings,
  Plug,
  Users,
  ChevronLeft,
  ChevronRight,
  Building2,
  IdCard,
  PhoneCall,
  UserCog,
  LogOut,
  FileText,
} from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useAuth } from "@/contexts/AuthContext";

const navItems = [
  { icon: LayoutDashboard, label: "Painel", path: "/" },
  { icon: IdCard, label: "Card 360", path: "/dashboard360" },
  { icon: PhoneCall, label: "Leads não atendidas", path: "/leads360" },
  { icon: Users, label: "Contactos", path: "/contactos" },
  { icon: Kanban, label: "Pipeline", path: "/pipeline" },
  { icon: FileText, label: "Orçamentos", path: "/orcamentos" },
  { icon: Factory, label: "Fornecedores", path: "/fornecedores" },
  { icon: Plug, label: "Integrações", path: "/integracoes" },
  { icon: Settings, label: "Definições", path: "/definicoes" },
  { icon: UserCog, label: "Utilizadores", path: "/utilizadores" },
];

export function AppSidebar() {
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const logoUrl = "/logo-hotelequip-light.svg";
  const companyName = "CRM Hotelequip";
  const { signOut } = useAuth();

  return (
    <aside
      className={cn(
        "hidden md:flex flex-col h-screen bg-sidebar border-r border-sidebar-border transition-all duration-300",
        collapsed ? "w-16" : "w-64"
      )}
    >
      {/* Logo */}
      <div className={cn(
        "flex items-center h-16 px-4 border-b border-sidebar-border",
        collapsed ? "justify-center" : "justify-between"
      )}>
        {!collapsed ? (
          <Link to="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <img src={logoUrl} alt={companyName} className="h-8 w-auto max-w-[180px] object-contain" />
          </Link>
        ) : (
          <Link to="/" className="w-8 h-8 rounded-lg bg-sidebar-primary flex items-center justify-center hover:opacity-80 transition-opacity overflow-hidden">
            <Building2 className="h-4 w-4 text-sidebar-primary-foreground" />
          </Link>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 px-2 space-y-1 overflow-y-auto scrollbar-thin">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          const Icon = item.icon;

          const linkContent = (
            <Link
              to={item.path}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors",
                isActive
                  ? "bg-sidebar-accent text-sidebar-primary"
                  : "text-sidebar-muted hover:bg-sidebar-accent hover:text-sidebar-foreground",
                collapsed && "justify-center px-2"
              )}
            >
              <Icon className="w-5 h-5 flex-shrink-0" />
              {!collapsed && <span className="text-sm font-medium">{item.label}</span>}
            </Link>
          );

          if (collapsed) {
            return (
              <Tooltip key={item.path} delayDuration={0}>
                <TooltipTrigger asChild>{linkContent}</TooltipTrigger>
                <TooltipContent side="right" className="font-medium">
                  {item.label}
                </TooltipContent>
              </Tooltip>
            );
          }

          return <div key={item.path}>{linkContent}</div>;
        })}
      </nav>

      {/* User Info, Theme Toggle and Collapse */}
      <div className="p-2 border-t border-sidebar-border space-y-1">
        <ThemeToggle collapsed={collapsed} />

        <Button
          variant="ghost"
          size="sm"
          onClick={() => signOut()}
          className={cn(
            "w-full text-sidebar-muted hover:text-sidebar-foreground hover:bg-sidebar-accent",
            collapsed ? "justify-center" : "justify-start"
          )}
          title="Sair"
        >
          {collapsed ? (
            <LogOut className="w-4 h-4" />
          ) : (
            <>
              <LogOut className="w-4 h-4 mr-2" />
              <span className="text-sm">Sair</span>
            </>
          )}
        </Button>

        <Button
          variant="ghost"
          size="sm"
          onClick={() => setCollapsed(!collapsed)}
          className={cn(
            "w-full text-sidebar-muted hover:text-sidebar-foreground hover:bg-sidebar-accent",
            collapsed ? "justify-center" : "justify-start"
          )}
        >
          {collapsed ? (
            <ChevronRight className="w-4 h-4" />
          ) : (
            <>
              <ChevronLeft className="w-4 h-4 mr-2" />
              <span className="text-sm">Recolher</span>
            </>
          )}
        </Button>
      </div>
    </aside>
  );
}
