/**
 * 设置页面：偏好设置 + 数据管理（导出/导入 JSON、导出 CSV、清空、载入示例）。
 */
import { useEffect, useRef, useState, type ReactNode } from 'react';
import {
  ChevronRight,
  Cloud,
  RefreshCw,
  Save,
  ShieldCheck,
  Unplug,
} from '@/components/Icons';
import type { AppData } from '@/types';
import { useStore } from '@/store/useStore';
import { todayStr, csvCell } from '@/lib/format';
import { TRANSACTION_TYPE_LABELS } from '@/lib/constants';
import { cn } from '@/lib/utils';
import {
  DEFAULT_WEBDAV_CONFIG,
  clearWebDavConfig,
  clearWebDavSyncMeta,
  compareIsoTime,
  downloadCloudSnapshot,
  loadWebDavConfig,
  loadWebDavSyncMeta,
  markCloudDownloadApplied,
  saveWebDavConfig,
  saveWebDavSyncMeta,
  testWebDavConnection,
  uploadCloudSnapshot,
  type WebDavConfig,
} from '@/lib/webdavSync';
import { PageHeader } from '@/components/PageHeader';
import { AppSummaryCard } from '@/components/AppSummaryCard';
import { MobileCollapsibleSection } from '@/components/MobileCollapsibleSection';
import { Card, SectionTitle, Button, Input } from '@/components/ui';
import { Field, SelectField } from '@/components/forms/fields';
import { ThemeSegmented } from '@/components/ThemeToggle';
import { useConfirm } from '@/components/ConfirmDialog';
import { useSecurityConfirm } from '@/components/SecurityConfirmDialog';
import { useToast } from '@/components/Toast';
import { openOnboardingGuide } from '@/components/OnboardingGuide';
import {
  IconDownload,
  IconHelp,
  IconUpload,
  IconTrash,
  IconReceipt,
  IconSettings,
} from '@/components/Icons';

const CURRENCIES = [
  { code: 'CNY', label: '人民币 ¥ (CNY)' },
  { code: 'USD', label: '美元 $ (USD)' },
  { code: 'EUR', label: '欧元 € (EUR)' },
  { code: 'GBP', label: '英镑 £ (GBP)' },
  { code: 'JPY', label: '日元 ¥ (JPY)' },
  { code: 'HKD', label: '港币 HK$ (HKD)' },
];

/** 触发浏览器下载 */
function download(filename: string, content: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/** CSV 字段转义 */
function formatSyncTime(value?: string): string {
  if (!value) return '从未';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('zh-CN', { hour12: false });
}

function syncResultLabel(result?: string): string {
  if (result === 'uploaded') return '已上传';
  if (result === 'downloaded') return '已下载';
  if (result === 'unchanged') return '无变化';
  return '暂无';
}

function SettingActionRow({
  icon,
  title,
  description,
  onClick,
  disabled,
  danger,
}: {
  icon: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'group flex w-full items-center gap-4 px-4 py-4 text-left transition-colors focus-visible:relative focus-visible:z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 sm:px-5',
        danger ? 'hover:bg-destructive/[0.045]' : 'hover:bg-muted/45',
      )}
    >
      <span
        className={cn(
          'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-accent-foreground',
          danger && 'bg-destructive/10 text-destructive',
        )}
      >
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span
          className={cn(
            'block break-words text-sm font-medium text-foreground',
            danger && 'text-destructive',
          )}
        >
          {title}
        </span>
        {description && (
          <span className="mt-1 block break-words text-xs leading-5 text-muted-foreground">
            {description}
          </span>
        )}
      </span>
      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
    </button>
  );
}

function SettingFieldRow({
  title,
  description,
  children,
  id,
  unit,
}: {
  title: string;
  description?: string;
  children: ReactNode;
  id?: string;
  unit?: string;
}) {
  return (
    <div className="grid min-w-0 gap-3 px-4 py-4 sm:px-5 md:grid-cols-[minmax(0,1fr)_minmax(12rem,17rem)] md:items-center md:gap-6">
      <div className="min-w-0">
        <label htmlFor={id} className="text-sm font-medium text-foreground">{title}</label>
        {description && (
          <p className="mt-1 max-w-xl text-xs leading-5 text-muted-foreground">{description}</p>
        )}
      </div>
      <div className={cn('relative min-w-0 md:justify-self-stretch', unit && '[&_input]:pr-14')}>
        {children}
        {unit && <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs text-muted-foreground">{unit}</span>}
      </div>
    </div>
  );
}

export function Settings({ embedded = false }: { embedded?: boolean } = {}) {
  const settings = useStore((s) => s.settings);
  const updateSettings = useStore((s) => s.updateSettings);
  const exportData = useStore((s) => s.exportData);
  const replaceAll = useStore((s) => s.replaceAll);
  const clearAll = useStore((s) => s.clearAll);
  const loadSampleData = useStore((s) => s.loadSampleData);
  const transactions = useStore((s) => s.transactions);
  const budgets = useStore((s) => s.budgets);
  const loans = useStore((s) => s.loans);
  const incomeSources = useStore((s) => s.incomeSources);
  const goals = useStore((s) => s.goals);
  const confirm = useConfirm();
  const { securityConfirm, securityConfirmDialog } = useSecurityConfirm();
  const toast = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState(false);
  const [syncConfig, setSyncConfig] = useState<WebDavConfig>(() => loadWebDavConfig());
  const [syncMeta, setSyncMeta] = useState(() => loadWebDavSyncMeta());
  const [syncing, setSyncing] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<
    'preferences' | 'backup' | 'sync' | 'other'
  >('preferences');

  useEffect(() => {
    if (!embedded) return;
    const frame = window.requestAnimationFrame(() => {
      document
        .querySelector<HTMLElement>('[data-tour="settings-panel"] .settings-scroll-pane:not(.hidden)')
        ?.scrollTo({ top: 0, behavior: 'auto' });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [activeSection, embedded]);
  const syncConfigured = Boolean(
    syncConfig.serverUrl && syncConfig.username && syncConfig.remotePath,
  );
  const totalLocalItems =
    transactions.length + budgets.length + loans.length + incomeSources.length + goals.length;

  function updateSyncConfig<K extends keyof WebDavConfig>(
    key: K,
    value: WebDavConfig[K],
  ) {
    setSyncConfig((prev) => ({ ...prev, [key]: value }));
  }

  function persistSyncConfig(): WebDavConfig {
    const saved = saveWebDavConfig(syncConfig);
    setSyncConfig(saved);
    return saved;
  }

  function refreshSyncMeta() {
    setSyncMeta(loadWebDavSyncMeta());
  }

  async function runSync(action: string, task: () => Promise<void>) {
    setSyncing(action);
    try {
      await task();
    } catch (err) {
      toast.error('同步失败：' + (err instanceof Error ? err.message : '未知错误'));
    } finally {
      refreshSyncMeta();
      setSyncing(null);
    }
  }

  function handleSaveSyncConfig() {
    try {
      persistSyncConfig();
      toast.success('WebDAV 配置已保存');
    } catch (err) {
      toast.error('保存失败：' + (err instanceof Error ? err.message : '未知错误'));
    }
  }

  async function handleTestConnection() {
    await runSync('test', async () => {
      const config = persistSyncConfig();
      const fileExists = await testWebDavConnection(config);
      toast.success(fileExists ? '连接成功，已找到云端同步文件' : '连接成功，云端还没有同步文件');
    });
  }

  async function handleUploadToCloud() {
    const ok = await securityConfirm({
      title: '安全同步确认：上传本机数据',
      message:
        '将用当前浏览器里的全部预算数据覆盖 WebDAV 云端同步文件。建议确认本机数据完整后再继续。',
      confirmText: '上传覆盖',
    });
    if (!ok) return;

    await runSync('upload', async () => {
      const config = persistSyncConfig();
      await uploadCloudSnapshot(config, exportData(), new Date().toISOString());
      toast.success('已上传本机数据到 WebDAV');
    });
  }

  async function handleDownloadFromCloud() {
    const ok = await securityConfirm({
      title: '安全同步确认：下载云端数据',
      message:
        '将用 WebDAV 云端同步文件覆盖当前浏览器里的全部预算数据。建议先导出 JSON 备份。',
      confirmText: '下载覆盖',
    });
    if (!ok) return;

    await runSync('download', async () => {
      const config = persistSyncConfig();
      const snapshot = await downloadCloudSnapshot(config);
      if (!snapshot) {
        toast.info('云端还没有同步文件');
        return;
      }
      replaceAll(snapshot.data);
      setSyncMeta(markCloudDownloadApplied(snapshot.updatedAt));
      toast.success('已从 WebDAV 下载数据');
    });
  }

  async function handleSmartSync() {
    await runSync('smart', async () => {
      const config = persistSyncConfig();
      const snapshot = await downloadCloudSnapshot(config);

      if (!snapshot) {
        await uploadCloudSnapshot(config, exportData(), new Date().toISOString());
        toast.success('云端无同步文件，已上传本机数据');
        return;
      }

      const currentMeta = loadWebDavSyncMeta();
      const localUpdatedAt = currentMeta.lastLocalChangeAt;

      if (!localUpdatedAt) {
        const ok = await securityConfirm({
          title: '安全同步确认：首次同步',
          message:
            '云端已有同步文件，但本机没有同步历史。继续将从云端下载并覆盖本机数据；取消后可改用“上传本机数据”。',
          confirmText: '从云端下载',
        });
        if (!ok) return;
        replaceAll(snapshot.data);
        setSyncMeta(markCloudDownloadApplied(snapshot.updatedAt));
        toast.success('已从云端下载数据');
        return;
      }

      const comparison = compareIsoTime(localUpdatedAt, snapshot.updatedAt);
      if (comparison > 0) {
        await uploadCloudSnapshot(config, exportData(), localUpdatedAt);
        toast.success('本机数据较新，已上传到云端');
        return;
      }

      if (comparison < 0) {
        const ok = await securityConfirm({
          title: '安全同步确认：云端数据较新',
          message: `云端更新于 ${formatSyncTime(snapshot.updatedAt)}，本机更新于 ${formatSyncTime(
            localUpdatedAt,
          )}。继续将用云端数据覆盖本机。`,
          confirmText: '下载覆盖',
        });
        if (!ok) return;
        replaceAll(snapshot.data);
        setSyncMeta(markCloudDownloadApplied(snapshot.updatedAt));
        toast.success('云端数据较新，已下载到本机');
        return;
      }

      saveWebDavSyncMeta({
        ...currentMeta,
        lastSyncAt: new Date().toISOString(),
        lastRemoteUpdatedAt: snapshot.updatedAt,
        lastResult: 'unchanged',
      });
      toast.info('本机和云端已是最新');
    });
  }

  async function handleClearSyncConfig() {
    const ok = await confirm({
      title: '清除 WebDAV 配置',
      message: '将删除当前浏览器保存的 WebDAV 地址、账号、密码和同步状态，不会删除云端文件。',
      danger: true,
      confirmText: '清除配置',
    });
    if (!ok) return;

    clearWebDavConfig();
    clearWebDavSyncMeta();
    setSyncConfig(DEFAULT_WEBDAV_CONFIG);
    setSyncMeta({});
    toast.success('WebDAV 配置已清除');
  }

  function handleExportJSON() {
    const data = exportData();
    download(
      `预算记账备份_${todayStr()}.json`,
      JSON.stringify(data, null, 2),
      'application/json'
    );
    toast.success('已导出 JSON 备份');
  }

  function handleExportCSV() {
    if (transactions.length === 0) {
      toast.info('暂无记账记录可导出');
      return;
    }
    const header = [
      '日期',
      '类型',
      '金额',
      '分类',
      '支付方式',
      '备注',
      '计入预算',
      '固定收支',
    ];
    const rows = [...transactions]
      .sort((a, b) => (a.date < b.date ? 1 : -1))
      .map((t) =>
        [
          t.date,
          TRANSACTION_TYPE_LABELS[t.type],
          t.amount,
          t.category,
          t.paymentMethod,
          t.note,
          t.countInBudget ? '是' : '否',
          t.isFixed ? '是' : '否',
        ]
          .map(csvCell)
          .join(',')
      );
    // 加 BOM 以便 Excel 正确识别 UTF-8
    const csv = '﻿' + [header.join(','), ...rows].join('\n');
    download(`记账记录_${todayStr()}.csv`, csv, 'text/csv;charset=utf-8');
    toast.success('已导出 CSV');
  }

  async function handleImportFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ''; // 允许重复选择同一文件
    if (!file) return;
    setImporting(true);
    try {
      const text = await file.text();
      const parsed = JSON.parse(text) as Partial<AppData>;
      if (
        !parsed ||
        typeof parsed !== 'object' ||
        !Array.isArray(parsed.transactions)
      ) {
        throw new Error('文件格式不正确');
      }
      const ok = await confirm({
        title: '导入数据',
        message:
          '导入将覆盖当前所有数据（交易、预算、贷款、收入、目标、设置）。建议先导出备份。确认导入？',
        danger: true,
        confirmText: '覆盖导入',
      });
      if (ok) {
        replaceAll({
          transactions: parsed.transactions ?? [],
          budgets: parsed.budgets ?? [],
          loans: parsed.loans ?? [],
          loanPayments: parsed.loanPayments ?? [],
          incomeSources: parsed.incomeSources ?? [],
          goals: parsed.goals ?? [],
          settings: parsed.settings ?? settings,
        });
        toast.success('数据导入成功');
      }
    } catch (err) {
      toast.error('导入失败：' + (err instanceof Error ? err.message : '未知错误'));
    } finally {
      setImporting(false);
    }
  }

  async function handleClear() {
    const ok = await confirm({
      title: '清空所有数据',
      message:
        '将删除全部交易、预算、贷款、收入来源和目标（设置保留）。此操作不可撤销，建议先导出备份。确认清空？',
      danger: true,
      confirmText: '确认清空',
    });
    if (ok) {
      clearAll();
      toast.success('数据已清空');
    }
  }

  async function handleLoadSample() {
    const ok = await confirm({
      title: '载入示例数据',
      message: '将用示例数据替换当前全部数据。确认继续？',
      confirmText: '载入示例',
    });
    if (ok) {
      loadSampleData();
      toast.success('已载入示例数据');
    }
  }

  return (
    <>
      {securityConfirmDialog}
      {!embedded && (
        <>
          <PageHeader title="设置" />
          <AppSummaryCard
            eyebrow="设置中心"
            title={syncConfigured ? '云同步配置' : '本地数据'}
            value={syncConfigured ? syncResultLabel(syncMeta.lastResult) : `${totalLocalItems} 项`}
            subtitle={
              syncConfigured
                ? `最近同步：${formatSyncTime(syncMeta.lastSyncAt)}`
                : '保存在当前浏览器'
            }
            accent={syncConfigured ? 'info' : 'warning'}
            meta={[
              { label: '记账记录', value: `${transactions.length} 笔` },
              { label: '预算/目标', value: `${budgets.length + goals.length} 项` },
              { label: '贷款/收入', value: `${loans.length + incomeSources.length} 项` },
            ]}
          />
        </>
      )}

      <div
        data-tour={embedded ? 'settings-panel' : undefined}
        className={cn(
          'settings-panel grid min-w-0 grid-cols-1',
          embedded
            ? 'md:h-full md:min-h-0 md:grid-cols-[13rem_minmax(0,1fr)]'
            : 'gap-4 lg:grid-cols-2',
          !embedded && 'mt-4',
        )}
      >
        {embedded && (
          <aside className="sticky top-0 z-10 border-b border-border/50 bg-popover/95 p-2 backdrop-blur-xl md:static md:row-start-1 md:flex md:h-full md:min-h-0 md:flex-col md:border-b-0 md:border-r md:bg-muted/20 md:p-3">
            <nav aria-label="设置分类" className="grid grid-cols-4 gap-1 md:flex md:flex-col md:gap-1.5">
              {[
                {
                  id: 'preferences' as const,
                  title: '偏好设置',
                  icon: IconSettings,
                },
                {
                  id: 'backup' as const,
                  title: '数据备份',
                  icon: IconDownload,
                },
                {
                  id: 'sync' as const,
                  title: '云同步',
                  icon: Cloud,
                },
                {
                  id: 'other' as const,
                  title: '其他操作',
                  icon: IconHelp,
                },
              ].map(({ id, title, icon: SectionIcon }) => {
                const active = activeSection === id;
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setActiveSection(id)}
                    aria-current={active ? 'page' : undefined}
                    className={cn(
                      'flex min-w-0 flex-col items-center gap-1.5 rounded-xl px-1.5 py-2.5 text-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring md:w-full md:flex-row md:gap-3 md:px-3 md:py-3.5 md:text-left',
                      active
                        ? 'bg-primary/15 text-accent-foreground'
                        : 'text-muted-foreground hover:bg-background/75 hover:text-foreground',
                    )}
                  >
                    <SectionIcon
                      className="h-5 w-5 shrink-0"
                      weight="duotone"
                    />
                    <span className="min-w-0">
                      <span className="block whitespace-nowrap text-xs font-medium md:text-sm">
                        {title}
                      </span>
                    </span>
                  </button>
                );
              })}
            </nav>
            <div className="mt-auto hidden items-start gap-2.5 px-3 pb-2 pt-8 text-muted-foreground md:flex">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
              <p className="text-xs">本地存储</p>
            </div>
          </aside>
        )}

        {/* 偏好设置 */}
        <MobileCollapsibleSection
          title="偏好设置"
          defaultOpen
          alwaysOpen={embedded}
          className={cn(
            embedded &&
              'settings-scroll-pane p-4 sm:p-6 md:col-start-2 md:row-start-1 md:h-full md:min-h-0 md:overflow-y-auto md:overscroll-contain md:p-7',
            embedded && activeSection !== 'preferences' && 'hidden',
          )}
        >
          <Card padding={false} className="settings-section">
            <SectionTitle
              title="偏好设置"
              action={
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-muted text-muted-foreground">
                  <IconSettings className="h-4 w-4" weight="duotone" />
                </span>
              }
            />
            <p className="settings-group-label">外观与显示</p>
            <div className="settings-surface divide-y divide-border/50">
              <SettingFieldRow title="外观主题">
                <ThemeSegmented />
              </SettingFieldRow>

              <SettingFieldRow id="settings-currency" title="默认币种" description="仅显示，不换算">
                <SelectField
                  id="settings-currency"
                  value={settings.currency}
                  onChange={(v) => updateSettings({ currency: v })}
                  options={CURRENCIES.map((c) => ({ value: c.code, label: c.label }))}
                />
              </SettingFieldRow>
            </div>

            <p className="settings-group-label mt-6">预算与提醒</p>
            <div className="settings-surface divide-y divide-border/50">

              <SettingFieldRow
                id="settings-savings"
                unit="%"
                title="月度储蓄率目标"
              >
                <Input
                  id="settings-savings"
                  type="number"
                  min="0"
                  max="100"
                  value={settings.savingsRateTarget}
                  onChange={(e) =>
                    updateSettings({
                      savingsRateTarget: Math.max(0, Math.min(100, Number(e.target.value))),
                    })
                  }
                />
              </SettingFieldRow>

              <SettingFieldRow
                id="settings-budget-warning"
                unit="%"
                title="预算使用率预警"
              >
                <Input
                  id="settings-budget-warning"
                  type="number"
                  min="1"
                  max="100"
                  value={settings.budgetWarnThreshold}
                  onChange={(e) =>
                    updateSettings({
                      budgetWarnThreshold: Math.max(1, Math.min(100, Number(e.target.value))),
                    })
                  }
                />
              </SettingFieldRow>

              <SettingFieldRow
                id="settings-large-expense"
                unit={settings.currency}
                title="大额支出提醒"
              >
                <Input
                  id="settings-large-expense"
                  type="number"
                  min="0"
                  value={settings.largeExpenseThreshold}
                  onChange={(e) =>
                    updateSettings({
                      largeExpenseThreshold: Math.max(0, Number(e.target.value)),
                    })
                  }
                />
              </SettingFieldRow>

              <SettingFieldRow
                id="settings-month-start"
                unit="日"
                title="记账周期起始日"
                description="每月 1–28 日"
              >
                <Input
                  id="settings-month-start"
                  type="number"
                  min="1"
                  max="28"
                  value={settings.monthStartDay}
                  onChange={(e) =>
                    updateSettings({
                      monthStartDay: Math.max(1, Math.min(28, Number(e.target.value))),
                    })
                  }
                />
              </SettingFieldRow>
            </div>
          </Card>
        </MobileCollapsibleSection>

        {/* 数据管理 */}
        <div
          className={cn(
            'space-y-4',
            embedded &&
              'settings-scroll-pane p-4 sm:p-6 md:col-start-2 md:row-start-1 md:h-full md:min-h-0 md:overflow-y-auto md:overscroll-contain md:p-7',
            embedded && activeSection === 'preferences' && 'hidden',
          )}
        >
          <MobileCollapsibleSection
            title="数据备份"
            alwaysOpen={embedded}
            className={cn(embedded && activeSection !== 'backup' && 'hidden')}
          >
            <Card padding={false} className="settings-section">
              <SectionTitle title="数据备份" />
              <div className="settings-surface mb-5 grid grid-cols-3 gap-3 px-4 py-5 text-center">
                <div><p className="text-xl font-semibold tabular-nums">{transactions.length}</p><p className="mt-1 text-xs text-muted-foreground">记账记录</p></div>
                <div className="border-x border-border/50"><p className="text-xl font-semibold tabular-nums">{budgets.length + goals.length}</p><p className="mt-1 text-xs text-muted-foreground">预算 / 目标</p></div>
                <div><p className="text-xl font-semibold tabular-nums">{loans.length + incomeSources.length}</p><p className="mt-1 text-xs text-muted-foreground">贷款 / 收入</p></div>
              </div>
              <div className="settings-surface divide-y divide-border/50">
                <SettingActionRow
                  icon={<IconDownload className="h-4 w-4" />}
                  title="导出 JSON 备份"
                  onClick={handleExportJSON}
                />
                <SettingActionRow
                  icon={<IconReceipt className="h-4 w-4" />}
                  title="导出 CSV 流水"
                  onClick={handleExportCSV}
                />
                <SettingActionRow
                  icon={<IconUpload className="h-4 w-4" />}
                  title={importing ? '导入中…' : '从 JSON 文件导入'}
                  description="覆盖本机全部数据"
                  onClick={() => fileRef.current?.click()}
                  disabled={importing}
                />
                <input
                  ref={fileRef}
                  type="file"
                  accept="application/json,.json"
                  className="hidden"
                  onChange={handleImportFile}
                />
              </div>
            </Card>
          </MobileCollapsibleSection>

          <MobileCollapsibleSection
            title="WebDAV 云同步"
            alwaysOpen={embedded}
            className={cn(embedded && activeSection !== 'sync' && 'hidden')}
          >
          <Card padding={false} className="settings-section">
              <SectionTitle
                title="WebDAV 云同步"
                action={<Cloud className="h-5 w-5 text-muted-foreground" />}
              />

            <div className="mb-5 flex items-center gap-3 rounded-2xl border border-primary/20 bg-primary/10 px-4 py-3">
              <Cloud className="h-5 w-5 shrink-0 text-accent-foreground" weight="duotone" />
              <p className="min-w-0 flex-1 text-sm font-medium">{syncConfigured ? '已填写同步配置' : '尚未配置'}</p>
            </div>
            <p className="settings-group-label">连接配置</p>
            <div className="settings-surface space-y-4 p-4 sm:p-5">
              <Field id="webdav-url" label="服务地址">
                <Input
                  id="webdav-url"
                  value={syncConfig.serverUrl}
                  onChange={(e) => updateSyncConfig('serverUrl', e.target.value)}
                  placeholder="https://dav.example.com/dav/"
                  autoComplete="url"
                />
              </Field>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Field id="webdav-username" label="用户名">
                  <Input
                    id="webdav-username"
                    value={syncConfig.username}
                    onChange={(e) => updateSyncConfig('username', e.target.value)}
                    placeholder="WebDAV 账号"
                    autoComplete="username"
                  />
                </Field>

                <Field id="webdav-password" label="密码 / 应用密码">
                  <Input
                    id="webdav-password"
                    type="password"
                    value={syncConfig.password}
                    onChange={(e) => updateSyncConfig('password', e.target.value)}
                    placeholder="建议使用应用密码"
                    autoComplete="current-password"
                  />
                </Field>
              </div>

              <Field id="webdav-path" label="云端文件路径" hint="多设备使用相同路径">
                <Input
                  id="webdav-path"
                  value={syncConfig.remotePath}
                  onChange={(e) => updateSyncConfig('remotePath', e.target.value)}
                  placeholder="/personal-budget-app/budget-sync.json"
                />
              </Field>

              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <Button
                  variant="outline"
                  className="justify-center"
                  onClick={handleSaveSyncConfig}
                  disabled={!!syncing}
                >
                  <Save className="h-4 w-4" />
                  保存配置
                </Button>
                <Button
                  variant="outline"
                  className="justify-center"
                  onClick={handleTestConnection}
                  disabled={!!syncing}
                >
                  <ShieldCheck className="h-4 w-4" />
                  {syncing === 'test' ? '测试中…' : '测试连接'}
                </Button>
              </div>
            </div>

            <p className="settings-group-label mt-6">同步账本</p>
            <div className="settings-surface space-y-4 p-4 sm:p-5">
              <p className="text-xs text-muted-foreground">上传或下载会覆盖对应端账本</p>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                <Button
                  className="justify-center"
                  onClick={handleSmartSync}
                  disabled={!!syncing}
                >
                  <RefreshCw className="h-4 w-4" />
                  {syncing === 'smart' ? '同步中…' : '智能同步'}
                </Button>
                <Button
                  variant="outline"
                  className="justify-center"
                  onClick={handleUploadToCloud}
                  disabled={!!syncing}
                >
                  <IconUpload className="h-4 w-4" />
                  {syncing === 'upload' ? '上传中…' : '上传本机'}
                </Button>
                <Button
                  variant="outline"
                  className="justify-center"
                  onClick={handleDownloadFromCloud}
                  disabled={!!syncing}
                >
                  <IconDownload className="h-4 w-4" />
                  {syncing === 'download' ? '下载中…' : '下载云端'}
                </Button>
              </div>

              <dl className="grid gap-x-6 gap-y-3 border-t border-border/50 pt-4 text-xs sm:grid-cols-2">
                {[
                  ['上次同步', formatSyncTime(syncMeta.lastSyncAt)],
                  ['本机修改', formatSyncTime(syncMeta.lastLocalChangeAt)],
                  ['云端版本', formatSyncTime(syncMeta.lastRemoteUpdatedAt)],
                  ['最近结果', syncResultLabel(syncMeta.lastResult)],
                ].map(([label, value]) => <div key={label}><dt className="text-muted-foreground">{label}</dt><dd className="mt-1 break-words font-medium">{value}</dd></div>)}
              </dl>
            </div>

              <div className="mt-4 flex flex-col gap-3">
                <details className="text-xs leading-relaxed text-muted-foreground">
                  <summary className="w-fit cursor-pointer rounded-md py-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">同步说明</summary>
                  <p className="mt-2">
                  密码只保存在当前浏览器；同步请求会通过同源 /api/webdav 代理转发到 WebDAV。
                  上传或下载覆盖数据前需要输入一次性确认码（安全同步确认）。
                  本地开发服务器已内置代理，正式部署时也需要提供同名接口。
                  </p>
                </details>
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-fit justify-start text-muted-foreground hover:text-destructive"
                  onClick={handleClearSyncConfig}
                  disabled={!!syncing}
                >
                  <Unplug className="h-4 w-4" />
                  清除配置
                </Button>
              </div>
          </Card>
          </MobileCollapsibleSection>

          <MobileCollapsibleSection
            title="其他操作"
            alwaysOpen={embedded}
            className={cn(embedded && activeSection !== 'other' && 'hidden')}
          >
            <Card padding={false} className="settings-section">
              <SectionTitle title="其他操作" />
              <div className="settings-surface divide-y divide-border/50">
                <SettingActionRow
                  icon={<IconHelp className="h-4 w-4" />}
                  title="使用向导"
                  onClick={openOnboardingGuide}
                />
                <SettingActionRow
                  icon={<IconSettings className="h-4 w-4" />}
                  title="载入示例数据"
                  description="替换当前账本，建议先备份"
                  onClick={handleLoadSample}
                />
              </div>

              <div className="mt-5">
                <p className="mb-2 px-1 text-xs font-medium text-destructive">
                  危险操作
                </p>
                <div className="overflow-hidden rounded-2xl border border-destructive/25 bg-destructive/[0.025]">
                <SettingActionRow
                  icon={<IconTrash className="h-4 w-4" />}
                  title="清空所有数据"
                  description="不可恢复，偏好设置保留"
                  onClick={handleClear}
                  danger
                />
                </div>
              </div>
            </Card>
          </MobileCollapsibleSection>

          <Card
            className={cn(
              'settings-note border-0 bg-transparent p-1 shadow-none',
              embedded && activeSection !== 'other' && 'hidden',
            )}
          >
            <p className="text-xs leading-relaxed text-muted-foreground">
              数据保存在当前浏览器，请定期备份。
            </p>
          </Card>
        </div>
      </div>
    </>
  );
}
