import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  getForm,
  updateForm,
  listBlocks,
  createBlock,
  updateBlock,
  deleteBlock,
  reorderBlocks,
} from "../lib/api";
import { useBlockTypes } from "../context/BlockTypesContext";
import BlockCanvasItem from "../components/BlockCanvasItem";
import BlockTypePicker from "../components/BlockTypePicker";
import BlockSettingsForm from "../components/BlockSettingsForm";
import SaveStatus from "../components/SaveStatus";

export default function FormBuilder() {
  const { formId } = useParams();

  const [form, setForm] = useState(null);
  const [blocks, setBlocks] = useState(null);
  const [selectedBlockId, setSelectedBlockId] = useState(null);
  const [error, setError] = useState(null);
  const [saveStatus, setSaveStatus] = useState("idle");
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState("");
  const { types: blockTypes } = useBlockTypes();

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

  //// Petit signal discret après chaque action, sans notification intrusive.
  //// "saved" se réinitialise tout seul après 1.5s -> jamais bloquant à l'écran.
  function flashSaved() {
    setSaveStatus("saved");
    setTimeout(() => setSaveStatus((current) => (current === "saved" ? "idle" : current)), 1500);
  }

  async function runSaving(action) {
    setSaveStatus("saving");
    try {
      await action();
      flashSaved();
    } catch (err) {
      setError(err);
      setSaveStatus("error");
    }
  }

  function handleAddBlock(type) {
    const meta = blockTypes?.find((entry) => entry.type === type);
    if (!meta) return; // catalogue pas encore chargé -> le panneau est de toute façon désactivé jusque-là
    runSaving(async () => {
      const block = await createBlock(formId, {
        type,
        label: meta.defaultLabel,
        required: false,
        width: "full",
        config: meta.defaultConfig,
      });
      setBlocks((current) => [...current, block]);
      setSelectedBlockId(block.id);
    });
  }

  function handleUpdateBlock(blockId, changes) {
    runSaving(async () => {
      const updated = await updateBlock(formId, blockId, changes);
      setBlocks((current) => current.map((b) => (b.id === blockId ? updated : b)));
    });
  }

  function handleDeleteBlock(blockId) {
    if (!window.confirm("Supprimer ce champ ?")) return;
    runSaving(async () => {
      await deleteBlock(formId, blockId);
      setBlocks((current) => current.filter((b) => b.id !== blockId));
      setSelectedBlockId((current) => (current === blockId ? null : current));
    });
  }

  function handleMove(blockId, direction) {
    const index = blocks.findIndex((b) => b.id === blockId);
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= blocks.length) return;

    const reordered = [...blocks];
    [reordered[index], reordered[targetIndex]] = [reordered[targetIndex], reordered[index]];

    runSaving(async () => {
      const updated = await reorderBlocks(formId, reordered.map((b) => b.id));
      setBlocks(updated);
    });
  }

  function startEditingTitle() {
    setTitleDraft(form.title);
    setEditingTitle(true);
  }

  function commitTitle() {
    setEditingTitle(false);
    const trimmed = titleDraft.trim();
    if (!trimmed || trimmed === form.title) return;
    runSaving(async () => {
      const updated = await updateForm(formId, { title: trimmed });
      setForm(updated);
    });
  }

  //// Une fois publié, le garde-fou plus bas (form.status !== "draft") prend le relais
  //// et affiche son propre message -> rien d'autre à gérer ici après la mise à jour.
  function handlePublish() {
    if (!window.confirm(`Publier « ${form.title} » ? Il deviendra accessible et pourra recevoir des réponses.`)) {
      return;
    }
    runSaving(async () => {
      const updated = await updateForm(formId, { status: "published" });
      setForm(updated);
    });
  }

  if (error && !form) {
    return (
      <div className="page-backdrop">
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
      <div className="page-backdrop">
        <div className="page">
          <BackLink formId={formId} />
          <div className="state-panel">
            <p>Chargement…</p>
          </div>
        </div>
      </div>
    );
  }

  //// Garde-fou : un formulaire déjà publié ne se modifie jamais ici, seulement via duplication.
  if (form.status !== "draft") {
    return (
      <div className="page-backdrop">
        <div className="page">
          <BackLink formId={formId} />
          <div className="state-panel">
            <p className="state-panel__title">Ce formulaire est {form.status === "published" ? "publié" : "archivé"}</p>
            <p>Dupliquez-le depuis sa page de gestion pour le modifier.</p>
          </div>
        </div>
      </div>
    );
  }

  const selectedBlock = blocks.find((b) => b.id === selectedBlockId) || null;

  return (
    <div className="builder">
      <div className="builder__topbar">
        <BackLink formId={formId} />
        {editingTitle ? (
          <input
            type="text"
            className="builder__title-input"
            value={titleDraft}
            autoFocus
            onChange={(e) => setTitleDraft(e.target.value)}
            onBlur={commitTitle}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                e.target.blur();
              }
              if (e.key === "Escape") {
                setEditingTitle(false);
              }
            }}
          />
        ) : (
          <h1 className="builder__title">
            <button type="button" className="builder__title-trigger" title="Renommer le formulaire" onClick={startEditingTitle}>
              {form.title}
            </button>
          </h1>
        )}
        <button type="button" className="btn btn--ghost" onClick={handlePublish} disabled={saveStatus === "saving"}>
          Publier
        </button>
        <Link to={`/forms/${formId}/preview`} className="btn btn--ghost" target="_blank" rel="noreferrer">
          Aperçu
        </Link>
        <SaveStatus status={saveStatus} />
      </div>

      <div className="builder__body">
        <div className="builder__canvas">
          {blocks.length === 0 && (
            <div className="state-panel">
              <p className="state-panel__title">Formulaire vide</p>
              <p>Choisissez un type de champ à droite pour commencer.</p>
            </div>
          )}

          {blocks.map((block, index) => (
            <BlockCanvasItem
              key={block.id}
              block={block}
              selected={block.id === selectedBlockId}
              isFirst={index === 0}
              isLast={index === blocks.length - 1}
              onSelect={() => setSelectedBlockId(block.id)}
              onMoveUp={() => handleMove(block.id, "up")}
              onMoveDown={() => handleMove(block.id, "down")}
              onDelete={() => handleDeleteBlock(block.id)}
            />
          ))}
        </div>

        <div className="builder__panel">
          {selectedBlock ? (
            <BlockSettingsForm
              key={selectedBlock.id}
              block={selectedBlock}
              onUpdate={(changes) => handleUpdateBlock(selectedBlock.id, changes)}
              onDelete={() => handleDeleteBlock(selectedBlock.id)}
              onClose={() => setSelectedBlockId(null)}
            />
          ) : (
            <BlockTypePicker onAdd={handleAddBlock} disabled={saveStatus === "saving"} />
          )}
        </div>
      </div>
    </div>
  );
}

function BackLink({ formId }) {
  return (
    <Link to={`/forms/${formId}`} className="btn btn--ghost back-link">
      ← Retour à la gestion du formulaire
    </Link>
  );
}
