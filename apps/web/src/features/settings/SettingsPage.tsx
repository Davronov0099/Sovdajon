import { useState, useEffect } from 'react';
import { Store, Globe, Shield, Save, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/toast';
import { useSettings, useUpdateSetting } from '@/hooks/useSettings';
import { i18n } from '@/i18n';

const LANGS = [
  { code: 'uz', label: "O'zbek tili" },
  { code: 'en', label: 'English' },
  { code: 'ru', label: 'Русский' },
] as const;

export function SettingsPage() {
  const { toast } = useToast();
  const { data } = useSettings();
  const updateMut = useUpdateSetting();

  const settings = data?.data as Record<string, string> | undefined;

  const [storeName, setStoreName] = useState('');
  const [storePhone, setStorePhone] = useState('');
  const [storeAddress, setStoreAddress] = useState('');
  const [returnDays, setReturnDays] = useState('');
  const [negativeStock, setNegativeStock] = useState(true);
  const [lang, setLang] = useState(i18n.language);

  useEffect(() => {
    if (settings) {
      setStoreName(settings.storeName ?? '');
      setStorePhone(settings.storePhone ?? '');
      setStoreAddress(settings.storeAddress ?? '');
      setReturnDays(settings.returnPeriodDays ?? '14');
      setNegativeStock(settings.allowNegativeStock === 'true');
    }
  }, [settings]);

  async function handleSaveStore() {
    try {
      await updateMut.mutateAsync({ key: 'storeName', value: storeName });
      await updateMut.mutateAsync({ key: 'storePhone', value: storePhone });
      await updateMut.mutateAsync({ key: 'storeAddress', value: storeAddress });
      toast("Do'kon ma'lumotlari saqlandi", 'success');
    } catch { toast('Saqlash xatosi', 'error'); }
  }

  async function handleSaveRules() {
    try {
      await updateMut.mutateAsync({ key: 'returnPeriodDays', value: returnDays });
      await updateMut.mutateAsync({ key: 'allowNegativeStock', value: String(negativeStock) });
      toast('Qoidalar saqlandi', 'success');
    } catch { toast('Saqlash xatosi', 'error'); }
  }

  function handleLangChange(code: string) {
    setLang(code);
    i18n.changeLanguage(code);
    localStorage.setItem('sardorbek-lang', code);
    toast(`Til o'zgartirildi`, 'success');
  }

  return (
    <div className="p-4 sm:p-6 animate-fade-in max-w-3xl">
      <div className="mb-6">
        <h1 className="text-xl sm:text-2xl font-bold text-text-primary">Sozlamalar</h1>
        <p className="text-sm text-text-muted mt-0.5">Tizim sozlamalari va konfiguratsiya</p>
      </div>

      <div className="space-y-6">
        {/* Store Info */}
        <section className="card p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-50">
              <Store className="h-5 w-5 text-primary-600" aria-hidden="true" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-text-primary">Do'kon ma'lumotlari</h2>
              <p className="text-xs text-text-muted">Nomi, telefon, manzil</p>
            </div>
          </div>
          <div className="space-y-3">
            <Input id="s-name" label="Do'kon nomi" value={storeName} onChange={(e) => setStoreName(e.target.value)} />
            <Input id="s-phone" label="Telefon" value={storePhone} onChange={(e) => setStorePhone(e.target.value)} />
            <Input id="s-addr" label="Manzil" value={storeAddress} onChange={(e) => setStoreAddress(e.target.value)} />
          </div>
          <div className="mt-4 flex justify-end">
            <button onClick={handleSaveStore} className="btn btn-primary btn-md" disabled={updateMut.isPending}>
              {updateMut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Saqlash
            </button>
          </div>
        </section>

        {/* Business Rules */}
        <section className="card p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-warning-50">
              <Shield className="h-5 w-5 text-warning-600" aria-hidden="true" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-text-primary">Biznes qoidalari</h2>
              <p className="text-xs text-text-muted">Vozvrat, stok, limitlar</p>
            </div>
          </div>
          <div className="space-y-3">
            <Input id="s-return" label="Vozvrat muddati (kun)" type="number" value={returnDays} onChange={(e) => setReturnDays(e.target.value)} />
            <div className="flex items-center justify-between rounded-lg border border-border px-4 py-3">
              <div>
                <p className="text-sm font-medium text-text-primary">Manfiy stok ruxsat</p>
                <p className="text-xs text-text-muted">Stok 0 dan pastga tushishi mumkinmi?</p>
              </div>
              <button
                onClick={() => setNegativeStock(!negativeStock)}
                className={`relative h-6 w-11 rounded-full transition-colors ${negativeStock ? 'bg-primary-600' : 'bg-border-strong'}`}
                role="switch"
                aria-checked={negativeStock}
                aria-label="Manfiy stok ruxsat"
                style={{ minHeight: 'auto', minWidth: 'auto' }}
              >
                <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${negativeStock ? 'left-[22px]' : 'left-0.5'}`} />
              </button>
            </div>
          </div>
          <div className="mt-4 flex justify-end">
            <button onClick={handleSaveRules} className="btn btn-primary btn-md" disabled={updateMut.isPending}>
              <Save className="h-4 w-4" />
              Saqlash
            </button>
          </div>
        </section>

        {/* Language */}
        <section className="card p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-info-50">
              <Globe className="h-5 w-5 text-info-600" aria-hidden="true" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-text-primary">Til</h2>
              <p className="text-xs text-text-muted">Interfeys tili</p>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            {LANGS.map((l) => (
              <button
                key={l.code}
                onClick={() => handleLangChange(l.code)}
                className={`rounded-lg border px-4 py-3 text-sm font-medium transition-all text-left ${
                  lang === l.code
                    ? 'border-primary-500 bg-primary-50 text-primary-700'
                    : 'border-border text-text-secondary hover:bg-surface-tertiary'
                }`}
              >
                {l.label}
              </button>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
