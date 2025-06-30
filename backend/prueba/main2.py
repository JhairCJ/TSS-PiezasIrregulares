import matplotlib.pyplot as plt
import matplotlib.patches as patches
import random
from multi_bin_nesting import MultiBinNesting

def visualize_bins(bins):
    """Visualiza los bins con las piezas colocadas"""
    if not bins:
        print("No hay bins para visualizar")
        return
    
    # Calcular layout de subplots
    num_bins = len(bins)
    cols = min(3, num_bins)  # Máximo 3 columnas
    rows = (num_bins + cols - 1) // cols
    
    fig, axes = plt.subplots(rows, cols, figsize=(5*cols, 4*rows))
    if num_bins == 1:
        axes = [axes]
    elif rows == 1:
        axes = [axes] if cols == 1 else axes
    else:
        axes = axes.flatten()
    
    # Colores para diferentes piezas
    colors = ['red', 'blue', 'green', 'orange', 'purple', 'brown', 'pink', 'gray', 'olive', 'cyan']
    
    for i, bin_data in enumerate(bins):
        ax = axes[i]
        
        # Dibujar el marco del bin
        bin_rect = patches.Rectangle((0, 0), bin_data['bin_width'], bin_data['bin_height'], 
                                   linewidth=2, edgecolor='black', facecolor='lightgray', alpha=0.3)
        ax.add_patch(bin_rect)
        
        # Dibujar las piezas colocadas
        piece_colors = {}
        color_idx = 0
        
        for piece in bin_data['placed_pieces']:
            # Asignar color por ID original
            original_id = piece.get('original_id', piece['id'])
            if original_id not in piece_colors:
                piece_colors[original_id] = colors[color_idx % len(colors)]
                color_idx += 1
            
            # Crear polígono
            points = piece['points']
            polygon = patches.Polygon(points, closed=True, 
                                    facecolor=piece_colors[original_id], 
                                    edgecolor='black', linewidth=1, alpha=0.7)
            ax.add_patch(polygon)
            
            # Agregar etiqueta en el centro
            center_x = sum(p[0] for p in points) / len(points)
            center_y = sum(p[1] for p in points) / len(points)
            ax.text(center_x, center_y, original_id, ha='center', va='center', 
                   fontsize=8, fontweight='bold')
        
        # Configurar ejes
        ax.set_xlim(-10, bin_data['bin_width'] + 10)
        ax.set_ylim(-10, bin_data['bin_height'] + 10)
        ax.set_aspect('equal')
        ax.set_title(f"Bin {bin_data['bin_id']}\n{bin_data['total_pieces']} piezas - {bin_data['material_efficiency']:.1f}% eficiencia")
        ax.grid(True, alpha=0.3)
    
    # Ocultar ejes sobrantes
    for j in range(num_bins, len(axes)):
        axes[j].set_visible(False)
    
    plt.tight_layout()
    plt.show()

# Ejemplo de uso
if __name__ == "__main__":
    # Ejemplo de piezas
    pieces = [
        {
            'id': 'piece_A',
            'points': [(0, 0), (100, 0), (100, 50), (0, 50)],  # Rectángulo 100x50
            'quantity': 5
        },
        {
            'id': 'piece_B',
            'points': [(0, 0), (80, 0), (80, 80), (0, 80)],   # Cuadrado 80x80
            'quantity': 3
        },
        {
            'id': 'piece_C',
            'points': [(0, 0), (60, 0), (60, 120)], # Rectángulo 60x120
            'quantity': 50
        }
    ]
    
    # Crear optimizador
    multi_nesting = MultiBinNesting()
    
    # Optimizar en múltiples bins de 300x200
    bins = multi_nesting.optimize_multiple_bins(
        pieces=pieces,
        bin_width=300,
        bin_height=200,
        allow_rotation=True,
        margin=0,
        strategy="best_fit"
    )
    
    # Mostrar resultados
    summary = multi_nesting.get_summary(bins)
    
    print("=== RESUMEN DE OPTIMIZACIÓN ===")
    print(f"Total de bins utilizados: {summary['total_bins']}")
    print(f"Total de piezas colocadas: {summary['total_pieces_placed']}")
    print(f"Total de piezas no colocadas: {summary['total_pieces_unplaced']}")
    print(f"Eficiencia promedio: {summary['average_efficiency']}%")
    print(f"Tiempo total de ejecución: {summary['total_execution_time']}s")
    print(f"Eficiencias por bin: {summary['bin_efficiencies']}")
    
    print("\n=== DETALLES POR BIN ===")
    for i, bin_data in enumerate(bins):
        print(f"\nBin {bin_data['bin_id']}:")
        print(f"  - Piezas colocadas: {bin_data['total_pieces']}")
        print(f"  - Eficiencia: {bin_data['material_efficiency']:.2f}%")
        print(f"  - Tiempo: {bin_data['execution_time']:.4f}s")
        
        if bin_data['unplaced_pieces']:
            print(f"  - Piezas no colocadas: {len(bin_data['unplaced_pieces'])}")
    
    # Visualizar resultados
    print("\n=== VISUALIZACIÓN ===")
    visualize_bins(bins)