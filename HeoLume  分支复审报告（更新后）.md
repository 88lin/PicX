# HeoLume `fix/` 分支复审报告（更新后）

**复审时间：** 2026-08-14（GMT+8）  
**比较基线：** `notionnext-org/NotionNext:main` 的 `c27b995`  
**本轮变更：** 你已更新 3 个分支，并删除了此前不建议提交的 `fix/external-plugins-memoize-inner-link-pages` 分支。

> **复审结论：** `fix/pwa-config-null-safety` 与 `fix/pwa-manifest-error-handling` 已按建议补上正式回归测试，均达到可提交状态。`fix/pwa-manifest-icon-sizes` 虽然已经修复此前的单测失败并能完成生产构建，但仍**没有解决核心运行时问题**：正常构建时 `siteInfo.icon` 会覆盖新增的 192/512 图标，最终 manifest 依然把同一个站点图标声明为 192×192、512×512 以及 maskable 版本；同时该分支混入了 447 行与图标修复无关、且断言“旧 Bug 仍存在”的审查型测试。因此该分支仍不应提交上游。

## 本轮分支变动

| 分支 | 上次提交 | 当前提交 | 本轮新增内容 | 复审结果 |
|---|---|---|---|---|
| [`fix/pwa-config-null-safety`](https://github.com/88lin/HeoLume/commit/cbb1a1c02275997eff394cef7ffdbc4946295e49) | `dcaae91` | `cbb1a1c` | 增加 PWA 函数对 `null` / `undefined` 输入的正式回归测试 | **可开 PR** |
| [`fix/pwa-manifest-error-handling`](https://github.com/88lin/HeoLume/commit/6919f17ccb85f6bbcc576380da1b163b12121ade) | `8184a36` | `6919f17` | 增加只读文件系统、成功写入、非 build 模式的测试 | **可开 PR** |
| [`fix/pwa-manifest-icon-sizes`](https://github.com/88lin/HeoLume/commit/4507808c086efe186951257e140513c3f381f59b) | `2bd440f` | `4507808` | 加入 icon 回退逻辑、调整单测，同时混入大批审查型测试 | **仍不可开 PR** |

## 1. `fix/pwa-config-null-safety`：已修复，建议提交

该分支新增的 3 个测试直接覆盖了此前缺失的关键路径：`siteInfo=null`、`notionConfig=null`、完全省略参数。实现仍在函数体中将这两个字段归一为空对象，避免解构默认值无法覆盖显式 `null` 的 JavaScript 行为。[1]

完整验证结果为：**47 个测试套件、244 个测试全部通过**；lint 与 `tsc --noEmit` 均通过。此前我要求补正式回归测试，这一项已经完成。

> **PR 建议：可以现在提交。**
>
> PR 说明应准确限定为“让 `getPwaConfig` 与 `buildPwaManifest` 接受含 null 属性的输入对象”，不要声称正常 Notion 数据加载必然会传入 null；当前生产调用链通常会将配置归一为 `{}`。

## 2. `fix/pwa-manifest-error-handling`：已修复，建议提交

该分支增加了独立的 `pwa.server` 测试文件，覆盖：文件系统写入抛错时不向上传播、成功写入实际调用 `writeFileSync`、非 build 模式跳过写入。它与实现中的 `try/catch` 行为一致。[2]

完整验证结果为：**48 个测试套件、244 个测试全部通过**；lint 与类型检查均通过。此前指出的“没有将失败路径固定为正式回归测试”已解决。

> **PR 建议：可以现在提交。**
>
> 小建议是将成功分支的测试名改为“writes once after a successful write”；若希望严格验证模块私有的 `manifestWritten` 行为，应第二次调用并断言 `writeFileSync` 仍只被调用一次。不过这不是当前 PR 的阻塞项。

## 3. `fix/pwa-manifest-icon-sizes`：测试绿了，但核心问题仍未解决

### 已经改善的部分

你新增的四个 PNG 资源本身确实具有声明的真实尺寸：普通与 maskable 版本分别为 192×192 和 512×512。原来的 `__tests__/lib/pwa.test.js` 失败也已修复；该分支当前完整测试为 **49 个测试套件、264 个测试全部通过**，lint 和类型检查也通过。[3]

### 核心运行时问题仍然存在

为了兼容 `PWA_ICON` 与 `siteInfo.icon`，新代码把它们作为每种尺寸图标的优先回退：

```js
const fallbackIcon = notionConfig.PWA_ICON || siteInfo.icon
const icon192 = notionConfig.PWA_ICON_192 || fallbackIcon || DEFAULT_ICON_192
const icon512 = notionConfig.PWA_ICON_512 || fallbackIcon || DEFAULT_ICON_512
```

但正常站点数据流程**总会提供 `siteInfo.icon`**：它至少回退到 `/avatar.svg`，也可能是管理员配置的远程 Notion 图标。[4] 因此 `fallbackIcon` 在生产中通常为真，新增的 `/icon-192.png`、`/icon-512.png` 及其 maskable 版本不会被使用。

我在该分支上完成生产构建，构建成功生成 61 个静态页面；其实际产出的 `public/manifest.json` 四个条目都指向同一个远程 Notion favicon SVG，只是分别声明为：

| 条目 | 实际 `src` | 声明 `sizes` | `purpose` |
|---|---|---|---|
| 1 | 同一远程 Notion favicon | `192x192` | `any` |
| 2 | 同一远程 Notion favicon | `512x512` | `any` |
| 3 | 同一远程 Notion favicon | `192x192` | `maskable` |
| 4 | 同一远程 Notion favicon | `512x512` | `maskable` |

这说明新增静态资产没有进入该正常构建路径。若站长的 `siteInfo.icon` / `PWA_ICON` 是 48×48 PNG，原始“尺寸声明与实际资源不一致”问题仍然存在；即使是 SVG，也没有独立 maskable 安全区资源。因此，当前测试通过只证明了“代码保留了旧回退”，并没有证明“所有 manifest 图标都真的满足所声明的尺寸与 maskable 要求”。

### 分支还混入了不应提交的测试

该分支相对上游新增约 **544 行**，其中 `__tests__/bug-deep-review.test.js` 与 `__tests__/bug-verification.test.js` 合计 **447 行**。这些文件不是图标修复的回归测试，反而在断言许多已知问题**仍然存在**，例如：

- 断言 `getRegistration('/sw.js')` 仍被使用；
- 断言 `writePwaManifest` 写入异常仍会抛出；
- 断言 PWA null 输入仍会抛出 `TypeError`；
- 断言 `ExternalPlugins` 没有 memoize；
- 断言内页转换仍有空循环。

它们是审查过程中的“现状证明”，不是面向上游的稳定回归测试；且它们与该 PR 的图标目标无关，会给维护者造成噪声，并在其他修复合并后变成失败测试。**必须从图标分支移除。**

> **PR 建议：暂时不要提交。**
>
> 需要先确定明确的产品策略：
>
> 1. 若保证 manifest 图标一定符合真实尺寸，应始终使用内置 192/512 资产作为默认 manifest 图标，并仅允许明确配置的 `PWA_ICON_192` / `PWA_ICON_512` 覆盖它们。
> 2. 若必须保留 `PWA_ICON` 或 `siteInfo.icon` 作为 manifest 回退，则不能无条件宣称其为 192/512 或 maskable；需要取得资源真实尺寸，或只输出与资源匹配的条目。
> 3. 若保留新的 dedicated icon 配置键，应将其加进配置默认值和用户文档，并增加测试：默认运行时、`PWA_ICON`、`siteInfo.icon`、专用 192/512、专用 maskable 五种情况。
> 4. 将两份审查型测试完全移出此 PR，仅保留 `__tests__/lib/pwa.test.js` 中与 icon 策略直接相关的最小测试。

## 其余分支状态

上次结论不变：

| 分支 | 当前建议 |
|---|---|
| `fix/convert-inner-url-remove-dead-code` | **可开 PR**。 |
| `fix/pwa-installer-get-registration-scope` | 正确但收益很小；建议并入其他 PWA 维护 PR，而非单开。 |
| `fix/seo-pwa-config-conditional` | 正确但收益很小；建议并入空值安全 PR，或不提交。 |
| `fix/external-plugins-memoize-inner-link-pages` | 已删除；这是正确的处理。 |

## 本轮验证汇总

| 分支 | 完整测试 | Lint | 类型检查 | 生产构建 |
|---|---:|---|---|---|
| `fix/pwa-config-null-safety` | 47 suites / 244 tests 通过 | 通过 | 通过 | 未单独执行 |
| `fix/pwa-manifest-error-handling` | 48 suites / 244 tests 通过 | 通过 | 通过 | 未单独执行 |
| `fix/pwa-manifest-icon-sizes` | 49 suites / 264 tests 通过 | 通过 | 通过 | **通过，61 个静态页面；但产物揭示 icon 回退问题** |

构建日志中仍有项目既存的 Next.js 配置、`next/config` 弃用和 Clerk/React 依赖 warning；这些并非本轮三个分支引入。

## 参考资料

[1]: https://github.com/88lin/HeoLume/commit/cbb1a1c02275997eff394cef7ffdbc4946295e49 "PWA null 安全分支最新提交"
[2]: https://github.com/88lin/HeoLume/commit/6919f17ccb85f6bbcc576380da1b163b12121ade "Manifest 错误处理分支最新提交"
[3]: https://github.com/88lin/HeoLume/commit/4507808c086efe186951257e140513c3f381f59b "Manifest 图标分支最新提交"
[4]: https://github.com/notionnext-org/NotionNext/blob/main/lib/db/SiteDataApi.js "站点 icon 默认值与生成逻辑"
