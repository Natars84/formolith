const LABELS = {
  draft: "Brouillon",
  published: "Publié",
  archived: "Archivé",
};

//// Le statut "publié" est le seul à porter un signal animé (discret) : c'est le seul
//// état où le formulaire est réellement "vivant" et peut recevoir des réponses.
export default function StatusBadge({ status }) {
  const label = LABELS[status] || status;

  return (
    <span className={`status-badge status-badge--${status}`}>
      <span className="status-badge__dot" aria-hidden="true">
        {status === "published" && <span className="status-badge__ping" />}
      </span>
      {label}
    </span>
  );
}
