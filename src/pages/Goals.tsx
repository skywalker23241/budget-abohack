/**
 * 财务目标页面：目标列表、完成进度、预计完成时间、建议投入、更新进度。
 */
import { useMemo, useState } from 'react';
import type { FinancialGoal } from '@/types';
import { useStore } from '@/store/useStore';
import {
  goalProgress,
  goalRemaining,
  goalMonthsToComplete,
  goalSuggestedMonthly,
  goalStatus,
} from '@/lib/calculations';
import { formatCurrency, formatPercent, safeNumber, addMonths, currentMonth, formatMonthLabel } from '@/lib/format';
import { PageHeader } from '@/components/PageHeader';
import { AppSummaryCard } from '@/components/AppSummaryCard';
import { MobileCollapsibleSection } from '@/components/MobileCollapsibleSection';
import { Card, StatCard, ProgressBar, Badge, EmptyState, Button, Input } from '@/components/ui';
import { Modal } from '@/components/Modal';
import { GoalForm } from '@/components/forms/GoalForm';
import { Field } from '@/components/forms/fields';
import { AmountText } from '@/components/AmountText';
import { useConfirm } from '@/components/ConfirmDialog';
import { useToast } from '@/components/Toast';
import {
  IconPlus,
  IconTarget,
  IconEdit,
  IconTrash,
  IconArrowUp,
  IconArrowDown,
} from '@/components/Icons';

const STATUS_META = {
  completed: { tone: 'emerald' as const, label: '已完成' },
  behind: { tone: 'rose' as const, label: '进度落后' },
  in_progress: { tone: 'brand' as const, label: '进行中' },
};

/** 更新进度弹窗 */
function ContributeModal({
  goal,
  onClose,
}: {
  goal: FinancialGoal;
  onClose: () => void;
}) {
  const contributeToGoal = useStore((s) => s.contributeToGoal);
  const settings = useStore((s) => s.settings);
  const toast = useToast();
  const [amount, setAmount] = useState('');
  const [error, setError] = useState('');

  function apply(sign: 1 | -1) {
    const v = safeNumber(amount);
    if (v <= 0) {
      setError('请输入大于 0 的金额');
      return;
    }
    contributeToGoal(goal.id, sign * v);
    toast.success(sign > 0 ? '已增加进度' : '已减少进度');
    onClose();
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg bg-muted p-3 text-sm">
        <div className="flex justify-between">
          <span className="text-muted-foreground">当前已存</span>
          <AmountText className="w-[60%] text-right" value={formatCurrency(goal.currentAmount,settings.currency)} maxSize={16}/>
        </div>
        <div className="mt-1 flex justify-between">
          <span className="text-muted-foreground">目标金额</span>
          <AmountText className="w-[60%] text-right" value={formatCurrency(goal.targetAmount,settings.currency)} maxSize={16}/>
        </div>
      </div>
      <Field label="金额" required error={error}>
        <Input
          type="number"
          min="0"
          step="0.01"
          placeholder="本次投入 / 支取金额"
          value={amount}
          onChange={(e) => {
            setAmount(e.target.value);
            setError('');
          }}
          autoFocus
        />
      </Field>
      <div className="grid grid-cols-2 gap-2">
        <Button variant="outline" className="h-11" onClick={() => apply(-1)}>
          <IconArrowDown className="h-4 w-4" />
          减少
        </Button>
        <Button className="h-11" onClick={() => apply(1)}>
          <IconArrowUp className="h-4 w-4" />
          增加
        </Button>
      </div>
    </div>
  );
}

export function Goals() {
  const goals = useStore((s) => s.goals);
  const deleteGoal = useStore((s) => s.deleteGoal);
  const settings = useStore((s) => s.settings);
  const cur = settings.currency;
  const confirm = useConfirm();
  const toast = useToast();

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<FinancialGoal | null>(null);
  const [contributing, setContributing] = useState<FinancialGoal | null>(null);

  const summary = useMemo(() => {
    const target = goals.reduce((s, g) => s + g.targetAmount, 0);
    const saved = goals.reduce((s, g) => s + g.currentAmount, 0);
    const suggested = goals.reduce((s, g) => s + goalSuggestedMonthly(g), 0);
    return { target, saved, suggested, progress: target > 0 ? saved / target : 0 };
  }, [goals]);
  const completedGoals = goals.filter((g) => goalStatus(g) === 'completed').length;
  const behindGoals = goals.filter((g) => goalStatus(g) === 'behind').length;

  function openAdd() {
    setEditing(null);
    setShowForm(true);
  }
  function openEdit(g: FinancialGoal) {
    setEditing(g);
    setShowForm(true);
  }
  async function handleDelete(g: FinancialGoal) {
    const ok = await confirm({
      title: '删除目标',
      message: `确定删除目标「${g.name}」吗？`,
      danger: true,
      confirmText: '删除',
    });
    if (ok) {
      deleteGoal(g.id);
      toast.success('目标已删除');
    }
  }

  return (
    <>
      <PageHeader
        title="财务目标"
        actions={
          <Button data-tour="goal-add" onClick={openAdd}>
            <IconPlus className="h-4 w-4" />
            新增目标
          </Button>
        }
      />

      <AppSummaryCard
        eyebrow="目标进度"
        title={goals.length > 0 ? '已积累金额' : '还没有目标'}
        value={goals.length > 0 ? formatCurrency(summary.saved, cur) : '先定一个'}
        subtitle={
          goals.length === 0
            ? undefined
            : behindGoals > 0
              ? `${behindGoals} 个目标进度落后`
              : `已完成 ${formatPercent(summary.progress)}`
        }
        accent={
          summary.progress >= 1
            ? 'success'
            : behindGoals > 0
              ? 'warning'
              : goals.length > 0
                ? 'info'
                : 'default'
        }
        meta={[
          { label: '目标总额', value: formatCurrency(summary.target, cur) },
          { label: '本月建议', value: formatCurrency(summary.suggested, cur) },
          { label: '已完成', value: `${completedGoals} 个` },
        ]}
      >
        {goals.length > 0 && <ProgressBar value={summary.progress} className="h-1.5" />}
      </AppSummaryCard>

      {goals.length > 0 && (
        <MobileCollapsibleSection
          className="mt-4 hidden lg:block"
          title="目标概览"
          subtitle={`总进度 ${formatPercent(summary.progress)}，本月建议 ${formatCurrency(
            summary.suggested,
            cur,
          )}`}
        >
          <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
            <StatCard
              label="目标总数"
              value={goals.length}
              icon={<IconTarget className="h-4 w-4" />}
              tone="brand"
            />
            <StatCard label="目标总额" value={formatCurrency(summary.target, cur)} />
            <StatCard
              label="已积累"
              value={formatCurrency(summary.saved, cur)}
              tone="income"
              hint={`总进度 ${formatPercent(summary.progress)}`}
            />
            <StatCard
              label="本月建议投入"
              value={formatCurrency(summary.suggested, cur)}
              tone="warning"
            />
          </div>
        </MobileCollapsibleSection>
      )}

      <div className="mt-4">
        {goals.length === 0 ? (
          <EmptyState
            icon={<IconTarget className="h-6 w-6" />}
            title="还没有财务目标"
            description="添加储蓄、应急金或还贷目标"
            action={
              <Button onClick={openAdd}>
                <IconPlus className="h-4 w-4" />
                新增目标
              </Button>
            }
          />
        ) : (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {goals.map((g) => {
              const progress = goalProgress(g);
              const remaining = goalRemaining(g);
              const months = goalMonthsToComplete(g);
              const suggested = goalSuggestedMonthly(g);
              const status = goalStatus(g);
              const meta = STATUS_META[status];
              const eta =
                months === 0
                  ? '已达成'
                  : months === null
                    ? '未设定月投入'
                    : `约 ${months} 个月（${formatMonthLabel(addMonths(currentMonth(), months))}）`;
              return (
                <Card key={g.id}>
                  <div className="flex min-w-0 items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="min-w-0 break-words font-semibold text-foreground">
                          {g.name}
                        </span>
                        <Badge tone="blue">{g.type}</Badge>
                        <Badge tone={meta.tone}>{meta.label}</Badge>
                      </div>
                      <p className="mt-1 break-words text-xs text-muted-foreground [overflow-wrap:anywhere]">
                        截止 {g.deadline}
                      </p>
                    </div>
                    <div className="flex shrink-0">
                      <button
                        onClick={() => openEdit(g)}
                        className="flex h-11 w-11 items-center justify-center rounded-xl text-muted-foreground hover:bg-accent hover:text-foreground"
                        aria-label="编辑"
                      >
                        <IconEdit className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  <div className="mt-4">
                    <div className="mb-3 grid grid-cols-2 gap-3">
                      <div className="min-w-0"><p className="mb-1 text-xs text-muted-foreground">已积累</p><AmountText value={formatCurrency(g.currentAmount,cur)} maxSize={20}/></div>
                      <div className="min-w-0"><p className="mb-1 text-xs text-muted-foreground">目标金额</p><AmountText value={formatCurrency(g.targetAmount,cur)} maxSize={20}/></div>
                    </div>
                    <ProgressBar
                      value={progress}
                      tone={status === 'completed' ? 'emerald' : status === 'behind' ? 'rose' : 'brand'}
                    />
                    <p className="mt-1 text-right text-xs text-muted-foreground">
                      {formatPercent(progress)}
                    </p>
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-3 rounded-2xl bg-muted/40 p-3 text-xs">
                    <div>
                      <p className="text-muted-foreground">还差</p>
                      <AmountText className="mt-1" value={formatCurrency(remaining,cur)} maxSize={16}/>
                    </div>
                    <div>
                      <p className="text-muted-foreground">建议月投</p>
                      <AmountText className="mt-1" value={formatCurrency(suggested,cur)} maxSize={16}/>
                    </div>
                  </div>
                  <details className="mt-1 text-xs text-muted-foreground"><summary className="flex min-h-11 cursor-pointer items-center">计划与更多操作</summary><p className="mb-2 leading-5">预计完成：{eta}</p>{g.note && <p className="mb-2 break-words leading-5">{g.note}</p>}<Button variant="ghost" className="h-11 w-full text-destructive" onClick={()=>handleDelete(g)}><IconTrash/>删除目标</Button></details>

                  <Button
                    variant="outline"
                    className="mt-1 h-11 w-full rounded-2xl"
                    onClick={() => setContributing(g)}
                  >
                    更新进度
                  </Button>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      <Modal
        open={showForm}
        onClose={() => setShowForm(false)}
        title={editing ? '编辑目标' : '新增目标'}
        maxWidth="max-w-xl"
      >
        <GoalForm initial={editing ?? undefined} onClose={() => setShowForm(false)} />
      </Modal>

      <Modal
        open={!!contributing}
        onClose={() => setContributing(null)}
        title={`更新进度 · ${contributing?.name ?? ''}`}
        maxWidth="max-w-sm"
      >
        {contributing && (
          <ContributeModal
            goal={contributing}
            onClose={() => setContributing(null)}
          />
        )}
      </Modal>
    </>
  );
}
