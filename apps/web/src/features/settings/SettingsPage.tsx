import { useState, useEffect } from 'react';
import { Store, Globe, Shield, DollarSign, Save, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/toast';
import { useSettings, useUpdateSetting, useUpdateCurrencyRate } from '@/hooks/useSettings';
import { useUsdRateStore } from '@/stores/usdRate';
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
  const currencyMut = useUpdateCurrencyRate();

  const settings = data?.data as Record<string, string> | undefined;

  const [storeName, setStoreName] = useState('');
  const [storePhone, setStorePhone] = useState('');
  const [storeAddress, setStoreAddress] = useState('');
  const [currencyRate, setCurrencyRate] = useState('');
  const [returnDays, setReturnDays] = useState('');
  const [negativeStock, setNegativeStock] = useState(true);
  const [lang, setLang] = useState(i18n.language);

  useEffect(() => {
    if (settings) {
      setStoreName(settings.storeName ?? '');
      setStorePhone(settings.storePhone ?? '');
      setStoreAddress(settings.storeAddress ?? '');
      const apiRate = settings.currencyRate ?? '12800';
      setCurrencyRate(apiRate);
      // Zustand store'ni API bilan sinxronlash
      const rateNum = Number(apiRate);
      if (rateNum > 0) useUsdRateStore.getState().setRate(rateNum);
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

  async function handleSaveCurrency() {
    const rate = Number(currencyRate);
    if (!rate || rate <= 0) { toast('Kursni kiriting', 'error'); return; }
    try {
      await currencyMut.mutateAsync(rate);
      useUsdRateStore.getState().setRate(rate);
      toast('Valyuta kursi saqlandi', 'success');
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

        {/* Currency */}
        <section className="card p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-success-50">
              <DollarSign className="h-5 w-5 text-success-600" aria-hidden="true" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-text-primary">Valyuta kursi</h2>
              <p className="text-xs text-text-muted">USD → UZS konvertatsiya</p>
            </div>
          </div>
          <Input id="s-rate" label="1 USD = ? UZS" type="number" value={currencyRate} onChange={(e) => setCurrencyRate(e.target.value)} />
          <div className="mt-4 flex justify-end">
            <button onClick={handleSaveCurrency} className="btn btn-primary btn-md" disabled={currencyMut.isPending}>
              {currencyMut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
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
