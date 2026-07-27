//// Chemin relatif : en dev, le serveur Vite le fait suivre (voir vite.config.js) ;
//// en prod, c'est Nginx (dans le conteneur frontend) qui le fait suivre vers l'API.
const BASE_URL = "/api";

//// Erreur enrichie avec le statut HTTP et le corps de la réponse, pour un affichage utile côté UI
class ApiError extends Error {
  constructor(status, body) {
    super(`Erreur API ${status}`);
    this.status = status;
    this.body = body;
  }
}

//// Appel HTTP générique, utilisé par toutes les fonctions ci-dessous
async function request(method, path, body) {
  const response = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (response.status === 204) {
    return null;
  }

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw new ApiError(response.status, data);
  }

  return data;
}

//// Formulaires
export const listForms = () => request("GET", "/forms");
export const createForm = (title) => request("POST", "/forms", { title });
export const getForm = (formId) => request("GET", `/forms/${formId}`);
export const updateForm = (formId, changes) => request("PATCH", `/forms/${formId}`, changes);
export const deleteForm = (formId) => request("DELETE", `/forms/${formId}`);
export const duplicateForm = (formId) => request("POST", `/forms/${formId}/duplicate`);

//// Catalogue des types de blocs (existence, libellé, config attendue) -> source unique, plutôt qu'une liste dupliquée à la main côté frontend
export const listBlockTypes = () => request("GET", "/block-types");

//// Blocs
export const listBlocks = (formId) => request("GET", `/forms/${formId}/blocks`);
export const createBlock = (formId, block) => request("POST", `/forms/${formId}/blocks`, block);
export const updateBlock = (formId, blockId, changes) =>
  request("PATCH", `/forms/${formId}/blocks/${blockId}`, changes);
export const deleteBlock = (formId, blockId) => request("DELETE", `/forms/${formId}/blocks/${blockId}`);
export const reorderBlocks = (formId, blockIds) =>
  request("PATCH", `/forms/${formId}/blocks/reorder`, { block_ids: blockIds });

//// Réponses
export const listSubmissions = (formId) => request("GET", `/forms/${formId}/submissions`);
export const deleteSubmission = (formId, submissionId) =>
  request("DELETE", `/forms/${formId}/submissions/${submissionId}`);

export { ApiError };
