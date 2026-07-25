import { Link, useParams } from "react-router-dom";

//// Écran à venir : panneau de blocs, canevas quasi-final, auto-save.
export default function FormBuilder() {
  const { formId } = useParams();

  return (
    <div className="page">
      <Link to={`/forms/${formId}`} className="btn btn--ghost back-link">
        ← Retour à la gestion du formulaire
      </Link>
      <div className="state-panel">
        <p className="state-panel__title">Builder à venir</p>
        <p>Formulaire {formId}</p>
      </div>
    </div>
  );
}
