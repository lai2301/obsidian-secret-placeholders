// Italian message catalogue.
//
// Typed as `Messages`, so the compiler enforces exact key parity with en.ts:
// a missing key OR an extra key is a build error. Values are free text.
import type { Messages } from "./en";

export const it: Messages = {
  // Nomi nella palette dei comandi
  "command.login": "Segreti: Accedi al provider attivo",
  "command.logout": "Segreti: Disconnetti dal provider attivo",
  "command.clearCache": "Segreti: Svuota la cache",
  "command.saveSelection": "Segreti: Salva la selezione come segreto",
  "command.insertPlaceholder": "Segreti: Inserisci placeholder",
  "command.browseInsert": "Segreti: Sfoglia e inserisci placeholder",
  "command.browseCopy": "Segreti: Sfoglia e copia il valore",
  "command.copyUnderCursor": "Segreti: Copia il segreto sotto il cursore",
  "command.openIndex": "Segreti: Apri l'indice dei placeholder",

  // Notifiche
  "notice.noProviderConfigured": "Nessun provider configurato",
  "notice.loggedOut": "{provider}: disconnesso",
  "notice.cacheCleared": "Cache dei segreti svuotata",
  "notice.logInFirst": "{provider}: accedi prima",
  "notice.savedTo": "Salvato in {ref}",
  "notice.saveFailed": "Salvataggio fallito: {msg}",
  "notice.secretCopied": "Segreto copiato negli appunti",
  "notice.readFailed": "Lettura fallita: {msg}",
  "notice.noPlaceholderUnderCursor": "Nessun placeholder sotto il cursore",

  // Impostazioni — sezione Visualizzazione
  "settings.displayHeading": "Visualizzazione",
  "settings.maskMode.name": "Modalità maschera",
  "settings.maskMode.desc":
    "Se i segreti risolti sono nascosti per impostazione predefinita. Il testo del placeholder su disco non è mai il segreto, indipendentemente da questa impostazione.",
  "settings.maskMode.never": "Mai (predefinito)",
  "settings.maskMode.always": "Sempre",
  "settings.maskMode.manual": "Manuale (mascherato, clic per rivelare)",
  "settings.clickAction.name": "Azione al clic",
  "settings.clickAction.desc":
    "Azione per un singolo clic su un segreto risolto.",
  "settings.modifierClickAction.name": "Azione al clic con modificatore",
  "settings.modifierClickAction.desc": "Azione per Ctrl/Cmd + singolo clic.",
  "settings.click.copy": "Copia",
  "settings.click.toggleMask": "Attiva/disattiva maschera",
  "settings.click.none": "Non fare nulla",
  "settings.maskCharacter.name": "Carattere maschera",

  // Impostazioni — sezione Provider
  "settings.providersHeading": "Provider",
  "settings.provider.enabledDesc":
    "Impostazioni, barra di stato e placeholder {example} sono attivi.",
  "settings.provider.disabledDesc":
    "Disabilitato. Nessuna impostazione, nessun placeholder, nessun completamento automatico.",
  "settings.statusBar.name": "Barra di stato",
  "settings.statusBar.desc":
    "Scegli quali provider mostrare come chip nella barra di stato. Lascia tutto deselezionato per mostrare ogni provider abilitato.",
  "settings.statusBar.show": "Mostra {name}",

  // Impostazioni — sezione Lingua
  "settings.language.name": "Lingua",
  "settings.language.desc":
    "Lingua dell'interfaccia. I nomi nella palette dei comandi si aggiornano dopo aver ricaricato il plugin.",
  "settings.language.auto": "Automatica (come Obsidian)",

  // Pulsanti condivisi
  "button.cancel": "Annulla",
  "button.save": "Salva",
  "button.ok": "OK",
  "button.logIn": "Accedi",
  "button.logOut": "Disconnetti",

  // Menu contestuale
  "contextMenu.saveSelectionTo": "Salva la selezione in {provider}",
  "contextMenu.copyResolvedValue": "Copia il valore risolto",
  "contextMenu.editSecretValue": "Modifica il valore del segreto…",
  "contextMenu.replaceWithResolved": "Sostituisci con il valore risolto…",
  "contextMenu.noActiveFile": "Nessun file attivo in cui sostituire",
  "contextMenu.placeholderReplaced": "Placeholder sostituito",
  "contextMenu.confirmReplace.title": "Scrivere il segreto nel file?",
  "contextMenu.confirmReplace.body":
    "Sostituendo questo placeholder il segreto ({preview}) verrà scritto come testo in chiaro in questa nota.  È intenzionale in alcuni flussi di lavoro ma vanifica lo scopo principale del plugin - il file .md su disco conterrà la credenziale.",
  "contextMenu.confirmReplace.placeholder": "Placeholder: {ref}",
  "contextMenu.confirmReplace.replaceInline": "Sostituisci in linea",

  // Modale modifica segreto
  "modal.editSecret.title": "Modifica il valore del segreto",
  "modal.editSecret.desc":
    "Aggiorna solo il segreto sul backend — il testo del placeholder nella nota resta invariato.",
  "modal.editSecret.provider": "Provider: {provider}",
  "modal.editSecret.placeholder": "Placeholder: {ref}",
  "modal.editSecret.currentValue": "Valore attuale",
  "modal.editSecret.clickToLoad": "(clic per caricare)",
  "modal.editSecret.showHide": "Mostra / nascondi il valore attuale",
  "modal.editSecret.loading": "caricamento…",
  "modal.editSecret.error": "(errore: {msg})",
  "modal.editSecret.newValue": "Nuovo valore",
  "modal.editSecret.newValuePlaceholder": "nuovo valore del segreto",
  "modal.editSecret.enterValueFirst": "Inserisci prima un nuovo valore",
  "modal.editSecret.updated": "Aggiornato {ref}",
  "modal.editSecret.writeFailed": "Scrittura fallita: {msg}",

  // Modale incolla token
  "modal.token.title": "Incolla token",
  "modal.token.desc":
    "Incolla un token di autenticazione del tuo provider. Per OpenBao, esegui `bao login -method=oidc role=obsidian` o copialo dalla web UI.",
  "modal.token.placeholder": "token...",

  // Modale editor riferimento
  "modal.refEditor.title": "Posizione del segreto ({provider})",
  "modal.refEditor.optional": "{label} (facoltativo)",

  // Modale browser segreti
  "modal.secretBrowser.searchPlaceholder": "Cerca segreti…",

  // Span segreto
  "span.reLogin": "Accedi di nuovo",
  "span.copyFailed": "Copia fallita",

  // Riga stato autenticazione
  "auth.checking": "Verifica in corso…",
  "auth.loggedIn": "Connesso",
  "auth.notLoggedIn": "Non connesso",
  "auth.ttl": "TTL {ttl}",

  // Barra laterale
  "sidebar.displayName": "Placeholder dei segreti",
  "sidebar.title": "Indice dei placeholder",
  "sidebar.count": "  {refs} unici · {uses} usi",
  "sidebar.rescan": "Ripeti la scansione del vault",
  "sidebar.filter": "Filtra…",
  "sidebar.empty": "Nessun placeholder trovato in questo vault.",
  "sidebar.groupHeader": "{provider}  ({refs} unici · {uses} usi)",
  "sidebar.editSecret": "Modifica il valore del segreto",
  "sidebar.providerNotEnabled": "Il provider '{provider}' non è abilitato",
  "sidebar.parseError": "Impossibile analizzare il placeholder",
  "sidebar.openFailed": "Impossibile aprire la barra laterale di Secret Placeholders",

  // Provider — Bitwarden
  "provider.bitwarden.serverNotSet":
    "Bitwarden: imposta prima l'URL del server nelle impostazioni",
  "provider.bitwarden.sessionRestored": "Sessione Bitwarden ripristinata",
  "provider.bitwarden.restoreFailed":
    "Impossibile ripristinare la sessione Bitwarden: {msg}. Usa 'Accedi' per accedere con la master password.",
  "provider.bitwarden.unlockSession": "Sblocca la sessione Bitwarden",
  "provider.bitwarden.setUnlockPassphrase":
    "Imposta la passphrase di sblocco per questo dispositivo",
  "provider.bitwarden.loggedIn": "Bitwarden: accesso effettuato",
  "provider.bitwarden.loginFailed": "Accesso a Bitwarden fallito: {msg}",
  "provider.bitwarden.serverHeading": "Bitwarden / Vaultwarden",
  "provider.bitwarden.serverUrl.name": "URL del server",
  "provider.bitwarden.serverUrl.desc":
    "Istanza Vaultwarden, es. https://vw.example.com. Per Bitwarden cloud usa https://vault.bitwarden.com (US) o https://vault.bitwarden.eu (EU).",
  "provider.bitwarden.email.name": "Email",
  "provider.bitwarden.cacheTtl.name": "Cache TTL (secondi)",
  "provider.bitwarden.cacheTtl.desc":
    "Per quanto tempo l'elenco dei cipher decifrati resta in memoria.",
  "provider.bitwarden.rememberSession.name": "Ricorda la sessione su questo dispositivo",
  "provider.bitwarden.rememberSession.desc":
    "All'accesso, cifra la user key + il refresh token con una passphrase e li salva su disco. Al prossimo avvio di Obsidian ti verrà chiesta la passphrase invece della master password. Disattivato per impostazione predefinita.",

  // Provider — modale di accesso Bitwarden
  "provider.bitwarden.loginTitle": "Accedi a Bitwarden / Vaultwarden",
  "provider.bitwarden.loginServer": "Server: {server}",
  "provider.bitwarden.loginServerUnset": "(imposta prima l'URL del server nelle impostazioni)",
  "provider.bitwarden.loginMasterPasswordHint":
    "La tua master password viene usata localmente per derivare le chiavi; al server viene inviato solo un hash derivato.",
  "provider.bitwarden.emailField": "Email",
  "provider.bitwarden.masterPassword": "Master password",
  "provider.bitwarden.loggingIn": "Accesso in corso…",
  "provider.bitwarden.twoFactorTitle": "Autenticazione a due fattori",
  "provider.bitwarden.twoFactorHint":
    "Inserisci il codice a 6 cifre dalla tua app di autenticazione per completare l'accesso.",
  "provider.bitwarden.code": "Codice",
  "provider.bitwarden.verify": "Verifica",
  "provider.bitwarden.verifying": "Verifica in corso…",
  "provider.bitwarden.newDeviceTitle": "Verifica del nuovo dispositivo",
  "provider.bitwarden.newDeviceHint":
    "Bitwarden ha inviato un codice a 6 cifre a {email}.  Incollalo qui sotto per completare l'accesso.  È un controllo una tantum per questo dispositivo.",

  // Provider — OpenBao
  "provider.openbao.loginOkPolicies": "Accesso a OpenBao riuscito - policy: {policies}",
  "provider.openbao.loginOk": "Accesso a OpenBao riuscito",
  "provider.openbao.policiesNone": "(nessuna)",
  "provider.openbao.oidcLoginFailed": "Accesso OIDC fallito: {msg}",
  "provider.openbao.tokenRejected": "Token OpenBao rifiutato: {msg}",
  "provider.openbao.heading": "OpenBao / Vault",
  "provider.openbao.pasteToken": "Incolla token",
  "provider.openbao.serverAddress.name": "Indirizzo del server",
  "provider.openbao.serverAddress.desc":
    "URL di base del server OpenBao. Senza slash finale.",
  "provider.openbao.oidcRole.name": "Ruolo OIDC",
  "provider.openbao.defaultMount.name": "Mount predefinito",
  "provider.openbao.defaultPathPrefix.name": "Prefisso path predefinito",
  "provider.openbao.defaultPathPrefix.desc":
    'es. "obsidian/" - anteposto ai path dei segreti suggeriti.',
  "provider.openbao.cacheTtl.name": "Cache TTL (secondi)",
  "provider.openbao.cacheTtl.desc":
    "Per quanto tempo i segreti risolti restano in memoria.",
  "provider.openbao.rememberToken.name": "Ricorda il token su questo dispositivo",
  "provider.openbao.rememberToken.desc":
    "Cifra il token con una passphrase e lo memorizza nei dati del plugin.",

  // Provider — 1Password
  "provider.onepassword.loggedIn": "1Password Connect: accesso effettuato",
  "provider.onepassword.tokenRejected":
    "1Password Connect: token rifiutato ({msg})",
  "provider.onepassword.heading": "1Password Connect",
  "provider.onepassword.serverUrl.name": "URL del server Connect",
  "provider.onepassword.serverUrl.desc":
    "URL di base del tuo server 1Password Connect self-hosted.",
  "provider.onepassword.defaultVault.name": "Vault predefinito",
  "provider.onepassword.defaultVault.desc":
    "Nome o id del vault usato come predefinito per i nuovi placeholder. Lascia vuoto per scansionare tutti i vault.",
  "provider.onepassword.cacheTtl.name": "Cache TTL (secondi)",
  "provider.onepassword.cacheTtl.desc":
    "Per quanto tempo gli item 1Password risolti restano in memoria.",
};
