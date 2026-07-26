export default function SaveStatus({ status }) {
  if (status === "idle") return <span className="save-status" />;

  const text = { saving: "Enregistrement…", saved: "Enregistré", error: "Échec de l'enregistrement" }[status];

  return (
    <span className={`save-status save-status--${status}`} role="status">
      {text}
    </span>
  );
}
