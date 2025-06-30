#!/usr/bin/env python3
"""
Script principal para probar el optimizador de nesting
"""

import json
import matplotlib.pyplot as plt
import matplotlib.patches as patches
from matplotlib.patches import Polygon
import numpy as np
from typing import List, Dict, Tuple
import random

# Importar las clases necesarias (asegúrate de tener estos archivos)
try:
    from nesting_optimizer import NestingOptimizer
    from geometry_utils import GeometryUtils
    from nfp_algorithm import NFPAlgorithm
except ImportError as e:
    print(f"Error: No se pudieron importar las clases necesarias: {e}")
    print("Asegúrate de tener los archivos: geometry_utils.py, nfp_algorithm.py")
    exit(1)

class NestingTester:
    """Clase para probar y visualizar el optimizador de nesting"""
    
    def __init__(self):
        self.optimizer = NestingOptimizer()
        self.geometry_utils = GeometryUtils()
    
    def create_sample_pieces(self) -> List[Dict]:
        """Crea piezas de ejemplo para pruebas"""
        pieces = []
        
        # Rectángulo
        pieces.append({
            'id': 'rect_1',
            'points': [(0, 0), (30, 0), (30, 20), (0, 20)],
            'quantity': 3
        })
        
        # Triángulo
        pieces.append({
            'id': 'triangle_1',
            'points': [(0, 0), (25, 0), (25, 25)],
            'quantity': 30
        })
        
        # L-shape
        pieces.append({
            'id': 'l_shape_1',
            'points': [(0, 0), (20, 0), (20, 10), (10, 10), (10, 30), (0, 30)],
            'quantity': 2
        })
        
        # Hexágono regular
        pieces.append({
            'id': 'hexagon_1',
            'points': self._create_regular_polygon(6, 15),
            'quantity': 1
        })
        
        # Círculo aproximado con polígono
        pieces.append({
            'id': 'circle_1',
            'points': self._create_regular_polygon(12, 12),
            'quantity': 2
        })
        
        return pieces
    
    def create_complex_pieces(self) -> List[Dict]:
        """Crea piezas más complejas para pruebas avanzadas"""
        pieces = []
        
        # Pieza en forma de T
        pieces.append({
            'id': 't_shape',
            'points': [(0, 0), (40, 0), (40, 10), (25, 10), (25, 30), (15, 30), (15, 10), (0, 10)],
            'quantity': 2
        })
        
        # Pieza en forma de U
        pieces.append({
            'id': 'u_shape',
            'points': [(0, 0), (10, 0), (10, 25), (20, 25), (20, 0), (30, 0), (30, 35), (0, 35)],
            'quantity': 1
        })
        
        # Estrella de 5 puntas
        star_points = self._create_star(5, 20, 10)
        pieces.append({
            'id': 'star_5',
            'points': star_points,
            'quantity': 1
        })
        
        return pieces
    
    def _create_regular_polygon(self, sides: int, radius: float) -> List[Tuple[float, float]]:
        """Crea un polígono regular"""
        points = []
        for i in range(sides):
            angle = 2 * np.pi * i / sides
            x = radius * np.cos(angle)
            y = radius * np.sin(angle)
            points.append((x, y))
        return points
    
    def _create_star(self, points: int, outer_radius: float, inner_radius: float) -> List[Tuple[float, float]]:
        """Crea una estrella"""
        star_points = []
        for i in range(points * 2):
            angle = np.pi * i / points
            if i % 2 == 0:
                radius = outer_radius
            else:
                radius = inner_radius
            x = radius * np.cos(angle - np.pi/2)
            y = radius * np.sin(angle - np.pi/2)
            star_points.append((x, y))
        return star_points
    
    def run_optimization_test(self, pieces: List[Dict], frame_width: float, frame_height: float,
                            strategy: str = "bottom_left", allow_rotation: bool = True,
                            margin: float = 0, test_name: str = "Test"):
        """Ejecuta una prueba de optimización"""
        print(f"\n{'='*50}")
        print(f"EJECUTANDO {test_name.upper()}")
        print(f"{'='*50}")
        print(f"Marco: {frame_width} x {frame_height}")
        print(f"Estrategia: {strategy}")
        print(f"Rotación: {'Sí' if allow_rotation else 'No'}")
        print(f"Margen: {margin}")
        print(f"Número de piezas: {len(pieces)}")
        
        # Calcular total de piezas considerando cantidad
        total_pieces = sum(piece.get('quantity', 1) for piece in pieces)
        total_area = sum(self.geometry_utils.calculate_polygon_area(piece['points']) * piece.get('quantity', 1) 
                        for piece in pieces)
        
        print(f"Total de elementos: {total_pieces}")
        print(f"Área total de piezas: {total_area:.2f}")
        print(f"Área del marco: {frame_width * frame_height:.2f}")
        print(f"Ratio teórico: {(total_area / (frame_width * frame_height)) * 100:.2f}%")
        
        # Ejecutar optimización
        result = self.optimizer.optimize(
            pieces=pieces,
            frame_width=frame_width,
            frame_height=frame_height,
            allow_rotation=allow_rotation,
            rotation_angles=[0,90, 180, 270] if allow_rotation else [0],
            margin=margin,
            strategy=strategy
        )
        
        # Mostrar resultados
        print(f"\nRESULTADOS:")
        print(f"Piezas colocadas: {len(result['placed_pieces'])}")
        print(f"Piezas no colocadas: {len(result['unplaced_pieces'])}")
        print(f"Eficiencia de material: {result['material_efficiency']:.2f}%")
        print(f"Tiempo de ejecución: {result['execution_time']:.3f} segundos")
        
        if result['unplaced_pieces']:
            print(f"\nPiezas no colocadas:")
            for piece in result['unplaced_pieces']:
                print(f"  - {piece['id']}")
        
        return result
    
    def visualize_result(self, result: Dict, frame_width: float, frame_height: float,
                        title: str = "Resultado de Nesting", save_path: str = None):
        """Visualiza el resultado del nesting"""
        fig, ax = plt.subplots(1, 1, figsize=(12, 8))
        
        # Dibujar el marco
        frame_rect = patches.Rectangle((0, 0), frame_width, frame_height,
                                     linewidth=2, edgecolor='black', facecolor='none')
        ax.add_patch(frame_rect)
        
        # Colores para las piezas
        colors = plt.cm.Set3(np.linspace(0, 1, len(result['placed_pieces']) + len(result['unplaced_pieces'])))
        color_idx = 0
        
        # Dibujar piezas colocadas
        for piece in result['placed_pieces']:
            polygon = Polygon(piece['points'], alpha=0.7, facecolor=colors[color_idx],
                            edgecolor='black', linewidth=1)
            ax.add_patch(polygon)
            
            # Añadir etiqueta
            centroid = self._calculate_centroid(piece['points'])
            ax.text(centroid[0], centroid[1], piece['id'], 
                   ha='center', va='center', fontsize=8, weight='bold')
            
            color_idx += 1
        
        # Configurar el plot
        ax.set_xlim(-frame_width * 0.1, frame_width * 1.1)
        ax.set_ylim(-frame_height * 0.1, frame_height * 1.1)
        ax.set_aspect('equal')
        ax.grid(True, alpha=0.3)
        ax.set_xlabel('X')
        ax.set_ylabel('Y')
        ax.set_title(f"{title}\nEficiencia: {result['material_efficiency']:.2f}% | "
                    f"Piezas: {len(result['placed_pieces'])}/{len(result['placed_pieces']) + len(result['unplaced_pieces'])}")
        
        # Mostrar estadísticas
        stats_text = f"Colocadas: {len(result['placed_pieces'])}\n"
        stats_text += f"No colocadas: {len(result['unplaced_pieces'])}\n"
        stats_text += f"Tiempo: {result['execution_time']:.3f}s"
        
        ax.text(0.02, 0.98, stats_text, transform=ax.transAxes, 
               verticalalignment='top', bbox=dict(boxstyle='round', facecolor='wheat', alpha=0.8))
        
        plt.tight_layout()
        
        if save_path:
            plt.savefig(save_path, dpi=300, bbox_inches='tight')
            print(f"Visualización guardada en: {save_path}")
        
        plt.show()
    
    def _calculate_centroid(self, points: List[Tuple[float, float]]) -> Tuple[float, float]:
        """Calcula el centroide de un polígono"""
        x_coords = [p[0] for p in points]
        y_coords = [p[1] for p in points]
        return (sum(x_coords) / len(x_coords), sum(y_coords) / len(y_coords))
    
    def run_comparison_test(self, pieces: List[Dict], frame_width: float, frame_height: float):
        """Ejecuta pruebas comparativas entre diferentes estrategias"""
        strategies = ["bottom_left", "genetic_algorithm"]
        results = {}
        
        print(f"\n{'='*60}")
        print("PRUEBA COMPARATIVA DE ESTRATEGIAS")
        print(f"{'='*60}")
        
        for strategy in strategies:
            print(f"\nProbando estrategia: {strategy}")
            result = self.optimizer.optimize(
                pieces=pieces,
                frame_width=frame_width,
                frame_height=frame_height,
                allow_rotation=True,
                margin=1.0,
                strategy=strategy
            )
            results[strategy] = result
            
            print(f"  - Eficiencia: {result['material_efficiency']:.2f}%")
            print(f"  - Piezas colocadas: {len(result['placed_pieces'])}")
            print(f"  - Tiempo: {result['execution_time']:.3f}s")
        
        # Mostrar comparación
        print(f"\n{'='*40}")
        print("RESUMEN COMPARATIVO")
        print(f"{'='*40}")
        
        best_strategy = max(results.keys(), key=lambda k: results[k]['material_efficiency'])
        
        for strategy, result in results.items():
            marker = " ⭐" if strategy == best_strategy else ""
            print(f"{strategy:20s}: {result['material_efficiency']:6.2f}% "
                  f"({len(result['placed_pieces'])} piezas, {result['execution_time']:.3f}s){marker}")
        
        return results
    
    def save_result_to_json(self, result: Dict, filename: str):
        """Guarda el resultado en un archivo JSON"""
        # Convertir tuplas a listas para JSON
        json_result = {
            'placed_pieces': [],
            'unplaced_pieces': [],
            'material_efficiency': result['material_efficiency'],
            'execution_time': result['execution_time']
        }
        
        for piece in result['placed_pieces']:
            json_piece = piece.copy()
            json_piece['points'] = [[p[0], p[1]] for p in piece['points']]
            if 'position' in json_piece:
                json_piece['position'] = [json_piece['position'][0], json_piece['position'][1]]
            json_result['placed_pieces'].append(json_piece)
        
        for piece in result['unplaced_pieces']:
            json_piece = piece.copy()
            json_piece['points'] = [[p[0], p[1]] for p in piece['points']]
            json_result['unplaced_pieces'].append(json_piece)
        
        with open(filename, 'w', encoding='utf-8') as f:
            json.dump(json_result, f, indent=2, ensure_ascii=False)
        
        print(f"Resultado guardado en: {filename}")

def main():
    """Función principal"""
    print("🔧 INICIANDO PRUEBAS DEL OPTIMIZADOR DE NESTING")
    print("=" * 60)
    
    tester = NestingTester()
    
    # Prueba 1: Piezas simples
    print("\n🔸 PRUEBA 1: Piezas Simples")
    simple_pieces = tester.create_sample_pieces()
    result1 = tester.run_optimization_test(
        pieces=simple_pieces,
        frame_width=150,
        frame_height=100,
        strategy="bottom_left",
        test_name="Piezas Simples - Bottom Left"
    )
    tester.visualize_result(result1, 150, 100, "Prueba 1: Piezas Simples")
    
    # Prueba 2: Piezas complejas
    print("\n🔸 PRUEBA 2: Piezas Complejas")
    complex_pieces = tester.create_complex_pieces()
    result2 = tester.run_optimization_test(
        pieces=complex_pieces,
        frame_width=120,
        frame_height=120,
        strategy="bottom_left",
        test_name="Piezas Complejas - Bottom Left"
    )
    tester.visualize_result(result2, 120, 120, "Prueba 2: Piezas Complejas")
    
    # Prueba 3: Algoritmo genético
    print("\n🔸 PRUEBA 3: Algoritmo Genético")
    result3 = tester.run_optimization_test(
        pieces=simple_pieces,
        frame_width=150,
        frame_height=100,
        strategy="genetic_algorithm",
        test_name="Piezas Simples - Algoritmo Genético"
    )
    tester.visualize_result(result3, 150, 100, "Prueba 3: Algoritmo Genético")
    
    # Prueba 4: Comparación de estrategias
    print("\n🔸 PRUEBA 4: Comparación de Estrategias")
    comparison_results = tester.run_comparison_test(simple_pieces, 150, 100)
    
    # Prueba 5: Sin rotación
    print("\n🔸 PRUEBA 5: Sin Rotación")
    result5 = tester.run_optimization_test(
        pieces=simple_pieces,
        frame_width=150,
        frame_height=100,
        strategy="bottom_left",
        allow_rotation=False,
        test_name="Sin Rotación"
    )
    tester.visualize_result(result5, 150, 100, "Prueba 5: Sin Rotación")
    
    # Guardar resultados
    print("\n💾 GUARDANDO RESULTADOS")
    tester.save_result_to_json(result1, "resultado_simple.json")
    tester.save_result_to_json(result3, "resultado_genetico.json")
    
    print("\n✅ PRUEBAS COMPLETADAS")
    print("=" * 60)
    print("Todas las pruebas han sido ejecutadas exitosamente.")
    print("Revisa las visualizaciones y archivos JSON generados.")

if __name__ == "__main__":
    main()