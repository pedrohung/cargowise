import { queryOptions } from "@tanstack/react-query";
import { listParts, listStockMovements } from "@/lib/inventory.functions";
import { listMaintenance, listMaintenanceParts } from "@/lib/maintenance.functions";

export const partsQueryOptions = queryOptions({
  queryKey: ["parts"],
  queryFn: () => listParts(),
  staleTime: 1000 * 30,
});

export const stockMovementsQueryOptions = queryOptions({
  queryKey: ["stock-movements"],
  queryFn: () => listStockMovements(),
  staleTime: 1000 * 30,
});

export const maintenanceQueryOptions = queryOptions({
  queryKey: ["maintenance"],
  queryFn: () => listMaintenance(),
  staleTime: 1000 * 30,
});

export const maintenancePartsQueryOptions = (maintenance_id: string) =>
  queryOptions({
    queryKey: ["maintenance-parts", maintenance_id],
    queryFn: () => listMaintenanceParts({ data: { maintenance_id } }),
    staleTime: 1000 * 30,
  });
