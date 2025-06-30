"use client"

import type React from "react"
import { useState, useRef } from "react"
import { X, Trash2, Undo, Check, RotateCw } from "lucide-react"

interface Point {
  x: number
  y: number
}

interface ShapeDesignerModalProps {
  isOpen: boolean
  onClose: () => void
  onSaveShape: (shape: { id: string; points: [number, number][]; quantity: number }) => void
}

const ShapeDesignerModal: React.FC<ShapeDesignerModalProps> = ({ isOpen, onClose, onSaveShape }) => {
  const [points, setPoints] = useState<Point[]>([])
  const [isDrawing, setIsDrawing] = useState(false)
  const [draggedPointIndex, setDraggedPointIndex] = useState<number | null>(null)
  const [shapeId, setShapeId] = useState("")
  const [quantity, setQuantity] = useState(1)
  const [canvasSize] = useState({ width: 500, height: 350 })
  const [gridSize] = useState(10)
  const [showGrid, setShowGrid] = useState(true)
  const [snapToGrid, setSnapToGrid] = useState(true)
  const svgRef = useRef<SVGSVGElement>(null)

  const snapPoint = (point: Point): Point => {
    if (!snapToGrid) return point
    return {
      x: Math.round(point.x / gridSize) * gridSize,
      y: Math.round(point.y / gridSize) * gridSize,
    }
  }

  const getSVGPoint = (event: React.MouseEvent<SVGSVGElement>): Point => {
    if (!svgRef.current) return { x: 0, y: 0 }

    const rect = svgRef.current.getBoundingClientRect()
    const point = {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    }

    return snapPoint(point)
  }

  const handleSVGClick = (event: React.MouseEvent<SVGSVGElement>) => {
    if (draggedPointIndex !== null) return

    const point = getSVGPoint(event)
    setPoints((prev) => [...prev, point])
  }

  const handlePointMouseDown = (event: React.MouseEvent, index: number) => {
    event.stopPropagation()
    setDraggedPointIndex(index)
  }

  const handleMouseMove = (event: React.MouseEvent<SVGSVGElement>) => {
    if (draggedPointIndex === null) return

    const point = getSVGPoint(event)
    setPoints((prev) => prev.map((p, i) => (i === draggedPointIndex ? point : p)))
  }

  const handleMouseUp = () => {
    setDraggedPointIndex(null)
  }

  const clearCanvas = () => {
    setPoints([])
  }

  const undoLastPoint = () => {
    setPoints((prev) => prev.slice(0, -1))
  }

  const closeShape = () => {
    if (points.length >= 3) {
      setIsDrawing(false)
    }
  }

  const saveShape = () => {
    if (points.length >= 3 && shapeId.trim()) {
      // Normalizar puntos para que empiecen desde (0,0)
      const minX = Math.min(...points.map((p) => p.x))
      const minY = Math.min(...points.map((p) => p.y))

      const normalizedPoints: [number, number][] = points.map((p) => [p.x - minX, p.y - minY])

      onSaveShape({
        id: shapeId.trim(),
        points: normalizedPoints,
        quantity: quantity,
      })

      // Reset form
      setPoints([])
      setShapeId("")
      setQuantity(1)
      onClose()
    }
  }

  const rotateShape = () => {
    if (points.length === 0) return

    // Encontrar el centro de la figura
    const centerX = points.reduce((sum, p) => sum + p.x, 0) / points.length
    const centerY = points.reduce((sum, p) => sum + p.y, 0) / points.length

    // Rotar 90 grados en sentido horario
    const rotatedPoints = points.map((p) => {
      const dx = p.x - centerX
      const dy = p.y - centerY
      return snapPoint({
        x: centerX - dy,
        y: centerY + dx,
      })
    })

    setPoints(rotatedPoints)
  }

  // Generar grid
  const generateGrid = () => {
    const lines = []

    // Líneas verticales
    for (let x = 0; x <= canvasSize.width; x += gridSize) {
      lines.push(<line key={`v-${x}`} x1={x} y1={0} x2={x} y2={canvasSize.height} stroke="#e5e7eb" strokeWidth="0.5" />)
    }

    // Líneas horizontales
    for (let y = 0; y <= canvasSize.height; y += gridSize) {
      lines.push(<line key={`h-${y}`} x1={0} y1={y} x2={canvasSize.width} y2={y} stroke="#e5e7eb" strokeWidth="0.5" />)
    }

    return lines
  }

  // Verificar si se puede guardar
  const canSave = points.length >= 3 && shapeId.trim().length > 0

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl max-h-[95vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-3 sm:p-4 border-b flex-shrink-0">
          <h2 className="text-lg sm:text-xl font-semibold">Diseñador de Figuras</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="flex flex-col lg:flex-row flex-1 overflow-hidden">
          {/* Canvas */}
          <div className="flex-1 p-3 sm:p-4 overflow-auto">
            <div
              className="border-2 border-gray-300 rounded-lg overflow-hidden bg-white mx-auto"
              style={{ width: "fit-content" }}
            >
              <svg
                ref={svgRef}
                width={canvasSize.width}
                height={canvasSize.height}
                className="cursor-crosshair block"
                onClick={handleSVGClick}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                viewBox={`0 0 ${canvasSize.width} ${canvasSize.height}`}
              >
                {/* Grid */}
                {showGrid && generateGrid()}

                {/* Figura en construcción */}
                {points.length > 0 && (
                  <>
                    {/* Líneas de la figura */}
                    {points.length > 1 && (
                      <polyline
                        points={points.map((p) => `${p.x},${p.y}`).join(" ")}
                        fill="none"
                        stroke="#3b82f6"
                        strokeWidth="2"
                        strokeDasharray="5,5"
                      />
                    )}

                    {/* Línea de cierre (si hay más de 2 puntos) */}
                    {points.length > 2 && (
                      <line
                        x1={points[points.length - 1].x}
                        y1={points[points.length - 1].y}
                        x2={points[0].x}
                        y2={points[0].y}
                        stroke="#3b82f6"
                        strokeWidth="2"
                        strokeDasharray="5,5"
                        opacity="0.5"
                      />
                    )}

                    {/* Figura completa (preview) */}
                    {points.length > 2 && (
                      <polygon
                        points={points.map((p) => `${p.x},${p.y}`).join(" ")}
                        fill="#3b82f6"
                        fillOpacity="0.2"
                        stroke="#3b82f6"
                        strokeWidth="2"
                      />
                    )}
                  </>
                )}

                {/* Puntos */}
                {points.map((point, index) => (
                  <circle
                    key={index}
                    cx={point.x}
                    cy={point.y}
                    r="6"
                    fill={index === 0 ? "#ef4444" : "#3b82f6"}
                    stroke="white"
                    strokeWidth="2"
                    className="cursor-move hover:r-8 transition-all"
                    onMouseDown={(e) => handlePointMouseDown(e, index)}
                  />
                ))}

                {/* Números de puntos */}
                {points.map((point, index) => (
                  <text
                    key={`label-${index}`}
                    x={point.x}
                    y={point.y - 12}
                    textAnchor="middle"
                    fontSize="12"
                    fill="#374151"
                    fontWeight="bold"
                    pointerEvents="none"
                  >
                    {index + 1}
                  </text>
                ))}
              </svg>
            </div>

            {/* Información */}
            <div className="mt-3 text-xs sm:text-sm text-gray-600 space-y-1">
              <p>• Haz clic para agregar puntos</p>
              <p>• Arrastra los puntos para moverlos</p>
              <p>• El punto rojo es el inicio de la figura</p>
              <p>
                • Puntos actuales: <span className="font-semibold text-blue-600">{points.length}</span>
              </p>
            </div>
          </div>

          {/* Panel de controles */}
          <div className="w-full lg:w-80 p-3 sm:p-4 border-t lg:border-t-0 lg:border-l bg-gray-50 overflow-auto">
            <div className="space-y-4">
              {/* Información de la figura */}
              <div className="bg-white p-4 rounded-lg">
                <h3 className="font-semibold mb-3">Información de la Figura</h3>
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Nombre de la figura *</label>
                    <input
                      type="text"
                      value={shapeId}
                      onChange={(e) => setShapeId(e.target.value)}
                      placeholder="ej: mi_figura_1"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    />
                    {shapeId.trim().length === 0 && (
                      <p className="text-xs text-red-500 mt-1">El nombre es obligatorio</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Cantidad</label>
                    <input
                      type="number"
                      min="1"
                      value={quantity}
                      onChange={(e) => setQuantity(Math.max(1, Number.parseInt(e.target.value) || 1))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    />
                  </div>
                </div>
              </div>

              {/* Controles de dibujo */}
              <div className="bg-white p-4 rounded-lg">
                <h3 className="font-semibold mb-3">Controles</h3>
                <div className="grid grid-cols-1 gap-2">
                  <button
                    onClick={undoLastPoint}
                    disabled={points.length === 0}
                    className="flex items-center justify-center px-3 py-2 bg-yellow-500 text-white rounded-md hover:bg-yellow-600 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                  >
                    <Undo className="mr-2" size={14} />
                    Deshacer último
                  </button>

                  <button
                    onClick={rotateShape}
                    disabled={points.length === 0}
                    className="flex items-center justify-center px-3 py-2 bg-purple-500 text-white rounded-md hover:bg-purple-600 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                  >
                    <RotateCw className="mr-2" size={14} />
                    Rotar 90°
                  </button>

                  <button
                    onClick={clearCanvas}
                    disabled={points.length === 0}
                    className="flex items-center justify-center px-3 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                  >
                    <Trash2 className="mr-2" size={14} />
                    Limpiar todo
                  </button>
                </div>
              </div>

              {/* Configuración */}
              <div className="bg-white p-4 rounded-lg">
                <h3 className="font-semibold mb-3">Configuración</h3>
                <div className="space-y-2">
                  <label className="flex items-center text-sm">
                    <input
                      type="checkbox"
                      checked={showGrid}
                      onChange={(e) => setShowGrid(e.target.checked)}
                      className="mr-2"
                    />
                    <span>Mostrar cuadrícula</span>
                  </label>

                  <label className="flex items-center text-sm">
                    <input
                      type="checkbox"
                      checked={snapToGrid}
                      onChange={(e) => setSnapToGrid(e.target.checked)}
                      className="mr-2"
                    />
                    <span>Ajustar a cuadrícula</span>
                  </label>
                </div>
              </div>

              {/* Estado de la figura */}
              <div className="bg-white p-4 rounded-lg">
                <h3 className="font-semibold mb-2">Estado</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Puntos:</span>
                    <span className={points.length >= 3 ? "text-green-600 font-semibold" : "text-gray-600"}>
                      {points.length} {points.length >= 3 ? "✓" : `(mín. 3)`}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Nombre:</span>
                    <span className={shapeId.trim() ? "text-green-600 font-semibold" : "text-red-500"}>
                      {shapeId.trim() ? "✓" : "Requerido"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Listo para guardar:</span>
                    <span className={canSave ? "text-green-600 font-semibold" : "text-gray-500"}>
                      {canSave ? "✓ Sí" : "✗ No"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Botón de guardar */}
              <button
                onClick={saveShape}
                disabled={!canSave}
                className="w-full flex items-center justify-center px-4 py-3 bg-green-500 text-white rounded-md hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed font-semibold transition-colors"
              >
                <Check className="mr-2" size={16} />
                Guardar Figura
              </button>

              {!canSave && (
                <div className="text-xs text-center space-y-1">
                  {points.length < 3 && <p className="text-red-500">• Necesitas al menos 3 puntos</p>}
                  {!shapeId.trim() && <p className="text-red-500">• Debes escribir un nombre</p>}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ShapeDesignerModal
