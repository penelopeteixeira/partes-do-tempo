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
      dailyDone: "do dia concluído",
      workweekDone: "da semana útil concluída",
      weeklyDone: "da semana concluída",
      monthlyDoneTpl: "de {month} concluído",
      yearlyDone: "do ano concluído",
      holidaysTitle: "Feriados nacionais",
      coffee: "Me compre um café"
    },
    errors: { paused: "Atualização pausou. Recarregue a página." }
  },

  es: {
    ui: { language: "Idioma", dark: "Oscuro", light: "Claro" },
    labels: {
      dailyDone: "del día completado",
      workweekDone: "de la semana laboral completado",
      weeklyDone: "de la semana completado",
      monthlyDoneTpl: "de {month} completado",
      yearlyDone: "del año completado",
      holidaysTitle: "Feriados nacionales",
      coffee: "Cómprame un café"
    },
    errors: { paused: "La actualización se detuvo. Recarga la página." }
  },

  en: {
    ui: { language: "Language", dark: "Dark", light: "Light" },
    labels: {
      dailyDone: "of the day completed",
      workweekDone: "of the workweek completed",
      weeklyDone: "of the week completed",
      monthlyDoneTpl: "of {month} completed",
      yearlyDone: "of the year completed",
      holidaysTitle: "National holidays",
      coffee: "Buy me a coffee"
    },
    errors: { paused: "Updates paused. Reload the page." }
  },

  fr: {
    ui: { language: "Langue", dark: "Sombre", light: "Clair" },
    labels: {
      dailyDone: "de la journée terminé",
      workweekDone: "de la semaine de travail terminé",
      weeklyDone: "de la semaine terminé",
      monthlyDoneTpl: "de {month} terminé",
      yearlyDone: "de l’année terminé",
      holidaysTitle: "Jours fériés nationaux",
      coffee: "Offrez-moi un café"
    },
    errors: { paused: "Mise à jour en pause. Rechargez la page." }
  },

  de: {
    ui: { language: "Sprache", dark: "Dunkel", light: "Hell" },
    labels: {
      dailyDone: "des Tages abgeschlossen",
      workweekDone: "der Arbeitswoche abgeschlossen",
      weeklyDone: "der Woche abgeschlossen",
      monthlyDoneTpl: "{month} abgeschlossen",
      yearlyDone: "des Jahres abgeschlossen",
      holidaysTitle: "Nationale Feiertage",
      coffee: "Kauf mir einen Kaffee"
    },
    errors: { paused: "Aktualisierung pausiert. Seite neu laden." }
  },

  it: {
    ui: { language: "Lingua", dark: "Scuro", light: "Chiaro" },
    labels: {
      dailyDone: "della giornata completato",
      workweekDone: "della settimana lavorativa completato",
      weeklyDone: "della settimana completato",
      monthlyDoneTpl: "di {month} completato",
      yearlyDone: "dell’anno completato",
      holidaysTitle: "Festività nazionali",
      coffee: "Offrimi un caffè"
    },
    errors: { paused: "Aggiornamenti in pausa. Ricarica la pagina." }
  },

  zh: {
    ui: { language: "语言", dark: "深色", light: "浅色" },
    labels: {
      dailyDone: "今日已完成",
      workweekDone: "本工作周已完成",
      weeklyDone: "本周已完成",
      monthlyDoneTpl: "{month}已完成",
      yearlyDone: "今年已完成",
      holidaysTitle: "全国节假日",
      coffee: "请我喝杯咖啡"
    },
    errors: { paused: "更新已暂停。请刷新页面。" }
  },

  ja: {
    ui: { language: "言語", dark: "ダーク", light: "ライト" },
    labels: {
      dailyDone: "今日の完了",
      workweekDone: "今週（平日）の完了",
      weeklyDone: "今週の完了",
      monthlyDoneTpl: "{month}の完了",
      yearlyDone: "今年の完了",
      holidaysTitle: "祝日（全国）",
      coffee: "コーヒーを奢って"
    },
    errors: { paused: "更新が停止しました。ページを再読み込みしてください。" }
  },
};
