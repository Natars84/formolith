from enum import Enum
from typing import Literal

from pydantic import BaseModel


#### Config attendue pour un champ texte
class TextConfig(BaseModel):
    max_length: int | None = None


#### Config attendue pour un champ numérique -> un input nombre par défaut,
#### avec un curseur additionnel en option (partage la même valeur)
class NumberConfig(BaseModel):
    min: int
    max: int
    step: int = 1
    show_slider: bool = False


#### Config attendue pour une case à cocher isolée (ex: "J'accepte les CGU")
class CheckboxConfig(BaseModel):
    pass


#### Config attendue pour un choix parmi une liste (unique ou multiple)
class SelectConfig(BaseModel):
    options: list[str]
    multiple: bool = False
    display: Literal["dropdown", "inline"] = "dropdown"


#### Config attendue pour un paragraphe explicatif -> ne collecte aucune réponse
class ParagraphConfig(BaseModel):
    content: str = ""


#### Config attendue pour un bloc Markdown -> ne collecte aucune réponse
class MarkdownConfig(BaseModel):
    content: str = ""


#### Config attendue pour un titre de section -> ne collecte aucune réponse
class HeadingConfig(BaseModel):
    content: str = ""
    level: int = 2  # H1 à H6


#### Config attendue pour un espaceur -> ne collecte aucune réponse
class SpacerConfig(BaseModel):
    height: int = 24  # en pixels


#### Config attendue pour une ligne séparatrice -> ne collecte aucune réponse, aucun réglage
class DividerConfig(BaseModel):
    pass


class BlockType(str, Enum):
    text = "text"
    number = "number"
    checkbox = "checkbox"
    select = "select"
    paragraph = "paragraph"
    markdown = "markdown"
    heading = "heading"
    spacer = "spacer"
    divider = "divider"


#### Types qui ne collectent aucune donnée -> jamais "required", toujours ignorés à la validation d'une réponse
NON_INPUT_BLOCK_TYPES = {
    BlockType.paragraph,
    BlockType.markdown,
    BlockType.heading,
    BlockType.spacer,
    BlockType.divider,
}


#### Un seul endroit qui relie chaque type à sa config attendue
BLOCK_CONFIG_SCHEMAS: dict[BlockType, type[BaseModel]] = {
    BlockType.text: TextConfig,
    BlockType.number: NumberConfig,
    BlockType.checkbox: CheckboxConfig,
    BlockType.select: SelectConfig,
    BlockType.paragraph: ParagraphConfig,
    BlockType.markdown: MarkdownConfig,
    BlockType.heading: HeadingConfig,
    BlockType.spacer: SpacerConfig,
    BlockType.divider: DividerConfig,
}


#### Valide un config brut selon le type de bloc, renvoie un dict prêt à stocker en JSONB
def validate_block_config(block_type: BlockType, config: dict) -> dict:
    schema = BLOCK_CONFIG_SCHEMAS[block_type]
    return schema(**config).model_dump()


#### Levée quand une réponse (submission) ne respecte pas les blocs du formulaire
class SubmissionValidationError(Exception):
    def __init__(self, errors: list[dict]):
        self.errors = errors
        super().__init__(str(errors))


#### Valide la valeur d'une réponse pour un bloc précis, selon son type et sa config
def validate_block_value(block_type: str, config: dict, value):
    block_type = BlockType(block_type)

    if block_type == BlockType.text:
        if not isinstance(value, str):
            raise ValueError("doit être une chaîne de caractères")
        max_length = config.get("max_length")
        if max_length is not None and len(value) > max_length:
            raise ValueError(f"dépasse la longueur maximale ({max_length} caractères)")
        return value

    if block_type == BlockType.number:
        if not isinstance(value, (int, float)) or isinstance(value, bool):
            raise ValueError("doit être un nombre")
        if not (config["min"] <= value <= config["max"]):
            raise ValueError(f"doit être compris entre {config['min']} et {config['max']}")
        return value

    if block_type == BlockType.checkbox:
        if not isinstance(value, bool):
            raise ValueError("doit être vrai ou faux")
        return value

    if block_type == BlockType.select:
        options = config["options"]
        if config.get("multiple", False):
            if not isinstance(value, list) or not all(v in options for v in value):
                raise ValueError(f"doit être une liste de valeurs parmi {options}")
        elif value not in options:
            raise ValueError(f"doit être une valeur parmi {options}")
        return value

    raise ValueError("type de bloc inconnu")


#### Valide une réponse complète (dict clé=block_id -> valeur) contre les blocs réels du formulaire
def validate_submission_data(blocks: list, data: dict) -> dict:
    #### Un paragraphe ne collecte rien -> il ne compte ni comme "attendu" ni comme "inconnu"
    blocks_by_id = {str(block.id): block for block in blocks if BlockType(block.type) not in NON_INPUT_BLOCK_TYPES}
    errors = []
    validated = {}

    #### Rejette toute clé qui ne correspond à aucun bloc du formulaire
    for key in data:
        if key not in blocks_by_id:
            errors.append({"block_id": key, "error": "Ce bloc n'existe pas sur ce formulaire"})

    #### Valide (ou exige) la valeur de chaque bloc réel du formulaire
    for block_id, block in blocks_by_id.items():
        value = data.get(block_id)
        if value is None:
            if block.required:
                errors.append({"block_id": block_id, "error": "Réponse requise"})
            continue
        try:
            validated[block_id] = validate_block_value(block.type, block.config, value)
        except ValueError as exc:
            errors.append({"block_id": block_id, "error": str(exc)})

    if errors:
        raise SubmissionValidationError(errors)

    return validated
