import { useEffect, useRef, useState } from "react";
import { X, Plus, Trash2, Bold, Italic, Heading2, List, ListOrdered, Link2, Quote } from "lucide-react";
import { useBlockTypeMeta } from "../context/BlockTypesContext";

const WIDTH_OPTIONS = [
  { value: "full", label: "Pleine largeur" },
  { value: "half", label: "Moitié" },
  { value: "third", label: "Tiers" },
];

//// Entrée valide et referme le champ (déclenche sa sauvegarde via onBlur) sur les champs mono-ligne
function blurOnEnter(e) {
  if (e.key === "Enter") {
    e.preventDefault();
    e.target.blur();
  }
}

//// Sur un textarea, Entrée seule doit rester un retour à la ligne -> Ctrl/Cmd+Entrée pour valider
function blurOnCtrlEnter(e) {
  if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
    e.preventDefault();
    e.target.blur();
  }
}

export default function BlockSettingsForm({ block, onUpdate, onDelete, onClose }) {
  //// État local, réinitialisé à chaque changement de bloc sélectionné
  const [label, setLabel] = useState(block.label);
  const [required, setRequired] = useState(block.required);
  const [width, setWidth] = useState(block.width);
  const [config, setConfig] = useState(block.config);

  useEffect(() => {
    setLabel(block.label);
    setRequired(block.required);
    setWidth(block.width);
    setConfig(block.config);
  }, [block.id]);

  function saveLabel() {
    if (label !== block.label) onUpdate({ label });
  }

  function saveRequired(value) {
    setRequired(value);
    onUpdate({ required: value });
  }

  function saveWidth(value) {
    setWidth(value);
    onUpdate({ width: value });
  }

  function saveConfig(nextConfig) {
    setConfig(nextConfig);
    onUpdate({ config: nextConfig });
  }

  const isContentBlock = !useBlockTypeMeta(block.type)?.collectsData;

  return (
    <div className="side-panel">
      <div className="side-panel__header">
        <h2 className="side-panel__title">Réglages du champ</h2>
        <button type="button" className="btn btn--icon" title="Fermer" onClick={onClose}>
          <X size={18} aria-hidden="true" />
          <span className="sr-only">Fermer les réglages</span>
        </button>
      </div>

      {!isContentBlock && (
        <label className="field-group">
          <span className="field-group__label">Libellé</span>
          <input
            type="text"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            onBlur={saveLabel}
            onKeyDown={blurOnEnter}
          />
        </label>
      )}

      <TypeSpecificFields type={block.type} config={config} onSave={saveConfig} />

      {!isContentBlock && (
        <label className="field-group field-group--inline">
          <input type="checkbox" checked={required} onChange={(e) => saveRequired(e.target.checked)} />
          <span>Réponse obligatoire</span>
        </label>
      )}

      <div className="field-group">
        <span className="field-group__label">Largeur</span>
        <div className="width-options">
          {WIDTH_OPTIONS.map((option) => (
            <label key={option.value} className="width-option">
              <input
                type="radio"
                name="width"
                value={option.value}
                checked={width === option.value}
                onChange={() => saveWidth(option.value)}
              />
              {option.label}
            </label>
          ))}
        </div>
      </div>

      <button type="button" className="btn btn--danger side-panel__delete" onClick={onDelete}>
        <Trash2 size={16} aria-hidden="true" />
        Supprimer ce champ
      </button>
    </div>
  );
}

function TypeSpecificFields({ type, config, onSave }) {
  if (type === "paragraph") {
    return (
      <label className="field-group">
        <span className="field-group__label">Texte affiché</span>
        <textarea
          rows={4}
          defaultValue={config.content}
          onBlur={(e) => onSave({ ...config, content: e.target.value })}
          onKeyDown={blurOnCtrlEnter}
        />
      </label>
    );
  }

  if (type === "markdown") {
    return <MarkdownEditor config={config} onSave={onSave} />;
  }

  if (type === "heading") {
    return (
      <>
        <label className="field-group">
          <span className="field-group__label">Texte du titre</span>
          <input
            type="text"
            defaultValue={config.content}
            onBlur={(e) => onSave({ ...config, content: e.target.value })}
            onKeyDown={blurOnEnter}
          />
        </label>
        <label className="field-group">
          <span className="field-group__label">Niveau</span>
          <select
            value={config.level || 2}
            onChange={(e) => onSave({ ...config, level: Number(e.target.value) })}
          >
            {[1, 2, 3, 4, 5, 6].map((level) => (
              <option key={level} value={level}>
                H{level}
              </option>
            ))}
          </select>
        </label>
      </>
    );
  }

  if (type === "spacer") {
    return (
      <label className="field-group">
        <span className="field-group__label">Hauteur (en pixels)</span>
        <input
          type="number"
          min={4}
          max={200}
          defaultValue={config.height ?? 24}
          onBlur={(e) => onSave({ ...config, height: Number(e.target.value) })}
          onKeyDown={blurOnEnter}
        />
      </label>
    );
  }

  if (type === "text") {
    return (
      <label className="field-group">
        <span className="field-group__label">Longueur maximale (optionnel)</span>
        <input
          type="number"
          min={1}
          defaultValue={config.max_length ?? ""}
          onBlur={(e) => {
            const value = e.target.value === "" ? null : Number(e.target.value);
            onSave({ ...config, max_length: value });
          }}
          onKeyDown={blurOnEnter}
        />
      </label>
    );
  }

  if (type === "datetime") {
    return (
      <label className="field-group">
        <span className="field-group__label">Ce qu'on demande</span>
        <select value={config.mode || "date"} onChange={(e) => onSave({ ...config, mode: e.target.value })}>
          <option value="date">Date</option>
          <option value="time">Heure</option>
          <option value="datetime">Date et heure</option>
        </select>
      </label>
    );
  }

  if (type === "number") {
    return (
      <>
        <div className="field-group-row">
          <label className="field-group">
            <span className="field-group__label">Minimum</span>
            <input
              type="number"
              defaultValue={config.min}
              onBlur={(e) => onSave({ ...config, min: Number(e.target.value) })}
              onKeyDown={blurOnEnter}
            />
          </label>
          <label className="field-group">
            <span className="field-group__label">Maximum</span>
            <input
              type="number"
              defaultValue={config.max}
              onBlur={(e) => onSave({ ...config, max: Number(e.target.value) })}
              onKeyDown={blurOnEnter}
            />
          </label>
          <label className="field-group">
            <span className="field-group__label">Pas</span>
            <input
              type="number"
              min={1}
              defaultValue={config.step}
              onBlur={(e) => onSave({ ...config, step: Number(e.target.value) })}
              onKeyDown={blurOnEnter}
            />
          </label>
        </div>
        <label className="field-group field-group--inline">
          <input
            type="checkbox"
            checked={config.show_slider || false}
            onChange={(e) => onSave({ ...config, show_slider: e.target.checked })}
          />
          <span>Afficher aussi un curseur</span>
        </label>
      </>
    );
  }

  if (type === "select") {
    return (
      <>
        <SelectOptionsEditor
          options={config.options || []}
          onChange={(options) => onSave({ ...config, options })}
        />

        <label className="field-group field-group--inline">
          <input
            type="checkbox"
            checked={config.multiple || false}
            onChange={(e) => onSave({ ...config, multiple: e.target.checked })}
          />
          <span>Plusieurs choix possibles</span>
        </label>

        <label className="field-group">
          <span className="field-group__label">Affichage</span>
          <select value={config.display || "dropdown"} onChange={(e) => onSave({ ...config, display: e.target.value })}>
            <option value="dropdown">Liste déroulante</option>
            <option value="inline">Options côte à côte</option>
          </select>
        </label>
      </>
    );
  }

  //// La case à cocher isolée et le séparateur n'ont aucun réglage spécifique
  return null;
}

//// Liste d'options éditable : ajouter une option place automatiquement le focus
//// dessus (texte pré-sélectionné) pour qu'on puisse taper son nom tout de suite.
function SelectOptionsEditor({ options, onChange }) {
  const inputRefs = useRef([]);
  const previousLength = useRef(options.length);

  useEffect(() => {
    if (options.length > previousLength.current) {
      const newIndex = options.length - 1;
      inputRefs.current[newIndex]?.focus();
      inputRefs.current[newIndex]?.select();
    }
    previousLength.current = options.length;
  }, [options.length]);

  function updateOption(index, value) {
    const next = [...options];
    next[index] = value;
    onChange(next);
  }

  function addOption() {
    onChange([...options, `Option ${options.length + 1}`]);
  }

  function removeOption(index) {
    onChange(options.filter((_, i) => i !== index));
  }

  return (
    <div className="field-group">
      <span className="field-group__label">Options</span>
      {options.map((option, index) => (
        <div key={index} className="option-row">
          <input
            type="text"
            ref={(el) => (inputRefs.current[index] = el)}
            defaultValue={option}
            onBlur={(e) => updateOption(index, e.target.value)}
            onKeyDown={blurOnEnter}
          />
          <button
            type="button"
            className="btn btn--icon"
            title="Retirer cette option"
            disabled={options.length <= 1}
            onClick={() => removeOption(index)}
          >
            <Trash2 size={14} aria-hidden="true" />
            <span className="sr-only">Retirer l'option {option}</span>
          </button>
        </div>
      ))}
      <button type="button" className="btn btn--ghost option-row__add" onClick={addOption}>
        <Plus size={14} aria-hidden="true" /> Ajouter une option
      </button>
    </div>
  );
}

//// Éditeur Markdown : textarea + barre d'outils qui insère la syntaxe au curseur,
//// sans jamais faire perdre le focus (onMouseDown empêche le blur du textarea).
function MarkdownEditor({ config, onSave }) {
  const textareaRef = useRef(null);

  function wrapSelection(before, after, placeholder) {
    const el = textareaRef.current;
    if (!el) return;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const value = el.value;
    const selected = value.slice(start, end) || placeholder;
    const newValue = value.slice(0, start) + before + selected + after + value.slice(end);
    el.value = newValue;
    const cursor = start + before.length + selected.length + after.length;
    el.focus();
    el.setSelectionRange(cursor, cursor);
    onSave({ ...config, content: newValue });
  }

  function prefixLine(prefix) {
    const el = textareaRef.current;
    if (!el) return;
    const start = el.selectionStart;
    const value = el.value;
    const lineStart = value.lastIndexOf("\n", start - 1) + 1;
    const newValue = value.slice(0, lineStart) + prefix + value.slice(lineStart);
    el.value = newValue;
    const cursor = start + prefix.length;
    el.focus();
    el.setSelectionRange(cursor, cursor);
    onSave({ ...config, content: newValue });
  }

  //// Regarde la ligne précédente : si elle commence par "N. ", reprend N+1
  //// plutôt que de toujours insérer "1." (ce qui rendait l'éditeur illisible,
  //// même si le rendu final, lui, numérotait correctement).
  function prefixOrderedListLine() {
    const el = textareaRef.current;
    if (!el) return;
    const start = el.selectionStart;
    const value = el.value;
    const lineStart = value.lastIndexOf("\n", start - 1) + 1;
    const previousLineEnd = lineStart > 0 ? lineStart - 1 : -1;
    const previousLineStart = previousLineEnd >= 0 ? value.lastIndexOf("\n", previousLineEnd - 1) + 1 : 0;
    const previousLine = previousLineEnd >= 0 ? value.slice(previousLineStart, previousLineEnd) : "";
    const match = previousLine.match(/^(\d+)\.\s/);
    const nextNumber = match ? Number(match[1]) + 1 : 1;
    prefixLine(`${nextNumber}. `);
  }

  //// Empêche le clic sur un bouton d'outil de faire perdre le focus (et donc la sélection) du textarea
  const keepFocus = (e) => e.preventDefault();

  //// Entrée sur une ligne de liste -> continue automatiquement la liste (même
  //// puce, ou numéro suivant). Une ligne de liste vide + Entrée en sort plutôt
  //// que d'ajouter une puce vide de plus. Ctrl/Cmd+Entrée reste réservé à
  //// l'enregistrement, et n'a jamais ce comportement de continuation.
  function handleKeyDown(e) {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      e.target.blur();
      return;
    }

    if (e.key !== "Enter" || e.shiftKey) return;

    const el = e.target;
    const value = el.value;
    const start = el.selectionStart;
    const lineStart = value.lastIndexOf("\n", start - 1) + 1;
    const currentLine = value.slice(lineStart, start);

    const bulletMatch = currentLine.match(/^(-\s)(.*)$/);
    const orderedMatch = currentLine.match(/^(\d+)\.\s(.*)$/);
    if (!bulletMatch && !orderedMatch) return;

    e.preventDefault();
    const isEmpty = (bulletMatch ? bulletMatch[2] : orderedMatch[2]).trim() === "";

    if (isEmpty) {
      //// Ligne de liste vide -> Entrée en sort. Une seule ligne ne suffit pas :
      //// en Markdown, un texte qui suit une liste sans ligne vide entre les deux
      //// est considéré comme la suite du dernier point (comportement standard,
      //// pas un bug de rendu) -> on insère la vraie ligne vide nécessaire.
      const newValue = value.slice(0, lineStart) + "\n" + value.slice(start);
      el.value = newValue;
      const cursor = lineStart + 1;
      el.focus();
      el.setSelectionRange(cursor, cursor);
      onSave({ ...config, content: newValue });
      return;
    }

    const nextPrefix = bulletMatch ? "- " : `${Number(orderedMatch[1]) + 1}. `;
    const insertion = `\n${nextPrefix}`;
    const newValue = value.slice(0, start) + insertion + value.slice(start);
    el.value = newValue;
    const cursor = start + insertion.length;
    el.focus();
    el.setSelectionRange(cursor, cursor);
    onSave({ ...config, content: newValue });
  }

  return (
    <label className="field-group">
      <span className="field-group__label">Texte affiché (syntaxe Markdown)</span>
      <div className="markdown-toolbar" role="toolbar" aria-label="Mise en forme Markdown">
        <button type="button" onMouseDown={keepFocus} onClick={() => wrapSelection("**", "**", "gras")} title="Gras">
          <Bold size={14} aria-hidden="true" />
          <span className="sr-only">Gras</span>
        </button>
        <button type="button" onMouseDown={keepFocus} onClick={() => wrapSelection("*", "*", "italique")} title="Italique">
          <Italic size={14} aria-hidden="true" />
          <span className="sr-only">Italique</span>
        </button>
        <button type="button" onMouseDown={keepFocus} onClick={() => prefixLine("## ")} title="Titre">
          <Heading2 size={14} aria-hidden="true" />
          <span className="sr-only">Titre</span>
        </button>
        <button type="button" onMouseDown={keepFocus} onClick={() => prefixLine("- ")} title="Liste à puces">
          <List size={14} aria-hidden="true" />
          <span className="sr-only">Liste à puces</span>
        </button>
        <button type="button" onMouseDown={keepFocus} onClick={prefixOrderedListLine} title="Liste numérotée">
          <ListOrdered size={14} aria-hidden="true" />
          <span className="sr-only">Liste numérotée</span>
        </button>
        <button
          type="button"
          onMouseDown={keepFocus}
          onClick={() => wrapSelection("[", "](https://)", "texte du lien")}
          title="Lien"
        >
          <Link2 size={14} aria-hidden="true" />
          <span className="sr-only">Lien</span>
        </button>
        <button type="button" onMouseDown={keepFocus} onClick={() => prefixLine("> ")} title="Citation">
          <Quote size={14} aria-hidden="true" />
          <span className="sr-only">Citation</span>
        </button>
      </div>
      <textarea
        ref={textareaRef}
        rows={8}
        className="field-group__markdown-input"
        defaultValue={config.content}
        onBlur={(e) => onSave({ ...config, content: e.target.value })}
        onKeyDown={handleKeyDown}
      />
      <span className="field-group__hint">Ctrl+Entrée (ou Cmd+Entrée) pour enregistrer</span>
    </label>
  );
}
