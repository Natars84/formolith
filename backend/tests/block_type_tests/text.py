from test_helpers import call, check, with_scratch_form


def run():
    with_scratch_form("Formulaire de test (text)", _run)


def _run(form_id):
    status, block = call("POST", f"/forms/{form_id}/blocks", {"type": "text", "label": "Commentaire", "config": {"max_length": 5}})
    check("POST /blocks : text valide (max_length=5)", status == 200, f"reçu {status} {block}")
    if status != 200:
        return

    call("PATCH", f"/forms/{form_id}", {"status": "published"})

    status, ok = call("POST", f"/forms/{form_id}/submissions", {"data": {block["id"]: "salut"}})
    check("POST /submissions : texte dans la longueur autorisée accepté", status == 200, f"reçu {status} {ok}")

    status, err = call("POST", f"/forms/{form_id}/submissions", {"data": {block["id"]: "beaucoup trop long"}})
    check("POST /submissions : texte dépassant max_length rejeté (422)", status == 422, f"reçu {status} {err}")

    status, err = call("POST", f"/forms/{form_id}/submissions", {"data": {block["id"]: 42}})
    check("POST /submissions : valeur non textuelle rejetée (422)", status == 422, f"reçu {status} {err}")
