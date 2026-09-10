"use client";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api-client";

export const customStatusesKey = (projectId: string) => ["custom-statuses", projectId] as const;

/** Project-defined custom statuses (`bd config get status.custom`), beyond the built-ins. */
export function useCustomStatuses(projectId: string) {
  return useQuery({
    queryKey: customStatusesKey(projectId),
    queryFn: () => api.statuses.custom(projectId),
    // Workflow config, not bead data — changes rarely, no need for the SSE stream.
    staleTime: 60_000,
  });
}
