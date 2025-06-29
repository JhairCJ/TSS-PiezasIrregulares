import time
from typing import List
from shapely.affinity import translate
from models import NestingRequest, NestingResponse, PlacedPiece
from nesting_engine import NestingEngine

class NestingService:
    def __init__(self):
        self.engine = None
    
    def process_nesting_request(self, request: NestingRequest) -> NestingResponse:
        """Procesa una solicitud de nesting y retorna la respuesta"""
        start_time = time.time()
        
        # Inicializar motor de nesting
        self.engine = NestingEngine(
            request.bin_width, 
            request.bin_height, 
            request.rotation_step
        )
        
        # Convertir piezas a polígonos
        polygons = []
        piece_ids = []
        
        for piece_data in request.pieces:
            for _ in range(piece_data.quantity):
                polygon = self.engine.points_to_polygon(piece_data.points)
                polygon = self.engine.normalize_polygon(polygon)
                polygons.append(polygon)
                piece_ids.append(piece_data.id)
        
        # Ejecutar algoritmo seleccionado
        positions = self._execute_algorithm(request.algorithm, polygons)
        
        # Crear respuesta
        placed_pieces = self._create_placed_pieces(polygons, positions, piece_ids)
        
        # Calcular métricas
        total_area = sum(polygon.area for polygon in polygons)
        bin_area = request.bin_width * request.bin_height
        utilization = (total_area / bin_area) * 100 if bin_area > 0 else 0
        computation_time = time.time() - start_time
        
        return NestingResponse(
            placed_pieces=placed_pieces,
            bins_used=1,  # Por ahora solo un bin
            utilization=utilization,
            computation_time=computation_time
        )
    
    def _execute_algorithm(self, algorithm: str, polygons: List) -> List:
        """Ejecuta el algoritmo de nesting seleccionado"""
        if algorithm == "genetic":
            return self.engine.genetic_algorithm(polygons, generations=30)
        elif algorithm == "bottom_left":
            return self.engine.bottom_left_fit(polygons)
        else:  # best_fit o default
            return self.engine.bottom_left_fit(polygons)
    
    def _create_placed_pieces(self, polygons: List, positions: List, piece_ids: List) -> List[PlacedPiece]:
        """Crea la lista de piezas colocadas con sus transformaciones"""
        placed_pieces = []
        
        for i, (polygon, (x, y, rotation)) in enumerate(zip(polygons, positions)):
            # Aplicar transformaciones
            transformed = self.engine.rotate_polygon(polygon, rotation)
            transformed = self.engine.normalize_polygon(transformed)
            transformed = translate(transformed, x, y)
            
            # Convertir a formato de respuesta
            points = self.engine.polygon_to_points(transformed)
            
            placed_piece = PlacedPiece(
                id=piece_ids[i],
                points=points,
                x=x,
                y=y,
                rotation=rotation
            )
            placed_pieces.append(placed_piece)
        
        return placed_pieces