from test_helpers import call, check, with_scratch_form


def run():
    with_scratch_form("Formulaire de test (checkbox)", _run)


def _run(form_id):
    status, block = call("POST", f"/forms/{form_id}/blocks", {"type": "checkbox", "label": "CGU acceptées"})
    check("POST /blocks : checkbox valide", status == 200, f"reçu {status} {block}")
    if status != 200:
        return

    call("PATCH", f"/forms/{form_id}", {"status": "published"})

    status, ok = call("POST", f"/forms/{form_id}/submissions", {"data": {block["id"]: True}})
    check("POST /submissions : booléen accepté", status == 200, f"reçu {status} {ok}")

    status, err = call("POST", f"/forms/{form_id}/submissions", {"data": {block["id"]: "oui"}})
    check("POST /submissions : valeur non booléenne rejetée (422)", status == 422, f"reçu {status} {err}")
