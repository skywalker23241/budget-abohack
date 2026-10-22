/**
 * 收入来源表单：新增 / 编辑收入来源。
 */
import { useState } from 'react';
import type { IncomeSource, IncomeType } from '@/types';
import { INCOME_TYPES } from '@/lib/constants';
import { safeNumber, clamp } from '@/lib/format';
import { useStore } from '@/store/useStore';
import { useToast } from '../Toast';
import { Button, Input } from '@/components/ui';
import { Field, Toggle } from './fields';
import { AmountField, IconChoices } from './EntryFields';
import { InlineDisclosure } from '@/components/MobileCollapsibleSection';

interface Props {
  initial?: IncomeSource;
  onClose: () => void;
}

export function IncomeForm({ initial, onClose }: Props) {
  const addIncomeSource = useStore((s) => s.addIncomeSource);
  const updateIncomeSource = useStore((s) => s.updateIncomeSource);
  const toast = useToast();
  const isEdit = !!initial;

  const [name, setName] = useState(initial?.name ?? '');
  const [type, setType] = useState<IncomeType>(initial?.type ?? '工资');
  const [amount, setAmount] = useState(initial ? String(initial.amount) : '');
  const [isFixed, setIsFixed] = useState(initial?.isFixed ?? true);
  const [payday, setPayday] = useState(initial ? String(initial.payday) : '10');
  const [note, setNote] = useState(initial?.note ?? '');
  const [errors, setErrors] = useState<Record<string, string>>({});

  function validate(): boolean {
    const e: Record<string, string> = {};
    if (!name.trim()) e.name = '请输入收入名称';
    if (safeNumber(amount) <= 0) e.amount = '金额必须大于 0';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function handleSubmit(ev: React.FormEvent) {
    ev.preventDefault();
    if (!validate()) return;
    const payload = {
      name: name.trim(),
      type,
      amount: safeNumber(amount),
      isFixed,
      payday: clamp(Math.round(safeNumber(payday)), 1, 31),
      note: note.trim(),
    };
    if (isEdit && initial) {
      updateIncomeSource(initial.id, payload);
      toast.success('收入来源已更新');
    } else {
      addIncomeSource(payload);
      toast.success('收入来源已添加');
    }
    onClose();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <AmountField label="收入金额" value={amount} onChange={setAmount} error={errors.amount} autoFocus />
      <Field label="收入类型" required>
        <IconChoices label="收入类型" value={type} onChange={setType} options={INCOME_TYPES} type="income" className="sm:grid-cols-5" />
      </Field>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field id="income-name" label="收入名称" required error={errors.name}>
          <Input
            id="income-name"
            placeholder="如：主职工资"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </Field>
        <Field id="income-payday" label="每月到账日">
          <Input
            id="income-payday"
            type="number"
            min="1"
            max="31"
            value={payday}
            onChange={(e) => setPayday(e.target.value)}
          />
        </Field>
      </div>

      <InlineDisclosure title="更多选项" defaultOpen={isEdit}>
      <div className="space-y-4">
      <Field id="income-note" label="备注">
        <Input
          id="income-note"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="可选"
          maxLength={100}
        />
      </Field>

      <Toggle checked={isFixed} onChange={setIsFixed} label="固定收入" />
      </div>
      </InlineDisclosure>

      <div className="flex justify-end gap-2 pt-1">
        <Button type="button" variant="outline" onClick={onClose}>
          取消
        </Button>
        <Button type="submit">{isEdit ? '保存修改' : '添加收入'}</Button>
      </div>
    </form>
  );
}
