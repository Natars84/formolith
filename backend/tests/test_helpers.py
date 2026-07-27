"""
Infrastructure partagée par test_api.py et par chaque module de
backend/tests/block_type_tests/. Rien ici n'est spécifique à un type de bloc.
"""
import json
import os
import sys
import urllib.error
import urllib.request

BASE_URL = None  # défini par resolve_base_url(), lu par call()

#### Résultats accumulés au fil de tous les tests (script principal + par type de bloc)
results = []


#### Décode le corps de la réponse en JSON ; si ce n'est pas du JSON valide, renvoie un aperçu brut plutôt que de crasher
def parse_body(raw: bytes):
    if not raw:
        return None
    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        return {"_raw_response": raw.decode(errors="replace")[:500]}


#### Fait un appel HTTP brut, renvoie (status_code, corps_décodé) -> ne lève jamais d'exception
def call(method: str, path: str, body: dict | None = None):
    url = f"{BASE_URL}{path}"
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(url, data=data, method=method)
    req.add_header("Content-Type", "application/json")
    try:
        with urllib.request.urlopen(req) as response:
            return response.status, parse_body(response.read())
    except urllib.error.HTTPError as exc:
        return exc.code, parse_body(exc.read())
    except urllib.error.URLError as exc:
        return None, {"_error": str(exc)}
    except Exception as exc:
        return None, {"_error": f"{type(exc).__name__}: {exc}"}


#### Teste si une URL donnée répond sur /health, sans lever d'exception
def is_reachable(url: str) -> bool:
    try:
        with urllib.request.urlopen(f"{url}/health", timeout=3):
            return True
    except (urllib.error.URLError, urllib.error.HTTPError, TimeoutError):
        return False


#### Détermine l'URL cible : argument > variable d'env > défaut local, puis demande tant que ça ne répond pas
def resolve_base_url() -> str:
    global BASE_URL

    if len(sys.argv) > 1:
        candidate = sys.argv[1].rstrip("/")
    else:
        candidate = os.environ.get("FORMOLITH_API_URL", "http://localhost:8000").rstrip("/")

    while not is_reachable(candidate):
        print(f"Impossible de joindre {candidate}")
        candidate = input("URL de l'API (ex: http://192.168.1.50:8000), vide pour quitter : ").strip().rstrip("/")
        if candidate == "":
            print("Abandon, aucune URL valide fournie.")
            sys.exit(1)

    print(f"Cible : {candidate}\n")
    BASE_URL = candidate
    return candidate


#### Enregistre le résultat d'un test et l'affiche immédiatement
def check(name: str, condition: bool, detail: str = ""):
    status = "PASS" if condition else "FAIL"
    results.append((name, condition))
    line = f"[{status}] {name}"
    if detail and not condition:
        line += f"  -> {detail}"
    print(line)


#### Crée un formulaire de test dédié, exécute test_fn(form_id), nettoie systématiquement.
#### Chaque module block_type_tests/*.py s'appuie dessus pour rester autonome, sans
#### dupliquer la création/suppression du formulaire dans chaque fichier.
def with_scratch_form(title: str, test_fn):
    status, form = call("POST", "/forms", {"title": title})
    if not (status == 200 and isinstance(form, dict) and "id" in form):
        check(f"POST /forms ({title}) : création du formulaire", False, f"reçu {status} {form}")
        return

    form_id = form["id"]
    try:
        test_fn(form_id)
    finally:
        status, _ = call("DELETE", f"/forms/{form_id}")
        check(f"DELETE /forms/{{id}} : nettoyage ({title}) (204)", status == 204, f"reçu {status}")
