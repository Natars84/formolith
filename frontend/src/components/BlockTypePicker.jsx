import { BLOCK_TYPES } from "../lib/blockTypes";

const FORM_FIELDS = BLOCK_TYPES.filter((t) => t.collectsData);
const CONTENT_BLOCKS = BLOCK_TYPES.filter((t) => !t.collectsData);

export default function BlockTypePicker({ onAdd, disabled }) {
  return (
    <div className="side-panel">
      <h2 className="side-panel__title">Ajouter un champ</h2>
      <p className="side-panel__hint">Cliquez sur un type pour l'ajouter en fin de formulaire.</p>

      <h3 className="side-panel__group-title">Champs de formulaire</h3>
      <TypeGrid types={FORM_FIELDS} onAdd={onAdd} disabled={disabled} />

      <h3 className="side-panel__group-title">Contenu</h3>
      <TypeGrid types={CONTENT_BLOCKS} onAdd={onAdd} disabled={disabled} />
    </div>
  );
}

function TypeGrid({ types, onAdd, disabled }) {
  return (
    <div className="type-grid">
      {types.map(({ type, label, icon: Icon }) => (
        <button key={type} type="button" className="type-card" disabled={disabled} onClick={() => onAdd(type)}>
          <Icon size={28} aria-hidden="true" />
          <span>{label}</span>
        </button>
      ))}
    </div>
  );
}
