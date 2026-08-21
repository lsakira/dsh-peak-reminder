# 峰谷提示器（dsh-peak-reminder）

> DeepSeek Harness（dsh）插件：模式指示灯、高峰前提醒、API 余额卡片。
> 设计原则：**只提醒，绝不强制**。

## 功能

DeepSeek API 在高峰时段（每天 9:00-12:00、14:00-18:00，北京时间）更贵、更慢。本插件：

1. **模式指示灯**：界面左下角常驻小牌子，实时显示当前时段：
   - 🟥 **梁文峰（高峰）**：每天 9:00-12:00、14:00-18:00
   - 🟩 **梁文谷（非高峰）**：其余时间

   > 说明：本插件只负责"显示模式 + 提前提醒"，**不干预模型的回复行为**；高峰时段是否精简回复，由你自己的规则或配置决定。
2. **高峰前提醒**：高峰开始前（默认提前 10 分钟，可配置）弹右下角通知条 + 系统通知，文案可配置。只提醒，不强制。
3. **余额卡片**：指示灯上方显示 DeepSeek API 余额（每 5 分钟刷新）。余额低于可配置阈值（默认 2 元）时变红。

## 工作原理

- 客户端（`dsh/client.js`）：浏览器端按北京时间每 5 分钟检查当前时间是否接近高峰。
- 服务端（`dsh/index.js`）：提供 `/dsh-balance` 接口，从 DeepSeek 官方余额接口读取数据。
- API Key 仅在服务端读取（dsh 凭据系统，环境变量 `DEEPSEEK_API_KEY`），不出现在浏览器端，也不在本插件代码中。

## 安装

前提：已安装并运行 DeepSeek Harness（dsh）。下文 `$DSH_HOME` 指你的 dsh 数据目录（`DSH_HOME` 环境变量指向的目录；未设置时默认在用户主目录下，如 `C:\Users\<用户名>\.dsh` 或 `~/.dsh`）。

1. 将本插件目录放入 `$DSH_HOME/tools/dsh-peak-reminder/`。
2. 编辑 `$DSH_HOME/profiles/web/package.json`，在 `dsh.profile.bundles` 中加入：
   ```json
   "@local/dsh-peak-reminder"
   ```
3. 在 `$DSH_HOME/profiles/web/` 下执行：
   ```
   dsh plugin --profile web add ./../../tools/dsh-peak-reminder
   ```
4. 重启 dsh，刷新浏览器页面。

### API Key 配置

在 `$DSH_HOME/.credentials.yaml` 中配置：

```yaml
DEEPSEEK_API_KEY: your-key
```

## 自定义设置

编辑 `dsh/client.js` 顶部的"⚙️ 用户设置区"：

| 设置 | 默认值 | 说明 |
|---|---|---|
| `ADVANCE_MIN` | `10` | 提前几分钟提醒 |
| `REMIND_TITLE` | `梁文峰要来了` | 提醒标题 |
| `REMIND_TEXT` | `建议停下手头上的工作，等待梁文谷回归。` | 提醒内容 |
| `BALANCE_RED_BELOW` | `2` | 余额低于多少元变红 |

改完保存并重启 dsh（或刷新页面）生效。

高峰时段（`WINDOWS`）、检查间隔（`CHECK_MS`）等也在同文件中，一般无需修改。

## 常见问题

- 未显示指示灯：刷新页面（F5）；仍无则重启 dsh。
- 余额显示 `--`：查询失败（Key 未配置 / 网络不通 / 接口超时），检查 `.credentials.yaml`。

## 免责声明

社区插件，与 DeepSeek 官方无关；余额数据不保证实时准确。使用风险自负。

## 协议

[MIT](LICENSE)
