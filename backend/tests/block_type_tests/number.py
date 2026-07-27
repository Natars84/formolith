from test_helpers import call, check, with_scratch_form


def run():
    with_scratch_form("Formulaire de test (number)", _run)


def _run(form_id):
    status, block = call("POST", f"/forms/{form_id}/blocks", {"type": "number", "label": "Âge", "config": {"min": 0, "max": 10}})
    check("POST /blocks : number valide (0-10)", status == 200, f"reçu {status} {block}")

    status, err = call("POST", f"/forms/{form_id}/blocks", {"type": "number", "label": "Invalide", "config": {"max": 100}})
    check("POST /blocks : number sans min rejeté (422)", status == 422, f"reçu {status} {err}")

    if not isinstance(block, dict) or "id" not in block:
        return

    call("PATCH", f"/forms/{form_id}", {"status": "published"})

    status, ok = call("POST", f"/forms/{form_id}/submissions", {"data": {block["id"]: 7}})
    check("POST /submissions : nombre dans les bornes accepté", status == 200, f"reçu {status} {ok}")

    status, err = call("POST", f"/forms/{form_id}/submissions", {"data": {block["id"]: 999}})
    check("POST /submissions : nombre hors bornes rejeté (422)", status == 422, f"reçu {status} {err}")
