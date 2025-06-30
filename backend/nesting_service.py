from typing import List, Dict
from models import NestingRequest, NestingResponse, BinResult, NestingSummary
from multi_bin_nesting import MultiBinNesting

class NestingService:
    """Servicio para optimización de nesting en múltiples bins"""
    
    def __init__(self):
        self.optimizer = MultiBinNesting()
    
    def process_nesting_request(self, request: NestingRequest) -> NestingResponse:
        """
        Procesa una solicitud de nesting y retorna el resultado
        
        Args:
            request: Solicitud con piezas y parámetros de optimización
            
        Returns:
            Respuesta con bins optimizados y resumen
        """
        # Validar estrategia
        self._validate_strategy(request.strategy)
        
        # Validar ángulos de rotación
        if request.rotation_angles:
            self._validate_rotation_angles(request.rotation_angles)
        
        # Convertir piezas al formato del optimizador
        pieces_data = self._convert_pieces(request.pieces)
        
        # Realizar optimización
        bins = self.optimizer.optimize_multiple_bins(
            pieces=pieces_data,
            bin_width=request.bin_width,
            bin_height=request.bin_height,
            allow_rotation=request.allow_rotation,
            rotation_angles=request.rotation_angles,
            margin=request.margin,
            strategy=request.strategy
        )
        
        # Obtener resumen
        summary = self.optimizer.get_summary(bins)
        
        # Crear y retornar respuesta
        return NestingResponse(
            success=True,
            bins=[BinResult(**bin_data) for bin_data in bins],
            summary=NestingSummary(**summary),
            message=f"Optimización completada. Se utilizaron {len(bins)} bins con {summary['average_efficiency']}% de eficiencia promedio."
        )
    
    def _validate_strategy(self, strategy: str) -> None:
        """Valida que la estrategia sea válida"""
        valid_strategies = ["bottom_left", "best_fit", "genetic_algorithm"]
        if strategy not in valid_strategies:
            raise ValueError(f"Estrategia inválida. Use una de: {valid_strategies}")
    
    def _validate_rotation_angles(self, angles: List[int]) -> None:
        """Valida que los ángulos de rotación sean válidos"""
        for angle in angles:
            if not isinstance(angle, int) or angle < 0 or angle >= 360:
                raise ValueError("Los ángulos deben ser enteros entre 0 y 359")
    
    def _convert_pieces(self, pieces: List) -> List[Dict]:
        """Convierte piezas al formato esperado por el optimizador"""
        return [
            {
                'id': piece.id,
                'points': piece.points,
                'quantity': piece.quantity
            }
            for piece in pieces
        ]