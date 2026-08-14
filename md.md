# HeoLume 全部 `fix/` 分支 PR 审查报告

**审查日期：** 2026-08-14（GMT+8）  
**比较基线：** `notionnext-org/NotionNext:main` 的 `c27b995`  
**审查范围：** 你仓库 `88lin/HeoLume` 中全部 7 个以 `fix/` 开头的远程分支。

> **总览结论：** 7 个分支都只领先上游 1 个提交、没有落后提交，且均通过差异空白检查。它们应保持为**独立 PR**，不要合并为一个大 PR。当前最适合推进的是死代码移除；空值安全与 manifest 写入降级在补上回归测试后也适合提交。图标分支存在明确回归，不能提交。`useMemo` 分支没有实现其承诺的优化，应该放弃或重做。两个纯整理/微优化分支的收益太小，不建议单独占用上游审核资源。

## 分支结论矩阵

| 分支 | 提交 | 审查结论 | 是否现在开 PR | 关键原因 |
|---|---|---|---|---|
| [`fix/convert-inner-url-remove-dead-code`](https://github.com/88lin/HeoLume/commit/a144ba0e4a3228107ced24c0d54535e80081bfe4) | `a144ba0` | **通过** | **可以** | 只删除无效第二轮遍历；不改变可观察行为，241 个测试通过。 |
| [`fix/pwa-config-null-safety`](https://github.com/88lin/HeoLume/commit/dcaae9153d7ff7b20e1a85ac6c7e86c66770b198) | `dcaae91` | **有条件通过** | **先补测试** | 显式 `null` 不再触发属性读取异常；定向验证通过。但提交未附回归测试。 |
| [`fix/pwa-manifest-error-handling`](https://github.com/88lin/HeoLume/commit/8184a367dbffc1997fbc0fd1e5755842169ea4fe) | `8184a36` | **有条件通过** | **先补测试** | 写入失败被降级为 warning，定向模拟只读文件系统已验证；提交缺测试。 |
| [`fix/pwa-installer-get-registration-scope`](https://github.com/88lin/HeoLume/commit/4d169443b4a9cddea39d18d22b85761cee91cab1) | `4d16944` | **技术正确但收益低** | **不建议单独开** | 将查询参数由 `/sw.js` 统一为注册 scope `/`，表达更清楚，但现有单 Worker 场景原实现也能命中。 |
| [`fix/seo-pwa-config-conditional`](https://github.com/88lin/HeoLume/commit/5449c009a996dab58293334973a592cfb8217edf) | `5449c00` | **技术正确但收益低** | **不建议单独开** | PWA 关闭时不再构造轻量配置对象；可避免 PWA 关闭路径触及空值问题，但性能收益极小。可与空值安全 PR 合并为一项完整修复。 |
| [`fix/external-plugins-memoize-inner-link-pages`](https://github.com/88lin/HeoLume/commit/8299d6e608035d9f112bdc60a4ad8e91655bad77) | `8299d6e` | **不通过** | **不要开** | `useMemo` 的依赖就是两个数组引用；父组件传入内容相同的新数组时，依赖仍变化，返回值仍为新引用，effect 仍会重跑。实现没有达到提交说明所称的稳定作用。 |
| [`fix/pwa-manifest-icon-sizes`](https://github.com/88lin/HeoLume/commit/2bd440f176cf378c7f5806cd42a1b71ace4f400e) | `2bd440f` | **不通过** | **不要开** | 新增图标文件尺寸正确，但现有 PWA 单测失败，并且 manifest 不再使用已有的 `PWA_ICON` 或 `siteInfo.icon`，造成配置兼容性回归。 |

## 逐分支说明

### 1. `fix/convert-inner-url-remove-dead-code`：可优先提交

该分支只删除 `convertInnerUrl` 在第一轮链接处理完成后又进行的一次空遍历。被删除逻辑计算 `slug`、查询 `slugPage`，但空 `if` 块不产生副作用；因此删除是行为等价的。[1]

建议在 PR 中准确称为 **dead-code cleanup**，而不是功能修复。为了让审核更快，可在说明中写明“无行为变化、仅消除无效 DOM 链接二次扫描”。这是 7 个分支里最适合立即独立提交的一个。

### 2. `fix/pwa-config-null-safety`：正确，应补测试后提交

分支将两个函数签名从解构默认值改为在函数体内归一化：`siteInfo = siteInfo || {}`、`notionConfig = notionConfig || {}`。这准确处理了 JavaScript 默认参数不覆盖显式 `null` 的问题。[2]

我已在该分支上执行定向测试：`getPwaConfig({ siteInfo: null, notionConfig: null })` 和 `buildPwaManifest({ siteInfo: null, notionConfig: null })` 都能返回默认 PWA 配置而不抛异常。实现没有兼容性问题，但请把这个测试正式放入 `__tests__/lib/pwa.test.js`，不要仅依赖现有 241 个测试，因为现有测试未覆盖 `null`。

### 3. `fix/pwa-manifest-error-handling`：正确，应补测试后提交

该分支将 manifest 构建与 `fs.writeFileSync` 包在 `try/catch` 中；写入失败时保留 `manifestWritten = false` 并记录 warning，不再中断可选 PWA 功能所在的构建路径。[3]

我用 mock 的只读文件系统进行了定向验证：写入抛出 `read-only filesystem` 后，函数不再向调用方抛异常，并输出预期 warning。实现是合理的。PR 前应将这条模拟加入正式测试，至少断言：**不抛异常、写入成功后才置 `manifestWritten=true`、warning 含失败原因**。

### 4. `fix/pwa-installer-get-registration-scope`：保持或与其他 PWA PR 合并

将 `getRegistration('/sw.js')` 改为 `getRegistration('/')` 与 `register('/sw.js', { scope: '/' })` 的 scope 语义一致，代码表达更清晰。[4] 但 `/sw.js` 本来就在 `/` scope 之内，当前单一 Service Worker 注册下不会错误匹配。

因此这是低风险、小收益的**重构**，不是会造成当前用户故障的修复。若上游希望最小化 PR 数量，建议不要单独开；可以作为 manifest 错误处理或空值安全 PR 的一个独立提交并在同一 PWA 维护 PR 中提交。

### 5. `fix/seo-pwa-config-conditional`：可与空值安全合并，不建议单发

代码在 `PWA_ENABLE` 为 false 时将 `pwaConfig` 设为 `null`，只在启用 PWA 时调用 `getPwaConfig`。[5] JSX 中对 `.themeColor`、`.name`、`.icon` 的读取本身已有 `pwaEnabled` 条件，因此不引入 null 访问风险。

它的正确性没有问题，并且能避免 PWA 关闭时因显式 null 配置导致的意外崩溃。不过对象构造非常轻，性能收益不足以支撑一个独立 PR。建议与 **#2 空值安全** 合并，并附一个“PWA 未启用时不调用 `getPwaConfig`”的组件测试；否则直接不提交也没有实质损失。

### 6. `fix/external-plugins-memoize-inner-link-pages`：应放弃当前实现

原表达式只是透传：

```js
const innerLinkPages = props?.allLinkPages || props?.allNavPages
```

它不会在组件内部新建数组。当前分支将其包装进 `useMemo`，但 memo 的依赖项仍是两个父数组的**引用**；父组件只要传入等值但不同引用的新数组，memo 就会重新计算并返回新数组，`useEffect` 的 `innerLinkPages` 依赖仍会变化。[6]

我已通过与分支实现完全相同的 Hook 模式定向验证这个行为。因此这项修改不会减少提交说明所称的 DOM 重写。除非你已经用 profiler 找到真正生成新数组的父组件，并打算在父层修复引用稳定性，否则建议关闭或重置该分支。

### 7. `fix/pwa-manifest-icon-sizes`：有价值的方向，但当前存在阻塞回归

新增的四个 PNG 文件的真实尺寸分别为 192×192 和 512×512，普通与 maskable 文件分离，资源质量方向正确。maskable 版本的主体也有明显安全边距。manifest 的图标尺寸声明因此不再与物理文件冲突。

但目前有两个阻塞问题：

1. **现有测试失败。** `__tests__/lib/pwa.test.js` 仍要求 `buildPwaManifest` 使用传入 `siteInfo.icon`（例如 `/avatar.png`）。该分支现在强制使用 `/icon-192.png`、`/icon-512.png`，导致完整测试结果为 **46 suites 通过、1 suite 失败；240/241 tests 通过**。
2. **配置回归。** 原实现的 `PWA_ICON` 和 `siteInfo.icon` 会进入 manifest；新实现只读取新增的 `PWA_ICON_192`、`PWA_ICON_512` 及 maskable 专用键，且这些键未在 `blog.config.js`、用户文档或特性说明中声明。现有站长设置的 `PWA_ICON` 会继续影响 `apple-touch-icon`，但不会影响 manifest 图标，形成不一致的用户可见回归。

修复这个分支至少需要：保留 `PWA_ICON`/`siteInfo.icon` 的向后兼容回退逻辑，明确每种图标的优先级，新增配置键的默认值和文档，并重写/扩展 PWA 单测。注意，不能简单把 `siteInfo.icon` 回退到 `icon192`：它在常规站点中通常存在，且可能仍然是没有 192/512 尺寸保证的头像资源。需要先明确产品规则：**默认使用内置的合规图标，还是延续站长自定义的站点图标**。

## 验证结果

| 检查项 | 结果 |
|---|---|
| 分支与上游关系 | 7/7 均为上游 `main` 的直接后继，均只领先 1 个提交、没有落后提交。 |
| `git diff --check` | 7/7 通过。 |
| `yarn lint` | 7/7 通过；每支均有 53 条项目既存 warning，未见新增 error。 |
| `yarn test --runInBand` | 除图标分支外 6/7 全绿：每支 **47 suites / 241 tests**；图标分支 **46/47 suites、240/241 tests**。 |
| 定向 null 安全测试 | 通过。 |
| 定向 manifest 写入失败降级测试 | 通过。 |
| 生产构建 | 已在此前审查的 `fix/external-plugins-memoize-inner-link-pages` 分支通过，生成 **61 个静态页面**。这只能证明共享基线与该分支可构建；不应替代图标分支修复后的单独 build。 |

## 推荐提交顺序

建议按下面顺序推进，避免一次开太多低价值 PR：

1. **先开：** `fix/convert-inner-url-remove-dead-code`。
2. **补测试后开：** `fix/pwa-config-null-safety`。
3. **补测试后开，或与第 2 项合并为 PWA resilience PR：** `fix/pwa-manifest-error-handling`。
4. **可选，合并进第 2/3 项而不是单独提交：** `fix/pwa-installer-get-registration-scope`、`fix/seo-pwa-config-conditional`。
5. **不要开：** `fix/external-plugins-memoize-inner-link-pages`。
6. **先修回归、补文档和测试，再重新审：** `fix/pwa-manifest-icon-sizes`。

## 参考资料

[1]: https://github.com/88lin/HeoLume/commit/a144ba0e4a3228107ced24c0d54535e80081bfe4 "死代码移除提交"
[2]: https://github.com/88lin/HeoLume/commit/dcaae9153d7ff7b20e1a85ac6c7e86c66770b198 "PWA 空值安全提交"
[3]: https://github.com/88lin/HeoLume/commit/8184a367dbffc1997fbc0fd1e5755842169ea4fe "Manifest 写入错误处理提交"
[4]: https://github.com/88lin/HeoLume/commit/4d169443b4a9cddea39d18d22b85761cee91cab1 "Service Worker scope 整理提交"
[5]: https://github.com/88lin/HeoLume/commit/5449c009a996dab58293334973a592cfb8217edf "SEO PWA 条件计算提交"
[6]: https://github.com/88lin/HeoLume/commit/8299d6e608035d9f112bdc60a4ad8e91655bad77 "ExternalPlugins memoization 提交"
[7]: https://github.com/88lin/HeoLume/commit/2bd440f176cf378c7f5806cd42a1b71ace4f400e "PWA manifest 图标尺寸提交"
