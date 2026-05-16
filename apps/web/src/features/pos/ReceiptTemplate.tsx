import { formatCurrency, formatDateTime, formatReceiptNumber } from '@sardorbek/shared';

interface ReceiptItem {
  productName: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  total: number;
}

interface ReceiptData {
  number: number;
  items: ReceiptItem[];
  subtotal: number;
  discount: number;
  discountPercent: number;
  total: number;
  paymentMethod: string;
  cashReceived?: number;
  change?: number;
  customerName?: string;
  cashierName: string;
  createdAt: string;
  storeName?: string;
}

export function ReceiptTemplate({ receipt }: { receipt: ReceiptData }) {
  const paymentLabel: Record<string, string> = {
    CASH: 'Naqd',
    CARD: 'Karta',
    CLICK: 'Click',
    DEBT: 'Qarzga',
    MIXED: 'Aralash',
    TRANSFER: "O'tkazma",
  };

  return (
    <div className="receipt-print mx-auto w-[80mm] bg-white p-2 font-mono text-xs text-black print:block hidden">
      {/* Header */}
      <div className="mb-2 text-center">
        <p className="text-base font-black tracking-wider">{receipt.storeName ?? 'SovdaJON'}</p>
        <p className="text-[11px] font-bold">ONLINE MARKETPLACE</p>
        <p className="text-[10px]">{"="}</p>
      </div>

      {/* Receipt info */}
      <div className="mb-2">
        <p>Chek: {formatReceiptNumber(receipt.number)}</p>
        <p>Sana: {formatDateTime(receipt.createdAt)}</p>
        <p>Kassir: {receipt.cashierName}</p>
        {receipt.customerName && <p>Mijoz: {receipt.customerName}</p>}
      </div>

      <hr className="border-dashed border-black" />

      {/* Items */}
      <table className="my-2 w-full">
        <tbody>
          {receipt.items.map((item, i) => (
            <tr key={i}>
              <td className="py-0.5" colSpan={2}>
                <p>{item.productName}</p>
                <p className="flex justify-between text-[10px]">
                  <span>{item.quantity} x {formatCurrency(item.unitPrice, '')}</span>
                  <span>{formatCurrency(item.total, '')}</span>
                </p>
                {item.discount > 0 && (
                  <p className="text-[10px]">  chegirma: -{item.discount}%</p>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <hr className="border-dashed border-black" />

      {/* Totals */}
      <div className="my-2 space-y-0.5">
        <div className="flex justify-between">
          <span>Oraliq:</span>
          <span>{formatCurrency(receipt.subtotal, '')}</span>
        </div>
        {receipt.discount > 0 && (
          <div className="flex justify-between">
            <span>Chegirma ({receipt.discountPercent}%):</span>
            <span>-{formatCurrency(receipt.discount, '')}</span>
          </div>
        )}
        <div className="flex justify-between text-sm font-bold">
          <span>JAMI:</span>
          <span>{formatCurrency(receipt.total)}</span>
        </div>
      </div>

      <hr className="border-dashed border-black" />

      {/* Payment */}
      <div className="my-2">
        <p>To'lov: {paymentLabel[receipt.paymentMethod] ?? receipt.paymentMethod}</p>
        {receipt.cashReceived != null && receipt.cashReceived > 0 && (
          <>
            <p>Qabul: {formatCurrency(receipt.cashReceived)}</p>
            <p>Qaytim: {formatCurrency(receipt.change ?? 0)}</p>
          </>
        )}
      </div>

      {/* Footer */}
      <div className="mt-3 text-center text-[10px]">
        <p>Xaridingiz uchun rahmat!</p>
        <p>14 kun ichida qaytarish mumkin</p>
      </div>
    </div>
  );
}
