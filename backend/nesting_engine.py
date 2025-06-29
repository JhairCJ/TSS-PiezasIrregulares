import numpy as np
from shapely.geometry import Polygon, Point
from shapely.affinity import translate, rotate
import pyclipper
from deap import base, creator, tools, algorithms
import random
import math
from typing import List, Tuple
from models import Point

# Configurar DEAP
creator.create("FitnessMin", base.Fitness, weights=(-1.0,))
creator.create("Individual", list, fitness=creator.FitnessMin)

class NestingEngine:
    def __init__(self, bin_width: float, bin_height: float, rotation_step: float = 90.0):
        self.bin_width = bin_width
        self.bin_height = bin_height
        self.rotation_step = rotation_step
        self.nfp_cache = {}
        
    def points_to_polygon(self, points: List[Point]) -> Polygon:
        """Convierte lista de puntos a polígono de Shapely"""
        coords = [(p.x, p.y) for p in points]
        return Polygon(coords)
    
    def polygon_to_points(self, polygon: Polygon) -> List[Point]:
        """Convierte polígono de Shapely a lista de puntos"""
        coords = list(polygon.exterior.coords[:-1])  # Excluir último punto duplicado
        return [Point(x=x, y=y) for x, y in coords]
    
    def normalize_polygon(self, polygon: Polygon) -> Polygon:
        """Normaliza polígono para que el punto más bajo izquierdo esté en (0,0)"""
        bounds = polygon.bounds
        return translate(polygon, -bounds[0], -bounds[1])
    
    def rotate_polygon(self, polygon: Polygon, angle: float) -> Polygon:
        """Rota polígono por ángulo dado en grados"""
        return rotate(polygon, angle, origin='centroid')
    
    def compute_nfp(self, stationary: Polygon, moving: Polygon) -> Polygon:
        """Calcula el No-Fit Polygon entre dos piezas"""
        # Crear clave para cache
        stat_coords = tuple(stationary.exterior.coords)
        mov_coords = tuple(moving.exterior.coords)
        cache_key = (stat_coords, mov_coords)
        
        if cache_key in self.nfp_cache:
            return self.nfp_cache[cache_key]
        
        try:
            # Usar pyclipper para calcular NFP
            pc = pyclipper.Pyclipper()
            
            # Convertir a formato pyclipper (enteros)
            scale = 1000
            stat_path = [(int(x * scale), int(y * scale)) for x, y in stationary.exterior.coords[:-1]]
            mov_path = [(int(x * scale), int(y * scale)) for x, y in moving.exterior.coords[:-1]]
            
            # Invertir moving polygon para NFP
            mov_path = mov_path[::-1]
            
            pc.AddPath(stat_path, pyclipper.PT_SUBJECT, True)
            pc.AddPath(mov_path, pyclipper.PT_CLIP, True)
            
            # Calcular diferencia (Minkowski sum)
            solution = pc.Execute(pyclipper.CT_DIFFERENCE, pyclipper.PFT_EVENODD, pyclipper.PFT_EVENODD)
            
            if solution:
                # Convertir de vuelta a coordenadas normales
                nfp_coords = [(x / scale, y / scale) for x, y in solution[0]]
                nfp = Polygon(nfp_coords)
                self.nfp_cache[cache_key] = nfp
                return nfp
            else:
                # Fallback: usar bounds
                bounds = stationary.bounds
                nfp = Polygon([
                    (bounds[0], bounds[1]),
                    (bounds[2], bounds[1]),
                    (bounds[2], bounds[3]),
                    (bounds[0], bounds[3])
                ])
                self.nfp_cache[cache_key] = nfp
                return nfp
                
        except Exception:
            # Fallback en caso de error
            bounds = stationary.bounds
            nfp = Polygon([
                (bounds[0], bounds[1]),
                (bounds[2], bounds[1]),
                (bounds[2], bounds[3]),
                (bounds[0], bounds[3])
            ])
            self.nfp_cache[cache_key] = nfp
            return nfp
    
    def can_place_piece(self, piece: Polygon, x: float, y: float, placed_pieces: List[Polygon]) -> bool:
        """Verifica si una pieza puede ser colocada en la posición dada"""
        # Trasladar pieza a la posición
        translated_piece = translate(piece, x, y)
        
        # Verificar que esté dentro del bin
        if not self.is_within_bin(translated_piece):
            return False
        
        # Verificar colisiones con piezas ya colocadas
        for placed in placed_pieces:
            if translated_piece.overlaps(placed) or translated_piece.touches(placed):
                return False
        
        return True
    
    def is_within_bin(self, piece: Polygon) -> bool:
        """Verifica si la pieza está completamente dentro del bin"""
        bounds = piece.bounds
        return (bounds[0] >= 0 and bounds[1] >= 0 and 
                bounds[2] <= self.bin_width and bounds[3] <= self.bin_height)
    
    def bottom_left_fit(self, pieces: List[Polygon]) -> List[Tuple[float, float, float]]:
        """Algoritmo Bottom-Left Fit"""
        placed_pieces = []
        positions = []
        
        for piece in pieces:
            best_pos = None
            best_y = float('inf')
            best_x = float('inf')
            
            # Probar diferentes rotaciones
            for rotation in np.arange(0, 360, self.rotation_step):
                rotated_piece = self.rotate_polygon(piece, rotation)
                rotated_piece = self.normalize_polygon(rotated_piece)
                
                # Probar posiciones bottom-left
                for y in np.arange(0, self.bin_height, 5):
                    for x in np.arange(0, self.bin_width, 5):
                        if self.can_place_piece(rotated_piece, x, y, placed_pieces):
                            if y < best_y or (y == best_y and x < best_x):
                                best_y = y
                                best_x = x
                                best_pos = (x, y, rotation)
                            break
                    if best_pos and best_y == y:
                        break
                
                if best_pos and best_y == 0:
                    break
            
            if best_pos:
                x, y, rotation = best_pos
                final_piece = self.rotate_polygon(piece, rotation)
                final_piece = self.normalize_polygon(final_piece)
                final_piece = translate(final_piece, x, y)
                placed_pieces.append(final_piece)
                positions.append((x, y, rotation))
            else:
                # No se pudo colocar la pieza
                positions.append((0, 0, 0))
        
        return positions
    
    def genetic_algorithm(self, pieces: List[Polygon], generations: int = 50, population_size: int = 30) -> List[Tuple[float, float, float]]:
        """Algoritmo genético para optimización de nesting"""
        
        def create_individual():
            """Crea un individuo aleatorio (secuencia de piezas con rotaciones)"""
            individual = []
            for i in range(len(pieces)):
                rotation = random.choice(list(np.arange(0, 360, self.rotation_step)))
                individual.append((i, rotation))
            random.shuffle(individual)
            return creator.Individual(individual)
        
        def evaluate_individual(individual):
            """Evalúa la aptitud de un individuo"""
            placed_pieces = []
            total_area = 0
            placed_count = 0
            
            for piece_idx, rotation in individual:
                piece = pieces[piece_idx]
                rotated_piece = self.rotate_polygon(piece, rotation)
                rotated_piece = self.normalize_polygon(rotated_piece)
                
                # Encontrar mejor posición usando bottom-left
                best_pos = None
                for y in np.arange(0, self.bin_height, 10):
                    for x in np.arange(0, self.bin_width, 10):
                        if self.can_place_piece(rotated_piece, x, y, placed_pieces):
                            best_pos = (x, y)
                            break
                    if best_pos:
                        break
                
                if best_pos:
                    x, y = best_pos
                    final_piece = translate(rotated_piece, x, y)
                    placed_pieces.append(final_piece)
                    total_area += piece.area
                    placed_count += 1
            
            # Fitness: maximizar piezas colocadas y minimizar altura usada
            if placed_count == 0:
                return (1000000,)
            
            max_y = max([p.bounds[3] for p in placed_pieces]) if placed_pieces else 0
            fitness = (len(pieces) - placed_count) * 1000 + max_y
            return (fitness,)
        
        def mutate_individual(individual):
            """Muta un individuo"""
            if random.random() < 0.5:
                # Cambiar rotación
                idx = random.randint(0, len(individual) - 1)
                piece_idx, _ = individual[idx]
                new_rotation = random.choice(list(np.arange(0, 360, self.rotation_step)))
                individual[idx] = (piece_idx, new_rotation)
            else:
                # Intercambiar orden
                if len(individual) > 1:
                    i, j = random.sample(range(len(individual)), 2)
                    individual[i], individual[j] = individual[j], individual[i]
            return individual,
        
        def crossover_individuals(ind1, ind2):
            """Cruza dos individuos"""
            size = min(len(ind1), len(ind2))
            if size > 1:
                cx_point = random.randint(1, size - 1)
                ind1[cx_point:], ind2[cx_point:] = ind2[cx_point:], ind1[cx_point:]
            return ind1, ind2
        
        # Configurar DEAP
        toolbox = base.Toolbox()
        toolbox.register("individual", create_individual)
        toolbox.register("population", tools.initRepeat, list, toolbox.individual)
        toolbox.register("mate", crossover_individuals)
        toolbox.register("mutate", mutate_individual)
        toolbox.register("select", tools.selTournament, tournsize=3)
        toolbox.register("evaluate", evaluate_individual)
        
        # Ejecutar algoritmo genético
        population = toolbox.population(n=population_size)
        
        # Evaluar población inicial
        fitnesses = list(map(toolbox.evaluate, population))
        for ind, fit in zip(population, fitnesses):
            ind.fitness.values = fit
        
        # Evolución
        for generation in range(generations):
            # Selección
            offspring = toolbox.select(population, len(population))
            offspring = list(map(toolbox.clone, offspring))
            
            # Cruzamiento y mutación
            for child1, child2 in zip(offspring[::2], offspring[1::2]):
                if random.random() < 0.7:  # Probabilidad de cruzamiento
                    toolbox.mate(child1, child2)
                    del child1.fitness.values
                    del child2.fitness.values
            
            for mutant in offspring:
                if random.random() < 0.2:  # Probabilidad de mutación
                    toolbox.mutate(mutant)
                    del mutant.fitness.values
            
            # Evaluar individuos con fitness inválido
            invalid_ind = [ind for ind in offspring if not ind.fitness.valid]
            fitnesses = map(toolbox.evaluate, invalid_ind)
            for ind, fit in zip(invalid_ind, fitnesses):
                ind.fitness.values = fit
            
            population[:] = offspring
        
        # Obtener mejor individuo
        best_individual = tools.selBest(population, 1)[0]
        
        # Convertir mejor individuo a posiciones
        positions = []
        placed_pieces = []
        
        for piece_idx, rotation in best_individual:
            piece = pieces[piece_idx]
            rotated_piece = self.rotate_polygon(piece, rotation)
            rotated_piece = self.normalize_polygon(rotated_piece)
            
            # Encontrar mejor posición
            best_pos = None
            for y in np.arange(0, self.bin_height, 5):
                for x in np.arange(0, self.bin_width, 5):
                    if self.can_place_piece(rotated_piece, x, y, placed_pieces):
                        best_pos = (x, y)
                        break
                if best_pos:
                    break
            
            if best_pos:
                x, y = best_pos
                final_piece = translate(rotated_piece, x, y)
                placed_pieces.append(final_piece)
                positions.append((x, y, rotation))
            else:
                positions.append((0, 0, 0))
        
        # Reordenar posiciones según índices originales
        original_positions = [None] * len(pieces)
        for i, (piece_idx, rotation) in enumerate(best_individual):
            if i < len(positions):
                original_positions[piece_idx] = positions[i]
        
        return [pos if pos else (0, 0, 0) for pos in original_positions]