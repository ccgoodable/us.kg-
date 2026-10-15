#!/usr/bin/env node
// 辅助工具:打印所有账号下的域名检查表格(不修改任何数据)。
// 用法:
//   单账号:
//     PowerShell:  $env:DIGITALPLAT_API_KEY="dp_live_xxx"; node scripts/list-domains.mjs
//     Linux/macOS: DIGITALPLAT_API_KEY=dp_live_xxx node scripts/list-domains.mjs
//   多账号:
//     PowerShell:  $env:DIGITALPLAT_API_KEYS="主号:dp_live_1`n小号:dp_live_2"; node scripts/list-domains.mjs
//     Linux/macOS: DIGITALPLAT_API_KEYS="主号:dp_live_1,小号:dp_live_2" node scripts/list-domains.mjs
//   加 --json 参数可同时打印接口完整原始响应(排查用)。

import { getAccounts, maskKey } from './accounts.mjs';

const BASE_URL = process.env.DIGITALPLAT_BASE_URL || 'https://domain-api.digitalplat.org/api/v1';
const PRINT_JSON = process.argv.includes('--json');
const THRESHOLD_DAYS = Number.parseInt(process.env.RENEW_THRESHOLD_DAYS || '120', 10);

const accounts = getAccounts();
if (accounts.length === 0) {
  console.error('缺少有效的 DIGITALPLAT_API_KEY 或 DIGITALPLAT_API_KEYS(应以 dp_live_ 或 dp_test_ 开头)');
  console.error('示例: $env:DIGITALPLAT_API_KEY="dp_live_xxx"; node scripts/list-domains.mjs');
  process.exit(2);
}

function fmtTable(headers, rows) {
  const widths = headers.map((h, i) =>
    Math.max(String(h).length, ...rows.map((r) => String(r[i] ?? '').length))
  );
  const line = (cells) => '  ' + cells.map((c, i) => String(c ?? '').padEnd(widths[i])).join('  ');
  const sep = '  ' + widths.map((w) => '-'.repeat(w)).join('  ');
  return [line(headers), sep, ...rows.map((r) => line(r))].join('\n');
}

/** 计算到期日距今天的天数;支持 YYYY-MM-DD 或 ISO 时间戳 */
function daysUntil(expiry) {
  if (!expiry) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(expiry).trim());
  if (!m) return null;
  const exp = Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  const now = new Date();
  const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  return Math.round((exp - today) / 86400000);
}

console.log(`[list-domains] 已检测到 ${accounts.length} 个账号\n`);

let totalDomains = 0;

for (let i = 0; i < accounts.length; i++) {
  const acc = accounts[i];
  console.log(`============================================================`);
  console.log(`👤 账号 [${i + 1}/${accounts.length}]: ${acc.name} (${maskKey(acc.apiKey)})`);
  console.log(`============================================================`);

  let json = null;
  try {
    const r = await fetch(`${BASE_URL}/domains`, {
      headers: { Authorization: `Bearer ${acc.apiKey}`, Accept: 'application/json' },
      signal: AbortSignal.timeout(30_000),
    });
    const text = await r.text();
    if (!r.ok) {
      console.error(`HTTP ${r.status}: ${text.slice(0, 400)}\n`);
      continue;
    }
    json = JSON.parse(text);
  } catch (e) {
    console.error(`获取域名列表失败: ${e.message}\n`);
    continue;
  }

  if (PRINT_JSON) {
    console.log(`=== [${acc.name}] 完整原始响应 ===\n` + JSON.stringify(json, null, 2) + '\n');
  }

  let domains = [];
  if (Array.isArray(json?.data)) domains = json.data;
  else if (Array.isArray(json?.data?.domains)) domains = json.data.domains;
  else if (Array.isArray(json?.data?.items)) domains = json.data.items;

  totalDomains += domains.length;
  console.log(`共 ${domains.length} 个域名:\n`);

  if (domains.length === 0) {
    console.log('  (该账号下暂无域名)\n');
    continue;
  }

  const rows = domains.map((d) => {
    const name = d.domain ?? d.name ?? d.hostname ?? String(d.id ?? '?');
    const expiry = d.expires_at ?? d.expiry_date ?? '永久';
    const days = daysUntil(d.expires_at ?? d.expiry_date);
    const status = days === null ? '永久有效' : days <= THRESHOLD_DAYS ? '窗口内' : '窗口外';
    return [name, status, String(expiry).slice(0, 10), days === null ? '永久' : `${days}天`, d.auto_renew ? '是' : '否'];
  });

  console.log(fmtTable(['域名', '状态', '到期时间', '剩余天数', '自动续'], rows));
  console.log('');
}

console.log(`------------------------------------------------------------`);
console.log(`全部账号统计: 共 ${accounts.length} 个账号，${totalDomains} 个域名`);
console.log('说明: 状态=窗口内(到期前120天内,将自动申请免费续期) / 窗口外(暂无需续期) / 永久有效(接口无到期时间)');
