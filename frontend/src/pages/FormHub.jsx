import { Link, useParams } from "react-router-dom";

//// Écran à venir : réponses/stats, éditer (si draft) ou dupliquer, supprimer.
export default function FormHub() {
  const { formId } = useParams();

  return (
    <div className="page">
      <Link to="/" className="btn btn--ghost">
        ← Retour aux formulaires
      </Link>
      <div className="state-panel">
        <p className="state-panel__title">Page de gestion à venir</p>
        <p>Formulaire {formId}</p>
      </div>
    </div>
  );
}
