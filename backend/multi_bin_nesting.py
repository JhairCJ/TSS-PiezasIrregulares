
from typing import List, Dict
from nesting_optimizer import NestingOptimizer 

class MultiBinNesting:
    """Optimizador para múltiples bins de nesting"""
    
    def __init__(self):
        self.optimizer = NestingOptimizer()
    
    def optimize_multiple_bins(self, pieces: List[Dict], bin_width: float, bin_height: float,
                              allow_rotation: bool = True, rotation_angles: List[int] = None,
                              margin: float = 0, strategy: str = "bottom_left") -> List[Dict]:
        """
        Optimiza piezas en múltiples bins
        
        Args:
            pieces: Lista de piezas con formato {'id': str, 'points': List[Tuple], 'quantity': int}
            bin_width: Ancho del bin
            bin_height: Alto del bin
            allow_rotation: Permitir rotación
            rotation_angles: Ángulos de rotación permitidos
            margin: Margen entre piezas
            strategy: Estrategia de colocación
            
        Returns:
            Lista de bins, cada uno con sus piezas colocadas
        """
        if rotation_angles is None:
            rotation_angles = [0, 90, 180, 270]
        
        bins = []
        remaining_pieces = pieces.copy()
        bin_number = 1
        
        while remaining_pieces:
            # Optimizar el bin actual con las piezas restantes
            result = self.optimizer.optimize(
                pieces=remaining_pieces,
                frame_width=bin_width,
                frame_height=bin_height,
                allow_rotation=allow_rotation,
                rotation_angles=rotation_angles,
                margin=margin,
                strategy=strategy
            )
            
            # Si no se pudo colocar ninguna pieza, terminar
            if not result['placed_pieces']:
                # Agregar las piezas no colocadas al último bin
                if bins:
                    bins[-1]['unplaced_pieces'].extend(remaining_pieces)
                break
            
            # Crear el bin con las piezas colocadas
            bin_data = {
                'bin_id': bin_number,
                'bin_width': bin_width,
                'bin_height': bin_height,
                'placed_pieces': result['placed_pieces'],
                'unplaced_pieces': [],  # Las no colocadas van al siguiente bin
                'material_efficiency': result['material_efficiency'],
                'execution_time': result['execution_time'],
                'total_pieces': len(result['placed_pieces'])
            }
            
            bins.append(bin_data)
            
            # Preparar piezas para el siguiente bin
            remaining_pieces = self._prepare_remaining_pieces(result['unplaced_pieces'])
            bin_number += 1
        
        return bins
    
    def _prepare_remaining_pieces(self, unplaced_pieces: List[Dict]) -> List[Dict]:
        """Prepara las piezas no colocadas para el siguiente bin"""
        # Agrupar por ID original para reconstruir las piezas originales
        piece_groups = {}
        
        for piece in unplaced_pieces:
            original_id = piece.get('original_id', piece['id'])
            if original_id not in piece_groups:
                piece_groups[original_id] = {
                    'id': original_id,
                    'points': piece['original_points'],
                    'quantity': 0
                }
            piece_groups[original_id]['quantity'] += 1
        
        return list(piece_groups.values())
    
    def get_summary(self, bins: List[Dict]) -> Dict:
        """Obtiene un resumen de la optimización"""
        if not bins:
            return {
                'total_bins': 0,
                'total_pieces_placed': 0,
                'total_pieces_unplaced': 0,
                'average_efficiency': 0.0,
                'total_execution_time': 0.0
            }
        
        total_pieces_placed = sum(bin_data['total_pieces'] for bin_data in bins)
        total_pieces_unplaced = sum(len(bin_data['unplaced_pieces']) for bin_data in bins)
        average_efficiency = sum(bin_data['material_efficiency'] for bin_data in bins) / len(bins)
        total_execution_time = sum(bin_data['execution_time'] for bin_data in bins)
        
        return {
            'total_bins': len(bins),
            'total_pieces_placed': total_pieces_placed,
            'total_pieces_unplaced': total_pieces_unplaced,
            'average_efficiency': round(average_efficiency, 2),
            'total_execution_time': round(total_execution_time, 4),
            'bin_efficiencies': [round(bin_data['material_efficiency'], 2) for bin_data in bins]
        }