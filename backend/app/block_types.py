from enum import Enum
from typing import Literal

from pydantic import BaseModel


#### Config attendue pour un champ texte
class TextConfig(BaseModel):
    max_length: int | None = None


#### Config attendue pour un curseur
class SliderConfig(BaseModel):
    min: int
    max: int
    step: int = 1


#### Config attendue pour une case à cocher isolée (ex: "J'accepte les CGU")
class CheckboxConfig(BaseModel):
    pass


#### Config attendue pour un choix parmi une liste (unique ou multiple)
class SelectConfig(BaseModel):
    options: list[str]
    multiple: bool = False
    display: Literal["dropdown", "inline"] = "dropdown"


class BlockType(str, Enum):
    text = "text"
    slider = "slider"
    checkbox = "checkbox"
    select = "select"


#### Un seul endroit qui relie chaque type à sa config attendue
BLOCK_CONFIG_SCHEMAS: dict[BlockType, type[BaseModel]] = {
    BlockType.text: TextConfig,
    BlockType.slider: SliderConfig,
    BlockType.checkbox: CheckboxConfig,
    BlockType.select: SelectConfig,
}