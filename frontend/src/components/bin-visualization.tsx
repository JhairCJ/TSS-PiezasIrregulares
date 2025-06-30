import type React from "react"

interface Piece {
  id: string
  original_id: string
  copy_number: number
  points: [number, number][]
}

interface Bin {
  bin_id: number
  bin_width: number
  bin_height: number
  material_efficiency: number
  execution_time: number
  placed_pieces: Piece[]
}

interface BinVisualizationProps {
  bin: Bin
  scale?: number
}

const BinVisualization: React.FC<BinVisualizationProps> = ({ bin, scale = 2 }) => {
  const colors = [
    "#FF6B6B",
    "#4ECDC4",
    "#45B7D1",
    "#96CEB4",
    "#FFEAA7",
    "#DDA0DD",
    "#98D8C8",
    "#F7DC6F",
    "#BB8FCE",
    "#85C1E9",
  ]

  const getColorForPiece = (originalId: string, index: number) => {
    const colorMap: Record<string, string> = {
      rectangulo_1: colors[0],
      triangulo_1: colors[1],
      L_shape: colors[2],
      pequeño_cuadrado: colors[3],
    }
    return colorMap[originalId] || colors[index % colors.length]
  }

  return (
    <div className="bg-white p-4 rounded-lg shadow-lg">
      <h3 className="text-lg font-semibold mb-4 text-gray-800">
        Bin {bin.bin_id} - Eficiencia: {bin.material_efficiency.toFixed(2)}%
      </h3>

      <div className="relative border-2 border-gray-300 inline-block">
        <svg width={bin.bin_width * scale} height={bin.bin_height * scale} className="bg-gray-50">
          {/* Grid de fondo */}
          <defs>
            <pattern id="grid" width="10" height="10" patternUnits="userSpaceOnUse">
              <path d="M 10 0 L 0 0 0 10" fill="none" stroke="#e5e7eb" strokeWidth="0.5" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />

          {/* Piezas colocadas */}
          {bin.placed_pieces.map((piece, index) => {
            const color = getColorForPiece(piece.original_id, index)
            const points = piece.points.map(([x, y]) => `${x * scale},${y * scale}`).join(" ")

            return (
              <g key={piece.id}>
                <polygon points={points} fill={color} stroke="#374151" strokeWidth="1" opacity="0.8" />
                <text
                  x={(piece.points.reduce((sum, [x]) => sum + x, 0) / piece.points.length) * scale}
                  y={(piece.points.reduce((sum, [, y]) => sum + y, 0) / piece.points.length) * scale}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fontSize="10"
                  fill="#1f2937"
                  fontWeight="bold"
                >
                  {piece.original_id.split("_")[0].charAt(0).toUpperCase()}
                  {piece.copy_number}
                </text>
              </g>
            )
          })}
        </svg>
      </div>

      <div className="mt-4 text-sm text-gray-600">
        <p>
          Dimensiones: {bin.bin_width} × {bin.bin_height}
        </p>
        <p>Piezas colocadas: {bin.placed_pieces.length}</p>
        <p>Tiempo de ejecución: {(bin.execution_time * 1000).toFixed(2)}ms</p>
      </div>
    </div>
  )
}

export default BinVisualization
