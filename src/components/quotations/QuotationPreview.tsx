import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { FileText, Download, Send, Loader2, Printer, Pencil } from 'lucide-react';
import { useCompanySettings } from '@/hooks/useSettings';
import { fetchQuotationPdf, getQuotationById, patchQuotation } from '@/integrations/directus/quotations';
import { toast } from "@/hooks/use-toast";
import { createDeal, listDeals, patchDeal } from "@/integrations/directus/deals";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { getEmployeeByEmail } from "@/integrations/directus/employees";
import { useAuth } from "@/contexts/AuthContext";
import { createFollowUp } from "@/integrations/directus/follow-ups";

interface QuotationPreviewProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  quotationId: string;
  onEdit?: (quotationId: string, customerId?: string | number | null) => void;
}

interface QuotationData {
  id: string;
  quotation_number: string;
  status: string;
  deal_id?: any;
  subtotal: number;
  total_amount: number;
  notes: string | null;
  terms_conditions?: string | null;
  internal_notes?: string | null;
  sent_to_email?: string | null;
  sent_at?: string | null;
  valid_until: string | null;
  created_at: string;
  customer: {
    id?: string | number | null;
    company_name: string;
    contact_name: string | null;
    address: string | null;
    postal_code: string | null;
    city: string | null;
    nif: string | null;
    email: string | null;
    phone: string | null;
  } | null;
  items: {
    id: string;
    product_name: string | null;
    sku: string | null;
    quantity: number | null;
    unit_price: number | null;
    line_total: number | null;
  }[];
}

export function QuotationPreview({ open, onOpenChange, quotationId, onEdit }: QuotationPreviewProps) {
  const [quotation, setQuotation] = useState<QuotationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [pdfBusy, setPdfBusy] = useState(false);
  const [sending, setSending] = useState(false);
  const [sendEmail, setSendEmail] = useState<string>("");
  const [sendDialogOpen, setSendDialogOpen] = useState(false);
  const [proposalDialogOpen, setProposalDialogOpen] = useState(false);
  const [dealSearch, setDealSearch] = useState("");
  const [dealResults, setDealResults] = useState<any[]>([]);
  const [dealLoading, setDealLoading] = useState(false);
  const [followUpAt, setFollowUpAt] = useState<string>("");
  const [followUpType, setFollowUpType] = useState<string>("call");
  const { data: settings } = useCompanySettings();
  const { user } = useAuth();
  const [meEmpId, setMeEmpId] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      if (!user?.email) return;
      const emp = await getEmployeeByEmail(String(user.email)).catch(() => null);
      if (!active) return;
      setMeEmpId(emp?.id ? String(emp.id) : null);
    })();
    return () => {
      active = false;
    };
  }, [user?.email]);

  useEffect(() => {
    if (open && quotationId) {
      fetchQuotation();
    }
  }, [open, quotationId]);

  const fetchQuotation = async () => {
    setLoading(true);
    try {
      const { quotation: q, items } = await getQuotationById(quotationId);
      if (!q) throw new Error("Orçamento não encontrado");

      setQuotation({
        id: q.id,
        quotation_number: String(q.quotation_number || ""),
        status: String(q.status || "draft"),
        deal_id: (q as any).deal_id ?? null,
        subtotal: Number(q.subtotal || 0),
        total_amount: Number(q.total_amount || 0),
        notes: (q.notes as any) ?? null,
        terms_conditions: (q.terms_conditions as any) ?? null,
        internal_notes: (q.internal_notes as any) ?? null,
        sent_to_email: (q.sent_to_email as any) ?? null,
        sent_at: (q.sent_at as any) ?? null,
        valid_until: (q.valid_until as any) ?? null,
        created_at: String(q.date_created || ""),
        customer: (q as any).customer_id
          ? {
              id: (q as any).customer_id.id ?? null,
              company_name: (q as any).customer_id.company_name || "",
              contact_name: (q as any).customer_id.contact_name || null,
              address: (q as any).customer_id.address || null,
              postal_code: (q as any).customer_id.postal_code || null,
              city: (q as any).customer_id.city || null,
              nif: (q as any).customer_id.nif || null,
              email: (q as any).customer_id.email || null,
              phone: (q as any).customer_id.phone || null,
            }
          : null,
        items: (items || []).map((i: any) => ({
          id: i.id,
          product_name: i.product_name ?? null,
          sku: i.sku ?? null,
          quantity: i.quantity ?? null,
          unit_price: i.unit_price ?? null,
          line_total: i.line_total ?? null,
        })),
      });

      // default recipient for n8n send
      const defaultEmail = (q as any)?.customer_id?.email || "";
      setSendEmail(String(defaultEmail || (q.sent_to_email as any) || ""));

      // default follow-up (2 dias)
      const d = new Date();
      d.setDate(d.getDate() + 2);
      setFollowUpAt(d.toISOString().slice(0, 16)); // datetime-local
    } catch (error) {
      console.error('Erro ao carregar orçamento:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    // Imprimir o PDF (mais fiável do que imprimir a página React)
    handleOpenPdf(true).catch(() => undefined);
  };

  const handleOpenPdf = async (_forPrint?: boolean) => {
    if (!quotationId) return;
    setPdfBusy(true);
    try {
      const blob = await fetchQuotationPdf(String(quotationId));
      const url = URL.createObjectURL(blob);
      const w = window.open(url, "_blank");
      if (!w) {
        toast({ title: "Popup bloqueado", description: "Permite popups para abrir o PDF.", variant: "destructive" });
        return;
      }
    } catch (e: any) {
      toast({ title: "Erro ao gerar PDF", description: String(e?.message || e), variant: "destructive" });
    } finally {
      setPdfBusy(false);
    }
  };

  const handleDownloadPdf = async () => {
    if (!quotationId) return;
    setPdfBusy(true);
    try {
      const blob = await fetchQuotationPdf(String(quotationId));
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${quotation?.quotation_number || quotationId}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e: any) {
      toast({ title: "Erro ao gerar PDF", description: String(e?.message || e), variant: "destructive" });
    } finally {
      setPdfBusy(false);
    }
  };

  const normalizeCustomerId = (cid: any) => {
    const s = String(cid ?? "");
    return /^\d+$/.test(s) ? Number(s) : s;
  };

  const handleOpenSendDialog = () => {
    setSendDialogOpen(true);
  };

  const handleSendViaN8n = async () => {
    if (!quotation) return;
    const email = String(sendEmail || "").trim();
    if (!email) {
      toast({ title: "Email em falta", description: "Indica o email do destinatário.", variant: "destructive" });
      return;
    }
    setSending(true);
    try {
      const now = new Date().toISOString();
      await patchQuotation(String(quotationId), {
        status: "sent",
        sent_to_email: email,
        sent_at: now,
      } as any);

      // criar follow-up (agenda) opcional
      if (meEmpId && followUpAt) {
        await createFollowUp({
          status: "open",
          type: followUpType,
          due_at: new Date(followUpAt).toISOString(),
          title: `Follow-up ${quotation.quotation_number || quotationId}`,
          contact_id: quotation.customer?.id ? (typeof quotation.customer.id === "number" ? quotation.customer.id : Number(quotation.customer.id)) : null,
          quotation_id: /^\d+$/.test(String(quotationId)) ? Number(quotationId) : quotationId,
          deal_id: quotation.deal_id ? String(quotation.deal_id) : null,
          assigned_employee_id: meEmpId,
          created_by_employee_id: meEmpId,
          notes: `Enviar: ${email}`,
        } as any);
      }

      toast({ title: "Marcado como enviado", description: "O n8n vai gerar o PDF e enviar o email." });
      setSendDialogOpen(false);
      await fetchQuotation();
    } catch (e: any) {
      toast({ title: "Erro ao marcar como enviado", description: String(e?.message || e), variant: "destructive" });
    } finally {
      setSending(false);
    }
  };

  const handleOpenProposalDialog = async () => {
    setProposalDialogOpen(true);
    // preload some deals for linking
    setDealLoading(true);
    try {
      const rows = await listDeals({ search: "", limit: 30, page: 1 });
      setDealResults(rows || []);
    } catch {
      setDealResults([]);
    } finally {
      setDealLoading(false);
    }
  };

  const handleSearchDeals = async (q: string) => {
    setDealSearch(q);
    setDealLoading(true);
    try {
      const rows = await listDeals({ search: q, limit: 50, page: 1 });
      setDealResults(rows || []);
    } catch {
      setDealResults([]);
    } finally {
      setDealLoading(false);
    }
  };

  const closeAsProposalCreateDeal = async () => {
    if (!quotation?.customer?.id) {
      toast({ title: "Sem cliente", variant: "destructive" });
      return;
    }
    const customerId = normalizeCustomerId(quotation.customer.id);
    const title = `Proposta - ${quotation.customer.company_name || "Cliente"} - ${quotation.quotation_number || quotationId}`;
    try {
      const deal = await createDeal({
        title,
        status: "proposta",
        customer_id: customerId as any,
        total_amount: Number(quotation.total_amount || 0),
        owner_employee_id: meEmpId || undefined,
        assigned_employee_id: meEmpId || undefined,
        assigned_by_employee_id: meEmpId || undefined,
        assigned_at: new Date().toISOString(),
      } as any);
      await patchQuotation(String(quotationId), { deal_id: (deal as any).id } as any);
      toast({ title: "Proposta criada no pipeline" });
      setProposalDialogOpen(false);
      await fetchQuotation();
    } catch (e: any) {
      toast({ title: "Erro ao criar proposta", description: String(e?.message || e), variant: "destructive" });
    }
  };

  const closeAsProposalLinkDeal = async (dealId: string) => {
    try {
      await patchDeal(String(dealId), { status: "proposta" } as any);
      await patchQuotation(String(quotationId), { deal_id: String(dealId) } as any);
      toast({ title: "Orçamento ligado ao negócio (proposta)" });
      setProposalDialogOpen(false);
      await fetchQuotation();
    } catch (e: any) {
      toast({ title: "Erro ao ligar proposta", description: String(e?.message || e), variant: "destructive" });
    }
  };

  if (loading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl">
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (!quotation) {
    return null;
  }

  const companySettings = settings as any;
  const ivaTotal = (quotation.total_amount || 0) - (quotation.subtotal || 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[95vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Pré-visualização do Orçamento
            </span>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  // Edit is handled by parent (opens QuotationCreator in edit mode)
                  onEdit?.(String(quotationId), quotation?.customer?.id ?? null);
                }}
                disabled={!quotation?.customer?.id}
                title="Editar/retomar"
              >
                <Pencil className="h-4 w-4 mr-1" />
                Editar
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  if (quotation?.deal_id) {
                    // if already linked, ensure deal is in proposta
                    patchDeal(String(quotation.deal_id), { status: "proposta" } as any)
                      .then(() => toast({ title: "Negócio atualizado para Proposta" }))
                      .catch((e: any) =>
                        toast({ title: "Erro ao atualizar negócio", description: String(e?.message || e), variant: "destructive" })
                      );
                  } else {
                    handleOpenProposalDialog();
                  }
                }}
                disabled={!quotation?.customer?.id}
                title="Passar para pipeline (Proposta)"
              >
                <Badge variant="outline" className="mr-2">Proposta</Badge>
                Fechar
              </Button>
              <Button variant="outline" size="sm" onClick={handlePrint} disabled={pdfBusy}>
                <Printer className="h-4 w-4 mr-1" />
                Imprimir
              </Button>
              <Button variant="outline" size="sm" onClick={handleDownloadPdf} disabled={pdfBusy}>
                <Download className="h-4 w-4 mr-1" />
                PDF
              </Button>
              <Button size="sm" onClick={handleOpenSendDialog} disabled={sending}>
                <Send className="h-4 w-4 mr-1" />
                Enviar por Email
              </Button>
            </div>
          </DialogTitle>
        </DialogHeader>

        {/* Send via n8n dialog */}
        <Dialog open={sendDialogOpen} onOpenChange={setSendDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Enviar (n8n)</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div className="text-sm text-muted-foreground">
                Vai marcar como <b>sent</b> e disparar a automação no n8n.
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Email do destinatário</label>
                <Input value={sendEmail} onChange={(e) => setSendEmail(e.target.value)} placeholder="cliente@..." />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Follow-up (quando)</label>
                  <Input type="datetime-local" value={followUpAt} onChange={(e) => setFollowUpAt(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Tipo</label>
                  <Input value={followUpType} onChange={(e) => setFollowUpType(e.target.value)} placeholder="call/email/whatsapp" />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setSendDialogOpen(false)}>Cancelar</Button>
                <Button onClick={handleSendViaN8n} disabled={sending}>
                  {sending ? "A enviar…" : "Confirmar"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Proposal dialog */}
        <Dialog open={proposalDialogOpen} onOpenChange={setProposalDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Fechar como Proposta</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div className="text-sm text-muted-foreground">
                Recomendado: criar negócio quando passa a proposta real. Podes criar novo ou ligar a um existente.
              </div>
              <div className="flex items-center justify-between gap-2">
                <Button onClick={closeAsProposalCreateDeal}>Criar novo negócio</Button>
                <div className="flex-1" />
                <Input
                  value={dealSearch}
                  onChange={(e) => handleSearchDeals(e.target.value)}
                  placeholder="Pesquisar negócios existentes…"
                />
              </div>
              <div className="max-h-[45vh] overflow-auto border rounded-md">
                {dealLoading ? (
                  <div className="p-4 text-sm text-muted-foreground">A carregar…</div>
                ) : dealResults.length === 0 ? (
                  <div className="p-4 text-sm text-muted-foreground">Sem resultados</div>
                ) : (
                  <div className="divide-y">
                    {dealResults.slice(0, 50).map((d: any) => (
                      <div key={String(d.id)} className="p-3 flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <div className="font-medium truncate">{String(d.title || d.id)}</div>
                          <div className="text-xs text-muted-foreground flex gap-2">
                            <span>{String(d.status || "")}</span>
                            {d.customer_id?.company_name ? <span className="truncate">{String(d.customer_id.company_name)}</span> : null}
                          </div>
                        </div>
                        <Button variant="outline" size="sm" onClick={() => closeAsProposalLinkDeal(String(d.id))}>
                          Ligar
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>

        <ScrollArea className="flex-1">
          {/* PDF Preview Container */}
          <div className="bg-white text-black p-8 rounded-lg shadow-inner border min-h-[800px] print:shadow-none print:border-none">
            {/* Header com Logo */}
            <div className="flex justify-between items-start mb-8">
              <div>
                <img 
                  src="/logo-hotelequip-dark.svg" 
                  alt="HotelEquip" 
                  className="h-12 mb-2"
                />
                <div className="text-sm text-gray-600 space-y-0.5">
                  <p className="font-semibold">{companySettings?.name || 'HotelEquip'}</p>
                  <p>{companySettings?.address || 'Morada da empresa'}</p>
                  <p>NIF: {companySettings?.vat_number || '000000000'}</p>
                  <p>Tel: {companySettings?.phone || '+351 XXX XXX XXX'}</p>
                  <p>Email: {companySettings?.email || 'geral@hotelequip.pt'}</p>
                </div>
              </div>
              <div className="text-right">
                <h1 className="text-2xl font-bold text-gray-800 mb-2">ORÇAMENTO</h1>
                <p className="text-lg font-semibold text-primary">{quotation.quotation_number}</p>
                <p className="text-sm text-gray-600">
                  Data: {new Date(quotation.created_at).toLocaleDateString('pt-PT')}
                </p>
                {quotation.valid_until && (
                  <p className="text-sm text-gray-600">
                    Válido até: {new Date(quotation.valid_until).toLocaleDateString('pt-PT')}
                  </p>
                )}
              </div>
            </div>

            <Separator className="mb-6" />

            {/* Dados do Cliente */}
            <div className="mb-8 p-4 bg-gray-50 rounded-lg">
              <h3 className="text-sm font-semibold text-gray-500 mb-2">CLIENTE</h3>
              <div className="text-sm space-y-1">
                <p className="font-bold text-lg">{quotation.customer?.company_name || 'Cliente'}</p>
                {quotation.customer?.contact_name && (
                  <p>Att: {quotation.customer.contact_name}</p>
                )}
                {quotation.customer?.address && <p>{quotation.customer.address}</p>}
                {(quotation.customer?.postal_code || quotation.customer?.city) && (
                  <p>{quotation.customer.postal_code} {quotation.customer.city}</p>
                )}
                {quotation.customer?.nif && <p>NIF: {quotation.customer.nif}</p>}
              </div>
            </div>

            {/* Tabela de Itens */}
            <table className="w-full mb-8">
              <thead>
                <tr className="border-b-2 border-gray-300">
                  <th className="text-left py-3 text-sm font-semibold text-gray-600">Descrição</th>
                  <th className="text-center py-3 text-sm font-semibold text-gray-600 w-20">Qtd</th>
                  <th className="text-right py-3 text-sm font-semibold text-gray-600 w-28">P. Unit.</th>
                  <th className="text-right py-3 text-sm font-semibold text-gray-600 w-28">Total</th>
                </tr>
              </thead>
              <tbody>
                {quotation.items.map((item, index) => (
                  <tr key={item.id} className={index % 2 === 0 ? 'bg-gray-50' : ''}>
                    <td className="py-3 text-sm">
                      <p className="font-medium">{item.product_name}</p>
                      {item.sku && (
                        <p className="text-xs text-gray-500">SKU: {item.sku}</p>
                      )}
                    </td>
                    <td className="py-3 text-sm text-center">{item.quantity}</td>
                    <td className="py-3 text-sm text-right">
                      {(item.unit_price || 0).toLocaleString('pt-PT', { style: 'currency', currency: 'EUR' })}
                    </td>
                    <td className="py-3 text-sm text-right font-medium">
                      {(item.line_total || 0).toLocaleString('pt-PT', { style: 'currency', currency: 'EUR' })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Totais */}
            <div className="flex justify-end mb-8">
              <div className="w-64 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Subtotal:</span>
                  <span>{(quotation.subtotal || 0).toLocaleString('pt-PT', { style: 'currency', currency: 'EUR' })}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">IVA (23%):</span>
                  <span>{ivaTotal.toLocaleString('pt-PT', { style: 'currency', currency: 'EUR' })}</span>
                </div>
                <Separator />
                <div className="flex justify-between font-bold text-lg">
                  <span>Total:</span>
                  <span className="text-primary">
                    {(quotation.total_amount || 0).toLocaleString('pt-PT', { style: 'currency', currency: 'EUR' })}
                  </span>
                </div>
              </div>
            </div>

            {/* Notas */}
            {quotation.notes && (
              <div className="mb-8 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                <h3 className="text-sm font-semibold text-gray-600 mb-2">NOTAS</h3>
                <p className="text-sm text-gray-700 whitespace-pre-wrap">{quotation.notes}</p>
              </div>
            )}

            {/* Rodapé */}
            <div className="border-t-2 border-gray-200 pt-6 text-xs text-gray-500 space-y-2">
              <p className="font-semibold">Condições</p>
              <p className="whitespace-pre-wrap">
                {quotation.terms_conditions || "• Orçamento válido por 30 dias • Pagamento/Entrega: a definir"}
              </p>
              
              <Separator className="my-4" />
              
              <div className="flex justify-between items-center">
                <div>
                  <p className="font-semibold">Dados Bancários:</p>
                  <p>IBAN: PT50 0000 0000 0000 0000 0000 0</p>
                </div>
                <div className="text-right">
                  <p>{companySettings?.name || 'HotelEquip'}</p>
                  <p>Tel: {companySettings?.phone || '+351 XXX XXX XXX'}</p>
                </div>
              </div>
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}