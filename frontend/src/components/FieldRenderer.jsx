import { useState } from "react";
import { marked } from "marked";
import DOMPurify from "dompurify";

//// Ouvre les liens créés en Markdown dans un nouvel onglet plutôt que dans
//// la page courante (rel="noopener noreferrer" : bonne pratique de sécurité
//// systématique avec target="_blank", évite qu'une page ouverte accède à
//// window.opener).
const markdownRenderer = new marked.Renderer();
markdownRenderer.link = function ({ href, title, tokens }) {
  const text = this.parser.parseInline(tokens);
  const titleAttr = title ? ` title="${title}"` : "";
  return `<a href="${href}"${titleAttr} target="_blank" rel="noopener noreferrer">${text}</a>`;
};

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
////
//// - Dans le canevas du builder (BlockCanvasItem) : aucun value/onChange
////   fourni -> mode "essai libre", non contrôlé, rien n'est jamais retenu.
//// - Dans l'aperçu (FormPreview) : value/onChange fournis -> mode contrôlé,
////   la valeur remonte au parent pour permettre la validation des champs
////   obligatoires avant "l'envoi" (jamais transmis à l'API pour autant).
////
//// La présence d'onChange (pas de value, qui peut légitimement être vide)
//// sert de signal pour savoir si on est en mode contrôlé.
export default function FieldRenderer({ block, value, onChange }) {
  const { type, config } = block;
  const controlled = typeof onChange === "function";

  //// Toujours déclaré, même si seul "number" non contrôlé s'en sert -> ordre des hooks stable
  const [internalNumber, setInternalNumber] = useState(config.min ?? "");

  if (type === "text") {
    const placeholder = config.max_length ? `Réponse en texte (max ${config.max_length} caractères)` : "Réponse en texte";
    if (controlled) {
      return (
        <input
          type="text"
          value={value ?? ""}
          placeholder={placeholder}
          maxLength={config.max_length || undefined}
          onChange={(e) => onChange(e.target.value)}
        />
      );
    }
    return <input type="text" placeholder={placeholder} maxLength={config.max_length || undefined} />;
  }

  if (type === "number") {
    const numberValue = controlled ? value ?? "" : internalNumber;
    const setNumberValue = controlled ? onChange : setInternalNumber;

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

  if (type === "datetime") {
    //// Chaque mode correspond à un input HTML natif -> sélecteur date/heure fourni par le navigateur
    const htmlType = { date: "date", time: "time", datetime: "datetime-local" }[config.mode || "date"];
    if (controlled) {
      return <input type={htmlType} value={value ?? ""} onChange={(e) => onChange(e.target.value)} />;
    }
    return <input type={htmlType} />;
  }

  if (type === "checkbox") {
    const checkboxLabel = (
      <span>
        {block.label}
        {block.required && (
          <span className="block-item__required" aria-hidden="true">
            {" "}
            *
          </span>
        )}
      </span>
    );
    if (controlled) {
      return (
        <label className="field-preview__checkbox">
          <input type="checkbox" checked={!!value} onChange={(e) => onChange(e.target.checked)} />
          {checkboxLabel}
        </label>
      );
    }
    return (
      <label className="field-preview__checkbox">
        <input type="checkbox" />
        {checkboxLabel}
      </label>
    );
  }

  if (type === "select") {
    const options = config.options || [];

    if (config.display === "inline") {
      return (
        <div className="field-preview--inline">
          {options.map((option) => {
            const inputType = config.multiple ? "checkbox" : "radio";
            if (!controlled) {
              return (
                <label key={option} className="field-preview__inline-option">
                  <input type={inputType} name={`preview-${block.id}`} />
                  {option}
                </label>
              );
            }
            const isChecked = config.multiple ? (value || []).includes(option) : value === option;
            function handleInlineChange() {
              if (config.multiple) {
                const current = value || [];
                onChange(current.includes(option) ? current.filter((o) => o !== option) : [...current, option]);
              } else {
                onChange(option);
              }
            }
            return (
              <label key={option} className="field-preview__inline-option">
                <input type={inputType} name={`preview-${block.id}`} checked={isChecked} onChange={handleInlineChange} />
                {option}
              </label>
            );
          })}
        </div>
      );
    }

    //// Un <select multiple> natif nécessite Ctrl/Cmd+clic pour sélectionner
    //// plusieurs options -> peu intuitif pour un public non technophile.
    //// "Options côte à côte" reste le choix recommandé pour du multi-choix ;
    //// celui-ci n'en est pas moins rendu fonctionnel.
    if (controlled) {
      if (config.multiple) {
        return (
          <select
            multiple
            size={Math.min(options.length, 5)}
            value={value || []}
            onChange={(e) => onChange(Array.from(e.target.selectedOptions, (o) => o.value))}
          >
            {options.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        );
      }
      return (
        <select value={value ?? ""} onChange={(e) => onChange(e.target.value)}>
          <option value="" disabled>
            Choisissez…
          </option>
          {options.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      );
    }

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
    return (
      <p className="field-preview__paragraph" style={{ textAlign: config.align || "left" }}>
        {config.content || "(paragraphe vide)"}
      </p>
    );
  }

  if (type === "markdown") {
    //// marked convertit le Markdown en HTML (liens ouverts en nouvel onglet via
    //// markdownRenderer) ; DOMPurify assainit ensuite avant l'injection, par
    //// prudence même si le contenu vient toujours d'un compte de confiance pour
    //// l'instant. target/rel explicitement autorisés pour ne pas dépendre d'un
    //// comportement par défaut non vérifié.
    const rawHtml = marked.parse(ensureBlankLineAfterLists(config.content || ""), { renderer: markdownRenderer });
    const html = DOMPurify.sanitize(rawHtml, { ADD_ATTR: ["target", "rel"] });
    return <div className="field-preview__markdown" style={{ textAlign: config.align || "left" }} dangerouslySetInnerHTML={{ __html: html }} />;
  }

  if (type === "heading") {
    const level = Math.min(6, Math.max(1, config.level || 2));
    const Tag = `h${level}`;
    return (
      <Tag className="field-preview__heading" style={{ textAlign: config.align || "left" }}>
        {config.content || "(titre vide)"}
      </Tag>
    );
  }

  if (type === "spacer") {
    return <div className="field-preview__spacer" style={{ height: `${config.height || 24}px` }} />;
  }

  if (type === "divider") {
    return <hr className="field-preview__divider" />;
  }

  return null;
}
