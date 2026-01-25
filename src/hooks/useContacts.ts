import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { directusRequest } from "@/integrations/directus/client";

export interface Contact {
  id: number; // Directus uses integer for contacts based on schema check
  company_name: string;
  contact_name?: string;
  nif?: string;
  email?: string;
  phone?: string;
  // Add other fields as needed
  moloni_client_id?: string;
}

export type ContactInsert = Omit<Contact, "id">;
export type ContactUpdate = Partial<Contact>;

export function useContacts(searchTerm?: string) {
  return useQuery({
    queryKey: ["contacts", searchTerm],
    queryFn: async () => {
      const queryParams = new URLSearchParams({
        limit: "1000",
        sort: "-date_created", // Adjust if field name differs
      });

      const filter: any = {};

      if (searchTerm) {
        filter._or = [
          { company_name: { _icontains: searchTerm } },
          { nif: { _contains: searchTerm } },
          { contact_name: { _icontains: searchTerm } },
          { email: { _icontains: searchTerm } },
          { phone: { _contains: searchTerm } }
        ];
      }

      if (Object.keys(filter).length > 0) {
        queryParams.append("filter", JSON.stringify(filter));
      }

      const response = await directusRequest<{ data: Contact[] }>(
        `/items/contacts?${queryParams.toString()}`
      );

      return response.data;
    },
  });
}

export function useContact(id: string | number | undefined) {
  return useQuery({
    queryKey: ["contact", id],
    queryFn: async () => {
      if (!id) return null;
      const response = await directusRequest<{ data: Contact }>(
        `/items/contacts/${id}`
      );
      return response.data;
    },
    enabled: !!id,
  });
}

export function useCreateContact() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (contact: ContactInsert) => {
      const response = await directusRequest<{ data: Contact }>(
        "/items/contacts",
        {
          method: "POST",
          body: JSON.stringify(contact),
        }
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
    },
  });
}

export function useUpdateContact() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...contact }: ContactUpdate & { id: number }) => {
      const response = await directusRequest<{ data: Contact }>(
        `/items/contacts/${id}`,
        {
          method: "PATCH",
          body: JSON.stringify(contact),
        }
      );
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
      queryClient.invalidateQueries({ queryKey: ["contact", data.id] });
    },
  });
}

export function useDeleteContact() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: number) => {
      await directusRequest(
        `/items/contacts/${id}`,
        {
          method: "DELETE",
        }
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
    },
  });
}

