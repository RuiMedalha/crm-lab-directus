import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFollowUp, listFollowUps, patchFollowUp, type FollowUpRow } from "@/integrations/directus/follow-ups";

export function useFollowUps(params?: Parameters<typeof listFollowUps>[0]) {
  return useQuery({
    queryKey: ["follow-ups", params || {}],
    queryFn: async () => await listFollowUps(params),
  });
}

export function useCreateFollowUp() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Partial<FollowUpRow>) => await createFollowUp(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["follow-ups"] });
    },
  });
}

export function usePatchFollowUp() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<FollowUpRow> }) => await patchFollowUp(id, patch),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["follow-ups"] });
    },
  });
}

