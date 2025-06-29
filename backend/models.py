from pydantic import BaseModel
from typing import List

class Point2D(BaseModel):
    x: float
    y: float

class PieceData(BaseModel):
    id: str
    points: List[Point2D]
    quantity: int = 1

class PlacedPiece(BaseModel):
    id: str
    points: List[Point2D]
    x: float
    y: float
    rotation: float

class NestingRequest(BaseModel):
    pieces: List[PieceData]
    bin_width: float
    bin_height: float
    algorithm: str = "genetic"  # "genetic", "bottom_left", "best_fit"
    rotation_step: float = 90.0  # Pasos de rotación en grados

class NestingResponse(BaseModel):
    placed_pieces: List[PlacedPiece]
    bins_used: int
    utilization: float
    computation_time: float