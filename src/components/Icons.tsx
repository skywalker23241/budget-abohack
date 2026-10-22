/**
 * 应用统一图标入口。
 *
 * 所有图标来自 Phosphor Icons。使用单图标入口可避免开发时加载完整图标索引；
 * Icon* 别名让业务组件保持清晰，也方便在这里统一调整图标语义。
 */
export type { Icon, IconProps, IconWeight } from '@phosphor-icons/react';

export { ForkKnife } from '@phosphor-icons/react/dist/csr/ForkKnife';
export { ShoppingCart } from '@phosphor-icons/react/dist/csr/ShoppingCart';
export { Bus } from '@phosphor-icons/react/dist/csr/Bus';
export { TShirt } from '@phosphor-icons/react/dist/csr/TShirt';
export { FirstAid } from '@phosphor-icons/react/dist/csr/FirstAid';
export { GameController } from '@phosphor-icons/react/dist/csr/GameController';
export { Television } from '@phosphor-icons/react/dist/csr/Television';
export { BookOpen } from '@phosphor-icons/react/dist/csr/BookOpen';
export { Airplane } from '@phosphor-icons/react/dist/csr/Airplane';
export { Gift } from '@phosphor-icons/react/dist/csr/Gift';
export { PawPrint } from '@phosphor-icons/react/dist/csr/PawPrint';
export { House } from '@phosphor-icons/react/dist/csr/House';
export { Lightning } from '@phosphor-icons/react/dist/csr/Lightning';
export { Car } from '@phosphor-icons/react/dist/csr/Car';
export { Briefcase } from '@phosphor-icons/react/dist/csr/Briefcase';
export { Medal } from '@phosphor-icons/react/dist/csr/Medal';
export { Laptop } from '@phosphor-icons/react/dist/csr/Laptop';
export { ArrowUUpLeft } from '@phosphor-icons/react/dist/csr/ArrowUUpLeft';
export { ArrowsLeftRight } from '@phosphor-icons/react/dist/csr/ArrowsLeftRight';

export { SquaresFour as IconDashboard } from '@phosphor-icons/react/dist/csr/SquaresFour';
export {
  Receipt as IconReceipt,
  Receipt as ReceiptText,
} from '@phosphor-icons/react/dist/csr/Receipt';
export {
  Wallet as IconWallet,
  Wallet as WalletCards,
} from '@phosphor-icons/react/dist/csr/Wallet';
export { Bank as IconBank } from '@phosphor-icons/react/dist/csr/Bank';
export { Coins as IconCoins } from '@phosphor-icons/react/dist/csr/Coins';
export { ChartBar as IconChart } from '@phosphor-icons/react/dist/csr/ChartBar';
export { Target as IconTarget } from '@phosphor-icons/react/dist/csr/Target';
export { GearSix as IconSettings } from '@phosphor-icons/react/dist/csr/GearSix';
export { Plus as IconPlus } from '@phosphor-icons/react/dist/csr/Plus';
export { PencilSimple as IconEdit } from '@phosphor-icons/react/dist/csr/PencilSimple';
export { Trash as IconTrash } from '@phosphor-icons/react/dist/csr/Trash';
export {
  X as IconClose,
  X,
} from '@phosphor-icons/react/dist/csr/X';
export {
  MagnifyingGlass as IconSearch,
  MagnifyingGlass as Search,
} from '@phosphor-icons/react/dist/csr/MagnifyingGlass';
export { CaretLeft as IconChevronLeft } from '@phosphor-icons/react/dist/csr/CaretLeft';
export {
  CaretRight as IconChevronRight,
  CaretRight as ChevronRight,
} from '@phosphor-icons/react/dist/csr/CaretRight';
export {
  DownloadSimple as IconDownload,
  DownloadSimple as Download,
} from '@phosphor-icons/react/dist/csr/DownloadSimple';
export { UploadSimple as IconUpload } from '@phosphor-icons/react/dist/csr/UploadSimple';
export { Warning as IconAlert } from '@phosphor-icons/react/dist/csr/Warning';
export { Info as IconInfo } from '@phosphor-icons/react/dist/csr/Info';
export { Bell as IconBell } from '@phosphor-icons/react/dist/csr/Bell';
export { List as IconMenu } from '@phosphor-icons/react/dist/csr/List';
export { GithubLogo } from '@phosphor-icons/react/dist/csr/GithubLogo';
export {
  Check as IconCheck,
  Check,
} from '@phosphor-icons/react/dist/csr/Check';
export {
  CheckCircle as IconCheckCircle,
} from '@phosphor-icons/react/dist/csr/CheckCircle';
export { ArrowUp as IconArrowUp } from '@phosphor-icons/react/dist/csr/ArrowUp';
export { ArrowDown as IconArrowDown } from '@phosphor-icons/react/dist/csr/ArrowDown';
export { TrendUp as IconTrendingUp } from '@phosphor-icons/react/dist/csr/TrendUp';
export { CalendarBlank as IconCalendar } from '@phosphor-icons/react/dist/csr/CalendarBlank';
export { Heart as IconHeart } from '@phosphor-icons/react/dist/csr/Heart';
export {
  PiggyBank as IconPiggy,
  PiggyBank,
} from '@phosphor-icons/react/dist/csr/PiggyBank';
export { Question as IconHelp } from '@phosphor-icons/react/dist/csr/Question';

// 兼容页面原有的语义命名；实现已全部切换为 Phosphor。
export { ArrowRight } from '@phosphor-icons/react/dist/csr/ArrowRight';
export { SealCheck as BadgeCheck } from '@phosphor-icons/react/dist/csr/SealCheck';
export {
  ChartLineUp as ChartNoAxesCombined,
} from '@phosphor-icons/react/dist/csr/ChartLineUp';
export {
  CurrencyDollar as CircleDollarSign,
} from '@phosphor-icons/react/dist/csr/CurrencyDollar';
export { Command } from '@phosphor-icons/react/dist/csr/Command';
export { Gauge } from '@phosphor-icons/react/dist/csr/Gauge';
export {
  DotsSixVertical as GripVertical,
} from '@phosphor-icons/react/dist/csr/DotsSixVertical';
export { LockKey as LockKeyhole } from '@phosphor-icons/react/dist/csr/LockKey';
export { ShieldCheck } from '@phosphor-icons/react/dist/csr/ShieldCheck';
export { SlidersHorizontal } from '@phosphor-icons/react/dist/csr/SlidersHorizontal';
export { Sparkle as Sparkles } from '@phosphor-icons/react/dist/csr/Sparkle';
export { Cloud } from '@phosphor-icons/react/dist/csr/Cloud';
export {
  ArrowsClockwise as RefreshCw,
} from '@phosphor-icons/react/dist/csr/ArrowsClockwise';
export { FloppyDisk as Save } from '@phosphor-icons/react/dist/csr/FloppyDisk';
export { Plugs as Unplug } from '@phosphor-icons/react/dist/csr/Plugs';
export {
  CaretDown as ChevronDown,
} from '@phosphor-icons/react/dist/csr/CaretDown';
export { CaretUp as ChevronUp } from '@phosphor-icons/react/dist/csr/CaretUp';
export { Sun } from '@phosphor-icons/react/dist/csr/Sun';
export { Moon } from '@phosphor-icons/react/dist/csr/Moon';
export { Desktop as Monitor } from '@phosphor-icons/react/dist/csr/Desktop';
