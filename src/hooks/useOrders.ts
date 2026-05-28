import { queryOptions } from "@tanstack/react-query";
import { listOrders, getOrder } from "@/lib/orders.functions";

export const ordersQueryOptions = queryOptions({
  queryKey: ["orders"],
  queryFn: () => listOrders(),
  staleTime: 1000 * 10,
});

export const orderQueryOptions = (id: string) =>
  queryOptions({
    queryKey: ["orders", id],
    queryFn: () => getOrder({ data: { id } }),
    staleTime: 1000 * 10,
  });
