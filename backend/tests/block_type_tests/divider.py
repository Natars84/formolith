from test_helpers import call, check, with_scratch_form


def run():
    with_scratch_form("Formulaire de test (divider)", _run)


def _run(form_id):
    #### DividerConfig n'a aucun réglage -> pas de cas invalide naturel à tester
    status, block = call("POST", f"/forms/{form_id}/blocks", {"type": "divider", "label": ""})
    check("POST /blocks : divider valide", status == 200, f"reçu {status} {block}")
