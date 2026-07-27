import { createContext, useContext, useEffect, useState } from "react";
import { listBlockTypes } from "../lib/api";
import {
  BLOCK_TYPE_ICONS,
  BLOCK_TYPE_SHOW_LABEL_ABOVE,
  BLOCK_TYPE_DEFAULT_CONFIG,
  BLOCK_TYPE_DEFAULT_LABEL,
} from "../lib/blockTypes";

const BlockTypesContext = createContext(null);

//// Charge le catalogue une seule fois (au montage de l'app) et le fusionne
//// avec le recouvrement frontend. Un type qui existe côté API mais pas dans
//// le recouvrement reste utilisable : icône -> repli texte, reste -> valeurs
//// par défaut raisonnables (voir blockTypes.js).
export function BlockTypesProvider({ children }) {
  const [types, setTypes] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    listBlockTypes()
      .then((entries) => {
        if (cancelled) return;
        const merged = entries.map((entry) => ({
          type: entry.type,
          displayName: entry.display_name,
          collectsData: entry.collects_data,
          configSchema: entry.config_schema,
          icon: BLOCK_TYPE_ICONS[entry.type] || null,
          showLabelAbove: BLOCK_TYPE_SHOW_LABEL_ABOVE[entry.type] ?? entry.collects_data,
          defaultConfig: BLOCK_TYPE_DEFAULT_CONFIG[entry.type] || {},
          defaultLabel: BLOCK_TYPE_DEFAULT_LABEL[entry.type] || "",
        }));
        setTypes(merged);
      })
      .catch((err) => {
        if (!cancelled) setError(err);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return <BlockTypesContext.Provider value={{ types, error }}>{children}</BlockTypesContext.Provider>;
}

//// Liste complète (null tant que le chargement n'est pas terminé) + erreur éventuelle
export function useBlockTypes() {
  const ctx = useContext(BlockTypesContext);
  if (!ctx) throw new Error("useBlockTypes doit être appelé sous BlockTypesProvider");
  return ctx;
}

//// Raccourci pour un seul type -> null tant que non chargé ou si le type est inconnu
export function useBlockTypeMeta(type) {
  const { types } = useBlockTypes();
  return types?.find((entry) => entry.type === type) || null;
}
