import { marked } from "marked";
import DOMPurify from "dompurify";

//// Rendu d'un champ à partir de son type/config. Utilisé à deux endroits :
//// dans le canevas du builder (essai libre, rien n'est retenu) et dans la
//// page d'aperçu (aussi un essai libre, rien n'est jamais envoyé à l'API).
export default function FieldRenderer({ block }) {
  const { type, config } = block;

  if (type === "text") {
    return (
      <input
        type="text"
        placeholder={config.max_length ? `Réponse en texte (max ${config.max_length} caractères)` : "Réponse en texte"}
        maxLength={config.max_length || undefined}
      />
    );
  }

  if (type === "slider") {
    return (
      <div className="field-preview__slider">
        <input type="range" min={config.min} max={config.max} step={config.step} defaultValue={config.min} />
        <div className="field-preview__bounds">
          <span>{config.min}</span>
          <span>{config.max}</span>
        </div>
      </div>
    );
  }

  if (type === "checkbox") {
    return (
      <label className="field-preview__checkbox">
        <input type="checkbox" />
        <span>{block.label}</span>
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

    return (
      <select defaultValue="">
        <option value="" disabled>
          Choisissez…
        </option>
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
    const html = DOMPurify.sanitize(marked.parse(config.content || ""));
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
