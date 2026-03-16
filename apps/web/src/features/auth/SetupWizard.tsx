import { useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Store, Globe, Lock, FolderTree } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { api } from '@/services/api';
import { cn } from '@/lib/cn';
import { i18n } from '@/i18n';

const STEPS = [
  { icon: Store, label: "Do'kon" },
  { icon: Globe, label: 'Til' },
  { icon: Lock, label: 'Parol' },
  { icon: FolderTree, label: 'Kategoriya' },
] as const;

const storeSchema = z.object({
  storeName: z.string().min(1, 'Majburiy'),
  storePhone: z.string().optional(),
  storeAddress: z.string().optional(),
});

const passwordSchema = z.object({
  newPassword: z.string().min(6, 'Kamida 6 ta belgi').regex(/[a-zA-Z]/, 'Harf kerak').regex(/\d/, 'Raqam kerak'),
  confirmPassword: z.string(),
}).refine((d) => d.newPassword === d.confirmPassword, {
  message: 'Parollar mos kelmadi',
  path: ['confirmPassword'],
});

interface SetupWizardProps {
  onComplete: () => void;
}

export function SetupWizard({ onComplete }: SetupWizardProps) {
  const [step, setStep] = useState(0);
  const [selectedLang, setSelectedLang] = useState(i18n.language);
  const navigate = useNavigate();

  const storeForm = useForm<z.infer<typeof storeSchema>>({
    resolver: zodResolver(storeSchema),
    defaultValues: { storeName: 'Sardorbek Furnitura' },
  });

  const passForm = useForm<z.infer<typeof passwordSchema>>({
    resolver: zodResolver(passwordSchema),
  });

  async function handleStoreSubmit(data: z.infer<typeof storeSchema>) {
    try {
      for (const [key, value] of Object.entries(data)) {
        if (value) {
          await api.patch(`settings/${key}`, { json: { value } }).json();
        }
      }
    } catch { /* settings API may not exist yet — skip */ }
    setStep(1);
  }

  function handleLangSelect() {
    i18n.changeLanguage(selectedLang);
    localStorage.setItem('sardorbek-lang', selectedLang);
    setStep(2);
  }

  async function handlePasswordSubmit(data: z.infer<typeof passwordSchema>) {
    try {
      await api.patch('auth/change-password', {
        json: { currentPassword: 'admin1234', newPassword: data.newPassword },
      }).json();
    } catch { /* skip if endpoint not ready */ }
    setStep(3);
  }

  function handleFinish() {
    localStorage.setItem('sardorbek-setup-done', 'true');
    onComplete();
    navigate({ to: '/' });
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface-secondary p-6">
      <div className="w-full max-w-lg rounded-xl bg-surface p-8 shadow-modal">
        {/* Steps indicator */}
        <div className="mb-8 flex items-center justify-center gap-2">
          {STEPS.map((s, i) => {
            const Icon = s.icon;
            return (
              <div key={i} className="flex items-center gap-2">
                <div className={cn(
                  'flex h-10 w-10 items-center justify-center rounded-full',
                  i === step ? 'bg-primary-600 text-white' : i < step ? 'bg-success-100 text-success-700' : 'bg-surface-tertiary text-text-muted',
                )}>
                  <Icon className="h-5 w-5" />
                </div>
                {i < STEPS.length - 1 && <div className={cn('h-0.5 w-8', i < step ? 'bg-success-500' : 'bg-border')} />}
              </div>
            );
          })}
        </div>

        {/* Step 0: Store info */}
        {step === 0 && (
          <form onSubmit={storeForm.handleSubmit(handleStoreSubmit)} className="space-y-4">
            <h2 className="text-xl font-bold text-text-primary">Do'kon ma'lumotlari</h2>
            <Input id="storeName" label="Do'kon nomi" error={storeForm.formState.errors.storeName?.message} {...storeForm.register('storeName')} />
            <Input id="storePhone" label="Telefon" {...storeForm.register('storePhone')} />
            <Input id="storeAddress" label="Manzil" {...storeForm.register('storeAddress')} />
            <Button type="submit" className="w-full">Keyingi</Button>
          </form>
        )}

        {/* Step 1: Language */}
        {step === 1 && (
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-text-primary">Til tanlang</h2>
            <div className="space-y-2">
              {[
                { code: 'uz', label: "O'zbek tili", flag: '🇺🇿' },
                { code: 'en', label: 'English', flag: '🇬🇧' },
                { code: 'ru', label: 'Русский', flag: '🇷🇺' },
              ].map((lang) => (
                <button
                  key={lang.code}
                  onClick={() => setSelectedLang(lang.code)}
                  className={cn(
                    'flex w-full items-center gap-3 rounded-lg border px-4 py-3 text-left transition-colors',
                    selectedLang === lang.code ? 'border-primary-500 bg-primary-50' : 'border-border hover:bg-surface-secondary',
                  )}
                >
                  <span className="text-2xl">{lang.flag}</span>
                  <span className="font-medium text-text-primary">{lang.label}</span>
                </button>
              ))}
            </div>
            <Button onClick={handleLangSelect} className="w-full">Keyingi</Button>
          </div>
        )}

        {/* Step 2: Change password */}
        {step === 2 && (
          <form onSubmit={passForm.handleSubmit(handlePasswordSubmit)} className="space-y-4">
            <h2 className="text-xl font-bold text-text-primary">Parolni o'zgartiring</h2>
            <p className="text-sm text-text-secondary">Default parol "admin1234" — xavfsizlik uchun o'zgartiring</p>
            <Input id="newPassword" type="password" label="Yangi parol" error={passForm.formState.errors.newPassword?.message} {...passForm.register('newPassword')} />
            <Input id="confirmPassword" type="password" label="Parolni tasdiqlang" error={passForm.formState.errors.confirmPassword?.message} {...passForm.register('confirmPassword')} />
            <div className="flex gap-3">
              <Button type="button" variant="outline" onClick={() => setStep(3)} className="flex-1">O'tkazib yuborish</Button>
              <Button type="submit" className="flex-1">O'zgartirish</Button>
            </div>
          </form>
        )}

        {/* Step 3: Done */}
        {step === 3 && (
          <div className="space-y-4 text-center">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-success-50">
              <FolderTree className="h-10 w-10 text-success-600" />
            </div>
            <h2 className="text-xl font-bold text-text-primary">Tayyor!</h2>
            <p className="text-sm text-text-secondary">
              Endi kategoriyalar va mahsulotlar qo'shishingiz mumkin.
              Sozlamalar sahifasidan istalgan vaqtda o'zgartirishlar kiritishingiz mumkin.
            </p>
            <Button onClick={handleFinish} className="w-full">Boshlash</Button>
          </div>
        )}
      </div>
    </div>
  );
}
