import { useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';
import { Eye, EyeOff, LogIn, AlertCircle, Loader2 } from 'lucide-react';
import { loginSchema, type LoginInput } from '@sardorbek/shared';
import { useAuthStore } from '@/stores/auth';
import { api } from '@/services/api';

interface LoginResponse {
  success: boolean;
  data: { accessToken: string };
}

interface MeResponse {
  success: boolean;
  data: {
    id: string;
    login: string;
    name: string;
    role: 'ADMIN' | 'CASHIER' | 'HELPER';
    phone: string | null;
    avatar: string | null;
  };
}

export function LoginPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { setAccessToken, setUser } = useAuthStore();
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
  });

  async function onSubmit(data: LoginInput) {
    setError('');
    try {
      const res = await api.post('auth/login', { json: data }).json<LoginResponse>();
      setAccessToken(res.data.accessToken);

      const meRes = await api.get('auth/me', {
        headers: { Authorization: `Bearer ${res.data.accessToken}` },
      }).json<MeResponse>();
      setUser(meRes.data);

      navigate({ to: '/' });
    } catch {
      setError(t('auth.invalidCredentials'));
    }
  }

  return (
    <div className="flex min-h-screen">
      {/* Left — Branding Panel */}
      <div className="hidden lg:flex lg:w-[45%] flex-col justify-between bg-sidebar p-12 relative overflow-hidden">
        {/* Background pattern */}
        <div className="absolute inset-0 opacity-[0.03]" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }} />

        {/* Logo area */}
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-2">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary-500 text-white font-bold text-lg shadow-lg">
              SF
            </div>
            <span className="text-xl font-bold text-white tracking-tight">Sardorbek Furnitura</span>
          </div>
        </div>

        {/* Center content */}
        <div className="relative z-10 max-w-sm">
          <h2 className="text-3xl font-bold text-white leading-tight mb-4">
            Biznesingizni boshqarish osonlashdi
          </h2>
          <p className="text-sidebar-text text-base leading-relaxed">
            Sotuv, mahsulotlar, qarzlar, xodimlar — barchasini bitta tizimdan boshqaring.
            Tez, ishonchli va professional.
          </p>
        </div>

        {/* Bottom stats */}
        <div className="relative z-10 flex gap-8">
          <div>
            <p className="text-2xl font-bold text-white tabular-nums">10K+</p>
            <p className="text-xs text-sidebar-text mt-0.5">Mahsulotlar</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-white tabular-nums">24/7</p>
            <p className="text-xs text-sidebar-text mt-0.5">Offline ishlaydi</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-white tabular-nums">3 til</p>
            <p className="text-xs text-sidebar-text mt-0.5">UZ / EN / RU</p>
          </div>
        </div>
      </div>

      {/* Right — Login Form */}
      <div className="flex flex-1 flex-col items-center justify-center bg-surface-secondary px-6 py-12">
        {/* Mobile logo */}
        <div className="mb-10 flex items-center gap-3 lg:hidden">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary-500 text-white font-bold text-lg">
            SF
          </div>
          <span className="text-xl font-bold text-text-primary tracking-tight">Sardorbek Furnitura</span>
        </div>

        <div className="w-full max-w-[400px]">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-text-primary">Tizimga kirish</h1>
            <p className="mt-2 text-sm text-text-secondary">Login va parolni kiriting</p>
          </div>

          {/* Error */}
          {error && (
            <div
              role="alert"
              className="mb-6 flex items-center gap-3 rounded-lg bg-danger-50 px-4 py-3 text-sm text-danger-700 border border-danger-100 animate-slide-down"
            >
              <AlertCircle className="h-4 w-4 shrink-0" />
              {error}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" autoComplete="off">
            {/* Login field */}
            <div>
              <label htmlFor="login" className="input-label">
                Login
              </label>
              <input
                id="login"
                type="text"
                autoComplete="off"
                autoFocus
                className="input"
                placeholder="admin"
                aria-invalid={!!errors.login}
                aria-describedby={errors.login ? 'login-error' : undefined}
                {...register('login')}
              />
              {errors.login && (
                <p id="login-error" className="mt-1.5 text-xs text-danger-600">{errors.login.message}</p>
              )}
            </div>

            {/* Password field */}
            <div>
              <label htmlFor="password" className="input-label">
                Parol
              </label>
              <div className="relative">
                <input
                  id="password"
                  type="text"
                  autoComplete="off"
                  className="input pr-12"
                  style={showPassword ? undefined : { WebkitTextSecurity: 'disc', textSecurity: 'disc' } as React.CSSProperties}
                  placeholder="Parolni kiriting"
                  aria-invalid={!!errors.password}
                  aria-describedby={errors.password ? 'password-error' : undefined}
                  {...register('password')}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-text-muted hover:text-text-secondary transition-colors"
                  tabIndex={-1}
                  aria-label={showPassword ? 'Parolni yashirish' : "Parolni ko'rsatish"}
                  style={{ minHeight: 'auto', minWidth: 'auto' }}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {errors.password && (
                <p id="password-error" className="mt-1.5 text-xs text-danger-600">{errors.password.message}</p>
              )}
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="btn btn-primary btn-lg w-full"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Kirish...
                </>
              ) : (
                <>
                  <LogIn className="h-4 w-4" />
                  Kirish
                </>
              )}
            </button>
          </form>

          {/* Footer hint */}
          <p className="mt-8 text-center text-xs text-text-muted">
            Default login: <span className="font-medium text-text-secondary">admin</span> / <span className="font-medium text-text-secondary">admin1234</span>
          </p>
        </div>
      </div>
    </div>
  );
}
