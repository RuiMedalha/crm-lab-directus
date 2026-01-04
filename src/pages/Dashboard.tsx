import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useDeals } from "@/hooks/useDeals";
import { useContacts } from "@/hooks/useContacts";
import { usePendingLeads, useCalls } from "@/hooks/useCalls";
import { Skeleton } from "@/components/ui/skeleton";
import { Users, Kanban, Inbox, TrendingUp, Euro, Phone, MessageCircle, Mail, Globe, Building2 } from "lucide-react";
import { Link } from "react-router-dom";
import { useMemo } from "react";
import { DashboardActionCenter } from "@/components/dashboard/DashboardActionCenter";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";

const SOURCE_CONFIG: Record<string, { label: string; color: string; icon: typeof Phone }> = {
  phone: { label: "Chamada", color: "hsl(var(--primary))", icon: Phone },
  whatsapp: { label: "WhatsApp", color: "#25D366", icon: MessageCircle },
  email: { label: "Email", color: "hsl(var(--warning))", icon: Mail },
  web: { label: "Website", color: "hsl(var(--muted-foreground))", icon: Globe },
  typebot: { label: "Typebot", color: "#6366F1", icon: MessageCircle },
  n8n: { label: "n8n", color: "#FF6D5A", icon: Globe },
  chatwoot: { label: "Chatwoot", color: "#1F93FF", icon: MessageCircle },
};

export default function Dashboard() {
  const { data: deals, isLoading: dealsLoading } = useDeals();
  const { data: contacts, isLoading: contactsLoading } = useContacts();
  const { data: pendingLeads, isLoading: leadsLoading } = usePendingLeads();
  const { data: allCalls, isLoading: callsLoading } = useCalls();

  const totalDealsValue = deals?.reduce((sum, deal) => sum + (deal.total_amount || 0), 0) || 0;
  const activeDeals = deals?.filter((d) => !["ganho", "perdido"].includes(d.status || "")).length || 0;
  const wonDeals = deals?.filter((d) => d.status === "ganho").length || 0;

  // Calculate leads by source
  const leadsBySource = useMemo(() => {
    if (!allCalls) return [];
    
    const sourceCount: Record<string, number> = {};
    allCalls.forEach((call) => {
      const source = call.source || "phone";
      sourceCount[source] = (sourceCount[source] || 0) + 1;
    });

    return Object.entries(sourceCount)
      .map(([source, count]) => ({
        source,
        name: SOURCE_CONFIG[source]?.label || source,
        count,
        color: SOURCE_CONFIG[source]?.color || "hsl(var(--muted-foreground))",
      }))
      .sort((a, b) => b.count - a.count);
  }, [allCalls]);

  // Calculate leads by day (last 7 days)
  const leadsByDay = useMemo(() => {
    if (!allCalls) return [];
    
    const days: Record<string, Record<string, number>> = {};
    const now = new Date();
    
    // Initialize last 7 days
    for (let i = 6; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      const key = date.toLocaleDateString("pt-PT", { weekday: "short", day: "numeric" });
      days[key] = {};
    }

    allCalls.forEach((call) => {
      const date = new Date(call.created_at || "");
      const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
      
      if (diffDays <= 6) {
        const key = date.toLocaleDateString("pt-PT", { weekday: "short", day: "numeric" });
        const source = call.source || "phone";
        if (days[key]) {
          days[key][source] = (days[key][source] || 0) + 1;
        }
      }
    });

    return Object.entries(days).map(([day, sources]) => ({
      day,
      ...sources,
      total: Object.values(sources).reduce((a, b) => a + b, 0),
    }));
  }, [allCalls]);

  const stats = [
    {
      title: "Total de Contactos",
      value: contacts?.length || 0,
      icon: Users,
      href: "/contactos",
      color: "text-primary",
    },
    {
      title: "Negócios Ativos",
      value: activeDeals,
      icon: Kanban,
      href: "/pipeline",
      color: "text-warning",
    },
    {
      title: "Leads Pendentes",
      value: pendingLeads?.length || 0,
      icon: Inbox,
      href: "/inbox",
      color: "text-destructive",
    },
    {
      title: "Negócios Ganhos",
      value: wonDeals,
      icon: TrendingUp,
      href: "/pipeline",
      color: "text-success",
    },
  ];

  const isLoading = dealsLoading || contactsLoading || leadsLoading || callsLoading;

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Painel</h1>
          <p className="text-muted-foreground">Bem-vindo ao CRM Hotelequip</p>
        </div>

        {/* Stats Grid */}
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
          {stats.map((stat) => (
            <Link key={stat.title} to={stat.href}>
              <Card className="hover:shadow-md transition-shadow cursor-pointer">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    {stat.title}
                  </CardTitle>
                  <stat.icon className={`h-4 w-4 ${stat.color}`} />
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <Skeleton className="h-8 w-16" />
                  ) : (
                    <div className="text-2xl font-bold">{stat.value}</div>
                  )}
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>

        {/* Revenue Card */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Valor Total em Pipeline
            </CardTitle>
            <Euro className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-32" />
            ) : (
              <div className="text-3xl font-bold">
                {totalDealsValue.toLocaleString("pt-PT", {
                  style: "currency",
                  currency: "EUR",
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Contact Summary Card */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              Resumo de Contactos
            </CardTitle>
          </CardHeader>
          <CardContent>
            {contactsLoading ? (
              <Skeleton className="h-20 w-full" />
            ) : (
              <>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
                  <div>
                    <p className="text-2xl font-bold">{contacts?.length || 0}</p>
                    <p className="text-xs text-muted-foreground">Total</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold">
                      {contacts?.filter(c => c.email).length || 0}
                    </p>
                    <p className="text-xs text-muted-foreground">Com Email</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold">
                      {contacts?.filter(c => c.whatsapp_number).length || 0}
                    </p>
                    <p className="text-xs text-muted-foreground">Com WhatsApp</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold">
                      {contacts?.filter(c => c.phone).length || 0}
                    </p>
                    <p className="text-xs text-muted-foreground">Com Telefone</p>
                  </div>
                </div>
                <Separator className="my-4" />
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Adicionados esta semana</span>
                  <span className="font-medium text-primary">
                    +{contacts?.filter(c => {
                      const created = new Date(c.created_at || '');
                      const weekAgo = new Date();
                      weekAgo.setDate(weekAgo.getDate() - 7);
                      return created > weekAgo;
                    }).length || 0}
                  </span>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Leads Analytics */}
        <div className="grid gap-4 lg:grid-cols-2">
          {/* Leads by Source - Pie Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Leads por Fonte</CardTitle>
            </CardHeader>
            <CardContent>
              {callsLoading ? (
                <Skeleton className="h-64 w-full" />
              ) : leadsBySource.length === 0 ? (
                <div className="h-64 flex items-center justify-center">
                  <p className="text-muted-foreground text-sm">Sem dados de leads</p>
                </div>
              ) : (
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={leadsBySource}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={80}
                        paddingAngle={2}
                        dataKey="count"
                        nameKey="name"
                        label={({ name, percent }) => 
                          `${name} ${(percent * 100).toFixed(0)}%`
                        }
                        labelLine={false}
                      >
                        {leadsBySource.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(value: number) => [`${value} leads`, "Total"]}
                        contentStyle={{
                          backgroundColor: "hsl(var(--popover))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "8px",
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}
              
              {/* Source Legend */}
              {!callsLoading && leadsBySource.length > 0 && (
                <div className="flex flex-wrap gap-3 mt-4 justify-center">
                  {leadsBySource.map((source) => (
                    <div key={source.source} className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: source.color }}
                      />
                      <span className="text-xs text-muted-foreground">
                        {source.name}: {source.count}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Leads by Day - Bar Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Leads Últimos 7 Dias</CardTitle>
            </CardHeader>
            <CardContent>
              {callsLoading ? (
                <Skeleton className="h-64 w-full" />
              ) : leadsByDay.every((d) => d.total === 0) ? (
                <div className="h-64 flex items-center justify-center">
                  <p className="text-muted-foreground text-sm">Sem leads nos últimos 7 dias</p>
                </div>
              ) : (
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={leadsByDay}>
                      <XAxis 
                        dataKey="day" 
                        tick={{ fontSize: 12 }}
                        tickLine={false}
                        axisLine={false}
                      />
                      <YAxis 
                        allowDecimals={false}
                        tick={{ fontSize: 12 }}
                        tickLine={false}
                        axisLine={false}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "hsl(var(--popover))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "8px",
                        }}
                      />
                      {Object.keys(SOURCE_CONFIG).map((source) => (
                        <Bar
                          key={source}
                          dataKey={source}
                          stackId="a"
                          fill={SOURCE_CONFIG[source].color}
                          radius={[2, 2, 0, 0]}
                          name={SOURCE_CONFIG[source].label}
                        />
                      ))}
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Action Center - Chamadas Perdidas e Orçamentos */}
        <DashboardActionCenter />

        {/* Recent Activity */}
        <div className="grid gap-4 lg:grid-cols-2">
          {/* Recent Deals */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Últimos Negócios</CardTitle>
            </CardHeader>
            <CardContent>
              {dealsLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : deals?.length === 0 ? (
                <p className="text-muted-foreground text-sm">Sem negócios registados</p>
              ) : (
                <div className="space-y-3">
                  {deals?.slice(0, 5).map((deal) => (
                    <Link
                      key={deal.id}
                      to={`/pipeline?deal=${deal.id}`}
                      className="flex items-center justify-between p-2 rounded-lg hover:bg-muted transition-colors"
                    >
                      <div>
                        <p className="font-medium text-sm">{deal.title || "Sem título"}</p>
                        <p className="text-xs text-muted-foreground">
                          {(deal as any).customer?.company_name || "Sem cliente"}
                        </p>
                      </div>
                      <span className="text-sm font-medium">
                        {(deal.total_amount || 0).toLocaleString("pt-PT", {
                          style: "currency",
                          currency: "EUR",
                        })}
                      </span>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Pending Leads */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Phone className="h-4 w-4" />
                Leads Pendentes
              </CardTitle>
            </CardHeader>
            <CardContent>
              {leadsLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : pendingLeads?.length === 0 ? (
                <p className="text-muted-foreground text-sm">Sem leads pendentes</p>
              ) : (
                <div className="space-y-3">
                  {pendingLeads?.slice(0, 5).map((lead) => {
                    const sourceConfig = SOURCE_CONFIG[lead.source || "phone"];
                    return (
                      <Link
                        key={lead.id}
                        to="/inbox"
                        className="flex items-center justify-between p-2 rounded-lg hover:bg-muted transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          <div
                            className="w-2 h-2 rounded-full"
                            style={{ backgroundColor: sourceConfig?.color || "hsl(var(--primary))" }}
                          />
                          <div>
                            <p className="font-medium text-sm">
                              {lead.customer_name || "Desconhecido"}
                            </p>
                            <p className="text-xs text-muted-foreground">{lead.phone_number}</p>
                          </div>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {new Date(lead.created_at || "").toLocaleDateString("pt-PT")}
                        </span>
                      </Link>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}
