# 🛡️ DigitalPlat 域名自动续期 (多账号版)

**自动检查 DigitalPlat 免费域名 (`*.dpdns.org`)，支持单账号与多账号同时巡检，在到期前 120 天内自动免费续期一年 — 全程零费用、零人工。**

[![GitHub Actions](https://github.com/wantaiyu/dashboard/actions/workflows/renew.yml/badge.svg)](https://github.com/wantaiyu/dashboard/actions/workflows/renew.yml)
[![Node.js](https://img.shields.io/badge/Node.js-18%2B-339933?logo=node.js&logoColor=white)](https://nodejs.org)

---

## ✨ 核心特性

- 👥 **支持多账号同时巡检** — 支持单账号或配置多个 API Key 依次轮询检查与续期，各账号独立汇总输出。
- 🏷️ **支持账号别名/备注** — 可为每个 Key 指定易记名称（如 `主号:dp_live_xxx`），表格与日志一目了然。
- ⏰ **定时自动化巡检** — GitHub Actions 默认每周自动运行，也可随时在控制台一键手动触发。
- 🎁 **自动免费续期** — 到期前 **120 天** 进入续期窗口，自动申请免费续期 **+1 年**，不消耗积分。
- 📊 **可视化统计报表** — 运行完成后在 GitHub Actions 运行页 **Summary** 直观展现各账号表格与续期状态。
- 📧 **异常邮件告警** — 任一账号任一域名续期失败时返回退出码 1，触发 GitHub Actions 邮件提醒。
- ⚡ **零第三方依赖** — 原生 Node.js 18+ 代码，无需 `npm install`。

---

## 🚀 快速上手 (GitHub Actions)

### 第 1 步：获取 DigitalPlat API Key
1. 登录 [DigitalPlat Dashboard](https://dashboard.digitalplat.org) → **API Keys** (`/dashboard/api/keys`)。
2. 创建 API Key，并授予 **Domains (域名)** 相关读写权限。
3. 复制生成的 API Key（格式为 `dp_live_...`）。若有多个账号，请分别登录获取。

### 第 2 步：配置 GitHub Secrets
在你的 GitHub 仓库中，进入 **Settings → Secrets and variables → Actions**，新建或编辑 Secret：

- **名称**：`DIGITALPLAT_API_KEY`（或 `DIGITALPLAT_API_KEYS`）
- **内容示例**：

#### 场景 A：单账号
```text
dp_live_xxxxxxxxxxxxxxxxxxxxxxxx
```

#### 场景 B：多账号（直接换行粘贴，支持备注名称）
```text
个人主号:dp_live_111111111111111111111111
备用小号:dp_live_222222222222222222222222
测试账号:dp_live_333333333333333333333333
```
> 💡 格式支持 `备注名:Key`、`备注名=Key` 或直接填写 `Key`（不带备注会自动命名为 `账号 1`、`账号 2`）。多账号之间也支持英文逗号 `,` 分隔。

### 第 3 步：手动验证
进入仓库的 **Actions → digitalplat-renew → Run workflow**，点击运行：
- 打开对应的运行记录，点击 **Summary** 标签页，即可看到按账号分组的域名检查表格与续期明细。

---

## 🖥️ 本地运行

在本地需安装 Node.js 18 或更高版本：

```powershell
# PowerShell - 单账号
$env:DIGITALPLAT_API_KEY = "dp_live_xxx"
node scripts/renew.mjs --dry-run      # 预览模式(不真实发起续期)
node scripts/renew.mjs                # 真实续期

# PowerShell - 多账号 (换行形式)
$env:DIGITALPLAT_API_KEYS = "主号:dp_live_111`n小号:dp_live_222"
node scripts/list-domains.mjs         # 查看全部账号域名表格
node scripts/renew.mjs --dry-run      # 预览检查
```

```bash
# Linux / macOS - 多账号
export DIGITALPLAT_API_KEYS="主号:dp_live_111,小号:dp_live_222"
node scripts/list-domains.mjs
node scripts/renew.mjs --dry-run
```

---

## ⚙️ 环境变量配置项

| 配置项 | 默认值 | 说明 |
| :--- | :--- | :--- |
| `DIGITALPLAT_API_KEY` / `DIGITALPLAT_API_KEYS` | 空 | 单个或多个 API Key（换行/逗号分隔，支持备注名） |
| `DIGITALPLAT_ACCOUNTS` | 空 | JSON 格式账号列表（`[{"name":"..","apiKey":".."}]`） |
| `RENEW_THRESHOLD_DAYS` | `120` | 续期窗口天数（到期前多少天触发续期） |
| `RENEW_YEARS` | `1` | 每次续期年数 |
| `RENEW_PAYMENT_FREE` | `free` | 免费域名的续期支付方式 |
| `RENEW_PAYMENT_PAID` | `credits` | 非免费域名的续期支付方式 |
| `RENEW_DELAY_MS` | `300` | 每个域名及账号操作间隔毫秒数 |
| `DRY_RUN` | `false` | 是否只预览不发起真实续期请求（也可加命令行参数 `--dry-run`） |
| `DIGITALPLAT_BASE_URL` | `https://domain-api.digitalplat.org/api/v1` | 官方 API 端点地址 |

---

## 📁 项目结构

```text
.
├── .github/workflows/renew.yml   # GitHub Actions 定时任务工作流
├── scripts/
│   ├── accounts.mjs              # 多账号解析与脱敏模块
│   ├── renew.mjs                 # 主脚本: 多账号巡检 + 自动续期
│   └── list-domains.mjs          # 辅助: 只打印各账号域名状态表格
├── .env.example                  # 环境变量配置示例模板
└── README.md
```

---

## 📄 License

[MIT](LICENSE)
