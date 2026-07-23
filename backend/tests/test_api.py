#!/usr/bin/env python3
"""
Script de tests d'intégration pour l'API Formolith.

Crée un formulaire dédié aux tests, y ajoute des blocs de chaque type,
vérifie le comportement de chaque endpoint (cas valides ET invalides),
puis supprime tout ce qu'il a créé, même en cas d'échec en cours de route.

Usage :
    python3 test_api.py
    FORMOLITH_API_URL=http://formolith.cutlass.red python3 test_api.py
"""
import json
import os
import urllib.error
import urllib.request

BASE_URL = os.environ.get("FORMOLITH_API_URL", "http://localhost:8000")

#### Résultats accumulés au fil des tests, affichés en résumé à la fin
results = []


#### Fait un appel HTTP brut, renvoie (status_code, corps_json_ou_None)
def call(method: str, path: str, body: dict | None = None):
    url = f"{BASE_URL}{path}"
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(url, data=data, method=method)
    req.add_header("Content-Type", "application/json")
    try:
        with urllib.request.urlopen(req) as response:
            raw = response.read()
            return response.status, (json.loads(raw) if raw else None)
    except urllib.error.HTTPError as exc:
        raw = exc.read()
        return exc.code, (json.loads(raw) if raw else None)


#### Enregistre le résultat d'un test et l'affiche immédiatement
def check(name: str, condition: bool, detail: str = ""):
    status = "PASS" if condition else "FAIL"
    results.append((name, condition))
    line = f"[{status}] {name}"
    if detail and not condition:
        line += f"  -> {detail}"
    print(line)


def main():
    print(f"Cible : {BASE_URL}\n")

    #### 0. Sanité de base avant de commencer quoi que ce soit
    status, body = call("GET", "/health")
    check("GET /health répond 200 ok", status == 200 and body.get("status") == "ok", f"reçu {status} {body}")

    #### 1. Création du formulaire dédié aux tests
    status, form = call("POST", "/forms", {"title": "Formulaire de test (script automatique)"})
    check("POST /forms crée un formulaire", status == 200 and "id" in form, f"reçu {status} {form}")
    form_id = form["id"]

    try:
        #### 2. Création des blocs, un de chaque type, avec un état connu
        status, block_text = call(
            "POST", f"/forms/{form_id}/blocks",
            {"type": "text", "label": "Prénom", "required": True, "config": {"max_length": 5}},
        )
        check("POST /blocks : texte valide (required, max_length=5)", status == 200, f"reçu {status} {block_text}")

        status, block_slider = call(
            "POST", f"/forms/{form_id}/blocks",
            {"type": "slider", "label": "Âge", "config": {"min": 0, "max": 10}},
        )
        check("POST /blocks : slider valide (0-10)", status == 200, f"reçu {status} {block_slider}")

        status, block_checkbox = call(
            "POST", f"/forms/{form_id}/blocks",
            {"type": "checkbox", "label": "CGU acceptées"},
        )
        check("POST /blocks : checkbox valide", status == 200, f"reçu {status} {block_checkbox}")

        status, block_select = call(
            "POST", f"/forms/{form_id}/blocks",
            {"type": "select", "label": "Niveau", "config": {"options": ["Débutant", "Confirmé"]}},
        )
        check("POST /blocks : select valide", status == 200, f"reçu {status} {block_select}")

        #### 3. Rejet d'un bloc mal configuré (slider sans min)
        status, err = call(
            "POST", f"/forms/{form_id}/blocks",
            {"type": "slider", "label": "Invalide", "config": {"max": 100}},
        )
        check("POST /blocks : slider sans min rejeté (422)", status == 422, f"reçu {status} {err}")

        #### 4. Lecture de la liste, positions attendues 1 à 4
        status, blocks = call("GET", f"/forms/{form_id}/blocks")
        positions = [b["position"] for b in blocks] if blocks else []
        check("GET /blocks : 4 blocs, positions 1..4", status == 200 and positions == [1, 2, 3, 4], f"reçu {positions}")

        #### 5. Modification d'un bloc (label uniquement)
        status, updated = call("PATCH", f"/forms/{form_id}/blocks/{block_text['id']}", {"label": "Prénom (modifié)"})
        check("PATCH /blocks : modifie le label", status == 200 and updated["label"] == "Prénom (modifié)", f"reçu {status} {updated}")

        #### 6. Réorganisation : on inverse les 4 blocs
        reordered_ids = [block_select["id"], block_checkbox["id"], block_slider["id"], block_text["id"]]
        status, reordered = call("PATCH", f"/forms/{form_id}/blocks/reorder", {"block_ids": reordered_ids})
        new_positions = [b["id"] for b in reordered] if reordered else []
        check("PATCH /blocks/reorder : nouvel ordre appliqué", status == 200 and new_positions == reordered_ids, f"reçu {status}")

        #### 7. Rejet d'une réorganisation incomplète
        status, err = call("PATCH", f"/forms/{form_id}/blocks/reorder", {"block_ids": [block_text["id"]]})
        check("PATCH /blocks/reorder : liste incomplète rejetée (422)", status == 422, f"reçu {status} {err}")

        #### 8. Réponse valide (tous les blocs correctement remplis)
        status, submission = call(
            "POST", f"/forms/{form_id}/submissions",
            {"data": {
                block_text["id"]: "Jean",
                block_slider["id"]: 7,
                block_checkbox["id"]: True,
                block_select["id"]: "Débutant",
            }},
        )
        check("POST /submissions : réponse valide acceptée", status == 200, f"reçu {status} {submission}")

        #### 9. Rejet : champ requis manquant (le texte, marqué required)
        status, err = call(
            "POST", f"/forms/{form_id}/submissions",
            {"data": {block_slider["id"]: 5}},
        )
        check("POST /submissions : champ requis manquant rejeté (422)", status == 422, f"reçu {status} {err}")

        #### 10. Rejet : slider hors bornes
        status, err = call(
            "POST", f"/forms/{form_id}/submissions",
            {"data": {block_text["id"]: "Jean", block_slider["id"]: 999}},
        )
        check("POST /submissions : slider hors bornes rejeté (422)", status == 422, f"reçu {status} {err}")

        #### 11. Rejet : valeur select hors options
        status, err = call(
            "POST", f"/forms/{form_id}/submissions",
            {"data": {block_text["id"]: "Jean", block_select["id"]: "Expert"}},
        )
        check("POST /submissions : select hors options rejeté (422)", status == 422, f"reçu {status} {err}")

        #### 12. Rejet : clé référant un bloc inexistant
        status, err = call(
            "POST", f"/forms/{form_id}/submissions",
            {"data": {block_text["id"]: "Jean", "00000000-0000-0000-0000-000000000000": "x"}},
        )
        check("POST /submissions : bloc inconnu rejeté (422)", status == 422, f"reçu {status} {err}")

        #### 13. Liste des réponses : une seule (la valide, les autres ont été rejetées avant écriture)
        status, submissions = call("GET", f"/forms/{form_id}/submissions")
        check("GET /submissions : exactement 1 réponse enregistrée", status == 200 and len(submissions) == 1, f"reçu {len(submissions) if submissions else 0}")

        #### 14. Lecture d'une réponse précise
        status, one = call("GET", f"/forms/{form_id}/submissions/{submission['id']}")
        check("GET /submissions/{id} : relit la bonne réponse", status == 200 and one["id"] == submission["id"], f"reçu {status}")

        #### 15. Suppression d'une réponse
        status, _ = call("DELETE", f"/forms/{form_id}/submissions/{submission['id']}")
        check("DELETE /submissions/{id} : supprime (204)", status == 204, f"reçu {status}")

        status, submissions = call("GET", f"/forms/{form_id}/submissions")
        check("GET /submissions : 0 réponse après suppression", status == 200 and len(submissions) == 0, f"reçu {len(submissions) if submissions else 0}")

        #### 16. Suppression d'un bloc
        status, _ = call("DELETE", f"/forms/{form_id}/blocks/{block_checkbox['id']}")
        check("DELETE /blocks/{id} : supprime (204)", status == 204, f"reçu {status}")

    finally:
        #### 17. Nettoyage systématique -> supprime le formulaire de test, cascade sur ses blocs restants
        status, _ = call("DELETE", f"/forms/{form_id}")
        check("DELETE /forms/{id} : nettoyage du formulaire de test (204)", status == 204, f"reçu {status}")

    #### Résumé final
    total = len(results)
    passed = sum(1 for _, ok in results if ok)
    print(f"\n{passed}/{total} tests passés")
    if passed != total:
        exit(1)


if __name__ == "__main__":
    main()
