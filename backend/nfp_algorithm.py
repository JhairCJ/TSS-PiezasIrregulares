import numpy as np
import math
from typing import List, Tuple, Dict, Optional

class NFPAlgorithm:
    """Implementación simplificada y funcional del algoritmo No Fit Polygon (NFP)"""
    
    def __init__(self):
        self.tolerance = 1e-6
    
    def find_best_position(self, container: List[Tuple[float, float]], 
                          placed_pieces: List[Dict], 
                          new_piece: List[Tuple[float, float]], 
                          strategy: str = "bottom_left") -> Optional[Tuple[float, float]]:
        """
        Encuentra la mejor posición para colocar una nueva pieza usando un enfoque simplificado
        """
        # Obtener bounds de la pieza
        piece_bounds = self._get_bounds(new_piece)
        piece_width = piece_bounds['max_x'] - piece_bounds['min_x']
        piece_height = piece_bounds['max_y'] - piece_bounds['min_y']
        
        # Obtener bounds del contenedor
        container_bounds = self._get_bounds(container)
        
        # Generar posiciones candidatas
        candidate_positions = self._generate_candidate_positions(
            container_bounds, placed_pieces, piece_width, piece_height
        )
        
        # Evaluar cada posición candidata
        valid_positions = []
        for pos in candidate_positions:
            # Ajustar posición considerando los bounds de la pieza
            adjusted_pos = (pos[0] - piece_bounds['min_x'], pos[1] - piece_bounds['min_y'])
            
            if self._is_position_valid(new_piece, adjusted_pos, container, placed_pieces):
                valid_positions.append(adjusted_pos)
        
        if not valid_positions:
            return None
        
        # Seleccionar mejor posición según estrategia
        return self._select_best_position(valid_positions, strategy)
    
    def _get_bounds(self, polygon: List[Tuple[float, float]]) -> Dict[str, float]:
        """Calcula los bounds de un polígono"""
        if not polygon:
            return {'min_x': 0, 'max_x': 0, 'min_y': 0, 'max_y': 0}
        
        x_coords = [p[0] for p in polygon]
        y_coords = [p[1] for p in polygon]
        
        return {
            'min_x': min(x_coords),
            'max_x': max(x_coords),
            'min_y': min(y_coords),
            'max_y': max(y_coords)
        }
    
    def _generate_candidate_positions(self, container_bounds: Dict, placed_pieces: List[Dict], 
                                    piece_width: float, piece_height: float) -> List[Tuple[float, float]]:
        """Genera posiciones candidatas para colocar la pieza"""
        positions = []
        
        # Siempre intentar esquina inferior izquierda como primera opción
        positions.append((container_bounds['min_x'], container_bounds['min_y']))
        
        # Si no hay piezas colocadas, solo usar la esquina
        if not placed_pieces:
            return positions
        
        # Generar posiciones basadas en las piezas ya colocadas
        for piece in placed_pieces:
            piece_bounds = self._get_bounds(piece['points'])
            
            # Posiciones a la derecha de la pieza
            right_x = piece_bounds['max_x']
            positions.append((right_x, piece_bounds['min_y']))  # Alineado abajo
            positions.append((right_x, container_bounds['min_y']))  # En el fondo
            
            # Posiciones arriba de la pieza
            top_y = piece_bounds['max_y']
            positions.append((piece_bounds['min_x'], top_y))  # Alineado izquierda
            positions.append((container_bounds['min_x'], top_y))  # En el borde izquierdo
        
        # Agregar una cuadrícula de posiciones para mayor cobertura
        step_x = max(20, piece_width // 4)  # Paso adaptativo
        step_y = max(20, piece_height // 4)
        
        x = container_bounds['min_x']
        while x <= container_bounds['max_x'] - piece_width:
            y = container_bounds['min_y']
            while y <= container_bounds['max_y'] - piece_height:
                positions.append((x, y))
                y += step_y
            x += step_x
        
        # Eliminar duplicados
        unique_positions = []
        for pos in positions:
            is_duplicate = False
            for unique_pos in unique_positions:
                if (abs(pos[0] - unique_pos[0]) < self.tolerance and 
                    abs(pos[1] - unique_pos[1]) < self.tolerance):
                    is_duplicate = True
                    break
            if not is_duplicate:
                unique_positions.append(pos)
        
        return unique_positions
    
    def _is_position_valid(self, piece_points: List[Tuple[float, float]], 
                          position: Tuple[float, float], 
                          container: List[Tuple[float, float]], 
                          placed_pieces: List[Dict]) -> bool:
        """Verifica si una posición es válida para colocar la pieza"""
        # Trasladar la pieza a la posición
        translated_piece = [(x + position[0], y + position[1]) for x, y in piece_points]
        
        # Verificar que la pieza esté completamente dentro del contenedor
        if not self._piece_inside_container(translated_piece, container):
            return False
        
        # Verificar que no se superponga con piezas existentes
        for placed_piece in placed_pieces:
            if self._pieces_overlap(translated_piece, placed_piece['points']):
                return False
        
        return True
    
    def _piece_inside_container(self, piece_points: List[Tuple[float, float]], 
                              container: List[Tuple[float, float]]) -> bool:
        """Verifica si la pieza está completamente dentro del contenedor"""
        container_bounds = self._get_bounds(container)
        piece_bounds = self._get_bounds(piece_points)
        
        return (piece_bounds['min_x'] >= container_bounds['min_x'] and
                piece_bounds['max_x'] <= container_bounds['max_x'] and
                piece_bounds['min_y'] >= container_bounds['min_y'] and
                piece_bounds['max_y'] <= container_bounds['max_y'])
    
    def _pieces_overlap(self, piece1: List[Tuple[float, float]], 
                       piece2: List[Tuple[float, float]]) -> bool:
        """Verifica si dos piezas se superponen usando separating axis theorem simplificado"""
        try:
            # Verificación rápida usando bounding boxes
            bounds1 = self._get_bounds(piece1)
            bounds2 = self._get_bounds(piece2)
            
            # Si los bounding boxes no se superponen, las piezas no se superponen
            if (bounds1['max_x'] <= bounds2['min_x'] or bounds2['max_x'] <= bounds1['min_x'] or
                bounds1['max_y'] <= bounds2['min_y'] or bounds2['max_y'] <= bounds1['min_y']):
                return False
            
            # Para una verificación más precisa, usar el método de separating axis
            return self._polygons_intersect(piece1, piece2)
            
        except Exception as e:
            print(f"Error verificando superposición: {e}")
            # En caso de error, asumir que se superponen por seguridad
            return True
    
    def _polygons_intersect(self, poly1: List[Tuple[float, float]], 
                           poly2: List[Tuple[float, float]]) -> bool:
        """Verifica si dos polígonos se intersectan usando separating axis theorem"""
        def get_edges(polygon):
            edges = []
            for i in range(len(polygon)):
                p1 = polygon[i]
                p2 = polygon[(i + 1) % len(polygon)]
                edges.append((p2[0] - p1[0], p2[1] - p1[1]))
            return edges
        
        def get_normal(edge):
            return (-edge[1], edge[0])
        
        def project_polygon(polygon, axis):
            dots = [p[0] * axis[0] + p[1] * axis[1] for p in polygon]
            return min(dots), max(dots)
        
        def normalize(vector):
            length = math.sqrt(vector[0]**2 + vector[1]**2)
            if length == 0:
                return (0, 0)
            return (vector[0] / length, vector[1] / length)
        
        # Obtener ejes de separación (normales a los bordes)
        edges1 = get_edges(poly1)
        edges2 = get_edges(poly2)
        
        axes = []
        for edge in edges1 + edges2:
            normal = get_normal(edge)
            normalized = normalize(normal)
            if normalized != (0, 0):
                axes.append(normalized)
        
        # Verificar separación en cada eje
        for axis in axes:
            min1, max1 = project_polygon(poly1, axis)
            min2, max2 = project_polygon(poly2, axis)
            
            # Si hay separación en este eje, los polígonos no se intersectan
            if max1 < min2 or max2 < min1:
                return False
        
        # Si no hay separación en ningún eje, los polígonos se intersectan
        return True
    
    def _select_best_position(self, positions: List[Tuple[float, float]], 
                            strategy: str) -> Tuple[float, float]:
        """Selecciona la mejor posición según la estrategia"""
        if strategy == "bottom_left":
            # Priorizar posiciones más bajas, luego más a la izquierda
            return min(positions, key=lambda p: (p[1], p[0]))
        elif strategy == "best_fit":
            # Por simplicidad, usar bottom_left
            # En una implementación completa, se calcularía el desperdicio
            return min(positions, key=lambda p: (p[1], p[0]))
        else:
            # Estrategia por defecto
            return positions[0]
    
    def optimize_position(self, container: List[Tuple[float, float]], 
                         placed_pieces: List[Dict], 
                         new_piece: List[Tuple[float, float]], 
                         strategy: str = "bottom_left") -> Optional[Tuple[float, float]]:
        """Método de compatibilidad con la interfaz anterior"""
        return self.find_best_position(container, placed_pieces, new_piece, strategy)