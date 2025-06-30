"use client"

import type React from "react"
import { useState } from "react"
import { Trash2, Edit3, Save, X, Pencil, Ruler } from "lucide-react"

// Unidades de medida
const UNITS = {
  mm: { label: "Milímetros", factor: 1, symbol: "mm" },
  cm: { label: "Centímetros", factor: 10, symbol: "cm" },
  m: { label: "Metros", factor: 1000, symbol: "m" },
  in: { label: "Pulgadas", factor: 25.4, symbol: "in" },
} as const

type UnitType = keyof typeof UNITS

interface Piece {
  id: string
  points: [number, number][]
  quantity: number
}

interface PiecesListProps {
  pieces: Piece[]
  onUpdatePieces: (pieces: Piece[]) => void
  onClearAll: () => void
  onEditShape: (piece: Piece, index: number) => void
  currentUnit: UnitType
}

const PiecesList: React.FC<PiecesListProps> = ({ pieces, onUpdatePieces, onClearAll, onEditShape, currentUnit }) => {
  const [editingIndex, setEditingIndex] = useState<number | null>(null)
  const [editForm, setEditForm] = useState({ id: "", quantity: 1 })

  // Convertir dimensiones según la unidad seleccionada
  const convertDimension = (value: number, fromUnit: UnitType = "mm", toUnit: UnitType = currentUnit) => {
    const mmValue = value * UNITS[fromUnit].factor
    return mmValue / UNITS[toUnit].factor
  }

  const startEditing = (index: number) => {
    const piece = pieces[index]
    setEditForm({ id: piece.id, quantity: piece.quantity })
    setEditingIndex(index)
  }

  const cancelEditing = () => {
    setEditingIndex(null)
    setEditForm({ id: "", quantity: 1 })
  }

  const saveEdit = () => {
    if (editingIndex !== null && editForm.id.trim()) {
      const updatedPieces = pieces.map((piece, index) =>
        index === editingIndex ? { ...piece, id: editForm.id.trim(), quantity: Math.max(1, editForm.quantity) } : piece,
      )
      onUpdatePieces(updatedPieces)
      cancelEditing()
    }
  }

  const deletePiece = (index: number) => {
    if (confirm("¿Estás seguro de que quieres eliminar esta figura?")) {
      const updatedPieces = pieces.filter((_, i) => i !== index)
      onUpdatePieces(updatedPieces)
    }
  }

  const duplicatePiece = (index: number) => {
    const piece = pieces[index]
    const duplicatedPiece = {
      ...piece,
      id: `${piece.id}_copia`,
    }
    onUpdatePieces([...pieces, duplicatedPiece])
  }

  const handleEditShape = (index: number) => {
    const piece = pieces[index]
    onEditShape(piece, index)
  }

  // Calcular dimensiones de una pieza
  const getPieceDimensions = (points: [number, number][]) => {
    if (points.length === 0) return { width: 0, height: 0, area: 0 }

    const minX = Math.min(...points.map(([x]) => x))
    const maxX = Math.max(...points.map(([x]) => x))
    const minY = Math.min(...points.map(([, y]) => y))
    const maxY = Math.max(...points.map(([, y]) => y))

    const width = convertDimension(maxX - minX)
    const height = convertDimension(maxY - minY)
    const area = width * height

    return { width, height, area }
  }

  // Generar una vista previa simple de la figura
  const generatePreview = (points: [number, number][]) => {
    if (points.length === 0) return null

    const minX = Math.min(...points.map(([x]) => x))
    const maxX = Math.max(...points.map(([x]) => x))
    const minY = Math.min(...points.map(([, y]) => y))
    const maxY = Math.max(...points.map(([, y]) => y))

    const width = maxX - minX || 1
    const height = maxY - minY || 1
    const scale = Math.min(40 / width, 40 / height)

    const scaledPoints = points.map(([x, y]) => [(x - minX) * scale, (y - minY) * scale])

    return (
      <svg width="40" height="40" className="border rounded bg-gray-50">
        <polygon
          points={scaledPoints.map(([x, y]) => `${x + 2},${y + 2}`).join(" ")}
          fill="#3b82f6"
          fillOpacity="0.3"
          stroke="#3b82f6"
          strokeWidth="1"
        />
      </svg>
    )
  }

  if (pieces.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h3 className="text-lg font-medium mb-4">Lista de Piezas</h3>
        <div className="text-center py-8 text-gray-500">
          <div className="text-4xl mb-2">📦</div>
          <p className="text-sm">No hay figuras cargadas</p>
          <p className="text-xs mt-1">Diseña una figura o importa un archivo</p>
        </div>
      </div>
    )
  }

  const totalPieces = pieces.reduce((sum, piece) => sum + piece.quantity, 0)
  const totalArea = pieces.reduce((sum, piece) => {
    const dimensions = getPieceDimensions(piece.points)
    return sum + dimensions.area * piece.quantity
  }, 0)

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-medium flex items-center">
          <Ruler className="mr-2" size={18} />
          Lista de Piezas ({UNITS[currentUnit].symbol})
        </h3>
        <button
          onClick={onClearAll}
          className="text-red-500 hover:text-red-700 text-sm font-medium px-3 py-1 rounded-md hover:bg-red-50 transition-colors"
          title="Limpiar todas las figuras"
        >
          <Trash2 size={16} className="inline mr-1" />
          Limpiar todo
        </button>
      </div>

      <div className="space-y-3 max-h-96 overflow-y-auto">
        {pieces.map((piece, index) => {
          const dimensions = getPieceDimensions(piece.points)

          return (
            <div key={index} className="border border-gray-200 rounded-lg p-4 hover:border-gray-300 transition-colors">
              {editingIndex === index ? (
                // Modo edición de texto
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
                    <input
                      type="text"
                      value={editForm.id}
                      onChange={(e) => setEditForm({ ...editForm, id: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                      placeholder="Nombre de la figura"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Cantidad</label>
                    <input
                      type="number"
                      min="1"
                      value={editForm.quantity}
                      onChange={(e) => setEditForm({ ...editForm, quantity: Number.parseInt(e.target.value) || 1 })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={saveEdit}
                      disabled={!editForm.id.trim()}
                      className="flex items-center px-3 py-1 bg-green-500 text-white rounded-md hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                    >
                      <Save size={14} className="mr-1" />
                      Guardar
                    </button>
                    <button
                      onClick={cancelEditing}
                      className="flex items-center px-3 py-1 bg-gray-500 text-white rounded-md hover:bg-gray-600 text-sm"
                    >
                      <X size={14} className="mr-1" />
                      Cancelar
                    </button>
                  </div>
                </div>
              ) : (
                // Modo vista
                <div className="flex items-center gap-3">
                  {/* Vista previa */}
                  <div className="flex-shrink-0">{generatePreview(piece.points)}</div>

                  {/* Información */}
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-gray-800 truncate">{piece.id}</h4>
                    <div className="text-sm text-gray-500 space-y-1">
                      <p>{piece.points.length} puntos</p>
                      <p>
                        <strong>Dimensiones:</strong> {dimensions.width.toFixed(2)} × {dimensions.height.toFixed(2)}{" "}
                        {UNITS[currentUnit].symbol}
                      </p>
                      <p>
                        <strong>Área:</strong> {dimensions.area.toFixed(2)} {UNITS[currentUnit].symbol}²
                      </p>
                      <p className="font-semibold text-blue-600">Cantidad: ×{piece.quantity}</p>
                    </div>
                  </div>

                  {/* Acciones */}
                  <div className="flex gap-1">
                    <button
                      onClick={() => handleEditShape(index)}
                      className="p-2 text-emerald-500 hover:text-emerald-700 hover:bg-emerald-50 rounded-md transition-colors"
                      title="Editar figura visualmente"
                    >
                      <Pencil size={16} />
                    </button>
                    <button
                      onClick={() => startEditing(index)}
                      className="p-2 text-blue-500 hover:text-blue-700 hover:bg-blue-50 rounded-md transition-colors"
                      title="Editar nombre y cantidad"
                    >
                      <Edit3 size={16} />
                    </button>
                    <button
                      onClick={() => duplicatePiece(index)}
                      className="p-2 text-green-500 hover:text-green-700 hover:bg-green-50 rounded-md transition-colors"
                      title="Duplicar figura"
                    >
                      📋
                    </button>
                    <button
                      onClick={() => deletePiece(index)}
                      className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-md transition-colors"
                      title="Eliminar figura"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Resumen mejorado */}
      <div className="mt-4 p-4 bg-blue-50 rounded-lg">
        <div className="text-sm text-blue-800 space-y-1">
          <div className="flex justify-between">
            <strong>Tipos de figuras:</strong>
            <span>{pieces.length}</span>
          </div>
          <div className="flex justify-between">
            <strong>Total de piezas:</strong>
            <span>{totalPieces}</span>
          </div>
          <div className="flex justify-between">
            <strong>Área total:</strong>
            <span>
              {totalArea.toFixed(2)} {UNITS[currentUnit].symbol}²
            </span>
          </div>
          <div className="text-xs text-blue-600 mt-2 pt-2 border-t border-blue-200">
            Todas las medidas están en {UNITS[currentUnit].label}
          </div>
        </div>
      </div>
    </div>
  )
}

export default PiecesList
