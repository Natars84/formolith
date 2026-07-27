from test_helpers import call, check, with_scratch_form


def run():
    with_scratch_form("Formulaire de test (markdown)", _run)


def _run(form_id):
    status, block = call("POST", f"/forms/{form_id}/blocks", {"type": "markdown", "label": "", "config": {"content": "## Titre"}})
    check("POST /blocks : markdown valide", status == 200, f"reçu {status} {block}")

    status, err = call("POST", f"/forms/{form_id}/blocks", {"type": "markdown", "label": "", "config": {"content": ["pas une chaîne"]}})
    check("POST /blocks : markdown avec content non textuel rejeté (422)", status == 422, f"reçu {status} {err}")

    status, err = call("POST", f"/forms/{form_id}/blocks", {"type": "markdown", "label": "", "config": {"content": "Texte", "align": "diagonal"}})
    check("POST /blocks : markdown avec align hors liste rejeté (422)", status == 422, f"reçu {status} {err}")
