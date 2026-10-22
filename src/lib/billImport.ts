import type { Transaction } from '../types/index';

export type BillSource = 'alipay' | 'wechat';
export type ImportedTransaction = Omit<Transaction, 'id' | 'createdAt'> & {
  importSource: BillSource;
  importKey: string;
};
export type BillEntry = { row: number; transaction: ImportedTransaction };
export type BillIssue = { row: number; reason: string };
export type BillPreview = { source: BillSource; entries: BillEntry[]; skipped: BillIssue[] };
export const BILL_ROW_LIMIT = 20000;
const MAX_FILE_SIZE = 10 * 1024 * 1024;

function cell(value: unknown): string {
  return String(value ?? '').replace(/^\uFEFF/, '').trim();
}

function header(value: unknown): string {
  return cell(value).normalize('NFKC').replace(/\s/g, '');
}

/** CSV 引号内的逗号、换行和双引号都属于单元格内容。 */
export function parseBillCsv(text: string): string[][] {
  const firstLine = text.split(/\r?\n/).find((line) => /交易时间|交易创建时间/.test(line) && /金额/.test(line)) ?? '';
  const separator = firstLine.includes('\t') && !firstLine.includes(',') ? '\t' : ',';
  const rows: string[][] = [];
  let row: string[] = [];
  let value = '';
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const character = text[i];
    if (character === '"') {
      if (quoted && text[i + 1] === '"') { value += '"'; i++; }
      else if (quoted || !value.trim()) quoted = !quoted;
      else value += character;
    } else if (!quoted && (character === separator || character === '\n' || character === '\r')) {
      row.push(value);
      value = '';
      if (character !== separator) {
        rows.push(row);
        row = [];
        if (character === '\r' && text[i + 1] === '\n') i++;
        if (rows.length > BILL_ROW_LIMIT + 200) throw new Error('账单超过 20,000 行，请分时间段导出。');
      }
    } else value += character;
  }
  if (quoted) throw new Error('CSV 引号没有闭合，请使用平台导出的原始账单文件。');
  if (value || row.length) rows.push([...row, value]);
  return rows;
}

export function decodeBillText(bytes: ArrayBuffer): string {
  const prefix = new Uint8Array(bytes, 0, Math.min(2, bytes.byteLength));
  if (prefix[0] === 255 && prefix[1] === 254) return new TextDecoder('utf-16le').decode(bytes);
  if (prefix[0] === 254 && prefix[1] === 255) return new TextDecoder('utf-16be').decode(bytes);
  try { return new TextDecoder('utf-8', { fatal: true }).decode(bytes); }
  catch { return new TextDecoder('gb18030').decode(bytes); }
}

function dateAndTime(value: unknown): { date: string; time: string } | undefined {
  // Excel 日期按单元格中的日历日期读取，避免本地时区使日期提前一天。
  if (value instanceof Date && !Number.isFinite(value.getTime())) return undefined;
  const text = value instanceof Date ? value.toISOString().slice(0, 19).replace('T', ' ') : cell(value);
  const match = text.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})(?:[ T](\d{1,2}):(\d{2})(?::(\d{2}))?)?$/);
  if (!match) return undefined;
  const [, y, m, d, hh = '00', mm = '00', ss = '00'] = match;
  const parsed = new Date(Date.UTC(+y, +m - 1, +d));
  if (+y < 1900 || +y > 2100 || parsed.getUTCMonth() !== +m - 1 || parsed.getUTCDate() !== +d || +hh > 23 || +mm > 59 || +ss > 59) return undefined;
  const date = `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  return { date, time: `${date} ${hh.padStart(2, '0')}:${mm}:${ss}` };
}

function amountInCents(value: unknown): number | undefined {
  const text = cell(value).replace(/^(?:[¥￥]|CNY)\s*/, '').replace(/元$/, '').trim();
  if (!/^\+?(?:\d+|\d{1,3}(?:,\d{3})+)(?:\.\d{1,2})?$/.test(text)) return undefined;
  const [whole, fraction = ''] = text.replace(/[,\+]/g, '').split('.');
  const cents = Number(whole) * 100 + Number(fraction.padEnd(2, '0'));
  return Number.isSafeInteger(cents) && cents > 0 && cents <= 99999999999 ? cents : undefined;
}

function suggestCategory(type: 'income' | 'expense', text: string): string {
  if (type === 'income') {
    if (/工资|薪资|薪酬/.test(text)) return '工资';
    if (/奖金|年终奖/.test(text)) return '奖金';
    if (/利息|收益|分红/.test(text)) return '投资收益';
    return '其他收入';
  }
  const rules: [RegExp, string][] = [
    [/餐饮|餐厅|外卖|食堂|咖啡|奶茶|早餐|午餐|晚餐|美食/, '餐饮'],
    [/超市|便利店|日用|百货|商超/, '超市/日用品'],
    [/交通|地铁|公交|打车|滴滴|加油|停车|出行/, '交通'],
    [/服饰|服装|鞋靴|衣服/, '服装'], [/医疗|医院|药房|药店|挂号/, '医疗'],
    [/房租|房贷|租金|物业/, '房租/房贷'], [/水费|电费|燃气|话费|宽带|通信/, '水电煤网'],
    [/订阅|会员|月付服务/, '订阅服务'], [/电影|游戏|娱乐/, '娱乐'],
    [/酒店|机票|火车票|旅游|旅行/, '旅行'], [/学费|培训|课程|教育|书籍/, '学习'],
    [/宠物|猫粮|狗粮/, '宠物'], [/红包|礼物|礼金|人情/, '人情往来'],
  ];
  return rules.find(([pattern]) => pattern.test(text))?.[1] ?? '其他支出';
}

export function parseBillRows(rows: unknown[][]): BillPreview {
  if (rows.length > BILL_ROW_LIMIT + 200) throw new Error('账单超过 20,000 行，请分时间段导出。');
  const aliases = {
    date: ['交易时间', '交易创建时间', '付款时间', '记账时间'],
    direction: ['收/支', '收/支出', '收支', '收支类型'],
    amount: ['金额', '金额(元)', '交易金额', '交易金额(元)'],
    status: ['交易状态', '当前状态', '状态'],
    id: ['交易订单号', '交易单号', '交易号', '支付宝交易号', '微信支付订单号'],
    counterparty: ['交易对方', '交易对手'],
    product: ['商品说明', '商品', '商品名称'],
    category: ['交易分类', '交易类型'],
    method: ['收/付款方式', '支付方式', '付款方式'],
    note: ['备注'],
    refund: ['成功退款(元)', '退款金额', '退款金额(元)'],
  };
  const headerIndex = rows.findIndex((row) => {
    const names = row.map(header);
    return ['date', 'direction', 'amount', 'status'].every((key) => aliases[key as keyof typeof aliases].some((name) => names.includes(name)));
  });
  if (headerIndex < 0) throw new Error('未找到账单表头。请导入支付宝或微信的个人账单，需包含交易时间、收/支、金额和状态列。');
  const names = rows[headerIndex].map(header);
  const index = Object.fromEntries(Object.entries(aliases).map(([key, values]) => [key, names.findIndex((name) => values.includes(name))])) as Record<keyof typeof aliases, number>;
  const preamble = rows.slice(0, headerIndex).flat().map(cell).join(' ');
  const source: BillSource | undefined = /微信/.test(preamble) || names.includes('当前状态') ? 'wechat'
    : /支付宝/.test(preamble) || names.includes('交易订单号') || names.includes('支付宝交易号') || names.includes('对方账号') || names.includes('收/付款方式') ? 'alipay' : undefined;
  if (!source) throw new Error('无法识别账单平台，请保留原始文件的表头和说明行。');
  const entries: BillEntry[] = [];
  const skipped: BillIssue[] = [];
  for (let i = headerIndex + 1; i < rows.length; i++) {
    const row = rows[i];
    if (row.every((value) => !cell(value))) continue;
    const first = cell(row.find((value) => cell(value)));
    if (/^[-=]{3,}/.test(first)) break;
    const get = (key: keyof typeof aliases) => cell(row[index[key]]);
    if (header(row[index.date]) === names[index.date]) continue;
    const skip = (reason: string) => skipped.push({ row: i + 1, reason });
    const status = get('status');
    const category = get('category');
    const direction = get('direction');
    if (/退款|退还|退货/.test(status + category) || amountInCents(row[index.refund]) !== undefined) { skip('退款相关记录：请核对后手动处理'); continue; }
    if (/关闭|失败|撤销|取消|待|处理中|未支付|已退回|已拒收/.test(status)) { skip('未完成或已关闭的交易'); continue; }
    if (/充值|提现|信用卡还款|花呗还款|余额宝|理财|账户互转|信用借还/.test(category)) { skip('充值、提现或账户资金往来'); continue; }
    if (direction !== '收入' && direction !== '支出') { skip('不计收支的中性交易'); continue; }
    if (!/成功|已收款|已支付|已到账|已收钱|已付款|已完成|已转账|已存入|已转入/.test(status)) { skip('交易状态不明确，请核对'); continue; }
    const date = dateAndTime(row[index.date]);
    const cents = amountInCents(row[index.amount]);
    if (!date) { skip('日期或时间无效'); continue; }
    if (cents === undefined) { skip('金额无效、为零或超过支持范围'); continue; }
    const type = direction === '收入' ? 'income' : 'expense';
    const id = get('id').replace(/^[\t'`]+/, '').trim();
    if (/^\d(?:\.\d+)?e[+\-]?\d+$/i.test(id)) { skip('交易单号变成了科学计数，请使用原始导出文件'); continue; }
    const counterparty = get('counterparty');
    const product = get('product');
    const note = [counterparty, product, get('note')].filter((text) => text && text !== '/' && text !== '-');
    const method = get('method');
    if (method && method !== '/') note.push(`原支付方式：${method}`);
    const importKey = id ? `${source}:order:${id}` : `${source}:row:${JSON.stringify([date.time, type, cents, counterparty, product])}`;
    entries.push({ row: i + 1, transaction: {
      date: date.date, type, amount: cents / 100,
      category: suggestCategory(type, category + ' ' + counterparty + ' ' + product),
      paymentMethod: source === 'alipay' ? '支付宝' : '微信',
      note: note.join(' · ').slice(0, 1000), countInBudget: type === 'expense', isFixed: false,
      importSource: source, importKey,
    } });
  }
  return { source, entries, skipped };
}

/** 在预览与最终写入时均去重，包含同一文件里的重复交易。 */
export function partitionBillEntries(entries: BillEntry[], existing: Pick<Transaction, 'importKey'>[]) {
  const seen = new Set(existing.map((transaction) => transaction.importKey).filter(Boolean));
  const fresh: BillEntry[] = [];
  const duplicates: BillEntry[] = [];
  for (const entry of entries) {
    if (seen.has(entry.transaction.importKey)) duplicates.push(entry);
    else { seen.add(entry.transaction.importKey); fresh.push(entry); }
  }
  return { fresh, duplicates };
}

export async function readBillFile(file: File): Promise<BillPreview> {
  if (file.size > MAX_FILE_SIZE) throw new Error('文件超过 10 MB，请缩短账单导出的时间范围。');
  const extension = file.name.split('.').pop()?.toLowerCase();
  if (extension === 'csv' || extension === 'txt') return parseBillRows(parseBillCsv(decodeBillText(await file.arrayBuffer())));
  if (extension === 'xlsx') {
    const { readSheet } = await import('read-excel-file/browser');
    // 保留长交易单号的原始数字字符串，避免 JS 浮点数截断。
    const rows = await readSheet(file, { parseNumber: (value) => value }).catch(() => {
      throw new Error('无法读取 Excel。请使用平台原始导出的 XLSX 文件，确认文件未损坏且没有工作簿加密。');
    });
    return parseBillRows(rows);
  }
  throw new Error('请选择解压后的 CSV 或 XLSX 文件，不支持 ZIP、PDF 或旧版 XLS。');
}
