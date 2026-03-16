import pino from 'pino';
import { prisma } from '../../config/database.js';
import { formatCurrency } from '@sardorbek/shared';

const log = pino({ name: 'telegram' });

// Lazy import — bot initializes only if tokens configured
let botInstance: TelegramBotWrapper | null = null;

interface TelegramBotWrapper {
  sendMessage: (chatId: string, text: string, options?: { parse_mode?: string }) => Promise<void>;
}

async function getBot(): Promise<TelegramBotWrapper | null> {
  if (botInstance) return botInstance;

  const tokenSetting = await prisma.setting.findUnique({ where: { key: 'telegramBotToken' } });
  if (!tokenSetting?.value) return null;

  try {
    // Dynamic import — package installed on VPS when telegram enabled
    // @ts-expect-error — optional dependency, installed at deploy time
    const mod = await import('node-telegram-bot-api');
    const TelegramBot = mod.default;
    const bot = new TelegramBot(tokenSetting.value, { polling: false });
    botInstance = {
      sendMessage: async (chatId, text, options) => {
        await bot.sendMessage(chatId, text, options as Record<string, unknown>);
      },
    };
    log.info('Telegram bot initialized');
    return botInstance;
  } catch (error) {
    log.error(error, 'Failed to initialize Telegram bot');
    return null;
  }
}

async function getAdminChatId(): Promise<string | null> {
  const setting = await prisma.setting.findUnique({ where: { key: 'telegramAdminChatId' } });
  return setting?.value ?? null;
}

// Send message to admin chat (safe — never throws)
async function sendToAdmin(text: string): Promise<void> {
  try {
    const bot = await getBot();
    const chatId = await getAdminChatId();
    if (!bot || !chatId) return;
    await bot.sendMessage(chatId, text, { parse_mode: 'HTML' });
  } catch (error) {
    log.warn(error, 'Failed to send Telegram message');
  }
}

// ==================== POS NOTIFICATIONS ====================

export async function notifySale(receipt: {
  number: number;
  total: number;
  paymentMethod: string;
  itemCount: number;
  cashierName: string;
  customerName?: string;
}): Promise<void> {
  const lines = [
    `<b>Yangi sotuv #${String(receipt.number).padStart(6, '0')}</b>`,
    `Kassir: ${receipt.cashierName}`,
    receipt.customerName ? `Mijoz: ${receipt.customerName}` : '',
    `Mahsulotlar: ${receipt.itemCount} ta`,
    `Summa: <b>${formatCurrency(receipt.total)}</b>`,
    `To'lov: ${receipt.paymentMethod}`,
  ].filter(Boolean);

  await sendToAdmin(lines.join('\n'));
}

export async function notifyReturn(data: {
  receiptNumber: number;
  total: number;
  reason: string;
  cashierName: string;
}): Promise<void> {
  await sendToAdmin([
    `<b>Vozvrat #${String(data.receiptNumber).padStart(6, '0')}</b>`,
    `Summa: ${formatCurrency(data.total)}`,
    `Sabab: ${data.reason}`,
    `Kassir: ${data.cashierName}`,
  ].join('\n'));
}

// ==================== DEBT NOTIFICATIONS ====================

export async function notifyDebtCreated(data: {
  customerName: string;
  amount: number;
  dueDate: string;
}): Promise<void> {
  await sendToAdmin([
    `<b>Yangi qarz yaratildi</b>`,
    `Mijoz: ${data.customerName}`,
    `Summa: ${formatCurrency(data.amount)}`,
    `Muddat: ${data.dueDate}`,
  ].join('\n'));
}

export async function notifyDebtPayment(data: {
  customerName: string;
  amount: number;
  remaining: number;
  status: string;
}): Promise<void> {
  await sendToAdmin([
    `<b>Qarz to'lovi</b>`,
    `Mijoz: ${data.customerName}`,
    `To'lov: ${formatCurrency(data.amount)}`,
    `Qoldiq: ${formatCurrency(data.remaining)}`,
    `Status: ${data.status}`,
  ].join('\n'));
}

export async function notifyOverdueDebts(count: number): Promise<void> {
  if (count === 0) return;
  await sendToAdmin(`<b>Muddati o'tgan qarzlar: ${count} ta</b>\nTekshiring: /debts`);
}

// ==================== ATTENDANCE NOTIFICATIONS ====================

export async function notifyCheckIn(data: {
  employeeName: string;
  status: string;
  time: string;
}): Promise<void> {
  const emoji = data.status === 'LATE' ? '⚠' : '✓';
  await sendToAdmin(`${emoji} <b>${data.employeeName}</b> keldim (${data.status}) — ${data.time}`);
}

// ==================== SYSTEM NOTIFICATIONS ====================

export async function notifyPriceAlert(data: {
  productName: string;
  oldPrice: number;
  newPrice: number;
  changePercent: number;
}): Promise<void> {
  await sendToAdmin([
    `<b>Narx o'zgarishi 20%+</b>`,
    `Mahsulot: ${data.productName}`,
    `Eski: ${formatCurrency(data.oldPrice)}`,
    `Yangi: ${formatCurrency(data.newPrice)}`,
    `O'zgarish: ${data.changePercent}%`,
  ].join('\n'));
}

export async function notifyLowStock(products: { name: string; stock: number; minStock: number }[]): Promise<void> {
  if (products.length === 0) return;
  const lines = [`<b>Kam qolgan mahsulotlar (${products.length} ta)</b>`];
  for (const p of products.slice(0, 20)) {
    lines.push(`• ${p.name}: ${p.stock}/${p.minStock}`);
  }
  if (products.length > 20) lines.push(`... va yana ${products.length - 20} ta`);
  await sendToAdmin(lines.join('\n'));
}

export async function notifyBackupStatus(success: boolean, details?: string): Promise<void> {
  if (success) {
    await sendToAdmin(`<b>Backup muvaffaqiyatli</b>\n${details ?? ''}`);
  } else {
    await sendToAdmin(`<b>BACKUP XATOSI!</b>\n${details ?? 'Tafsilotlar logda'}`);
  }
}

// Reset bot instance (for config changes)
export function resetBot(): void {
  botInstance = null;
}
