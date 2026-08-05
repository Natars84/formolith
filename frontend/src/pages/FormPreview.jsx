import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { getForm, listBlocks } from "../lib/api";
import { useBlockTypes } from "../context/BlockTypesContext";
import { findMissingRequiredBlocks } from "../lib/formValidation";
import FieldRenderer from "../components/FieldRenderer";

const WIDTH_CLASS = { full: "block-item--full", half: "block-item--half", third: "block-item--third" };

//// Rendu du formulaire tel qu'un répondant le verrait, y compris la validation
//// des champs obligatoires -> seul l'envoi réel à l'API est neutralisé.
export default function FormPreview() {
  const { formId } = useParams();

  const [form, setForm] = useState(null);
  const [blocks, setBlocks] = useState(null);
  const [error, setError] = useState(null);
  const [submitted, setSubmitted] = useState(false);
  const [values, setValues] = useState({});
  const [invalidBlockIds, setInvalidBlockIds] = useState(new Set());
  const { types: blockTypes } = useBlockTypes();

  function getMeta(type) {
    return blockTypes?.find((entry) => entry.type === type) || null;
  }

  useEffect(() => {
    let cancelled = false;

    Promise.all([getForm(formId), listBlocks(formId)])
      .then(([formData, blockData]) => {
        if (cancelled) return;
        setForm(formData);
        setBlocks(blockData);
      })
      .catch((err) => {
        if (!cancelled) setError(err);
      });

    return () => {
      cancelled = true;
    };
  }, [formId]);

  function updateValue(blockId, value) {
    setValues((prev) => ({ ...prev, [blockId]: value }));
    setInvalidBlockIds((prev) => {
      if (!prev.has(blockId)) return prev;
      const next = new Set(prev);
      next.delete(blockId);
      return next;
    });
  }

  function handleSubmit(e) {
    e.preventDefault();

    const missing = findMissingRequiredBlocks(blocks, values, getMeta);

    if (missing.size > 0) {
      setInvalidBlockIds(missing);
      return;
    }

    setInvalidBlockIds(new Set());
    setSubmitted(true);
  }

  if (error) {
    return (
      <div className="page-backdrop">
        <div className="page">
          <BackLink formId={formId} />
          <div className="state-panel state-panel--error">
            <p className="state-panel__title">Impossible de charger ce formulaire</p>
          </div>
        </div>
      </div>
    );
  }

  if (!form || !blocks) {
    return (
      <div className="page-backdrop">
        <div className="page">
          <BackLink formId={formId} />
          <div className="state-panel">
            <p>Chargement…</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page-backdrop">
      <div className="page">
        <BackLink formId={formId} />

        <div className="preview-banner">Aperçu — rien de ce que vous saisissez ici n'est enregistré.</div>

        <h1 className="page-title">{form.title}</h1>

          {invalidBlockIds.size > 0 && (
            <p className="preview-form__error-summary">Merci de compléter les champs obligatoires (en rouge ci-dessous).</p>
          )}

          <form className="preview-form" onSubmit={handleSubmit}>
            {blocks.map((block) => {
              const meta = getMeta(block.type);
              const invalid = invalidBlockIds.has(block.id);
              return (
                <div key={block.id} className={`block-item ${WIDTH_CLASS[block.width] || WIDTH_CLASS.full}`}>
                  <div
                    className={`block-item__body block-item__body--static ${!meta?.showLabelAbove ? "block-item__body--compact" : ""} ${invalid ? "block-item__body--invalid" : ""}`}
                  >
                    {meta?.showLabelAbove && (
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
                      <FieldRenderer block={block} value={values[block.id]} onChange={(v) => updateValue(block.id, v)} />
                    </div>
                    {invalid && <p className="field-preview__error">Réponse obligatoire.</p>}
                  </div>
                </div>
              );
            })}

            {blocks.length > 0 && !submitted && (
              <button type="submit" className="btn btn--primary preview-form__submit">
                Envoyer mes réponses
              </button>
            )}

            {submitted && (
              <p className="preview-form__confirmation">Merci ! (Aperçu — cette réponse n'a pas été envoyée.)</p>
            )}
          </form>
      </div>
    </div>
  );
}

function BackLink({ formId }) {
  return (
    <Link to={`/forms/${formId}/builder`} className="btn btn--ghost back-link">
      ← Retour au builder
    </Link>
  );
}
