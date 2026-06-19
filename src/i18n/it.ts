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
};
