import time
import random
import copy
from typing import List, Dict, Tuple, Optional
from geometry_utils import GeometryUtils
from nfp_algorithm import NFPAlgorithm

class NestingOptimizer:
    """Optimizador principal para el problema de nesting"""
    
    def __init__(self):
        self.geometry_utils = GeometryUtils()
        self.nfp_algorithm = NFPAlgorithm()
        
    def optimize(self, pieces: List[Dict], frame_width: float, frame_height: float,
                allow_rotation: bool = True, rotation_angles: List[int] = None,
                margin: float = 0, strategy: str = "bottom_left") -> Dict:
        """
        Ejecuta la optimización de nesting
        """
        start_time = time.time()
        
        if rotation_angles is None:
            rotation_angles = [0, 90, 180, 270]
        
        # Crear el marco rectangular
        container = self.geometry_utils.create_rectangle(frame_width, frame_height)
        
        # Expandir piezas por el margen
        processed_pieces = self._prepare_pieces(pieces, margin, allow_rotation, rotation_angles)
        
        # Ejecutar algoritmo según estrategia
        if strategy == "genetic_algorithm":
            result = self._genetic_algorithm_optimization(container, processed_pieces, frame_width, frame_height)
        else:
            result = self._greedy_optimization(container, processed_pieces, strategy)
        
        execution_time = time.time() - start_time
        
        # Calcular métricas
        efficiency = self._calculate_material_efficiency(result['placed_pieces'], frame_width, frame_height)
        
        return {
            'placed_pieces': result['placed_pieces'],
            'unplaced_pieces': result['unplaced_pieces'],
            'all_pieces': processed_pieces,
            'material_efficiency': efficiency,
            'execution_time': execution_time,
            'container': container
        }
    
    def _prepare_pieces(self, pieces: List[Dict], margin: float, 
                       allow_rotation: bool, rotation_angles: List[int]) -> List[Dict]:
        """Prepara las piezas para optimización"""
        processed_pieces = []
        
        for piece in pieces:
            quantity = piece.get('quantity', 1)
            base_points = piece['points']
            
            # Normalizar polígono
            normalized_points = self.geometry_utils.normalize_polygon(base_points)
            
            # Aplicar margen si es necesario
            if margin > 0:
                normalized_points = self.geometry_utils.expand_polygon(normalized_points, margin)
            
            # Preparar las variaciones de rotación disponibles
            available_rotations = []
            if allow_rotation:
                for angle in rotation_angles:
                    rotated_points = self.geometry_utils.rotate_polygon(normalized_points, angle)
                    available_rotations.append({
                        'points': rotated_points,
                        'rotation': angle,
                        'area': self.geometry_utils.calculate_polygon_area(rotated_points)
                    })
            else:
                available_rotations.append({
                    'points': normalized_points,
                    'rotation': 0,
                    'area': self.geometry_utils.calculate_polygon_area(normalized_points)
                })
            
            # Crear solo las copias necesarias según quantity
            for i in range(quantity):
                processed_pieces.append({
                    'id': f"{piece.get('id', 'piece')}_{i+1}",
                    'original_id': piece.get('id', 'piece'),
                    'copy_number': i+1,
                    'points': normalized_points,  # Mantener puntos originales
                    'rotation': 0,  # Rotación inicial
                    'original_points': base_points,
                    'area': self.geometry_utils.calculate_polygon_area(normalized_points),
                    'available_rotations': available_rotations  # Todas las rotaciones posibles
                })
        
        # Ordenar por área (piezas más grandes primero)
        processed_pieces.sort(key=lambda x: x['area'], reverse=True)
        
        return processed_pieces
    
    def _greedy_optimization(self, container: List[Tuple[float, float]], 
                           pieces: List[Dict], strategy: str) -> Dict:
        """Algoritmo greedy de colocación con rotación"""
        placed_pieces = []
        unplaced_pieces = []
        
        for piece in pieces:
            best_position = None
            best_rotation = None
            best_points = None
            best_score = float('inf')  # Para bottom_left, queremos minimizar
            
            # Probar todas las rotaciones disponibles
            for rotation_info in piece['available_rotations']:
                rotation_points = rotation_info['points']
                
                # Buscar la mejor posición para esta rotación
                position = self.nfp_algorithm.optimize_position(
                    container, placed_pieces, rotation_points, strategy
                )
                
                if position is not None:
                    # Verificar que la pieza cabe en el contenedor
                    translated_points = self.geometry_utils.translate_polygon(
                        rotation_points, position[0], position[1]
                    )
                    
                    if self._piece_fits_in_container(translated_points, container):
                        # Calcular score según estrategia
                        if strategy == "bottom_left":
                            score = position[1] + position[0] * 0.1  # Priorizar Y, luego X
                        else:
                            score = position[0] + position[1] * 0.1  # Priorizar X, luego Y
                        
                        # Si es mejor que la mejor posición encontrada
                        if score < best_score:
                            best_score = score
                            best_position = position
                            best_rotation = rotation_info
                            best_points = translated_points
            
            # Si encontramos una posición válida, colocar la pieza
            if best_position is not None:
                placed_piece = copy.deepcopy(piece)
                placed_piece['points'] = best_points
                placed_piece['position'] = best_position
                placed_piece['rotation'] = best_rotation['rotation']
                placed_piece['area'] = best_rotation['area']
                placed_pieces.append(placed_piece)
            else:
                unplaced_pieces.append(piece)
        
        return {
            'placed_pieces': placed_pieces,
            'unplaced_pieces': unplaced_pieces
        }
    
    def _genetic_algorithm_optimization(self, container: List[Tuple[float, float]], 
                                      pieces: List[Dict], frame_width: float, 
                                      frame_height: float) -> Dict:
        """Algoritmo genético para optimización con rotación"""
        population_size = min(50, len(pieces) * 2)
        generations = 100
        mutation_rate = 0.1
        
        if not pieces:
            return {'placed_pieces': [], 'unplaced_pieces': []}
        
        # Crear población inicial (cada individuo incluye orden Y rotaciones)
        population = []
        for _ in range(population_size):
            individual = self._create_random_individual(pieces)
            population.append(individual)
        
        best_solution = None
        best_fitness = -1
        
        for generation in range(generations):
            fitness_scores = []
            for individual in population:
                result = self._evaluate_individual_with_rotation(individual, container, pieces)
                fitness = self._calculate_material_efficiency(result['placed_pieces'], frame_width, frame_height)
                fitness_scores.append(fitness)
                
                if fitness > best_fitness:
                    best_fitness = fitness
                    best_solution = result
            
            if not fitness_scores or max(fitness_scores) == 0:
                continue
            
            # Selección y reproducción
            new_population = []
            for _ in range(population_size):
                try:
                    parent1 = self._tournament_selection(population, fitness_scores)
                    parent2 = self._tournament_selection(population, fitness_scores)
                    child = self._crossover_with_rotation(parent1, parent2)
                    
                    if random.random() < mutation_rate:
                        child = self._mutate_with_rotation(child, pieces)
                    
                    new_population.append(child)
                except:
                    new_population.append(self._create_random_individual(pieces))
            
            population = new_population
            
            # Mostrar progreso
            if generation % 20 == 0:
                print(f"Generación {generation}: Mejor fitness = {best_fitness:.2f}%")
        
        return best_solution if best_solution else {'placed_pieces': [], 'unplaced_pieces': pieces}
    
    def _create_random_individual(self, pieces: List[Dict]) -> List[Dict]:
        """Crea un individuo aleatorio (orden + rotaciones)"""
        individual = []
        indices = list(range(len(pieces)))
        random.shuffle(indices)
        
        for i in indices:
            piece = pieces[i]
            # Elegir una rotación aleatoria
            rotation_idx = random.randint(0, len(piece['available_rotations']) - 1)
            individual.append({
                'piece_index': i,
                'rotation_index': rotation_idx
            })
        
        return individual
    
    def _evaluate_individual_with_rotation(self, individual: List[Dict], 
                                         container: List[Tuple[float, float]], 
                                         pieces: List[Dict]) -> Dict:
        """Evalúa un individuo con rotaciones"""
        placed_pieces = []
        unplaced_pieces = []
        
        for gene in individual:
            piece_idx = gene['piece_index']
            rotation_idx = gene['rotation_index']
            
            if piece_idx >= len(pieces):
                continue
                
            piece = pieces[piece_idx]
            
            # Verificar que el índice de rotación sea válido
            if rotation_idx >= len(piece['available_rotations']):
                rotation_idx = 0
            
            rotation_info = piece['available_rotations'][rotation_idx]
            rotation_points = rotation_info['points']
            
            try:
                position = self.nfp_algorithm.optimize_position(
                    container, placed_pieces, rotation_points, "bottom_left"
                )
                
                if position is not None:
                    translated_points = self.geometry_utils.translate_polygon(
                        rotation_points, position[0], position[1]
                    )
                    
                    if self._piece_fits_in_container(translated_points, container):
                        placed_piece = copy.deepcopy(piece)
                        placed_piece['points'] = translated_points
                        placed_piece['position'] = position
                        placed_piece['rotation'] = rotation_info['rotation']
                        placed_piece['area'] = rotation_info['area']
                        placed_pieces.append(placed_piece)
                        continue
                
                unplaced_pieces.append(piece)
                
            except Exception as e:
                unplaced_pieces.append(piece)
        
        return {
            'placed_pieces': placed_pieces,
            'unplaced_pieces': unplaced_pieces
        }
    
    def _crossover_with_rotation(self, parent1: List[Dict], parent2: List[Dict]) -> List[Dict]:
        """Cruzamiento con rotaciones"""
        if not parent1 or not parent2:
            return parent1.copy() if parent1 else parent2.copy()
        
        size = min(len(parent1), len(parent2))
        if size <= 2:
            return parent1.copy()
        
        # Punto de cruzamiento
        crossover_point = random.randint(1, size - 1)
        
        child = parent1[:crossover_point] + parent2[crossover_point:]
        
        # Eliminar duplicados manteniendo el orden
        seen_pieces = set()
        unique_child = []
        
        for gene in child:
            piece_idx = gene['piece_index']
            if piece_idx not in seen_pieces:
                seen_pieces.add(piece_idx)
                unique_child.append(gene)
        
        return unique_child
    
    def _mutate_with_rotation(self, individual: List[Dict], pieces: List[Dict]) -> List[Dict]:
        """Mutación con rotaciones"""
        if len(individual) < 2:
            return individual.copy()
        
        mutated = individual.copy()
        
        # Tipo de mutación aleatoria
        mutation_type = random.choice(['swap', 'rotation', 'both'])
        
        if mutation_type in ['swap', 'both']:
            # Intercambiar posiciones
            i, j = random.sample(range(len(mutated)), 2)
            mutated[i], mutated[j] = mutated[j], mutated[i]
        
        if mutation_type in ['rotation', 'both']:
            # Cambiar rotación de una pieza aleatoria
            gene_idx = random.randint(0, len(mutated) - 1)
            piece_idx = mutated[gene_idx]['piece_index']
            
            if piece_idx < len(pieces):
                piece = pieces[piece_idx]
                new_rotation_idx = random.randint(0, len(piece['available_rotations']) - 1)
                mutated[gene_idx]['rotation_index'] = new_rotation_idx
        
        return mutated
    
    def _tournament_selection(self, population: List, fitness_scores: List[float], 
                            tournament_size: int = 3) -> List:
        """Selección por torneo"""
        tournament_size = min(tournament_size, len(population))
        
        if not fitness_scores:
            return random.choice(population)
        
        tournament_indices = random.sample(range(len(population)), tournament_size)
        tournament_fitness = [fitness_scores[i] for i in tournament_indices]
        
        best_fitness_idx = tournament_fitness.index(max(tournament_fitness))
        winner_idx = tournament_indices[best_fitness_idx]
        
        return copy.deepcopy(population[winner_idx])
    
    def _piece_fits_in_container(self, piece_points: List[Tuple[float, float]], 
                               container: List[Tuple[float, float]]) -> bool:
        """Verifica si una pieza cabe completamente dentro del contenedor"""
        try:
            min_x = min(p[0] for p in piece_points)
            max_x = max(p[0] for p in piece_points)
            min_y = min(p[1] for p in piece_points)
            max_y = max(p[1] for p in piece_points)
            
            container_min_x = min(p[0] for p in container)
            container_max_x = max(p[0] for p in container)
            container_min_y = min(p[1] for p in container)
            container_max_y = max(p[1] for p in container)
            
            return (min_x >= container_min_x and max_x <= container_max_x and
                    min_y >= container_min_y and max_y <= container_max_y)
        except:
            return False
    
    def _calculate_material_efficiency(self, placed_pieces: List[Dict], 
                                     frame_width: float, frame_height: float) -> float:
        """Calcula la eficiencia de material utilizada"""
        if not placed_pieces:
            return 0.0
        
        total_area = frame_width * frame_height
        if total_area <= 0:
            return 0.0
        
        used_area = sum(piece.get('area', 0) for piece in placed_pieces)
        
        return (used_area / total_area) * 100