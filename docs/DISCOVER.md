# Discover 安装 / Install through Discover

索引地址 / Index URL:

```text
https://raw.githubusercontent.com/Bosaiting/dsh-process-tree/main/market/index.json
```

## 使用

在 **插件 → 实验性插件** 中启用 **自定义插件市场 / Custom plugin markets**（部分版本为 Custom plugin indexes），打开 **发现 / Discover**，添加上述索引源。已有其他来源时，通过市场菜单打开 **管理索引源…** 添加，保留原有来源。

选择 **Bosaiting 过程树**，搜索“过程树”或 `dsh-process-tree`。安装前核对完整包名 **dsh-process-tree**、版本、DSH 兼容范围和注册表 **https://registry.npmjs.org**，确认并按提示重启。索引中的兼容范围与对应的 npm 发布包一致。已安装卡片会打开现有插件，无须重复安装。

这是维护者自托管的社区索引，添加后才会出现在当前 profile 的 Discover 中；发布索引不会自动加入其他用户的配置或其他社区目录。插件设置、数据说明和重复缩进插件的注意事项见 [README](../README.md)。

## English

Enable **Custom plugin markets / Custom plugin indexes** under **Plugins → Experimental plugins**, then open **Discover** and add the index URL above. If sources already exist, use **Manage index sources…** in the market menu. Select **Process Tree by Bosaiting**, search for **Process Tree**, and verify the exact **dsh-process-tree** version, its DSH compatibility and **https://registry.npmjs.org** before confirming. Restart when prompted. Already installed cards open the existing plugin.

The index belongs to the current profile. Other users and profiles must add it separately. This is a publisher-maintained community index. Its declared compatibility matches the corresponding published npm package.

## 加载排查 / Troubleshooting

- 没有 Discover 标签：检查实验性插件是否启用。 / No Discover tab: enable the experimental plugin.
- 索引加载失败：打开管理索引源查看错误，确认网络能直接访问上面的 GitHub Raw 地址，再刷新索引。 / Loading fails: inspect the source error, check access to GitHub Raw, then refresh.
- 没有可安装版本：核对 DSH 版本；本索引沿用包的兼容范围，不扩大未经验证的支持范围。 / No compatible version: check the DSH version against the declared range.

## 维护 / Maintenance

`market/index.json` 使用 DSH `format: 1`，只列出公开可下载的正式 npm 包。`dist-tags.latest` 指向索引中已列出的精确版本；安装目标固定为 `包名@版本`。图标为本项目的原创小型 SVG，以内联图像提供，无须额外请求。

发布新的 npm 版本后，确认注册表已可查询，再更新 `versions`、`dist-tags.latest` 和安装说明。`publishTimestamp` 必须来自 npm 的 `time[version]`，转换为 Unix 秒；`engines.dsh` 原样复制该版本包的声明。不要根据本地主分支版本预先添加未发布的版本。索引无需随插件安装，也无需为了修改索引重新发布旧 npm 版本。

After publishing a new npm version, verify its public availability before updating the index and installation instructions. Copy the exact version, registry publication time (Unix seconds), and declared `engines.dsh`. Keep the index URL stable and include only published versions. The inline icon is generated from `market/icon.svg`; regenerate its base64 data when changing the artwork.

格式和界面依据 / Format and UI: [DSH plugin markets](https://deepseek-harness.github.io/deepseek-harness/en/guide/plugin-market).
