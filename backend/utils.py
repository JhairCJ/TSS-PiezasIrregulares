import numpy as np
from shapely.geometry import Polygon, Point
from shapely.affinity import translate, rotate
from typing import List, Tuple
import math

class GeometryUtils:
    """Utilidades geométricas para el nesting"""
    
    @staticmethod
    def polygon_area(points: List[Tuple[float, float]]) -> float:
        """Calcula el área de un polígono usando la fórmula del shoelace"""
        n = len(points)
        if n < 3:
            return 0.0
        
        area = 0.0
        for i in range(n):
            j = (i + 1) % n
            area += points[i][0] * points[j][1]
            area -= points[j][0] * points[i][1]
        
        return abs(area) / 2.0
    
    @staticmethod
    def polygon_centroid(points: List[Tuple[float, float]]) -> Tuple[float, float]:
        """Calcula el centroide de un polígono"""
        n = len(points)
        if n == 0:
            return (0, 0)
        
        cx = sum(p[0] for p in points) / n
        cy = sum(p[1] for p in points) / n
        return (cx, cy)
    
    @staticmethod
    def point_in_polygon(point: Tuple[float, float], polygon: List[Tuple[float, float]]) -> bool:
        """Determina si un punto está dentro de un polígono usando ray casting"""
        x, y = point
        n = len(polygon)
        inside = False
        
        p1x, p1y = polygon[0]
        for i in range(1, n + 1):
            p2x, p2y = polygon[i % n]
            if y > min(p1y, p2y):
                if y <= max(p1y, p2y):
                    if x <= max(p1x, p2x):
                        if p1y != p2y:
                            xinters = (y - p1y) * (p2x - p1x) / (p2y - p1y) + p1x
                        if p1x == p2x or x <= xinters:
                            inside = not inside
            p1x, p1y = p2x, p2y
        
        return inside
    
    @staticmethod
    def polygons_intersect(poly1: List[Tuple[float, float]], poly2: List[Tuple[float, float]]) -> bool:
        """Verifica si dos polígonos se intersectan usando SAT (Separating Axis Theorem)"""
        def get_edges(polygon):
            edges = []
            for i in range(len(polygon)):
                p1 = polygon[i]
                p2 = polygon[(i + 1) % len(polygon)]
                edges.append((p2[0] - p1[0], p2[1] - p1[1]))
            return edges
        
        def get_normals(edges):
            normals = []
            for edge in edges:
                normals.append((-edge[1], edge[0]))
            return normals
        
        def project_polygon(polygon, axis):
            dots = [p[0] * axis[0] + p[1] * axis[1] for p in polygon]
            return min(dots), max(dots)
        
        edges1 = get_edges(poly1)
        edges2 = get_edges(poly2)
        normals = get_normals(edges1) + get_normals(edges2)
        
        for normal in normals:
            if normal[0] == 0 and normal[1] == 0:
                continue
                
            min1, max1 = project_polygon(poly1, normal)
            min2, max2 = project_polygon(poly2, normal)
            
            if max1 < min2 or max2 < min1:
                return False
        
        return True
    
    @staticmethod
    def distance_between_points(p1: Tuple[float, float], p2: Tuple[float, float]) -> float:
        """Calcula la distancia euclidiana entre dos puntos"""
        return math.sqrt((p1[0] - p2[0])**2 + (p1[1] - p2[1])**2)
    
    @staticmethod
    def rotate_point(point: Tuple[float, float], angle: float, center: Tuple[float, float] = (0, 0)) -> Tuple[float, float]:
        """Rota un punto alrededor de un centro por un ángulo dado en grados"""
        angle_rad = math.radians(angle)
        cos_a = math.cos(angle_rad)
        sin_a = math.sin(angle_rad)
        
        # Trasladar al origen
        x = point[0] - center[0]
        y = point[1] - center[1]
        
        # Rotar
        new_x = x * cos_a - y * sin_a
        new_y = x * sin_a + y * cos_a
        
        # Trasladar de vuelta
        return (new_x + center[0], new_y + center[1])
    
    @staticmethod
    def get_bounding_box(polygon: List[Tuple[float, float]]) -> Tuple[float, float, float, float]:
        """Obtiene la bounding box de un polígono (min_x, min_y, max_x, max_y)"""
        if not polygon:
            return (0, 0, 0, 0)
        
        xs = [p[0] for p in polygon]
        ys = [p[1] for p in polygon]
        
        return (min(xs), min(ys), max(xs), max(ys))
    
    @staticmethod
    def normalize_polygon_to_origin(polygon: List[Tuple[float, float]]) -> List[Tuple[float, float]]:
        """Mueve un polígono para que su esquina inferior izquierda esté en el origen"""
        min_x, min_y, _, _ = GeometryUtils.get_bounding_box(polygon)
        return [(p[0] - min_x, p[1] - min_y) for p in polygon]

class NestingOptimizer:
    """Optimizaciones adicionales para el nesting"""
    
    @staticmethod
    def sort_pieces_by_area(pieces: List[Polygon], descending: bool = True) -> List[Polygon]:
        """Ordena las piezas por área"""
        return sorted(pieces, key=lambda p: p.area, reverse=descending)
    
    @staticmethod
    def sort_pieces_by_perimeter(pieces: List[Polygon], descending: bool = True) -> List[Polygon]:
        """Ordena las piezas por perímetro"""
        return sorted(pieces, key=lambda p: p.length, reverse=descending)
    
    @staticmethod
    def sort_pieces_by_width(pieces: List[Polygon], descending: bool = True) -> List[Polygon]:
        """Ordena las piezas por ancho"""
        return sorted(pieces, key=lambda p: p.bounds[2] - p.bounds[0], reverse=descending)
    
    @staticmethod
    def sort_pieces_by_height(pieces: List[Polygon], descending: bool = True) -> List[Polygon]:
        """Ordena las piezas por altura"""
        return sorted(pieces, key=lambda p: p.bounds[3] - p.bounds[1], reverse=descending)
    
    @staticmethod
    def calculate_utilization(placed_pieces: List[Polygon], bin_width: float, bin_height: float) -> float:
        """Calcula la utilización del bin"""
        total_area = sum(p.area for p in placed_pieces)
        bin_area = bin_width * bin_height
        return (total_area / bin_area) * 100 if bin_area > 0 else 0
    
    @staticmethod
    def get_placement_height(placed_pieces: List[Polygon]) -> float:
        """Obtiene la altura máxima utilizada"""
        if not placed_pieces:
            return 0
        return max(p.bounds[3] for p in placed_pieces)
    
    @staticmethod
    def find_best_rotation(piece: Polygon, bin_width: float, bin_height: float, 
                          rotation_step: float = 90.0) -> float:
        """Encuentra la mejor rotación para una pieza individual"""
        best_rotation = 0
        best_ratio = float('inf')
        
        for angle in np.arange(0, 360, rotation_step):
            rotated = rotate(piece, angle, origin='centroid')
            bounds = rotated.bounds
            width = bounds[2] - bounds[0]
            height = bounds[3] - bounds[1]
            
            if width <= bin_width and height <= bin_height:
                # Preferir orientaciones que minimicen el desperdicio
                waste_ratio = (bin_width * bin_height) / (width * height)
                if waste_ratio < best_ratio:
                    best_ratio = waste_ratio
                    best_rotation = angle
        
        return best_rotation

class ValidationUtils:
    """Utilidades para validación de datos"""
    
    @staticmethod
    def validate_polygon(points: List[Tuple[float, float]]) -> bool:
        """Valida que los puntos formen un polígono válido"""
        if len(points) < 3:
            return False
        
        # Verificar que no todos los puntos sean colineales
        if len(set(points)) < 3:
            return False
        
        try:
            polygon = Polygon(points)
            return polygon.is_valid and not polygon.is_empty
        except:
            return False
    
    @staticmethod
    def validate_bin_dimensions(width: float, height: float) -> bool:
        """Valida las dimensiones del bin"""
        return width > 0 and height > 0 and width < 1e6 and height < 1e6
    
    @staticmethod
    def validate_pieces_fit_in_bin(pieces: List[Polygon], bin_width: float, bin_height: float) -> bool:
        """Verifica que al menos una pieza pueda caber en el bin"""
        for piece in pieces:
            bounds = piece.bounds
            piece_width = bounds[2] - bounds[0]
            piece_height = bounds[3] - bounds[1]
            
            # Verificar en orientación normal y rotada 90 grados
            if ((piece_width <= bin_width and piece_height <= bin_height) or 
                (piece_height <= bin_width and piece_width <= bin_height)):
                return True
        
        return False