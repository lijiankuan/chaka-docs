import { readFile, writeFile, mkdir, rm, cp, stat } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
const output = path.join(root, '_site');
const release = process.argv.includes('--release');
// Remove only this build's output so any validation failure leaves no stale site.
await rm(output, { recursive: true, force: true });
const config = JSON.parse(await readFile(path.join(root, 'release.json'), 'utf8'));
// Optional product site is exported from the private product workspace. Only
// its reviewed static files are copied; policy pages retain the no-script guard.
const landingFlag = process.argv.indexOf('--landing');
if (release && landingFlag !== -1) throw new Error('--landing is a local review option only');
const landing = landingFlag === -1 ? path.join(root, 'static/app') : path.resolve(process.argv[landingFlag + 1]);
const landingExists = await stat(landing).then(s => s.isDirectory()).catch(error => { if (error.code === 'ENOENT') return false; throw error; });
if (landingFlag !== -1 && !landingExists) throw new Error('Landing export directory not found');
let product = null;
if (landingExists) {
  product = JSON.parse(await readFile(path.join(landing, 'release.json'), 'utf8'));
  if (product.schemaVersion !== 1 || typeof product.preview !== 'boolean') throw new Error('Invalid product site metadata');
  if (release && product.preview) throw new Error('Local preview cannot be published');
  for (const [kind, suffix] of [['installer', '.zip'], ['dmg', '.dmg']]) {
    const asset = product.assets?.[kind];
    if (!asset || !/^[a-f0-9]{64}$/.test(asset.sha256) || !/^Chaka-[A-Za-z0-9.-]+\.(zip|dmg)$/.test(asset.filename ?? '') || !asset.filename.endsWith(suffix) || !(asset.bytes > 0)) throw new Error('Invalid product download metadata');
    if (!product.preview) {
      const url = new URL(asset.url);
      const prefix = '/lijiankuan/chaka-docs/releases/download/';
      if (url.origin !== 'https://github.com' || url.username || url.password || url.search || url.hash || !url.pathname.startsWith(prefix)
        || !/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(url.pathname.slice(prefix.length).split('/')[0])
        || url.pathname.slice(prefix.length).split('/')[0] === 'latest' || url.pathname.slice(prefix.length).split('/').length !== 2 || url.pathname.split('/').at(-1) !== asset.filename) throw new Error('Expected a versioned GitHub Release attachment');
    } else if (asset.url !== `/downloads/${asset.filename}`) throw new Error('Unexpected preview download URL');
  }
}
const escape = (value) => String(value).replace(/[&<>"']/g, (char) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
}[char]));
const missing = [];
const date = config.effectiveDate;
const validDate = typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date)
  && Number.isFinite(Date.parse(date)) && new Date(date).toISOString().slice(0, 10) === date;
if (!validDate) {
  missing.push('effectiveDate: confirmed, valid YYYY-MM-DD date');
}
for (const field of ['operationsDisclosure', 'supportRetention']) {
  if (typeof config[field] !== 'string' || !config[field].trim()
    || /待确认|待补|TODO|TBD|placeholder/i.test(config[field])) missing.push(`${field}: confirmed public wording`);
}
if (config.limitedUseConfirmed !== true) missing.push('limitedUseConfirmed: publisher confirmation');
for (const field of ['storeUrl', 'downloadUrl']) {
  if (config[field] == null) continue;
  const url = new URL(config[field]);
  if (url.protocol !== 'https:' || url.username || url.password
    || /^(localhost|127\.|\[::1\])/.test(url.hostname)) throw new Error(`${field}: public HTTPS URL required`);
  if (field === 'storeUrl' && (url.hostname !== 'chromewebstore.google.com' || !url.pathname.startsWith('/detail/'))) {
    throw new Error('storeUrl: Chrome Web Store detail URL required');
  }
}
if ((config.downloadUrl || config.storeUrl) && !(typeof config.releaseDetails === 'string' && config.releaseDetails.trim())) {
  missing.push('releaseDetails: verified platform, Chaka desktop app and compatible Codex versions');
}
if (release && missing.length) {
  console.error(`Release blocked; no site generated:\n- ${missing.join('\n- ')}`);
  process.exit(1);
}
const pending = (text) => `<p class="review-note"><strong>发布前待确认：</strong>${escape(text)}</p>`;
const links = [
  config.storeUrl ? `<li><a href="${escape(config.storeUrl)}">在 Chrome Web Store 安装 Chaka 浏览器扩展</a></li>` : '<li>Chrome Web Store 正式入口尚未公开。</li>',
  config.downloadUrl ? `<li><a href="${escape(config.downloadUrl)}">下载 Chaka 桌面端（macOS）</a></li>` : (product ? '' : '<li>Chaka 桌面端正式安装包地址尚未公开。</li>'),
];
if (product) links.push(`<li><a href="./app/">Chaka 产品首页</a> · <a href="${escape(product.assets.installer.url)}">下载 Installer（ZIP）</a> · <a href="${escape(product.assets.dmg.url)}">DMG 备用下载</a></li>`);
const replacements = {
  LANDING_LINK: product ? '<a href="./app/">产品首页</a>' : '',
  REVIEW_META: release ? '' : '<meta name="robots" content="noindex, nofollow">',
  REVIEW_BANNER: release ? '' : '<div class="review-banner"><strong>本地审阅稿 · 尚未发布</strong><span>发布确认尚未完成；此页面不是已生效的公开政策。</span></div>',
  POLICY_DATE: validDate ? `生效日期：${escape(date)}` : '生效日期尚未确定 · 建议采用正式公开日',
  OPERATIONS: config.operationsDisclosure ? `<p>${escape(config.operationsDisclosure)}</p>` : pending('是否存在额外下载日志、诊断、遥测、崩溃分析或客服服务，以及各自的接收方、用途、数据类别和保留规则。源码核查不能替代运营事实。'),
  SUPPORT_RETENTION: config.supportRetention ? `<p>${escape(config.supportRetention)}</p>` : pending('运营方对支持邮件及附件的保留、删除规则。当前不承诺未经确认的保存天数或回复时限。'),
  LIMITED_USE_REVIEW: release ? '' : pending('下列为拟发布的 Limited Use 承诺，发布者须确认实际运营和所支持的服务配置与承诺一致。该声明不代表平台已完成审核。'),
  HOSTING_VERB: release ? '通过' : '拟通过',
  RELEASE_LINKS: `<ul>${links.join('')}</ul>${config.releaseDetails ? `<p>${escape(config.releaseDetails)}</p>` : '<p>支持的 macOS 版本、芯片架构及兼容的 Codex 版本将随正式安装包说明公布。</p>'}`,
};
const files = ['index.html', 'privacy.html', 'styles.css'];
await mkdir(output, { recursive: true });
for (const file of files) {
  let content = await readFile(path.join(root, 'src', file), 'utf8');
  content = content.replace(/\{\{([A-Z_]+)\}\}/g, (_, key) => {
    if (!(key in replacements)) throw new Error(`Unknown template field: ${key}`);
    return replacements[key];
  });
  if (/<script\b|<iframe\b|<form\b|@import|https?:\/\/[^\s"')]+\.(?:css|js|woff2?)\b/i.test(content)) {
    throw new Error(`Unexpected executable or remote resource in ${file}`);
  }
  if (/\/Users\/|\/private\/tmp\/|github_pat_|gh[pousr]_[A-Za-z0-9]{20}|-----BEGIN .*PRIVATE KEY/.test(content)) {
    throw new Error(`Unexpected private material in ${file}`);
  }
  await writeFile(path.join(output, file), content);
}
if (product) await cp(landing, path.join(output, 'app'), { recursive: true });
await writeFile(path.join(output, '.nojekyll'), '');
console.log(`${release ? 'Release' : 'Review'} build: ${files.length + 1} files in _site/`);
if (!release) console.log(`Unresolved release fields: ${missing.length}`);
