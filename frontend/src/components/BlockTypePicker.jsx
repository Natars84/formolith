import { useBlockTypes } from "../context/BlockTypesContext";

export default function BlockTypePicker({ onAdd, disabled }) {
  const { types, error } = useBlockTypes();

  if (error) {
    return (
      <div className="side-panel">
        <p className="state-panel__title">Catalogue indisponible</p>
        <p className="side-panel__hint">Impossible de charger la liste des types de blocs.</p>
      </div>
    );
  }

  if (!types) {
    return (
      <div className="side-panel">
        <p className="side-panel__hint">Chargement…</p>
      </div>
    );
  }

  const formFields = types.filter((t) => t.collectsData);
  const contentBlocks = types.filter((t) => !t.collectsData);

  return (
    <div className="side-panel">
      <h2 className="side-panel__title">Ajouter un champ</h2>
      <p className="side-panel__hint">Cliquez sur un type pour l'ajouter en fin de formulaire.</p>

      <h3 className="side-panel__group-title">Champs de formulaire</h3>
      <TypeGrid types={formFields} onAdd={onAdd} disabled={disabled} />

      <h3 className="side-panel__group-title">Contenu</h3>
      <TypeGrid types={contentBlocks} onAdd={onAdd} disabled={disabled} />
    </div>
  );
}

function TypeGrid({ types, onAdd, disabled }) {
  return (
    <div className="type-grid">
      {types.map(({ type, displayName, icon: Icon }) => (
        <button key={type} type="button" className="type-card" disabled={disabled} onClick={() => onAdd(type)}>
          {/* Aucune icône connue côté frontend pour ce type -> libellé texte, jamais invisible */}
          {Icon ? <Icon size={28} aria-hidden="true" /> : <span className="type-card__fallback-icon" aria-hidden="true">{displayName.slice(0, 2)}</span>}
          <span>{displayName}</span>
        </button>
      ))}
    </div>
  );
}
