import assert from 'node:assert/strict';
import { readFile, mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createServer } from 'vite';
import { zipSync, strToU8 } from 'fflate';
import { readSheet } from 'read-excel-file/node';

// 测试只使用内存存储，绝不读取开发浏览器里的真实账本。
const storage = new Map();
let failKey = '';
const localStorage = {
  getItem: (key) => storage.get(key) ?? null,
  setItem: (key, value) => { if (key === failKey) throw new Error('quota'); storage.set(key, value); },
  removeItem: (key) => storage.delete(key),
};
globalThis.localStorage = localStorage;
globalThis.window = { localStorage };
const server = await createServer({ server: { middlewareMode: true }, appType: 'custom' });
try {
  const { parseBillRows, parseBillCsv, decodeBillText, partitionBillEntries, readBillFile } = await server.ssrLoadModule('/src/lib/billImport.ts');
  const { csvCell } = await server.ssrLoadModule('/src/lib/format.ts');
  assert.equal(csvCell('=1+1'), "'=1+1");
  assert.equal(csvCell('\t@SUM(1)'), "'\t@SUM(1)");
  assert.equal(csvCell('a\rb'), '"a\rb"');
  const csv = await readFile(new URL('./fixtures/alipay.csv', import.meta.url), 'utf8');
  const alipay = parseBillRows(parseBillCsv(csv));
  assert.equal(alipay.source, 'alipay');
  assert.equal(alipay.entries.length, 3);
  assert.equal(alipay.skipped.length, 3);
  assert.equal(alipay.entries[0].transaction.amount, 25.5);
  assert.equal(alipay.entries[0].transaction.category, '餐饮');
  assert.match(alipay.entries[0].transaction.note, /套餐,不加辣/);
  assert.equal(alipay.entries[1].transaction.amount, 12000);
  assert.match(alipay.entries[0].transaction.importKey, /202610200000000000001$/);
  const batch = partitionBillEntries(alipay.entries, []);
  assert.equal(batch.fresh.length, 2);
  assert.equal(batch.duplicates.length, 1);
  assert.equal(partitionBillEntries(alipay.entries, batch.fresh.map((entry) => entry.transaction)).fresh.length, 0);
  assert.equal(partitionBillEntries(alipay.entries, [{ ...alipay.entries[0].transaction, amount: 30, note: '已手动修改' }]).duplicates.length, 2);

  const wechatHeader = ['交易时间', '交易类型', '交易对方', '商品', '收/支', '金额(元)', '支付方式', '当前状态', '交易单号', '商户单号', '备注'];
  const wechatRows = [
    ['微信支付账单明细列表'], wechatHeader,
    ['2026-10-20 08:00:00', '商户消费', '示例地铁', '地铁车票', '支出', '¥3.00', '零钱', '支付成功', '42000000000000000001', '/', '/'],
    ['2026-10-20 09:00:00', '微信红包', '示例好友', '/', '收入', '￥8.88', '/', '已存入零钱', '42000000000000000002', '/', '/'],
    ['2026-10-21 08:00:00', '商户消费', '示例餐厅', '早餐', '支出', '12.00', '/', '已全额退款', '42000000000000000003', '/', '/'],
  ];
  const wechat = parseBillRows(wechatRows);
  assert.equal(wechat.source, 'wechat');
  assert.equal(wechat.entries.length, 2);
  assert.equal(wechat.entries[0].transaction.category, '交通');
  assert.equal(wechat.entries[1].transaction.amount, 8.88);
  assert.equal(wechat.skipped.length, 1);
  assert.match(parseBillRows([[...wechatHeader, '成功退款（元）'], [...wechatRows[2], '1.00']]).skipped[0].reason, /退款/);
  const tabText = wechatRows.map((row) => row.join('\t')).join('\r\n');
  assert.equal(parseBillRows(parseBillCsv(tabText)).entries.length, 2);
  assert.equal(parseBillCsv('a,"b\nc","say ""hi"""')[0][1], 'b\nc');
  assert.throws(() => parseBillCsv('a,"broken'), /引号/);
  assert.throws(() => parseBillRows([['not a bill']]), /表头/);
  assert.throws(() => parseBillRows(Array.from({ length: 20201 }, () => [])), /20,000/);
  const utf8 = new TextEncoder().encode(csv);
  assert.equal(parseBillRows(parseBillCsv(decodeBillText(utf8.buffer))).entries.length, 3);
  assert.equal(decodeBillText(new Uint8Array([0xd6, 0xa7, 0xb8, 0xb6, 0xb1, 0xa6]).buffer), '支付宝');
  assert.equal(decodeBillText(new Uint8Array([0xff, 0xfe, 0x2d, 0x4e]).buffer), '中');
  const invalid = ['2026-02-30 09:00:00', '商户消费', '示例', '早餐', '支出', '12.00', '/', '支付成功', 'invalid'];
  assert.match(parseBillRows([wechatHeader, invalid]).skipped[0].reason, /日期/);
  assert.match(parseBillRows([wechatHeader, [...invalid.slice(0, 5), '12,34', ...invalid.slice(6)].map((value, index) => index === 0 ? '2026-10-20' : value)]).skipped[0].reason, /金额/);
  assert.match(parseBillRows([wechatHeader, wechatRows[2].map((value, index) => index === 8 ? '4.200001E+19' : value)]).skipped[0].reason, /科学计数/);
  const noId = wechatRows[2].map((value, index) => index === 8 ? '' : value);
  const fallback = parseBillRows([wechatHeader, noId, noId]);
  assert.equal(partitionBillEntries(fallback.entries, []).fresh.length, 1);
  const excelDate = parseBillRows([wechatHeader, wechatRows[2].map((value, index) => index === 0 ? new Date('2026-10-20T00:00:00Z') : value)]);
  assert.equal(excelDate.entries[0].transaction.date, '2026-10-20');
  await assert.rejects(readBillFile(new File(['dummy'], 'bill.zip')), /CSV|XLSX/);
  await assert.rejects(readBillFile({ name: 'bill.csv', size: 11 * 1024 * 1024 }), /10 MB/);

  // 最小真实 XLSX，交易单号故意用数字单元格验证精度。
  const fixtureDir = await mkdtemp(join(tmpdir(), 'pennypeek-bill-test-'));
  const escape = (value) => String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
  const sheet = wechatRows.map((row, i) => `<row r="${i + 1}">${row.map((value, j) => {
    const address = `${String.fromCharCode(65 + j)}${i + 1}`;
    return j === 8 && i > 1 ? `<c r="${address}"><v>${value}</v></c>` : `<c r="${address}" t="inlineStr"><is><t>${escape(value)}</t></is></c>`;
  }).join('')}</row>`).join('');
  const files = {
    '[Content_Types].xml': '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/></Types>',
    '_rels/.rels': '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>',
    'xl/workbook.xml': '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="微信账单" sheetId="1" r:id="rId1"/></sheets></workbook>',
    'xl/_rels/workbook.xml.rels': '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/></Relationships>',
    'xl/worksheets/sheet1.xml': `<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>${sheet}</sheetData></worksheet>`,
  };
  const xlsx = zipSync(Object.fromEntries(Object.entries(files).map(([name, text]) => [name, strToU8(text)])));
  const xlsxPath = join(fixtureDir, 'wechat-demo.xlsx');
  await writeFile(xlsxPath, xlsx);
  const excel = parseBillRows(await readSheet(xlsxPath, { parseNumber: (value) => value }));
  assert.equal(excel.entries.length, 2);
  assert.equal(excel.entries[0].transaction.importKey, 'wechat:order:42000000000000000001');

  const { useStore } = await server.ssrLoadModule('/src/store/useStore.ts');
  const store = useStore.getState();
  const count = store.transactions.length;
  const imported = store.importTransactions(alipay.entries.map((entry) => entry.transaction));
  assert.deepEqual(imported, { added: 2, duplicates: 1 });
  assert.equal(useStore.getState().transactions.length, count + 2);
  assert.deepEqual(store.importTransactions(alipay.entries.map((entry) => entry.transaction)), { added: 0, duplicates: 3 });
  assert.match(storage.get('personal-budget-app:v1'), /alipay:order:/);
  const beforeFailure = useStore.getState().transactions;
  failKey = 'personal-budget-app:v1';
  assert.throws(() => store.importTransactions(wechat.entries.map((entry) => entry.transaction)), /未导入/);
  assert.equal(useStore.getState().transactions, beforeFailure);
  failKey = 'personal-budget-app:webdav-meta:v1';
  assert.throws(() => store.importTransactions(wechat.entries.map((entry) => entry.transaction)), /未导入/);
  assert.equal(useStore.getState().transactions, beforeFailure);
  failKey = '';
  store.updateSettings({ currency: 'USD' });
  assert.throws(() => store.importTransactions(wechat.entries.map((entry) => entry.transaction)), /CNY/);
  console.log('PASS: CSV/GBK/XLSX, long IDs, invalid rows, refunds, deduplication, bulk append and storage rollback');
  console.log(`Synthetic XLSX for browser QA: ${xlsxPath}`);
} finally {
  await server.close();
}
