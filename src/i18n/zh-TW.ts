// Chinese (Traditional) message catalogue.
//
// Typed as `Messages`, so the compiler enforces exact key parity with en.ts:
// a missing key OR an extra key is a build error. Values are free text.
import type { Messages } from "./en";

export const zhTW: Messages = {
  // 命令面板名稱
  "command.login": "密鑰：登入目前的提供方",
  "command.logout": "密鑰：從目前的提供方登出",
  "command.clearCache": "密鑰：清除快取",
  "command.saveSelection": "密鑰：將選取內容儲存為密鑰",
  "command.insertPlaceholder": "密鑰：插入佔位符",
  "command.browseInsert": "密鑰：瀏覽並插入佔位符",
  "command.browseCopy": "密鑰：瀏覽並複製值",
  "command.copyUnderCursor": "密鑰：複製游標處的密鑰",
  "command.openIndex": "密鑰：開啟佔位符索引",

  // 通知
  "notice.noProviderConfigured": "未設定提供方",
  "notice.loggedOut": "{provider}：已登出",
  "notice.cacheCleared": "密鑰快取已清除",
  "notice.logInFirst": "{provider}：請先登入",
  "notice.savedTo": "已儲存到 {ref}",
  "notice.saveFailed": "儲存失敗：{msg}",
  "notice.secretCopied": "密鑰已複製到剪貼簿",
  "notice.readFailed": "讀取失敗：{msg}",
  "notice.noPlaceholderUnderCursor": "游標處沒有佔位符",

  // 設定 — 顯示部分
  "settings.displayHeading": "顯示",
  "settings.maskMode.name": "遮罩模式",
  "settings.maskMode.desc":
    "解析後的密鑰是否預設隱藏。無論此設定為何，磁碟上的佔位符文字永遠不是真實密鑰。",
  "settings.maskMode.never": "永不（預設）",
  "settings.maskMode.always": "總是",
  "settings.maskMode.manual": "手動（遮罩，點按顯示）",
  "settings.clickAction.name": "點按動作",
  "settings.clickAction.desc": "單擊已解析密鑰時的動作。",
  "settings.modifierClickAction.name": "修飾鍵點按動作",
  "settings.modifierClickAction.desc": "Ctrl/Cmd + 單擊時的動作。",
  "settings.click.copy": "複製",
  "settings.click.toggleMask": "切換遮罩",
  "settings.click.none": "不執行任何動作",
  "settings.maskCharacter.name": "遮罩字元",

  // 設定 — 提供方部分
  "settings.providersHeading": "提供方",
  "settings.provider.enabledDesc":
    "設定、狀態列與 {example} 佔位符皆已啟用。",
  "settings.provider.disabledDesc":
    "已停用。沒有設定、佔位符或自動完成。",
  "settings.statusBar.name": "狀態列",
  "settings.statusBar.desc":
    "選擇哪些提供方在狀態列中顯示為標籤。全部不勾選則顯示所有已啟用的提供方。",
  "settings.statusBar.show": "顯示 {name}",

  // 設定 — 語言部分
  "settings.language.name": "語言",
  "settings.language.desc":
    "介面語言。命令面板名稱會在重新載入外掛後更新。",
  "settings.language.auto": "自動（跟隨 Obsidian）",

  // 共用按鈕
  "button.cancel": "取消",
  "button.save": "儲存",
  "button.ok": "確定",
  "button.logIn": "登入",
  "button.logOut": "登出",

  // 右鍵選單
  "contextMenu.saveSelectionTo": "將選取內容儲存到 {provider}",
  "contextMenu.copyResolvedValue": "複製解析後的值",
  "contextMenu.editSecretValue": "編輯密鑰值…",
  "contextMenu.replaceWithResolved": "替換為解析後的值…",
  "contextMenu.noActiveFile": "沒有可供替換的作用中檔案",
  "contextMenu.placeholderReplaced": "佔位符已替換",
  "contextMenu.confirmReplace.title": "將密鑰寫入檔案？",
  "contextMenu.confirmReplace.body":
    "替換此佔位符會將密鑰（{preview}）以純文字形式內嵌寫入此筆記。在某些工作流程中這是刻意為之，但它會破壞本外掛的主要用途——磁碟上的 .md 檔案將包含該憑證。",
  "contextMenu.confirmReplace.placeholder": "佔位符：{ref}",
  "contextMenu.confirmReplace.replaceInline": "內嵌替換",

  // 編輯密鑰模態視窗
  "modal.editSecret.title": "編輯密鑰值",
  "modal.editSecret.desc":
    "僅更新後端密鑰——筆記中的佔位符文字保持不變。",
  "modal.editSecret.provider": "提供方：{provider}",
  "modal.editSecret.placeholder": "佔位符：{ref}",
  "modal.editSecret.currentValue": "目前的值",
  "modal.editSecret.clickToLoad": "（點按載入）",
  "modal.editSecret.showHide": "顯示 / 隱藏目前的值",
  "modal.editSecret.loading": "載入中…",
  "modal.editSecret.error": "（錯誤：{msg}）",
  "modal.editSecret.newValue": "新值",
  "modal.editSecret.newValuePlaceholder": "新的密鑰值",
  "modal.editSecret.enterValueFirst": "請先輸入新值",
  "modal.editSecret.updated": "已更新 {ref}",
  "modal.editSecret.writeFailed": "寫入失敗：{msg}",

  // 權杖輸入模態視窗
  "modal.token.title": "貼上權杖",
  "modal.token.desc":
    "貼上來自提供方的驗證權杖。若使用 OpenBao，執行 `bao login -method=oidc role=obsidian` 或從 Web UI 複製。",
  "modal.token.placeholder": "權杖...",

  // 參照編輯模態視窗
  "modal.refEditor.title": "密鑰位置（{provider}）",
  "modal.refEditor.optional": "{label}（選填）",

  // 密鑰瀏覽模態視窗
  "modal.secretBrowser.searchPlaceholder": "搜尋密鑰…",

  // 密鑰內嵌元素
  "span.reLogin": "重新登入",
  "span.copyFailed": "複製失敗",

  // 驗證狀態列
  "auth.checking": "檢查中…",
  "auth.loggedIn": "已登入",
  "auth.notLoggedIn": "未登入",
  "auth.ttl": "TTL {ttl}",

  // 側邊欄
  "sidebar.displayName": "密鑰佔位符",
  "sidebar.title": "佔位符索引",
  "sidebar.count": "  {refs} 個唯一 · {uses} 次使用",
  "sidebar.rescan": "重新掃描儲存庫",
  "sidebar.filter": "篩選…",
  "sidebar.empty": "此儲存庫中未找到佔位符。",
  "sidebar.groupHeader": "{provider}  （{refs} 個唯一 · {uses} 次使用）",
  "sidebar.editSecret": "編輯密鑰值",
  "sidebar.providerNotEnabled": "提供方 '{provider}' 未啟用",
  "sidebar.parseError": "無法解析佔位符",
  "sidebar.openFailed": "無法開啟 Secret Placeholders 側邊欄",

  // 提供方 — Bitwarden
  "provider.bitwarden.serverNotSet":
    "Bitwarden：請先在設定中填寫伺服器 URL",
  "provider.bitwarden.sessionRestored": "Bitwarden 工作階段已還原",
  "provider.bitwarden.restoreFailed":
    "無法還原 Bitwarden 工作階段：{msg}。請使用「登入」以主密碼登入。",
  "provider.bitwarden.unlockSession": "解鎖 Bitwarden 工作階段",
  "provider.bitwarden.setUnlockPassphrase":
    "為此裝置設定解鎖通關密語",
  "provider.bitwarden.loggedIn": "Bitwarden：已登入",
  "provider.bitwarden.loginFailed": "Bitwarden 登入失敗：{msg}",
  "provider.bitwarden.serverHeading": "Bitwarden / Vaultwarden",
  "provider.bitwarden.serverUrl.name": "伺服器 URL",
  "provider.bitwarden.serverUrl.desc":
    "Vaultwarden 執行個體，例如 https://vw.example.com。Bitwarden 雲端請使用 https://vault.bitwarden.com（美國）或 https://vault.bitwarden.eu（歐盟）。",
  "provider.bitwarden.email.name": "電子郵件",
  "provider.bitwarden.cacheTtl.name": "快取 TTL（秒）",
  "provider.bitwarden.cacheTtl.desc":
    "解密後的密文清單在記憶體中保留多久。",
  "provider.bitwarden.rememberSession.name": "在此裝置上記住工作階段",
  "provider.bitwarden.rememberSession.desc":
    "登入時，用通關密語加密使用者金鑰 + 重新整理權杖並儲存到磁碟。下次啟動 Obsidian 時將提示輸入通關密語而非主密碼。預設關閉。",

  // 提供方 — Bitwarden 登入模態視窗
  "provider.bitwarden.loginTitle": "登入 Bitwarden / Vaultwarden",
  "provider.bitwarden.loginServer": "伺服器：{server}",
  "provider.bitwarden.loginServerUnset": "（請先在設定中填寫伺服器 URL）",
  "provider.bitwarden.loginMasterPasswordHint":
    "您的主密碼在本機用於衍生金鑰；只有衍生出的雜湊會傳送到伺服器。",
  "provider.bitwarden.emailField": "電子郵件",
  "provider.bitwarden.masterPassword": "主密碼",
  "provider.bitwarden.loggingIn": "登入中…",
  "provider.bitwarden.twoFactorTitle": "兩步驟驗證",
  "provider.bitwarden.twoFactorHint":
    "輸入驗證器應用程式中的 6 位數驗證碼以完成登入。",
  "provider.bitwarden.code": "驗證碼",
  "provider.bitwarden.verify": "驗證",
  "provider.bitwarden.verifying": "驗證中…",
  "provider.bitwarden.newDeviceTitle": "新裝置驗證",
  "provider.bitwarden.newDeviceHint":
    "Bitwarden 已向 {email} 寄送了一組 6 位數驗證碼。將其貼到下方以完成登入。這是針對此裝置的一次性檢查。",

  // 提供方 — OpenBao
  "provider.openbao.loginOkPolicies": "OpenBao 登入成功 - 政策：{policies}",
  "provider.openbao.loginOk": "OpenBao 登入成功",
  "provider.openbao.policiesNone": "（無）",
  "provider.openbao.oidcLoginFailed": "OIDC 登入失敗：{msg}",
  "provider.openbao.tokenRejected": "OpenBao 權杖遭拒：{msg}",
  "provider.openbao.heading": "OpenBao / Vault",
  "provider.openbao.pasteToken": "貼上權杖",
  "provider.openbao.serverAddress.name": "伺服器位址",
  "provider.openbao.serverAddress.desc":
    "OpenBao 伺服器的基礎 URL。結尾不帶斜線。",
  "provider.openbao.oidcRole.name": "OIDC 角色",
  "provider.openbao.defaultMount.name": "預設掛載點",
  "provider.openbao.defaultPathPrefix.name": "預設路徑前綴",
  "provider.openbao.defaultPathPrefix.desc":
    '例如 "obsidian/" - 會加到建議的密鑰路徑前面。',
  "provider.openbao.cacheTtl.name": "快取 TTL（秒）",
  "provider.openbao.cacheTtl.desc":
    "解析後的密鑰在記憶體中保留多久。",
  "provider.openbao.rememberToken.name": "在此裝置上記住權杖",
  "provider.openbao.rememberToken.desc":
    "用通關密語加密權杖並儲存在外掛資料中。",

  // 提供方 — 1Password
  "provider.onepassword.loggedIn": "1Password Connect：已登入",
  "provider.onepassword.tokenRejected":
    "1Password Connect：權杖遭拒（{msg}）",
  "provider.onepassword.heading": "1Password Connect",
  "provider.onepassword.serverUrl.name": "Connect 伺服器 URL",
  "provider.onepassword.serverUrl.desc":
    "您自架的 1Password Connect 伺服器的基礎 URL。",
  "provider.onepassword.defaultVault.name": "預設保管庫",
  "provider.onepassword.defaultVault.desc":
    "用作新佔位符預設值的保管庫名稱或 id。留空以掃描所有保管庫。",
  "provider.onepassword.cacheTtl.name": "快取 TTL（秒）",
  "provider.onepassword.cacheTtl.desc":
    "解析後的 1Password 項目在記憶體中保留多久。",

  // 提供方 — 面向使用者的錯誤訊息（透過通知顯示）
  "provider.onepassword.notLoggedIn": "尚未登入 1Password",
  "provider.onepassword.urlNotConfigured":
    "未設定 1Password Connect URL",
  "provider.openbao.notLoggedIn": "尚未登入 OpenBao",
  "provider.openbao.oidc.noAuthUrl": "OpenBao 未傳回 auth_url",
  "provider.openbao.oidc.noClientToken":
    "回呼回應中不包含 client_token",
  "provider.openbao.oidc.missingParams":
    "回呼缺少 state/code 查詢參數",
  "provider.openbao.oidc.timeout": "OIDC 回呼在 {sec} 秒後逾時",
  "provider.bitwarden.serverUrlNotSet": "尚未設定 Bitwarden 伺服器 URL",
  "provider.bitwarden.deviceVerifCancelled": "裝置驗證已取消",
  "provider.bitwarden.twoFactorCancelled": "兩步驟驗證已取消",
  "provider.bitwarden.loginRetriesExhausted": "登入重試次數已用盡",
  "provider.bitwarden.totpNotEnabled":
    "需要兩步驟驗證，但此帳戶未啟用 TOTP（提供方：{providers}）。請在 Bitwarden Web 保管庫中啟用 TOTP，或等待外掛支援其他方式。",
};
