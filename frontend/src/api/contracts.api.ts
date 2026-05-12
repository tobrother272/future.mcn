import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "./client";

export interface PartnerContractWithPartner extends PartnerContract {
  partner_name: string | null;
}

export function useAllContracts(params?: {
  search?: string; employee_id?: string; partner_id?: string;
  limit?: number; offset?: number;
}) {
  const sp = new URLSearchParams();
  if (params?.search)      sp.set("search",      params.search);
  if (params?.employee_id) sp.set("employee_id", params.employee_id);
  if (params?.partner_id)  sp.set("partner_id",  params.partner_id);
  if (params?.limit)       sp.set("limit",  String(params.limit));
  if (params?.offset)      sp.set("offset", String(params.offset));
  const qs = sp.toString();
  return useQuery({
    queryKey: ["contracts", "all", params],
    queryFn: () => apiClient.get(`contracts${qs ? `?${qs}` : ""}`).json<{ items: PartnerContractWithPartner[]; total: number }>(),
  });
}

export interface PartnerContract {
  id: string;
  partner_id: string;
  title: string;
  file_name: string;
  file_path: string;
  file_size: number;
  upload_date: string;
  contract_number: string | null;
  employee_id: string | null;
  employee_name?: string | null;
  created_at: string;
}

export function usePartnerContracts(partnerId: string) {
  return useQuery({
    queryKey: ["contracts", partnerId],
    queryFn: () => apiClient.get(`contracts/${partnerId}`).json<PartnerContract[]>(),
    enabled: !!partnerId,
  });
}

export function useUploadContract(partnerId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (formData: FormData) =>
      apiClient.post(`contracts/${partnerId}`, { body: formData }).json<PartnerContract>(),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["contracts", partnerId] }),
  });
}

export function useUpdateContract(partnerId: string, id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { contract_number?: string | null; title?: string; upload_date?: string; employee_id?: string | null }) =>
      apiClient.patch(`contracts/${partnerId}/${id}`, { json: data }).json<PartnerContract>(),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["contracts", partnerId] }),
  });
}

export function useDeleteContract(partnerId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiClient.delete(`contracts/${partnerId}/${id}`).json<{ ok: boolean }>(),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["contracts", partnerId] }),
  });
}
