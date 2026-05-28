import { queryOptions } from "@tanstack/react-query";
import { listClients } from "@/lib/clients.functions";

export const clientsQueryOptions = queryOptions({
  queryKey: ["clients"],
  queryFn: () => listClients(),
  staleTime: 1000 * 30,
});
