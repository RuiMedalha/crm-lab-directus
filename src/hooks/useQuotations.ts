import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { directusRequest } from "@/integrations/directus/client";
import type { Quotation, QuotationFormData } from "@/types/quotation";

export const QUOTATION_STATUSES = [
  { value: 'draft', label: 'Rascunho', color: 'bg-gray-100 text-gray-800' },
  { value: 'sent', label: 'Enviado', color: 'bg-blue-100 text-blue-800' },
  { value: 'viewed', label: 'Visualizado', color: 'bg-purple-100 text-purple-800' },
  { value: 'accepted', label: 'Aceite', color: 'bg-green-100 text-green-800' },
  { value: 'rejected', label: 'Rejeitado', color: 'bg-red-100 text-red-800' },
  { value: 'expired', label: 'Expirado', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'converted', label: 'Convertido', color: 'bg-emerald-100 text-emerald-800' },
];

export const useQuotations = (filters?: {
  status?: string;
  contact_id?: string;
  deal_id?: string;
  search?: string;
}) => {
  return useQuery({
    queryKey: ["quotations", filters],
    queryFn: async () => {
      const queryParams = new URLSearchParams({
        fields: "*,contact_id.*", // Fetch contact details
        sort: "-date_created",
      });

      const filter: any = {};

      if (filters?.status) {
        filter.status = { _eq: filters.status };
      }

      if (filters?.contact_id) {
        filter.customer_id = { _eq: filters.contact_id }; // Note: Schema uses customer_id
      }

      if (filters?.deal_id) {
        filter.deal_id = { _eq: filters.deal_id };
      }

      if (filters?.search) {
        filter._or = [
          { quotation_number: { _icontains: filters.search } },
          { notes: { _icontains: filters.search } }
        ];
      }

      if (Object.keys(filter).length > 0) {
        queryParams.append("filter", JSON.stringify(filter));
      }

      const response = await directusRequest<{ data: any[] }>(
        `/items/quotations?${queryParams.toString()}`
      );

      // Map Directus response to Quotation type if needed, or rely on loose typing for now
      return response.data.map(q => ({
        ...q,
        number: q.quotation_number, // User friendly alias
        contact: q.contact_id // Expand alias
      })) as unknown as Quotation[];
    },
  });
};

export const useQuotation = (id?: string) => {
  return useQuery({
    queryKey: ["quotation", id],
    queryFn: async () => {
      if (!id) return null;

      const response = await directusRequest<{ data: any }>(
        `/items/quotations/${id}?fields=*,items.*,contact_id.*`
      );

      const q = response.data;
      return {
        ...q,
        number: q.quotation_number,
        contact: q.contact_id,
        items: q.items // Assuming O2M relation is fetched
      } as unknown as Quotation;
    },
    enabled: !!id,
  });
};

export const useCreateQuotation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: QuotationFormData) => {
      // NOTE: Creation is handled in QuotationCreator.tsx directly mostly for complex nesting
      // But we keep this hook for other programmatic uses if needed

      const payload = {
        customer_id: data.contact_id,
        deal_id: data.deal_id,
        status: 'draft',
        // ... (simplified for brevity, main logic in component)
      };

      // Implement proper creation if needed, or warn
      throw new Error("Use QuotationCreator component for creation");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["quotations"] });
    },
  });
};

export const useUpdateQuotation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      ...data
    }: Partial<Quotation> & { id: string }) => {
      const response = await directusRequest<{ data: any }>(
        `/items/quotations/${id}`,
        {
          method: 'PATCH',
          body: JSON.stringify(data)
        }
      );
      return response.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["quotations"] });
      queryClient.invalidateQueries({ queryKey: ["quotation", variables.id] });
    },
  });
};

export const useDeleteQuotation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await directusRequest(
        `/items/quotations/${id}`,
        { method: 'DELETE' }
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["quotations"] });
    },
  });
};

export const useSendQuotation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await directusRequest<{ data: any }>(
        `/items/quotations/${id}`,
        {
          method: 'PATCH',
          body: JSON.stringify({
            status: "sent",
            sent_at: new Date().toISOString(),
          })
        }
      );
      return response.data;
    },
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ["quotations"] });
      queryClient.invalidateQueries({ queryKey: ["quotation", id] });
    },
  });
};

export const useQuotationsByDeal = (dealId: string) => {
  return useQuotations({ deal_id: dealId });
};

export const useCreateQuotationFromDeal = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (dealId: string) => {
      // Create a draft quotation linked to the deal
      // We might need to fetch the deal to get the customer_id first, 
      // but for now let's assume directus handles it or we update it later.
      // Actually, better to just create it minimal.

      const payload = {
        deal_id: dealId,
        status: 'draft',
        date_created: new Date().toISOString(),
        // quotation_number generated by Directus hook
      };

      const response = await directusRequest<{ data: any }>(
        '/items/quotations?fields=id,quotation_number',
        {
          method: 'POST',
          body: JSON.stringify(payload)
        }
      );

      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["quotations"] });
    }
  });
};
