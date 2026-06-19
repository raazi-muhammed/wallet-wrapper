import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import {
  Utensils, Car, ShoppingBag, Heart, Plane, BookOpen, Briefcase,
  ArrowLeftRight, Shield, Landmark, Zap, Home, RefreshCw, Gift,
  Sparkles, TrendingUp, PawPrint, Users, Banknote, Coffee, Dumbbell,
  Music, Pill, Wrench, Tag, type LucideIcon,
} from "lucide-react"
import {
  Wallet as PhWallet,
  Bank as PhBank,
  CreditCard as PhCreditCard,
  PiggyBank as PhPiggyBank,
  TrendUp as PhTrendUp,
  ShieldCheck as PhShieldCheck,
  Globe as PhGlobe,
  Coins as PhCoins,
  Buildings as PhBuildings,
  Vault as PhVault,
  HandCoins as PhHandCoins,
  MoneyWavy as PhMoneyWavy,
} from "@phosphor-icons/react"
import type { Icon as PhosphorIcon } from "@phosphor-icons/react"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

const CATEGORY_ICON_MAP: Array<[RegExp, LucideIcon]> = [
  [/food|meal|dining|restaurant|snack|fast.?food|lunch|dinner|breakfast|cafe|coffee|tea|drink|beverage|pizza|burger/i, Utensils],
  [/coffee|cafe/i, Coffee],
  [/groceri|supermarket|vegetable|fruit|market/i, ShoppingBag],
  [/transport|vehicle|car|taxi|uber|bus|train|fuel|petrol|parking|auto|bike|metro|commute/i, Car],
  [/shopping|cloth|fashion|apparel|accessory|mall|store/i, ShoppingBag],
  [/health|medical|doctor|hospital|pharmacy|medicine|clinic|dental|vision/i, Heart],
  [/pill|drug|supplement|vitamin/i, Pill],
  [/gym|fitness|sport|exercise|workout/i, Dumbbell],
  [/entertainment|movie|cinema|game|fun|leisure|netflix|streaming|music/i, Music],
  [/travel|flight|hotel|vacation|holiday|trip|tourism|airbnb/i, Plane],
  [/education|school|book|course|tuition|learning|college|university/i, BookOpen],
  [/salary|income|wage|earning|paycheck|bonus/i, Briefcase],
  [/transfer|sent|received/i, ArrowLeftRight],
  [/insurance/i, Shield],
  [/financial|bank|fee|charge|fine|tax|advisory|penalty/i, Landmark],
  [/utility|electric|water|gas|internet|wifi|phone|bill/i, Zap],
  [/rent|housing|home|mortgage|maintenance|repair/i, Home],
  [/maintenance|repair|fix|service/i, Wrench],
  [/subscription|membership/i, RefreshCw],
  [/gift|donation|charity|contribution/i, Gift],
  [/personal|beauty|care|hair|spa|salon/i, Sparkles],
  [/invest|stock|mutual|fund|crypto|trading/i, TrendingUp],
  [/pet|animal|vet/i, PawPrint],
  [/family|kids|child|baby|parent/i, Users],
  [/salary|income|earning/i, Banknote],
]

const ACCOUNT_TYPE_ICONS: Record<string, PhosphorIcon> = {
  General: PhWallet,
  Cash: PhMoneyWavy,
  CurrentAccount: PhBank,
  SavingAccount: PhVault,
  CreditCard: PhCreditCard,
  Investment: PhPiggyBank,
  Insurance: PhShieldCheck,
  EWallet: PhWallet,
  Loan: PhBuildings,
  Asset: PhCoins,
  Commodity: PhCoins,
  Debt: PhBuildings,
  MutualFund: PhTrendUp,
  Checking: PhBank,
  Online: PhGlobe,
}

const ACCOUNT_NAME_ICONS: Array<[RegExp, PhosphorIcon]> = [
  [/paypal|stripe|razorpay|paytm|gpay|google.?pay|apple.?pay|amazon.?pay|upi/i, PhGlobe],
  [/gold|silver|crypto|bitcoin|eth/i, PhCoins],
  [/fd|fixed.?deposit|bond/i, PhVault],
  [/loan|debt|mortgage/i, PhBuildings],
]

export function getAccountIcon(accountType: string, accountName: string): PhosphorIcon {
  if (ACCOUNT_TYPE_ICONS[accountType]) return ACCOUNT_TYPE_ICONS[accountType]
  for (const [pattern, icon] of ACCOUNT_NAME_ICONS) {
    if (pattern.test(accountName)) return icon
  }
  return PhWallet
}

export function getCategoryIcon(name: string, groupName?: string): LucideIcon {
  const text = `${name} ${groupName ?? ""}`
  for (const [pattern, icon] of CATEGORY_ICON_MAP) {
    if (pattern.test(text)) return icon
  }
  return Tag
}
