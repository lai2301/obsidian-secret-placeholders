// Chinese (Simplified) message catalogue.
//
// Typed as `Messages`, so the compiler enforces exact key parity with en.ts:
// a missing key OR an extra key is a build error. Values are free text.
import type { Messages } from "./en";

export const zh: Messages = {
  // 命令面板名称
  "command.login": "密钥：登录到当前提供方",
  "command.logout": "密钥：从当前提供方登出",
  "command.clearCache": "密钥：清除缓存",
  "command.saveSelection": "密钥：将选中内容保存为密钥",
  "command.insertPlaceholder": "密钥：插入占位符",
  "command.browseInsert": "密钥：浏览并插入占位符",
  "command.browseCopy": "密钥：浏览并复制值",
  "command.copyUnderCursor": "密钥：复制光标处的密钥",
  "command.openIndex": "密钥：打开占位符索引",

  // 通知
  "notice.noProviderConfigured": "未配置提供方",
  "notice.loggedOut": "{provider}：已登出",
  "notice.cacheCleared": "密钥缓存已清除",
  "notice.logInFirst": "{provider}：请先登录",
  "notice.savedTo": "已保存到 {ref}",
  "notice.saveFailed": "保存失败：{msg}",
  "notice.secretCopied": "密钥已复制到剪贴板",
  "notice.readFailed": "读取失败：{msg}",
  "notice.noPlaceholderUnderCursor": "光标处没有占位符",

  // 设置 — 显示部分
  "settings.displayHeading": "显示",
  "settings.maskMode.name": "遮罩模式",
  "settings.maskMode.desc":
    "解析后的密钥是否默认隐藏。无论此设置如何，磁盘上的占位符文本永远不是真实密钥。",
  "settings.maskMode.never": "从不（默认）",
  "settings.maskMode.always": "始终",
  "settings.maskMode.manual": "手动（遮罩，点击显示）",
  "settings.clickAction.name": "点击操作",
  "settings.clickAction.desc": "单击已解析密钥时的操作。",
  "settings.modifierClickAction.name": "修饰键点击操作",
  "settings.modifierClickAction.desc": "Ctrl/Cmd + 单击时的操作。",
  "settings.click.copy": "复制",
  "settings.click.toggleMask": "切换遮罩",
  "settings.click.none": "不执行任何操作",
  "settings.maskCharacter.name": "遮罩字符",

  // 设置 — 提供方部分
  "settings.providersHeading": "提供方",
  "settings.provider.enabledDesc":
    "设置、状态栏和 {example} 占位符均已启用。",
  "settings.provider.disabledDesc":
    "已禁用。没有设置、占位符或自动补全。",
  "settings.statusBar.name": "状态栏",
  "settings.statusBar.desc":
    "选择哪些提供方在状态栏中显示为标签。全部不勾选则显示所有已启用的提供方。",
  "settings.statusBar.show": "显示 {name}",

  // 设置 — 语言部分
  "settings.language.name": "语言",
  "settings.language.desc":
    "界面语言。命令面板名称会在重新加载插件后更新。",
  "settings.language.auto": "自动（跟随 Obsidian）",

  // 共享按钮
  "button.cancel": "取消",
  "button.save": "保存",
  "button.ok": "确定",
  "button.logIn": "登录",
  "button.logOut": "登出",

  // 右键菜单
  "contextMenu.saveSelectionTo": "将选中内容保存到 {provider}",
  "contextMenu.copyResolvedValue": "复制解析后的值",
  "contextMenu.editSecretValue": "编辑密钥值…",
  "contextMenu.replaceWithResolved": "替换为解析后的值…",
  "contextMenu.noActiveFile": "没有可供替换的活动文件",
  "contextMenu.placeholderReplaced": "占位符已替换",
  "contextMenu.confirmReplace.title": "将密钥写入文件？",
  "contextMenu.confirmReplace.body":
    "替换此占位符会将密钥（{preview}）以纯文本形式内联写入此笔记。在某些工作流中这是有意为之，但它会破坏本插件的主要用途——磁盘上的 .md 文件将包含该凭据。",
  "contextMenu.confirmReplace.placeholder": "占位符：{ref}",
  "contextMenu.confirmReplace.replaceInline": "内联替换",

  // 编辑密钥模态框
  "modal.editSecret.title": "编辑密钥值",
  "modal.editSecret.desc":
    "仅更新后端密钥——笔记中的占位符文本保持不变。",
  "modal.editSecret.provider": "提供方：{provider}",
  "modal.editSecret.placeholder": "占位符：{ref}",
  "modal.editSecret.currentValue": "当前值",
  "modal.editSecret.clickToLoad": "（点击加载）",
  "modal.editSecret.showHide": "显示 / 隐藏当前值",
  "modal.editSecret.loading": "加载中…",
  "modal.editSecret.error": "（错误：{msg}）",
  "modal.editSecret.newValue": "新值",
  "modal.editSecret.newValuePlaceholder": "新的密钥值",
  "modal.editSecret.enterValueFirst": "请先输入新值",
  "modal.editSecret.updated": "已更新 {ref}",
  "modal.editSecret.writeFailed": "写入失败：{msg}",

  // 令牌输入模态框
  "modal.token.title": "粘贴令牌",
  "modal.token.desc":
    "粘贴来自提供方的身份验证令牌。对于 OpenBao，运行 `bao login -method=oidc role=obsidian` 或从 Web UI 复制。",
  "modal.token.placeholder": "令牌...",

  // 引用编辑模态框
  "modal.refEditor.title": "密钥位置（{provider}）",
  "modal.refEditor.optional": "{label}（可选）",

  // 密钥浏览模态框
  "modal.secretBrowser.searchPlaceholder": "搜索密钥…",

  // 密钥内联元素
  "span.reLogin": "重新登录",
  "span.copyFailed": "复制失败",

  // 认证状态行
  "auth.checking": "检查中…",
  "auth.loggedIn": "已登录",
  "auth.notLoggedIn": "未登录",
  "auth.ttl": "TTL {ttl}",

  // 侧边栏
  "sidebar.displayName": "密钥占位符",
  "sidebar.title": "占位符索引",
  "sidebar.count": "  {refs} 个唯一 · {uses} 次使用",
  "sidebar.rescan": "重新扫描仓库",
  "sidebar.filter": "筛选…",
  "sidebar.empty": "此仓库中未找到占位符。",
  "sidebar.groupHeader": "{provider}  （{refs} 个唯一 · {uses} 次使用）",
  "sidebar.editSecret": "编辑密钥值",
  "sidebar.providerNotEnabled": "提供方 '{provider}' 未启用",
  "sidebar.parseError": "无法解析占位符",
  "sidebar.openFailed": "无法打开 Secret Placeholders 侧边栏",

  // 提供方 — Bitwarden
  "provider.bitwarden.serverNotSet":
    "Bitwarden：请先在设置中填写服务器 URL",
  "provider.bitwarden.sessionRestored": "Bitwarden 会话已恢复",
  "provider.bitwarden.restoreFailed":
    "无法恢复 Bitwarden 会话：{msg}。请使用“登录”以主密码登录。",
  "provider.bitwarden.unlockSession": "解锁 Bitwarden 会话",
  "provider.bitwarden.setUnlockPassphrase":
    "为此设备设置解锁口令",
  "provider.bitwarden.loggedIn": "Bitwarden：已登录",
  "provider.bitwarden.loginFailed": "Bitwarden 登录失败：{msg}",
  "provider.bitwarden.serverHeading": "Bitwarden / Vaultwarden",
  "provider.bitwarden.serverUrl.name": "服务器 URL",
  "provider.bitwarden.serverUrl.desc":
    "Vaultwarden 实例，例如 https://vw.example.com。Bitwarden 云端请使用 https://vault.bitwarden.com（美国）或 https://vault.bitwarden.eu（欧盟）。",
  "provider.bitwarden.email.name": "邮箱",
  "provider.bitwarden.cacheTtl.name": "缓存 TTL（秒）",
  "provider.bitwarden.cacheTtl.desc":
    "解密后的密文列表在内存中保留多长时间。",
  "provider.bitwarden.rememberSession.name": "在此设备上记住会话",
  "provider.bitwarden.rememberSession.desc":
    "登录时，用口令加密用户密钥 + 刷新令牌并存储到磁盘。下次启动 Obsidian 时将提示输入口令而非主密码。默认关闭。",

  // 提供方 — Bitwarden 登录模态框
  "provider.bitwarden.loginTitle": "登录到 Bitwarden / Vaultwarden",
  "provider.bitwarden.loginServer": "服务器：{server}",
  "provider.bitwarden.loginServerUnset": "（请先在设置中填写服务器 URL）",
  "provider.bitwarden.loginMasterPasswordHint":
    "您的主密码在本地用于派生密钥；只有派生出的哈希会发送到服务器。",
  "provider.bitwarden.emailField": "邮箱",
  "provider.bitwarden.masterPassword": "主密码",
  "provider.bitwarden.loggingIn": "登录中…",
  "provider.bitwarden.twoFactorTitle": "两步验证",
  "provider.bitwarden.twoFactorHint":
    "输入身份验证器应用中的 6 位验证码以完成登录。",
  "provider.bitwarden.code": "验证码",
  "provider.bitwarden.verify": "验证",
  "provider.bitwarden.verifying": "验证中…",
  "provider.bitwarden.newDeviceTitle": "新设备验证",
  "provider.bitwarden.newDeviceHint":
    "Bitwarden 已向 {email} 发送了一个 6 位验证码。将其粘贴到下方以完成登录。这是针对此设备的一次性检查。",

  // 提供方 — OpenBao
  "provider.openbao.loginOkPolicies": "OpenBao 登录成功 - 策略：{policies}",
  "provider.openbao.loginOk": "OpenBao 登录成功",
  "provider.openbao.policiesNone": "（无）",
  "provider.openbao.oidcLoginFailed": "OIDC 登录失败：{msg}",
  "provider.openbao.tokenRejected": "OpenBao 令牌被拒绝：{msg}",
  "provider.openbao.heading": "OpenBao / Vault",
  "provider.openbao.pasteToken": "粘贴令牌",
  "provider.openbao.serverAddress.name": "服务器地址",
  "provider.openbao.serverAddress.desc":
    "OpenBao 服务器的基础 URL。结尾不带斜杠。",
  "provider.openbao.oidcRole.name": "OIDC 角色",
  "provider.openbao.defaultMount.name": "默认挂载点",
  "provider.openbao.defaultPathPrefix.name": "默认路径前缀",
  "provider.openbao.defaultPathPrefix.desc":
    '例如 "obsidian/" - 会添加到建议的密钥路径前面。',
  "provider.openbao.cacheTtl.name": "缓存 TTL（秒）",
  "provider.openbao.cacheTtl.desc":
    "解析后的密钥在内存中保留多长时间。",
  "provider.openbao.rememberToken.name": "在此设备上记住令牌",
  "provider.openbao.rememberToken.desc":
    "用口令加密令牌并存储在插件数据中。",

  // 提供方 — 1Password
  "provider.onepassword.loggedIn": "1Password Connect：已登录",
  "provider.onepassword.tokenRejected":
    "1Password Connect：令牌被拒绝（{msg}）",
  "provider.onepassword.heading": "1Password Connect",
  "provider.onepassword.serverUrl.name": "Connect 服务器 URL",
  "provider.onepassword.serverUrl.desc":
    "您自托管的 1Password Connect 服务器的基础 URL。",
  "provider.onepassword.defaultVault.name": "默认保管库",
  "provider.onepassword.defaultVault.desc":
    "用作新占位符默认值的保管库名称或 id。留空以扫描所有保管库。",
  "provider.onepassword.cacheTtl.name": "缓存 TTL（秒）",
  "provider.onepassword.cacheTtl.desc":
    "解析后的 1Password 项目在内存中保留多长时间。",

  // 提供方 — 面向用户的错误消息（通过通知显示）
  "provider.onepassword.notLoggedIn": "未登录到 1Password",
  "provider.onepassword.urlNotConfigured":
    "未配置 1Password Connect URL",
  "provider.openbao.notLoggedIn": "未登录到 OpenBao",
  "provider.openbao.oidc.noAuthUrl": "OpenBao 未返回 auth_url",
  "provider.openbao.oidc.noClientToken":
    "回调响应中不包含 client_token",
  "provider.openbao.oidc.missingParams":
    "回调缺少 state/code 查询参数",
  "provider.openbao.oidc.timeout": "OIDC 回调在 {sec} 秒后超时",
  "provider.bitwarden.serverUrlNotSet": "未设置 Bitwarden 服务器 URL",
  "provider.bitwarden.deviceVerifCancelled": "设备验证已取消",
  "provider.bitwarden.twoFactorCancelled": "两步验证已取消",
  "provider.bitwarden.loginRetriesExhausted": "登录重试次数已用尽",
  "provider.bitwarden.totpNotEnabled":
    "需要两步验证，但此账户未启用 TOTP（提供方：{providers}）。请在 Bitwarden Web 保管库中启用 TOTP，或等待插件支持其他方式。",
};
