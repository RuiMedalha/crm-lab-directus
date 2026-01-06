import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  createContact,
  deleteContact,
  getContactById,
  listContacts,
  patchContact,
  type ContactItem,
} from "@/integrations/directus/contacts";

export type Contact = ContactItem;
export type ContactInsert = Record<string, unknown>;
export type ContactUpdate = Record<string, unknown>;

export function useContacts(searchTerm?: string) {
  return useQuery({
    queryKey: ["contacts", searchTerm],
    queryFn: async () => {
      return await listContacts({ search: searchTerm || "", limit: 500, page: 1 });
    },
  });
}

export function useContact(id: string | undefined) {
  return useQuery({
    queryKey: ["contact", id],
    queryFn: async () => {
      if (!id) return null;
      return await getContactById(id);
    },
    enabled: !!id,
  });
}

export function useCreateContact() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (contact: ContactInsert) => {
      return await createContact(contact);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
    },
  });
}

export function useUpdateContact() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...contact }: ContactUpdate & { id: string }) => {
      return await patchContact(id, contact);
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
    mutationFn: async (id: string) => {
      await deleteContact(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
    },
  });
}
