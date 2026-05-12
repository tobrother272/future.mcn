import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { C, FONT_HEADING, FONT_MONO, RADIUS, SHADOW } from "@/styles/theme";
import { Button, Input, Field } from "@/components/ui";
import { useLogin, useRegisterPartner } from "@/api/auth.api";
import { useToast } from "@/stores/notificationStore";

const loginSchema = z.object({
  login:    z.string().min(1, "Vui lòng nhập email hoặc username"),
  password: z.string().min(1, "Vui lòng nhập mật khẩu"),
});

const registerSchema = z.object({
  email:        z.string().email("Email không hợp lệ"),
  password:     z.string().min(8, "Mật khẩu tối thiểu 8 ký tự"),
  full_name:    z.string().min(1, "Vui lòng nhập họ tên"),
  company_name: z.string().min(1, "Vui lòng nhập tên công ty"),
  phone:        z.string().optional(),
});

type LoginForm = z.infer<typeof loginSchema>;

type RegisterForm = z.infer<typeof registerSchema>;

export default function AuthPage() {
  const [tab, setTab] = useState<"login" | "register">("login");
  const navigate = useNavigate();
  const toast = useToast();
  const login = useLogin();
  const register = useRegisterPartner();

  const loginForm = useForm<LoginForm>({ resolver: zodResolver(loginSchema) });
  const registerForm = useForm<RegisterForm>({ resolver: zodResolver(registerSchema) });

  const onLogin = loginForm.handleSubmit(async (data) => {
    try {
      const result = await login.mutateAsync(data);
      const name = "full_name" in result.user ? String(result.user.full_name) : ("name" in result.user ? String(result.user.name) : "");
      toast.success("Đăng nhập thành công", `Xin chào ${name}`);
      navigate(result.user.userType === "partner" ? "/portal" : "/dashboard");
    } catch (err) {
      toast.error("Đăng nhập thất bại", err instanceof Error ? err.message : "Kiểm tra lại email/mật khẩu");
    }
  });

  const onRegister = registerForm.handleSubmit(async (data) => {
    try {
      await register.mutateAsync(data);
      toast.success("Đăng ký thành công", "Tài khoản đang chờ admin duyệt");
      setTab("login");
    } catch (err) {
      toast.error("Đăng ký thất bại", err instanceof Error ? err.message : "Vui lòng thử lại");
    }
  });

  return (
    <div style={{
      minHeight: "100vh", background: C.bg,
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: 24,
    }}>
      <div style={{
        width: 420,
        background: C.bgCard,
        border: `1px solid ${C.border}`,
        borderRadius: RADIUS.xl,
        boxShadow: SHADOW.lg,
        overflow: "hidden",
      }}>
        {/* Header */}
        <div style={{
          padding: "32px 32px 24px",
          borderBottom: `1px solid ${C.border}`,
          textAlign: "center",
        }}>
          <div style={{ fontFamily: FONT_MONO, fontSize: 20, fontWeight: 700, color: C.blue, letterSpacing: 2, marginBottom: 4 }}>
            MERIDIAN
          </div>
          <div style={{ fontSize: 11, color: C.textMuted, letterSpacing: 1 }}>MCN MANAGEMENT PLATFORM</div>
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", borderBottom: `1px solid ${C.border}` }}>
          {(["login", "register"] as const).map((t) => (
            <button key={t} onClick={() => setTab(t)} style={{
              flex: 1, padding: "12px 0", fontSize: 13, fontWeight: 600,
              background: "none", border: "none", cursor: "pointer",
              color: tab === t ? C.blue : C.textSub,
              borderBottom: tab === t ? `2px solid ${C.blue}` : "2px solid transparent",
              transition: "all 0.15s",
            }}>
              {t === "login" ? "Đăng nhập" : "Đăng ký Partner"}
            </button>
          ))}
        </div>

        {/* Form */}
        <div style={{ padding: 32 }}>
          {tab === "login" ? (
            <form onSubmit={onLogin} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <Field label="Email hoặc Username" required>
                <Input
                  type="text"
                  placeholder="admin@meridian.io hoặc nguyen.van.a"
                  {...loginForm.register("login")}
                  error={loginForm.formState.errors.login?.message}
                />
              </Field>
              <Field label="Mật khẩu" required>
                <Input
                  type="password"
                  placeholder="••••••••"
                  {...loginForm.register("password")}
                  error={loginForm.formState.errors.password?.message}
                />
              </Field>
              <Button type="submit" variant="primary" size="lg" loading={login.isPending} style={{ marginTop: 8 }}>
                Đăng nhập
              </Button>
            </form>
          ) : (
            <form onSubmit={onRegister} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <Field label="Họ và tên" required>
                <Input placeholder="Nguyễn Văn A" {...registerForm.register("full_name")} error={registerForm.formState.errors.full_name?.message} />
              </Field>
              <Field label="Tên công ty / kênh" required>
                <Input placeholder="ACME Media" {...registerForm.register("company_name")} error={registerForm.formState.errors.company_name?.message} />
              </Field>
              <Field label="Email" required>
                <Input type="email" placeholder="you@company.com" {...registerForm.register("email")} error={registerForm.formState.errors.email?.message} />
              </Field>
              <Field label="Số điện thoại">
                <Input type="tel" placeholder="0901234567" {...registerForm.register("phone")} />
              </Field>
              <Field label="Mật khẩu" required>
                <Input type="password" placeholder="Tối thiểu 8 ký tự" {...registerForm.register("password")} error={registerForm.formState.errors.password?.message} />
              </Field>
              <Button type="submit" variant="primary" size="lg" loading={register.isPending} style={{ marginTop: 8 }}>
                Gửi đăng ký
              </Button>
              <p style={{ fontSize: 11, color: C.textMuted, textAlign: "center", marginTop: 4 }}>
                Tài khoản cần được admin duyệt trước khi sử dụng
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
