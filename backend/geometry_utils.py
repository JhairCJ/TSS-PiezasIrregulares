import numpy as np
import math
from typing import List, Tuple, Optional
from shapely.geometry import Polygon, Point
from shapely.affinity import rotate, translate
from shapely.ops import unary_union

class GeometryUtils:
    """Utilidades para operaciones geométricas en el sistema de nesting"""
    
    def __init__(self):
        self.tolerance = 1e-6
    
    def calculate_polygon_area(self, points: List[Tuple[float, float]]) -> float:
        """Calcula el área de un polígono usando la fórmula del shoelace"""
        if len(points) < 3:
            return 0.0
        
        n = len(points)
        area = 0.0
        
        for i in range(n):
            j = (i + 1) % n
            area += points[i][0] * points[j][1]
            area -= points[j][0] * points[i][1]
        
        return abs(area) / 2.0
    
    def calculate_polygon_centroid(self, points: List[Tuple[float, float]]) -> Tuple[float, float]:
        """Calcula el centroide de un polígono"""
        if not points:
            return (0.0, 0.0)
        
        polygon = Polygon(points)
        centroid = polygon.centroid
        return (centroid.x, centroid.y)
    
    def get_polygon_bounds(self, points: List[Tuple[float, float]]) -> Tuple[float, float, float, float]:
        """Obtiene los límites (bounding box) de un polígono"""
        if not points:
            return (0, 0, 0, 0)
        
        x_coords = [p[0] for p in points]
        y_coords = [p[1] for p in points]
        
        return (min(x_coords), min(y_coords), max(x_coords), max(y_coords))
    
    def rotate_polygon(self, points: List[Tuple[float, float]], angle_degrees: float, 
                      center: Optional[Tuple[float, float]] = None) -> List[Tuple[float, float]]:
        """Rota un polígono por un ángulo dado en grados"""
        if not points:
            return points
        
        polygon = Polygon(points)
        
        if center is None:
            # Rotar alrededor del centroide
            rotated = rotate(polygon, angle_degrees, origin='centroid')
        else:
            # Rotar alrededor del punto especificado
            rotated = rotate(polygon, angle_degrees, origin=Point(center))
        
        return list(rotated.exterior.coords[:-1])  # Excluir el punto duplicado al final
    
    def translate_polygon(self, points: List[Tuple[float, float]], 
                         dx: float, dy: float) -> List[Tuple[float, float]]:
        """Traslada un polígono por un vector dado"""
        return [(x + dx, y + dy) for x, y in points]
    
    def normalize_polygon(self, points: List[Tuple[float, float]]) -> List[Tuple[float, float]]:
        """Normaliza un polígono para que su esquina inferior izquierda esté en (0,0)"""
        if not points:
            return points
        
        min_x, min_y, _, _ = self.get_polygon_bounds(points)
        return self.translate_polygon(points, -min_x, -min_y)
    
    def is_point_inside_polygon(self, point: Tuple[float, float], 
                               polygon_points: List[Tuple[float, float]]) -> bool:
        """Verifica si un punto está dentro de un polígono"""
        polygon = Polygon(polygon_points)
        return polygon.contains(Point(point))
    
    def polygons_intersect(self, points1: List[Tuple[float, float]], 
                          points2: List[Tuple[float, float]]) -> bool:
        """Verifica si dos polígonos se intersectan"""
        try:
            poly1 = Polygon(points1)
            poly2 = Polygon(points2)
            return poly1.intersects(poly2)
        except:
            return False
    
    def polygon_fits_in_rectangle(self, points: List[Tuple[float, float]], 
                                 rect_width: float, rect_height: float) -> bool:
        """Verifica si un polígono cabe dentro de un rectángulo"""
        min_x, min_y, max_x, max_y = self.get_polygon_bounds(points)
        width = max_x - min_x
        height = max_y - min_y
        
        return width <= rect_width and height <= rect_height
    
    def calculate_convex_hull(self, points: List[Tuple[float, float]]) -> List[Tuple[float, float]]:
        """Calcula el casco convexo de un conjunto de puntos usando Graham scan"""
        if len(points) < 3:
            return points
        
        def cross_product(o, a, b):
            return (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0])
        
        # Encontrar el punto más bajo (y más a la izquierda en caso de empate)
        start = min(points, key=lambda p: (p[1], p[0]))
        
        # Ordenar puntos por ángulo polar respecto al punto inicial
        def polar_angle(p):
            dx = p[0] - start[0]
            dy = p[1] - start[1]
            return math.atan2(dy, dx)
        
        sorted_points = sorted([p for p in points if p != start], key=polar_angle)
        hull = [start]
        
        for p in sorted_points:
            # Remover puntos que no forman un giro hacia la izquierda
            while len(hull) > 1 and cross_product(hull[-2], hull[-1], p) <= 0:
                hull.pop()
            hull.append(p)
        
        return hull
    
    def simplify_polygon(self, points: List[Tuple[float, float]], 
                        tolerance: float = 1.0) -> List[Tuple[float, float]]:
        """Simplifica un polígono eliminando puntos redundantes"""
        if len(points) < 3:
            return points
        
        polygon = Polygon(points)
        simplified = polygon.simplify(tolerance, preserve_topology=True)
        
        return list(simplified.exterior.coords[:-1])
    
    def expand_polygon(self, points: List[Tuple[float, float]], 
                      distance: float) -> List[Tuple[float, float]]:
        """Expande un polígono hacia afuera por una distancia dada (offset)"""
        if not points or distance == 0:
            return points
        
        try:
            polygon = Polygon(points)
            buffered = polygon.buffer(distance, join_style=2)  # join_style=2 for mitered joins
            
            if buffered.is_empty:
                return points
            
            return list(buffered.exterior.coords[:-1])
        except:
            return points
    
    def contract_polygon(self, points: List[Tuple[float, float]], 
                        distance: float) -> List[Tuple[float, float]]:
        """Contrae un polígono hacia adentro por una distancia dada"""
        return self.expand_polygon(points, -distance)
    
    def get_polygon_orientation(self, points: List[Tuple[float, float]]) -> str:
        """Determina la orientación de un polígono (clockwise o counterclockwise)"""
        if len(points) < 3:
            return "undefined"
        
        # Calcular área con signo usando la fórmula del shoelace
        signed_area = 0.0
        n = len(points)
        
        for i in range(n):
            j = (i + 1) % n
            signed_area += (points[j][0] - points[i][0]) * (points[j][1] + points[i][1])
        
        if signed_area > 0:
            return "clockwise"
        elif signed_area < 0:
            return "counterclockwise"
        else:
            return "collinear"
    
    def ensure_counterclockwise(self, points: List[Tuple[float, float]]) -> List[Tuple[float, float]]:
        """Asegura que los puntos del polígono estén en orden contrahorario"""
        if self.get_polygon_orientation(points) == "clockwise":
            return list(reversed(points))
        return points
    
    def calculate_distance(self, p1: Tuple[float, float], p2: Tuple[float, float]) -> float:
        """Calcula la distancia euclidiana entre dos puntos"""
        return math.sqrt((p1[0] - p2[0])**2 + (p1[1] - p2[1])**2)
    
    def find_lowest_leftmost_point(self, points: List[Tuple[float, float]]) -> Tuple[float, float]:
        """Encuentra el punto más bajo y más a la izquierda"""
        if not points:
            return (0, 0)
        
        return min(points, key=lambda p: (p[1], p[0]))
    
    def create_rectangle(self, width: float, height: float, 
                        x: float = 0, y: float = 0) -> List[Tuple[float, float]]:
        """Crea un rectángulo con las dimensiones y posición especificadas"""
        return [
            (x, y),
            (x + width, y),
            (x + width, y + height),
            (x, y + height)
        ]