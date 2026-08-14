# `fix/pwa-manifest-icon-sizes` 最终复审报告

**分支：** `fix/pwa-manifest-icon-sizes`  
**最新提交：** `a9c770d36d7ed928f052ec0c02493a0cb2e24d03`  
**比较基线：** `notionnext-org/NotionNext:main` 的 `c27b995`  
**复审日期：** 2026-08-14（GMT+8）

> **结论：核心实现问题已修复，代码与构建验证均通过。建议在补齐配置文档后创建 PR；若你在 PR 描述中明确说明新的图标策略，当前代码层面已具备合并质量。**

## 本轮修复结果

本次更新正确地采用了“manifest 默认只使用内置、尺寸受控的图标”的策略：`PWA_ICON` 与 `siteInfo.icon` 不再作为 manifest 图标回退，而只保留为 `apple-touch-icon` 等页面元数据的来源。只有明确配置的 `PWA_ICON_192`、`PWA_ICON_512`、`PWA_ICON_192_MASKABLE`、`PWA_ICON_512_MASKABLE` 才能覆盖 manifest 的对应图标。[1]

这消除了上一轮在真实构建中发现的核心问题。此前，正常站点的 `siteInfo.icon`（通常为 Notion favicon 或 `/avatar.svg`）会覆盖新加入的 PNG 文件，导致同一个未知尺寸资源被虚假声明成 `192x192`、`512x512` 与 maskable 图标。现在默认构建产物已真实使用四个独立资源：

| Manifest 路径 | 声明尺寸 | 实际文件尺寸 | Purpose | 验证 |
|---|---:|---:|---|---|
| `/icon-192.png` | 192×192 | 192×192 | `any` | 通过 |
| `/icon-512.png` | 512×512 | 512×512 | `any` | 通过 |
| `/icon-192-maskable.png` | 192×192 | 192×192 | `maskable` | 通过 |
| `/icon-512-maskable.png` | 512×512 | 512×512 | `maskable` | 通过 |

生产构建实际写出的 `public/manifest.json` 已与上表完全一致；不再引用远程 Notion SVG 或 `siteInfo.icon`。此外，之前混入分支的两份审查型测试 `bug-deep-review.test.js`、`bug-verification.test.js` 已被删除，分支只保留与 PWA 行为直接相关的 `__tests__/lib/pwa.test.js`。

## 自动化验证

| 检查项 | 结果 | 说明 |
|---|---|---|
| `git diff --check` | 通过 | 无空白或补丁格式错误。 |
| `yarn test --runInBand` | 通过 | **47 个测试套件、243 个测试**全部通过。 |
| `yarn lint` | 通过 | 未产生 lint error。 |
| `yarn type-check` | 通过 | TypeScript 无错误。 |
| `yarn build` | 通过 | 成功生成 **61 个静态页面**并输出正确 manifest。 |

构建日志仍包含仓库既存的 Next.js 配置弃用与 Clerk/React 依赖 warning；它们不由本分支引入，也没有阻止生产构建。

## 提交前唯一建议：补齐配置文档

新增的 4 个精确尺寸配置键仅出现在实现和单测中，尚未写入用户配置文档或默认配置。与此同时，现有文档把 `PWA_ICON` 描述为“PWA 安装图标”，但代码更新后它**不再控制 manifest 图标**，只用于 `<link rel="apple-touch-icon">`。[2]

这不是代码阻塞项，但会影响用户理解和维护者审核。建议在同一个 PR 中补充以下说明：

| 配置项 | 建议的文档语义 |
|---|---|
| `PWA_ICON` | 仅用于 Apple touch icon / 页面图标回退；不会改变 manifest 中保证尺寸的图标。 |
| `PWA_ICON_192`、`PWA_ICON_512` | 可选地覆盖 manifest 的普通图标；用户必须提供对应真实尺寸的资源。 |
| `PWA_ICON_192_MASKABLE`、`PWA_ICON_512_MASKABLE` | 可选地覆盖 maskable manifest 图标；资源应具有足够安全边距。 |
| 未配置上述键 | 使用项目内置的四个合规 PNG 默认资源。 |

需要同步调整 `blog.config.js` 中 `PWA_ICON` 的注释，以及 `docs/user-guide/config/pwa-install.md`、`docs/user-guide/reference/features.md` 和变更记录中的描述，避免把 `PWA_ICON` 误称为 manifest 安装图标。

## PR 建议

建议现在准备 PR，但最好先附带上面的文档小改动，然后在描述中说明以下三点：

1. 修复 manifest `sizes` 与实际图标资源可能不一致的问题。
2. 默认使用项目内置、尺寸匹配的 `any` 与 `maskable` 图标，避免依赖站点 favicon 或 Notion avatar 的未知尺寸。
3. 为有明确资产管理需求的部署者提供四个专用尺寸覆盖项，并要求其自行保证资源尺寸与 maskable 安全区。

这会使兼容性取舍透明：已有的 `PWA_ICON` 仍继续服务于 Apple touch icon，但不能再通过它修改 manifest 图标。若你不希望出现这一行为变化，则应选择另一套实现：在检测到自定义 `PWA_ICON` 后，仅输出其真实尺寸可验证的条目；但这会增加远程资源检测与构建复杂度，不建议放入这个小型修复 PR。

## 参考资料

[1]: https://github.com/88lin/HeoLume/commit/a9c770d36d7ed928f052ec0c02493a0cb2e24d03 "最新图标策略修复提交"
[2]: https://github.com/88lin/HeoLume/blob/fix/pwa-manifest-icon-sizes/components/SEO.js "PWA 图标在页面元数据中的使用位置"
