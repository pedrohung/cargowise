import { queryOptions } from "@tanstack/react-query";
import { listUsers } from "@/lib/admin.functions";

export const adminUsersQueryOptions = queryOptions({
  queryKey: ["admin-users"],
  queryFn: () => listUsers(),
  staleTime: 1000 * 15,
});
