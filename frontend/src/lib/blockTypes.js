import {
  Type,
  Hash,
  CalendarClock,
  CheckSquare,
  ListFilter,
  Pilcrow,
  FileCode2,
  Heading,
  MoveVertical,
  Minus,
} from "lucide-react";

//// Miroir léger de backend/app/block_types.py, côté UI : un type par entrée,
//// avec une config par défaut qui passe la validation dès la création
//// (un slider/select ne peut pas être créé avec une config vide côté API).
////
//// showLabelAbove : le libellé générique du bloc s'affiche-t-il en légende
//// au-dessus du champ (comportement par défaut) ? false pour la case à cocher
//// (son texte s'affiche à côté d'elle, pas au-dessus) et pour les blocs de
//// contenu (qui n'ont pas de "libellé" au sens propre).
export const BLOCK_TYPES = [
  {
    type: "text",
    label: "Champ texte",
    icon: Type,
    defaultLabel: "Nouveau champ texte",
    defaultConfig: {},
    collectsData: true,
    showLabelAbove: true,
  },
  {
    type: "number",
    label: "Nombres",
    icon: Hash,
    defaultLabel: "Nouveau champ nombre",
    defaultConfig: { min: 0, max: 100, step: 1, show_slider: false },
    collectsData: true,
    showLabelAbove: true,
  },
  {
    type: "datetime",
    label: "Date / Heure",
    icon: CalendarClock,
    defaultLabel: "Nouveau champ date",
    defaultConfig: { mode: "date" },
    collectsData: true,
    showLabelAbove: true,
  },
  {
    type: "checkbox",
    label: "Case à cocher",
    icon: CheckSquare,
    defaultLabel: "Nouvelle case à cocher",
    defaultConfig: {},
    collectsData: true,
    showLabelAbove: false,
  },
  {
    type: "select",
    label: "Choix dans une liste",
    icon: ListFilter,
    defaultLabel: "Nouveau choix",
    defaultConfig: { options: ["Option 1", "Option 2"], multiple: false, display: "dropdown" },
    collectsData: true,
    showLabelAbove: true,
  },
  {
    type: "heading",
    label: "Titre de section",
    icon: Heading,
    defaultLabel: "",
    defaultConfig: { content: "Titre de section", level: 2 },
    collectsData: false,
    showLabelAbove: false,
  },
  {
    type: "paragraph",
    label: "Zone de texte",
    icon: Pilcrow,
    defaultLabel: "",
    defaultConfig: { content: "Votre texte ici." },
    collectsData: false,
    showLabelAbove: false,
  },
  {
    type: "markdown",
    label: "Texte enrichi (Markdown)",
    icon: FileCode2,
    defaultLabel: "",
    defaultConfig: { content: "## Titre\n\nVotre texte ici, en **Markdown**." },
    collectsData: false,
    showLabelAbove: false,
  },
  {
    type: "spacer",
    label: "Espaceur",
    icon: MoveVertical,
    defaultLabel: "",
    defaultConfig: { height: 24 },
    collectsData: false,
    showLabelAbove: false,
  },
  {
    type: "divider",
    label: "Ligne séparatrice",
    icon: Minus,
    defaultLabel: "",
    defaultConfig: {},
    collectsData: false,
    showLabelAbove: false,
  },
];

export function getBlockTypeMeta(type) {
  return BLOCK_TYPES.find((entry) => entry.type === type);
}