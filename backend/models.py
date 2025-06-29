from pydantic import BaseModel
from typing import List, Optional, Dict, Any

class Point(BaseModel):
    x: float
    y: float

class PieceData(BaseModel):
    id: str
    points: List[Point]
    quantity: int = 1

class NestingRequest(BaseModel):
    pieces: List[PieceData]
    bin_width: float
    bin_height: float
    algorithm: str = "best_fit"  # "genetic", "bottom_left", "best_fit"
    rotation_step: float = 90.0  # Grados
    max_bins: Optional[int] = None  # Límite máximo de bins a usar

class PlacedPiece(BaseModel):
    id: str
    points: List[Point]
    x: float
    y: float
    rotation: float
    bin_id: Optional[int] = 1  # ID del bin donde se colocó la pieza

class BinInfo(BaseModel):
    bin_id: int
    pieces_count: int
    utilization: float
    total_area: float
    placed_pieces: List[PlacedPiece]

class NestingResponse(BaseModel):
    placed_pieces: List[PlacedPiece]
    bins_used: int
    utilization: float  # Utilización promedio
    computation_time: float
    bins_data: Optional[Dict[int, Dict[str, Any]]] = None  # Información detallada por bin
    
    class Config:
        # Permitir campos adicionales para flexibilidad
        extra = "allow"