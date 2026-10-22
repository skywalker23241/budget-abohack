import {
  ForkKnife, ShoppingCart, Bus, TShirt, FirstAid, GameController,
  Television, BookOpen, Airplane, Gift, PawPrint, House, Lightning,
  Car, Briefcase, Medal, Laptop, ArrowUUpLeft, ArrowsLeftRight,
  ChartNoAxesCombined, IconCoins, IconReceipt, IconBank, IconWallet, IconPiggy, IconTarget, ShieldCheck, type Icon,
} from '@/components/Icons';
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES } from '@/lib/constants';
import type { TransactionType } from '@/types';

const categoryIcons = new Map<string, Icon>(Object.entries({
  '餐饮': ForkKnife,
  '超市/日用品': ShoppingCart,
  '交通': Bus,
  '服装': TShirt,
  '医疗': FirstAid,
  '娱乐': GameController,
  '订阅服务': Television,
  '学习': BookOpen,
  '旅行': Airplane,
  '人情往来': Gift,
  '宠物': PawPrint,
  '房租/房贷': House,
  '车贷/贷款还款': Car,
  '水电煤网': Lightning,
  '其他支出': IconReceipt,
  '工资': Briefcase,
  '奖金': Medal,
  '副业收入': Laptop,
  '投资收益': ChartNoAxesCombined,
  '退款': ArrowUUpLeft,
  '其他收入': IconCoins,
} satisfies Record<(typeof EXPENSE_CATEGORIES)[number] | (typeof INCOME_CATEGORIES)[number], Icon>));

// 收入来源使用的类型名称与记账分类略有不同。
categoryIcons.set('副业', Laptop);
categoryIcons.set('投资', ChartNoAxesCombined);
categoryIcons.set('日用品', ShoppingCart);
categoryIcons.set('订阅', Television);
categoryIcons.set('贷款', IconBank);
categoryIcons.set('房贷', House);
categoryIcons.set('车贷', Car);
categoryIcons.set('消费贷', ShoppingCart);
categoryIcons.set('信用卡分期', IconWallet);
categoryIcons.set('储蓄', IconPiggy);
categoryIcons.set('还贷', IconBank);
categoryIcons.set('控制消费', IconWallet);
categoryIcons.set('应急金', ShieldCheck);
categoryIcons.set('其他', IconTarget);

export function getCategoryIcon(category: string, type?: TransactionType): Icon {
  if (type === 'transfer') return ArrowsLeftRight;
  if (category === '其他' && type === 'income') return IconCoins;
  if (category === '其他' && type === 'loan_repayment') return IconBank;
  return categoryIcons.get(category) ?? (type === 'income' ? IconCoins : type === 'loan_repayment' ? IconBank : IconReceipt);
}

export function CategoryIcon({ category, type, className = 'h-5 w-5' }: {
  category: string;
  type?: TransactionType;
  className?: string;
}) {
  const IconComponent = getCategoryIcon(category, type);
  return <IconComponent className={`shrink-0 ${className}`} weight="duotone" aria-hidden="true" />;
}
