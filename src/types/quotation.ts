export interface QuotationItem {
    id: string;
    product_name: string;
    description?: string;
    quantity: number;
    unit_price: number;
    discount_percentage: number;
    discount_amount: number;
    tax_rate: number; // IVA %
    subtotal: number;
    total: number;
    created_at?: Date;
}

export interface Quotation {
    id: string; // Or number, Directus seems to use integer ID but frontend treats as string sometimes

    // Directus Fields
    quotation_number: string;
    date_created: string;
    total_amount: number;
    customer_id: number;
    deal_id?: string;
    status: 'draft' | 'sent' | 'viewed' | 'accepted' | 'rejected' | 'expired' | 'converted';

    // Legacy/Frontend Alias Fields (keep for compatibility if mapped)
    number?: string;
    created_at?: string; // Mapped from date_created
    valid_until?: Date | string; // Directus sends string date

    // Relations
    contact?: any;
    items: QuotationItem[];

    // Pricing
    subtotal: number;
    discount_type?: 'percentage' | 'fixed';
    discount_value?: number;
    discount_amount?: number;
    tax_rate?: number;
    tax_amount?: number;
    total?: number; // Alias for total_amount if mapped

    // Metadata
    title?: string;
    notes?: string;
    internal_notes?: string;
    terms_and_conditions?: string;
    payment_terms?: string;
    delivery_terms?: string;

    // Validity
    valid_days?: number;

    // Tracking
    created_by?: string;
    updated_at?: Date;
    sent_at?: Date | string;
    viewed_at?: Date;
    accepted_at?: Date;
    rejected_at?: Date;
    expired_at?: Date;

    // Approval
    requires_approval?: boolean;
    approved_by?: string;
    approved_at?: Date;
    approval_notes?: string;

    // Conversion
    converted_to_order?: boolean;
    order_id?: string;

    // PDF
    pdf_url?: string;
    pdf_generated_at?: Date;

    // Template
    template_id?: string;
}

export interface QuotationTemplate {
    id: string;
    name: string;
    description?: string;
    items: Omit<QuotationItem, 'id' | 'created_at'>[];
    default_tax_rate: number;
    default_valid_days: number;
    default_terms_and_conditions?: string;
    default_payment_terms?: string;
    is_active: boolean;
    created_at: Date;
}

export interface QuotationFormData {
    contact_id: string;
    deal_id?: string;
    title: string;
    items: Omit<QuotationItem, 'id' | 'created_at'>[];
    discount_type: 'percentage' | 'fixed';
    discount_value: number;
    tax_rate: number;
    valid_days: number;
    notes?: string;
    internal_notes?: string;
    terms_and_conditions?: string;
    payment_terms?: string;
    template_id?: string;
}
