import { queryOptions } from "@tanstack/react-query";
import { getCompanyConfig } from "@/lib/company.functions";

export const companyConfigQueryOptions = queryOptions({
  queryKey: ["company-config"],
  queryFn: () => getCompanyConfig(),
  staleTime: 1000 * 60,
});
