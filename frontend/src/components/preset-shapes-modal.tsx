"use client"

import type React from "react"
import { useState } from "react"
import { X, Search, Plus, Check, Shirt, Square, Package, Wrench } from "lucide-react"

// Unidades de medida
const UNITS = {
  mm: { label: "Milímetros", factor: 1, symbol: "mm" },
  cm: { label: "Centímetros", factor: 10, symbol: "cm" },
  m: { label: "Metros", factor: 1000, symbol: "m" },
  in: { label: "Pulgadas", factor: 25.4, symbol: "in" },
} as const

type UnitType = keyof typeof UNITS

interface PresetShape {
  id: string
  name: string
  category: string
  description: string
  points: [number, number][]
  defaultQuantity: number
  typicalSize: { width: number; height: number; unit: UnitType }
}

// Biblioteca de figuras predeterminadas
const PRESET_SHAPES: PresetShape[] = [
  // Categoría: Ropa
  {
    id: "tshirt",
    name: "Polera/Camiseta",
    category: "ropa",
    description: "Camiseta básica con mangas cortas",
    points: [
      [0, 20],
      [15, 20],
      [15, 0],
      [25, 0],
      [25, 20],
      [40, 20],
      [40, 60],
      [30, 60],
      [30, 80],
      [10, 80],
      [10, 60],
      [0, 60],
    ],
    defaultQuantity: 2,
    typicalSize: { width: 40, height: 80, unit: "cm" },
  },
  {
    id: "pants",
    name: "Pantalón",
    category: "ropa",
    description: "Pantalón largo básico",
    points: [
      [0, 0],
      [20, 0],
      [20, 40],
      [25, 40],
      [25, 100],
      [15, 100],
      [15, 60],
      [5, 60],
      [5, 100],
      [-5, 100],
      [-5, 40],
      [0, 40],
    ],
    defaultQuantity: 1,
    typicalSize: { width: 30, height: 100, unit: "cm" },
  },
  {
    id: "skirt",
    name: "Falda",
    category: "ropa",
    description: "Falda básica",
    points: [
      [0, 0],
      [30, 0],
      [35, 40],
      [-5, 40],
    ],
    defaultQuantity: 2,
    typicalSize: { width: 40, height: 40, unit: "cm" },
  },
  {
    id: "dress",
    name: "Vestido",
    category: "ropa",
    description: "Vestido básico",
    points: [
      [0, 15],
      [10, 15],
      [10, 0],
      [20, 0],
      [20, 15],
      [30, 15],
      [30, 30],
      [35, 30],
      [35, 80],
      [-5, 80],
      [-5, 30],
      [0, 30],
    ],
    defaultQuantity: 1,
    typicalSize: { width: 40, height: 80, unit: "cm" },
  },
  {
    id: "jacket",
    name: "Chaqueta",
    category: "ropa",
    description: "Chaqueta con solapas",
    points: [
      [0, 25],
      [15, 25],
      [15, 0],
      [25, 0],
      [25, 25],
      [40, 25],
      [40, 70],
      [35, 70],
      [30, 75],
      [10, 75],
      [5, 70],
      [0, 70],
    ],
    defaultQuantity: 1,
    typicalSize: { width: 45, height: 75, unit: "cm" },
  },

  // Categoría: Formas Básicas
  {
    id: "rectangle",
    name: "Rectángulo",
    category: "basicas",
    description: "Rectángulo simple",
    points: [
      [0, 0],
      [50, 0],
      [50, 30],
      [0, 30],
    ],
    defaultQuantity: 3,
    typicalSize: { width: 50, height: 30, unit: "mm" },
  },
  {
    id: "square",
    name: "Cuadrado",
    category: "basicas",
    description: "Cuadrado perfecto",
    points: [
      [0, 0],
      [25, 0],
      [25, 25],
      [0, 25],
    ],
    defaultQuantity: 4,
    typicalSize: { width: 25, height: 25, unit: "mm" },
  },
  {
    id: "triangle",
    name: "Triángulo",
    category: "basicas",
    description: "Triángulo equilátero",
    points: [
      [0, 0],
      [40, 0],
      [20, 35],
    ],
    defaultQuantity: 3,
    typicalSize: { width: 40, height: 35, unit: "mm" },
  },
  {
    id: "circle",
    name: "Círculo",
    category: "basicas",
    description: "Círculo (octágono)",
    points: [
      [15, 0],
      [25, 0],
      [35, 10],
      [35, 20],
      [25, 30],
      [15, 30],
      [5, 20],
      [5, 10],
    ],
    defaultQuantity: 2,
    typicalSize: { width: 40, height: 30, unit: "mm" },
  },
  {
    id: "l_shape",
    name: "Forma L",
    category: "basicas",
    description: "Forma en L clásica",
    points: [
      [0, 0],
      [60, 0],
      [60, 20],
      [20, 20],
      [20, 50],
      [0, 50],
    ],
    defaultQuantity: 2,
    typicalSize: { width: 60, height: 50, unit: "mm" },
  },
  {
    id: "t_shape",
    name: "Forma T",
    category: "basicas",
    description: "Forma en T",
    points: [
      [0, 0],
      [60, 0],
      [60, 15],
      [35, 15],
      [35, 50],
      [25, 50],
      [25, 15],
      [0, 15],
    ],
    defaultQuantity: 2,
    typicalSize: { width: 60, height: 50, unit: "mm" },
  },

  // Categoría: Objetos Comunes
  {
    id: "envelope",
    name: "Sobre",
    category: "objetos",
    description: "Sobre estándar",
    points: [
      [0, 0],
      [110, 0],
      [110, 220],
      [0, 220],
    ],
    defaultQuantity: 5,
    typicalSize: { width: 11, height: 22, unit: "cm" },
  },
  {
    id: "business_card",
    name: "Tarjeta de Visita",
    category: "objetos",
    description: "Tarjeta de presentación estándar",
    points: [
      [0, 0],
      [85, 0],
      [85, 55],
      [0, 55],
    ],
    defaultQuantity: 10,
    typicalSize: { width: 85, height: 55, unit: "mm" },
  },
  {
    id: "label",
    name: "Etiqueta",
    category: "objetos",
    description: "Etiqueta rectangular con esquinas redondeadas",
    points: [
      [5, 0],
      [45, 0],
      [50, 5],
      [50, 15],
      [45, 20],
      [5, 20],
      [0, 15],
      [0, 5],
    ],
    defaultQuantity: 8,
    typicalSize: { width: 50, height: 20, unit: "mm" },
  },
  {
    id: "box_template",
    name: "Caja Desplegada",
    category: "objetos",
    description: "Plantilla de caja para armar",
    points: [
      [0, 30],
      [30, 30],
      [30, 0],
      [60, 0],
      [60, 30],
      [90, 30],
      [90, 60],
      [60, 60],
      [60, 90],
      [30, 90],
      [30, 60],
      [0, 60],
    ],
    defaultQuantity: 1,
    typicalSize: { width: 90, height: 90, unit: "mm" },
  },

  // Categoría: Formas Industriales
  {
    id: "hexagon",
    name: "Hexágono",
    category: "industrial",
    description: "Hexágono regular",
    points: [
      [15, 0],
      [35, 0],
      [45, 17],
      [35, 35],
      [15, 35],
      [5, 17],
    ],
    defaultQuantity: 3,
    typicalSize: { width: 50, height: 35, unit: "mm" },
  },
  {
    id: "trapezoid",
    name: "Trapecio",
    category: "industrial",
    description: "Trapecio isósceles",
    points: [
      [10, 0],
      [40, 0],
      [50, 30],
      [0, 30],
    ],
    defaultQuantity: 2,
    typicalSize: { width: 50, height: 30, unit: "mm" },
  },
  {
    id: "parallelogram",
    name: "Paralelogramo",
    category: "industrial",
    description: "Paralelogramo",
    points: [
      [0, 0],
      [40, 0],
      [50, 25],
      [10, 25],
    ],
    defaultQuantity: 2,
    typicalSize: { width: 50, height: 25, unit: "mm" },
  },
  {
    id: "gear_tooth",
    name: "Diente de Engranaje",
    category: "industrial",
    description: "Perfil de diente de engranaje",
    points: [
      [0, 0],
      [8, 0],
      [10, 5],
      [12, 5],
      [15, 10],
      [15, 20],
      [12, 25],
      [10, 25],
      [8, 30],
      [0, 30],
    ],
    defaultQuantity: 8,
    typicalSize: { width: 15, height: 30, unit: "mm" },
  },
]

const CATEGORIES = {
  ropa: { name: "Ropa", icon: Shirt, color: "bg-pink-100 text-pink-800" },
  basicas: { name: "Formas Básicas", icon: Square, color: "bg-blue-100 text-blue-800" },
  objetos: { name: "Objetos Comunes", icon: Package, color: "bg-green-100 text-green-800" },
  industrial: { name: "Industrial", icon: Wrench, color: "bg-orange-100 text-orange-800" },
}

interface PresetShapesModalProps {
  isOpen: boolean
  onClose: () => void
  onAddShapes: (shapes: Array<{ id: string; points: [number, number][]; quantity: number }>) => void
  globalUnit: UnitType
}

const PresetShapesModal: React.FC<PresetShapesModalProps> = ({ isOpen, onClose, onAddShapes, globalUnit }) => {
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedCategory, setSelectedCategory] = useState<string>("all")
  const [selectedShapes, setSelectedShapes] = useState<Record<string, number>>({})

  // Convertir dimensiones según la unidad global
  const convertDimension = (value: number, fromUnit: UnitType, toUnit: UnitType = globalUnit) => {
    const mmValue = value * UNITS[fromUnit].factor
    return mmValue / UNITS[toUnit].factor
  }

  // Escalar puntos de la figura según la unidad global
  const scaleShapePoints = (points: [number, number][], shape: PresetShape): [number, number][] => {
    const scale = UNITS[shape.typicalSize.unit].factor / UNITS[globalUnit].factor
    return points.map(([x, y]) => [x * scale, y * scale])
  }

  // Filtrar figuras según búsqueda y categoría
  const filteredShapes = PRESET_SHAPES.filter((shape) => {
    const matchesSearch =
      shape.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      shape.description.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCategory = selectedCategory === "all" || shape.category === selectedCategory
    return matchesSearch && matchesCategory
  })

  // Generar vista previa de la figura
  const generatePreview = (shape: PresetShape) => {
    const points = shape.points
    if (points.length === 0) return null

    const minX = Math.min(...points.map(([x]) => x))
    const maxX = Math.max(...points.map(([x]) => x))
    const minY = Math.min(...points.map(([, y]) => y))
    const maxY = Math.max(...points.map(([, y]) => y))

    const width = maxX - minX || 1
    const height = maxY - minY || 1
    const scale = Math.min(60 / width, 60 / height)

    const scaledPoints = points.map(([x, y]) => [(x - minX) * scale + 5, (y - minY) * scale + 5])

    return (
      <svg width="70" height="70" className="border rounded bg-gray-50">
        <polygon
          points={scaledPoints.map(([x, y]) => `${x},${y}`).join(" ")}
          fill="#3b82f6"
          fillOpacity="0.3"
          stroke="#3b82f6"
          strokeWidth="1.5"
        />
      </svg>
    )
  }

  const handleShapeToggle = (shapeId: string, defaultQuantity: number) => {
    setSelectedShapes((prev) => {
      const newSelected = { ...prev }
      if (newSelected[shapeId]) {
        delete newSelected[shapeId]
      } else {
        newSelected[shapeId] = defaultQuantity
      }
      return newSelected
    })
  }

  const handleQuantityChange = (shapeId: string, quantity: number) => {
    if (quantity > 0) {
      setSelectedShapes((prev) => ({
        ...prev,
        [shapeId]: quantity,
      }))
    }
  }

  const handleAddSelected = () => {
    const shapesToAdd = Object.entries(selectedShapes).map(([shapeId, quantity]) => {
      const shape = PRESET_SHAPES.find((s) => s.id === shapeId)!
      return {
        id: shape.name.toLowerCase().replace(/\s+/g, "_"),
        points: scaleShapePoints(shape.points, shape),
        quantity,
      }
    })

    onAddShapes(shapesToAdd)
    setSelectedShapes({})
    onClose()
  }

  const selectedCount = Object.keys(selectedShapes).length
  const totalPieces = Object.values(selectedShapes).reduce((sum, qty) => sum + qty, 0)

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div>
            <h2 className="text-xl font-semibold">Biblioteca de Figuras Predeterminadas</h2>
            <p className="text-sm text-gray-600">
              Selecciona figuras comunes para agregar a tu proyecto (unidad: {UNITS[globalUnit].symbol})
            </p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Controles */}
        <div className="p-4 border-b bg-gray-50">
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Búsqueda */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
              <input
                type="text"
                placeholder="Buscar figuras..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Filtro por categoría */}
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">Todas las categorías</option>
              {Object.entries(CATEGORIES).map(([key, category]) => (
                <option key={key} value={key}>
                  {category.name}
                </option>
              ))}
            </select>
          </div>

          {/* Contador de seleccionados */}
          {selectedCount > 0 && (
            <div className="mt-3 p-3 bg-blue-50 rounded-md">
              <p className="text-sm text-blue-800">
                <strong>{selectedCount}</strong> tipos de figuras seleccionadas,
                <strong> {totalPieces}</strong> piezas en total
              </p>
            </div>
          )}
        </div>

        {/* Grid de figuras */}
        <div className="flex-1 overflow-auto p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredShapes.map((shape) => {
              const isSelected = selectedShapes[shape.id] !== undefined
              const category = CATEGORIES[shape.category as keyof typeof CATEGORIES]
              const Icon = category.icon

              // Calcular dimensiones en la unidad global
              const width = convertDimension(shape.typicalSize.width, shape.typicalSize.unit)
              const height = convertDimension(shape.typicalSize.height, shape.typicalSize.unit)

              return (
                <div
                  key={shape.id}
                  className={`border-2 rounded-lg p-4 cursor-pointer transition-all hover:shadow-md ${
                    isSelected ? "border-blue-500 bg-blue-50" : "border-gray-200 hover:border-gray-300"
                  }`}
                  onClick={() => handleShapeToggle(shape.id, shape.defaultQuantity)}
                >
                  {/* Vista previa */}
                  <div className="flex justify-center mb-3">{generatePreview(shape)}</div>

                  {/* Información */}
                  <div className="text-center">
                    <h3 className="font-semibold text-gray-800 mb-1">{shape.name}</h3>
                    <p className="text-xs text-gray-600 mb-2">{shape.description}</p>

                    {/* Categoría */}
                    <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs mb-2 ${category.color}`}>
                      <Icon size={12} className="mr-1" />
                      {category.name}
                    </div>

                    {/* Dimensiones */}
                    <p className="text-xs text-gray-500 mb-2">
                      {width.toFixed(1)} × {height.toFixed(1)} {UNITS[globalUnit].symbol}
                    </p>

                    {/* Control de cantidad */}
                    {isSelected && (
                      <div className="mt-3 p-2 bg-white rounded border">
                        <label className="block text-xs font-medium text-gray-700 mb-1">Cantidad:</label>
                        <input
                          type="number"
                          min="1"
                          value={selectedShapes[shape.id]}
                          onChange={(e) => {
                            e.stopPropagation()
                            handleQuantityChange(shape.id, Number.parseInt(e.target.value) || 1)
                          }}
                          onClick={(e) => e.stopPropagation()}
                          className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                      </div>
                    )}

                    {/* Indicador de selección */}
                    <div className="mt-2">
                      {isSelected ? (
                        <div className="flex items-center justify-center text-blue-600">
                          <Check size={16} className="mr-1" />
                          <span className="text-sm font-medium">Seleccionada</span>
                        </div>
                      ) : (
                        <div className="flex items-center justify-center text-gray-400">
                          <Plus size={16} className="mr-1" />
                          <span className="text-sm">Agregar</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {filteredShapes.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              <div className="text-4xl mb-4">🔍</div>
              <p>No se encontraron figuras que coincidan con tu búsqueda</p>
              <p className="text-sm mt-1">Intenta con otros términos o cambia la categoría</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t bg-gray-50">
          <div className="flex justify-between items-center">
            <div className="text-sm text-gray-600">
              {filteredShapes.length} figuras disponibles
              {selectedCount > 0 && ` • ${selectedCount} seleccionadas`}
            </div>
            <div className="flex gap-2">
              <button
                onClick={onClose}
                className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-100 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleAddSelected}
                disabled={selectedCount === 0}
                className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Agregar {selectedCount > 0 ? `${selectedCount} figuras` : "Seleccionadas"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default PresetShapesModal
