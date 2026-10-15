// 多账号解析模块(支持单账号兼容、多行/逗号分隔、带备注名称、以及 JSON 格式)

/**
 * 隐藏 API Key 中间部分用于日志安全打印
 * 如 dp_live_1234567890abcdef -> dp_li...cdef
 */
export function maskKey(key) {
  if (!key || typeof key !== 'string') return '***';
  if (key.length <= 10) return key.slice(0, 3) + '***';
  return `${key.slice(0, 5)}...${key.slice(-4)}`;
}

/**
 * 解析多账号列表
 * 支持来源优先级：
 * 1. DIGITALPLAT_ACCOUNTS (JSON 格式: [{"name":"xxx","apiKey":"dp_..."}, ...] 或 {"名称":"dp_..."})
 * 2. DIGITALPLAT_API_KEYS (多行、逗号、分号分隔，支持 "名称:dp_..." 或纯 "dp_...")
 * 3. DIGITALPLAT_API_KEY (单行或多行兼容)
 * 4. DIGITALPLAT_API_KEY_1, DIGITALPLAT_API_KEY_2... 环境变量
 */
export function getAccounts() {
  const list = [];
  const seenKeys = new Set();

  function addAccount(rawName, rawKey) {
    if (!rawKey || typeof rawKey !== 'string') return;
    const key = rawKey.trim();
    if (!key.startsWith('dp_')) return;
    if (seenKeys.has(key)) return;
    seenKeys.add(key);
    list.push({
      name: (rawName && String(rawName).trim()) || '',
      apiKey: key,
    });
  }

  // 1. 尝试解析 DIGITALPLAT_ACCOUNTS (JSON)
  if (process.env.DIGITALPLAT_ACCOUNTS) {
    try {
      const parsed = JSON.parse(process.env.DIGITALPLAT_ACCOUNTS);
      if (Array.isArray(parsed)) {
        for (const item of parsed) {
          if (typeof item === 'string') {
            parseLine(item, addAccount);
          } else if (item && typeof item === 'object') {
            const key = item.apiKey || item.api_key || item.key;
            const name = item.name || item.label || item.account || item.title;
            addAccount(name, key);
          }
        }
      } else if (parsed && typeof parsed === 'object') {
        for (const [name, key] of Object.entries(parsed)) {
          if (typeof key === 'string') {
            addAccount(name, key);
          } else if (key && typeof key === 'object') {
            addAccount(name, key.apiKey || key.api_key || key.key);
          }
        }
      }
    } catch (e) {
      console.warn(`[accounts] 解析 DIGITALPLAT_ACCOUNTS JSON 失败: ${e.message}，将尝试按普通文本解析`);
      parseText(process.env.DIGITALPLAT_ACCOUNTS, addAccount);
    }
  }

  // 2. 尝试解析 DIGITALPLAT_API_KEYS
  if (process.env.DIGITALPLAT_API_KEYS) {
    parseText(process.env.DIGITALPLAT_API_KEYS, addAccount);
  }

  // 3. 尝试解析 DIGITALPLAT_API_KEY
  if (process.env.DIGITALPLAT_API_KEY) {
    parseText(process.env.DIGITALPLAT_API_KEY, addAccount);
  }

  // 4. 尝试解析 DIGITALPLAT_API_KEY_xxx 前缀环境变量
  for (const [envKey, envVal] of Object.entries(process.env)) {
    const m = /^DIGITALPLAT_API_KEY_(.+)$/i.exec(envKey);
    if (m && envVal) {
      addAccount(m[1].toLowerCase(), envVal);
    }
  }

  // 为没有自定义名称的账号分配默认名称
  return list.map((acc, index) => {
    let name = acc.name;
    if (!name) {
      name = list.length === 1 ? '默认账号' : `账号 ${index + 1} (${maskKey(acc.apiKey)})`;
    }
    return {
      name,
      apiKey: acc.apiKey,
    };
  });
}

function parseText(text, addAccount) {
  if (!text || typeof text !== 'string') return;
  const lines = text.split(/[\r\n,;]+/);
  for (const line of lines) {
    parseLine(line, addAccount);
  }
}

function parseLine(line, addAccount) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) return;

  // 匹配形如 "主号:dp_live_xxx" 或 "主号=dp_live_xxx" 或 "主号#dp_live_xxx"
  const match = /^([^:=#]+)[:=#](dp_[a-zA-Z0-9_\-]+)$/.exec(trimmed);
  if (match) {
    addAccount(match[1].trim(), match[2].trim());
  } else if (trimmed.startsWith('dp_')) {
    // 纯 API key
    addAccount('', trimmed);
  }
}
