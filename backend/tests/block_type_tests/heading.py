from test_helpers import call, check, with_scratch_form


def run():
    with_scratch_form("Formulaire de test (heading)", _run)


def _run(form_id):
    #### required=True volontaire -> vérifie plus bas qu'il reste ignoré à la validation d'une réponse
    status, block = call("POST", f"/forms/{form_id}/blocks", {"type": "heading", "required": True, "label": "", "config": {"content": "Section", "level": 2}})
    check("POST /blocks : heading valide", status == 200, f"reçu {status} {block}")

    status, err = call("POST", f"/forms/{form_id}/blocks", {"type": "heading", "label": "", "config": {"content": "Section", "level": "deux"}})
    check("POST /blocks : heading avec level non numérique rejeté (422)", status == 422, f"reçu {status} {err}")

    status, err = call("POST", f"/forms/{form_id}/blocks", {"type": "heading", "label": "", "config": {"content": "Section", "align": "diagonal"}})
    check("POST /blocks : heading avec align hors liste rejeté (422)", status == 422, f"reçu {status} {err}")

    call("PATCH", f"/forms/{form_id}", {"status": "published"})

    status, submission = call("POST", f"/forms/{form_id}/submissions", {"data": {}})
    check("POST /submissions : heading required=True jamais exigé (bloc de contenu)", status == 200, f"reçu {status} {submission}")
