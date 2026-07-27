import { Type, Hash, CalendarClock, CheckSquare, ListFilter, Pilcrow, FileCode2, Heading, MoveVertical, Minus } from "lucide-react";

//// Tout ce que l'API ne peut pas décrire (une icône est un composant React,
//// pas une donnée). L'existence des types, leur libellé et leur config
//// attendue viennent de GET /block-types (voir BlockTypesContext.jsx) -> ce
//// fichier ne porte plus que le recouvrement visuel/UX, volontairement court.

//// Type absent d'ici -> le panneau retombe sur un simple libellé texte
//// (voir BlockTypePicker.jsx), jamais invisible.
export const BLOCK_TYPE_ICONS = {
  text: Type,
  number: Hash,
  datetime: CalendarClock,
  checkbox: CheckSquare,
  select: ListFilter,
  heading: Heading,
  paragraph: Pilcrow,
  markdown: FileCode2,
  spacer: MoveVertical,
  divider: Minus,
};

//// Type absent d'ici -> retombe sur "collects_data" (fourni par l'API) comme
//// valeur par défaut, cohérent avec la plupart des types réels
export const BLOCK_TYPE_SHOW_LABEL_ABOVE = {
  checkbox: false,
};

//// Type absent d'ici -> retombe sur {} ; pour un type avec des champs
//// obligatoires côté API (ex: number a besoin de min/max), la création
//// échouera proprement (422) plutôt que silencieusement
export const BLOCK_TYPE_DEFAULT_CONFIG = {
  number: { min: 0, max: 100, step: 1, show_slider: false },
  select: { options: ["Option 1", "Option 2"], multiple: false, display: "dropdown" },
  heading: { content: "Titre de section", level: 2 },
  paragraph: { content: "Votre texte ici." },
  markdown: { content: "## Titre\n\nVotre texte ici, en **Markdown**." },
};

//// Type absent d'ici -> retombe sur "" (cas des blocs de contenu, qui n'ont pas de libellé)
export const BLOCK_TYPE_DEFAULT_LABEL = {
  text: "Nouveau champ texte",
  number: "Nouveau champ nombre",
  datetime: "Nouveau champ date",
  checkbox: "Nouvelle case à cocher",
  select: "Nouveau choix",
};
