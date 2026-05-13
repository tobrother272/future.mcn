/**
 * Hệ thống phân quyền frontend.
 *
 * Mỗi permission = một hành động cụ thể trong hệ thống.
 * Mỗi role (internal hoặc employee) được map sang tập permission tương ứng.
 *
 * Thêm role mới: chỉ cần thêm entry vào ROLE_PERMISSIONS bên dưới.
 */

// ── Permission keys ────────────────────────────────────────────
export type Permission =
  // Channel
  | "channel:view"          // Xem danh sách / chi tiết kênh
  | "channel:create"        // Tạo kênh mới (Import CSV, thêm thủ công)
  | "channel:edit"          // Sửa thông tin kênh (status, monetization, tên…)
  | "channel:delete"        // Xóa kênh, xóa tất cả kênh trong CMS
  | "channel:assign"        // Gán topic / partner / chuyển CMS
  // CMS
  | "cms:view"              // Xem danh sách / chi tiết CMS
  | "cms:create"            // Tạo CMS mới
  | "cms:edit"              // Sửa thông tin CMS
  | "cms:delete"            // Xóa CMS
  | "cms:manage_api_key"    // Quản lý API key của CMS
  // Partner
  | "partner:view"
  | "partner:manage"        // Tạo / sửa / xóa đối tác
  // Revenue & Finance
  | "revenue:view"          // Xem doanh thu
  | "revenue:edit"          // Import / sửa doanh thu
  | "contract:view"
  | "contract:manage"
  // Compliance
  | "compliance:view"
  | "compliance:resolve"    // Xử lý vi phạm
  // Admin
  | "employee:manage"       // Quản lý nhân viên
  | "settings:manage";      // Cài đặt hệ thống

// ── Tập hợp tiện lợi ──────────────────────────────────────────
const ALL_PERMISSIONS = new Set<Permission>([
  "channel:view", "channel:create", "channel:edit", "channel:delete", "channel:assign",
  "cms:view", "cms:create", "cms:edit", "cms:delete", "cms:manage_api_key",
  "partner:view", "partner:manage",
  "revenue:view", "revenue:edit",
  "contract:view", "contract:manage",
  "compliance:view", "compliance:resolve",
  "employee:manage", "settings:manage",
]);

// ── Định nghĩa permission theo role ───────────────────────────

/** Internal roles (account table — email login) */
const INTERNAL_ROLE_PERMISSIONS: Record<string, Set<Permission>> = {
  SUPER_ADMIN: ALL_PERMISSIONS,

  ADMIN: new Set<Permission>([
    "channel:view", "channel:create", "channel:edit", "channel:assign",
    "cms:view", "cms:create", "cms:edit", "cms:manage_api_key",
    "partner:view", "partner:manage",
    "revenue:view", "revenue:edit",
    "contract:view", "contract:manage",
    "compliance:view", "compliance:resolve",
    "employee:manage", "settings:manage",
  ]),

  FINANCE_MANAGER: new Set<Permission>([
    "channel:view",
    "cms:view",
    "partner:view",
    "revenue:view", "revenue:edit",
    "contract:view", "contract:manage",
    "compliance:view",
  ]),

  CONTENT_MANAGER: new Set<Permission>([
    "channel:view", "channel:create", "channel:edit", "channel:assign",
    "cms:view",
    "partner:view",
    "compliance:view",
  ]),

  QC_REVIEWER: new Set<Permission>([
    "channel:view",
    "cms:view",
    "compliance:view", "compliance:resolve",
  ]),

  COMPLIANCE_MANAGER: new Set<Permission>([
    "channel:view",
    "cms:view",
    "compliance:view", "compliance:resolve",
  ]),

  VIEWER: new Set<Permission>([
    "channel:view",
    "cms:view",
    "partner:view",
    "revenue:view",
    "contract:view",
    "compliance:view",
  ]),
};

/** Employee roles (employee table — username login) */
const EMPLOYEE_ROLE_PERMISSIONS: Record<string, Set<Permission>> = {
  // Admin: full quyền trên CMS được assign + quản lý nhân viên do mình tạo
  "Admin": new Set<Permission>([
    "channel:view", "cms:view", "partner:view",
    "revenue:view", "contract:view",
    "compliance:view",
    "channel:create",
    "channel:edit",   // full quyền kênh
    "channel:delete",
    "channel:assign",
    "employee:manage",
  ]),

  "Cấp Kênh": new Set<Permission>([
    // Xem đầy đủ
    "channel:view", "cms:view", "partner:view",
    "revenue:view", "contract:view",
    "compliance:view",
    // Tạo kênh + gán
    "channel:create",
    "channel:assign",
    // KHÔNG CÓ: channel:edit, channel:delete, cms:edit, cms:delete
  ]),

  "QC": new Set<Permission>([
    // Chỉ 3 trang: Chính sách, Quy trình, Vi phạm
    "compliance:view",
    "compliance:resolve",
  ]),

  "Kế Toán": new Set<Permission>([
    "channel:view",
    "cms:view",
    "partner:view",
    "revenue:view",
    "contract:view", "contract:manage",
  ]),
};

// ── Hàm tra quyền ─────────────────────────────────────────────

export function getPermissions(
  userType: "internal" | "partner" | "employee",
  role: string | null | undefined,
): Set<Permission> {
  if (userType === "partner") {
    // Partner chỉ thấy portal riêng — không có permission hệ thống nội bộ
    return new Set();
  }
  if (userType === "employee") {
    return EMPLOYEE_ROLE_PERMISSIONS[role ?? ""] ?? new Set();
  }
  // internal
  return INTERNAL_ROLE_PERMISSIONS[role ?? ""] ?? new Set();
}

export function can(
  perms: Set<Permission>,
  permission: Permission,
): boolean {
  return perms.has(permission);
}

// ── Allowed routes per role ────────────────────────────────────
// Mỗi entry là path prefix (bắt đầu bằng "/").
// null = không giới hạn (toàn quyền).

/** Trả về danh sách path prefix được phép, hoặc null nếu không giới hạn. */
export function getAllowedPaths(
  userType: "internal" | "partner" | "employee",
  role: string | null | undefined,
): string[] | null {
  if (userType !== "employee") return null; // internal/partner: không giới hạn

  switch (role) {
    case "QC":
      return ["/policies", "/workflow", "/compliance"];

    case "Admin":
      return [
        "/dashboard", "/cms", "/channels",
        "/partners", "/contracts",
        "/policies", "/workflow", "/compliance",
        "/ai", "/inbox", "/settings", "/revenue",
        "/employees", // Admin có thêm trang nhân viên
      ];

    case "Cấp Kênh":
      return [
        "/dashboard", "/cms", "/channels",
        "/partners", "/contracts",
        "/policies", "/workflow", "/compliance",
        "/ai", "/inbox", "/settings", "/revenue",
        // KHÔNG CÓ: /employees
      ];

    case "Kế Toán":
      return ["/contracts"];

    default:
      return null;
  }
}

/** Landing page mặc định sau khi đăng nhập theo role. */
export function getDefaultPath(
  userType: "internal" | "partner" | "employee",
  role: string | null | undefined,
): string {
  if (userType === "partner") return "/portal/home";

  if (userType === "employee") {
    switch (role) {
      case "QC":      return "/policies";
      case "Kế Toán": return "/contracts";
      default:         return "/dashboard";
    }
  }

  return "/dashboard";
}
