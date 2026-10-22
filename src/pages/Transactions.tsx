/**
 * 记账页面：新增 / 编辑 / 删除记录，支持筛选、排序、搜索。
 * 按日期分组，每笔收支独立卡片展示。
 */
import { useEffect, useMemo, useState } from 'react';
import { SlidersHorizontal } from '@/components/Icons';
import { CategoryIcon } from '@/components/CategoryIcon';
import type { Transaction, TransactionType } from '@/types';
import { useStore } from '@/store/useStore';
import {
  INCOME_CATEGORIES,
  TRANSACTION_TYPE_LABELS,
} from '@/lib/constants';
import { formatCurrency } from '@/lib/format';
import { getExpenseCategories } from '@/lib/categories';
import { PageHeader } from '@/components/PageHeader';
import { Badge, EmptyState, Button, Input, Label } from '@/components/ui';
import { SelectField } from '@/components/forms/fields';
import { Modal } from '@/components/Modal';
import { BottomSheet } from '@/components/BottomSheet';
import { TransactionForm } from '@/components/forms/TransactionForm';
import { QuickTransactionModal } from '@/components/QuickTransactionModal';
import { BillImportDialog } from '@/components/BillImportDialog';
import { useConfirm } from '@/components/ConfirmDialog';
import { useToast } from '@/components/Toast';
import { DatePicker } from '@/components/DatePicker';
import {
  IconPlus,
  IconSearch,
  IconEdit,
  IconTrash,
  IconReceipt,
  IconUpload,
  X,
} from '@/components/Icons';

type SortKey = 'date-desc' | 'date-asc' | 'amount-desc' | 'amount-asc';

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: 'date-desc', label: '日期（新→旧）' },
  { value: 'date-asc', label: '日期（旧→新）' },
  { value: 'amount-desc', label: '金额（高→低）' },
  { value: 'amount-asc', label: '金额（低→高）' },
];

type TransactionGroup = {
  date: string;
  income: number;
  expense: number;
  items: Transaction[];
};

function typeBadge(type: TransactionType) {
  const map: Record<TransactionType, 'emerald' | 'rose' | 'blue' | 'amber'> = {
    income: 'emerald',
    expense: 'rose',
    transfer: 'blue',
    loan_repayment: 'amber',
  };
  return <Badge tone={map[type]}>{TRANSACTION_TYPE_LABELS[type]}</Badge>;
}

function formatDateHeader(date: string): string {
  const parsed = new Date(`${date}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return date;
  return parsed.toLocaleDateString('zh-CN', {
    month: 'long',
    day: 'numeric',
    weekday: 'short',
  });
}

function groupTransactions(list: Transaction[]): TransactionGroup[] {
  const groups: TransactionGroup[] = [];
  const map = new Map<string, TransactionGroup>();

  for (const t of list) {
    let group = map.get(t.date);
    if (!group) {
      group = { date: t.date, income: 0, expense: 0, items: [] };
      map.set(t.date, group);
      groups.push(group);
    }
    group.items.push(t);
    if (t.type === 'income') group.income += t.amount;
    else if (t.type === 'expense' || t.type === 'loan_repayment') {
      group.expense += t.amount;
    }
  }

  return groups;
}

export function Transactions() {
  const transactions = useStore((s) => s.transactions);
  const budgets = useStore((s) => s.budgets);
  const allCategories = useMemo(() => [...new Set([
    ...INCOME_CATEGORIES, ...getExpenseCategories(budgets, transactions), ...transactions.map((transaction) => transaction.category),
  ])], [budgets, transactions]);
  const deleteTransaction = useStore((s) => s.deleteTransaction);
  const settings = useStore((s) => s.settings);
  const cur = settings.currency;
  const confirm = useConfirm();
  const toast = useToast();

  const [showForm, setShowForm] = useState(false);
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [editing, setEditing] = useState<Transaction | null>(null);
  const [mobileVisibleCount, setMobileVisibleCount] = useState(12);

  // 筛选状态
  const [typeFilter, setTypeFilter] = useState<TransactionType | 'all'>('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<SortKey>('date-desc');

  const filtered = useMemo(() => {
    let list = transactions.filter((t) => {
      if (typeFilter !== 'all' && t.type !== typeFilter) return false;
      if (categoryFilter !== 'all' && t.category !== categoryFilter) return false;
      if (from && t.date < from) return false;
      if (to && t.date > to) return false;
      if (search.trim()) {
        const q = search.trim().toLowerCase();
        if (
          !t.note.toLowerCase().includes(q) &&
          !t.category.toLowerCase().includes(q)
        )
          return false;
      }
      return true;
    });
    list = [...list].sort((a, b) => {
      switch (sort) {
        case 'date-asc':
          return a.date < b.date ? -1 : a.date > b.date ? 1 : 0;
        case 'amount-desc':
          return b.amount - a.amount;
        case 'amount-asc':
          return a.amount - b.amount;
        case 'date-desc':
        default:
          return a.date < b.date ? 1 : a.date > b.date ? -1 : b.createdAt.localeCompare(a.createdAt);
      }
    });
    return list;
  }, [transactions, typeFilter, categoryFilter, from, to, search, sort]);

  const totals = useMemo(() => {
    let income = 0;
    let expense = 0;
    for (const t of filtered) {
      if (t.type === 'income') income += t.amount;
      else if (t.type === 'expense' || t.type === 'loan_repayment') expense += t.amount;
    }
    return { income, expense, count: filtered.length };
  }, [filtered]);

  const grouped = useMemo(() => groupTransactions(filtered), [filtered]);
  const mobileGrouped = useMemo(
    () => groupTransactions(filtered.slice(0, mobileVisibleCount)),
    [filtered, mobileVisibleCount],
  );

  useEffect(() => {
    setMobileVisibleCount(12);
  }, [typeFilter, categoryFilter, from, to, search, sort]);

  function openAdd() {
    setEditing(null);
    setShowQuickAdd(true);
  }
  function openEdit(t: Transaction) {
    setEditing(t);
    setShowForm(true);
  }
  async function handleDelete(t: Transaction) {
    const ok = await confirm({
      title: '删除记录',
      message: `确定删除「${t.category} ${formatCurrency(t.amount, cur)}」这条记录吗？此操作不可撤销。`,
      danger: true,
      confirmText: '删除',
    });
    if (ok) {
      deleteTransaction(t.id);
      toast.success('记录已删除');
    }
  }

  const hasFilter =
    typeFilter !== 'all' || categoryFilter !== 'all' || !!from || !!to || !!search;
  const filterCount = [
    typeFilter === 'transfer' || typeFilter === 'loan_repayment',
    categoryFilter !== 'all',
    !!from || !!to,
    sort !== 'date-desc',
  ].filter(Boolean).length;

  function resetFilters() {
    setTypeFilter('all');
    setCategoryFilter('all');
    setFrom('');
    setTo('');
    setSearch('');
    setSort('date-desc');
  }

  const activeFilters = [
    ...(typeFilter === 'transfer' || typeFilter === 'loan_repayment'
      ? [{ key: 'type', label: TRANSACTION_TYPE_LABELS[typeFilter], clear: () => setTypeFilter('all') }] : []),
    ...(categoryFilter !== 'all' ? [{ key: 'category', label: categoryFilter, clear: () => setCategoryFilter('all') }] : []),
    ...(from || to ? [{ key: 'date', label: `${from || '不限起始'} 至 ${to || '不限结束'}`, clear: () => { setFrom(''); setTo(''); } }] : []),
    ...(sort !== 'date-desc' ? [{ key: 'sort', label: SORT_OPTIONS.find((option) => option.value === sort)!.label, clear: () => setSort('date-desc') }] : []),
  ];

  const filterFields = (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <div>
        <Label htmlFor="ledger-type" className="mb-2 block text-xs text-muted-foreground">交易类型</Label>
        <SelectField id="ledger-type" value={typeFilter} onChange={(value) => setTypeFilter(value as TransactionType | 'all')}
          options={[{ value: 'all', label: '全部类型' }, ...(Object.keys(TRANSACTION_TYPE_LABELS) as TransactionType[]).map((type) => ({ value: type, label: TRANSACTION_TYPE_LABELS[type] }))]} />
      </div>
      <div>
        <Label htmlFor="ledger-category" className="mb-2 block text-xs text-muted-foreground">分类</Label>
        <SelectField id="ledger-category" categoryIcons value={categoryFilter} onChange={setCategoryFilter} options={[{ value: 'all', label: '全部分类' }, ...allCategories]} />
      </div>
      <div>
        <Label htmlFor="ledger-from" className="mb-2 block text-xs text-muted-foreground">起始日期</Label>
        <DatePicker id="ledger-from" value={from} onChange={setFrom} max={to || undefined} clearable placeholder="不限起始日期" />
      </div>
      <div>
        <Label htmlFor="ledger-to" className="mb-2 block text-xs text-muted-foreground">结束日期</Label>
        <DatePicker id="ledger-to" value={to} onChange={setTo} min={from || undefined} clearable placeholder="不限结束日期" />
      </div>
      <div className="sm:col-span-2">
        <Label htmlFor="ledger-sort" className="mb-2 block text-xs text-muted-foreground">排序方式</Label>
        <SelectField id="ledger-sort" value={sort} onChange={(value) => setSort(value as SortKey)} options={SORT_OPTIONS} />
      </div>
    </div>
  );

  function renderLedger(groupsToRender: TransactionGroup[]) {
    return (
      <div className="space-y-6">
          {groupsToRender.map((group) => (
            <section key={group.date} aria-label={group.date}>
              <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2 px-1">
                <div>
                  <p className="text-sm font-semibold text-foreground">
                    {formatDateHeader(group.date)}
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{group.date} · {group.items.length} 笔</p>
                </div>
                <div className="flex gap-3 text-xs">
                  {group.income > 0 && (
                    <span className="text-success">
                      收 {formatCurrency(group.income, cur)}
                    </span>
                  )}
                  {group.expense > 0 && (
                    <span className="text-destructive">
                      支 {formatCurrency(group.expense, cur)}
                    </span>
                  )}
                </div>
              </div>

              <ul className="space-y-2.5">
                {group.items.map((t) => {
                  const isIncome = t.type === 'income';
                  const isDebt = t.type === 'loan_repayment';
                  return (
                    <li
                      key={t.id}
                      className="glass-card flex items-center gap-3 px-3 py-3 transition-colors hover:border-primary/30 sm:px-5 sm:py-4"
                    >
                      <span
                        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-md text-sm font-semibold ${
                          isIncome
                            ? 'bg-success/10 text-success'
                            : isDebt
                              ? 'bg-warning/10 text-warning'
                              : 'bg-muted text-muted-foreground'
                        }`}
                      >
                        <CategoryIcon category={t.category} type={t.type} />
                      </span>

                      <button
                        type="button"
                        onClick={() => openEdit(t)}
                        aria-label={`编辑${t.category}，${formatCurrency(t.amount, cur)}`}
                        className="app-press min-w-0 flex-1 rounded-md text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        <div className="flex min-w-0 items-center gap-2">
                          <span className="truncate text-sm font-medium text-foreground">
                            {t.category}
                          </span>
                          <span className="hidden sm:inline-flex">{typeBadge(t.type)}</span>
                          {t.isFixed && (
                            <span className="hidden sm:inline-flex">
                              <Badge tone="slate">固定</Badge>
                            </span>
                          )}
                          {!t.countInBudget && t.type !== 'income' && (
                            <span className="hidden sm:inline-flex">
                              <Badge tone="slate">不计预算</Badge>
                            </span>
                          )}
                        </div>
                        <p className="mt-1 truncate text-xs text-muted-foreground">
                          {t.paymentMethod}
                          {t.note ? ` · ${t.note}` : ''}
                        </p>
                      </button>

                      <div className="flex shrink-0 flex-col items-end gap-1 sm:flex-row sm:items-center sm:gap-2">
                        <span
                          className={`whitespace-nowrap text-sm font-semibold tabular-nums sm:text-base ${
                            isIncome ? 'text-success' : 'text-foreground'
                          }`}
                        >
                          {isIncome ? '+' : '-'}
                          {formatCurrency(t.amount, cur)}
                        </span>
                        <div className="flex">
                          <button
                            onClick={() => openEdit(t)}
                            type="button"
                            className="rounded-lg p-2 text-muted-foreground hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                            aria-label="编辑"
                          >
                            <IconEdit className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(t)}
                            type="button"
                            className="rounded-lg p-2 text-muted-foreground hover:bg-destructive/10 hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                            aria-label="删除"
                          >
                            <IconTrash className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
      </div>
    );
  }

  return (
    <>
      <PageHeader
        title="记账"
        actions={
          <>
          <Button variant="outline" onClick={() => setShowImport(true)}><IconUpload />导入账单</Button>
          <Button onClick={openAdd}>
            <IconPlus className="h-4 w-4" />
            记一笔
          </Button>
          </>
        }
      />

      <section aria-label="账单工具栏" className="mb-4">
        <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-border/50 bg-card/40 p-2 sm:gap-3">
          <div role="group" aria-label="收支类型" className="flex items-center gap-1">
            {([
              { value: 'all', label: '全部' },
              { value: 'income', label: '收入' },
              { value: 'expense', label: '支出' },
            ] as const).map(({ value, label }) => (
              <button key={value} type="button" aria-pressed={typeFilter === value} onClick={() => setTypeFilter(value)}
                className={`rounded-xl px-4 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${typeFilter === value ? 'bg-primary/15 text-accent-foreground' : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground'}`}>
                {label}
              </button>
            ))}
          </div>
          <div className="relative order-first w-full sm:order-none sm:ml-auto sm:w-64 xl:w-80">
            <IconSearch className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input aria-label="搜索备注或分类" placeholder="搜索备注或分类" value={search} onChange={(event) => setSearch(event.target.value)}
              className="h-9 border-0 bg-transparent pl-9 pr-9 shadow-none focus-visible:ring-1" />
            {search && <button type="button" onClick={() => setSearch('')} aria-label="清空搜索" className="absolute right-1 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-muted-foreground hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><X className="h-3.5 w-3.5" /></button>}
          </div>
          <Button variant="ghost" size="sm" onClick={() => setShowFilters(true)} aria-label={filterCount ? `筛选，已启用 ${filterCount} 项条件` : '筛选与排序'} className="ml-auto gap-2 sm:ml-0">
            <SlidersHorizontal />筛选
            {filterCount > 0 && <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-primary/20 px-1 text-[10px] text-accent-foreground">{filterCount}</span>}
          </Button>
        </div>
        {activeFilters.length > 0 && <div className="mt-3 flex flex-wrap gap-2">
          {activeFilters.map(({ key, label, clear }) => (
            <button key={key} type="button" onClick={clear} aria-label={`移除筛选：${label}`} className="flex max-w-full items-center gap-2 rounded-full border border-border/50 bg-card/40 px-3 py-1 text-xs text-muted-foreground hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
              <span className="truncate">{label}</span><X className="h-3 w-3 shrink-0" />
            </button>
          ))}
        </div>}
        <div className="flex flex-wrap items-center justify-between gap-x-5 gap-y-2 px-1 pb-1 pt-3 text-xs leading-6 text-muted-foreground" aria-live="polite">
          <div className="flex items-center gap-3">
            <span>{hasFilter ? '找到' : '共'} {totals.count} 笔记录</span>
            {(hasFilter || sort !== 'date-desc') && <button type="button" onClick={resetFilters} className="rounded-sm underline-offset-4 hover:text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">重置条件</button>}
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-1">
            <span>收入 <span className="font-medium text-success">{formatCurrency(totals.income, cur)}</span></span>
            <span>支出 <span className="font-medium text-destructive">{formatCurrency(totals.expense, cur)}</span></span>
          </div>
        </div>
      </section>

      {/* 列表 */}
      {filtered.length === 0 ? (
        <EmptyState
          icon={<IconReceipt className="h-6 w-6" />}
          title={hasFilter ? '没有符合条件的记录' : '还没有任何记录'}
          description={
            hasFilter ? '试试调整筛选条件' : '点击「记一笔」开始记录你的第一笔收支'
          }
          action={
            !hasFilter && (
              <Button onClick={openAdd}>
                <IconPlus className="h-4 w-4" />
                记一笔
              </Button>
            )
          }
        />
      ) : (
        <>
          <div className="hidden md:block">{renderLedger(grouped)}</div>
          <div className="md:hidden">
            {renderLedger(mobileGrouped)}
            {filtered.length > mobileVisibleCount && (
              <Button
                variant="outline"
                className="mt-3 w-full"
                onClick={() => setMobileVisibleCount((count) => count + 12)}
              >
                查看更多（还剩 {filtered.length - mobileVisibleCount} 条）
              </Button>
            )}
          </div>
        </>
      )}

      <BottomSheet
        open={showFilters}
        onClose={() => setShowFilters(false)}
        title="筛选与排序"
        footer={
          <div className="grid w-full grid-cols-2 gap-2">
            <Button variant="outline" onClick={resetFilters}>
              清空条件
            </Button>
            <Button onClick={() => setShowFilters(false)}>查看 {totals.count} 笔记录</Button>
          </div>
        }
      >
        {filterFields}
      </BottomSheet>

      <QuickTransactionModal
        open={showQuickAdd}
        onClose={() => setShowQuickAdd(false)}
      />
      <BillImportDialog open={showImport} onClose={() => setShowImport(false)} onImported={() => { resetFilters(); setMobileVisibleCount(12); }} />

      <Modal
        open={showForm}
        onClose={() => setShowForm(false)}
        title={editing ? '编辑记录' : '新增记录'}
      >
        <TransactionForm
          initial={editing ?? undefined}
          onClose={() => setShowForm(false)}
        />
      </Modal>
    </>
  );
}
