// Intl formatters are slow to construct and lists format hundreds of amounts,
// so each one is built once per currency and reused.

const moneyFormatters = new Map<string, Intl.NumberFormat | null>();

function moneyFormatter(currency: string, fractionDigits: "cents" | "whole") {
  const key = `${currency}|${fractionDigits}`;
  let formatter = moneyFormatters.get(key);
  if (formatter === undefined) {
    try {
      formatter = new Intl.NumberFormat(
        undefined,
        fractionDigits === "cents"
          ? { style: "currency", currency, minimumFractionDigits: 2 }
          : { style: "currency", currency, maximumFractionDigits: 0 }
      );
    } catch {
      // Not a currency code Intl knows.
      formatter = null;
    }
    moneyFormatters.set(key, formatter);
  }
  return formatter;
}

/** An amount with cents, e.g. "₹1,234.50"; "—" when either part is missing. */
export function formatMoney(amount: number | null | undefined, currency: string | undefined) {
  if (amount == null || !currency) return "—";
  return moneyFormatter(currency, "cents")?.format(amount) ?? `${currency} ${amount.toFixed(2)}`;
}

/** An amount rounded to whole units, e.g. "₹1,235". */
export function formatMoneyWhole(amount: number | null | undefined, currency: string) {
  if (amount == null) return "—";
  return moneyFormatter(currency, "whole")?.format(amount) ?? `${currency} ${amount}`;
}
