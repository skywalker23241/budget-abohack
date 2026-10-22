import { useMemo, useRef, useState, type ChangeEvent } from 'react';
import { Modal } from './Modal';
import { Button, Switch } from './ui';
import { IconUpload, ShieldCheck } from './Icons';
import { useToast } from './Toast';
import { useStore } from '@/store/useStore';
import { INCOME_CATEGORIES } from '@/lib/constants';
import { getExpenseCategories } from '@/lib/categories';
import { formatCurrency } from '@/lib/format';
import { partitionBillEntries, readBillFile, type BillPreview } from '@/lib/billImport';

const PAGE_SIZE = 20;

export function BillImportDialog({ open, onClose, onImported }: {
  open: boolean;
  onClose: () => void;
  onImported: () => void;
}) {
  const transactions = useStore((state) => state.transactions);
  const budgets = useStore((state) => state.budgets);
  const expenseCategories = useMemo(() => getExpenseCategories(budgets, transactions), [budgets, transactions]);
  const importTransactions = useStore((state) => state.importTransactions);
  const currency = useStore((state) => state.settings.currency);
  const toast = useToast();
  const fileInput = useRef<HTMLInputElement>(null);
  const request = useRef(0);
  const [preview, setPreview] = useState<BillPreview | null>(null);
  const [filename, setFilename] = useState('');
  const [error, setError] = useState('');
  const [reading, setReading] = useState(false);
  const [excluded, setExcluded] = useState<Set<number>>(new Set());
  const [categories, setCategories] = useState<Record<number, string>>({});
  const [budget, setBudget] = useState(true);
  const [page, setPage] = useState(0);

  const { fresh, duplicates } = useMemo(() => partitionBillEntries(preview?.entries ?? [], transactions), [preview, transactions]);
  const selected = fresh.filter((entry) => !excluded.has(entry.row));
  const totals = selected.reduce((sum, { transaction }) => {
    sum[transaction.type === 'income' ? 'income' : 'expense'] += Math.round(transaction.amount * 100);
    return sum;
  }, { income: 0, expense: 0 });
  const maxPage = Math.max(0, Math.ceil(fresh.length / PAGE_SIZE) - 1);
  const currentPage = Math.min(page, maxPage);
  const visible = fresh.slice(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE);

  function close() {
    request.current++;
    setReading(false);
    setPreview(null);
    setFilename('');
    setError('');
    onClose();
  }

  async function pickFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    const token = ++request.current;
    setReading(true);
    setPreview(null);
    setFilename(file.name);
    setError('');
    setExcluded(new Set());
    setCategories({});
    setPage(0);
    try {
      const result = await readBillFile(file);
      if (request.current !== token) return;
      setPreview(result);
    } catch (cause) {
      if (request.current === token) setError(cause instanceof Error ? cause.message : '无法读取文件，请使用解压后的原始账单。');
    } finally {
      if (request.current === token) setReading(false);
    }
  }

  function commit() {
    try {
      const result = importTransactions(selected.map(({ row, transaction }) => ({
        ...transaction,
        category: categories[row] ?? transaction.category,
        countInBudget: transaction.type === 'expense' && budget,
      })));
      toast.success(result.added ? `已导入 ${result.added} 笔账单${result.duplicates ? `，另跳过 ${result.duplicates} 笔重复记录` : ''}` : '没有新增记录，账单均已导入');
      if (result.added) onImported();
      close();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '导入失败，请重试。');
    }
  }

  return (
    <Modal open={open} onClose={close} title="导入支付宝 / 微信账单" maxWidth="max-w-4xl" footer={
      <div className="flex w-full flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-muted-foreground">追加到记账记录，保留现有账本。</p>
        <div className="flex gap-2">
          <Button variant="outline" onClick={close}>取消</Button>
          <Button disabled={reading || !selected.length || currency !== 'CNY'} onClick={commit}>确认导入 {selected.length} 笔</Button>
        </div>
      </div>
    }>
      <div className="space-y-5">
        <div className="flex items-start gap-3 rounded-2xl border border-primary/15 bg-primary/[0.07] p-4 text-sm">
          <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-accent-foreground" />
          <div><p className="font-medium">在本机读取，确认后入账</p><p className="mt-1 text-xs leading-6 text-muted-foreground">不会上传账单文件。导入后可像普通记录一样编辑、删除，并参与预算与报表统计。</p></div>
        </div>
        <div className="rounded-2xl border border-dashed border-input bg-card/30 p-5">
          <input ref={fileInput} type="file" accept=".csv,.xlsx,.txt" className="sr-only" aria-label="选择支付宝或微信账单文件" onChange={pickFile} />
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="min-w-0"><p className="break-all text-sm font-medium">{filename || '选择解压后的原始账单'}</p><p className="mt-1 text-xs leading-6 text-muted-foreground">支持 CSV、Excel（.xlsx），自动识别平台与 UTF-8 / GBK 编码。单次最多 10 MB、20,000 行。</p></div>
            <Button variant="outline" disabled={reading} onClick={() => fileInput.current?.click()}><IconUpload />{reading ? '正在解析…' : filename ? '重新选择' : '选择账单文件'}</Button>
          </div>
        </div>
        <details className="text-sm"><summary className="cursor-pointer text-muted-foreground">如何获取账单？</summary>
          <div className="mt-3 space-y-2 rounded-xl bg-muted/40 p-4 text-xs leading-6 text-muted-foreground">
            <p>支付宝：在「账单」中寻找「开具交易流水证明」，选择「用于个人对账」，按指引导出到邮箱。</p>
            <p>微信：在「我 → 服务 → 钱包 → 账单 → 常见问题」中寻找「下载账单」，选择用于个人对账的账单。</p>
            <p>先用平台提供的密码解压邮件附件，再选择 CSV 或 XLSX。入口名称可能随版本变化；不要上传压缩包或 PDF 证明。</p>
          </div>
        </details>
        {currency !== 'CNY' && <p role="alert" className="rounded-xl bg-warning/10 p-3 text-sm text-warning">支付宝、微信账单金额为人民币。请先在设置中把账本币种改为 CNY，再确认导入；这里不会自动换汇。</p>}
        {error && <p role="alert" className="break-words rounded-xl bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}
        {reading && <p role="status" className="text-sm text-muted-foreground">正在读取账单并检查交易格式，请稍候…</p>}
        {preview && <>
          <div className="flex flex-wrap items-center justify-between gap-2"><h3 className="text-sm font-semibold">已识别{preview.source === 'alipay' ? '支付宝' : '微信'}账单</h3><p className="text-xs text-muted-foreground">可导入 {fresh.length} 笔 · 重复 {duplicates.length} 笔 · 其他跳过 {preview.skipped.length} 笔</p></div>
          <div className="grid grid-cols-3 gap-2 rounded-2xl border border-border/50 bg-card/40 p-4">
            <div><p className="text-xs text-muted-foreground">已选择</p><p className="mt-2 text-base font-semibold">{selected.length} 笔</p></div>
            <div><p className="text-xs text-muted-foreground">收入</p><p className="mt-2 break-all text-sm font-semibold text-success">{formatCurrency(totals.income / 100)}</p></div>
            <div><p className="text-xs text-muted-foreground">支出</p><p className="mt-2 break-all text-sm font-semibold text-destructive">{formatCurrency(totals.expense / 100)}</p></div>
          </div>
          <p className="text-xs leading-6 text-muted-foreground">按平台交易单号去重；没有单号时按时间、金额和交易内容去重。手工记过的记录、跨平台的同一笔交易需要自行核对。分类为自动建议，可在下方调整。</p>
          {duplicates.length > 0 && <p className="rounded-xl bg-muted/40 p-3 text-xs leading-6 text-muted-foreground">{duplicates.length} 笔记录已存在或在本文件内重复，已自动排除。重新导入不会覆盖或更新原记录。</p>}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <label className="flex cursor-pointer items-center gap-2 text-sm"><input type="checkbox" className="h-4 w-4 accent-[hsl(var(--primary))]" checked={fresh.length > 0 && selected.length === fresh.length} disabled={!fresh.length} onChange={(event) => setExcluded(event.target.checked ? new Set() : new Set(fresh.map((entry) => entry.row)))} />全选可导入记录</label>
            <div className="flex items-center gap-2"><label htmlFor="import-budget" className="text-xs text-muted-foreground">支出计入预算</label><Switch id="import-budget" checked={budget} onCheckedChange={setBudget} /></div>
          </div>
          {fresh.length > 0 ? <div className="divide-y divide-border/40 rounded-2xl border border-border/50">
            {visible.map(({ row, transaction }) => <div key={row} className="flex items-start gap-3 p-3 sm:p-4">
              <input type="checkbox" aria-label={`选择第 ${row} 行`} className="mt-1 h-4 w-4 shrink-0 accent-[hsl(var(--primary))]" checked={!excluded.has(row)} onChange={(event) => setExcluded((previous) => { const next = new Set(previous); if (event.target.checked) next.delete(row); else next.add(row); return next; })} />
              <div className="min-w-0 flex-1"><div className="flex flex-wrap items-center justify-between gap-2"><p className="text-xs text-muted-foreground">{transaction.date} · {transaction.paymentMethod} · 第 {row} 行</p><p className={`text-sm font-semibold ${transaction.type === 'income' ? 'text-success' : 'text-destructive'}`}>{transaction.type === 'income' ? '+' : '−'}{formatCurrency(transaction.amount)}</p></div>
                <p className="mt-1 break-words text-sm leading-6">{transaction.note || '无交易说明'}</p>
                <select aria-label={`第 ${row} 行分类`} className="mt-2 max-w-full rounded-lg border border-input bg-card px-2 py-1.5 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" value={categories[row] ?? transaction.category} onChange={(event) => setCategories((previous) => ({ ...previous, [row]: event.target.value }))}>
                  {(transaction.type === 'income' ? INCOME_CATEGORIES : expenseCategories).map((category) => <option key={category} value={category}>{category}</option>)}
                </select>
              </div>
            </div>)}
          </div> : <p className="rounded-xl bg-muted/40 p-4 text-sm text-muted-foreground">没有可新增的记录，请查看去重或跳过原因。</p>}
          {maxPage > 0 && <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground"><Button size="sm" variant="outline" disabled={!currentPage} onClick={() => setPage(currentPage - 1)}>上一页</Button><span>{currentPage + 1} / {maxPage + 1} 页</span><Button size="sm" variant="outline" disabled={currentPage === maxPage} onClick={() => setPage(currentPage + 1)}>下一页</Button></div>}
          <div className="rounded-xl bg-warning/10 p-3 text-xs leading-6 text-warning">退款相关、中性资金往来和未完成交易不自动入账。退款不会自动冲销之前导入的支出，请核对原记录后手动调整。</div>
          {preview.skipped.length > 0 && <details className="text-sm"><summary className="cursor-pointer text-muted-foreground">查看 {preview.skipped.length} 条跳过原因</summary><ul className="mt-3 space-y-1 rounded-xl bg-muted/40 p-3 text-xs leading-6 text-muted-foreground">{preview.skipped.slice(0, 50).map((issue) => <li key={issue.row}>第 {issue.row} 行：{issue.reason}</li>)}{preview.skipped.length > 50 && <li>这里只展示前 50 条。</li>}</ul></details>}
        </>}
      </div>
    </Modal>
  );
}
