import { useState } from "react";
import { marked } from "marked";
import DOMPurify from "dompurify";

//// En Markdown standard, du texte juste après une liste (sans ligne vide entre
//// les deux) est considéré comme la suite du dernier point, pas un nouveau
//// paragraphe. Peu intuitif pour qui ne connaît pas cette règle -> on la corrige
//// systématiquement avant le rendu, peu importe comment le texte a été tapé
//// (au clavier avec l'auto-continuation, copié-collé, etc.).
function ensureBlankLineAfterLists(text) {
  const lines = text.split("\n");
  const listLineRe = /^(-|\d+\.)\s/;
  const result = [];

  for (let i = 0; i < lines.length; i++) {
    const current = lines[i];
    result.push(current);
    const next = lines[i + 1];

    const nextIsUnindentedNonListText = next !== undefined && next.trim() !== "" && /^\S/.test(next) && !listLineRe.test(next);
    if (listLineRe.test(current) && nextIsUnindentedNonListText) {
      result.push("");
    }
  }

  return result.join("\n");
}

//// Rendu d'un champ à partir de son type/config. Utilisé à deux endroits :
//// dans le canevas du builder (essai libre, rien n'est retenu) et dans la
//// page d'aperçu (aussi un essai libre, rien n'est jamais envoyé à l'API).
export default function FieldRenderer({ block }) {
  const { type, config } = block;
  //// Toujours déclaré, même si seul "number" s'en sert -> ordre des hooks stable
  const [numberValue, setNumberValue] = useState(config.min ?? "");

  if (type === "text") {
    return (
      <input
        type="text"
        placeholder={config.max_length ? `Réponse en texte (max ${config.max_length} caractères)` : "Réponse en texte"}
        maxLength={config.max_length || undefined}
      />
    );
  }

  if (type === "number") {
    return (
      <div className="field-preview__number">
        <input
          type="number"
          min={config.min}
          max={config.max}
          step={config.step}
          value={numberValue}
          onChange={(e) => setNumberValue(e.target.value === "" ? "" : Number(e.target.value))}
        />
        {config.show_slider && (
          <div className="field-preview__slider">
            <input
              type="range"
              min={config.min}
              max={config.max}
              step={config.step}
              value={numberValue === "" ? config.min : numberValue}
              onChange={(e) => setNumberValue(Number(e.target.value))}
            />
            <div className="field-preview__bounds">
              <span>{config.min}</span>
              <span>{config.max}</span>
            </div>
          </div>
        )}
      </div>
    );
  }

  if (type === "checkbox") {
    return (
      <label className="field-preview__checkbox">
        <input type="checkbox" />
        <span>
          {block.label}
          {block.required && (
            <span className="block-item__required" aria-hidden="true">
              {" "}
              *
            </span>
          )}
        </span>
      </label>
    );
  }

  if (type === "select") {
    const options = config.options || [];

    if (config.display === "inline") {
      return (
        <div className="field-preview--inline">
          {options.map((option) => (
            <label key={option} className="field-preview__inline-option">
              <input type={config.multiple ? "checkbox" : "radio"} name={`preview-${block.id}`} />
              {option}
            </label>
          ))}
        </div>
      );
    }

    //// Un <select multiple> natif nécessite Ctrl/Cmd+clic pour sélectionner
    //// plusieurs options -> peu intuitif pour un public non technophile.
    //// "Options côte à côte" reste le choix recommandé pour du multi-choix ;
    //// celui-ci n'en est pas moins rendu fonctionnel.
    return (
      <select multiple={config.multiple} size={config.multiple ? Math.min(options.length, 5) : undefined} defaultValue={config.multiple ? [] : ""}>
        {!config.multiple && (
          <option value="" disabled>
            Choisissez…
          </option>
        )}
        {options.map((option) => (
          <option key={option}>{option}</option>
        ))}
      </select>
    );
  }

  if (type === "paragraph") {
    return <p className="field-preview__paragraph">{config.content || "(paragraphe vide)"}</p>;
  }

  if (type === "markdown") {
    //// marked convertit le Markdown en HTML ; DOMPurify assainit avant l'injection,
    //// par prudence même si le contenu vient toujours d'un compte de confiance pour l'instant.
    const html = DOMPurify.sanitize(marked.parse(ensureBlankLineAfterLists(config.content || "")));
    return <div className="field-preview__markdown" dangerouslySetInnerHTML={{ __html: html }} />;
  }

  if (type === "heading") {
    const level = Math.min(6, Math.max(1, config.level || 2));
    const Tag = `h${level}`;
    return <Tag className="field-preview__heading">{config.content || "(titre vide)"}</Tag>;
  }

  if (type === "spacer") {
    return <div className="field-preview__spacer" style={{ height: `${config.height || 24}px` }} />;
  }

  if (type === "divider") {
    return <hr className="field-preview__divider" />;
  }

  return null;
}
