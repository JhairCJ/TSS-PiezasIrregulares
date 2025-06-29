import time
from typing import List, Tuple, Dict
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
        
        # Ejecutar nesting con múltiples bins
        bins_data = self._nest_in_multiple_bins(request.algorithm, polygons, piece_ids)
        
        # Crear respuesta consolidada
        all_placed_pieces = []
        total_utilization = 0
        bins_used = len(bins_data)
        
        for bin_id, bin_info in bins_data.items():
            # Ajustar coordenadas para cada bin (opcional: offset para visualización)
            for piece in bin_info['placed_pieces']:
                piece.bin_id = bin_id  # Agregar ID del bin a cada pieza
                all_placed_pieces.append(piece)
            
            total_utilization += bin_info['utilization']
        
        # Promedio de utilización entre todos los bins
        average_utilization = total_utilization / bins_used if bins_used > 0 else 0
        computation_time = time.time() - start_time
        
        return NestingResponse(
            placed_pieces=all_placed_pieces,
            bins_used=bins_used,
            utilization=average_utilization,
            computation_time=computation_time,
            bins_data=bins_data  # Información detallada por bin
        )
    
    def _nest_in_multiple_bins(self, algorithm: str, polygons: List, piece_ids: List) -> Dict:
        """Ejecuta nesting distribuyendo piezas en múltiples bins"""
        bins_data = {}
        remaining_polygons = polygons.copy()
        remaining_piece_ids = piece_ids.copy()
        bin_counter = 1
        
        while remaining_polygons:
            # Intentar colocar piezas en el bin actual
            if algorithm == "genetic":
                positions = self.engine.genetic_algorithm(remaining_polygons, generations=30)
            elif algorithm == "bottom_left":
                positions = self.engine.bottom_left_fit(remaining_polygons)
            else:  # best_fit o default
                positions = self.engine.bottom_left_fit(remaining_polygons)
            
            # Filtrar piezas que caben en el bin actual
            fitted_polygons = []
            fitted_positions = []
            fitted_piece_ids = []
            
            for i, (polygon, position) in enumerate(zip(remaining_polygons, positions)):
                if self._piece_fits_in_bin(polygon, position):
                    fitted_polygons.append(polygon)
                    fitted_positions.append(position)
                    fitted_piece_ids.append(remaining_piece_ids[i])
            
            # Si no cabe ninguna pieza más, intentar con las piezas restantes más pequeñas
            if not fitted_polygons and remaining_polygons:
                # Tomar la pieza más pequeña que quede
                min_area_idx = min(range(len(remaining_polygons)), 
                                 key=lambda i: remaining_polygons[i].area)
                fitted_polygons = [remaining_polygons[min_area_idx]]
                fitted_positions = [positions[min_area_idx] if min_area_idx < len(positions) 
                                  else (0, 0, 0)]
                fitted_piece_ids = [remaining_piece_ids[min_area_idx]]
            
            if fitted_polygons:
                # Crear piezas colocadas para este bin
                placed_pieces = self._create_placed_pieces(
                    fitted_polygons, fitted_positions, fitted_piece_ids
                )
                
                # Calcular utilización del bin
                total_area = sum(polygon.area for polygon in fitted_polygons)
                bin_area = self.engine.bin_width * self.engine.bin_height
                utilization = (total_area / bin_area) * 100 if bin_area > 0 else 0
                
                # Almacenar información del bin
                bins_data[bin_counter] = {
                    'placed_pieces': placed_pieces,
                    'pieces_count': len(fitted_polygons),
                    'utilization': utilization,
                    'total_area': total_area
                }
                
                # Remover piezas colocadas de las listas de pendientes
                for i in sorted(range(len(remaining_polygons)), reverse=True):
                    if i < len(fitted_polygons) and remaining_polygons[i] in fitted_polygons:
                        remaining_polygons.pop(i)
                        remaining_piece_ids.pop(i)
                
                bin_counter += 1
            else:
                # Si no se puede colocar ninguna pieza, salir del bucle
                break
        
        return bins_data
    
    def _piece_fits_in_bin(self, polygon, position: Tuple[float, float, float]) -> bool:
        """Verifica si una pieza cabe en el bin con la posición dada"""
        x, y, rotation = position
        
        # Aplicar transformaciones
        transformed = self.engine.rotate_polygon(polygon, rotation)
        transformed = self.engine.normalize_polygon(transformed)
        transformed = translate(transformed, x, y)
        
        # Obtener límites del polígono transformado
        minx, miny, maxx, maxy = transformed.bounds
        
        # Verificar si está dentro de los límites del bin
        return (minx >= 0 and miny >= 0 and 
                maxx <= self.engine.bin_width and 
                maxy <= self.engine.bin_height)
    
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

    def get_bin_statistics(self, bins_data: Dict) -> Dict:
        """Retorna estadísticas detalladas de todos los bins"""
        if not bins_data:
            return {}
        
        total_pieces = sum(bin_info['pieces_count'] for bin_info in bins_data.values())
        total_area = sum(bin_info['total_area'] for bin_info in bins_data.values())
        avg_utilization = sum(bin_info['utilization'] for bin_info in bins_data.values()) / len(bins_data)
        
        return {
            'total_bins': len(bins_data),
            'total_pieces_placed': total_pieces,
            'total_area_used': total_area,
            'average_utilization': avg_utilization,
            'bins_detail': {
                bin_id: {
                    'pieces': bin_info['pieces_count'],
                    'utilization': f"{bin_info['utilization']:.2f}%",
                    'area_used': bin_info['total_area']
                }
                for bin_id, bin_info in bins_data.items()
            }
        }