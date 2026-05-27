import { queryOptions } from "@tanstack/react-query";
import {
  listClientLocations,
  listMunicipalities,
  listProvinces,
} from "@/lib/geography.functions";

export const provincesQueryOptions = queryOptions({
  queryKey: ["geography", "provinces"],
  queryFn: () => listProvinces(),
  staleTime: 1000 * 60 * 60, // 1h, static data
});

export const municipalitiesQueryOptions = queryOptions({
  queryKey: ["geography", "municipalities"],
  queryFn: () => listMunicipalities(),
  staleTime: 1000 * 60 * 60,
});

export const clientLocationsQueryOptions = queryOptions({
  queryKey: ["client-locations"],
  queryFn: () => listClientLocations(),
  staleTime: 1000 * 30,
});
