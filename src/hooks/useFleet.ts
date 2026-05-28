import { queryOptions } from "@tanstack/react-query";
import {
  listVehicles,
  listDrivers,
  listLatestVehicleLocations,
} from "@/lib/fleet.functions";

export const vehiclesQueryOptions = queryOptions({
  queryKey: ["vehicles"],
  queryFn: () => listVehicles(),
  staleTime: 1000 * 30,
});

export const driversQueryOptions = queryOptions({
  queryKey: ["drivers"],
  queryFn: () => listDrivers(),
  staleTime: 1000 * 60 * 5,
});

export const vehicleLocationsQueryOptions = queryOptions({
  queryKey: ["vehicle-locations"],
  queryFn: () => listLatestVehicleLocations(),
  staleTime: 1000 * 5,
});
