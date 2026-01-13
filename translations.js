/* ==========================================================
   i18n strings (8 idiomas, exatamente)
   ========================================================== */

const SUPPORTED_LANGS = ["pt","es","en","fr","de","it","zh","ja"];

const LANG_META = {
  pt: { name: "Portuguese", native: "Português" },
  es: { name: "Spanish", native: "Español" },
  en: { name: "English", native: "English" },
  fr: { name: "French", native: "Français" },
  de: { name: "German", native: "Deutsch" },
  it: { name: "Italian", native: "Italiano" },
  zh: { name: "Chinese", native: "中文" },
  ja: { name: "Japanese", native: "日本語" },
};

const TRANSLATIONS = {
  pt: {
    ui: { language: "Idioma", dark: "Escuro", light: "Claro" },
    labels: {
      weeklyDone: "da semana concluída",
      monthlyDoneTpl: "de {month} concluído",
      yearlyDone: "do ano concluído"
    },
    errors: { paused: "Atualização pausou. Recarregue a página." }
  },
  es: {
    ui: { language: "Idioma", dark: "Oscuro", light: "Claro" },
    labels: {
      weeklyDone: "de la semana completado",
      monthlyDoneTpl: "de {month} completado",
      yearlyDone: "del año completado"
    },
    errors: { paused: "La actualización se detuvo. Recarga la página." }
  },
  en: {
    ui: { language: "Language", dark: "Dark", light: "Light" },
    labels: {
      weeklyDone: "of the week completed",
      monthlyDoneTpl: "of {month} completed",
      yearlyDone: "of the year completed"
    },
    errors: { paused: "Updates paused. Reload the page." }
  },
  fr: {
    ui: { language: "Langue", dark: "Sombre", light: "Clair" },
    labels: {
      weeklyDone: "de la semaine terminé",
      monthlyDoneTpl: "de {month} terminé",
      yearlyDone: "de l’année terminé"
    },
    errors: { paused: "Mise à jour en pause. Rechargez la page." }
  },
  de: {
    ui: { language: "Sprache", dark: "Dunkel", light: "Hell" },
    labels: {
      weeklyDone: "der Woche abgeschlossen",
      monthlyDoneTpl: "{month} abgeschlossen",
      yearlyDone: "des Jahres abgeschlossen"
    },
    errors: { paused: "Aktualisierung pausiert. Seite neu laden." }
  },
  it: {
    ui: { language: "Lingua", dark: "Scuro", light: "Chiaro" },
    labels: {
      weeklyDone: "della settimana completato",
      monthlyDoneTpl: "di {month} completato",
      yearlyDone: "dell’anno completato"
    },
    errors: { paused: "Aggiornamenti in pausa. Ricarica la pagina." }
  },
  zh: {
    ui: { language: "语言", dark: "深色", light: "浅色" },
    labels: {
      weeklyDone: "本周已完成",
      monthlyDoneTpl: "{month}已完成",
      yearlyDone: "今年已完成"
    },
    errors: { paused: "更新已暂停。请刷新页面。" }
  },
  ja: {
    ui: { language: "言語", dark: "ダーク", light: "ライト" },
    labels: {
      weeklyDone: "今週の完了",
      monthlyDoneTpl: "{month}の完了",
      yearlyDone: "今年の完了"
    },
    errors: { paused: "更新が停止しました。ページを再読み込みしてください。" }
  },
};