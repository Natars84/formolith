from test_helpers import call, check, with_scratch_form


def run():
    with_scratch_form("Formulaire de test (paragraph)", _run)


def _run(form_id):
    status, block = call("POST", f"/forms/{form_id}/blocks", {"type": "paragraph", "label": "", "config": {"content": "Bienvenue"}})
    check("POST /blocks : paragraph valide", status == 200, f"reçu {status} {block}")

    status, err = call("POST", f"/forms/{form_id}/blocks", {"type": "paragraph", "label": "", "config": {"content": 123}})
    check("POST /blocks : paragraph avec content non textuel rejeté (422)", status == 422, f"reçu {status} {err}")

    status, block = call("POST", f"/forms/{form_id}/blocks", {"type": "paragraph", "label": "", "config": {"content": "Centré", "align": "center"}})
    check("POST /blocks : paragraph avec align=center valide", status == 200, f"reçu {status} {block}")

    status, err = call("POST", f"/forms/{form_id}/blocks", {"type": "paragraph", "label": "", "config": {"content": "Invalide", "align": "diagonal"}})
    check("POST /blocks : paragraph avec align hors liste rejeté (422)", status == 422, f"reçu {status} {err}")
