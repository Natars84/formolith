import { useEffect, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { Trash2 } from "lucide-react";
import {
  getForm,
  listBlocks,
  listSubmissions,
  updateForm,
  deleteForm,
  duplicateForm,
  deleteSubmission,
} from "../lib/api";
import StatusBadge from "../components/StatusBadge";

export default function FormHub() {
  const { formId } = useParams();
  const navigate = useNavigate();

  const [form, setForm] = useState(null);
  const [blockCount, setBlockCount] = useState(null);
  const [submissions, setSubmissions] = useState(null);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;

    Promise.all([getForm(formId), listBlocks(formId), listSubmissions(formId)])
      .then(([formData, blocks, subs]) => {
        if (cancelled) return;
        setForm(formData);
        setBlockCount(blocks.length);
        setSubmissions(subs);
      })
      .catch((err) => {
        if (!cancelled) setError(err);
      });

    return () => {
      cancelled = true;
    };
  }, [formId]);

  //// Rendre un formulaire "vivant" : seule action qui débloque les réponses côté public
  async function handlePublish() {
    if (!window.confirm(`Publier « ${form.title} » ? Il deviendra accessible et pourra recevoir des réponses.`)) {
      return;
    }
    setBusy(true);
    try {
      const updated = await updateForm(formId, { status: "published" });
      setForm(updated);
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  }

  //// Un formulaire déjà publié ne se modifie jamais en direct : on part dans le builder de la copie
  async function handleDuplicate() {
    setBusy(true);
    try {
      const copy = await duplicateForm(formId);
      navigate(`/forms/${copy.id}/builder`);
    } catch (err) {
      setError(err);
      setBusy(false);
    }
  }

  async function handleDelete() {
    if (!window.confirm(`Supprimer définitivement « ${form.title} » et toutes ses réponses ?`)) {
      return;
    }
    setBusy(true);
    try {
      await deleteForm(formId);
      navigate("/");
    } catch (err) {
      setError(err);
      setBusy(false);
    }
  }

  async function handleDeleteSubmission(submissionId) {
    if (!window.confirm("Supprimer cette réponse ?")) {
      return;
    }
    try {
      await deleteSubmission(formId, submissionId);
      setSubmissions((current) => current.filter((s) => s.id !== submissionId));
    } catch (err) {
      setError(err);
    }
  }

  if (error) {
    return (
      <div className="page">
        <BackLink />
        <div className="state-panel state-panel--error">
          <p className="state-panel__title">Impossible de charger ce formulaire</p>
        </div>
      </div>
    );
  }

  if (!form) {
    return (
      <div className="page">
        <BackLink />
        <div className="state-panel">
          <p>Chargement…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <BackLink />

      <div className="page-header">
        <div>
          <h1 className="page-title">{form.title}</h1>
          <div className="hub-meta">
            <StatusBadge status={form.status} />
            <span>{blockCount} bloc{blockCount === 1 ? "" : "s"}</span>
            <span>{submissions.length} réponse{submissions.length === 1 ? "" : "s"}</span>
          </div>
        </div>
      </div>

      <div className="hub-actions">
        {form.status === "draft" && (
          <>
            <Link to={`/forms/${formId}/builder`} className="btn btn--primary">
              Éditer
            </Link>
            <button type="button" className="btn btn--ghost" onClick={handlePublish} disabled={busy}>
              Publier
            </button>
          </>
        )}
        {form.status !== "draft" && (
          <button type="button" className="btn btn--primary" onClick={handleDuplicate} disabled={busy}>
            Dupliquer pour modifier
          </button>
        )}
        <button type="button" className="btn btn--danger" onClick={handleDelete} disabled={busy}>
          Supprimer
        </button>
      </div>

      <h2 className="section-title">Réponses</h2>

      {submissions.length === 0 && (
        <div className="state-panel">
          <p>Aucune réponse pour l'instant.</p>
        </div>
      )}

      {submissions.length > 0 && (
        <table className="forms-table">
          <thead>
            <tr>
              <th>Reçue le</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {submissions.map((submission) => (
              <tr key={submission.id}>
                <td>{new Date(submission.submitted_at).toLocaleString("fr-FR")}</td>
                <td>
                  <button
                    type="button"
                    className="btn btn--ghost btn--icon"
                    title="Supprimer cette réponse"
                    onClick={() => handleDeleteSubmission(submission.id)}
                  >
                    <Trash2 size={16} aria-hidden="true" />
                    <span className="sr-only">Supprimer cette réponse</span>
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

function BackLink() {
  return (
    <Link to="/" className="btn btn--ghost back-link">
      ← Retour aux formulaires
    </Link>
  );
}
