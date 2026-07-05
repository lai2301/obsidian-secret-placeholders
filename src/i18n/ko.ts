// Korean message catalogue.
//
// Typed as `Messages`, so the compiler enforces exact key parity with en.ts:
// a missing key OR an extra key is a build error. Values are free text.
import type { Messages } from "./en";

export const ko: Messages = {
  // 명령어 팔레트 이름
  "command.login": "시크릿: 활성 제공자에 로그인",
  "command.logout": "시크릿: 활성 제공자에서 로그아웃",
  "command.clearCache": "시크릿: 캐시 지우기",
  "command.saveSelection": "시크릿: 선택 항목을 시크릿으로 저장",
  "command.insertPlaceholder": "시크릿: 플레이스홀더 삽입",
  "command.browseInsert": "시크릿: 찾아보고 플레이스홀더 삽입",
  "command.browseCopy": "시크릿: 찾아보고 값 복사",
  "command.copyUnderCursor": "시크릿: 커서 위치의 시크릿 복사",
  "command.openIndex": "시크릿: 플레이스홀더 색인 열기",

  // 알림
  "notice.noProviderConfigured": "구성된 제공자가 없습니다",
  "notice.loggedOut": "{provider}: 로그아웃되었습니다",
  "notice.cacheCleared": "시크릿 캐시를 지웠습니다",
  "notice.logInFirst": "{provider}: 먼저 로그인하세요",
  "notice.savedTo": "{ref}에 저장했습니다",
  "notice.saveFailed": "저장 실패: {msg}",
  "notice.secretCopied": "시크릿을 클립보드에 복사했습니다",
  "notice.readFailed": "읽기 실패: {msg}",
  "notice.noPlaceholderUnderCursor": "커서 위치에 플레이스홀더가 없습니다",

  // 설정 — 표시 섹션
  "settings.displayHeading": "표시",
  "settings.maskMode.name": "마스크 모드",
  "settings.maskMode.desc":
    "확인된 시크릿을 기본적으로 숨길지 여부입니다. 이 설정과 관계없이 디스크의 플레이스홀더 텍스트는 절대 실제 시크릿이 아닙니다.",
  "settings.maskMode.never": "안 함(기본값)",
  "settings.maskMode.always": "항상",
  "settings.maskMode.manual": "수동(마스크, 클릭하여 표시)",
  "settings.clickAction.name": "클릭 동작",
  "settings.clickAction.desc": "확인된 시크릿을 한 번 클릭할 때의 동작입니다.",
  "settings.modifierClickAction.name": "수정자 키 클릭 동작",
  "settings.modifierClickAction.desc": "Ctrl/Cmd + 한 번 클릭 시의 동작입니다.",
  "settings.click.copy": "복사",
  "settings.click.toggleMask": "마스크 전환",
  "settings.click.none": "아무 작업 안 함",
  "settings.maskCharacter.name": "마스크 문자",

  // 설정 — 제공자 섹션
  "settings.providersHeading": "제공자",
  "settings.provider.enabledDesc":
    "설정, 상태 표시줄, {example} 플레이스홀더가 활성화되어 있습니다.",
  "settings.provider.disabledDesc":
    "비활성화됨. 설정, 플레이스홀더, 자동 완성이 없습니다.",
  "settings.statusBar.name": "상태 표시줄",
  "settings.statusBar.desc":
    "상태 표시줄에 칩으로 표시할 제공자를 선택하세요. 모두 선택 해제하면 활성화된 모든 제공자가 표시됩니다.",
  "settings.statusBar.show": "{name} 표시",

  // 설정 — 언어 섹션
  "settings.language.name": "언어",
  "settings.language.desc":
    "인터페이스 언어입니다. 명령어 팔레트 이름은 플러그인을 다시 로드한 후 업데이트됩니다.",
  "settings.language.auto": "자동(Obsidian에 맞춤)",

  // 공용 버튼
  "button.cancel": "취소",
  "button.save": "저장",
  "button.ok": "확인",
  "button.logIn": "로그인",
  "button.logOut": "로그아웃",

  // 컨텍스트 메뉴
  "contextMenu.saveSelectionTo": "선택 항목을 {provider}에 저장",
  "contextMenu.copyResolvedValue": "확인된 값 복사",
  "contextMenu.editSecretValue": "시크릿 값 편집…",
  "contextMenu.replaceWithResolved": "확인된 값으로 바꾸기…",
  "contextMenu.noActiveFile": "바꿀 활성 파일이 없습니다",
  "contextMenu.placeholderReplaced": "플레이스홀더를 바꿨습니다",
  "contextMenu.confirmReplace.title": "시크릿을 파일에 쓰시겠습니까?",
  "contextMenu.confirmReplace.body":
    "이 플레이스홀더를 바꾸면 시크릿({preview})이 이 노트에 일반 텍스트로 인라인 기록됩니다. 일부 워크플로에서는 의도적이지만 플러그인의 주요 목적을 무력화합니다——디스크의 .md 파일에 자격 증명이 포함됩니다.",
  "contextMenu.confirmReplace.placeholder": "플레이스홀더: {ref}",
  "contextMenu.confirmReplace.replaceInline": "인라인으로 바꾸기",

  // 시크릿 편집 모달
  "modal.editSecret.title": "시크릿 값 편집",
  "modal.editSecret.desc":
    "백엔드 시크릿만 업데이트합니다——노트의 플레이스홀더 텍스트는 그대로 유지됩니다.",
  "modal.editSecret.provider": "제공자: {provider}",
  "modal.editSecret.placeholder": "플레이스홀더: {ref}",
  "modal.editSecret.currentValue": "현재 값",
  "modal.editSecret.clickToLoad": "(클릭하여 불러오기)",
  "modal.editSecret.showHide": "현재 값 표시 / 숨기기",
  "modal.editSecret.loading": "불러오는 중…",
  "modal.editSecret.error": "(오류: {msg})",
  "modal.editSecret.newValue": "새 값",
  "modal.editSecret.newValuePlaceholder": "새 시크릿 값",
  "modal.editSecret.enterValueFirst": "먼저 새 값을 입력하세요",
  "modal.editSecret.updated": "{ref}을(를) 업데이트했습니다",
  "modal.editSecret.writeFailed": "쓰기 실패: {msg}",

  // 토큰 입력 모달
  "modal.token.title": "토큰 붙여넣기",
  "modal.token.desc":
    "제공자의 인증 토큰을 붙여넣으세요. OpenBao의 경우 `bao login -method=oidc role=obsidian`을 실행하거나 웹 UI에서 복사하세요.",
  "modal.token.placeholder": "토큰...",

  // 참조 편집 모달
  "modal.refEditor.title": "시크릿 위치({provider})",
  "modal.refEditor.optional": "{label}(선택 사항)",

  // 시크릿 브라우저 모달
  "modal.secretBrowser.searchPlaceholder": "시크릿 검색…",

  // 시크릿 스팬
  "span.reLogin": "다시 로그인",
  "span.copyFailed": "복사 실패",

  // 인증 상태 행
  "auth.checking": "확인 중…",
  "auth.loggedIn": "로그인됨",
  "auth.notLoggedIn": "로그인되지 않음",
  "auth.ttl": "TTL {ttl}",

  // 사이드바
  "sidebar.displayName": "시크릿 플레이스홀더",
  "sidebar.title": "플레이스홀더 색인",
  "sidebar.count": "  고유 {refs}개 · 사용 {uses}회",
  "sidebar.rescan": "보관함 다시 스캔",
  "sidebar.filter": "필터…",
  "sidebar.empty": "이 보관함에서 플레이스홀더를 찾을 수 없습니다.",
  "sidebar.groupHeader": "{provider}  (고유 {refs}개 · 사용 {uses}회)",
  "sidebar.editSecret": "시크릿 값 편집",
  "sidebar.providerNotEnabled": "제공자 '{provider}'이(가) 활성화되지 않았습니다",
  "sidebar.parseError": "플레이스홀더를 구문 분석할 수 없습니다",
  "sidebar.openFailed": "Secret Placeholders 사이드바를 열 수 없습니다",

  // 제공자 — Bitwarden
  "provider.bitwarden.serverNotSet":
    "Bitwarden: 먼저 설정에서 서버 URL을 지정하세요",
  "provider.bitwarden.sessionRestored": "Bitwarden 세션을 복원했습니다",
  "provider.bitwarden.restoreFailed":
    "Bitwarden 세션을 복원할 수 없습니다: {msg}. '로그인'을 사용하여 마스터 비밀번호로 로그인하세요.",
  "provider.bitwarden.unlockSession": "Bitwarden 세션 잠금 해제",
  "provider.bitwarden.setUnlockPassphrase":
    "이 기기의 잠금 해제 암호구 설정",
  "provider.bitwarden.loggedIn": "Bitwarden: 로그인했습니다",
  "provider.bitwarden.loginFailed": "Bitwarden 로그인 실패: {msg}",
  "provider.bitwarden.serverHeading": "Bitwarden / Vaultwarden",
  "provider.bitwarden.serverUrl.name": "서버 URL",
  "provider.bitwarden.serverUrl.desc":
    "Vaultwarden 인스턴스, 예: https://vw.example.com. Bitwarden 클라우드의 경우 https://vault.bitwarden.com(미국) 또는 https://vault.bitwarden.eu(EU)를 사용하세요.",
  "provider.bitwarden.email.name": "이메일",
  "provider.bitwarden.cacheTtl.name": "캐시 TTL(초)",
  "provider.bitwarden.cacheTtl.desc":
    "복호화된 암호 목록을 메모리에 유지하는 시간입니다.",
  "provider.bitwarden.rememberSession.name": "이 기기에서 세션 기억",
  "provider.bitwarden.rememberSession.desc":
    "로그인 시 사용자 키 + 리프레시 토큰을 암호구로 암호화하여 디스크에 저장합니다. 다음 Obsidian 시작 시 마스터 비밀번호 대신 암호구를 입력하라는 메시지가 표시됩니다. 기본값은 꺼짐입니다.",

  // 제공자 — Bitwarden 로그인 모달
  "provider.bitwarden.loginTitle": "Bitwarden / Vaultwarden에 로그인",
  "provider.bitwarden.loginServer": "서버: {server}",
  "provider.bitwarden.loginServerUnset": "(먼저 설정에서 서버 URL을 지정하세요)",
  "provider.bitwarden.loginMasterPasswordHint":
    "마스터 비밀번호는 로컬에서 키를 도출하는 데 사용되며, 서버로는 도출된 해시만 전송됩니다.",
  "provider.bitwarden.emailField": "이메일",
  "provider.bitwarden.masterPassword": "마스터 비밀번호",
  "provider.bitwarden.loggingIn": "로그인 중…",
  "provider.bitwarden.twoFactorTitle": "2단계 인증",
  "provider.bitwarden.twoFactorHint":
    "로그인을 완료하려면 인증 앱의 6자리 코드를 입력하세요.",
  "provider.bitwarden.code": "코드",
  "provider.bitwarden.verify": "확인",
  "provider.bitwarden.verifying": "확인 중…",
  "provider.bitwarden.newDeviceTitle": "새 기기 확인",
  "provider.bitwarden.newDeviceHint":
    "Bitwarden이 {email}(으)로 6자리 코드를 이메일로 보냈습니다. 아래에 붙여넣어 로그인을 완료하세요. 이 기기에 대한 일회성 확인입니다.",

  // 제공자 — OpenBao
  "provider.openbao.loginOkPolicies": "OpenBao 로그인 성공 - 정책: {policies}",
  "provider.openbao.loginOk": "OpenBao 로그인 성공",
  "provider.openbao.policiesNone": "(없음)",
  "provider.openbao.oidcLoginFailed": "OIDC 로그인 실패: {msg}",
  "provider.openbao.tokenRejected": "OpenBao 토큰이 거부되었습니다: {msg}",
  "provider.openbao.heading": "OpenBao / Vault",
  "provider.openbao.pasteToken": "토큰 붙여넣기",
  "provider.openbao.serverAddress.name": "서버 주소",
  "provider.openbao.serverAddress.desc":
    "OpenBao 서버의 기본 URL입니다. 끝에 슬래시를 붙이지 마세요.",
  "provider.openbao.oidcRole.name": "OIDC 역할",
  "provider.openbao.defaultMount.name": "기본 마운트",
  "provider.openbao.defaultPathPrefix.name": "기본 경로 접두사",
  "provider.openbao.defaultPathPrefix.desc":
    '예: "obsidian/" - 제안된 시크릿 경로 앞에 붙습니다.',
  "provider.openbao.cacheTtl.name": "캐시 TTL(초)",
  "provider.openbao.cacheTtl.desc":
    "확인된 시크릿을 메모리에 유지하는 시간입니다.",
  "provider.openbao.rememberToken.name": "이 기기에서 토큰 기억",
  "provider.openbao.rememberToken.desc":
    "토큰을 암호구로 암호화하여 플러그인 데이터에 저장합니다.",

  // 제공자 — 1Password
  "provider.onepassword.loggedIn": "1Password Connect: 로그인했습니다",
  "provider.onepassword.tokenRejected":
    "1Password Connect: 토큰이 거부되었습니다({msg})",
  "provider.onepassword.heading": "1Password Connect",
  "provider.onepassword.serverUrl.name": "Connect 서버 URL",
  "provider.onepassword.serverUrl.desc":
    "자체 호스팅 1Password Connect 서버의 기본 URL입니다.",
  "provider.onepassword.defaultVault.name": "기본 보관함",
  "provider.onepassword.defaultVault.desc":
    "새 플레이스홀더의 기본값으로 사용할 보관함 이름 또는 id입니다. 비워 두면 모든 보관함을 스캔합니다.",
  "provider.onepassword.cacheTtl.name": "캐시 TTL(초)",
  "provider.onepassword.cacheTtl.desc":
    "확인된 1Password 항목을 메모리에 유지하는 시간입니다.",

  // 제공자 — 사용자에게 표시되는 오류 메시지(알림으로 표시)
  "provider.onepassword.notLoggedIn": "1Password에 로그인되지 않음",
  "provider.onepassword.urlNotConfigured":
    "1Password Connect URL이 구성되지 않음",
  "provider.openbao.notLoggedIn": "OpenBao에 로그인되지 않음",
  "provider.openbao.oidc.noAuthUrl": "OpenBao가 auth_url을 반환하지 않았습니다",
  "provider.openbao.oidc.noClientToken":
    "콜백 응답에 client_token이 포함되지 않았습니다",
  "provider.openbao.oidc.missingParams":
    "콜백에 state/code 쿼리 매개변수가 없습니다",
  "provider.openbao.oidc.timeout": "OIDC 콜백이 {sec}초 후 시간 초과되었습니다",
  "provider.bitwarden.serverUrlNotSet": "Bitwarden 서버 URL이 설정되지 않았습니다",
  "provider.bitwarden.deviceVerifCancelled": "기기 확인이 취소되었습니다",
  "provider.bitwarden.twoFactorCancelled": "2단계 인증이 취소되었습니다",
  "provider.bitwarden.loginRetriesExhausted": "로그인 재시도 횟수를 모두 사용했습니다",
  "provider.bitwarden.totpNotEnabled":
    "2단계 인증이 필요하지만 이 계정에서 TOTP가 활성화되어 있지 않습니다(제공자: {providers}). Bitwarden 웹 보관함에서 TOTP를 활성화하거나 다른 방식에 대한 플러그인 지원을 기다리세요.",
};
