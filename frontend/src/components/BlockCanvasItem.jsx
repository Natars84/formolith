import { ChevronUp, ChevronDown, Trash2 } from "lucide-react";
import FieldRenderer from "./FieldRenderer";
import { getBlockTypeMeta } from "../lib/blockTypes";

const WIDTH_CLASS = { full: "block-item--full", half: "block-item--half", third: "block-item--third" };

export default function BlockCanvasItem({ block, selected, isFirst, isLast, onSelect, onMoveUp, onMoveDown, onDelete }) {
  const widthClass = WIDTH_CLASS[block.width] || WIDTH_CLASS.full;
  const showLabelAbove = getBlockTypeMeta(block.type)?.showLabelAbove;

  return (
    <div className={`block-item ${widthClass} ${selected ? "block-item--selected" : ""}`}>
      <div className="block-item__toolbar">
        <button
          type="button"
          className="block-item__tool"
          title="Monter"
          disabled={isFirst}
          onClick={onMoveUp}
        >
          <ChevronUp size={16} aria-hidden="true" />
          <span className="sr-only">Monter ce champ</span>
        </button>
        <button
          type="button"
          className="block-item__tool"
          title="Descendre"
          disabled={isLast}
          onClick={onMoveDown}
        >
          <ChevronDown size={16} aria-hidden="true" />
          <span className="sr-only">Descendre ce champ</span>
        </button>
        <button
          type="button"
          className="block-item__tool block-item__tool--danger"
          title="Supprimer ce champ"
          onClick={onDelete}
        >
          <Trash2 size={16} aria-hidden="true" />
          <span className="sr-only">Supprimer ce champ</span>
        </button>
      </div>

      {/* Cliquer n'importe où sur le bloc ouvre ses réglages ; cliquer précisément
          dans un champ (texte, curseur...) le fait aussi, via la propagation
          naturelle du clic -> les deux actions (taper + sélectionner) cohabitent. */}
      <div className={`block-item__body ${!showLabelAbove ? "block-item__body--compact" : ""}`} onClick={onSelect}>
        {showLabelAbove && (
          <span className="block-item__label">
            {block.label}
            {block.required && (
              <span className="block-item__required" aria-hidden="true">
                {" "}
                *
              </span>
            )}
          </span>
        )}
        <div className="field-preview">
          <FieldRenderer block={block} />
        </div>
      </div>
    </div>
  );
}
