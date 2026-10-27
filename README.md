# dsh-process-tree

[English](README.en.md)

给 DeepSeek Harness 的任务过程添加树形连接线。默认使用经典曲线，另有安静线条和植物树冠风格。支持嵌套工具调用、状态圆点、按视口绘制和减少动态效果设置。

这是社区界面插件，适用于 DSH Web 和使用同一界面的桌面版。TUI 不显示此插件。已验证环境和限制见 [兼容性记录](docs/COMPATIBILITY.md)。

## 三种风格预览

以下图片由插件实际渲染器生成，使用相同示例内容和 28 px 缩进，方便比较；不包含私人聊天数据。

### 经典曲线（默认）

流动曲线与清晰的粗细衰减，线色取自界面正文色。工具步骤完成时长出一片叶子，运行中和异常的步骤不长叶。

![经典曲线模式：主干、两层嵌套分支和状态圆点](docs/images/classic.png)

### 植物手稿

顶部一枚原创小树冠，下接带明暗的木质根系（5.6 px 线宽预设），将调用层级连接成一棵树。树冠约 70 px 高，始终留在内容区内。

![植物手稿模式：小树冠、木质主干及嵌套调用](docs/images/botanical.png)

### 安静线条（低调模式）

不想要装饰时使用：等宽细线、圆角分支和统一圆点，接近编辑器的缩进参考线。

![安静线条模式：等宽细线与圆角嵌套分支](docs/images/quiet.png)

## 安装

当前明确支持 **DSH 0.2.1-rc.2**；其他版本尚未验证。

### 通过 Discover 安装

1. 打开 **插件 → 实验性插件**，启用 **自定义插件市场 / Custom plugin markets**（部分版本显示为 Custom plugin indexes）。
2. 进入 **发现 / Discover**，选择 **添加索引源 / Add index source**；已有索引时，从市场菜单进入 **管理索引源…**。
3. 粘贴下面的完整地址，添加后选择 **Bosaiting 过程树**。

```text
https://raw.githubusercontent.com/Bosaiting/dsh-process-tree/main/market/index.json
```

搜索 `dsh-process-tree` 或“过程树”，核对安装目标为 **`dsh-process-tree@0.7.4`**、来源为 **`https://registry.npmjs.org`**，确认安装并按提示重启。已安装时可直接打开现有插件。索引源按 profile 保存，其他用户需要各自添加。

这是项目维护者提供的独立社区索引。详细操作、加载排查和版本维护见 [Discover 安装说明](docs/DISCOVER.md)。

### 命令行或离线安装

从 [npm](https://www.npmjs.com/package/dsh-process-tree) 安装固定版本：

```sh
dsh plugin --profile web add dsh-process-tree@0.7.4
```

也可以从 GitHub 安装固定版本：

```sh
dsh plugin --profile web add "github:Bosaiting/dsh-process-tree#v0.7.4"
```

也可以从 [v0.7.4 Release](https://github.com/Bosaiting/dsh-process-tree/releases/tag/v0.7.4) 下载 `dsh-process-tree-0.7.4.tgz`，然后本地安装：

```sh
dsh plugin --profile web add ./dsh-process-tree-0.7.4.tgz
```

安装后重新启动对应的 DSH 实例。桌面版通过其插件管理入口安装到桌面配置；已验证的 macOS 版本也可由桌面程序自带的 CLI 管理 `desktop` profile，单独安装的 CLI 行为可能不同。不要直接修改桌面安装目录。该插件不需要安装时构建或构建脚本许可。

使用原版 DSH 即可；Claude Style 不属于运行依赖。建议停用重复提供缩进或过程连接线的插件，尤其是 `dsh-tool-indent` 和其他过程树/时间线装饰，以免同时修改相同的间距和 CSS 变量。

## 设置

打开 **设置 → 插件 → 过程树**。整体风格切换会应用该风格的预设，之后仍可调整滑块。

| 风格 | 外观 |
| --- | --- |
| 经典曲线 `classic`，默认 | 流动曲线、粗细衰减、墨线纹理，完成的工具步骤长出叶片 |
| 植物手稿 `botanical` | 原创树冠、木质根系、细纹和状态光晕 |
| 安静线条 `quiet`，低调模式 | 1.5 px 等宽线，直主干，圆角分支，各层级一致的圆点 |

面板可调整分支过渡、线宽、缩进、摘要浓度、行距、圆点、生长速度和装饰。植物风格下显示树冠设置。设置预览与聊天区使用同一渲染器。

减少动态效果会停止生长和状态微动效。远离视口的历史过程释放绘制资源并保留布局占位；滚回时重新创建。首次安装及缺少有效风格字段的早期设置使用经典曲线，保留行外观和树冠偏好；已保存的有效风格选择不变。

## 数据与权限

插件读取已显示的聊天结构和元素尺寸，追加装饰 SVG；不注册模型工具、不执行命令、不发送网络请求。偏好仅保存在当前界面的 `localStorage`，键为 `dsh.process-tree.v1`。它不修改会话内容，也不读取 API 密钥。卸载保留偏好；可在设置中恢复默认值。

## 卸载

```sh
dsh plugin --profile web remove dsh-process-tree
```

重新启动相应实例；桌面版使用插件管理界面。不要删除整个 DSH profile。

## 开发与验证

需要 Node.js 22.19 或更新版本。运行文件已入库，无须构建。开发依赖只有测试工具及测试使用的 React，不会打入插件。

```sh
npm ci
npm test
npx playwright install chromium
npm run test:browser
npm run check:package
npm pack
```

已有 Chromium 可通过 `DSH_CHROMIUM_EXECUTABLE` 指定；浏览器测试默认使用锁定的 React 依赖，完整执行设置预览检查。与其他插件共存的额外检查可通过 `DSH_COMPOSER_SOURCE` 和 `DSH_CLAUDE_ROW_SKIP_CSS` 指定独立取得的源码，不是基础测试的前提。

README 图片可在安装浏览器后运行 `node scripts/capture-previews.mjs` 重新生成，同样支持 `DSH_CHROMIUM_EXECUTABLE`。

`canopy.svg` 保留原始树冠图稿；运行时使用 `client.js` 中经过参数化的内嵌图稿，修改原图不会自动更新运行文件。原图不重复放入安装包。

真实宿主测试的运行方式与证据范围见 [兼容性记录](docs/COMPATIBILITY.md)。不要把 DOM 夹具中的测试结果写成桌面帧率结论。提交问题时请提供 DSH 版本、系统、风格、其他界面插件及复现步骤，避免附带私人聊天内容。

## 许可与致谢

MIT，见 [LICENSE](LICENSE)。树冠 SVG 为项目所有者原创。缩进、摘要浓度和行距部分改编自 Asheep233 的 [dsh-tool-indent](https://github.com/Asheep233/dsh-tool-indent)，原版权及许可完整保留在 [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)。
