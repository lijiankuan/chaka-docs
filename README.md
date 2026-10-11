# Chaka 公开文档

支持与安装（`index.html`）和隐私政策（`privacy.html`）保持无浏览器脚本、第三方字体、统计或表单。可选的 `static/app/` 存放经审阅的 Chaka 产品页面构建产物，使用本地 JS、字体和既有展示素材；视频功能尚未开发，首发页面不展示视频能力或加载相应外部素材。不包含产品源码或桌面安装包。

## 本地审阅

使用 Node.js 24 或更新版本：

```sh
node scripts/build.mjs
python3 -m http.server 8080 --bind 127.0.0.1 --directory _site
```

打开 `http://127.0.0.1:8080/`。默认构建有醒目的审阅标识和 `noindex`，不是生效政策。修改 `src/` 内的 HTML/CSS 后重新构建。页面使用相对链接，可从根目录或 GitHub Pages 项目子路径访问，无需修改 base URL。

## 发布前填写

编辑 `release.json`，只填已经核实并由发布者确认的信息：

| 字段 | 说明 |
| --- | --- |
| `effectiveDate` | 真实生效日，`YYYY-MM-DD`；建议采用正式公开日，不能由构建时间推定 |
| `operationsDisclosure` | 可公开的完整运营数据说明：除页面已写明的 GitHub Pages、模型处理与 Outlook 支持邮件外，是否有下载日志、诊断、遥测、崩溃分析或客服供应商；列明接收方、数据、用途、保留/删除规则。确实没有时也须明确确认后填写 |
| `supportRetention` | 运营方如何保留和删除支持邮件、附件；不擅自承诺天数、回复时限或服务商后台删除能力 |
| `limitedUseConfirmed` | 发布者核对真实运营及所支持服务配置符合正文的 Limited Use 承诺后设为 `true` |
| `storeUrl` / `downloadUrl` | 已核实、匿名可用的正式 HTTPS 地址。尚未开放时保留 `null`，页面如实显示未公开，不妨碍先发布政策 |
| `releaseDetails` | 配置任一安装链接时必须填写已验证的平台、架构、Chaka 桌面端与兼容 Codex 版本说明 |

文本字段作为纯文本转义，不接受 HTML。未知的生效日、运营说明、邮件保留规则或 Limited Use 确认会阻止正式构建。构建只输出两个页面、CSS 和 `.nojekyll`，不会上传源文件、配置或本 README。

```sh
node scripts/build.mjs --release
```

正式构建去掉审阅标识和 `noindex`。应重新审阅实际 `_site/` 正文；字段校验只能防止明显缺项，不能证明运营承诺真实或平台已批准。

## GitHub Pages

1. 在获准使用的账号下创建独立的**公开文档仓库**，将本目录作为仓库根目录，默认分支采用 `main`。不要把其他私有项目目录或 Git 历史复制进来。
2. 在仓库 **Settings → Pages → Build and deployment → Source** 选择 **GitHub Actions**。
3. 确认上面的正式构建通过，检查 GitHub 的 `github-pages` environment 部署保护规则；可要求人工审核后部署。
4. 在 **Actions → Publish public documentation → Run workflow**，选择 `main`。工作流只允许手动触发；源码推送不会自动公开更新。
5. 确认部署成功后，使用 Actions 返回的真实页面地址，核对 HTTPS、无登录访问、两页导航、邮件链接和手机显示。政策 URL 是站点根地址加 `privacy.html`，支持 URL 是站点根地址。

默认项目地址形式为 `https://<owner>.github.io/<repository>/`，不需要购买域名。该形式是示意，不表示仓库或网站已经存在。

后续更新：修改正文/确认字段 → 正式构建 → 审阅 → 提交和推送经批准的内容 → 手动运行工作流 → 重新核验公开 URL。不要上传 `_site/` 到源码仓库，也不要上传审阅证据、私人日志或项目历史。只将 `_site/` 作为 Pages artifact。

这些页面用于政策和项目帮助，不提供商业交易、登录、付款或 SaaS 后台。

## 官方依据

- [GitHub Pages 与访问 IP 安全日志](https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages)
- [Pages HTTPS](https://docs.github.com/en/pages/getting-started-with-github-pages/securing-your-github-pages-site-with-https)
- [使用限制](https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits)
- [自定义 Pages 工作流](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages)
- [Chrome Web Store Limited Use](https://developer.chrome.com/docs/webstore/program-policies/limited-use)

## 产品首页与 GitHub Releases

产品页位于 `/chaka-docs/app/`，支持页和隐私页地址保持原样。Installer ZIP 为主下载，DMG 为备用，两者放在本仓库的 GitHub Releases。

1. 在产品工作区按 `docs/ops/runbooks/github-public-site.md` 生成本地预览并审阅。
2. 由发布者手动发布经过验收的 GitHub Release；构建正式页面会检查两个公开附件的哈希。
3. 将正式导出的 `app/` 复制到本仓库 `static/app/`；不要复制整个候选目录、日志、源码快照、安装包或本地 preview。
4. 执行 `node scripts/build.mjs --release` 后审阅 `_site/`，经授权提交、推送。
5. 仍由发布者点击原有 **Run workflow**；没有新增自动部署触发器。

纯本地联合审阅：`node scripts/build.mjs --landing /absolute/path/to/export/app`。`--landing` 不允许与 `--release` 合用，正式构建也会拒绝 `preview: true` 的页面包。
