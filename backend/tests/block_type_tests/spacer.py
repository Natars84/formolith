from test_helpers import call, check, with_scratch_form


def run():
    with_scratch_form("Formulaire de test (spacer)", _run)


def _run(form_id):
    status, block = call("POST", f"/forms/{form_id}/blocks", {"type": "spacer", "label": "", "config": {"height": 32}})
    check("POST /blocks : spacer valide", status == 200, f"reçu {status} {block}")

    status, err = call("POST", f"/forms/{form_id}/blocks", {"type": "spacer", "label": "", "config": {"height": "trente-deux"}})
    check("POST /blocks : spacer avec height non numérique rejeté (422)", status == 422, f"reçu {status} {err}")
