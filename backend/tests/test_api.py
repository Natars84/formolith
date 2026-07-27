#!/usr/bin/env python3
"""
Script de tests d'intégration pour l'API Formolith.

Deux parties :
1. Mécanique générale des formulaires (création, liste, statut, blocs,
   réorganisation, réponses, duplication) -> ci-dessous, avec des blocs
   text/number/checkbox/select comme simples supports.
2. Validation propre à chaque type de bloc -> un fichier par type dans
   block_type_tests/, découvert automatiquement. Pour ajouter un nouveau
   type de bloc, il suffit d'ajouter un fichier là-bas (voir le patron
   des fichiers existants) ; ce script n'a jamais besoin d'être modifié
   pour ça.

Avant de lancer les tests, vérifie que l'URL cible répond. Si ce n'est
pas le cas (argument fourni, variable d'environnement, ou défaut local),
demande l'URL à saisir, jusqu'à en trouver une qui répond.

Usage :
    python3 test_api.py
    python3 test_api.py http://192.168.1.50:8000
    FORMOLITH_API_URL=http://formolith.cutlass.red python3 test_api.py
"""
import importlib
import pkgutil
import sys

import block_type_tests
from test_helpers import call, check, resolve_base_url, results


#### Types attendus dans le catalogue -> à mettre à jour à chaque nouveau type de bloc ajouté
#### (le fichier de test lui-même, dans block_type_tests/, est découvert automatiquement ;
#### cette liste ne sert qu'à vérifier que /block-types les expose tous)
EXPECTED_BLOCK_TYPES = {
    "text", "number", "datetime", "checkbox", "select",
    "paragraph", "markdown", "heading", "spacer", "divider",
}


#### Exécute run() de chaque module de block_type_tests/ -> aucune modification
#### nécessaire ici pour qu'un nouveau fichier de test soit pris en compte
def run_block_type_tests():
    for _, module_name, _ in pkgutil.iter_modules(block_type_tests.__path__):
        module = importlib.import_module(f"block_type_tests.{module_name}")
        if hasattr(module, "run"):
            module.run()


def main():
    resolve_base_url()

    #### 0. Sanité de base avant de commencer quoi que ce soit
    status, body = call("GET", "/health")
    check("GET /health répond 200 ok", status == 200 and body.get("status") == "ok", f"reçu {status} {body}")

    #### 0bis. Catalogue des types de blocs -> chaque type attendu doit être présent, avec la bonne forme
    status, block_types = call("GET", "/block-types")
    block_types_ok = (
        status == 200
        and isinstance(block_types, list)
        and {entry.get("type") for entry in block_types} == EXPECTED_BLOCK_TYPES
        and all({"type", "display_name", "collects_data", "config_schema"} <= entry.keys() for entry in block_types)
    )
    check("GET /block-types : catalogue complet et bien formé", block_types_ok, f"reçu {status} {block_types}")

    #### 1. Création du formulaire dédié à la mécanique générale
    status, form = call("POST", "/forms", {"title": "Formulaire de test (script automatique)"})
    form_created = status == 200 and isinstance(form, dict) and "id" in form
    check("POST /forms crée un formulaire", form_created, f"reçu {status} {form}")

    if not form_created:
        print("\nImpossible de continuer sans formulaire valide, arrêt des tests.")
        total = len(results)
        passed = sum(1 for _, ok in results if ok)
        print(f"{passed}/{total} tests passés")
        sys.exit(1)

    form_id = form["id"]

    #### 1bis. Le formulaire tout juste créé doit apparaître dans la liste globale
    status, all_forms = call("GET", "/forms")
    form_ids = [f["id"] for f in all_forms] if isinstance(all_forms, list) else None
    check("GET /forms : le formulaire de test apparaît dans la liste", status == 200 and form_ids is not None and form_id in form_ids, f"reçu {status} {all_forms}")

    try:
        #### 2. Quatre blocs, simples supports pour tester la mécanique (pas leur propre validation, voir block_type_tests/)
        status, block_text = call("POST", f"/forms/{form_id}/blocks", {"type": "text", "label": "Prénom", "required": True})
        check("POST /blocks : bloc support (text)", status == 200, f"reçu {status} {block_text}")

        status, block_number = call("POST", f"/forms/{form_id}/blocks", {"type": "number", "label": "Âge", "config": {"min": 0, "max": 10}})
        check("POST /blocks : bloc support (number)", status == 200, f"reçu {status} {block_number}")

        status, block_checkbox = call("POST", f"/forms/{form_id}/blocks", {"type": "checkbox", "label": "CGU acceptées"})
        check("POST /blocks : bloc support (checkbox)", status == 200, f"reçu {status} {block_checkbox}")

        status, block_select = call("POST", f"/forms/{form_id}/blocks", {"type": "select", "label": "Niveau", "config": {"options": ["Débutant", "Confirmé"]}})
        check("POST /blocks : bloc support (select)", status == 200, f"reçu {status} {block_select}")

        #### 3. Lecture de la liste, positions attendues 1 à 4
        status, blocks = call("GET", f"/forms/{form_id}/blocks")
        positions = [b["position"] for b in blocks] if isinstance(blocks, list) else None
        check("GET /blocks : 4 blocs, positions 1..4", status == 200 and positions == [1, 2, 3, 4], f"reçu {status} {blocks}")

        #### 4. Modification d'un bloc (label uniquement)
        status, updated = call("PATCH", f"/forms/{form_id}/blocks/{block_text['id']}", {"label": "Prénom (modifié)"})
        check("PATCH /blocks : modifie le label", status == 200 and updated["label"] == "Prénom (modifié)", f"reçu {status} {updated}")

        #### 5. Réorganisation : on inverse les 4 blocs
        reordered_ids = [block_select["id"], block_checkbox["id"], block_number["id"], block_text["id"]]
        status, reordered = call("PATCH", f"/forms/{form_id}/blocks/reorder", {"block_ids": reordered_ids})
        new_positions = [b["id"] for b in reordered] if isinstance(reordered, list) else None
        check("PATCH /blocks/reorder : nouvel ordre appliqué", status == 200 and new_positions == reordered_ids, f"reçu {status} {reordered}")

        #### 6. Rejet d'une réorganisation incomplète
        status, err = call("PATCH", f"/forms/{form_id}/blocks/reorder", {"block_ids": [block_text["id"]]})
        check("PATCH /blocks/reorder : liste incomplète rejetée (422)", status == 422, f"reçu {status} {err}")

        #### 7. Un formulaire encore en draft doit refuser toute réponse
        status, err = call(
            "POST", f"/forms/{form_id}/submissions",
            {"data": {block_text["id"]: "Jean", block_number["id"]: 5, block_checkbox["id"]: True, block_select["id"]: "Débutant"}},
        )
        check("POST /submissions : formulaire en draft rejeté (403)", status == 403, f"reçu {status} {err}")

        #### 8. On publie le formulaire -> les réponses suivantes doivent être acceptées
        status, published_form = call("PATCH", f"/forms/{form_id}", {"status": "published"})
        check("PATCH /forms : passage en published", status == 200 and published_form.get("status") == "published", f"reçu {status} {published_form}")

        #### 9. Réponse valide (tous les blocs correctement remplis)
        status, submission = call(
            "POST", f"/forms/{form_id}/submissions",
            {"data": {block_text["id"]: "Jean", block_number["id"]: 7, block_checkbox["id"]: True, block_select["id"]: "Débutant"}},
        )
        submission_created = status == 200 and isinstance(submission, dict) and "id" in submission
        check("POST /submissions : réponse valide acceptée", submission_created, f"reçu {status} {submission}")

        submission_id = submission["id"] if submission_created else "00000000-0000-0000-0000-000000000000"

        #### 10. Rejet : champ requis manquant, clé référant un bloc inexistant
        status, err = call("POST", f"/forms/{form_id}/submissions", {"data": {block_number["id"]: 5}})
        check("POST /submissions : champ requis manquant rejeté (422)", status == 422, f"reçu {status} {err}")

        status, err = call("POST", f"/forms/{form_id}/submissions", {"data": {block_text["id"]: "Jean", "00000000-0000-0000-0000-000000000000": "x"}})
        check("POST /submissions : bloc inconnu rejeté (422)", status == 422, f"reçu {status} {err}")

        #### 11. Liste, lecture, suppression d'une réponse
        status, submissions = call("GET", f"/forms/{form_id}/submissions")
        check("GET /submissions : exactement 1 réponse enregistrée", status == 200 and len(submissions) == 1, f"reçu {len(submissions) if submissions else 0}")

        status, one = call("GET", f"/forms/{form_id}/submissions/{submission_id}")
        check("GET /submissions/{id} : relit la bonne réponse", status == 200 and isinstance(one, dict) and one.get("id") == submission_id, f"reçu {status} {one}")

        status, _ = call("DELETE", f"/forms/{form_id}/submissions/{submission_id}")
        check("DELETE /submissions/{id} : supprime (204)", status == 204, f"reçu {status}")

        status, submissions = call("GET", f"/forms/{form_id}/submissions")
        check("GET /submissions : 0 réponse après suppression", status == 200 and len(submissions) == 0, f"reçu {len(submissions) if submissions else 0}")

        #### 11bis. Lien public : accessible une fois publié, sans jamais exposer form_id, régénérable
        public_token = form["public_token"]

        status, public_form = call("GET", f"/public/forms/{public_token}")
        no_form_id_leak = isinstance(public_form, dict) and form_id not in str(public_form)
        check("GET /public/forms/{token} : formulaire publié accessible, sans form_id", status == 200 and no_form_id_leak, f"reçu {status} {public_form}")

        status, err = call("GET", "/public/forms/token-bidon-inexistant")
        check("GET /public/forms/{token} : token inconnu rejeté (404)", status == 404, f"reçu {status} {err}")

        status, _ = call(
            "POST", f"/public/forms/{public_token}/submissions",
            {"data": {block_text["id"]: "Marie", block_number["id"]: 3, block_checkbox["id"]: True, block_select["id"]: "Débutant"}},
        )
        check("POST /public/forms/{token}/submissions : réponse publique acceptée (204)", status == 204, f"reçu {status}")

        #### On nettoie cette réponse tout de suite, pour ne pas fausser les comptages des étapes suivantes
        status, public_submissions = call("GET", f"/forms/{form_id}/submissions")
        if isinstance(public_submissions, list):
            for s in public_submissions:
                call("DELETE", f"/forms/{form_id}/submissions/{s['id']}")

        status, regenerated = call("POST", f"/forms/{form_id}/regenerate-public-token")
        new_token = regenerated.get("public_token") if isinstance(regenerated, dict) else None
        check("POST /regenerate-public-token : nouveau token généré", status == 200 and new_token and new_token != public_token, f"reçu {status} {regenerated}")

        status, err = call("GET", f"/public/forms/{public_token}")
        check("GET /public/forms/{token} : ancien token révoqué après régénération (404)", status == 404, f"reçu {status} {err}")

        status, one = call("GET", f"/public/forms/{new_token}")
        check("GET /public/forms/{token} : nouveau token fonctionne", status == 200, f"reçu {status} {one}")

        #### 12. Suppression d'un bloc
        status, _ = call("DELETE", f"/forms/{form_id}/blocks/{block_checkbox['id']}")
        check("DELETE /blocks/{id} : supprime (204)", status == 204, f"reçu {status}")

        #### 13. Duplication : nouveau formulaire en draft, mêmes blocs, aucune réponse copiée
        status, current_blocks = call("GET", f"/forms/{form_id}/blocks")
        original_block_count = len(current_blocks) if isinstance(current_blocks, list) else None

        status, duplicate = call("POST", f"/forms/{form_id}/duplicate")
        duplicate_created = status == 200 and isinstance(duplicate, dict) and "id" in duplicate
        check(
            "POST /forms/{id}/duplicate : crée une copie en draft",
            duplicate_created and duplicate.get("status") == "draft" and duplicate.get("title", "").endswith("(copie)"),
            f"reçu {status} {duplicate}",
        )

        if duplicate_created:
            duplicate_id = duplicate["id"]
            try:
                status, dup_blocks = call("GET", f"/forms/{duplicate_id}/blocks")
                dup_count = len(dup_blocks) if isinstance(dup_blocks, list) else None
                check("Duplication : même nombre de blocs que l'original", dup_count is not None and dup_count == original_block_count, f"original={original_block_count} copie={dup_count}")

                status, dup_submissions = call("GET", f"/forms/{duplicate_id}/submissions")
                check("Duplication : aucune réponse copiée", status == 200 and isinstance(dup_submissions, list) and len(dup_submissions) == 0, f"reçu {status} {dup_submissions}")
            finally:
                status, _ = call("DELETE", f"/forms/{duplicate_id}")
                check("DELETE /forms/{id} : nettoyage du formulaire dupliqué (204)", status == 204, f"reçu {status}")

    finally:
        #### 14. Nettoyage systématique -> supprime le formulaire de test, cascade sur ses blocs restants
        status, _ = call("DELETE", f"/forms/{form_id}")
        check("DELETE /forms/{id} : nettoyage du formulaire de test (204)", status == 204, f"reçu {status}")

    #### Validation propre à chaque type de bloc -> un fichier par type, découvert automatiquement
    run_block_type_tests()

    #### Résumé final
    total = len(results)
    passed = sum(1 for _, ok in results if ok)
    print(f"\n{passed}/{total} tests passés")
    if passed != total:
        sys.exit(1)


if __name__ == "__main__":
    main()
