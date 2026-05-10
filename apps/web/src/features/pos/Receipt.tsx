import { forwardRef } from 'react';

interface ReceiptItem {
  name: string;
  quantity: number;
  price: number;
  discount: number;
}

interface ReceiptData {
  items: ReceiptItem[];
  subtotal: number;
  discountPercent: number;
  discountAmount: number;
  bonus: number;
  total: number;
  paidCash: number;
  paidCard: number;
  paidClick: number;
  paidDebt: number;
  change: number;
  customerName: string | null;
  cashierName: string;
  receiptNumber?: number;
}

function formatNum(n: number): string {
  return n.toLocaleString('uz-UZ');
}

function now(): string {
  const d = new Date();
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yy = d.getFullYear();
  const hh = String(d.getHours()).padStart(2, '0');
  const mi = String(d.getMinutes()).padStart(2, '0');
  return `${dd}.${mm}.${yy} ${hh}:${mi}`;
}

export const Receipt = forwardRef<HTMLDivElement, { data: ReceiptData }>(({ data }, ref) => {
  const {
    items, subtotal, discountPercent, discountAmount, bonus, total,
    paidCash, paidCard, paidClick, paidDebt, change,
    customerName, cashierName,
  } = data;

  const finalTotal = total;
  const LINE = '─'.repeat(40);
  const DLINE = '═'.repeat(40);

  return (
    <div ref={ref} className="receipt-print">
      {/* ─── Header ─── */}
      <div className="r-center r-bold r-xl">SovdaJON</div>
      <div className="r-center r-sm r-bold">ONLINE MARKETPLACE</div>
      <div className="r-line">{LINE}</div>

      {/* ─── Info ─── */}
      <div className="r-row">
        <span>Sana:</span>
        <span>{now()}</span>
      </div>
      <div className="r-row">
        <span>Kassir:</span>
        <span>{cashierName}</span>
      </div>
      {customerName && (
        <div className="r-row">
          <span>Mijoz:</span>
          <span>{customerName}</span>
        </div>
      )}
      <div className="r-line">{DLINE}</div>

      {/* ─── Items ─── */}
      {items.map((item, i) => {
        const lineTotal = item.price * item.quantity * (1 - item.discount / 100);
        return (
          <div key={i} className="r-item">
            <div className="r-item-name">{i + 1}. {item.name}</div>
            <div className="r-row r-sm">
              <span>
                {formatNum(item.quantity)} x {formatNum(item.price)}
                {item.discount > 0 ? ` (-${item.discount}%)` : ''}
              </span>
              <span className="r-bold">{formatNum(Math.round(lineTotal))}</span>
            </div>
          </div>
        );
      })}
      <div className="r-line">{LINE}</div>

      {/* ─── Totals ─── */}
      <div className="r-row">
        <span>Oraliq summa:</span>
        <span>{formatNum(Math.round(subtotal))}</span>
      </div>
      {discountAmount > 0 && (
        <div className="r-row">
          <span>Chegirma ({discountPercent}%):</span>
          <span>-{formatNum(Math.round(discountAmount))}</span>
        </div>
      )}
      <div className="r-line">{DLINE}</div>
      <div className="r-row r-bold r-lg">
        <span>JAMI:</span>
        <span>{formatNum(Math.round(finalTotal))} so'm</span>
      </div>
      <div className="r-line">{DLINE}</div>

      {/* ─── Payment ─── */}
      <div className="r-sm" style={{ marginTop: '2mm' }}>
        {paidCash > 0 && (
          <div className="r-row">
            <span>Naqd:</span>
            <span>{formatNum(paidCash)} so'm</span>
          </div>
        )}
        {paidCard > 0 && (
          <div className="r-row">
            <span>Karta:</span>
            <span>{formatNum(paidCard)} so'm</span>
          </div>
        )}
        {paidClick > 0 && (
          <div className="r-row">
            <span>Click:</span>
            <span>{formatNum(paidClick)} so'm</span>
          </div>
        )}
        {paidDebt > 0 && (
          <div className="r-row">
            <span>Qarz:</span>
            <span>{formatNum(paidDebt)} so'm</span>
          </div>
        )}
        {change > 0 && (
          <div className="r-row r-bold">
            <span>Qaytim:</span>
            <span>{formatNum(Math.round(change))} so'm</span>
          </div>
        )}
      </div>

      {/* ─── Footer ─── */}
      <div className="r-line">{LINE}</div>
      <div className="r-center r-sm" style={{ marginTop: '3mm' }}>
        Xaridingiz uchun rahmat!
      </div>
      <div className="r-center r-xs r-light">
        SovdaJON
      </div>
      <div className="r-center r-xs r-light" style={{ marginTop: '1mm' }}>
        {now()}
      </div>
      {/* Extra space at bottom for cutter */}
      <div style={{ height: '10mm' }} />
    </div>
  );
});

Receipt.displayName = 'Receipt';
