import { Link, useParams } from "react-router-dom";

//// Écran à venir : panneau de blocs, canevas quasi-final, auto-save.
export default function FormBuilder() {
  const { formId } = useParams();

  return (
    <div className="page">
      <Link to="/" className="btn btn--ghost">
        ← Retour aux formulaires
      </Link>
      <div className="state-panel">
        <p className="state-panel__title">Builder à venir</p>
        <p>Formulaire {formId}</p>
      </div>
    </div>
  );
}
