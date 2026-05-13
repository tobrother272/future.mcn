import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "./client";

export type EmployeeRole = "Admin" | "Cấp Kênh" | "QC" | "Kế Toán";
export const EMPLOYEE_ROLES: EmployeeRole[] = ["Admin", "Cấp Kênh", "QC", "Kế Toán"];

export interface Employee {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  username: string | null;
  role: EmployeeRole | null;
  status: string;
  cms_ids: string[];
  contract_count?: number;
  created_at: string;
  updated_at: string;
}

export interface EmployeeCreate {
  name: string;
  email?: string;
  phone?: string;
  username?: string;
  password?: string;
  role?: EmployeeRole | null;
  status?: string;
  cms_ids?: string[];
}

interface EmployeeFilters { status?: string; search?: string; limit?: number; offset?: number }
interface PaginatedEmployees { items: Employee[]; total: number }

export function useEmployeeList(filters?: EmployeeFilters) {
  return useQuery({
    queryKey: ["employees", filters],
    queryFn: () =>
      apiClient.get("employees", { searchParams: filters as Record<string, string | number> })
        .json<PaginatedEmployees>(),
  });
}

export function useCreateEmployee() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: EmployeeCreate) =>
      apiClient.post("employees", { json: data }).json<Employee>(),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["employees"] }),
  });
}

export function useUpdateEmployee(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<EmployeeCreate>) =>
      apiClient.put(`employees/${id}`, { json: data }).json<Employee>(),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["employees"] }),
  });
}

export function useDeleteEmployee() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiClient.delete(`employees/${id}`).json<{ ok: boolean }>(),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["employees"] }),
  });
}
