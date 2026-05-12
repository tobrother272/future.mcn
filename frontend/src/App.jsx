// ═══════════════════════════════════════════════════════════════════
// MERIDIAN MCN v5.1 — AUTOMATION & AI OPTIMIZED
// + AI Cache 3 lớp (giảm 70-90% chi phí Claude API)
// + Anthropic Prompt Caching (giảm 90% giá system prompt)
// + Streaming AI + Retry on rate limit
// + IndexedDB + LZString compression (không giới hạn 5MB)
// + Cross-tab sync (BroadcastChannel)
// + File hash dedupe trong Import
// + Auto-import Folder Watch (File System Access API)
// + YouTube Data API v3 sync (no manual Excel upload)
// + Google Drive auto backup
// + Webhook notifications (Telegram/Slack/Discord/custom)
// + Bug fixes: CmsView/AlertsView callAI props, Inspection dedupe key
// Designed for KUDO Network scale (8 CMS, 500+ channels, multi-currency)
// ═══════════════════════════════════════════════════════════════════
import { useState, useMemo, useRef, useEffect, useCallback, createContext, useContext, Fragment, memo, lazy, Suspense } from "react";
import {
  LayoutDashboard, Users, Tv, DollarSign, RefreshCw, FileBarChart,
  AlertTriangle, ArrowUpRight, ArrowDownRight, Clock, Download, Upload,
  TrendingUp, Eye, UserPlus, Shield, Settings, ChevronLeft, ChevronRight,
  FileText, Wallet, Lock, Key, UserCog, History, Trash2, Edit3, Plus,
  Server, Check, X, Save, Bot, Send, Sparkles, AlertCircle, MessageSquare,
  BarChart2, Search, FileSpreadsheet, BookOpen, ShieldAlert, Zap, Database,
  FileUp, Gauge, Info, LogOut, LogIn, Hash, Globe, Image as ImageIcon,
  Palette, Tag, Folder, FolderOpen, Building2, Languages, Bell, EyeOff,
  Mail, ChevronRight as ChevronRightIcon, Crown, Star, Target, Layers,
  Filter, Calendar, FileCheck, Briefcase, Award, Activity, Sliders
} from "lucide-react";
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, RadialBarChart, RadialBar
} from "recharts";

// ─── VERSION ──────────────────────────────────────────────────────
const APP_VERSION = "5.1.0";
const APP_BUILD = "AUTOMATION";
const APP_BUILD_DATE = "2026-05-10";

// ─── REAL KUDO DATA (extracted from your uploads) ─────────────────
const KUDO_CMS_LIST = [
  { id:"CMS01", name:"KUDO Future",        currency:"USD", revFeb:179237, revMar:134694, viewsM:99.8 },
  { id:"CMS02", name:"KUDO Network",       currency:"USD", revFeb:60979,  revMar:53092,  viewsM:23.1 },
  { id:"CMS03", name:"KUDO Kids",          currency:"USD", revFeb:616,    revMar:299,    viewsM:1.5  },
  { id:"CMS04", name:"KUDO Music",         currency:"USD", revFeb:15742,  revMar:28691,  viewsM:66.3 },
  { id:"CMS05", name:"KUDO Entertainment", currency:"USD", revFeb:50127,  revMar:34064,  viewsM:22.4 },
  { id:"CMS06", name:"KUDO Animal",        currency:"USD", revFeb:9905,   revMar:8803,   viewsM:2.3  },
  { id:"CMS07", name:"KUDO DIY",           currency:"USD", revFeb:35909,  revMar:65013,  viewsM:14.2 },
  { id:"CMS08", name:"Auto Mototube",      currency:"CAD", revFeb:204868, revMar:0,      viewsM:65.7 },
];

const KUDO_TOPICS = [
  { id:"T01", name:"Mini Cake",      cms:"KUDO Future",    dept:"BU Diligo",      channels:8 },
  { id:"T02", name:"Mini Food",      cms:"KUDO Future",    dept:"BU Diligo",      channels:7 },
  { id:"T03", name:"DIY Paper",      cms:"KUDO Future",    dept:"BU Diligo",      channels:5 },
  { id:"T04", name:"DIY Story",      cms:"KUDO DIY",       dept:"BU Diligo",      channels:6 },
  { id:"T05", name:"Unboxing ASMR",  cms:"KUDO DIY",       dept:"BU Diligo",      channels:9 },
  { id:"T06", name:"LEGO FUN",       cms:"KUDO Future",    dept:"BU Diligo",      channels:12 },
  { id:"T07", name:"LEGO Technic",   cms:"KUDO Future",    dept:"BU Diligo",      channels:4 },
  { id:"T08", name:"Roblox Story",   cms:"KUDO Future",    dept:"BU Xaro",        channels:6 },
  { id:"T09", name:"Roblox Series",  cms:"KUDO Future",    dept:"BU Xaro",        channels:5 },
  { id:"T10", name:"Minecraft",      cms:"KUDO Future",    dept:"BU Xaro",        channels:3 },
  { id:"T11", name:"Music Vibes",    cms:"KUDO Music",     dept:"Stella Music",   channels:14 },
  { id:"T12", name:"Music ASMR",     cms:"KUDO Music",     dept:"Stella Music",   channels:8 },
  { id:"T13", name:"Kids Songs",     cms:"KUDO Kids",      dept:"BU Diligo",      channels:4 },
  { id:"T14", name:"Animal Stories", cms:"KUDO Animal",    dept:"BU FBN",         channels:6 },
  { id:"T15", name:"Cartoons",       cms:"Auto Mototube",  dept:"BU FBN",         channels:11 },
  { id:"T16", name:"Hamster",        cms:"Auto Mototube",  dept:"BU FBN",         channels:5 },
  { id:"T17", name:"Brainrot",       cms:"KUDO Future",    dept:"BU Diligo",      channels:7 },
];

const KUDO_DEPARTMENTS = ["BU Diligo","BU Xaro","Stella Music","BU FBN","BU Cap Media","BU Globix","BU Buildy"];

const KUDO_PARTNERS = [
  { name:"GLOBIX",        type:"PRODUCTION", channels:42, dept:"BU Diligo" },
  { name:"DILIGO",        type:"PRODUCTION", channels:38, dept:"BU Diligo" },
  { name:"BUILDY",        type:"OWNED",      channels:35, dept:"BU Diligo" },
  { name:"STELLA MUSIC",  type:"PRODUCTION", channels:22, dept:"Stella Music" },
  { name:"WEFANTASIC",    type:"AFFILIATE",  channels:18, dept:"Stella Music" },
  { name:"FBN",           type:"AFFILIATE",  channels:15, dept:"BU FBN" },
  { name:"CAP MEDIA",     type:"PRODUCTION", channels:14, dept:"BU Cap Media" },
  { name:"FUTURE NYNE",   type:"PRODUCTION", channels:11, dept:"BU Diligo" },
  { name:"XARO DIGITAL",  type:"OWNED",      channels:10, dept:"BU Xaro" },
  { name:"DLB",           type:"AFFILIATE",  channels:8,  dept:"BU FBN" },
  { name:"TDC",           type:"AFFILIATE",  channels:7,  dept:"BU FBN" },
  { name:"BG MUSIC GROUP",type:"AFFILIATE",  channels:6,  dept:"Stella Music" },
];

// ═══════════════════════════════════════════════════════════════════
// ─── DATA LINKAGE: CMS → Channel → Video (Foreign Key migration) ──
// Auto-add cmsId/channelId/partnerId/topicId for every entity on load.
// Re-runs cheaply on every state save → keeps relations healthy.
// ═══════════════════════════════════════════════════════════════════
function buildLookups(state) {
  const cmsList = state.cmsList || [];
  const partners = state.partners || [];
  const channels = state.channels || [];
  // Build name → id maps (case-insensitive)
  const cmsByName = new Map(cmsList.map(c => [String(c.name||"").toLowerCase(), c.id]));
  const partnerByName = new Map(partners.map(p => [String(p.name||"").toLowerCase(), p.id]));
  const topicByName = new Map((typeof KUDO_TOPICS !== "undefined" ? KUDO_TOPICS : []).map(t => [String(t.name||"").toLowerCase(), t.id]));
  const channelById = new Map(channels.map(c => [c.id, c]));
  const channelByYtId = new Map(channels.filter(c=>c.ytId).map(c => [c.ytId, c]));
  const channelByName = new Map(channels.map(c => [String(c.name||"").toLowerCase(), c]));
  return { cmsByName, partnerByName, topicByName, channelById, channelByYtId, channelByName };
}

function relinkChannel(ch, lookups) {
  const out = { ...ch };
  if (!out.cmsId && ch.cms) out.cmsId = lookups.cmsByName.get(String(ch.cms).toLowerCase()) || "";
  if (!out.partnerId && ch.partner) out.partnerId = lookups.partnerByName.get(String(ch.partner).toLowerCase()) || "";
  if (!out.topicId && ch.topic) out.topicId = lookups.topicByName.get(String(ch.topic).toLowerCase()) || "";
  return out;
}

function relinkVideo(v, lookups) {
  if (v.channelId && lookups.channelById.has(v.channelId)) return v;
  // Try ytId first, then channel name
  let ch = null;
  if (v.ytId) ch = lookups.channelByYtId.get(v.ytId);
  if (!ch && v.channelYtId) ch = lookups.channelByYtId.get(v.channelYtId);
  if (!ch && v.channel) ch = lookups.channelByName.get(String(v.channel).toLowerCase());
  if (!ch && v.channelName) ch = lookups.channelByName.get(String(v.channelName).toLowerCase());
  return ch ? { ...v, channelId: ch.id } : v;
}

function relinkViolation(viol, lookups) {
  if (viol.channelId && lookups.channelById.has(viol.channelId)) return viol;
  let ch = null;
  if (viol.channelName) ch = lookups.channelByName.get(String(viol.channelName).toLowerCase());
  if (!ch && viol.ytId) ch = lookups.channelByYtId.get(viol.ytId);
  return ch ? { ...viol, channelId: ch.id, cms: ch.cms || viol.cms } : viol;
}

// Returns a new state with all FKs healed
function migrateAndRelink(state) {
  if (!state || state._linkageVersion >= 2) return state;
  const out = { ...state };
  // Ensure cmsList exists
  if (!out.cmsList || !out.cmsList.length) out.cmsList = [...(typeof KUDO_CMS_LIST !== "undefined" ? KUDO_CMS_LIST : [])];
  if (!out.contracts) out.contracts = [];
  const lookups = buildLookups(out);
  // Relink channels
  out.channels = (out.channels || []).map(c => relinkChannel(c, lookups));
  // Rebuild lookups after channel relink (in case channels were enriched)
  const lk2 = buildLookups(out);
  // Relink videoAnalytics, partnerSharing, violations
  out.videoAnalytics = (out.videoAnalytics || []).map(v => relinkVideo(v, lk2));
  out.partnerSharing = (out.partnerSharing || []).map(s => relinkVideo(s, lk2));
  out.violations = (out.violations || []).map(v => relinkViolation(v, lk2));
  out._linkageVersion = 2;
  return out;
}

// Compute health score for orphans
function computeDataHealth(state) {
  const channels = state.channels || [];
  const videos = state.videoAnalytics || [];
  const violations = state.violations || [];
  const sharing = state.partnerSharing || [];
  const channelsWithCms = channels.filter(c => c.cmsId).length;
  const videosLinked = videos.filter(v => v.channelId).length;
  const sharingLinked = sharing.filter(s => s.channelId).length;
  const violationsLinked = violations.filter(v => v.channelId).length;
  const score = (() => {
    const parts = [];
    if (channels.length) parts.push(channelsWithCms / channels.length);
    if (videos.length) parts.push(videosLinked / videos.length);
    if (sharing.length) parts.push(sharingLinked / sharing.length);
    if (violations.length) parts.push(violationsLinked / violations.length);
    return parts.length ? Math.round(parts.reduce((a,b)=>a+b, 0) / parts.length * 100) : 100;
  })();
  return {
    score,
    channels: { total: channels.length, linked: channelsWithCms, orphan: channels.length - channelsWithCms },
    videos: { total: videos.length, linked: videosLinked, orphan: videos.length - videosLinked },
    sharing: { total: sharing.length, linked: sharingLinked, orphan: sharing.length - sharingLinked },
    violations: { total: violations.length, linked: violationsLinked, orphan: violations.length - violationsLinked },
  };
}

// ═══════════════════════════════════════════════════════════════════
// ─── RBAC: 9 ROLES + multi-role support + can() helper ────────────
// User có thể có nhiều roles: user.roles = ["QC_REVIEWER", "CHANNEL_CREATOR"]
// Backward compat: user.role giữ làm primary role
// ═══════════════════════════════════════════════════════════════════
const ROLES = {
  SUPER_ADMIN:        { label: "Super Admin", color: "red", desc: "Toàn quyền — duy nhất có thể wipe + manage users + API key" },
  ADMIN:              { label: "Admin", color: "ai", desc: "Toàn quyền nội dung trừ user management & wipe" },
  QC_REVIEWER:        { label: "QC Reviewer", color: "amber", desc: "Duyệt video xin cấp kênh — kiểm tra vi phạm trước khi cấp" },
  CHANNEL_CREATOR:    { label: "Channel Creator", color: "blue", desc: "Tạo CMS channel sau khi QC duyệt + gán cho partner" },
  CONTENT_MANAGER:    { label: "Content Manager", color: "blue", desc: "Quản lý kênh, video, duyệt — KHÔNG xem tài chính" },
  FINANCE_MANAGER:    { label: "Finance Manager", color: "green", desc: "HĐ + thanh toán + doanh thu — KHÔNG sửa kênh" },
  COMPLIANCE_MANAGER: { label: "Compliance Manager", color: "amber", desc: "Vi phạm + chính sách + audit định kỳ" },
  VIEWER:             { label: "Viewer", color: "gray", desc: "Chỉ xem" },
  PARTNER:            { label: "Partner (đối tác)", color: "amber", desc: "Đối tác bên ngoài — chỉ thấy data của họ" },
};

// ─── Submission Workflow State Machine ─────────────────────────────
const SUBMISSION_STATES = {
  DRAFT:                { label: "📝 Nháp", color: "gray", emoji: "📝", next: ["SUBMITTED"], owner: "PARTNER" },
  SUBMITTED:            { label: "📤 Đã gửi", color: "blue", emoji: "📤", next: ["QC_REVIEWING", "QC_REJECTED"], owner: "QC_REVIEWER" },
  QC_REVIEWING:         { label: "🔍 QC đang duyệt", color: "amber", emoji: "🔍", next: ["QC_APPROVED", "QC_REJECTED"], owner: "QC_REVIEWER" },
  QC_REJECTED:          { label: "❌ QC từ chối", color: "red", emoji: "❌", next: ["SUBMITTED"], owner: "PARTNER", terminal: false },
  QC_APPROVED:          { label: "✅ QC đã duyệt", color: "green", emoji: "✅", next: ["CHANNEL_PROVISIONING"], owner: "CHANNEL_CREATOR" },
  CHANNEL_PROVISIONING: { label: "🛠️ Đang cấp kênh", color: "blue", emoji: "🛠️", next: ["ACTIVE", "PROVISIONING_FAILED"], owner: "CHANNEL_CREATOR" },
  PROVISIONING_FAILED:  { label: "⚠️ Cấp kênh lỗi", color: "red", emoji: "⚠️", next: ["CHANNEL_PROVISIONING", "QC_REJECTED"], owner: "CHANNEL_CREATOR" },
  ACTIVE:               { label: "🟢 Đã cấp kênh", color: "green", emoji: "🟢", next: [], owner: null, terminal: true },
};

// Map legacy status → new state
function migrateSubmissionStatus(s) {
  if (s.workflowState) return s.workflowState; // already migrated
  if (s.status === "pending") return "SUBMITTED";
  if (s.status === "approved") return "ACTIVE";
  if (s.status === "rejected") return "QC_REJECTED";
  return "SUBMITTED";
}

// Check if a user can move a submission to nextState
function canAdvance(user, currentState, nextState) {
  if (!user || !currentState) return false;
  const stateInfo = SUBMISSION_STATES[currentState];
  if (!stateInfo) return false;
  if (!stateInfo.next.includes(nextState)) return false;
  // SUPER_ADMIN + ADMIN can always advance
  if (user.role === "SUPER_ADMIN" || user.role === "ADMIN") return true;
  // Owner role of the target state can advance
  const nextOwner = SUBMISSION_STATES[nextState]?.owner;
  if (nextOwner === user.role) return true;
  // Multi-role check
  if (user.roles?.includes?.(nextOwner)) return true;
  // Source owner can also advance (e.g., QC moves to QC_REVIEWING themselves)
  if (stateInfo.owner === user.role) return true;
  if (user.roles?.includes?.(stateInfo.owner)) return true;
  return false;
}

// Permission catalog: action → array of role names allowed
const PERMS = {
  // Channels
  "channels.read": ["SUPER_ADMIN","ADMIN","CONTENT_MANAGER","FINANCE_MANAGER","COMPLIANCE_MANAGER","CHANNEL_CREATOR","QC_REVIEWER","VIEWER"],
  "channels.create": ["SUPER_ADMIN","ADMIN","CONTENT_MANAGER","CHANNEL_CREATOR"],
  "channels.edit": ["SUPER_ADMIN","ADMIN","CONTENT_MANAGER","CHANNEL_CREATOR"],
  "channels.delete": ["SUPER_ADMIN","ADMIN"],
  "channels.bulk": ["SUPER_ADMIN","ADMIN","CONTENT_MANAGER"],
  // Partners
  "partners.read": ["SUPER_ADMIN","ADMIN","CONTENT_MANAGER","FINANCE_MANAGER","CHANNEL_CREATOR","VIEWER"],
  "partners.edit": ["SUPER_ADMIN","ADMIN","FINANCE_MANAGER"],
  "partners.delete": ["SUPER_ADMIN","ADMIN"],
  // Contracts
  "contracts.read": ["SUPER_ADMIN","ADMIN","FINANCE_MANAGER","VIEWER"],
  "contracts.edit": ["SUPER_ADMIN","ADMIN","FINANCE_MANAGER"],
  "contracts.delete": ["SUPER_ADMIN","ADMIN"],
  // CMS
  "cms.read": ["SUPER_ADMIN","ADMIN","CONTENT_MANAGER","FINANCE_MANAGER","CHANNEL_CREATOR","VIEWER"],
  "cms.edit": ["SUPER_ADMIN","ADMIN"],
  // Violations
  "violations.read": ["SUPER_ADMIN","ADMIN","COMPLIANCE_MANAGER","QC_REVIEWER","VIEWER"],
  "violations.edit": ["SUPER_ADMIN","ADMIN","COMPLIANCE_MANAGER","QC_REVIEWER"],
  "violations.delete": ["SUPER_ADMIN","ADMIN","COMPLIANCE_MANAGER"],
  // Video submissions
  "videos.qc_review": ["SUPER_ADMIN","ADMIN","QC_REVIEWER","COMPLIANCE_MANAGER"],
  "videos.provision_channel": ["SUPER_ADMIN","ADMIN","CHANNEL_CREATOR","CONTENT_MANAGER"],
  "videos.approve": ["SUPER_ADMIN","ADMIN","QC_REVIEWER","CONTENT_MANAGER","COMPLIANCE_MANAGER"], // legacy
  "videos.read": ["SUPER_ADMIN","ADMIN","CONTENT_MANAGER","COMPLIANCE_MANAGER","QC_REVIEWER","CHANNEL_CREATOR","VIEWER"],
  // Finance
  "finance.read": ["SUPER_ADMIN","ADMIN","FINANCE_MANAGER","VIEWER"],
  "finance.edit": ["SUPER_ADMIN","ADMIN","FINANCE_MANAGER"],
  // Users
  "users.read": ["SUPER_ADMIN"],
  "users.create": ["SUPER_ADMIN"],
  "users.edit": ["SUPER_ADMIN"],
  "users.delete": ["SUPER_ADMIN"],
  // Settings
  "settings.api_key": ["SUPER_ADMIN"],
  "settings.branding": ["SUPER_ADMIN","ADMIN"],
  "settings.automation": ["SUPER_ADMIN","ADMIN"],
  "settings.backup": ["SUPER_ADMIN"],
  // Dangerous
  "data.wipe": ["SUPER_ADMIN"],
  "data.import": ["SUPER_ADMIN","ADMIN","CONTENT_MANAGER"],
  // Audit
  "audit.read": ["SUPER_ADMIN","ADMIN"],
  // Decision Log
  "decisions.write": ["SUPER_ADMIN","ADMIN"],
  "decisions.read": ["SUPER_ADMIN","ADMIN","FINANCE_MANAGER","CONTENT_MANAGER","COMPLIANCE_MANAGER","VIEWER"],
};

// User can have multiple roles via user.roles[] OR primary user.role
function userRoles(user) {
  if (!user) return [];
  const roles = new Set();
  if (user.role) roles.add(user.role);
  if (Array.isArray(user.roles)) user.roles.forEach(r => roles.add(r));
  return [...roles];
}

function can(user, action) {
  if (!user) return false;
  const allowed = PERMS[action];
  if (!allowed) {
    console.warn(`[RBAC] Unknown action: "${action}" — defaulting to deny`);
    return false;
  }
  const myRoles = userRoles(user);
  return myRoles.some(r => allowed.includes(r));
}

// Helper for partner-scoped checks (e.g., partner can edit own channel)
function canScoped(user, action, resource) {
  if (can(user, action)) return true;
  if (user.role === "PARTNER") {
    if (action === "channels.edit" && (resource?.submittedBy === user.id || resource?.partnerEmail === user.email)) return true;
    if (action === "channels.read" && (resource?.submittedBy === user.id || resource?.partnerEmail === user.email)) return true;
  }
  return false;
}

// ─── i18n ─────────────────────────────────────────────────────────
const TRANSLATIONS = {
  vi: {
    // Auth
    login: "Đăng nhập", register: "Tạo tài khoản", email: "Email", password: "Mật khẩu",
    confirmPwd: "Xác nhận mật khẩu", fullName: "Họ và tên", logout: "Đăng xuất",
    loginBtn: "Đăng nhập", registerBtn: "Đăng ký", forgotPwd: "Quên mật khẩu?",
    haveAccount: "Đã có tài khoản?", noAccount: "Chưa có tài khoản?",
    welcomeBack: "Chào mừng trở lại", createAccount: "Tạo tài khoản mới",
    enterCreds: "Nhập thông tin đăng nhập của bạn", fillInfo: "Điền thông tin để tạo tài khoản",
    // Sidebar
    overview: "Tổng quan", dashboard: "Bảng điều khiển", partners: "Đối tác",
    channels: "Kênh", cms: "Tài khoản CMS", topics: "Chủ đề",
    finance: "Tài chính", reports: "Báo cáo", alerts: "Cảnh báo",
    aiAgent: "Trợ lý AI", compliance: "AI Compliance", settings: "Cài đặt",
    importData: "Nhập dữ liệu", manage: "Quản lý",
    // Common
    add: "Thêm", edit: "Sửa", delete: "Xóa", save: "Lưu", cancel: "Hủy",
    search: "Tìm kiếm", export: "Xuất", import: "Nhập", close: "Đóng",
    confirm: "Xác nhận", yes: "Có", no: "Không", required: "Bắt buộc",
    loading: "Đang tải...", processing: "Đang xử lý...", success: "Thành công",
    error: "Lỗi", warning: "Cảnh báo", info: "Thông tin", refresh: "Làm mới",
    next: "Tiếp theo", previous: "Trước", back: "Quay lại", continue: "Tiếp tục",
    // Status
    active: "Hoạt động", suspended: "Tạm dừng", pending: "Chờ xử lý",
    monetized: "Đang kiếm tiền", demonetized: "Đã tắt kiếm tiền", critical: "Khẩn cấp",
    healthy: "Tốt", warningSt: "Cảnh báo", failed: "Thất bại",
    // Branding
    branding: "Thương hiệu", appName: "Tên ứng dụng", primaryColor: "Màu chính",
    logo: "Logo", uploadLogo: "Tải lên logo", language: "Ngôn ngữ",
    // Greetings
    hi: "Chào", today: "Hôm nay", thisMonth: "Tháng này",
  },
  en: {
    login: "Login", register: "Register", email: "Email", password: "Password",
    confirmPwd: "Confirm Password", fullName: "Full Name", logout: "Logout",
    loginBtn: "Sign In", registerBtn: "Sign Up", forgotPwd: "Forgot password?",
    haveAccount: "Already have an account?", noAccount: "Don't have an account?",
    welcomeBack: "Welcome back", createAccount: "Create new account",
    enterCreds: "Enter your credentials", fillInfo: "Fill in to create account",
    overview: "Overview", dashboard: "Dashboard", partners: "Partners",
    channels: "Channels", cms: "CMS Accounts", topics: "Topics",
    finance: "Finance", reports: "Reports", alerts: "Alerts",
    aiAgent: "AI Agent", compliance: "AI Compliance", settings: "Settings",
    importData: "Import Data", manage: "Manage",
    add: "Add", edit: "Edit", delete: "Delete", save: "Save", cancel: "Cancel",
    search: "Search", export: "Export", import: "Import", close: "Close",
    confirm: "Confirm", yes: "Yes", no: "No", required: "Required",
    loading: "Loading...", processing: "Processing...", success: "Success",
    error: "Error", warning: "Warning", info: "Info", refresh: "Refresh",
    next: "Next", previous: "Previous", back: "Back", continue: "Continue",
    active: "Active", suspended: "Suspended", pending: "Pending",
    monetized: "Monetized", demonetized: "Demonetized", critical: "Critical",
    healthy: "Healthy", warningSt: "Warning", failed: "Failed",
    branding: "Branding", appName: "App Name", primaryColor: "Primary Color",
    logo: "Logo", uploadLogo: "Upload Logo", language: "Language",
    hi: "Hi", today: "Today", thisMonth: "This month",
  }
};

const LangContext = createContext({ lang:"vi", t:k=>k });
const useT = () => useContext(LangContext);

// ─── Theme tokens (with branding override) ────────────────────────
const baseTheme = {
  bg: "#FAF7F2", bgAlt: "#F3EFE7", card: "#FFFFFF",
  ink: "#0F1115", text: "#262C3D", muted: "#6B7280", mutedSoft: "#9CA3AF",
  border: "#E8E2D5", borderSoft: "#EFEAE0",
  accent: "#B8650C", accentSoft: "#F5E6D3",
  green: "#15803D", greenSoft: "#DCFCE7",
  red: "#B91C1C", redSoft: "#FEE2E2",
  amber: "#B45309", amberSoft: "#FEF3C7",
  blue: "#1E40AF", blueSoft: "#DBEAFE",
  ai: "#7C3AED", aiSoft: "#EDE9FE",
};
const ThemeContext = createContext(baseTheme);
const useC = () => useContext(ThemeContext);

// Generate softer variant from a hex color
function hexToSoft(hex) {
  if (!hex || hex.length < 7) return "#F5E6D3";
  const r = parseInt(hex.slice(1,3), 16);
  const g = parseInt(hex.slice(3,5), 16);
  const b = parseInt(hex.slice(5,7), 16);
  const lighten = (c) => Math.min(255, Math.round(c + (255-c)*0.85));
  return `#${lighten(r).toString(16).padStart(2,"0")}${lighten(g).toString(16).padStart(2,"0")}${lighten(b).toString(16).padStart(2,"0")}`;
}

// ─── localStorage Persistence ─────────────────────────────────────
const LS = {
  STATE: "meridian-v5-state",
  TAB: "meridian-v5-tab",
  AUTH: "meridian-v5-auth",
  USERS: "meridian-v5-users",
  BRAND: "meridian-v5-brand",
  LANG: "meridian-v5-lang",
  AUDIT: "meridian-v5-audit",
  LOGIN_ATTEMPTS: "meridian-v5-login-attempts",
};

const lsGet = (k, def=null) => {
  try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : def; }
  catch { return def; }
};
const lsSet = (k, v) => {
  try { localStorage.setItem(k, JSON.stringify(v)); scheduleBackendSync(k, v); return true; }
  catch(e) {
    if (e.name === "QuotaExceededError") {
      console.warn("localStorage full — promoting to IndexedDB:", k);
      idbSet(k, v).catch(err => console.error("IDB fallback failed:", err));
      scheduleBackendSync(k, v);
      return true;
    }
    console.error("Save failed:", e); return false;
  }
};
const lsDel = (k) => { localStorage.removeItem(k); };

// ─── Backend API sync (PostgreSQL via /api) ──────────────────────────
// Keys that are browser-local and should NOT be pushed to the backend:
// (security: API keys must not leave the browser; auth/login state is per-device)
const _SYNC_SKIP = new Set([
  "meridian-v5-auth",
  "meridian-v5-login-attempts",
  "meridian-v5-tab",
  "meridian-api-key",            // Claude API key — per-user secret, never sync
  "meridian-v51-yt-api-key",      // YouTube API key
  "meridian-v51-folder-name",
]);
const _syncQueue = new Map();
let   _syncTimer = null;

// Build auth headers — include backend API token
// Priority: 1) user-configured (Settings) → 2) build-time embedded (window.__MERIDIAN_API_TOKEN)
// Embedded token allows ALL users (including PARTNER) to sync without manual setup.
function backendAuthHeaders() {
  let token = "";
  try {
    const stored = localStorage.getItem("meridian-backend-token");
    if (stored) token = JSON.parse(stored) || "";
  } catch {}
  if (!token && typeof window !== "undefined" && window.__MERIDIAN_API_TOKEN) {
    token = window.__MERIDIAN_API_TOKEN;
  }
  return token ? { "X-Meridian-Token": token } : {};
}

// Global sync status — observable by UI components
const _syncStatus = { state: "idle", lastSync: null, lastError: null, pending: 0 };
const _syncListeners = new Set();
function setSyncStatus(patch) {
  Object.assign(_syncStatus, patch);
  _syncListeners.forEach(fn => fn({ ..._syncStatus }));
}
function subscribeSyncStatus(fn) {
  _syncListeners.add(fn);
  return () => _syncListeners.delete(fn);
}
function getSyncStatus() { return { ..._syncStatus }; }

function scheduleBackendSync(key, value) {
  if (_SYNC_SKIP.has(key)) return;
  _syncQueue.set(key, value);
  setSyncStatus({ pending: _syncQueue.size });
  clearTimeout(_syncTimer);
  _syncTimer = setTimeout(async () => {
    const items = [..._syncQueue.entries()].map(([k, v]) => ({ key: k, value: v }));
    _syncQueue.clear();
    setSyncStatus({ state: "syncing", pending: 0 });
    try {
      const r = await fetch("/api/store/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...backendAuthHeaders() },
        body: JSON.stringify({ items }),
      });
      if (r.status === 401) {
        console.warn("[backend-sync] Unauthorized — set token in Settings → Tích hợp → Backend Token");
        setSyncStatus({ state: "error", lastError: "Unauthorized — token sai hoặc thiếu" });
        items.forEach(it => _syncQueue.set(it.key, it.value));
      } else if (r.ok) {
        setSyncStatus({ state: "synced", lastSync: Date.now(), lastError: null });
      } else {
        setSyncStatus({ state: "error", lastError: `HTTP ${r.status}` });
        items.forEach(it => _syncQueue.set(it.key, it.value));
      }
    } catch (e) {
      setSyncStatus({ state: "offline", lastError: e.message });
      items.forEach(it => _syncQueue.set(it.key, it.value));
    }
  }, 1500); // 1.5s debounce
}

async function apiFetch(key) {
  try {
    const r = await fetch(`/api/store/${encodeURIComponent(key)}`, {
      headers: { ...backendAuthHeaders() }
    });
    if (!r.ok) return null;
    const { value } = await r.json();
    return value ?? null;
  } catch { return null; }
}

// ═══════════════════════════════════════════════════════════════════
// v5.1: AI CACHE + INDEXEDDB + COMPRESSION + AUTOMATION INFRASTRUCTURE
// ═══════════════════════════════════════════════════════════════════

// ─── SHA-256 (WebCrypto) — for cache keys + file hash + password ────
async function sha256(text) {
  const enc = new TextEncoder().encode(typeof text === "string" ? text : JSON.stringify(text));
  const buf = await crypto.subtle.digest("SHA-256", enc);
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2,"0")).join("");
}
async function sha256Buffer(arrayBuffer) {
  const buf = await crypto.subtle.digest("SHA-256", arrayBuffer);
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2,"0")).join("");
}

// ─── PBKDF2 password hash (replaces homemade hash, backward compat) ──
async function hashPwdStrong(pwd) {
  try {
    const salt = new TextEncoder().encode("meridian-v51-salt-kudo-2026");
    const keyMat = await crypto.subtle.importKey(
      "raw", new TextEncoder().encode(pwd), { name:"PBKDF2" }, false, ["deriveBits"]
    );
    const bits = await crypto.subtle.deriveBits(
      { name:"PBKDF2", salt, iterations:100000, hash:"SHA-256" }, keyMat, 256
    );
    return "pbkdf2$" + Array.from(new Uint8Array(bits)).map(b => b.toString(16).padStart(2,"0")).join("");
  } catch(e) {
    console.warn("PBKDF2 unavailable, falling back to legacy hash");
    return null;
  }
}

// ─── LZString compression (auto-loaded from CDN) ────────────────────
async function loadLZ() {
  if (typeof window !== "undefined" && window.LZString) return window.LZString;
  if (typeof window !== "undefined" && window.__lzLoading) return window.__lzLoading;
  window.__lzLoading = new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = "https://cdn.jsdelivr.net/npm/lz-string@1.5.0/libs/lz-string.min.js";
    s.onload = () => resolve(window.LZString);
    s.onerror = () => reject(new Error("Không tải được lz-string"));
    document.head.appendChild(s);
    setTimeout(() => reject(new Error("LZ-String timeout")), 12000);
  });
  return window.__lzLoading;
}

// ─── IndexedDB layer (no Dexie — use raw IDB) ───────────────────────
const IDB_NAME = "meridian-v51";
const IDB_VERSION = 1;
const IDB_STORES = ["kv", "ai_cache", "big_data", "import_history"];

let _idbPromise = null;
function openIdb() {
  if (_idbPromise) return _idbPromise;
  _idbPromise = new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") return reject(new Error("IndexedDB not available"));
    const req = indexedDB.open(IDB_NAME, IDB_VERSION);
    req.onerror = () => reject(req.error);
    req.onsuccess = () => resolve(req.result);
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      IDB_STORES.forEach(s => {
        if (!db.objectStoreNames.contains(s)) db.createObjectStore(s);
      });
    };
  });
  return _idbPromise;
}

async function idbGet(key, store = "kv") {
  try {
    const db = await openIdb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(store, "readonly");
      const req = tx.objectStore(store).get(key);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
  } catch { return null; }
}

async function idbSet(key, value, store = "kv") {
  try {
    const db = await openIdb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(store, "readwrite");
      tx.objectStore(store).put(value, key);
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => reject(tx.error);
    });
  } catch(e) { console.error("idbSet:", e); return false; }
}

async function idbDel(key, store = "kv") {
  try {
    const db = await openIdb();
    return new Promise((resolve) => {
      const tx = db.transaction(store, "readwrite");
      tx.objectStore(store).delete(key);
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => resolve(false);
    });
  } catch { return false; }
}

async function idbAll(store = "kv") {
  try {
    const db = await openIdb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(store, "readonly");
      const req = tx.objectStore(store).getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  } catch { return []; }
}

async function idbCount(store = "kv") {
  try {
    const db = await openIdb();
    return new Promise((resolve) => {
      const tx = db.transaction(store, "readonly");
      const req = tx.objectStore(store).count();
      req.onsuccess = () => resolve(req.result || 0);
      req.onerror = () => resolve(0);
    });
  } catch { return 0; }
}

async function idbClear(store = "kv") {
  try {
    const db = await openIdb();
    return new Promise((resolve) => {
      const tx = db.transaction(store, "readwrite");
      tx.objectStore(store).clear();
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => resolve(false);
    });
  } catch { return false; }
}

// ─── AI CACHE: 3-tier (memory + IDB + TTL) ──────────────────────────
const _aiMemCache = new Map();
const AI_CACHE_STATS = { hits: 0, misses: 0, savedTokens: 0, savedCost: 0 };

async function aiCacheGet(key) {
  if (_aiMemCache.has(key)) {
    AI_CACHE_STATS.hits++;
    return _aiMemCache.get(key);
  }
  const entry = await idbGet(key, "ai_cache");
  if (entry && entry.expires > Date.now()) {
    _aiMemCache.set(key, entry.value);
    AI_CACHE_STATS.hits++;
    return entry.value;
  }
  AI_CACHE_STATS.misses++;
  return null;
}

async function aiCacheSet(key, value, ttlMs = 24*3600*1000, meta = {}) {
  _aiMemCache.set(key, value);
  await idbSet(key, { value, expires: Date.now() + ttlMs, created: Date.now(), ...meta }, "ai_cache");
  AI_CACHE_STATS.savedTokens += meta.tokens || 0;
  AI_CACHE_STATS.savedCost += meta.cost || 0;
}

async function aiCacheClear() {
  _aiMemCache.clear();
  await idbClear("ai_cache");
  AI_CACHE_STATS.hits = 0;
  AI_CACHE_STATS.misses = 0;
  AI_CACHE_STATS.savedTokens = 0;
  AI_CACHE_STATS.savedCost = 0;
}

// Sonnet 4 pricing (May 2026): $3/$15 per 1M tokens
function estimateCost(inputTokens, outputTokens) {
  return (inputTokens * 3 / 1_000_000) + (outputTokens * 15 / 1_000_000);
}

// ─── Cross-tab sync (BroadcastChannel) ──────────────────────────────
const BC_NAME = "meridian-v51-sync";
let _bc = null;
function getBC() {
  if (_bc) return _bc;
  if (typeof BroadcastChannel === "undefined") return null;
  _bc = new BroadcastChannel(BC_NAME);
  return _bc;
}

function bcEmit(type, data) {
  try { getBC()?.postMessage({ type, data, t: Date.now() }); } catch {}
}

// ─── File System Access API (auto-import folder) ────────────────────
async function pickFolder() {
  if (!("showDirectoryPicker" in window)) {
    throw new Error("Trình duyệt chưa hỗ trợ File System Access API. Hãy dùng Chrome/Edge mới nhất.");
  }
  return await window.showDirectoryPicker({ mode: "read" });
}

async function* iterateFiles(dirHandle) {
  for await (const entry of dirHandle.values()) {
    if (entry.kind === "file") yield entry;
    else if (entry.kind === "directory") yield* iterateFiles(entry);
  }
}

async function getFolderHandle() {
  return await idbGet("folder-handle", "kv");
}

async function setFolderHandle(handle) {
  return await idbSet("folder-handle", handle, "kv");
}

async function verifyPermission(handle, mode = "read") {
  const opts = { mode };
  if ((await handle.queryPermission(opts)) === "granted") return true;
  if ((await handle.requestPermission(opts)) === "granted") return true;
  return false;
}

// ─── Webhook dispatcher (Telegram/Slack/Discord/custom) ─────────────
async function sendWebhook(config, payload) {
  if (!config?.url) return { ok: false, error: "No webhook URL" };
  try {
    let body, headers = { "Content-Type": "application/json" };
    if (config.type === "telegram") {
      // payload is a string message; config.url should be Bot API endpoint, config.chatId set
      body = JSON.stringify({ chat_id: config.chatId, text: payload, parse_mode: "Markdown" });
    } else if (config.type === "slack" || config.type === "discord") {
      body = JSON.stringify({ text: payload, content: payload });
    } else {
      body = JSON.stringify({ text: payload, source: "Meridian MCN v5.1", timestamp: Date.now() });
    }
    const res = await fetch(config.url, { method: "POST", headers, body });
    return { ok: res.ok, status: res.status };
  } catch(e) {
    return { ok: false, error: e.message };
  }
}

// ─── YouTube Data API v3 helper ─────────────────────────────────────
async function ytFetchChannelStats(apiKey, channelIds) {
  if (!apiKey || !channelIds?.length) return [];
  const results = [];
  // Batch up to 50 channels per call
  for (let i = 0; i < channelIds.length; i += 50) {
    const batch = channelIds.slice(i, i + 50);
    const url = `https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics,status&id=${batch.join(",")}&key=${apiKey}`;
    try {
      const res = await fetch(url);
      if (!res.ok) continue;
      const data = await res.json();
      results.push(...(data.items || []));
    } catch(e) {
      console.warn("YT fetch failed:", e);
    }
  }
  return results;
}

// ─── Google Drive backup (lightweight: open Drive picker for upload) ─
function downloadBackup(state, filename) {
  const data = JSON.stringify(state, null, 2);
  const blob = new Blob([data], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename || `meridian-backup-${new Date().toISOString().slice(0,10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

// Open Google Drive in new tab pre-targeted to upload (user drops the downloaded file)
function openDriveUpload() {
  window.open("https://drive.google.com/drive/my-drive", "_blank");
}

// ─── Compute data hash for AI cache invalidation ────────────────────
async function computeStateHash(state) {
  const slim = {
    cn: state.channels?.length || 0,
    pn: state.partners?.length || 0,
    vn: state.violations?.length || 0,
    ip: state.productInspections?.length || 0,
    rev: state.channels?.reduce((s,c)=>s+(c.monthlyRevenue||0),0) || 0,
    views: state.channels?.reduce((s,c)=>s+(c.monthlyViews||0),0) || 0,
    demon: state.channels?.filter(c=>c.monetization==="Demonetized").length || 0,
  };
  return await sha256(slim);
}

// ─── Date bucket for caching by day ─────────────────────────────────
function dayBucket() { return new Date().toISOString().slice(0,10); }
function hourBucket() { return new Date().toISOString().slice(0,13); }

// ─── Constants ────────────────────────────────────────────────────
const VIOLATION_TYPES = [
  { id:"COPYRIGHT_MUSIC", label:"Copyright (Nhạc)" },
  { id:"COPYRIGHT_VIDEO", label:"Copyright (Video)" },
  { id:"COMMUNITY_GUIDELINES", label:"Community Guidelines" },
  { id:"MISLEADING_CONTENT", label:"Nội dung gây hiểu lầm" },
  { id:"SPAM_DECEPTIVE", label:"Spam / Lừa đảo" },
  { id:"DEMONETIZED", label:"Tắt kiếm tiền" },
  { id:"MONETIZATION_REJECTED", label:"Từ chối bật kiếm tiền" },
  { id:"SUSPENDED", label:"Tạm khóa kênh" },
  { id:"TERMINATED", label:"Chấm dứt kênh" },
];

const YT_POLICIES = [
  { category:"Bản quyền", title:"Bản quyền âm nhạc",
    rules:["Chỉ dùng nhạc có license thương mại","Nhạc YouTube Audio Library được phép","Cover phải có license từ chủ sở hữu","Sample beat có thể bị Content ID flag"],
    penalty:"3 strikes = chấm dứt kênh trong 7 ngày" },
  { category:"Bản quyền", title:"Bản quyền video",
    rules:["Không re-upload video người khác","Reaction phải biến đổi đáng kể","Trích đoạn ngắn có thể fair use","Phải credit nguồn rõ ràng"],
    penalty:"Strike đầu = mất monetization 30 ngày" },
  { category:"Trẻ em (COPPA)", title:"Nội dung dành cho trẻ em",
    rules:["Phải đánh dấu 'Made for Kids' đúng","Không thu thập data trẻ em","Không personalized ads cho video kids","Tắt comment cho video trẻ em"],
    penalty:"FTC phạt $42K/video vi phạm" },
  { category:"Monetization", title:"Yêu cầu YPP (YouTube Partner Program)",
    rules:["Tối thiểu 1000 subscribers","4000 watch hours trong 12 tháng","Không có active strikes","Tuân thủ AdSense policy"],
    penalty:"Bị remove khỏi YPP, apply lại sau 6 tháng" },
  { category:"Brainrot/AI Content", title:"Nội dung AI và Brainrot",
    rules:["AI content phải có disclosure","Brainrot thường bị demonetize","Skibidi/Brainrot có rủi ro cao","Cần kiểm định nội dung trước upload"],
    penalty:"Demonetize hàng loạt, ảnh hưởng kênh" },
];

// ─── Helpers ──────────────────────────────────────────────────────
const fmt = n => !n ? "0" : n>=1e9?(n/1e9).toFixed(2)+"B":n>=1e6?(n/1e6).toFixed(2)+"M":n>=1e3?(n/1e3).toFixed(1)+"K":Math.round(n).toString();
const fmtMoney = n => "$"+(n||0).toLocaleString("en-US",{maximumFractionDigits:0});
const fmtFull = n => (n||0).toLocaleString("en-US");
const fmtVN = n => (n||0).toLocaleString("vi-VN");

// Stronger hash for offline app: 1000 rounds + salt
function hashPwd(s) {
  const salt = "meridian-v5-salt-2026";
  let combined = salt + s + salt;
  let h1 = 5381, h2 = 0;
  for (let round = 0; round < 1000; round++) {
    for (let i = 0; i < combined.length; i++) {
      const ch = combined.charCodeAt(i);
      h1 = ((h1 << 5) + h1) + ch;
      h2 = (h2 * 31 + ch) | 0;
    }
    combined = (h1 >>> 0).toString(36) + "_" + (h2 >>> 0).toString(36) + s;
  }
  return (h1 >>> 0).toString(36) + "_" + (h2 >>> 0).toString(36) + "_" + s.length;
}

// Audit log entry
function logActivity(action, userId, details = "") {
  try {
    const log = lsGet(LS.AUDIT, []);
    log.unshift({
      id: `LOG${Date.now()}_${Math.random().toString(36).slice(2,7)}`,
      action, userId, details,
      timestamp: new Date().toISOString(),
      ip: "local",
    });
    lsSet(LS.AUDIT, log.slice(0, 500)); // keep last 500
  } catch(e) { console.warn("Audit log failed:", e); }
}

let _seed = 42;
const rng = () => { _seed = (_seed * 9301 + 49297) % 233280; return _seed / 233280; };
const randInt = (a, b) => Math.floor(rng() * (b - a + 1)) + a;
const pick = (arr) => arr[Math.floor(rng() * arr.length)];

// ─── Initial data using REAL KUDO structure ───────────────────────
function makeInitialChannels() {
  _seed = 1234;
  const channels = [];
  // Use real CMS distribution
  KUDO_CMS_LIST.forEach(cms => {
    const channelCount = Math.max(5, Math.round(cms.viewsM * 0.4));
    for (let i = 0; i < channelCount; i++) {
      const topic = pick(KUDO_TOPICS.filter(t=>t.cms===cms.name)) || pick(KUDO_TOPICS);
      const subs = randInt(5000, 2000000);
      const views = Math.floor(subs * (0.5 + rng() * 2));
      const rev = Math.floor(views * (0.0008 + rng() * 0.003));
      const monStatus = rng() > 0.85 ? "Demonetized" : rng() > 0.95 ? "Suspended" : "Monetized";
      channels.push({
        id: `C${String(channels.length+1).padStart(5,"0")}`,
        ytId: `UC${Math.random().toString(36).substr(2,12).toUpperCase()}`,
        name: `${pick(["Tana","Lisa","Mimi","Cara","BHive","BisKids","Funz","Dili","Mocha","Mellow"])} ${pick(["Toys","Music","Vibes","ASMR","World","Bricks","Studio","Cooking","Show"])} ${randInt(1,99)}`,
        cms: cms.name,
        topic: topic.name,
        topicId: topic.id,
        partner: pick(KUDO_PARTNERS).name,
        dept: topic.dept,
        category: topic.name,
        country: pick(["VN","US","ID","TH","JP","BR"]),
        subscribers: subs,
        monthlyViews: views,
        monthlyRevenue: rev,
        monetization: monStatus,
        health: monStatus === "Demonetized" ? "Critical" : monStatus === "Suspended" ? "Critical" : rng() > 0.8 ? "Warning" : "Healthy",
        strikes: monStatus === "Demonetized" ? randInt(1,3) : 0,
        syncStatus: rng() > 0.9 ? "Failed" : "Synced",
        status: monStatus === "Suspended" ? "Suspended" : "Active",
        lastSync: randInt(1, 48),
        joinedDate: new Date(2024 + Math.floor(rng()*2), Math.floor(rng()*12), Math.floor(rng()*28)+1).toISOString().slice(0,10),
      });
    }
  });
  return channels;
}

function makePartners() {
  return KUDO_PARTNERS.map((p, i) => ({
    id: `P${String(i+1).padStart(4,"0")}`,
    name: p.name,
    type: p.type,
    tier: p.channels >= 30 ? "Premium" : p.channels >= 15 ? "Standard" : "Basic",
    revShare: p.type === "OWNED" ? 100 : p.type === "PRODUCTION" ? randInt(70,80) : randInt(55,65),
    email: `contact@${p.name.toLowerCase().replace(/\s/g,"")}.com`,
    country: "VN",
    status: "Active",
    dept: p.dept,
    channels: 0,
    monthlyRev: 0,
  }));
}

function makeDailyStats() {
  // ⚠️ DEPRECATED — kept for backward compat. Now returns empty array.
  // Real time-series is computed from state.partnerSharing + state.videoAnalytics
  // via aggregateDailyRevenue() helper.
  return [];
}

// ═══════════════════════════════════════════════════════════════════
// ─── ANOMALY DETECTION + RISK SCORING (rule-based, no AI cost) ────
// ═══════════════════════════════════════════════════════════════════
function detectAnomalies(state) {
  const anomalies = [];
  const channels = state.channels || [];
  const sharing = state.partnerSharing || [];
  const violations = state.violations || [];
  const now = Date.now();
  const day = 86400000;

  // Helper: aggregate revenue for a channel over a date range
  const channelRevInRange = (chId, fromTs, toTs) => {
    return sharing
      .filter(s => (s.channelId === chId) && s.date)
      .filter(s => {
        const t = new Date(s.date).getTime();
        return t >= fromTs && t <= toTs;
      })
      .reduce((a,b) => a + Number(b.revenue||0), 0);
  };

  channels.forEach(ch => {
    // 1️⃣ REVENUE DROP — last 30d vs prev 30-60d
    const last30Rev = channelRevInRange(ch.id, now - 30*day, now);
    const prev30Rev = channelRevInRange(ch.id, now - 60*day, now - 30*day);
    if (prev30Rev > 50 && last30Rev < prev30Rev * 0.7) {
      const dropPct = Math.round((prev30Rev - last30Rev) / prev30Rev * 100);
      anomalies.push({
        id: `anom-rev-${ch.id}`,
        type: "REVENUE_DROP",
        severity: dropPct >= 50 ? "high" : "medium",
        channelId: ch.id,
        channelName: ch.name,
        title: `📉 ${ch.name}: doanh thu giảm ${dropPct}%`,
        description: `30 ngày qua: $${last30Rev.toFixed(0)} vs 30-60 ngày trước: $${prev30Rev.toFixed(0)}`,
        metric: "revenue",
        change: -dropPct,
        action: "Kiểm tra nội dung tháng qua, content-id claim, demonetization status",
      });
    }

    // 2️⃣ VIOLATION SURGE — 3+ vi phạm trong 30 ngày
    const recentVi = violations.filter(v =>
      (v.channelId === ch.id || v.channelName === ch.name) &&
      v.date && new Date(v.date).getTime() > now - 30*day
    );
    if (recentVi.length >= 3) {
      anomalies.push({
        id: `anom-vi-${ch.id}`,
        type: "VIOLATION_SURGE",
        severity: recentVi.length >= 5 ? "high" : "medium",
        channelId: ch.id,
        channelName: ch.name,
        title: `⚠️ ${ch.name}: ${recentVi.length} vi phạm 30 ngày qua`,
        description: recentVi.map(v => v.typeLabel||v.type).slice(0,3).join(", "),
        metric: "violations",
        change: recentVi.length,
        action: "Pause uploads, review content guidelines với partner, training",
      });
    }

    // 3️⃣ DEMONETIZED + STRIKES (high-risk combination)
    if (ch.monetization === "Demonetized" && (ch.strikes||0) >= 1) {
      anomalies.push({
        id: `anom-demo-${ch.id}`,
        type: "DEMONETIZED_WITH_STRIKES",
        severity: "high",
        channelId: ch.id,
        channelName: ch.name,
        title: `🚨 ${ch.name}: Demonetized + ${ch.strikes} strike(s)`,
        description: "Nguy cơ termination cao",
        metric: "monetization",
        action: "Liên hệ YT support, plan recovery hoặc consider termination",
      });
    }

    // 4️⃣ ZERO REVENUE for established channel
    if ((ch.subscribers||0) > 5000 && (ch.monthlyRevenue||0) === 0 && ch.monetization !== "Pending") {
      anomalies.push({
        id: `anom-zero-${ch.id}`,
        type: "ZERO_REVENUE",
        severity: "medium",
        channelId: ch.id,
        channelName: ch.name,
        title: `💸 ${ch.name}: 0 doanh thu (${fmt(ch.subscribers)} subs)`,
        description: "Kênh có audience nhưng không kiếm được",
        metric: "revenue",
        action: "Check monetization eligibility, ad placement, content quality",
      });
    }
  });

  // 5️⃣ TOPIC-LEVEL: high demonetization rate
  const topicAgg = new Map();
  channels.forEach(ch => {
    if (!ch.topic) return;
    if (!topicAgg.has(ch.topic)) topicAgg.set(ch.topic, { name: ch.topic, channels: 0, revenue: 0, demonetized: 0, violations: 0 });
    const t = topicAgg.get(ch.topic);
    t.channels++;
    t.revenue += Number(ch.monthlyRevenue)||0;
    if (ch.monetization === "Demonetized") t.demonetized++;
    t.violations += violations.filter(v => v.channelId === ch.id).length;
  });
  topicAgg.forEach(t => {
    if (t.channels >= 3 && t.demonetized / t.channels >= 0.5) {
      anomalies.push({
        id: `anom-topic-demo-${t.name}`,
        type: "TOPIC_HIGH_RISK",
        severity: "high",
        topic: t.name,
        title: `🏷️ Topic "${t.name}": ${Math.round(t.demonetized/t.channels*100)}% kênh demonetized`,
        description: `${t.demonetized}/${t.channels} kênh — pattern xấu, đề xuất review hoặc drop topic`,
        metric: "topic",
        action: `Xem xét DROP topic này hoặc thay đổi content strategy`,
      });
    }
    // Topic underperforming (rev/channel quá thấp)
    if (t.channels >= 5 && t.revenue / t.channels < 100) {
      anomalies.push({
        id: `anom-topic-low-${t.name}`,
        type: "TOPIC_LOW_PERF",
        severity: "medium",
        topic: t.name,
        title: `📊 Topic "${t.name}": doanh thu trung bình thấp`,
        description: `$${Math.round(t.revenue/t.channels)}/kênh từ ${t.channels} kênh — cần đánh giá`,
        metric: "topic",
        action: "So sánh với top topic, cân nhắc redirect resource",
      });
    }
  });

  // Sort by severity
  return anomalies.sort((a,b) => {
    const s = u => u === "high" ? 3 : u === "medium" ? 2 : 1;
    return s(b.severity) - s(a.severity);
  });
}

// Risk score per channel (0-100, higher = riskier)
function computeChannelRiskScore(ch, state) {
  let score = 0;
  const violations = (state.violations || []).filter(v => v.channelId === ch.id || v.channelName === ch.name);
  // Strikes weight
  score += (ch.strikes || 0) * 25;
  // Recent violations
  const recentVi = violations.filter(v => v.date && (Date.now() - new Date(v.date).getTime()) < 30*86400000);
  score += recentVi.length * 10;
  // Monetization status
  if (ch.monetization === "Demonetized") score += 30;
  if (ch.monetization === "Suspended") score += 50;
  // Health
  if (ch.health === "Critical") score += 20;
  else if (ch.health === "Warning") score += 10;
  return Math.min(100, score);
}

// Topic strategic recommendation
function computeTopicStrategy(state) {
  const channels = state.channels || [];
  const violations = state.violations || [];
  const sharing = state.partnerSharing || [];
  const map = new Map();
  channels.forEach(ch => {
    if (!ch.topic) return;
    if (!map.has(ch.topic)) map.set(ch.topic, { name: ch.topic, channels:[], revenue:0, demonetized:0, violations:0 });
    const t = map.get(ch.topic);
    t.channels.push(ch);
    t.revenue += Number(ch.monthlyRevenue)||0;
    if (ch.monetization === "Demonetized") t.demonetized++;
    t.violations += violations.filter(v => v.channelId === ch.id).length;
  });

  return [...map.values()].map(t => {
    const channelCount = t.channels.length;
    const demoRate = channelCount > 0 ? t.demonetized / channelCount : 0;
    const avgRev = channelCount > 0 ? t.revenue / channelCount : 0;
    const violRate = channelCount > 0 ? t.violations / channelCount : 0;
    // Score: higher = better strategic position
    let strategyScore = 50;
    strategyScore += Math.min(30, avgRev / 100); // up to +30 from revenue
    strategyScore -= demoRate * 40; // up to -40 from demo rate
    strategyScore -= Math.min(20, violRate * 5); // up to -20 from violations
    let recommendation = "HOLD";
    let reasonShort = "";
    if (strategyScore >= 70) { recommendation = "EXPAND"; reasonShort = "Doanh thu cao, ít rủi ro"; }
    else if (strategyScore <= 30) { recommendation = "DROP"; reasonShort = "Hiệu suất thấp + rủi ro cao"; }
    else if (demoRate > 0.4) { recommendation = "REVIEW"; reasonShort = "Demonetization rate cao, cần điều tra"; }
    else { recommendation = "HOLD"; reasonShort = "Ổn định, theo dõi tiếp"; }
    return {
      name: t.name,
      channels: channelCount,
      revenue: t.revenue,
      avgRev,
      demonetized: t.demonetized,
      demoRate,
      violations: t.violations,
      violRate,
      strategyScore: Math.round(strategyScore),
      recommendation,
      reasonShort,
    };
  }).sort((a,b) => b.strategyScore - a.strategyScore);
}

// ─── Real data aggregator: tổng doanh thu/views theo ngày từ state thật ───
// Returns: [{ date: "MM-DD", revenue, views, count }] sorted asc
function aggregateDailyRevenue(state, days = 30) {
  const now = Date.now();
  const dayMs = 86400000;
  const fromTs = now - days * dayMs;
  const byDay = new Map();

  // Initialize last N days with zeros
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now - i * dayMs);
    const key = d.toISOString().slice(5,10);
    byDay.set(key, { date: key, revenue: 0, views: 0, count: 0 });
  }

  const addRow = (dateStr, rev, views) => {
    if (!dateStr) return;
    const t = new Date(dateStr).getTime();
    if (isNaN(t) || t < fromTs || t > now) return;
    const key = new Date(t).toISOString().slice(5,10);
    if (!byDay.has(key)) byDay.set(key, { date: key, revenue: 0, views: 0, count: 0 });
    const e = byDay.get(key);
    e.revenue += Number(rev) || 0;
    e.views += Number(views) || 0;
    e.count++;
  };

  (state.partnerSharing || []).forEach(s => addRow(s.date || s.month, s.revenue, s.views));
  (state.videoAnalytics || []).forEach(v => addRow(v.date || v.publishedAt || v.month, v.revenue, v.views));

  return [...byDay.values()].sort((a,b) => a.date.localeCompare(b.date));
}

// ─── CMS Daily Snapshots ──────────────────────────────────────────
// Build a snapshot row for each CMS at TODAY's date, derived from current state
function computeCmsSnapshot(state, dateStr = null) {
  const cmsList = state.cmsList || KUDO_CMS_LIST;
  const channels = state.channels || [];
  const violations = state.violations || [];
  const today = dateStr || new Date().toISOString().slice(0, 10);

  return cmsList.map(cms => {
    const chs = channels.filter(c => c.cms === cms.name);
    const monetized = chs.filter(c => c.monetization === "Monetized").length;
    const demonetized = chs.filter(c => c.monetization === "Demonetized").length;
    const suspended = chs.filter(c => c.monetization === "Suspended").length;
    const active = chs.filter(c => c.status === "Active").length;
    const totalRev = chs.reduce((s, c) => s + (Number(c.monthlyRevenue) || 0), 0);
    const totalViews = chs.reduce((s, c) => s + (Number(c.monthlyViews) || 0), 0);
    const totalSubs = chs.reduce((s, c) => s + (Number(c.subscribers) || 0), 0);
    const cmsViols = violations.filter(v => v.cms === cms.name).length;
    const topicsSet = new Set(chs.map(c => c.topic).filter(Boolean));
    const partnersSet = new Set(chs.map(c => c.partner).filter(Boolean));
    const healthScore = chs.length ? Math.round((1 - demonetized / chs.length) * 100) : 100;

    return {
      cms_id: cms.id,
      cms_name: cms.name,
      snapshot_date: today,
      currency: cms.currency || "USD",
      revenue: Number(totalRev.toFixed(2)),
      views: totalViews,
      channels: chs.length,
      active_channels: active,
      monetized, demonetized, suspended,
      subscribers: totalSubs,
      violations: cmsViols,
      health_score: healthScore,
      topics: topicsSet.size,
      partners: partnersSet.size,
      source: "auto",
      notes: null,
    };
  });
}

// Push today's CMS snapshot to backend (idempotent — upsert by cms_id+date)
async function pushCmsDailySnapshot(state, source = "auto") {
  try {
    const items = computeCmsSnapshot(state).map(it => ({ ...it, source }));
    if (!items.length) return { ok: false, count: 0 };
    const r = await fetch("/api/cms-daily/bulk", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...backendAuthHeaders() },
      body: JSON.stringify({ items }),
    });
    if (!r.ok) return { ok: false, count: 0, error: `HTTP ${r.status}` };
    const data = await r.json();
    return { ok: true, count: data.count || items.length };
  } catch (e) {
    return { ok: false, count: 0, error: e.message };
  }
}

// Fetch CMS history from backend
async function fetchCmsHistory({ cmsId = null, days = 30, from = null, to = null } = {}) {
  try {
    const params = new URLSearchParams();
    if (cmsId) params.set("cmsId", cmsId);
    if (days && !from && !to) params.set("days", String(days));
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    const r = await fetch(`/api/cms-daily?${params.toString()}`, { headers: { ...backendAuthHeaders() } });
    if (!r.ok) return { items: [], error: `HTTP ${r.status}` };
    const data = await r.json();
    return { items: data.items || [], count: data.count || 0 };
  } catch (e) {
    return { items: [], error: e.message };
  }
}

// Compute variation: today vs N days ago, returns { current, previous, delta, deltaPct }
function computeVariation(history, field = "revenue", daysAgo = 7) {
  if (!history || history.length === 0) return { current: 0, previous: 0, delta: 0, deltaPct: 0 };
  const sorted = [...history].sort((a, b) => (a.snapshot_date || "").localeCompare(b.snapshot_date || ""));
  const latest = sorted[sorted.length - 1];
  const current = Number(latest[field]) || 0;

  const targetDate = new Date(Date.now() - daysAgo * 86400000).toISOString().slice(0, 10);
  // Find closest snapshot at or before targetDate
  const previousRow = [...sorted].reverse().find(r => r.snapshot_date <= targetDate) || sorted[0];
  const previous = Number(previousRow[field]) || 0;
  const delta = current - previous;
  const deltaPct = previous > 0 ? (delta / previous) * 100 : 0;
  return { current, previous, delta, deltaPct, currentDate: latest.snapshot_date, previousDate: previousRow.snapshot_date };
}

// Aggregate revenue grouped by currency (separate USD, VND, CAD, etc.)
function aggregateByCurrency(state) {
  const cmsList = state.cmsList || [];
  const cmsByName = new Map(cmsList.map(c => [c.name, c]));
  const groups = new Map(); // currency → { revenue, channels[], partners[] }
  (state.channels || []).forEach(c => {
    const cms = cmsByName.get(c.cms);
    const currency = c.currency || cms?.currency || "USD";
    if (!groups.has(currency)) groups.set(currency, { currency, revenue: 0, views: 0, channels: 0, partnerSet: new Set() });
    const g = groups.get(currency);
    g.revenue += Number(c.monthlyRevenue) || 0;
    g.views += Number(c.monthlyViews) || 0;
    g.channels++;
    if (c.partner) g.partnerSet.add(c.partner);
  });
  return [...groups.values()].map(g => ({
    currency: g.currency,
    revenue: g.revenue,
    views: g.views,
    channels: g.channels,
    partners: g.partnerSet.size,
  })).sort((a,b) => b.revenue - a.revenue);
}

function makeViolations(channels) {
  _seed = 77;
  return channels.filter(c=>c.strikes>0||rng()>0.92).slice(0,30).map((c, i) => ({
    id: `V${String(i+1).padStart(5,"0")}`,
    channelId: c.id,
    channelName: c.name,
    cms: c.cms,
    type: pick(VIOLATION_TYPES).id,
    typeLabel: pick(VIOLATION_TYPES).label,
    videoTitle: `Video ${randInt(100,999)} - ${pick(["Music Mix","Story","Compilation","Tutorial","Brainrot","Roblox"])}`,
    date: new Date(Date.now() - randInt(7, 365)*86400000).toISOString().slice(0,10),
    status: pick(["Active","Resolved","Appealed"]),
    severity: rng() > 0.6 ? "High" : "Medium",
    notes: pick(["Đã xử lý","Đang chờ phản hồi","Đã kháng cáo","Cần review"]),
  }));
}
// ─── Claude API v5.1 — cache + prompt caching + retry + streaming ──
// Default model — user có thể đổi trong Settings → Tích hợp → Claude Model
const DEFAULT_CLAUDE_MODEL = "claude-sonnet-4-5";
function getClaudeModel() {
  return lsGet("meridian-claude-model", DEFAULT_CLAUDE_MODEL) || DEFAULT_CLAUDE_MODEL;
}
// Available Claude models (cập nhật khi Anthropic release model mới)
const CLAUDE_MODELS = [
  { id: "claude-sonnet-4-5", label: "Claude Sonnet 4.5 (Khuyến nghị)", desc: "Nhanh, chất lượng cao, $3/$15 per 1M tokens" },
  { id: "claude-opus-4-1", label: "Claude Opus 4.1", desc: "Thông minh nhất, đắt hơn $15/$75 per 1M tokens" },
  { id: "claude-haiku-4-5", label: "Claude Haiku 4.5", desc: "Nhanh nhất, rẻ nhất $1/$5 per 1M tokens" },
  { id: "claude-3-5-sonnet-20241022", label: "Claude 3.5 Sonnet (legacy)", desc: "Phiên bản cũ ổn định" },
  { id: "claude-3-5-haiku-20241022", label: "Claude 3.5 Haiku (legacy)", desc: "Nhẹ nhất, dùng khi tiết kiệm" },
];
const DEFAULT_SYSTEM = `Bạn là AI Analyst cho hệ thống MCN Meridian. Trả lời tiếng Việt, ngắn gọn, có số liệu, có hành động cụ thể.`;

// KUDO knowledge that rarely changes — eligible for prompt caching (90% off)
function buildKudoContext() {
  return `KIẾN THỨC CỐ ĐỊNH VỀ KUDO NETWORK (8 CMS, ${KUDO_TOPICS.length} chủ đề, ${KUDO_PARTNERS.length} đối tác):

CMS LIST:
${KUDO_CMS_LIST.map(c => `- ${c.name} (${c.id}, ${c.currency}): T2/26 $${c.revFeb}, T3/26 $${c.revMar}, ${c.viewsM}M views`).join("\n")}

TOPIC LIST:
${KUDO_TOPICS.map(t => `- ${t.name} (${t.id}): ${t.cms} | ${t.dept} | ${t.channels} kênh`).join("\n")}

PARTNER LIST:
${KUDO_PARTNERS.map(p => `- ${p.name} [${p.type}]: ${p.channels} kênh, ${p.dept}`).join("\n")}

CHÍNH SÁCH YOUTUBE QUAN TRỌNG:
${YT_POLICIES.map(p => `- ${p.title} (${p.category}): ${p.rules.slice(0,2).join("; ")}. PHẠT: ${p.penalty}`).join("\n")}`;
}

// ─── Local AI fallback: Chrome window.ai (Gemini Nano) ─────────────
async function tryBrowserAI(messages, system = "") {
  try {
    const ai = (typeof self !== "undefined" && self.ai) || (typeof globalThis !== "undefined" && globalThis.ai) || null;
    if (!ai?.languageModel) return null;
    let cap;
    try { cap = await ai.languageModel.capabilities(); } catch { cap = null; }
    if (cap && cap.available !== "readily" && cap.available !== "after-download") return null;
    const session = await ai.languageModel.create({
      systemPrompt: (system || "Bạn là trợ lý phân tích MCN bằng tiếng Việt, ngắn gọn có số liệu.").slice(0, 1500),
      temperature: 0.3,
    });
    const userMsg = (messages[messages.length - 1]?.content || "").slice(0, 6000);
    const result = await session.prompt(userMsg);
    try { session.destroy(); } catch {}
    return result;
  } catch (e) {
    console.warn("Browser AI unavailable:", e.message);
    return null;
  }
}

// ─── Smart rule-based analyzer (no AI needed) ──────────────────────
function ruleBasedAnalysis(userPrompt) {
  const numbers = (userPrompt.match(/\$[\d,\.]+|\d+%|\d{1,3}(?:[,\.]\d{3})+|\d+/g) || []).slice(0, 10);
  const hasGrowth = /(tăng|giảm|growth|%)/i.test(userPrompt);
  const hasCMS = /CMS|kênh|channel|topic/i.test(userPrompt);
  return `📊 PHÂN TÍCH NHANH (rule-based — không cần API)

🔢 Các số liệu phát hiện trong prompt:
${numbers.length ? numbers.slice(0,8).map(n => `  • ${n}`).join("\n") : "  • Chưa rút trích được số liệu cụ thể"}

💡 Khuyến nghị chung:
${hasGrowth ? "  • Có dấu hiệu tăng/giảm — cần so sánh tháng trước và bóc tách nguyên nhân (views, RPM, demonetization).\n" : ""}${hasCMS ? "  • Tập trung vào top 3 CMS sinh doanh thu cao nhất, kiểm tra demonetization rate.\n" : ""}  • Kiểm tra lịch sử vi phạm 30 ngày để phòng ngừa.
  • So sánh với các chu kỳ tương tự (cùng kỳ năm trước, cùng quý).

⚠️ Đây là phân tích tự động không có AI. Để có phân tích chuyên sâu, vào **Cài đặt → Tích hợp → Claude API Key**.`;
}

async function callClaude(messages, system = "", apiKey = "", opts = {}) {
  const key = apiKey || (typeof window !== "undefined" ? window.MERIDIAN_API_KEY : "") || "";
  if (!key) {
    // Try Chrome's built-in AI first (free, no API key)
    const local = await tryBrowserAI(messages, system);
    if (local) {
      return `🌐 [Browser AI · Gemini Nano · MIỄN PHÍ]

${local}

---
💡 Để có phân tích chuyên sâu hơn, dán Claude API key vào **Cài đặt → Tích hợp**.`;
    }
    // Fallback: rule-based summary
    const rb = ruleBasedAnalysis(messages[messages.length - 1]?.content || "");
    return `${rb}

---
**Để bật AI thật:**
• **Tùy chọn 1 — Claude API ($5 credit free):** Cài đặt → Tích hợp → dán key. Lấy tại https://console.anthropic.com
• **Tùy chọn 2 — Browser AI miễn phí:** Dùng Chrome 127+, mở chrome://flags → bật **"Optimization Guide On Device Model"** + **"Prompt API for Gemini Nano"** → restart Chrome.`;
  }

  const {
    cacheKey = null,        // if set, result is cached
    ttlMs = 24*3600*1000,   // 24h default
    onChunk = null,          // streaming callback
    skipCache = false,
    maxTokens = 2000,
    maxRetries = 2,
    stopAfter = 60000,       // 60s timeout
  } = opts;

  // Cache lookup
  if (cacheKey && !skipCache) {
    const hit = await aiCacheGet(cacheKey);
    if (hit) {
      if (onChunk) onChunk(hit, true);
      return hit;
    }
  }

  // Use prompt caching: split system into static (KUDO) + dynamic
  const kudoCtx = buildKudoContext();
  const staticSystem = (system || DEFAULT_SYSTEM) + "\n\n" + kudoCtx;
  const systemArr = [
    { type: "text", text: staticSystem, cache_control: { type: "ephemeral" } }
  ];

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), stopAfter);

      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        signal: ctrl.signal,
        headers: {
          "Content-Type": "application/json",
          "x-api-key": key,
          "anthropic-version": "2023-06-01",
          "anthropic-beta": "prompt-caching-2024-07-31",
          "anthropic-dangerous-direct-browser-access": "true",
        },
        body: JSON.stringify({
          model: opts.model || getClaudeModel(),
          max_tokens: maxTokens,
          system: systemArr,
          stream: !!onChunk,
          messages,
        }),
      });
      clearTimeout(timer);

      if (!res.ok) {
        const err = await res.text();
        if (res.status === 401) return "❌ API key không hợp lệ. Kiểm tra lại key trong Cài đặt → Tích hợp.";
        if (res.status === 404) {
          // Most likely model name issue
          const currentModel = opts.model || getClaudeModel();
          return `❌ Model "${currentModel}" không tồn tại trên Anthropic API.\n\n**Cách fix:**\n• Vào Cài đặt → Tích hợp → Claude Model → chọn model khác\n• Khuyến nghị: claude-sonnet-4-5 (mặc định)\n• Hoặc xem model mới tại: https://docs.anthropic.com/en/docs/about-claude/models\n\nDetail: ${err.slice(0,200)}`;
        }
        if (res.status === 429) {
          if (attempt < maxRetries) {
            await new Promise(r => setTimeout(r, 2000 * (attempt + 1)));
            continue;
          }
          return "⏳ Đã vượt rate limit. Đợi 1 phút rồi thử lại.";
        }
        if (res.status === 529) {
          if (attempt < maxRetries) {
            await new Promise(r => setTimeout(r, 1500 * (attempt + 1)));
            continue;
          }
          return "⏳ Anthropic đang quá tải. Hãy thử lại sau ít phút.";
        }
        if (res.status === 400) return `❌ Lỗi yêu cầu: ${err.slice(0,200)}`;
        return `❌ Lỗi API (${res.status}): ${err.slice(0,200)}`;
      }

      let fullText = "";
      let usage = { input_tokens: 0, output_tokens: 0, cache_read_input_tokens: 0 };

      if (onChunk) {
        // Parse SSE stream
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buf = "";
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          buf += decoder.decode(value, { stream: true });
          const lines = buf.split("\n");
          buf = lines.pop();
          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            try {
              const evt = JSON.parse(line.slice(6));
              if (evt.type === "content_block_delta" && evt.delta?.text) {
                fullText += evt.delta.text;
                onChunk(fullText, false);
              } else if (evt.type === "message_delta" && evt.usage) {
                Object.assign(usage, evt.usage);
              } else if (evt.type === "message_start" && evt.message?.usage) {
                Object.assign(usage, evt.message.usage);
              }
            } catch {}
          }
        }
      } else {
        const data = await res.json();
        fullText = data.content?.[0]?.text || "AI không trả về nội dung.";
        if (data.usage) usage = data.usage;
      }

      const cost = estimateCost(usage.input_tokens || 0, usage.output_tokens || 0);
      if (cacheKey) {
        await aiCacheSet(cacheKey, fullText, ttlMs, {
          tokens: (usage.input_tokens || 0) + (usage.output_tokens || 0),
          cost,
          cacheHit: usage.cache_read_input_tokens > 0,
        });
      }
      if (onChunk) onChunk(fullText, true);
      return fullText;
    } catch(e) {
      if (e.name === "AbortError") return "⏳ Timeout — AI mất hơn 60s. Thử lại với prompt ngắn hơn.";
      if (attempt < maxRetries) {
        await new Promise(r => setTimeout(r, 1000 * (attempt + 1)));
        continue;
      }
      return `❌ Lỗi kết nối: ${e.message}\n\nKiểm tra:\n• Mạng internet\n• Trình duyệt có chặn fetch không\n• API key có còn quota không`;
    }
  }
  return "❌ Đã thử nhiều lần nhưng không thành công.";
}

// ─── Toast notification system ────────────────────────────────────
const ToastCtx = createContext(()=>{});
const useToast = () => useContext(ToastCtx);

function ToastContainer({ toasts }) {
  const C = useC();
  return (
    <div style={{position:"fixed",bottom:20,right:20,zIndex:2000,display:"flex",flexDirection:"column",gap:8}}>
      {toasts.map(t => {
        const colors = {
          success: { bg:C.greenSoft, fg:C.green, icon:Check },
          error: { bg:C.redSoft, fg:C.red, icon:X },
          warning: { bg:C.amberSoft, fg:C.amber, icon:AlertTriangle },
          info: { bg:C.blueSoft, fg:C.blue, icon:Info },
        };
        const { bg, fg, icon:Icon } = colors[t.type] || colors.info;
        return (
          <div key={t.id} style={{display:"flex",alignItems:"center",gap:10,padding:"10px 14px",
            background:C.card,border:`1px solid ${fg}33`,borderLeft:`3px solid ${fg}`,
            borderRadius:6,boxShadow:"0 4px 12px rgba(0,0,0,0.08)",minWidth:280,maxWidth:420,
            animation:"slideIn 0.25s ease-out"}}>
            <div style={{width:22,height:22,background:bg,borderRadius:"50%",
              display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
              <Icon size={12} style={{color:fg}}/>
            </div>
            <span style={{fontSize:12,color:C.text,flex:1,whiteSpace:"pre-wrap"}}>{t.msg}</span>
          </div>
        );
      })}
    </div>
  );
}

// ─── Confirm dialog ───────────────────────────────────────────────
function ConfirmDialog({ open, title, message, onConfirm, onCancel, danger }) {
  const C = useC();
  if (!open) return null;
  return (
    <div style={{position:"fixed",inset:0,background:"rgba(15,17,21,0.55)",zIndex:1500,
      display:"flex",alignItems:"center",justifyContent:"center"}}>
      <div style={{background:C.card,borderRadius:8,width:380,padding:22,boxShadow:"0 20px 60px rgba(0,0,0,0.25)"}}>
        <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:10}}>
          <div style={{width:32,height:32,background:danger?C.redSoft:C.amberSoft,
            borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center"}}>
            <AlertTriangle size={16} style={{color:danger?C.red:C.amber}}/>
          </div>
          <span style={{fontFamily:"'Fraunces',serif",fontWeight:500,fontSize:15,color:C.ink}}>{title}</span>
        </div>
        <p style={{fontSize:12,color:C.text,lineHeight:1.6,marginBottom:18}}>{message}</p>
        <div style={{display:"flex",justifyContent:"flex-end",gap:8}}>
          <button onClick={onCancel} style={{fontSize:12,padding:"7px 14px",background:C.bgAlt,
            border:`1px solid ${C.border}`,borderRadius:4,cursor:"pointer",color:C.text}}>Hủy</button>
          <button onClick={onConfirm} style={{fontSize:12,fontWeight:500,padding:"7px 14px",
            background:danger?C.red:C.accent,color:"#FFF",border:"none",borderRadius:4,cursor:"pointer"}}>
            {danger?"Xác nhận xóa":"Xác nhận"}
          </button>
        </div>
      </div>
    </div>
  );
}

function useConfirm() {
  const [state, setState] = useState({ open:false });
  const confirm = useCallback((opts) => new Promise(resolve => {
    setState({
      open:true, ...opts,
      onConfirm: () => { setState({open:false}); resolve(true); },
      onCancel: () => { setState({open:false}); resolve(false); },
    });
  }), []);
  return [state, confirm];
}

// ─── Reusable UI ──────────────────────────────────────────────────
const Pill = ({ children, color="gray", size="sm" }) => {
  const C = useC();
  const map = { green:[C.greenSoft,C.green], red:[C.redSoft,C.red], amber:[C.amberSoft,C.amber],
    blue:[C.blueSoft,C.blue], accent:[C.accentSoft,C.accent], gray:["#F3F4F6","#374151"], ai:[C.aiSoft,C.ai] };
  const [bg,fg] = map[color]||map.gray;
  return <span style={{display:"inline-flex",alignItems:"center",fontWeight:500,letterSpacing:"0.04em",
    textTransform:"uppercase",background:bg,color:fg,borderRadius:"4px",
    fontSize:size==="sm"?"10px":"11px",padding:size==="sm"?"2px 7px":"3px 9px"}}>{children}</span>;
};

const StatusDot = ({ status }) => {
  const C = useC();
  const map = {Active:C.green,Healthy:C.green,Synced:C.green,Resolved:C.green,Monetized:C.green,
    Pending:C.amber,Warning:C.amber,Appealed:C.amber,
    Failed:C.red,Critical:C.red,Suspended:C.red,Demonetized:C.red,Terminated:C.red};
  return <span style={{display:"inline-flex",alignItems:"center",gap:"6px"}}>
    <span style={{width:6,height:6,borderRadius:"50%",background:map[status]||C.muted,display:"inline-block"}}/>
    <span style={{color:C.text}}>{status}</span>
  </span>;
};

// ═══════════════════════════════════════════════════════════════════
// ─── VIOLATION ALERT TEMPLATES — pre-defined for common scenarios
// ═══════════════════════════════════════════════════════════════════
const VIOLATION_ALERT_TEMPLATES = [
  {
    id: "copyright-music",
    label: "🎵 Copyright bản quyền nhạc",
    severity: "warning",
    issueType: "COPYRIGHT_CLAIM",
    title: "Phát hiện vi phạm bản quyền nhạc",
    description: "Video của bạn dùng track nhạc không có license hợp lệ. Content ID đã claim → revenue chuyển về bên claim.",
    requiredAction: "1. Mute audio track có vi phạm HOẶC thay bằng music free từ YouTube Audio Library\n2. Re-upload phiên bản đã sửa\n3. Cung cấp license file (nếu mua) cho MCN review",
    deadlineDays: 7,
  },
  {
    id: "misleading-thumbnail",
    label: "🖼️ Thumbnail clickbait/misleading",
    severity: "warning",
    issueType: "MISLEADING",
    title: "Thumbnail vi phạm chính sách clickbait",
    description: "Thumbnail có nội dung clickbait/misleading không reflecting thực tế video → vi phạm Advertiser-friendly content guideline.",
    requiredAction: "1. Đổi thumbnail không gây hiểu lầm\n2. Đảm bảo nội dung thumbnail xuất hiện trong video\n3. Re-upload thumbnail mới + comment confirm với MCN",
    deadlineDays: 3,
  },
  {
    id: "made-for-kids",
    label: "👶 Made for Kids classification sai",
    severity: "critical",
    issueType: "POLICY_VIOLATION",
    title: "Vi phạm Made for Kids classification",
    description: "Kênh có content cho trẻ em nhưng không tick 'Made for Kids' hoặc ngược lại. Vi phạm có thể bị FTC/COPPA fine.",
    requiredAction: "1. Vào YT Studio → Settings → Channel → Audience → set 'Yes, set this channel as made for kids'\n2. Bulk update tất cả video cũ về Made for Kids correctly\n3. Confirm hoàn tất với MCN qua reply",
    deadlineDays: 2,
  },
  {
    id: "community-guidelines",
    label: "🛡️ Vi phạm Community Guidelines",
    severity: "critical",
    issueType: "POLICY_VIOLATION",
    title: "Phát hiện vi phạm Community Guidelines",
    description: "Video chứa nội dung vi phạm: hate speech / harassment / nudity / dangerous acts / misinformation.",
    requiredAction: "1. Xóa video ngay lập tức\n2. Review lại toàn bộ content guidelines: youtube.com/howyoutubeworks/policies\n3. Training với team về Community Guidelines\n4. Báo cáo lại MCN sau khi xử lý",
    deadlineDays: 1,
  },
  {
    id: "demonetization-warning",
    label: "💰 Demonetization risk",
    severity: "warning",
    issueType: "DEMONETIZED",
    title: "Kênh có nguy cơ demonetization",
    description: "Phát hiện pattern nội dung gần ranh giới Advertiser-friendly. Yellow icons xuất hiện liên tục → reach giảm + revenue mất.",
    requiredAction: "1. Review lại nội dung 30 ngày qua, tránh: profanity / violence / controversial topics\n2. Self-certify checkbox đầy đủ trước upload\n3. Áp dụng age restriction nếu cần (vẫn kiếm tiền hạn chế)\n4. Báo lại MCN content strategy mới",
    deadlineDays: 14,
  },
  {
    id: "strike-risk",
    label: "⚠️ Nguy cơ strike",
    severity: "critical",
    issueType: "STRIKE_RISK",
    title: "Cảnh báo nguy cơ Strike sắp xảy ra",
    description: "Phát hiện content có rủi ro nhận Community Strike từ YouTube. 3 strikes trong 90 ngày = kênh bị terminate.",
    requiredAction: "1. PAUSE upload mới ngay lập tức\n2. Audit toàn bộ video 30 ngày qua, gỡ bỏ video rủi ro\n3. Schedule call với MCN để consult strategy\n4. Áp dụng pre-publish review từ MCN trong 30 ngày",
    deadlineDays: 1,
  },
];

// Contract terms templates — common boilerplate
const CONTRACT_TERMS_TEMPLATES = [
  {
    id: "owned-channel",
    label: "📺 Kênh do MCN sở hữu",
    text: `1. MCN sở hữu 100% kênh, content, branding
2. Partner cung cấp dịch vụ sản xuất content theo yêu cầu
3. Rev share: MCN 70% / Partner 30% sau YouTube cut
4. Partner không được sử dụng content ngoài thoả thuận
5. Hết hợp đồng: kênh + content thuộc về MCN
6. Confidentiality: 5 năm sau termination`,
  },
  {
    id: "partnership-50-50",
    label: "🤝 Partnership 50/50",
    text: `1. Partner sở hữu kênh, MCN cung cấp dịch vụ network
2. Rev share: 50/50 sau YouTube cut
3. MCN hỗ trợ: monetization, copyright protection, analytics
4. Partner: phụ trách content + upload + community
5. Renewable hàng năm
6. Termination: 60 ngày notice trước, settle pending payouts`,
  },
  {
    id: "content-licensing",
    label: "📜 Content Licensing",
    text: `1. Partner license content cho MCN trong khu vực: VN/SEA
2. Exclusive license trong 12 tháng
3. Revenue: MCN trả flat fee + 30% rev share
4. Content Quality requirements: HD min, original, no copyright
5. Partner giữ ownership, MCN chỉ có usage rights
6. Renewal: optional, mutually agreed`,
  },
  {
    id: "production-only",
    label: "🎬 Production-only contract",
    text: `1. Partner chỉ sản xuất content, MCN sở hữu hoàn toàn
2. Fee per video: based on length + quality tier
3. Exclusive: Partner không sản xuất cho competitor 6 tháng
4. Quality SLA: A-tier 80%, B-tier 15%, C-tier 5% max
5. Revisions: 2 rounds free, additional charged
6. Payment: 50% advance, 50% on delivery`,
  },
];

// ═══════════════════════════════════════════════════════════════════
// ─── COMMENTS THREAD — reusable comments component with @mention ──
// Stored in state.comments[] indexed by (entityType, entityId)
// ═══════════════════════════════════════════════════════════════════
function CommentsThread({ state, setState, currentUser, entityType, entityId, label = "💬 Thảo luận" }) {
  const C = useC();
  const [text, setText] = useState("");
  const [showMentions, setShowMentions] = useState(false);
  const [mentionQuery, setMentionQuery] = useState("");
  const inputRef = useRef(null);

  const allComments = state.comments || [];
  const myComments = allComments.filter(c => c.entityType === entityType && c.entityId === entityId)
    .sort((a,b) => (a.ts||"").localeCompare(b.ts||""));

  const allUsers = lsGet(LS.USERS, []);

  const detectMentions = (str) => {
    const matches = str.match(/@\w+/g) || [];
    return matches.map(m => m.slice(1));
  };

  const submit = () => {
    if (!text.trim()) return;
    const mentions = detectMentions(text);
    const mentionedUsers = mentions.map(m =>
      allUsers.find(u => u.email?.toLowerCase().includes(m.toLowerCase()) || u.fullName?.toLowerCase().includes(m.toLowerCase()))
    ).filter(Boolean).map(u => ({ id: u.id, email: u.email, name: u.fullName }));

    const newComment = {
      id: `CM${Date.now()}`,
      entityType, entityId,
      text: text.trim(),
      by: currentUser.id,
      byEmail: currentUser.email,
      byName: currentUser.fullName,
      byRole: currentUser.role,
      ts: new Date().toISOString(),
      mentions: mentionedUsers,
    };
    setState(s => ({ ...s, comments: [...(s.comments||[]), newComment] }));
    setText("");
  };

  const handleInput = (e) => {
    const val = e.target.value;
    setText(val);
    // Detect @ for autocomplete
    const cursor = e.target.selectionStart;
    const before = val.slice(0, cursor);
    const match = before.match(/@(\w*)$/);
    if (match) {
      setMentionQuery(match[1].toLowerCase());
      setShowMentions(true);
    } else {
      setShowMentions(false);
    }
  };

  const insertMention = (user) => {
    const cursor = inputRef.current?.selectionStart || text.length;
    const before = text.slice(0, cursor).replace(/@\w*$/, `@${user.email.split("@")[0]} `);
    const after = text.slice(cursor);
    setText(before + after);
    setShowMentions(false);
    inputRef.current?.focus();
  };

  const filteredUsers = mentionQuery.length === 0 ? allUsers.slice(0, 5) :
    allUsers.filter(u => u.email?.toLowerCase().includes(mentionQuery) || u.fullName?.toLowerCase().includes(mentionQuery)).slice(0, 5);

  const renderText = (str) => {
    // Replace @mentions with bold spans
    return str.split(/(@\w+)/g).map((part, i) => {
      if (part.startsWith("@")) {
        return <span key={i} style={{color:C.accent,fontWeight:500}}>{part}</span>;
      }
      return part;
    });
  };

  return (
    <div style={{padding:12,background:C.bgAlt,borderRadius:5,marginTop:10}}>
      <div style={{fontSize:11,fontWeight:500,color:C.ink,marginBottom:10,display:"flex",alignItems:"center",gap:6}}>
        {label} <span style={{fontSize:9,color:C.muted}}>({myComments.length})</span>
      </div>

      {myComments.length === 0 ? (
        <div style={{padding:14,textAlign:"center",color:C.muted,fontSize:11,fontStyle:"italic"}}>
          Chưa có thảo luận nào — bắt đầu cuộc trao đổi
        </div>
      ) : (
        <div style={{maxHeight:280,overflowY:"auto",marginBottom:10}}>
          {myComments.map(c => (
            <div key={c.id} style={{padding:"8px 10px",marginBottom:6,background:C.card,borderRadius:5,borderLeft:`2px solid ${c.byRole==="PARTNER"?C.amber:c.byRole?.includes("ADMIN")?C.red:C.accent}`}}>
              <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:3,flexWrap:"wrap"}}>
                <span style={{fontSize:11,fontWeight:500,color:C.ink}}>{c.byName||c.byEmail}</span>
                <Pill color={c.byRole==="PARTNER"?"amber":c.byRole?.includes("ADMIN")?"red":"blue"} size="sm">{c.byRole}</Pill>
                <span style={{fontSize:9,color:C.muted,marginLeft:"auto"}}>{new Date(c.ts).toLocaleString("vi-VN",{hour12:false})}</span>
              </div>
              <div style={{fontSize:11,color:C.text,lineHeight:1.5,whiteSpace:"pre-wrap"}}>{renderText(c.text)}</div>
              {c.mentions?.length > 0 && (
                <div style={{marginTop:4,fontSize:9,color:C.muted}}>
                  📌 Mentioned: {c.mentions.map(m => m.name||m.email).join(", ")}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Input area with @mention autocomplete */}
      <div style={{position:"relative"}}>
        <div style={{display:"flex",gap:6,alignItems:"flex-end"}}>
          <textarea ref={inputRef} value={text} onChange={handleInput}
            onKeyDown={e=>{ if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) { e.preventDefault(); submit(); } }}
            placeholder="Viết comment... (Ctrl+Enter để gửi, gõ @ để mention user)"
            style={{flex:1,minHeight:50,padding:"6px 9px",fontSize:11,fontFamily:"inherit",border:`1px solid ${C.border}`,borderRadius:4,resize:"vertical"}}/>
          <Btn primary onClick={submit} disabled={!text.trim()} icon={Send}>Gửi</Btn>
        </div>

        {/* Mention dropdown */}
        {showMentions && filteredUsers.length > 0 && (
          <div style={{position:"absolute",bottom:60,left:0,background:C.card,border:`1px solid ${C.border}`,borderRadius:4,boxShadow:"0 4px 12px rgba(0,0,0,0.1)",zIndex:50,minWidth:240}}>
            {filteredUsers.map(u => (
              <button key={u.id} onClick={()=>insertMention(u)}
                style={{display:"block",width:"100%",padding:"8px 12px",border:"none",background:"transparent",cursor:"pointer",textAlign:"left",borderBottom:`1px solid ${C.borderSoft}`}}
                onMouseEnter={e=>e.currentTarget.style.background=C.bgAlt}
                onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                <div style={{fontSize:11,color:C.ink,fontWeight:500}}>{u.fullName}</div>
                <div style={{fontSize:9,color:C.muted}}>{u.email} · {u.role}</div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── useDebounce hook — for search inputs (avoid re-filter on every keystroke)
function useDebounce(value, delay = 250) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

// ─── SafeMarkdown — XSS-safe replacement for dangerouslySetInnerHTML
// Escapes ALL HTML, then re-applies whitelisted formatting (bold, italic, links).
// Supports: **bold**, *italic*, `code`, [text](url), \n line breaks
function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, m => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m]));
}

// Parse bold/italic/code in a single line, return React fragments (safe)
function parseInline(line) {
  if (!line) return [<span key="s">&nbsp;</span>];
  const parts = [];
  let remaining = line;
  let i = 0;
  // Patterns ordered by specificity
  const patterns = [
    { regex: /^\*\*([^*]+)\*\*/, render: (m) => <strong key={i++}>{m[1]}</strong> },
    { regex: /^\*([^*]+)\*/, render: (m) => <em key={i++}>{m[1]}</em> },
    { regex: /^`([^`]+)`/, render: (m) => <code key={i++} style={{padding:"1px 4px",background:"rgba(0,0,0,0.06)",borderRadius:3,fontSize:"0.92em"}}>{m[1]}</code> },
    { regex: /^\[([^\]]+)\]\(([^)]+)\)/, render: (m) => {
      // Only allow http(s) URLs
      const url = m[2].startsWith("http://") || m[2].startsWith("https://") ? m[2] : "#";
      return <a key={i++} href={url} target="_blank" rel="noopener noreferrer" style={{color:"inherit",textDecoration:"underline"}}>{m[1]}</a>;
    }},
  ];
  while (remaining.length > 0) {
    let matched = false;
    for (const p of patterns) {
      const m = remaining.match(p.regex);
      if (m) {
        parts.push(p.render(m));
        remaining = remaining.slice(m[0].length);
        matched = true;
        break;
      }
    }
    if (!matched) {
      // Take next char as plain text
      const nextSpecial = remaining.search(/[\*`\[]/);
      const chunk = nextSpecial === -1 ? remaining : remaining.slice(0, nextSpecial || 1);
      parts.push(chunk);
      remaining = nextSpecial === -1 ? "" : remaining.slice(chunk.length || 1);
    }
  }
  return parts;
}

const SafeMarkdown = ({ text, style = {} }) => {
  if (!text) return null;
  const lines = String(text).split("\n");
  return (
    <div style={style}>
      {lines.map((line, idx) => (
        <div key={idx} style={{marginBottom: line === "" ? 6 : 2, minHeight: 16}}>
          {line === "" ? <span>&nbsp;</span> : parseInline(line)}
        </div>
      ))}
    </div>
  );
};

// ─── SyncStatusBadge — shows realtime backend sync state ──────────────
function SyncStatusBadge({ compact = false }) {
  const C = useC();
  const [status, setStatus] = useState(getSyncStatus());
  useEffect(() => subscribeSyncStatus(setStatus), []);

  const map = {
    idle:    { color: C.muted,  emoji: "⚪", label: "Sẵn sàng" },
    syncing: { color: C.amber,  emoji: "🟡", label: "Đang sync..." },
    synced:  { color: C.green,  emoji: "🟢", label: "Đã đồng bộ" },
    error:   { color: C.red,    emoji: "🔴", label: "Lỗi sync" },
    offline: { color: C.muted,  emoji: "⚫", label: "Offline" },
  };
  const info = map[status.state] || map.idle;
  const ago = status.lastSync ? Math.round((Date.now() - status.lastSync) / 1000) : null;
  const agoLabel = ago === null ? "" : ago < 60 ? `${ago}s` : ago < 3600 ? `${Math.round(ago/60)}m` : `${Math.round(ago/3600)}h`;

  if (compact) {
    return (
      <span title={`${info.label}${agoLabel?` · ${agoLabel} trước`:""}${status.lastError?`\nLỗi: ${status.lastError}`:""}`}
        style={{display:"inline-flex",alignItems:"center",gap:4,fontSize:10,color:info.color}}>
        <span>{info.emoji}</span>
        {status.pending > 0 && <span>{status.pending}</span>}
      </span>
    );
  }

  return (
    <div title={status.lastError || ""} style={{display:"inline-flex",alignItems:"center",gap:6,padding:"5px 10px",background:C.bgAlt,borderRadius:4,fontSize:11,color:info.color,border:`1px solid ${info.color}33`}}>
      <span>{info.emoji}</span>
      <span style={{fontWeight:500}}>{info.label}</span>
      {status.pending > 0 && <span style={{padding:"1px 5px",background:info.color,color:"#FFF",borderRadius:8,fontSize:9}}>{status.pending}</span>}
      {status.lastSync && status.state === "synced" && <span style={{color:C.muted,fontSize:9}}>· {agoLabel}</span>}
    </div>
  );
}

// ─── EmptyState — reusable when no data ──────────────────────────────
const EmptyState = ({ icon:Icon = Database, title, description, ctaLabel, onCta, compact = false }) => {
  const C = useC();
  return (
    <div style={{padding:compact?20:40,textAlign:"center",color:C.muted}}>
      {Icon && <Icon size={compact?24:36} style={{color:C.borderSoft,marginBottom:compact?6:10}}/>}
      <div style={{fontSize:compact?12:14,fontWeight:500,color:C.text,marginBottom:4}}>{title}</div>
      {description && <div style={{fontSize:11,color:C.muted,maxWidth:380,margin:"0 auto",lineHeight:1.5}}>{description}</div>}
      {ctaLabel && onCta && (
        <button onClick={onCta} style={{marginTop:14,padding:"7px 16px",fontSize:11,fontWeight:500,background:C.accent,color:"#FFF",border:"none",borderRadius:4,cursor:"pointer"}}>
          {ctaLabel}
        </button>
      )}
    </div>
  );
};

const Card = ({ children, style={} }) => {
  const C = useC();
  return <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:6,...style}}>{children}</div>;
};

const Modal = ({ title, onClose, children, width=520 }) => {
  const C = useC();
  return (
    <div style={{position:"fixed",inset:0,background:"rgba(15,17,21,0.55)",zIndex:1000,
      display:"flex",alignItems:"center",justifyContent:"center",padding:24}}>
      <div style={{background:C.card,borderRadius:8,width,maxWidth:"100%",maxHeight:"90vh",
        overflow:"auto",boxShadow:"0 20px 60px rgba(0,0,0,0.25)"}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",
          padding:"16px 20px",borderBottom:`1px solid ${C.border}`}}>
          <span style={{fontFamily:"'Fraunces',serif",fontWeight:500,fontSize:16,color:C.ink}}>{title}</span>
          <button onClick={onClose} style={{background:"none",border:"none",cursor:"pointer",padding:4}}>
            <X size={16} style={{color:C.muted}}/>
          </button>
        </div>
        <div style={{padding:"20px 20px 24px"}}>{children}</div>
      </div>
    </div>
  );
};

const Field = ({ label, children }) => {
  const C = useC();
  return (
    <div style={{marginBottom:14}}>
      <div style={{fontSize:10,fontWeight:600,letterSpacing:"0.14em",textTransform:"uppercase",
        color:C.muted,marginBottom:5}}>{label}</div>
      {children}
    </div>
  );
};

const Input = (p) => {
  const C = useC();
  return <input {...p} style={{width:"100%",fontSize:12,padding:"8px 10px",outline:"none",boxSizing:"border-box",
    background:C.bgAlt,border:`1px solid ${C.border}`,borderRadius:4,color:C.text,...p.style}}/>;
};

const Select = ({ children, ...p }) => {
  const C = useC();
  return <select {...p} style={{width:"100%",fontSize:12,padding:"8px 28px 8px 10px",outline:"none",
    background:C.bgAlt,border:`1px solid ${C.border}`,borderRadius:4,color:C.text,appearance:"none",
    backgroundImage:`url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 24 24' fill='none' stroke='%236B7280' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,
    backgroundRepeat:"no-repeat",backgroundPosition:"right 8px center",...p.style}}>{children}</select>;
};

const Btn = ({ children, primary, danger, ghost, icon:Icon, onClick, disabled, style={} }) => {
  const C = useC();
  let bg = primary ? C.accent : danger ? C.red : ghost ? "transparent" : C.bgAlt;
  let color = primary || danger ? "#FFF" : C.text;
  let border = ghost ? `1px solid ${C.border}` : "none";
  return (
    <button onClick={onClick} disabled={disabled}
      style={{display:"inline-flex",alignItems:"center",gap:6,fontSize:12,fontWeight:500,
        padding:"7px 14px",background:bg,color,border,borderRadius:4,
        cursor:disabled?"not-allowed":"pointer",opacity:disabled?0.5:1,...style}}>
      {Icon && <Icon size={12}/>}
      {children}
    </button>
  );
};

// ─── LOGIN / REGISTER screens ─────────────────────────────────────
function AuthScreen({ onLogin, brand, lang, setLang }) {
  const C = useC();
  const t = (k) => TRANSLATIONS[lang][k] || k;
  const [mode, setMode] = useState("login"); // login | partner-register (internal register disabled)
  const [form, setForm] = useState({ email:"", password:"", confirmPwd:"", fullName:"", companyName:"", phone:"" });
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPwd, setShowPwd] = useState(false);

  // First-time setup detection: if no users exist, force register
  const users = lsGet(LS.USERS, []);
  const isFirstSetup = users.length === 0;

  // First-time: force registration for Super Admin. No internal register after that.
  useEffect(() => {
    if (isFirstSetup && mode === "login") setMode("first-setup");
  }, [isFirstSetup]);

  const submit = async () => {
    setErr("");
    if (!form.email || !form.password) { setErr("Vui lòng nhập email và mật khẩu"); return; }

    // Check lockout for this email
    const attempts = lsGet(LS.LOGIN_ATTEMPTS, {});
    const userAttempts = attempts[form.email] || { count:0, lockedUntil:0 };
    if (userAttempts.lockedUntil > Date.now()) {
      const minLeft = Math.ceil((userAttempts.lockedUntil - Date.now())/60000);
      setErr(`Tài khoản tạm khóa do đăng nhập sai nhiều lần. Thử lại sau ${minLeft} phút.`);
      return;
    }

    const isRegMode = mode === "first-setup" || mode === "partner-register";
    if (isRegMode) {
      if (!form.fullName) { setErr("Vui lòng nhập họ tên"); return; }
      if (mode === "partner-register" && !form.companyName) { setErr("Vui lòng nhập tên công ty/kênh"); return; }
      if (form.password.length < 8) { setErr("Mật khẩu phải có tối thiểu 8 ký tự (bảo mật v5)"); return; }
      if (!/[A-Z]/.test(form.password)) { setErr("Mật khẩu phải chứa ít nhất 1 chữ HOA"); return; }
      if (!/[0-9]/.test(form.password)) { setErr("Mật khẩu phải chứa ít nhất 1 số"); return; }
      if (form.password !== form.confirmPwd) { setErr("Mật khẩu xác nhận không khớp"); return; }
      if (users.find(u => u.email === form.email)) { setErr("Email đã được sử dụng"); return; }
    }
    setLoading(true);
    await new Promise(r=>setTimeout(r,400));
    if (isRegMode) {
      const isPartner = mode === "partner-register";
      const newUser = {
        id: `U${Date.now()}`,
        email: form.email,
        fullName: form.fullName,
        passwordHash: hashPwd(form.password),
        // 🔒 SECURITY: first-setup → SUPER_ADMIN, partner-register → PARTNER
        // Internal registration is DISABLED — admin creates internal users in Settings
        role: isFirstSetup ? "SUPER_ADMIN" : "PARTNER",
        createdAt: new Date().toISOString(),
        lastLogin: new Date().toISOString(),
        loginCount: 1,
        mfa: false,
        status: isPartner ? "PendingApproval" : "Active",
        // Partner-specific
        companyName: isPartner ? form.companyName : undefined,
        phone: isPartner ? form.phone : undefined,
        partnerSince: isPartner ? new Date().toISOString() : undefined,
        registrationType: isFirstSetup ? "FIRST_SETUP" : "PARTNER",
      };
      const updatedUsers = [...users, newUser];
      lsSet(LS.USERS, updatedUsers);
      lsSet(LS.AUTH, { userId: newUser.id, token: hashPwd(newUser.id+Date.now()), expiresAt: Date.now()+7*86400000 });
      logActivity("USER_REGISTERED", newUser.id, `New ${isFirstSetup?"SUPER_ADMIN":"PARTNER"} user: ${newUser.email}, role: ${newUser.role}`);
      onLogin(newUser);
    } else {
      const u = users.find(x => x.email === form.email);
      if (!u) {
        // Track failed attempt
        const newAttempts = { ...attempts, [form.email]: { count: userAttempts.count + 1, lockedUntil: 0 } };
        lsSet(LS.LOGIN_ATTEMPTS, newAttempts);
        setErr("Email hoặc mật khẩu không đúng"); 
        setLoading(false); 
        return;
      }
      if (u.status !== "Active") { 
        setErr("Tài khoản đã bị tạm khóa. Liên hệ Super Admin."); 
        logActivity("LOGIN_FAILED", u.id, "Account suspended");
        setLoading(false); return; 
      }
      if (u.passwordHash !== hashPwd(form.password)) {
        const newCount = userAttempts.count + 1;
        const newAttempts = { ...attempts, [form.email]: { 
          count: newCount, 
          lockedUntil: newCount >= 5 ? Date.now() + 5*60000 : 0 
        }};
        lsSet(LS.LOGIN_ATTEMPTS, newAttempts);
        logActivity("LOGIN_FAILED", u.id, `Wrong password, attempt ${newCount}/5`);
        if (newCount >= 5) {
          setErr("Đăng nhập sai 5 lần. Tài khoản bị khóa 5 phút.");
          logActivity("ACCOUNT_LOCKED", u.id, "5 wrong attempts");
        } else {
          setErr(`Email hoặc mật khẩu không đúng. (${newCount}/5 lần sai)`);
        }
        setLoading(false); return;
      }
      // Success - reset attempts
      const newAttempts = { ...attempts };
      delete newAttempts[form.email];
      lsSet(LS.LOGIN_ATTEMPTS, newAttempts);
      
      u.lastLogin = new Date().toISOString();
      u.loginCount = (u.loginCount || 0) + 1;
      lsSet(LS.USERS, users.map(x => x.id===u.id?u:x));
      lsSet(LS.AUTH, { userId: u.id, token: hashPwd(u.id+Date.now()), expiresAt: Date.now()+7*86400000 });
      logActivity("USER_LOGIN", u.id, `Login successful (count: ${u.loginCount})`);
      onLogin(u);
    }
    setLoading(false);
  };

  return (
    <div style={{minHeight:"100vh",background:`linear-gradient(135deg, ${C.bg} 0%, ${C.bgAlt} 100%)`,
      display:"flex",alignItems:"center",justifyContent:"center",padding:24}}>
      <div style={{position:"absolute",top:20,right:20,display:"flex",gap:6,alignItems:"center"}}>
        <Languages size={14} style={{color:C.muted}}/>
        <button onClick={()=>setLang("vi")} style={{fontSize:11,padding:"4px 10px",background:lang==="vi"?C.ink:"transparent",color:lang==="vi"?"#FFF":C.text,border:`1px solid ${C.border}`,borderRadius:3,cursor:"pointer"}}>Tiếng Việt</button>
        <button onClick={()=>setLang("en")} style={{fontSize:11,padding:"4px 10px",background:lang==="en"?C.ink:"transparent",color:lang==="en"?"#FFF":C.text,border:`1px solid ${C.border}`,borderRadius:3,cursor:"pointer"}}>English</button>
      </div>

      <div style={{display:"flex",alignItems:"stretch",borderRadius:12,overflow:"hidden",
        boxShadow:"0 30px 80px rgba(15,17,21,0.15)",maxWidth:880,width:"100%",background:C.card}}>
        
        {/* Left visual panel */}
        <div style={{flex:1,background:`linear-gradient(135deg, ${C.ink} 0%, ${C.accent} 200%)`,
          padding:"50px 40px",color:"#FFF",display:"flex",flexDirection:"column",justifyContent:"space-between"}}>
          <div>
            <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:32}}>
              {brand.logoData ? (
                <img src={brand.logoData} alt={brand.appName} style={{width:40,height:40,borderRadius:6,objectFit:"cover"}}/>
              ) : (
                <div style={{width:40,height:40,background:C.accent,borderRadius:6,display:"flex",alignItems:"center",justifyContent:"center"}}>
                  <span style={{fontFamily:"'Fraunces',serif",fontWeight:700,fontSize:20,color:"#FFF"}}>{brand.appName?.[0]?.toUpperCase() || "M"}</span>
                </div>
              )}
              <div>
                <div style={{fontFamily:"'Fraunces',serif",fontWeight:500,fontSize:22}}>{brand.appName || "Meridian"}</div>
                <div style={{fontSize:10,opacity:0.7,letterSpacing:"0.18em",textTransform:"uppercase",fontWeight:600}}>v{APP_VERSION} · {APP_BUILD}</div>
              </div>
            </div>
            <h1 style={{fontFamily:"'Fraunces',serif",fontWeight:500,fontSize:30,lineHeight:1.2,marginBottom:14,letterSpacing:"-0.02em"}}>
              {lang==="vi" ? "Hệ thống quản lý MCN thông minh" : "Smart MCN Management System"}
            </h1>
            <p style={{fontSize:13,lineHeight:1.7,opacity:0.85}}>
              {lang==="vi" 
                ? "Quản lý 8 CMS · 500+ kênh · Đa tệ · AI tích hợp · Bảo mật cao cấp"
                : "Manage 8 CMS · 500+ channels · Multi-currency · AI integrated · Enterprise security"}
            </p>
          </div>
          <div style={{fontSize:10,opacity:0.6,letterSpacing:"0.1em"}}>
            © {new Date().getFullYear()} {brand.appName || "Meridian"} · {brand.companyName || "MCN Network"}
          </div>
        </div>

        {/* Right form panel */}
        <div style={{flex:1.1,padding:"50px 50px"}}>
          <div style={{marginBottom:24}}>
            <div style={{fontFamily:"'Fraunces',serif",fontWeight:500,fontSize:24,color:C.ink,marginBottom:6}}>
              {mode==="partner-register" ? "Đăng ký Đối tác" : mode==="first-setup" ? "Tạo tài khoản quản trị" : t("welcomeBack")}
            </div>
            <div style={{fontSize:12,color:C.muted}}>
              {mode==="partner-register" ? "Đăng ký để hợp tác với MCN — quản lý kênh & gửi video duyệt" : mode==="first-setup" ? "Tạo tài khoản Super Admin đầu tiên cho hệ thống" : t("enterCreds")}
            </div>
            {mode==="first-setup" && (
              <div style={{marginTop:14,padding:"10px 12px",background:C.aiSoft,borderRadius:5,
                borderLeft:`3px solid ${C.ai}`,fontSize:11,color:C.ai}}>
                ⚡ {lang==="vi" ? "Lần đầu cài đặt — Tài khoản này sẽ có quyền Super Admin" : "First-time setup — This account will be Super Admin"}
              </div>
            )}
            {mode==="partner-register" && (
              <div style={{marginTop:14,padding:"10px 12px",background:`${C.amber}15`,borderRadius:5,
                borderLeft:`3px solid ${C.amber}`,fontSize:11,color:C.text,lineHeight:1.5}}>
                💡 <strong>Đăng ký đối tác (Partner)</strong> — sau đăng ký, tài khoản sẽ ở trạng thái <strong>chờ duyệt</strong>.
                Sau khi quản trị duyệt, bạn có thể: thêm kênh của riêng mình, xem hợp đồng, gửi video chờ duyệt cấp kênh.
              </div>
            )}
          </div>

          <div style={{display:"flex",flexDirection:"column",gap:14}}>
            {(mode === "first-setup" || mode === "partner-register") && (
              <Field label={t("fullName")}>
                <Input value={form.fullName} onChange={e=>setForm(f=>({...f,fullName:e.target.value}))}
                  placeholder="Nguyễn Văn A" autoFocus/>
              </Field>
            )}
            {mode === "partner-register" && (
              <>
                <Field label="Tên công ty / kênh chính *">
                  <Input value={form.companyName} onChange={e=>setForm(f=>({...f,companyName:e.target.value}))}
                    placeholder="VD: Studio ABC, Channel XYZ Network..."/>
                </Field>
                <Field label="Số điện thoại">
                  <Input value={form.phone} onChange={e=>setForm(f=>({...f,phone:e.target.value}))}
                    placeholder="0901234567"/>
                </Field>
              </>
            )}
            <Field label={t("email")}>
              <Input type="email" value={form.email} onChange={e=>setForm(f=>({...f,email:e.target.value}))}
                placeholder={mode==="partner-register"?"contact@yourcompany.com":"admin@meridian.vn"} autoFocus={mode==="login" || mode==="first-setup"}/>
            </Field>
            <Field label={t("password")}>
              <div style={{position:"relative"}}>
                <Input type={showPwd?"text":"password"} value={form.password}
                  onChange={e=>setForm(f=>({...f,password:e.target.value}))}
                  onKeyDown={e=>e.key==="Enter"&&submit()}
                  placeholder={mode!=="login"?"Tối thiểu 8 ký tự, có HOA + số":"••••••••"} style={{paddingRight:34}}/>
                <button onClick={()=>setShowPwd(s=>!s)} style={{position:"absolute",right:8,top:8,background:"none",border:"none",cursor:"pointer",padding:2}}>
                  {showPwd ? <EyeOff size={14} style={{color:C.muted}}/> : <Eye size={14} style={{color:C.muted}}/>}
                </button>
              </div>
            </Field>
            {(mode === "first-setup" || mode === "partner-register") && (
              <Field label={t("confirmPwd")}>
                <Input type="password" value={form.confirmPwd} onChange={e=>setForm(f=>({...f,confirmPwd:e.target.value}))}
                  onKeyDown={e=>e.key==="Enter"&&submit()} placeholder="••••••••"/>
              </Field>
            )}
          </div>

          {err && (
            <div style={{marginTop:14,padding:"10px 12px",background:C.redSoft,borderRadius:5,
              borderLeft:`3px solid ${C.red}`,fontSize:11,color:C.red,display:"flex",alignItems:"center",gap:8}}>
              <AlertCircle size={13}/> {err}
            </div>
          )}

          <button onClick={submit} disabled={loading}
            style={{width:"100%",marginTop:20,padding:"12px",background:loading?C.muted:C.ink,color:"#FFF",
              border:"none",borderRadius:6,cursor:loading?"wait":"pointer",fontSize:13,fontWeight:500,
              display:"flex",alignItems:"center",justifyContent:"center",gap:8,transition:"all 0.2s"}}>
            {loading ? (
              <span style={{display:"inline-block",width:14,height:14,border:"2px solid rgba(255,255,255,0.3)",borderTopColor:"#FFF",borderRadius:"50%",animation:"spin 0.8s linear infinite"}}/>
            ) : (mode==="first-setup" || mode==="partner-register") ? <UserPlus size={14}/> : <LogIn size={14}/>}
            {loading ? t("processing") : (mode==="first-setup" ? "Tạo tài khoản" : mode==="partner-register" ? "Đăng ký Đối tác" : t("loginBtn"))}
          </button>

          {!isFirstSetup && (
            <div style={{marginTop:16,textAlign:"center",fontSize:11,color:C.muted}}>
              {mode==="login" ? (
                <>
                  Bạn là đối tác?{" "}
                  <button onClick={()=>{setMode("partner-register"); setErr("");}} style={{background:"none",border:"none",color:C.amber,fontWeight:500,cursor:"pointer",fontSize:11}}>
                    🤝 Đăng ký Đối tác
                  </button>
                </>
              ) : (
                <>
                  {t("haveAccount")}{" "}
                  <button onClick={()=>{setMode("login"); setErr("");}} style={{background:"none",border:"none",color:C.accent,fontWeight:500,cursor:"pointer",fontSize:11}}>
                    {t("loginBtn")}
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
// ─── SMART FILE UPLOADER ──────────────────────────────────────────
// Auto-detects file type and parses accordingly:
// 1. Channel system (2_0): channel master list
// 2. Channel violations (2_1): violations sheet
// 3. Revenue by department/topic (2_3): KUDO realtime
// 4. Google Revenue (2_4): per-CMS revenue USD/GBP/CAD
// 5. Partner sharing (2_5): partner payouts
// 6. Product inspection (5_1): kiểm định sản phẩm
// 7. AdSense activities: tax/payouts
// 8. CMS Report: YouTube Analytics CSV/XLSX

const FILE_TYPE_DETECTORS = [
  {
    id: "CHANNEL_SYSTEM",
    label: "Bảng kênh hệ thống",
    icon: Tv,
    color: "blue",
    detect: ({fileName, sheets, headers}) => {
      const fn = fileName.toLowerCase();
      if (fn.includes("kênh hệ thống") || fn.includes("channel system") || fn.includes("hd_media_hub_bảng")) return 100;
      if (sheets.some(s => /youtube channel system|channel overview/i.test(s))) return 90;
      if (headers.some(h => /id channel|channel join date|monetization status/i.test(h))) return 80;
      return 0;
    },
    parse: (data, target) => {
      const channels = [];
      const sheet = data.sheets.find(s => /channel system overview/i.test(s.name)) || data.sheets[1] || data.sheets[0];
      const rows = sheet.rows;
      if (rows.length < 2) return { channels:[], summary:"Không đọc được data" };
      const headers = rows[0].map(h => String(h||"").toLowerCase().trim());
      const findCol = (keys) => headers.findIndex(h => keys.some(k => h.includes(k)));
      const cIdx = {
        ytId: findCol(["id channel"]),
        nameNow: findCol(["current channel name"]),
        nameOrig: findCol(["initial channel name","original"]),
        url: findCol(["channel url"]),
        joinDate: findCol(["join date","onboarding date"]),
        type: findCol(["channel type","loại hình"]),
        monetization: findCol(["monetization status","tình trạng kiếm tiền"]),
        cms: findCol(["network","cms","net"]),
        category: findCol(["channel category","loại kênh"]),
        group: findCol(["group","nhóm","chủ đề"]),
      };
      for (let i = 1; i < rows.length; i++) {
        const r = rows[i];
        if (!r[cIdx.ytId] && !r[cIdx.nameNow]) continue;
        channels.push({
          ytId: String(r[cIdx.ytId]||"").trim(),
          name: String(r[cIdx.nameNow]||r[cIdx.nameOrig]||"Unnamed").trim(),
          url: String(r[cIdx.url]||"").trim(),
          joinedDate: r[cIdx.joinDate] ? String(r[cIdx.joinDate]).slice(0,10) : "",
          type: String(r[cIdx.type]||"").trim(),
          monetization: String(r[cIdx.monetization]||"Monetized").trim(),
          cms: String(r[cIdx.cms]||"").trim(),
          category: String(r[cIdx.category]||"").trim(),
          topic: String(r[cIdx.group]||"").trim(),
        });
      }
      return {
        type: "CHANNEL_SYSTEM",
        items: channels,
        summary: `Tìm thấy ${channels.length} kênh trong file`,
      };
    },
    apply: (parsed, state, setState) => {
      const existing = state.channels;
      let updated = 0, created = 0;
      const result = [...existing];
      parsed.items.forEach(p => {
        if (!p.ytId && !p.name) return;
        const idx = result.findIndex(c => 
          (p.ytId && c.ytId === p.ytId) || (p.name && c.name === p.name)
        );
        if (idx >= 0) {
          Object.keys(p).forEach(k => { if (p[k]) result[idx][k] = p[k]; });
          if (p.monetization === "Demonetized" || p.monetization === "Suspended") {
            result[idx].health = "Critical";
            result[idx].status = p.monetization === "Suspended" ? "Suspended" : "Active";
          } else {
            result[idx].health = "Healthy";
            result[idx].status = "Active";
          }
          updated++;
        } else if (p.name) {
          result.push({
            id: `C${String(result.length+1).padStart(5,"0")}`,
            ytId: p.ytId || `UC${Math.random().toString(36).substr(2,12).toUpperCase()}`,
            name: p.name, url: p.url, cms: p.cms, topic: p.topic,
            category: p.category, joinedDate: p.joinedDate,
            monetization: p.monetization,
            partner: "Unassigned", dept: "",
            country: "VN", subscribers: 0, monthlyViews: 0, monthlyRevenue: 0,
            health: p.monetization === "Demonetized" ? "Critical" : "Healthy",
            strikes: 0, syncStatus: "Synced",
            status: p.monetization === "Suspended" ? "Suspended" : "Active",
            lastSync: 0,
          });
          created++;
        }
      });
      setState(s => ({ ...s, channels: result }));
      return { updated, created };
    }
  },
  {
    id: "VIOLATIONS",
    label: "Vi phạm kênh",
    icon: ShieldAlert,
    color: "red",
    detect: ({fileName, sheets, headers}) => {
      const fn = fileName.toLowerCase();
      if (fn.includes("biến động") || fn.includes("violation")) return 100;
      if (sheets.some(s => /violation|biến động/i.test(s))) return 90;
      if (headers.some(h => /channel status|date recorded|end date/i.test(h))) return 70;
      return 0;
    },
    parse: (data) => {
      const violations = [];
      const sheet = data.sheets.find(s => /violation/i.test(s.name)) || data.sheets[0];
      const rows = sheet.rows;
      if (rows.length < 2) return { items: [], summary: "Không có data" };
      const headers = rows[0].map(h => String(h||"").toLowerCase().trim());
      const f = (keys) => headers.findIndex(h => keys.some(k => h.includes(k)));
      const idx = {
        ytId: f(["id channel"]),
        name: f(["channel name"]),
        net: f(["net","cms"]),
        dept: f(["department"]),
        partner: f(["partner","production"]),
        status: f(["channel status","status"]),
        startDate: f(["date recorded","start date"]),
        endDate: f(["end date"]),
      };
      for (let i = 1; i < rows.length; i++) {
        const r = rows[i];
        if (!r[idx.ytId] && !r[idx.name]) continue;
        violations.push({
          ytId: String(r[idx.ytId]||""),
          name: String(r[idx.name]||""),
          cms: String(r[idx.net]||""),
          dept: String(r[idx.dept]||""),
          partner: String(r[idx.partner]||""),
          status: String(r[idx.status]||""),
          startDate: r[idx.startDate] ? String(r[idx.startDate]).slice(0,10) : "",
          endDate: r[idx.endDate] ? String(r[idx.endDate]).slice(0,10) : "",
        });
      }
      return { type:"VIOLATIONS", items: violations, summary: `Tìm thấy ${violations.length} vi phạm` };
    },
    apply: (parsed, state, setState) => {
      const existing = state.violations || [];
      const newOnes = parsed.items.map((v, i) => ({
        id: `V${String(existing.length+i+1).padStart(5,"0")}`,
        channelId: state.channels.find(c => c.ytId === v.ytId)?.id || "",
        channelName: v.name,
        cms: v.cms,
        type: v.status?.includes("Demonetized") ? "DEMONETIZED" : 
              v.status?.includes("Suspended") ? "SUSPENDED" :
              v.status?.includes("Rejected") ? "MONETIZATION_REJECTED" : "COMMUNITY_GUIDELINES",
        typeLabel: v.status,
        videoTitle: "(Imported)",
        date: v.startDate || new Date().toISOString().slice(0,10),
        endDate: v.endDate,
        partner: v.partner,
        status: v.endDate ? "Resolved" : "Active",
        severity: "High",
        notes: `Imported from file. Partner: ${v.partner}`,
      }));
      setState(s => ({ ...s, violations: [...newOnes, ...existing] }));
      return { created: newOnes.length, updated: 0 };
    }
  },
  {
    id: "REVENUE_GOOGLE",
    label: "Báo cáo doanh thu Google",
    icon: DollarSign,
    color: "accent",
    detect: ({fileName, sheets, headers}) => {
      const fn = fileName.toLowerCase();
      if (fn.includes("báo cáo doanh thu") || fn.includes("report network") || fn.includes("revenue")) return 100;
      if (sheets.some(s => /tong usd|tong cad|tong gbp|kudo.*usd/i.test(s))) return 90;
      if (headers.some(h => /\brevenue\b|\bcms\b|\bview\b/i.test(h))) return 60;
      return 0;
    },
    parse: (data) => {
      const items = [];
      // Find sheet with channel-level revenue (TONG USD, TONG CADGBP, etc)
      const targetSheet = data.sheets.find(s => /tong usd|tong hop/i.test(s.name)) || data.sheets[0];
      const rows = targetSheet.rows;
      if (rows.length < 2) return { items: [], summary: "Không có data" };
      const headers = rows[0].map(h => String(h||"").toLowerCase().trim());
      const f = (keys) => headers.findIndex(h => keys.some(k => h.includes(k)));
      const idx = {
        ytId: f(["id channel"]),
        view: f(["view"]),
        revenue: f(["revenue"]),
        cms: f(["cms"]),
        name: f(["channel name"]),
        dept: f(["department"]),
        partner: f(["partner"]),
      };
      if (idx.ytId < 0 || idx.revenue < 0) {
        return { items: [], summary: "Không nhận được cột Revenue/ID Channel" };
      }
      for (let i = 1; i < rows.length; i++) {
        const r = rows[i];
        if (!r[idx.ytId]) continue;
        items.push({
          ytId: String(r[idx.ytId]),
          views: parseFloat(r[idx.view]) || 0,
          revenue: parseFloat(r[idx.revenue]) || 0,
          cms: String(r[idx.cms]||""),
          name: String(r[idx.name]||""),
          dept: String(r[idx.dept]||""),
          partner: String(r[idx.partner]||""),
        });
      }
      return { type:"REVENUE_GOOGLE", items, summary: `${items.length} kênh có doanh thu, tổng $${items.reduce((s,x)=>s+x.revenue,0).toFixed(2)}` };
    },
    apply: (parsed, state, setState) => {
      const channels = [...state.channels];
      let updated = 0, created = 0;
      parsed.items.forEach(p => {
        const idx = channels.findIndex(c => c.ytId === p.ytId);
        if (idx >= 0) {
          channels[idx].monthlyViews = Math.round(p.views);
          channels[idx].monthlyRevenue = Math.round(p.revenue);
          if (p.cms) channels[idx].cms = p.cms;
          if (p.partner) channels[idx].partner = p.partner;
          if (p.dept) channels[idx].dept = p.dept;
          channels[idx].lastSync = 0;
          channels[idx].syncStatus = "Synced";
          updated++;
        } else if (p.name) {
          channels.push({
            id: `C${String(channels.length+1).padStart(5,"0")}`,
            ytId: p.ytId, name: p.name, cms: p.cms, partner: p.partner, dept: p.dept,
            topic: "", category: "", country: "VN",
            subscribers: 0, monthlyViews: Math.round(p.views), monthlyRevenue: Math.round(p.revenue),
            monetization: "Monetized", health: "Healthy", strikes: 0,
            syncStatus: "Synced", status: "Active", lastSync: 0,
          });
          created++;
        }
      });
      setState(s => ({ ...s, channels }));
      return { updated, created };
    }
  },
  {
    id: "CMS_ANALYTICS",
    label: "Báo cáo CMS YouTube",
    icon: BarChart2,
    color: "blue",
    detect: ({fileName, sheets, headers}) => {
      const fn = fileName.toLowerCase();
      if (fn.includes("report_cms") || fn.includes("cms_365") || fn.includes("youtube analytics")) return 100;
      if (sheets.some(s => /table data|chart data/i.test(s))) return 90;
      if (headers.some(h => /engaged views|watch time|rpm/i.test(h))) return 80;
      return 0;
    },
    parse: (data) => {
      const sheet = data.sheets.find(s => /table data/i.test(s.name)) || data.sheets[0];
      const rows = sheet.rows;
      const headers = rows[0].map(h => String(h||"").toLowerCase().trim());
      const f = (keys) => headers.findIndex(h => keys.some(k => h.includes(k)));
      const idx = {
        videoId: f(["content"]),
        title: f(["video title"]),
        publish: f(["publish time"]),
        duration: f(["duration"]),
        engaged: f(["engaged views"]),
        rpm: f(["rpm"]),
        views: f(["^views","\\bviews\\b"]),
        watchTime: f(["watch time"]),
      };
      const items = [];
      for (let i = 1; i < rows.length; i++) {
        const r = rows[i];
        if (!r[idx.videoId] || r[idx.videoId] === "Total") continue;
        items.push({
          videoId: String(r[idx.videoId]),
          title: String(r[idx.title]||""),
          views: parseFloat(r[idx.views]) || 0,
          rpm: parseFloat(r[idx.rpm]) || 0,
          engagedViews: parseFloat(r[idx.engaged]) || 0,
          watchTime: parseFloat(r[idx.watchTime]) || 0,
        });
      }
      return { type:"CMS_ANALYTICS", items, summary: `${items.length} video, tổng views ${fmt(items.reduce((s,x)=>s+x.views,0))}` };
    },
    apply: (parsed, state, setState) => {
      // Store as video analytics (informational, doesn't update channels)
      setState(s => ({ ...s, videoAnalytics: [...(s.videoAnalytics||[]), ...parsed.items].slice(-500) }));
      return { updated: 0, created: parsed.items.length };
    }
  },
  {
    id: "PARTNER_SHARING",
    label: "Doanh thu chia sẻ đối tác",
    icon: Users,
    color: "amber",
    detect: ({fileName, sheets, headers}) => {
      const fn = fileName.toLowerCase();
      if (fn.includes("doanh thu chia sẻ") || fn.includes("đối tác")) return 100;
      if (sheets.some(s => /doanh thu|chi phí|đsdt/i.test(s))) return 70;
      if (headers.some(h => /tên kênh|đối tác|doanh thu \(usd\)/i.test(h))) return 80;
      return 0;
    },
    parse: (data) => {
      const sheet = data.sheets.find(s => /doanh thu/i.test(s.name) && !/chi phí/i.test(s.name)) || data.sheets[0];
      const rows = sheet.rows;
      // Find header row (sometimes not first row)
      let headerRow = 0;
      for (let i = 0; i < Math.min(5, rows.length); i++) {
        if (rows[i].some(c => String(c||"").toLowerCase().includes("id kênh") || String(c||"").toLowerCase().includes("tên kênh"))) {
          headerRow = i; break;
        }
      }
      const headers = rows[headerRow].map(h => String(h||"").toLowerCase().trim());
      const f = (keys) => headers.findIndex(h => keys.some(k => h.includes(k)));
      const idx = {
        month: f(["tháng"]),
        ytId: f(["id kênh"]),
        name: f(["tên kênh"]),
        status: f(["tình trạng"]),
        cms: f(["cms"]),
        dept: f(["phòng"]),
        partner: f(["đối tác"]),
        revenue: f(["doanh thu"]),
      };
      const items = [];
      for (let i = headerRow+1; i < rows.length; i++) {
        const r = rows[i];
        if (!r[idx.ytId] && !r[idx.name]) continue;
        items.push({
          month: String(r[idx.month]||""),
          ytId: String(r[idx.ytId]||""),
          name: String(r[idx.name]||""),
          status: String(r[idx.status]||""),
          cms: String(r[idx.cms]||""),
          dept: String(r[idx.dept]||""),
          partner: String(r[idx.partner]||""),
          revenue: parseFloat(r[idx.revenue]) || 0,
        });
      }
      return { type:"PARTNER_SHARING", items, summary: `${items.length} bản ghi chia sẻ doanh thu, tổng $${items.reduce((s,x)=>s+x.revenue,0).toFixed(0)}` };
    },
    apply: (parsed, state, setState) => {
      // Store sharing records
      setState(s => ({ ...s, partnerSharing: [...(s.partnerSharing||[]), ...parsed.items].slice(-1000) }));
      return { updated: 0, created: parsed.items.length };
    }
  },
  {
    id: "ADSENSE",
    label: "AdSense Activities",
    icon: Wallet,
    color: "green",
    detect: ({fileName, sheets, headers, isCsv}) => {
      const fn = fileName.toLowerCase();
      if (fn.includes("adsense")) return 100;
      if (isCsv && headers.some(h => /amount.*gbp|amount.*usd|adsense/i.test(h))) return 80;
      return 0;
    },
    parse: (data) => {
      const rows = data.sheets[0].rows;
      const headers = rows[0].map(h => String(h||"").toLowerCase().trim());
      const f = (keys) => headers.findIndex(h => keys.some(k => h.includes(k)));
      const idx = {
        date: f(["date"]),
        desc: f(["description"]),
        amount: f(["amount"]),
      };
      const items = [];
      for (let i = 1; i < rows.length; i++) {
        const r = rows[i];
        if (!r[idx.date]) continue;
        const amt = String(r[idx.amount]||"").replace(/[^\d.\-−]/g,"").replace("−","-");
        items.push({
          date: String(r[idx.date]||""),
          description: String(r[idx.desc]||""),
          amount: parseFloat(amt) || 0,
        });
      }
      return { type:"ADSENSE", items, summary: `${items.length} giao dịch AdSense` };
    },
    apply: (parsed, state, setState) => {
      setState(s => ({ ...s, adsenseActivities: [...(s.adsenseActivities||[]), ...parsed.items].slice(-200) }));
      return { updated: 0, created: parsed.items.length };
    }
  },
  {
    id: "PRODUCT_INSPECTION",
    label: "Kiểm định sản phẩm",
    icon: FileText,
    color: "ai",
    detect: ({fileName, sheets, headers}) => {
      const fn = fileName.toLowerCase();
      if (fn.includes("kiểm định") || fn.includes("sản phẩm")) return 100;
      if (sheets.some(s => /kqkđ|kiểm định|kho lego/i.test(s))) return 90;
      if (headers.some(h => /kết quả kiểm định|đạt|rủi ro/i.test(h))) return 80;
      return 0;
    },
    parse: (data) => {
      const items = [];
      data.sheets.forEach(sheet => {
        if (!/kqkđ|kho/i.test(sheet.name)) return;
        const rows = sheet.rows;
        if (rows.length < 2) return;
        const headers = rows[0].map(h => String(h||"").toLowerCase().trim());
        const fileNameIdx = headers.findIndex(h => /tên file|sản phẩm/i.test(h));
        const resultIdx = headers.findIndex(h => /kết quả|kiểm định/i.test(h));
        const typeIdx = headers.findIndex(h => /dạng nội dung|loại/i.test(h));
        for (let i = 1; i < rows.length; i++) {
          const r = rows[i];
          if (!r[fileNameIdx]) continue;
          items.push({
            fileName: String(r[fileNameIdx]||""),
            result: String(r[resultIdx]||"").trim(),
            contentType: String(r[typeIdx]||""),
            sheet: sheet.name,
          });
        }
      });
      return { type:"PRODUCT_INSPECTION", items, summary: `${items.length} sản phẩm kiểm định (${items.filter(x=>x.result==="ĐẠT").length} ĐẠT, ${items.filter(x=>x.result==="RỦI RO").length} RỦI RO)` };
    },
    apply: (parsed, state, setState) => {
      // v5.1: assign stable UUID to each inspection so we can dedupe by id, not by fileName+sheet
      const enriched = parsed.items.map((it, i) => ({
        ...it,
        uid: `INS_${Date.now()}_${i}_${Math.random().toString(36).slice(2,8)}`,
        importedAt: new Date().toISOString(),
      }));
      setState(s => ({ ...s, productInspections: [...(s.productInspections||[]), ...enriched].slice(-2000) }));
      return { updated: 0, created: enriched.length };
    }
  },
  {
    id: "REVENUE_BY_TOPIC",
    label: "Doanh thu theo chủ đề",
    icon: Tag,
    color: "ai",
    detect: ({fileName, sheets, headers}) => {
      if (sheets.some(s => /doanh thu theo chủ đề|theo bộ phận|realtime/i.test(s))) return 100;
      if (headers.some(h => /phòng ban|chủ đề|số lượng kênh/i.test(h))) return 70;
      return 0;
    },
    parse: (data) => {
      const monthSheets = data.sheets.filter(s => /\(t\d+\.20\d+\)/i.test(s.name));
      const summary = monthSheets.map(s => s.name).slice(0, 6).join(", ");
      return {
        type:"REVENUE_BY_TOPIC",
        items: [],
        summary: `File theo dõi kinh doanh KUDO với ${monthSheets.length} sheet theo tháng (${summary}...)`,
        noteOnly: true,
      };
    },
    apply: (parsed, state, setState) => {
      return { updated: 0, created: 0, note: "File này chỉ ghi nhận, không cập nhật data trực tiếp" };
    }
  },
  // ── Per-channel CMS report (YouTube Studio: Table data.csv per-channel) ──
  {
    id: "CMS_CHANNEL_REPORT",
    label: "Báo cáo kênh CMS",
    icon: Tv,
    color: "blue",
    requiresCmsId: true, // user must pick target CMS before import
    detect: ({ fileName, headers, isCsv }) => {
      const fn = fileName.toLowerCase();
      // Exact filename match (YouTube Studio export)
      if (fn === "table data.csv" || fn === "table data") return 95;
      // Header fingerprint: must have channel id + channel title + revenue cols
      const hasChannelId  = headers.some(h => h === "channel");
      const hasTitle      = headers.some(h => h.includes("channel title"));
      const hasRevenue    = headers.some(h => h.includes("estimated partner revenue"));
      const hasViews      = headers.some(h => h === "views" || h.includes("engaged views"));
      if (isCsv && hasChannelId && hasTitle && hasRevenue && hasViews) return 90;
      return 0;
    },
    parse: (data, _, meta = {}) => {
      const sheet = data.sheets[0];
      const rows  = sheet.rows;
      if (rows.length < 2) return { type: "CMS_CHANNEL_REPORT", items: [], summary: "Không có dữ liệu" };

      const headers = rows[0].map(h => String(h || "").toLowerCase().trim());
      const fi = (keys) => headers.findIndex(h => keys.some(k => h === k || h.includes(k)));
      const idx = {
        ytId:     fi(["channel"]),
        title:    fi(["channel title"]),
        engaged:  fi(["engaged views"]),
        views:    fi(["views"]),
        watchTime:fi(["watch time"]),
        avgDur:   fi(["average view duration"]),
        revenue:  fi(["estimated partner revenue"]),
      };

      const items = [];
      for (let i = 1; i < rows.length; i++) {
        const r = rows[i];
        const ytId = String(r[idx.ytId] || "").trim();
        if (!ytId || ytId === "Total") continue;
        const revenue = parseFloat(r[idx.revenue]) || 0;
        const views   = parseInt(r[idx.views], 10)  || 0;
        items.push({
          ytId,
          name:          String(r[idx.title]    || "").trim(),
          engagedViews:  parseInt(r[idx.engaged], 10) || 0,
          views,
          watchTimeHours:parseFloat(r[idx.watchTime]) || 0,
          avgViewDuration: String(r[idx.avgDur] || ""),
          revenue,
        });
      }

      const totalRev  = items.reduce((s, x) => s + x.revenue, 0);
      const totalViews = items.reduce((s, x) => s + x.views, 0);
      return {
        type: "CMS_CHANNEL_REPORT",
        items,
        cmsId: meta.cmsId || null,   // filled by user in UI before import
        summary: `${items.length} kênh · ${totalViews.toLocaleString()} views · $${totalRev.toFixed(0)} doanh thu`,
      };
    },
    apply: (parsed, state, setState) => {
      const { items, cmsId } = parsed;
      if (!cmsId) return { updated: 0, created: 0, note: "Chưa chọn CMS đích" };

      const cmsList  = state.cmsList || KUDO_CMS_LIST;
      const cms      = cmsList.find(c => c.id === cmsId);
      const cmsName  = cms?.name || cmsId;

      const channels = [...(state.channels || [])];
      let created = 0, updated = 0;

      items.forEach(item => {
        const existing = channels.findIndex(c => c.ytId === item.ytId);
        if (existing >= 0) {
          // Update performance fields; keep all structural fields intact
          channels[existing] = {
            ...channels[existing],
            name:           item.name || channels[existing].name,
            monthlyViews:   item.views,
            monthlyRevenue: item.revenue,
            watchTimeHours: item.watchTimeHours,
            engagedViews:   item.engagedViews,
            syncStatus:     "Synced",
            lastSync:       0,
            // Only override CMS if it was previously empty
            cms: channels[existing].cms || cmsName,
          };
          updated++;
        } else {
          channels.push({
            id:             `C${String(channels.length + 1).padStart(5, "0")}`,
            ytId:           item.ytId,
            name:           item.name,
            cms:            cmsName,
            topic:          "",
            topicId:        "",
            partner:        "",
            dept:           "",
            category:       "",
            country:        "",
            subscribers:    0,
            monthlyViews:   item.views,
            monthlyRevenue: item.revenue,
            watchTimeHours: item.watchTimeHours,
            engagedViews:   item.engagedViews,
            avgViewDuration: item.avgViewDuration,
            monetization:   "Monetized",
            health:         "Healthy",
            strikes:        0,
            syncStatus:     "Synced",
            status:         "Active",
            lastSync:       0,
            joinedDate:     "",
          });
          created++;
        }
      });

      setState(s => ({ ...s, channels }));
      return { updated, created };
    },
  },
];

// Dynamic XLSX loader — auto-loads SheetJS from CDN if not present
// User no longer needs to edit index.html manually!
// ─── JSZip lazy loader ─────────────────────────────────────────────
async function loadJSZip() {
  if (typeof window !== "undefined" && window.JSZip) return window.JSZip;
  if (typeof window !== "undefined" && window.__jszipLoading) return window.__jszipLoading;
  window.__jszipLoading = new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = "https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js";
    s.onload = () => resolve(window.JSZip);
    s.onerror = () => reject(new Error("Không tải được JSZip"));
    document.head.appendChild(s);
    setTimeout(() => reject(new Error("JSZip timeout")), 12000);
  });
  return window.__jszipLoading;
}

// Extract files from a ZIP archive
async function extractZipFiles(zipFile) {
  const JSZip = await loadJSZip();
  const zip = await JSZip.loadAsync(zipFile);
  const files = [];
  const entries = Object.entries(zip.files);
  for (const [name, entry] of entries) {
    if (entry.dir) continue;
    const ext = name.split(".").pop().toLowerCase();
    if (!["csv","tsv","xlsx","xlsm","xls"].includes(ext)) continue;
    const blob = await entry.async("blob");
    // Convert to File for compat with existing handler
    const file = new File([blob], name.split("/").pop(), { type: blob.type || "application/octet-stream" });
    files.push(file);
  }
  return files;
}

async function loadXLSX() {
  if (typeof window !== "undefined" && window.XLSX) return window.XLSX;
  if (typeof window !== "undefined" && window.__xlsxLoading) return window.__xlsxLoading;
  if (typeof window === "undefined") throw new Error("Window unavailable");
  
  window.__xlsxLoading = new Promise((resolve, reject) => {
    const existing = document.querySelector('script[data-xlsx-loader]');
    if (existing) {
      existing.addEventListener('load', () => resolve(window.XLSX));
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js';
    script.setAttribute('data-xlsx-loader', '1');
    script.onload = () => resolve(window.XLSX);
    script.onerror = () => reject(new Error('Không thể tải SheetJS từ CDN. Kiểm tra mạng internet.'));
    document.head.appendChild(script);
    // Timeout after 15s
    setTimeout(() => reject(new Error('Tải SheetJS timeout (15s)')), 15000);
  });
  return window.__xlsxLoading;
}

// Read file as workbook structure
async function readFileAsWorkbook(file) {
  const ext = file.name.split('.').pop().toLowerCase();
  const arrayBuffer = await file.arrayBuffer();
  
  if (ext === "csv" || ext === "tsv") {
    const text = new TextDecoder().decode(arrayBuffer);
    const sep = ext === "tsv" ? "\t" : (text.split("\n")[0].includes("\t") ? "\t" : ",");
    const lines = text.split(/\r?\n/).filter(l => l.trim());
    const rows = lines.map(line => {
      const cells = [];
      let cur = "", inQuote = false;
      for (let i = 0; i < line.length; i++) {
        const ch = line[i];
        if (ch === '"') inQuote = !inQuote;
        else if (ch === sep && !inQuote) { cells.push(cur.trim()); cur = ""; }
        else cur += ch;
      }
      cells.push(cur.trim());
      return cells.map(c => c.replace(/^"|"$/g, ""));
    });
    return {
      isCsv: true,
      sheets: [{ name: file.name, rows }],
      fileName: file.name,
    };
  }
  
  if (ext === "xlsx" || ext === "xlsm" || ext === "xls") {
    // Auto-load XLSX library if not loaded yet
    const XLSX = await loadXLSX();
    if (!XLSX) throw new Error("Không thể khởi tạo SheetJS");
    const wb = XLSX.read(arrayBuffer, { type: "array" });
    const sheets = wb.SheetNames.map(name => {
      const ws = wb.Sheets[name];
      const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" });
      return { name, rows };
    });
    return { isCsv: false, sheets, fileName: file.name };
  }
  
  throw new Error(`Định dạng .${ext} chưa được hỗ trợ. Hỗ trợ: CSV, TSV, XLSX, XLSM, XLS`);
}

function detectFileType(workbook) {
  const sheetNames = workbook.sheets.map(s => s.name);
  const allHeaders = [];
  workbook.sheets.forEach(sheet => {
    if (sheet.rows[0]) allHeaders.push(...sheet.rows[0].map(h => String(h||"").toLowerCase()));
  });

  const candidates = FILE_TYPE_DETECTORS.map(d => ({
    detector: d,
    score: d.detect({
      fileName: workbook.fileName,
      sheets: sheetNames,
      headers: allHeaders,
      isCsv: workbook.isCsv,
    }),
  })).filter(c => c.score > 0).sort((a,b) => b.score - a.score);

  return candidates;
}

// ─── Auto-tag rules: pattern matching for channel topic/dept ────────
// Returns { topic, dept, confidence, source: "pattern"|"ai"|"none" }
const AUTO_TAG_PATTERNS = [
  // Topic keywords → matches channel name
  { keywords:["music","song","vibes","melody","beat","audio","stella","lofi"], topic:"Music Vibes", dept:"Stella Music", weight:90 },
  { keywords:["asmr","relaxing","sleep","whisper"], topic:"Music ASMR", dept:"Stella Music", weight:85 },
  { keywords:["kids","baby","child","trẻ em","tre em"], topic:"Kids Songs", dept:"BU Diligo", weight:85 },
  { keywords:["lego","brick","block","build"], topic:"LEGO FUN", dept:"BU Diligo", weight:90 },
  { keywords:["roblox"], topic:"Roblox Story", dept:"BU Xaro", weight:95 },
  { keywords:["minecraft"], topic:"Minecraft", dept:"BU Xaro", weight:95 },
  { keywords:["unboxing","unpack","review"], topic:"Unboxing ASMR", dept:"BU Diligo", weight:80 },
  { keywords:["paper","origami","craft","handmade"], topic:"DIY Paper", dept:"BU Diligo", weight:80 },
  { keywords:["story","tale","truyện"], topic:"DIY Story", dept:"BU Diligo", weight:75 },
  { keywords:["cake","cooking","food","recipe","bake","mini"], topic:"Mini Cake", dept:"BU Diligo", weight:80 },
  { keywords:["hamster","pet","animal","dog","cat","puppy"], topic:"Animal Stories", dept:"BU FBN", weight:85 },
  { keywords:["cartoon","anime","toon"], topic:"Cartoons", dept:"BU FBN", weight:85 },
  { keywords:["brainrot","meme","viral","trend"], topic:"Brainrot", dept:"BU Diligo", weight:80 },
];

function ruleAutoTag(channelName) {
  if (!channelName) return null;
  const lower = channelName.toLowerCase();
  let best = null;
  for (const rule of AUTO_TAG_PATTERNS) {
    for (const kw of rule.keywords) {
      if (lower.includes(kw.toLowerCase())) {
        if (!best || rule.weight > best.weight) {
          best = { topic: rule.topic, dept: rule.dept, weight: rule.weight, matched: kw };
        }
      }
    }
  }
  return best;
}

// Run auto-tag on a list of channels: returns proposed updates without applying
function suggestAutoTags(channels) {
  const suggestions = [];
  for (const ch of channels) {
    if (ch.topic && ch.dept) continue; // already tagged
    const r = ruleAutoTag(ch.name);
    if (r) {
      suggestions.push({
        channelId: ch.id,
        channelName: ch.name,
        currentTopic: ch.topic || "",
        currentDept: ch.dept || "",
        suggestedTopic: r.topic,
        suggestedDept: r.dept,
        confidence: r.weight,
        matched: r.matched,
        source: "pattern",
      });
    }
  }
  return suggestions;
}

// ─── AI-powered file type suggestion (when no detector matches) ────
async function aiSuggestFileType(workbook, callClaudeFn) {
  try {
    const sample = workbook.sheets[0]?.rows.slice(0, 5).map(r => r.slice(0, 8)).map(r => r.join(" | ")).join("\n") || "";
    const detectorList = FILE_TYPE_DETECTORS.map(d => `- ${d.id}: ${d.label}`).join("\n");
    const prompt = `Đây là 5 dòng đầu của file Excel/CSV không xác định được loại:

\`\`\`
${sample.slice(0, 1500)}
\`\`\`

Tên file: ${workbook.fileName}
Sheet: ${workbook.sheets.map(s => s.name).join(", ")}

Các loại file Meridian hỗ trợ:
${detectorList}

Trả về CHÍNH XÁC theo format JSON (không markdown):
{"id": "id-của-loại-phù-hợp-nhất-hoặc-null", "confidence": 0-100, "reason": "lý do ngắn"}`;

    const r = await callClaudeFn([{ role: "user", content: prompt }], "", "", { skipCache: true, maxTokens: 200 });
    if (typeof r !== "string" || r.startsWith("⚠️") || r.startsWith("❌")) return null;
    // Extract JSON
    const m = r.match(/\{[\s\S]*?\}/);
    if (!m) return null;
    try {
      const parsed = JSON.parse(m[0]);
      if (parsed.id && FILE_TYPE_DETECTORS.find(d => d.id === parsed.id)) return parsed;
    } catch {}
    return null;
  } catch { return null; }
}

// ═══════════════════════════════════════════════════════════════════
// ─── UNIFIED IMPORT VIEW — gộp Smart + Bulk Upload vào 1 ──────────
// Drop 1 file hoặc nhiều file/ZIP → tự detect + import tất cả
// ═══════════════════════════════════════════════════════════════════
function UnifiedImportView({ state, setState, importHistory, setImportHistory, toast }) {
  const C = useC();
  const [files, setFiles] = useState([]); // [{file, status, detector, parsed, hash, dup, error}]
  const [processing, setProcessing] = useState(false);
  const [report, setReport] = useState(null);
  const [showInstructions, setShowInstructions] = useState(true);
  const fileInputRef = useRef(null);
  const dropRef = useRef(null);

  const expandFiles = async (rawFiles) => {
    const expanded = [];
    for (const f of rawFiles) {
      if (f.name.toLowerCase().endsWith(".zip")) {
        try {
          const inner = await extractZipFiles(f);
          expanded.push(...inner);
          toast?.(`📦 Giải nén ${f.name}: ${inner.length} file`, "info");
        } catch (e) {
          toast?.(`Lỗi giải nén ${f.name}: ${e.message}`, "error");
        }
      } else {
        expanded.push(f);
      }
    }
    return expanded;
  };

  const handleDrop = async (rawFiles) => {
    if (!rawFiles || rawFiles.length === 0) return;
    const expanded = await expandFiles(rawFiles);
    const validExts = ["csv","tsv","xlsx","xlsm","xls"];
    const valid = expanded.filter(f => validExts.includes(f.name.split(".").pop().toLowerCase()));
    if (valid.length === 0) {
      toast?.("Không có file hợp lệ. Cần CSV/Excel hoặc ZIP chứa CSV/Excel.", "warning");
      return;
    }

    // Init list + analyze each
    setFiles(prev => [...prev, ...valid.map(f => ({ file: f, status: "analyzing" }))]);

    // Analyze each file (detect type + compute hash)
    for (const f of valid) {
      try {
        const buf = await f.arrayBuffer();
        const hash = await sha256Buffer(buf);
        const dup = (importHistory || []).find(h => h.fileHash === hash);
        const wb = await readFileAsWorkbook(f);
        const cands = detectFileType(wb);
        const detector = cands[0]?.detector || null;
        const parsed = detector ? detector.parse(wb) : null;
        setFiles(prev => prev.map(p => p.file === f ? {
          ...p,
          status: dup ? "duplicate" : (detector ? "ready" : "unknown"),
          detector, parsed, hash, dup, error: null
        } : p));
      } catch (e) {
        setFiles(prev => prev.map(p => p.file === f ? { ...p, status: "error", error: e.message } : p));
      }
    }
  };

  const onDropEvt = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    dropRef.current?.classList.remove("dragging");
    handleDrop([...e.dataTransfer.files]);
  };

  const onPick = (e) => handleDrop([...e.target.files]);

  const removeFile = (idx) => setFiles(prev => prev.filter((_,i) => i !== idx));
  const clearAll = () => { setFiles([]); setReport(null); };

  const processAll = async () => {
    const ready = files.filter(f => f.status === "ready");
    if (ready.length === 0) { toast?.("Không có file nào sẵn sàng", "warning"); return; }
    // Block if any CMS_CHANNEL_REPORT file hasn't picked a CMS yet
    const missingCms = ready.filter(f => f.detector?.requiresCmsId && !f.parsed?.cmsId);
    if (missingCms.length > 0) {
      toast?.(`⚠️ Cần chọn CMS đích cho ${missingCms.length} file trước khi import`, "warning");
      return;
    }
    setProcessing(true);
    const results = [];
    let totalCreated = 0, totalUpdated = 0, totalErrors = 0;

    for (const item of ready) {
      try {
        // Mark as importing
        setFiles(prev => prev.map(p => p === item ? { ...p, status: "importing" } : p));
        const result = item.detector.apply(item.parsed, state, setState);
        const created = result.created || 0;
        const updated = result.updated || 0;
        totalCreated += created;
        totalUpdated += updated;
        // Add to import history
        setImportHistory(prev => [{
          id: `IMP${Date.now()}_${Math.random().toString(36).slice(2,6)}`,
          filename: item.file.name,
          fileHash: item.hash,
          type: item.detector.label,
          timestamp: new Date().toISOString(),
          rows: item.parsed?.items?.length || 0,
          size: item.file.size,
          ...result,
        }, ...prev].slice(0, 100));
        setFiles(prev => prev.map(p => p === item ? { ...p, status: "done", result: { created, updated } } : p));
        results.push({ file: item.file.name, type: item.detector.label, created, updated });
        await new Promise(r => setTimeout(r, 200)); // gentle pacing
      } catch (e) {
        totalErrors++;
        setFiles(prev => prev.map(p => p === item ? { ...p, status: "error", error: e.message } : p));
      }
    }

    // Run final relink to heal FK references
    setState(s => migrateAndRelink({ ...s, _linkageVersion: 0 }));

    setReport({
      totalFiles: results.length,
      totalCreated,
      totalUpdated,
      totalErrors,
      breakdown: results,
      finishedAt: new Date().toISOString(),
    });
    setProcessing(false);
    toast?.(`🎉 Import xong ${results.length} file: ${totalCreated} mới, ${totalUpdated} cập nhật`, "success");
    bcEmit("bulk-import", { count: results.length, created: totalCreated });
  };

  const statusColor = (s) => ({
    analyzing: C.muted,
    ready: C.green,
    duplicate: C.amber,
    unknown: C.amber,
    importing: C.blue,
    done: C.green,
    error: C.red,
  }[s] || C.muted);

  const statusLabel = (s) => ({
    analyzing: "🔍 Đang phân tích",
    ready: "✅ Sẵn sàng",
    duplicate: "⚠️ Đã từng import",
    unknown: "❓ Không nhận diện",
    importing: "⏳ Đang import",
    done: "✅ Hoàn tất",
    error: "❌ Lỗi",
  }[s] || s);

  return (
    <div style={{padding:"20px 28px",overflowY:"auto",height:"100%",background:C.bg}}>
      <div style={{marginBottom:14,display:"flex",justifyContent:"space-between",alignItems:"flex-end",flexWrap:"wrap",gap:10}}>
        <div>
          <div style={{fontFamily:"'Fraunces',serif",fontWeight:500,fontSize:22,color:C.ink}}>📥 Nhập dữ liệu</div>
          <div style={{fontSize:11,color:C.muted}}>
            Drop <strong>1 file</strong>, <strong>nhiều file CSV/Excel</strong>, hoặc <strong>1 ZIP</strong> chứa tất cả → tự detect + import song song.
          </div>
        </div>
        <Btn ghost icon={Info} onClick={()=>setShowInstructions(s=>!s)}>
          {showInstructions ? "Ẩn hướng dẫn" : "Xem hướng dẫn"}
        </Btn>
      </div>

      {/* 📖 Instructions Card — collapsible */}
      {showInstructions && (
        <Card style={{padding:18,marginBottom:14,borderLeft:`3px solid ${C.ai}`,background:C.aiSoft+"40"}}>
          <div style={{fontFamily:"'Fraunces',serif",fontWeight:500,fontSize:14,color:C.ink,marginBottom:10}}>
            📖 Hướng dẫn 4 bước
          </div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(220px,1fr))",gap:10,marginBottom:14}}>
            {[
              { n:1, t:"Export từ MCN/CMS", d:"Vào YouTube CMS qdsense / Studio → tải reports CSV/Excel" },
              { n:2, t:"(Tuỳ chọn) Nén ZIP", d:"Nếu có nhiều file: chọn tất cả → Right-click → Send to → ZIP" },
              { n:3, t:"Drop vào đây", d:"Kéo file/ZIP vào ô bên dưới → hệ thống tự nhận diện loại" },
              { n:4, t:"Click Import", d:"Xem preview, bấm '🚀 Import' → toàn bộ data sync vào hệ thống" },
            ].map(s => (
              <div key={s.n} style={{padding:10,background:C.card,borderRadius:5,border:`1px solid ${C.borderSoft}`}}>
                <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:4}}>
                  <span style={{width:22,height:22,borderRadius:"50%",background:C.ai,color:"#FFF",display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:600}}>{s.n}</span>
                  <span style={{fontSize:12,fontWeight:500,color:C.ink}}>{s.t}</span>
                </div>
                <div style={{fontSize:10,color:C.muted,lineHeight:1.5}}>{s.d}</div>
              </div>
            ))}
          </div>

          <div style={{fontSize:11,fontWeight:500,color:C.ink,marginBottom:6}}>📋 Loại file hệ thống tự nhận diện:</div>
          <div style={{display:"flex",flexWrap:"wrap",gap:6,fontSize:10,marginBottom:10}}>
            {[
              "🎬 Channel List (channels)",
              "📺 Video Performance Report",
              "💰 Partner Revenue Sharing",
              "⚠️ Violations / Strike list",
              "📊 AdSense Report (1_1)",
              "📈 Traffic Source",
              "🔍 Product Inspection",
            ].map((t,i) => (
              <Pill key={i} color="ai">{t}</Pill>
            ))}
          </div>

          <div style={{fontSize:11,color:C.text,padding:8,background:C.card,borderRadius:4,marginTop:10}}>
            💡 <strong>Mẹo nhanh:</strong>
            <ul style={{margin:"4px 0 0 18px",padding:0,fontSize:10,color:C.muted,lineHeight:1.6}}>
              <li>Hệ thống tự dedupe theo <strong>SHA-256 hash</strong> — file giống nhau import lần 2 sẽ bị flag</li>
              <li>Nếu AI key được cấu hình + file lạ không match: <strong>AI tự đề xuất loại file</strong></li>
              <li>Sau import: tự <strong>relink FK</strong> giữa channels ↔ videos ↔ violations</li>
              <li>Có thể import file rỗng/lỗi → hệ thống skip, không crash batch</li>
            </ul>
          </div>
        </Card>
      )}

      {/* Drop zone */}
      <div ref={dropRef}
        onDrop={onDropEvt}
        onDragOver={e=>{e.preventDefault();e.stopPropagation();dropRef.current?.classList.add("dragging");}}
        onDragLeave={()=>dropRef.current?.classList.remove("dragging")}
        onClick={()=>fileInputRef.current?.click()}
        style={{padding:36,border:`2px dashed ${C.accent}`,borderRadius:8,background:C.bgAlt,
          textAlign:"center",cursor:"pointer",marginBottom:14,transition:"all 0.2s"}}>
        <FileUp size={42} style={{color:C.accent,marginBottom:10}}/>
        <div style={{fontSize:15,fontWeight:500,color:C.ink,marginBottom:6}}>
          Kéo thả file vào đây hoặc click để chọn
        </div>
        <div style={{fontSize:11,color:C.muted,marginBottom:6}}>
          Hỗ trợ: <code>.csv</code> · <code>.xlsx</code> · <code>.xls</code> · <code>.zip</code> chứa các file trên
        </div>
        <div style={{fontSize:10,color:C.muted}}>
          ✨ Có thể chọn 1 file (preview chi tiết) hoặc nhiều file cùng lúc (batch mode)
        </div>
        <input ref={fileInputRef} type="file" multiple accept=".csv,.tsv,.xlsx,.xlsm,.xls,.zip"
          onChange={onPick} style={{display:"none"}}/>
      </div>

      {/* File list */}
      {files.length > 0 && (
        <Card style={{padding:14,marginBottom:14}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
            <div style={{fontFamily:"'Fraunces',serif",fontWeight:500,fontSize:14,color:C.ink}}>
              📋 Danh sách ({files.length} file · {files.filter(f=>f.status==="ready").length} sẵn sàng)
            </div>
            <div style={{display:"flex",gap:6}}>
              {!processing && files.filter(f=>f.status==="ready").length > 0 && (
                <Btn primary onClick={processAll} icon={Zap}>
                  🚀 Import {files.filter(f=>f.status==="ready").length} file cùng lúc
                </Btn>
              )}
              <Btn ghost onClick={clearAll} icon={X}>Clear</Btn>
            </div>
          </div>

          <div style={{display:"flex",flexDirection:"column",gap:6}}>
            {files.map((item, i) => {
              const needsCms = item.status === "ready" && item.detector?.requiresCmsId;
              const cmsReady = !needsCms || !!item.parsed?.cmsId;
              const cmsList  = state.cmsList || KUDO_CMS_LIST;
              return (
              <div key={i} style={{padding:"10px 12px",background:C.bgAlt,borderRadius:5,
                borderLeft:`3px solid ${statusColor(item.status)}`}}>
                <div style={{display:"flex",alignItems:"center",gap:10}}>
                  <FileText size={14} style={{color:C.muted,flexShrink:0}}/>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:12,fontWeight:500,color:C.ink,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{item.file.name}</div>
                    <div style={{fontSize:10,color:C.muted,marginTop:2}}>
                      {(item.file.size/1024).toFixed(1)} KB
                      {item.detector && ` · 🎯 ${item.detector.label}`}
                      {item.parsed?.items && ` · ${item.parsed.items.length} dòng`}
                      {item.dup && ` · ⚠️ giống ${item.dup.filename} (${new Date(item.dup.timestamp).toLocaleDateString("vi-VN")})`}
                    </div>
                    {item.error && <div style={{fontSize:10,color:C.red,marginTop:2}}>❌ {item.error}</div>}
                    {item.result && <div style={{fontSize:10,color:C.green,marginTop:2}}>✅ {item.result.created} mới · {item.result.updated} cập nhật</div>}
                  </div>
                  <Pill color={
                    item.status==="done"||item.status==="ready"?"green":
                    item.status==="error"?"red":
                    item.status==="duplicate"||item.status==="unknown"?"amber":"blue"
                  }>{statusLabel(item.status)}</Pill>
                  {!processing && item.status !== "importing" && (
                    <button onClick={()=>removeFile(i)} style={{background:"none",border:"none",cursor:"pointer",padding:4}}>
                      <X size={14} style={{color:C.muted}}/>
                    </button>
                  )}
                </div>
                {/* CMS selector — only shown for CMS_CHANNEL_REPORT type */}
                {needsCms && (
                  <div style={{marginTop:8,display:"flex",alignItems:"center",gap:8,paddingLeft:24}}>
                    <span style={{fontSize:10,color:C.amber,whiteSpace:"nowrap"}}>
                      ⚠️ Chọn CMS đích:
                    </span>
                    <Select
                      value={item.parsed?.cmsId || ""}
                      onChange={e => {
                        const cmsId = e.target.value;
                        setFiles(prev => prev.map((p, j) => j !== i ? p : {
                          ...p,
                          parsed: { ...p.parsed, cmsId },
                          status: cmsId ? "ready" : "ready",
                        }));
                      }}
                      style={{flex:1,maxWidth:280,fontSize:11,padding:"4px 8px"}}
                    >
                      <option value="">-- Chọn CMS --</option>
                      {cmsList.map(c => (
                        <option key={c.id} value={c.id}>{c.name} ({c.id})</option>
                      ))}
                    </Select>
                    {item.parsed?.cmsId && (
                      <span style={{fontSize:10,color:C.green}}>✓ Sẵn sàng import</span>
                    )}
                  </div>
                )}
              </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* Final report */}
      {report && (
        <Card style={{padding:18,borderLeft:`3px solid ${C.green}`,marginBottom:14}}>
          <div style={{fontFamily:"'Fraunces',serif",fontWeight:500,fontSize:16,color:C.ink,marginBottom:10}}>
            🎉 Báo cáo Bulk Import
          </div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(140px,1fr))",gap:10,marginBottom:14}}>
            <div style={{padding:10,background:C.bgAlt,borderRadius:5}}>
              <div style={{fontSize:9,color:C.muted}}>File processed</div>
              <div style={{fontFamily:"'Fraunces',serif",fontSize:22,color:C.ink}}>{report.totalFiles}</div>
            </div>
            <div style={{padding:10,background:C.greenSoft,borderRadius:5}}>
              <div style={{fontSize:9,color:C.muted}}>Mới</div>
              <div style={{fontFamily:"'Fraunces',serif",fontSize:22,color:C.green}}>{report.totalCreated}</div>
            </div>
            <div style={{padding:10,background:C.bgAlt,borderRadius:5}}>
              <div style={{fontSize:9,color:C.muted}}>Cập nhật</div>
              <div style={{fontFamily:"'Fraunces',serif",fontSize:22,color:C.ink}}>{report.totalUpdated}</div>
            </div>
            {report.totalErrors > 0 && (
              <div style={{padding:10,background:C.redSoft,borderRadius:5}}>
                <div style={{fontSize:9,color:C.muted}}>Lỗi</div>
                <div style={{fontFamily:"'Fraunces',serif",fontSize:22,color:C.red}}>{report.totalErrors}</div>
              </div>
            )}
          </div>
          <div style={{fontSize:11,color:C.text,marginBottom:8}}>📋 Chi tiết:</div>
          <div style={{display:"flex",flexDirection:"column",gap:4}}>
            {report.breakdown.map((b,i) => (
              <div key={i} style={{display:"flex",gap:8,fontSize:11,padding:"4px 8px",background:C.bgAlt,borderRadius:3}}>
                <span style={{color:C.muted,fontFamily:"monospace",minWidth:140,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{b.file}</span>
                <Pill color="blue">{b.type}</Pill>
                <span style={{color:C.green}}>+{b.created}</span>
                {b.updated > 0 && <span style={{color:C.muted}}>~{b.updated}</span>}
              </div>
            ))}
          </div>
          <div style={{marginTop:10,fontSize:10,color:C.muted}}>
            ⏰ Hoàn tất: {new Date(report.finishedAt).toLocaleString("vi-VN")} ·
            🔗 FK linkage: tự động re-relink toàn bộ
          </div>
        </Card>
      )}

      {/* 📜 Import History */}
      {importHistory.length > 0 && (
        <Card style={{padding:14,marginTop:14}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
            <div style={{fontFamily:"'Fraunces',serif",fontWeight:500,fontSize:14,color:C.ink}}>
              📜 Lịch sử import ({importHistory.length})
            </div>
            <Btn ghost icon={Download} onClick={()=>{
              const csv = "Time,File,Type,Rows,Created,Updated,Hash\n" + importHistory.map(h =>
                `"${h.timestamp}","${h.filename}","${h.type}",${h.rows||0},${h.created||0},${h.updated||0},"${(h.fileHash||"").slice(0,16)}"`
              ).join("\n");
              const blob = new Blob([csv], { type: "text/csv" });
              const a = document.createElement("a");
              a.href = URL.createObjectURL(blob);
              a.download = `import-history-${new Date().toISOString().slice(0,10)}.csv`;
              a.click();
              toast?.("✅ Đã export CSV", "success");
            }}>Export CSV</Btn>
          </div>
          <div style={{maxHeight:340,overflow:"auto"}}>
            <table style={{width:"100%",borderCollapse:"collapse",fontSize:11}}>
              <thead style={{background:C.bgAlt,position:"sticky",top:0}}>
                <tr>{["Thời gian","File","Loại","Rows","Mới","Cập nhật"].map(h => (
                  <th key={h} style={{textAlign:"left",fontSize:9,fontWeight:600,letterSpacing:"0.14em",textTransform:"uppercase",color:C.muted,padding:"8px 10px"}}>{h}</th>
                ))}</tr>
              </thead>
              <tbody>
                {importHistory.slice(0, 50).map((h,i) => (
                  <tr key={h.id||i} style={{borderTop:`1px solid ${C.borderSoft}`}}>
                    <td style={{padding:"7px 10px",fontSize:10,color:C.muted,fontFamily:"monospace",whiteSpace:"nowrap"}}>
                      {h.timestamp ? new Date(h.timestamp).toLocaleString("vi-VN",{hour12:false}) : "—"}
                    </td>
                    <td style={{padding:"7px 10px",fontSize:11,color:C.ink,fontWeight:500,maxWidth:200,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
                      {h.filename}
                    </td>
                    <td style={{padding:"7px 10px"}}><Pill color="blue">{h.type}</Pill></td>
                    <td style={{padding:"7px 10px",fontFamily:"monospace",fontSize:10}}>{h.rows||0}</td>
                    <td style={{padding:"7px 10px",fontFamily:"monospace",color:C.green,fontSize:10}}>+{h.created||0}</td>
                    <td style={{padding:"7px 10px",fontFamily:"monospace",color:C.muted,fontSize:10}}>~{h.updated||0}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}

function SmartUpload({ state, setState, importHistory, setImportHistory, toast }) {
  const C = useC();
  const [step, setStep] = useState("upload"); // upload | detected | importing | done
  const [file, setFile] = useState(null);
  const [workbook, setWorkbook] = useState(null);
  const [candidates, setCandidates] = useState([]);
  const [selectedDetector, setSelectedDetector] = useState(null);
  const [parsed, setParsed] = useState(null);
  const [importResult, setImportResult] = useState(null);
  const [reading, setReading] = useState(false);
  const fileInputRef = useRef(null);

  const [fileHash, setFileHash] = useState(null);
  const [duplicateOf, setDuplicateOf] = useState(null);

  const handleFile = async (f) => {
    if (!f) return;
    const ext = f.name.split('.').pop().toLowerCase();
    if (!["csv","tsv","xlsx","xlsm","xls"].includes(ext)) {
      toast(`Định dạng .${ext} chưa được hỗ trợ. Hãy export sang CSV hoặc XLSX.`, "error");
      return;
    }
    setFile(f);
    setReading(true);
    setDuplicateOf(null);
    try {
      // Compute file hash for dedup
      const buf = await f.arrayBuffer();
      const hash = await sha256Buffer(buf);
      setFileHash(hash);
      const dup = (importHistory || []).find(h => h.fileHash === hash);
      if (dup) {
        setDuplicateOf(dup);
        toast(`File này đã được import ngày ${new Date(dup.timestamp).toLocaleDateString("vi-VN")}`, "warning");
      }

      const wb = await readFileAsWorkbook(f);
      setWorkbook(wb);
      const cands = detectFileType(wb);
      setCandidates(cands);
      if (cands.length > 0) {
        const top = cands[0];
        const p = top.detector.parse(wb);
        setSelectedDetector(top.detector);
        setParsed(p);
        toast(`Đã nhận diện: ${top.detector.label}`, "success");
      } else {
        toast("Không nhận diện được loại file. Đang hỏi AI...", "info");
        // Try AI suggestion
        const apiKey = lsGet("meridian-api-key", "") || window.MERIDIAN_API_KEY;
        const suggestion = await aiSuggestFileType(wb, (msgs, sys, _key, opts) => callClaude(msgs, sys, apiKey, opts));
        if (suggestion?.id) {
          const det = FILE_TYPE_DETECTORS.find(d => d.id === suggestion.id);
          if (det) {
            const p = det.parse(wb);
            setSelectedDetector(det);
            setParsed(p);
            setCandidates([{ detector: det, score: suggestion.confidence || 50, aiSuggested: true, reason: suggestion.reason }]);
            toast(`🤖 AI đề xuất: ${det.label} (${suggestion.confidence}% tin cậy)`, "success");
          }
        } else {
          toast("Không nhận diện được loại file này. Bạn có thể chọn thủ công.", "warning");
        }
      }
      setStep("detected");
    } catch(e) {
      toast(`Lỗi đọc file: ${e.message}`, "error");
    }
    setReading(false);
  };

  const onDrop = (e) => { e.preventDefault(); handleFile(e.dataTransfer.files[0]); };
  
  const switchDetector = (detector) => {
    setSelectedDetector(detector);
    try {
      const p = detector.parse(workbook);
      setParsed(p);
      toast(`Đã chuyển sang: ${detector.label}`, "info");
    } catch(e) {
      toast(`Lỗi parse: ${e.message}`, "error");
    }
  };

  const doImport = () => {
    if (!parsed || !selectedDetector) return;
    setStep("importing");
    setTimeout(() => {
      const result = selectedDetector.apply(parsed, state, setState);
      setImportResult(result);
      setImportHistory(prev => [{
        id: `IMP${Date.now()}`,
        filename: file.name,
        fileHash,
        type: selectedDetector.label,
        timestamp: new Date().toISOString(),
        rows: parsed.items?.length || 0,
        size: file.size,
        ...result,
      }, ...prev].slice(0, 50));
      setStep("done");
      toast(`Import xong! ${result.created || 0} mới, ${result.updated || 0} cập nhật`, "success");
      bcEmit("import", { type: selectedDetector.id, file: file.name });
    }, 600);
  };

  const reset = () => {
    setStep("upload"); setFile(null); setWorkbook(null);
    setCandidates([]); setSelectedDetector(null); setParsed(null); setImportResult(null);
    setFileHash(null); setDuplicateOf(null);
  };

  return (
    <div style={{padding:"20px 28px",overflowY:"auto",height:"100%"}}>
      {/* Info banner */}
      <div style={{padding:"12px 16px",background:C.aiSoft,borderRadius:6,marginBottom:16,
        display:"flex",alignItems:"flex-start",gap:10,border:`1px solid ${C.ai}33`}}>
        <Sparkles size={16} style={{color:C.ai,marginTop:2}}/>
        <div>
          <div style={{fontSize:12,fontWeight:500,color:C.ai,marginBottom:4}}>Smart Upload v5 — Tự động nhận diện 8 loại file</div>
          <div style={{fontSize:11,color:C.text,lineHeight:1.6}}>
            Hỗ trợ: Bảng kênh hệ thống · Vi phạm · Báo cáo doanh thu Google (USD/GBP/CAD) · CMS Analytics · Doanh thu chia sẻ partner · AdSense · Kiểm định sản phẩm · Doanh thu theo chủ đề KUDO
            <br/>✅ Hỗ trợ CSV, XLSX, XLSM, XLS · Thư viện SheetJS tự động tải khi cần (KHÔNG phải sửa index.html nữa!)
          </div>
        </div>
      </div>

      {step === "upload" && (
        <Card style={{padding:30}}>
          <div onClick={()=>fileInputRef.current?.click()}
            onDragOver={e=>e.preventDefault()}
            onDrop={onDrop}
            style={{border:`2px dashed ${C.border}`,borderRadius:8,padding:60,textAlign:"center",
              cursor:reading?"wait":"pointer",background:C.bgAlt}}>
            {reading ? (
              <>
                <div style={{width:40,height:40,border:`3px solid ${C.borderSoft}`,borderTopColor:C.accent,
                  borderRadius:"50%",animation:"spin 0.8s linear infinite",margin:"0 auto 14px"}}/>
                <div style={{fontSize:13,color:C.text}}>Đang đọc file...</div>
              </>
            ) : (
              <>
                <FileUp size={44} style={{color:C.muted,marginBottom:14}}/>
                <div style={{fontSize:14,fontWeight:500,color:C.ink,marginBottom:6}}>Kéo thả file vào đây</div>
                <div style={{fontSize:11,color:C.muted}}>hoặc click để chọn · Hỗ trợ CSV, XLSX, XLSM</div>
                <input ref={fileInputRef} type="file" accept=".csv,.tsv,.xlsx,.xlsm,.xls" 
                  onChange={e=>handleFile(e.target.files[0])} style={{display:"none"}}/>
              </>
            )}
          </div>

          {importHistory.length > 0 && (
            <div style={{marginTop:24}}>
              <div style={{fontFamily:"'Fraunces',serif",fontWeight:500,fontSize:14,color:C.ink,marginBottom:10}}>Lịch sử Import</div>
              {importHistory.slice(0,8).map(h => (
                <div key={h.id} style={{display:"flex",alignItems:"center",gap:10,padding:"9px 0",borderBottom:`1px solid ${C.borderSoft}`}}>
                  <FileSpreadsheet size={14} style={{color:C.muted}}/>
                  <div style={{flex:1}}>
                    <div style={{fontSize:12,color:C.ink}}>{h.filename}</div>
                    <div style={{fontSize:10,color:C.muted}}>{h.type} · {new Date(h.timestamp).toLocaleString("vi-VN")}</div>
                  </div>
                  <div style={{fontSize:10,fontFamily:"'JetBrains Mono',monospace",color:C.muted}}>
                    <span style={{color:C.green}}>+{h.created||0}</span> · <span style={{color:C.blue}}>~{h.updated||0}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {step === "detected" && workbook && (
        <Card style={{padding:24}}>
          <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:18}}>
            <FileSpreadsheet size={18} style={{color:C.accent}}/>
            <div style={{flex:1}}>
              <div style={{fontFamily:"'Fraunces',serif",fontWeight:500,fontSize:15,color:C.ink}}>{file.name}</div>
              <div style={{fontSize:11,color:C.muted}}>{workbook.sheets.length} sheet · {workbook.sheets[0].rows.length} dòng</div>
            </div>
            <Btn ghost onClick={reset}>Đổi file</Btn>
          </div>

          <div style={{fontSize:11,fontWeight:500,color:C.ink,marginBottom:8}}>Loại file (đã tự nhận diện)</div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill, minmax(220px, 1fr))",gap:8,marginBottom:18}}>
            {FILE_TYPE_DETECTORS.map(d => {
              const cand = candidates.find(c => c.detector.id === d.id);
              const isSel = selectedDetector?.id === d.id;
              const Icon = d.icon;
              return (
                <button key={d.id} onClick={()=>switchDetector(d)}
                  style={{display:"flex",alignItems:"center",gap:10,padding:"10px 12px",
                    background:isSel?C.accentSoft:C.bgAlt,
                    border:`1px solid ${isSel?C.accent:C.border}`,
                    borderRadius:6,cursor:"pointer",textAlign:"left"}}>
                  <Icon size={16} style={{color:isSel?C.accent:C.muted,flexShrink:0}}/>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:11,fontWeight:500,color:isSel?C.accent:C.text,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{d.label}</div>
                    {cand && <div style={{fontSize:9,color:C.muted,marginTop:1}}>Match: {cand.score}%</div>}
                  </div>
                  {isSel && <Check size={14} style={{color:C.accent}}/>}
                </button>
              );
            })}
          </div>

          {parsed && (
            <>
              {duplicateOf && (
                <div style={{padding:"12px 14px",background:C.amberSoft,borderRadius:5,
                  borderLeft:`3px solid ${C.amber}`,marginBottom:10,fontSize:12,color:C.amber}}>
                  ⚠️ <strong>File trùng lặp!</strong> File này đã được import vào{" "}
                  <strong>{new Date(duplicateOf.timestamp).toLocaleString("vi-VN")}</strong>{" "}
                  ({duplicateOf.created || 0} bản ghi mới, {duplicateOf.updated || 0} cập nhật).
                  <br/>Import lại sẽ tạo bản ghi trùng lặp. Bạn có chắc?
                </div>
              )}
              <div style={{padding:"12px 14px",background:C.greenSoft,borderRadius:5,
                borderLeft:`3px solid ${C.green}`,marginBottom:16,fontSize:12,color:C.text}}>
                ✓ {parsed.summary}
                {fileHash && <div style={{fontSize:10,color:C.muted,marginTop:4,fontFamily:"monospace"}}>SHA-256: {fileHash.slice(0,16)}...</div>}
              </div>

              {parsed.items && parsed.items.length > 0 && (
                <>
                  <div style={{fontSize:11,fontWeight:500,color:C.ink,marginBottom:8}}>Preview 5 bản ghi đầu</div>
                  <div style={{overflowX:"auto",border:`1px solid ${C.border}`,borderRadius:4,marginBottom:18,maxHeight:200,overflowY:"auto"}}>
                    <table style={{width:"100%",borderCollapse:"collapse",fontSize:10}}>
                      <thead style={{background:C.bgAlt,position:"sticky",top:0}}>
                        <tr>{Object.keys(parsed.items[0]).slice(0,8).map(k=>(
                          <th key={k} style={{padding:"6px 8px",textAlign:"left",fontWeight:500,color:C.text,whiteSpace:"nowrap",borderRight:`1px solid ${C.border}`}}>{k}</th>
                        ))}</tr>
                      </thead>
                      <tbody>{parsed.items.slice(0,5).map((it,i)=>(
                        <tr key={i} style={{borderTop:`1px solid ${C.borderSoft}`}}>
                          {Object.keys(parsed.items[0]).slice(0,8).map(k=>(
                            <td key={k} style={{padding:"5px 8px",color:C.text,whiteSpace:"nowrap",borderRight:`1px solid ${C.borderSoft}`,fontFamily:"'JetBrains Mono',monospace",maxWidth:200,overflow:"hidden",textOverflow:"ellipsis"}}>{String(it[k]||"").slice(0,40)}</td>
                          ))}
                        </tr>
                      ))}</tbody>
                    </table>
                  </div>
                </>
              )}

              <div style={{display:"flex",justifyContent:"flex-end",gap:8}}>
                <Btn ghost onClick={reset}>Hủy</Btn>
                <Btn primary onClick={doImport} icon={Upload}>Bắt đầu Import</Btn>
              </div>
            </>
          )}
        </Card>
      )}

      {step === "importing" && (
        <Card style={{padding:50,textAlign:"center"}}>
          <div style={{width:50,height:50,border:`3px solid ${C.bgAlt}`,borderTopColor:C.accent,
            borderRadius:"50%",animation:"spin 0.8s linear infinite",margin:"0 auto 16px"}}/>
          <div style={{fontSize:14,fontWeight:500,color:C.ink}}>Đang import...</div>
        </Card>
      )}

      {step === "done" && importResult && (
        <Card style={{padding:40,textAlign:"center"}}>
          <div style={{width:50,height:50,background:C.greenSoft,borderRadius:"50%",
            display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 16px"}}>
            <Check size={28} style={{color:C.green}}/>
          </div>
          <div style={{fontFamily:"'Fraunces',serif",fontWeight:500,fontSize:20,color:C.ink,marginBottom:6}}>Import hoàn tất!</div>
          <div style={{fontSize:12,color:C.muted,marginBottom:6}}>
            <span style={{color:C.green,fontWeight:500}}>+{importResult.created || 0}</span> bản ghi mới · 
            <span style={{color:C.blue,fontWeight:500,marginLeft:6}}>~{importResult.updated || 0}</span> cập nhật
          </div>
          {importResult.note && <div style={{fontSize:11,color:C.muted,marginBottom:16}}>{importResult.note}</div>}
          <div style={{display:"flex",gap:8,justifyContent:"center",marginTop:16}}>
            <Btn primary onClick={reset} icon={Upload}>Import file khác</Btn>
          </div>
        </Card>
      )}
    </div>
  );
}
// ─── OVERVIEW (new landing page — first thing user sees) ──────────
const OverviewPage = ({ state, currentUser, onNavigate, dailyStats, brand }) => {
  const C = useC();
  const t = useT().t;
  const { channels, partners, violations, importHistory, productInspections } = state;
  const cmsList = state.cmsList || KUDO_CMS_LIST;
  // ─── Period selector: time-based filter for KPIs ────────────────────
  const [period, setPeriod] = useState("30d"); // 7d / 30d / 90d / 6m / 1y / all / custom
  const [periodCustom, setPeriodCustom] = useState({ from:"", to:"" });
  const [showCompare, setShowCompare] = useState(false);

  const periodWindow = useMemo(() => {
    const now = Date.now();
    const day = 86400000;
    if (period === "all") return { from: 0, to: now, days: 999, label:"Toàn thời gian" };
    if (period === "custom" && periodCustom.from && periodCustom.to) {
      return { from: new Date(periodCustom.from).getTime(), to: new Date(periodCustom.to).getTime(), days: 0, label:`${periodCustom.from} → ${periodCustom.to}` };
    }
    const map = { "7d":[7,"7 ngày"], "30d":[30,"30 ngày"], "90d":[90,"90 ngày"], "6m":[180,"6 tháng"], "1y":[365,"1 năm"] };
    const [days, label] = map[period] || [30, "30 ngày"];
    return { from: now - days*day, to: now, days, label };
  }, [period, periodCustom]);

  // KPIs filtered by period (use partnerSharing/videoAnalytics if available, else fall back to monthlyRevenue snapshot)
  const stats = useMemo(() => {
    const psh = state.partnerSharing || [];
    const vid = state.videoAnalytics || [];
    const inWindow = (dateStr) => {
      if (!dateStr) return false;
      const t = new Date(dateStr).getTime();
      return t >= periodWindow.from && t <= periodWindow.to;
    };
    let periodRev = 0, periodViews = 0;
    psh.filter(s => inWindow(s.date || s.month)).forEach(s => {
      periodRev += Number(s.revenue) || 0;
      periodViews += Number(s.views) || 0;
    });
    vid.filter(v => inWindow(v.date || v.publishedAt || v.month)).forEach(v => {
      periodRev += Number(v.revenue) || 0;
      periodViews += Number(v.views) || 0;
    });
    // If no time-series data → use snapshot scaled by days
    const snapshotRev = channels.reduce((s,c) => s + c.monthlyRevenue, 0);
    const snapshotViews = channels.reduce((s,c) => s + c.monthlyViews, 0);
    if (periodRev === 0 && periodWindow.days > 0) {
      const scale = periodWindow.days / 30;
      periodRev = snapshotRev * scale;
      periodViews = snapshotViews * scale;
    }
    const totalSubs = channels.reduce((s,c) => s + c.subscribers, 0);
    const monetized = channels.filter(c => c.monetization === "Monetized").length;
    const demonetized = channels.filter(c => c.monetization === "Demonetized").length;
    const critical = channels.filter(c => c.health === "Critical").length;
    const periodViolations = (violations||[]).filter(v => inWindow(v.date)).length;
    return {
      totalRev: periodRev || snapshotRev,
      totalViews: periodViews || snapshotViews,
      totalSubs, monetized, demonetized, critical,
      recentViolations: periodViolations,
      isProjected: periodRev === 0 && periodViews === 0
    };
  }, [channels, violations, state.partnerSharing, state.videoAnalytics, periodWindow]);

  // Reporting milestones: monthly breakdown across all available data
  const monthlyBreakdown = useMemo(() => {
    const map = new Map();
    const addMonth = (key, rev, views) => {
      if (!key || key === "—") return;
      if (!map.has(key)) map.set(key, { month: key, revenue: 0, views: 0, items: 0 });
      const e = map.get(key);
      e.revenue += Number(rev) || 0;
      e.views += Number(views) || 0;
      e.items++;
    };
    (state.partnerSharing || []).forEach(s => addMonth(s.month || (s.date||"").slice(0,7), s.revenue, s.views));
    (state.videoAnalytics || []).forEach(v => addMonth(v.month || (v.date||v.publishedAt||"").slice(0,7), v.revenue, v.views));
    (cmsList || []).forEach(cms => {
      if (cms.revFeb) addMonth("2026-02", cms.revFeb, 0);
      if (cms.revMar) addMonth("2026-03", cms.revMar, 0);
    });
    return [...map.values()].filter(m => m.month).sort((a,b) => String(a.month).localeCompare(String(b.month)));
  }, [state.partnerSharing, state.videoAnalytics, cmsList]);

  const cmsBreakdown = useMemo(() => {
    const map = {};
    channels.forEach(c => {
      if (!map[c.cms]) map[c.cms] = { name: c.cms, channels:0, revenue:0, views:0 };
      map[c.cms].channels++;
      map[c.cms].revenue += c.monthlyRevenue;
      map[c.cms].views += c.monthlyViews;
    });
    return Object.values(map).filter(x => x.name).sort((a,b) => b.revenue - a.revenue);
  }, [channels]);

  const topTopics = useMemo(() => {
    const map = {};
    channels.forEach(c => {
      const t = c.topic || c.category || "Khác";
      if (!map[t]) map[t] = { name: t, channels:0, revenue:0 };
      map[t].channels++;
      map[t].revenue += c.monthlyRevenue;
    });
    return Object.values(map).sort((a,b) => b.revenue - a.revenue).slice(0, 6);
  }, [channels]);

  const productSummary = useMemo(() => {
    const insp = productInspections || [];
    return {
      total: insp.length,
      pass: insp.filter(p => p.result === "ĐẠT").length,
      risk: insp.filter(p => p.result === "RỦI RO").length,
    };
  }, [productInspections]);

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return "Chào buổi sáng";
    if (h < 18) return "Chào buổi chiều";
    return "Chào buổi tối";
  })();

  return (
    <div style={{padding:"20px 28px",overflowY:"auto",height:"100%",background:C.bg}}>
      {/* Personalized greeting */}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-end",marginBottom:14,flexWrap:"wrap",gap:12}}>
        <div>
          <div style={{fontFamily:"'Fraunces',serif",fontWeight:500,fontSize:28,color:C.ink,letterSpacing:"-0.02em"}}>
            {greeting}, {currentUser?.fullName || "Admin"} 👋
          </div>
          <div style={{fontSize:12,color:C.muted,marginTop:4}}>
            Hôm nay là {new Date().toLocaleDateString("vi-VN", {weekday:"long", year:"numeric", month:"long", day:"numeric"})}
          </div>
        </div>
        {/* Period selector */}
        <div style={{display:"flex",gap:4,padding:4,background:C.bgAlt,borderRadius:6,flexWrap:"wrap"}}>
          {[
            {id:"7d", label:"7N"}, {id:"30d", label:"30N"}, {id:"90d", label:"90N"},
            {id:"6m", label:"6T"}, {id:"1y", label:"1N"}, {id:"all", label:"📅 All"},
            {id:"custom", label:"Tùy chỉnh"}
          ].map(p => (
            <button key={p.id} onClick={()=>setPeriod(p.id)}
              style={{padding:"5px 11px",fontSize:11,fontWeight:500,cursor:"pointer",border:"none",borderRadius:4,
                background:period===p.id ? C.ink : "transparent",
                color:period===p.id ? "#FFF" : C.text}}>
              {p.label}
            </button>
          ))}
        </div>
      </div>
      {period === "custom" && (
        <Card style={{padding:10,marginBottom:12,display:"flex",alignItems:"center",gap:10}}>
          <Calendar size={14} style={{color:C.muted}}/>
          <span style={{fontSize:11,color:C.muted}}>Từ:</span>
          <Input type="date" value={periodCustom.from} onChange={e=>setPeriodCustom(p=>({...p,from:e.target.value}))} style={{width:140}}/>
          <span style={{fontSize:11,color:C.muted}}>Đến:</span>
          <Input type="date" value={periodCustom.to} onChange={e=>setPeriodCustom(p=>({...p,to:e.target.value}))} style={{width:140}}/>
        </Card>
      )}

      {/* Hero KPIs */}
      <div style={{display:"grid",gridTemplateColumns:"2fr 1fr 1fr 1fr",gap:12,marginBottom:14}}>
        <Card style={{padding:20,background:`linear-gradient(135deg, ${C.ink} 0%, #1F2937 100%)`,color:"#FFF",border:"none"}}>
          <div style={{fontSize:9,fontWeight:600,letterSpacing:"0.18em",textTransform:"uppercase",opacity:0.7,marginBottom:6}}>
            Doanh thu · {periodWindow.label}{stats.isProjected && " (ước tính)"}
          </div>
          <div style={{fontFamily:"'Fraunces',serif",fontWeight:500,fontSize:34,letterSpacing:"-0.02em",lineHeight:1,marginBottom:8}}>
            {fmtMoney(stats.totalRev)}
          </div>
          <div style={{display:"flex",alignItems:"center",gap:8,fontSize:11,opacity:0.85}}>
            <Eye size={11}/> {fmt(stats.totalViews)} views ·
            <UserPlus size={11}/> {fmt(stats.totalSubs)} subs
          </div>
        </Card>
        <Card style={{padding:18}}>
          <div style={{fontSize:9,fontWeight:600,letterSpacing:"0.14em",textTransform:"uppercase",color:C.muted,marginBottom:6}}>Tổng kênh</div>
          <div style={{fontFamily:"'Fraunces',serif",fontWeight:500,fontSize:24,color:C.ink}}>{fmtFull(channels.length)}</div>
          <div style={{fontSize:10,color:C.green,marginTop:4}}>{stats.monetized} kiếm tiền</div>
        </Card>
        <Card style={{padding:18}}>
          <div style={{fontSize:9,fontWeight:600,letterSpacing:"0.14em",textTransform:"uppercase",color:C.muted,marginBottom:6}}>Critical</div>
          <div style={{fontFamily:"'Fraunces',serif",fontWeight:500,fontSize:24,color:C.red}}>{fmtFull(stats.critical)}</div>
          <div style={{fontSize:10,color:C.muted,marginTop:4}}>{stats.demonetized} demonetized</div>
        </Card>
        <Card style={{padding:18}}>
          <div style={{fontSize:9,fontWeight:600,letterSpacing:"0.14em",textTransform:"uppercase",color:C.muted,marginBottom:6}}>Vi phạm · {periodWindow.label}</div>
          <div style={{fontFamily:"'Fraunces',serif",fontWeight:500,fontSize:24,color:stats.recentViolations>0?C.amber:C.green}}>{fmtFull(stats.recentViolations)}</div>
          <div style={{fontSize:10,color:C.muted,marginTop:4}}>{(violations||[]).length} tổng cộng</div>
        </Card>
      </div>

      {/* Data Health card — show linkage health (CMS→Channel→Video) */}
      {(() => {
        const dh = computeDataHealth(state);
        const color = dh.score >= 90 ? C.green : dh.score >= 60 ? C.amber : C.red;
        return (
          <Card style={{padding:14,marginBottom:14,borderLeft:`3px solid ${color}`}}>
            <div style={{display:"flex",alignItems:"center",gap:14}}>
              <div style={{width:54,height:54,borderRadius:"50%",background:`${color}15`,display:"flex",alignItems:"center",justifyContent:"center",position:"relative",flexShrink:0}}>
                <div style={{fontFamily:"'Fraunces',serif",fontWeight:600,fontSize:18,color}}>{dh.score}</div>
              </div>
              <div style={{flex:1}}>
                <div style={{fontSize:12,fontWeight:500,color:C.ink,marginBottom:4}}>
                  📊 Data Linkage Health: {dh.score >= 90 ? "✅ Tốt" : dh.score >= 60 ? "⚠️ Trung bình" : "🔴 Cần xử lý"}
                </div>
                <div style={{display:"flex",gap:14,flexWrap:"wrap",fontSize:10,color:C.muted}}>
                  <span>🎬 Kênh→CMS: <strong style={{color:C.ink}}>{dh.channels.linked}/{dh.channels.total}</strong>{dh.channels.orphan>0 && <span style={{color:C.red}}> ({dh.channels.orphan} mồ côi)</span>}</span>
                  <span>📹 Video→Kênh: <strong style={{color:C.ink}}>{dh.videos.linked}/{dh.videos.total}</strong>{dh.videos.orphan>0 && <span style={{color:C.red}}> ({dh.videos.orphan} mồ côi)</span>}</span>
                  <span>💰 Sharing: <strong style={{color:C.ink}}>{dh.sharing.linked}/{dh.sharing.total}</strong>{dh.sharing.orphan>0 && <span style={{color:C.amber}}> ({dh.sharing.orphan})</span>}</span>
                  <span>⚠️ Vi phạm: <strong style={{color:C.ink}}>{dh.violations.linked}/{dh.violations.total}</strong>{dh.violations.orphan>0 && <span style={{color:C.amber}}> ({dh.violations.orphan})</span>}</span>
                </div>
              </div>
              <Btn ghost icon={RefreshCw} onClick={()=>{
                // Force re-link by calling migrateAndRelink with reset version
                onNavigate("import");
              }}>Import thêm</Btn>
            </div>
          </Card>
        );
      })()}

      {/* Reporting milestones — monthly breakdown */}
      {monthlyBreakdown.length > 0 && (
        <Card style={{padding:18,marginBottom:14}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
            <div>
              <div style={{fontFamily:"'Fraunces',serif",fontWeight:500,fontSize:15,color:C.ink}}>📅 Mốc báo cáo theo tháng</div>
              <div style={{fontSize:10,color:C.muted}}>{monthlyBreakdown.length} mốc · từ {monthlyBreakdown[0].month} đến {monthlyBreakdown[monthlyBreakdown.length-1].month}</div>
            </div>
            <div style={{fontSize:11,color:C.muted}}>
              Tổng: <strong style={{color:C.ink}}>${fmt(monthlyBreakdown.reduce((s,m)=>s+m.revenue, 0))}</strong>
            </div>
          </div>
          <div style={{height:200,marginBottom:10}}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyBreakdown} margin={{top:5,right:5,left:-10,bottom:0}}>
                <CartesianGrid strokeDasharray="2 4" stroke={C.borderSoft} vertical={false}/>
                <XAxis dataKey="month" tick={{fontSize:9,fill:C.muted}} axisLine={{stroke:C.border}}/>
                <YAxis tick={{fontSize:9,fill:C.muted}} axisLine={false} tickFormatter={v=>"$"+fmt(v)}/>
                <Tooltip contentStyle={{background:C.ink,border:"none",borderRadius:4,fontSize:11,color:"#FFF"}} formatter={(v)=>"$"+fmt(v)}/>
                <Bar dataKey="revenue" fill={C.accent} radius={[4,4,0,0]} name="Doanh thu"/>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div style={{display:"grid",gridTemplateColumns:`repeat(${Math.min(monthlyBreakdown.length, 8)},1fr)`,gap:6}}>
            {monthlyBreakdown.slice(-8).map((m,i,arr) => {
              const prev = i > 0 ? arr[i-1].revenue : null;
              const change = prev && prev > 0 ? ((m.revenue - prev) / prev * 100).toFixed(1) : null;
              return (
                <div key={m.month} style={{padding:8,background:C.bgAlt,borderRadius:4,textAlign:"center"}}>
                  <div style={{fontSize:9,color:C.muted,letterSpacing:"0.1em"}}>{m.month}</div>
                  <div style={{fontSize:12,fontWeight:500,color:C.ink,fontFamily:"'JetBrains Mono',monospace",marginTop:2}}>${fmt(m.revenue)}</div>
                  {change !== null && (
                    <div style={{fontSize:9,color:Number(change)>=0?C.green:C.red,marginTop:2}}>
                      {Number(change)>=0 ? "+" : ""}{change}%
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* Two-column main */}
      <div style={{display:"grid",gridTemplateColumns:"2fr 1fr",gap:12,marginBottom:14}}>
        {/* Revenue chart — REAL DATA from state, not fake dailyStats */}
        <Card style={{padding:20}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:14}}>
            <div>
              <div style={{fontFamily:"'Fraunces',serif",fontWeight:500,fontSize:15,color:C.ink}}>Doanh thu 30 ngày qua</div>
              <div style={{fontSize:10,color:C.muted}}>Dữ liệu thật từ partnerSharing + videoAnalytics</div>
            </div>
            <Btn ghost onClick={()=>onNavigate("analytics")} icon={ChevronRightIcon}>Xem chi tiết</Btn>
          </div>
          {(() => {
            const realDaily = aggregateDailyRevenue(state, 30);
            const hasData = realDaily.some(d => d.revenue > 0);
            if (!hasData) {
              return (
                <EmptyState
                  icon={Upload}
                  title="Chưa có dữ liệu doanh thu theo ngày"
                  description="Import file 'Partner Sharing' hoặc 'Video Analytics' để xem biểu đồ doanh thu 30 ngày qua."
                  ctaLabel="Đi tới Import"
                  onCta={()=>onNavigate("import")}
                  compact
                />
              );
            }
            return (
              <ResponsiveContainer width="100%" height={210}>
                <AreaChart data={realDaily} margin={{top:5,right:5,left:-10,bottom:0}}>
                  <defs><linearGradient id="rg2" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={C.accent} stopOpacity={0.3}/>
                    <stop offset="100%" stopColor={C.accent} stopOpacity={0}/>
                  </linearGradient></defs>
                  <CartesianGrid strokeDasharray="2 4" stroke={C.borderSoft} vertical={false}/>
                  <XAxis dataKey="date" tick={{fontSize:9,fill:C.muted}} axisLine={{stroke:C.border}} tickLine={false}/>
                  <YAxis tick={{fontSize:9,fill:C.muted}} axisLine={false} tickLine={false} tickFormatter={v=>"$"+fmt(v)}/>
                  <Tooltip contentStyle={{background:C.ink,border:"none",borderRadius:4,fontSize:11,color:"#FFF"}} formatter={(v)=>"$"+fmt(v)}/>
                  <Area type="monotone" dataKey="revenue" stroke={C.accent} strokeWidth={1.8} fill="url(#rg2)"/>
                </AreaChart>
              </ResponsiveContainer>
            );
          })()}
        </Card>

        {/* Top topics */}
        <Card style={{padding:20}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:12}}>
            <div style={{fontFamily:"'Fraunces',serif",fontWeight:500,fontSize:15,color:C.ink}}>Top Chủ đề</div>
            <Btn ghost onClick={()=>onNavigate("topics")} icon={ChevronRightIcon} style={{padding:"4px 10px"}}>Tất cả</Btn>
          </div>
          {topTopics.map((t, i) => (
            <div key={t.name} style={{display:"flex",alignItems:"center",justifyContent:"space-between",
              padding:"8px 0",borderBottom:i<topTopics.length-1?`1px solid ${C.borderSoft}`:"none"}}>
              <div style={{display:"flex",alignItems:"center",gap:8,flex:1,minWidth:0}}>
                <div style={{width:22,height:22,background:i<3?C.accent:C.bgAlt,color:i<3?"#FFF":C.muted,
                  borderRadius:4,display:"flex",alignItems:"center",justifyContent:"center",
                  fontSize:10,fontWeight:600,flexShrink:0}}>{i+1}</div>
                <div style={{minWidth:0,flex:1}}>
                  <div style={{fontSize:12,color:C.ink,fontWeight:500,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{t.name}</div>
                  <div style={{fontSize:9,color:C.muted}}>{t.channels} kênh</div>
                </div>
              </div>
              <span style={{fontSize:11,fontFamily:"'JetBrains Mono',monospace",fontWeight:500,color:C.ink}}>${fmt(t.revenue)}</span>
            </div>
          ))}
        </Card>
      </div>

      {/* CMS breakdown */}
      <Card style={{padding:20,marginBottom:14}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:14}}>
          <div>
            <div style={{fontFamily:"'Fraunces',serif",fontWeight:500,fontSize:15,color:C.ink}}>Phân bổ doanh thu theo CMS</div>
            <div style={{fontSize:10,color:C.muted}}>{cmsBreakdown.length} CMS đang quản lý</div>
          </div>
          <Btn ghost onClick={()=>onNavigate("cms")} icon={ChevronRightIcon}>Quản lý CMS</Btn>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(4, 1fr)",gap:10}}>
          {cmsBreakdown.slice(0, 8).map(cms => {
            const pct = (cms.revenue / stats.totalRev * 100).toFixed(1);
            return (
              <div key={cms.name} style={{padding:12,background:C.bgAlt,borderRadius:5,
                border:`1px solid ${C.borderSoft}`}}>
                <div style={{fontSize:11,fontWeight:500,color:C.ink,marginBottom:4}}>{cms.name}</div>
                <div style={{fontSize:14,fontFamily:"'Fraunces',serif",fontWeight:500,color:C.accent}}>${fmt(cms.revenue)}</div>
                <div style={{fontSize:9,color:C.muted,marginTop:2}}>{cms.channels} kênh · {pct}%</div>
                <div style={{height:3,background:C.borderSoft,borderRadius:2,marginTop:6,overflow:"hidden"}}>
                  <div style={{width:`${pct}%`,height:"100%",background:C.accent}}/>
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Quick actions + Activity */}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
        <Card style={{padding:20}}>
          <div style={{fontFamily:"'Fraunces',serif",fontWeight:500,fontSize:15,color:C.ink,marginBottom:14}}>Hành động nhanh</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
            <button onClick={()=>onNavigate("import")} style={{padding:14,background:C.aiSoft,border:`1px solid ${C.ai}33`,borderRadius:6,cursor:"pointer",textAlign:"left"}}>
              <Upload size={16} style={{color:C.ai,marginBottom:6}}/>
              <div style={{fontSize:12,fontWeight:500,color:C.ai}}>Import file</div>
              <div style={{fontSize:9,color:C.muted,marginTop:2}}>Excel/CSV tự động</div>
            </button>
            <button onClick={()=>onNavigate("ai")} style={{padding:14,background:C.aiSoft,border:`1px solid ${C.ai}33`,borderRadius:6,cursor:"pointer",textAlign:"left"}}>
              <Sparkles size={16} style={{color:C.ai,marginBottom:6}}/>
              <div style={{fontSize:12,fontWeight:500,color:C.ai}}>Hỏi AI</div>
              <div style={{fontSize:9,color:C.muted,marginTop:2}}>Phân tích nhanh</div>
            </button>
            <button onClick={()=>onNavigate("topics")} style={{padding:14,background:C.bgAlt,border:`1px solid ${C.border}`,borderRadius:6,cursor:"pointer",textAlign:"left"}}>
              <Tag size={16} style={{color:C.text,marginBottom:6}}/>
              <div style={{fontSize:12,fontWeight:500,color:C.text}}>Xem chủ đề</div>
              <div style={{fontSize:9,color:C.muted,marginTop:2}}>{KUDO_TOPICS.length} chủ đề đang quản lý</div>
            </button>
            <button onClick={()=>onNavigate("compliance")} style={{padding:14,background:C.redSoft,border:`1px solid ${C.red}33`,borderRadius:6,cursor:"pointer",textAlign:"left"}}>
              <ShieldAlert size={16} style={{color:C.red,marginBottom:6}}/>
              <div style={{fontSize:12,fontWeight:500,color:C.red}}>Compliance</div>
              <div style={{fontSize:9,color:C.muted,marginTop:2}}>{stats.recentViolations} vi phạm gần đây</div>
            </button>
          </div>
        </Card>

        <Card style={{padding:20}}>
          <div style={{fontFamily:"'Fraunces',serif",fontWeight:500,fontSize:15,color:C.ink,marginBottom:14}}>Hoạt động gần đây</div>
          {(importHistory||[]).slice(0,4).map(h => (
            <div key={h.id} style={{display:"flex",alignItems:"center",gap:10,padding:"8px 0",borderBottom:`1px solid ${C.borderSoft}`}}>
              <div style={{width:26,height:26,background:C.aiSoft,borderRadius:4,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                <FileSpreadsheet size={12} style={{color:C.ai}}/>
              </div>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontSize:11,color:C.ink,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{h.filename}</div>
                <div style={{fontSize:9,color:C.muted}}>{h.type} · {new Date(h.timestamp).toLocaleString("vi-VN", {day:"2-digit",month:"2-digit",hour:"2-digit",minute:"2-digit"})}</div>
              </div>
              <span style={{fontSize:9,fontFamily:"'JetBrains Mono',monospace",color:C.green}}>+{h.created||0}</span>
            </div>
          ))}
          {(!importHistory || importHistory.length === 0) && (
            <div style={{textAlign:"center",padding:24,color:C.muted,fontSize:11}}>Chưa có hoạt động nào. Hãy import file đầu tiên!</div>
          )}
        </Card>
      </div>

      {productSummary.total > 0 && (
        <Card style={{padding:18,marginTop:14,background:`linear-gradient(135deg, ${C.aiSoft} 0%, ${C.card} 100%)`,border:`1px solid ${C.ai}33`}}>
          <div style={{display:"flex",alignItems:"center",gap:14}}>
            <div style={{width:40,height:40,background:C.ai,borderRadius:8,display:"flex",alignItems:"center",justifyContent:"center"}}>
              <FileText size={18} style={{color:"#FFF"}}/>
            </div>
            <div style={{flex:1}}>
              <div style={{fontSize:13,fontWeight:500,color:C.ink}}>Kiểm định sản phẩm</div>
              <div style={{fontSize:11,color:C.muted}}>
                <span style={{color:C.green,fontWeight:500}}>{productSummary.pass} ĐẠT</span> · 
                <span style={{color:C.red,fontWeight:500,marginLeft:6}}>{productSummary.risk} RỦI RO</span> · 
                <span style={{marginLeft:6}}>{productSummary.total} tổng cộng</span>
              </div>
            </div>
            <Btn primary onClick={()=>onNavigate("inspection")} icon={ChevronRightIcon}>Xem chi tiết</Btn>
          </div>
        </Card>
      )}
    </div>
  );
};

// ─── TOPICS module ────────────────────────────────────────────────
const TopicsView = ({ state, callAI, toast }) => {
  const C = useC();
  const { channels } = state;
  const [search, setSearch] = useState("");
  const [aiTopic, setAiTopic] = useState(null);
  const [aiResult, setAiResult] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  
  const topicStats = useMemo(() => {
    const map = {};
    KUDO_TOPICS.forEach(t => {
      map[t.name] = { ...t, channels:[], revenue:0, views:0, subs:0, demonetized:0 };
    });
    channels.forEach(c => {
      const name = c.topic || c.category;
      if (!name) return;
      if (!map[name]) {
        map[name] = { id:`T${Object.keys(map).length+1}`, name, cms:c.cms||"", dept:c.dept||"", channels:[], revenue:0, views:0, subs:0, demonetized:0 };
      }
      map[name].channels.push(c);
      map[name].revenue += c.monthlyRevenue;
      map[name].views += c.monthlyViews;
      map[name].subs += c.subscribers;
      if (c.monetization === "Demonetized") map[name].demonetized++;
    });
    return Object.values(map).sort((a,b) => b.revenue - a.revenue);
  }, [channels]);

  const filtered = topicStats.filter(t => 
    !search || t.name.toLowerCase().includes(search.toLowerCase()) || t.dept?.toLowerCase().includes(search.toLowerCase())
  );

  const totalRev = topicStats.reduce((s,t) => s + t.revenue, 0);

  const analyzeTopic = async (topic) => {
    setAiTopic(topic);
    setAiLoading(true);
    setAiResult(null);
    const prompt = `Phân tích chủ đề "${topic.name}" trong MCN:
- Số kênh: ${topic.channels.length}
- Tổng doanh thu tháng: $${topic.revenue.toLocaleString()}
- Tổng views: ${topic.views.toLocaleString()}
- CMS: ${topic.cms}
- Bộ phận: ${topic.dept}
- Kênh demonetized: ${topic.demonetized}

Top 5 kênh trong chủ đề:
${topic.channels.slice(0,5).map(c => `- ${c.name}: $${c.monthlyRevenue.toLocaleString()} doanh thu, ${c.subscribers.toLocaleString()} subs, ${c.monetization}`).join("\n")}

Hãy phân tích:
1. **TÌNH HÌNH HIỆN TẠI** (3 điểm)
2. **CƠ HỘI PHÁT TRIỂN** (top 3)
3. **RỦI RO & VẤN ĐỀ** (kênh nào yếu, vì sao)
4. **HÀNH ĐỘNG ĐỀ XUẤT** (cụ thể, có deadline)
5. **DỰ BÁO**: Doanh thu tháng tới của chủ đề này

Trả lời tiếng Việt, dùng emoji, có số liệu.`;
    const r = await callAI([{ role:"user", content: prompt }], "", { cacheTopic: `topic-${topic.name}`, ttlMs: 12*3600*1000 });
    setAiResult(r);
    setAiLoading(false);
  };

  const formatText = text => text.split("\n").map((line,i) => (
    <div key={i} style={{marginBottom:line===""?6:2}}>{line === "" ? <span>&nbsp;</span> : parseInline(line)}</div>
  ));

  return (
    <div style={{padding:"20px 28px"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
        <div style={{display:"flex",gap:8,alignItems:"center"}}>
          <div style={{position:"relative"}}>
            <Search size={12} style={{position:"absolute",left:9,top:9,color:C.muted}}/>
            <Input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Tìm chủ đề..." style={{paddingLeft:28,width:240}}/>
          </div>
          <span style={{fontSize:11,color:C.muted}}>{topicStats.length} chủ đề · ${fmt(totalRev)} tổng</span>
        </div>
      </div>

      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill, minmax(280px, 1fr))",gap:12}}>
        {filtered.map(t => {
          const pct = totalRev > 0 ? (t.revenue / totalRev * 100).toFixed(1) : 0;
          const healthScore = t.channels.length > 0 ? 
            Math.round((1 - t.demonetized / t.channels.length) * 100) : 0;
          return (
            <Card key={t.name} style={{padding:18}}>
              <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",marginBottom:10}}>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:4}}>
                    <Tag size={13} style={{color:C.accent}}/>
                    <span style={{fontFamily:"'Fraunces',serif",fontWeight:500,fontSize:14,color:C.ink}}>{t.name}</span>
                  </div>
                  <div style={{fontSize:10,color:C.muted}}>{t.cms} · {t.dept}</div>
                </div>
                <Pill color={healthScore>=80?"green":healthScore>=50?"amber":"red"}>{healthScore}%</Pill>
              </div>
              
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:12}}>
                <div>
                  <div style={{fontSize:9,fontWeight:600,letterSpacing:"0.14em",textTransform:"uppercase",color:C.muted,marginBottom:2}}>Doanh thu</div>
                  <div style={{fontFamily:"'Fraunces',serif",fontWeight:500,fontSize:18,color:C.ink}}>${fmt(t.revenue)}</div>
                  <div style={{fontSize:9,color:C.muted,marginTop:1}}>{pct}% tổng MCN</div>
                </div>
                <div>
                  <div style={{fontSize:9,fontWeight:600,letterSpacing:"0.14em",textTransform:"uppercase",color:C.muted,marginBottom:2}}>Kênh</div>
                  <div style={{fontFamily:"'Fraunces',serif",fontWeight:500,fontSize:18,color:C.ink}}>{t.channels.length}</div>
                  <div style={{fontSize:9,color:t.demonetized>0?C.red:C.muted,marginTop:1}}>
                    {t.demonetized > 0 ? `${t.demonetized} demonetized` : "Tất cả OK"}
                  </div>
                </div>
              </div>

              <div style={{height:4,background:C.borderSoft,borderRadius:2,overflow:"hidden",marginBottom:10}}>
                <div style={{width:`${pct}%`,height:"100%",background:C.accent}}/>
              </div>

              <button onClick={()=>analyzeTopic(t)} 
                style={{width:"100%",fontSize:11,fontWeight:500,padding:"7px 12px",background:C.aiSoft,
                  color:C.ai,border:`1px solid ${C.ai}33`,borderRadius:4,cursor:"pointer",
                  display:"flex",alignItems:"center",justifyContent:"center",gap:6}}>
                <Sparkles size={11}/> AI Phân tích chủ đề
              </button>
            </Card>
          );
        })}
      </div>

      {aiTopic && (
        <Modal title={`AI Phân tích: ${aiTopic.name}`} onClose={()=>{setAiTopic(null); setAiResult(null);}} width={680}>
          {aiLoading ? (
            <div style={{textAlign:"center",padding:40}}>
              <div style={{width:40,height:40,border:`3px solid ${C.aiSoft}`,borderTopColor:C.ai,
                borderRadius:"50%",animation:"spin 0.8s linear infinite",margin:"0 auto 14px"}}/>
              <div style={{fontSize:12,color:C.muted}}>AI đang phân tích chủ đề...</div>
            </div>
          ) : aiResult && (
            <div style={{fontSize:12,lineHeight:1.7,color:C.text,whiteSpace:"pre-wrap"}}>{formatText(aiResult)}</div>
          )}
        </Modal>
      )}
    </div>
  );
};
// ─── CHANNELS CRUD ────────────────────────────────────────────────
const ChannelsView = ({ state, setState, currentUser, toast, confirm, onNavigate }) => {
  const C = useC();
  const { channels, partners } = state;
  const [search, setSearch] = useState("");
  const [cmsF, setCmsF] = useState("All");
  const [partnerF, setPartnerF] = useState("All");
  const [topicF, setTopicF] = useState("All");
  const [monetizationF, setMonetizationF] = useState("All");
  const [healthF, setHealthF] = useState("All");
  const [revRange, setRevRange] = useState("All"); // All / 0 / 0-1k / 1k-10k / 10k+
  const [sortBy, setSortBy] = useState("revenue"); // revenue / subs / views / name / strikes
  const [sortDir, setSortDir] = useState("desc"); // asc / desc
  const [showFilters, setShowFilters] = useState(false);
  const [page, setPage] = useState(1);
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({});
  const [detailChannel, setDetailChannel] = useState(null);
  const [selectedIds, setSelectedIds] = useState(new Set()); // Bulk selection
  const [bulkModal, setBulkModal] = useState(null);
  const [bulkForm, setBulkForm] = useState({});
  const [autoTagModal, setAutoTagModal] = useState(false);
  const [autoTagSuggestions, setAutoTagSuggestions] = useState([]);
  const [autoTagSelected, setAutoTagSelected] = useState(new Set());

  const applyAutoTags = () => {
    const ts = new Date().toISOString();
    const toApply = autoTagSuggestions.filter(s => autoTagSelected.has(s.channelId));
    if (!toApply.length) { toast?.("Chưa chọn kênh nào", "warning"); return; }
    setChannels(prev => prev.map(c => {
      const sugg = toApply.find(s => s.channelId === c.id);
      if (!sugg) return c;
      const changes = [];
      const updates = {};
      if (!c.topic) { updates.topic = sugg.suggestedTopic; updates.topicId = KUDO_TOPICS.find(t=>t.name===sugg.suggestedTopic)?.id||""; changes.push(`Topic → ${sugg.suggestedTopic}`); }
      if (!c.dept) { updates.dept = sugg.suggestedDept; changes.push(`Dept → ${sugg.suggestedDept}`); }
      const history = c.changeHistory || [];
      const newHistory = [...history, { ts, action:`Auto-tag (${sugg.matched})`, changes, user:"system" }].slice(-50);
      return { ...c, ...updates, changeHistory: newHistory };
    }));
    toast?.(`✨ Đã auto-tag ${toApply.length} kênh`, "success");
    setAutoTagModal(false); setAutoTagSelected(new Set()); setAutoTagSuggestions([]);
  };
  const perPage = 15;

  const toggleSelect = (id) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };
  const selectAllOnPage = () => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      const pageIds = paged.map(c => c.id);
      const allSelected = pageIds.every(id => next.has(id));
      if (allSelected) pageIds.forEach(id => next.delete(id));
      else pageIds.forEach(id => next.add(id));
      return next;
    });
  };
  const clearSelection = () => setSelectedIds(new Set());

  const applyBulkUpdate = () => {
    const ids = [...selectedIds];
    if (!ids.length) return;
    const cmsList = state.cmsList || KUDO_CMS_LIST;
    const ts = new Date().toISOString();
    setChannels(prev => prev.map(c => {
      if (!selectedIds.has(c.id)) return c;
      const updates = {};
      const changes = [];
      if (bulkForm.cms) { updates.cms = bulkForm.cms; updates.cmsId = cmsList.find(x => x.name === bulkForm.cms)?.id || ""; changes.push(`CMS → ${bulkForm.cms}`); }
      if (bulkForm.partner) { updates.partner = bulkForm.partner; const p = (state.partners||[]).find(x=>x.name===bulkForm.partner); if (p) updates.partnerId = p.id; changes.push(`Partner → ${bulkForm.partner}`); }
      if (bulkForm.topic) { updates.topic = bulkForm.topic; updates.topicId = KUDO_TOPICS.find(t => t.name === bulkForm.topic)?.id || ""; changes.push(`Topic → ${bulkForm.topic}`); }
      if (bulkForm.monetization) { updates.monetization = bulkForm.monetization; changes.push(`Monetization → ${bulkForm.monetization}`); }
      if (bulkForm.status) { updates.status = bulkForm.status; changes.push(`Status → ${bulkForm.status}`); }
      if (bulkForm.dept) { updates.dept = bulkForm.dept; changes.push(`Dept → ${bulkForm.dept}`); }
      const history = c.changeHistory || [];
      const newHistory = [...history, { ts, action: "Bulk update", changes, user: "system" }].slice(-50);
      return { ...c, ...updates, changeHistory: newHistory };
    }));
    toast?.(`✅ Đã cập nhật ${ids.length} kênh`, "success");
    setBulkModal(null); setBulkForm({}); clearSelection();
  };
  const bulkDelete = async () => {
    const ids = [...selectedIds];
    if (!ids.length) return;
    const ok = await confirm?.({ title:`Xóa ${ids.length} kênh?`, message:"Hành động không thể hoàn tác. Tất cả violation/video gắn với các kênh này sẽ thành mồ côi.", danger:true });
    if (!ok) return;
    setChannels(prev => prev.filter(c => !selectedIds.has(c.id)));
    toast?.(`Đã xóa ${ids.length} kênh`, "success");
    clearSelection();
  };

  // Smart multi-field search: name, ytId, cms, topic, partner, dept, country, notes
  // 🚀 Debounced search — avoid re-filter on every keystroke
  const debouncedSearch = useDebounce(search, 250);

  // 🚀 Memoized filter — only re-runs when deps change
  const filtered = useMemo(() => {
    const matchesSearch = (c, q) => {
      if (!q) return true;
      const s = q.toLowerCase();
      return [c.name, c.ytId, c.cms, c.topic, c.partner, c.dept, c.country, c.notes, c.id]
        .some(field => String(field || "").toLowerCase().includes(s));
    };
    const matchesRevenue = (c) => {
      const r = c.monthlyRevenue || 0;
      if (revRange === "All") return true;
      if (revRange === "0") return r === 0;
      if (revRange === "0-1k") return r > 0 && r < 1000;
      if (revRange === "1k-10k") return r >= 1000 && r < 10000;
      if (revRange === "10k+") return r >= 10000;
      return true;
    };
    return channels.filter(c => {
      if (!matchesSearch(c, debouncedSearch)) return false;
      if (cmsF !== "All" && c.cms !== cmsF) return false;
      if (partnerF !== "All" && c.partner !== partnerF) return false;
      if (topicF !== "All" && c.topic !== topicF) return false;
      if (monetizationF !== "All" && c.monetization !== monetizationF) return false;
      if (healthF !== "All" && c.health !== healthF) return false;
      if (!matchesRevenue(c)) return false;
      return true;
    }).sort((a, b) => {
    let va, vb;
    switch (sortBy) {
      case "name": va = a.name||""; vb = b.name||""; return sortDir==="asc" ? va.localeCompare(vb) : vb.localeCompare(va);
      case "subs": va = a.subscribers||0; vb = b.subscribers||0; break;
      case "views": va = a.monthlyViews||0; vb = b.monthlyViews||0; break;
      case "strikes": va = a.strikes||0; vb = b.strikes||0; break;
      default: va = a.monthlyRevenue||0; vb = b.monthlyRevenue||0;
    }
    return sortDir==="asc" ? va - vb : vb - va;
    });
  }, [channels, debouncedSearch, cmsF, partnerF, topicF, monetizationF, healthF, revRange, sortBy, sortDir]);

  const paged = useMemo(() => filtered.slice((page-1)*perPage, page*perPage), [filtered, page, perPage]);
  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage));

  const resetFilters = () => {
    setSearch(""); setCmsF("All"); setPartnerF("All"); setTopicF("All");
    setMonetizationF("All"); setHealthF("All"); setRevRange("All");
    setPage(1);
  };
  const activeFilterCount = [cmsF, partnerF, topicF, monetizationF, healthF, revRange].filter(v => v !== "All").length + (search ? 1 : 0);

  const setChannels = (fn) => setState(s => ({ ...s, channels: typeof fn === "function" ? fn(s.channels) : fn }));

  const openAdd = () => {
    const cmsList = state.cmsList || KUDO_CMS_LIST;
    setForm({ name:"", ytId:"", cms:cmsList[0]?.name||"", topic:"", monetization:"Monetized", status:"Active",
      notes:"", changeHistory:[] });
    setModal("add");
  };
  const save = () => {
    if (!form.name) { toast("Nhập tên kênh", "warning"); return; }
    const now = new Date().toISOString();
    if (modal === "add") {
      const newCh = { ...form, id:`C${String(channels.length+1).padStart(5,"0")}`,
        ytId: form.ytId || `UC${Math.random().toString(36).substr(2,12).toUpperCase()}`,
        subscribers:0, monthlyViews:0, monthlyRevenue:0,
        health:"Healthy", strikes:0, syncStatus:"Pending", lastSync:0,
        partner: form.partner||"", dept: form.dept||"", country:"VN",
        notes: form.notes || "",
        changeHistory: [{ ts: now, action: "Tạo kênh", user: "system" }],
        createdAt: now,
      };
      setChannels(prev => [...prev, newCh]);
      toast(`Đã thêm "${form.name}"`, "success");
    } else {
      // Compute diff and append to changeHistory
      setChannels(prev => prev.map(c => {
        if (c.id !== form.id) return c;
        const changes = [];
        ["name","cms","topic","partner","monetization","status","dept","country","ytId","notes"].forEach(k => {
          if ((c[k] || "") !== (form[k] || "")) {
            changes.push(`${k}: "${c[k]||""}" → "${form[k]||""}"`);
          }
        });
        const history = c.changeHistory || [];
        const newHistory = changes.length
          ? [...history, { ts: now, action: "Cập nhật", changes: changes.slice(0, 5), user: "system" }].slice(-50) // keep last 50
          : history;
        return { ...form, changeHistory: newHistory };
      }));
      toast(`Đã cập nhật "${form.name}"${form.notes !== channels.find(c=>c.id===form.id)?.notes ? " (đã ghi vào history)" : ""}`, "success");
    }
    setModal(null);
  };
  const del = async (c) => {
    const ok = await confirm({ title:"Xóa kênh?", message:`Xóa "${c.name}"?`, danger:true });
    if (ok) { setChannels(prev=>prev.filter(x=>x.id!==c.id)); toast(`Đã xóa "${c.name}"`, "success"); }
  };

  const cmsOptions = [...new Set(channels.map(c=>c.cms).filter(Boolean))].sort();
  const partnerOptions = [...new Set(channels.map(c=>c.partner).filter(Boolean))].sort();
  const topicOptions = [...new Set(channels.map(c=>c.topic).filter(Boolean))].sort();
  const healthOptions = [...new Set(channels.map(c=>c.health).filter(Boolean))];

  return (
    <div style={{padding:"20px 28px"}}>
      {/* Search bar */}
      <div style={{display:"flex",justifyContent:"space-between",marginBottom:10,gap:8,flexWrap:"wrap"}}>
        <div style={{display:"flex",gap:8,flex:1,minWidth:300}}>
          <div style={{position:"relative",flex:1,maxWidth:380}}>
            <Search size={12} style={{position:"absolute",left:9,top:9,color:C.muted}}/>
            <Input value={search} onChange={e=>{setSearch(e.target.value);setPage(1);}}
              placeholder="🔍 Tìm: tên, ytId, CMS, chủ đề, partner, ghi chú..." style={{paddingLeft:28,width:"100%"}}/>
          </div>
          <Btn ghost icon={Filter} onClick={()=>setShowFilters(s=>!s)}
            style={{position:"relative", background: activeFilterCount>0 ? C.accentSoft : "transparent"}}>
            Bộ lọc {activeFilterCount > 0 && <span style={{marginLeft:4,padding:"1px 6px",background:C.accent,color:"#FFF",borderRadius:8,fontSize:9}}>{activeFilterCount}</span>}
          </Btn>
          {activeFilterCount > 0 && (
            <Btn ghost onClick={resetFilters} icon={X}>Reset</Btn>
          )}
          <span style={{fontSize:11,color:C.muted,padding:"8px 0",whiteSpace:"nowrap"}}>{fmtFull(filtered.length)}/{fmtFull(channels.length)} kênh</span>
        </div>
        <div style={{display:"flex",gap:6}}>
          {can(currentUser, "channels.bulk") && (
            <Btn ghost icon={Sparkles} onClick={()=>{
              const sugg = suggestAutoTags(channels);
              if (!sugg.length) { toast?.("✅ Tất cả kênh đã có topic/dept", "info"); return; }
              setAutoTagSuggestions(sugg);
              setAutoTagModal(true);
            }}>Auto-tag</Btn>
          )}
          {can(currentUser, "channels.create") && (
            <Btn primary onClick={openAdd} icon={Plus}>Thêm kênh</Btn>
          )}
        </div>
      </div>

      {/* Advanced filters */}
      {showFilters && (
        <Card style={{padding:14,marginBottom:14,background:C.bgAlt,border:`1px solid ${C.border}`}}>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(140px,1fr))",gap:10}}>
            <div>
              <div style={{fontSize:9,fontWeight:600,letterSpacing:"0.14em",textTransform:"uppercase",color:C.muted,marginBottom:4}}>CMS</div>
              <Select value={cmsF} onChange={e=>{setCmsF(e.target.value);setPage(1);}} style={{width:"100%"}}>
                <option>All</option>{cmsOptions.map(c=><option key={c}>{c}</option>)}
              </Select>
            </div>
            <div>
              <div style={{fontSize:9,fontWeight:600,letterSpacing:"0.14em",textTransform:"uppercase",color:C.muted,marginBottom:4}}>Đối tác</div>
              <Select value={partnerF} onChange={e=>{setPartnerF(e.target.value);setPage(1);}} style={{width:"100%"}}>
                <option>All</option>{partnerOptions.map(p=><option key={p}>{p}</option>)}
              </Select>
            </div>
            <div>
              <div style={{fontSize:9,fontWeight:600,letterSpacing:"0.14em",textTransform:"uppercase",color:C.muted,marginBottom:4}}>Chủ đề</div>
              <Select value={topicF} onChange={e=>{setTopicF(e.target.value);setPage(1);}} style={{width:"100%"}}>
                <option>All</option>{topicOptions.map(t=><option key={t}>{t}</option>)}
              </Select>
            </div>
            <div>
              <div style={{fontSize:9,fontWeight:600,letterSpacing:"0.14em",textTransform:"uppercase",color:C.muted,marginBottom:4}}>Kiếm tiền</div>
              <Select value={monetizationF} onChange={e=>{setMonetizationF(e.target.value);setPage(1);}} style={{width:"100%"}}>
                <option>All</option><option>Monetized</option><option>Demonetized</option><option>Suspended</option><option>Not Monetized</option>
              </Select>
            </div>
            <div>
              <div style={{fontSize:9,fontWeight:600,letterSpacing:"0.14em",textTransform:"uppercase",color:C.muted,marginBottom:4}}>Sức khỏe</div>
              <Select value={healthF} onChange={e=>{setHealthF(e.target.value);setPage(1);}} style={{width:"100%"}}>
                <option>All</option>{healthOptions.map(h=><option key={h}>{h}</option>)}
              </Select>
            </div>
            <div>
              <div style={{fontSize:9,fontWeight:600,letterSpacing:"0.14em",textTransform:"uppercase",color:C.muted,marginBottom:4}}>Doanh thu</div>
              <Select value={revRange} onChange={e=>{setRevRange(e.target.value);setPage(1);}} style={{width:"100%"}}>
                <option value="All">Tất cả</option>
                <option value="0">$0 (không kiếm tiền)</option>
                <option value="0-1k">$1 - $1k</option>
                <option value="1k-10k">$1k - $10k</option>
                <option value="10k+">$10k+</option>
              </Select>
            </div>
            <div>
              <div style={{fontSize:9,fontWeight:600,letterSpacing:"0.14em",textTransform:"uppercase",color:C.muted,marginBottom:4}}>Sắp xếp</div>
              <div style={{display:"flex",gap:4}}>
                <Select value={sortBy} onChange={e=>setSortBy(e.target.value)} style={{flex:1}}>
                  <option value="revenue">Doanh thu</option>
                  <option value="subs">Subscribers</option>
                  <option value="views">Views</option>
                  <option value="strikes">Strikes</option>
                  <option value="name">Tên (A-Z)</option>
                </Select>
                <button onClick={()=>setSortDir(d=>d==="asc"?"desc":"asc")} title={sortDir==="asc"?"Tăng dần":"Giảm dần"}
                  style={{padding:"6px 10px",border:`1px solid ${C.border}`,background:C.card,borderRadius:4,cursor:"pointer",fontSize:11}}>
                  {sortDir==="asc" ? "↑" : "↓"}
                </button>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Bulk action bar */}
      {selectedIds.size > 0 && (
        <Card style={{padding:10,marginBottom:10,background:C.accentSoft,border:`1px solid ${C.accent}`}}>
          <div style={{display:"flex",alignItems:"center",gap:10,flexWrap:"wrap"}}>
            <span style={{fontSize:12,fontWeight:500,color:C.accent}}>
              ✅ Đã chọn {selectedIds.size} kênh
            </span>
            {can(currentUser, "channels.bulk") && (
              <Btn primary onClick={()=>{setBulkForm({}); setBulkModal("update");}} icon={Edit3}>Cập nhật hàng loạt</Btn>
            )}
            {can(currentUser, "channels.delete") && (
              <Btn ghost onClick={bulkDelete} icon={Trash2}>Xóa hàng loạt</Btn>
            )}
            <Btn ghost onClick={clearSelection} icon={X}>Bỏ chọn</Btn>
          </div>
        </Card>
      )}

      <Card style={{overflow:"hidden"}}>
        <table style={{width:"100%",borderCollapse:"collapse"}}>
          <thead style={{background:C.bgAlt}}>
            <tr>
              <th style={{padding:"9px 10px",width:30}}>
                <input type="checkbox"
                  checked={paged.length > 0 && paged.every(c => selectedIds.has(c.id))}
                  onChange={selectAllOnPage}/>
              </th>
              {["Kênh","CMS","Chủ đề","Subs","Views","Revenue","Status",""].map(h => (
                <th key={h} style={{textAlign:"left",fontSize:9,fontWeight:600,letterSpacing:"0.14em",
                  textTransform:"uppercase",color:C.muted,padding:"9px 10px"}}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paged.map(c => (
              <tr key={c.id} style={{borderTop:`1px solid ${C.borderSoft}`,background:selectedIds.has(c.id)?C.accentSoft:"transparent"}}>
                <td style={{padding:"9px 10px"}}>
                  <input type="checkbox" checked={selectedIds.has(c.id)} onChange={()=>toggleSelect(c.id)}/>
                </td>
                <td style={{padding:"9px 10px"}}>
                  <button onClick={()=>setDetailChannel(c)}
                    style={{background:"none",border:"none",cursor:"pointer",textAlign:"left",padding:0}}>
                    <div style={{fontSize:12,fontWeight:500,color:C.accent,textDecoration:"underline"}}>{c.name}</div>
                    <div style={{fontSize:9,fontFamily:"'JetBrains Mono',monospace",color:C.muted}}>{c.ytId}</div>
                  </button>
                </td>
                <td style={{padding:"9px 10px",fontSize:11,color:C.text}}>{c.cms||"—"}</td>
                <td style={{padding:"9px 10px"}}>{c.topic && <Pill color="gray">{c.topic}</Pill>}</td>
                <td style={{padding:"9px 10px",fontSize:11,fontFamily:"'JetBrains Mono',monospace"}}>{fmt(c.subscribers)}</td>
                <td style={{padding:"9px 10px",fontSize:11,fontFamily:"'JetBrains Mono',monospace"}}>{fmt(c.monthlyViews)}</td>
                <td style={{padding:"9px 10px",fontSize:11,fontFamily:"'JetBrains Mono',monospace",fontWeight:500,color:C.ink}}>${fmt(c.monthlyRevenue)}</td>
                <td style={{padding:"9px 10px",fontSize:11}}><StatusDot status={c.monetization||c.status}/></td>
                <td style={{padding:"9px 10px"}}>
                  <div style={{display:"flex",gap:6}}>
                    {can(currentUser, "channels.edit") && (
                      <button onClick={()=>{setForm({...c}); setModal(c);}} title="Sửa"
                        style={{background:"none",border:"none",cursor:"pointer",padding:2}}><Edit3 size={12} style={{color:C.muted}}/></button>
                    )}
                    {can(currentUser, "channels.delete") && (
                      <button onClick={()=>del(c)} title="Xóa"
                        style={{background:"none",border:"none",cursor:"pointer",padding:2}}><Trash2 size={12} style={{color:C.red}}/></button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",
          padding:"9px 10px",background:C.bgAlt,borderTop:`1px solid ${C.borderSoft}`,fontSize:11,color:C.muted}}>
          <span>Trang {page} / {totalPages}</span>
          <div style={{display:"flex",gap:4}}>
            <button onClick={()=>setPage(p=>Math.max(1,p-1))} disabled={page===1}
              style={{padding:"3px 7px",background:C.card,border:`1px solid ${C.border}`,borderRadius:3,cursor:"pointer",opacity:page===1?0.4:1}}><ChevronLeft size={12}/></button>
            <button onClick={()=>setPage(p=>Math.min(totalPages,p+1))} disabled={page===totalPages}
              style={{padding:"3px 7px",background:C.card,border:`1px solid ${C.border}`,borderRadius:3,cursor:"pointer",opacity:page===totalPages?0.4:1}}><ChevronRight size={12}/></button>
          </div>
        </div>
      </Card>

      {modal!==null && (
        <Modal title={modal==="add"?"Thêm kênh":`Sửa kênh: ${form.name||""}`} onClose={()=>setModal(null)} width={680}>
          {/* Validation hint */}
          <div style={{padding:8,background:C.bgAlt,borderRadius:4,fontSize:10,color:C.muted,marginBottom:12}}>
            ⓘ Trường có dấu <span style={{color:C.red}}>*</span> là bắt buộc · Chọn CMS/Đối tác/Topic → các trường liên quan tự động fill.
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0 16px"}}>
            <Field label={<span>Tên kênh <span style={{color:C.red}}>*</span></span>}>
              <Input value={form.name||""} onChange={e=>setForm(f=>({...f,name:e.target.value}))}/>
            </Field>
            <Field label="YouTube ID">
              <Input value={form.ytId||""} onChange={e=>setForm(f=>({...f,ytId:e.target.value}))}
                placeholder="UCxxxxxxxxxxxxxxxxxxxxxx (24 ký tự)" style={{fontFamily:"monospace"}}/>
              {form.ytId && !/^UC[A-Za-z0-9_-]{22}$/.test(form.ytId) && (
                <div style={{fontSize:9,color:C.red,marginTop:2}}>⚠️ Format không đúng. Phải là UC + 22 ký tự (chữ/số/_/-)</div>
              )}
            </Field>
            <Field label="CMS">
              <Select value={form.cms||""} onChange={e=>{
                const cmsName = e.target.value;
                const cmsObj = (state.cmsList || KUDO_CMS_LIST).find(c => c.name === cmsName);
                setForm(f => ({
                  ...f,
                  cms: cmsName,
                  cmsId: cmsObj?.id || "",
                  // 🎯 Auto-fill currency from CMS
                  currency: cmsObj?.currency || f.currency || "USD",
                }));
              }}>
                <option value="">—</option>{(state.cmsList || KUDO_CMS_LIST).map(c=><option key={c.id} value={c.name}>{c.name} ({c.currency})</option>)}
              </Select>
              {form.cms && form.currency && (
                <div style={{fontSize:9,color:C.muted,marginTop:2}}>💱 Tự động: {form.currency}</div>
              )}
            </Field>
            <Field label="Chủ đề">
              <Select value={form.topic||""} onChange={e=>{
                const topicName = e.target.value;
                const topicObj = KUDO_TOPICS.find(t => t.name === topicName);
                setForm(f => ({
                  ...f,
                  topic: topicName,
                  topicId: topicObj?.id || "",
                  // 🎯 Auto-fill dept from topic if not set
                  dept: f.dept || topicObj?.dept || "",
                }));
              }}>
                <option value="">—</option>{KUDO_TOPICS.map(t=><option key={t.id} value={t.name}>{t.name}</option>)}
              </Select>
              {form.topic && form.dept && (
                <div style={{fontSize:9,color:C.muted,marginTop:2}}>🏢 Dept: {form.dept}</div>
              )}
            </Field>
            <Field label="Đối tác">
              <Select value={form.partner||""} onChange={e=>{
                const partnerName = e.target.value;
                const partnerObj = (state.partners || KUDO_PARTNERS).find(p => p.name === partnerName);
                setForm(f => ({
                  ...f,
                  partner: partnerName,
                  partnerId: partnerObj?.id || "",
                  // 🎯 Auto-fill dept from partner if topic didn't already
                  dept: f.dept || partnerObj?.dept || "",
                }));
              }}>
                <option value="">—</option>{(state.partners || KUDO_PARTNERS).map(p=><option key={p.name||p.id} value={p.name}>{p.name}{p.type?` (${p.type})`:""}</option>)}
              </Select>
            </Field>
            <Field label="Bộ phận">
              <Select value={form.dept||""} onChange={e=>setForm(f=>({...f,dept:e.target.value}))}>
                <option value="">—</option>{KUDO_DEPARTMENTS.map(d=><option key={d}>{d}</option>)}
              </Select>
            </Field>
            <Field label="Tình trạng kiếm tiền">
              <Select value={form.monetization||"Monetized"} onChange={e=>setForm(f=>({...f,monetization:e.target.value}))}>
                <option>Monetized</option><option>Demonetized</option><option>Suspended</option><option>Not Monetized</option><option>Pending</option>
              </Select>
            </Field>
            <Field label="Status">
              <Select value={form.status||"Active"} onChange={e=>setForm(f=>({...f,status:e.target.value}))}>
                <option>Active</option><option>Suspended</option><option>Terminated</option><option>Pending</option>
              </Select>
            </Field>
            <Field label="Quốc gia">
              <Input value={form.country||""} onChange={e=>setForm(f=>({...f,country:e.target.value.toUpperCase().slice(0,2)}))}
                placeholder="VN" style={{fontFamily:"monospace",textTransform:"uppercase"}}/>
              <div style={{fontSize:9,color:C.muted,marginTop:2}}>2 ký tự ISO 3166 (VN, US, ID, JP...)</div>
            </Field>
          </div>
          <div style={{marginTop:6}}>
            <Field label="Ghi chú / Đổi nét (mô tả thay đổi, lưu ý đặc biệt...)">
              <textarea value={form.notes||""} onChange={e=>setForm(f=>({...f,notes:e.target.value}))}
                placeholder="VD: Đã đổi tên kênh ngày 5/10. Chuyển partner từ X → Y. Đang appeal demonetization..."
                style={{width:"100%",minHeight:70,padding:"8px 10px",fontSize:11,fontFamily:"inherit",
                  border:`1px solid ${C.border}`,borderRadius:4,resize:"vertical"}}/>
            </Field>
          </div>
          {modal !== "add" && form.changeHistory?.length > 0 && (
            <div style={{marginTop:8,padding:10,background:C.bgAlt,borderRadius:5}}>
              <div style={{fontSize:10,fontWeight:600,letterSpacing:"0.14em",textTransform:"uppercase",color:C.muted,marginBottom:6}}>
                📜 Lịch sử thay đổi ({form.changeHistory.length})
              </div>
              <div style={{maxHeight:120,overflowY:"auto"}}>
                {[...form.changeHistory].reverse().slice(0,10).map((h, i) => (
                  <div key={i} style={{padding:"4px 0",fontSize:10,borderBottom:i<9?`1px dashed ${C.borderSoft}`:"none"}}>
                    <span style={{color:C.muted,fontFamily:"monospace"}}>{new Date(h.ts).toLocaleString("vi-VN",{hour12:false})}</span>
                    {" "}<span style={{color:C.text,fontWeight:500}}>{h.action}</span>
                    {h.changes?.length > 0 && (
                      <div style={{paddingLeft:10,color:C.muted,fontSize:9}}>{h.changes.join(" · ")}</div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
          <div style={{display:"flex",justifyContent:"flex-end",gap:8,marginTop:16,paddingTop:14,borderTop:`1px solid ${C.borderSoft}`}}>
            <Btn ghost onClick={()=>setModal(null)}>Hủy</Btn>
            <Btn primary onClick={save}>{modal==="add"?"Tạo":"Lưu"}</Btn>
          </div>
        </Modal>
      )}
      <ChannelDetailModal channel={detailChannel} state={state}
        onClose={()=>setDetailChannel(null)} onNavigate={onNavigate}/>

      {/* Bulk Update Modal */}
      {bulkModal === "update" && (
        <Modal title={`Cập nhật ${selectedIds.size} kênh đã chọn`} onClose={()=>setBulkModal(null)}>
          <div style={{padding:10,background:C.amber+"15",borderLeft:`3px solid ${C.amber}`,borderRadius:4,marginBottom:14,fontSize:11,color:C.text}}>
            ⚠️ Chỉ thay đổi các trường có giá trị. Để trống → giữ nguyên.
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0 16px"}}>
            <Field label="Đổi CMS thành...">
              <Select value={bulkForm.cms||""} onChange={e=>setBulkForm(f=>({...f,cms:e.target.value}))}>
                <option value="">— Giữ nguyên —</option>
                {(state.cmsList||KUDO_CMS_LIST).map(c=><option key={c.id} value={c.name}>{c.name}</option>)}
              </Select>
            </Field>
            <Field label="Đổi Đối tác thành...">
              <Select value={bulkForm.partner||""} onChange={e=>setBulkForm(f=>({...f,partner:e.target.value}))}>
                <option value="">— Giữ nguyên —</option>
                {(state.partners||KUDO_PARTNERS).map(p=><option key={p.name||p.id} value={p.name}>{p.name}</option>)}
              </Select>
            </Field>
            <Field label="Đổi Chủ đề thành...">
              <Select value={bulkForm.topic||""} onChange={e=>setBulkForm(f=>({...f,topic:e.target.value}))}>
                <option value="">— Giữ nguyên —</option>
                {KUDO_TOPICS.map(t=><option key={t.id} value={t.name}>{t.name}</option>)}
              </Select>
            </Field>
            <Field label="Đổi Bộ phận thành...">
              <Select value={bulkForm.dept||""} onChange={e=>setBulkForm(f=>({...f,dept:e.target.value}))}>
                <option value="">— Giữ nguyên —</option>
                {KUDO_DEPARTMENTS.map(d=><option key={d}>{d}</option>)}
              </Select>
            </Field>
            <Field label="Đổi Monetization thành...">
              <Select value={bulkForm.monetization||""} onChange={e=>setBulkForm(f=>({...f,monetization:e.target.value}))}>
                <option value="">— Giữ nguyên —</option>
                <option>Monetized</option><option>Demonetized</option><option>Suspended</option><option>Not Monetized</option>
              </Select>
            </Field>
            <Field label="Đổi Status thành...">
              <Select value={bulkForm.status||""} onChange={e=>setBulkForm(f=>({...f,status:e.target.value}))}>
                <option value="">— Giữ nguyên —</option>
                <option>Active</option><option>Suspended</option><option>Terminated</option><option>Pending</option>
              </Select>
            </Field>
          </div>
          <div style={{marginTop:10,padding:10,background:C.bgAlt,borderRadius:4,fontSize:10,color:C.muted}}>
            📜 Mỗi kênh sẽ được ghi vào changeHistory với action "Bulk update".
          </div>
          <div style={{display:"flex",justifyContent:"flex-end",gap:8,marginTop:14,paddingTop:14,borderTop:`1px solid ${C.borderSoft}`}}>
            <Btn ghost onClick={()=>setBulkModal(null)}>Hủy</Btn>
            <Btn primary onClick={applyBulkUpdate} disabled={!Object.values(bulkForm).filter(Boolean).length}>
              Áp dụng cho {selectedIds.size} kênh
            </Btn>
          </div>
        </Modal>
      )}

      {/* Auto-tag Modal */}
      {autoTagModal && (
        <Modal title={`✨ Auto-tag ${autoTagSuggestions.length} kênh chưa được phân loại`} onClose={()=>setAutoTagModal(false)} width={780}>
          <div style={{padding:10,background:C.aiSoft,borderLeft:`3px solid ${C.ai}`,borderRadius:4,marginBottom:14,fontSize:11,color:C.text}}>
            🤖 Phân tích tên kênh đã đề xuất Topic/Dept. Bỏ chọn nếu sai.
          </div>
          <div style={{display:"flex",justifyContent:"space-between",marginBottom:10,fontSize:11,color:C.muted}}>
            <span>{autoTagSelected.size}/{autoTagSuggestions.length} đã chọn</span>
            <div style={{display:"flex",gap:6}}>
              <button onClick={()=>setAutoTagSelected(new Set(autoTagSuggestions.filter(s=>s.confidence>=85).map(s=>s.channelId)))}
                style={{padding:"3px 8px",fontSize:10,background:"transparent",border:`1px solid ${C.border}`,borderRadius:3,cursor:"pointer"}}>≥85% confidence</button>
              <button onClick={()=>setAutoTagSelected(new Set(autoTagSuggestions.map(s=>s.channelId)))}
                style={{padding:"3px 8px",fontSize:10,background:"transparent",border:`1px solid ${C.border}`,borderRadius:3,cursor:"pointer"}}>Tất cả</button>
              <button onClick={()=>setAutoTagSelected(new Set())}
                style={{padding:"3px 8px",fontSize:10,background:"transparent",border:`1px solid ${C.border}`,borderRadius:3,cursor:"pointer"}}>Bỏ chọn</button>
            </div>
          </div>
          <div style={{maxHeight:380,overflowY:"auto",border:`1px solid ${C.borderSoft}`,borderRadius:4}}>
            <table style={{width:"100%",borderCollapse:"collapse",fontSize:11}}>
              <thead style={{background:C.bgAlt,position:"sticky",top:0}}>
                <tr>
                  <th style={{padding:"7px 8px",width:30}}></th>
                  <th style={{textAlign:"left",fontSize:9,fontWeight:600,letterSpacing:"0.14em",textTransform:"uppercase",color:C.muted,padding:"7px 8px"}}>Kênh</th>
                  <th style={{textAlign:"left",fontSize:9,fontWeight:600,letterSpacing:"0.14em",textTransform:"uppercase",color:C.muted,padding:"7px 8px"}}>Topic đề xuất</th>
                  <th style={{textAlign:"left",fontSize:9,fontWeight:600,letterSpacing:"0.14em",textTransform:"uppercase",color:C.muted,padding:"7px 8px"}}>Dept đề xuất</th>
                  <th style={{textAlign:"left",fontSize:9,fontWeight:600,letterSpacing:"0.14em",textTransform:"uppercase",color:C.muted,padding:"7px 8px"}}>Confidence</th>
                  <th style={{textAlign:"left",fontSize:9,fontWeight:600,letterSpacing:"0.14em",textTransform:"uppercase",color:C.muted,padding:"7px 8px"}}>Khớp với</th>
                </tr>
              </thead>
              <tbody>
                {autoTagSuggestions.map(s => (
                  <tr key={s.channelId} style={{borderTop:`1px solid ${C.borderSoft}`,background:autoTagSelected.has(s.channelId)?C.aiSoft+"60":"transparent",cursor:"pointer"}}
                    onClick={()=>setAutoTagSelected(prev => { const n = new Set(prev); if (n.has(s.channelId)) n.delete(s.channelId); else n.add(s.channelId); return n; })}>
                    <td style={{padding:"7px 8px"}}><input type="checkbox" checked={autoTagSelected.has(s.channelId)} readOnly/></td>
                    <td style={{padding:"7px 8px"}}>
                      <div style={{fontSize:11,fontWeight:500,color:C.ink}}>{s.channelName}</div>
                      {(s.currentTopic || s.currentDept) && <div style={{fontSize:9,color:C.muted}}>Hiện: {s.currentTopic||"—"} / {s.currentDept||"—"}</div>}
                    </td>
                    <td style={{padding:"7px 8px"}}><Pill color="accent">{s.suggestedTopic}</Pill></td>
                    <td style={{padding:"7px 8px",fontSize:11,color:C.text}}>{s.suggestedDept}</td>
                    <td style={{padding:"7px 8px"}}>
                      <div style={{display:"flex",alignItems:"center",gap:6}}>
                        <div style={{width:50,height:5,background:C.borderSoft,borderRadius:2,overflow:"hidden"}}>
                          <div style={{width:`${s.confidence}%`,height:"100%",background:s.confidence>=85?C.green:s.confidence>=70?C.amber:C.red}}/>
                        </div>
                        <span style={{fontSize:10,fontFamily:"monospace"}}>{s.confidence}</span>
                      </div>
                    </td>
                    <td style={{padding:"7px 8px",fontSize:10,color:C.muted,fontFamily:"monospace"}}>"{s.matched}"</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={{display:"flex",justifyContent:"flex-end",gap:8,marginTop:14,paddingTop:14,borderTop:`1px solid ${C.borderSoft}`}}>
            <Btn ghost onClick={()=>setAutoTagModal(false)}>Hủy</Btn>
            <Btn primary onClick={applyAutoTags} disabled={!autoTagSelected.size} icon={Check}>
              Áp dụng cho {autoTagSelected.size} kênh
            </Btn>
          </div>
        </Modal>
      )}
    </div>
  );
};

// ─── PARTNERS ─────────────────────────────────────────────────────
const PartnersView = ({ state, setState, toast, confirm, embedded = false }) => {
  const C = useC();
  const { partners, channels } = state;
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({});
  
  // Compute stats
  const partnersWithStats = useMemo(() => partners.map(p => {
    const pchs = channels.filter(c => c.partner === p.name);
    return {
      ...p,
      channels: pchs.length,
      monthlyRev: pchs.reduce((s,c)=>s+c.monthlyRevenue, 0),
    };
  }), [partners, channels]);

  const setPartners = (fn) => setState(s => ({ ...s, partners: typeof fn === "function" ? fn(s.partners) : fn }));

  const openAdd = () => { setForm({ name:"", type:"PRODUCTION", tier:"Standard", revShare:70, dept:"BU Diligo", status:"Active" }); setModal("add"); };
  const save = () => {
    if (!form.name) { toast("Nhập tên đối tác", "warning"); return; }
    if (modal === "add") {
      setPartners(prev => [...prev, { ...form, id:`P${String(prev.length+1).padStart(4,"0")}` }]);
      toast(`Đã thêm "${form.name}"`, "success");
    } else {
      setPartners(prev => prev.map(p => p.id===form.id?form:p));
      toast(`Đã cập nhật`, "success");
    }
    setModal(null);
  };
  const del = async (p) => {
    const ok = await confirm({ title:"Xóa đối tác?", message:`Xóa "${p.name}"?`, danger:true });
    if (ok) { setPartners(prev=>prev.filter(x=>x.id!==p.id)); toast("Đã xóa", "success"); }
  };

  return (
    <div style={{padding: embedded ? 0 : "20px 28px"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
        {embedded ? (
          <div style={{fontSize:11,color:C.muted}}>{partners.length} công ty đối tác · {channels.length} kênh được gán</div>
        ) : <span/>}
        <Btn primary onClick={openAdd} icon={Plus}>Thêm đối tác</Btn>
      </div>
      <Card style={{overflow:"hidden"}}>
        <table style={{width:"100%",borderCollapse:"collapse"}}>
          <thead style={{background:C.bgAlt}}><tr>
            {["ID","Tên","Loại","Bộ phận","Tier","Rev Share","Kênh","Doanh thu",""].map(h=>(
              <th key={h} style={{textAlign:"left",fontSize:9,fontWeight:600,letterSpacing:"0.14em",textTransform:"uppercase",color:C.muted,padding:"10px 12px"}}>{h}</th>
            ))}
          </tr></thead>
          <tbody>{partnersWithStats.map(p => (
            <tr key={p.id} style={{borderTop:`1px solid ${C.borderSoft}`}}>
              <td style={{padding:"10px 12px",fontSize:10,fontFamily:"'JetBrains Mono',monospace",color:C.muted}}>{p.id}</td>
              <td style={{padding:"10px 12px",fontSize:12,fontWeight:500,color:C.ink}}>{p.name}</td>
              <td style={{padding:"10px 12px"}}><Pill color={p.type==="OWNED"?"accent":p.type==="PRODUCTION"?"blue":"gray"}>{p.type}</Pill></td>
              <td style={{padding:"10px 12px",fontSize:11,color:C.text}}>{p.dept}</td>
              <td style={{padding:"10px 12px"}}><Pill color={p.tier==="Premium"?"accent":p.tier==="Standard"?"blue":"gray"}>{p.tier}</Pill></td>
              <td style={{padding:"10px 12px",fontSize:11,fontFamily:"'JetBrains Mono',monospace"}}>{p.revShare}%</td>
              <td style={{padding:"10px 12px",fontSize:11,fontFamily:"'JetBrains Mono',monospace"}}>{p.channels}</td>
              <td style={{padding:"10px 12px",fontSize:11,fontFamily:"'JetBrains Mono',monospace",fontWeight:500,color:C.ink}}>${fmt(p.monthlyRev)}</td>
              <td style={{padding:"10px 12px"}}>
                <div style={{display:"flex",gap:6}}>
                  <button onClick={()=>{setForm({...p}); setModal(p);}} style={{background:"none",border:"none",cursor:"pointer",padding:2}}><Edit3 size={12} style={{color:C.muted}}/></button>
                  <button onClick={()=>del(p)} style={{background:"none",border:"none",cursor:"pointer",padding:2}}><Trash2 size={12} style={{color:C.red}}/></button>
                </div>
              </td>
            </tr>
          ))}</tbody>
        </table>
      </Card>
      {modal!==null && (
        <Modal title={modal==="add"?"Thêm đối tác":"Sửa đối tác"} onClose={()=>setModal(null)}>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0 16px"}}>
            <Field label="Tên *"><Input value={form.name||""} onChange={e=>setForm(f=>({...f,name:e.target.value}))}/></Field>
            <Field label="Email"><Input value={form.email||""} onChange={e=>setForm(f=>({...f,email:e.target.value}))}/></Field>
            <Field label="Loại"><Select value={form.type||"PRODUCTION"} onChange={e=>setForm(f=>({...f,type:e.target.value}))}>
              <option>OWNED</option><option>PRODUCTION</option><option>AFFILIATE</option></Select></Field>
            <Field label="Tier"><Select value={form.tier||"Standard"} onChange={e=>setForm(f=>({...f,tier:e.target.value}))}>
              <option>Premium</option><option>Standard</option><option>Basic</option></Select></Field>
            <Field label="Rev Share %"><Input type="number" value={form.revShare||70} onChange={e=>setForm(f=>({...f,revShare:Number(e.target.value)}))}/></Field>
            <Field label="Bộ phận">
              <Select value={form.dept||""} onChange={e=>setForm(f=>({...f,dept:e.target.value}))}>
                {KUDO_DEPARTMENTS.map(d=><option key={d}>{d}</option>)}
              </Select>
            </Field>
          </div>
          <div style={{display:"flex",justifyContent:"flex-end",gap:8,marginTop:16,paddingTop:14,borderTop:`1px solid ${C.borderSoft}`}}>
            <Btn ghost onClick={()=>setModal(null)}>Hủy</Btn>
            <Btn primary onClick={save}>{modal==="add"?"Tạo":"Lưu"}</Btn>
          </div>
        </Modal>
      )}
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════
// ─── ContractsView — Partner contract management ──────────────────
// One partner → many contracts (different periods, different terms)
// Each contract has assigned channels (a subset of partner's channels)
// ═══════════════════════════════════════════════════════════════════
const ContractsView = ({ state, setState, currentUser, toast, confirm, onNavigate }) => {
  const C = useC();
  const contracts = state.contracts || [];
  const partners = state.partners || [];
  const channels = state.channels || [];
  const [search, setSearch] = useState("");
  const [partnerF, setPartnerF] = useState("All");
  const [statusF, setStatusF] = useState("All");
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({});
  const [detailContract, setDetailContract] = useState(null);

  const setContracts = (fn) => setState(s => ({ ...s, contracts: typeof fn === "function" ? fn(s.contracts || []) : fn }));

  // Filtering
  const filtered = contracts.filter(c => {
    const q = search.toLowerCase();
    if (q && !`${c.contractName||""} ${c.partnerName||""} ${c.notes||""} ${c.id||""}`.toLowerCase().includes(q)) return false;
    if (partnerF !== "All" && c.partnerName !== partnerF) return false;
    if (statusF !== "All" && c.status !== statusF) return false;
    return true;
  }).sort((a, b) => (b.startDate||"").localeCompare(a.startDate||""));

  // Compute live status (Active/Expired/Pending) based on dates
  const liveStatus = (c) => {
    if (c.status === "Terminated" || c.status === "Draft") return c.status;
    const now = new Date().toISOString().slice(0,10);
    if (c.endDate && c.endDate < now) return "Expired";
    if (c.startDate && c.startDate > now) return "Pending";
    return "Active";
  };

  const openAdd = () => {
    setForm({
      id: `CT${String(Date.now()).slice(-6)}`,
      partnerId: partners[0]?.id || "",
      partnerName: partners[0]?.name || "",
      contractName: "",
      type: partners[0]?.type || "PRODUCTION",
      startDate: new Date().toISOString().slice(0,10),
      endDate: "",
      signedDate: new Date().toISOString().slice(0,10),
      status: "Active",
      revShare: partners[0]?.revShare || 70,
      channelIds: [],
      terms: "",
      notes: "",
      paymentTerms: "Net 30",
      monthlyMinimum: 0,
    });
    setModal("add");
  };
  const openEdit = (c) => { setForm({ ...c, channelIds: c.channelIds||[] }); setModal("edit"); };
  const save = () => {
    if (!form.contractName || !form.partnerId) { toast?.("Nhập tên hợp đồng và chọn đối tác", "warning"); return; }
    if (form.startDate && form.endDate && form.startDate > form.endDate) {
      toast?.("Ngày kết thúc phải sau ngày bắt đầu", "warning"); return;
    }
    const partner = partners.find(p => p.id === form.partnerId);
    const enriched = {
      ...form,
      partnerName: partner?.name || form.partnerName,
      revShare: Number(form.revShare) || 0,
      monthlyMinimum: Number(form.monthlyMinimum) || 0,
      updatedAt: new Date().toISOString(),
    };
    setContracts(prev => {
      if (modal === "add") return [enriched, ...prev];
      return prev.map(c => c.id === enriched.id ? enriched : c);
    });
    toast?.(modal === "add" ? `Đã tạo hợp đồng "${form.contractName}"` : `Đã cập nhật hợp đồng`, "success");
    setModal(null);
  };
  const del = async (c) => {
    const ok = await (confirm?.({ title:"Xóa hợp đồng?", message:`Xóa "${c.contractName}"? Không thể hoàn tác.`, danger:true }) || Promise.resolve(window.confirm(`Xóa "${c.contractName}"?`)));
    if (ok) {
      setContracts(prev => prev.filter(x => x.id !== c.id));
      toast?.("Đã xóa hợp đồng", "success");
    }
  };
  const toggleChannel = (chId) => {
    setForm(f => {
      const ids = f.channelIds || [];
      return { ...f, channelIds: ids.includes(chId) ? ids.filter(x => x !== chId) : [...ids, chId] };
    });
  };

  // Summary by partner: how many contracts per partner
  const partnerSummary = useMemo(() => {
    const m = new Map();
    contracts.forEach(c => {
      if (!m.has(c.partnerName)) m.set(c.partnerName, { name: c.partnerName, total:0, active:0, expired:0, channels:0, totalRevShareSum:0 });
      const e = m.get(c.partnerName);
      e.total++;
      const s = liveStatus(c);
      if (s === "Active") e.active++;
      if (s === "Expired") e.expired++;
      e.channels += (c.channelIds||[]).length;
    });
    return [...m.values()].sort((a,b) => b.active - a.active);
  }, [contracts]);

  // For modal: filter channels by selected partner
  const partnerChannels = useMemo(() => {
    if (!form.partnerName) return channels;
    return channels.filter(c => c.partner === form.partnerName);
  }, [channels, form.partnerName]);

  return (
    <div style={{padding:"20px 28px",overflowY:"auto",height:"100%",background:C.bg}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14,flexWrap:"wrap",gap:8}}>
        <div>
          <div style={{fontFamily:"'Fraunces',serif",fontWeight:500,fontSize:22,color:C.ink}}>Quản lý Hợp đồng</div>
          <div style={{fontSize:11,color:C.muted}}>{contracts.length} hợp đồng · {partnerSummary.length} đối tác · {contracts.reduce((s,c)=>s+(c.channelIds||[]).length, 0)} kênh được gán</div>
        </div>
        <Btn primary onClick={openAdd} icon={Plus}>Tạo hợp đồng mới</Btn>
      </div>

      {/* Partner summary cards */}
      {partnerSummary.length > 0 && (
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(180px,1fr))",gap:8,marginBottom:14}}>
          {partnerSummary.slice(0,8).map(ps => (
            <Card key={ps.name} style={{padding:12,cursor:"pointer"}} onClick={()=>setPartnerF(ps.name)}>
              <div style={{fontSize:11,fontWeight:500,color:C.ink,marginBottom:4}}>{ps.name}</div>
              <div style={{display:"flex",gap:6,fontSize:9,color:C.muted}}>
                <span>📋 {ps.total}</span>
                <span style={{color:C.green}}>● {ps.active}</span>
                {ps.expired > 0 && <span style={{color:C.red}}>○ {ps.expired}</span>}
              </div>
              <div style={{fontSize:9,color:C.muted,marginTop:2}}>{ps.channels} kênh</div>
            </Card>
          ))}
        </div>
      )}

      {/* Search + Filter */}
      <Card style={{padding:12,marginBottom:14}}>
        <div style={{display:"flex",gap:8,flexWrap:"wrap",alignItems:"center"}}>
          <div style={{position:"relative",flex:1,maxWidth:340}}>
            <Search size={12} style={{position:"absolute",left:9,top:9,color:C.muted}}/>
            <Input value={search} onChange={e=>setSearch(e.target.value)} placeholder="🔍 Tìm: tên HĐ, đối tác, ID..." style={{paddingLeft:28,width:"100%"}}/>
          </div>
          <Select value={partnerF} onChange={e=>setPartnerF(e.target.value)} style={{width:180}}>
            <option>All</option>
            {[...new Set(contracts.map(c=>c.partnerName))].sort().map(p => <option key={p}>{p}</option>)}
          </Select>
          <Select value={statusF} onChange={e=>setStatusF(e.target.value)} style={{width:140}}>
            <option>All</option><option>Active</option><option>Pending</option><option>Expired</option><option>Terminated</option><option>Draft</option>
          </Select>
          <span style={{fontSize:11,color:C.muted}}>{filtered.length}/{contracts.length}</span>
        </div>
      </Card>

      {/* Contracts table */}
      <Card style={{overflow:"hidden"}}>
        {filtered.length === 0 ? (
          <div style={{padding:50,textAlign:"center",color:C.muted}}>
            <Briefcase size={36} style={{opacity:0.3,marginBottom:10}}/>
            <div style={{fontSize:13,marginBottom:4}}>{contracts.length === 0 ? "Chưa có hợp đồng nào" : "Không tìm thấy hợp đồng phù hợp"}</div>
            <div style={{fontSize:11}}>{contracts.length === 0 ? "Bấm 'Tạo hợp đồng mới' để bắt đầu" : "Thử đổi bộ lọc hoặc tìm kiếm"}</div>
          </div>
        ) : (
          <table style={{width:"100%",borderCollapse:"collapse"}}>
            <thead style={{background:C.bgAlt}}>
              <tr>{["ID","Tên hợp đồng","Đối tác","Loại","Mốc thời gian","Rev Share","Kênh","Status",""].map(h => (
                <th key={h} style={{textAlign:"left",fontSize:9,fontWeight:600,letterSpacing:"0.14em",textTransform:"uppercase",color:C.muted,padding:"10px 12px"}}>{h}</th>
              ))}</tr>
            </thead>
            <tbody>
              {filtered.map(c => {
                const status = liveStatus(c);
                return (
                  <tr key={c.id} style={{borderTop:`1px solid ${C.borderSoft}`,cursor:"pointer"}} onClick={()=>setDetailContract(c)}>
                    <td style={{padding:"10px 12px",fontSize:10,fontFamily:"'JetBrains Mono',monospace",color:C.muted}}>{c.id}</td>
                    <td style={{padding:"10px 12px"}}>
                      <div style={{fontSize:12,fontWeight:500,color:C.ink}}>{c.contractName}</div>
                      {c.notes && <div style={{fontSize:10,color:C.muted,maxWidth:240,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{c.notes}</div>}
                    </td>
                    <td style={{padding:"10px 12px",fontSize:11,color:C.text}}>{c.partnerName}</td>
                    <td style={{padding:"10px 12px"}}>
                      <Pill color={c.type==="OWNED"?"accent":c.type==="PRODUCTION"?"blue":"gray"}>{c.type}</Pill>
                    </td>
                    <td style={{padding:"10px 12px",fontSize:10,color:C.text,fontFamily:"'JetBrains Mono',monospace"}}>
                      {c.startDate || "—"} → {c.endDate || "không kết thúc"}
                    </td>
                    <td style={{padding:"10px 12px",fontSize:11,fontFamily:"'JetBrains Mono',monospace"}}>{c.revShare}%</td>
                    <td style={{padding:"10px 12px",fontSize:11,fontFamily:"'JetBrains Mono',monospace"}}>{(c.channelIds||[]).length}</td>
                    <td style={{padding:"10px 12px"}}>
                      <Pill color={status==="Active"?"green":status==="Pending"?"amber":status==="Expired"?"gray":status==="Draft"?"blue":"red"}>{status}</Pill>
                    </td>
                    <td style={{padding:"10px 12px"}} onClick={e=>e.stopPropagation()}>
                      <div style={{display:"flex",gap:4}}>
                        <button onClick={()=>openEdit(c)} title="Sửa" style={{background:"none",border:`1px solid ${C.border}`,padding:4,borderRadius:3,cursor:"pointer"}}><Edit3 size={11} style={{color:C.muted}}/></button>
                        <button onClick={()=>del(c)} title="Xóa" style={{background:"none",border:`1px solid ${C.border}`,padding:4,borderRadius:3,cursor:"pointer"}}><Trash2 size={11} style={{color:C.red}}/></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </Card>

      {/* Add/Edit Modal */}
      {modal !== null && (
        <Modal title={modal === "add" ? "Tạo hợp đồng mới" : `Sửa hợp đồng: ${form.contractName}`} onClose={()=>setModal(null)} width={780}>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0 16px",marginBottom:8}}>
            <Field label="Đối tác *">
              <Select value={form.partnerId||""} onChange={e=>{
                const p = partners.find(x => x.id === e.target.value);
                setForm(f => ({...f, partnerId: e.target.value, partnerName: p?.name || "", type: p?.type || f.type, revShare: p?.revShare ?? f.revShare}));
              }}>
                <option value="">— Chọn đối tác —</option>
                {partners.map(p => <option key={p.id} value={p.id}>{p.name} ({p.type})</option>)}
              </Select>
            </Field>
            <Field label="Tên hợp đồng *">
              <Input value={form.contractName||""} onChange={e=>setForm(f=>({...f,contractName:e.target.value}))}
                placeholder="VD: GLOBIX 2026 - Diligo BU"/>
            </Field>
            <Field label="Loại hợp đồng">
              <Select value={form.type||"PRODUCTION"} onChange={e=>setForm(f=>({...f,type:e.target.value}))}>
                <option>OWNED</option><option>PRODUCTION</option><option>AFFILIATE</option><option>EXCLUSIVE</option><option>NON_EXCLUSIVE</option>
              </Select>
            </Field>
            <Field label="Status">
              <Select value={form.status||"Active"} onChange={e=>setForm(f=>({...f,status:e.target.value}))}>
                <option>Draft</option><option>Active</option><option>Terminated</option>
              </Select>
            </Field>
            <Field label="Ngày ký"><Input type="date" value={form.signedDate||""} onChange={e=>setForm(f=>({...f,signedDate:e.target.value}))}/></Field>
            <Field label="Ngày bắt đầu *"><Input type="date" value={form.startDate||""} onChange={e=>setForm(f=>({...f,startDate:e.target.value}))}/></Field>
            <Field label="Ngày kết thúc">
              <Input type="date" value={form.endDate||""} onChange={e=>setForm(f=>({...f,endDate:e.target.value}))} placeholder="Bỏ trống = không có hạn"/>
            </Field>
            <Field label="Rev Share %"><Input type="number" min="0" max="100" value={form.revShare||0} onChange={e=>setForm(f=>({...f,revShare:e.target.value}))}/></Field>
            <Field label="Tối thiểu/tháng ($)"><Input type="number" value={form.monthlyMinimum||0} onChange={e=>setForm(f=>({...f,monthlyMinimum:e.target.value}))}/></Field>
            <Field label="Điều khoản thanh toán"><Input value={form.paymentTerms||""} onChange={e=>setForm(f=>({...f,paymentTerms:e.target.value}))} placeholder="VD: Net 30"/></Field>
            <Field label="Withholding Tax (%)"><Input type="number" value={form.withholdingTax||0} onChange={e=>setForm(f=>({...f,withholdingTax:e.target.value}))} placeholder="0"/></Field>
          </div>

          {/* Payment Method section */}
          <div style={{marginTop:8,padding:14,background:C.bgAlt,borderRadius:5}}>
            <div style={{fontSize:11,fontWeight:500,color:C.ink,marginBottom:10,display:"flex",alignItems:"center",gap:6}}>
              💳 Phương thức thanh toán
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0 16px"}}>
              <Field label="Loại thanh toán">
                <Select value={form.paymentMethod||""} onChange={e=>setForm(f=>({...f,paymentMethod:e.target.value}))}>
                  <option value="">— Chọn —</option>
                  <option value="bank_transfer">🏦 Bank Transfer (chuyển khoản)</option>
                  <option value="paypal">💰 PayPal</option>
                  <option value="payoneer">🌐 Payoneer</option>
                  <option value="crypto">₿ Crypto (USDT/BTC...)</option>
                  <option value="cash">💵 Cash (tiền mặt)</option>
                  <option value="other">📌 Khác</option>
                </Select>
              </Field>
              <Field label="Tần suất thanh toán">
                <Select value={form.paymentFrequency||"monthly"} onChange={e=>setForm(f=>({...f,paymentFrequency:e.target.value}))}>
                  <option value="monthly">Hàng tháng</option>
                  <option value="quarterly">Hàng quý</option>
                  <option value="on_demand">Theo yêu cầu</option>
                </Select>
              </Field>
            </div>

            {/* Conditional fields by payment method */}
            {form.paymentMethod === "bank_transfer" && (
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0 16px",marginTop:6}}>
                <Field label="Tên ngân hàng">
                  <Input value={form.bankName||""} onChange={e=>setForm(f=>({...f,bankName:e.target.value}))} placeholder="Vietcombank, MBBank..."/>
                </Field>
                <Field label="Chủ tài khoản">
                  <Input value={form.bankHolder||""} onChange={e=>setForm(f=>({...f,bankHolder:e.target.value}))} placeholder="NGUYEN VAN A"/>
                </Field>
                <Field label="Số tài khoản">
                  <Input value={form.bankAccount||""} onChange={e=>setForm(f=>({...f,bankAccount:e.target.value}))} style={{fontFamily:"monospace"}}/>
                </Field>
                <Field label="Chi nhánh">
                  <Input value={form.bankBranch||""} onChange={e=>setForm(f=>({...f,bankBranch:e.target.value}))} placeholder="HCM, Hanoi..."/>
                </Field>
                <Field label="SWIFT Code (quốc tế)">
                  <Input value={form.swiftCode||""} onChange={e=>setForm(f=>({...f,swiftCode:e.target.value}))} placeholder="BFTVVNVX" style={{fontFamily:"monospace"}}/>
                </Field>
                <Field label="IBAN (EU)">
                  <Input value={form.iban||""} onChange={e=>setForm(f=>({...f,iban:e.target.value}))} placeholder="GB29 NWBK..." style={{fontFamily:"monospace"}}/>
                </Field>
              </div>
            )}
            {form.paymentMethod === "paypal" && (
              <Field label="PayPal Email" style={{marginTop:6}}>
                <Input type="email" value={form.paypalEmail||""} onChange={e=>setForm(f=>({...f,paypalEmail:e.target.value}))} placeholder="partner@example.com"/>
              </Field>
            )}
            {form.paymentMethod === "payoneer" && (
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0 16px",marginTop:6}}>
                <Field label="Payoneer Email">
                  <Input type="email" value={form.payoneerEmail||""} onChange={e=>setForm(f=>({...f,payoneerEmail:e.target.value}))}/>
                </Field>
                <Field label="Payoneer Customer ID">
                  <Input value={form.payoneerId||""} onChange={e=>setForm(f=>({...f,payoneerId:e.target.value}))} style={{fontFamily:"monospace"}}/>
                </Field>
              </div>
            )}
            {form.paymentMethod === "crypto" && (
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0 16px",marginTop:6}}>
                <Field label="Network">
                  <Select value={form.cryptoNetwork||"USDT-TRC20"} onChange={e=>setForm(f=>({...f,cryptoNetwork:e.target.value}))}>
                    <option value="USDT-TRC20">USDT (TRC20)</option>
                    <option value="USDT-ERC20">USDT (ERC20)</option>
                    <option value="USDC-ERC20">USDC (ERC20)</option>
                    <option value="BTC">Bitcoin</option>
                    <option value="ETH">Ethereum</option>
                    <option value="other">Khác</option>
                  </Select>
                </Field>
                <Field label="Wallet Address">
                  <Input value={form.cryptoWallet||""} onChange={e=>setForm(f=>({...f,cryptoWallet:e.target.value}))} style={{fontFamily:"monospace"}}/>
                </Field>
              </div>
            )}
            <Field label="Mã số thuế / Tax ID" style={{marginTop:6}}>
              <Input value={form.taxId||""} onChange={e=>setForm(f=>({...f,taxId:e.target.value}))} placeholder="Để xuất hóa đơn (nếu cần)"/>
            </Field>
            <label style={{display:"flex",alignItems:"center",gap:6,fontSize:11,marginTop:6,cursor:"pointer"}}>
              <input type="checkbox" checked={!!form.invoiceRequired} onChange={e=>setForm(f=>({...f,invoiceRequired:e.target.checked}))}/>
              Yêu cầu xuất hóa đơn (invoice PDF)
            </label>
          </div>

          {/* 📋 Contract Terms Templates */}
          <div style={{marginTop:10,padding:10,background:C.bgAlt,borderRadius:4}}>
            <div style={{fontSize:11,fontWeight:500,color:C.ink,marginBottom:6}}>📋 Template điều khoản (click để chèn):</div>
            <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
              {CONTRACT_TERMS_TEMPLATES.map(tpl => (
                <button key={tpl.id} onClick={()=>{
                  setForm(f => ({...f, terms: f.terms ? f.terms + "\n\n" + tpl.text : tpl.text}));
                  toast?.(`📋 Đã chèn template "${tpl.label}"`, "success");
                }}
                  style={{padding:"5px 11px",fontSize:10,background:"transparent",border:`1px solid ${C.border}`,borderRadius:3,cursor:"pointer"}}>
                  {tpl.label}
                </button>
              ))}
            </div>
          </div>

          <Field label="Điều khoản hợp đồng" style={{marginTop:10}}>
            <textarea value={form.terms||""} onChange={e=>setForm(f=>({...f,terms:e.target.value}))}
              placeholder="Click template ở trên để chèn nhanh, hoặc tự viết..."
              style={{width:"100%",minHeight:80,padding:"8px 10px",fontSize:11,fontFamily:"inherit",border:`1px solid ${C.border}`,borderRadius:4,resize:"vertical"}}/>
          </Field>
          <Field label="Ghi chú">
            <Input value={form.notes||""} onChange={e=>setForm(f=>({...f,notes:e.target.value}))} placeholder="VD: Renewable, exclusive cho khu vực VN..."/>
          </Field>

          {/* Channel assignment */}
          <div style={{marginTop:10,padding:10,background:C.bgAlt,borderRadius:5}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
              <div style={{fontSize:11,fontWeight:500,color:C.ink}}>
                🎬 Kênh thuộc hợp đồng ({(form.channelIds||[]).length}/{partnerChannels.length})
              </div>
              <div style={{display:"flex",gap:4}}>
                <button onClick={()=>setForm(f=>({...f,channelIds: partnerChannels.map(c=>c.id)}))}
                  style={{padding:"3px 8px",fontSize:10,background:"transparent",border:`1px solid ${C.border}`,borderRadius:3,cursor:"pointer"}}>Chọn tất cả</button>
                <button onClick={()=>setForm(f=>({...f,channelIds:[]}))}
                  style={{padding:"3px 8px",fontSize:10,background:"transparent",border:`1px solid ${C.border}`,borderRadius:3,cursor:"pointer"}}>Bỏ chọn</button>
              </div>
            </div>
            <div style={{maxHeight:180,overflowY:"auto",border:`1px solid ${C.border}`,borderRadius:4,background:C.card}}>
              {partnerChannels.length === 0 ? (
                <div style={{padding:14,textAlign:"center",fontSize:11,color:C.muted}}>
                  {form.partnerName ? `Đối tác "${form.partnerName}" chưa có kênh nào` : "Chọn đối tác để xem kênh"}
                </div>
              ) : partnerChannels.map(c => (
                <label key={c.id} style={{display:"flex",alignItems:"center",gap:8,padding:"6px 10px",borderBottom:`1px solid ${C.borderSoft}`,cursor:"pointer",background:(form.channelIds||[]).includes(c.id)?C.accentSoft:"transparent"}}>
                  <input type="checkbox" checked={(form.channelIds||[]).includes(c.id)} onChange={()=>toggleChannel(c.id)}/>
                  <span style={{fontSize:11,fontWeight:500,color:C.ink}}>{c.name}</span>
                  <span style={{fontSize:9,color:C.muted,fontFamily:"monospace"}}>{c.id}</span>
                  <span style={{marginLeft:"auto",fontSize:10,color:C.muted}}>${fmt(c.monthlyRevenue||0)}</span>
                </label>
              ))}
            </div>
          </div>

          <div style={{display:"flex",justifyContent:"flex-end",gap:8,marginTop:14,paddingTop:14,borderTop:`1px solid ${C.borderSoft}`}}>
            <Btn ghost onClick={()=>setModal(null)}>Hủy</Btn>
            <Btn primary onClick={save}>{modal === "add" ? "Tạo hợp đồng" : "Lưu"}</Btn>
          </div>
        </Modal>
      )}

      {/* Detail modal */}
      {detailContract && (
        <Modal title={`📋 ${detailContract.contractName}`} onClose={()=>setDetailContract(null)} width={780}>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14,marginBottom:14}}>
            <div>
              <div style={{fontSize:9,fontWeight:600,letterSpacing:"0.14em",textTransform:"uppercase",color:C.muted,marginBottom:3}}>Đối tác</div>
              <div style={{fontSize:13,fontWeight:500,color:C.ink}}>{detailContract.partnerName}</div>
            </div>
            <div>
              <div style={{fontSize:9,fontWeight:600,letterSpacing:"0.14em",textTransform:"uppercase",color:C.muted,marginBottom:3}}>Status</div>
              <Pill color={liveStatus(detailContract)==="Active"?"green":liveStatus(detailContract)==="Expired"?"red":"amber"}>{liveStatus(detailContract)}</Pill>
            </div>
            <div>
              <div style={{fontSize:9,fontWeight:600,letterSpacing:"0.14em",textTransform:"uppercase",color:C.muted,marginBottom:3}}>Mốc thời gian</div>
              <div style={{fontSize:11,color:C.text}}>{detailContract.startDate || "—"} → {detailContract.endDate || "vô thời hạn"}</div>
              {detailContract.signedDate && <div style={{fontSize:9,color:C.muted}}>Ký: {detailContract.signedDate}</div>}
            </div>
            <div>
              <div style={{fontSize:9,fontWeight:600,letterSpacing:"0.14em",textTransform:"uppercase",color:C.muted,marginBottom:3}}>Rev Share</div>
              <div style={{fontSize:13,fontWeight:500,color:C.ink}}>{detailContract.revShare}%</div>
            </div>
            {detailContract.monthlyMinimum > 0 && (
              <div>
                <div style={{fontSize:9,fontWeight:600,letterSpacing:"0.14em",textTransform:"uppercase",color:C.muted,marginBottom:3}}>Tối thiểu/tháng</div>
                <div style={{fontSize:13,fontWeight:500,color:C.ink}}>${fmt(detailContract.monthlyMinimum)}</div>
              </div>
            )}
            {detailContract.paymentTerms && (
              <div>
                <div style={{fontSize:9,fontWeight:600,letterSpacing:"0.14em",textTransform:"uppercase",color:C.muted,marginBottom:3}}>Thanh toán</div>
                <div style={{fontSize:11,color:C.text}}>{detailContract.paymentTerms}</div>
              </div>
            )}
          </div>
          {detailContract.terms && (
            <div style={{marginBottom:14,padding:12,background:C.bgAlt,borderRadius:5}}>
              <div style={{fontSize:9,fontWeight:600,letterSpacing:"0.14em",textTransform:"uppercase",color:C.muted,marginBottom:6}}>Điều khoản</div>
              <div style={{fontSize:11,color:C.text,lineHeight:1.6,whiteSpace:"pre-wrap"}}>{detailContract.terms}</div>
            </div>
          )}
          <div style={{marginBottom:14}}>
            <div style={{fontSize:11,fontWeight:600,color:C.ink,marginBottom:8}}>
              🎬 Danh sách kênh ({(detailContract.channelIds||[]).length})
            </div>
            <div style={{maxHeight:240,overflowY:"auto",border:`1px solid ${C.borderSoft}`,borderRadius:4}}>
              {(detailContract.channelIds||[]).length === 0 ? (
                <div style={{padding:14,textAlign:"center",fontSize:11,color:C.muted}}>Chưa gán kênh nào</div>
              ) : (detailContract.channelIds||[]).map(chId => {
                const ch = channels.find(c => c.id === chId);
                if (!ch) return <div key={chId} style={{padding:"8px 12px",fontSize:11,color:C.muted}}>{chId} (kênh đã bị xóa)</div>;
                return (
                  <div key={chId} style={{display:"flex",alignItems:"center",gap:10,padding:"8px 12px",borderBottom:`1px solid ${C.borderSoft}`}}>
                    <Tv size={12} style={{color:C.accent}}/>
                    <div style={{flex:1}}>
                      <div style={{fontSize:11,fontWeight:500,color:C.ink}}>{ch.name}</div>
                      <div style={{fontSize:9,color:C.muted,fontFamily:"monospace"}}>{ch.ytId}</div>
                    </div>
                    <Pill color={ch.monetization==="Monetized"?"green":"red"}>{ch.monetization}</Pill>
                    <div style={{fontSize:11,fontFamily:"monospace",color:C.ink}}>${fmt(ch.monthlyRevenue||0)}</div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 💬 Comments thread cho contract */}
          <CommentsThread
            state={state} setState={setState} currentUser={currentUser}
            entityType="contract" entityId={detailContract.id}
            label="💬 Trao đổi nội bộ về hợp đồng"/>

          <div style={{display:"flex",justifyContent:"space-between",gap:8,paddingTop:12,borderTop:`1px solid ${C.borderSoft}`}}>
            <Btn ghost onClick={()=>setDetailContract(null)}>Đóng</Btn>
            <Btn primary icon={Edit3} onClick={()=>{ setDetailContract(null); openEdit(detailContract); }}>Chỉnh sửa</Btn>
          </div>
        </Modal>
      )}
    </div>
  );
};

// ─── ChannelDetailModal — shared component for cross-module linking ─
const ChannelDetailModal = ({ channel, state, onClose, onNavigate }) => {
  const C = useC();
  const [tab, setTab] = useState("overview");
  if (!channel) return null;

  const violations = (state.violations||[]).filter(v => v.channelId === channel.id || v.channelName === channel.name);
  const partner = state.partners.find(p => p.name === channel.partner);
  // Filter video analytics for THIS channel (match by id, ytId, or name)
  const videos = (state.videoAnalytics || []).filter(v =>
    (v.channelId && v.channelId === channel.id) ||
    (v.ytId && v.ytId === channel.ytId) ||
    (v.channel && v.channel === channel.name) ||
    (v.channelName && v.channelName === channel.name)
  );
  // Build monthly timeline from partnerSharing + videoAnalytics if available
  const timeline = (() => {
    const m = new Map();
    (state.partnerSharing || []).filter(s =>
      s.channelId === channel.id || s.channel === channel.name || s.channelName === channel.name
    ).forEach(s => {
      const k = s.month || s.period || s.date?.slice(0,7) || "—";
      if (!m.has(k)) m.set(k, { period:k, revenue:0, views:0, count:0 });
      const e = m.get(k);
      e.revenue += Number(s.revenue)||0;
      e.views += Number(s.views)||0;
      e.count++;
    });
    videos.forEach(v => {
      const k = v.month || v.period || (v.date||v.publishedAt||"").slice(0,7) || "—";
      if (k === "—") return;
      if (!m.has(k)) m.set(k, { period:k, revenue:0, views:0, count:0 });
      const e = m.get(k);
      e.revenue += Number(v.revenue)||0;
      e.views += Number(v.views)||0;
      e.count++;
    });
    return [...m.values()].sort((a,b) => String(a.period).localeCompare(String(b.period)));
  })();

  const TabBtn = ({ id, label, count }) => (
    <button onClick={()=>setTab(id)}
      style={{padding:"6px 12px",fontSize:11,fontWeight:500,cursor:"pointer",border:"none",background:"none",
        color:tab===id?C.accent:C.muted, borderBottom:`2px solid ${tab===id?C.accent:"transparent"}`}}>
      {label}{count!==undefined && <span style={{marginLeft:4,fontSize:9,padding:"1px 5px",background:tab===id?C.accentSoft:C.bgAlt,color:tab===id?C.accent:C.muted,borderRadius:8}}>{count}</span>}
    </button>
  );

  return (
    <Modal title={`Chi tiết kênh: ${channel.name}`} onClose={onClose} width={780}>
      {/* Tab navigation */}
      <div style={{display:"flex",gap:4,borderBottom:`1px solid ${C.borderSoft}`,marginBottom:14,marginTop:-6}}>
        <TabBtn id="overview" label="📊 Tổng quan"/>
        <TabBtn id="videos" label="🎬 Videos" count={videos.length}/>
        <TabBtn id="timeline" label="📈 Lịch sử" count={timeline.length}/>
        <TabBtn id="violations" label="⚠️ Vi phạm" count={violations.length}/>
      </div>

      {/* === OVERVIEW TAB === */}
      {tab === "overview" && (<>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14,marginBottom:14}}>
          <div>
            <div style={{fontSize:9,fontWeight:600,letterSpacing:"0.14em",textTransform:"uppercase",color:C.muted,marginBottom:4}}>YouTube ID</div>
            <div style={{fontSize:11,fontFamily:"'JetBrains Mono',monospace",color:C.text,wordBreak:"break-all"}}>{channel.ytId}</div>
          </div>
          <div>
            <div style={{fontSize:9,fontWeight:600,letterSpacing:"0.14em",textTransform:"uppercase",color:C.muted,marginBottom:4}}>Trạng thái</div>
            <StatusDot status={channel.monetization || channel.status}/>
          </div>
          <div>
            <div style={{fontSize:9,fontWeight:600,letterSpacing:"0.14em",textTransform:"uppercase",color:C.muted,marginBottom:4}}>CMS</div>
            <Pill color="blue">{channel.cms || "—"}</Pill>
          </div>
          <div>
            <div style={{fontSize:9,fontWeight:600,letterSpacing:"0.14em",textTransform:"uppercase",color:C.muted,marginBottom:4}}>Chủ đề</div>
            {channel.topic ? <Pill color="accent">{channel.topic}</Pill> : <span style={{fontSize:11,color:C.muted}}>—</span>}
          </div>
          <div>
            <div style={{fontSize:9,fontWeight:600,letterSpacing:"0.14em",textTransform:"uppercase",color:C.muted,marginBottom:4}}>Đối tác</div>
            {partner ? (
              <Pill color={partner.type==="OWNED"?"accent":"gray"}>{partner.name}</Pill>
            ) : <span style={{fontSize:11,color:C.muted}}>{channel.partner || "—"}</span>}
          </div>
          <div>
            <div style={{fontSize:9,fontWeight:600,letterSpacing:"0.14em",textTransform:"uppercase",color:C.muted,marginBottom:4}}>Bộ phận</div>
            <span style={{fontSize:11,color:C.text}}>{channel.dept || "—"}</span>
          </div>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8,marginBottom:14}}>
          <div style={{padding:12,background:C.bgAlt,borderRadius:5}}>
            <div style={{fontSize:9,fontWeight:600,letterSpacing:"0.14em",textTransform:"uppercase",color:C.muted}}>Subscribers</div>
            <div style={{fontFamily:"'Fraunces',serif",fontWeight:500,fontSize:18,color:C.ink,marginTop:4}}>{fmt(channel.subscribers)}</div>
          </div>
          <div style={{padding:12,background:C.bgAlt,borderRadius:5}}>
            <div style={{fontSize:9,fontWeight:600,letterSpacing:"0.14em",textTransform:"uppercase",color:C.muted}}>Views/tháng</div>
            <div style={{fontFamily:"'Fraunces',serif",fontWeight:500,fontSize:18,color:C.ink,marginTop:4}}>{fmt(channel.monthlyViews)}</div>
          </div>
          <div style={{padding:12,background:C.bgAlt,borderRadius:5}}>
            <div style={{fontSize:9,fontWeight:600,letterSpacing:"0.14em",textTransform:"uppercase",color:C.muted}}>Doanh thu</div>
            <div style={{fontFamily:"'Fraunces',serif",fontWeight:500,fontSize:18,color:C.accent,marginTop:4}}>${fmt(channel.monthlyRevenue)}</div>
          </div>
        </div>
        {channel.strikes > 0 && (
          <div style={{padding:10,background:`${C.red}11`,border:`1px solid ${C.red}33`,borderRadius:5,marginBottom:8}}>
            <div style={{fontSize:11,color:C.red,fontWeight:500}}>⚠️ Kênh có {channel.strikes} strike — cần theo dõi sát</div>
          </div>
        )}
      </>)}

      {/* === VIDEOS TAB === */}
      {tab === "videos" && (
        <div style={{maxHeight:420,overflowY:"auto"}}>
          {videos.length === 0 ? (
            <div style={{padding:30,textAlign:"center",color:C.muted,fontSize:11}}>
              <Tv size={28} style={{opacity:0.3,marginBottom:8}}/>
              <div>Chưa có dữ liệu video cho kênh này.</div>
              <div style={{marginTop:6}}>Hãy import file <strong>YouTube Analytics</strong> hoặc <strong>Video Performance Report</strong> để xem chi tiết video.</div>
            </div>
          ) : (
            <table style={{width:"100%",borderCollapse:"collapse",fontSize:11}}>
              <thead style={{background:C.bgAlt,position:"sticky",top:0}}>
                <tr>
                  {["Video","Ngày","Views","Doanh thu","RPM"].map(h => (
                    <th key={h} style={{textAlign:"left",fontSize:9,fontWeight:600,letterSpacing:"0.14em",textTransform:"uppercase",color:C.muted,padding:"8px 10px"}}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {videos.slice(0, 100).map((v, i) => {
                  const views = Number(v.views)||0;
                  const rev = Number(v.revenue)||0;
                  const rpm = views > 0 ? (rev/views*1000).toFixed(2) : "—";
                  return (
                    <tr key={v.id || v.videoId || i} style={{borderTop:`1px solid ${C.borderSoft}`}}>
                      <td style={{padding:"8px 10px",maxWidth:280}}>
                        <div style={{fontSize:11,color:C.ink,fontWeight:500,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>
                          {v.title || v.videoTitle || v.name || `Video ${i+1}`}
                        </div>
                        {v.videoId && <div style={{fontSize:9,color:C.muted,fontFamily:"'JetBrains Mono',monospace"}}>{v.videoId}</div>}
                      </td>
                      <td style={{padding:"8px 10px",fontSize:10,color:C.muted}}>{(v.date || v.publishedAt || v.month || "—").slice(0,10)}</td>
                      <td style={{padding:"8px 10px",fontFamily:"'JetBrains Mono',monospace"}}>{fmt(views)}</td>
                      <td style={{padding:"8px 10px",fontFamily:"'JetBrains Mono',monospace",fontWeight:500,color:C.ink}}>${fmt(rev)}</td>
                      <td style={{padding:"8px 10px",fontFamily:"'JetBrains Mono',monospace",color:C.muted}}>{rpm}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
          {videos.length > 100 && (
            <div style={{padding:8,textAlign:"center",fontSize:10,color:C.muted}}>Hiển thị 100/{videos.length} video</div>
          )}
        </div>
      )}

      {/* === TIMELINE TAB === */}
      {tab === "timeline" && (
        <div>
          {timeline.length === 0 ? (
            <div style={{padding:30,textAlign:"center",color:C.muted,fontSize:11}}>
              <BarChart2 size={28} style={{opacity:0.3,marginBottom:8}}/>
              <div>Chưa có dữ liệu lịch sử cho kênh này.</div>
              <div style={{marginTop:6}}>Hãy import file <strong>Partner Sharing Report</strong> hoặc <strong>Monthly Revenue</strong> qua nhiều tháng.</div>
            </div>
          ) : (<>
            <div style={{height:200,marginBottom:14}}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={timeline}>
                  <CartesianGrid strokeDasharray="3 3" stroke={C.borderSoft}/>
                  <XAxis dataKey="period" tick={{fontSize:10,fill:C.muted}}/>
                  <YAxis tick={{fontSize:10,fill:C.muted}}/>
                  <Tooltip contentStyle={{fontSize:11,background:C.card,border:`1px solid ${C.border}`}}/>
                  <Bar dataKey="revenue" fill={C.accent} name="Doanh thu ($)"/>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <table style={{width:"100%",borderCollapse:"collapse",fontSize:11}}>
              <thead style={{background:C.bgAlt}}>
                <tr>
                  {["Kỳ","Doanh thu","Views","Số mục"].map(h => (
                    <th key={h} style={{textAlign:"left",fontSize:9,fontWeight:600,letterSpacing:"0.14em",textTransform:"uppercase",color:C.muted,padding:"8px 10px"}}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {timeline.map(row => (
                  <tr key={row.period} style={{borderTop:`1px solid ${C.borderSoft}`}}>
                    <td style={{padding:"7px 10px",fontWeight:500,color:C.ink}}>{row.period}</td>
                    <td style={{padding:"7px 10px",fontFamily:"'JetBrains Mono',monospace",color:C.accent,fontWeight:500}}>${fmt(row.revenue)}</td>
                    <td style={{padding:"7px 10px",fontFamily:"'JetBrains Mono',monospace"}}>{fmt(row.views)}</td>
                    <td style={{padding:"7px 10px",color:C.muted}}>{row.count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>)}
        </div>
      )}

      {/* === VIOLATIONS TAB === */}
      {tab === "violations" && (
        <div>
          {violations.length === 0 ? (
            <div style={{padding:30,textAlign:"center",color:C.green,fontSize:12}}>
              ✅ Kênh chưa có vi phạm nào trong lịch sử.
            </div>
          ) : (
            <div style={{maxHeight:380,overflowY:"auto",border:`1px solid ${C.borderSoft}`,borderRadius:4}}>
              {violations.map(v => (
                <div key={v.id} style={{padding:"10px 12px",borderBottom:`1px solid ${C.borderSoft}`}}>
                  <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:4}}>
                    <Pill color={v.severity==="High"?"red":"amber"}>{v.typeLabel||v.type}</Pill>
                    <span style={{fontSize:10,color:C.muted}}>{v.date}</span>
                    <StatusDot status={v.status}/>
                    {v.outcome && <Pill color="gray">{v.outcome}</Pill>}
                  </div>
                  <div style={{fontSize:11,color:C.ink,fontWeight:500,marginBottom:2}}>{v.videoTitle||"(Không có tên video)"}</div>
                  {v.notes && <div style={{fontSize:10,color:C.muted}}>📝 {v.notes}</div>}
                  {v.actionsTaken && <div style={{fontSize:10,color:C.muted,marginTop:2}}>🔧 {v.actionsTaken}</div>}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Footer */}
      <div style={{display:"flex",justifyContent:"space-between",gap:8,paddingTop:12,marginTop:14,borderTop:`1px solid ${C.borderSoft}`}}>
        <Btn ghost onClick={onClose}>Đóng</Btn>
        <div style={{display:"flex",gap:6}}>
          {violations.length > 0 && onNavigate && (
            <Btn ghost icon={ShieldAlert} onClick={()=>{onNavigate("compliance"); onClose();}}>Mở Compliance</Btn>
          )}
          {channel.ytId && (
            <Btn primary icon={ArrowUpRight} onClick={()=>window.open(`https://www.youtube.com/channel/${channel.ytId}`, "_blank")}>Mở YouTube</Btn>
          )}
        </div>
      </div>
    </Modal>
  );
};

// ─── CMS view (enhanced with per-CMS AI + multi-CMS comparison + CRUD) ───
// ══════════════════════════════════════════════════════════════════
// CmsDetailView — Channel list for a single CMS
// ══════════════════════════════════════════════════════════════════
const CmsDetailView = ({ cms, state, setState, toast, confirm, onBack, onNavigate }) => {
  const C = useC();
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("monthlyRevenue"); // monthlyRevenue | monthlyViews | name
  const [sortDir, setSortDir] = useState("desc");
  const [detailChannel, setDetailChannel] = useState(null);

  const channels = useMemo(() => {
    return (state.channels || []).filter(ch => ch.cms === cms.name);
  }, [state.channels, cms.name]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return channels
      .filter(ch => !q || ch.name?.toLowerCase().includes(q) || ch.ytId?.toLowerCase().includes(q) || ch.partner?.toLowerCase().includes(q))
      .sort((a, b) => {
        const va = a[sortBy] ?? 0, vb = b[sortBy] ?? 0;
        const cmp = typeof va === "string" ? va.localeCompare(vb) : vb - va;
        return sortDir === "asc" ? -cmp : cmp;
      });
  }, [channels, search, sortBy, sortDir]);

  const toggleSort = (col) => {
    if (sortBy === col) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortBy(col); setSortDir("desc"); }
  };

  const totalRev   = channels.reduce((s, c) => s + (Number(c.monthlyRevenue) || 0), 0);
  const totalViews = channels.reduce((s, c) => s + (Number(c.monthlyViews) || 0), 0);
  const monetized  = channels.filter(c => c.monetization === "Monetized").length;
  const demonetized = channels.filter(c => c.monetization === "Demonetized").length;

  const SortTh = ({ col, children }) => (
    <th
      onClick={() => toggleSort(col)}
      style={{
        textAlign:"left", fontSize:9, fontWeight:600, letterSpacing:"0.12em",
        textTransform:"uppercase", color: sortBy === col ? C.accent : C.muted,
        padding:"10px 12px", cursor:"pointer", whiteSpace:"nowrap",
        userSelect:"none", borderBottom:`1px solid ${C.borderSoft}`,
      }}
    >
      {children} {sortBy === col ? (sortDir === "asc" ? "↑" : "↓") : ""}
    </th>
  );

  return (
    <div style={{padding:"20px 28px"}}>
      {/* Header + back */}
      <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:20}}>
        <button onClick={onBack}
          style={{padding:"6px 10px",background:"none",border:`1px solid ${C.border}`,borderRadius:6,cursor:"pointer",display:"flex",alignItems:"center",gap:6,color:C.muted,fontSize:12}}>
          <ChevronLeft size={14}/> Tất cả CMS
        </button>
        <div style={{width:1,height:24,background:C.borderSoft}}/>
        <div style={{width:36,height:36,background:C.ink,borderRadius:8,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
          <Server size={15} style={{color:"#FFF"}}/>
        </div>
        <div>
          <div style={{fontFamily:"'Fraunces',serif",fontWeight:500,fontSize:20,color:C.ink,lineHeight:1.2}}>{cms.name}</div>
          <div style={{fontSize:11,color:C.muted}}>{cms.id} · {cms.currency}</div>
        </div>
      </div>

      {/* KPI summary */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(140px,1fr))",gap:10,marginBottom:18}}>
        {[
          { label:"Tổng kênh",  value: channels.length,      color: C.ink },
          { label:"Monetized",  value: monetized,             color: C.green },
          { label:"Demonetized",value: demonetized,           color: demonetized > 0 ? C.red : C.muted },
          { label:"Views",      value: fmt(totalViews),       color: C.ink },
          { label:"Doanh thu",  value: `$${fmt(totalRev)}`,   color: C.green },
        ].map(k => (
          <Card key={k.label} style={{padding:"12px 14px"}}>
            <div style={{fontSize:9,color:C.muted,letterSpacing:"0.14em",textTransform:"uppercase",marginBottom:4}}>{k.label}</div>
            <div style={{fontSize:18,fontWeight:600,fontFamily:"'JetBrains Mono',monospace",color:k.color}}>{k.value}</div>
          </Card>
        ))}
      </div>

      {/* Search + actions */}
      <div style={{display:"flex",gap:8,marginBottom:12,alignItems:"center",flexWrap:"wrap"}}>
        <div style={{position:"relative",flex:1,minWidth:200,maxWidth:360}}>
          <Search size={13} style={{position:"absolute",left:10,top:"50%",transform:"translateY(-50%)",color:C.muted,pointerEvents:"none"}}/>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Tìm kênh theo tên, YouTube ID, đối tác..."
            style={{width:"100%",padding:"8px 10px 8px 30px",border:`1px solid ${C.border}`,borderRadius:6,fontSize:12,background:C.bg,color:C.ink,outline:"none",boxSizing:"border-box"}}
          />
        </div>
        <span style={{fontSize:11,color:C.muted,marginLeft:"auto"}}>
          {filtered.length} / {channels.length} kênh
        </span>
      </div>

      {/* Channel table */}
      <Card style={{padding:0,overflow:"hidden"}}>
        {channels.length === 0 ? (
          <div style={{padding:48,textAlign:"center"}}>
            <Tv size={36} style={{color:C.borderSoft,marginBottom:12}}/>
            <div style={{fontSize:13,fontWeight:500,color:C.ink,marginBottom:6}}>Chưa có kênh nào</div>
            <div style={{fontSize:11,color:C.muted}}>Import file "Table data.csv" từ YouTube Studio để thêm kênh vào CMS này.</div>
          </div>
        ) : (
          <div style={{overflowX:"auto"}}>
            <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
              <thead style={{background:C.bgAlt}}>
                <tr>
                  <SortTh col="name">Kênh</SortTh>
                  <SortTh col="monthlyViews">Views</SortTh>
                  <SortTh col="monthlyRevenue">Doanh thu</SortTh>
                  <SortTh col="watchTimeHours">Watch Time (h)</SortTh>
                  <SortTh col="engagedViews">Engaged</SortTh>
                  <th style={{textAlign:"left",fontSize:9,fontWeight:600,letterSpacing:"0.12em",textTransform:"uppercase",color:C.muted,padding:"10px 12px",borderBottom:`1px solid ${C.borderSoft}`}}>Status</th>
                  <SortTh col="topic">Chủ đề</SortTh>
                  <SortTh col="partner">Đối tác</SortTh>
                  <th style={{padding:"10px 12px",borderBottom:`1px solid ${C.borderSoft}`}}/>
                </tr>
              </thead>
              <tbody>
                {filtered.map((ch, i) => (
                  <tr key={ch.id} style={{borderTop:i>0?`1px solid ${C.borderSoft}`:"none",cursor:"pointer",transition:"background 0.1s"}}
                    onMouseEnter={e => e.currentTarget.style.background = C.bgAlt}
                    onMouseLeave={e => e.currentTarget.style.background = ""}
                    onClick={() => setDetailChannel(ch)}
                  >
                    <td style={{padding:"10px 12px"}}>
                      <div style={{fontWeight:500,color:C.ink,marginBottom:2}}>{ch.name || "—"}</div>
                      <div style={{fontSize:10,color:C.muted,fontFamily:"monospace"}}>{ch.ytId}</div>
                    </td>
                    <td style={{padding:"10px 12px",fontFamily:"monospace",color:C.text}}>{fmt(ch.monthlyViews || 0)}</td>
                    <td style={{padding:"10px 12px",fontFamily:"monospace",color:ch.monthlyRevenue > 0 ? C.green : C.muted}}>
                      ${fmt(ch.monthlyRevenue || 0)}
                    </td>
                    <td style={{padding:"10px 12px",fontFamily:"monospace",color:C.text}}>
                      {ch.watchTimeHours ? Number(ch.watchTimeHours).toLocaleString(undefined,{maximumFractionDigits:0}) : "—"}
                    </td>
                    <td style={{padding:"10px 12px",fontFamily:"monospace",color:C.text}}>
                      {ch.engagedViews ? fmt(ch.engagedViews) : "—"}
                    </td>
                    <td style={{padding:"10px 12px"}}>
                      <Pill color={ch.monetization==="Monetized"?"green":ch.monetization==="Demonetized"?"red":"amber"}>
                        {ch.monetization || "—"}
                      </Pill>
                    </td>
                    <td style={{padding:"10px 12px",color:C.muted,fontSize:11}}>{ch.topic || "—"}</td>
                    <td style={{padding:"10px 12px",color:C.muted,fontSize:11}}>{ch.partner || "—"}</td>
                    <td style={{padding:"10px 12px"}} onClick={e => e.stopPropagation()}>
                      <button
                        onClick={() => setDetailChannel(ch)}
                        style={{padding:"4px 10px",background:"none",border:`1px solid ${C.border}`,borderRadius:4,cursor:"pointer",fontSize:11,color:C.muted}}
                      >
                        Chi tiết
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Channel detail modal (reuse existing) */}
      {detailChannel && (
        <ChannelDetailModal channel={detailChannel} state={state} onClose={() => setDetailChannel(null)} onNavigate={onNavigate}/>
      )}
    </div>
  );
};

// ══════════════════════════════════════════════════════════════════
const CmsView = ({ state, setState, callAI, toast, confirm, onNavigate }) => {
  const C = useC();
  const { channels } = state;
  const cmsList = state.cmsList || KUDO_CMS_LIST;
  const [aiTarget, setAiTarget] = useState(null); // current CMS being analyzed
  const [aiResult, setAiResult] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiSection, setAiSection] = useState("overview"); // overview|growth|risk|forecast|action
  const [systemAnalysis, setSystemAnalysis] = useState(null);
  const [systemLoading, setSystemLoading] = useState(false);
  // CRUD state
  const [cmsModal, setCmsModal] = useState(null); // null | "add" | cms object
  const [cmsForm, setCmsForm] = useState({});
  // Detail drill-down
  const [detailCms, setDetailCms] = useState(null); // cms object | null

  const openAddCms = () => {
    const nextNum = String((cmsList?.length || 0) + 1).padStart(2, "0");
    setCmsForm({ id: `CMS${nextNum}`, name: "", currency: "USD", revFeb: 0, revMar: 0, viewsM: 0 });
    setCmsModal("add");
  };
  const openEditCms = (cms) => { setCmsForm({ ...cms }); setCmsModal(cms); };
  const saveCms = () => {
    if (!cmsForm.name?.trim()) { toast?.("Nhập tên CMS", "warning"); return; }
    if (!cmsForm.id?.trim()) { toast?.("Nhập ID CMS", "warning"); return; }
    setState?.(s => {
      const list = s.cmsList || [...KUDO_CMS_LIST];
      if (cmsModal === "add") {
        if (list.find(c => c.id === cmsForm.id)) {
          toast?.("ID CMS đã tồn tại", "error");
          return s;
        }
        return { ...s, cmsList: [...list, { ...cmsForm, revFeb: Number(cmsForm.revFeb)||0, revMar: Number(cmsForm.revMar)||0, viewsM: Number(cmsForm.viewsM)||0 }] };
      } else {
        return { ...s, cmsList: list.map(c => c.id === cmsForm.id ? { ...cmsForm, revFeb: Number(cmsForm.revFeb)||0, revMar: Number(cmsForm.revMar)||0, viewsM: Number(cmsForm.viewsM)||0 } : c) };
      }
    });
    toast?.(cmsModal === "add" ? `Đã thêm "${cmsForm.name}"` : `Đã cập nhật "${cmsForm.name}"`, "success");
    setCmsModal(null);
  };
  const delCms = async (cms) => {
    const ok = await (confirm?.({ title:"Xóa CMS?", message:`Xóa "${cms.name}"? Các kênh thuộc CMS này sẽ không bị xóa nhưng sẽ mất tham chiếu.`, danger:true }) || Promise.resolve(window.confirm(`Xóa "${cms.name}"?`)));
    if (ok) {
      setState?.(s => ({ ...s, cmsList: (s.cmsList || [...KUDO_CMS_LIST]).filter(c => c.id !== cms.id) }));
      toast?.(`Đã xóa "${cms.name}"`, "success");
    }
  };

  const cmsStats = useMemo(() => {
    return cmsList.map(cms => {
      const chs = channels.filter(c => c.cms === cms.name);
      const demonetized = chs.filter(c=>c.monetization==="Demonetized").length;
      const violations = (state.violations||[]).filter(v => v.cms === cms.name).length;
      return {
        ...cms,
        actualChannels: chs.length,
        actualRevenue: chs.reduce((s,c)=>s+c.monthlyRevenue, 0),
        actualViews: chs.reduce((s,c)=>s+c.monthlyViews, 0),
        actualSubs: chs.reduce((s,c)=>s+c.subscribers, 0),
        demonetized,
        violations,
        topChannels: [...chs].sort((a,b)=>b.monthlyRevenue-a.monthlyRevenue).slice(0,3),
        topics: [...new Set(chs.map(c=>c.topic).filter(Boolean))],
        revGrowth: cms.revFeb > 0 ? ((cms.revMar - cms.revFeb) / cms.revFeb * 100).toFixed(1) : 0,
        healthScore: chs.length > 0 ? Math.round((1 - demonetized/chs.length) * 100) : 100,
      };
    });
  }, [channels, state.violations, cmsList]);

  const totalRev = cmsStats.reduce((s,c)=>s+c.actualRevenue, 0);

  // 🎯 Compute deeper insights for AI analysis
  const computeCmsInsights = (cms) => {
    const chs = channels.filter(c => c.cms === cms.name);
    const monetized = chs.filter(c => c.monetization === "Monetized").length;
    const suspended = chs.filter(c => c.monetization === "Suspended").length;
    const avgRevPerChannel = chs.length ? cms.actualRevenue / chs.length : 0;
    const avgViewsPerChannel = chs.length ? cms.actualViews / chs.length : 0;
    const totalSubs = chs.reduce((s,c) => s + (c.subscribers||0), 0);
    const avgSubsPerChannel = chs.length ? totalSubs / chs.length : 0;
    const rpm = cms.actualViews > 0 ? (cms.actualRevenue / cms.actualViews * 1000).toFixed(2) : 0;
    // Growth signals
    const recentVio = (state.violations||[]).filter(v => v.cms === cms.name && v.date && (Date.now() - new Date(v.date).getTime()) < 30*86400000);
    const strikes = chs.reduce((s,c) => s + (c.strikes||0), 0);
    // Topic distribution
    const topicMap = new Map();
    chs.forEach(c => {
      const t = c.topic || "(Chưa gán)";
      if (!topicMap.has(t)) topicMap.set(t, { name: t, count:0, revenue:0 });
      const e = topicMap.get(t);
      e.count++;
      e.revenue += c.monthlyRevenue || 0;
    });
    const topicBreakdown = [...topicMap.values()].sort((a,b)=>b.revenue-a.revenue);
    // Partners distribution
    const partners = [...new Set(chs.map(c => c.partner).filter(Boolean))];
    return {
      monetized, suspended, avgRevPerChannel, avgViewsPerChannel,
      totalSubs, avgSubsPerChannel, rpm, recentVio: recentVio.length,
      strikes, topicBreakdown, partners,
    };
  };

  const analyzeOneCms = async (cms) => {
    setAiTarget(cms);
    setAiLoading(true);
    setAiResult(null);
    setAiSection("overview");
    const insights = computeCmsInsights(cms);
    const prompt = `Bạn là Senior MCN Analyst. Phân tích cực kỳ chi tiết CMS "${cms.name}":

═══ DỮ LIỆU CƠ BẢN ═══
- Currency: ${cms.currency}
- Số kênh: ${cms.actualChannels} (${insights.monetized} monetized, ${cms.demonetized} demonetized, ${insights.suspended} suspended)
- Doanh thu tháng (system): ${cms.currency} ${cms.actualRevenue.toLocaleString()}
- Tổng views: ${cms.actualViews.toLocaleString()}
- Tổng subscribers: ${insights.totalSubs.toLocaleString()}
- Trung bình rev/kênh: ${cms.currency} ${Math.round(insights.avgRevPerChannel).toLocaleString()}
- Trung bình views/kênh: ${Math.round(insights.avgViewsPerChannel).toLocaleString()}
- Trung bình subs/kênh: ${Math.round(insights.avgSubsPerChannel).toLocaleString()}
- RPM (revenue per 1000 views): ${cms.currency} ${insights.rpm}
- Health score: ${cms.healthScore}/100

═══ DOANH THU LỊCH SỬ ═══
- Doanh thu T2/2026 (Google): ${cms.currency} ${cms.revFeb.toLocaleString()}
- Doanh thu T3/2026 (Google): ${cms.currency} ${cms.revMar.toLocaleString()}
- Tăng trưởng T2→T3: ${cms.revGrowth}%

═══ RỦI RO & VI PHẠM ═══
- Tổng vi phạm: ${cms.violations} cases
- Vi phạm 30 ngày qua: ${insights.recentVio} cases
- Tổng strikes: ${insights.strikes}
- Tỉ lệ demonetization: ${cms.actualChannels > 0 ? (cms.demonetized/cms.actualChannels*100).toFixed(1) : 0}%

═══ PHÂN BỔ THEO CHỦ ĐỀ ═══
${insights.topicBreakdown.slice(0, 6).map(t => `- ${t.name}: ${t.count} kênh, ${cms.currency} ${t.revenue.toLocaleString()}`).join("\n")}

═══ ĐỐI TÁC LIÊN QUAN ═══
${insights.partners.length > 0 ? insights.partners.slice(0, 8).join(", ") : "(Chưa gán partner)"}

═══ TOP 5 KÊNH ═══
${cms.topChannels.slice(0, 5).map(c => `- ${c.name}: ${cms.currency} ${c.monthlyRevenue.toLocaleString()}, ${c.monetization}, ${(c.subscribers||0).toLocaleString()} subs, topic: ${c.topic||"?"}`).join("\n")}

Hãy trả lời theo CHÍNH XÁC format dưới (mỗi mục bắt đầu bằng tiêu đề có "##"):

## OVERVIEW
Tóm tắt 4-5 dòng về tình hình CMS, sức khỏe, vị thế trong portfolio MCN.
Đánh giá: 🟢 Healthy / 🟡 Warning / 🔴 Critical, kèm lý do.

## GROWTH
Phân tích chi tiết tăng trưởng T2→T3:
- Mức tăng/giảm cụ thể (% và số tuyệt đối)
- 3 nguyên nhân khả dĩ (data-driven)
- So sánh với benchmark RPM industry (Children US: $4-8, Music: $1.5-3, DIY: $2-4)
- Trạng thái: tăng trưởng / ổn định / đáng lo

## RISK
Top 3 rủi ro của CMS này (ranked):
- Mỗi rủi ro: mô tả + impact ($)+ likelihood (Low/Med/High)
- Có demonetization rate cao bất thường không?
- Strike pattern có nguy hiểm không?
- Partner concentration risk (quá phụ thuộc 1 partner?)

## FORECAST
Dự báo 30/60/90 ngày tới:
- Revenue 30 ngày: ${cms.currency} X ± Y%
- Revenue 60 ngày: ${cms.currency} X ± Y%
- Revenue 90 ngày: ${cms.currency} X ± Y%
- Số kênh có thể demonetized thêm
- Trend chính (5 từ): ...

## ACTION
Top 5 hành động cần làm NGAY (ranked by impact):
1. **[Priority HIGH/MED/LOW]** Tên action — tại sao + ai làm + deadline + KPI đo lường
2. ...
3. ...
4. ...
5. ...

Yêu cầu: TIẾNG VIỆT, có số liệu cụ thể, không nói chung chung.`;
    const r = await callAI([{ role:"user", content: prompt }], "", { cacheTopic: `cms-${cms.id}`, ttlMs: 12*3600*1000, maxTokens: 3000 });
    setAiResult(r);
    setAiLoading(false);
  };

  // Parse AI response into 5 sections (## OVERVIEW, ## GROWTH, etc.)
  const parsedSections = useMemo(() => {
    if (!aiResult || typeof aiResult !== "string") return null;
    const sections = {};
    const regex = /##\s*(OVERVIEW|GROWTH|RISK|FORECAST|ACTION)\s*\n([\s\S]*?)(?=##\s*(?:OVERVIEW|GROWTH|RISK|FORECAST|ACTION)|$)/gi;
    let match;
    while ((match = regex.exec(aiResult)) !== null) {
      sections[match[1].toLowerCase()] = match[2].trim();
    }
    // Fallback: if no sections found, treat whole text as overview
    if (Object.keys(sections).length === 0) sections.overview = aiResult;
    return sections;
  }, [aiResult]);

  const analyzeSystem = async () => {
    setSystemLoading(true);
    setSystemAnalysis(null);
    const summary = cmsStats.map(c =>
      `- ${c.name} (${c.currency}): ${c.actualChannels} kênh, $${c.actualRevenue.toLocaleString()} doanh thu, T2→T3 ${c.revGrowth}%, ${c.demonetized} demonetized`
    ).join("\n");
    const prompt = `Phân tích toàn hệ thống MCN với 8 CMS:

${summary}

TỔNG: $${totalRev.toLocaleString()} doanh thu, ${channels.length} kênh, ${(state.violations||[]).length} vi phạm tổng.

Hãy đưa ra:
1. **TỔNG QUAN** (tình hình toàn hệ thống 1-2 dòng)
2. **CMS DẪN ĐẦU** (top 3, lý do)
3. **CMS GẶP VẤN ĐỀ** (cần can thiệp ngay)
4. **PHÂN BỔ NGUỒN LỰC** (CMS nào nên tăng đầu tư, giảm)
5. **CHIẾN LƯỢC THÁNG TỚI** (3 ưu tiên)
6. **MA TRẬN BCG** (Star/Cash Cow/Question Mark/Dog cho 8 CMS)

Format có cấu trúc, dùng emoji, tiếng Việt.`;
    const r = await callAI([{ role:"user", content: prompt }], "", { cacheTopic: "cms-system", ttlMs: 12*3600*1000 });
    setSystemAnalysis(r);
    setSystemLoading(false);
  };

  const formatText = text => text.split("\n").map((line,i) => (
    <div key={i} style={{marginBottom:line===""?6:2}}>{line === "" ? <span>&nbsp;</span> : parseInline(line)}</div>
  ));

  // 📈 Tab: hiện tại (current snapshot) | lịch sử (time-series)
  const [viewTab, setViewTab] = useState("current");

  // ── If a CMS is selected, show its detail page ────────────────
  if (detailCms) {
    return (
      <CmsDetailView
        cms={detailCms}
        state={state}
        setState={setState}
        toast={toast}
        confirm={confirm}
        onBack={() => setDetailCms(null)}
        onNavigate={onNavigate}
      />
    );
  }

  return (
    <div style={{padding:"20px 28px"}}>
      {/* Tabs */}
      <div style={{display:"flex",gap:6,marginBottom:14,borderBottom:`1px solid ${C.borderSoft}`}}>
        {[
          { id: "current", label: "📊 Hiện tại", desc: "Snapshot doanh thu / views / kênh hiện tại" },
          { id: "history", label: "📈 Lịch sử & Biến thiên", desc: "Theo dõi biến động từng CMS theo ngày" },
        ].map(t => (
          <button key={t.id} onClick={() => setViewTab(t.id)}
            style={{
              padding: "10px 18px", fontSize: 12, fontWeight: 500, cursor: "pointer",
              border: "none", background: "none",
              color: viewTab === t.id ? C.ink : C.muted,
              borderBottom: `2px solid ${viewTab === t.id ? C.accent : "transparent"}`,
              marginBottom: -1,
            }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* History tab */}
      {viewTab === "history" && (
        <CmsHistoryView state={state} toast={toast} cmsList={cmsList}/>
      )}

      {/* Current tab — original CMS view */}
      {viewTab === "current" && (
      <>
      {/* Action bar */}
      <div style={{display:"flex",gap:8,marginBottom:14,flexWrap:"wrap",alignItems:"center"}}>
        <Btn primary onClick={openAddCms} icon={Plus}>Thêm CMS</Btn>
        <Btn ghost onClick={analyzeSystem} disabled={systemLoading} icon={Sparkles}>
          {systemLoading ? "Đang phân tích..." : "🧠 AI phân tích toàn hệ thống"}
        </Btn>
        <Btn ghost icon={Save} onClick={async () => {
          toast?.("📸 Đang chụp snapshot CMS...", "info");
          const result = await pushCmsDailySnapshot(state, "manual");
          if (result.ok) toast?.(`✅ Đã lưu snapshot ${result.count} CMS hôm nay`, "success");
          else toast?.(`❌ Lỗi: ${result.error || "Không kết nối backend"}`, "error");
        }}>📸 Snapshot ngay</Btn>
        <span style={{fontSize:11,color:C.muted,padding:"8px 0",marginLeft:"auto"}}>
          {cmsStats.length} CMS · ${fmt(totalRev)} tổng doanh thu
        </span>
      </div>

      {/* CMS Add/Edit Modal */}
      {cmsModal !== null && (
        <Modal title={cmsModal === "add" ? "Thêm CMS mới" : `Sửa CMS: ${cmsForm.name}`} onClose={()=>setCmsModal(null)}>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0 16px"}}>
            <Field label="ID CMS *">
              <Input value={cmsForm.id||""} onChange={e=>setCmsForm(f=>({...f,id:e.target.value}))} disabled={cmsModal!=="add"} placeholder="VD: CMS09"/>
            </Field>
            <Field label="Tên CMS *">
              <Input value={cmsForm.name||""} onChange={e=>setCmsForm(f=>({...f,name:e.target.value}))} placeholder="VD: KUDO Sports"/>
            </Field>
            <Field label="Currency">
              <Select value={cmsForm.currency||"USD"} onChange={e=>setCmsForm(f=>({...f,currency:e.target.value}))}>
                <option>USD</option><option>VND</option><option>EUR</option><option>CAD</option><option>GBP</option><option>JPY</option><option>SGD</option><option>AUD</option>
              </Select>
            </Field>
            <Field label="Views (triệu)">
              <Input type="number" step="0.1" value={cmsForm.viewsM||0} onChange={e=>setCmsForm(f=>({...f,viewsM:e.target.value}))}/>
            </Field>
            <Field label="Doanh thu kỳ trước">
              <Input type="number" value={cmsForm.revFeb||0} onChange={e=>setCmsForm(f=>({...f,revFeb:e.target.value}))}/>
            </Field>
            <Field label="Doanh thu kỳ này">
              <Input type="number" value={cmsForm.revMar||0} onChange={e=>setCmsForm(f=>({...f,revMar:e.target.value}))}/>
            </Field>
          </div>
          <div style={{display:"flex",justifyContent:"space-between",gap:8,marginTop:16,paddingTop:14,borderTop:`1px solid ${C.borderSoft}`}}>
            {cmsModal !== "add" ? (
              <Btn danger onClick={()=>{ delCms(cmsForm); setCmsModal(null); }} icon={Trash2}>Xóa CMS</Btn>
            ) : <span/>}
            <div style={{display:"flex",gap:8}}>
              <Btn ghost onClick={()=>setCmsModal(null)}>Hủy</Btn>
              <Btn primary onClick={saveCms}>{cmsModal === "add" ? "Tạo CMS" : "Lưu"}</Btn>
            </div>
          </div>
        </Modal>
      )}

      {/* System analysis result */}
      {systemAnalysis && (
        <Card style={{padding:20,marginBottom:14,borderLeft:`3px solid ${C.ai}`}}>
          <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:12,paddingBottom:10,borderBottom:`1px solid ${C.borderSoft}`}}>
            <Sparkles size={16} style={{color:C.ai}}/>
            <div style={{fontFamily:"'Fraunces',serif",fontWeight:500,fontSize:14,color:C.ink}}>AI phân tích toàn hệ thống MCN</div>
            <button onClick={()=>setSystemAnalysis(null)} style={{marginLeft:"auto",background:"none",border:"none",cursor:"pointer"}}><X size={14} style={{color:C.muted}}/></button>
          </div>
          <div style={{fontSize:12,lineHeight:1.7,color:C.text}}>{formatText(systemAnalysis)}</div>
        </Card>
      )}

      {/* CMS cards */}
      <div style={{display:"grid",gap:10}}>
        {cmsStats.map(cms => (
          <Card key={cms.id} style={{padding:"16px 20px",transition:"box-shadow 0.15s"}}>
            <div style={{display:"flex",alignItems:"center",gap:14}}>
              {/* Clickable body → CMS detail */}
              <div
                onClick={() => setDetailCms(cms)}
                style={{display:"flex",alignItems:"center",gap:14,flex:1,minWidth:0,cursor:"pointer"}}
                title={`Xem danh sách kênh của ${cms.name}`}
              >
              <div style={{width:42,height:42,background:C.ink,borderRadius:8,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                <Server size={18} style={{color:"#FFF"}}/>
              </div>
              <div style={{flex:1,minWidth:0}}>
                <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:4,flexWrap:"wrap"}}>
                  <span style={{fontSize:14,fontWeight:500,color:C.ink}}>{cms.name}</span>
                  <Pill color={cms.currency==="USD"?"green":cms.currency==="GBP"?"blue":"amber"}>{cms.currency}</Pill>
                  <Pill color={cms.healthScore>=80?"green":cms.healthScore>=50?"amber":"red"}>Health {cms.healthScore}%</Pill>
                  {cms.demonetized > 0 && <Pill color="red">{cms.demonetized} demonetized</Pill>}
                  {cms.violations > 0 && <Pill color="amber">{cms.violations} vi phạm</Pill>}
                </div>
                <div style={{fontSize:11,color:C.muted,marginBottom:6}}>
                  {cms.actualChannels} kênh · {fmt(cms.actualViews)} views · ${fmt(cms.actualRevenue)} doanh thu hiện tại
                  {cms.topics.length > 0 && ` · ${cms.topics.slice(0,3).join(", ")}${cms.topics.length>3?"+"+(cms.topics.length-3):""}`}
                </div>
                {cms.topChannels.length > 0 && (
                  <div style={{fontSize:10,color:C.muted}}>
                    Top: {cms.topChannels[0].name} (${fmt(cms.topChannels[0].monthlyRevenue)})
                  </div>
                )}
              </div>
              </div>{/* end clickable body */}
              <div style={{textAlign:"right",flexShrink:0}}>
                <div style={{fontSize:9,color:C.muted,letterSpacing:"0.14em",textTransform:"uppercase",marginBottom:4}}>Google Report</div>
                <div style={{display:"flex",gap:14}}>
                  <div>
                    <div style={{fontSize:9,color:C.muted}}>T2/26</div>
                    <div style={{fontSize:11,fontFamily:"'JetBrains Mono',monospace",fontWeight:500,color:C.ink}}>${fmt(cms.revFeb)}</div>
                  </div>
                  <div>
                    <div style={{fontSize:9,color:C.muted}}>T3/26</div>
                    <div style={{fontSize:11,fontFamily:"'JetBrains Mono',monospace",fontWeight:500,color:cms.revMar>cms.revFeb?C.green:cms.revMar>0?C.red:C.muted}}>${fmt(cms.revMar)}</div>
                  </div>
                  <div>
                    <div style={{fontSize:9,color:C.muted}}>%</div>
                    <div style={{fontSize:11,fontFamily:"'JetBrains Mono',monospace",fontWeight:500,color:Number(cms.revGrowth)>0?C.green:C.red}}>{cms.revGrowth>0?"+":""}{cms.revGrowth}%</div>
                  </div>
                </div>
              </div>
              <div style={{display:"flex",gap:6}}>
                <button onClick={()=>openEditCms(cms)} title="Sửa CMS"
                  style={{padding:"7px 9px",background:"transparent",color:C.muted,border:`1px solid ${C.border}`,borderRadius:4,cursor:"pointer"}}>
                  <Edit3 size={11}/>
                </button>
                <button onClick={()=>analyzeOneCms(cms)}
                  style={{padding:"7px 14px",background:C.aiSoft,color:C.ai,border:`1px solid ${C.ai}33`,borderRadius:4,cursor:"pointer",fontSize:11,fontWeight:500,display:"flex",alignItems:"center",gap:6}}>
                  <Sparkles size={11}/> AI phân tích chi tiết
                </button>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Per-CMS AI modal */}
      {aiTarget && (
        <Modal title={`🧠 AI phân tích chi tiết: ${aiTarget.name}`} onClose={()=>{setAiTarget(null); setAiResult(null); setAiSection("overview");}} width={820}>
          {aiLoading ? (
            <div style={{textAlign:"center",padding:60}}>
              <div style={{width:48,height:48,border:`3px solid ${C.aiSoft}`,borderTopColor:C.ai,borderRadius:"50%",animation:"spin 0.8s linear infinite",margin:"0 auto 18px"}}/>
              <div style={{fontSize:13,fontWeight:500,color:C.ink,marginBottom:6}}>AI đang phân tích {aiTarget.name}...</div>
              <div style={{fontSize:11,color:C.muted}}>Đang tổng hợp 5 dimension: Overview · Growth · Risk · Forecast · Action</div>
              <div style={{fontSize:10,color:C.muted,marginTop:6}}>Thường mất ~10-20 giây với prompt cache</div>
            </div>
          ) : parsedSections ? (
            <>
              {/* Quick stats panel */}
              <div style={{padding:12,background:C.bgAlt,borderRadius:6,marginBottom:14,display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(120px,1fr))",gap:8}}>
                <div>
                  <div style={{fontSize:9,color:C.muted,letterSpacing:"0.14em",textTransform:"uppercase"}}>Doanh thu</div>
                  <div style={{fontSize:14,fontWeight:600,color:C.ink,fontFamily:"monospace"}}>{aiTarget.currency} {fmt(aiTarget.actualRevenue)}</div>
                </div>
                <div>
                  <div style={{fontSize:9,color:C.muted,letterSpacing:"0.14em",textTransform:"uppercase"}}>Tăng trưởng</div>
                  <div style={{fontSize:14,fontWeight:600,fontFamily:"monospace",color:Number(aiTarget.revGrowth)>=0?C.green:C.red}}>
                    {aiTarget.revGrowth>=0?"+":""}{aiTarget.revGrowth}%
                  </div>
                </div>
                <div>
                  <div style={{fontSize:9,color:C.muted,letterSpacing:"0.14em",textTransform:"uppercase"}}>Health</div>
                  <div style={{fontSize:14,fontWeight:600,fontFamily:"monospace",color:aiTarget.healthScore>=80?C.green:aiTarget.healthScore>=50?C.amber:C.red}}>
                    {aiTarget.healthScore}/100
                  </div>
                </div>
                <div>
                  <div style={{fontSize:9,color:C.muted,letterSpacing:"0.14em",textTransform:"uppercase"}}>Kênh</div>
                  <div style={{fontSize:14,fontWeight:600,color:C.ink,fontFamily:"monospace"}}>{aiTarget.actualChannels}</div>
                </div>
                <div>
                  <div style={{fontSize:9,color:C.muted,letterSpacing:"0.14em",textTransform:"uppercase"}}>Demonetized</div>
                  <div style={{fontSize:14,fontWeight:600,fontFamily:"monospace",color:aiTarget.demonetized>0?C.red:C.green}}>{aiTarget.demonetized}</div>
                </div>
                <div>
                  <div style={{fontSize:9,color:C.muted,letterSpacing:"0.14em",textTransform:"uppercase"}}>Vi phạm</div>
                  <div style={{fontSize:14,fontWeight:600,fontFamily:"monospace",color:aiTarget.violations>0?C.amber:C.green}}>{aiTarget.violations}</div>
                </div>
              </div>

              {/* Section tabs */}
              <div style={{display:"flex",gap:4,marginBottom:14,borderBottom:`1px solid ${C.borderSoft}`,paddingBottom:1}}>
                {[
                  { id:"overview", label:"📊 Tổng quan", section: parsedSections.overview },
                  { id:"growth", label:"📈 Tăng trưởng", section: parsedSections.growth },
                  { id:"risk", label:"🚨 Rủi ro", section: parsedSections.risk },
                  { id:"forecast", label:"🔮 Dự báo", section: parsedSections.forecast },
                  { id:"action", label:"⚡ Hành động", section: parsedSections.action },
                ].map(s => (
                  <button key={s.id} onClick={()=>setAiSection(s.id)}
                    disabled={!s.section}
                    style={{padding:"8px 14px",fontSize:11,fontWeight:500,cursor:s.section?"pointer":"not-allowed",
                      border:"none",background:"none",
                      color: aiSection===s.id ? C.ai : (s.section ? C.text : C.borderSoft),
                      borderBottom:`2px solid ${aiSection===s.id ? C.ai : "transparent"}`,
                      opacity: s.section ? 1 : 0.4}}>
                    {s.label}
                  </button>
                ))}
              </div>

              {/* Section content */}
              <div style={{minHeight:200,fontSize:12,lineHeight:1.75,color:C.text,padding:"4px 2px"}}>
                {parsedSections[aiSection] ? (
                  <SafeMarkdown text={parsedSections[aiSection]}/>
                ) : (
                  <div style={{color:C.muted,fontStyle:"italic",textAlign:"center",padding:20}}>
                    AI không trả về section này. Có thể model bỏ format. Bấm "Xem raw" để đọc full text.
                  </div>
                )}
              </div>

              {/* Footer */}
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginTop:14,paddingTop:12,borderTop:`1px solid ${C.borderSoft}`}}>
                <div style={{fontSize:10,color:C.muted}}>
                  💾 Cache 12h · model {lsGet("meridian-claude-model","claude-sonnet-4-5")}
                </div>
                <div style={{display:"flex",gap:6}}>
                  <Btn ghost onClick={()=>{
                    const blob = new Blob([aiResult], { type: "text/plain;charset=utf-8" });
                    const a = document.createElement("a");
                    a.href = URL.createObjectURL(blob);
                    a.download = `ai-analysis-${aiTarget.id}-${new Date().toISOString().slice(0,10)}.md`;
                    a.click();
                  }} icon={Download}>Export MD</Btn>
                  <Btn ghost onClick={()=>analyzeOneCms(aiTarget)} icon={RefreshCw}>Re-analyze</Btn>
                </div>
              </div>
            </>
          ) : (
            <div style={{padding:30,textAlign:"center",color:C.muted}}>Chưa có kết quả</div>
          )}
        </Modal>
      )}
      </>
      )}
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════
// ─── CmsHistoryView — Time-series chart + variation tracking ──────
// Shows daily revenue/views/channels per CMS over time, with delta indicators
// ═══════════════════════════════════════════════════════════════════
// ── Parse "Table data.csv" from YouTube Studio export (daily channel stats) ──
function parseCmsDailyTableCsv(text) {
  const lines = text.split(/\r?\n/).filter(l => l.trim());
  if (lines.length < 2) return [];
  const sep = lines[0].includes("\t") ? "\t" : ",";
  const parseRow = line => {
    const cells = []; let cur = "", inQ = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') { inQ = !inQ; }
      else if (ch === sep && !inQ) { cells.push(cur.trim().replace(/^"|"$/g,"")); cur = ""; }
      else cur += ch;
    }
    cells.push(cur.trim().replace(/^"|"$/g,""));
    return cells;
  };
  const headers = parseRow(lines[0]).map(h => h.toLowerCase().trim());
  const fi = k => headers.findIndex(h => k.some(kw => h.includes(kw)));
  const idx = {
    date:    fi(["date"]),
    engaged: fi(["engaged views"]),
    views:   fi(["^views","\\bviews\\b", "views"]),
    watch:   fi(["watch time"]),
    avgDur:  fi(["average view duration"]),
    revenue: fi(["estimated partner revenue","revenue"]),
  };
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const r = parseRow(lines[i]);
    const date = r[idx.date] || "";
    if (!date || date === "Total" || !/^\d{4}-\d{2}-\d{2}/.test(date)) continue;
    rows.push({
      snapshot_date: date.slice(0, 10),
      revenue:       parseFloat(r[idx.revenue]) || 0,
      views:         parseFloat(r[idx.views])   || 0,
      engagedViews:  parseFloat(r[idx.engaged]) || 0,
      watchTime:     parseFloat(r[idx.watch])   || 0,
      avgViewDuration: r[idx.avgDur] || "",
    });
  }
  return rows;
}

const CmsHistoryView = ({ state, toast, cmsList }) => {
  const C = useC();
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(30);
  const [selectedCms, setSelectedCms] = useState("all"); // "all" or cms_id
  const [metric, setMetric] = useState("revenue"); // revenue | views | channels | health_score
  const [error, setError] = useState(null);

  // ── Import CSV state ──────────────────────────────────────────
  const importRef = useRef(null);
  const [importModal, setImportModal] = useState(null); // null | "preview"
  const [importRows, setImportRows]   = useState([]);
  const [importCmsId, setImportCmsId] = useState("");
  const [importFileName, setImportFileName] = useState("");
  const [importing, setImporting]     = useState(false);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    const res = await fetchCmsHistory({ days });
    if (res.error) setError(res.error);
    setHistory(res.items || []);
    setLoading(false);
  }, [days]);

  useEffect(() => { reload(); }, [reload]);

  // Group history by date for chart, with one column per CMS
  const chartData = useMemo(() => {
    const byDate = new Map();
    const filtered = selectedCms === "all" ? history : history.filter(h => h.cms_id === selectedCms);
    filtered.forEach(h => {
      const d = h.snapshot_date;
      if (!byDate.has(d)) byDate.set(d, { date: d });
      byDate.get(d)[h.cms_id] = Number(h[metric]) || 0;
      byDate.get(d)[`${h.cms_id}_name`] = h.cms_name;
    });
    return [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date));
  }, [history, selectedCms, metric]);

  // Per-CMS variation table (today vs yesterday vs 7d ago vs 30d ago)
  const variationRows = useMemo(() => {
    return cmsList.map(cms => {
      const cmsHistory = history.filter(h => h.cms_id === cms.id);
      if (cmsHistory.length === 0) return null;
      const v1d = computeVariation(cmsHistory, metric, 1);
      const v7d = computeVariation(cmsHistory, metric, 7);
      const v30d = computeVariation(cmsHistory, metric, 30);
      return {
        cms,
        snapshotCount: cmsHistory.length,
        firstDate: cmsHistory[0]?.snapshot_date,
        lastDate: cmsHistory[cmsHistory.length - 1]?.snapshot_date,
        current: v1d.current,
        v1d, v7d, v30d,
      };
    }).filter(Boolean).sort((a, b) => b.current - a.current);
  }, [history, cmsList, metric]);

  const cmsColors = useMemo(() => {
    const palette = ["#0066CC", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6", "#EC4899", "#14B8A6", "#F97316"];
    const map = {};
    cmsList.forEach((c, i) => { map[c.id] = palette[i % palette.length]; });
    return map;
  }, [cmsList]);

  const fmtMetric = (v) => {
    if (metric === "revenue") return `$${fmt(Math.round(v))}`;
    if (metric === "views") return fmt(Math.round(v));
    return Math.round(v).toString();
  };

  // ── Import: read file → parse rows → open preview modal ──────
  const handleImportFile = async (file) => {
    if (!file) return;
    let csvText = null;
    let fileName = file.name;
    try {
      if (file.name.toLowerCase().endsWith(".zip")) {
        const JSZip = await loadJSZip();
        const zip   = await JSZip.loadAsync(file);
        // find "Table data.csv" (case-insensitive) inside zip
        const entry = Object.entries(zip.files).find(([n]) => /table data/i.test(n) && n.endsWith(".csv"));
        if (!entry) { toast?.("Không tìm thấy 'Table data.csv' trong ZIP", "error"); return; }
        csvText  = await entry[1].async("text");
        fileName = file.name; // keep zip name for display
      } else {
        csvText = await file.text();
      }
      const rows = parseCmsDailyTableCsv(csvText);
      if (rows.length === 0) { toast?.("Không đọc được dữ liệu từ file", "error"); return; }
      // Auto-select CMS from filename (e.g. "... KUDO DIY.zip")
      const nameHint = file.name.replace(/\.[^.]+$/, "").replace(/Date\s*[\d_\-]+/i, "").trim();
      const autoMatch = cmsList.find(c => c.name.toLowerCase() === nameHint.toLowerCase())
        || cmsList.find(c => nameHint.toLowerCase().includes(c.name.toLowerCase()))
        || cmsList.find(c => c.name.toLowerCase().includes(nameHint.toLowerCase()));
      setImportRows(rows);
      setImportCmsId(autoMatch?.id || cmsList[0]?.id || "");
      setImportFileName(fileName);
      setImportModal("preview");
    } catch (e) {
      toast?.(`Lỗi đọc file: ${e.message}`, "error");
    }
  };

  // ── Import: push parsed rows to backend ─────────────────────
  const confirmImport = async () => {
    if (!importCmsId) { toast?.("Chọn CMS trước khi import", "warning"); return; }
    const cms = cmsList.find(c => c.id === importCmsId);
    setImporting(true);
    const items = importRows.map(r => ({
      cms_id:        importCmsId,
      cms_name:      cms?.name || importCmsId,
      snapshot_date: r.snapshot_date,
      currency:      cms?.currency || "USD",
      revenue:       r.revenue,
      views:         r.views,
      channels:      0, active_channels: 0,
      monetized:     0, demonetized: 0, suspended: 0,
      subscribers:   0, violations: 0, health_score: 100,
      topics:        0, partners:  0,
      source:        "csv_import",
      notes:         `watch_time:${r.watchTime};engaged:${r.engagedViews};avg_dur:${r.avgViewDuration}`,
    }));
    try {
      const r = await fetch("/api/cms-daily/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...backendAuthHeaders() },
        body: JSON.stringify({ items }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || `HTTP ${r.status}`);
      toast?.(`✅ Đã import ${data.count} ngày vào ${cms?.name || importCmsId}`, "success");
      setImportModal(null);
      reload();
    } catch (e) {
      toast?.(`❌ Import thất bại: ${e.message}`, "error");
    }
    setImporting(false);
  };

  return (
    <div>
      {/* Import CSV preview modal */}
      {importModal === "preview" && (
        <Modal title={`Import dữ liệu ngày — ${importFileName}`} onClose={() => setImportModal(null)}>
          <div style={{marginBottom:14}}>
            <div style={{fontSize:11,color:C.muted,marginBottom:10}}>
              Đọc được <strong style={{color:C.ink}}>{importRows.length} ngày</strong> dữ liệu
              ({importRows[0]?.snapshot_date} → {importRows[importRows.length-1]?.snapshot_date}).
              Chọn CMS để gán dữ liệu này vào:
            </div>
            <Field label="Gán vào CMS *">
              <Select value={importCmsId} onChange={e => setImportCmsId(e.target.value)} style={{width:"100%"}}>
                <option value="">-- Chọn CMS --</option>
                {cmsList.map(c => <option key={c.id} value={c.id}>{c.name} ({c.id})</option>)}
              </Select>
            </Field>
          </div>
          {/* Preview table */}
          <div style={{maxHeight:220,overflowY:"auto",border:`1px solid ${C.borderSoft}`,borderRadius:6,marginBottom:14}}>
            <table style={{width:"100%",borderCollapse:"collapse",fontSize:11}}>
              <thead style={{position:"sticky",top:0,background:C.bgAlt}}>
                <tr>
                  {["Ngày","Doanh thu (USD)","Views","Watch Time (h)","Avg Duration"].map(h => (
                    <th key={h} style={{textAlign:"left",padding:"7px 10px",color:C.muted,fontWeight:600,fontSize:9,letterSpacing:"0.1em",textTransform:"uppercase",borderBottom:`1px solid ${C.borderSoft}`}}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {importRows.map((r,i) => (
                  <tr key={i} style={{borderTop:i>0?`1px solid ${C.borderSoft}`:"none"}}>
                    <td style={{padding:"6px 10px",fontFamily:"monospace",color:C.ink}}>{r.snapshot_date}</td>
                    <td style={{padding:"6px 10px",fontFamily:"monospace",color:C.green}}>${r.revenue.toFixed(2)}</td>
                    <td style={{padding:"6px 10px",fontFamily:"monospace"}}>{fmt(r.views)}</td>
                    <td style={{padding:"6px 10px",fontFamily:"monospace"}}>{r.watchTime.toLocaleString(undefined,{maximumFractionDigits:0})}</td>
                    <td style={{padding:"6px 10px",fontFamily:"monospace",color:C.muted}}>{r.avgViewDuration}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={{fontSize:10,color:C.muted,marginBottom:14,background:C.bgAlt,padding:"8px 12px",borderRadius:6}}>
            ℹ️ Các trường không có trong file CSV (channels, subscribers, v.v.) sẽ được giữ nguyên nếu đã có snapshot, hoặc đặt về 0 nếu chưa có.
          </div>
          <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}>
            <Btn ghost onClick={() => setImportModal(null)} disabled={importing}>Hủy</Btn>
            <Btn primary onClick={confirmImport} disabled={importing || !importCmsId}>
              {importing ? "Đang import..." : `Import ${importRows.length} ngày`}
            </Btn>
          </div>
        </Modal>
      )}

      {/* Hidden file input */}
      <input ref={importRef} type="file" accept=".csv,.zip" style={{display:"none"}}
        onChange={e => { const f = e.target.files?.[0]; e.target.value = ""; if (f) handleImportFile(f); }}/>

      {/* Filter bar */}
      <Card style={{padding:14,marginBottom:14}}>
        <div style={{display:"flex",gap:12,flexWrap:"wrap",alignItems:"center"}}>
          <div>
            <div style={{fontSize:9,color:C.muted,letterSpacing:"0.14em",textTransform:"uppercase",marginBottom:4}}>Khoảng thời gian</div>
            <div style={{display:"flex",gap:4}}>
              {[7, 30, 90, 180, 365].map(d => (
                <button key={d} onClick={() => setDays(d)}
                  style={{
                    padding:"6px 12px",fontSize:11,fontWeight:500,cursor:"pointer",borderRadius:4,
                    background: days === d ? C.ink : "transparent",
                    color: days === d ? "#FFF" : C.text,
                    border: `1px solid ${days === d ? C.ink : C.border}`,
                  }}>{d}d</button>
              ))}
            </div>
          </div>
          <div>
            <div style={{fontSize:9,color:C.muted,letterSpacing:"0.14em",textTransform:"uppercase",marginBottom:4}}>CMS</div>
            <Select value={selectedCms} onChange={e => setSelectedCms(e.target.value)} style={{width:200}}>
              <option value="all">Tất cả ({cmsList.length})</option>
              {cmsList.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </Select>
          </div>
          <div>
            <div style={{fontSize:9,color:C.muted,letterSpacing:"0.14em",textTransform:"uppercase",marginBottom:4}}>Chỉ số</div>
            <Select value={metric} onChange={e => setMetric(e.target.value)} style={{width:200}}>
              <option value="revenue">💰 Doanh thu</option>
              <option value="views">👁️ Views</option>
              <option value="channels">📺 Số kênh</option>
              <option value="active_channels">🟢 Kênh active</option>
              <option value="subscribers">👥 Subscribers</option>
              <option value="violations">🚨 Vi phạm</option>
              <option value="health_score">💚 Health Score</option>
            </Select>
          </div>
          <div style={{marginLeft:"auto",display:"flex",gap:6}}>
            <Btn ghost icon={RefreshCw} onClick={reload} disabled={loading}>Tải lại</Btn>
            <Btn ghost icon={Upload} onClick={() => importRef.current?.click()} title="Import dữ liệu từ file CSV/ZIP của YouTube Studio">📥 Import CSV</Btn>
            <Btn ghost icon={Save} onClick={async () => {
              const r = await pushCmsDailySnapshot(state, "manual");
              if (r.ok) { toast?.(`✅ Snapshot ${r.count} CMS`, "success"); reload(); }
              else toast?.(`❌ ${r.error || "Lỗi"}`, "error");
            }}>📸 Snapshot ngay</Btn>
            <Btn ghost icon={Download} onClick={() => {
              if (history.length === 0) { toast?.("Không có dữ liệu để export", "warning"); return; }
              const csv = [
                "cms_id,cms_name,date,currency,revenue,views,channels,active_channels,monetized,demonetized,subscribers,violations,health_score",
                ...history.map(h => [
                  h.cms_id, `"${h.cms_name||""}"`, h.snapshot_date, h.currency,
                  h.revenue, h.views, h.channels, h.active_channels,
                  h.monetized, h.demonetized, h.subscribers, h.violations, h.health_score
                ].join(","))
              ].join("\n");
              const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
              const a = document.createElement("a");
              a.href = URL.createObjectURL(blob);
              a.download = `cms-history-${new Date().toISOString().slice(0,10)}.csv`;
              a.click();
            }}>Export CSV</Btn>
          </div>
        </div>
      </Card>

      {error && (
        <Card style={{padding:14,marginBottom:14,borderLeft:`3px solid ${C.red}`,background:C.redSoft}}>
          <div style={{fontSize:12,color:C.red}}>⚠️ Lỗi tải dữ liệu: {error}</div>
          <div style={{fontSize:10,color:C.muted,marginTop:4}}>Backend cần được cập nhật + cần đăng nhập với token. Bấm "Snapshot ngay" để bắt đầu ghi data.</div>
        </Card>
      )}

      {loading ? (
        <Card style={{padding:40,textAlign:"center"}}>
          <div style={{width:40,height:40,border:`3px solid ${C.borderSoft}`,borderTopColor:C.accent,borderRadius:"50%",animation:"spin 0.8s linear infinite",margin:"0 auto 14px"}}/>
          <div style={{fontSize:12,color:C.muted}}>Đang tải dữ liệu lịch sử...</div>
        </Card>
      ) : history.length === 0 ? (
        <Card style={{padding:40,textAlign:"center"}}>
          <Database size={40} style={{color:C.borderSoft,marginBottom:12}}/>
          <div style={{fontSize:14,fontWeight:500,color:C.ink,marginBottom:6}}>Chưa có dữ liệu lịch sử</div>
          <div style={{fontSize:11,color:C.muted,marginBottom:14}}>
            Hệ thống tự động chụp snapshot CMS hằng ngày (1 lần / ngày).<br/>
            Bấm "📸 Snapshot ngay" ở trên để bắt đầu ghi nhận dữ liệu hôm nay.
          </div>
          <Btn primary icon={Save} onClick={async () => {
            const r = await pushCmsDailySnapshot(state, "manual");
            if (r.ok) { toast?.(`✅ Snapshot ${r.count} CMS`, "success"); reload(); }
            else toast?.(`❌ ${r.error || "Lỗi"}`, "error");
          }}>📸 Tạo snapshot đầu tiên</Btn>
        </Card>
      ) : (
        <>
          {/* Chart */}
          <Card style={{padding:18,marginBottom:14}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
              <div>
                <div style={{fontSize:13,fontWeight:500,color:C.ink}}>
                  {metric === "revenue" ? "💰 Doanh thu" : metric === "views" ? "👁️ Views" :
                   metric === "channels" ? "📺 Số kênh" : metric === "active_channels" ? "🟢 Kênh active" :
                   metric === "subscribers" ? "👥 Subscribers" : metric === "violations" ? "🚨 Vi phạm" : "💚 Health Score"} theo ngày
                </div>
                <div style={{fontSize:10,color:C.muted}}>{chartData.length} điểm dữ liệu · {selectedCms === "all" ? `${cmsList.length} CMS` : cmsList.find(c=>c.id===selectedCms)?.name}</div>
              </div>
            </div>
            <div style={{height:340}}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 10, right: 20, left: 10, bottom: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={C.borderSoft}/>
                  <XAxis dataKey="date" tick={{fontSize:10,fill:C.muted}}
                    tickFormatter={(d) => d ? d.slice(5) : ""}/>
                  <YAxis tick={{fontSize:10,fill:C.muted}}
                    tickFormatter={(v) => metric === "revenue" ? `$${(v/1000).toFixed(0)}K` : v >= 1000000 ? `${(v/1000000).toFixed(1)}M` : v >= 1000 ? `${(v/1000).toFixed(0)}K` : v}/>
                  <Tooltip
                    contentStyle={{fontSize:11,borderRadius:6}}
                    formatter={(v, name) => [fmtMetric(v), cmsList.find(c=>c.id===name)?.name || name]}
                    labelFormatter={(label) => `📅 ${label}`}
                  />
                  {(selectedCms === "all" ? cmsList : cmsList.filter(c => c.id === selectedCms)).map(c => (
                    <Line key={c.id} type="monotone" dataKey={c.id}
                      stroke={cmsColors[c.id]} strokeWidth={2}
                      dot={{r:3}} activeDot={{r:5}}
                      name={c.id}/>
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
            {selectedCms === "all" && (
              <div style={{display:"flex",flexWrap:"wrap",gap:10,marginTop:10,paddingTop:10,borderTop:`1px solid ${C.borderSoft}`}}>
                {cmsList.map(c => (
                  <div key={c.id} style={{display:"flex",alignItems:"center",gap:6,fontSize:10}}>
                    <div style={{width:10,height:10,borderRadius:2,background:cmsColors[c.id]}}/>
                    <span style={{color:C.text}}>{c.name}</span>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Variation table */}
          <Card style={{padding:0,overflow:"hidden"}}>
            <div style={{padding:"14px 18px",borderBottom:`1px solid ${C.borderSoft}`,background:C.bgAlt}}>
              <div style={{fontSize:13,fontWeight:500,color:C.ink}}>📊 Biến thiên — so sánh các kỳ</div>
              <div style={{fontSize:10,color:C.muted}}>Hiện tại vs hôm qua / 7 ngày / 30 ngày trước</div>
            </div>
            <table style={{width:"100%",borderCollapse:"collapse"}}>
              <thead style={{background:C.bgAlt}}>
                <tr>
                  {["CMS","Hiện tại","vs Hôm qua","vs 7 ngày","vs 30 ngày","Snapshots","Từ ngày"].map(h => (
                    <th key={h} style={{textAlign:"left",fontSize:9,fontWeight:600,letterSpacing:"0.14em",textTransform:"uppercase",color:C.muted,padding:"10px 12px",borderTop:`1px solid ${C.borderSoft}`}}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {variationRows.map(row => {
                  const VarCell = ({ v }) => {
                    const pct = v.deltaPct;
                    const color = pct > 0 ? C.green : pct < 0 ? C.red : C.muted;
                    const arrow = pct > 0 ? "▲" : pct < 0 ? "▼" : "—";
                    return (
                      <td style={{padding:"10px 12px"}}>
                        <div style={{fontSize:11,fontFamily:"monospace",color,fontWeight:500}}>
                          {arrow} {pct > 0 ? "+" : ""}{pct.toFixed(1)}%
                        </div>
                        <div style={{fontSize:9,color:C.muted,fontFamily:"monospace"}}>
                          {v.delta > 0 ? "+" : ""}{fmtMetric(v.delta)}
                        </div>
                      </td>
                    );
                  };
                  return (
                    <tr key={row.cms.id} style={{borderTop:`1px solid ${C.borderSoft}`}}>
                      <td style={{padding:"10px 12px"}}>
                        <div style={{display:"flex",alignItems:"center",gap:8}}>
                          <div style={{width:10,height:10,borderRadius:2,background:cmsColors[row.cms.id]}}/>
                          <div>
                            <div style={{fontSize:12,fontWeight:500,color:C.ink}}>{row.cms.name}</div>
                            <div style={{fontSize:9,color:C.muted,fontFamily:"monospace"}}>{row.cms.id}</div>
                          </div>
                        </div>
                      </td>
                      <td style={{padding:"10px 12px",fontSize:13,fontFamily:"monospace",fontWeight:600,color:C.ink}}>
                        {fmtMetric(row.current)}
                      </td>
                      <VarCell v={row.v1d}/>
                      <VarCell v={row.v7d}/>
                      <VarCell v={row.v30d}/>
                      <td style={{padding:"10px 12px",fontSize:11,fontFamily:"monospace",color:C.text}}>{row.snapshotCount}</td>
                      <td style={{padding:"10px 12px",fontSize:10,color:C.muted}}>{row.firstDate}</td>
                    </tr>
                  );
                })}
                {variationRows.length === 0 && (
                  <tr><td colSpan={7} style={{padding:30,textAlign:"center",color:C.muted}}>Cần ≥2 snapshot/CMS để hiển thị biến thiên</td></tr>
                )}
              </tbody>
            </table>
          </Card>
        </>
      )}
    </div>
  );
};

// ─── FINANCE ──────────────────────────────────────────────────────
const FinanceView = ({ state, toast }) => {
  const C = useC();
  const { partners = [], channels = [], partnerSharing = [] } = state;

  // 🎯 Group revenue by currency — never mix USD + VND + CAD
  const byCurrency = useMemo(() => aggregateByCurrency(state), [state]);

  // Per-currency cost breakdown
  const finance = useMemo(() => {
    const cmsList = state.cmsList || [];
    const cmsByName = new Map(cmsList.map(c => [c.name, c]));
    return byCurrency.map(g => {
      const chs = channels.filter(c => {
        const cms = cmsByName.get(c.cms);
        const ccy = c.currency || cms?.currency || "USD";
        return ccy === g.currency;
      });
      // YouTube cut: 45% standard for ads (could be lower for Premium watch hours)
      const ytCut = Math.round(g.revenue * 0.45);
      const afterYt = g.revenue - ytCut;
      // Partner payouts: per-partner revShare from contracts or default
      let partnerPay = 0;
      partners.forEach(p => {
        const pchs = chs.filter(c => c.partner === p.name);
        const pRev = pchs.reduce((s,c)=>s+(Number(c.monthlyRevenue)||0), 0);
        const afterYtThis = pRev - Math.round(pRev * 0.45);
        partnerPay += Math.round(afterYtThis * (Number(p.revShare)||0) / 100);
      });
      return {
        currency: g.currency,
        gross: g.revenue,
        ytCut,
        afterYt,
        partnerPay,
        mcnNet: afterYt - partnerPay,
        channels: g.channels,
      };
    });
  }, [byCurrency, channels, partners, state.cmsList]);

  const totalGrossUsd = finance.find(f => f.currency === "USD")?.gross || 0;

  // Empty state
  if (channels.length === 0) {
    return (
      <div style={{padding:"20px 28px"}}>
        <Card style={{padding:0}}>
          <EmptyState
            icon={DollarSign}
            title="Chưa có dữ liệu tài chính"
            description="Hãy thêm kênh và đối tác để xem phân bổ doanh thu, YouTube cut, và lợi nhuận MCN."
          />
        </Card>
      </div>
    );
  }

  // Symbol map
  const ccySym = { USD:"$", CAD:"C$", EUR:"€", GBP:"£", JPY:"¥", VND:"₫", SGD:"S$", AUD:"A$" };

  return (
    <div style={{padding:"20px 28px"}}>
      {/* Hint */}
      <div style={{padding:10,background:C.bgAlt,borderRadius:5,fontSize:10,color:C.muted,marginBottom:12}}>
        💡 <strong>Cách tính:</strong> YouTube giữ 45% (ads), số dư × revShare từng partner = trả đối tác · Còn lại = lợi nhuận MCN. Doanh thu được nhóm <strong>theo đơn vị tiền tệ</strong> để tránh cộng nhầm USD + VND.
      </div>

      {/* Per-currency KPI groups */}
      {finance.map(f => (
        <div key={f.currency} style={{marginBottom:16}}>
          <div style={{display:"flex",alignItems:"baseline",gap:8,marginBottom:8}}>
            <div style={{fontFamily:"'Fraunces',serif",fontWeight:500,fontSize:13,color:C.ink}}>
              💰 Doanh thu {f.currency}
            </div>
            <div style={{fontSize:10,color:C.muted}}>{f.channels} kênh</div>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(170px,1fr))",gap:10}}>
            <Card style={{padding:14}}>
              <div style={{fontSize:9,fontWeight:600,letterSpacing:"0.14em",textTransform:"uppercase",color:C.muted}}>Tổng gross ({f.currency})</div>
              <div style={{fontFamily:"'Fraunces',serif",fontWeight:500,fontSize:20,color:C.ink,marginTop:6}}>
                {ccySym[f.currency]||""}{fmt(f.gross)}
              </div>
            </Card>
            <Card style={{padding:14}}>
              <div style={{fontSize:9,fontWeight:600,letterSpacing:"0.14em",textTransform:"uppercase",color:C.muted}}>YouTube giữ (45%)</div>
              <div style={{fontFamily:"'Fraunces',serif",fontWeight:500,fontSize:20,color:C.red,marginTop:6}}>
                −{ccySym[f.currency]||""}{fmt(f.ytCut)}
              </div>
            </Card>
            <Card style={{padding:14}}>
              <div style={{fontSize:9,fontWeight:600,letterSpacing:"0.14em",textTransform:"uppercase",color:C.muted}}>Trả đối tác</div>
              <div style={{fontFamily:"'Fraunces',serif",fontWeight:500,fontSize:20,color:C.amber,marginTop:6}}>
                −{ccySym[f.currency]||""}{fmt(f.partnerPay)}
              </div>
            </Card>
            <Card style={{padding:14,background:C.ink}}>
              <div style={{fontSize:9,fontWeight:600,letterSpacing:"0.14em",textTransform:"uppercase",color:"#9CA3AF"}}>Lợi nhuận MCN</div>
              <div style={{fontFamily:"'Fraunces',serif",fontWeight:500,fontSize:20,color:"#FFF",marginTop:6}}>
                {ccySym[f.currency]||""}{fmt(f.mcnNet)}
              </div>
              <div style={{fontSize:9,color:"#9CA3AF",marginTop:4}}>
                {f.gross > 0 ? `${(f.mcnNet/f.gross*100).toFixed(1)}% margin` : ""}
              </div>
            </Card>
          </div>
        </div>
      ))}

      {/* Partner breakdown table */}
      {partners.length > 0 && (
        <Card style={{padding:18,marginBottom:14}}>
          <div style={{fontFamily:"'Fraunces',serif",fontWeight:500,fontSize:15,color:C.ink,marginBottom:12}}>
            Phân bổ theo đối tác
          </div>
          <table style={{width:"100%",borderCollapse:"collapse"}}>
            <thead><tr style={{borderBottom:`1px solid ${C.borderSoft}`}}>
              {["Đối tác","Loại","Tier","Share","Kênh","Doanh thu"].map(h=>(
                <th key={h} style={{textAlign:"left",fontSize:9,fontWeight:600,letterSpacing:"0.14em",textTransform:"uppercase",color:C.muted,paddingBottom:8}}>{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {partners.map(p => {
                const pchs = channels.filter(c => c.partner === p.name);
                const rev = pchs.reduce((s,c)=>s+(Number(c.monthlyRevenue)||0), 0);
                return (
                  <tr key={p.id} style={{borderBottom:`1px solid ${C.borderSoft}`}}>
                    <td style={{padding:"9px 0",fontSize:12,color:C.ink}}>{p.name}</td>
                    <td style={{padding:"9px 0"}}><Pill color={p.type==="OWNED"?"accent":"gray"}>{p.type}</Pill></td>
                    <td style={{padding:"9px 0"}}><Pill color="blue">{p.tier}</Pill></td>
                    <td style={{padding:"9px 0",fontSize:11,fontFamily:"'JetBrains Mono',monospace"}}>{p.revShare}%</td>
                    <td style={{padding:"9px 0",fontSize:11,fontFamily:"'JetBrains Mono',monospace"}}>{pchs.length}</td>
                    <td style={{padding:"9px 0",fontSize:11,fontFamily:"'JetBrains Mono',monospace",fontWeight:500,color:C.ink}}>${fmt(rev)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
      )}

      {/* Imported sharing data */}
      {partnerSharing.length > 0 && (
        <Card style={{padding:18}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
            <div style={{fontFamily:"'Fraunces',serif",fontWeight:500,fontSize:15,color:C.ink}}>
              Doanh thu chia sẻ đối tác (từ file import)
            </div>
            <div style={{fontSize:10,color:C.muted}}>{partnerSharing.length} bản ghi</div>
          </div>
          <table style={{width:"100%",borderCollapse:"collapse"}}>
            <thead><tr style={{borderBottom:`1px solid ${C.borderSoft}`}}>
              {["Tháng","Tên kênh","CMS","Phòng","Đối tác","Doanh thu"].map(h=>(
                <th key={h} style={{textAlign:"left",fontSize:9,fontWeight:600,letterSpacing:"0.14em",textTransform:"uppercase",color:C.muted,paddingBottom:8}}>{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {partnerSharing.slice(0, 20).map((p,i) => (
                <tr key={i} style={{borderBottom:`1px solid ${C.borderSoft}`}}>
                  <td style={{padding:"9px 0",fontSize:11,color:C.text}}>{p.month}</td>
                  <td style={{padding:"9px 0",fontSize:12,color:C.ink}}>{p.name}</td>
                  <td style={{padding:"9px 0",fontSize:11,color:C.text}}>{p.cms}</td>
                  <td style={{padding:"9px 0",fontSize:11,color:C.text}}>{p.dept}</td>
                  <td style={{padding:"9px 0"}}><Pill color="blue">{p.partner}</Pill></td>
                  <td style={{padding:"9px 0",fontSize:11,fontFamily:"'JetBrains Mono',monospace",fontWeight:500,color:C.ink}}>${fmt(p.revenue)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
};

// ─── REPORTS ──────────────────────────────────────────────────────
const ReportsView = ({ state, dailyStats, toast }) => {
  const C = useC();
  const { channels } = state;

  // 🎯 REAL daily time-series (replaces fake makeDailyStats data)
  const realDaily = useMemo(() => aggregateDailyRevenue(state, 30), [state]);
  const hasTimeSeries = realDaily.some(d => d.revenue > 0 || d.views > 0);

  // CMS performance breakdown
  const cmsStats = useMemo(() => {
    const m = {};
    channels.forEach(c => {
      const k = c.cms || "(Chưa gán CMS)";
      if (!m[k]) m[k] = { name:k, channels:0, revenue:0, views:0 };
      m[k].channels++;
      m[k].revenue += Number(c.monthlyRevenue) || 0;
      m[k].views += Number(c.monthlyViews) || 0;
    });
    return Object.values(m).sort((a,b)=>b.revenue-a.revenue);
  }, [channels]);

  const totalRev = cmsStats.reduce((s,x)=>s+x.revenue, 0);
  const totalChannels = channels.length;

  if (totalChannels === 0) {
    return (
      <div style={{padding:"20px 28px"}}>
        <Card style={{padding:0}}>
          <EmptyState
            icon={BarChart2}
            title="Chưa có dữ liệu kênh"
            description="Hãy thêm kênh thủ công hoặc import file YouTube/MCN report để xem báo cáo doanh thu chi tiết."
          />
        </Card>
      </div>
    );
  }

  return (
    <div style={{padding:"20px 28px"}}>
      {/* Quick KPI strip — actual numbers, not fake */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit, minmax(160px,1fr))",gap:10,marginBottom:14}}>
        <Card style={{padding:14}}>
          <div style={{fontSize:9,fontWeight:600,letterSpacing:"0.14em",textTransform:"uppercase",color:C.muted}}>Tổng kênh</div>
          <div style={{fontFamily:"'Fraunces',serif",fontWeight:500,fontSize:22,color:C.ink,marginTop:6}}>{fmtFull(totalChannels)}</div>
        </Card>
        <Card style={{padding:14}}>
          <div style={{fontSize:9,fontWeight:600,letterSpacing:"0.14em",textTransform:"uppercase",color:C.muted}}>Tổng doanh thu (snapshot)</div>
          <div style={{fontFamily:"'Fraunces',serif",fontWeight:500,fontSize:22,color:C.ink,marginTop:6}}>${fmt(totalRev)}</div>
        </Card>
        <Card style={{padding:14}}>
          <div style={{fontSize:9,fontWeight:600,letterSpacing:"0.14em",textTransform:"uppercase",color:C.muted}}>Tổng views/tháng</div>
          <div style={{fontFamily:"'Fraunces',serif",fontWeight:500,fontSize:22,color:C.ink,marginTop:6}}>{fmt(channels.reduce((s,c)=>s+(c.monthlyViews||0),0))}</div>
        </Card>
        <Card style={{padding:14}}>
          <div style={{fontSize:9,fontWeight:600,letterSpacing:"0.14em",textTransform:"uppercase",color:C.muted}}>Số CMS đang dùng</div>
          <div style={{fontFamily:"'Fraunces',serif",fontWeight:500,fontSize:22,color:C.ink,marginTop:6}}>{cmsStats.length}</div>
        </Card>
      </div>

      {/* Time-series chart — only show if real data exists */}
      <Card style={{padding:18,marginBottom:14}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:14}}>
          <div style={{fontFamily:"'Fraunces',serif",fontWeight:500,fontSize:15,color:C.ink}}>
            Doanh thu theo ngày (30 ngày qua)
          </div>
          {hasTimeSeries && (
            <div style={{fontSize:10,color:C.muted}}>
              Σ ${fmt(realDaily.reduce((s,d)=>s+d.revenue, 0))} từ <strong>{realDaily.filter(d=>d.count>0).length} ngày có data</strong>
            </div>
          )}
        </div>
        {hasTimeSeries ? (
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={realDaily}>
              <defs><linearGradient id="rrev" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={C.accent} stopOpacity={0.3}/>
                <stop offset="100%" stopColor={C.accent} stopOpacity={0}/>
              </linearGradient></defs>
              <CartesianGrid strokeDasharray="2 4" stroke={C.borderSoft} vertical={false}/>
              <XAxis dataKey="date" tick={{fontSize:9,fill:C.muted}} axisLine={{stroke:C.border}} tickLine={false}/>
              <YAxis tick={{fontSize:9,fill:C.muted}} axisLine={false} tickLine={false} tickFormatter={v=>"$"+fmt(v)}/>
              <Tooltip contentStyle={{background:C.ink,border:"none",borderRadius:4,fontSize:11,color:"#FFF"}} formatter={(v)=>"$"+fmt(v)}/>
              <Area type="monotone" dataKey="revenue" stroke={C.accent} strokeWidth={1.8} fill="url(#rrev)"/>
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <EmptyState
            icon={Upload}
            title="Chưa có time-series data"
            description="Để xem biểu đồ doanh thu theo ngày, hãy import file 'Partner Sharing' hoặc 'Video Analytics' từ YouTube CMS."
            compact
          />
        )}
      </Card>

      {/* CMS breakdown */}
      <Card style={{padding:18}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
          <div style={{fontFamily:"'Fraunces',serif",fontWeight:500,fontSize:15,color:C.ink}}>Hiệu suất theo CMS</div>
          <div style={{fontSize:10,color:C.muted}}>{cmsStats.length} CMS · sắp xếp theo doanh thu</div>
        </div>
        <table style={{width:"100%",borderCollapse:"collapse"}}>
          <thead><tr style={{borderBottom:`1px solid ${C.borderSoft}`}}>
            {["CMS","Kênh","Views","Doanh thu","Tỷ lệ"].map(h=>(
              <th key={h} style={{textAlign:"left",fontSize:9,fontWeight:600,letterSpacing:"0.14em",textTransform:"uppercase",color:C.muted,paddingBottom:8}}>{h}</th>
            ))}
          </tr></thead>
          <tbody>{cmsStats.map(c => {
            const pct = totalRev>0 ? (c.revenue/totalRev*100).toFixed(1) : 0;
            return (
              <tr key={c.name} style={{borderBottom:`1px solid ${C.borderSoft}`}}>
                <td style={{padding:"9px 0",fontSize:12,fontWeight:500,color:C.ink}}>{c.name}</td>
                <td style={{padding:"9px 0",fontSize:11,fontFamily:"'JetBrains Mono',monospace"}}>{c.channels}</td>
                <td style={{padding:"9px 0",fontSize:11,fontFamily:"'JetBrains Mono',monospace"}}>{fmt(c.views)}</td>
                <td style={{padding:"9px 0",fontSize:11,fontFamily:"'JetBrains Mono',monospace",fontWeight:500,color:C.ink}}>${fmt(c.revenue)}</td>
                <td style={{padding:"9px 0",width:"35%"}}>
                  <div style={{display:"flex",alignItems:"center",gap:6}}>
                    <div style={{flex:1,height:4,background:C.bgAlt,borderRadius:2,overflow:"hidden"}}>
                      <div style={{width:`${pct}%`,height:"100%",background:C.accent}}/>
                    </div>
                    <span style={{fontSize:10,fontFamily:"'JetBrains Mono',monospace",color:C.muted,minWidth:34,textAlign:"right"}}>{pct}%</span>
                  </div>
                </td>
              </tr>
            );
          })}</tbody>
        </table>
      </Card>
    </div>
  );
};

// ─── Backend Token section — secure communication với PostgreSQL backend
function BackendTokenSection({ C, toast }) {
  const [token, setToken] = useState(() => lsGet("meridian-backend-token", ""));
  const [showToken, setShowToken] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);

  const save = () => {
    lsSet("meridian-backend-token", token);
    toast?.(token ? "✅ Đã lưu Backend Token" : "Đã xóa Backend Token", "success");
  };

  const testToken = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      // Test by trying to PUT a no-op
      const r = await fetch("/api/store/__test_token__", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { "X-Meridian-Token": token } : {}),
        },
        body: JSON.stringify({ value: { test: true, ts: Date.now() } }),
      });
      if (r.status === 401) {
        setTestResult({ ok: false, msg: "❌ Token sai — backend trả 401 Unauthorized" });
      } else if (r.ok) {
        setTestResult({ ok: true, msg: "✅ Token hợp lệ — backend chấp nhận mutation" });
        // Cleanup test key
        await fetch("/api/store/__test_token__", { method: "DELETE", headers: token?{"X-Meridian-Token":token}:{} }).catch(()=>{});
      } else {
        setTestResult({ ok: false, msg: `⚠️ HTTP ${r.status} — kiểm tra backend đang chạy không` });
      }
    } catch (e) {
      setTestResult({ ok: false, msg: `❌ Network error: ${e.message}` });
    } finally {
      setTesting(false);
    }
  };

  return (
    <Field label="🔐 Backend API Token (sync với PostgreSQL)">
      <div style={{padding:10,background:C.bgAlt,borderRadius:5,marginBottom:8,fontSize:10,color:C.muted}}>
        💡 Token này dùng cho frontend xác thực với backend khi sync data lên PostgreSQL.<br/>
        Backend đang chạy với <code>MERIDIAN_API_TOKEN</code> environment variable. Nếu để trống, mọi mutation sẽ bị reject 401.<br/>
        <strong>Token mặc định</strong>: xem file <code>D:\meridian-build\meridian-mcn\.api-token</code> trên máy host (chỉ Super Admin nên biết).
      </div>
      <div style={{display:"flex",gap:6}}>
        <div style={{position:"relative",flex:1}}>
          <Input type={showToken?"text":"password"} value={token} onChange={e=>setToken(e.target.value)}
            placeholder="48-character random token" style={{paddingRight:34,fontFamily:"monospace"}}/>
          <button onClick={()=>setShowToken(s=>!s)} style={{position:"absolute",right:8,top:8,background:"none",border:"none",cursor:"pointer"}}>
            {showToken ? <EyeOff size={14} style={{color:C.muted}}/> : <Eye size={14} style={{color:C.muted}}/>}
          </button>
        </div>
        <Btn primary onClick={save} icon={Save}>Lưu</Btn>
        <Btn ghost onClick={testToken} disabled={testing} icon={Zap}>{testing?"...":"Test"}</Btn>
      </div>
      {testResult && (
        <div style={{marginTop:8,padding:"8px 10px",borderRadius:4,fontSize:11,
          background:testResult.ok ? C.greenSoft : C.redSoft,
          color:testResult.ok ? C.green : C.red}}>
          {testResult.msg}
        </div>
      )}
    </Field>
  );
}

// ─── Periodic Audit Card — config + manual run ────────────────────
function PeriodicAuditCard({ C, toast, state }) {
  const [cfg, setCfg] = useState(() => lsGet("meridian-v51-audit-cfg", { enabled: false, frequency: "monthly", lastRun: 0, autoLogDecisions: false }));
  const [runResult, setRunResult] = useState(null);

  const update = (patch) => {
    const next = { ...cfg, ...patch };
    setCfg(next);
    lsSet("meridian-v51-audit-cfg", next);
  };

  const runNow = () => {
    const anomalies = detectAnomalies(state);
    const topicStrategy = computeTopicStrategy(state);
    const dropTopics = topicStrategy.filter(t => t.recommendation === "DROP");
    const expandTopics = topicStrategy.filter(t => t.recommendation === "EXPAND");
    setRunResult({
      ts: new Date().toISOString(),
      anomalies: anomalies.length,
      highSeverity: anomalies.filter(a => a.severity === "high").length,
      dropTopics: dropTopics.length,
      expandTopics: expandTopics.length,
      totalChannels: state.channels?.length || 0,
    });
    update({ lastRun: Date.now() });
    toast?.("✅ Đã chạy audit ngay", "success");
  };

  const intervalDays = { weekly: 7, monthly: 30, quarterly: 90 }[cfg.frequency || "monthly"];
  const dueAt = (cfg.lastRun || 0) + intervalDays * 86400000;
  const dueIn = Math.round((dueAt - Date.now()) / 86400000);

  return (
    <Card style={{padding:22,borderLeft:`3px solid ${cfg.enabled ? C.green : C.muted}`}}>
      <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:6}}>
        <Activity size={16} style={{color: cfg.enabled ? C.green : C.muted}}/>
        <div style={{fontFamily:"'Fraunces',serif",fontWeight:500,fontSize:15,color:C.ink}}>Periodic Audit — Đánh giá định kỳ tự động</div>
      </div>
      <div style={{fontSize:11,color:C.muted,marginBottom:14}}>
        Hệ thống tự chạy <strong>anomaly detection + topic strategy</strong> theo chu kỳ. Gửi báo cáo qua webhook + tạo task trong Inbox cho QC/Compliance manager.
      </div>
      <div style={{display:"flex",gap:14,flexWrap:"wrap",alignItems:"center",marginBottom:10}}>
        <label style={{display:"flex",alignItems:"center",gap:6,fontSize:12,cursor:"pointer"}}>
          <input type="checkbox" checked={!!cfg.enabled} onChange={e=>update({ enabled: e.target.checked })}/>
          Bật Audit định kỳ
        </label>
        <Field label="" style={{margin:0}}>
          <span style={{fontSize:11,color:C.muted,marginRight:6}}>Tần suất:</span>
          <Select value={cfg.frequency || "monthly"} onChange={e=>update({ frequency: e.target.value })} style={{display:"inline-block",width:140}}>
            <option value="weekly">Hàng tuần</option>
            <option value="monthly">Hàng tháng</option>
            <option value="quarterly">Hàng quý</option>
          </Select>
        </Field>
        <label style={{display:"flex",alignItems:"center",gap:6,fontSize:11,cursor:"pointer"}}>
          <input type="checkbox" checked={!!cfg.autoLogDecisions} onChange={e=>update({ autoLogDecisions: e.target.checked })}/>
          Auto-ghi DROP topic vào Decision Log
        </label>
        <Btn ghost onClick={runNow} icon={Zap}>Chạy audit ngay</Btn>
      </div>

      {cfg.enabled && (
        <div style={{padding:10,background:C.bgAlt,borderRadius:5,fontSize:11,color:C.text}}>
          📅 <strong>Lần chạy gần nhất:</strong> {cfg.lastRun ? new Date(cfg.lastRun).toLocaleString("vi-VN") : "Chưa từng chạy"} <br/>
          ⏰ <strong>Lần chạy tiếp:</strong> {cfg.lastRun ? new Date(dueAt).toLocaleString("vi-VN") : "ngay khi enabled"} {cfg.lastRun && `(${dueIn >= 0 ? `còn ${dueIn} ngày` : `quá hạn ${-dueIn} ngày`})`}
        </div>
      )}

      {runResult && (
        <div style={{marginTop:10,padding:12,background:C.bgAlt,borderRadius:5}}>
          <div style={{fontSize:11,fontWeight:500,color:C.ink,marginBottom:6}}>📋 Audit Report ({new Date(runResult.ts).toLocaleString("vi-VN")})</div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(120px,1fr))",gap:8}}>
            <div><div style={{fontSize:9,color:C.muted}}>Tổng kênh</div><div style={{fontSize:14,fontWeight:500}}>{runResult.totalChannels}</div></div>
            <div><div style={{fontSize:9,color:C.muted}}>Anomalies</div><div style={{fontSize:14,fontWeight:500,color:C.amber}}>{runResult.anomalies}</div></div>
            <div><div style={{fontSize:9,color:C.muted}}>High severity</div><div style={{fontSize:14,fontWeight:500,color:C.red}}>{runResult.highSeverity}</div></div>
            <div><div style={{fontSize:9,color:C.muted}}>Topic DROP</div><div style={{fontSize:14,fontWeight:500,color:C.red}}>{runResult.dropTopics}</div></div>
            <div><div style={{fontSize:9,color:C.muted}}>Topic EXPAND</div><div style={{fontSize:14,fontWeight:500,color:C.green}}>{runResult.expandTopics}</div></div>
          </div>
        </div>
      )}
    </Card>
  );
}

// ─── LAN Access Card — show URL for sharing across LAN ──────────────
function LANAccessCard({ C, toast }) {
  const [info, setInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch("/api/network-info");
        if (r.ok) setInfo(await r.json());
      } catch {}
      setLoading(false);
    })();
  }, []);

  const currentUrl = typeof window !== "undefined" ? window.location.origin : "";
  const isLocalhost = typeof window !== "undefined" && (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1");

  const copyUrl = (url) => {
    navigator.clipboard?.writeText(url);
    setCopied(true);
    toast?.("📋 Đã copy URL", "success");
    setTimeout(()=>setCopied(false), 2000);
  };

  return (
    <Card style={{padding:22,marginTop:14,borderLeft:`3px solid ${C.green}`}}>
      <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:6}}>
        <Globe size={16} style={{color:C.green}}/>
        <div style={{fontFamily:"'Fraunces',serif",fontWeight:500,fontSize:15,color:C.ink}}>Truy cập từ mạng LAN</div>
      </div>
      <div style={{fontSize:11,color:C.muted,marginBottom:14}}>
        Chia sẻ URL bên dưới với các thiết bị khác trong cùng mạng nội bộ (LAN/WiFi) để truy cập app cùng lúc.
      </div>

      {loading ? (
        <div style={{padding:20,textAlign:"center",color:C.muted,fontSize:11}}>Đang kiểm tra mạng...</div>
      ) : (
        <>
          {/* Current URL banner */}
          <div style={{padding:14,background:isLocalhost ? `${C.amber}15` : `${C.green}15`,borderRadius:6,borderLeft:`3px solid ${isLocalhost?C.amber:C.green}`,marginBottom:12}}>
            <div style={{fontSize:10,fontWeight:600,letterSpacing:"0.14em",textTransform:"uppercase",color:C.muted,marginBottom:6}}>
              {isLocalhost ? "⚠️ Đang dùng localhost (chỉ máy này truy cập được)" : "✅ Đang dùng URL LAN — sẵn sàng chia sẻ"}
            </div>
            <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:isLocalhost?8:0}}>
              <code style={{flex:1,padding:"8px 10px",background:C.card,borderRadius:4,fontSize:13,fontFamily:"monospace",color:C.ink,fontWeight:500,wordBreak:"break-all",border:`1px solid ${C.border}`}}>
                {currentUrl}
              </code>
              <Btn primary onClick={()=>copyUrl(currentUrl)} icon={copied?Check:Hash}>
                {copied ? "Đã copy" : "Copy URL"}
              </Btn>
            </div>
            {isLocalhost && (
              <div style={{fontSize:11,color:C.text,marginTop:6}}>
                💡 <strong>Để máy khác trong LAN truy cập được:</strong> mở browser ở máy đó và gõ <code>http://&lt;IP-LAN-của-máy-này&gt;:3010</code>
              </div>
            )}
          </div>

          {/* PowerShell command to find LAN IP */}
          {isLocalhost && (
            <div style={{marginBottom:12}}>
              <div style={{fontSize:11,fontWeight:500,color:C.ink,marginBottom:6}}>🔍 Cách lấy IP LAN của máy này (Windows PowerShell):</div>
              <div style={{display:"flex",gap:6}}>
                <code style={{flex:1,padding:"8px 10px",background:C.bgAlt,borderRadius:4,fontSize:11,fontFamily:"monospace",color:C.text}}>
                  Get-NetIPAddress -AddressFamily IPv4 | Where IPAddress -notlike "127.*" | Where IPAddress -notlike "169.*" | Format-Table IPAddress, InterfaceAlias
                </code>
                <Btn ghost onClick={()=>copyUrl(`Get-NetIPAddress -AddressFamily IPv4 | Where IPAddress -notlike "127.*" | Where IPAddress -notlike "169.*" | Format-Table IPAddress, InterfaceAlias`)}>Copy lệnh</Btn>
              </div>
              <div style={{fontSize:10,color:C.muted,marginTop:6}}>
                Hoặc dùng <code>ipconfig</code> trong CMD — tìm dòng <code>IPv4 Address</code> ở phần Ethernet/Wi-Fi.
              </div>
            </div>
          )}

          {/* Sample LAN URL builder */}
          {isLocalhost && (
            <SampleLANUrlBuilder C={C} copyUrl={copyUrl}/>
          )}

          {/* Backend network info */}
          {info && (
            <div style={{padding:10,background:C.bgAlt,borderRadius:5,fontSize:10,color:C.muted,fontFamily:"monospace"}}>
              <strong>API endpoint:</strong> {info.requestedVia}/api<br/>
              <strong>Container hostname:</strong> {info.hostname}<br/>
              {info.containerInterfaces.length > 0 && (
                <span><strong>Container IPs:</strong> {info.containerInterfaces.map(i=>i.address).join(", ")}</span>
              )}
            </div>
          )}

          {/* Firewall hint */}
          <div style={{marginTop:12,padding:10,background:`${C.amber}10`,borderRadius:5,fontSize:10,color:C.text,borderLeft:`2px solid ${C.amber}`}}>
            🔥 <strong>Nếu thiết bị LAN không truy cập được:</strong>
            <ul style={{margin:"4px 0 0 18px",padding:0}}>
              <li>Windows Firewall → Advanced Settings → Inbound Rules → New Rule → Port 3010 → Allow</li>
              <li>Hoặc lệnh PowerShell (admin): <code style={{background:C.card,padding:"1px 4px",borderRadius:3}}>New-NetFirewallRule -DisplayName "Meridian Frontend" -Direction Inbound -LocalPort 3010 -Protocol TCP -Action Allow</code></li>
              <li>Đảm bảo máy chạy Docker và máy LAN cùng subnet (vd. cùng router)</li>
            </ul>
          </div>
        </>
      )}
    </Card>
  );
}

function SampleLANUrlBuilder({ C, copyUrl }) {
  const [ip, setIp] = useState("");
  const url = ip ? `http://${ip}:3010` : "";
  return (
    <div style={{marginBottom:12,padding:12,background:C.bgAlt,borderRadius:5}}>
      <div style={{fontSize:11,fontWeight:500,color:C.ink,marginBottom:6}}>🔗 Tạo URL chia sẻ nhanh:</div>
      <div style={{display:"flex",gap:6,alignItems:"center"}}>
        <span style={{fontSize:11,fontFamily:"monospace",color:C.muted}}>http://</span>
        <Input value={ip} onChange={e=>setIp(e.target.value.trim())} placeholder="192.168.1.100" style={{flex:1,fontFamily:"monospace"}}/>
        <span style={{fontSize:11,fontFamily:"monospace",color:C.muted}}>:3010</span>
        {url && <Btn ghost onClick={()=>copyUrl(url)} icon={Hash}>Copy</Btn>}
      </div>
      {url && (
        <div style={{marginTop:6,fontSize:11,fontFamily:"monospace",color:C.green,padding:"6px 10px",background:C.card,borderRadius:4,border:`1px solid ${C.borderSoft}`}}>
          {url}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// ─── PAYOUT CALCULATOR + INVOICE PDF GENERATOR ────────────────────
// Tính payout per partner per period dựa trên contracts + revenue.
// ═══════════════════════════════════════════════════════════════════

// Compute payouts for a given period (YYYY-MM)
function computePayouts(state, periodKey) {
  const contracts = (state.contracts || []).filter(c => c.status === "Active" || !c.status);
  const channels = state.channels || [];
  const sharing = state.partnerSharing || [];
  const cmsList = state.cmsList || [];
  const cmsByName = new Map(cmsList.map(c => [c.name, c]));
  const partners = state.partners || [];

  return contracts.map(ct => {
    const partner = partners.find(p => p.id === ct.partnerId) || { name: ct.partnerName };
    const ctChannels = (ct.channelIds||[]).map(id => channels.find(c=>c.id===id)).filter(Boolean);

    // Sum revenue from partnerSharing for the period (if available)
    // Otherwise use channel.monthlyRevenue snapshot
    let grossRevenue = 0;
    let revenueSource = "snapshot"; // or "sharing"
    let currency = "USD";
    if (ctChannels.length > 0) {
      const ccyMap = ctChannels[0];
      const cms = cmsByName.get(ccyMap.cms);
      currency = ccyMap.currency || cms?.currency || "USD";
    }

    if (periodKey) {
      // Use partnerSharing for the specific period
      const periodEntries = sharing.filter(s =>
        ctChannels.some(c => c.id === s.channelId || c.ytId === s.ytId) &&
        ((s.month && s.month.startsWith(periodKey)) || (s.date && s.date.startsWith(periodKey)))
      );
      if (periodEntries.length > 0) {
        grossRevenue = periodEntries.reduce((s,e) => s + Number(e.revenue||0), 0);
        revenueSource = "sharing";
      }
    }
    if (grossRevenue === 0) {
      grossRevenue = ctChannels.reduce((s,c) => s + Number(c.monthlyRevenue||0), 0);
      revenueSource = "snapshot";
    }

    // Calculation
    const ytCutPct = 45;
    const ytCut = Math.round(grossRevenue * ytCutPct / 100);
    const afterYt = grossRevenue - ytCut;
    const revShare = Number(ct.revShare) || 0;
    const partnerGross = Math.round(afterYt * revShare / 100);
    const withholdingTaxPct = Number(ct.withholdingTax) || 0;
    const taxAmount = Math.round(partnerGross * withholdingTaxPct / 100);
    const netPayout = partnerGross - taxAmount;
    const minimumPayout = Number(ct.monthlyMinimum) || 0;
    const meetsMinimum = netPayout >= minimumPayout;
    const finalPayout = meetsMinimum ? netPayout : 0;
    const carryForward = meetsMinimum ? 0 : netPayout; // deferred to next period

    return {
      contractId: ct.id,
      contractName: ct.contractName,
      partnerId: ct.partnerId,
      partnerName: partner.name,
      partnerEmail: ct.partnerEmail,
      period: periodKey || "snapshot",
      currency,
      channelCount: ctChannels.length,
      channels: ctChannels.map(c => ({ id: c.id, name: c.name, ytId: c.ytId, revenue: c.monthlyRevenue||0 })),
      grossRevenue,
      ytCut, ytCutPct,
      afterYt,
      revShare,
      partnerGross,
      withholdingTaxPct,
      taxAmount,
      netPayout,
      minimumPayout,
      meetsMinimum,
      finalPayout,
      carryForward,
      revenueSource,
      paymentMethod: ct.paymentMethod || "—",
      paymentDetails: extractPaymentDetails(ct),
      invoiceRequired: !!ct.invoiceRequired,
    };
  }).filter(p => p.channelCount > 0); // skip contracts with no channels
}

function extractPaymentDetails(ct) {
  switch (ct.paymentMethod) {
    case "bank_transfer":
      return `${ct.bankName||"?"} · ${ct.bankAccount||"?"} · ${ct.bankHolder||"?"}${ct.swiftCode?` · SWIFT ${ct.swiftCode}`:""}`;
    case "paypal": return ct.paypalEmail || "—";
    case "payoneer": return ct.payoneerEmail || ct.payoneerId || "—";
    case "crypto": return `${ct.cryptoNetwork||"?"} · ${ct.cryptoWallet||"?"}`;
    case "cash": return "Tiền mặt";
    default: return "—";
  }
}

// Lazy load jsPDF
let _jsPdfPromise = null;
async function loadJsPDF() {
  if (typeof window !== "undefined" && window.jspdf) return window.jspdf;
  if (_jsPdfPromise) return _jsPdfPromise;
  _jsPdfPromise = new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = "https://cdn.jsdelivr.net/npm/jspdf@2.5.1/dist/jspdf.umd.min.js";
    s.onload = () => resolve(window.jspdf);
    s.onerror = () => reject(new Error("Không tải được jsPDF"));
    document.head.appendChild(s);
    setTimeout(() => reject(new Error("jsPDF timeout")), 10000);
  });
  return _jsPdfPromise;
}

// Generate invoice PDF for a single payout
async function generateInvoicePDF(payout, brand = {}) {
  const jspdf = await loadJsPDF();
  const { jsPDF } = jspdf;
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageW = 210;
  let y = 20;

  // Header
  doc.setFontSize(20);
  doc.setFont("helvetica", "bold");
  doc.text(brand.companyName || "Meridian MCN", 15, y);
  y += 6;
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(brand.appName || "MCN Management Platform", 15, y);
  y += 5;

  // Invoice title
  y += 8;
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text("INVOICE / HOA DON THANH TOAN", 15, y);
  y += 4;
  doc.setLineWidth(0.5);
  doc.line(15, y, pageW - 15, y);
  y += 8;

  // Invoice info
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  const invoiceNo = `INV-${payout.contractId}-${payout.period}`;
  const issueDate = new Date().toISOString().slice(0,10);
  doc.text(`Invoice No: ${invoiceNo}`, 15, y);
  doc.text(`Issue Date: ${issueDate}`, 120, y);
  y += 5;
  doc.text(`Period: ${payout.period}`, 15, y);
  doc.text(`Currency: ${payout.currency}`, 120, y);
  y += 8;

  // Bill to
  doc.setFont("helvetica", "bold");
  doc.text("BILL TO:", 15, y);
  y += 5;
  doc.setFont("helvetica", "normal");
  doc.text(`Partner: ${payout.partnerName}`, 15, y); y += 5;
  if (payout.partnerEmail) { doc.text(`Email: ${payout.partnerEmail}`, 15, y); y += 5; }
  doc.text(`Contract: ${payout.contractName} (${payout.contractId})`, 15, y);
  y += 8;

  // Channels table
  doc.setFont("helvetica", "bold");
  doc.text("CHANNELS:", 15, y);
  y += 5;
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  payout.channels.slice(0, 15).forEach(ch => {
    doc.text(`  - ${ch.name}`, 15, y);
    doc.text(`${payout.currency} ${ch.revenue.toFixed(2)}`, 170, y, { align: "right" });
    y += 4;
  });
  if (payout.channels.length > 15) {
    doc.text(`  ... và ${payout.channels.length - 15} kênh nữa`, 15, y);
    y += 4;
  }
  y += 4;

  // Calculation
  doc.setLineWidth(0.3);
  doc.line(15, y, pageW - 15, y);
  y += 6;
  doc.setFontSize(10);

  const drawRow = (label, value, isBold = false) => {
    if (isBold) doc.setFont("helvetica", "bold"); else doc.setFont("helvetica", "normal");
    doc.text(label, 15, y);
    doc.text(`${payout.currency} ${value.toFixed(2)}`, 170, y, { align: "right" });
    y += 5;
  };

  drawRow("Gross Revenue:", payout.grossRevenue);
  drawRow(`(-) YouTube share (${payout.ytCutPct}%):`, -payout.ytCut);
  drawRow("After YouTube cut:", payout.afterYt);
  drawRow(`(×) Partner share (${payout.revShare}%):`, payout.partnerGross);
  if (payout.taxAmount > 0) {
    drawRow(`(-) Withholding tax (${payout.withholdingTaxPct}%):`, -payout.taxAmount);
  }
  doc.line(15, y, pageW - 15, y);
  y += 5;
  drawRow("NET PAYOUT:", payout.netPayout, true);

  if (!payout.meetsMinimum && payout.minimumPayout > 0) {
    y += 3;
    doc.setFontSize(8);
    doc.setTextColor(180, 80, 0);
    doc.text(`* Below minimum payout (${payout.currency} ${payout.minimumPayout}). Carry-forward to next period.`, 15, y);
    doc.setTextColor(0,0,0);
    y += 5;
  }

  // Payment method
  y += 6;
  doc.setFont("helvetica", "bold");
  doc.text("PAYMENT METHOD:", 15, y); y += 5;
  doc.setFont("helvetica", "normal");
  doc.text(`Method: ${payout.paymentMethod}`, 15, y); y += 5;
  doc.text(`Details: ${payout.paymentDetails}`, 15, y);

  // Footer
  doc.setFontSize(8);
  doc.setTextColor(120,120,120);
  doc.text(`Generated by Meridian MCN at ${new Date().toLocaleString("vi-VN")}`, 15, 285);
  doc.text(`Invoice ID: ${invoiceNo}`, pageW - 15, 285, { align: "right" });

  doc.save(`Invoice-${payout.partnerName}-${payout.period}.pdf`);
  return invoiceNo;
}

// ─── Payouts View — calculate + invoice + track paid status ──────
function PayoutsView({ state, setState, currentUser, toast, brand }) {
  const C = useC();
  // Period selector — default current month
  const now = new Date();
  const defaultPeriod = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,"0")}`;
  const [period, setPeriod] = useState(defaultPeriod);
  const [generating, setGenerating] = useState(null);

  // Available periods (from current backwards 12 months)
  const periods = [];
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    periods.push(`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`);
  }

  const payouts = useMemo(() => computePayouts(state, period), [state, period]);

  // Track paid status per payout (by contractId+period)
  const paidStatus = lsGet("meridian-v51-payouts-paid", {});
  const [, forceUpdate] = useState(0);
  const togglePaid = (key) => {
    const updated = { ...lsGet("meridian-v51-payouts-paid", {}), [key]: !paidStatus[key] };
    if (!updated[key]) delete updated[key];
    if (updated[key] !== false) updated[key] = { paid: true, paidAt: new Date().toISOString(), by: currentUser?.id };
    lsSet("meridian-v51-payouts-paid", updated);
    forceUpdate(x => x + 1);
  };

  const generateInvoice = async (p) => {
    setGenerating(p.contractId);
    try {
      const invoiceNo = await generateInvoicePDF(p, brand);
      toast?.(`✅ Đã tạo invoice ${invoiceNo}`, "success");
    } catch (e) {
      toast?.(`Lỗi tạo PDF: ${e.message}`, "error");
    }
    setGenerating(null);
  };

  const generateBatch = async () => {
    if (!can(currentUser, "finance.read")) { toast?.("⛔ Cần quyền Finance Manager", "error"); return; }
    let success = 0, failed = 0;
    for (const p of payouts.filter(x => x.invoiceRequired && x.finalPayout > 0)) {
      try {
        await generateInvoicePDF(p, brand);
        success++;
        await new Promise(r => setTimeout(r, 200));
      } catch { failed++; }
    }
    toast?.(`Đã tạo ${success} invoice${failed > 0 ? `, ${failed} lỗi` : ""}`, "success");
  };

  // Aggregate by currency
  const byCurrency = useMemo(() => {
    const m = new Map();
    payouts.forEach(p => {
      if (!m.has(p.currency)) m.set(p.currency, { currency: p.currency, totalGross: 0, totalNet: 0, count: 0, paid: 0 });
      const g = m.get(p.currency);
      g.totalGross += p.grossRevenue;
      g.totalNet += p.finalPayout;
      g.count++;
      if (paidStatus[`${p.contractId}-${period}`]) g.paid += p.finalPayout;
    });
    return [...m.values()];
  }, [payouts, paidStatus, period]);

  const ccySym = { USD:"$", CAD:"C$", EUR:"€", GBP:"£", JPY:"¥", VND:"₫", SGD:"S$", AUD:"A$" };

  return (
    <div style={{padding:"20px 28px"}}>
      {/* Header */}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14,flexWrap:"wrap",gap:10}}>
        <div>
          <div style={{fontFamily:"'Fraunces',serif",fontWeight:500,fontSize:18,color:C.ink}}>💸 Payouts — Tính & xuất hóa đơn</div>
          <div style={{fontSize:11,color:C.muted}}>{payouts.length} contracts active · period <strong>{period}</strong></div>
        </div>
        <div style={{display:"flex",gap:6,alignItems:"center"}}>
          <Select value={period} onChange={e=>setPeriod(e.target.value)} style={{width:120,fontFamily:"monospace"}}>
            {periods.map(p => <option key={p} value={p}>{p}</option>)}
          </Select>
          {payouts.filter(p => p.invoiceRequired && p.finalPayout > 0).length > 0 && (
            <Btn primary onClick={generateBatch} icon={Download}>
              Tạo {payouts.filter(p => p.invoiceRequired && p.finalPayout > 0).length} invoice cùng lúc
            </Btn>
          )}
        </div>
      </div>

      {/* Currency summary */}
      {byCurrency.length > 0 && (
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(220px,1fr))",gap:10,marginBottom:14}}>
          {byCurrency.map(g => (
            <Card key={g.currency} style={{padding:14}}>
              <div style={{fontSize:9,fontWeight:600,letterSpacing:"0.14em",textTransform:"uppercase",color:C.muted}}>Tổng {g.currency} · {g.count} contracts</div>
              <div style={{display:"flex",gap:10,marginTop:6}}>
                <div>
                  <div style={{fontSize:9,color:C.muted}}>Gross</div>
                  <div style={{fontSize:14,fontWeight:500,color:C.text,fontFamily:"monospace"}}>{ccySym[g.currency]||""}{fmt(g.totalGross)}</div>
                </div>
                <div>
                  <div style={{fontSize:9,color:C.muted}}>Phải trả</div>
                  <div style={{fontSize:16,fontWeight:600,color:C.ink,fontFamily:"monospace"}}>{ccySym[g.currency]||""}{fmt(g.totalNet)}</div>
                </div>
                {g.paid > 0 && (
                  <div>
                    <div style={{fontSize:9,color:C.muted}}>Đã trả</div>
                    <div style={{fontSize:14,fontWeight:500,color:C.green,fontFamily:"monospace"}}>{ccySym[g.currency]||""}{fmt(g.paid)}</div>
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Payouts table */}
      {payouts.length === 0 ? (
        <Card style={{padding:0}}>
          <EmptyState
            icon={DollarSign}
            title="Chưa có payout nào"
            description="Cần có hợp đồng active + kênh được gán + revenue trong period đã chọn."
          />
        </Card>
      ) : (
        <Card style={{overflow:"hidden"}}>
          <table style={{width:"100%",borderCollapse:"collapse"}}>
            <thead style={{background:C.bgAlt}}>
              <tr>
                {["Đối tác","Hợp đồng","Kênh","Gross","YT cut","Partner share","Net Payout","Method","Status",""].map(h => (
                  <th key={h} style={{textAlign:"left",fontSize:9,fontWeight:600,letterSpacing:"0.14em",textTransform:"uppercase",color:C.muted,padding:"10px 10px"}}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {payouts.map(p => {
                const paidKey = `${p.contractId}-${period}`;
                const isPaid = !!paidStatus[paidKey];
                return (
                  <tr key={p.contractId} style={{borderTop:`1px solid ${C.borderSoft}`,opacity:p.finalPayout===0?0.6:1}}>
                    <td style={{padding:"9px 10px",fontSize:12,fontWeight:500,color:C.ink}}>{p.partnerName}</td>
                    <td style={{padding:"9px 10px",fontSize:11,color:C.text,maxWidth:160,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{p.contractName}</td>
                    <td style={{padding:"9px 10px",fontSize:11,fontFamily:"monospace"}}>{p.channelCount}</td>
                    <td style={{padding:"9px 10px",fontSize:11,fontFamily:"monospace"}}>{ccySym[p.currency]||""}{fmt(p.grossRevenue)}</td>
                    <td style={{padding:"9px 10px",fontSize:11,fontFamily:"monospace",color:C.red}}>−{ccySym[p.currency]||""}{fmt(p.ytCut)}</td>
                    <td style={{padding:"9px 10px",fontSize:11,fontFamily:"monospace"}}>{p.revShare}%</td>
                    <td style={{padding:"9px 10px"}}>
                      <div style={{fontSize:12,fontFamily:"monospace",fontWeight:500,color:p.finalPayout>0?C.ink:C.muted}}>
                        {ccySym[p.currency]||""}{fmt(p.finalPayout)}
                      </div>
                      {!p.meetsMinimum && p.minimumPayout > 0 && (
                        <div style={{fontSize:9,color:C.amber}}>Dưới min ({p.minimumPayout})</div>
                      )}
                      {p.taxAmount > 0 && <div style={{fontSize:9,color:C.muted}}>Tax: {ccySym[p.currency]||""}{fmt(p.taxAmount)}</div>}
                    </td>
                    <td style={{padding:"9px 10px",fontSize:10,maxWidth:180,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
                      {p.paymentMethod === "—" ? (
                        <span style={{color:C.amber}}>⚠️ chưa cấu hình</span>
                      ) : (
                        <Pill color="blue">{p.paymentMethod}</Pill>
                      )}
                    </td>
                    <td style={{padding:"9px 10px"}}>
                      {p.finalPayout === 0 ? (
                        <Pill color="gray">Skip</Pill>
                      ) : (
                        <button onClick={()=>togglePaid(paidKey)}
                          style={{padding:"3px 9px",fontSize:10,fontWeight:500,cursor:"pointer",
                            background:isPaid?C.greenSoft:"transparent",
                            color:isPaid?C.green:C.muted,
                            border:`1px solid ${isPaid?C.green:C.border}`,borderRadius:3}}>
                          {isPaid ? "✅ Đã trả" : "⏳ Chưa trả"}
                        </button>
                      )}
                    </td>
                    <td style={{padding:"9px 10px"}}>
                      {p.finalPayout > 0 && (
                        <Btn ghost onClick={()=>generateInvoice(p)} disabled={generating===p.contractId}
                          icon={generating===p.contractId?null:FileText}
                          style={{fontSize:10,padding:"4px 8px"}}>
                          {generating===p.contractId ? "..." : "PDF"}
                        </Btn>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
      )}

      {/* Help */}
      <div style={{marginTop:14,padding:10,background:C.bgAlt,borderRadius:5,fontSize:10,color:C.muted}}>
        💡 <strong>Cách tính payout:</strong> Gross × (1 − 45% YT cut) × revShare partner = Partner gross. Trừ tiếp withholding tax = Net payout.
        Nếu Net &lt; minimum → carry forward sang kỳ sau.<br/>
        📄 <strong>Invoice PDF</strong> cần payment method được cấu hình trong contract. Chỉ tạo PDF khi <code>invoiceRequired = true</code> trong batch mode.
      </div>
    </div>
  );
}

// ─── Decision Log View — strategic decisions memory ───────────────
const DecisionLogView = ({ state, setState, currentUser, toast, callAI }) => {
  const C = useC();
  const decisions = state.decisionLog || [];
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({});
  const [filter, setFilter] = useState("all");
  const canWrite = can(currentUser, "decisions.write");

  const openAdd = () => {
    setForm({
      type: "DROP_TOPIC",
      target: "",
      reason: "",
      dataSnapshot: {
        totalChannels: state.channels?.length || 0,
        totalRevenue: state.channels?.reduce?.((s,c)=>s+(c.monthlyRevenue||0), 0) || 0,
        totalViolations: state.violations?.length || 0,
      },
      expectedOutcome: "",
      reviewDate: new Date(Date.now() + 90*86400000).toISOString().slice(0,10), // 90 days later
    });
    setModal("add");
  };

  const save = () => {
    if (!form.target?.trim() || !form.reason?.trim()) { toast?.("Cần điền target và lý do", "warning"); return; }
    setState(s => ({
      ...s,
      decisionLog: [{
        id: `D${Date.now()}`,
        ...form,
        decidedBy: currentUser.id,
        decidedByEmail: currentUser.email,
        decidedAt: new Date().toISOString(),
        outcome: null,
        outcomeNote: "",
        outcomeRecordedAt: null,
        status: "pending-review",
      }, ...(s.decisionLog||[])]
    }));
    toast?.("✅ Đã ghi nhận quyết định", "success");
    setModal(null);
  };

  const recordOutcome = (decision, outcome, note) => {
    setState(s => ({
      ...s,
      decisionLog: (s.decisionLog||[]).map(d => d.id === decision.id ? {
        ...d,
        outcome,
        outcomeNote: note,
        outcomeRecordedAt: new Date().toISOString(),
        outcomeRecordedBy: currentUser.id,
        status: "reviewed",
      } : d),
    }));
    toast?.("✅ Đã ghi nhận kết quả", "success");
  };

  const filtered = filter === "all" ? decisions : decisions.filter(d => d.type === filter);

  const types = {
    DROP_TOPIC:    { label: "❌ Loại bỏ chủ đề", color: "red" },
    EXPAND_TOPIC:  { label: "🚀 Đẩy mạnh chủ đề", color: "green" },
    HOLD_TOPIC:    { label: "⏸️ Giữ nguyên chủ đề", color: "amber" },
    TERMINATE_PARTNER: { label: "🔚 Chấm dứt đối tác", color: "red" },
    NEW_PARTNERSHIP:   { label: "🤝 Mở partnership mới", color: "green" },
    POLICY_CHANGE: { label: "📜 Đổi chính sách", color: "blue" },
    INVEST: { label: "💰 Đầu tư", color: "blue" },
    OTHER: { label: "📌 Khác", color: "gray" },
  };

  return (
    <div style={{padding:"20px 28px"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14,flexWrap:"wrap",gap:8}}>
        <div>
          <div style={{fontFamily:"'Fraunces',serif",fontWeight:500,fontSize:18,color:C.ink}}>📜 Decision Log — Bộ nhớ chiến lược</div>
          <div style={{fontSize:11,color:C.muted}}>
            {decisions.length} quyết định · Lưu lại lý do + data snapshot + outcome để học hỏi
          </div>
        </div>
        {canWrite && (
          <Btn primary onClick={openAdd} icon={Plus}>Ghi nhận quyết định</Btn>
        )}
      </div>

      {/* Type filter */}
      <div style={{display:"flex",gap:4,marginBottom:12,flexWrap:"wrap"}}>
        <button onClick={()=>setFilter("all")}
          style={{padding:"5px 11px",fontSize:11,cursor:"pointer",border:`1px solid ${filter==="all"?C.ink:C.border}`,
            background:filter==="all"?C.ink:"transparent",color:filter==="all"?"#FFF":C.text,borderRadius:4}}>
          Tất cả ({decisions.length})
        </button>
        {Object.entries(types).map(([key, info]) => {
          const count = decisions.filter(d => d.type === key).length;
          if (count === 0) return null;
          return (
            <button key={key} onClick={()=>setFilter(key)}
              style={{padding:"5px 11px",fontSize:11,cursor:"pointer",border:`1px solid ${filter===key?C[info.color]:C.border}`,
                background:filter===key?C[info.color]:"transparent",color:filter===key?"#FFF":C.text,borderRadius:4}}>
              {info.label} ({count})
            </button>
          );
        })}
      </div>

      {filtered.length === 0 ? (
        <Card style={{padding:0}}>
          <EmptyState
            icon={BookOpen}
            title="Chưa có quyết định nào được ghi"
            description="Decision Log lưu lại các quyết định chiến lược (drop topic, expand, terminate partner...) cùng với data snapshot lúc đó. Sau 90 ngày, ghi nhận outcome để học hỏi."
          />
        </Card>
      ) : (
        filtered.map(d => {
          const info = types[d.type] || types.OTHER;
          return (
            <Card key={d.id} style={{padding:14,marginBottom:8,borderLeft:`3px solid ${C[info.color]}`}}>
              <div style={{display:"flex",alignItems:"flex-start",gap:12}}>
                <Pill color={info.color}>{info.label}</Pill>
                <div style={{flex:1}}>
                  <div style={{fontSize:13,fontWeight:500,color:C.ink}}>{d.target}</div>
                  <div style={{fontSize:10,color:C.muted,marginTop:2}}>
                    Quyết định: {new Date(d.decidedAt).toLocaleDateString("vi-VN")} bởi {d.decidedByEmail}
                  </div>
                  <div style={{fontSize:11,color:C.text,marginTop:6,padding:6,background:C.bgAlt,borderRadius:3}}>
                    💡 <strong>Lý do:</strong> {d.reason}
                  </div>
                  {d.expectedOutcome && (
                    <div style={{fontSize:10,color:C.muted,marginTop:4}}>
                      🎯 <strong>Kết quả mong đợi:</strong> {d.expectedOutcome}
                    </div>
                  )}
                  {d.dataSnapshot && (
                    <details style={{marginTop:6,fontSize:10,color:C.muted}}>
                      <summary style={{cursor:"pointer"}}>📊 Data snapshot lúc quyết định</summary>
                      <pre style={{margin:4,padding:6,background:C.card,borderRadius:3,fontSize:9,whiteSpace:"pre-wrap"}}>{JSON.stringify(d.dataSnapshot, null, 2)}</pre>
                    </details>
                  )}
                  {d.outcome ? (
                    <div style={{marginTop:8,padding:8,background:d.outcome==="success"?C.greenSoft:d.outcome==="failure"?C.redSoft:C.amberSoft,borderRadius:4}}>
                      <div style={{fontSize:11,fontWeight:500,color:C.ink}}>
                        Outcome: {d.outcome === "success" ? "✅ Thành công" : d.outcome === "failure" ? "❌ Thất bại" : "⚠️ Một phần"}
                      </div>
                      <div style={{fontSize:10,color:C.muted,marginTop:2}}>{d.outcomeNote}</div>
                      <div style={{fontSize:9,color:C.muted,marginTop:2}}>Ghi nhận: {new Date(d.outcomeRecordedAt).toLocaleDateString("vi-VN")}</div>
                    </div>
                  ) : (
                    <div style={{marginTop:8,fontSize:10,color:C.muted,display:"flex",gap:6,alignItems:"center"}}>
                      ⏳ Chờ review (dự kiến: {d.reviewDate})
                      {canWrite && (
                        <>
                          <button onClick={()=>{
                            const note = prompt("Note kết quả:");
                            if (note) recordOutcome(d, "success", note);
                          }} style={{padding:"2px 8px",fontSize:10,background:"transparent",border:`1px solid ${C.green}`,color:C.green,borderRadius:3,cursor:"pointer"}}>✅ Thành công</button>
                          <button onClick={()=>{
                            const note = prompt("Note kết quả:");
                            if (note) recordOutcome(d, "partial", note);
                          }} style={{padding:"2px 8px",fontSize:10,background:"transparent",border:`1px solid ${C.amber}`,color:C.amber,borderRadius:3,cursor:"pointer"}}>⚠️ Một phần</button>
                          <button onClick={()=>{
                            const note = prompt("Note kết quả:");
                            if (note) recordOutcome(d, "failure", note);
                          }} style={{padding:"2px 8px",fontSize:10,background:"transparent",border:`1px solid ${C.red}`,color:C.red,borderRadius:3,cursor:"pointer"}}>❌ Thất bại</button>
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </Card>
          );
        })
      )}

      {modal === "add" && (
        <Modal title="📜 Ghi nhận quyết định chiến lược" onClose={()=>setModal(null)} width={600}>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0 16px"}}>
            <Field label="Loại quyết định *">
              <Select value={form.type} onChange={e=>setForm(f=>({...f,type:e.target.value}))}>
                {Object.entries(types).map(([key, info]) => (
                  <option key={key} value={key}>{info.label}</option>
                ))}
              </Select>
            </Field>
            <Field label="Target (chủ đề/kênh/đối tác) *">
              <Input value={form.target||""} onChange={e=>setForm(f=>({...f,target:e.target.value}))} placeholder="VD: Brainrot, Channel ABC, Partner XYZ"/>
            </Field>
          </div>
          <Field label="Lý do quyết định *">
            <textarea value={form.reason||""} onChange={e=>setForm(f=>({...f,reason:e.target.value}))}
              placeholder="VD: Brainrot 3 tháng giảm 40% revenue + 8 vi phạm liên tục → quá rủi ro"
              style={{width:"100%",minHeight:70,padding:"8px 10px",fontSize:11,fontFamily:"inherit",border:`1px solid ${C.border}`,borderRadius:4}}/>
          </Field>
          <Field label="Kết quả mong đợi">
            <textarea value={form.expectedOutcome||""} onChange={e=>setForm(f=>({...f,expectedOutcome:e.target.value}))}
              placeholder="VD: Sau 3 tháng giảm vi phạm 70%, redirect resource sang topic Music tăng 25%"
              style={{width:"100%",minHeight:60,padding:"8px 10px",fontSize:11,fontFamily:"inherit",border:`1px solid ${C.border}`,borderRadius:4}}/>
          </Field>
          <Field label="Ngày review outcome">
            <Input type="date" value={form.reviewDate||""} onChange={e=>setForm(f=>({...f,reviewDate:e.target.value}))}/>
          </Field>
          <div style={{padding:8,background:C.bgAlt,borderRadius:4,fontSize:10,color:C.muted,marginTop:8}}>
            📊 <strong>Data snapshot tự động lưu:</strong> Tổng kênh: {form.dataSnapshot?.totalChannels} · Doanh thu: ${fmt(form.dataSnapshot?.totalRevenue||0)} · Vi phạm: {form.dataSnapshot?.totalViolations}
          </div>
          <div style={{display:"flex",justifyContent:"flex-end",gap:8,marginTop:14,paddingTop:14,borderTop:`1px solid ${C.borderSoft}`}}>
            <Btn ghost onClick={()=>setModal(null)}>Hủy</Btn>
            <Btn primary onClick={save}>Ghi nhận</Btn>
          </div>
        </Modal>
      )}
    </div>
  );
};

// ─── ANALYTICS ─── Wrapper gộp Reports + Finance + Topics insights ──
const AnalyticsView = ({ state, setState, currentUser, dailyStats, callAI, toast, onNavigate, brand }) => {
  const C = useC();
  const [tab, setTab] = useState("reports");
  const [period, setPeriod] = useState("30d"); // 7d/30d/90d/6m/1y/all/custom
  const [periodCustom, setPeriodCustom] = useState({ from:"", to:"" });
  const [cmsF, setCmsF] = useState("All");
  const [partnerF, setPartnerF] = useState("All");
  const [topicF, setTopicF] = useState("All");
  const [showFilters, setShowFilters] = useState(true);

  const cmsOptions = [...new Set((state.channels||[]).map(c=>c.cms).filter(Boolean))].sort();
  const partnerOptions = [...new Set((state.channels||[]).map(c=>c.partner).filter(Boolean))].sort();
  const topicOptions = [...new Set((state.channels||[]).map(c=>c.topic).filter(Boolean))].sort();

  const periodWindow = useMemo(() => {
    const now = Date.now();
    const day = 86400000;
    if (period === "all") return { from: 0, to: now, label:"Toàn thời gian" };
    if (period === "custom" && periodCustom.from && periodCustom.to) {
      return { from: new Date(periodCustom.from).getTime(), to: new Date(periodCustom.to).getTime() + day, label:`${periodCustom.from} → ${periodCustom.to}` };
    }
    const map = { "7d":[7,"7 ngày"], "30d":[30,"30 ngày"], "90d":[90,"90 ngày"], "6m":[180,"6 tháng"], "1y":[365,"1 năm"] };
    const [days, label] = map[period] || [30, "30 ngày"];
    return { from: now - days*day, to: now, label };
  }, [period, periodCustom]);

  // 🎯 Filtered state — applies time + entity filters → all 3 child views see scoped data
  const filteredState = useMemo(() => {
    const inWindow = (dateStr) => {
      if (!dateStr) return false;
      const t = new Date(dateStr).getTime();
      return t >= periodWindow.from && t <= periodWindow.to;
    };
    const matchesEntity = (item, channelLookup) => {
      // item may have channelId, cms, partner, topic OR be a channel itself
      let ch = item.channelId ? channelLookup.get(item.channelId) : null;
      const cms = item.cms || ch?.cms;
      const partner = item.partner || ch?.partner;
      const topic = item.topic || ch?.topic;
      if (cmsF !== "All" && cms !== cmsF) return false;
      if (partnerF !== "All" && partner !== partnerF) return false;
      if (topicF !== "All" && topic !== topicF) return false;
      return true;
    };
    const channels = (state.channels||[]).filter(c => {
      if (cmsF !== "All" && c.cms !== cmsF) return false;
      if (partnerF !== "All" && c.partner !== partnerF) return false;
      if (topicF !== "All" && c.topic !== topicF) return false;
      return true;
    });
    const channelLookup = new Map((state.channels||[]).map(c => [c.id, c]));
    return {
      ...state,
      channels,
      partnerSharing: (state.partnerSharing||[]).filter(s => (period==="all" || inWindow(s.date || s.month)) && matchesEntity(s, channelLookup)),
      videoAnalytics: (state.videoAnalytics||[]).filter(v => (period==="all" || inWindow(v.date || v.publishedAt || v.month)) && matchesEntity(v, channelLookup)),
      violations: (state.violations||[]).filter(v => (period==="all" || inWindow(v.date)) && matchesEntity(v, channelLookup)),
      adsenseActivities: (state.adsenseActivities||[]).filter(a => period==="all" || inWindow(a.date)),
    };
  }, [state, periodWindow, period, cmsF, partnerF, topicF]);

  const activeFilterCount = [cmsF, partnerF, topicF].filter(v => v !== "All").length + (period !== "30d" ? 1 : 0);
  const resetFilters = () => { setPeriod("30d"); setPeriodCustom({from:"",to:""}); setCmsF("All"); setPartnerF("All"); setTopicF("All"); };

  return (
    <div style={{display:"flex",flexDirection:"column",height:"100%"}}>
      <div style={{padding:"14px 28px 0",borderBottom:`1px solid ${C.border}`,background:C.bg,flexShrink:0}}>
        <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:10}}>
          <BarChart2 size={18} style={{color:C.accent}}/>
          <div style={{flex:1}}>
            <div style={{fontFamily:"'Fraunces',serif",fontWeight:500,fontSize:16,color:C.ink}}>Analytics</div>
            <div style={{fontSize:10,color:C.muted}}>
              📅 {periodWindow.label} · 📺 {filteredState.channels.length}/{state.channels?.length||0} kênh
              {activeFilterCount > 0 && <span style={{color:C.accent}}> · {activeFilterCount} bộ lọc đang bật</span>}
            </div>
          </div>
          <Btn ghost icon={Filter} onClick={()=>setShowFilters(s=>!s)}
            style={{background: activeFilterCount>0 ? C.accentSoft : "transparent"}}>
            {showFilters ? "Ẩn bộ lọc" : "Hiện bộ lọc"} {activeFilterCount > 0 && <span style={{marginLeft:4,padding:"1px 6px",background:C.accent,color:"#FFF",borderRadius:8,fontSize:9}}>{activeFilterCount}</span>}
          </Btn>
          {activeFilterCount > 0 && <Btn ghost icon={X} onClick={resetFilters}>Reset</Btn>}
        </div>

        {/* Filter bar */}
        {showFilters && (
          <div style={{padding:"10px 0",marginBottom:6,borderTop:`1px solid ${C.borderSoft}`}}>
            <div style={{display:"flex",gap:6,marginBottom:8,alignItems:"center",flexWrap:"wrap"}}>
              <span style={{fontSize:10,fontWeight:600,letterSpacing:"0.14em",textTransform:"uppercase",color:C.muted,marginRight:4}}>📅 Thời gian:</span>
              {[
                {id:"7d", label:"7N"}, {id:"30d", label:"30N"}, {id:"90d", label:"90N"},
                {id:"6m", label:"6T"}, {id:"1y", label:"1N"}, {id:"all", label:"All"},
                {id:"custom", label:"Tùy chỉnh"}
              ].map(p => (
                <button key={p.id} onClick={()=>setPeriod(p.id)}
                  style={{padding:"5px 11px",fontSize:11,fontWeight:500,cursor:"pointer",border:`1px solid ${period===p.id?C.ink:C.border}`,
                    background:period===p.id?C.ink:"transparent", color:period===p.id?"#FFF":C.text, borderRadius:4}}>
                  {p.label}
                </button>
              ))}
              {period === "custom" && (
                <>
                  <span style={{fontSize:10,color:C.muted,marginLeft:6}}>Từ:</span>
                  <Input type="date" value={periodCustom.from} onChange={e=>setPeriodCustom(p=>({...p,from:e.target.value}))} style={{width:130,fontSize:11}}/>
                  <span style={{fontSize:10,color:C.muted}}>Đến:</span>
                  <Input type="date" value={periodCustom.to} onChange={e=>setPeriodCustom(p=>({...p,to:e.target.value}))} style={{width:130,fontSize:11}}/>
                </>
              )}
            </div>
            <div style={{display:"flex",gap:8,flexWrap:"wrap",alignItems:"center"}}>
              <span style={{fontSize:10,fontWeight:600,letterSpacing:"0.14em",textTransform:"uppercase",color:C.muted}}>🔍 Lọc:</span>
              <Select value={cmsF} onChange={e=>setCmsF(e.target.value)} style={{width:160,fontSize:11}}>
                <option value="All">Tất cả CMS</option>
                {cmsOptions.map(c => <option key={c}>{c}</option>)}
              </Select>
              <Select value={partnerF} onChange={e=>setPartnerF(e.target.value)} style={{width:160,fontSize:11}}>
                <option value="All">Tất cả đối tác</option>
                {partnerOptions.map(p => <option key={p}>{p}</option>)}
              </Select>
              <Select value={topicF} onChange={e=>setTopicF(e.target.value)} style={{width:160,fontSize:11}}>
                <option value="All">Tất cả chủ đề</option>
                {topicOptions.map(t => <option key={t}>{t}</option>)}
              </Select>
            </div>
          </div>
        )}

        <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
          {[
            {id:"reports", label:"📊 Báo cáo doanh thu"},
            {id:"finance", label:"💰 Tài chính"},
            {id:"payouts", label:"💸 Payouts", count: (state.contracts||[]).filter(c => c.status==="Active"||!c.status).length},
            {id:"topics", label:"🏷️ Chủ đề"},
            {id:"decisions", label:"📜 Decision Log", count: (state.decisionLog||[]).length},
          ].map(t => (
            <button key={t.id} onClick={()=>setTab(t.id)}
              style={{padding:"7px 14px",fontSize:11,fontWeight:500,cursor:"pointer",border:"none",background:"none",
                color:tab===t.id?C.accent:C.muted, borderBottom:`2px solid ${tab===t.id?C.accent:"transparent"}`}}>
              {t.label}{t.count !== undefined && t.count > 0 && <span style={{marginLeft:4,fontSize:9,padding:"1px 5px",background:tab===t.id?C.accentSoft:C.bgAlt,color:tab===t.id?C.accent:C.muted,borderRadius:8}}>{t.count}</span>}
            </button>
          ))}
        </div>
      </div>
      <div style={{flex:1,overflow:"auto"}}>
        {tab === "reports" && <ReportsView state={filteredState} dailyStats={dailyStats} toast={toast}/>}
        {tab === "finance" && <FinanceView state={filteredState} toast={toast}/>}
        {tab === "payouts" && <PayoutsView state={state} setState={setState} currentUser={currentUser} toast={toast} brand={brand}/>}
        {tab === "topics" && <TopicsView state={filteredState} callAI={callAI} toast={toast}/>}
        {tab === "decisions" && <DecisionLogView state={state} setState={setState} currentUser={currentUser} toast={toast} callAI={callAI}/>}
      </div>
    </div>
  );
};

// ─── ALERTS ───────────────────────────────────────────────────────
const AlertsView = ({ state, callAI, toast, onNavigate }) => {
  const C = useC();
  const { channels } = state;
  const [resolved, setResolved] = useState(() => lsGet("meridian-v5-resolved-alerts", {}));
  const [detailChannel, setDetailChannel] = useState(null);
  const [filter, setFilter] = useState("all");
  const [aiPredict, setAiPredict] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  
  useEffect(() => { lsSet("meridian-v5-resolved-alerts", resolved); }, [resolved]);

  const alerts = useMemo(() => {
    const list = [];
    const violations = state.violations || [];
    channels.forEach(c => {
      const cv = violations.filter(v => v.channelId === c.id || v.channelName === c.name);
      if (c.monetization === "Demonetized") {
        list.push({ id:`A-${c.id}-d`, type:"⚠️ Tắt kiếm tiền", channel:c, severity:"Critical",
          desc:`Kênh đang bị tắt kiếm tiền${c.strikes?` · ${c.strikes} strikes`:""}`,
          recommendation: c.strikes>=2 ? "🔴 KHẨN CẤP: ≥2 strikes — ngừng upload, kháng cáo ngay" : "Review nội dung 30 ngày qua, xác định nguyên nhân",
          violationCount: cv.length });
      }
      if (c.monetization === "Suspended" || c.status === "Suspended") {
        list.push({ id:`A-${c.id}-s`, type:"🚫 Tạm khóa kênh", channel:c, severity:"Critical",
          desc:`Kênh đã bị YouTube tạm khóa`,
          recommendation:"Liên hệ YouTube Partner Manager, chuẩn bị tài liệu kháng cáo",
          violationCount: cv.length });
      }
      if (c.health === "Warning" && c.monetization === "Monetized") {
        list.push({ id:`A-${c.id}-w`, type:"🟡 Cảnh báo health", channel:c, severity:"High",
          desc:"Health score thấp · cần theo dõi sát",
          recommendation:"Review CTR/RPM/retention 7 ngày qua",
          violationCount: cv.length });
      }
      if (c.syncStatus === "Failed") {
        list.push({ id:`A-${c.id}-sync`, type:"⚙️ Sync thất bại", channel:c, severity:"Medium",
          desc:`Không sync được data ${c.lastSync||0}h qua`,
          recommendation:"Kiểm tra kết nối CMS, refresh OAuth token",
          violationCount: cv.length });
      }
      if (cv.length >= 2) {
        const recent = cv.filter(v => v.date && Date.now() - new Date(v.date).getTime() < 60*86400000);
        if (recent.length >= 2) {
          list.push({ id:`A-${c.id}-rep`, type:"🔁 Vi phạm tái diễn", channel:c, severity:"High",
            desc:`${recent.length} vi phạm trong 60 ngày`,
            recommendation:"⚠️ Risk score cao — cần đào tạo lại team production",
            violationCount: cv.length });
        }
      }
    });
    return list.sort((a,b) => {
      const order = { "Critical":0, "High":1, "Medium":2 };
      return (order[a.severity]||3) - (order[b.severity]||3);
    });
  }, [channels, state.violations]);

  const filteredAlerts = alerts.filter(a => {
    if (filter === "critical" && a.severity !== "Critical") return false;
    if (filter === "warning" && (a.severity === "Critical" || resolved[a.id])) return false;
    return true;
  });

  const stats = {
    total: alerts.length,
    critical: alerts.filter(a => a.severity === "Critical" && !resolved[a.id]).length,
    high: alerts.filter(a => a.severity === "High" && !resolved[a.id]).length,
  };

  const formatText = text => text.split("\n").map((line,i) => (
    <div key={i} style={{marginBottom:line===""?6:2}}>{line === "" ? <span>&nbsp;</span> : parseInline(line)}</div>
  ));

  const runPredictive = async () => {
    setAiLoading(true);
    setAiPredict(null);
    const riskyTopics = ["Brainrot","Skibidi","Hack","Cheat","LEGO","Brick","Minecraft","Roblox","ASMR","Unboxing"];
    const candidates = channels.filter(c => {
      const isMonetized = c.monetization === "Monetized";
      const hasViolations = (state.violations||[]).some(v => v.channelId === c.id || v.channelName === c.name);
      const hasStrikes = (c.strikes || 0) > 0;
      const hasRiskyTopic = riskyTopics.some(t => 
        (c.topic || "").toLowerCase().includes(t.toLowerCase()) || 
        (c.category || "").toLowerCase().includes(t.toLowerCase())
      );
      return isMonetized && (hasViolations || hasStrikes || hasRiskyTopic || c.health !== "Healthy");
    }).slice(0, 30);

    const summary = candidates.map(c => {
      const v = (state.violations||[]).filter(x => x.channelId === c.id || x.channelName === c.name);
      return `- ${c.name} (${c.cms}|${c.topic||"?"}) | strikes:${c.strikes||0} | violations:${v.length} | health:${c.health}`;
    }).join("\n");

    const prompt = `Dự đoán kênh có nguy cơ vi phạm chính sách YouTube CAO trong 30 ngày tới:

${candidates.length} KÊNH RỦI RO TIỀM ẨN:
${summary}

CHÍNH SÁCH CHÍNH:
${YT_POLICIES.map(p => `- ${p.title}: ${p.rules[0]}. Phạt: ${p.penalty}`).join("\n")}

Dự đoán:
1. **TOP 5 KÊNH RỦI RO CAO NHẤT** (tên + lý do + xác suất %)
2. **PATTERN VI PHẠM CÓ THỂ** (loại lỗi nào dễ xảy ra)
3. **DỰ BÁO 30 NGÀY** (số kênh có thể bị demonetize/suspend)
4. **HÀNH ĐỘNG NGĂN NGỪA** (cụ thể, có deadline)
5. **KIỂM ĐỊNH NỘI DUNG** (loại video cần review trước upload)
6. **TRAINING URGENT** (đào tạo gì)

Tiếng Việt, có số liệu cụ thể, action-oriented, dùng emoji.`;

    const r = await callAI([{ role:"user", content: prompt }], "", { cacheTopic: "alerts-predictive", ttlMs: 6*3600*1000 });
    setAiPredict(r);
    setAiLoading(false);
  };

  return (
    <div style={{padding:"20px 28px",overflowY:"auto",height:"100%"}}>
      {/* Stats header */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(4, 1fr)",gap:10,marginBottom:14}}>
        <Card style={{padding:14}}>
          <div style={{fontSize:9,fontWeight:600,letterSpacing:"0.14em",textTransform:"uppercase",color:C.muted}}>Tổng cảnh báo</div>
          <div style={{fontFamily:"'Fraunces',serif",fontWeight:500,fontSize:24,color:C.ink,marginTop:6}}>{stats.total}</div>
        </Card>
        <Card style={{padding:14}}>
          <div style={{fontSize:9,fontWeight:600,letterSpacing:"0.14em",textTransform:"uppercase",color:C.muted}}>Khẩn cấp</div>
          <div style={{fontFamily:"'Fraunces',serif",fontWeight:500,fontSize:24,color:C.red,marginTop:6}}>{stats.critical}</div>
        </Card>
        <Card style={{padding:14}}>
          <div style={{fontSize:9,fontWeight:600,letterSpacing:"0.14em",textTransform:"uppercase",color:C.muted}}>Quan trọng</div>
          <div style={{fontFamily:"'Fraunces',serif",fontWeight:500,fontSize:24,color:C.amber,marginTop:6}}>{stats.high}</div>
        </Card>
        <Card style={{padding:14,background:C.aiSoft,borderLeft:`3px solid ${C.ai}`}}>
          <div style={{fontSize:9,fontWeight:600,letterSpacing:"0.14em",textTransform:"uppercase",color:C.ai}}>🧠 AI Dự đoán</div>
          <button onClick={runPredictive} disabled={aiLoading}
            style={{marginTop:8,fontSize:11,fontWeight:500,padding:"6px 10px",background:C.ai,color:"#FFF",
              border:"none",borderRadius:4,cursor:aiLoading?"wait":"pointer",display:"flex",alignItems:"center",gap:5}}>
            {aiLoading ? <span style={{display:"inline-block",width:9,height:9,border:"2px solid rgba(255,255,255,0.4)",borderTopColor:"#FFF",borderRadius:"50%",animation:"spin 0.8s linear infinite"}}/> : <Sparkles size={11}/>}
            {aiLoading ? "Đang scan..." : "Quét rủi ro"}
          </button>
        </Card>
      </div>

      {aiPredict && (
        <Card style={{padding:22,marginBottom:14,borderLeft:`3px solid ${C.ai}`}}>
          <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:12,paddingBottom:10,borderBottom:`1px solid ${C.borderSoft}`}}>
            <Sparkles size={16} style={{color:C.ai}}/>
            <div style={{fontFamily:"'Fraunces',serif",fontWeight:500,fontSize:14,color:C.ink}}>AI Dự đoán vi phạm — 30 ngày tới</div>
          </div>
          <div style={{fontSize:12,lineHeight:1.7,color:C.text}}>{formatText(aiPredict)}</div>
        </Card>
      )}

      <div style={{display:"flex",gap:6,marginBottom:12}}>
        {[
          { id:"all", label:"Tất cả", count: alerts.length },
          { id:"critical", label:"Khẩn cấp", count: stats.critical },
          { id:"warning", label:"Quan trọng", count: stats.high },
        ].map(t => (
          <button key={t.id} onClick={()=>setFilter(t.id)} style={{display:"flex",alignItems:"center",gap:5,
            fontSize:11,fontWeight:500,padding:"6px 12px",cursor:"pointer",borderRadius:4,
            background:filter===t.id?C.ink:"transparent",color:filter===t.id?"#FFF":C.muted,
            border:`1px solid ${filter===t.id?C.ink:C.border}`}}>
            {t.label}
            <span style={{fontSize:9,padding:"1px 5px",background:filter===t.id?"rgba(255,255,255,0.2)":C.bgAlt,borderRadius:8}}>{t.count}</span>
          </button>
        ))}
      </div>

      <Card style={{overflow:"hidden"}}>
        {filteredAlerts.length === 0 ? (
          <div style={{padding:50,textAlign:"center",color:C.muted}}>
            <Check size={36} style={{color:C.green,marginBottom:10}}/>
            <div style={{fontSize:13}}>Không có cảnh báo nào trong nhóm này.</div>
          </div>
        ) : filteredAlerts.slice(0, 50).map((a,i) => (
          <div key={a.id} style={{display:"flex",alignItems:"flex-start",gap:14,padding:"14px 18px",
            borderBottom:i<filteredAlerts.length-1?`1px solid ${C.borderSoft}`:"none",
            opacity:resolved[a.id]?0.5:1,cursor:"pointer"}}
            onClick={()=>setDetailChannel(a.channel)}>
            <div style={{width:34,height:34,borderRadius:5,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,
              background:a.severity==="Critical"?C.redSoft:a.severity==="High"?C.amberSoft:C.blueSoft}}>
              <AlertTriangle size={14} style={{color:a.severity==="Critical"?C.red:a.severity==="High"?C.amber:C.blue}}/>
            </div>
            <div style={{flex:1,minWidth:0}}>
              <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:4,flexWrap:"wrap"}}>
                <span style={{fontSize:13,fontWeight:500,color:C.ink}}>{a.type}</span>
                <Pill color={a.severity==="Critical"?"red":a.severity==="High"?"amber":"blue"}>{a.severity}</Pill>
                {a.violationCount > 0 && <Pill color="red">{a.violationCount} vi phạm</Pill>}
                {resolved[a.id] && <Pill color="green">✓ Đã xử lý</Pill>}
              </div>
              <div style={{fontSize:11,color:C.muted,marginBottom:6}}>
                <span style={{color:C.ink,fontWeight:500}}>{a.channel.name}</span> · {a.channel.cms} · {a.channel.topic || "—"} · {a.desc}
              </div>
              <div style={{fontSize:11,color:C.text,padding:"6px 10px",background:a.severity==="Critical"?C.redSoft:C.bgAlt,
                borderRadius:4,borderLeft:`3px solid ${a.severity==="Critical"?C.red:a.severity==="High"?C.amber:C.blue}`}}>
                💡 <strong>Đề xuất:</strong> {a.recommendation}
              </div>
            </div>
            <div style={{display:"flex",flexDirection:"column",gap:4,flexShrink:0}}>
              <button onClick={(e)=>{e.stopPropagation(); setDetailChannel(a.channel);}}
                style={{fontSize:10,padding:"4px 10px",background:C.bgAlt,color:C.text,
                  border:`1px solid ${C.border}`,borderRadius:3,cursor:"pointer",
                  display:"inline-flex",alignItems:"center",gap:4,whiteSpace:"nowrap"}}>
                <Eye size={10}/> Chi tiết
              </button>
              {!resolved[a.id] ? (
                <button onClick={(e)=>{e.stopPropagation(); setResolved(r=>({...r,[a.id]:true})); toast("Đã đánh dấu đã xử lý", "success");}}
                  style={{fontSize:10,padding:"4px 10px",background:C.greenSoft,color:C.green,
                    border:`1px solid ${C.green}33`,borderRadius:3,cursor:"pointer",
                    display:"inline-flex",alignItems:"center",gap:4,whiteSpace:"nowrap"}}>
                  <Check size={10}/> Xử lý
                </button>
              ) : (
                <button onClick={(e)=>{e.stopPropagation(); setResolved(r=>{const n={...r}; delete n[a.id]; return n;}); toast("Mở lại cảnh báo", "info");}}
                  style={{fontSize:10,padding:"4px 10px",background:"transparent",color:C.muted,
                    border:`1px solid ${C.border}`,borderRadius:3,cursor:"pointer",whiteSpace:"nowrap"}}>
                  Mở lại
                </button>
              )}
            </div>
          </div>
        ))}
      </Card>

      <ChannelDetailModal channel={detailChannel} state={state} 
        onClose={()=>setDetailChannel(null)} onNavigate={onNavigate}/>
    </div>
  );
};
// ─── SETTINGS (Users + Branding + Integrations + Security + Data + Automation v5.1) ─
const SettingsView = ({ state, setState, brand, setBrand, currentUser, toast, confirm, lang, setLang, autoCfg, setAutoCfg }) => {
  const C = useC();
  const [tab, setTab] = useState("branding");
  const [users, setUsers] = useState(() => lsGet(LS.USERS, []));
  const [userModal, setUserModal] = useState(null);
  const [userForm, setUserForm] = useState({});
  const [apiKey, setApiKey] = useState(() => lsGet("meridian-api-key", ""));
  const [showKey, setShowKey] = useState(false);
  const [claudeModel, setClaudeModel] = useState(() => lsGet("meridian-claude-model", DEFAULT_CLAUDE_MODEL));
  const [folderName, setFolderName] = useState(() => lsGet("meridian-v51-folder-name", ""));
  const [aiStats, setAiStats] = useState(AI_CACHE_STATS);
  const [aiCacheCount, setAiCacheCount] = useState(0);

  // Refresh AI cache stats every 3 seconds
  useEffect(() => {
    const t = setInterval(async () => {
      setAiStats({...AI_CACHE_STATS});
      setAiCacheCount(await idbCount("ai_cache"));
    }, 3000);
    return () => clearInterval(t);
  }, []);

  const isSuperAdmin = currentUser?.role === "SUPER_ADMIN";

  // Branding handlers
  const handleLogoUpload = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > 2 * 1024 * 1024) { toast("Logo tối đa 2MB", "warning"); return; }
    const reader = new FileReader();
    reader.onload = (ev) => {
      const newBrand = { ...brand, logoData: ev.target.result };
      setBrand(newBrand);
      lsSet(LS.BRAND, newBrand);
      toast("Đã cập nhật logo", "success");
    };
    reader.readAsDataURL(f);
  };

  const updateBrand = (patch) => {
    const newBrand = { ...brand, ...patch };
    setBrand(newBrand);
    lsSet(LS.BRAND, newBrand);
  };

  const removeLogo = () => {
    updateBrand({ logoData: null });
    toast("Đã xóa logo", "info");
  };

  // User management handlers
  const refreshUsers = () => setUsers(lsGet(LS.USERS, []));

  const openAddUser = () => {
    setUserForm({ email:"", fullName:"", password:"", role:"VIEWER", status:"Active" });
    setUserModal("add");
  };

  const saveUser = () => {
    if (!userForm.email || !userForm.fullName) { toast("Nhập đủ email và tên", "warning"); return; }
    // 🔒 SECURITY: Block admin from creating PARTNER role from this UI (prevent bypass)
    if (userModal === "add" && userForm.role === "PARTNER") {
      toast("⛔ Không thể tạo PARTNER user từ admin UI. Đối tác phải tự đăng ký qua trang đăng ký.", "error");
      return;
    }
    if (userModal === "add") {
      if (!userForm.password || userForm.password.length < 6) { toast("Mật khẩu tối thiểu 6 ký tự", "warning"); return; }
      if (users.find(u => u.email === userForm.email)) { toast("Email đã tồn tại", "error"); return; }
      const newUser = {
        id: `U${Date.now()}`,
        email: userForm.email,
        fullName: userForm.fullName,
        passwordHash: hashPwd(userForm.password),
        role: userForm.role,
        status: userForm.status,
        mfa: false,
        createdAt: new Date().toISOString(),
        lastLogin: null,
        registrationType: "INTERNAL",
      };
      const updated = [...users, newUser];
      setUsers(updated);
      lsSet(LS.USERS, updated);
      toast(`Đã thêm "${userForm.fullName}"`, "success");
    } else {
      // 🔒 SECURITY: Lock role escalation
      // - Cannot promote PARTNER to anything else (security: PARTNER is one-way)
      // - Cannot demote internal user to PARTNER (would lose access to admin features unexpectedly)
      const existing = users.find(u => u.id === userForm.id);
      if (existing) {
        if (existing.role === "PARTNER" && userForm.role !== "PARTNER") {
          toast("⛔ Không thể thay đổi role của PARTNER user. Phải xóa và đăng ký lại.", "error");
          return;
        }
        if (existing.role !== "PARTNER" && userForm.role === "PARTNER") {
          toast("⛔ Không thể chuyển user nội bộ thành PARTNER. Yêu cầu họ đăng ký lại.", "error");
          return;
        }
      }
      const updated = users.map(u => {
        if (u.id !== userForm.id) return u;
        const next = { ...u, fullName: userForm.fullName, role: userForm.role, status: userForm.status };
        if (userForm.password && userForm.password.length >= 6) next.passwordHash = hashPwd(userForm.password);
        return next;
      });
      setUsers(updated);
      lsSet(LS.USERS, updated);
      toast("Đã cập nhật", "success");
    }
    setUserModal(null);
  };

  const delUser = async (u) => {
    if (u.id === currentUser?.id) { toast("Không thể xóa chính mình", "error"); return; }
    const ok = await confirm({ title:"Xóa user?", message:`Xóa "${u.fullName}"? Hành động không thể hoàn tác.`, danger:true });
    if (ok) {
      const updated = users.filter(x => x.id !== u.id);
      setUsers(updated);
      lsSet(LS.USERS, updated);
      toast("Đã xóa user", "success");
    }
  };

  const saveApiKey = () => {
    try {
      // Trim whitespace and validate format
      const cleaned = (apiKey || "").trim();
      if (cleaned && !cleaned.startsWith("sk-ant-")) {
        toast("⚠️ API key không đúng định dạng (phải bắt đầu bằng 'sk-ant-')", "warning");
        // Continue saving anyway in case format changes
      }
      lsSet("meridian-api-key", cleaned);
      window.MERIDIAN_API_KEY = cleaned;
      setApiKey(cleaned);
      toast(cleaned ? "✅ Đã lưu API key (lưu local, không gửi lên server)" : "Đã xóa API key", "success");
    } catch (err) {
      toast(`❌ Lỗi khi lưu: ${err.message}`, "error");
    }
  };

  const testApiKey = async () => {
    const cleaned = (apiKey || "").trim();
    if (!cleaned) { toast("Nhập API key trước khi test", "warning"); return; }
    toast("Đang test API key (gửi 1 prompt nhỏ tới Claude)...", "info");
    try {
      const r = await callClaude([{ role:"user", content:"Reply exactly: ok" }], "", cleaned, { skipCache: true, maxTokens: 50 });
      if (r.startsWith("❌")) {
        toast(`❌ ${r.split("\n")[0].replace(/^❌\s*/, "")}`, "error");
        return;
      }
      if (r.startsWith("⚠️")) {
        toast(`⚠️ ${r.split("\n")[0].replace(/^⚠️\s*/, "")}`, "warning");
        return;
      }
      if (r.startsWith("⏳")) {
        toast(`⏳ ${r.split("\n")[0]}`, "warning");
        return;
      }
      // If response starts with "🌐 [Browser AI" → Claude failed but Browser AI worked
      if (r.includes("Browser AI") || r.includes("Gemini Nano")) {
        toast("⚠️ Claude API không phản hồi — đang dùng Browser AI fallback. Kiểm tra key.", "warning");
        return;
      }
      // Real success: Claude responded
      toast(`✅ API key hoạt động! Claude trả lời: "${r.slice(0,60)}"`, "success");
    } catch (err) {
      toast(`❌ Lỗi network khi test: ${err.message}`, "error");
    }
  };

  const exportData = () => {
    const data = JSON.stringify(state, null, 2);
    const blob = new Blob([data], { type:"application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `meridian-backup-${new Date().toISOString().slice(0,10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast("Đã xuất file backup", "success");
  };

  const resetAll = async () => {
    if (!can(currentUser, "data.wipe")) { toast("⛔ Chỉ SUPER_ADMIN được phép reset toàn bộ", "error"); return; }
    const ok = await confirm({ title:"Reset toàn bộ?", message:"Xóa tất cả data và đăng xuất. Cần đăng ký lại từ đầu. Hành động không thể hoàn tác.", danger:true });
    if (ok) {
      // Also wipe PostgreSQL store
      try {
        const authHeaders = backendAuthHeaders();
        const r = await fetch("/api/store");
        if (r.ok) {
          const { items } = await r.json();
          await Promise.all((items||[]).map(it =>
            fetch(`/api/store/${encodeURIComponent(it.key)}`, { method:"DELETE", headers: authHeaders }).catch(()=>{})
          ));
        }
      } catch {}
      Object.values(LS).forEach(k => lsDel(k));
      lsDel("meridian-api-key");
      window.location.reload();
    }
  };

  // Selective wipe — channels + partners + related collections (keeps users + settings)
  const wipeChannelsAndPartners = async () => {
    if (!can(currentUser, "data.wipe")) { toast("⛔ Chỉ SUPER_ADMIN được phép xóa data hàng loạt", "error"); return; }
    const ok = await confirm({
      title:"Xóa toàn bộ kênh & đối tác?",
      message:"Sẽ xóa: channels, partners, contracts, violations, videoAnalytics, partnerSharing, videoSubmissions.\n\nGIỮ LẠI: users, CMS list, settings, brand, automation config.\n\nHành động KHÔNG THỂ hoàn tác.",
      danger:true,
    });
    if (!ok) return;
    setState(s => migrateAndRelink({
      ...s,
      _linkageVersion: 0, // force re-migration
      channels: [],
      partners: [],
      contracts: [],
      violations: [],
      videoAnalytics: [],
      partnerSharing: [],
      videoSubmissions: [],
      adsenseActivities: [],
      productInspections: [],
      importHistory: [],
    }));
    toast("✅ Đã xóa toàn bộ kênh & đối tác. Có thể bắt đầu nhập liệu mới.", "success");
    logActivity("DATA_WIPE", currentUser.id, "Wiped channels+partners+related data");
  };

  const PRESET_COLORS = [
    { name:"Cam (mặc định)", value:"#B8650C" },
    { name:"Đỏ", value:"#B91C1C" },
    { name:"Xanh dương", value:"#1E40AF" },
    { name:"Xanh lá", value:"#15803D" },
    { name:"Tím", value:"#7C3AED" },
    { name:"Hồng", value:"#BE185D" },
    { name:"Đen", value:"#0F1115" },
    { name:"Cyan", value:"#0E7490" },
  ];

  const tabs = [
    { id:"branding", label:"Thương hiệu", icon:Palette },
    { id:"users", label:"Người dùng", icon:UserCog, badge:users.length },
    { id:"integrations", label:"Tích hợp", icon:Key },
    { id:"automation", label:"Tự động hoá", icon:Zap, badge:"v5.1" },
    { id:"security", label:"Bảo mật", icon:Shield },
    { id:"audit", label:"Audit Log", icon:History },
    { id:"data", label:"Dữ liệu", icon:Database },
  ];

  // ─── Automation handlers ──────────────────────────────────────
  const pickFolderFn = async () => {
    try {
      const handle = await pickFolder();
      if (!await verifyPermission(handle, "read")) { toast("Quyền truy cập bị từ chối", "error"); return; }
      await setFolderHandle(handle);
      lsSet("meridian-v51-folder-name", handle.name);
      setFolderName(handle.name);
      toast(`Đã chọn folder: ${handle.name}`, "success");
    } catch(e) {
      toast(`Lỗi: ${e.message}`, "error");
    }
  };

  const testWebhookFn = async (idx) => {
    const w = autoCfg.webhooks[idx];
    if (!w?.url) { toast("Thiếu URL", "warning"); return; }
    toast("Đang test webhook...", "info");
    const r = await sendWebhook(w, "🧪 *Test webhook từ Meridian MCN v5.1*\nNếu bạn nhận được tin này, webhook đã hoạt động.");
    toast(r.ok ? "Webhook OK!" : `Lỗi: ${r.error || r.status}`, r.ok ? "success" : "error");
  };

  const addWebhookFn = () => {
    setAutoCfg(c => ({...c, webhooks: [...(c.webhooks||[]), { type:"telegram", url:"", chatId:"", events:["critical"] }]}));
  };

  const removeWebhookFn = (idx) => {
    setAutoCfg(c => ({...c, webhooks: c.webhooks.filter((_,i)=>i!==idx)}));
  };

  const updateWebhookFn = (idx, patch) => {
    setAutoCfg(c => ({...c, webhooks: c.webhooks.map((w,i)=>i===idx?{...w,...patch}:w)}));
  };

  const clearAiCacheFn = async () => {
    const ok = await confirm({ title:"Xoá AI cache?", message:"Lần phân tích sau sẽ gọi lại API (mất tiền). Có nên không?" });
    if (!ok) return;
    await aiCacheClear();
    setAiStats({...AI_CACHE_STATS});
    setAiCacheCount(0);
    toast("Đã xoá AI cache", "success");
  };

  const testYtApiFn = async () => {
    if (!autoCfg.ytApiKey) { toast("Nhập YouTube API key", "warning"); return; }
    const sample = state.channels.filter(c=>c.ytId).slice(0,1).map(c=>c.ytId);
    if (!sample.length) { toast("Không có kênh nào có YouTube ID", "warning"); return; }
    toast("Đang test YouTube API...", "info");
    const r = await ytFetchChannelStats(autoCfg.ytApiKey, sample);
    toast(r.length ? `OK! Lấy được ${r.length} kênh` : "API key không hợp lệ hoặc kênh không tồn tại", r.length ? "success" : "error");
  };

  // Mass sync ALL channels NOW
  const [ytSyncing, setYtSyncing] = useState(false);
  const [ytSyncProgress, setYtSyncProgress] = useState({ done: 0, total: 0, updated: 0 });
  const massSyncYouTube = async () => {
    if (!autoCfg.ytApiKey) { toast("Cần YouTube API key trước", "warning"); return; }
    const allIds = state.channels.map(c => c.ytId).filter(Boolean);
    if (!allIds.length) { toast("Không có kênh nào có YouTube ID", "warning"); return; }
    setYtSyncing(true);
    setYtSyncProgress({ done: 0, total: allIds.length, updated: 0 });
    const BATCH = 50; // YouTube API allows up to 50 IDs per call
    let totalUpdated = 0;
    const allItems = [];
    try {
      for (let i = 0; i < allIds.length; i += BATCH) {
        const batch = allIds.slice(i, i + BATCH);
        const items = await ytFetchChannelStats(autoCfg.ytApiKey, batch);
        allItems.push(...items);
        setYtSyncProgress(p => ({ ...p, done: Math.min(allIds.length, i + BATCH) }));
      }
      // Apply updates
      setState(s => ({
        ...s,
        channels: s.channels.map(c => {
          const item = allItems.find(it => it.id === c.ytId);
          if (!item) return c;
          totalUpdated++;
          const ts = new Date().toISOString();
          const changes = [];
          const subs = parseInt(item.statistics?.subscriberCount || 0);
          const views = parseInt(item.statistics?.viewCount || 0);
          if (subs !== c.subscribers) changes.push(`subs: ${c.subscribers} → ${subs}`);
          if (views !== c.lifetimeViews) changes.push(`lifetimeViews: ${c.lifetimeViews||0} → ${views}`);
          const history = c.changeHistory || [];
          return {
            ...c,
            subscribers: subs,
            lifetimeViews: views,
            ytTitle: item.snippet?.title || c.name,
            ytCountry: item.snippet?.country || c.country,
            ytPublishedAt: item.snippet?.publishedAt,
            ytStatus: item.status?.privacyStatus,
            lastSync: 0,
            syncStatus: "Synced",
            changeHistory: changes.length ? [...history, { ts, action:"YouTube API sync", changes, user:"system" }].slice(-50) : history,
          };
        })
      }));
      setYtSyncProgress(p => ({ ...p, updated: totalUpdated }));
      toast(`✅ Sync xong ${totalUpdated}/${allIds.length} kênh`, "success");
    } catch (e) {
      toast(`Lỗi sync: ${e.message}`, "error");
    } finally {
      setYtSyncing(false);
    }
  };

  return (
    <div style={{padding:"20px 28px",overflowY:"auto",height:"100%"}}>
      <div style={{display:"flex",gap:0,marginBottom:18,borderBottom:`1px solid ${C.border}`,overflowX:"auto"}}>
        {tabs.map(t => {
          const Icon = t.icon;
          const isActive = tab === t.id;
          return (
            <button key={t.id} onClick={()=>setTab(t.id)} style={{display:"flex",alignItems:"center",gap:6,
              padding:"10px 16px",fontSize:12,fontWeight:500,cursor:"pointer",whiteSpace:"nowrap",
              color:isActive?C.ink:C.muted,background:"transparent",border:"none",
              borderBottom:`2px solid ${isActive?C.accent:"transparent"}`,marginBottom:-1}}>
              <Icon size={13}/>{t.label}
              {t.badge !== undefined && <span style={{fontSize:9,padding:"1px 5px",background:isActive?C.accentSoft:C.bgAlt,color:isActive?C.accent:C.muted,borderRadius:8}}>{t.badge}</span>}
            </button>
          );
        })}
      </div>

      {/* BRANDING TAB */}
      {tab === "branding" && (
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
          <Card style={{padding:22}}>
            <div style={{fontFamily:"'Fraunces',serif",fontWeight:500,fontSize:15,color:C.ink,marginBottom:6}}>Logo và tên ứng dụng</div>
            <div style={{fontSize:11,color:C.muted,marginBottom:16}}>Tùy chỉnh nhận diện thương hiệu của bạn</div>

            <Field label="Logo (PNG/JPG, tối đa 2MB)">
              <div style={{display:"flex",gap:12,alignItems:"flex-start"}}>
                <div style={{width:80,height:80,background:brand.logoData?C.card:C.bgAlt,
                  border:`2px dashed ${C.border}`,borderRadius:8,display:"flex",alignItems:"center",
                  justifyContent:"center",overflow:"hidden",flexShrink:0}}>
                  {brand.logoData ? (
                    <img src={brand.logoData} alt="Logo" style={{width:"100%",height:"100%",objectFit:"cover"}}/>
                  ) : (
                    <ImageIcon size={28} style={{color:C.muted}}/>
                  )}
                </div>
                <div style={{flex:1,display:"flex",flexDirection:"column",gap:8}}>
                  <label style={{display:"inline-flex",alignItems:"center",gap:6,fontSize:12,fontWeight:500,
                    padding:"7px 12px",background:C.ink,color:"#FFF",borderRadius:4,cursor:"pointer",width:"fit-content"}}>
                    <Upload size={12}/> Tải logo lên
                    <input type="file" accept="image/*" onChange={handleLogoUpload} style={{display:"none"}}/>
                  </label>
                  {brand.logoData && (
                    <Btn ghost onClick={removeLogo} icon={Trash2} style={{width:"fit-content"}}>Xóa logo</Btn>
                  )}
                </div>
              </div>
            </Field>

            <Field label="Tên ứng dụng">
              <Input value={brand.appName||""} onChange={e=>updateBrand({appName:e.target.value})} placeholder="Meridian"/>
            </Field>

            <Field label="Tên công ty / MCN">
              <Input value={brand.companyName||""} onChange={e=>updateBrand({companyName:e.target.value})} placeholder="KUDO Network"/>
            </Field>

            <Field label="Ngôn ngữ mặc định">
              <Select value={lang} onChange={e=>{setLang(e.target.value); lsSet(LS.LANG, e.target.value); toast("Đã đổi ngôn ngữ","success");}}>
                <option value="vi">🇻🇳 Tiếng Việt</option>
                <option value="en">🇬🇧 English</option>
              </Select>
            </Field>
          </Card>

          <Card style={{padding:22}}>
            <div style={{fontFamily:"'Fraunces',serif",fontWeight:500,fontSize:15,color:C.ink,marginBottom:6}}>Màu giao diện</div>
            <div style={{fontSize:11,color:C.muted,marginBottom:16}}>Màu chính sẽ được áp dụng cho buttons, links, và highlights</div>

            <Field label="Màu chính (preset)">
              <div style={{display:"grid",gridTemplateColumns:"repeat(4, 1fr)",gap:8}}>
                {PRESET_COLORS.map(c => (
                  <button key={c.value} onClick={()=>updateBrand({primaryColor:c.value})}
                    style={{padding:8,background:c.value,color:"#FFF",border:brand.primaryColor===c.value?"3px solid #000":"none",
                      borderRadius:5,cursor:"pointer",fontSize:10,fontWeight:500,textAlign:"center"}}>
                    {c.name}
                  </button>
                ))}
              </div>
            </Field>

            <Field label="Hoặc nhập màu tùy chỉnh (HEX)">
              <div style={{display:"flex",gap:8,alignItems:"center"}}>
                <input type="color" value={brand.primaryColor||"#B8650C"} 
                  onChange={e=>updateBrand({primaryColor:e.target.value})}
                  style={{width:50,height:36,border:`1px solid ${C.border}`,borderRadius:4,cursor:"pointer"}}/>
                <Input value={brand.primaryColor||""} onChange={e=>updateBrand({primaryColor:e.target.value})} placeholder="#B8650C"/>
              </div>
            </Field>

            <div style={{padding:12,background:C.accentSoft,borderRadius:6,marginTop:16,
              border:`1px solid ${C.accent}33`,display:"flex",alignItems:"center",gap:10}}>
              <div style={{width:24,height:24,background:C.accent,borderRadius:4,display:"flex",alignItems:"center",justifyContent:"center"}}>
                <Check size={12} style={{color:"#FFF"}}/>
              </div>
              <div style={{fontSize:11,color:C.accent}}>Preview: nút bấm và highlight đang dùng màu này</div>
            </div>
          </Card>
        </div>
      )}

      {/* USERS TAB */}
      {tab === "users" && (
        <>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
            <div style={{fontSize:12,color:C.muted}}>{users.length} người dùng · Bạn là <Pill color="accent">{currentUser?.role}</Pill></div>
            {isSuperAdmin && <Btn primary onClick={openAddUser} icon={Plus}>Thêm user</Btn>}
          </div>
          <Card style={{overflow:"hidden"}}>
            <table style={{width:"100%",borderCollapse:"collapse"}}>
              <thead style={{background:C.bgAlt}}><tr>
                {["Tên","Email","Vai trò","Trạng thái","Đăng nhập gần nhất",""].map(h=>(
                  <th key={h} style={{textAlign:"left",fontSize:9,fontWeight:600,letterSpacing:"0.14em",textTransform:"uppercase",color:C.muted,padding:"10px 12px"}}>{h}</th>
                ))}
              </tr></thead>
              <tbody>{users.map(u => {
                const initials = u.fullName?.split(" ").map(n=>n[0]).slice(0,2).join("").toUpperCase() || "??";
                return (
                  <tr key={u.id} style={{borderTop:`1px solid ${C.borderSoft}`}}>
                    <td style={{padding:"10px 12px"}}>
                      <div style={{display:"flex",alignItems:"center",gap:10}}>
                        <div style={{width:30,height:30,background:C.ink,color:"#FFF",borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:500}}>{initials}</div>
                        <div>
                          <div style={{fontSize:12,fontWeight:500,color:C.ink}}>{u.fullName} {u.id===currentUser?.id&&<span style={{fontSize:9,color:C.accent,marginLeft:4}}>(bạn)</span>}</div>
                          <div style={{fontSize:9,color:C.muted}}>{u.id}</div>
                        </div>
                      </div>
                    </td>
                    <td style={{padding:"10px 12px",fontSize:11,color:C.text}}>{u.email}</td>
                    <td style={{padding:"10px 12px"}}><Pill color={u.role==="SUPER_ADMIN"?"red":u.role==="VIEWER"?"gray":"blue"}>{u.role}</Pill></td>
                    <td style={{padding:"10px 12px",fontSize:11}}><StatusDot status={u.status}/></td>
                    <td style={{padding:"10px 12px",fontSize:10,color:C.muted}}>
                      {u.lastLogin ? new Date(u.lastLogin).toLocaleString("vi-VN", {dateStyle:"short",timeStyle:"short"}) : "Chưa đăng nhập"}
                    </td>
                    <td style={{padding:"10px 12px"}}>
                      {isSuperAdmin && (
                        <div style={{display:"flex",gap:6}}>
                          <button onClick={()=>{setUserForm({...u, password:""}); setUserModal(u);}} style={{background:"none",border:"none",cursor:"pointer",padding:2}}><Edit3 size={12} style={{color:C.muted}}/></button>
                          <button onClick={()=>delUser(u)} style={{background:"none",border:"none",cursor:"pointer",padding:2}}><Trash2 size={12} style={{color:C.red}}/></button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}</tbody>
            </table>
          </Card>
        </>
      )}

      {/* INTEGRATIONS TAB */}
      {tab === "integrations" && (
        <Card style={{padding:24}}>
          <div style={{fontFamily:"'Fraunces',serif",fontWeight:500,fontSize:15,color:C.ink,marginBottom:6}}>Claude AI API</div>
          <div style={{fontSize:11,color:C.muted,marginBottom:18}}>
            Để dùng các tính năng AI (phân tích, compliance, chat), bạn cần API key từ Anthropic.
          </div>

          <div style={{padding:"12px 14px",background:C.aiSoft,borderRadius:6,marginBottom:18,
            borderLeft:`3px solid ${C.ai}`,fontSize:11,color:C.text,lineHeight:1.6}}>
            <strong style={{color:C.ai}}>Cách lấy API key miễn phí:</strong><br/>
            1. Vào <a href="https://console.anthropic.com" target="_blank" rel="noopener" style={{color:C.ai,textDecoration:"underline"}}>console.anthropic.com</a><br/>
            2. Đăng ký tài khoản (có $5 credit miễn phí cho user mới)<br/>
            3. Settings → API Keys → Create Key<br/>
            4. Copy key (bắt đầu bằng <code style={{fontFamily:"monospace",background:"rgba(0,0,0,0.05)",padding:"1px 4px",borderRadius:3}}>sk-ant-api03-...</code>) và dán vào ô bên dưới
          </div>

          <Field label="Claude API Key">
            <div style={{display:"flex",gap:6}}>
              <div style={{position:"relative",flex:1}}>
                <Input type={showKey?"text":"password"} value={apiKey} onChange={e=>setApiKey(e.target.value)}
                  placeholder="sk-ant-api03-..." style={{paddingRight:34,fontFamily:"monospace"}}/>
                <button onClick={()=>setShowKey(s=>!s)} style={{position:"absolute",right:8,top:8,background:"none",border:"none",cursor:"pointer"}}>
                  {showKey ? <EyeOff size={14} style={{color:C.muted}}/> : <Eye size={14} style={{color:C.muted}}/>}
                </button>
              </div>
              <Btn primary onClick={saveApiKey} icon={Save}>Lưu</Btn>
              <Btn ghost onClick={testApiKey} icon={Zap}>Test</Btn>
            </div>
          </Field>

          {apiKey && (
            <div style={{padding:"10px 12px",background:C.greenSoft,borderRadius:5,
              borderLeft:`3px solid ${C.green}`,fontSize:11,color:C.green,marginTop:8,
              display:"flex",alignItems:"center",gap:8}}>
              <Check size={14}/> API key đã được lưu trong trình duyệt này (không gửi lên server)
            </div>
          )}

          {/* Backend API Token — for production-secured deploys */}
          <BackendTokenSection C={C} toast={toast}/>

          {/* Claude Model Selector */}
          <Field label="Claude Model">
            <Select value={claudeModel}
              onChange={e=>{
                const newModel = e.target.value;
                setClaudeModel(newModel);
                lsSet("meridian-claude-model", newModel);
                toast(`✅ Đã đổi model sang: ${newModel}`, "success");
              }}>
              {CLAUDE_MODELS.map(m => (
                <option key={m.id} value={m.id}>{m.label}</option>
              ))}
            </Select>
            {(() => {
              const m = CLAUDE_MODELS.find(x => x.id === claudeModel);
              return m ? <div style={{fontSize:10,color:C.muted,marginTop:4}}>{m.desc}</div> : null;
            })()}
          </Field>
          <div style={{padding:10,background:C.bgAlt,borderRadius:4,fontSize:10,color:C.muted,marginBottom:14}}>
            💡 Nếu test API gặp lỗi <code>404 not_found_error</code>, có nghĩa là model name không tồn tại — đổi model khác và test lại.<br/>
            Tham khảo model mới nhất tại <a href="https://docs.anthropic.com/en/docs/about-claude/models" target="_blank" rel="noopener" style={{color:C.accent}}>docs.anthropic.com/models</a>
          </div>

          <div style={{marginTop:24,paddingTop:18,borderTop:`1px solid ${C.borderSoft}`}}>
            <div style={{fontSize:12,fontWeight:500,color:C.ink,marginBottom:8}}>Các tính năng AI có sẵn</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
              {[
                { icon:Sparkles, label:"AI Daily Insight", desc:"Phân tích tự động trên trang tổng quan" },
                { icon:Bot, label:"AI Agent", desc:"Chat hỏi đáp về dữ liệu MCN" },
                { icon:ShieldAlert, label:"AI Compliance", desc:"Quét vi phạm và cảnh báo tái phạm" },
                { icon:Tag, label:"Topic Analysis", desc:"Phân tích từng chủ đề chuyên sâu" },
              ].map(f => {
                const Icon = f.icon;
                return (
                  <div key={f.label} style={{padding:12,background:C.bgAlt,borderRadius:5,display:"flex",gap:10}}>
                    <Icon size={18} style={{color:C.ai,flexShrink:0,marginTop:2}}/>
                    <div>
                      <div style={{fontSize:11,fontWeight:500,color:C.ink}}>{f.label}</div>
                      <div style={{fontSize:10,color:C.muted,marginTop:2}}>{f.desc}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </Card>
      )}

      {/* LAN ACCESS card - inside Integrations tab */}
      {tab === "integrations" && <LANAccessCard C={C} toast={toast}/>}

      {/* AUTOMATION TAB v5.1 */}
      {tab === "automation" && (
        <div style={{display:"grid",gap:14}}>
          {/* AI CACHE STATS */}
          <Card style={{padding:22,borderLeft:`3px solid ${C.ai}`}}>
            <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:14}}>
              <Sparkles size={18} style={{color:C.ai}}/>
              <div>
                <div style={{fontFamily:"'Fraunces',serif",fontWeight:500,fontSize:15,color:C.ink}}>AI Cache (giảm chi phí Claude API)</div>
                <div style={{fontSize:11,color:C.muted}}>Cache 3 lớp: memory + IndexedDB + TTL · Anthropic prompt caching giảm 90% giá system prompt</div>
              </div>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10,marginBottom:12}}>
              <div style={{padding:12,background:C.greenSoft,borderRadius:5}}>
                <div style={{fontSize:9,fontWeight:600,letterSpacing:"0.14em",textTransform:"uppercase",color:C.green}}>Cache hits</div>
                <div style={{fontSize:22,fontFamily:"'Fraunces',serif",fontWeight:500,color:C.green,marginTop:4}}>{aiStats.hits}</div>
                <div style={{fontSize:9,color:C.muted,marginTop:2}}>Lần đỡ phải gọi API</div>
              </div>
              <div style={{padding:12,background:C.bgAlt,borderRadius:5}}>
                <div style={{fontSize:9,fontWeight:600,letterSpacing:"0.14em",textTransform:"uppercase",color:C.muted}}>Cache misses</div>
                <div style={{fontSize:22,fontFamily:"'Fraunces',serif",fontWeight:500,color:C.text,marginTop:4}}>{aiStats.misses}</div>
                <div style={{fontSize:9,color:C.muted,marginTop:2}}>Đã gọi API mới</div>
              </div>
              <div style={{padding:12,background:C.aiSoft,borderRadius:5}}>
                <div style={{fontSize:9,fontWeight:600,letterSpacing:"0.14em",textTransform:"uppercase",color:C.ai}}>Tiết kiệm</div>
                <div style={{fontSize:22,fontFamily:"'Fraunces',serif",fontWeight:500,color:C.ai,marginTop:4}}>${aiStats.savedCost.toFixed(3)}</div>
                <div style={{fontSize:9,color:C.muted,marginTop:2}}>{(aiStats.savedTokens/1000).toFixed(1)}K tokens</div>
              </div>
              <div style={{padding:12,background:C.bgAlt,borderRadius:5}}>
                <div style={{fontSize:9,fontWeight:600,letterSpacing:"0.14em",textTransform:"uppercase",color:C.muted}}>Cached entries</div>
                <div style={{fontSize:22,fontFamily:"'Fraunces',serif",fontWeight:500,color:C.text,marginTop:4}}>{aiCacheCount}</div>
                <div style={{fontSize:9,color:C.muted,marginTop:2}}>Trong IndexedDB</div>
              </div>
            </div>
            <div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"}}>
              <label style={{display:"flex",alignItems:"center",gap:6,fontSize:11,cursor:"pointer"}}>
                <input type="checkbox" checked={!!autoCfg.aiCacheEnabled} onChange={e=>setAutoCfg(c=>({...c,aiCacheEnabled:e.target.checked}))}/>
                Bật AI cache (mặc định bật)
              </label>
              <Field label="" style={{margin:0,marginLeft:14}}>
                <span style={{fontSize:11,color:C.muted,marginRight:6}}>TTL:</span>
                <Select value={autoCfg.aiCacheTTLDays || 1} onChange={e=>setAutoCfg(c=>({...c,aiCacheTTLDays:Number(e.target.value)}))} style={{display:"inline-block",width:120}}>
                  <option value={0.25}>6 giờ</option>
                  <option value={0.5}>12 giờ</option>
                  <option value={1}>1 ngày</option>
                  <option value={3}>3 ngày</option>
                  <option value={7}>7 ngày</option>
                </Select>
              </Field>
              <Btn ghost onClick={clearAiCacheFn} icon={Trash2} style={{marginLeft:"auto"}}>Xoá cache</Btn>
            </div>
            <div style={{marginTop:10,padding:10,background:C.bgAlt,borderRadius:5,fontSize:10,color:C.muted,lineHeight:1.5}}>
              💡 <strong>Cách hoạt động:</strong> Khi bạn bấm AI ở 1 view (vd "AI per-CMS"), kết quả được cache theo (loại phân tích, hash dữ liệu, ngày). Bấm lại trong cùng ngày = trả về cache, miễn phí. Chỉ khi data thay đổi (import file mới) cache mới invalidate. Anthropic prompt caching cũng giảm 90% giá phần KUDO context.
            </div>
          </Card>

          {/* AUTO-IMPORT FOLDER */}
          <Card style={{padding:22}}>
            <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:6}}>
              <Folder size={16} style={{color:C.accent}}/>
              <div style={{fontFamily:"'Fraunces',serif",fontWeight:500,fontSize:15,color:C.ink}}>Tự động Import từ Folder</div>
            </div>
            <div style={{fontSize:11,color:C.muted,marginBottom:14}}>
              Chọn folder chứa các file MCN/CMS qdsense xuất ra. App sẽ tự động quét folder mỗi N phút và import file mới.
              File trùng (theo SHA-256) sẽ được bỏ qua. Yêu cầu: Chrome 86+ hoặc Edge 86+.
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr auto",gap:10,alignItems:"end",marginBottom:10}}>
              <Field label="Folder hiện tại">
                <Input value={folderName || "(chưa chọn)"} disabled/>
              </Field>
              <Btn primary onClick={pickFolderFn} icon={FolderOpen}>Chọn folder</Btn>
            </div>
            <div style={{display:"flex",gap:14,flexWrap:"wrap",alignItems:"center"}}>
              <label style={{display:"flex",alignItems:"center",gap:6,fontSize:12,cursor:"pointer"}}>
                <input type="checkbox" checked={!!autoCfg.folderWatch} onChange={e=>setAutoCfg(c=>({...c,folderWatch:e.target.checked}))}/>
                Bật tự động quét
              </label>
              <Field label="" style={{margin:0}}>
                <span style={{fontSize:11,color:C.muted,marginRight:6}}>Mỗi:</span>
                <Select value={autoCfg.folderInterval || 30} onChange={e=>setAutoCfg(c=>({...c,folderInterval:Number(e.target.value)}))} style={{display:"inline-block",width:120}}>
                  <option value={5}>5 phút</option>
                  <option value={15}>15 phút</option>
                  <option value={30}>30 phút</option>
                  <option value={60}>1 giờ</option>
                  <option value={180}>3 giờ</option>
                </Select>
              </Field>
            </div>
          </Card>

          {/* YOUTUBE DATA API */}
          <Card style={{padding:22}}>
            <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:6}}>
              <Tv size={16} style={{color:C.red}}/>
              <div style={{fontFamily:"'Fraunces',serif",fontWeight:500,fontSize:15,color:C.ink}}>YouTube Data API v3 — Sync trực tiếp</div>
            </div>
            <div style={{fontSize:11,color:C.muted,marginBottom:14}}>
              Lấy subscribers, views, monetization status trực tiếp từ YouTube — không cần xuất file Excel.
              Lấy API key miễn phí: <a href="https://console.cloud.google.com/apis/credentials" target="_blank" rel="noopener" style={{color:C.accent}}>console.cloud.google.com</a> → bật YouTube Data API v3 → Create credentials → API key. Quota miễn phí 10,000 units/ngày.
            </div>
            <Field label="YouTube API Key">
              <div style={{display:"flex",gap:6}}>
                <Input value={autoCfg.ytApiKey || ""} onChange={e=>setAutoCfg(c=>({...c,ytApiKey:e.target.value}))} placeholder="AIzaSy..." style={{fontFamily:"monospace"}}/>
                <Btn ghost onClick={testYtApiFn} icon={Zap}>Test</Btn>
              </div>
            </Field>
            <div style={{display:"flex",gap:14,flexWrap:"wrap",alignItems:"center",marginBottom:10}}>
              <label style={{display:"flex",alignItems:"center",gap:6,fontSize:12,cursor:"pointer"}}>
                <input type="checkbox" checked={!!autoCfg.ytSyncEnabled} onChange={e=>setAutoCfg(c=>({...c,ytSyncEnabled:e.target.checked}))}/>
                Auto sync (background)
              </label>
              <Field label="" style={{margin:0}}>
                <span style={{fontSize:11,color:C.muted,marginRight:6}}>Mỗi:</span>
                <Select value={autoCfg.ytSyncInterval || 360} onChange={e=>setAutoCfg(c=>({...c,ytSyncInterval:Number(e.target.value)}))} style={{display:"inline-block",width:120}}>
                  <option value={60}>1 giờ</option>
                  <option value={180}>3 giờ</option>
                  <option value={360}>6 giờ</option>
                  <option value={720}>12 giờ</option>
                  <option value={1440}>1 ngày</option>
                </Select>
              </Field>
            </div>

            {/* Mass sync NOW */}
            <div style={{padding:12,background:C.bgAlt,borderRadius:5,borderLeft:`3px solid ${C.green}`}}>
              <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:8}}>
                <Zap size={14} style={{color:C.green}}/>
                <div style={{flex:1}}>
                  <div style={{fontSize:12,fontWeight:500,color:C.ink}}>Sync tất cả {state.channels.filter(c=>c.ytId).length} kênh ngay</div>
                  <div style={{fontSize:10,color:C.muted}}>Lấy subs / views / monetization status real-time từ YouTube</div>
                </div>
                <Btn primary onClick={massSyncYouTube} disabled={ytSyncing || !autoCfg.ytApiKey} icon={ytSyncing?null:RefreshCw}>
                  {ytSyncing ? `Đang sync... ${ytSyncProgress.done}/${ytSyncProgress.total}` : "Sync ngay tất cả"}
                </Btn>
              </div>
              {ytSyncing && (
                <div style={{height:6,background:C.borderSoft,borderRadius:3,overflow:"hidden"}}>
                  <div style={{width:`${ytSyncProgress.total ? (ytSyncProgress.done/ytSyncProgress.total*100) : 0}%`,height:"100%",background:C.green,transition:"width 0.3s"}}/>
                </div>
              )}
              {!ytSyncing && ytSyncProgress.updated > 0 && (
                <div style={{fontSize:10,color:C.green,marginTop:4}}>
                  ✅ Đã cập nhật {ytSyncProgress.updated} kênh trong lần sync gần nhất
                </div>
              )}
            </div>
          </Card>

          {/* WEBHOOKS */}
          <Card style={{padding:22}}>
            <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:6}}>
              <Bell size={16} style={{color:C.amber}}/>
              <div style={{fontFamily:"'Fraunces',serif",fontWeight:500,fontSize:15,color:C.ink,flex:1}}>Webhook Notifications (Telegram/Slack/Discord/Custom)</div>
              <Btn primary onClick={addWebhookFn} icon={Plus}>Thêm webhook</Btn>
            </div>
            <div style={{fontSize:11,color:C.muted,marginBottom:14}}>
              Khi có alert Critical, app sẽ gửi POST đến webhook (throttle 6h/kênh để tránh spam).<br/>
              <strong>Telegram:</strong> URL = <code>https://api.telegram.org/bot[TOKEN]/sendMessage</code>, Chat ID lấy từ @userinfobot. <strong>Slack:</strong> Incoming webhook URL. <strong>Discord:</strong> webhook URL của channel.
            </div>
            {(autoCfg.webhooks || []).length === 0 ? (
              <div style={{padding:24,textAlign:"center",background:C.bgAlt,borderRadius:5,fontSize:11,color:C.muted}}>
                Chưa có webhook nào. Bấm "Thêm webhook" ở trên.
              </div>
            ) : (autoCfg.webhooks || []).map((w, i) => (
              <div key={i} style={{padding:12,background:C.bgAlt,borderRadius:5,marginBottom:8}}>
                <div style={{display:"grid",gridTemplateColumns:"100px 1fr 1fr auto",gap:8,alignItems:"end",marginBottom:8}}>
                  <Field label="Loại" style={{margin:0}}>
                    <Select value={w.type || "telegram"} onChange={e=>updateWebhookFn(i,{type:e.target.value})}>
                      <option value="telegram">Telegram</option>
                      <option value="slack">Slack</option>
                      <option value="discord">Discord</option>
                      <option value="custom">Custom</option>
                    </Select>
                  </Field>
                  <Field label="URL" style={{margin:0}}>
                    <Input value={w.url || ""} onChange={e=>updateWebhookFn(i,{url:e.target.value})} placeholder={w.type==="telegram"?"https://api.telegram.org/bot.../sendMessage":"https://..."}/>
                  </Field>
                  {w.type === "telegram" ? (
                    <Field label="Chat ID" style={{margin:0}}>
                      <Input value={w.chatId || ""} onChange={e=>updateWebhookFn(i,{chatId:e.target.value})} placeholder="-1001234567890"/>
                    </Field>
                  ) : <div/>}
                  <div style={{display:"flex",gap:4}}>
                    <Btn ghost onClick={()=>testWebhookFn(i)} icon={Zap}>Test</Btn>
                    <Btn ghost onClick={()=>removeWebhookFn(i)} icon={Trash2}/>
                  </div>
                </div>
                <div style={{display:"flex",gap:10,fontSize:11,color:C.text,flexWrap:"wrap"}}>
                  <span style={{color:C.muted}}>Sự kiện:</span>
                  {[
                    {id:"critical", label:"🔴 Critical alerts"},
                    {id:"violation", label:"⚠️ Vi phạm mới"},
                    {id:"import", label:"📂 Import xong"},
                    {id:"approval", label:"✓ Duyệt sản phẩm"},
                    {id:"digest", label:"📅 Daily digest"},
                  ].map(ev => (
                    <label key={ev.id} style={{display:"flex",alignItems:"center",gap:4,cursor:"pointer"}}>
                      <input type="checkbox" checked={(w.events||[]).includes(ev.id)} onChange={e=>{
                        const events = e.target.checked
                          ? [...(w.events||[]), ev.id]
                          : (w.events||[]).filter(x=>x!==ev.id);
                        updateWebhookFn(i, { events });
                      }}/>
                      {ev.label}
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </Card>

          {/* AUTO BACKUP */}
          <Card style={{padding:22}}>
            <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:6}}>
              <Database size={16} style={{color:C.green}}/>
              <div style={{fontFamily:"'Fraunces',serif",fontWeight:500,fontSize:15,color:C.ink}}>Tự động Backup hằng ngày</div>
            </div>
            <div style={{fontSize:11,color:C.muted,marginBottom:14}}>
              Mỗi ngày vào giờ định trước, app sẽ tự download file backup JSON. Bạn có thể kéo file vào Google Drive thủ công, hoặc dùng folder Drive đồng bộ desktop để tự đẩy lên cloud.
            </div>
            <div style={{display:"flex",gap:14,flexWrap:"wrap",alignItems:"center"}}>
              <label style={{display:"flex",alignItems:"center",gap:6,fontSize:12,cursor:"pointer"}}>
                <input type="checkbox" checked={!!autoCfg.autoBackup} onChange={e=>setAutoCfg(c=>({...c,autoBackup:e.target.checked}))}/>
                Bật auto-backup
              </label>
              <Field label="" style={{margin:0}}>
                <span style={{fontSize:11,color:C.muted,marginRight:6}}>Giờ:</span>
                <Select value={autoCfg.autoBackupHour || 3} onChange={e=>setAutoCfg(c=>({...c,autoBackupHour:Number(e.target.value)}))} style={{display:"inline-block",width:100}}>
                  {Array.from({length:24}).map((_,h)=><option key={h} value={h}>{String(h).padStart(2,"0")}:00</option>)}
                </Select>
              </Field>
              <Btn ghost onClick={()=>{downloadBackup(state); toast("Đã download backup","success");}} icon={Download}>Backup ngay</Btn>
              <Btn ghost onClick={openDriveUpload} icon={ArrowUpRight}>Mở Google Drive</Btn>
            </div>
          </Card>

          {/* DAILY DIGEST */}
          <Card style={{padding:22}}>
            <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:6}}>
              <Mail size={16} style={{color:C.accent}}/>
              <div style={{fontFamily:"'Fraunces',serif",fontWeight:500,fontSize:15,color:C.ink}}>Daily Digest — Báo cáo sáng tự động</div>
            </div>
            <div style={{fontSize:11,color:C.muted,marginBottom:14}}>
              Mỗi sáng vào giờ định trước, hệ thống sẽ gửi báo cáo nhanh (KPI + Top 3 + Data Health + Critical alerts) qua webhook (Telegram/Slack/Discord/Email).
              Cần bật event <code>📅 Daily digest</code> ở webhook bên dưới.
            </div>
            <div style={{display:"flex",gap:14,flexWrap:"wrap",alignItems:"center"}}>
              <label style={{display:"flex",alignItems:"center",gap:6,fontSize:12,cursor:"pointer"}}>
                <input type="checkbox" checked={!!autoCfg.dailyDigest} onChange={e=>setAutoCfg(c=>({...c,dailyDigest:e.target.checked}))}/>
                Bật Daily Digest
              </label>
              <Field label="" style={{margin:0}}>
                <span style={{fontSize:11,color:C.muted,marginRight:6}}>Gửi lúc:</span>
                <Select value={autoCfg.dailyDigestHour ?? 8} onChange={e=>setAutoCfg(c=>({...c,dailyDigestHour:Number(e.target.value)}))} style={{display:"inline-block",width:100}}>
                  {Array.from({length:24}).map((_,h)=><option key={h} value={h}>{String(h).padStart(2,"0")}:00</option>)}
                </Select>
              </Field>
              <Btn ghost onClick={()=>{
                // Manual test: compose and send digest now
                const enabled = (autoCfg.webhooks || []).filter(w => w.url && (w.events || []).includes("digest"));
                if (!enabled.length) { toast("Chưa có webhook nào bật event 'Daily digest'", "warning"); return; }
                const totalRev = state.channels.reduce((s,c)=>s+c.monthlyRevenue, 0);
                const top3 = [...state.channels].sort((a,b)=>b.monthlyRevenue-a.monthlyRevenue).slice(0,3);
                const dh = computeDataHealth(state);
                const msg = `📅 *MERIDIAN DAILY DIGEST (TEST)*\n\n📊 Doanh thu: $${totalRev.toLocaleString()}\n🎬 Kênh: ${state.channels.length}\n💎 Top 3:\n${top3.map((c,i)=>`${i+1}. ${c.name}: $${c.monthlyRevenue.toLocaleString()}`).join("\n")}\n\n🩺 Data Health: ${dh.score}/100`;
                Promise.all(enabled.map(w => sendWebhook(w, msg)))
                  .then(results => toast(`Đã gửi test digest tới ${results.filter(r=>r.success).length}/${enabled.length} webhook`, "success"));
              }} icon={Zap}>Test gửi ngay</Btn>
            </div>
          </Card>

          {/* PERIODIC AUDIT */}
          <PeriodicAuditCard C={C} toast={toast} state={state}/>
        </div>
      )}

      {/* SECURITY TAB */}
      {tab === "security" && (
        <div style={{display:"grid",gap:14}}>
          <Card style={{padding:22}}>
            <div style={{fontFamily:"'Fraunces',serif",fontWeight:500,fontSize:15,color:C.ink,marginBottom:6}}>Chính sách bảo mật</div>
            <div style={{fontSize:11,color:C.muted,marginBottom:16}}>Cấu hình hiện đang được áp dụng</div>
            
            <div style={{display:"grid",gap:10}}>
              {[
                { icon:Lock, label:"Mật khẩu tối thiểu 6 ký tự", on:true },
                { icon:Clock, label:"Session timeout sau 7 ngày", on:true },
                { icon:Hash, label:"Mật khẩu được hash trước khi lưu", on:true },
                { icon:Database, label:"Dữ liệu chỉ lưu local trên trình duyệt này (không gửi đi)", on:true },
                { icon:Shield, label:"Multi-Factor Authentication (sắp có)", on:false },
                { icon:History, label:"Audit log đăng nhập (sắp có)", on:false },
              ].map((p,i) => {
                const Icon = p.icon;
                return (
                  <div key={i} style={{display:"flex",alignItems:"center",gap:12,padding:"10px 12px",
                    background:p.on?C.greenSoft:C.bgAlt,borderRadius:5,
                    borderLeft:`3px solid ${p.on?C.green:C.muted}`}}>
                    <Icon size={14} style={{color:p.on?C.green:C.muted}}/>
                    <span style={{fontSize:12,color:p.on?C.text:C.muted,flex:1}}>{p.label}</span>
                    {p.on && <Check size={14} style={{color:C.green}}/>}
                  </div>
                );
              })}
            </div>
          </Card>

          <Card style={{padding:22}}>
            <div style={{fontFamily:"'Fraunces',serif",fontWeight:500,fontSize:15,color:C.ink,marginBottom:6}}>Phiên đăng nhập hiện tại</div>
            <div style={{padding:12,background:C.bgAlt,borderRadius:5,marginTop:12,fontSize:11,color:C.text,lineHeight:1.7}}>
              <div><strong>User:</strong> {currentUser?.fullName} ({currentUser?.email})</div>
              <div><strong>Vai trò:</strong> {currentUser?.role}</div>
              <div><strong>Session ID:</strong> <code style={{fontFamily:"monospace",fontSize:10}}>{lsGet(LS.AUTH)?.token?.slice(0,16)}...</code></div>
              <div><strong>Hết hạn:</strong> {lsGet(LS.AUTH)?.expiresAt ? new Date(lsGet(LS.AUTH).expiresAt).toLocaleString("vi-VN") : "—"}</div>
            </div>
          </Card>
        </div>
      )}

      {/* AUDIT LOG TAB */}
      {tab === "audit" && (() => {
        const auditLog = lsGet(LS.AUDIT, []);
        const userMap = {};
        users.forEach(u => userMap[u.id] = u.fullName);
        return (
          <Card style={{padding:0,overflow:"hidden"}}>
            <div style={{padding:"14px 18px",borderBottom:`1px solid ${C.border}`,background:C.bgAlt}}>
              <div style={{display:"flex",alignItems:"center",gap:10}}>
                <History size={16} style={{color:C.ink}}/>
                <div>
                  <div style={{fontFamily:"'Fraunces',serif",fontWeight:500,fontSize:14,color:C.ink}}>Nhật ký hoạt động hệ thống</div>
                  <div style={{fontSize:10,color:C.muted}}>{auditLog.length} entries · Lưu lại 500 entries gần nhất</div>
                </div>
                <Btn ghost onClick={()=>{
                  if (window.confirm("Xóa toàn bộ audit log? Hành động này không thể hoàn tác.")) {
                    lsSet(LS.AUDIT, []);
                    toast("Đã xóa audit log","success");
                  }
                }} icon={Trash2} style={{marginLeft:"auto"}}>Xóa toàn bộ</Btn>
              </div>
            </div>
            <div style={{maxHeight:560,overflowY:"auto"}}>
              {auditLog.length === 0 ? (
                <div style={{padding:40,textAlign:"center",color:C.muted,fontSize:12}}>Chưa có hoạt động nào được ghi lại.</div>
              ) : auditLog.slice(0,200).map((entry,i) => {
                const isLogin = entry.action.includes("LOGIN");
                const isSuccess = entry.action.includes("LOGIN") && !entry.action.includes("FAILED");
                const isFailed = entry.action.includes("FAILED") || entry.action.includes("LOCKED");
                const isApproval = entry.action.includes("APPROVED") || entry.action.includes("ASSIGNED");
                const isReject = entry.action.includes("REJECTED");
                
                let bgColor = C.bgAlt;
                let icon = Info;
                let iconColor = C.muted;
                if (isFailed) { bgColor = C.redSoft; icon = AlertTriangle; iconColor = C.red; }
                else if (isSuccess) { bgColor = C.greenSoft; icon = LogIn; iconColor = C.green; }
                else if (isApproval) { bgColor = C.blueSoft; icon = Check; iconColor = C.blue; }
                else if (isReject) { bgColor = C.redSoft; icon = X; iconColor = C.red; }
                
                const Icon = icon;
                return (
                  <div key={entry.id} style={{display:"flex",alignItems:"flex-start",gap:10,padding:"10px 18px",
                    borderBottom:i<auditLog.length-1?`1px solid ${C.borderSoft}`:"none"}}>
                    <div style={{width:26,height:26,background:bgColor,borderRadius:5,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                      <Icon size={12} style={{color:iconColor}}/>
                    </div>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:3,flexWrap:"wrap"}}>
                        <Pill color={isFailed||isReject?"red":isSuccess||isApproval?"green":"gray"}>{entry.action}</Pill>
                        <span style={{fontSize:10,color:C.muted}}>{userMap[entry.userId] || entry.userId}</span>
                        <span style={{fontSize:10,color:C.muted}}>· {new Date(entry.timestamp).toLocaleString("vi-VN")}</span>
                      </div>
                      {entry.details && (
                        <div style={{fontSize:11,color:C.text,fontFamily:"monospace",wordBreak:"break-all"}}>{entry.details}</div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            {auditLog.length > 200 && (
              <div style={{padding:"9px 12px",fontSize:10,color:C.muted,background:C.bgAlt,borderTop:`1px solid ${C.borderSoft}`,textAlign:"center"}}>
                Hiển thị 200/{auditLog.length} entries gần nhất
              </div>
            )}
          </Card>
        );
      })()}

      {/* DATA TAB */}
      {tab === "data" && (
        <Card style={{padding:24}}>
          <div style={{fontFamily:"'Fraunces',serif",fontWeight:500,fontSize:15,color:C.ink,marginBottom:6}}>Quản lý dữ liệu</div>
          <div style={{fontSize:11,color:C.muted,marginBottom:18}}>Toàn bộ dữ liệu được lưu trong localStorage trình duyệt</div>

          <div style={{padding:14,background:C.amberSoft,borderRadius:6,marginBottom:18,display:"flex",gap:10,
            borderLeft:`3px solid ${C.amber}`}}>
            <AlertTriangle size={16} style={{color:C.amber,flexShrink:0,marginTop:2}}/>
            <div>
              <div style={{fontSize:12,fontWeight:500,color:C.amber,marginBottom:4}}>Lưu ý quan trọng</div>
              <div style={{fontSize:11,color:C.text,lineHeight:1.6}}>
                Data chỉ tồn tại trên trình duyệt máy này. Xóa cache trình duyệt = mất hết. 
                Để chia sẻ giữa nhiều máy, bạn cần cài backend PostgreSQL.
                <br/>Hãy export backup định kỳ.
              </div>
            </div>
          </div>

          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:14}}>
            <div style={{padding:14,background:C.bgAlt,borderRadius:6}}>
              <div style={{fontSize:9,fontWeight:600,letterSpacing:"0.14em",textTransform:"uppercase",color:C.muted,marginBottom:6}}>Số lượng bản ghi</div>
              <div style={{display:"grid",gap:4,fontSize:11}}>
                <div style={{display:"flex",justifyContent:"space-between"}}><span style={{color:C.text}}>Kênh:</span> <span style={{fontFamily:"monospace",fontWeight:500}}>{state.channels?.length||0}</span></div>
                <div style={{display:"flex",justifyContent:"space-between"}}><span style={{color:C.text}}>Đối tác:</span> <span style={{fontFamily:"monospace",fontWeight:500}}>{state.partners?.length||0}</span></div>
                <div style={{display:"flex",justifyContent:"space-between"}}><span style={{color:C.text}}>Vi phạm:</span> <span style={{fontFamily:"monospace",fontWeight:500}}>{state.violations?.length||0}</span></div>
                <div style={{display:"flex",justifyContent:"space-between"}}><span style={{color:C.text}}>Lịch sử import:</span> <span style={{fontFamily:"monospace",fontWeight:500}}>{state.importHistory?.length||0}</span></div>
                <div style={{display:"flex",justifyContent:"space-between"}}><span style={{color:C.text}}>Kiểm định:</span> <span style={{fontFamily:"monospace",fontWeight:500}}>{state.productInspections?.length||0}</span></div>
              </div>
            </div>
            <div style={{padding:14,background:C.bgAlt,borderRadius:6}}>
              <div style={{fontSize:9,fontWeight:600,letterSpacing:"0.14em",textTransform:"uppercase",color:C.muted,marginBottom:6}}>Bộ nhớ sử dụng</div>
              <div style={{fontSize:18,fontFamily:"'Fraunces',serif",fontWeight:500,color:C.ink}}>
                {Math.round(JSON.stringify(state).length / 1024)} KB
              </div>
              <div style={{fontSize:10,color:C.muted,marginTop:4}}>Limit của localStorage: ~5-10 MB</div>
            </div>
          </div>

          <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
            <Btn primary onClick={exportData} icon={Download}>Xuất backup (JSON)</Btn>
            {can(currentUser, "data.wipe") && (
              <>
                <Btn ghost onClick={wipeChannelsAndPartners} icon={Trash2} style={{color:C.amber,borderColor:C.amber}}>
                  Xóa kênh + đối tác
                </Btn>
                <Btn danger onClick={resetAll} icon={Trash2}>Reset toàn bộ</Btn>
              </>
            )}
          </div>
          {!can(currentUser, "data.wipe") && (
            <div style={{marginTop:10,padding:8,background:C.bgAlt,borderRadius:4,fontSize:10,color:C.muted}}>
              ⛔ Chỉ Super Admin được phép xóa data hàng loạt
            </div>
          )}
        </Card>
      )}

      {/* USER MODAL */}
      {userModal !== null && (
        <Modal title={userModal==="add"?"Thêm user":"Sửa user"} onClose={()=>setUserModal(null)}>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0 16px"}}>
            <Field label="Họ tên *"><Input value={userForm.fullName||""} onChange={e=>setUserForm(f=>({...f,fullName:e.target.value}))}/></Field>
            <Field label="Email *"><Input value={userForm.email||""} onChange={e=>setUserForm(f=>({...f,email:e.target.value}))} disabled={userModal!=="add"}/></Field>
            <Field label={userModal==="add"?"Mật khẩu *":"Mật khẩu mới (để trống = không đổi)"}>
              <Input type="password" value={userForm.password||""} onChange={e=>setUserForm(f=>({...f,password:e.target.value}))}/>
            </Field>
            <Field label="Vai trò">
              <Select value={userForm.role||"VIEWER"} onChange={e=>setUserForm(f=>({...f,role:e.target.value}))}>
                {Object.entries(ROLES).filter(([key]) => key !== "PARTNER").map(([key, info]) => (
                  <option key={key} value={key}>{info.label}</option>
                ))}
              </Select>
              {userForm.role && ROLES[userForm.role] && (
                <div style={{fontSize:10,color:C.muted,marginTop:4,fontStyle:"italic"}}>
                  💡 {ROLES[userForm.role].desc}
                </div>
              )}
            </Field>
            <Field label="Trạng thái">
              <Select value={userForm.status||"Active"} onChange={e=>setUserForm(f=>({...f,status:e.target.value}))}>
                <option>Active</option><option>Suspended</option>
              </Select>
            </Field>
          </div>
          <div style={{display:"flex",justifyContent:"flex-end",gap:8,marginTop:16,paddingTop:14,borderTop:`1px solid ${C.borderSoft}`}}>
            <Btn ghost onClick={()=>setUserModal(null)}>Hủy</Btn>
            <Btn primary onClick={saveUser}>{userModal==="add"?"Tạo":"Lưu"}</Btn>
          </div>
        </Modal>
      )}
    </div>
  );
};
// ─── AI AGENT (chat + analysis + alerts) ──────────────────────────
const AIAgentView = ({ state, callAI }) => {
  const C = useC();
  const { channels, partners } = state;
  const [tab, setTab] = useState("chat");
  const [messages, setMessages] = useState([
    { role:"assistant", content:"Xin chào! Tôi là **AI Analyst v5.1**. Hỏi tôi bất kỳ điều gì về dữ liệu MCN của bạn — kênh, đối tác, doanh thu, chủ đề, hoặc bấm các nút phía trên để chạy phân tích tự động.\n\n💡 **Auto Mode** giúp tôi tự chạy phân tích định kỳ (mỗi 6h/12h/24h) và lưu kết quả ở tab Insights." }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState(null);
  const [aLoading, setALoading] = useState(false);
  const [alerts, setAlerts] = useState(null);
  const [alLoading, setAlLoading] = useState(false);
  const chatRef = useRef(null);
  // ─── Auto-Mode: scheduled AI insights ────────────────────────────
  const [autoMode, setAutoMode] = useState(() => lsGet("meridian-v51-ai-automode", false));
  const [autoInterval, setAutoInterval] = useState(() => lsGet("meridian-v51-ai-interval", 12)); // hours
  const [autoInsights, setAutoInsights] = useState(() => lsGet("meridian-v51-ai-insights", []));
  const [lastAutoRun, setLastAutoRun] = useState(() => lsGet("meridian-v51-ai-last-run", null));
  const autoTimerRef = useRef(null);

  useEffect(() => { chatRef.current?.scrollIntoView({ behavior:"smooth" }); }, [messages]);
  useEffect(() => { lsSet("meridian-v51-ai-automode", autoMode); }, [autoMode]);
  useEffect(() => { lsSet("meridian-v51-ai-interval", autoInterval); }, [autoInterval]);
  useEffect(() => { lsSet("meridian-v51-ai-insights", autoInsights); }, [autoInsights]);
  useEffect(() => { lsSet("meridian-v51-ai-last-run", lastAutoRun); }, [lastAutoRun]);

  const ctx = () => {
    const totalRev = channels.reduce((s,c)=>s+c.monthlyRevenue,0);
    const critical = channels.filter(c=>c.health==="Critical");
    const top5 = [...channels].sort((a,b)=>b.monthlyRevenue-a.monthlyRevenue).slice(0,5);
    const cmsList = [...new Set(channels.map(c=>c.cms).filter(Boolean))];
    const topicList = [...new Set(channels.map(c=>c.topic).filter(Boolean))];
    return `Dữ liệu MCN (${new Date().toLocaleDateString("vi-VN")}):
- ${partners.length} đối tác · ${channels.length} kênh · ${cmsList.length} CMS (${cmsList.slice(0,5).join(", ")})
- ${topicList.length} chủ đề (${topicList.slice(0,5).join(", ")})
- Doanh thu tháng: $${totalRev.toLocaleString()}
- Critical: ${critical.length} kênh
- Top 5 kênh doanh thu: ${top5.map(c=>`${c.name} ($${c.monthlyRevenue.toLocaleString()})`).join(", ")}`;
  };

  const send = async () => {
    if (!input.trim() || loading) return;
    const u = input.trim();
    setInput("");
    setMessages(prev => [...prev, { role:"user", content:u }]);
    setLoading(true);
    const history = [...messages, { role:"user", content:u }].slice(-8).map(m=>({role:m.role, content:m.content}));
    const reply = await callAI(history, `Bạn là AI Analyst MCN. ${ctx()}`);
    setMessages(prev => [...prev, { role:"assistant", content:reply }]);
    setLoading(false);
  };

  const runAnalysis = async () => {
    setALoading(true); setTab("analysis");
    const r = await callAI(
      [{ role:"user", content:`Phân tích MCN: ${ctx()}\n\nĐưa ra:\n1. **TỔNG QUAN** (3 điểm nổi bật)\n2. **TOP 3 CƠ HỘI** (chủ đề/kênh nào nên đẩy mạnh)\n3. **TOP 3 RỦI RO** (chú ý ngay)\n4. **HÀNH ĐỘNG ĐỀ XUẤT** (tuần này)\n5. **DỰ BÁO THÁNG TỚI**\n\nDùng tiếng Việt, có số liệu, không lý thuyết suông.` }],
      "",
      { cacheTopic: "agent-analysis", ttlMs: 12*3600*1000 }
    );
    setAnalysis(r); setALoading(false);
  };

  const runAlerts = async () => {
    setAlLoading(true); setTab("alerts");
    const critical = channels.filter(c=>c.health==="Critical");
    const r = await callAI(
      [{ role:"user", content:`Cảnh báo MCN: ${ctx()}\nKênh Critical: ${critical.slice(0,15).map(c=>`${c.name} (${c.cms})`).join(", ")}\n\nFormat:\n🔴 KHẨN CẤP: cần xử lý trong 24h\n🟡 QUAN TRỌNG: trong tuần\n🟢 LƯU Ý: theo dõi\n\nMỗi cảnh báo: [emoji] **Tên kênh/chủ đề**: Mô tả → Hành động cụ thể` }],
      "",
      { cacheTopic: "agent-alerts", ttlMs: 6*3600*1000 }
    );
    setAlerts(r); setAlLoading(false);
  };

  // ─── Auto-Mode: run scheduled analysis and save to insights ──────
  const runAutoTask = useCallback(async (taskType = "all") => {
    const ts = new Date().toISOString();
    const tasks = taskType === "all"
      ? ["overview", "compliance", "opportunity"]
      : [taskType];
    const results = [];
    for (const tk of tasks) {
      let prompt = "";
      if (tk === "overview") {
        prompt = `Báo cáo nhanh MCN — chỉ 3 đoạn ngắn:\n${ctx()}\n\n1. Tóm tắt 1 dòng\n2. Vấn đề lớn nhất hiện tại\n3. Hành động ưu tiên cho 24h tới`;
      } else if (tk === "compliance") {
        const recentVi = (state.violations || []).slice(0, 20);
        prompt = `Phân tích nhanh tuân thủ:\n- ${recentVi.length} vi phạm gần đây\n- ${channels.filter(c=>c.strikes>0).length} kênh có strikes\n\nĐưa 3 cảnh báo quan trọng (mỗi cảnh báo 1 dòng).`;
      } else if (tk === "opportunity") {
        const top5 = [...channels].sort((a,b)=>b.monthlyRevenue-a.monthlyRevenue).slice(0,5);
        prompt = `Phát hiện 3 cơ hội tăng doanh thu nhanh nhất từ:\n- Top 5 kênh: ${top5.map(c=>`${c.name} ($${c.monthlyRevenue})`).join(", ")}\n- Tổng kênh: ${channels.length}\n\nMỗi cơ hội: [emoji] hành động cụ thể trong 1 dòng.`;
      }
      try {
        const r = await callAI([{ role:"user", content: prompt }], "", { cacheTopic: `auto-${tk}`, ttlMs: 6*3600*1000, maxTokens: 800 });
        results.push({ type: tk, content: r, ts });
      } catch (e) {
        results.push({ type: tk, content: `❌ Lỗi: ${e.message}`, ts });
      }
    }
    setAutoInsights(prev => [{ ts, results }, ...prev].slice(0, 30)); // keep last 30
    setLastAutoRun(ts);
    return results;
  }, [channels, partners, state, callAI]);

  // Auto schedule: re-runs every N hours when autoMode is on
  useEffect(() => {
    if (autoTimerRef.current) { clearInterval(autoTimerRef.current); autoTimerRef.current = null; }
    if (!autoMode) return;
    const intervalMs = Math.max(1, Number(autoInterval) || 12) * 3600 * 1000;
    // Run once immediately if no recent run
    const lastTs = lastAutoRun ? new Date(lastAutoRun).getTime() : 0;
    if (Date.now() - lastTs > intervalMs) {
      runAutoTask("all").catch(() => {});
    }
    // Schedule recurring
    autoTimerRef.current = setInterval(() => {
      runAutoTask("all").catch(() => {});
    }, intervalMs);
    return () => {
      if (autoTimerRef.current) clearInterval(autoTimerRef.current);
    };
  }, [autoMode, autoInterval, runAutoTask, lastAutoRun]);

  const formatMsg = text => text.split("\n").map((line,i) => (
    <div key={i} style={{marginBottom:line===""?4:2}}>{line === "" ? <span>&nbsp;</span> : parseInline(line)}</div>
  ));

  const quickPrompts = [
    "Kênh nào kém nhất tháng này?",
    "CMS nào có doanh thu cao nhất?",
    "Chủ đề nào nên đẩy mạnh?",
    "Có vi phạm nào đáng lo không?",
  ];

  return (
    <div style={{display:"flex",flexDirection:"column",height:"100%"}}>
      <div style={{padding:"14px 28px",borderBottom:`1px solid ${C.border}`,background:C.bg,flexShrink:0}}>
        <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:10}}>
          <div style={{width:34,height:34,background:C.ai,borderRadius:7,display:"flex",alignItems:"center",justifyContent:"center"}}>
            <Sparkles size={16} style={{color:"#FFF"}}/>
          </div>
          <div style={{flex:1}}>
            <div style={{fontFamily:"'Fraunces',serif",fontWeight:500,fontSize:15,color:C.ink}}>Trợ lý AI Meridian v5.1</div>
            <div style={{fontSize:10,color:C.muted}}>Powered by Claude + Browser AI fallback · Phân tích · Cảnh báo · Auto Mode</div>
          </div>
          {/* Auto Mode toggle */}
          <div style={{display:"flex",alignItems:"center",gap:8,padding:"6px 10px",background:autoMode?`${C.green}15`:C.bgAlt,borderRadius:6,border:`1px solid ${autoMode?C.green:C.border}`}}>
            <Activity size={12} style={{color:autoMode?C.green:C.muted}}/>
            <span style={{fontSize:10,color:autoMode?C.green:C.muted,fontWeight:500}}>
              Auto Mode {autoMode ? "ON" : "OFF"}
            </span>
            <label style={{position:"relative",display:"inline-block",width:30,height:16}}>
              <input type="checkbox" checked={autoMode} onChange={e=>setAutoMode(e.target.checked)} style={{opacity:0,width:0,height:0}}/>
              <span style={{position:"absolute",cursor:"pointer",top:0,left:0,right:0,bottom:0,
                background:autoMode?C.green:C.muted,borderRadius:16,transition:"0.2s"}}>
                <span style={{position:"absolute",height:12,width:12,left:autoMode?16:2,top:2,background:"#FFF",borderRadius:"50%",transition:"0.2s"}}/>
              </span>
            </label>
            {autoMode && (
              <Select value={autoInterval} onChange={e=>setAutoInterval(Number(e.target.value))} style={{padding:"2px 4px",fontSize:10,width:60}}>
                <option value="6">6h</option><option value="12">12h</option><option value="24">24h</option>
              </Select>
            )}
          </div>
        </div>
        <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
          {[
            {id:"chat",label:"💬 Chat"},
            {id:"analysis",label:"📊 Phân tích",a:runAnalysis},
            {id:"alerts",label:"🚨 Cảnh báo",a:runAlerts},
            {id:"insights",label:`🤖 Auto Insights (${autoInsights.length})`}
          ].map(t=>(
            <button key={t.id} onClick={t.a||(()=>setTab(t.id))} style={{display:"flex",alignItems:"center",gap:5,fontSize:11,fontWeight:500,padding:"6px 12px",cursor:"pointer",borderRadius:4,
              background:tab===t.id?C.ai:"transparent",color:tab===t.id?"#FFF":C.muted,
              border:`1px solid ${tab===t.id?C.ai:C.border}`}}>
              {t.label}
              {((t.id==="analysis"&&aLoading)||(t.id==="alerts"&&alLoading)) && <span style={{display:"inline-block",width:9,height:9,border:"2px solid rgba(255,255,255,0.4)",borderTopColor:"#FFF",borderRadius:"50%",animation:"spin 0.8s linear infinite"}}/>}
            </button>
          ))}
          <button onClick={()=>{ setTab("insights"); runAutoTask("all"); }}
            style={{display:"flex",alignItems:"center",gap:5,fontSize:11,fontWeight:500,padding:"6px 12px",cursor:"pointer",borderRadius:4,marginLeft:"auto",
              background:"transparent",color:C.green,border:`1px solid ${C.green}`}}>
            <Zap size={11}/> Chạy Auto ngay
          </button>
        </div>
      </div>

      {tab==="chat" && (
        <div style={{display:"flex",flexDirection:"column",flex:1,overflow:"hidden"}}>
          <div style={{flex:1,overflowY:"auto",padding:"16px 28px"}}>
            {messages.map((m,i)=>(
              <div key={i} style={{display:"flex",gap:10,marginBottom:14,flexDirection:m.role==="user"?"row-reverse":"row"}}>
                <div style={{width:28,height:28,borderRadius:m.role==="user"?"50%":6,flexShrink:0,
                  background:m.role==="user"?C.ink:C.ai,display:"flex",alignItems:"center",justifyContent:"center"}}>
                  {m.role==="user"?<Users size={13} style={{color:"#FFF"}}/>:<Sparkles size={13} style={{color:"#FFF"}}/>}
                </div>
                <div style={{maxWidth:"76%",padding:"10px 14px",borderRadius:m.role==="user"?"12px 4px 12px 12px":"4px 12px 12px 12px",
                  background:m.role==="user"?C.ink:C.card,border:m.role==="user"?"none":`1px solid ${C.border}`,
                  fontSize:12,lineHeight:1.65,color:m.role==="user"?"#FFF":C.text}}>
                  {formatMsg(m.content)}
                </div>
              </div>
            ))}
            {loading && (
              <div style={{display:"flex",gap:10,marginBottom:14}}>
                <div style={{width:28,height:28,borderRadius:6,background:C.ai,display:"flex",alignItems:"center",justifyContent:"center"}}>
                  <Sparkles size={13} style={{color:"#FFF"}}/>
                </div>
                <div style={{padding:"10px 14px",borderRadius:"4px 12px 12px 12px",background:C.card,border:`1px solid ${C.border}`}}>
                  <div style={{display:"flex",gap:4}}>{[0,1,2].map(i=><span key={i} style={{width:6,height:6,borderRadius:"50%",background:C.ai,animation:`bounce 1s ease-in-out ${i*0.15}s infinite`}}/>)}</div>
                </div>
              </div>
            )}
            <div ref={chatRef}/>
          </div>
          <div style={{padding:"6px 28px",display:"flex",gap:6,flexWrap:"wrap"}}>
            {quickPrompts.map(q=>(
              <button key={q} onClick={()=>setInput(q)} style={{fontSize:10,padding:"4px 10px",background:C.aiSoft,color:C.ai,border:`1px solid ${C.ai}22`,borderRadius:12,cursor:"pointer"}}>{q}</button>
            ))}
          </div>
          <div style={{padding:"10px 28px 14px",borderTop:`1px solid ${C.border}`,display:"flex",gap:8}}>
            <input value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>e.key==="Enter"&&send()}
              placeholder="Hỏi AI về dữ liệu MCN..." style={{flex:1,fontSize:12,padding:"9px 14px",outline:"none",border:`1px solid ${C.border}`,borderRadius:6,background:C.card}}/>
            <button onClick={send} disabled={loading||!input.trim()}
              style={{padding:"9px 16px",background:loading||!input.trim()?C.muted:C.ai,color:"#FFF",border:"none",borderRadius:6,cursor:loading||!input.trim()?"not-allowed":"pointer",display:"flex",alignItems:"center"}}>
              <Send size={13}/>
            </button>
          </div>
        </div>
      )}

      {tab==="analysis" && (
        <div style={{flex:1,overflowY:"auto",padding:"20px 28px"}}>
          {aLoading ? (
            <div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",height:300,gap:14}}>
              <div style={{width:42,height:42,border:`3px solid ${C.aiSoft}`,borderTopColor:C.ai,borderRadius:"50%",animation:"spin 0.8s linear infinite"}}/>
              <div style={{fontSize:12,color:C.muted}}>AI đang phân tích...</div>
            </div>
          ) : analysis ? (
            <Card style={{padding:22,borderLeft:`3px solid ${C.ai}`}}>
              <div style={{fontSize:12,lineHeight:1.7,color:C.text}}>{formatMsg(analysis)}</div>
            </Card>
          ) : (
            <div style={{textAlign:"center",padding:40,color:C.muted,fontSize:13}}>Bấm "📊 Phân tích" để bắt đầu</div>
          )}
        </div>
      )}

      {tab==="alerts" && (
        <div style={{flex:1,overflowY:"auto",padding:"20px 28px"}}>
          {alLoading ? (
            <div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",height:300,gap:14}}>
              <div style={{width:42,height:42,border:`3px solid ${C.redSoft}`,borderTopColor:C.red,borderRadius:"50%",animation:"spin 0.8s linear infinite"}}/>
              <div style={{fontSize:12,color:C.muted}}>AI đang quét bất thường...</div>
            </div>
          ) : alerts ? (
            <Card style={{padding:22,borderLeft:`3px solid ${C.red}`}}>
              <div style={{fontSize:12,lineHeight:1.7,color:C.text}}>{formatMsg(alerts)}</div>
            </Card>
          ) : (
            <div style={{textAlign:"center",padding:40,color:C.muted,fontSize:13}}>Bấm "🚨 Cảnh báo" để quét</div>
          )}
        </div>
      )}

      {tab==="insights" && (
        <div style={{flex:1,overflowY:"auto",padding:"20px 28px"}}>
          <Card style={{padding:14,marginBottom:14,background:autoMode?`${C.green}10`:C.bgAlt,borderLeft:`3px solid ${autoMode?C.green:C.muted}`}}>
            <div style={{display:"flex",alignItems:"center",gap:10}}>
              <Activity size={16} style={{color:autoMode?C.green:C.muted}}/>
              <div style={{flex:1}}>
                <div style={{fontSize:12,fontWeight:500,color:C.ink}}>
                  Auto Mode: {autoMode ? "ĐANG BẬT" : "ĐANG TẮT"} · chu kỳ {autoInterval}h
                </div>
                <div style={{fontSize:10,color:C.muted,marginTop:2}}>
                  {lastAutoRun ? `Lần chạy gần nhất: ${new Date(lastAutoRun).toLocaleString("vi-VN")}` : "Chưa có lần chạy nào"}
                  {autoMode && lastAutoRun && ` · Chạy tiếp theo: ~${new Date(new Date(lastAutoRun).getTime() + autoInterval*3600000).toLocaleString("vi-VN")}`}
                </div>
              </div>
              <Btn ghost icon={Zap} onClick={()=>runAutoTask("all")}>Chạy ngay</Btn>
            </div>
          </Card>

          {autoInsights.length === 0 ? (
            <div style={{textAlign:"center",padding:50,color:C.muted}}>
              <Bot size={36} style={{opacity:0.3,marginBottom:10}}/>
              <div style={{fontSize:13,marginBottom:4}}>Chưa có Auto Insight nào</div>
              <div style={{fontSize:11}}>Bật Auto Mode hoặc bấm "Chạy ngay" để AI tự phân tích định kỳ</div>
            </div>
          ) : (
            autoInsights.map((insight, idx) => (
              <Card key={insight.ts} style={{padding:18,marginBottom:12,borderLeft:`3px solid ${C.ai}`}}>
                <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:12,paddingBottom:10,borderBottom:`1px solid ${C.borderSoft}`}}>
                  <Bot size={14} style={{color:C.ai}}/>
                  <div style={{fontSize:12,fontWeight:500,color:C.ink}}>Auto Insight #{autoInsights.length - idx}</div>
                  <span style={{marginLeft:"auto",fontSize:10,color:C.muted}}>{new Date(insight.ts).toLocaleString("vi-VN")}</span>
                  <button onClick={()=>setAutoInsights(prev => prev.filter(x => x.ts !== insight.ts))}
                    title="Xóa" style={{background:"none",border:"none",cursor:"pointer",padding:2}}>
                    <X size={12} style={{color:C.muted}}/>
                  </button>
                </div>
                {insight.results.map((r, i) => (
                  <div key={i} style={{marginBottom:i < insight.results.length-1 ? 14 : 0,paddingBottom:i < insight.results.length-1 ? 12 : 0,borderBottom:i < insight.results.length-1 ? `1px dashed ${C.borderSoft}` : "none"}}>
                    <div style={{fontSize:10,fontWeight:600,letterSpacing:"0.14em",textTransform:"uppercase",color:C.ai,marginBottom:6}}>
                      {r.type === "overview" && "📊 Tổng quan"}
                      {r.type === "compliance" && "⚠️ Compliance"}
                      {r.type === "opportunity" && "💡 Cơ hội"}
                    </div>
                    <div style={{fontSize:11,lineHeight:1.65,color:C.text}}>{formatMsg(r.content)}</div>
                  </div>
                ))}
              </Card>
            ))
          )}
        </div>
      )}
    </div>
  );
};

// ─── AI COMPLIANCE ────────────────────────────────────────────────
const ComplianceView = ({ state, setState, currentUser, callAI, toast, onNavigate }) => {
  const C = useC();
  const { channels, violations = [] } = state;
  const [tab, setTab] = useState("alerts");
  const [aiCheck, setAiCheck] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [policyTab, setPolicyTab] = useState(YT_POLICIES[0].title);
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({});

  const setViolations = (fn) => setState(s => ({ ...s, violations: typeof fn === "function" ? fn(s.violations || []) : fn }));

  // Compute risk score per channel
  const channelRisk = useMemo(() => {
    const m = {};
    violations.forEach(v => {
      const cid = v.channelId;
      if (!cid) return;
      if (!m[cid]) m[cid] = { count:0, types:{}, latest:null, channel:null };
      m[cid].count++;
      m[cid].types[v.type] = (m[cid].types[v.type]||0) + 1;
      if (!m[cid].latest || v.date > m[cid].latest) m[cid].latest = v.date;
    });
    Object.keys(m).forEach(cid => {
      const ch = channels.find(c=>c.id===cid);
      if (ch) m[cid].channel = ch;
      m[cid].riskScore = Math.min(100, m[cid].count * 15 + (m[cid].channel?.strikes||0) * 25);
    });
    return Object.values(m).filter(x=>x.channel).sort((a,b)=>b.riskScore-a.riskScore);
  }, [violations, channels]);

  const highRisk = channelRisk.filter(r => r.riskScore >= 50);

  const openAddViolation = () => {
    setForm({ channelId: channels[0]?.id, type:"COPYRIGHT_MUSIC", videoTitle:"", videoUrl:"",
      date:new Date().toISOString().slice(0,10), status:"Active", notes:"",
      outcome:"", actionsTaken:"", resolutionDate:"", impactRevenue:0, evidenceUrl:"" });
    setModal("add");
  };
  const openEditViolation = (v) => {
    setForm({ ...v });
    setModal("edit");
  };
  const saveViolation = () => {
    if (!form.channelId || !form.videoTitle) { toast("Nhập đủ kênh và tên video", "warning"); return; }
    const ch = channels.find(c=>c.id===form.channelId);
    const vt = VIOLATION_TYPES.find(v=>v.id===form.type);
    if (modal === "edit" && form.id) {
      setViolations(prev => prev.map(x => x.id === form.id ? {
        ...x, ...form,
        channelName: ch?.name || form.channelName || "",
        cms: ch?.cms || form.cms || "",
        typeLabel: vt?.label || form.typeLabel,
        severity: form.type?.includes?.("COPYRIGHT") || form.type?.includes?.("DEMONETIZED") || form.type?.includes?.("TERMINATED") ? "High" : "Medium",
      } : x));
      toast("Đã cập nhật vi phạm", "success");
    } else {
      setViolations(prev => [{
        id: form.id || `V${String(prev.length+1).padStart(5,"0")}`,
        channelId: form.channelId, channelName: ch?.name || "",
        cms: ch?.cms || "",
        type: form.type, typeLabel: vt?.label,
        videoTitle: form.videoTitle, videoUrl: form.videoUrl || "",
        date: form.date,
        status: form.status, notes: form.notes,
        outcome: form.outcome || "",
        actionsTaken: form.actionsTaken || "",
        resolutionDate: form.resolutionDate || "",
        impactRevenue: Number(form.impactRevenue) || 0,
        evidenceUrl: form.evidenceUrl || "",
        severity: form.type?.includes?.("COPYRIGHT") || form.type?.includes?.("DEMONETIZED") || form.type?.includes?.("TERMINATED") ? "High" : "Medium"
      }, ...prev]);
      toast("Đã ghi nhận vi phạm", "success");
    }
    setModal(null);
  };
  const delViolation = (v) => {
    if (!window.confirm(`Xóa vi phạm này?\n${v.typeLabel} - ${v.videoTitle}`)) return;
    setViolations(prev => prev.filter(x => x.id !== v.id));
    toast("Đã xóa vi phạm", "success");
  };

  // ─── Email parser: paste MCN/YouTube email → AI extract violations ──
  const [emailModal, setEmailModal] = useState(false);
  const [emailText, setEmailText] = useState("");
  const [emailParsing, setEmailParsing] = useState(false);
  const [emailResults, setEmailResults] = useState(null);

  const parseEmailAI = async () => {
    if (!emailText.trim()) { toast("Paste nội dung email vào ô bên dưới", "warning"); return; }
    setEmailParsing(true);
    setEmailResults(null);
    const channelHints = (state.channels || []).slice(0, 100).map(c => `- ${c.id}: ${c.name} (${c.ytId})`).join("\n");
    const prompt = `Đây là email từ YouTube/MCN có thể chứa thông tin vi phạm. Hãy trích xuất TẤT CẢ vi phạm thành JSON array.

EMAIL:
\`\`\`
${emailText.slice(0, 8000)}
\`\`\`

DANH SÁCH KÊNH HIỆN CÓ (để map):
${channelHints}

LOẠI VI PHẠM CHO PHÉP:
${VIOLATION_TYPES.map(v => `- ${v.id}: ${v.label}`).join("\n")}

Trả về CHÍNH XÁC JSON array (không markdown, không text khác):
[{"channelId":"hoặc null","channelName":"","videoTitle":"","videoUrl":"","type":"COPYRIGHT_MUSIC|...","date":"YYYY-MM-DD","status":"Active|Resolved","outcome":"","notes":"","actionsTaken":""}]

Nếu email không có vi phạm, trả về: []`;
    try {
      const apiKey = lsGet("meridian-api-key", "") || window.MERIDIAN_API_KEY;
      const r = await callClaude([{ role: "user", content: prompt }], "", apiKey, { skipCache: true, maxTokens: 2000 });
      // Extract JSON array
      const m = r.match(/\[[\s\S]*\]/);
      if (!m) {
        toast("AI không trích xuất được — kiểm tra email có nội dung vi phạm không", "warning");
        setEmailResults({ items: [], rawResponse: r });
        return;
      }
      const items = JSON.parse(m[0]);
      // Enrich with channel matches
      const enriched = items.map((it, i) => {
        let ch = null;
        if (it.channelId) ch = channels.find(c => c.id === it.channelId);
        if (!ch && it.channelName) ch = channels.find(c => c.name?.toLowerCase() === String(it.channelName).toLowerCase());
        return { ...it, _matchedChannel: ch, _index: i };
      });
      setEmailResults({ items: enriched });
      toast(`🤖 AI tìm được ${enriched.length} vi phạm trong email`, "success");
    } catch (e) {
      toast(`Lỗi parse AI: ${e.message}`, "error");
    } finally {
      setEmailParsing(false);
    }
  };

  const importEmailViolations = (selectedIndexes) => {
    if (!emailResults) return;
    const ts = Date.now();
    const newViolations = emailResults.items
      .filter((_, i) => selectedIndexes.has(i))
      .map((it, i) => {
        const ch = it._matchedChannel;
        const vt = VIOLATION_TYPES.find(v => v.id === it.type);
        return {
          id: `V${ts}_${i}`,
          channelId: ch?.id || it.channelId || "",
          channelName: ch?.name || it.channelName || "",
          cms: ch?.cms || "",
          type: it.type || "COMMUNITY_GUIDELINES",
          typeLabel: vt?.label || it.type,
          videoTitle: it.videoTitle || "(Email parse)",
          videoUrl: it.videoUrl || "",
          date: it.date || new Date().toISOString().slice(0,10),
          status: it.status || "Active",
          notes: it.notes || "",
          outcome: it.outcome || "",
          actionsTaken: it.actionsTaken || "",
          severity: (it.type || "").includes("COPYRIGHT") || (it.type || "").includes("DEMONETIZED") ? "High" : "Medium",
          source: "email",
        };
      });
    setViolations(prev => [...newViolations, ...prev]);
    toast(`✅ Đã import ${newViolations.length} vi phạm từ email`, "success");
    setEmailModal(false); setEmailText(""); setEmailResults(null);
  };

  // Bulk import from CSV/Excel — column auto-detection
  const fileInputRef = useRef(null);
  const handleBulkImport = async (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    e.target.value = ""; // reset input
    try {
      const wb = await readFileAsWorkbook(f);
      const sheet = wb.sheets?.[0];
      if (!sheet || !sheet.rows?.length) { toast("File rỗng hoặc không đọc được", "error"); return; }
      // Convert array-of-arrays to array-of-objects using header row
      const headers = (sheet.rows[0] || []).map(h => String(h).toLowerCase().trim());
      const rows = sheet.rows.slice(1).filter(r => r.some(c => c !== "" && c != null)).map(r => {
        const obj = {};
        headers.forEach((h, i) => { obj[h] = r[i]; });
        return obj;
      });
      if (!rows.length) { toast("Không có dòng dữ liệu (cần ≥ 1 dòng sau header)", "error"); return; }
      const findCol = (row, ...keys) => {
        for (const k of keys) {
          const v = row[k.toLowerCase()];
          if (v !== undefined && v !== "" && v != null) return v;
        }
        return "";
      };
      let added = 0, skipped = 0;
      const newViolations = [];
      const baseId = Date.now();
      rows.forEach((row, idx) => {
        const channelName = String(findCol(row, "channel","channel name","kênh","ten kenh","tên kênh")).trim();
        const videoTitle = String(findCol(row, "video","video title","title","video name","tên video")).trim();
        if (!channelName && !videoTitle) { skipped++; return; }
        const ch = channels.find(c => c.name?.toLowerCase() === channelName.toLowerCase()) || channels.find(c => c.ytId === findCol(row, "ytid","yt id","channel id","youtube id"));
        const typeStr = String(findCol(row, "type","violation","loại","loai","vi phạm","vi pham")).toUpperCase();
        const typeMap = {
          "COPYRIGHT": "COPYRIGHT_MUSIC", "MUSIC": "COPYRIGHT_MUSIC",
          "VIDEO": "COPYRIGHT_VIDEO", "COMMUNITY": "COMMUNITY_GUIDELINES",
          "MISLEAD": "MISLEADING_CONTENT", "SPAM": "SPAM_DECEPTIVE",
          "DEMONETIZ": "DEMONETIZED", "REJECT": "MONETIZATION_REJECTED",
          "SUSPEND": "SUSPENDED", "TERMINAT": "TERMINATED",
        };
        let type = "COMMUNITY_GUIDELINES";
        for (const key of Object.keys(typeMap)) {
          if (typeStr.includes(key)) { type = typeMap[key]; break; }
        }
        const vt = VIOLATION_TYPES.find(v => v.id === type);
        const dateStr = String(findCol(row, "date","ngày","ngay","time")).slice(0,10) || new Date().toISOString().slice(0,10);
        newViolations.push({
          id: `V${baseId}_${idx}`,
          channelId: ch?.id || "",
          channelName: ch?.name || channelName,
          cms: ch?.cms || String(findCol(row, "cms")),
          type, typeLabel: vt?.label || type,
          videoTitle: videoTitle || "(Không có tên)",
          videoUrl: String(findCol(row, "url","video url","link")),
          date: dateStr,
          status: String(findCol(row, "status","trạng thái","trang thai")) || "Resolved",
          notes: String(findCol(row, "notes","note","ghi chú","ghi chu","description")),
          outcome: String(findCol(row, "outcome","kết quả","ket qua")),
          actionsTaken: String(findCol(row, "action","actions taken","hành động","hanh dong")),
          resolutionDate: String(findCol(row, "resolution","resolved","ngày giải quyết")).slice(0,10),
          impactRevenue: Number(findCol(row, "impact","revenue lost","doanh thu mất")) || 0,
          evidenceUrl: String(findCol(row, "evidence","bằng chứng","bang chung")),
          severity: type.includes("COPYRIGHT") || type.includes("DEMONETIZED") || type.includes("TERMINATED") ? "High" : "Medium",
        });
        added++;
      });
      if (added > 0) {
        setViolations(prev => [...newViolations, ...prev]);
        toast(`✅ Đã import ${added} vi phạm${skipped ? ` (bỏ qua ${skipped} dòng trống)` : ""}`, "success");
      } else {
        toast("Không import được dòng nào — kiểm tra cột Channel/Video trong file", "error");
      }
    } catch (err) {
      toast(`Lỗi import: ${err.message}`, "error");
    }
  };

  const runAiComplianceCheck = async () => {
    setAiLoading(true);
    const recentVi = violations.slice(0, 30);
    const summary = recentVi.length === 0 ? "Chưa có lịch sử vi phạm trong hệ thống" :
      recentVi.map(v => `- ${v.channelName} (${v.date}): ${v.typeLabel} [${v.status}]`).join("\n");
    
    const prompt = `Phân tích lịch sử vi phạm chính sách YouTube cho MCN:

LỊCH SỬ VI PHẠM (${recentVi.length} cases gần đây):
${summary}

CHÍNH SÁCH YOUTUBE QUAN TRỌNG:
${YT_POLICIES.map(p => `${p.title} (${p.category}): ${p.rules.slice(0,2).join("; ")}. Phạt: ${p.penalty}`).join("\n")}

Hãy đưa ra:

1. **PATTERN PHÁT HIỆN ĐƯỢC** (lỗi nào lặp lại, kênh nào liên tục vi phạm)
2. **TOP 3 KÊNH RỦI RO CAO** (cụ thể tên + lý do)
3. **CẢNH BÁO PHÒNG NGỪA** (lỗi cũ có thể tái phạm)
4. **HÀNH ĐỘNG NGAY** (cụ thể, có deadline)
5. **TRAINING CẦN THIẾT** (đào tạo nội dung gì cho team)

Format có cấu trúc, dùng emoji, ngắn gọn, có số liệu cụ thể.`;

    const r = await callAI([{ role:"user", content:prompt }], "", { cacheTopic: "compliance-check", ttlMs: 6*3600*1000 });
    setAiCheck(r);
    setAiLoading(false);
  };

  const formatText = text => text.split("\n").map((line,i) => (
    <div key={i} style={{marginBottom:line===""?6:2}}>{line === "" ? <span>&nbsp;</span> : parseInline(line)}</div>
  ));

  return (
    <div style={{display:"flex",flexDirection:"column",height:"100%"}}>
      <div style={{padding:"14px 28px",borderBottom:`1px solid ${C.border}`,background:C.bg,flexShrink:0}}>
        <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:10}}>
          <div style={{width:34,height:34,background:C.red,borderRadius:7,display:"flex",alignItems:"center",justifyContent:"center"}}>
            <ShieldAlert size={16} style={{color:"#FFF"}}/>
          </div>
          <div style={{flex:1}}>
            <div style={{fontFamily:"'Fraunces',serif",fontWeight:500,fontSize:15,color:C.ink}}>AI Compliance Center</div>
            <div style={{fontSize:10,color:C.muted}}>Knowledge base · Strike history · AI cảnh báo tái phạm</div>
          </div>
          <button onClick={runAiComplianceCheck} disabled={aiLoading}
            style={{display:"flex",alignItems:"center",gap:6,fontSize:11,fontWeight:500,padding:"7px 14px",
              background:aiLoading?C.muted:C.red,color:"#FFF",border:"none",borderRadius:4,cursor:aiLoading?"wait":"pointer"}}>
            {aiLoading ? <span style={{display:"inline-block",width:11,height:11,border:"2px solid rgba(255,255,255,0.4)",borderTopColor:"#FFF",borderRadius:"50%",animation:"spin 0.8s linear infinite"}}/> : <Zap size={11}/>}
            AI Quét Compliance
          </button>
        </div>
        <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
          {[
            {id:"alerts", label:"🚨 Risk + Cảnh báo", count:highRisk.length},
            {id:"channel-alerts", label:"📡 Channel Alerts"},
            {id:"history", label:"📋 Lịch sử vi phạm", count:violations.length},
            {id:"policies", label:"📚 Chính sách YT"},
            {id:"ai", label:"🧠 AI Analysis", hot:!!aiCheck},
          ].map(t => (
            <button key={t.id} onClick={()=>setTab(t.id)} style={{display:"flex",alignItems:"center",gap:5,fontSize:11,fontWeight:500,padding:"6px 12px",cursor:"pointer",borderRadius:4,
              background:tab===t.id?C.red:"transparent",color:tab===t.id?"#FFF":C.muted,
              border:`1px solid ${tab===t.id?C.red:C.border}`}}>
              {t.label}
              {t.count !== undefined && <span style={{fontSize:9,padding:"1px 5px",background:tab===t.id?"rgba(255,255,255,0.2)":C.bgAlt,borderRadius:8}}>{t.count}</span>}
              {t.hot && <span style={{width:6,height:6,background:C.green,borderRadius:"50%"}}/>}
            </button>
          ))}
        </div>
      </div>

      <div style={{flex:1,overflowY:"auto",padding:"20px 28px"}}>
        {tab === "alerts" && (
          <>
            <div style={{padding:14,background:C.redSoft,borderRadius:6,marginBottom:14,
              display:"flex",alignItems:"center",gap:10,borderLeft:`3px solid ${C.red}`}}>
              <ShieldAlert size={18} style={{color:C.red}}/>
              <div>
                <div style={{fontSize:12,fontWeight:500,color:C.red,marginBottom:2}}>{highRisk.length} kênh rủi ro cao cần theo dõi</div>
                <div style={{fontSize:11,color:C.text}}>Dựa trên lịch sử vi phạm + active strikes. Cần xử lý trong 7 ngày.</div>
              </div>
            </div>

            <Card style={{overflow:"hidden"}}>
              {highRisk.length === 0 ? (
                <div style={{padding:40,textAlign:"center",color:C.muted,fontSize:12}}>
                  Chưa có kênh rủi ro cao. Hãy import file vi phạm hoặc ghi nhận thủ công.
                </div>
              ) : (
                <table style={{width:"100%",borderCollapse:"collapse"}}>
                  <thead style={{background:C.bgAlt}}><tr>
                    {["Kênh","CMS","Risk","Vi phạm","Lỗi gần nhất","Hành động"].map(h=>(
                      <th key={h} style={{textAlign:"left",fontSize:9,fontWeight:600,letterSpacing:"0.14em",textTransform:"uppercase",color:C.muted,padding:"10px 12px"}}>{h}</th>
                    ))}
                  </tr></thead>
                  <tbody>{highRisk.slice(0,15).map(r=>(
                    <tr key={r.channel.id} style={{borderTop:`1px solid ${C.borderSoft}`}}>
                      <td style={{padding:"10px 12px"}}>
                        <div style={{fontSize:12,fontWeight:500,color:C.ink}}>{r.channel.name}</div>
                        <div style={{fontSize:10,color:C.muted}}>{r.channel.id} · {r.channel.strikes||0} strikes</div>
                      </td>
                      <td style={{padding:"10px 12px",fontSize:11,color:C.text}}>{r.channel.cms}</td>
                      <td style={{padding:"10px 12px"}}>
                        <div style={{display:"flex",alignItems:"center",gap:6}}>
                          <div style={{width:60,height:5,background:C.borderSoft,borderRadius:2,overflow:"hidden"}}>
                            <div style={{width:`${r.riskScore}%`,height:"100%",background:r.riskScore>=70?C.red:r.riskScore>=40?C.amber:C.green}}/>
                          </div>
                          <span style={{fontSize:10,fontFamily:"'JetBrains Mono',monospace",fontWeight:500,color:r.riskScore>=70?C.red:C.amber}}>{r.riskScore}</span>
                        </div>
                      </td>
                      <td style={{padding:"10px 12px",fontSize:11,fontFamily:"'JetBrains Mono',monospace"}}>{r.count}</td>
                      <td style={{padding:"10px 12px",fontSize:10,color:C.muted}}>{r.latest}</td>
                      <td style={{padding:"10px 12px"}}>
                        <Btn ghost onClick={()=>toast(`Đã gửi cảnh báo cho ${r.channel.partner||"đối tác"}`, "success")} style={{padding:"4px 8px",fontSize:10}}>Gửi cảnh báo</Btn>
                      </td>
                    </tr>
                  ))}</tbody>
                </table>
              )}
            </Card>
          </>
        )}

        {tab === "history" && (
          <>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14,flexWrap:"wrap",gap:8}}>
              <div style={{fontSize:11,color:C.muted}}>{violations.length} vi phạm trong lịch sử</div>
              <div style={{display:"flex",gap:6}}>
                <input ref={fileInputRef} type="file" accept=".csv,.xlsx,.xls,.tsv" onChange={handleBulkImport} style={{display:"none"}}/>
                <Btn ghost icon={Mail} onClick={()=>setEmailModal(true)}>Parse email AI</Btn>
                <Btn ghost icon={Upload} onClick={()=>fileInputRef.current?.click()}>Import CSV/Excel</Btn>
                <Btn primary onClick={openAddViolation} icon={Plus}>Ghi nhận vi phạm</Btn>
              </div>
            </div>
            <div style={{padding:10,background:C.bgAlt,borderRadius:5,marginBottom:12,fontSize:10,color:C.muted}}>
              💡 <strong>Import nhanh lịch sử vi phạm cũ:</strong> CSV/Excel với cột <code>Channel</code>, <code>Video</code>, <code>Type</code>, <code>Date</code>, <code>Status</code>, <code>Notes</code>, <code>Outcome</code>, <code>Actions Taken</code>. Type tự nhận diện: COPYRIGHT/COMMUNITY/SPAM/DEMONETIZE/SUSPEND/TERMINATE.
            </div>

            <Card style={{overflow:"hidden"}}>
              {violations.length === 0 ? (
                <div style={{padding:40,textAlign:"center",color:C.muted,fontSize:12}}>
                  Chưa có vi phạm nào. Hãy <strong>Import CSV/Excel</strong> hoặc <strong>Ghi nhận vi phạm</strong> thủ công.
                </div>
              ) : (
                <table style={{width:"100%",borderCollapse:"collapse"}}>
                  <thead style={{background:C.bgAlt}}><tr>
                    {["Date","Channel","Loại","Video","Severity","Status","Outcome",""].map(h=>(
                      <th key={h} style={{textAlign:"left",fontSize:9,fontWeight:600,letterSpacing:"0.14em",textTransform:"uppercase",color:C.muted,padding:"10px 12px"}}>{h}</th>
                    ))}
                  </tr></thead>
                  <tbody>{violations.slice(0,50).map(v=>(
                    <tr key={v.id} style={{borderTop:`1px solid ${C.borderSoft}`}}>
                      <td style={{padding:"9px 12px",fontSize:10,fontFamily:"'JetBrains Mono',monospace",color:C.muted}}>{v.date}</td>
                      <td style={{padding:"9px 12px"}}>
                        <div style={{fontSize:12,fontWeight:500,color:C.ink}}>{v.channelName}</div>
                        <div style={{fontSize:10,color:C.muted}}>{v.cms}</div>
                      </td>
                      <td style={{padding:"9px 12px"}}><Pill color={v.type?.includes("COPYRIGHT")||v.type==="DEMONETIZED"||v.type==="TERMINATED"?"red":"amber"}>{v.typeLabel}</Pill></td>
                      <td style={{padding:"9px 12px",fontSize:11,color:C.text,maxWidth:180,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{v.videoTitle}</td>
                      <td style={{padding:"9px 12px"}}><Pill color={v.severity==="High"?"red":"amber"}>{v.severity}</Pill></td>
                      <td style={{padding:"9px 12px"}}><StatusDot status={v.status}/></td>
                      <td style={{padding:"9px 12px",fontSize:10,color:C.muted,maxWidth:140,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{v.outcome||"—"}</td>
                      <td style={{padding:"9px 12px"}}>
                        <div style={{display:"flex",gap:4}}>
                          <button onClick={()=>openEditViolation(v)} title="Sửa"
                            style={{background:"none",border:`1px solid ${C.border}`,padding:4,borderRadius:3,cursor:"pointer"}}>
                            <Edit3 size={11} style={{color:C.muted}}/>
                          </button>
                          <button onClick={()=>delViolation(v)} title="Xóa"
                            style={{background:"none",border:`1px solid ${C.border}`,padding:4,borderRadius:3,cursor:"pointer"}}>
                            <Trash2 size={11} style={{color:C.red}}/>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}</tbody>
                </table>
              )}
            </Card>
          </>
        )}

        {tab === "channel-alerts" && (
          <AlertsView state={state} callAI={callAI} toast={toast} onNavigate={onNavigate}/>
        )}

        {tab === "policies" && (
          <div style={{display:"grid",gridTemplateColumns:"220px 1fr",gap:16}}>
            <div>
              {YT_POLICIES.map(p => (
                <button key={p.title} onClick={()=>setPolicyTab(p.title)}
                  style={{display:"block",width:"100%",textAlign:"left",padding:"10px 12px",
                    background:policyTab===p.title?C.aiSoft:"transparent",
                    border:"none",borderLeft:`3px solid ${policyTab===p.title?C.ai:"transparent"}`,
                    cursor:"pointer",marginBottom:1}}>
                  <div style={{fontSize:11,fontWeight:500,color:policyTab===p.title?C.ai:C.text}}>{p.title}</div>
                  <div style={{fontSize:9,color:C.muted,marginTop:2}}>{p.category}</div>
                </button>
              ))}
            </div>
            <Card style={{padding:22}}>
              {(() => {
                const p = YT_POLICIES.find(x=>x.title===policyTab);
                return (
                  <>
                    <Pill color="ai">{p.category}</Pill>
                    <div style={{fontFamily:"'Fraunces',serif",fontWeight:500,fontSize:18,color:C.ink,marginTop:8,marginBottom:14}}>{p.title}</div>
                    
                    <div style={{fontSize:11,fontWeight:600,letterSpacing:"0.14em",textTransform:"uppercase",color:C.muted,marginBottom:8}}>Quy tắc tuân thủ</div>
                    {p.rules.map((r,i)=>(
                      <div key={i} style={{display:"flex",gap:10,padding:"8px 0",borderBottom:i<p.rules.length-1?`1px solid ${C.borderSoft}`:"none"}}>
                        <Check size={14} style={{color:C.green,flexShrink:0,marginTop:2}}/>
                        <span style={{fontSize:12,color:C.text,lineHeight:1.5}}>{r}</span>
                      </div>
                    ))}

                    <div style={{marginTop:18,padding:14,background:C.redSoft,borderRadius:6,borderLeft:`3px solid ${C.red}`}}>
                      <div style={{fontSize:10,fontWeight:600,letterSpacing:"0.14em",textTransform:"uppercase",color:C.red,marginBottom:4}}>Hậu quả khi vi phạm</div>
                      <div style={{fontSize:12,color:C.text}}>{p.penalty}</div>
                    </div>
                  </>
                );
              })()}
            </Card>
          </div>
        )}

        {tab === "ai" && (
          <>
            {aiLoading ? (
              <div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",height:300,gap:14}}>
                <div style={{width:42,height:42,border:`3px solid ${C.redSoft}`,borderTopColor:C.red,borderRadius:"50%",animation:"spin 0.8s linear infinite"}}/>
                <div style={{fontSize:12,color:C.muted}}>AI đang phân tích lịch sử vi phạm và chính sách YouTube...</div>
              </div>
            ) : aiCheck ? (
              <Card style={{padding:24,borderLeft:`3px solid ${C.red}`}}>
                <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:14,paddingBottom:12,borderBottom:`1px solid ${C.borderSoft}`}}>
                  <Sparkles size={16} style={{color:C.red}}/>
                  <div style={{fontFamily:"'Fraunces',serif",fontWeight:500,fontSize:14,color:C.ink}}>AI Compliance Analysis</div>
                  <div style={{marginLeft:"auto",fontSize:10,color:C.muted}}>{new Date().toLocaleString("vi-VN")}</div>
                </div>
                <div style={{fontSize:12,lineHeight:1.7,color:C.text}}>{formatText(aiCheck)}</div>
              </Card>
            ) : (
              <div style={{textAlign:"center",padding:60,color:C.muted}}>
                <Sparkles size={36} style={{color:C.borderSoft,marginBottom:14}}/>
                <div style={{fontSize:13,marginBottom:6}}>Chưa có phân tích nào</div>
                <div style={{fontSize:11}}>Bấm "AI Quét Compliance" ở trên để bắt đầu</div>
              </div>
            )}
          </>
        )}
      </div>

      {modal !== null && (
        <Modal title={modal === "edit" ? `Cập nhật vi phạm: ${form.videoTitle || ""}` : "Ghi nhận vi phạm mới"} onClose={()=>setModal(null)} width={680}>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0 16px"}}>
            <Field label="Channel *">
              <Select value={form.channelId||""} onChange={e=>setForm(f=>({...f,channelId:e.target.value}))}>
                <option value="">— Chọn kênh —</option>
                {channels.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
              </Select>
            </Field>
            <Field label="Loại vi phạm *">
              <Select value={form.type||"COPYRIGHT_MUSIC"} onChange={e=>setForm(f=>({...f,type:e.target.value}))}>
                {VIOLATION_TYPES.map(v=><option key={v.id} value={v.id}>{v.label}</option>)}
              </Select>
            </Field>
            <Field label="Tên video *"><Input value={form.videoTitle||""} onChange={e=>setForm(f=>({...f,videoTitle:e.target.value}))}/></Field>
            <Field label="URL video">
              <Input value={form.videoUrl||""} onChange={e=>setForm(f=>({...f,videoUrl:e.target.value}))} placeholder="https://youtube.com/watch?v=..."/>
            </Field>
            <Field label="Ngày vi phạm"><Input type="date" value={form.date||""} onChange={e=>setForm(f=>({...f,date:e.target.value}))}/></Field>
            <Field label="Status">
              <Select value={form.status||"Active"} onChange={e=>setForm(f=>({...f,status:e.target.value}))}>
                <option>Active</option><option>Resolved</option><option>Appealed</option><option>Dismissed</option><option>Escalated</option>
              </Select>
            </Field>
            <Field label="Ngày giải quyết">
              <Input type="date" value={form.resolutionDate||""} onChange={e=>setForm(f=>({...f,resolutionDate:e.target.value}))}/>
            </Field>
            <Field label="Doanh thu mất ($)">
              <Input type="number" value={form.impactRevenue||0} onChange={e=>setForm(f=>({...f,impactRevenue:e.target.value}))}/>
            </Field>
            <Field label="Kết quả (Outcome)">
              <Input value={form.outcome||""} onChange={e=>setForm(f=>({...f,outcome:e.target.value}))} placeholder="VD: Strike đã gỡ, Appeal thành công..."/>
            </Field>
            <Field label="URL bằng chứng">
              <Input value={form.evidenceUrl||""} onChange={e=>setForm(f=>({...f,evidenceUrl:e.target.value}))} placeholder="https://..."/>
            </Field>
            <Field label="Ghi chú">
              <Input value={form.notes||""} onChange={e=>setForm(f=>({...f,notes:e.target.value}))} placeholder="Mô tả thêm..."/>
            </Field>
            <Field label="Hành động đã làm">
              <Input value={form.actionsTaken||""} onChange={e=>setForm(f=>({...f,actionsTaken:e.target.value}))} placeholder="VD: Đã xóa video, gửi appeal..."/>
            </Field>
          </div>

          {/* 💬 Comments thread cho violation (chỉ hiện khi edit existing violation) */}
          {modal === "edit" && form.id && (
            <CommentsThread
              state={state} setState={setState} currentUser={currentUser || { id: "system", email: "system", role: "ADMIN" }}
              entityType="violation" entityId={form.id}
              label="💬 Thảo luận xử lý vi phạm"/>
          )}

          <div style={{display:"flex",justifyContent:"flex-end",gap:8,marginTop:16,paddingTop:14,borderTop:`1px solid ${C.borderSoft}`}}>
            <Btn ghost onClick={()=>setModal(null)}>Hủy</Btn>
            <Btn danger onClick={saveViolation}>{modal === "edit" ? "Cập nhật" : "Ghi nhận"}</Btn>
          </div>
        </Modal>
      )}

      {/* Email Parser Modal */}
      {emailModal && (
        <EmailParserModal
          C={C}
          emailText={emailText}
          setEmailText={setEmailText}
          emailParsing={emailParsing}
          emailResults={emailResults}
          setEmailResults={setEmailResults}
          parseEmailAI={parseEmailAI}
          importEmailViolations={importEmailViolations}
          onClose={()=>{ setEmailModal(false); setEmailText(""); setEmailResults(null); }}
        />
      )}
    </div>
  );
};

// ─── EmailParserModal — extracted to keep ComplianceView readable ──
const EmailParserModal = ({ C, emailText, setEmailText, emailParsing, emailResults, setEmailResults, parseEmailAI, importEmailViolations, onClose }) => {
  const [selected, setSelected] = useState(new Set());
  useEffect(() => {
    if (emailResults?.items?.length) {
      // Auto-select all by default
      setSelected(new Set(emailResults.items.map((_,i) => i)));
    } else {
      setSelected(new Set());
    }
  }, [emailResults]);
  return (
    <Modal title="🤖 Parse Email từ MCN/YouTube → Vi phạm" onClose={onClose} width={780}>
      <div style={{padding:10,background:C.aiSoft,borderLeft:`3px solid ${C.ai}`,borderRadius:4,marginBottom:14,fontSize:11,color:C.text}}>
        💡 Dán nội dung email từ YouTube hoặc MCN partner vào ô bên dưới. AI sẽ tự động trích xuất vi phạm và đề xuất import.
      </div>
      <textarea value={emailText} onChange={e=>setEmailText(e.target.value)}
        placeholder="Dán nội dung email vào đây..."
        style={{width:"100%",minHeight:160,padding:"10px 12px",fontSize:11,fontFamily:"inherit",border:`1px solid ${C.border}`,borderRadius:4,resize:"vertical",marginBottom:12}}/>
      <div style={{display:"flex",gap:8,marginBottom:12}}>
        <Btn primary onClick={parseEmailAI} disabled={emailParsing || !emailText.trim()} icon={emailParsing?null:Sparkles}>
          {emailParsing ? "AI đang phân tích..." : "🤖 Phân tích bằng AI"}
        </Btn>
        {emailText && <Btn ghost onClick={()=>{ setEmailText(""); setEmailResults(null); }} icon={X}>Xóa</Btn>}
      </div>

      {emailResults && (
        emailResults.items.length === 0 ? (
          <div style={{padding:16,background:C.bgAlt,borderRadius:5,fontSize:11,color:C.muted,textAlign:"center"}}>
            AI không tìm thấy vi phạm trong email này.
            {emailResults.rawResponse && (
              <details style={{marginTop:8,textAlign:"left"}}>
                <summary style={{cursor:"pointer",fontSize:10}}>Xem AI response</summary>
                <pre style={{fontSize:9,padding:8,background:C.card,borderRadius:3,marginTop:4,whiteSpace:"pre-wrap",maxHeight:200,overflowY:"auto"}}>{emailResults.rawResponse}</pre>
              </details>
            )}
          </div>
        ) : (
          <div>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:8,fontSize:11}}>
              <span style={{color:C.muted}}>Tìm được <strong style={{color:C.ink}}>{emailResults.items.length}</strong> vi phạm — chọn để import:</span>
              <div style={{display:"flex",gap:6}}>
                <button onClick={()=>setSelected(new Set(emailResults.items.map((_,i)=>i)))} style={{padding:"3px 8px",fontSize:10,background:"transparent",border:`1px solid ${C.border}`,borderRadius:3,cursor:"pointer"}}>Chọn tất cả</button>
                <button onClick={()=>setSelected(new Set())} style={{padding:"3px 8px",fontSize:10,background:"transparent",border:`1px solid ${C.border}`,borderRadius:3,cursor:"pointer"}}>Bỏ chọn</button>
              </div>
            </div>
            <div style={{maxHeight:280,overflowY:"auto",border:`1px solid ${C.borderSoft}`,borderRadius:4}}>
              {emailResults.items.map((it, i) => (
                <div key={i} style={{padding:"10px 12px",borderBottom:`1px solid ${C.borderSoft}`,background:selected.has(i)?C.aiSoft+"60":"transparent",cursor:"pointer"}}
                  onClick={()=>setSelected(prev => { const n = new Set(prev); if (n.has(i)) n.delete(i); else n.add(i); return n; })}>
                  <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:4}}>
                    <input type="checkbox" checked={selected.has(i)} readOnly/>
                    <Pill color={(it.type||"").includes("COPYRIGHT")||(it.type||"").includes("DEMONETIZED")?"red":"amber"}>{it.type||"UNKNOWN"}</Pill>
                    <span style={{fontSize:10,color:C.muted,fontFamily:"monospace"}}>{it.date}</span>
                    {it._matchedChannel ? (
                      <span style={{fontSize:10,color:C.green}}>✓ Khớp kênh: {it._matchedChannel.name}</span>
                    ) : (
                      <span style={{fontSize:10,color:C.amber}}>⚠️ Không khớp kênh</span>
                    )}
                  </div>
                  <div style={{fontSize:11,fontWeight:500,color:C.ink,marginBottom:2}}>{it.videoTitle || "(Không có tên video)"}</div>
                  {it.notes && <div style={{fontSize:10,color:C.muted}}>📝 {it.notes}</div>}
                  {it.outcome && <div style={{fontSize:10,color:C.muted}}>→ {it.outcome}</div>}
                </div>
              ))}
            </div>
          </div>
        )
      )}

      <div style={{display:"flex",justifyContent:"flex-end",gap:8,marginTop:14,paddingTop:14,borderTop:`1px solid ${C.borderSoft}`}}>
        <Btn ghost onClick={onClose}>Đóng</Btn>
        {emailResults?.items?.length > 0 && (
          <Btn primary onClick={()=>importEmailViolations(selected)} disabled={!selected.size} icon={Check}>
            Import {selected.size} vi phạm
          </Btn>
        )}
      </div>
    </Modal>
  );
};

// ─── INSPECTION VIEW v5 — Approval workflow + Channel assignment ──
// Workflow:
//  1. Sản phẩm import từ file (mặc định "Chờ duyệt")
//  2. Người có quyền PRODUCER thêm/edit
//  3. Người có quyền APPROVER (hoặc SUPER_ADMIN) duyệt → Approved/Rejected
//  4. Sau khi Approved + ĐẠT → Có thể "Cấp kênh" cho sản phẩm này
//  5. Audit log mọi action
const InspectionView = ({ state, setState, callAI, currentUser, toast, confirm }) => {
  const C = useC();
  const inspections = state.productInspections || [];
  const channels = state.channels || [];
  const [search, setSearch] = useState("");
  const [resultF, setResultF] = useState("All");
  const [statusF, setStatusF] = useState("All");
  const [tab, setTab] = useState("list"); // list | history | analytics
  const [aiInsight, setAiInsight] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [reviewModal, setReviewModal] = useState(null); // selected inspection
  const [assignModal, setAssignModal] = useState(null); // for channel assignment
  const [reviewNote, setReviewNote] = useState("");
  const [selectedChannel, setSelectedChannel] = useState("");

  // Permission check
  const canApprove = currentUser?.role === "SUPER_ADMIN" || 
                     currentUser?.role === "MANAGER" ||
                     currentUser?.role === "APPROVER";
  const canSubmit = canApprove || currentUser?.role === "ANALYST" || currentUser?.role === "PRODUCER";

  // Initialize approval status if not set
  const enrichedInspections = useMemo(() => {
    return inspections.map(i => ({
      ...i,
      approvalStatus: i.approvalStatus || "Chờ duyệt", // Chờ duyệt | Đã duyệt | Từ chối | Đã cấp kênh
      reviewHistory: i.reviewHistory || [],
      assignedChannelId: i.assignedChannelId || null,
      assignedAt: i.assignedAt || null,
      assignedBy: i.assignedBy || null,
    }));
  }, [inspections]);

  const filtered = enrichedInspections.filter(i => {
    if (search && !i.fileName?.toLowerCase().includes(search.toLowerCase())) return false;
    if (resultF !== "All" && i.result !== resultF) return false;
    if (statusF !== "All" && i.approvalStatus !== statusF) return false;
    return true;
  });

  const stats = useMemo(() => {
    const total = enrichedInspections.length;
    const pass = enrichedInspections.filter(i => i.result === "ĐẠT").length;
    const risk = enrichedInspections.filter(i => i.result === "RỦI RO").length;
    const passRate = total > 0 ? (pass / total * 100).toFixed(1) : 0;
    
    const pending = enrichedInspections.filter(i => i.approvalStatus === "Chờ duyệt").length;
    const approved = enrichedInspections.filter(i => i.approvalStatus === "Đã duyệt").length;
    const rejected = enrichedInspections.filter(i => i.approvalStatus === "Từ chối").length;
    const assigned = enrichedInspections.filter(i => i.approvalStatus === "Đã cấp kênh").length;
    
    const byType = {};
    enrichedInspections.forEach(i => {
      const t = i.contentType || "Khác";
      if (!byType[t]) byType[t] = { type:t, total:0, pass:0, risk:0 };
      byType[t].total++;
      if (i.result === "ĐẠT") byType[t].pass++;
      if (i.result === "RỦI RO") byType[t].risk++;
    });
    
    return { total, pass, risk, passRate, pending, approved, rejected, assigned, byType: Object.values(byType).sort((a,b)=>b.total-a.total) };
  }, [enrichedInspections]);

  // Save inspection list back to state
  const saveInspections = (updateFn) => {
    const updated = updateFn(enrichedInspections);
    setState(s => ({ ...s, productInspections: updated }));
  };

  // Approve a product
  const approveProduct = async (inspection) => {
    if (!canApprove) { toast("Bạn không có quyền duyệt sản phẩm", "error"); return; }
    const ok = await confirm({ 
      title: "Duyệt sản phẩm?", 
      message: `Sản phẩm "${inspection.fileName.slice(0,50)}..." sẽ được duyệt và có thể được cấp kênh.` 
    });
    if (!ok) return;
    
    const historyEntry = {
      id: `H${Date.now()}`,
      action: "APPROVED",
      userId: currentUser.id,
      userName: currentUser.fullName,
      timestamp: new Date().toISOString(),
      note: reviewNote || "(Không có ghi chú)",
      previousStatus: inspection.approvalStatus,
    };
    
    saveInspections(list => list.map(i =>
      (i.uid && i.uid === inspection.uid) || (!i.uid && i.fileName === inspection.fileName && i.sheet === inspection.sheet)
        ? { ...i, approvalStatus: "Đã duyệt", reviewHistory: [...(i.reviewHistory||[]), historyEntry] }
        : i
    ));
    logActivity("PRODUCT_APPROVED", currentUser.id, `Approved: ${inspection.fileName}`);
    toast(`Đã duyệt sản phẩm`, "success");
    setReviewModal(null);
    setReviewNote("");
  };

  const rejectProduct = async (inspection) => {
    if (!canApprove) { toast("Bạn không có quyền duyệt sản phẩm", "error"); return; }
    if (!reviewNote.trim()) { toast("Vui lòng nhập lý do từ chối", "warning"); return; }
    
    const historyEntry = {
      id: `H${Date.now()}`,
      action: "REJECTED",
      userId: currentUser.id,
      userName: currentUser.fullName,
      timestamp: new Date().toISOString(),
      note: reviewNote,
      previousStatus: inspection.approvalStatus,
    };
    
    saveInspections(list => list.map(i =>
      (i.uid && i.uid === inspection.uid) || (!i.uid && i.fileName === inspection.fileName && i.sheet === inspection.sheet)
        ? { ...i, approvalStatus: "Từ chối", reviewHistory: [...(i.reviewHistory||[]), historyEntry] }
        : i
    ));
    logActivity("PRODUCT_REJECTED", currentUser.id, `Rejected: ${inspection.fileName} — ${reviewNote}`);
    toast(`Đã từ chối sản phẩm`, "info");
    setReviewModal(null);
    setReviewNote("");
  };

  const assignChannel = async () => {
    if (!canApprove) { toast("Bạn không có quyền cấp kênh", "error"); return; }
    if (!selectedChannel) { toast("Chọn kênh để cấp", "warning"); return; }
    
    const channel = channels.find(c => c.id === selectedChannel);
    if (!channel) { toast("Kênh không tồn tại", "error"); return; }
    
    const inspection = assignModal;
    const historyEntry = {
      id: `H${Date.now()}`,
      action: "CHANNEL_ASSIGNED",
      userId: currentUser.id,
      userName: currentUser.fullName,
      timestamp: new Date().toISOString(),
      note: `Cấp kênh: ${channel.name} (${channel.ytId})`,
      channelId: channel.id,
      channelName: channel.name,
    };
    
    saveInspections(list => list.map(i =>
      (i.uid && i.uid === inspection.uid) || (!i.uid && i.fileName === inspection.fileName && i.sheet === inspection.sheet)
        ? { ...i, 
            approvalStatus: "Đã cấp kênh", 
            assignedChannelId: channel.id,
            assignedAt: new Date().toISOString(),
            assignedBy: currentUser.id,
            reviewHistory: [...(i.reviewHistory||[]), historyEntry] 
          }
        : i
    ));
    logActivity("CHANNEL_ASSIGNED", currentUser.id, `Assigned ${inspection.fileName} → ${channel.name}`);
    toast(`Đã cấp kênh "${channel.name}" cho sản phẩm`, "success");
    setAssignModal(null);
    setSelectedChannel("");
  };

  const runAi = async () => {
    setAiLoading(true);
    const summary = stats.byType.slice(0,8).map(t => 
      `${t.type}: ${t.total} sản phẩm, ${t.pass} ĐẠT (${(t.pass/t.total*100).toFixed(0)}%), ${t.risk} RỦI RO`
    ).join("\n");
    
    const riskExamples = enrichedInspections.filter(i => i.result === "RỦI RO").slice(0, 10)
      .map(i => `- ${i.fileName} (${i.contentType})`).join("\n");

    const prompt = `Phân tích kết quả kiểm định sản phẩm cho MCN:

TỔNG QUAN:
- ${stats.total} sản phẩm đã kiểm định
- ${stats.pass} ĐẠT (${stats.passRate}%) · ${stats.risk} RỦI RO
- Trạng thái duyệt: ${stats.pending} chờ, ${stats.approved} đã duyệt, ${stats.rejected} từ chối, ${stats.assigned} đã cấp kênh

PHÂN BỔ THEO LOẠI:
${summary}

VÍ DỤ SẢN PHẨM RỦI RO:
${riskExamples}

Hãy phân tích:
1. **TÌNH TRẠNG CHUNG** chất lượng sản xuất
2. **LOẠI NỘI DUNG RỦI RO CAO NHẤT** (top 3, % rủi ro)
3. **TỐC ĐỘ DUYỆT** (có ${stats.pending} sản phẩm chờ duyệt, ý kiến gì?)
4. **NGUYÊN NHÂN CÓ THỂ** (vì sao loại đó rủi ro)
5. **HÀNH ĐỘNG ĐỀ XUẤT** (cụ thể, ưu tiên)
6. **KPI CẦN ĐẶT** cho team production

Tiếng Việt, có số liệu, ngắn gọn.`;

    const r = await callAI([{ role:"user", content:prompt }], "", { cacheTopic: "inspection-analysis", ttlMs: 12*3600*1000 });
    setAiInsight(r);
    setAiLoading(false);
  };

  const formatText = text => text.split("\n").map((line,i) => (
    <div key={i} style={{marginBottom:line===""?6:2}}>{line === "" ? <span>&nbsp;</span> : parseInline(line)}</div>
  ));

  // Build full audit history (all review entries)
  const fullHistory = useMemo(() => {
    const all = [];
    enrichedInspections.forEach(i => {
      (i.reviewHistory || []).forEach(h => {
        all.push({ ...h, productName: i.fileName, productType: i.contentType });
      });
    });
    return all.sort((a,b) => new Date(b.timestamp) - new Date(a.timestamp));
  }, [enrichedInspections]);

  const getStatusColor = (status) => {
    if (status === "Đã duyệt") return "blue";
    if (status === "Đã cấp kênh") return "green";
    if (status === "Từ chối") return "red";
    return "amber"; // Chờ duyệt
  };

  return (
    <div style={{padding:"20px 28px",overflowY:"auto",height:"100%"}}>
      {/* Permission banner */}
      <div style={{padding:"10px 14px",background:canApprove?C.greenSoft:C.bgAlt,borderRadius:6,marginBottom:14,
        display:"flex",alignItems:"center",gap:10,
        borderLeft:`3px solid ${canApprove?C.green:C.muted}`}}>
        <Shield size={14} style={{color:canApprove?C.green:C.muted}}/>
        <div style={{fontSize:11,color:C.text,flex:1}}>
          <strong>{currentUser?.role}</strong> · 
          {canApprove ? " Bạn có quyền duyệt sản phẩm và cấp kênh" : 
           canSubmit ? " Bạn có thể xem và submit, không thể duyệt (cần Manager/Approver)" :
           " Quyền chỉ xem"}
        </div>
        <Pill color={canApprove?"green":"gray"}>{canApprove?"APPROVER":"VIEWER"}</Pill>
      </div>

      {enrichedInspections.length === 0 ? (
        <Card style={{padding:60,textAlign:"center"}}>
          <FileText size={40} style={{color:C.borderSoft,marginBottom:14}}/>
          <div style={{fontSize:14,fontWeight:500,color:C.ink,marginBottom:6}}>Chưa có dữ liệu kiểm định</div>
          <div style={{fontSize:11,color:C.muted}}>Hãy import file <code style={{fontFamily:"monospace",fontSize:10,background:C.bgAlt,padding:"1px 5px",borderRadius:3}}>5_1_QUẢN_LÝ_SẢN_PHẨM_KIỂM_ĐỊNH.xlsx</code> qua mục Nhập dữ liệu</div>
        </Card>
      ) : (
        <>
          {/* Tabs */}
          <div style={{display:"flex",gap:6,marginBottom:14,borderBottom:`1px solid ${C.border}`}}>
            {[
              { id:"list", label:"📋 Danh sách", count: stats.total },
              { id:"history", label:"📜 Lịch sử duyệt", count: fullHistory.length },
              { id:"analytics", label:"📊 Phân tích", count: stats.byType.length },
            ].map(t => (
              <button key={t.id} onClick={()=>setTab(t.id)} style={{display:"flex",alignItems:"center",gap:5,
                padding:"10px 16px",fontSize:12,fontWeight:500,cursor:"pointer",
                color:tab===t.id?C.ink:C.muted,background:"transparent",border:"none",
                borderBottom:`2px solid ${tab===t.id?C.accent:"transparent"}`,marginBottom:-1}}>
                {t.label}
                <span style={{fontSize:9,padding:"1px 5px",background:C.bgAlt,borderRadius:8}}>{t.count}</span>
              </button>
            ))}
          </div>

          {tab === "list" && (
            <>
              {/* Status overview */}
              <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:10,marginBottom:14}}>
                <Card style={{padding:12,borderLeft:`3px solid ${C.amber}`}}>
                  <div style={{fontSize:9,fontWeight:600,letterSpacing:"0.14em",textTransform:"uppercase",color:C.amber}}>Chờ duyệt</div>
                  <div style={{fontFamily:"'Fraunces',serif",fontWeight:500,fontSize:22,color:C.amber,marginTop:4}}>{stats.pending}</div>
                </Card>
                <Card style={{padding:12,borderLeft:`3px solid ${C.blue}`}}>
                  <div style={{fontSize:9,fontWeight:600,letterSpacing:"0.14em",textTransform:"uppercase",color:C.blue}}>Đã duyệt</div>
                  <div style={{fontFamily:"'Fraunces',serif",fontWeight:500,fontSize:22,color:C.blue,marginTop:4}}>{stats.approved}</div>
                </Card>
                <Card style={{padding:12,borderLeft:`3px solid ${C.green}`}}>
                  <div style={{fontSize:9,fontWeight:600,letterSpacing:"0.14em",textTransform:"uppercase",color:C.green}}>Đã cấp kênh</div>
                  <div style={{fontFamily:"'Fraunces',serif",fontWeight:500,fontSize:22,color:C.green,marginTop:4}}>{stats.assigned}</div>
                </Card>
                <Card style={{padding:12,borderLeft:`3px solid ${C.red}`}}>
                  <div style={{fontSize:9,fontWeight:600,letterSpacing:"0.14em",textTransform:"uppercase",color:C.red}}>Từ chối</div>
                  <div style={{fontFamily:"'Fraunces',serif",fontWeight:500,fontSize:22,color:C.red,marginTop:4}}>{stats.rejected}</div>
                </Card>
                <Card style={{padding:12,background:C.aiSoft,borderLeft:`3px solid ${C.ai}`}}>
                  <div style={{fontSize:9,fontWeight:600,letterSpacing:"0.14em",textTransform:"uppercase",color:C.ai}}>AI Phân tích</div>
                  <button onClick={runAi} disabled={aiLoading}
                    style={{marginTop:4,fontSize:10,fontWeight:500,padding:"4px 8px",background:C.ai,color:"#FFF",
                      border:"none",borderRadius:3,cursor:aiLoading?"wait":"pointer",display:"flex",alignItems:"center",gap:4}}>
                    {aiLoading ? <span style={{display:"inline-block",width:8,height:8,border:"2px solid rgba(255,255,255,0.4)",borderTopColor:"#FFF",borderRadius:"50%",animation:"spin 0.8s linear infinite"}}/> : <Sparkles size={10}/>}
                    {aiLoading ? "..." : "Quét"}
                  </button>
                </Card>
              </div>

              {/* AI Insight */}
              {aiInsight && (
                <Card style={{padding:22,marginBottom:14,borderLeft:`3px solid ${C.ai}`}}>
                  <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:12,paddingBottom:10,borderBottom:`1px solid ${C.borderSoft}`}}>
                    <Sparkles size={16} style={{color:C.ai}}/>
                    <div style={{fontFamily:"'Fraunces',serif",fontWeight:500,fontSize:14,color:C.ink}}>AI phân tích kiểm định</div>
                    <button onClick={()=>setAiInsight(null)} style={{marginLeft:"auto",background:"none",border:"none",cursor:"pointer"}}><X size={14} style={{color:C.muted}}/></button>
                  </div>
                  <div style={{fontSize:12,lineHeight:1.7,color:C.text}}>{formatText(aiInsight)}</div>
                </Card>
              )}

              {/* Filters */}
              <div style={{display:"flex",gap:8,marginBottom:14,flexWrap:"wrap"}}>
                <div style={{position:"relative"}}>
                  <Search size={12} style={{position:"absolute",left:9,top:9,color:C.muted}}/>
                  <Input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Tìm tên sản phẩm..." style={{paddingLeft:28,width:260}}/>
                </div>
                <Select value={resultF} onChange={e=>setResultF(e.target.value)} style={{width:120}}>
                  <option>All</option><option>ĐẠT</option><option>RỦI RO</option>
                </Select>
                <Select value={statusF} onChange={e=>setStatusF(e.target.value)} style={{width:160}}>
                  <option>All</option>
                  <option>Chờ duyệt</option>
                  <option>Đã duyệt</option>
                  <option>Đã cấp kênh</option>
                  <option>Từ chối</option>
                </Select>
                <span style={{fontSize:11,color:C.muted,padding:"8px 0"}}>{filtered.length} / {enrichedInspections.length}</span>
              </div>

              {/* Table */}
              <Card style={{overflow:"hidden"}}>
                <div style={{maxHeight:520,overflowY:"auto"}}>
                  <table style={{width:"100%",borderCollapse:"collapse"}}>
                    <thead style={{background:C.bgAlt,position:"sticky",top:0,zIndex:1}}>
                      <tr>{["Sản phẩm","Loại","KQKĐ","Trạng thái","Kênh được cấp","Hành động"].map(h=>(
                        <th key={h} style={{textAlign:"left",fontSize:9,fontWeight:600,letterSpacing:"0.14em",textTransform:"uppercase",color:C.muted,padding:"10px 12px"}}>{h}</th>
                      ))}</tr>
                    </thead>
                    <tbody>{filtered.slice(0, 200).map((i, idx) => {
                      const channel = i.assignedChannelId ? channels.find(c => c.id === i.assignedChannelId) : null;
                      return (
                        <tr key={idx} style={{borderTop:`1px solid ${C.borderSoft}`}}>
                          <td style={{padding:"9px 12px",fontSize:11,color:C.text,fontFamily:"'JetBrains Mono',monospace",maxWidth:300,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{i.fileName}</td>
                          <td style={{padding:"9px 12px"}}><Pill color="gray">{i.contentType}</Pill></td>
                          <td style={{padding:"9px 12px"}}><Pill color={i.result==="ĐẠT"?"green":"red"}>{i.result}</Pill></td>
                          <td style={{padding:"9px 12px"}}><Pill color={getStatusColor(i.approvalStatus)}>{i.approvalStatus}</Pill></td>
                          <td style={{padding:"9px 12px",fontSize:11}}>
                            {channel ? (
                              <span style={{color:C.accent,fontWeight:500}}>{channel.name}</span>
                            ) : <span style={{color:C.muted}}>—</span>}
                          </td>
                          <td style={{padding:"9px 12px"}}>
                            <div style={{display:"flex",gap:4,flexWrap:"wrap"}}>
                              <button onClick={()=>{setReviewModal(i); setReviewNote("");}} 
                                style={{fontSize:10,padding:"3px 8px",background:C.bgAlt,color:C.text,border:`1px solid ${C.border}`,borderRadius:3,cursor:"pointer",display:"inline-flex",alignItems:"center",gap:3}}>
                                <Eye size={9}/> Review
                              </button>
                              {i.approvalStatus === "Đã duyệt" && i.result === "ĐẠT" && canApprove && (
                                <button onClick={()=>{setAssignModal(i); setSelectedChannel("");}}
                                  style={{fontSize:10,padding:"3px 8px",background:C.green,color:"#FFF",border:"none",borderRadius:3,cursor:"pointer",display:"inline-flex",alignItems:"center",gap:3}}>
                                  <Tv size={9}/> Cấp kênh
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}</tbody>
                  </table>
                </div>
                {filtered.length > 200 && (
                  <div style={{padding:"9px 12px",fontSize:10,color:C.muted,background:C.bgAlt,borderTop:`1px solid ${C.borderSoft}`}}>Hiển thị 200/{filtered.length} kết quả đầu tiên</div>
                )}
              </Card>
            </>
          )}

          {tab === "history" && (
            <Card style={{overflow:"hidden"}}>
              <div style={{padding:"14px 18px",borderBottom:`1px solid ${C.border}`,background:C.bgAlt}}>
                <div style={{fontSize:13,fontWeight:500,color:C.ink}}>Lịch sử duyệt sản phẩm ({fullHistory.length} entries)</div>
                <div style={{fontSize:10,color:C.muted,marginTop:2}}>Mọi action duyệt/từ chối/cấp kênh đều được lưu lại đầy đủ</div>
              </div>
              <div style={{maxHeight:560,overflowY:"auto"}}>
                {fullHistory.length === 0 ? (
                  <div style={{padding:40,textAlign:"center",color:C.muted,fontSize:12}}>Chưa có lịch sử nào.</div>
                ) : fullHistory.slice(0, 200).map((h, i) => {
                  const isApproved = h.action === "APPROVED";
                  const isRejected = h.action === "REJECTED";
                  const isAssigned = h.action === "CHANNEL_ASSIGNED";
                  return (
                    <div key={h.id} style={{display:"flex",alignItems:"flex-start",gap:12,padding:"12px 18px",
                      borderBottom:i<fullHistory.length-1?`1px solid ${C.borderSoft}`:"none"}}>
                      <div style={{width:30,height:30,borderRadius:5,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,
                        background:isApproved?C.blueSoft:isRejected?C.redSoft:isAssigned?C.greenSoft:C.bgAlt}}>
                        {isApproved && <Check size={13} style={{color:C.blue}}/>}
                        {isRejected && <X size={13} style={{color:C.red}}/>}
                        {isAssigned && <Tv size={13} style={{color:C.green}}/>}
                      </div>
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:4,flexWrap:"wrap"}}>
                          <span style={{fontSize:12,fontWeight:500,color:C.ink}}>
                            {isApproved ? "✓ Duyệt" : isRejected ? "✗ Từ chối" : isAssigned ? "📺 Cấp kênh" : h.action}
                          </span>
                          <Pill color={isApproved?"blue":isRejected?"red":isAssigned?"green":"gray"}>{h.action}</Pill>
                          <span style={{fontSize:10,color:C.muted}}>bởi {h.userName}</span>
                          <span style={{fontSize:10,color:C.muted}}>· {new Date(h.timestamp).toLocaleString("vi-VN")}</span>
                        </div>
                        <div style={{fontSize:11,color:C.text,fontFamily:"'JetBrains Mono',monospace",marginBottom:3,wordBreak:"break-all"}}>📄 {h.productName}</div>
                        {h.note && <div style={{fontSize:11,color:C.muted,fontStyle:"italic"}}>"{h.note}"</div>}
                        {h.channelName && <div style={{fontSize:11,color:C.green,marginTop:3}}>→ Cấp kênh: <strong>{h.channelName}</strong></div>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          )}

          {tab === "analytics" && (
            <Card style={{padding:18}}>
              <div style={{fontFamily:"'Fraunces',serif",fontWeight:500,fontSize:15,color:C.ink,marginBottom:12}}>Phân bổ theo loại nội dung</div>
              <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill, minmax(220px, 1fr))",gap:8}}>
                {stats.byType.slice(0, 20).map(t => {
                  const pct = (t.pass / t.total * 100).toFixed(0);
                  return (
                    <div key={t.type} style={{padding:12,background:C.bgAlt,borderRadius:5}}>
                      <div style={{fontSize:11,fontWeight:500,color:C.ink,marginBottom:6}}>{t.type}</div>
                      <div style={{display:"flex",gap:8,fontSize:10,color:C.muted,marginBottom:8}}>
                        <span style={{color:C.green}}>✓ {t.pass}</span>
                        <span style={{color:C.red}}>⚠ {t.risk}</span>
                        <span>· tổng {t.total}</span>
                      </div>
                      <div style={{height:5,background:C.borderSoft,borderRadius:2,overflow:"hidden"}}>
                        <div style={{width:`${pct}%`,height:"100%",background:pct>=80?C.green:pct>=50?C.amber:C.red}}/>
                      </div>
                      <div style={{fontSize:10,color:C.muted,marginTop:4}}>{pct}% ĐẠT</div>
                    </div>
                  );
                })}
              </div>
            </Card>
          )}
        </>
      )}

      {/* REVIEW MODAL */}
      {reviewModal && (
        <Modal title={`Review sản phẩm`} onClose={()=>{setReviewModal(null); setReviewNote("");}} width={620}>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14,marginBottom:14}}>
            <div>
              <div style={{fontSize:9,fontWeight:600,letterSpacing:"0.14em",textTransform:"uppercase",color:C.muted}}>Tên file</div>
              <div style={{fontSize:11,color:C.text,fontFamily:"monospace",wordBreak:"break-all",marginTop:4}}>{reviewModal.fileName}</div>
            </div>
            <div>
              <div style={{fontSize:9,fontWeight:600,letterSpacing:"0.14em",textTransform:"uppercase",color:C.muted}}>Loại nội dung</div>
              <div style={{marginTop:4}}><Pill color="gray">{reviewModal.contentType}</Pill></div>
            </div>
            <div>
              <div style={{fontSize:9,fontWeight:600,letterSpacing:"0.14em",textTransform:"uppercase",color:C.muted}}>Kết quả kiểm định</div>
              <div style={{marginTop:4}}><Pill color={reviewModal.result==="ĐẠT"?"green":"red"}>{reviewModal.result}</Pill></div>
            </div>
            <div>
              <div style={{fontSize:9,fontWeight:600,letterSpacing:"0.14em",textTransform:"uppercase",color:C.muted}}>Trạng thái duyệt hiện tại</div>
              <div style={{marginTop:4}}><Pill color={getStatusColor(reviewModal.approvalStatus)}>{reviewModal.approvalStatus}</Pill></div>
            </div>
          </div>

          {(reviewModal.reviewHistory||[]).length > 0 && (
            <div style={{marginBottom:14}}>
              <div style={{fontSize:11,fontWeight:600,color:C.text,marginBottom:8}}>Lịch sử ({reviewModal.reviewHistory.length} entries)</div>
              <div style={{maxHeight:120,overflowY:"auto",border:`1px solid ${C.borderSoft}`,borderRadius:4}}>
                {reviewModal.reviewHistory.slice().reverse().map(h => (
                  <div key={h.id} style={{padding:"6px 10px",borderBottom:`1px solid ${C.borderSoft}`,fontSize:10}}>
                    <div style={{display:"flex",gap:6,alignItems:"center",marginBottom:2}}>
                      <Pill color={h.action==="APPROVED"?"blue":h.action==="REJECTED"?"red":"green"}>{h.action}</Pill>
                      <span style={{color:C.muted}}>{h.userName} · {new Date(h.timestamp).toLocaleString("vi-VN")}</span>
                    </div>
                    {h.note && <div style={{color:C.text,fontStyle:"italic"}}>"{h.note}"</div>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {canApprove && reviewModal.approvalStatus === "Chờ duyệt" && (
            <>
              <Field label="Ghi chú duyệt (bắt buộc nếu từ chối)">
                <textarea value={reviewNote} onChange={e=>setReviewNote(e.target.value)} 
                  placeholder="Nhập ghi chú..." rows={3}
                  style={{width:"100%",fontSize:12,padding:"8px 10px",outline:"none",background:C.bgAlt,
                    border:`1px solid ${C.border}`,borderRadius:4,color:C.text,fontFamily:"inherit",resize:"vertical"}}/>
              </Field>
              <div style={{display:"flex",justifyContent:"flex-end",gap:8,marginTop:14,paddingTop:12,borderTop:`1px solid ${C.borderSoft}`}}>
                <Btn ghost onClick={()=>{setReviewModal(null); setReviewNote("");}}>Đóng</Btn>
                <Btn danger onClick={()=>rejectProduct(reviewModal)} icon={X}>Từ chối</Btn>
                <Btn primary onClick={()=>approveProduct(reviewModal)} icon={Check}>Duyệt</Btn>
              </div>
            </>
          )}
          {!canApprove && (
            <div style={{padding:"12px 14px",background:C.amberSoft,borderRadius:5,borderLeft:`3px solid ${C.amber}`,fontSize:11,color:C.amber,marginTop:14}}>
              ⚠️ Bạn không có quyền duyệt. Cần vai trò APPROVER, MANAGER, hoặc SUPER_ADMIN.
            </div>
          )}
          {canApprove && reviewModal.approvalStatus !== "Chờ duyệt" && (
            <div style={{padding:"12px 14px",background:C.bgAlt,borderRadius:5,fontSize:11,color:C.text,marginTop:14,
              borderLeft:`3px solid ${getStatusColor(reviewModal.approvalStatus)==="green"?C.green:C.muted}`}}>
              Sản phẩm này đã được xử lý: <strong>{reviewModal.approvalStatus}</strong>
              <div style={{display:"flex",justifyContent:"flex-end",marginTop:8}}>
                <Btn ghost onClick={()=>{setReviewModal(null); setReviewNote("");}}>Đóng</Btn>
              </div>
            </div>
          )}
        </Modal>
      )}

      {/* ASSIGN CHANNEL MODAL */}
      {assignModal && (
        <Modal title="Cấp kênh cho sản phẩm" onClose={()=>{setAssignModal(null); setSelectedChannel("");}} width={520}>
          <div style={{padding:"10px 12px",background:C.greenSoft,borderRadius:5,marginBottom:14,
            borderLeft:`3px solid ${C.green}`,fontSize:11,color:C.text}}>
            <div style={{fontWeight:500,marginBottom:3}}>📄 {assignModal.fileName.slice(0,80)}</div>
            <div style={{color:C.muted}}>Sản phẩm đã ĐẠT kiểm định và được duyệt. Chọn kênh để cấp:</div>
          </div>

          <Field label="Chọn kênh *">
            <Select value={selectedChannel} onChange={e=>setSelectedChannel(e.target.value)}>
              <option value="">— Chọn kênh —</option>
              {channels.filter(c => c.status !== "Suspended").slice(0, 100).map(c => (
                <option key={c.id} value={c.id}>{c.name} ({c.cms} · {c.topic||"—"})</option>
              ))}
            </Select>
          </Field>

          {selectedChannel && (() => {
            const ch = channels.find(c => c.id === selectedChannel);
            if (!ch) return null;
            return (
              <div style={{padding:12,background:C.bgAlt,borderRadius:5,fontSize:11,marginBottom:14}}>
                <div style={{fontWeight:500,color:C.ink,marginBottom:6}}>{ch.name}</div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,color:C.text}}>
                  <div>YouTube: <code style={{fontFamily:"monospace",fontSize:10}}>{ch.ytId}</code></div>
                  <div>CMS: {ch.cms}</div>
                  <div>Chủ đề: {ch.topic||"—"}</div>
                  <div>Đối tác: {ch.partner||"—"}</div>
                  <div>Trạng thái: <StatusDot status={ch.monetization||ch.status}/></div>
                  <div>Subs: {fmt(ch.subscribers)}</div>
                </div>
              </div>
            );
          })()}

          <div style={{display:"flex",justifyContent:"flex-end",gap:8,paddingTop:12,borderTop:`1px solid ${C.borderSoft}`}}>
            <Btn ghost onClick={()=>{setAssignModal(null); setSelectedChannel("");}}>Hủy</Btn>
            <Btn primary onClick={assignChannel} icon={Check} disabled={!selectedChannel}>Cấp kênh</Btn>
          </div>
        </Modal>
      )}
    </div>
  );
};
// ═══════════════════════════════════════════════════════════════════
// ROOT APP
// ═══════════════════════════════════════════════════════════════════
// ─── Global CSS (defined before App component) ──────────────────
const globalStyles = `
@import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,500;9..144,600&family=DM+Sans:wght@400;500;600&family=JetBrains+Mono:wght@400;500&display=swap');
*{box-sizing:border-box;margin:0;padding:0;font-family:'DM Sans',system-ui,sans-serif}
body,html,#root{height:100%;background:#FAF7F2}
::-webkit-scrollbar{width:6px;height:6px}
::-webkit-scrollbar-track{background:#FAF7F2}
::-webkit-scrollbar-thumb{background:#E8E2D5;border-radius:3px}
@keyframes spin{to{transform:rotate(360deg)}}
@keyframes bounce{0%,100%{transform:translateY(0)}50%{transform:translateY(-4px)}}
@keyframes slideIn{from{transform:translateX(100%);opacity:0}to{transform:translateX(0);opacity:1}}
`;

const DEFAULT_BRAND = {
  appName: "Meridian",
  companyName: "KUDO Network",
  logoData: null,
  primaryColor: "#B8650C",
};

// ═══════════════════════════════════════════════════════════════════
// ─── PartnerManagementView — Unified Partner Lifecycle & Workflow
// Auto-sync partner company records ↔ user accounts ↔ submissions ↔ channels ↔ contracts
// ═══════════════════════════════════════════════════════════════════
function PartnerManagementView({ state, setState, currentUser, toast, confirm, onNavigate }) {
  const C = useC();
  const [users, setLocalUsers] = useState(() => lsGet(LS.USERS, []));
  const refreshUsers = useCallback(() => setLocalUsers(lsGet(LS.USERS, [])), []);

  // Re-read users whenever state changes (force-trigger from approve/reject)
  useEffect(() => { refreshUsers(); }, [state, refreshUsers]);

  const partnerUsers = useMemo(() => users.filter(u => u.role === "PARTNER"), [users]);
  const pendingUsers = useMemo(() => partnerUsers.filter(u => u.status === "PendingApproval"), [partnerUsers]);
  const activePartnerUsers = useMemo(() => partnerUsers.filter(u => u.status === "Active"), [partnerUsers]);
  const rejectedUsers = useMemo(() => partnerUsers.filter(u => u.status === "Rejected"), [partnerUsers]);
  const submissions = state.videoSubmissions || [];

  // Auto-migrate legacy submissions to new state machine
  const submissionsWithState = useMemo(() => submissions.map(s => ({
    ...s,
    workflowState: s.workflowState || migrateSubmissionStatus(s),
  })), [submissions]);

  // Workflow queues by current state
  const qcQueue = useMemo(() => submissionsWithState.filter(s => ["SUBMITTED","QC_REVIEWING"].includes(s.workflowState)), [submissionsWithState]);
  const provisioningQueue = useMemo(() => submissionsWithState.filter(s => ["QC_APPROVED","CHANNEL_PROVISIONING","PROVISIONING_FAILED"].includes(s.workflowState)), [submissionsWithState]);
  const activeSubs = useMemo(() => submissionsWithState.filter(s => s.workflowState === "ACTIVE"), [submissionsWithState]);
  const rejectedSubs = useMemo(() => submissionsWithState.filter(s => s.workflowState === "QC_REJECTED"), [submissionsWithState]);
  const totalPendingWork = pendingUsers.length + qcQueue.length + provisioningQueue.length;

  // ═══════════════════════════════════════════════════════════════
  // 🔗 UNIFIED PARTNER PROFILES — merge company records + user accounts
  // ═══════════════════════════════════════════════════════════════
  const unifiedPartners = useMemo(() => {
    const partners = state.partners || [];
    const channels = state.channels || [];
    const contracts = state.contracts || [];
    const profileMap = new Map(); // key = normalized company name or partner id

    // 1) Seed from state.partners (company records)
    partners.forEach(p => {
      const key = (p.name || "").trim().toLowerCase();
      if (!key) return;
      profileMap.set(key, {
        id: p.id,
        companyName: p.name,
        type: p.type,
        tier: p.tier,
        dept: p.dept,
        revShare: p.revShare,
        status: p.status || "Active",
        source: "company",
        partnerRecord: p,
        userAccounts: [],
        channels: [],
        contracts: [],
        submissions: [],
        createdAt: p.createdAt,
      });
    });

    // 2) Merge PARTNER user accounts → match by companyName
    activePartnerUsers.forEach(u => {
      const key = (u.companyName || u.fullName || "").trim().toLowerCase();
      if (!key) return;
      if (profileMap.has(key)) {
        profileMap.get(key).userAccounts.push(u);
      } else {
        // User exists but no company record → create virtual profile
        profileMap.set(key, {
          id: u.id,
          companyName: u.companyName || u.fullName,
          type: "AFFILIATE",
          tier: "Standard",
          dept: "",
          revShare: 70,
          status: "Active",
          source: "user-only",
          partnerRecord: null,
          userAccounts: [u],
          channels: [],
          contracts: [],
          submissions: [],
          createdAt: u.createdAt || u.approvedAt,
        });
      }
    });

    // 3) Link channels, contracts, submissions to each profile
    profileMap.forEach((profile) => {
      const companyLower = profile.companyName.toLowerCase();
      const userEmails = profile.userAccounts.map(u => u.email);
      const userIds = profile.userAccounts.map(u => u.id);

      profile.channels = channels.filter(c =>
        (c.partner && c.partner.toLowerCase() === companyLower) ||
        (c.partnerEmail && userEmails.includes(c.partnerEmail)) ||
        (c.submittedBy && userIds.includes(c.submittedBy))
      );
      profile.contracts = contracts.filter(c =>
        (c.partnerName && c.partnerName.toLowerCase() === companyLower) ||
        (c.partnerEmail && userEmails.includes(c.partnerEmail)) ||
        (c.partnerId && c.partnerId === profile.partnerRecord?.id)
      );
      profile.submissions = submissionsWithState.filter(s =>
        (s.submittedBy && userIds.includes(s.submittedBy)) ||
        (s.submitterEmail && userEmails.includes(s.submitterEmail)) ||
        (s.submitterName && s.submitterName.toLowerCase() === companyLower)
      );
    });

    return [...profileMap.values()].sort((a, b) => {
      // Sort: pending work first, then by channel count, then by name
      const aWork = a.submissions.filter(s => !["ACTIVE","QC_REJECTED"].includes(s.workflowState)).length;
      const bWork = b.submissions.filter(s => !["ACTIVE","QC_REJECTED"].includes(s.workflowState)).length;
      if (aWork !== bWork) return bWork - aWork;
      if (a.channels.length !== b.channels.length) return b.channels.length - a.channels.length;
      return (a.companyName || "").localeCompare(b.companyName || "");
    });
  }, [state.partners, state.channels, state.contracts, submissionsWithState, activePartnerUsers]);

  // ═══════════════════════════════════════════════════════════════
  // 🎯 Smart default tab
  // ═══════════════════════════════════════════════════════════════
  const [tab, setTab] = useState(() => {
    if (pendingUsers.length > 0) return "pending-users";
    if (qcQueue.length > 0) return "qc-queue";
    if (provisioningQueue.length > 0) return "provision-queue";
    return "overview";
  });

  const [searchQ, setSearchQ] = useState("");
  const [expandedProfile, setExpandedProfile] = useState(null);

  const canQC = can(currentUser, "videos.qc_review");
  const canProvision = can(currentUser, "videos.provision_channel");

  // ═══════════════════════════════════════════════════════════════
  // 🔗 Auto-link: approve user → auto-create/link partner company record
  // ═══════════════════════════════════════════════════════════════
  const approveUser = (u) => {
    const ts = new Date().toISOString();
    // 1) Update user status
    const updatedUsers = users.map(x => x.id === u.id ? {
      ...x,
      status: "Active",
      approvedBy: currentUser.id,
      approvedAt: ts,
      partnerSince: ts,
    } : x);
    lsSet(LS.USERS, updatedUsers);
    refreshUsers();

    // 2) Auto-create/link partner company record in state.partners
    setState(s => {
      const partners = s.partners || [];
      const companyName = (u.companyName || u.fullName || "").trim();
      const existing = partners.find(p =>
        p.name.toLowerCase() === companyName.toLowerCase() ||
        p.email === u.email
      );

      if (existing) {
        // Link: update existing partner with user reference
        return {
          ...s,
          partners: partners.map(p => p.id === existing.id ? {
            ...p,
            linkedUserId: u.id,
            linkedUserEmail: u.email,
            updatedAt: ts,
          } : p),
        };
      } else if (companyName) {
        // Create new partner company record
        const newPartner = {
          id: `P${String(partners.length + 1).padStart(4, "0")}`,
          name: companyName,
          email: u.email,
          type: "AFFILIATE",
          tier: "Standard",
          dept: "",
          revShare: 70,
          status: "Active",
          linkedUserId: u.id,
          linkedUserEmail: u.email,
          phone: u.phone || "",
          createdAt: ts,
          autoCreated: true,
          autoCreatedFrom: `user:${u.id}`,
        };
        return { ...s, partners: [...partners, newPartner] };
      }
      return s;
    });

    logActivity("PARTNER_APPROVED", u.id, `Approved by ${currentUser.email}. Auto-linked company record.`);
    toast?.(`✅ Đã duyệt "${u.fullName}" + tự động tạo/liên kết hồ sơ đối tác`, "success");
  };

  const rejectUser = async (u) => {
    const ok = await (confirm?.({ title: `Từ chối "${u.fullName}"?`, message: "Tài khoản sẽ bị tạm khóa, có thể xóa sau.", danger: true }) || Promise.resolve(window.confirm("Từ chối user này?")));
    if (!ok) return;
    const updated = users.map(x => x.id === u.id ? { ...x, status: "Rejected", rejectedBy: currentUser.id, rejectedAt: new Date().toISOString() } : x);
    lsSet(LS.USERS, updated);
    refreshUsers();
    toast?.("Đã từ chối", "info");
    setState(s => ({ ...s }));
  };

  // ═══════════════════════════════════════════════════════════════
  // 🔄 Sync all — heal disconnected partner data on demand
  // ═══════════════════════════════════════════════════════════════
  const syncAllPartnerData = () => {
    let created = 0;
    let linked = 0;
    setState(s => {
      const partners = [...(s.partners || [])];
      const ts = new Date().toISOString();

      activePartnerUsers.forEach(u => {
        const companyName = (u.companyName || u.fullName || "").trim();
        if (!companyName) return;
        const existing = partners.find(p =>
          p.name.toLowerCase() === companyName.toLowerCase() ||
          p.email === u.email ||
          p.linkedUserId === u.id
        );

        if (existing) {
          if (!existing.linkedUserId) {
            existing.linkedUserId = u.id;
            existing.linkedUserEmail = u.email;
            existing.updatedAt = ts;
            linked++;
          }
        } else {
          partners.push({
            id: `P${String(partners.length + 1).padStart(4, "0")}`,
            name: companyName,
            email: u.email,
            type: "AFFILIATE",
            tier: "Standard",
            dept: "",
            revShare: 70,
            status: "Active",
            linkedUserId: u.id,
            linkedUserEmail: u.email,
            phone: u.phone || "",
            createdAt: ts,
            autoCreated: true,
            autoCreatedFrom: `sync:${u.id}`,
          });
          created++;
        }
      });

      return { ...s, partners };
    });
    if (created || linked) {
      logActivity("PARTNER_SYNC", currentUser.id, `Auto-sync: ${created} created, ${linked} linked`);
      toast?.(`🔄 Đồng bộ: ${created} đối tác mới, ${linked} liên kết lại`, "success");
    } else {
      toast?.("✅ Tất cả đối tác đã đồng bộ", "info");
    }
  };

  // 🔄 Workflow advance with state machine
  const [advanceModal, setAdvanceModal] = useState(null);
  const [advanceNote, setAdvanceNote] = useState("");
  const [provisionForm, setProvisionForm] = useState({ ytId: "", cms: "", topic: "" });
  const [inspectionChecklist, setInspectionChecklist] = useState({});

  const openAdvance = (sub, nextState) => {
    if (!canAdvance(currentUser, sub.workflowState, nextState)) {
      toast?.(`⛔ Bạn không có quyền chuyển sang "${SUBMISSION_STATES[nextState]?.label}"`, "error");
      return;
    }
    setAdvanceModal({ sub, nextState });
    setAdvanceNote("");
    setInspectionChecklist({});
    if (nextState === "ACTIVE") {
      const ch = (state.channels || []).find(c => c.id === sub.channelId);
      setProvisionForm({
        ytId: ch?.ytId || sub.preferredYtId || "",
        cms: ch?.cms || "",
        topic: ch?.topic || sub.category || ""
      });
    }
  };

  const advance = () => {
    if (!advanceModal) return;
    const { sub, nextState } = advanceModal;
    const ts = new Date().toISOString();
    const stateLog = sub.stateLog || [];

    setState(s => {
      const updated = {
        ...s,
        videoSubmissions: (s.videoSubmissions || []).map(x => x.id === sub.id ? {
          ...x,
          workflowState: nextState,
          status: nextState === "ACTIVE" ? "approved" : (nextState === "QC_REJECTED" ? "rejected" : "pending"),
          stateLog: [...stateLog, {
            from: sub.workflowState,
            to: nextState,
            ts,
            by: currentUser.id,
            byEmail: currentUser.email,
            byRole: currentUser.role,
            note: advanceNote,
            ...(nextState === "QC_APPROVED" && Object.keys(inspectionChecklist).length > 0 && {
              inspectionChecklist: Object.entries(inspectionChecklist).filter(([, v]) => v).map(([k]) => k),
              inspectionScore: `${Object.values(inspectionChecklist).filter(Boolean).length}/9`,
            }),
          }],
          ...(nextState === "QC_APPROVED" && {
            qcInspection: {
              checklist: inspectionChecklist,
              score: Object.values(inspectionChecklist).filter(Boolean).length,
              total: 9,
              by: currentUser.email,
              at: ts,
            },
          }),
          adminNote: advanceNote || sub.adminNote,
          ...(nextState === "ACTIVE" && {
            provisionedBy: currentUser.id,
            provisionedAt: ts,
            provisionedYtId: provisionForm.ytId,
            provisionedCms: provisionForm.cms,
          }),
        } : x)
      };
      // Auto-create channel record when ACTIVE
      if (nextState === "ACTIVE" && provisionForm.ytId) {
        const partnerEmail = sub.submitterEmail;
        const newCh = {
          id: `C${String((updated.channels?.length || 0) + 1).padStart(5, "0")}`,
          name: sub.videoTitle || `Channel for ${sub.submitterName}`,
          ytId: provisionForm.ytId,
          cms: provisionForm.cms || "",
          topic: provisionForm.topic || sub.category || "",
          partner: sub.submitterName,
          partnerEmail,
          submittedBy: sub.submittedBy,
          status: "Active", monetization: "Pending",
          health: "Healthy", strikes: 0,
          subscribers: 0, monthlyViews: 0, monthlyRevenue: 0,
          country: "VN",
          notes: `Cấp từ submission ${sub.id}`,
          changeHistory: [{ ts, action: `Cấp kênh từ submission #${sub.id} bởi ${currentUser.email}`, user: currentUser.email }],
          createdAt: ts,
        };
        updated.channels = [...(updated.channels || []), newCh];
      }
      return updated;
    });

    logActivity("WORKFLOW_ADVANCE", sub.id, `${sub.workflowState} → ${nextState} by ${currentUser.email}`);
    toast?.(`✅ ${SUBMISSION_STATES[nextState]?.emoji} Chuyển sang: ${SUBMISSION_STATES[nextState]?.label}`, "success");
    setAdvanceModal(null);
  };

  // ═══════════════════════════════════════════════════════════════
  // Lifecycle stage indicator for a unified partner profile
  // ═══════════════════════════════════════════════════════════════
  const getLifecycleStage = (profile) => {
    const hasContract = profile.contracts.length > 0;
    const hasChannel = profile.channels.length > 0;
    const hasSubs = profile.submissions.length > 0;
    const pendingSubs = profile.submissions.filter(s => !["ACTIVE", "QC_REJECTED"].includes(s.workflowState));
    const activeCh = profile.channels.filter(c => c.status === "Active").length;

    if (hasChannel && hasContract && activeCh > 0) return { label: "Đầy đủ", color: "green", icon: "🏆", score: 5 };
    if (hasChannel && activeCh > 0) return { label: "Đã cấp kênh", color: "blue", icon: "📺", score: 4 };
    if (pendingSubs.length > 0) return { label: "Đang xử lý", color: "amber", icon: "⏳", score: 3 };
    if (hasSubs) return { label: "Đã gửi SP", color: "blue", icon: "📤", score: 2 };
    if (profile.userAccounts.length > 0) return { label: "Mới đăng ký", color: "gray", icon: "👤", score: 1 };
    return { label: "Chỉ có hồ sơ", color: "gray", icon: "📋", score: 0 };
  };

  // ═══════════════════════════════════════════════════════════════
  // Submission card renderer (shared across tabs)
  // ═══════════════════════════════════════════════════════════════
  const renderSubmissionCard = (sub) => {
    const stateInfo = SUBMISSION_STATES[sub.workflowState] || SUBMISSION_STATES.SUBMITTED;
    const ageH = sub.submittedAt ? Math.round((Date.now() - new Date(sub.submittedAt).getTime()) / 3600000) : 0;
    const ageLabel = ageH < 24 ? `${ageH}h` : `${Math.round(ageH / 24)}d`;
    const hasStorage = sub.storageUrl && sub.storageUrl.trim().length > 0;
    return (
      <Card key={sub.id} style={{ padding: 14, marginBottom: 8, borderLeft: `3px solid ${C[stateInfo.color] || C.amber}` }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
          <Pill color={stateInfo.color}>{stateInfo.emoji} {stateInfo.label}</Pill>
          <div style={{ flex: 1, minWidth: 280 }}>
            <div style={{ fontSize: 13, fontWeight: 500, color: C.ink }}>{sub.videoTitle}</div>
            <div style={{ fontSize: 10, color: C.muted, marginTop: 2 }}>
              <strong>{sub.submitterName}</strong> ({sub.submitterEmail}) · {sub.submittedAt && `Gửi ${ageLabel} trước`}
              {sub.category && ` · 🏷️ ${sub.category}`}
              {sub.license && ` · 📜 ${sub.license}`}
            </div>
            {sub.videoUrl && (
              <div style={{ marginTop: 5, padding: 5, background: C.bgAlt, borderRadius: 3 }}>
                <span style={{ fontSize: 9, color: C.muted }}>🎬 Video:</span>{" "}
                <a href={sub.videoUrl} target="_blank" rel="noopener" style={{ fontSize: 10, color: C.accent, fontFamily: "monospace", wordBreak: "break-all" }}>{sub.videoUrl}</a>
              </div>
            )}
            {hasStorage && (
              <div style={{ marginTop: 5, padding: 6, background: C.aiSoft, borderRadius: 3, borderLeft: `2px solid ${C.ai}` }}>
                <span style={{ fontSize: 9, color: C.ai, fontWeight: 500 }}>📁 KHO LƯU TRỮ ({sub.storageType || "drive"}):</span>{" "}
                {sub.storageUrl.startsWith("http") ? (
                  <a href={sub.storageUrl} target="_blank" rel="noopener" style={{ fontSize: 10, color: C.ai, fontFamily: "monospace", wordBreak: "break-all", fontWeight: 500 }}>{sub.storageUrl}</a>
                ) : (
                  <code style={{ fontSize: 10, color: C.text }}>{sub.storageUrl}</code>
                )}
              </div>
            )}
            {!hasStorage && stateInfo.owner === "QC_REVIEWER" && (
              <div style={{ marginTop: 5, padding: 6, background: C.amberSoft, borderRadius: 3, fontSize: 10, color: C.amber }}>
                ⚠️ Partner chưa cung cấp link kho lưu trữ — nên yêu cầu trước khi duyệt
              </div>
            )}
            {sub.productInfo && (
              <div style={{ marginTop: 4, fontSize: 10, color: C.text }}>
                ℹ️ <strong>Thông tin SP:</strong> {sub.productInfo}
              </div>
            )}
            {sub.description && <div style={{ fontSize: 10, color: C.muted, marginTop: 4, padding: 6, background: C.bgAlt, borderRadius: 3 }}>📝 {sub.description}</div>}
            {sub.adminNote && <div style={{ fontSize: 10, color: C.text, marginTop: 4, padding: 6, background: `${C[stateInfo.color] || C.amber}15`, borderRadius: 3 }}>💬 <strong>Note:</strong> {sub.adminNote}</div>}
            {sub.stateLog?.length > 0 && (
              <details style={{ marginTop: 6, fontSize: 10, color: C.muted }}>
                <summary style={{ cursor: "pointer" }}>📜 Lịch sử state ({sub.stateLog.length})</summary>
                <div style={{ marginTop: 4, paddingLeft: 14 }}>
                  {sub.stateLog.slice(-5).map((log, i) => (
                    <div key={i}>
                      {new Date(log.ts).toLocaleString("vi-VN", { hour12: false })} · {log.from}→{log.to} · {log.byEmail} ({log.byRole})
                      {log.note && ` · "${log.note}"`}
                    </div>
                  ))}
                </div>
              </details>
            )}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6, minWidth: 140 }}>
            {stateInfo.next.map(next => {
              const nextInfo = SUBMISSION_STATES[next];
              const allowed = canAdvance(currentUser, sub.workflowState, next);
              if (!allowed) return null;
              const isReject = next.includes("REJECTED") || next.includes("FAILED");
              return (
                <Btn key={next} primary={!isReject} ghost={isReject}
                  style={isReject ? { fontSize: 10, color: C.red, borderColor: C.red } : { fontSize: 10 }}
                  onClick={() => openAdvance(sub, next)}>
                  {nextInfo.emoji} {nextInfo.label.replace(/^[^a-zA-ZÀ-ỹ]+\s*/, "")}
                </Btn>
              );
            })}
            {stateInfo.next.length === 0 && (
              <Pill color="gray">Hoàn tất</Pill>
            )}
          </div>
        </div>
      </Card>
    );
  };

  // ═══════════════════════════════════════════════════════════════
  // 📊 Summary stats for header
  // ═══════════════════════════════════════════════════════════════
  const stats = useMemo(() => {
    const totalPartners = unifiedPartners.length;
    const withChannels = unifiedPartners.filter(p => p.channels.length > 0).length;
    const totalChannels = unifiedPartners.reduce((s, p) => s + p.channels.length, 0);
    const totalRev = unifiedPartners.reduce((s, p) => s + p.channels.reduce((cs, c) => cs + (c.monthlyRevenue || 0), 0), 0);
    const unlinked = activePartnerUsers.filter(u => {
      const cn = (u.companyName || u.fullName || "").trim().toLowerCase();
      return !state.partners?.some(p => p.name.toLowerCase() === cn || p.linkedUserId === u.id);
    }).length;
    return { totalPartners, withChannels, totalChannels, totalRev, unlinked };
  }, [unifiedPartners, activePartnerUsers, state.partners]);

  // Filter unified partners by search
  const filteredProfiles = useMemo(() => {
    if (!searchQ.trim()) return unifiedPartners;
    const q = searchQ.toLowerCase();
    return unifiedPartners.filter(p =>
      p.companyName.toLowerCase().includes(q) ||
      p.userAccounts.some(u => u.email.toLowerCase().includes(q) || (u.fullName || "").toLowerCase().includes(q)) ||
      (p.dept || "").toLowerCase().includes(q)
    );
  }, [unifiedPartners, searchQ]);

  return (
    <div style={{ padding: "20px 28px", overflowY: "auto", height: "100%", background: C.bg }}>
      {/* ═══ Header ═══ */}
      <div style={{ marginBottom: 18 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 6 }}>
          <div style={{ fontFamily: "'Fraunces',serif", fontWeight: 500, fontSize: 22, color: C.ink }}>🤝 Đối tác & Workflow</div>
          {stats.unlinked > 0 && (
            <button onClick={syncAllPartnerData}
              style={{ padding: "4px 12px", fontSize: 10, background: C.amberSoft, color: C.amber, border: `1px solid ${C.amber}`, borderRadius: 4, cursor: "pointer", fontWeight: 500 }}>
              🔄 Đồng bộ {stats.unlinked} user chưa liên kết
            </button>
          )}
        </div>
        {/* Mini KPI strip */}
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 4 }}>
          {[
            { label: "Đối tác", value: stats.totalPartners, icon: "🏢" },
            { label: "Có kênh", value: stats.withChannels, icon: "📺" },
            { label: "Tổng kênh", value: stats.totalChannels, icon: "📊" },
            { label: "Doanh thu", value: `$${(stats.totalRev / 1000).toFixed(1)}K`, icon: "💰" },
            { label: "Chờ xử lý", value: totalPendingWork, icon: totalPendingWork > 0 ? "🔴" : "✅", color: totalPendingWork > 0 ? C.red : C.green },
          ].map(kpi => (
            <div key={kpi.label} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: C.text }}>
              <span>{kpi.icon}</span>
              <span style={{ fontWeight: 600, color: kpi.color || C.ink, fontFamily: "monospace" }}>{kpi.value}</span>
              <span style={{ color: C.muted, fontSize: 10 }}>{kpi.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ═══ Tab bar ═══ */}
      <div style={{ display: "flex", gap: 6, marginBottom: 14, flexWrap: "wrap" }}>
        {[
          { id: "overview", label: "📊 Tổng quan", count: unifiedPartners.length },
          { id: "pending-users", label: "👤 Chờ duyệt", count: pendingUsers.length, color: pendingUsers.length > 0 ? C.amber : null },
          { id: "qc-queue", label: "🔍 QC Queue", count: qcQueue.length, color: qcQueue.length > 0 ? C.amber : null },
          { id: "provision-queue", label: "🛠️ Cấp kênh", count: provisioningQueue.length, color: provisioningQueue.length > 0 ? C.blue : null },
          { id: "completed", label: "🟢 Hoàn tất", count: activeSubs.length },
          { id: "rejected", label: "❌ Từ chối", count: rejectedSubs.length + rejectedUsers.length },
        ].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            style={{
              padding: "7px 14px", fontSize: 11, fontWeight: 500, cursor: "pointer", borderRadius: 4,
              background: tab === t.id ? C.ink : "transparent", color: tab === t.id ? "#FFF" : C.text,
              border: `1px solid ${tab === t.id ? C.ink : t.color || C.border}`,
              transition: "all 0.15s",
            }}>
            {t.label} {t.count !== undefined && <span style={{ marginLeft: 4, fontSize: 9, padding: "1px 5px", background: tab === t.id ? "rgba(255,255,255,0.2)" : C.bgAlt, borderRadius: 8 }}>{t.count}</span>}
          </button>
        ))}
      </div>

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* 📊 OVERVIEW — Unified partner profiles with lifecycle status  */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      {tab === "overview" && (
        <>
          <div style={{ display: "flex", gap: 8, marginBottom: 12, alignItems: "center" }}>
            <div style={{ position: "relative", flex: 1, maxWidth: 360 }}>
              <Search size={14} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: C.muted }} />
              <input value={searchQ} onChange={e => setSearchQ(e.target.value)}
                placeholder="Tìm đối tác, email, bộ phận..."
                style={{ width: "100%", padding: "8px 10px 8px 30px", fontSize: 11, border: `1px solid ${C.border}`, borderRadius: 4, background: C.card, color: C.text }} />
            </div>
            <Btn primary icon={RefreshCw} style={{ fontSize: 10, padding: "6px 10px" }}
              onClick={syncAllPartnerData}>
              🔄 Đồng bộ tất cả
            </Btn>
          </div>

          {/* Lifecycle pipeline summary */}
          <Card style={{ padding: 12, marginBottom: 14 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: C.ink, marginBottom: 8 }}>📈 Pipeline đối tác theo vòng đời</div>
            <div style={{ display: "flex", gap: 0, borderRadius: 6, overflow: "hidden" }}>
              {[
                { label: "Mới", color: "#9CA3AF", count: unifiedPartners.filter(p => getLifecycleStage(p).score <= 1).length },
                { label: "Đã gửi SP", color: "#3B82F6", count: unifiedPartners.filter(p => getLifecycleStage(p).score === 2).length },
                { label: "Đang xử lý", color: "#F59E0B", count: unifiedPartners.filter(p => getLifecycleStage(p).score === 3).length },
                { label: "Có kênh", color: "#10B981", count: unifiedPartners.filter(p => getLifecycleStage(p).score === 4).length },
                { label: "Đầy đủ", color: "#8B5CF6", count: unifiedPartners.filter(p => getLifecycleStage(p).score === 5).length },
              ].map((stage, i) => {
                const pct = unifiedPartners.length > 0 ? Math.max(stage.count / unifiedPartners.length * 100, stage.count > 0 ? 8 : 0) : 20;
                return (
                  <div key={i} style={{ flex: `0 0 ${pct}%`, background: stage.color, padding: "8px 6px", textAlign: "center", minWidth: stage.count > 0 ? 60 : 20 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: "#FFF" }}>{stage.count}</div>
                    <div style={{ fontSize: 8, color: "rgba(255,255,255,0.85)", fontWeight: 500 }}>{stage.label}</div>
                  </div>
                );
              })}
            </div>
          </Card>

          {/* Partner profile cards */}
          {filteredProfiles.length === 0 ? (
            <Card style={{ padding: 0 }}>
              <EmptyState icon={Users} title="Chưa có đối tác nào" description="Thêm đối tác thủ công hoặc đợi Partner đăng ký tài khoản." />
            </Card>
          ) : filteredProfiles.map(profile => {
            const lifecycle = getLifecycleStage(profile);
            const isExpanded = expandedProfile === profile.id;
            const pendingWork = profile.submissions.filter(s => !["ACTIVE", "QC_REJECTED"].includes(s.workflowState));
            const activeChannels = profile.channels.filter(c => c.status === "Active");
            const monthlyRev = profile.channels.reduce((s, c) => s + (c.monthlyRevenue || 0), 0);

            return (
              <Card key={profile.id} style={{ padding: 0, marginBottom: 10, borderLeft: `3px solid ${C[lifecycle.color] || C.border}`, overflow: "hidden" }}>
                {/* Compact row */}
                <div style={{ padding: "12px 14px", display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}
                  onClick={() => setExpandedProfile(isExpanded ? null : profile.id)}>
                  <div style={{ width: 32, height: 32, borderRadius: 6, background: `${C[lifecycle.color]}18`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>
                    {lifecycle.icon}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: C.ink }}>{profile.companyName}</span>
                      <Pill color={lifecycle.color}>{lifecycle.label}</Pill>
                      {profile.type && <Pill color={profile.type === "OWNED" ? "accent" : profile.type === "PRODUCTION" ? "blue" : "gray"}>{profile.type}</Pill>}
                      {profile.source === "user-only" && <span style={{ fontSize: 8, padding: "1px 5px", background: C.amberSoft, color: C.amber, borderRadius: 3 }}>chưa có hồ sơ</span>}
                    </div>
                    <div style={{ fontSize: 10, color: C.muted, marginTop: 2 }}>
                      {profile.userAccounts.map(u => u.email).join(", ") || "Không có user account"}
                      {profile.dept && ` · ${profile.dept}`}
                    </div>
                  </div>
                  {/* Quick stats */}
                  <div style={{ display: "flex", gap: 14, alignItems: "center", flexShrink: 0 }}>
                    {[
                      { icon: "👤", val: profile.userAccounts.length, label: "users" },
                      { icon: "📤", val: profile.submissions.length, label: "subs" },
                      { icon: "📺", val: activeChannels.length, label: "kênh" },
                      { icon: "📄", val: profile.contracts.length, label: "HĐ" },
                    ].map(s => (
                      <div key={s.label} title={s.label} style={{ textAlign: "center", minWidth: 30 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, fontFamily: "monospace", color: s.val > 0 ? C.ink : C.muted }}>{s.val}</div>
                        <div style={{ fontSize: 8, color: C.muted }}>{s.icon} {s.label}</div>
                      </div>
                    ))}
                    {monthlyRev > 0 && (
                      <div style={{ textAlign: "center", minWidth: 50 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, fontFamily: "monospace", color: C.green }}>${(monthlyRev / 1000).toFixed(1)}K</div>
                        <div style={{ fontSize: 8, color: C.muted }}>💰 /tháng</div>
                      </div>
                    )}
                  </div>
                  {/* Pending work badge */}
                  {pendingWork.length > 0 && (
                    <div style={{ padding: "3px 8px", background: C.amberSoft, borderRadius: 10, fontSize: 10, fontWeight: 600, color: C.amber }}>
                      ⏳ {pendingWork.length}
                    </div>
                  )}
                  <ChevronRight size={14} style={{ color: C.muted, transform: isExpanded ? "rotate(90deg)" : "none", transition: "transform 0.2s" }} />
                </div>

                {/* Expanded details */}
                {isExpanded && (
                  <div style={{ borderTop: `1px solid ${C.borderSoft}`, padding: 14, background: C.bgAlt }}>
                    {/* ─ Partner info grid ─ */}
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 14 }}>
                      <div>
                        <div style={{ fontSize: 9, fontWeight: 600, color: C.muted, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 4 }}>Hồ sơ công ty</div>
                        {profile.partnerRecord ? (
                          <div style={{ fontSize: 11, color: C.text }}>
                            <div>ID: <code style={{ fontSize: 10 }}>{profile.partnerRecord.id}</code></div>
                            <div>Tier: <strong>{profile.tier || "Standard"}</strong> · Rev Share: <strong>{profile.revShare || 70}%</strong></div>
                            <div>Bộ phận: {profile.dept || "—"}</div>
                          </div>
                        ) : (
                          <div style={{ fontSize: 11, color: C.amber }}>⚠️ Chưa có hồ sơ công ty — <button onClick={() => {
                            setState(s => ({
                              ...s,
                              partners: [...(s.partners || []), {
                                id: `P${String((s.partners?.length || 0) + 1).padStart(4, "0")}`,
                                name: profile.companyName,
                                email: profile.userAccounts[0]?.email || "",
                                type: "AFFILIATE", tier: "Standard", dept: "", revShare: 70, status: "Active",
                                linkedUserId: profile.userAccounts[0]?.id,
                                linkedUserEmail: profile.userAccounts[0]?.email,
                                createdAt: new Date().toISOString(),
                                autoCreated: true,
                              }]
                            }));
                            toast?.("✅ Đã tạo hồ sơ đối tác", "success");
                          }} style={{ background: "none", border: "none", color: C.accent, cursor: "pointer", textDecoration: "underline", fontSize: 11 }}>Tạo ngay</button></div>
                        )}
                      </div>
                      <div>
                        <div style={{ fontSize: 9, fontWeight: 600, color: C.muted, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 4 }}>Tài khoản user ({profile.userAccounts.length})</div>
                        {profile.userAccounts.length > 0 ? profile.userAccounts.map(u => (
                          <div key={u.id} style={{ fontSize: 11, color: C.text, marginBottom: 2 }}>
                            👤 {u.fullName} · <code style={{ fontSize: 10 }}>{u.email}</code>
                            {u.approvedAt && <span style={{ fontSize: 9, color: C.muted }}> · từ {new Date(u.approvedAt).toLocaleDateString("vi-VN")}</span>}
                          </div>
                        )) : (
                          <div style={{ fontSize: 11, color: C.muted }}>Không có tài khoản liên kết</div>
                        )}
                      </div>
                      <div>
                        <div style={{ fontSize: 9, fontWeight: 600, color: C.muted, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 4 }}>Hợp đồng ({profile.contracts.length})</div>
                        {profile.contracts.length > 0 ? profile.contracts.slice(0, 3).map(ct => (
                          <div key={ct.id} style={{ fontSize: 11, color: C.text, marginBottom: 2 }}>
                            📄 {ct.contractName} · <Pill color={ct.status === "Active" ? "green" : ct.status === "Expired" ? "red" : "gray"}>{ct.status}</Pill>
                          </div>
                        )) : (
                          <div style={{ fontSize: 11, color: C.muted }}>Chưa có hợp đồng</div>
                        )}
                      </div>
                    </div>

                    {/* ─ Channels list ─ */}
                    {profile.channels.length > 0 && (
                      <div style={{ marginBottom: 12 }}>
                        <div style={{ fontSize: 9, fontWeight: 600, color: C.muted, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 6 }}>
                          📺 Kênh ({profile.channels.length})
                        </div>
                        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                          {profile.channels.slice(0, 8).map(ch => (
                            <div key={ch.id} style={{ padding: "4px 8px", background: C.card, borderRadius: 4, fontSize: 10, border: `1px solid ${C.borderSoft}` }}>
                              {ch.status === "Active" ? "🟢" : "⚪"} {ch.name}
                              {ch.ytId && <code style={{ fontSize: 9, marginLeft: 4, color: C.muted }}>{ch.ytId.slice(0, 10)}...</code>}
                            </div>
                          ))}
                          {profile.channels.length > 8 && <span style={{ fontSize: 10, color: C.muted, padding: "4px 6px" }}>+{profile.channels.length - 8} kênh khác</span>}
                        </div>
                      </div>
                    )}

                    {/* ─ Submissions timeline ─ */}
                    {profile.submissions.length > 0 && (
                      <div>
                        <div style={{ fontSize: 9, fontWeight: 600, color: C.muted, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 6 }}>
                          📤 Submissions ({profile.submissions.length})
                        </div>
                        {profile.submissions.slice(0, 5).map(sub => {
                          const si = SUBMISSION_STATES[sub.workflowState] || SUBMISSION_STATES.SUBMITTED;
                          return (
                            <div key={sub.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "4px 0", fontSize: 11 }}>
                              <Pill color={si.color}>{si.emoji}</Pill>
                              <span style={{ color: C.text, flex: 1 }}>{sub.videoTitle}</span>
                              <span style={{ fontSize: 9, color: C.muted }}>{si.label}</span>
                              {si.next.length > 0 && canAdvance(currentUser, sub.workflowState, si.next[0]) && (
                                <button onClick={(e) => { e.stopPropagation(); openAdvance(sub, si.next[0]); }}
                                  style={{ padding: "2px 8px", fontSize: 9, background: C.accent, color: "#FFF", border: "none", borderRadius: 3, cursor: "pointer" }}>
                                  {SUBMISSION_STATES[si.next[0]]?.emoji} Tiếp
                                </button>
                              )}
                            </div>
                          );
                        })}
                        {profile.submissions.length > 5 && <div style={{ fontSize: 10, color: C.muted }}>+{profile.submissions.length - 5} submissions khác</div>}
                      </div>
                    )}
                  </div>
                )}
              </Card>
            );
          })}
        </>
      )}

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* 👤 PENDING USERS — Partner registrations awaiting approval    */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      {tab === "pending-users" && (
        pendingUsers.length === 0 ? (
          <Card style={{ padding: 50, textAlign: "center", color: C.muted }}>✅ Không có đối tác nào đang chờ duyệt</Card>
        ) : (
          <>
            <div style={{ padding: 10, background: C.amberSoft, borderLeft: `3px solid ${C.amber}`, borderRadius: 4, marginBottom: 12, fontSize: 11, color: C.text }}>
              👤 <strong>Đăng ký chờ duyệt</strong> — Khi duyệt, hệ thống tự động tạo/liên kết hồ sơ đối tác trong mục Tổng quan.
            </div>
            <Card style={{ overflow: "hidden" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead style={{ background: C.bgAlt }}><tr>
                  {["Họ tên", "Email", "Công ty", "Phone", "Đăng ký", "Đối tác sẵn có?", "Hành động"].map(h => (
                    <th key={h} style={{ textAlign: "left", fontSize: 9, fontWeight: 600, letterSpacing: "0.14em", textTransform: "uppercase", color: C.muted, padding: "10px 12px" }}>{h}</th>
                  ))}
                </tr></thead>
                <tbody>
                  {pendingUsers.map(u => {
                    const companyMatch = (state.partners || []).find(p =>
                      p.name.toLowerCase() === (u.companyName || "").toLowerCase()
                    );
                    return (
                      <tr key={u.id} style={{ borderTop: `1px solid ${C.borderSoft}` }}>
                        <td style={{ padding: "10px 12px", fontSize: 12, fontWeight: 500, color: C.ink }}>{u.fullName}</td>
                        <td style={{ padding: "10px 12px", fontSize: 11, color: C.text }}>{u.email}</td>
                        <td style={{ padding: "10px 12px", fontSize: 11, color: C.text }}>{u.companyName || "—"}</td>
                        <td style={{ padding: "10px 12px", fontSize: 11, color: C.text }}>{u.phone || "—"}</td>
                        <td style={{ padding: "10px 12px", fontSize: 10, color: C.muted }}>{new Date(u.createdAt).toLocaleString("vi-VN")}</td>
                        <td style={{ padding: "10px 12px" }}>
                          {companyMatch ? (
                            <Pill color="green">✅ {companyMatch.name}</Pill>
                          ) : (
                            <span style={{ fontSize: 10, color: C.amber }}>🆕 Sẽ tạo mới</span>
                          )}
                        </td>
                        <td style={{ padding: "10px 12px" }}>
                          <div style={{ display: "flex", gap: 6 }}>
                            <Btn primary onClick={() => approveUser(u)} style={{ padding: "4px 10px", fontSize: 10 }}>✅ Duyệt + Liên kết</Btn>
                            <Btn ghost onClick={() => rejectUser(u)} style={{ padding: "4px 10px", fontSize: 10, color: C.red }}>Từ chối</Btn>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </Card>
          </>
        )
      )}

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* 🔍 QC QUEUE — Submissions needing QC review                   */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      {tab === "qc-queue" && (
        <>
          <div style={{ padding: 10, background: C.amber + "15", borderLeft: `3px solid ${C.amber}`, borderRadius: 4, marginBottom: 12, fontSize: 11, color: C.text }}>
            🔍 <strong>QC Queue</strong> — Vai trò: <Pill color="amber">QC_REVIEWER</Pill> Kiểm tra video xem có vi phạm chính sách YouTube không. {!canQC && <span style={{ color: C.red }}>⛔ Bạn không có quyền duyệt</span>}
          </div>
          {qcQueue.length === 0 ? (
            <Card style={{ padding: 0 }}>
              <EmptyState icon={Check} title="Hết video chờ duyệt!" description="QC queue trống — chờ partner gửi submission mới." />
            </Card>
          ) : qcQueue.map(renderSubmissionCard)}
        </>
      )}

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* 🛠️ PROVISIONING — QC-approved, awaiting channel creation      */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      {tab === "provision-queue" && (
        <>
          <div style={{ padding: 10, background: C.blue + "15", borderLeft: `3px solid ${C.blue}`, borderRadius: 4, marginBottom: 12, fontSize: 11, color: C.text }}>
            🛠️ <strong>Provisioning Queue</strong> — Vai trò: <Pill color="blue">CHANNEL_CREATOR</Pill> Tạo CMS channel + gán YouTube ID + cấp cho partner. {!canProvision && <span style={{ color: C.red }}>⛔ Bạn không có quyền cấp kênh</span>}
          </div>
          {provisioningQueue.length === 0 ? (
            <Card style={{ padding: 0 }}>
              <EmptyState icon={Check} title="Không có gì cần cấp kênh" description="QC chưa duyệt submission nào — đợi QC review xong." />
            </Card>
          ) : provisioningQueue.map(renderSubmissionCard)}
        </>
      )}

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* 🟢 COMPLETED — Active channels + active user accounts         */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      {tab === "completed" && (
        <>
          {/* Active submissions (channels provisioned) */}
          {activeSubs.length > 0 && (
            <>
              <div style={{ fontSize: 12, fontWeight: 600, color: C.ink, marginBottom: 8 }}>🟢 Kênh đã cấp ({activeSubs.length})</div>
              {activeSubs.map(s => (
                <Card key={s.id} style={{ padding: 12, marginBottom: 6, borderLeft: `3px solid ${C.green}` }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <Pill color="green">🟢 ACTIVE</Pill>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 12, fontWeight: 500, color: C.ink }}>{s.videoTitle}</div>
                      <div style={{ fontSize: 10, color: C.muted }}>
                        {s.submitterName} · YT: <code>{s.provisionedYtId || "—"}</code> · CMS: {s.provisionedCms || "—"} · {s.provisionedAt && new Date(s.provisionedAt).toLocaleString("vi-VN")}
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </>
          )}
          {/* Active partner users */}
          {activePartnerUsers.length > 0 && (
            <>
              <div style={{ fontSize: 12, fontWeight: 600, color: C.ink, marginBottom: 8, marginTop: activeSubs.length > 0 ? 16 : 0 }}>
                ✅ User active ({activePartnerUsers.length})
              </div>
              <Card style={{ overflow: "hidden" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead style={{ background: C.bgAlt }}><tr>
                    {["Họ tên", "Email", "Công ty", "Kênh", "Submissions", "Liên kết", "Từ ngày"].map(h => (
                      <th key={h} style={{ textAlign: "left", fontSize: 9, fontWeight: 600, letterSpacing: "0.14em", textTransform: "uppercase", color: C.muted, padding: "10px 12px" }}>{h}</th>
                    ))}
                  </tr></thead>
                  <tbody>
                    {activePartnerUsers.map(u => {
                      const myCh = (state.channels || []).filter(c => c.submittedBy === u.id || c.partnerEmail === u.email).length;
                      const mySub = (state.videoSubmissions || []).filter(s => s.submittedBy === u.id).length;
                      const linked = (state.partners || []).some(p =>
                        p.linkedUserId === u.id || p.name.toLowerCase() === (u.companyName || "").toLowerCase()
                      );
                      return (
                        <tr key={u.id} style={{ borderTop: `1px solid ${C.borderSoft}` }}>
                          <td style={{ padding: "10px 12px", fontSize: 12, fontWeight: 500, color: C.ink }}>{u.fullName}</td>
                          <td style={{ padding: "10px 12px", fontSize: 11, color: C.text }}>{u.email}</td>
                          <td style={{ padding: "10px 12px", fontSize: 11, color: C.text }}>{u.companyName || "—"}</td>
                          <td style={{ padding: "10px 12px", fontSize: 11, fontFamily: "monospace" }}>{myCh}</td>
                          <td style={{ padding: "10px 12px", fontSize: 11, fontFamily: "monospace" }}>{mySub}</td>
                          <td style={{ padding: "10px 12px" }}>
                            {linked
                              ? <Pill color="green">🔗 Đã liên kết</Pill>
                              : <span style={{ fontSize: 10, color: C.amber }}>⚠️ Chưa liên kết</span>
                            }
                          </td>
                          <td style={{ padding: "10px 12px", fontSize: 10, color: C.muted }}>{u.partnerSince ? new Date(u.partnerSince).toLocaleDateString("vi-VN") : u.approvedAt ? new Date(u.approvedAt).toLocaleDateString("vi-VN") : "—"}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </Card>
            </>
          )}
          {activeSubs.length === 0 && activePartnerUsers.length === 0 && (
            <Card style={{ padding: 0 }}>
              <EmptyState icon={Check} title="Chưa có đối tác hoàn tất" description="Khi partner đăng ký + gửi submission + được cấp kênh, sẽ hiển thị ở đây." />
            </Card>
          )}
        </>
      )}

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* ❌ REJECTED — rejected submissions + rejected users            */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      {tab === "rejected" && (
        <>
          {rejectedUsers.length > 0 && (
            <>
              <div style={{ fontSize: 12, fontWeight: 600, color: C.ink, marginBottom: 8 }}>❌ User bị từ chối ({rejectedUsers.length})</div>
              {rejectedUsers.map(u => (
                <Card key={u.id} style={{ padding: 12, marginBottom: 6, borderLeft: `3px solid ${C.red}` }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <Pill color="red">❌ Rejected</Pill>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 12, fontWeight: 500, color: C.ink }}>{u.fullName}</div>
                      <div style={{ fontSize: 10, color: C.muted }}>{u.email} · {u.companyName || ""} · {u.rejectedAt && new Date(u.rejectedAt).toLocaleString("vi-VN")}</div>
                    </div>
                  </div>
                </Card>
              ))}
            </>
          )}
          {rejectedSubs.length > 0 && (
            <>
              <div style={{ fontSize: 12, fontWeight: 600, color: C.ink, marginBottom: 8, marginTop: rejectedUsers.length > 0 ? 16 : 0 }}>
                ❌ Submission bị từ chối ({rejectedSubs.length})
              </div>
              {rejectedSubs.map(s => (
                <Card key={s.id} style={{ padding: 12, marginBottom: 6, borderLeft: `3px solid ${C.red}` }}>
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                    <Pill color="red">❌ Rejected</Pill>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 12, fontWeight: 500, color: C.ink }}>{s.videoTitle}</div>
                      <div style={{ fontSize: 10, color: C.muted }}>{s.submitterName} ({s.submitterEmail})</div>
                      {s.adminNote && <div style={{ fontSize: 10, color: C.text, marginTop: 3, padding: 5, background: C.redSoft, borderRadius: 3 }}>💬 {s.adminNote}</div>}
                    </div>
                    {/* Allow re-submit */}
                    {canAdvance(currentUser, s.workflowState, "SUBMITTED") && (
                      <Btn ghost onClick={() => openAdvance(s, "SUBMITTED")} style={{ fontSize: 10 }}>📤 Cho gửi lại</Btn>
                    )}
                  </div>
                </Card>
              ))}
            </>
          )}
          {rejectedSubs.length === 0 && rejectedUsers.length === 0 && (
            <Card style={{ padding: 0 }}>
              <EmptyState icon={X} title="Không có gì bị từ chối" />
            </Card>
          )}
        </>
      )}

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* Workflow Advance Modal (shared)                                */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      {advanceModal && (
        <Modal title={`${SUBMISSION_STATES[advanceModal.nextState]?.emoji} Chuyển sang: ${SUBMISSION_STATES[advanceModal.nextState]?.label}`} onClose={() => setAdvanceModal(null)} width={680}>
          <div style={{ padding: 10, background: C.bgAlt, borderRadius: 4, marginBottom: 12, fontSize: 11 }}>
            <strong>Submission:</strong> {advanceModal.sub.videoTitle}<br />
            <strong>Đối tác:</strong> {advanceModal.sub.submitterName} ({advanceModal.sub.submitterEmail})<br />
            <strong>Trạng thái hiện tại:</strong> {SUBMISSION_STATES[advanceModal.sub.workflowState]?.label}
            {advanceModal.sub.storageUrl && (
              <>
                <br /><strong>📁 Kho lưu trữ:</strong>{" "}
                {advanceModal.sub.storageUrl.startsWith("http") ? (
                  <a href={advanceModal.sub.storageUrl} target="_blank" rel="noopener" style={{ color: C.ai }}>{advanceModal.sub.storageUrl}</a>
                ) : <code>{advanceModal.sub.storageUrl}</code>}
              </>
            )}
          </div>

          {/* Inspection Checklist — when approving from QC */}
          {advanceModal.nextState === "QC_APPROVED" && (
            <div style={{ padding: 12, background: C.aiSoft, borderRadius: 5, marginBottom: 12, borderLeft: `3px solid ${C.ai}` }}>
              <div style={{ fontSize: 12, fontWeight: 500, color: C.ai, marginBottom: 8 }}>
                🔍 Inspection Checklist (QC review)
              </div>
              <div style={{ fontSize: 10, color: C.muted, marginBottom: 8 }}>
                ✅ Đánh dấu các tiêu chí đã kiểm tra. Bắt buộc check ≥80% trước khi duyệt.
              </div>
              {[
                { id: "copyright", label: "🎵 Đã kiểm tra bản quyền nhạc/âm thanh" },
                { id: "footage", label: "🎬 Đã kiểm tra footage/video license" },
                { id: "thumbnail", label: "🖼️ Thumbnail không misleading / clickbait" },
                { id: "title", label: "📝 Tiêu đề + description tuân thủ chính sách" },
                { id: "community_guidelines", label: "🛡️ Không vi phạm Community Guidelines" },
                { id: "minor_safety", label: "👶 An toàn cho trẻ em (Made for Kids correct)" },
                { id: "advertiser_friendly", label: "💰 Advertiser-friendly content" },
                { id: "originality", label: "✨ Nội dung gốc / unique value" },
                { id: "storage_verified", label: "📁 Đã xem source files trong kho lưu trữ", required: !!advanceModal.sub.storageUrl },
              ].map(item => (
                <label key={item.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "4px 0", cursor: "pointer", fontSize: 11 }}>
                  <input type="checkbox"
                    checked={!!inspectionChecklist[item.id]}
                    onChange={e => setInspectionChecklist(c => ({ ...c, [item.id]: e.target.checked }))} />
                  <span style={{ color: inspectionChecklist[item.id] ? C.green : C.text }}>{item.label}</span>
                  {item.required && !inspectionChecklist[item.id] && <span style={{ fontSize: 9, color: C.amber }}>(bắt buộc)</span>}
                </label>
              ))}
              <div style={{ marginTop: 8, fontSize: 10, color: C.muted, padding: 6, background: C.card, borderRadius: 3 }}>
                Đã check: <strong>{Object.values(inspectionChecklist).filter(Boolean).length}/9</strong>
                {Object.values(inspectionChecklist).filter(Boolean).length < 8 && (
                  <span style={{ color: C.amber, marginLeft: 6 }}>⚠️ Cần ít nhất 8/9 mục để duyệt</span>
                )}
              </div>
            </div>
          )}

          {/* Provision form (when moving to ACTIVE) */}
          {advanceModal.nextState === "ACTIVE" && (
            <>
              <div style={{ padding: 10, background: C.greenSoft, borderRadius: 4, marginBottom: 12, fontSize: 11, color: C.text }}>
                ✨ <strong>Cấp kênh CMS:</strong> Sẽ tự tạo bản ghi kênh trong hệ thống. Vui lòng nhập YouTube ID + CMS đích.
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 16px" }}>
                <Field label="YouTube Channel ID *">
                  <Input value={provisionForm.ytId || ""} onChange={e => setProvisionForm(f => ({ ...f, ytId: e.target.value }))}
                    placeholder="UCxxxxxxxxxxxxxxxxxxxxxx" style={{ fontFamily: "monospace" }} />
                </Field>
                <Field label="CMS đích">
                  <Select value={provisionForm.cms || ""} onChange={e => setProvisionForm(f => ({ ...f, cms: e.target.value }))}>
                    <option value="">— Chọn CMS —</option>
                    {(state.cmsList || KUDO_CMS_LIST).map(c => <option key={c.id} value={c.name}>{c.name} ({c.currency})</option>)}
                  </Select>
                </Field>
                <Field label="Chủ đề">
                  <Select value={provisionForm.topic || ""} onChange={e => setProvisionForm(f => ({ ...f, topic: e.target.value }))}>
                    <option value="">— Chọn —</option>
                    {KUDO_TOPICS.map(t => <option key={t.id} value={t.name}>{t.name}</option>)}
                  </Select>
                </Field>
              </div>
            </>
          )}

          <Field label="Ghi chú (sẽ gửi cho partner + lưu vào audit log)">
            <textarea value={advanceNote} onChange={e => setAdvanceNote(e.target.value)}
              placeholder={
                advanceModal.nextState.includes("REJECTED") || advanceModal.nextState.includes("FAILED")
                  ? "Lý do từ chối — bắt buộc giải thích cho partner..."
                  : advanceModal.nextState === "ACTIVE"
                    ? "Welcome note cho partner, hướng dẫn sử dụng kênh..."
                    : "Note về quyết định..."
              }
              style={{ width: "100%", minHeight: 80, padding: "8px 10px", fontSize: 11, fontFamily: "inherit", border: `1px solid ${C.border}`, borderRadius: 4 }} />
          </Field>

          {/* Comments thread */}
          <CommentsThread
            state={state} setState={setState} currentUser={currentUser}
            entityType="submission" entityId={advanceModal.sub.id}
            label="💬 Thảo luận giữa QC + Channel Creator + Partner" />

          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 12, paddingTop: 12, borderTop: `1px solid ${C.borderSoft}` }}>
            <Btn ghost onClick={() => setAdvanceModal(null)}>Hủy</Btn>
            <Btn primary onClick={advance}
              disabled={
                (advanceModal.nextState === "ACTIVE" && !provisionForm.ytId) ||
                (advanceModal.nextState === "QC_APPROVED" && Object.values(inspectionChecklist).filter(Boolean).length < 8)
              }>
              {SUBMISSION_STATES[advanceModal.nextState]?.emoji} Xác nhận
            </Btn>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// ─── RBAC & AUDIT VIEW — Permission Matrix + Audit Log + View-as
// SUPER_ADMIN-only: hiểu rõ ai làm được gì, ai đã làm gì
// ═══════════════════════════════════════════════════════════════════
function RBACAuditView({ state, currentUser, toast }) {
  const C = useC();
  const [tab, setTab] = useState("matrix");
  const [filterRole, setFilterRole] = useState("all");
  const [filterAction, setFilterAction] = useState("");
  const [viewAsUser, setViewAsUser] = useState(null);
  const users = lsGet(LS.USERS, []);
  const auditLog = lsGet(LS.AUDIT, []).slice(0, 200);

  if (!can(currentUser, "users.read")) {
    return <div style={{padding:30,textAlign:"center",color:C.red}}>⛔ Chỉ Super Admin được phép xem RBAC + Audit</div>;
  }

  // Group permissions by resource (channels, partners, etc.)
  const groupedPerms = useMemo(() => {
    const groups = new Map();
    Object.entries(PERMS).forEach(([action, allowed]) => {
      const [resource] = action.split(".");
      if (!groups.has(resource)) groups.set(resource, []);
      groups.get(resource).push({ action, allowed });
    });
    return [...groups.entries()].map(([resource, actions]) => ({ resource, actions: actions.sort((a,b)=>a.action.localeCompare(b.action)) }));
  }, []);

  const allRoles = Object.keys(ROLES);
  const visibleRoles = filterRole === "all" ? allRoles : [filterRole];

  // Effective permissions for selected user
  const effectivePerms = viewAsUser ? Object.entries(PERMS).filter(([a]) => can(viewAsUser, a)).map(([a]) => a) : [];

  return (
    <div style={{padding:"20px 28px",overflowY:"auto",height:"100%",background:C.bg}}>
      <div style={{marginBottom:14}}>
        <div style={{fontFamily:"'Fraunces',serif",fontWeight:500,fontSize:22,color:C.ink}}>🔐 RBAC & Audit</div>
        <div style={{fontSize:11,color:C.muted}}>
          Permission Matrix · Audit Log · View-as user · Đảm bảo phân quyền không nhầm lẫn
        </div>
      </div>

      <div style={{display:"flex",gap:6,marginBottom:14,flexWrap:"wrap"}}>
        {[
          { id:"matrix", label:`📊 Permission Matrix` },
          { id:"users-view", label:`👥 User View (${users.length})` },
          { id:"view-as", label:`🎭 View as User` },
          { id:"audit", label:`📜 Audit Log (${auditLog.length})` },
        ].map(t => (
          <button key={t.id} onClick={()=>setTab(t.id)}
            style={{padding:"7px 14px",fontSize:11,fontWeight:500,cursor:"pointer",borderRadius:4,
              background:tab===t.id?C.ink:"transparent",color:tab===t.id?"#FFF":C.text,
              border:`1px solid ${tab===t.id?C.ink:C.border}`}}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Permission Matrix */}
      {tab === "matrix" && (
        <>
          <Card style={{padding:14,marginBottom:14}}>
            <div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"}}>
              <span style={{fontSize:11,color:C.muted}}>Filter role:</span>
              <Select value={filterRole} onChange={e=>setFilterRole(e.target.value)} style={{width:200}}>
                <option value="all">Tất cả {allRoles.length} roles</option>
                {allRoles.map(r => <option key={r} value={r}>{ROLES[r].label}</option>)}
              </Select>
              <span style={{fontSize:11,color:C.muted,marginLeft:14}}>Search action:</span>
              <Input value={filterAction} onChange={e=>setFilterAction(e.target.value)} placeholder="channels, contracts, ..." style={{width:200}}/>
            </div>
          </Card>

          <Card style={{padding:0,overflow:"auto"}}>
            <table style={{width:"100%",borderCollapse:"collapse",fontSize:10}}>
              <thead style={{background:C.bgAlt,position:"sticky",top:0}}>
                <tr>
                  <th style={{textAlign:"left",padding:"8px 10px",fontSize:9,color:C.muted,letterSpacing:"0.14em",textTransform:"uppercase",position:"sticky",left:0,background:C.bgAlt,zIndex:1}}>Action</th>
                  {visibleRoles.map(r => (
                    <th key={r} style={{padding:"8px 6px",fontSize:9,color:C.muted,letterSpacing:"0.1em",textTransform:"uppercase",textAlign:"center",minWidth:70}}>
                      <div style={{transform:"rotate(-45deg)",whiteSpace:"nowrap",height:60,display:"flex",alignItems:"flex-end",justifyContent:"center"}}>
                        {ROLES[r].label.replace(/^[^a-zA-Z]+\s*/, "").slice(0,15)}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {groupedPerms.map(group => (
                  <Fragment key={group.resource}>
                    <tr style={{background:C.bgAlt}}>
                      <td colSpan={visibleRoles.length+1} style={{padding:"6px 10px",fontSize:10,fontWeight:600,color:C.ink,textTransform:"uppercase",letterSpacing:"0.1em"}}>
                        📁 {group.resource}
                      </td>
                    </tr>
                    {group.actions.filter(a => !filterAction || a.action.toLowerCase().includes(filterAction.toLowerCase())).map(a => (
                      <tr key={a.action} style={{borderTop:`1px solid ${C.borderSoft}`}}>
                        <td style={{padding:"6px 10px",fontSize:11,fontFamily:"monospace",color:C.text,position:"sticky",left:0,background:C.card,zIndex:1}}>{a.action}</td>
                        {visibleRoles.map(r => (
                          <td key={r} style={{textAlign:"center",padding:"6px 4px"}}>
                            {a.allowed.includes(r) ? (
                              <span style={{color:C.green,fontWeight:600}}>✓</span>
                            ) : (
                              <span style={{color:C.borderSoft}}>·</span>
                            )}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </Card>
          <div style={{marginTop:10,padding:10,background:C.bgAlt,borderRadius:5,fontSize:10,color:C.muted}}>
            💡 <strong>Cách đọc:</strong> ✓ xanh = role đó có quyền · · = không có. Tổng {Object.keys(PERMS).length} permissions × {allRoles.length} roles.
          </div>
        </>
      )}

      {/* Users grouped by role */}
      {tab === "users-view" && (
        <div>
          {allRoles.map(role => {
            const usersInRole = users.filter(u => u.role === role || u.roles?.includes(role));
            if (usersInRole.length === 0) return null;
            const info = ROLES[role];
            return (
              <Card key={role} style={{padding:14,marginBottom:8,borderLeft:`3px solid ${C[info.color]||C.muted}`}}>
                <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:8}}>
                  <Pill color={info.color}>{info.label}</Pill>
                  <span style={{fontSize:11,color:C.muted}}>{usersInRole.length} user(s)</span>
                </div>
                <div style={{fontSize:10,color:C.muted,marginBottom:8,fontStyle:"italic"}}>{info.desc}</div>
                <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
                  {usersInRole.map(u => (
                    <div key={u.id} style={{padding:"6px 10px",background:C.bgAlt,borderRadius:4,fontSize:11}}>
                      <strong>{u.fullName}</strong>
                      <span style={{color:C.muted,marginLeft:6}}>{u.email}</span>
                      {u.status !== "Active" && <Pill color="amber">{u.status}</Pill>}
                    </div>
                  ))}
                </div>
              </Card>
            );
          })}
          {users.length === 0 && <EmptyState icon={Users} title="Chưa có user nào"/>}
        </div>
      )}

      {/* View as user */}
      {tab === "view-as" && (
        <>
          <Card style={{padding:14,marginBottom:14,borderLeft:`3px solid ${C.amber}`}}>
            <div style={{fontSize:12,fontWeight:500,color:C.ink,marginBottom:6}}>🎭 Simulate user permissions</div>
            <div style={{fontSize:11,color:C.muted,marginBottom:10}}>
              Chọn 1 user → xem họ có quyền gì (read-only simulation, không đổi session thật).
            </div>
            <Select value={viewAsUser?.id||""} onChange={e=>{
              const u = users.find(x => x.id === e.target.value);
              setViewAsUser(u || null);
            }} style={{width:380}}>
              <option value="">— Chọn user —</option>
              {users.map(u => <option key={u.id} value={u.id}>{u.fullName} · {u.email} · {u.role}</option>)}
            </Select>
          </Card>

          {viewAsUser && (
            <Card style={{padding:14}}>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14,marginBottom:14}}>
                <div>
                  <div style={{fontSize:9,color:C.muted,letterSpacing:"0.14em",textTransform:"uppercase",marginBottom:4}}>User</div>
                  <div style={{fontSize:13,fontWeight:500}}>{viewAsUser.fullName}</div>
                  <div style={{fontSize:10,color:C.muted}}>{viewAsUser.email}</div>
                </div>
                <div>
                  <div style={{fontSize:9,color:C.muted,letterSpacing:"0.14em",textTransform:"uppercase",marginBottom:4}}>Role(s)</div>
                  <Pill color={ROLES[viewAsUser.role]?.color||"gray"}>{ROLES[viewAsUser.role]?.label||viewAsUser.role}</Pill>
                  {viewAsUser.roles?.map(r => <Pill key={r} color={ROLES[r]?.color||"gray"}>{ROLES[r]?.label||r}</Pill>)}
                </div>
                <div>
                  <div style={{fontSize:9,color:C.muted,letterSpacing:"0.14em",textTransform:"uppercase",marginBottom:4}}>Status</div>
                  <Pill color={viewAsUser.status==="Active"?"green":"amber"}>{viewAsUser.status}</Pill>
                </div>
                <div>
                  <div style={{fontSize:9,color:C.muted,letterSpacing:"0.14em",textTransform:"uppercase",marginBottom:4}}>Effective permissions</div>
                  <div style={{fontSize:14,fontWeight:500,color:C.ink}}>{effectivePerms.length} / {Object.keys(PERMS).length}</div>
                </div>
              </div>

              <div style={{fontSize:11,fontWeight:500,color:C.ink,marginBottom:8}}>📋 Quyền user này có:</div>
              <div style={{display:"flex",flexWrap:"wrap",gap:4}}>
                {effectivePerms.length === 0 ? (
                  <span style={{fontSize:11,color:C.muted}}>(không có quyền nào)</span>
                ) : effectivePerms.map(p => (
                  <code key={p} style={{padding:"3px 8px",fontSize:10,background:C.greenSoft,color:C.green,borderRadius:3}}>{p}</code>
                ))}
              </div>

              <div style={{fontSize:11,fontWeight:500,color:C.ink,marginBottom:8,marginTop:14}}>🚫 Quyền user này KHÔNG có:</div>
              <div style={{display:"flex",flexWrap:"wrap",gap:4}}>
                {Object.keys(PERMS).filter(p => !effectivePerms.includes(p)).map(p => (
                  <code key={p} style={{padding:"3px 8px",fontSize:10,background:C.bgAlt,color:C.muted,borderRadius:3}}>{p}</code>
                ))}
              </div>
            </Card>
          )}
        </>
      )}

      {/* Audit Log */}
      {tab === "audit" && (
        <>
          <Card style={{padding:14,marginBottom:14}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <div style={{fontSize:11,color:C.muted}}>
                📜 {auditLog.length} actions logged · 200 most recent
              </div>
              <Btn ghost icon={Download} onClick={()=>{
                const csv = "Timestamp,Action,UserID,Detail\n" + auditLog.map(l =>
                  `"${l.timestamp}","${l.action}","${l.userId}","${(l.detail||"").replace(/"/g,'""')}"`
                ).join("\n");
                const blob = new Blob([csv], { type: "text/csv" });
                const a = document.createElement("a");
                a.href = URL.createObjectURL(blob);
                a.download = `audit-log-${new Date().toISOString().slice(0,10)}.csv`;
                a.click();
              }}>Export CSV</Btn>
            </div>
          </Card>
          <Card style={{padding:0,overflow:"hidden"}}>
            {auditLog.length === 0 ? (
              <EmptyState icon={History} title="Chưa có audit log"/>
            ) : (
              <table style={{width:"100%",borderCollapse:"collapse"}}>
                <thead style={{background:C.bgAlt}}>
                  <tr>{["Time","Action","User","Detail"].map(h => (
                    <th key={h} style={{textAlign:"left",fontSize:9,fontWeight:600,letterSpacing:"0.14em",textTransform:"uppercase",color:C.muted,padding:"10px 12px"}}>{h}</th>
                  ))}</tr>
                </thead>
                <tbody>
                  {auditLog.map((l,i) => {
                    const u = users.find(x => x.id === l.userId);
                    const isCritical = ["DATA_WIPE","USER_DELETED","DELETE_CHANNEL","ROLE_CHANGED"].some(k => l.action?.includes(k));
                    return (
                      <tr key={i} style={{borderTop:`1px solid ${C.borderSoft}`,background:isCritical?`${C.red}10`:"transparent"}}>
                        <td style={{padding:"7px 12px",fontSize:10,color:C.muted,fontFamily:"monospace",whiteSpace:"nowrap"}}>{new Date(l.timestamp).toLocaleString("vi-VN",{hour12:false})}</td>
                        <td style={{padding:"7px 12px"}}><Pill color={isCritical?"red":"blue"}>{l.action}</Pill></td>
                        <td style={{padding:"7px 12px",fontSize:11}}>{u?.fullName || l.userId || "system"}</td>
                        <td style={{padding:"7px 12px",fontSize:10,color:C.muted}}>{l.detail||"—"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </Card>
        </>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// ─── PARTNER COMMUNICATIONS — Policy updates + Violation alerts ──
// ═══════════════════════════════════════════════════════════════════
function PartnerCommsView({ state, setState, currentUser, toast, confirm }) {
  const C = useC();
  const [tab, setTab] = useState("policy");
  const policyUpdates = state.policyUpdates || [];
  const partnerAlerts = state.partnerAlerts || [];
  const channels = state.channels || [];
  const users = lsGet(LS.USERS, []);
  const partnerUsers = users.filter(u => u.role === "PARTNER" && u.status === "Active");

  const canSend = can(currentUser, "violations.edit") || currentUser.role === "ADMIN" || currentUser.role === "SUPER_ADMIN";

  // Policy modal
  const [policyModal, setPolicyModal] = useState(null);
  const [policyForm, setPolicyForm] = useState({});

  const openAddPolicy = () => {
    setPolicyForm({
      title: "",
      category: "MONETIZATION",
      summary: "",
      details: "",
      effectiveDate: new Date().toISOString().slice(0,10),
      sourceUrl: "",
      severity: "info", // info | warning | critical
      audience: "all", // all | by_topic | specific_partners
      audienceTopics: [],
      audiencePartners: [],
    });
    setPolicyModal("add");
  };

  const savePolicy = () => {
    if (!policyForm.title || !policyForm.summary) { toast?.("Cần điền tiêu đề + tóm tắt", "warning"); return; }
    const newPolicy = {
      id: `POL${Date.now()}`,
      ...policyForm,
      publishedBy: currentUser.id,
      publishedByEmail: currentUser.email,
      publishedAt: new Date().toISOString(),
      readBy: [],
    };
    setState(s => ({ ...s, policyUpdates: [newPolicy, ...(s.policyUpdates||[])] }));
    toast?.(`✅ Đã đăng "${policyForm.title}"`, "success");
    setPolicyModal(null);
  };

  const delPolicy = async (p) => {
    const ok = await (confirm?.({ title:"Xóa thông báo?", message:`Xóa "${p.title}"?`, danger:true }) || Promise.resolve(window.confirm(`Xóa "${p.title}"?`)));
    if (!ok) return;
    setState(s => ({ ...s, policyUpdates: (s.policyUpdates||[]).filter(x => x.id !== p.id) }));
    toast?.("Đã xóa", "info");
  };

  // Alert modal — gửi cảnh báo vi phạm tới partner cụ thể
  const [alertModal, setAlertModal] = useState(null);
  const [alertForm, setAlertForm] = useState({});

  const openSendAlert = () => {
    setAlertForm({
      partnerEmail: partnerUsers[0]?.email || "",
      partnerId: partnerUsers[0]?.id || "",
      channelId: "",
      severity: "warning",
      issueType: "POLICY_VIOLATION",
      title: "",
      description: "",
      requiredAction: "",
      deadline: new Date(Date.now() + 7*86400000).toISOString().slice(0,10), // +7 days
      videoUrl: "",
    });
    setAlertModal("add");
  };

  const sendAlert = () => {
    if (!alertForm.partnerEmail || !alertForm.title || !alertForm.requiredAction) {
      toast?.("Cần nhập đối tác, tiêu đề và hành động yêu cầu", "warning");
      return;
    }
    const partner = partnerUsers.find(u => u.email === alertForm.partnerEmail);
    const ch = alertForm.channelId ? channels.find(c => c.id === alertForm.channelId) : null;
    const newAlert = {
      id: `ALT${Date.now()}`,
      ...alertForm,
      partnerName: partner?.fullName,
      channelName: ch?.name,
      channelYtId: ch?.ytId,
      status: "pending", // pending | acknowledged | resolved | escalated
      sentBy: currentUser.id,
      sentByEmail: currentUser.email,
      sentAt: new Date().toISOString(),
      acknowledgedAt: null,
      resolvedAt: null,
      partnerResponse: "",
    };
    setState(s => ({ ...s, partnerAlerts: [newAlert, ...(s.partnerAlerts||[])] }));
    toast?.(`📤 Đã gửi cảnh báo tới ${partner?.fullName || alertForm.partnerEmail}`, "success");
    setAlertModal(null);
  };

  // Severity colors
  const sevColor = (s) => s === "critical" ? "red" : s === "warning" ? "amber" : "blue";

  // Stats for header
  const unreadPolicyCount = policyUpdates.filter(p => p.severity === "critical").length;
  const pendingAlerts = partnerAlerts.filter(a => a.status === "pending").length;

  return (
    <div style={{padding:"20px 28px",overflowY:"auto",height:"100%",background:C.bg}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14,flexWrap:"wrap",gap:8}}>
        <div>
          <div style={{fontFamily:"'Fraunces',serif",fontWeight:500,fontSize:22,color:C.ink}}>📢 Thông báo Partners</div>
          <div style={{fontSize:11,color:C.muted}}>
            {policyUpdates.length} chính sách đã đăng · {partnerAlerts.length} cảnh báo gửi · {pendingAlerts} chưa xử lý
          </div>
        </div>
        <div style={{display:"flex",gap:6}}>
          {canSend && (
            <>
              <Btn ghost icon={Bell} onClick={openSendAlert}>Gửi cảnh báo vi phạm</Btn>
              <Btn primary icon={Plus} onClick={openAddPolicy}>Đăng chính sách mới</Btn>
            </>
          )}
        </div>
      </div>

      <div style={{display:"flex",gap:6,marginBottom:14}}>
        {[
          { id:"policy", label:`📜 Chính sách YT (${policyUpdates.length})`, color: unreadPolicyCount>0?C.red:null },
          { id:"alerts", label:`🚨 Cảnh báo Partners (${partnerAlerts.length})`, color: pendingAlerts>0?C.amber:null },
        ].map(t => (
          <button key={t.id} onClick={()=>setTab(t.id)}
            style={{padding:"7px 14px",fontSize:11,fontWeight:500,cursor:"pointer",borderRadius:4,
              background:tab===t.id?C.ink:"transparent",color:tab===t.id?"#FFF":C.text,
              border:`1px solid ${tab===t.id?C.ink:t.color||C.border}`}}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Policy Updates tab */}
      {tab === "policy" && (
        policyUpdates.length === 0 ? (
          <Card style={{padding:0}}>
            <EmptyState icon={BookOpen} title="Chưa có chính sách nào" description="Đăng cập nhật chính sách YouTube để partners biết và tuân thủ."/>
          </Card>
        ) : policyUpdates.map(p => (
          <Card key={p.id} style={{padding:14,marginBottom:8,borderLeft:`3px solid ${C[sevColor(p.severity)]||C.blue}`}}>
            <div style={{display:"flex",alignItems:"flex-start",gap:10}}>
              <Pill color={sevColor(p.severity)}>{p.severity==="critical"?"🚨":p.severity==="warning"?"⚠️":"ℹ️"} {p.severity}</Pill>
              <div style={{flex:1}}>
                <div style={{fontSize:13,fontWeight:500,color:C.ink}}>{p.title}</div>
                <div style={{fontSize:10,color:C.muted,marginTop:2}}>
                  📁 {p.category} · 📅 hiệu lực {p.effectiveDate} · Đăng {new Date(p.publishedAt).toLocaleString("vi-VN")} bởi {p.publishedByEmail}
                </div>
                <div style={{fontSize:11,color:C.text,marginTop:6,padding:6,background:C.bgAlt,borderRadius:3}}>{p.summary}</div>
                {p.details && (
                  <details style={{marginTop:6,fontSize:10,color:C.muted}}>
                    <summary style={{cursor:"pointer",color:C.accent}}>Xem chi tiết</summary>
                    <div style={{marginTop:6,padding:8,background:C.bgAlt,borderRadius:3,whiteSpace:"pre-wrap",color:C.text}}>{p.details}</div>
                  </details>
                )}
                {p.sourceUrl && (
                  <a href={p.sourceUrl} target="_blank" rel="noopener" style={{fontSize:10,color:C.accent,display:"inline-block",marginTop:6}}>🔗 Source: {p.sourceUrl.slice(0,80)}</a>
                )}
                <div style={{fontSize:9,color:C.muted,marginTop:6}}>
                  📊 {p.readBy?.length||0} partner đã đọc · 🎯 audience: {p.audience}
                </div>
              </div>
              {canSend && (
                <button onClick={()=>delPolicy(p)} title="Xóa" style={{background:"none",border:"none",cursor:"pointer",padding:4}}>
                  <Trash2 size={12} style={{color:C.red}}/>
                </button>
              )}
            </div>
          </Card>
        ))
      )}

      {/* Partner Alerts tab */}
      {tab === "alerts" && (
        partnerAlerts.length === 0 ? (
          <Card style={{padding:0}}>
            <EmptyState icon={AlertTriangle} title="Chưa có cảnh báo nào" description="Khi phát hiện vi phạm, gửi alert tới partner kèm link kênh + hành động yêu cầu."/>
          </Card>
        ) : partnerAlerts.map(a => (
          <Card key={a.id} style={{padding:14,marginBottom:8,borderLeft:`3px solid ${C[sevColor(a.severity)]||C.amber}`}}>
            <div style={{display:"flex",alignItems:"flex-start",gap:10}}>
              <Pill color={sevColor(a.severity)}>{a.severity==="critical"?"🚨":"⚠️"} {a.issueType}</Pill>
              <div style={{flex:1}}>
                <div style={{fontSize:13,fontWeight:500,color:C.ink}}>{a.title}</div>
                <div style={{fontSize:10,color:C.muted,marginTop:2}}>
                  → <strong>{a.partnerName||a.partnerEmail}</strong>
                  {a.channelName && ` · 📺 ${a.channelName}`}
                  {" · "}gửi {new Date(a.sentAt).toLocaleString("vi-VN")}
                </div>
                <div style={{fontSize:11,color:C.text,marginTop:6,padding:6,background:C.bgAlt,borderRadius:3}}>📝 {a.description}</div>
                <div style={{fontSize:11,color:C.text,marginTop:4,padding:6,background:`${C[sevColor(a.severity)]}15`,borderRadius:3}}>
                  ⚡ <strong>Yêu cầu:</strong> {a.requiredAction} <span style={{color:C.red}}>(Hạn: {a.deadline})</span>
                </div>
                {a.videoUrl && <a href={a.videoUrl} target="_blank" rel="noopener" style={{fontSize:10,color:C.accent,marginTop:4,display:"inline-block"}}>🎬 Video: {a.videoUrl}</a>}
                {a.partnerResponse && (
                  <div style={{marginTop:6,padding:6,background:C.greenSoft,borderRadius:3,fontSize:11}}>
                    💬 <strong>Partner phản hồi:</strong> {a.partnerResponse}
                  </div>
                )}
              </div>
              <Pill color={a.status==="resolved"?"green":a.status==="acknowledged"?"blue":a.status==="escalated"?"red":"amber"}>{a.status}</Pill>
            </div>
          </Card>
        ))
      )}

      {/* Policy modal */}
      {policyModal === "add" && (
        <Modal title="📜 Đăng chính sách YouTube mới" onClose={()=>setPolicyModal(null)} width={680}>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0 16px"}}>
            <Field label="Tiêu đề *">
              <Input value={policyForm.title||""} onChange={e=>setPolicyForm(f=>({...f,title:e.target.value}))} placeholder="VD: Cập nhật chính sách Made for Kids 2026"/>
            </Field>
            <Field label="Mức độ">
              <Select value={policyForm.severity||"info"} onChange={e=>setPolicyForm(f=>({...f,severity:e.target.value}))}>
                <option value="info">ℹ️ Thông tin</option>
                <option value="warning">⚠️ Cảnh báo</option>
                <option value="critical">🚨 Khẩn cấp</option>
              </Select>
            </Field>
            <Field label="Danh mục">
              <Select value={policyForm.category||"MONETIZATION"} onChange={e=>setPolicyForm(f=>({...f,category:e.target.value}))}>
                <option value="MONETIZATION">💰 Monetization</option>
                <option value="COPYRIGHT">📜 Copyright / Content ID</option>
                <option value="COMMUNITY">👥 Community Guidelines</option>
                <option value="MADE_FOR_KIDS">👶 Made for Kids</option>
                <option value="ADVERTISER">💵 Advertiser-friendly</option>
                <option value="ALGORITHM">🔧 Algorithm / Reach</option>
                <option value="OTHER">📌 Khác</option>
              </Select>
            </Field>
            <Field label="Ngày hiệu lực">
              <Input type="date" value={policyForm.effectiveDate||""} onChange={e=>setPolicyForm(f=>({...f,effectiveDate:e.target.value}))}/>
            </Field>
          </div>
          <Field label="Tóm tắt 1-2 dòng (Partner sẽ thấy)">
            <textarea value={policyForm.summary||""} onChange={e=>setPolicyForm(f=>({...f,summary:e.target.value}))}
              placeholder="VD: YouTube siết kiểm soát Made for Kids — kênh nào nhiều subs trẻ em sẽ bị disable comment + giảm reach"
              style={{width:"100%",minHeight:50,padding:"8px 10px",fontSize:11,fontFamily:"inherit",border:`1px solid ${C.border}`,borderRadius:4}}/>
          </Field>
          <Field label="Chi tiết đầy đủ (optional)">
            <textarea value={policyForm.details||""} onChange={e=>setPolicyForm(f=>({...f,details:e.target.value}))}
              placeholder="Giải thích chi tiết, các điểm cần lưu ý, hành động partner cần thực hiện..."
              style={{width:"100%",minHeight:100,padding:"8px 10px",fontSize:11,fontFamily:"inherit",border:`1px solid ${C.border}`,borderRadius:4}}/>
          </Field>
          <Field label="Link nguồn (YT official, Creator Insider...)">
            <Input value={policyForm.sourceUrl||""} onChange={e=>setPolicyForm(f=>({...f,sourceUrl:e.target.value}))} placeholder="https://support.google.com/youtube/..."/>
          </Field>
          <div style={{display:"flex",justifyContent:"flex-end",gap:8,marginTop:14,paddingTop:14,borderTop:`1px solid ${C.borderSoft}`}}>
            <Btn ghost onClick={()=>setPolicyModal(null)}>Hủy</Btn>
            <Btn primary onClick={savePolicy} icon={Send}>Đăng</Btn>
          </div>
        </Modal>
      )}

      {/* Send alert modal */}
      {alertModal === "add" && (
        <Modal title="🚨 Gửi cảnh báo vi phạm tới Partner" onClose={()=>setAlertModal(null)} width={720}>
          <div style={{padding:10,background:C.amberSoft,borderRadius:4,marginBottom:12,fontSize:11}}>
            ⚠️ Cảnh báo này sẽ hiện trong <strong>Partner Portal</strong> của partner được chọn, kèm link kênh + deadline xử lý.
          </div>

          {/* 📋 Quick templates */}
          <div style={{padding:10,background:C.bgAlt,borderRadius:4,marginBottom:12}}>
            <div style={{fontSize:11,fontWeight:500,color:C.ink,marginBottom:6}}>📋 Chọn template nhanh:</div>
            <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
              {VIOLATION_ALERT_TEMPLATES.map(tpl => (
                <button key={tpl.id} onClick={()=>{
                  setAlertForm(f => ({
                    ...f,
                    severity: tpl.severity,
                    issueType: tpl.issueType,
                    title: tpl.title,
                    description: tpl.description,
                    requiredAction: tpl.requiredAction,
                    deadline: new Date(Date.now() + tpl.deadlineDays*86400000).toISOString().slice(0,10),
                  }));
                  toast?.(`📋 Đã áp dụng template "${tpl.label}"`, "success");
                }}
                  style={{padding:"5px 11px",fontSize:10,background:"transparent",border:`1px solid ${C.border}`,borderRadius:3,cursor:"pointer"}}>
                  {tpl.label}
                </button>
              ))}
            </div>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0 16px"}}>
            <Field label="Partner *">
              <Select value={alertForm.partnerEmail||""} onChange={e=>{
                const p = partnerUsers.find(u => u.email === e.target.value);
                setAlertForm(f=>({...f, partnerEmail: e.target.value, partnerId: p?.id || ""}));
              }}>
                <option value="">— Chọn partner —</option>
                {partnerUsers.map(u => <option key={u.id} value={u.email}>{u.fullName} ({u.companyName||u.email})</option>)}
              </Select>
            </Field>
            <Field label="Kênh liên quan">
              <Select value={alertForm.channelId||""} onChange={e=>setAlertForm(f=>({...f,channelId:e.target.value}))}>
                <option value="">— Tất cả/None —</option>
                {channels.filter(c => alertForm.partnerEmail ? c.partnerEmail === alertForm.partnerEmail || c.partner === partnerUsers.find(u=>u.email===alertForm.partnerEmail)?.companyName : true).map(c => (
                  <option key={c.id} value={c.id}>{c.name} ({c.ytId})</option>
                ))}
              </Select>
            </Field>
            <Field label="Mức độ">
              <Select value={alertForm.severity||"warning"} onChange={e=>setAlertForm(f=>({...f,severity:e.target.value}))}>
                <option value="warning">⚠️ Cảnh báo</option>
                <option value="critical">🚨 Khẩn cấp (24h)</option>
                <option value="info">ℹ️ Thông tin</option>
              </Select>
            </Field>
            <Field label="Loại vi phạm">
              <Select value={alertForm.issueType||"POLICY_VIOLATION"} onChange={e=>setAlertForm(f=>({...f,issueType:e.target.value}))}>
                <option value="POLICY_VIOLATION">Vi phạm chính sách</option>
                <option value="COPYRIGHT_CLAIM">Copyright Claim</option>
                <option value="DEMONETIZED">Demonetized</option>
                <option value="MISLEADING">Nội dung gây hiểu lầm</option>
                <option value="QUALITY">Chất lượng nội dung</option>
                <option value="STRIKE_RISK">Nguy cơ strike</option>
                <option value="OTHER">Khác</option>
              </Select>
            </Field>
          </div>
          <Field label="Tiêu đề *">
            <Input value={alertForm.title||""} onChange={e=>setAlertForm(f=>({...f,title:e.target.value}))} placeholder="VD: Video XYZ vi phạm chính sách Made for Kids"/>
          </Field>
          <Field label="Mô tả chi tiết">
            <textarea value={alertForm.description||""} onChange={e=>setAlertForm(f=>({...f,description:e.target.value}))}
              placeholder="Giải thích vi phạm cụ thể là gì..."
              style={{width:"100%",minHeight:80,padding:"8px 10px",fontSize:11,fontFamily:"inherit",border:`1px solid ${C.border}`,borderRadius:4}}/>
          </Field>
          <Field label="Hành động yêu cầu Partner làm *">
            <textarea value={alertForm.requiredAction||""} onChange={e=>setAlertForm(f=>({...f,requiredAction:e.target.value}))}
              placeholder="VD: Edit video — bỏ scene 0:30-1:20 + sửa thumbnail + tag #ChildSafe → re-upload trong 7 ngày"
              style={{width:"100%",minHeight:60,padding:"8px 10px",fontSize:11,fontFamily:"inherit",border:`1px solid ${C.border}`,borderRadius:4}}/>
          </Field>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0 16px"}}>
            <Field label="Deadline xử lý">
              <Input type="date" value={alertForm.deadline||""} onChange={e=>setAlertForm(f=>({...f,deadline:e.target.value}))}/>
            </Field>
            <Field label="Link video/evidence">
              <Input value={alertForm.videoUrl||""} onChange={e=>setAlertForm(f=>({...f,videoUrl:e.target.value}))} placeholder="https://..."/>
            </Field>
          </div>
          <div style={{display:"flex",justifyContent:"flex-end",gap:8,marginTop:14,paddingTop:14,borderTop:`1px solid ${C.borderSoft}`}}>
            <Btn ghost onClick={()=>setAlertModal(null)}>Hủy</Btn>
            <Btn primary onClick={sendAlert} icon={Send} danger={alertForm.severity==="critical"}>Gửi cảnh báo</Btn>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// ─── NOTIFICATION CENTER — Bell icon dropdown + browser push ──────
// ═══════════════════════════════════════════════════════════════════
function NotificationBell({ tasks: tasksProp, state, currentUser, onNavigate }) {
  const C = useC();
  const [open, setOpen] = useState(false);
  // Use pre-computed tasks if provided (perf: avoid double work), else compute
  const tasks = useMemo(() => tasksProp || (state && currentUser ? computeInboxTasks(state, currentUser) : []), [tasksProp, state, currentUser]);
  const lastSeen = lsGet("meridian-v51-notif-seen", 0);
  const unreadTasks = tasks.filter(t => true); // all tasks count as unread until viewed
  const unreadHigh = tasks.filter(t => t.urgency === "high").length;
  const dropRef = useRef(null);

  // Click outside to close
  useEffect(() => {
    if (!open) return;
    const handle = (e) => {
      if (dropRef.current && !dropRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [open]);

  const markAllSeen = () => {
    lsSet("meridian-v51-notif-seen", Date.now());
    setOpen(false);
  };

  // Browser push notification when high-severity new tasks arrive
  useEffect(() => {
    if (!unreadHigh || !("Notification" in window)) return;
    const notifKey = `notif-pushed-${tasks.filter(t=>t.urgency==="high").map(t=>t.id).join(",")}`;
    const lastPushed = lsGet(notifKey, 0);
    if (Date.now() - lastPushed < 60*60*1000) return; // throttle 1h
    if (Notification.permission === "granted") {
      new Notification(`Meridian: ${unreadHigh} task khẩn`, {
        body: tasks.filter(t=>t.urgency==="high").slice(0,2).map(t=>t.title).join("\n"),
        icon: "/favicon.ico",
        tag: "meridian-urgent",
      });
      lsSet(notifKey, Date.now());
    }
  }, [unreadHigh]);

  const requestPermission = async () => {
    if (!("Notification" in window)) return;
    const result = await Notification.requestPermission();
    if (result === "granted") {
      new Notification("Meridian", { body: "Push notification đã bật ✅", icon: "/favicon.ico" });
    }
  };

  return (
    <div ref={dropRef} style={{position:"relative"}}>
      <button onClick={()=>setOpen(o=>!o)}
        style={{position:"relative",background:"none",border:"none",cursor:"pointer",padding:6,display:"flex",alignItems:"center",borderRadius:6,
          ...(open ? { background: "#1F2937" } : {})}}>
        <Bell size={16} style={{color: unreadHigh > 0 ? C.amber : "#9CA3AF"}}/>
        {tasks.length > 0 && (
          <span style={{position:"absolute",top:0,right:0,minWidth:14,height:14,padding:"0 4px",
            background: unreadHigh > 0 ? C.red : C.accent, color:"#FFF", borderRadius:8,
            fontSize:9, fontWeight:600, display:"flex", alignItems:"center", justifyContent:"center"}}>
            {tasks.length > 99 ? "99+" : tasks.length}
          </span>
        )}
      </button>

      {open && (
        <div style={{position:"absolute",right:0,top:34,width:380,maxHeight:500,overflowY:"auto",
          background:C.card, border:`1px solid ${C.border}`, borderRadius:8, boxShadow:"0 10px 30px rgba(0,0,0,0.15)",
          zIndex:1000}}>
          <div style={{padding:"12px 14px",borderBottom:`1px solid ${C.borderSoft}`,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
            <div>
              <div style={{fontSize:12,fontWeight:500,color:C.ink}}>📥 Notifications</div>
              <div style={{fontSize:9,color:C.muted}}>{tasks.length} tasks pending</div>
            </div>
            <div style={{display:"flex",gap:4}}>
              {("Notification" in window) && Notification.permission === "default" && (
                <button onClick={requestPermission}
                  style={{padding:"3px 8px",fontSize:9,background:C.aiSoft,color:C.ai,border:`1px solid ${C.ai}33`,borderRadius:3,cursor:"pointer"}}>
                  Bật push
                </button>
              )}
              <button onClick={markAllSeen}
                style={{padding:"3px 8px",fontSize:9,background:"transparent",color:C.muted,border:`1px solid ${C.border}`,borderRadius:3,cursor:"pointer"}}>
                Mark seen
              </button>
            </div>
          </div>

          {tasks.length === 0 ? (
            <div style={{padding:30,textAlign:"center",color:C.muted}}>
              <Check size={28} style={{opacity:0.4,marginBottom:6}}/>
              <div style={{fontSize:12}}>Hết task rồi 🎉</div>
            </div>
          ) : (
            <>
              {tasks.slice(0, 10).map(t => (
                <button key={t.id}
                  onClick={()=>{ onNavigate(t.target); setOpen(false); }}
                  style={{display:"block",width:"100%",padding:"10px 14px",border:"none",borderTop:`1px solid ${C.borderSoft}`,
                    background:"transparent",cursor:"pointer",textAlign:"left",
                    borderLeft:`3px solid ${t.urgency==="high"?C.red:t.urgency==="medium"?C.amber:C.green}`}}
                  onMouseEnter={e=>e.currentTarget.style.background=C.bgAlt}
                  onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                  <div style={{display:"flex",alignItems:"flex-start",gap:8}}>
                    <span style={{fontSize:18}}>{t.icon}</span>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontSize:11,fontWeight:500,color:C.ink,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{t.title}</div>
                      <div style={{fontSize:9,color:C.muted,marginTop:2,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{t.subtitle}</div>
                    </div>
                  </div>
                </button>
              ))}
              {tasks.length > 10 && (
                <div style={{padding:10,textAlign:"center",borderTop:`1px solid ${C.borderSoft}`}}>
                  <button onClick={()=>{ onNavigate("inbox"); setOpen(false); }}
                    style={{fontSize:10,color:C.accent,background:"none",border:"none",cursor:"pointer"}}>
                    Xem tất cả ({tasks.length}) →
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// ─── AI Strategic View — Proactive recommendations + topic strategy
// ═══════════════════════════════════════════════════════════════════
function AIStrategicView({ state, setState, currentUser, callAI, toast, onNavigate }) {
  const C = useC();
  const [aiSummary, setAiSummary] = useState(() => lsGet("meridian-v51-ai-strategy-cache", null));
  const [aiLoading, setAiLoading] = useState(false);

  const anomalies = useMemo(() => detectAnomalies(state), [state]);
  const topicStrategy = useMemo(() => computeTopicStrategy(state), [state]);

  const highSeverity = anomalies.filter(a => a.severity === "high");
  const mediumSeverity = anomalies.filter(a => a.severity === "medium");

  const expandTopics = topicStrategy.filter(t => t.recommendation === "EXPAND");
  const dropTopics = topicStrategy.filter(t => t.recommendation === "DROP");
  const reviewTopics = topicStrategy.filter(t => t.recommendation === "REVIEW");

  // Run AI strategic analysis
  const runStrategy = async () => {
    setAiLoading(true);
    const summary = `MCN Data Analysis Request:
- Channels: ${state.channels?.length||0}
- Anomalies detected: ${anomalies.length} (${highSeverity.length} high)
- Topics analyzed: ${topicStrategy.length}
- Topics flagged DROP: ${dropTopics.map(t=>t.name).join(", ")||"none"}
- Topics flagged EXPAND: ${expandTopics.map(t=>t.name).join(", ")||"none"}
- Topics flagged REVIEW: ${reviewTopics.map(t=>t.name).join(", ")||"none"}

TOP 3 ANOMALIES:
${anomalies.slice(0,3).map(a => `- [${a.severity.toUpperCase()}] ${a.title}: ${a.description}`).join("\n")}

TOPIC PERFORMANCE:
${topicStrategy.slice(0,8).map(t => `- ${t.name}: ${t.channels} kênh, $${t.revenue.toFixed(0)} doanh thu, ${(t.demoRate*100).toFixed(0)}% demo, score ${t.strategyScore}, rec: ${t.recommendation}`).join("\n")}`;

    const prompt = `Phân tích trên đây cho MCN. Đưa ra:

1. **TÓM TẮT SỨC KHỎE** (3 dòng — tình hình tổng thể)
2. **TOP 3 HÀNH ĐỘNG ƯU TIÊN TUẦN NÀY** (cụ thể, có deadline)
3. **CHIẾN LƯỢC TOPIC**:
   - Nên DROP (có lý do data-driven)
   - Nên EXPAND (vì sao, target metric)
   - Nên REVIEW kỹ (cần thêm data)
4. **CẢNH BÁO RỦI RO** (kênh/topic có thể explode tuần tới)
5. **DỰ BÁO 30 NGÀY** (revenue trend, violation count)

Trả lời tiếng Việt, có số liệu cụ thể, KHÔNG nói lý thuyết suông.`;

    try {
      const r = await callAI([{ role:"user", content: prompt }], "", { cacheTopic: "ai-strategy", ttlMs: 24*3600*1000 });
      const result = { content: r, generatedAt: new Date().toISOString() };
      setAiSummary(result);
      lsSet("meridian-v51-ai-strategy-cache", result);
      toast?.("✅ AI đã phân tích chiến lược", "success");
    } catch (e) {
      toast?.(`Lỗi AI: ${e.message}`, "error");
    } finally {
      setAiLoading(false);
    }
  };

  // Auto-record strategic decision from AI suggestion
  const recordDecisionFromTopic = (topic, decision) => {
    const types = { EXPAND: "EXPAND_TOPIC", DROP: "DROP_TOPIC", REVIEW: "HOLD_TOPIC", HOLD: "HOLD_TOPIC" };
    const newDecision = {
      id: `D${Date.now()}`,
      type: types[decision] || "OTHER",
      target: topic.name,
      reason: `Auto từ AI Strategy: ${topic.reasonShort}. Score: ${topic.strategyScore}/100. ${topic.channels} kênh, $${topic.revenue.toFixed(0)} doanh thu, ${(topic.demoRate*100).toFixed(0)}% demonetized.`,
      dataSnapshot: { ...topic },
      expectedOutcome: decision === "DROP" ? "Giảm rủi ro 70%, redirect resource" : decision === "EXPAND" ? "Tăng doanh thu 25-50% trong 90 ngày" : "Theo dõi, đánh giá lại 30 ngày",
      reviewDate: new Date(Date.now() + 90*86400000).toISOString().slice(0,10),
      decidedBy: currentUser?.id,
      decidedByEmail: currentUser?.email,
      decidedAt: new Date().toISOString(),
      outcome: null,
      status: "pending-review",
    };
    setState(s => ({ ...s, decisionLog: [newDecision, ...(s.decisionLog||[])] }));
    toast?.(`✅ Đã ghi vào Decision Log: ${decision} ${topic.name}`, "success");
  };

  const formatText = text => (text||"").split("\n").map((line,i) => (
    <div key={i} style={{marginBottom:line===""?6:2}}>{line === "" ? <span>&nbsp;</span> : parseInline(line)}</div>
  ));

  return (
    <div style={{padding:"20px 28px",overflowY:"auto",height:"100%",background:C.bg}}>
      {/* Header */}
      <div style={{marginBottom:18,display:"flex",justifyContent:"space-between",alignItems:"flex-end",flexWrap:"wrap",gap:10}}>
        <div>
          <div style={{fontFamily:"'Fraunces',serif",fontWeight:500,fontSize:24,color:C.ink}}>🧠 AI Strategic Panel</div>
          <div style={{fontSize:11,color:C.muted}}>
            Phân tích proactive · {anomalies.length} anomaly · {topicStrategy.length} topic
          </div>
        </div>
        <div style={{display:"flex",gap:8,alignItems:"center"}}>
          {aiSummary && (
            <span style={{fontSize:10,color:C.muted}}>Phân tích AI: {new Date(aiSummary.generatedAt).toLocaleString("vi-VN")}</span>
          )}
          <Btn primary onClick={runStrategy} disabled={aiLoading} icon={Sparkles}>
            {aiLoading ? "Đang phân tích..." : "🤖 Chạy AI Strategy"}
          </Btn>
        </div>
      </div>

      {/* Quick stats */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(160px,1fr))",gap:10,marginBottom:14}}>
        <Card style={{padding:14,borderLeft:`3px solid ${C.red}`}}>
          <div style={{fontSize:9,fontWeight:600,letterSpacing:"0.14em",textTransform:"uppercase",color:C.muted}}>Anomaly Khẩn</div>
          <div style={{fontFamily:"'Fraunces',serif",fontWeight:500,fontSize:24,color:C.red,marginTop:6}}>{highSeverity.length}</div>
        </Card>
        <Card style={{padding:14,borderLeft:`3px solid ${C.amber}`}}>
          <div style={{fontSize:9,fontWeight:600,letterSpacing:"0.14em",textTransform:"uppercase",color:C.muted}}>Anomaly Medium</div>
          <div style={{fontFamily:"'Fraunces',serif",fontWeight:500,fontSize:24,color:C.amber,marginTop:6}}>{mediumSeverity.length}</div>
        </Card>
        <Card style={{padding:14,borderLeft:`3px solid ${C.green}`}}>
          <div style={{fontSize:9,fontWeight:600,letterSpacing:"0.14em",textTransform:"uppercase",color:C.muted}}>Topic nên ĐẨY MẠNH</div>
          <div style={{fontFamily:"'Fraunces',serif",fontWeight:500,fontSize:24,color:C.green,marginTop:6}}>{expandTopics.length}</div>
        </Card>
        <Card style={{padding:14,borderLeft:`3px solid ${C.red}`}}>
          <div style={{fontSize:9,fontWeight:600,letterSpacing:"0.14em",textTransform:"uppercase",color:C.muted}}>Topic nên LOẠI BỎ</div>
          <div style={{fontFamily:"'Fraunces',serif",fontWeight:500,fontSize:24,color:C.red,marginTop:6}}>{dropTopics.length}</div>
        </Card>
      </div>

      {/* AI Summary (cached) */}
      {aiSummary && (
        <Card style={{padding:18,marginBottom:14,borderLeft:`3px solid ${C.ai}`}}>
          <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:12,paddingBottom:10,borderBottom:`1px solid ${C.borderSoft}`}}>
            <Sparkles size={16} style={{color:C.ai}}/>
            <div style={{fontFamily:"'Fraunces',serif",fontWeight:500,fontSize:14,color:C.ink,flex:1}}>AI Strategic Analysis</div>
            <span style={{fontSize:10,color:C.muted}}>Generated: {new Date(aiSummary.generatedAt).toLocaleString("vi-VN")}</span>
          </div>
          <div style={{fontSize:12,lineHeight:1.7,color:C.text}}>{formatText(aiSummary.content)}</div>
        </Card>
      )}

      {/* Topic Strategy Matrix */}
      <Card style={{padding:18,marginBottom:14}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
          <div style={{fontFamily:"'Fraunces',serif",fontWeight:500,fontSize:15,color:C.ink}}>📊 Topic Strategy Matrix</div>
          <div style={{fontSize:10,color:C.muted}}>Score 0-100 · auto-rec: EXPAND/HOLD/REVIEW/DROP</div>
        </div>
        {topicStrategy.length === 0 ? (
          <EmptyState icon={Tag} title="Chưa có topic nào" description="Thêm kênh và gán topic để AI đề xuất chiến lược." compact/>
        ) : (
          <table style={{width:"100%",borderCollapse:"collapse"}}>
            <thead><tr style={{borderBottom:`1px solid ${C.borderSoft}`}}>
              {["Topic","Kênh","Doanh thu","Avg/kênh","Demo%","Vi phạm","Score","Recommend",""].map(h=>(
                <th key={h} style={{textAlign:"left",fontSize:9,fontWeight:600,letterSpacing:"0.14em",textTransform:"uppercase",color:C.muted,padding:"8px 10px"}}>{h}</th>
              ))}
            </tr></thead>
            <tbody>{topicStrategy.map(t => {
              const recColor = t.recommendation === "EXPAND" ? "green" : t.recommendation === "DROP" ? "red" : t.recommendation === "REVIEW" ? "amber" : "gray";
              return (
                <tr key={t.name} style={{borderBottom:`1px solid ${C.borderSoft}`}}>
                  <td style={{padding:"9px 10px",fontSize:12,fontWeight:500,color:C.ink}}>{t.name}</td>
                  <td style={{padding:"9px 10px",fontSize:11,fontFamily:"monospace"}}>{t.channels}</td>
                  <td style={{padding:"9px 10px",fontSize:11,fontFamily:"monospace"}}>${fmt(t.revenue)}</td>
                  <td style={{padding:"9px 10px",fontSize:11,fontFamily:"monospace"}}>${fmt(Math.round(t.avgRev))}</td>
                  <td style={{padding:"9px 10px",fontSize:11,fontFamily:"monospace",color:t.demoRate>0.4?C.red:t.demoRate>0.2?C.amber:C.text}}>{(t.demoRate*100).toFixed(0)}%</td>
                  <td style={{padding:"9px 10px",fontSize:11,fontFamily:"monospace"}}>{t.violations}</td>
                  <td style={{padding:"9px 10px"}}>
                    <div style={{display:"flex",alignItems:"center",gap:6}}>
                      <div style={{width:50,height:5,background:C.borderSoft,borderRadius:2,overflow:"hidden"}}>
                        <div style={{width:`${t.strategyScore}%`,height:"100%",background:t.strategyScore>=70?C.green:t.strategyScore>=40?C.amber:C.red}}/>
                      </div>
                      <span style={{fontSize:10,fontFamily:"monospace"}}>{t.strategyScore}</span>
                    </div>
                  </td>
                  <td style={{padding:"9px 10px"}}>
                    <Pill color={recColor}>{t.recommendation}</Pill>
                    <div style={{fontSize:9,color:C.muted,marginTop:2}}>{t.reasonShort}</div>
                  </td>
                  <td style={{padding:"9px 10px"}}>
                    {can(currentUser, "decisions.write") && (
                      <button onClick={()=>recordDecisionFromTopic(t, t.recommendation)}
                        title="Ghi quyết định vào Decision Log"
                        style={{padding:"3px 8px",fontSize:10,background:C.bgAlt,border:`1px solid ${C.border}`,borderRadius:3,cursor:"pointer"}}>
                        📜 Log
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}</tbody>
          </table>
        )}
      </Card>

      {/* Anomalies list */}
      <Card style={{padding:18}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
          <div style={{fontFamily:"'Fraunces',serif",fontWeight:500,fontSize:15,color:C.ink}}>🚨 Anomalies phát hiện ({anomalies.length})</div>
          <div style={{fontSize:10,color:C.muted}}>Rule-based · không tốn AI tokens</div>
        </div>
        {anomalies.length === 0 ? (
          <EmptyState icon={Check} title="Không phát hiện bất thường" description="Hệ thống đang vận hành ổn định 👍" compact/>
        ) : (
          <div style={{display:"flex",flexDirection:"column",gap:6}}>
            {anomalies.map(a => (
              <div key={a.id} style={{padding:"10px 12px",background:a.severity==="high"?C.redSoft:C.amberSoft,borderRadius:5,borderLeft:`3px solid ${a.severity==="high"?C.red:C.amber}`}}>
                <div style={{fontSize:12,fontWeight:500,color:C.ink}}>{a.title}</div>
                <div style={{fontSize:10,color:C.muted,marginTop:2}}>{a.description}</div>
                {a.action && <div style={{fontSize:10,color:C.text,marginTop:4,fontStyle:"italic"}}>💡 {a.action}</div>}
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// ─── Smart Inbox — pending tasks per user, role-aware ─────────────
// Shows: video submissions in user's queue, expiring contracts, critical channels, etc.
// ═══════════════════════════════════════════════════════════════════
function computeInboxTasks(state, currentUser) {
  const tasks = [];
  const submissions = state.videoSubmissions || [];
  const contracts = state.contracts || [];
  const channels = state.channels || [];
  const now = Date.now();

  const myRoles = userRoles(currentUser);

  // 1. QC Queue tasks
  if (myRoles.some(r => ["SUPER_ADMIN","ADMIN","QC_REVIEWER","COMPLIANCE_MANAGER"].includes(r))) {
    submissions.forEach(s => {
      const ws = s.workflowState || migrateSubmissionStatus(s);
      if (["SUBMITTED","QC_REVIEWING"].includes(ws)) {
        const ageH = s.submittedAt ? (now - new Date(s.submittedAt).getTime()) / 3600000 : 0;
        tasks.push({
          id: `qc-${s.id}`,
          type: "qc-review",
          icon: "🔍",
          title: `QC duyệt: ${s.videoTitle}`,
          subtitle: `${s.submitterName} · gửi ${ageH < 24 ? Math.round(ageH)+"h" : Math.round(ageH/24)+"d"} trước`,
          urgency: ageH > 48 ? "high" : ageH > 24 ? "medium" : "low",
          target: "partner-mgmt",
          targetTab: "qc-queue",
          ageH,
        });
      }
    });
  }

  // 2. Provisioning Queue tasks
  if (myRoles.some(r => ["SUPER_ADMIN","ADMIN","CHANNEL_CREATOR","CONTENT_MANAGER"].includes(r))) {
    submissions.forEach(s => {
      const ws = s.workflowState || migrateSubmissionStatus(s);
      if (["QC_APPROVED","CHANNEL_PROVISIONING","PROVISIONING_FAILED"].includes(ws)) {
        const reviewedAt = s.stateLog?.findLast?.(l => l.to === "QC_APPROVED")?.ts;
        const ageH = reviewedAt ? (now - new Date(reviewedAt).getTime()) / 3600000 : 0;
        tasks.push({
          id: `prov-${s.id}`,
          type: "provision",
          icon: ws === "PROVISIONING_FAILED" ? "⚠️" : "🛠️",
          title: `Cấp kênh: ${s.videoTitle}`,
          subtitle: `${s.submitterName} · QC duyệt ${ageH < 24 ? Math.round(ageH)+"h" : Math.round(ageH/24)+"d"} trước`,
          urgency: ws === "PROVISIONING_FAILED" ? "high" : (ageH > 24 ? "medium" : "low"),
          target: "partner-mgmt",
          targetTab: "provision-queue",
          ageH,
        });
      }
    });
  }

  // 3. Pending partner registrations (Super Admin/Admin only)
  if (myRoles.some(r => ["SUPER_ADMIN","ADMIN"].includes(r))) {
    const users = lsGet(LS.USERS, []);
    users.filter(u => u.role === "PARTNER" && u.status === "PendingApproval").forEach(u => {
      const ageH = u.createdAt ? (now - new Date(u.createdAt).getTime()) / 3600000 : 0;
      tasks.push({
        id: `user-${u.id}`,
        type: "partner-approval",
        icon: "👤",
        title: `Duyệt đăng ký: ${u.fullName}`,
        subtitle: `${u.companyName||u.email} · đăng ký ${ageH < 24 ? Math.round(ageH)+"h" : Math.round(ageH/24)+"d"} trước`,
        urgency: ageH > 48 ? "high" : "medium",
        target: "partner-mgmt",
        targetTab: "pending-users",
        ageH,
      });
    });
  }

  // 4. Expiring contracts (Finance Manager + Admin)
  if (myRoles.some(r => ["SUPER_ADMIN","ADMIN","FINANCE_MANAGER"].includes(r))) {
    const today = new Date().toISOString().slice(0,10);
    const sixtyDays = new Date(now + 60*86400000).toISOString().slice(0,10);
    contracts.filter(c => c.status === "Active" && c.endDate && c.endDate >= today && c.endDate <= sixtyDays).forEach(c => {
      const daysLeft = Math.round((new Date(c.endDate).getTime() - now) / 86400000);
      tasks.push({
        id: `contract-${c.id}`,
        type: "contract-expiry",
        icon: daysLeft <= 7 ? "🔴" : daysLeft <= 30 ? "🟡" : "📅",
        title: `HĐ hết hạn: ${c.contractName}`,
        subtitle: `${c.partnerName} · còn ${daysLeft} ngày (${c.endDate})`,
        urgency: daysLeft <= 7 ? "high" : daysLeft <= 30 ? "medium" : "low",
        target: "contracts",
        ageH: 0,
      });
    });
  }

  // 5. Critical channels (Compliance + Admin)
  if (myRoles.some(r => ["SUPER_ADMIN","ADMIN","COMPLIANCE_MANAGER"].includes(r))) {
    channels.filter(c => c.health === "Critical" || (c.strikes||0) >= 2).slice(0,5).forEach(c => {
      tasks.push({
        id: `critical-${c.id}`,
        type: "critical-channel",
        icon: "🚨",
        title: `Kênh nguy cơ: ${c.name}`,
        subtitle: `${c.cms||"chưa CMS"} · ${c.strikes||0} strikes · ${c.monetization}`,
        urgency: "high",
        target: "compliance",
        ageH: 0,
      });
    });
  }

  // 6. ANOMALY DETECTION — flagged channels/topics (rule-based)
  if (myRoles.some(r => ["SUPER_ADMIN","ADMIN","COMPLIANCE_MANAGER","CONTENT_MANAGER","FINANCE_MANAGER"].includes(r))) {
    const anomalies = detectAnomalies(state);
    anomalies.slice(0, 8).forEach(a => {
      tasks.push({
        id: `anom-${a.id}`,
        type: "anomaly",
        icon: a.severity === "high" ? "🚨" : "⚠️",
        title: a.title,
        subtitle: `${a.description} → ${a.action || ""}`,
        urgency: a.severity,
        target: a.topic ? "analytics" : (a.channelId ? "channels" : "compliance"),
        ageH: 0,
      });
    });
  }

  // 7. PERIODIC AUDIT due (Compliance + Admin)
  if (myRoles.some(r => ["SUPER_ADMIN","ADMIN","COMPLIANCE_MANAGER"].includes(r))) {
    const auditCfg = lsGet("meridian-v51-audit-cfg", { enabled: false, frequency: "monthly", lastRun: 0 });
    if (auditCfg.enabled) {
      const intervalMs = { weekly: 7, monthly: 30, quarterly: 90 }[auditCfg.frequency] * 86400000;
      const dueIn = (auditCfg.lastRun + intervalMs) - now;
      if (dueIn <= 7*86400000) { // due in next week or already overdue
        const overdue = dueIn < 0;
        tasks.push({
          id: `audit-${auditCfg.frequency}`,
          type: "audit",
          icon: overdue ? "🔔" : "📋",
          title: `Audit ${auditCfg.frequency} ${overdue ? "(QUÁ HẠN)" : "đến hạn"}`,
          subtitle: overdue ? `Quá hạn ${Math.round(-dueIn/86400000)} ngày` : `Còn ${Math.round(dueIn/86400000)} ngày`,
          urgency: overdue ? "high" : "medium",
          target: "ai-strategy",
          ageH: 0,
        });
      }
    }
  }

  // Sort: high urgency first, then by age
  const urgScore = u => u === "high" ? 3 : u === "medium" ? 2 : 1;
  return tasks.sort((a, b) => urgScore(b.urgency) - urgScore(a.urgency) || b.ageH - a.ageH);
}

function SmartInbox({ tasks: tasksProp, state, currentUser, onNavigate }) {
  const C = useC();
  const tasks = useMemo(() => tasksProp || (state && currentUser ? computeInboxTasks(state, currentUser) : []), [tasksProp, state, currentUser]);
  const [filter, setFilter] = useState("all");
  const filtered = filter === "all" ? tasks : tasks.filter(t => t.urgency === filter);

  const counts = {
    all: tasks.length,
    high: tasks.filter(t => t.urgency === "high").length,
    medium: tasks.filter(t => t.urgency === "medium").length,
    low: tasks.filter(t => t.urgency === "low").length,
  };

  const urgColor = u => u === "high" ? C.red : u === "medium" ? C.amber : C.green;

  const handleClick = (task) => {
    onNavigate(task.target);
    // TODO: also set tab if targetTab provided — would need extension on routing
  };

  return (
    <div style={{padding:"20px 28px",overflowY:"auto",height:"100%",background:C.bg}}>
      <div style={{marginBottom:18,display:"flex",justifyContent:"space-between",alignItems:"flex-end"}}>
        <div>
          <div style={{fontFamily:"'Fraunces',serif",fontWeight:500,fontSize:24,color:C.ink}}>📥 Smart Inbox</div>
          <div style={{fontSize:11,color:C.muted}}>
            {tasks.length} việc cần làm · phân theo vai trò: <strong>{userRoles(currentUser).map(r => ROLES[r]?.label||r).join(", ")}</strong>
          </div>
        </div>
        <div style={{display:"flex",gap:4}}>
          {[
            { id:"all", label:"Tất cả" },
            { id:"high", label:"🔴 Khẩn", color:C.red },
            { id:"medium", label:"🟡 Cao", color:C.amber },
            { id:"low", label:"🟢 Thường", color:C.green },
          ].map(f => (
            <button key={f.id} onClick={()=>setFilter(f.id)}
              style={{padding:"5px 11px",fontSize:11,cursor:"pointer",border:`1px solid ${filter===f.id?(f.color||C.ink):C.border}`,
                background:filter===f.id?(f.color||C.ink):"transparent",color:filter===f.id?"#FFF":C.text,borderRadius:4}}>
              {f.label} <span style={{marginLeft:3,fontSize:9,opacity:0.7}}>({counts[f.id]||0})</span>
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <Card style={{padding:0}}>
          <EmptyState icon={Check} title="Hết việc rồi! 🎉" description={tasks.length === 0 ? "Inbox của bạn đang trống. Tận hưởng thời gian nghỉ!" : `Không có task nào ở mức "${filter}"`}/>
        </Card>
      ) : (
        filtered.map(task => (
          <Card key={task.id}
            style={{padding:14,marginBottom:8,cursor:"pointer",borderLeft:`3px solid ${urgColor(task.urgency)}`,transition:"transform 0.1s"}}
            onClick={()=>handleClick(task)}
            onMouseEnter={e=>e.currentTarget.style.transform="translateX(2px)"}
            onMouseLeave={e=>e.currentTarget.style.transform="translateX(0)"}>
            <div style={{display:"flex",alignItems:"center",gap:12}}>
              <div style={{fontSize:24}}>{task.icon}</div>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontSize:12,fontWeight:500,color:C.ink}}>{task.title}</div>
                <div style={{fontSize:10,color:C.muted,marginTop:2}}>{task.subtitle}</div>
              </div>
              <Pill color={task.urgency === "high" ? "red" : task.urgency === "medium" ? "amber" : "green"}>
                {task.urgency.toUpperCase()}
              </Pill>
              <ChevronRightIcon size={16} style={{color:C.muted}}/>
            </div>
          </Card>
        ))
      )}

      {/* Help */}
      <div style={{marginTop:18,padding:12,background:C.bgAlt,borderRadius:5,fontSize:10,color:C.muted}}>
        💡 <strong>Smart Inbox</strong> tự động hiển thị task theo vai trò của bạn. Click vào task để đi tới chỗ xử lý.
        <ul style={{margin:"4px 0 0 18px",padding:0}}>
          <li><strong>QC Reviewer</strong> → Video chờ duyệt vi phạm</li>
          <li><strong>Channel Creator</strong> → Submission đã QC duyệt, chờ cấp kênh</li>
          <li><strong>Finance Manager</strong> → Hợp đồng sắp hết hạn (60 ngày)</li>
          <li><strong>Compliance Manager</strong> → Kênh có strike / Critical health</li>
          <li><strong>Admin/Super Admin</strong> → Tất cả task trên</li>
        </ul>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// ─── PARTNER PORTAL — Separate UI for PARTNER role ────────────────
// 🔒 SECURITY: PARTNER users see ONLY this view, never the admin app.
// They can only see/manage their own data (channels, contracts, video submissions).
// ═══════════════════════════════════════════════════════════════════
function PartnerPortal({ currentUser, state, setState, brand, onLogout, toast, confirm, lang, setLang }) {
  const C = useC();
  const [active, setActive] = useState("home");

  // 🔒 Data scoping — only show data belonging to this partner
  const myChannels = useMemo(() => {
    return (state.channels || []).filter(c =>
      c.submittedBy === currentUser.id ||
      c.partnerEmail === currentUser.email ||
      (c.partner && c.partner === currentUser.companyName)
    );
  }, [state.channels, currentUser]);

  const myContracts = useMemo(() => {
    return (state.contracts || []).filter(c =>
      c.partnerEmail === currentUser.email ||
      (c.partnerName && c.partnerName === currentUser.companyName)
    );
  }, [state.contracts, currentUser]);

  const mySubmissions = useMemo(() => {
    return (state.videoSubmissions || []).filter(s => s.submittedBy === currentUser.id)
      .sort((a, b) => (b.submittedAt || "").localeCompare(a.submittedAt || ""));
  }, [state.videoSubmissions, currentUser]);

  // 🚨 Alerts gửi đích danh tới partner này
  const myAlerts = useMemo(() => {
    return (state.partnerAlerts || []).filter(a =>
      a.partnerEmail === currentUser.email || a.partnerId === currentUser.id
    ).sort((a,b) => (b.sentAt||"").localeCompare(a.sentAt||""));
  }, [state.partnerAlerts, currentUser]);

  // 📜 Policy updates dành cho audience phù hợp
  const myPolicies = useMemo(() => {
    return (state.policyUpdates || []).filter(p => {
      if (p.audience === "all") return true;
      if (p.audience === "specific_partners") return (p.audiencePartners||[]).includes(currentUser.id) || (p.audiencePartners||[]).includes(currentUser.email);
      return true;
    }).sort((a,b) => (b.publishedAt||"").localeCompare(a.publishedAt||""));
  }, [state.policyUpdates, currentUser]);

  // Track read status per partner (localStorage)
  const readKey = `meridian-v51-partner-read-${currentUser.id}`;
  const readMarks = lsGet(readKey, { policies: [], alerts: [] });
  const unreadPoliciesCount = myPolicies.filter(p => !(readMarks.policies||[]).includes(p.id)).length;
  const unreadAlertsCount = myAlerts.filter(a => !(readMarks.alerts||[]).includes(a.id) && a.status !== "resolved").length;

  const myStats = {
    channels: myChannels.length,
    contracts: myContracts.length,
    pendingSubmissions: mySubmissions.filter(s => s.status === "pending").length,
    approvedSubmissions: mySubmissions.filter(s => s.status === "approved").length,
    totalRev: myChannels.reduce((s,c)=>s+(c.monthlyRevenue||0), 0),
    unreadAlerts: unreadAlertsCount,
    unreadPolicies: unreadPoliciesCount,
  };

  const isApproved = currentUser.status === "Active";

  const sidebar = [
    { id:"home", label:"🏠 Trang chủ", icon:Gauge },
    { id:"my-channels", label:"📺 Kênh của tôi", icon:Tv, count: myStats.channels },
    { id:"my-contracts", label:"📋 Hợp đồng", icon:Briefcase, count: myStats.contracts },
    { id:"submit-video", label:"📤 Gửi video duyệt", icon:Upload, count: myStats.pendingSubmissions, hot: true },
    { id:"my-alerts", label:"🚨 Cảnh báo từ MCN", icon:AlertTriangle, count: myStats.unreadAlerts, hot: myStats.unreadAlerts > 0 },
    { id:"policy-news", label:"📜 Chính sách YT", icon:BookOpen, count: myStats.unreadPolicies, hot: myStats.unreadPolicies > 0 },
    { id:"profile", label:"👤 Hồ sơ", icon:UserCog },
  ];

  return (
    <div style={{display:"flex",height:"100vh",background:C.bg}}>
      {/* Sidebar — visually distinct from admin sidebar (amber accent) */}
      <div style={{width:240,background:"#0F1115",color:"#E5E7EB",display:"flex",flexDirection:"column"}}>
        <div style={{padding:"18px 16px",borderBottom:"1px solid #1F2937"}}>
          <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:6}}>
            <div style={{width:30,height:30,background:`linear-gradient(135deg, #F59E0B, #B8650C)`,borderRadius:5,display:"flex",alignItems:"center",justifyContent:"center"}}>
              <Briefcase size={15} style={{color:"#FFF"}}/>
            </div>
            <div style={{flex:1,fontFamily:"'Fraunces',serif",fontWeight:500,fontSize:16,color:"#FFF"}}>
              Partner Portal
            </div>
            <SyncStatusBadge compact/>
          </div>
          <div style={{fontSize:10,color:"#9CA3AF"}}>Khu vực dành cho đối tác · sync tự động lên cloud</div>
        </div>

        <div style={{padding:"12px 8px",flex:1,overflow:"auto"}}>
          {sidebar.map(item => {
            const isActive = active === item.id;
            const Icon = item.icon;
            return (
              <button key={item.id} onClick={()=>setActive(item.id)}
                style={{width:"100%",display:"flex",alignItems:"center",gap:10,padding:"9px 12px",
                  marginBottom:2,textAlign:"left",fontSize:12,cursor:"pointer",
                  background:isActive?"#1F2937":"transparent",
                  color:isActive?"#FFF":"#9CA3AF",
                  border:"none",borderLeft:`3px solid ${isActive?"#F59E0B":"transparent"}`,
                  borderRadius:3,fontWeight:isActive?500:400}}>
                <Icon size={14}/>
                <span style={{flex:1,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{item.label}</span>
                {item.count !== undefined && item.count > 0 && (
                  <span style={{fontSize:9,padding:"1px 6px",background:item.hot?"#F59E0B":"#374151",color:"#FFF",borderRadius:8}}>{item.count}</span>
                )}
              </button>
            );
          })}
        </div>

        <div style={{padding:12,borderTop:"1px solid #1F2937"}}>
          <div style={{fontSize:11,color:"#FFF",fontWeight:500,marginBottom:2}}>{currentUser.fullName}</div>
          <div style={{fontSize:9,color:"#9CA3AF",marginBottom:8}}>{currentUser.companyName || currentUser.email}</div>
          <button onClick={onLogout} style={{width:"100%",padding:"7px 10px",background:"#1F2937",color:"#9CA3AF",border:"1px solid #374151",borderRadius:4,cursor:"pointer",fontSize:11,display:"flex",alignItems:"center",justifyContent:"center",gap:6}}>
            <LogOut size={12}/> Đăng xuất
          </button>
        </div>
      </div>

      {/* Main content */}
      <div style={{flex:1,overflow:"auto"}}>
        {/* Pending approval banner */}
        {!isApproved && (
          <div style={{padding:"12px 28px",background:`${C.amber}15`,borderBottom:`1px solid ${C.amber}`,color:C.text,fontSize:12,display:"flex",alignItems:"center",gap:10}}>
            <AlertTriangle size={14} style={{color:C.amber}}/>
            <span><strong>Tài khoản chờ duyệt:</strong> Quản trị viên cần duyệt trước khi bạn có thể gửi video hoặc thêm kênh. Vui lòng đợi hoặc liên hệ MCN admin.</span>
          </div>
        )}

        {active === "home" && <PartnerHomeView currentUser={currentUser} myChannels={myChannels} myContracts={myContracts} mySubmissions={mySubmissions} myStats={myStats} onNavigate={setActive}/>}
        {active === "my-channels" && <PartnerChannelsView currentUser={currentUser} myChannels={myChannels} state={state} setState={setState} toast={toast} confirm={confirm} isApproved={isApproved}/>}
        {active === "my-contracts" && <PartnerContractsView myContracts={myContracts} state={state}/>}
        {active === "submit-video" && <PartnerSubmitView currentUser={currentUser} myChannels={myChannels} mySubmissions={mySubmissions} state={state} setState={setState} toast={toast} isApproved={isApproved}/>}
        {active === "my-alerts" && <PartnerAlertsView currentUser={currentUser} myAlerts={myAlerts} state={state} setState={setState} toast={toast} readKey={readKey}/>}
        {active === "policy-news" && <PartnerPolicyView currentUser={currentUser} myPolicies={myPolicies} readKey={readKey}/>}
        {active === "profile" && <PartnerProfileView currentUser={currentUser} toast={toast}/>}
      </div>
    </div>
  );
}

// ─── Partner sub-views ──────────────────────────────────────────────
function PartnerHomeView({ currentUser, myChannels, myContracts, mySubmissions, myStats, onNavigate }) {
  const C = useC();
  return (
    <div style={{padding:"28px",background:C.bg,minHeight:"100%"}}>
      <div style={{marginBottom:24}}>
        <div style={{fontFamily:"'Fraunces',serif",fontWeight:500,fontSize:28,color:C.ink}}>
          Xin chào, {currentUser.fullName} 👋
        </div>
        <div style={{fontSize:12,color:C.muted,marginTop:4}}>
          {currentUser.companyName ? `Đại diện ${currentUser.companyName} · ` : ""}
          Đối tác từ {currentUser.partnerSince ? new Date(currentUser.partnerSince).toLocaleDateString("vi-VN") : "—"}
        </div>
      </div>

      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(200px,1fr))",gap:12,marginBottom:24}}>
        <Card style={{padding:18,cursor:"pointer"}} onClick={()=>onNavigate("my-channels")}>
          <Tv size={16} style={{color:C.accent,marginBottom:6}}/>
          <div style={{fontFamily:"'Fraunces',serif",fontWeight:500,fontSize:24,color:C.ink}}>{myStats.channels}</div>
          <div style={{fontSize:10,color:C.muted}}>Kênh của tôi</div>
        </Card>
        <Card style={{padding:18,cursor:"pointer"}} onClick={()=>onNavigate("my-contracts")}>
          <Briefcase size={16} style={{color:C.green,marginBottom:6}}/>
          <div style={{fontFamily:"'Fraunces',serif",fontWeight:500,fontSize:24,color:C.ink}}>{myStats.contracts}</div>
          <div style={{fontSize:10,color:C.muted}}>Hợp đồng</div>
        </Card>
        <Card style={{padding:18,cursor:"pointer"}} onClick={()=>onNavigate("submit-video")}>
          <Upload size={16} style={{color:C.amber,marginBottom:6}}/>
          <div style={{fontFamily:"'Fraunces',serif",fontWeight:500,fontSize:24,color:C.amber}}>{myStats.pendingSubmissions}</div>
          <div style={{fontSize:10,color:C.muted}}>Video chờ duyệt</div>
        </Card>
        <Card style={{padding:18}}>
          <DollarSign size={16} style={{color:C.green,marginBottom:6}}/>
          <div style={{fontFamily:"'Fraunces',serif",fontWeight:500,fontSize:24,color:C.ink}}>${fmt(myStats.totalRev)}</div>
          <div style={{fontSize:10,color:C.muted}}>Doanh thu / tháng</div>
        </Card>
      </div>

      <Card style={{padding:18}}>
        <div style={{fontSize:13,fontWeight:500,color:C.ink,marginBottom:10}}>📊 Hoạt động gần đây</div>
        {mySubmissions.slice(0, 5).length === 0 ? (
          <div style={{padding:18,textAlign:"center",color:C.muted,fontSize:11}}>Chưa có hoạt động nào</div>
        ) : (
          mySubmissions.slice(0, 5).map(s => (
            <div key={s.id} style={{padding:"10px 0",borderBottom:`1px solid ${C.borderSoft}`,display:"flex",alignItems:"center",gap:10}}>
              <Pill color={s.status==="approved"?"green":s.status==="rejected"?"red":"amber"}>{s.status}</Pill>
              <div style={{flex:1}}>
                <div style={{fontSize:11,fontWeight:500,color:C.ink}}>{s.videoTitle}</div>
                <div style={{fontSize:9,color:C.muted}}>{new Date(s.submittedAt).toLocaleString("vi-VN")}</div>
              </div>
              {s.adminNote && <div style={{fontSize:10,color:C.muted,maxWidth:240}}>💬 {s.adminNote}</div>}
            </div>
          ))
        )}
      </Card>
    </div>
  );
}

function PartnerChannelsView({ currentUser, myChannels, state, setState, toast, confirm, isApproved }) {
  const C = useC();
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({});
  const cmsList = state.cmsList || KUDO_CMS_LIST;

  const openAdd = () => {
    if (!isApproved) { toast?.("⏳ Chờ admin duyệt tài khoản trước khi thêm kênh", "warning"); return; }
    setForm({ name:"", ytId:"", topic:"", country:"VN", notes:"" });
    setModal("add");
  };

  const save = () => {
    if (!form.name || !form.ytId) { toast?.("Nhập tên kênh và YouTube ID", "warning"); return; }
    const ts = new Date().toISOString();
    const newCh = {
      id: `C${String((state.channels?.length||0)+1).padStart(5,"0")}`,
      name: form.name,
      ytId: form.ytId,
      topic: form.topic || "",
      country: form.country || "VN",
      notes: form.notes || "",
      // 🔒 Linked to this partner
      submittedBy: currentUser.id,
      partnerEmail: currentUser.email,
      partner: currentUser.companyName || currentUser.fullName,
      cms: "",  // To be assigned by admin
      monthlyRevenue: 0, monthlyViews: 0, subscribers: 0,
      health: "Pending", monetization: "Pending", status: "Pending", strikes: 0,
      changeHistory: [{ ts, action: "Thêm bởi partner", user: currentUser.email }],
      createdAt: ts,
    };
    setState(s => ({ ...s, channels: [...(s.channels||[]), newCh] }));
    toast?.(`Đã thêm kênh "${form.name}" — chờ MCN duyệt và gán CMS`, "success");
    setModal(null);
  };

  return (
    <div style={{padding:"28px",background:C.bg,minHeight:"100%"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:18}}>
        <div>
          <div style={{fontFamily:"'Fraunces',serif",fontWeight:500,fontSize:22,color:C.ink}}>Kênh của tôi</div>
          <div style={{fontSize:11,color:C.muted}}>{myChannels.length} kênh đã thêm vào hệ thống</div>
        </div>
        <Btn primary onClick={openAdd} icon={Plus} disabled={!isApproved}>Thêm kênh mới</Btn>
      </div>

      {myChannels.length === 0 ? (
        <Card style={{padding:50,textAlign:"center"}}>
          <Tv size={32} style={{color:C.borderSoft,marginBottom:10}}/>
          <div style={{fontSize:13,color:C.muted,marginBottom:4}}>Chưa có kênh nào</div>
          <div style={{fontSize:11,color:C.muted}}>{isApproved ? "Bấm 'Thêm kênh mới' để bắt đầu" : "Chờ admin duyệt tài khoản trước"}</div>
        </Card>
      ) : (
        <Card style={{overflow:"hidden"}}>
          <table style={{width:"100%",borderCollapse:"collapse"}}>
            <thead style={{background:C.bgAlt}}>
              <tr>{["Kênh","YouTube ID","CMS","Subs","Doanh thu","Status"].map(h => (
                <th key={h} style={{textAlign:"left",fontSize:9,fontWeight:600,letterSpacing:"0.14em",textTransform:"uppercase",color:C.muted,padding:"10px 12px"}}>{h}</th>
              ))}</tr>
            </thead>
            <tbody>
              {myChannels.map(c => (
                <tr key={c.id} style={{borderTop:`1px solid ${C.borderSoft}`}}>
                  <td style={{padding:"10px 12px"}}>
                    <div style={{fontSize:12,fontWeight:500,color:C.ink}}>{c.name}</div>
                    {c.topic && <div style={{fontSize:9,color:C.muted}}>{c.topic}</div>}
                  </td>
                  <td style={{padding:"10px 12px",fontSize:10,fontFamily:"monospace",color:C.muted}}>{c.ytId}</td>
                  <td style={{padding:"10px 12px",fontSize:11}}>{c.cms || <span style={{color:C.amber}}>Chờ gán</span>}</td>
                  <td style={{padding:"10px 12px",fontSize:11,fontFamily:"monospace"}}>{fmt(c.subscribers||0)}</td>
                  <td style={{padding:"10px 12px",fontSize:11,fontFamily:"monospace",fontWeight:500,color:C.ink}}>${fmt(c.monthlyRevenue||0)}</td>
                  <td style={{padding:"10px 12px"}}><StatusDot status={c.status||"Pending"}/></td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {modal === "add" && (
        <Modal title="Thêm kênh mới" onClose={()=>setModal(null)}>
          <div style={{padding:10,background:C.aiSoft,borderRadius:4,marginBottom:14,fontSize:11,color:C.text}}>
            💡 Sau khi thêm, MCN sẽ duyệt và gán CMS phù hợp. Trong thời gian chờ, bạn vẫn có thể gửi video duyệt cho kênh này.
          </div>
          <Field label="Tên kênh *">
            <Input value={form.name||""} onChange={e=>setForm(f=>({...f,name:e.target.value}))} placeholder="VD: My Cooking Channel"/>
          </Field>
          <Field label="YouTube Channel ID *">
            <Input value={form.ytId||""} onChange={e=>setForm(f=>({...f,ytId:e.target.value}))} placeholder="UCxxxxxxxxxxxx" style={{fontFamily:"monospace"}}/>
          </Field>
          <Field label="Chủ đề">
            <Select value={form.topic||""} onChange={e=>setForm(f=>({...f,topic:e.target.value}))}>
              <option value="">— Chọn chủ đề —</option>
              {KUDO_TOPICS.map(t => <option key={t.id} value={t.name}>{t.name}</option>)}
            </Select>
          </Field>
          <Field label="Quốc gia">
            <Input value={form.country||"VN"} onChange={e=>setForm(f=>({...f,country:e.target.value}))}/>
          </Field>
          <Field label="Mô tả / Ghi chú">
            <textarea value={form.notes||""} onChange={e=>setForm(f=>({...f,notes:e.target.value}))}
              placeholder="Mô tả ngắn về nội dung kênh..."
              style={{width:"100%",minHeight:60,padding:"8px 10px",fontSize:11,fontFamily:"inherit",border:`1px solid ${C.border}`,borderRadius:4}}/>
          </Field>
          <div style={{display:"flex",justifyContent:"flex-end",gap:8,marginTop:14,paddingTop:14,borderTop:`1px solid ${C.borderSoft}`}}>
            <Btn ghost onClick={()=>setModal(null)}>Hủy</Btn>
            <Btn primary onClick={save}>Gửi yêu cầu</Btn>
          </div>
        </Modal>
      )}
    </div>
  );
}

function PartnerContractsView({ myContracts, state }) {
  const C = useC();
  const channels = state.channels || [];
  return (
    <div style={{padding:"28px",background:C.bg,minHeight:"100%"}}>
      <div style={{marginBottom:18}}>
        <div style={{fontFamily:"'Fraunces',serif",fontWeight:500,fontSize:22,color:C.ink}}>Hợp đồng của tôi</div>
        <div style={{fontSize:11,color:C.muted}}>{myContracts.length} hợp đồng</div>
      </div>
      {myContracts.length === 0 ? (
        <Card style={{padding:50,textAlign:"center"}}>
          <Briefcase size={32} style={{color:C.borderSoft,marginBottom:10}}/>
          <div style={{fontSize:13,color:C.muted,marginBottom:4}}>Chưa có hợp đồng nào</div>
          <div style={{fontSize:11,color:C.muted}}>MCN sẽ tạo hợp đồng sau khi duyệt và gán CMS cho các kênh của bạn</div>
        </Card>
      ) : (
        myContracts.map(ct => {
          const ctChannels = (ct.channelIds || []).map(id => channels.find(c => c.id === id)).filter(Boolean);
          const now = new Date().toISOString().slice(0,10);
          const status = ct.status === "Terminated" ? "Terminated" : ct.endDate && ct.endDate < now ? "Expired" : ct.startDate && ct.startDate > now ? "Pending" : "Active";
          return (
            <Card key={ct.id} style={{padding:18,marginBottom:12}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:10}}>
                <div>
                  <div style={{fontSize:14,fontWeight:500,color:C.ink}}>{ct.contractName}</div>
                  <div style={{fontSize:10,color:C.muted,marginTop:2}}>{ct.id}</div>
                </div>
                <Pill color={status==="Active"?"green":status==="Expired"?"red":"amber"}>{status}</Pill>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(140px,1fr))",gap:10,marginBottom:10}}>
                <div><div style={{fontSize:9,color:C.muted}}>Mốc thời gian</div><div style={{fontSize:11,fontFamily:"monospace"}}>{ct.startDate} → {ct.endDate || "vô hạn"}</div></div>
                <div><div style={{fontSize:9,color:C.muted}}>Loại</div><div style={{fontSize:11}}>{ct.type}</div></div>
                <div><div style={{fontSize:9,color:C.muted}}>Rev Share</div><div style={{fontSize:11,fontWeight:500}}>{ct.revShare}%</div></div>
                <div><div style={{fontSize:9,color:C.muted}}>Số kênh</div><div style={{fontSize:11,fontWeight:500}}>{ctChannels.length}</div></div>
              </div>
              {ct.terms && <div style={{fontSize:10,color:C.muted,padding:8,background:C.bgAlt,borderRadius:4,marginBottom:8,whiteSpace:"pre-wrap"}}>{ct.terms}</div>}
              {ctChannels.length > 0 && (
                <div>
                  <div style={{fontSize:10,fontWeight:500,color:C.ink,marginBottom:6}}>Kênh trong hợp đồng:</div>
                  <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
                    {ctChannels.map(c => (
                      <Pill key={c.id} color="gray">{c.name}</Pill>
                    ))}
                  </div>
                </div>
              )}
            </Card>
          );
        })
      )}
    </div>
  );
}

function PartnerSubmitView({ currentUser, myChannels, mySubmissions, state, setState, toast, isApproved }) {
  const C = useC();
  const [form, setForm] = useState({
    channelId:"", videoUrl:"", videoTitle:"", description:"", category:"",
    storageType: "drive", storageUrl: "", productInfo: "", license: "owned",
    // Inline channel creation fields (when no channels exist)
    newChannelName: "", newChannelYtId: "",
  });
  const [filter, setFilter] = useState("all");

  const submit = () => {
    if (!isApproved) { toast?.("⏳ Chờ admin duyệt tài khoản trước", "warning"); return; }
    if (!form.videoUrl || !form.videoTitle) { toast?.("Cần nhập đủ URL video và tiêu đề", "warning"); return; }

    let channelId = form.channelId;
    let channelName = "";

    // 🆕 Inline channel creation: if no channel selected but new channel info provided
    if (!channelId && form.newChannelName && form.newChannelYtId) {
      const ts = new Date().toISOString();
      const newCh = {
        id: `C${String((state.channels?.length||0)+1).padStart(5,"0")}`,
        name: form.newChannelName,
        ytId: form.newChannelYtId,
        topic: form.category || "",
        country: "VN",
        notes: "Tạo khi gửi video duyệt",
        submittedBy: currentUser.id,
        partnerEmail: currentUser.email,
        partner: currentUser.companyName || currentUser.fullName,
        cms: "", monthlyRevenue: 0, monthlyViews: 0, subscribers: 0,
        health: "Pending", monetization: "Pending", status: "Pending", strikes: 0,
        changeHistory: [{ ts, action: "Tạo tự động khi gửi video", user: currentUser.email }],
        createdAt: ts,
      };
      channelId = newCh.id;
      channelName = newCh.name;
      // Add channel to state immediately
      setState(s => ({ ...s, channels: [...(s.channels||[]), newCh] }));
    }

    if (!channelId) { toast?.("Chọn kênh hoặc tạo kênh mới để gửi", "warning"); return; }

    const selectedCh = myChannels.find(c => c.id === channelId);
    const submission = {
      id: `VS${Date.now()}`,
      channelId,
      videoUrl: form.videoUrl,
      videoTitle: form.videoTitle,
      description: form.description,
      category: form.category,
      storageType: form.storageType,
      storageUrl: form.storageUrl,
      productInfo: form.productInfo,
      license: form.license,
      submittedBy: currentUser.id,
      submitterEmail: currentUser.email,
      submitterName: currentUser.companyName || currentUser.fullName,
      channelName: selectedCh?.name || channelName || "",
      preferredYtId: selectedCh?.ytId || form.newChannelYtId || "",
      status: "pending",
      workflowState: "SUBMITTED",
      submittedAt: new Date().toISOString(),
      reviewedBy: null,
      reviewedAt: null,
      adminNote: "",
    };
    setState(s => ({ ...s, videoSubmissions: [submission, ...(s.videoSubmissions||[])] }));
    toast?.("✅ Đã gửi video chờ MCN duyệt — sẽ hiện trong QC Queue", "success");
    setForm({ channelId:"", videoUrl:"", videoTitle:"", description:"", category:"", storageType: "drive", storageUrl: "", productInfo: "", license: "owned", newChannelName: "", newChannelYtId: "" });
  };

  const filtered = filter === "all" ? mySubmissions : mySubmissions.filter(s => s.status === filter);

  return (
    <div style={{padding:"28px",background:C.bg,minHeight:"100%"}}>
      <div style={{marginBottom:18}}>
        <div style={{fontFamily:"'Fraunces',serif",fontWeight:500,fontSize:22,color:C.ink}}>Gửi video chờ duyệt</div>
        <div style={{fontSize:11,color:C.muted}}>Gửi link YouTube để MCN xem và phê duyệt cấp kênh phù hợp</div>
      </div>

      <Card style={{padding:18,marginBottom:18,borderLeft:`3px solid ${C.amber}`}}>
        <div style={{fontSize:13,fontWeight:500,color:C.ink,marginBottom:10}}>📤 Gửi video mới</div>

        {/* Channel selector OR inline creation */}
        {myChannels.length > 0 ? (
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0 16px"}}>
            <Field label="Kênh đăng *">
              <Select value={form.channelId||""} onChange={e=>setForm(f=>({...f,channelId:e.target.value,newChannelName:"",newChannelYtId:""}))}>
                <option value="">— Chọn kênh —</option>
                {myChannels.map(c => <option key={c.id} value={c.id}>{c.name} ({c.ytId?.slice(0,10)||"..."})</option>)}
                <option value="__new__">➕ Tạo kênh mới...</option>
              </Select>
            </Field>
            <Field label="Danh mục">
              <Select value={form.category||""} onChange={e=>setForm(f=>({...f,category:e.target.value}))}>
                <option value="">— Chọn —</option>
                {KUDO_TOPICS.map(t => <option key={t.id} value={t.name}>{t.name}</option>)}
              </Select>
            </Field>
          </div>
        ) : null}

        {/* Inline channel creation — shown when no channels OR user picks "Tạo kênh mới" */}
        {(myChannels.length === 0 || form.channelId === "__new__") && (
          <div style={{padding:14,background:C.aiSoft,borderRadius:6,marginBottom:12,borderLeft:`3px solid ${C.ai}`}}>
            <div style={{fontSize:12,fontWeight:500,color:C.ai,marginBottom:8}}>
              {myChannels.length === 0 ? "📺 Tạo kênh — bắt buộc trước khi gửi video" : "📺 Tạo kênh mới"}
            </div>
            <div style={{fontSize:10,color:C.muted,marginBottom:10}}>
              Nhập thông tin kênh YouTube. Hệ thống tự động tạo kênh + gửi video cùng lúc.
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0 16px"}}>
              <Field label="Tên kênh *">
                <Input value={form.newChannelName||""} onChange={e=>setForm(f=>({...f,newChannelName:e.target.value,channelId:""}))}
                  placeholder="VD: My Cooking Channel"/>
              </Field>
              <Field label="YouTube Channel ID *">
                <Input value={form.newChannelYtId||""} onChange={e=>setForm(f=>({...f,newChannelYtId:e.target.value,channelId:""}))}
                  placeholder="UCxxxxxxxxxxxx" style={{fontFamily:"monospace"}}/>
              </Field>
            </div>
            {myChannels.length > 0 && (
              <Field label="Danh mục">
                <Select value={form.category||""} onChange={e=>setForm(f=>({...f,category:e.target.value}))}>
                  <option value="">— Chọn —</option>
                  {KUDO_TOPICS.map(t => <option key={t.id} value={t.name}>{t.name}</option>)}
                </Select>
              </Field>
            )}
            {myChannels.length === 0 && (
              <Field label="Danh mục">
                <Select value={form.category||""} onChange={e=>setForm(f=>({...f,category:e.target.value}))}>
                  <option value="">— Chọn —</option>
                  {KUDO_TOPICS.map(t => <option key={t.id} value={t.name}>{t.name}</option>)}
                </Select>
              </Field>
            )}
          </div>
        )}
        <Field label="Tiêu đề video *">
          <Input value={form.videoTitle||""} onChange={e=>setForm(f=>({...f,videoTitle:e.target.value}))} placeholder="Tiêu đề video bạn muốn upload"/>
        </Field>
        <Field label="URL YouTube (link video chưa publish hoặc unlisted) *">
          <Input value={form.videoUrl||""} onChange={e=>setForm(f=>({...f,videoUrl:e.target.value}))} placeholder="https://youtube.com/watch?v=..." style={{fontFamily:"monospace"}}/>
        </Field>

        {/* 🆕 Storage link section — Drive/NAS for QC review */}
        <div style={{padding:12,background:C.bgAlt,borderRadius:5,marginTop:10,marginBottom:10}}>
          <div style={{fontSize:11,fontWeight:500,color:C.ink,marginBottom:8}}>
            📁 Link kho lưu trữ (cho QC duyệt)
          </div>
          <div style={{fontSize:10,color:C.muted,marginBottom:8}}>
            Cung cấp link Google Drive / NAS / Dropbox chứa file gốc, music license, raw assets... để QC kiểm tra bản quyền + chất lượng nội dung trước khi cấp kênh.
          </div>
          <div style={{display:"grid",gridTemplateColumns:"140px 1fr",gap:8}}>
            <Select value={form.storageType||"drive"} onChange={e=>setForm(f=>({...f,storageType:e.target.value}))}>
              <option value="drive">📁 Google Drive</option>
              <option value="nas">🖥️ NAS server</option>
              <option value="dropbox">📦 Dropbox</option>
              <option value="onedrive">☁️ OneDrive</option>
              <option value="mega">🔐 Mega.nz</option>
              <option value="other">🔗 Khác</option>
            </Select>
            <Input value={form.storageUrl||""} onChange={e=>setForm(f=>({...f,storageUrl:e.target.value}))}
              placeholder={form.storageType==="nas"?"\\\\nas-server\\share\\folder hoặc smb://...":"https://drive.google.com/..."}
              style={{fontFamily:"monospace"}}/>
          </div>
          <Field label="License nội dung" style={{marginTop:8}}>
            <Select value={form.license||"owned"} onChange={e=>setForm(f=>({...f,license:e.target.value}))}>
              <option value="owned">📜 Tự sản xuất (Owned)</option>
              <option value="licensed">✅ Mua license</option>
              <option value="cc">🌐 Creative Commons</option>
              <option value="royalty_free">🎵 Royalty-free music</option>
              <option value="ai_generated">🤖 AI-generated</option>
              <option value="other">❓ Khác (giải thích trong note)</option>
            </Select>
          </Field>
          <Field label="Thông tin sản phẩm (tags, bản quyền, công cụ tạo...)">
            <textarea value={form.productInfo||""} onChange={e=>setForm(f=>({...f,productInfo:e.target.value}))}
              placeholder="VD: AI tools used, music source, footage source, voice over actor..."
              style={{width:"100%",minHeight:50,padding:"8px 10px",fontSize:11,fontFamily:"inherit",border:`1px solid ${C.border}`,borderRadius:4}}/>
          </Field>
        </div>

        <Field label="Mô tả / Ghi chú gửi MCN">
          <textarea value={form.description||""} onChange={e=>setForm(f=>({...f,description:e.target.value}))}
            placeholder="Mô tả nội dung, lý do gửi, lưu ý đặc biệt..."
            style={{width:"100%",minHeight:60,padding:"8px 10px",fontSize:11,fontFamily:"inherit",border:`1px solid ${C.border}`,borderRadius:4}}/>
        </Field>
        <div style={{display:"flex",justifyContent:"flex-end",marginTop:10}}>
          <Btn primary onClick={submit} icon={Send} disabled={!isApproved}>Gửi duyệt</Btn>
        </div>
      </Card>

      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
        <div style={{fontSize:13,fontWeight:500,color:C.ink}}>📋 Video đã gửi ({mySubmissions.length})</div>
        <div style={{display:"flex",gap:4}}>
          {[
            {id:"all", label:"Tất cả"},
            {id:"pending", label:"⏳ Chờ duyệt"},
            {id:"approved", label:"✅ Đã duyệt"},
            {id:"rejected", label:"❌ Từ chối"},
          ].map(f => (
            <button key={f.id} onClick={()=>setFilter(f.id)}
              style={{padding:"5px 11px",fontSize:11,cursor:"pointer",border:`1px solid ${C.border}`,
                background:filter===f.id?C.ink:"transparent",color:filter===f.id?"#FFF":C.text,borderRadius:4}}>
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <Card style={{padding:30,textAlign:"center",color:C.muted,fontSize:11}}>Chưa có video nào</Card>
      ) : filtered.map(s => {
        const ch = myChannels.find(c => c.id === s.channelId);
        return (
          <Card key={s.id} style={{padding:14,marginBottom:8,borderLeft:`3px solid ${s.status==="approved"?C.green:s.status==="rejected"?C.red:C.amber}`}}>
            <div style={{display:"flex",alignItems:"flex-start",gap:10}}>
              <Pill color={s.status==="approved"?"green":s.status==="rejected"?"red":"amber"}>{s.status==="pending"?"⏳ Chờ":s.status==="approved"?"✅ Duyệt":"❌ Từ chối"}</Pill>
              <div style={{flex:1}}>
                <div style={{fontSize:12,fontWeight:500,color:C.ink}}>{s.videoTitle}</div>
                <div style={{fontSize:10,color:C.muted,marginTop:2}}>
                  Kênh: {ch?.name || s.channelId} · Gửi {new Date(s.submittedAt).toLocaleString("vi-VN")}
                </div>
                <a href={s.videoUrl} target="_blank" rel="noopener" style={{fontSize:10,color:C.accent,fontFamily:"monospace",wordBreak:"break-all"}}>{s.videoUrl}</a>
                {s.description && <div style={{fontSize:10,color:C.muted,marginTop:4}}>📝 {s.description}</div>}
                {s.adminNote && (
                  <div style={{marginTop:6,padding:8,background:s.status==="approved"?C.greenSoft:C.redSoft,borderRadius:4,fontSize:10}}>
                    💬 <strong>MCN:</strong> {s.adminNote}
                  </div>
                )}
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
}

// 🚨 Partner sees violation alerts from MCN
function PartnerAlertsView({ currentUser, myAlerts, state, setState, toast, readKey }) {
  const C = useC();
  const [filter, setFilter] = useState("all");
  const [responseModal, setResponseModal] = useState(null);
  const [responseText, setResponseText] = useState("");

  // Mark all as read when partner opens
  useEffect(() => {
    const cur = lsGet(readKey, { policies: [], alerts: [] });
    const allIds = myAlerts.map(a => a.id);
    const newReadAlerts = [...new Set([...(cur.alerts||[]), ...allIds])];
    lsSet(readKey, { ...cur, alerts: newReadAlerts });
  }, [myAlerts.length, readKey]);

  const filtered = filter === "all" ? myAlerts : myAlerts.filter(a =>
    filter === "open" ? a.status === "pending" : a.status === filter
  );

  const acknowledge = (alert) => {
    setState(s => ({
      ...s,
      partnerAlerts: (s.partnerAlerts||[]).map(a => a.id === alert.id ? {
        ...a,
        status: "acknowledged",
        acknowledgedAt: new Date().toISOString(),
      } : a),
    }));
    toast?.("✅ Đã xác nhận đọc cảnh báo", "success");
  };

  const submitResponse = () => {
    if (!responseModal || !responseText.trim()) return;
    setState(s => ({
      ...s,
      partnerAlerts: (s.partnerAlerts||[]).map(a => a.id === responseModal.id ? {
        ...a,
        status: "resolved",
        resolvedAt: new Date().toISOString(),
        partnerResponse: responseText,
      } : a),
    }));
    toast?.("✅ Đã gửi phản hồi tới MCN", "success");
    setResponseModal(null);
    setResponseText("");
  };

  const sevColor = (s) => s === "critical" ? "red" : s === "warning" ? "amber" : "blue";

  return (
    <div style={{padding:"28px",background:C.bg,minHeight:"100%"}}>
      <div style={{marginBottom:18}}>
        <div style={{fontFamily:"'Fraunces',serif",fontWeight:500,fontSize:22,color:C.ink}}>🚨 Cảnh báo từ MCN</div>
        <div style={{fontSize:11,color:C.muted}}>
          Khi MCN phát hiện vi phạm trên kênh của bạn, cảnh báo sẽ hiện ở đây kèm yêu cầu sửa cụ thể + deadline.
        </div>
      </div>

      <div style={{display:"flex",gap:6,marginBottom:14}}>
        {[
          {id:"all", label:`Tất cả (${myAlerts.length})`},
          {id:"open", label:`⏳ Chưa xử lý (${myAlerts.filter(a=>a.status==="pending").length})`},
          {id:"acknowledged", label:"👁️ Đã đọc"},
          {id:"resolved", label:"✅ Đã xử lý"},
        ].map(f => (
          <button key={f.id} onClick={()=>setFilter(f.id)}
            style={{padding:"5px 11px",fontSize:11,cursor:"pointer",border:`1px solid ${filter===f.id?C.ink:C.border}`,
              background:filter===f.id?C.ink:"transparent",color:filter===f.id?"#FFF":C.text,borderRadius:4}}>
            {f.label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <Card style={{padding:0}}>
          <EmptyState icon={Check} title={filter==="all" ? "Không có cảnh báo nào" : "Không có gì ở mục này"} description={filter==="all" ? "Tốt quá! Kênh của bạn đang vận hành ổn." : ""}/>
        </Card>
      ) : filtered.map(a => {
        const daysLeft = a.deadline ? Math.round((new Date(a.deadline).getTime() - Date.now()) / 86400000) : null;
        const isOverdue = daysLeft !== null && daysLeft < 0;
        return (
          <Card key={a.id} style={{padding:14,marginBottom:8,borderLeft:`3px solid ${C[sevColor(a.severity)]||C.amber}`}}>
            <div style={{display:"flex",alignItems:"flex-start",gap:10,flexWrap:"wrap"}}>
              <Pill color={sevColor(a.severity)}>{a.severity==="critical"?"🚨":a.severity==="warning"?"⚠️":"ℹ️"} {a.issueType}</Pill>
              <div style={{flex:1,minWidth:280}}>
                <div style={{fontSize:13,fontWeight:500,color:C.ink}}>{a.title}</div>
                <div style={{fontSize:10,color:C.muted,marginTop:2}}>
                  {a.channelName && <>📺 {a.channelName} · </>}
                  Gửi {new Date(a.sentAt).toLocaleString("vi-VN")} bởi {a.sentByEmail}
                </div>
                <div style={{fontSize:11,color:C.text,marginTop:8,padding:8,background:C.bgAlt,borderRadius:4}}>📝 {a.description}</div>
                <div style={{fontSize:11,color:C.text,marginTop:6,padding:8,background:`${C[sevColor(a.severity)]}20`,borderRadius:4,borderLeft:`2px solid ${C[sevColor(a.severity)]}`}}>
                  ⚡ <strong>YÊU CẦU XỬ LÝ:</strong> {a.requiredAction}
                </div>
                {a.deadline && (
                  <div style={{fontSize:11,marginTop:6,color:isOverdue?C.red:daysLeft<=2?C.amber:C.text}}>
                    📅 Hạn: <strong>{a.deadline}</strong> ({isOverdue ? `Đã quá hạn ${-daysLeft} ngày` : `còn ${daysLeft} ngày`})
                  </div>
                )}
                {a.videoUrl && (
                  <a href={a.videoUrl} target="_blank" rel="noopener" style={{fontSize:11,color:C.accent,display:"inline-block",marginTop:6,fontFamily:"monospace"}}>
                    🎬 Video liên quan: {a.videoUrl}
                  </a>
                )}
                {a.partnerResponse && (
                  <div style={{marginTop:8,padding:8,background:C.greenSoft,borderRadius:4,fontSize:11}}>
                    💬 <strong>Phản hồi của bạn:</strong> {a.partnerResponse}
                    {a.resolvedAt && <div style={{fontSize:9,color:C.muted,marginTop:2}}>{new Date(a.resolvedAt).toLocaleString("vi-VN")}</div>}
                  </div>
                )}
              </div>
              <div style={{display:"flex",flexDirection:"column",gap:6,minWidth:140}}>
                <Pill color={a.status==="resolved"?"green":a.status==="acknowledged"?"blue":"amber"}>{a.status}</Pill>
                {a.status === "pending" && (
                  <Btn ghost onClick={()=>acknowledge(a)} style={{fontSize:10}} icon={Eye}>Xác nhận đọc</Btn>
                )}
                {a.status !== "resolved" && (
                  <Btn primary onClick={()=>{setResponseModal(a); setResponseText("");}} style={{fontSize:10}} icon={Send}>Báo đã xử lý</Btn>
                )}
              </div>
            </div>
          </Card>
        );
      })}

      {/* Response modal */}
      {responseModal && (
        <Modal title={`Phản hồi MCN: ${responseModal.title}`} onClose={()=>setResponseModal(null)} width={580}>
          <div style={{padding:10,background:C.bgAlt,borderRadius:4,marginBottom:12,fontSize:11}}>
            <strong>Yêu cầu:</strong> {responseModal.requiredAction}
          </div>
          <Field label="Mô tả những gì bạn đã làm để xử lý *">
            <textarea value={responseText} onChange={e=>setResponseText(e.target.value)}
              placeholder="VD: Đã edit video bỏ scene 0:30-1:20 + đổi thumbnail theo yêu cầu. Re-upload tại link XXX vào ngày YYY"
              style={{width:"100%",minHeight:120,padding:"8px 10px",fontSize:11,fontFamily:"inherit",border:`1px solid ${C.border}`,borderRadius:4}}/>
          </Field>
          <div style={{display:"flex",justifyContent:"flex-end",gap:8,marginTop:14,paddingTop:12,borderTop:`1px solid ${C.borderSoft}`}}>
            <Btn ghost onClick={()=>setResponseModal(null)}>Hủy</Btn>
            <Btn primary onClick={submitResponse} icon={Send} disabled={!responseText.trim()}>Gửi phản hồi</Btn>
          </div>
        </Modal>
      )}
    </div>
  );
}

// 📜 Partner sees YouTube policy news from MCN
function PartnerPolicyView({ currentUser, myPolicies, readKey }) {
  const C = useC();
  const [filter, setFilter] = useState("all");

  // Mark all as read when partner opens
  useEffect(() => {
    const cur = lsGet(readKey, { policies: [], alerts: [] });
    const allIds = myPolicies.map(p => p.id);
    const newReadPolicies = [...new Set([...(cur.policies||[]), ...allIds])];
    lsSet(readKey, { ...cur, policies: newReadPolicies });
  }, [myPolicies.length, readKey]);

  const filtered = filter === "all" ? myPolicies : myPolicies.filter(p => p.severity === filter || p.category === filter);

  const sevColor = (s) => s === "critical" ? "red" : s === "warning" ? "amber" : "blue";

  return (
    <div style={{padding:"28px",background:C.bg,minHeight:"100%"}}>
      <div style={{marginBottom:18}}>
        <div style={{fontFamily:"'Fraunces',serif",fontWeight:500,fontSize:22,color:C.ink}}>📜 Chính sách YouTube</div>
        <div style={{fontSize:11,color:C.muted}}>
          MCN cập nhật các chính sách mới của YouTube để bạn nắm và tuân thủ. Đọc kỹ các thông báo "🚨 Khẩn cấp".
        </div>
      </div>

      <div style={{display:"flex",gap:6,marginBottom:14,flexWrap:"wrap"}}>
        {[
          {id:"all", label:`Tất cả (${myPolicies.length})`},
          {id:"critical", label:`🚨 Khẩn (${myPolicies.filter(p=>p.severity==="critical").length})`},
          {id:"warning", label:`⚠️ Cảnh báo`},
          {id:"info", label:`ℹ️ Thông tin`},
          {id:"MONETIZATION", label:`💰 Monetization`},
          {id:"COPYRIGHT", label:`📜 Copyright`},
          {id:"COMMUNITY", label:`👥 Community`},
          {id:"MADE_FOR_KIDS", label:`👶 Made for Kids`},
        ].map(f => (
          <button key={f.id} onClick={()=>setFilter(f.id)}
            style={{padding:"5px 11px",fontSize:10,cursor:"pointer",border:`1px solid ${filter===f.id?C.ink:C.border}`,
              background:filter===f.id?C.ink:"transparent",color:filter===f.id?"#FFF":C.text,borderRadius:4}}>
            {f.label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <Card style={{padding:0}}>
          <EmptyState icon={BookOpen} title="Chưa có thông báo nào" description="MCN sẽ đăng cập nhật chính sách YT mới nhất tại đây."/>
        </Card>
      ) : filtered.map(p => (
        <Card key={p.id} style={{padding:14,marginBottom:8,borderLeft:`3px solid ${C[sevColor(p.severity)]||C.blue}`}}>
          <div style={{display:"flex",alignItems:"flex-start",gap:10,flexWrap:"wrap"}}>
            <Pill color={sevColor(p.severity)}>{p.severity==="critical"?"🚨":p.severity==="warning"?"⚠️":"ℹ️"} {p.severity}</Pill>
            <Pill color="gray">{p.category}</Pill>
            <div style={{flex:1,minWidth:280}}>
              <div style={{fontSize:14,fontWeight:500,color:C.ink}}>{p.title}</div>
              <div style={{fontSize:10,color:C.muted,marginTop:2}}>
                Đăng {new Date(p.publishedAt).toLocaleString("vi-VN")} · 📅 hiệu lực <strong>{p.effectiveDate}</strong>
              </div>
              <div style={{fontSize:12,color:C.text,marginTop:8,padding:10,background:C.bgAlt,borderRadius:4,lineHeight:1.6}}>
                {p.summary}
              </div>
              {p.details && (
                <details style={{marginTop:8,fontSize:11}}>
                  <summary style={{cursor:"pointer",color:C.accent,fontWeight:500}}>📖 Xem chi tiết đầy đủ</summary>
                  <div style={{marginTop:8,padding:12,background:C.card,border:`1px solid ${C.borderSoft}`,borderRadius:4,whiteSpace:"pre-wrap",color:C.text,lineHeight:1.6}}>
                    {p.details}
                  </div>
                </details>
              )}
              {p.sourceUrl && (
                <a href={p.sourceUrl} target="_blank" rel="noopener" style={{fontSize:11,color:C.accent,display:"inline-block",marginTop:8}}>
                  🔗 Đọc tại nguồn (YouTube official)
                </a>
              )}
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}

function PartnerProfileView({ currentUser, toast }) {
  const C = useC();
  return (
    <div style={{padding:"28px",background:C.bg,minHeight:"100%"}}>
      <div style={{marginBottom:18}}>
        <div style={{fontFamily:"'Fraunces',serif",fontWeight:500,fontSize:22,color:C.ink}}>Hồ sơ đối tác</div>
        <div style={{fontSize:11,color:C.muted}}>Thông tin tài khoản (chỉ xem — liên hệ MCN nếu cần thay đổi)</div>
      </div>
      <Card style={{padding:22,maxWidth:600}}>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
          <div><div style={{fontSize:9,fontWeight:600,color:C.muted,letterSpacing:"0.14em",textTransform:"uppercase",marginBottom:4}}>Họ tên</div><div style={{fontSize:13,fontWeight:500,color:C.ink}}>{currentUser.fullName}</div></div>
          <div><div style={{fontSize:9,fontWeight:600,color:C.muted,letterSpacing:"0.14em",textTransform:"uppercase",marginBottom:4}}>Email</div><div style={{fontSize:13,color:C.text}}>{currentUser.email}</div></div>
          <div><div style={{fontSize:9,fontWeight:600,color:C.muted,letterSpacing:"0.14em",textTransform:"uppercase",marginBottom:4}}>Công ty / Kênh</div><div style={{fontSize:13,color:C.text}}>{currentUser.companyName || "—"}</div></div>
          <div><div style={{fontSize:9,fontWeight:600,color:C.muted,letterSpacing:"0.14em",textTransform:"uppercase",marginBottom:4}}>Số điện thoại</div><div style={{fontSize:13,color:C.text}}>{currentUser.phone || "—"}</div></div>
          <div><div style={{fontSize:9,fontWeight:600,color:C.muted,letterSpacing:"0.14em",textTransform:"uppercase",marginBottom:4}}>Đối tác từ</div><div style={{fontSize:13,color:C.text}}>{currentUser.partnerSince ? new Date(currentUser.partnerSince).toLocaleDateString("vi-VN") : "—"}</div></div>
          <div><div style={{fontSize:9,fontWeight:600,color:C.muted,letterSpacing:"0.14em",textTransform:"uppercase",marginBottom:4}}>Trạng thái</div><Pill color={currentUser.status==="Active"?"green":"amber"}>{currentUser.status}</Pill></div>
        </div>
      </Card>
    </div>
  );
}

export default function App() {
  // ─── Language ─────────────────────────────────────────────────
  const [lang, setLang] = useState(() => lsGet(LS.LANG, "vi"));
  const t = useCallback((k) => TRANSLATIONS[lang]?.[k] || k, [lang]);
  useEffect(() => { lsSet(LS.LANG, lang); }, [lang]);

  // ─── Branding ─────────────────────────────────────────────────
  const [brand, setBrand] = useState(() => ({ ...DEFAULT_BRAND, ...(lsGet(LS.BRAND, {})) }));

  // ─── Theme (override accent with brand color) ─────────────────
  const theme = useMemo(() => ({
    ...baseTheme,
    accent: brand.primaryColor || baseTheme.accent,
    accentSoft: hexToSoft(brand.primaryColor || baseTheme.accent),
  }), [brand.primaryColor]);

  // ─── Auth ─────────────────────────────────────────────────────
  const [currentUser, setCurrentUser] = useState(() => {
    const auth = lsGet(LS.AUTH);
    if (!auth || !auth.expiresAt || Date.now() > auth.expiresAt) return null;
    const users = lsGet(LS.USERS, []);
    return users.find(u => u.id === auth.userId) || null;
  });

  // ─── Data State ────────────────────────────────────────────────
  const [state, setState] = useState(() => {
    const saved = lsGet(LS.STATE);
    if (saved && saved.version === APP_VERSION) {
      // Migration: ensure cmsList exists + run FK linkage
      if (!saved.cmsList) saved.cmsList = [...KUDO_CMS_LIST];
      if (!saved.contracts) saved.contracts = [];
      if (!saved.videoSubmissions) saved.videoSubmissions = [];
      if (!saved.decisionLog) saved.decisionLog = [];
      if (!saved.policyUpdates) saved.policyUpdates = [];
      if (!saved.partnerAlerts) saved.partnerAlerts = [];
      if (!saved.comments) saved.comments = [];
      return migrateAndRelink(saved);
    }
    const channels = makeInitialChannels();
    return migrateAndRelink({
      version: APP_VERSION,
      cmsList: [...KUDO_CMS_LIST],   // editable CMS list
      contracts: [],                  // partner contracts (empty by default)
      channels,
      partners: makePartners(),
      violations: makeViolations(channels),
      importHistory: [],
      videoAnalytics: [],
      partnerSharing: [],
      adsenseActivities: [],
      productInspections: [],
      videoSubmissions: [],           // PARTNER video submissions awaiting approval
      decisionLog: [],                // Strategic decisions (drop topic, expand, partner termination)
      policyUpdates: [],              // YouTube policy updates announced to partners
      partnerAlerts: [],              // Violation alerts sent to specific partners (with channel link)
      comments: [],                   // Comments on submissions/violations/contracts/channels (entityType + entityId)
    });
  });

  const [dailyStats] = useState(() => makeDailyStats());

  // ─── Active tab + persist ─────────────────────────────────────
  const [active, setActive] = useState(() => lsGet(LS.TAB, "overview"));
  useEffect(() => { lsSet(LS.TAB, active); }, [active]);

  // ─── Persist data (localStorage + PostgreSQL via scheduleBackendSync) ─
  useEffect(() => {
    lsSet(LS.STATE, state);
  }, [state]);

  // ─── Backend: load authoritative data from PostgreSQL on mount ────
  useEffect(() => {
    (async () => {
      try {
        const r = await fetch("/api/health");
        if (!r.ok) return; // backend not available, stay with localStorage
        // Load all keys at once
        const [remoteState, remoteUsers, remoteBrand] = await Promise.all([
          apiFetch(LS.STATE),
          apiFetch(LS.USERS),
          apiFetch(LS.BRAND),
        ]);
        // 🚀 Smart merge: prefer backend for shared data BUT preserve local-only items
        // Especially videoSubmissions/decisionLog/comments etc. — these have unique IDs
        // that can be safely union-merged. Avoids losing data when sync fails.
        if (remoteState?.version) {
          setState(localState => {
            // Helper to union arrays by id, preferring local (newer) when conflict
            const unionById = (remote = [], local = []) => {
              const map = new Map();
              remote.forEach(item => { if (item?.id) map.set(item.id, item); });
              local.forEach(item => { if (item?.id) map.set(item.id, item); }); // local wins
              return [...map.values()];
            };
            const merged = { ...remoteState };
            // Union arrays where local items might exist that haven't synced yet
            ["videoSubmissions","decisionLog","comments","partnerAlerts","policyUpdates","contracts","violations","channels","partners"].forEach(key => {
              if (Array.isArray(localState?.[key]) && localState[key].length > 0) {
                merged[key] = unionById(remoteState[key] || [], localState[key]);
              }
            });
            return merged;
          });
        }
        // Sync users to localStorage (picked up by AuthScreen)
        if (Array.isArray(remoteUsers) && remoteUsers.length) {
          try { localStorage.setItem(LS.USERS, JSON.stringify(remoteUsers)); } catch {}
        }
        // Sync brand
        if (remoteBrand && Object.keys(remoteBrand).length) {
          setBrand(b => ({ ...b, ...remoteBrand }));
          try { localStorage.setItem(LS.BRAND, JSON.stringify(remoteBrand)); } catch {}
        }
      } catch { /* backend unreachable — offline mode, localStorage only */ }
    })();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Auto-snapshot CMS daily (1x per calendar day) ────────────
  // Runs ~10s after app load to give state time to settle.
  // Idempotent: backend uses (cms_id, snapshot_date) PK so multiple runs same day = upsert.
  useEffect(() => {
    if (!currentUser || (state.cmsList || []).length === 0) return;
    const todayKey = new Date().toISOString().slice(0, 10);
    const lastSnapshotKey = "meridian-cms-daily-last";
    const last = lsGet(lastSnapshotKey, "");
    if (last === todayKey) return; // already snapshotted today

    const timer = setTimeout(async () => {
      const result = await pushCmsDailySnapshot(state, "auto");
      if (result.ok) {
        lsSet(lastSnapshotKey, todayKey);
        console.log(`[cms-daily] Auto-snapshot ${result.count} CMS on ${todayKey}`);
      } else {
        console.warn(`[cms-daily] Auto-snapshot failed:`, result.error || "unknown");
      }
    }, 10_000);
    return () => clearTimeout(timer);
  }, [currentUser, state.cmsList?.length, state.channels?.length]); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Toast & Confirm ──────────────────────────────────────────
  const [toasts, setToasts] = useState([]);
  const toast = useCallback((msg, type = "info") => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, { id, msg, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3500);
  }, []);
  const [confirmState, confirm] = useConfirm();

  // ─── Logout ───────────────────────────────────────────────────
  const handleLogout = async () => {
    const ok = await confirm({ title:"Đăng xuất?", message:"Bạn sẽ phải đăng nhập lại để tiếp tục." });
    if (ok) {
      lsDel(LS.AUTH);
      setCurrentUser(null);
      toast("Đã đăng xuất", "info");
    }
  };

  // ─── Session timeout: auto-logout after idle period ─────────────
  // Default 60min, configurable per-user via lsSet("meridian-session-timeout-min")
  useEffect(() => {
    if (!currentUser) return;
    const timeoutMin = Number(lsGet("meridian-session-timeout-min", 60)) || 60;
    let lastActivity = Date.now();
    let warningShown = false;

    const updateActivity = () => {
      lastActivity = Date.now();
      warningShown = false;
    };

    // Track user activity
    const events = ["mousedown","keydown","scroll","touchstart"];
    events.forEach(e => window.addEventListener(e, updateActivity, { passive: true }));

    const checkInterval = setInterval(() => {
      const idleMin = (Date.now() - lastActivity) / 60000;
      if (idleMin >= timeoutMin) {
        clearInterval(checkInterval);
        events.forEach(e => window.removeEventListener(e, updateActivity));
        logActivity("AUTO_LOGOUT_IDLE", currentUser.id, `Idle ${Math.round(idleMin)}min`);
        lsDel(LS.AUTH);
        setCurrentUser(null);
        toast(`🔒 Đã tự đăng xuất sau ${timeoutMin} phút không hoạt động`, "warning");
      } else if (idleMin >= timeoutMin - 5 && !warningShown) {
        warningShown = true;
        toast(`⚠️ Sẽ tự logout sau ~5 phút nữa nếu không hoạt động`, "warning");
      }
    }, 30000); // check every 30s

    return () => {
      clearInterval(checkInterval);
      events.forEach(e => window.removeEventListener(e, updateActivity));
    };
  }, [currentUser]);

  // ─── AI helper v5.1: cached, prompt-cached, retry-aware ───────
  // Usage:
  //   callAI(messages)                  // không cache
  //   callAI(messages, system)          // không cache
  //   callAI(messages, system, opts)    // opts: { cacheTopic, ttlMs, onChunk, skipCache, useStateHash }
  const callAI = useCallback(async (messages, system = "", opts = {}) => {
    const apiKey = lsGet("meridian-api-key", "") || window.MERIDIAN_API_KEY;
    let cacheKey = null;
    if (opts.cacheTopic) {
      const promptStr = messages.map(m => `${m.role}:${m.content}`).join("\n");
      const promptHash = (await sha256(promptStr)).slice(0, 16);
      const dataHash = opts.useStateHash !== false ? (await computeStateHash(state)).slice(0, 16) : "";
      const bucket = opts.bucket === "hour" ? hourBucket() : dayBucket();
      cacheKey = `ai:${opts.cacheTopic}:${dataHash}:${promptHash}:${bucket}`;
    }
    return await callClaude(messages, system, apiKey, {
      cacheKey,
      ttlMs: opts.ttlMs || 24*3600*1000,
      onChunk: opts.onChunk,
      skipCache: opts.skipCache,
      maxTokens: opts.maxTokens || 2000,
    });
  }, [state]);

  // ─── Cross-tab sync ─────────────────────────────────────────
  useEffect(() => {
    const bc = getBC();
    if (!bc) return;
    const onMsg = (ev) => {
      if (ev.data?.type === "state-update") {
        const fresh = lsGet(LS.STATE);
        if (fresh && fresh._v !== state._v) setState(fresh);
      } else if (ev.data?.type === "logout") {
        setCurrentUser(null);
      }
    };
    bc.addEventListener("message", onMsg);
    return () => bc.removeEventListener("message", onMsg);
  }, [state]);

  // ─── Auto-import folder watch (every N minutes) ─────────────
  const automation = useMemo(() => lsGet("meridian-v51-automation", {
    folderWatch: false,
    folderInterval: 30,           // minutes
    autoBackup: false,
    autoBackupHour: 3,             // 03:00
    webhooks: [],                  // [{type, url, chatId, events:[]}]
    ytApiKey: "",
    ytSyncEnabled: false,
    ytSyncInterval: 360,           // minutes (6h)
    aiCacheEnabled: true,
    aiCacheTTLDays: 1,
  }), []);
  const [autoCfg, setAutoCfg] = useState(automation);
  useEffect(() => { lsSet("meridian-v51-automation", autoCfg); }, [autoCfg]);

  // Folder watch setup
  useEffect(() => {
    if (!autoCfg.folderWatch) return;
    let cancelled = false;
    const tick = async () => {
      try {
        const handle = await getFolderHandle();
        if (!handle || !await verifyPermission(handle, "read")) return;
        const seen = new Set((state.importHistory || []).map(h => h.fileHash).filter(Boolean));
        for await (const fileHandle of iterateFiles(handle)) {
          if (cancelled) return;
          const f = await fileHandle.getFile();
          const ext = f.name.split('.').pop().toLowerCase();
          if (!["csv","tsv","xlsx","xlsm","xls"].includes(ext)) continue;
          const buf = await f.arrayBuffer();
          const hash = await sha256Buffer(buf);
          if (seen.has(hash)) continue;
          // New file detected — try to import
          try {
            const wb = await readFileAsWorkbook(f);
            const cands = detectFileType(wb);
            if (cands.length === 0) continue;
            const det = cands[0].detector;
            const parsed = det.parse(wb);
            const result = det.apply(parsed, state, setState);
            setState(s => ({
              ...s,
              importHistory: [{
                id: `IMP${Date.now()}`,
                filename: f.name,
                fileHash: hash,
                type: det.label,
                timestamp: new Date().toISOString(),
                rows: parsed.items?.length || 0,
                size: f.size,
                auto: true,
                ...result,
              }, ...(s.importHistory || [])].slice(0, 50)
            }));
            toast(`📂 Tự động import: ${f.name} (${result.created || 0} mới)`, "success");
            seen.add(hash);
          } catch(e) { console.warn("Auto-import failed:", f.name, e); }
        }
      } catch(e) { console.warn("Folder watch error:", e); }
    };
    const id = setInterval(tick, autoCfg.folderInterval * 60 * 1000);
    setTimeout(tick, 5000); // first run after 5s
    return () => { cancelled = true; clearInterval(id); };
  }, [autoCfg.folderWatch, autoCfg.folderInterval]);

  // Auto-backup to JSON download (user can drag to Drive)
  useEffect(() => {
    if (!autoCfg.autoBackup) return;
    const tick = () => {
      const h = new Date().getHours();
      const last = lsGet("meridian-v51-last-backup", 0);
      if (h === autoCfg.autoBackupHour && Date.now() - last > 23 * 3600 * 1000) {
        downloadBackup(state, `meridian-auto-${new Date().toISOString().slice(0,10)}.json`);
        lsSet("meridian-v51-last-backup", Date.now());
        toast("📦 Đã tự động backup", "info");
      }
    };
    const id = setInterval(tick, 30 * 60 * 1000); // check every 30 min
    return () => clearInterval(id);
  }, [autoCfg.autoBackup, autoCfg.autoBackupHour, state]);

  // YouTube API auto-sync
  useEffect(() => {
    if (!autoCfg.ytSyncEnabled || !autoCfg.ytApiKey) return;
    const tick = async () => {
      try {
        const ids = state.channels.map(c => c.ytId).filter(Boolean).slice(0, 200);
        if (!ids.length) return;
        const items = await ytFetchChannelStats(autoCfg.ytApiKey, ids);
        if (!items.length) return;
        let updated = 0;
        setState(s => {
          const channels = [...s.channels];
          items.forEach(it => {
            const idx = channels.findIndex(c => c.ytId === it.id);
            if (idx >= 0) {
              channels[idx].subscribers = parseInt(it.statistics?.subscriberCount || 0);
              channels[idx].monthlyViews = parseInt(it.statistics?.viewCount || 0);
              channels[idx].lastSync = 0;
              channels[idx].syncStatus = "Synced";
              if (it.status?.privacyStatus) channels[idx].monetization = it.status.privacyStatus === "public" ? "Monetized" : "Demonetized";
              updated++;
            }
          });
          return { ...s, channels };
        });
        if (updated > 0) toast(`🔄 YouTube sync: ${updated} kênh cập nhật`, "success");
      } catch(e) { console.warn("YT sync failed:", e); }
    };
    const id = setInterval(tick, autoCfg.ytSyncInterval * 60 * 1000);
    setTimeout(tick, 10000);
    return () => clearInterval(id);
  }, [autoCfg.ytSyncEnabled, autoCfg.ytApiKey, autoCfg.ytSyncInterval]);

  // Webhook dispatcher: send Critical alerts
  useEffect(() => {
    const enabled = (autoCfg.webhooks || []).filter(w => w.url && (w.events || []).includes("critical"));
    if (!enabled.length) return;
    const lastSent = lsGet("meridian-v51-webhook-sent", {});
    const critical = state.channels.filter(c => c.health === "Critical");
    critical.forEach(c => {
      if (lastSent[c.id] && Date.now() - lastSent[c.id] < 6*3600*1000) return; // throttle 6h
      const msg = `🔴 *CẢNH BÁO MCN*\nKênh: ${c.name}\nCMS: ${c.cms}\nTình trạng: ${c.monetization}\nStrikes: ${c.strikes || 0}\nĐề xuất: Review nội dung 30 ngày qua`;
      enabled.forEach(w => sendWebhook(w, msg));
      lastSent[c.id] = Date.now();
    });
    lsSet("meridian-v51-webhook-sent", lastSent);
  }, [state.channels, autoCfg.webhooks]);

  // ─── Daily Digest: send morning summary via webhook ─────────────
  useEffect(() => {
    if (!autoCfg.dailyDigest) return;
    const enabled = (autoCfg.webhooks || []).filter(w => w.url && (w.events || []).includes("digest"));
    if (!enabled.length) return;
    const tick = () => {
      const now = new Date();
      const h = now.getHours();
      const m = now.getMinutes();
      const targetHour = autoCfg.dailyDigestHour ?? 8;
      const last = lsGet("meridian-v51-last-digest", 0);
      // Send between targetHour:00 and targetHour:30, and only once per day
      if (h === targetHour && m < 30 && Date.now() - last > 23 * 3600 * 1000) {
        // Compose digest
        const totalRev = state.channels.reduce((s,c)=>s+c.monthlyRevenue, 0);
        const monetized = state.channels.filter(c=>c.monetization==="Monetized").length;
        const demonetized = state.channels.filter(c=>c.monetization==="Demonetized").length;
        const critical = state.channels.filter(c=>c.health==="Critical").length;
        const recentVio = (state.violations || []).filter(v => {
          if (!v.date) return false;
          return Date.now() - new Date(v.date).getTime() < 7*86400000;
        }).length;
        const top3 = [...state.channels].sort((a,b)=>b.monthlyRevenue-a.monthlyRevenue).slice(0,3);
        const drops = [...state.channels]
          .filter(c => c.changeHistory?.some(h => h.changes?.some(ch => ch.includes("subs") && ch.includes("→"))))
          .slice(0, 3);
        const dh = computeDataHealth(state);
        const msg = `📅 *MERIDIAN DAILY DIGEST*
${new Date().toLocaleDateString("vi-VN",{weekday:"long",day:"numeric",month:"numeric",year:"numeric"})}

📊 *Tổng quan:*
• Doanh thu tháng: $${totalRev.toLocaleString()}
• Kênh: ${state.channels.length} (${monetized} kiếm tiền, ${demonetized} tắt MN)
• Critical: ${critical} kênh
• Vi phạm 7 ngày qua: ${recentVio}

💎 *Top 3 doanh thu:*
${top3.map((c,i) => `${i+1}. ${c.name}: $${c.monthlyRevenue.toLocaleString()}`).join("\n")}

🩺 *Data Health:* ${dh.score}/100
${dh.channels.orphan > 0 ? `⚠️ ${dh.channels.orphan} kênh chưa link CMS` : "✅ Liên kết tốt"}

— Meridian MCN v5.1 AI`;
        enabled.forEach(w => sendWebhook(w, msg));
        lsSet("meridian-v51-last-digest", Date.now());
      }
    };
    const id = setInterval(tick, 5 * 60 * 1000); // check every 5 min
    setTimeout(tick, 5000);
    return () => clearInterval(id);
  }, [autoCfg.dailyDigest, autoCfg.dailyDigestHour, autoCfg.webhooks, state]);

  // ─── Periodic Audit Scheduler ─────────────────────────────────
  useEffect(() => {
    const auditCfg = lsGet("meridian-v51-audit-cfg", null);
    if (!auditCfg?.enabled) return;
    const intervalMs = { weekly: 7, monthly: 30, quarterly: 90 }[auditCfg.frequency || "monthly"] * 86400000;
    const tick = () => {
      const last = auditCfg.lastRun || 0;
      if (Date.now() - last < intervalMs) return; // not yet due
      // Run audit: detect anomalies + send report
      const anomalies = detectAnomalies(state);
      const topicStrategy = computeTopicStrategy(state);
      const dropTopics = topicStrategy.filter(t => t.recommendation === "DROP");
      const expandTopics = topicStrategy.filter(t => t.recommendation === "EXPAND");

      const reportMsg = `📋 *MERIDIAN PERIODIC AUDIT*
${auditCfg.frequency.toUpperCase()} report · ${new Date().toLocaleDateString("vi-VN")}

🔴 *Anomalies* (${anomalies.length}):
${anomalies.slice(0,5).map(a => `• [${a.severity}] ${a.title}`).join("\n")}

📊 *Topic Strategy*:
• EXPAND: ${expandTopics.map(t=>t.name).join(", ")||"none"}
• DROP: ${dropTopics.map(t=>t.name).join(", ")||"none"}

— Meridian MCN AI Audit`;

      // Send via webhooks if any have "digest" event enabled
      const enabled = (autoCfg.webhooks || []).filter(w => w.url && (w.events || []).includes("digest"));
      enabled.forEach(w => sendWebhook(w, reportMsg).catch(()=>{}));

      // Update last run
      lsSet("meridian-v51-audit-cfg", { ...auditCfg, lastRun: Date.now() });

      // Auto-record decision in log if drop topics detected (with HIGH confidence)
      if (dropTopics.length > 0 && auditCfg.autoLogDecisions) {
        setState(s => ({
          ...s,
          decisionLog: [
            ...dropTopics.map(t => ({
              id: `D${Date.now()}_${t.name}`,
              type: "DROP_TOPIC",
              target: t.name,
              reason: `Auto-flagged by ${auditCfg.frequency} audit. Score: ${t.strategyScore}/100. ${t.channels} kênh, ${(t.demoRate*100).toFixed(0)}% demonetized.`,
              dataSnapshot: { ...t },
              expectedOutcome: "Cần review thủ công",
              reviewDate: new Date(Date.now() + 30*86400000).toISOString().slice(0,10),
              decidedBy: "system",
              decidedByEmail: "system@meridian.local",
              decidedAt: new Date().toISOString(),
              outcome: null,
              status: "pending-review",
              autoGenerated: true,
            })),
            ...(s.decisionLog || []),
          ].slice(0, 200),
        }));
      }
    };
    const id = setInterval(tick, 60 * 60 * 1000); // check every hour
    setTimeout(tick, 10_000);
    return () => clearInterval(id);
  }, [state, autoCfg.webhooks]);

  // ─── Auto AI Insight on Overview ──────────────────────────────
  const [autoInsight, setAutoInsight] = useState(null);
  const [autoInsightLoading, setAutoInsightLoading] = useState(false);
  const runAutoInsight = async () => {
    setAutoInsightLoading(true);
    const totalRev = state.channels.reduce((s,c)=>s+c.monthlyRevenue,0);
    const critical = state.channels.filter(c=>c.health==="Critical").length;
    const ctx = `Dữ liệu MCN hôm nay: ${state.channels.length} kênh, ${state.partners.length} đối tác, doanh thu tháng $${totalRev.toLocaleString()}, ${critical} kênh critical.`;
    const r = await callAI(
      [{ role:"user", content:`${ctx}\n\nĐưa insight ngắn (3-4 dòng) về tình hình hôm nay: điểm nổi bật, vấn đề cần chú ý, gợi ý hành động ưu tiên. Tiếng Việt, có số liệu cụ thể.` }],
      "",
      { cacheTopic: "daily-insight", ttlMs: 12*3600*1000, maxTokens: 600 }
    );
    setAutoInsight(r);
    setAutoInsightLoading(false);
  };

  // ─── If not logged in, show AuthScreen ────────────────────────
  if (!currentUser) {
    return (
      <ThemeContext.Provider value={theme}>
        <LangContext.Provider value={{ lang, t }}>
          <style>{globalStyles}</style>
          <AuthScreen
            onLogin={(u) => { setCurrentUser(u); toast(`Chào mừng, ${u.fullName}!`, "success"); }}
            brand={brand}
            lang={lang}
            setLang={setLang}
          />
        </LangContext.Provider>
      </ThemeContext.Provider>
    );
  }

  // 🔒 SECURITY: PARTNER role → completely separate UI (admin views inaccessible)
  if (currentUser.role === "PARTNER") {
    return (
      <ThemeContext.Provider value={theme}>
        <LangContext.Provider value={{ lang, t }}>
          <ToastCtx.Provider value={toast}>
            <style>{globalStyles}</style>
            <PartnerPortal
              currentUser={currentUser}
              state={state}
              setState={setState}
              brand={brand}
              onLogout={handleLogout}
              toast={toast}
              confirm={confirm}
              lang={lang}
              setLang={setLang}
            />
            <ToastContainer toasts={toasts}/>
            <ConfirmDialog {...confirmState}/>
          </ToastCtx.Provider>
        </LangContext.Provider>
      </ThemeContext.Provider>
    );
  }

  // ─── Sidebar items ────────────────────────────────────────────
  // Pending partner approvals count (for badge)
  const pendingPartnerCount = (() => {
    const u = lsGet(LS.USERS, []);
    return u.filter(x => x.role === "PARTNER" && x.status === "PendingApproval").length
      + (state.videoSubmissions || []).filter(s => s.status === "pending").length;
  })();

  // 🚀 Compute Smart Inbox tasks ONCE per state/user change, share to all consumers
  const inboxTasks = useMemo(() => {
    if (!currentUser) return [];
    return computeInboxTasks(state, currentUser);
  }, [state, currentUser]);
  const inboxCount = inboxTasks.length;

  // Sidebar — top section: Inbox + main sections
  const sidebarItems = [
    { id:"inbox", label:"📥 Inbox", icon:Bell, hot: inboxCount > 0, badge: inboxCount },
    { id:"overview", label:t("overview"), icon:Gauge },
    { id:"partner-mgmt", label:"🤝 Đối tác & Workflow", icon:Users, hot: pendingPartnerCount > 0, badge: pendingPartnerCount },
    { id:"contracts", label:"Hợp đồng", icon:Briefcase },
    { id:"partner-comms", label:"Thông báo Partners", icon:Mail },
    { id:"channels", label:t("channels"), icon:Tv },
    { id:"cms", label:t("cms"), icon:Server },
    { id:"import", label:t("importData"), icon:Upload, hot:true },
    { id:"analytics", label:"Analytics", icon:BarChart2 },
    { id:"compliance", label:t("compliance"), icon:ShieldAlert, special:true },
    { id:"ai-strategy", label:"AI Strategy", icon:Sparkles, special:true, hot:true },
    { id:"ai", label:t("aiAgent"), icon:Bot, special:true },
    ...(currentUser?.role === "SUPER_ADMIN" ? [{ id:"rbac-audit", label:"🔐 RBAC & Audit", icon:Shield }] : []),
    { id:"settings", label:t("settings"), icon:Settings },
  ];

  const titles = {
    overview: t("overview"),
    dashboard: t("dashboard"),
    partners: t("partners"),
    channels: t("channels"),
    cms: t("cms"),
    topics: t("topics") + " — Chủ đề trong MCN",
    import: t("importData") + " — Smart Upload",
    finance: t("finance"),
    reports: t("reports"),
    alerts: t("alerts"),
    inspection: "Kiểm định sản phẩm",
    ai: t("aiAgent"),
    compliance: t("compliance"),
    settings: t("settings"),
  };

  return (
    <ThemeContext.Provider value={theme}>
      <LangContext.Provider value={{ lang, t }}>
        <ToastCtx.Provider value={toast}>
          <style>{globalStyles}</style>
          <div style={{display:"flex",height:"100vh",overflow:"hidden",background:theme.bg}}>
            {/* SIDEBAR */}
            <aside style={{width:230,background:theme.ink,flexShrink:0,display:"flex",flexDirection:"column"}}>
              <div style={{padding:"22px 18px 18px",borderBottom:"1px solid #1F2937"}}>
                <div style={{display:"flex",alignItems:"center",gap:10}}>
                  {brand.logoData ? (
                    <img src={brand.logoData} alt={brand.appName} style={{width:36,height:36,borderRadius:5,objectFit:"cover"}}/>
                  ) : (
                    <div style={{width:36,height:36,background:theme.accent,borderRadius:5,display:"flex",alignItems:"center",justifyContent:"center"}}>
                      <span style={{fontFamily:"'Fraunces',serif",fontWeight:700,fontSize:18,color:"#FFF"}}>{brand.appName?.[0]?.toUpperCase()||"M"}</span>
                    </div>
                  )}
                  <div style={{minWidth:0,flex:1}}>
                    <div style={{fontFamily:"'Fraunces',serif",fontWeight:500,fontSize:15,color:"#FFF",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{brand.appName}</div>
                    <div style={{fontSize:9,color:theme.ai,letterSpacing:"0.18em",textTransform:"uppercase",marginTop:1,fontWeight:600}}>v{APP_VERSION} · {APP_BUILD}</div>
                  </div>
                </div>
              </div>
              <nav style={{flex:1,padding:"10px 8px",overflowY:"auto"}}>
                <div style={{fontSize:9,fontWeight:600,letterSpacing:"0.18em",textTransform:"uppercase",
                  color:"#4B5563",padding:"6px 10px 4px"}}>{t("manage")}</div>
                {sidebarItems.map(item => {
                  const isActive = active === item.id;
                  const Icon = item.icon;
                  return (
                    <button key={item.id} onClick={() => setActive(item.id)}
                      style={{width:"100%",display:"flex",alignItems:"center",gap:10,padding:"7px 10px",
                        marginBottom:1,textAlign:"left",fontSize:12,cursor:"pointer",
                        background:isActive?"#1F2937":"transparent",
                        color:isActive?"#FFF":item.special?"#A78BFA":"#9CA3AF",
                        border:"none",borderLeft:`2px solid ${isActive?theme.accent:"transparent"}`,
                        borderRadius:3,fontWeight:isActive?500:400}}>
                      <Icon size={14} strokeWidth={isActive?2:1.6}/>
                      <span style={{whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis",flex:1}}>{item.label}</span>
                      {item.badge !== undefined && item.badge > 0 && <span style={{fontSize:9,fontWeight:600,padding:"1px 6px",background:"#F59E0B",color:"#FFF",borderRadius:8,letterSpacing:"0.05em"}}>{item.badge}</span>}
                      {item.hot && !item.badge && !isActive && <span style={{fontSize:8,fontWeight:700,padding:"1px 5px",background:theme.accent,color:"#FFF",borderRadius:2,letterSpacing:"0.1em"}}>NEW</span>}
                      {item.special && !isActive && !item.hot && <Sparkles size={10} style={{color:"#A78BFA"}}/>}
                    </button>
                  );
                })}
              </nav>
              <div style={{padding:"10px 12px",borderTop:"1px solid #1F2937"}}>
                <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}>
                  <div style={{width:30,height:30,background:"#374151",borderRadius:"50%",display:"flex",
                    alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:500,color:"#FFF",flexShrink:0}}>
                    {currentUser.fullName?.split(" ").map(n=>n[0]).slice(0,2).join("").toUpperCase()}
                  </div>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:11,fontWeight:500,color:"#FFF",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{currentUser.fullName}</div>
                    <div style={{fontSize:9,color:"#6B7280"}}>{currentUser.role}</div>
                  </div>
                </div>
                <button onClick={handleLogout} style={{width:"100%",display:"flex",alignItems:"center",justifyContent:"center",gap:6,padding:"6px",fontSize:11,
                  background:"transparent",color:"#9CA3AF",border:"1px solid #374151",borderRadius:4,cursor:"pointer"}}>
                  <LogOut size={11}/> {t("logout")}
                </button>
              </div>
            </aside>

            {/* MAIN */}
            <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden",background:theme.bg}}>
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",
                padding:"14px 28px",borderBottom:`1px solid ${theme.border}`,background:theme.bg}}>
                <h1 style={{fontFamily:"'Fraunces',serif",fontWeight:500,fontSize:20,color:theme.ink,margin:0,letterSpacing:"-0.02em"}}>{titles[active]||active}</h1>
                <div style={{display:"flex",alignItems:"center",gap:10}}>
                  <SyncStatusBadge/>
                  <NotificationBell tasks={inboxTasks} currentUser={currentUser} onNavigate={setActive}/>
                  <button onClick={()=>setLang(lang==="vi"?"en":"vi")}
                    style={{display:"flex",alignItems:"center",gap:5,fontSize:11,padding:"5px 10px",
                      background:"transparent",border:`1px solid ${theme.border}`,borderRadius:4,cursor:"pointer",color:theme.text}}>
                    <Languages size={12}/> {lang==="vi" ? "🇻🇳 VI" : "🇬🇧 EN"}
                  </button>
                  <Pill color="ai">v{APP_VERSION} · {APP_BUILD}</Pill>
                </div>
              </div>
              <div style={{flex:1,overflow:"auto",display:(active==="ai"||active==="compliance")?"flex":"block",flexDirection:"column"}}>
                {active==="inbox" && <SmartInbox tasks={inboxTasks} currentUser={currentUser} onNavigate={setActive}/>}
                {active==="overview" && <OverviewPage state={state} currentUser={currentUser} onNavigate={setActive} dailyStats={dailyStats} brand={brand}/>}
                {/* Partners view merged into Partner Management — redirect old route */}
                {active==="partners" && (() => { setTimeout(()=>setActive("partner-mgmt"), 0); return null; })()}
                {active==="contracts" && <ContractsView state={state} setState={setState} currentUser={currentUser} toast={toast} confirm={confirm} onNavigate={setActive}/>}
                {active==="partner-mgmt" && <PartnerManagementView state={state} setState={setState} currentUser={currentUser} toast={toast} confirm={confirm} onNavigate={setActive}/>}
                {active==="partner-comms" && <PartnerCommsView state={state} setState={setState} currentUser={currentUser} toast={toast} confirm={confirm}/>}
                {active==="channels" && <ChannelsView state={state} setState={setState} currentUser={currentUser} toast={toast} confirm={confirm} onNavigate={setActive}/>}
                {active==="cms" && <CmsView state={state} setState={setState} callAI={callAI} toast={toast} confirm={confirm} onNavigate={setActive}/>}
                {active==="import" && <UnifiedImportView state={state} setState={setState}
                  importHistory={state.importHistory||[]}
                  setImportHistory={(fn)=>setState(s=>({...s, importHistory: typeof fn === "function" ? fn(s.importHistory||[]) : fn}))}
                  toast={toast}/>}
                {/* Backwards-compat: redirect old "bulk-upload" route → "import" */}
                {active==="bulk-upload" && (() => { setTimeout(()=>setActive("import"), 0); return null; })()}
                {/* Analytics = gộp Reports + Finance + Topics insights */}
                {active==="analytics" && <AnalyticsView state={state} setState={setState} currentUser={currentUser} dailyStats={dailyStats} callAI={callAI} toast={toast} onNavigate={setActive} brand={brand}/>}
                {/* "inspection" view removed — đã merge vào QC workflow checklist (PartnerManagementView) */}
                {active==="inspection" && (() => { setTimeout(()=>setActive("partner-mgmt"), 0); return null; })()}
                {active==="ai-strategy" && <AIStrategicView state={state} setState={setState} currentUser={currentUser} callAI={callAI} toast={toast} onNavigate={setActive}/>}
                {active==="ai" && <AIAgentView state={state} callAI={callAI}/>}
                {active==="rbac-audit" && <RBACAuditView state={state} currentUser={currentUser} toast={toast}/>}
                {/* Compliance = gộp AlertsView + ComplianceView */}
                {active==="compliance" && <ComplianceView state={state} setState={setState} currentUser={currentUser} callAI={callAI} toast={toast} onNavigate={setActive}/>}
                {active==="settings" && <SettingsView state={state} setState={setState} brand={brand} setBrand={setBrand} currentUser={currentUser} toast={toast} confirm={confirm} lang={lang} setLang={setLang} autoCfg={autoCfg} setAutoCfg={setAutoCfg}/>}
                {/* Backwards-compat: redirect old tabs to new equivalents */}
                {(active==="dashboard" || active==="topics") && (() => { setTimeout(()=>setActive(active==="dashboard" ? "overview" : "channels"), 0); return null; })()}
                {active==="reports" && (() => { setTimeout(()=>setActive("analytics"), 0); return null; })()}
                {active==="finance" && (() => { setTimeout(()=>setActive("analytics"), 0); return null; })()}
                {active==="alerts" && (() => { setTimeout(()=>setActive("compliance"), 0); return null; })()}
              </div>
            </div>
          </div>
          <ToastContainer toasts={toasts}/>
          <ConfirmDialog {...confirmState}/>
        </ToastCtx.Provider>
      </LangContext.Provider>
    </ThemeContext.Provider>
  );
}
