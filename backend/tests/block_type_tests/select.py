from test_helpers import call, check, with_scratch_form


def run():
    with_scratch_form("Formulaire de test (select)", _run)


def _run(form_id):
    status, block = call("POST", f"/forms/{form_id}/blocks", {"type": "select", "label": "Niveau", "config": {"options": ["Débutant", "Confirmé"]}})
    check("POST /blocks : select valide", status == 200, f"reçu {status} {block}")

    status, err = call("POST", f"/forms/{form_id}/blocks", {"type": "select", "label": "Invalide", "config": {}})
    check("POST /blocks : select sans options rejeté (422)", status == 422, f"reçu {status} {err}")

    if not isinstance(block, dict) or "id" not in block:
        return

    call("PATCH", f"/forms/{form_id}", {"status": "published"})

    status, ok = call("POST", f"/forms/{form_id}/submissions", {"data": {block["id"]: "Débutant"}})
    check("POST /submissions : option valide acceptée", status == 200, f"reçu {status} {ok}")

    status, err = call("POST", f"/forms/{form_id}/submissions", {"data": {block["id"]: "Expert"}})
    check("POST /submissions : option hors liste rejetée (422)", status == 422, f"reçu {status} {err}")
