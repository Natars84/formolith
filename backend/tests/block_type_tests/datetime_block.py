from test_helpers import call, check, with_scratch_form


def run():
    with_scratch_form("Formulaire de test (datetime)", _run)


def _run(form_id):
    status, block = call("POST", f"/forms/{form_id}/blocks", {"type": "datetime", "label": "Date", "config": {"mode": "date"}})
    check("POST /blocks : datetime valide (mode=date)", status == 200, f"reçu {status} {block}")

    status, err = call("POST", f"/forms/{form_id}/blocks", {"type": "datetime", "label": "Invalide", "config": {"mode": "siecle"}})
    check("POST /blocks : datetime avec mode invalide rejeté (422)", status == 422, f"reçu {status} {err}")

    if not isinstance(block, dict) or "id" not in block:
        return

    call("PATCH", f"/forms/{form_id}", {"status": "published"})

    status, ok = call("POST", f"/forms/{form_id}/submissions", {"data": {block["id"]: "2026-08-15"}})
    check("POST /submissions : date au format attendu acceptée", status == 200, f"reçu {status} {ok}")

    status, err = call("POST", f"/forms/{form_id}/submissions", {"data": {block["id"]: "15/08/2026"}})
    check("POST /submissions : date au mauvais format rejetée (422)", status == 422, f"reçu {status} {err}")
