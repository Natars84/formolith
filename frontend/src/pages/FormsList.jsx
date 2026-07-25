import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { listForms, createForm } from "../lib/api";
import StatusBadge from "../components/StatusBadge";

const VIEW_STORAGE_KEY = "formolith:forms-view";

export default function FormsList() {
  const navigate = useNavigate();
  const [forms, setForms] = useState(null);
  const [error, setError] = useState(null);
  const [creating, setCreating] = useState(false);
  const [view, setView] = useState(() => localStorage.getItem(VIEW_STORAGE_KEY) || "cards");

  useEffect(() => {
    let cancelled = false;

    listForms()
      .then((data) => {
        if (!cancelled) setForms(data);
      })
      .catch((err) => {
        if (!cancelled) setError(err);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  function switchView(next) {
    setView(next);
    localStorage.setItem(VIEW_STORAGE_KEY, next);
  }

  //// Un nouveau formulaire atterrit directement dans le builder : pas de fenêtre
  //// intermédiaire à remplir, pour limiter la navigation à retenir.
  async function handleCreate() {
    setCreating(true);
    try {
      const form = await createForm("Nouveau formulaire");
      navigate(`/forms/${form.id}/builder`);
    } catch (err) {
      setError(err);
      setCreating(false);
    }
  }

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">Mes formulaires</h1>
        <div className="page-header__actions">
          {forms && forms.length > 0 && (
            <div role="group" aria-label="Mode d'affichage">
              <button
                type="button"
                className="btn btn--toggle"
                aria-pressed={view === "cards"}
                onClick={() => switchView("cards")}
              >
                Cartes
              </button>
              <button
                type="button"
                className="btn btn--toggle"
                aria-pressed={view === "table"}
                onClick={() => switchView("table")}
              >
                Tableau
              </button>
            </div>
          )}
          <button type="button" className="btn btn--primary" onClick={handleCreate} disabled={creating}>
            + Nouveau formulaire
          </button>
        </div>
      </div>

      {error && (
        <div className="state-panel state-panel--error">
          <p className="state-panel__title">Impossible de charger les formulaires</p>
          <p>Vérifiez que l'API est bien accessible, puis réessayez.</p>
        </div>
      )}

      {!error && forms === null && (
        <div className="state-panel">
          <p>Chargement des formulaires…</p>
        </div>
      )}

      {!error && forms !== null && forms.length === 0 && (
        <div className="state-panel">
          <p className="state-panel__title">Aucun formulaire pour l'instant</p>
          <p>Créez le premier pour commencer.</p>
        </div>
      )}

      {!error && forms && forms.length > 0 && view === "cards" && (
        <div className="forms-grid">
          {forms.map((form) => (
            <FormCard key={form.id} form={form} />
          ))}
        </div>
      )}

      {!error && forms && forms.length > 0 && view === "table" && <FormsTable forms={forms} />}
    </div>
  );
}

function FormCard({ form }) {
  return (
    <article className="form-card">
      <h2 className="form-card__title">{form.title}</h2>
      <div className="form-card__footer">
        <StatusBadge status={form.status} />
        <Link to={`/forms/${form.id}`} className="btn btn--ghost">
          Gérer
        </Link>
      </div>
    </article>
  );
}

function FormsTable({ forms }) {
  return (
    <table className="forms-table">
      <thead>
        <tr>
          <th>Titre</th>
          <th>Statut</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        {forms.map((form) => (
          <tr key={form.id}>
            <td>{form.title}</td>
            <td>
              <StatusBadge status={form.status} />
            </td>
            <td>
              <Link to={`/forms/${form.id}`} className="btn btn--ghost">
                Gérer
              </Link>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
