import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createInteraction, listInteractions, type InteractionRow } from "@/integrations/directus/interactions";

export function useInteractions(params?: Parameters<typeof listInteractions>[0]) {
  return useQuery({
    queryKey: ["interactions", params || {}],
    queryFn: async () => await listInteractions(params),
  });
}

export function useCreateInteraction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Partial<InteractionRow>) => await createInteraction(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["interactions"] });
    },
  });
}

