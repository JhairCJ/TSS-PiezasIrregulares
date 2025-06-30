from pydantic import BaseModel, Field
from typing import List, Dict, Optional, Tuple

class Piece(BaseModel):
    id: str = Field(..., description="Identificador único de la pieza")
    points: List[Tuple[float, float]] = Field(..., description="Lista de puntos que definen la forma")
    quantity: int = Field(default=1, ge=1, description="Cantidad de piezas")

class NestingRequest(BaseModel):
    pieces: List[Piece] = Field(..., description="Lista de piezas a optimizar")
    bin_width: float = Field(..., gt=0, description="Ancho del bin")
    bin_height: float = Field(..., gt=0, description="Alto del bin")
    allow_rotation: bool = Field(default=True, description="Permitir rotación")
    rotation_angles: Optional[List[int]] = Field(default=None, description="Ángulos permitidos")
    margin: float = Field(default=0, ge=0, description="Margen entre piezas")
    strategy: str = Field(default="bottom_left", description="Estrategia de colocación")

class BinResult(BaseModel):
    bin_id: int
    bin_width: float
    bin_height: float
    placed_pieces: List[Dict]
    unplaced_pieces: List[Dict]
    material_efficiency: float
    execution_time: float
    total_pieces: int

class NestingSummary(BaseModel):
    total_bins: int
    total_pieces_placed: int
    total_pieces_unplaced: int
    average_efficiency: float
    total_execution_time: float
    bin_efficiencies: List[float]

class NestingResponse(BaseModel):
    success: bool
    bins: List[BinResult]
    summary: NestingSummary
    message: str