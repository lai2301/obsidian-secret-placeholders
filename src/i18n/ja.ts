// Japanese message catalogue.
//
// Typed as `Messages`, so the compiler enforces exact key parity with en.ts:
// a missing key OR an extra key is a build error. Values are free text.
import type { Messages } from "./en";

export const ja: Messages = {
  // コマンドパレット名
  "command.login": "シークレット: アクティブなプロバイダーにログイン",
  "command.logout": "シークレット: アクティブなプロバイダーからログアウト",
  "command.clearCache": "シークレット: キャッシュをクリア",
  "command.saveSelection": "シークレット: 選択範囲をシークレットとして保存",
  "command.insertPlaceholder": "シークレット: プレースホルダーを挿入",
  "command.browseInsert": "シークレット: 参照してプレースホルダーを挿入",
  "command.browseCopy": "シークレット: 参照して値をコピー",
  "command.copyUnderCursor": "シークレット: カーソル位置のシークレットをコピー",
  "command.openIndex": "シークレット: プレースホルダー索引を開く",

  // 通知
  "notice.noProviderConfigured": "プロバイダーが設定されていません",
  "notice.loggedOut": "{provider}: ログアウトしました",
  "notice.cacheCleared": "シークレットキャッシュをクリアしました",
  "notice.logInFirst": "{provider}: 先にログインしてください",
  "notice.savedTo": "{ref} に保存しました",
  "notice.saveFailed": "保存に失敗しました: {msg}",
  "notice.secretCopied": "シークレットをクリップボードにコピーしました",
  "notice.readFailed": "読み取りに失敗しました: {msg}",
  "notice.noPlaceholderUnderCursor": "カーソル位置にプレースホルダーがありません",

  // 設定 — 表示セクション
  "settings.displayHeading": "表示",
  "settings.maskMode.name": "マスクモード",
  "settings.maskMode.desc":
    "解決されたシークレットを既定で隠すかどうか。この設定に関わらず、ディスク上のプレースホルダーのテキストがシークレットそのものになることはありません。",
  "settings.maskMode.never": "しない（既定）",
  "settings.maskMode.always": "常に",
  "settings.maskMode.manual": "手動（マスク、クリックで表示）",
  "settings.clickAction.name": "クリック時の動作",
  "settings.clickAction.desc": "解決されたシークレットをシングルクリックしたときの動作。",
  "settings.modifierClickAction.name": "修飾キー + クリック時の動作",
  "settings.modifierClickAction.desc": "Ctrl/Cmd + シングルクリック時の動作。",
  "settings.click.copy": "コピー",
  "settings.click.toggleMask": "マスクの切り替え",
  "settings.click.none": "何もしない",
  "settings.maskCharacter.name": "マスク文字",

  // 設定 — プロバイダーセクション
  "settings.providersHeading": "プロバイダー",
  "settings.provider.enabledDesc":
    "設定、ステータスバー、{example} プレースホルダーが有効です。",
  "settings.provider.disabledDesc":
    "無効。設定、プレースホルダー、オートコンプリートはありません。",
  "settings.statusBar.name": "ステータスバー",
  "settings.statusBar.desc":
    "ステータスバーにチップとして表示するプロバイダーを選択します。すべてオフにすると、有効なすべてのプロバイダーが表示されます。",
  "settings.statusBar.show": "{name} を表示",

  // 設定 — 言語セクション
  "settings.language.name": "言語",
  "settings.language.desc":
    "インターフェースの言語。コマンドパレット名はプラグインの再読み込み後に更新されます。",
  "settings.language.auto": "自動（Obsidian に合わせる）",

  // 共有ボタン
  "button.cancel": "キャンセル",
  "button.save": "保存",
  "button.ok": "OK",
  "button.logIn": "ログイン",
  "button.logOut": "ログアウト",

  // コンテキストメニュー
  "contextMenu.saveSelectionTo": "選択範囲を {provider} に保存",
  "contextMenu.copyResolvedValue": "解決された値をコピー",
  "contextMenu.editSecretValue": "シークレットの値を編集…",
  "contextMenu.replaceWithResolved": "解決された値で置換…",
  "contextMenu.noActiveFile": "置換対象のアクティブなファイルがありません",
  "contextMenu.placeholderReplaced": "プレースホルダーを置換しました",
  "contextMenu.confirmReplace.title": "シークレットをファイルに書き込みますか？",
  "contextMenu.confirmReplace.body":
    "このプレースホルダーを置換すると、シークレット（{preview}）がこのノートにプレーンテキストとしてインラインで書き込まれます。一部のワークフローでは意図的ですが、プラグインの主目的を損ないます——ディスク上の .md ファイルに認証情報が含まれることになります。",
  "contextMenu.confirmReplace.placeholder": "プレースホルダー: {ref}",
  "contextMenu.confirmReplace.replaceInline": "インラインで置換",

  // シークレット編集モーダル
  "modal.editSecret.title": "シークレットの値を編集",
  "modal.editSecret.desc":
    "バックエンドのシークレットのみを更新します——ノート内のプレースホルダーのテキストは変わりません。",
  "modal.editSecret.provider": "プロバイダー: {provider}",
  "modal.editSecret.placeholder": "プレースホルダー: {ref}",
  "modal.editSecret.currentValue": "現在の値",
  "modal.editSecret.clickToLoad": "（クリックして読み込み）",
  "modal.editSecret.showHide": "現在の値を表示 / 非表示",
  "modal.editSecret.loading": "読み込み中…",
  "modal.editSecret.error": "（エラー: {msg}）",
  "modal.editSecret.newValue": "新しい値",
  "modal.editSecret.newValuePlaceholder": "新しいシークレットの値",
  "modal.editSecret.enterValueFirst": "先に新しい値を入力してください",
  "modal.editSecret.updated": "{ref} を更新しました",
  "modal.editSecret.writeFailed": "書き込みに失敗しました: {msg}",

  // トークン入力モーダル
  "modal.token.title": "トークンを貼り付け",
  "modal.token.desc":
    "プロバイダーの認証トークンを貼り付けます。OpenBao の場合は `bao login -method=oidc role=obsidian` を実行するか、Web UI からコピーしてください。",
  "modal.token.placeholder": "トークン...",

  // 参照編集モーダル
  "modal.refEditor.title": "シークレットの場所（{provider}）",
  "modal.refEditor.optional": "{label}（任意）",

  // シークレットブラウザーモーダル
  "modal.secretBrowser.searchPlaceholder": "シークレットを検索…",

  // シークレットスパン
  "span.reLogin": "再ログイン",
  "span.copyFailed": "コピーに失敗しました",

  // 認証ステータス行
  "auth.checking": "確認中…",
  "auth.loggedIn": "ログイン済み",
  "auth.notLoggedIn": "未ログイン",
  "auth.ttl": "TTL {ttl}",

  // サイドバー
  "sidebar.displayName": "シークレットプレースホルダー",
  "sidebar.title": "プレースホルダー索引",
  "sidebar.count": "  ユニーク {refs} 件 · 使用 {uses} 回",
  "sidebar.rescan": "保管庫を再スキャン",
  "sidebar.filter": "フィルター…",
  "sidebar.empty": "この保管庫にプレースホルダーは見つかりませんでした。",
  "sidebar.groupHeader": "{provider}  （ユニーク {refs} 件 · 使用 {uses} 回）",
  "sidebar.editSecret": "シークレットの値を編集",
  "sidebar.providerNotEnabled": "プロバイダー '{provider}' は有効ではありません",
  "sidebar.parseError": "プレースホルダーを解析できませんでした",
  "sidebar.openFailed": "Secret Placeholders サイドバーを開けませんでした",

  // プロバイダー — Bitwarden
  "provider.bitwarden.serverNotSet":
    "Bitwarden: 先に設定でサーバー URL を指定してください",
  "provider.bitwarden.sessionRestored": "Bitwarden セッションを復元しました",
  "provider.bitwarden.restoreFailed":
    "Bitwarden セッションを復元できませんでした: {msg}。「ログイン」からマスターパスワードでサインインしてください。",
  "provider.bitwarden.unlockSession": "Bitwarden セッションのロック解除",
  "provider.bitwarden.setUnlockPassphrase":
    "このデバイスのロック解除パスフレーズを設定",
  "provider.bitwarden.loggedIn": "Bitwarden: ログインしました",
  "provider.bitwarden.loginFailed": "Bitwarden のログインに失敗しました: {msg}",
  "provider.bitwarden.serverHeading": "Bitwarden / Vaultwarden",
  "provider.bitwarden.serverUrl.name": "サーバー URL",
  "provider.bitwarden.serverUrl.desc":
    "Vaultwarden インスタンス、例: https://vw.example.com。Bitwarden クラウドの場合は https://vault.bitwarden.com（米国）または https://vault.bitwarden.eu（EU）を使用します。",
  "provider.bitwarden.email.name": "メールアドレス",
  "provider.bitwarden.cacheTtl.name": "キャッシュ TTL（秒）",
  "provider.bitwarden.cacheTtl.desc":
    "復号された暗号リストをメモリに保持する時間。",
  "provider.bitwarden.rememberSession.name": "このデバイスでセッションを記憶する",
  "provider.bitwarden.rememberSession.desc":
    "ログイン時に、ユーザーキー + リフレッシュトークンをパスフレーズで暗号化してディスクに保存します。次回 Obsidian 起動時には、マスターパスワードの代わりにパスフレーズの入力を求められます。既定ではオフです。",

  // プロバイダー — Bitwarden ログインモーダル
  "provider.bitwarden.loginTitle": "Bitwarden / Vaultwarden にログイン",
  "provider.bitwarden.loginServer": "サーバー: {server}",
  "provider.bitwarden.loginServerUnset": "（先に設定でサーバー URL を指定してください）",
  "provider.bitwarden.loginMasterPasswordHint":
    "マスターパスワードはローカルでキーの導出に使用され、サーバーには導出されたハッシュのみが送信されます。",
  "provider.bitwarden.emailField": "メールアドレス",
  "provider.bitwarden.masterPassword": "マスターパスワード",
  "provider.bitwarden.loggingIn": "ログイン中…",
  "provider.bitwarden.twoFactorTitle": "二要素認証",
  "provider.bitwarden.twoFactorHint":
    "ログインを完了するには、認証アプリの 6 桁のコードを入力してください。",
  "provider.bitwarden.code": "コード",
  "provider.bitwarden.verify": "確認",
  "provider.bitwarden.verifying": "確認中…",
  "provider.bitwarden.newDeviceTitle": "新しいデバイスの確認",
  "provider.bitwarden.newDeviceHint":
    "Bitwarden が {email} に 6 桁のコードをメールで送信しました。下に貼り付けてログインを完了してください。これはこのデバイスに対する 1 回限りの確認です。",

  // プロバイダー — OpenBao
  "provider.openbao.loginOkPolicies": "OpenBao ログイン成功 - ポリシー: {policies}",
  "provider.openbao.loginOk": "OpenBao ログイン成功",
  "provider.openbao.policiesNone": "（なし）",
  "provider.openbao.oidcLoginFailed": "OIDC ログインに失敗しました: {msg}",
  "provider.openbao.tokenRejected": "OpenBao トークンが拒否されました: {msg}",
  "provider.openbao.heading": "OpenBao / Vault",
  "provider.openbao.pasteToken": "トークンを貼り付け",
  "provider.openbao.serverAddress.name": "サーバーアドレス",
  "provider.openbao.serverAddress.desc":
    "OpenBao サーバーのベース URL。末尾にスラッシュは付けません。",
  "provider.openbao.oidcRole.name": "OIDC ロール",
  "provider.openbao.defaultMount.name": "既定のマウント",
  "provider.openbao.defaultPathPrefix.name": "既定のパスプレフィックス",
  "provider.openbao.defaultPathPrefix.desc":
    '例: "obsidian/" - 提案されるシークレットパスの先頭に付加されます。',
  "provider.openbao.cacheTtl.name": "キャッシュ TTL（秒）",
  "provider.openbao.cacheTtl.desc":
    "解決されたシークレットをメモリに保持する時間。",
  "provider.openbao.rememberToken.name": "このデバイスでトークンを記憶する",
  "provider.openbao.rememberToken.desc":
    "トークンをパスフレーズで暗号化してプラグインデータに保存します。",

  // プロバイダー — 1Password
  "provider.onepassword.loggedIn": "1Password Connect: ログインしました",
  "provider.onepassword.tokenRejected":
    "1Password Connect: トークンが拒否されました（{msg}）",
  "provider.onepassword.heading": "1Password Connect",
  "provider.onepassword.serverUrl.name": "Connect サーバー URL",
  "provider.onepassword.serverUrl.desc":
    "セルフホストの 1Password Connect サーバーのベース URL。",
  "provider.onepassword.defaultVault.name": "既定のボールト",
  "provider.onepassword.defaultVault.desc":
    "新しいプレースホルダーの既定として使用するボールト名または id。空欄にするとすべてのボールトをスキャンします。",
  "provider.onepassword.cacheTtl.name": "キャッシュ TTL（秒）",
  "provider.onepassword.cacheTtl.desc":
    "解決された 1Password アイテムをメモリに保持する時間。",

  // プロバイダー — ユーザー向けエラーメッセージ（通知で表示）
  "provider.onepassword.notLoggedIn": "1Password にログインしていません",
  "provider.onepassword.urlNotConfigured":
    "1Password Connect URL が設定されていません",
  "provider.openbao.notLoggedIn": "OpenBao にログインしていません",
  "provider.openbao.oidc.noAuthUrl": "OpenBao が auth_url を返しませんでした",
  "provider.openbao.oidc.noClientToken":
    "コールバック応答に client_token が含まれていませんでした",
  "provider.openbao.oidc.missingParams":
    "コールバックに state/code クエリパラメーターがありません",
  "provider.openbao.oidc.timeout": "OIDC コールバックが {sec} 秒後にタイムアウトしました",
  "provider.bitwarden.serverUrlNotSet": "Bitwarden サーバー URL が設定されていません",
  "provider.bitwarden.deviceVerifCancelled": "デバイスの確認がキャンセルされました",
  "provider.bitwarden.twoFactorCancelled": "二要素認証がキャンセルされました",
  "provider.bitwarden.loginRetriesExhausted": "ログインの再試行回数を使い切りました",
  "provider.bitwarden.totpNotEnabled":
    "二要素認証が必要ですが、このアカウントでは TOTP が有効になっていません（プロバイダー: {providers}）。Bitwarden Web ボールトで TOTP を有効にするか、他の方式へのプラグイン対応をお待ちください。",
};
