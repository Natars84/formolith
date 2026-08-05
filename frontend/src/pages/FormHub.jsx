import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { Trash2, Copy, Check, RefreshCw, ExternalLink, ArrowUp, ArrowDown, ArrowUpDown } from "lucide-react";
import {
  getForm,
  listBlocks,
  listSubmissions,
  updateForm,
  deleteForm,
  duplicateForm,
  deleteSubmission,
  regeneratePublicToken,
} from "../lib/api";
import { useBlockTypes } from "../context/BlockTypesContext";
import StatusBadge from "../components/StatusBadge";

//// Rendu texte d'une réponse selon le type de bloc -> "—" si laissé vide (jamais requis)
function formatValue(block, value) {
  if (value === undefined || value === null || value === "") return "—";
  if (block.type === "checkbox") return value ? "Oui" : "Non";
  if (Array.isArray(value)) return value.join(", ");
  return String(value);
}

//// Compare deux valeurs brutes (pas leur texte formaté) pour le tri -> une valeur
//// manquante finit toujours en dernier, peu importe le sens du tri. Un nombre trie
//// numériquement (10 après 2), pas alphabétiquement.
function compareValues(a, b) {
  const aEmpty = a === undefined || a === null || a === "";
  const bEmpty = b === undefined || b === null || b === "";
  if (aEmpty && bEmpty) return 0;
  if (aEmpty) return 1;
  if (bEmpty) return -1;
  if (typeof a === "number" && typeof b === "number") return a - b;
  if (typeof a === "boolean" && typeof b === "boolean") return Number(a) - Number(b);
  if (Array.isArray(a) || Array.isArray(b)) return String(a).localeCompare(String(b), "fr");
  return String(a).localeCompare(String(b), "fr", { numeric: true });
}

export default function FormHub() {
  const { formId } = useParams();
  const navigate = useNavigate();
  const { types: blockTypes } = useBlockTypes();

  const [form, setForm] = useState(null);
  const [blocks, setBlocks] = useState(null);
  const [submissions, setSubmissions] = useState(null);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const [copyStatus, setCopyStatus] = useState("idle"); // idle | copied | failed
  const [sort, setSort] = useState({ key: "submitted_at", direction: "desc" });
  const linkInputRef = useRef(null);

  function getMeta(type) {
    return blockTypes?.find((entry) => entry.type === type) || null;
  }

  useEffect(() => {
    let cancelled = false;

    Promise.all([getForm(formId), listBlocks(formId), listSubmissions(formId)])
      .then(([formData, blockData, subs]) => {
        if (cancelled) return;
        setForm(formData);
        setBlocks(blockData);
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
    //// Message adapté selon qu'il y a des réponses à perdre ou non -> pas la même
    //// gravité, pas le même besoin d'attirer l'attention sur ce qui disparaît.
    const confirmMessage =
      submissions.length > 0
        ? `Supprimer définitivement « ${form.title} » ? Cette action supprimera aussi ses ${submissions.length} réponse${submissions.length === 1 ? "" : "s"}, de façon irréversible.`
        : `Supprimer définitivement « ${form.title} » ?`;

    if (!window.confirm(confirmMessage)) {
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

  function publicLinkFor(token) {
    return `${window.location.origin}/f/${token}`;
  }

  //// Une erreur ici (copie) ne doit jamais déclencher l'écran d'erreur pleine page,
  //// réservé à un échec de CHARGEMENT du formulaire -> état dédié, avec un repli
  //// (sélection manuelle) si l'API presse-papier est indisponible (contexte non HTTPS).
  async function handleCopyLink() {
    const link = publicLinkFor(form.public_token);

    if (navigator.clipboard && navigator.clipboard.writeText) {
      try {
        await navigator.clipboard.writeText(link);
        setCopyStatus("copied");
        setTimeout(() => setCopyStatus("idle"), 2000);
        return;
      } catch {
        // on retombe sur le repli ci-dessous
      }
    }

    linkInputRef.current?.focus();
    linkInputRef.current?.select();
    setCopyStatus("failed");
    setTimeout(() => setCopyStatus("idle"), 4000);
  }

  async function handleRegenerateLink() {
    if (!window.confirm("Générer un nouveau lien ? L'ancien lien cessera immédiatement de fonctionner.")) {
      return;
    }
    setBusy(true);
    try {
      const updated = await regeneratePublicToken(formId);
      setForm(updated);
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  }

  //// Clic sur un en-tête : bascule sur cette colonne (tri ascendant par défaut),
  //// ou inverse le sens si c'est déjà la colonne triée
  function toggleSort(key) {
    setSort((prev) => {
      if (prev.key !== key) return { key, direction: "asc" };
      return { key, direction: prev.direction === "asc" ? "desc" : "asc" };
    });
  }

  if (error) {
    return (
      <div className="page-backdrop">
        <div className="page">
          <BackLink />
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
          <BackLink />
          <div className="state-panel">
            <p>Chargement…</p>
          </div>
        </div>
      </div>
    );
  }

  const dataBlocks = blocks.filter((block) => getMeta(block.type)?.collectsData);

  //// Trie sur la valeur BRUTE (pas le texte affiché) -> un nombre trie numériquement,
  //// pas alphabétiquement (sinon "10" passerait avant "2")
  const sortedSubmissions = [...submissions].sort((a, b) => {
    const rawA = sort.key === "submitted_at" ? a.submitted_at : a.data[sort.key];
    const rawB = sort.key === "submitted_at" ? b.submitted_at : b.data[sort.key];
    const cmp = compareValues(rawA, rawB);
    return sort.direction === "asc" ? cmp : -cmp;
  });

  return (
    <div className="page-backdrop">
      <div className="page">
        <BackLink />

      <div className="page-header">
        <div>
          <h1 className="page-title">{form.title}</h1>
          <div className="hub-meta">
            <StatusBadge status={form.status} />
            <span>{blocks.length} bloc{blocks.length === 1 ? "" : "s"}</span>
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

      {form.status === "published" ? (
        <div className="public-link">
          <span className="field-group__label">Lien public</span>
          <div className="public-link__row">
            <input
              ref={linkInputRef}
              type="text"
              readOnly
              value={publicLinkFor(form.public_token)}
              onFocus={(e) => e.target.select()}
            />
            <a href={publicLinkFor(form.public_token)} target="_blank" rel="noreferrer" className="btn btn--ghost" title="Ouvrir dans un nouvel onglet">
              <ExternalLink size={16} aria-hidden="true" />
              <span className="sr-only">Ouvrir dans un nouvel onglet</span>
            </a>
            <button type="button" className="btn btn--ghost" onClick={handleCopyLink} title="Copier le lien">
              {copyStatus === "copied" ? <Check size={16} aria-hidden="true" /> : <Copy size={16} aria-hidden="true" />}
              <span className="sr-only">Copier le lien</span>
            </button>
            <button type="button" className="btn btn--ghost" onClick={handleRegenerateLink} disabled={busy} title="Générer un nouveau lien">
              <RefreshCw size={16} aria-hidden="true" />
              <span className="sr-only">Générer un nouveau lien</span>
            </button>
          </div>
          {copyStatus === "copied" && <span className="public-link__feedback public-link__feedback--ok">Lien copié !</span>}
          {copyStatus === "failed" && (
            <span className="public-link__feedback public-link__feedback--warn">
              Copie automatique indisponible (nécessite HTTPS) — champ sélectionné, utilisez Ctrl+C (ou Cmd+C).
            </span>
          )}
          {copyStatus === "idle" && <span className="field-group__hint">Régénérer le lien invalide immédiatement l'ancien.</span>}
        </div>
      ) : (
        <p className="public-link__hint-inactive">Le lien public sera disponible une fois le formulaire publié.</p>
      )}

      <h2 className="section-title">Réponses</h2>

      {submissions.length === 0 && (
        <div className="state-panel">
          <p>Aucune réponse pour l'instant.</p>
        </div>
      )}

      {submissions.length > 0 && (
        <div className="submissions-table-wrapper">
          <table className="forms-table submissions-table">
            <thead>
              <tr>
                <SortableHeader label="Reçue le" sortKey="submitted_at" sort={sort} onToggle={toggleSort} />
                {dataBlocks.map((block) => (
                  <SortableHeader key={block.id} label={block.label} sortKey={block.id} sort={sort} onToggle={toggleSort} />
                ))}
                <th></th>
              </tr>
            </thead>
            <tbody>
              {sortedSubmissions.map((submission) => (
                <tr key={submission.id}>
                  <td>{new Date(submission.submitted_at).toLocaleString("fr-FR")}</td>
                  {dataBlocks.map((block) => (
                    <td key={block.id}>{formatValue(block, submission.data[block.id])}</td>
                  ))}
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
        </div>
      )}
      </div>
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

//// En-tête de colonne cliquable : bascule le tri, montre le sens actif via une flèche
function SortableHeader({ label, sortKey, sort, onToggle }) {
  const active = sort.key === sortKey;
  const Icon = active ? (sort.direction === "asc" ? ArrowUp : ArrowDown) : ArrowUpDown;

  return (
    <th>
      <button type="button" className={`submissions-table__sort ${active ? "submissions-table__sort--active" : ""}`} onClick={() => onToggle(sortKey)}>
        {label}
        <Icon size={14} aria-hidden="true" />
      </button>
    </th>
  );
}
