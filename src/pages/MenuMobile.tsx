import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Kanban, Factory, Plug, Settings, UserCog, PhoneCall, IdCard, LayoutDashboard, Users, LogOut, FileText, Mail, CalendarClock } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

const items = [
  { icon: LayoutDashboard, label: "Painel", path: "/" },
  { icon: IdCard, label: "Card 360", path: "/dashboard360" },
  { icon: PhoneCall, label: "Leads não atendidas", path: "/leads360" },
  { icon: Users, label: "Contactos", path: "/contactos" },
  { icon: Mail, label: "Newsletter", path: "/newsletter" },
  { icon: Kanban, label: "Pipeline", path: "/pipeline" },
  { icon: FileText, label: "Orçamentos", path: "/orcamentos" },
  { icon: CalendarClock, label: "Agenda", path: "/agenda" },
  { icon: Factory, label: "Fornecedores", path: "/fornecedores" },
  { icon: Plug, label: "Integrações", path: "/integracoes" },
  { icon: Settings, label: "Definições", path: "/definicoes" },
  { icon: UserCog, label: "Utilizadores", path: "/utilizadores" },
];

export default function MenuMobile() {
  const { signOut } = useAuth();
  return (
    <AppLayout>
      <div className="space-y-4 md:hidden">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Menu</h1>
          <p className="text-muted-foreground">Acesso rápido (mobile)</p>
        </div>

        <div className="grid gap-3">
          {items.map((it) => {
            const Icon = it.icon;
            return (
              <Card key={it.path}>
                <CardContent className="p-3">
                  <Button asChild variant="ghost" className="w-full justify-start h-auto py-3">
                    <Link to={it.path} className="flex items-center gap-3">
                      <Icon className="h-5 w-5 text-muted-foreground" />
                      <span className="font-medium">{it.label}</span>
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            );
          })}

          <Card>
            <CardContent className="p-3">
              <Button
                variant="ghost"
                className="w-full justify-start h-auto py-3 text-destructive hover:text-destructive"
                onClick={() => signOut()}
              >
                <span className="flex items-center gap-3">
                  <LogOut className="h-5 w-5" />
                  <span className="font-medium">Sair</span>
                </span>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Desktop: hide this page */}
      <div className="hidden md:block text-sm text-muted-foreground">
        Este menu é apenas para mobile.
      </div>
    </AppLayout>
  );
}

