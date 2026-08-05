import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { getPublicForm, submitPublicForm, ApiError } from "../lib/api";
import { useBlockTypes } from "../context/BlockTypesContext";
import { findMissingRequiredBlocks } from "../lib/formValidation";
import FieldRenderer from "../components/FieldRenderer";

const WIDTH_CLASS = { full: "block-item--full", half: "block-item--half", third: "block-item--third" };

//// Le vrai formulaire, tel qu'un membre du club le remplit en suivant le lien
//// partagé -> contrairement à l'aperçu, l'envoi est réel.
export default function FormPublic() {
  const { token } = useParams();

  const [form, setForm] = useState(null);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState(null);
  const [submitted, setSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState(false);
  const [values, setValues] = useState({});
  const [invalidBlockIds, setInvalidBlockIds] = useState(new Set());
  const { types: blockTypes } = useBlockTypes();

  function getMeta(type) {
    return blockTypes?.find((entry) => entry.type === type) || null;
  }

  useEffect(() => {
    let cancelled = false;

    getPublicForm(token)
      .then((data) => {
        if (!cancelled) setForm(data);
      })
      .catch((err) => {
        if (cancelled) return;
        if (err instanceof ApiError && err.status === 404) {
          setNotFound(true);
        } else {
          setError(err);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [token]);

  function updateValue(blockId, value) {
    setValues((prev) => ({ ...prev, [blockId]: value }));
    setInvalidBlockIds((prev) => {
      if (!prev.has(blockId)) return prev;
      const next = new Set(prev);
      next.delete(blockId);
      return next;
    });
  }

  async function handleSubmit(e) {
    e.preventDefault();

    const missing = findMissingRequiredBlocks(form.blocks, values, getMeta);
    if (missing.size > 0) {
      setInvalidBlockIds(missing);
      return;
    }

    setInvalidBlockIds(new Set());
    setSubmitError(false);
    try {
      await submitPublicForm(token, values);
      setSubmitted(true);
    } catch (err) {
      setSubmitError(true);
    }
  }

  if (notFound) {
    return (
      <div className="page-backdrop">
        <div className="page">
          <div className="state-panel">
            <p className="state-panel__title">Ce formulaire n'est pas accessible</p>
            <p>Le lien est peut-être incorrect, ou le formulaire n'est plus publié.</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="page-backdrop">
        <div className="page">
          <div className="state-panel state-panel--error">
            <p className="state-panel__title">Impossible de charger ce formulaire</p>
          </div>
        </div>
      </div>
    );
  }

  if (!form) {
    return (
      <div className="page-backdrop">
        <div className="page">
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
        <h1 className="page-title">{form.title}</h1>

          {invalidBlockIds.size > 0 && (
            <p className="preview-form__error-summary">Merci de compléter les champs obligatoires (en rouge ci-dessous).</p>
          )}

          {submitError && (
            <p className="preview-form__error-summary">
              L'envoi a échoué. Vérifiez votre connexion et réessayez.
            </p>
          )}

          {!submitted && (
            <form className="preview-form" onSubmit={handleSubmit}>
              {form.blocks.map((block) => {
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

              {form.blocks.length > 0 && (
                <button type="submit" className="btn btn--primary preview-form__submit">
                  Envoyer mes réponses
                </button>
              )}
            </form>
          )}

          {submitted && <p className="preview-form__confirmation">Merci, votre réponse a bien été enregistrée !</p>}
      </div>
    </div>
  );
}
