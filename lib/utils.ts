import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import type { IconSvgElement } from "@hugeicons/react"
import {
  Restaurant01Icon, Car01Icon, ShoppingBag01Icon, HeartIcon, Airplane01Icon,
  BookOpen01Icon, Briefcase01Icon, ArrowLeftRightIcon, Shield01Icon, BankIcon,
  FlashIcon, Home01Icon, Refresh01Icon, GiftIcon, SparklesIcon, TrendingUpIcon,
  PawPrintIcon, UserGroupIcon, BanknoteIcon, Coffee01Icon, Dumbbell01Icon,
  MusicNote01Icon, PillIcon, Wrench01Icon, Tag01Icon,
  Wallet01Icon, CreditCardIcon, PiggyBankIcon, ShieldCheckIcon, Globe02Icon,
  Coins01Icon, Building06Icon, VaultIcon, Money01Icon,
} from "@hugeicons/core-free-icons"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

const CATEGORY_ICON_MAP: Array<[RegExp, IconSvgElement]> = [
  [/food|meal|dining|restaurant|snack|fast.?food|lunch|dinner|breakfast|cafe|coffee|tea|drink|beverage|pizza|burger/i, Restaurant01Icon],
  [/coffee|cafe/i, Coffee01Icon],
  [/groceri|supermarket|vegetable|fruit|market/i, ShoppingBag01Icon],
  [/transport|vehicle|car|taxi|uber|bus|train|fuel|petrol|parking|auto|bike|metro|commute/i, Car01Icon],
  [/shopping|cloth|fashion|apparel|accessory|mall|store/i, ShoppingBag01Icon],
  [/health|medical|doctor|hospital|pharmacy|medicine|clinic|dental|vision/i, HeartIcon],
  [/pill|drug|supplement|vitamin/i, PillIcon],
  [/gym|fitness|sport|exercise|workout/i, Dumbbell01Icon],
  [/entertainment|movie|cinema|game|fun|leisure|netflix|streaming|music/i, MusicNote01Icon],
  [/travel|flight|hotel|vacation|holiday|trip|tourism|airbnb/i, Airplane01Icon],
  [/education|school|book|course|tuition|learning|college|university/i, BookOpen01Icon],
  [/salary|income|wage|earning|paycheck|bonus/i, Briefcase01Icon],
  [/transfer|sent|received/i, ArrowLeftRightIcon],
  [/insurance/i, Shield01Icon],
  [/financial|bank|fee|charge|fine|tax|advisory|penalty/i, BankIcon],
  [/utility|electric|water|gas|internet|wifi|phone|bill/i, FlashIcon],
  [/rent|housing|home|mortgage|maintenance|repair/i, Home01Icon],
  [/maintenance|repair|fix|service/i, Wrench01Icon],
  [/subscription|membership/i, Refresh01Icon],
  [/gift|donation|charity|contribution/i, GiftIcon],
  [/personal|beauty|care|hair|spa|salon/i, SparklesIcon],
  [/invest|stock|mutual|fund|crypto|trading/i, TrendingUpIcon],
  [/pet|animal|vet/i, PawPrintIcon],
  [/family|kids|child|baby|parent/i, UserGroupIcon],
  [/salary|income|earning/i, BanknoteIcon],
]

const ACCOUNT_TYPE_ICONS: Record<string, IconSvgElement> = {
  General: Wallet01Icon,
  Cash: Money01Icon,
  CurrentAccount: BankIcon,
  SavingAccount: VaultIcon,
  CreditCard: CreditCardIcon,
  Investment: PiggyBankIcon,
  Insurance: ShieldCheckIcon,
  EWallet: Wallet01Icon,
  Loan: Building06Icon,
  Asset: Coins01Icon,
  Commodity: Coins01Icon,
  Debt: Building06Icon,
  MutualFund: TrendingUpIcon,
  Checking: BankIcon,
  Online: Globe02Icon,
}

const ACCOUNT_NAME_ICONS: Array<[RegExp, IconSvgElement]> = [
  [/paypal|stripe|razorpay|paytm|gpay|google.?pay|apple.?pay|amazon.?pay|upi/i, Globe02Icon],
  [/gold|silver|crypto|bitcoin|eth/i, Coins01Icon],
  [/fd|fixed.?deposit|bond/i, VaultIcon],
  [/loan|debt|mortgage/i, Building06Icon],
]

export function getAccountIcon(accountType: string, accountName: string): IconSvgElement {
  if (ACCOUNT_TYPE_ICONS[accountType]) return ACCOUNT_TYPE_ICONS[accountType]
  for (const [pattern, icon] of ACCOUNT_NAME_ICONS) {
    if (pattern.test(accountName)) return icon
  }
  return Wallet01Icon
}

export function getCategoryIcon(name: string, groupName?: string): IconSvgElement {
  const text = `${name} ${groupName ?? ""}`
  for (const [pattern, icon] of CATEGORY_ICON_MAP) {
    if (pattern.test(text)) return icon
  }
  return Tag01Icon
}
