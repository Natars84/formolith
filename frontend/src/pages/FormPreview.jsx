import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { getForm, listBlocks } from "../lib/api";
import { getBlockTypeMeta } from "../lib/blockTypes";
import FieldRenderer from "../components/FieldRenderer";

const WIDTH_CLASS = { full: "block-item--full", half: "block-item--half", third: "block-item--third" };

//// Rendu du formulaire tel qu'un répondant le verrait, mais rien n'est jamais
//// envoyé à l'API -> uniquement pour vérifier le rendu avant publication.
export default function FormPreview() {
  const { formId } = useParams();

  const [form, setForm] = useState(null);
  const [blocks, setBlocks] = useState(null);
  const [error, setError] = useState(null);
  const [submitted, setSubmitted] = useState(false);

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

  if (error) {
    return (
      <div className="preview-backdrop">
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
      <div className="preview-backdrop">
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
    <div className="preview-backdrop">
      <div className="page preview-page">
        <BackLink formId={formId} />

        <div className="preview-banner">Aperçu — rien de ce que vous saisissez ici n'est enregistré.</div>

        <div className="preview-sheet">
          <h1 className="page-title">{form.title}</h1>

          <form
            className="preview-form"
            onSubmit={(e) => {
              e.preventDefault();
              setSubmitted(true);
            }}
          >
            {blocks.map((block) => (
              <div key={block.id} className={`block-item ${WIDTH_CLASS[block.width] || WIDTH_CLASS.full}`}>
                <div className={`block-item__body block-item__body--static ${!getBlockTypeMeta(block.type)?.showLabelAbove ? "block-item__body--compact" : ""}`}>
                  {getBlockTypeMeta(block.type)?.showLabelAbove && (
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
            ))}

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
