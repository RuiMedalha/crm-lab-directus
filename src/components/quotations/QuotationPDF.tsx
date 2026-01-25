import { Separator } from '@/components/ui/separator';

export interface QuotationData {
    id: string;
    quotation_number: string;
    status: string;
    subtotal: number;
    total_amount: number;
    notes: string | null;
    valid_until: string | null;
    created_at: string;
    customer: {
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

interface QuotationPDFProps {
    quotation: QuotationData;
    settings: any; // Company Settings
    id?: string; // HTML ID for printing/capture
}

export function QuotationPDF({ quotation, settings, id }: QuotationPDFProps) {
    const ivaTotal = (quotation.total_amount || 0) - (quotation.subtotal || 0);

    return (
        <div id={id} className="bg-white text-black p-12 max-w-[210mm] mx-auto min-h-[297mm] relative shadow-lg print:shadow-none print:w-full print:max-w-none">
            {/* Header */}
            <div className="flex justify-between items-start mb-12">
                <div>
                    {/* LOGO */}
                    <div className="mb-4">
                        <div className="text-3xl font-bold tracking-tight text-slate-800">
                            HOTELEQUIP<span className="text-primary">.PT</span>
                        </div>
                        <div className="text-xs tracking-widest text-slate-500 uppercase mt-1">Equipamentos Hoteleiros</div>
                    </div>

                    <div className="text-sm text-slate-600 space-y-1">
                        <p className="font-medium text-slate-900">{settings?.name || 'Nov Ousado Unipessoal Lda'}</p>
                        <p>{settings?.address || 'Rua da Empresa, 123'}</p>
                        <p>{settings?.postal_code} {settings?.city}</p>
                        <p>NIF: {settings?.nif || '500 000 000'}</p>
                    </div>
                </div>

                <div className="text-right">
                    <h1 className="text-4xl font-light text-slate-300 mb-4">ORÇAMENTO</h1>
                    <div className="space-y-1">
                        <p className="text-lg font-bold text-slate-800">#{quotation.quotation_number}</p>
                        <p className="text-sm text-slate-500">
                            Data: <span className="text-slate-800">{new Date(quotation.created_at).toLocaleDateString('pt-PT')}</span>
                        </p>
                        {quotation.valid_until && (
                            <p className="text-sm text-slate-500">
                                Válido até: <span className="text-slate-800">{new Date(quotation.valid_until).toLocaleDateString('pt-PT')}</span>
                            </p>
                        )}
                    </div>
                </div>
            </div>

            <Separator className="bg-slate-200 mb-10" />

            {/* Cliente */}
            <div className="mb-12 flex justify-between">
                <div className="w-1/2">
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Cliente</h3>
                    <div className="text-slate-800 font-medium text-lg mb-1">{quotation.customer?.company_name || 'Cliente Final'}</div>
                    <div className="text-sm text-slate-600 space-y-1">
                        {quotation.customer?.contact_name && <p>Att: {quotation.customer.contact_name}</p>}
                        <p>{quotation.customer?.address}</p>
                        <p>{quotation.customer?.postal_code} {quotation.customer?.city}</p>
                        {quotation.customer?.nif && <p>NIF: {quotation.customer.nif}</p>}
                    </div>
                </div>
            </div>

            {/* Tabela */}
            <div className="mb-10">
                <table className="w-full">
                    <thead>
                        <tr className="border-b border-slate-800">
                            <th className="text-left py-3 text-xs font-bold text-slate-800 uppercase tracking-wider">Descrição</th>
                            <th className="text-center py-3 text-xs font-bold text-slate-800 uppercase tracking-wider w-20">Qtd.</th>
                            <th className="text-right py-3 text-xs font-bold text-slate-800 uppercase tracking-wider w-32">Preço Unit.</th>
                            <th className="text-right py-3 text-xs font-bold text-slate-800 uppercase tracking-wider w-32">Total</th>
                        </tr>
                    </thead>
                    <tbody className="text-sm">
                        {quotation.items.map((item, index) => (
                            <tr key={item.id} className="border-b border-slate-100">
                                <td className="py-4 pr-4">
                                    <p className="font-medium text-slate-800">{item.product_name}</p>
                                    {item.sku && <p className="text-xs text-slate-500 mt-0.5">Ref: {item.sku}</p>}
                                </td>
                                <td className="py-4 text-center text-slate-600">{item.quantity}</td>
                                <td className="py-4 text-right text-slate-600">
                                    {(item.unit_price || 0).toLocaleString('pt-PT', { style: 'currency', currency: 'EUR' })}
                                </td>
                                <td className="py-4 text-right font-medium text-slate-800">
                                    {(item.line_total || 0).toLocaleString('pt-PT', { style: 'currency', currency: 'EUR' })}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Totais */}
            <div className="flex justify-end mb-12">
                <div className="w-72 space-y-3">
                    <div className="flex justify-between text-sm text-slate-600">
                        <span>Subtotal</span>
                        <span>{(quotation.subtotal || 0).toLocaleString('pt-PT', { style: 'currency', currency: 'EUR' })}</span>
                    </div>
                    <div className="flex justify-between text-sm text-slate-600">
                        <span>IVA (23%)</span>
                        <span>{ivaTotal.toLocaleString('pt-PT', { style: 'currency', currency: 'EUR' })}</span>
                    </div>
                    <Separator className="bg-slate-200" />
                    <div className="flex justify-between text-xl font-bold text-slate-900 pt-1">
                        <span>Total</span>
                        <span>{(quotation.total_amount || 0).toLocaleString('pt-PT', { style: 'currency', currency: 'EUR' })}</span>
                    </div>
                </div>
            </div>

            {/* Notas */}
            {quotation.notes && (
                <div className="mb-12 bg-slate-50 p-6 rounded border border-slate-100">
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Notas / Observações</h3>
                    <p className="text-sm text-slate-700 whitespace-pre-wrap">{quotation.notes}</p>
                </div>
            )}

            {/* Footer */}
            <div className="absolute bottom-12 left-12 right-12 text-xs text-slate-400 text-center">
                <p className="mb-2">Hotelequip.pt - Equipamentos Hoteleiros</p>
                <p>Este documento não serve de fatura. Processado por computador.</p>

                <div className="mt-6 pt-6 border-t border-slate-100 flex justify-between text-left">
                    <div>
                        <span className="font-bold text-slate-600">IBAN:</span> PT50 0000 0000 0000 0000 0000 0
                    </div>
                    <div>
                        <span className="font-bold text-slate-600">Contacto:</span> +351 916 542 211
                    </div>
                    <div>
                        <span className="font-bold text-slate-600">Email:</span> geral@hotelequip.pt
                    </div>
                </div>
            </div>
        </div>
    );
}
