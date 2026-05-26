import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { getCurrentUser } from "@/lib/auth.functions";

export const currentUserQueryOptions = queryOptions({
  queryKey: ["currentUser"],
  queryFn: () => getCurrentUser(),
  staleTime: 60_000,
});

export function useCurrentUser() {
  return useSuspenseQuery(currentUserQueryOptions);
}
