//// Une valeur est-elle "vide" pour ce type de bloc précis ? (une case décochée,
//// un select multiple sans rien choisi, etc. n'ont pas la même notion de "vide")
export function isEmptyValue(block, value) {
  if (block.type === "checkbox") return value !== true;
  if (block.type === "select" && block.config.multiple) return !value || value.length === 0;
  return value === undefined || value === null || value === "";
}

//// Renvoie l'ensemble des ids de blocs obligatoires dont la valeur est manquante.
//// getMeta(type) doit renvoyer les métadonnées du catalogue (voir BlockTypesContext),
//// pour savoir quels types collectent vraiment une réponse.
export function findMissingRequiredBlocks(blocks, values, getMeta) {
  const missing = new Set();
  for (const block of blocks) {
    if (!getMeta(block.type)?.collectsData) continue;
    if (block.required && isEmptyValue(block, values[block.id])) {
      missing.add(block.id);
    }
  }
  return missing;
}
