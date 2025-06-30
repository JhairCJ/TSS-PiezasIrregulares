"use client"

import type React from "react"
import { useRef, useState } from "react"
import { Upload, Settings, Ruler, AlertTriangle, PlusCircle } from "lucide-react"
import { algorithmOptions } from "./algorithm-options"
import ShapeDesignerModal from "./shape-designer-modal"
import PresetShapesModal from "./preset-shapes-modal"
import PiecesList from "./pieces-list"

// Unidades de medida y sus factores de conversión (todo a milímetros como base)
const UNITS = {
  mm: { label: "Milímetros", factor: 1, symbol: "mm" },
  cm: { label: "Centímetros", factor: 10, symbol: "cm" },
  m: { label: "Metros", factor: 1000, symbol: "m" },
  in: { label: "Pulgadas", factor: 25.4, symbol: "in" },
} as const

type UnitType = keyof typeof UNITS

interface InputData {
  pieces: Array<{
    id: string
    points: [number, number][]
    quantity: number
  }>
  bin_width: number
  bin_height: number
  allow_rotation: boolean
  rotation_angles: number[]
  margin: number
  strategy: string
  // Nuevos campos para unidades
  unit: UnitType
  bin_width_real: number
  bin_height_real: number
}

interface ConfigurationPanelProps {
  inputData: InputData
  updateInputField: (field: string, value: any) => void
  onFileUpload: (event: React.ChangeEvent<HTMLInputElement>) => void
  onSubmit: () => void
  onDownloadResults: () => void
  loading: boolean
  hasResults: boolean
}

const ConfigurationPanel: React.FC<ConfigurationPanelProps> = ({
  inputData,
  updateInputField,
  onFileUpload,
  onSubmit,
  onDownloadResults,
  loading,
  hasResults,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const shapesInputRef = useRef<HTMLInputElement>(null)
  const [showShapeDesigner, setShowShapeDesigner] = useState(false)
  const [isPresetShapesOpen, setIsPresetShapesOpen] = useState(false)
  const [editingShape, setEditingShape] = useState<{
    id: string
    points: [number, number][]
    quantity: number
    index: number
  } | null>(null)
  const selectedAlgorithm = algorithmOptions.find((alg) => alg.value === inputData.strategy)

  // Convertir dimensiones según la unidad seleccionada
  const convertDimension = (value: number, fromUnit: UnitType = "mm", toUnit: UnitType = inputData.unit || "mm") => {
    const mmValue = value * UNITS[fromUnit].factor
    return mmValue / UNITS[toUnit].factor
  }

  // Convertir de unidades reales a píxeles para el algoritmo (asumiendo 1mm = 1px)
  const realToPixels = (realValue: number, unit: UnitType = inputData.unit || "mm") => {
    return realValue * UNITS[unit].factor
  }

  // Actualizar dimensiones del bin cuando cambia la unidad
  const handleUnitChange = (newUnit: UnitType) => {
    const oldUnit = inputData.unit || "mm"

    // Convertir las dimensiones reales a la nueva unidad
    const newWidthReal = convertDimension(inputData.bin_width_real || 200, oldUnit, newUnit)
    const newHeightReal = convertDimension(inputData.bin_height_real || 150, oldUnit, newUnit)

    updateInputField("unit", newUnit)
    updateInputField("bin_width_real", newWidthReal)
    updateInputField("bin_height_real", newHeightReal)

    // Actualizar las dimensiones en píxeles para el algoritmo
    updateInputField("bin_width", realToPixels(newWidthReal, newUnit))
    updateInputField("bin_height", realToPixels(newHeightReal, newUnit))
  }

  const handleBinWidthChange = (value: string) => {
    const numValue = Number.parseFloat(value)
    if (!isNaN(numValue) && numValue > 0) {
      updateInputField("bin_width_real", numValue)
      updateInputField("bin_width", realToPixels(numValue, inputData.unit))
    }
  }

  const handleBinHeightChange = (value: string) => {
    const numValue = Number.parseFloat(value)
    if (!isNaN(numValue) && numValue > 0) {
      updateInputField("bin_height_real", numValue)
      updateInputField("bin_height", realToPixels(numValue, inputData.unit))
    }
  }

  // Verificar si alguna pieza es más grande que el contenedor
  const checkPieceFit = () => {
    const warnings = []
    const binWidth = inputData.bin_width_real || 200
    const binHeight = inputData.bin_height_real || 150
    const unit = inputData.unit || "mm"

    inputData.pieces.forEach((piece) => {
      // Calcular dimensiones de la pieza
      const minX = Math.min(...piece.points.map(([x]) => x))
      const maxX = Math.max(...piece.points.map(([x]) => x))
      const minY = Math.min(...piece.points.map(([, y]) => y))
      const maxY = Math.max(...piece.points.map(([, y]) => y))

      const pieceWidth = convertDimension(maxX - minX, "mm", unit)
      const pieceHeight = convertDimension(maxY - minY, "mm", unit)

      if (pieceWidth > binWidth || pieceHeight > binHeight) {
        warnings.push({
          piece: piece.id,
          pieceWidth: pieceWidth.toFixed(2),
          pieceHeight: pieceHeight.toFixed(2),
          issue: pieceWidth > binWidth ? "ancho" : "alto",
        })
      }
    })

    return warnings
  }

  const handleSaveShape = (shape: {
    id: string
    points: [number, number][]
    quantity: number
    editIndex?: number
  }) => {
    if (typeof shape.editIndex === "number") {
      // Modo edición - reemplazar la figura existente
      const updatedPieces = inputData.pieces.map((piece, index) =>
        index === shape.editIndex ? { id: shape.id, points: shape.points, quantity: shape.quantity } : piece,
      )
      updateInputField("pieces", updatedPieces)
    } else {
      // Modo creación - agregar nueva figura
      const newPiece = {
        id: shape.id,
        points: shape.points,
        quantity: shape.quantity,
      }
      updateInputField("pieces", [...inputData.pieces, newPiece])
    }

    // Limpiar estado de edición
    setEditingShape(null)
  }

  const handleEditShape = (piece: { id: string; points: [number, number][]; quantity: number }, index: number) => {
    setEditingShape({
      ...piece,
      index,
    })
    setShowShapeDesigner(true)
  }

  const handleCloseDesigner = () => {
    setShowShapeDesigner(false)
    setEditingShape(null)
  }

  const handleOpenPresetShapes = () => {
    setIsPresetShapesOpen(true)
  }

  const handleClosePresetShapes = () => {
    setIsPresetShapesOpen(false)
  }

  const exportShapes = () => {
    const shapesData = {
      shapes: inputData.pieces,
      unit: inputData.unit,
      exported_at: new Date().toISOString(),
      total_shapes: inputData.pieces.length,
      version: "1.1",
    }

    const dataStr = JSON.stringify(shapesData, null, 2)
    const dataUri = "data:application/json;charset=utf-8," + encodeURIComponent(dataStr)
    const exportFileDefaultName = `figuras_${new Date().toISOString().split("T")[0]}.json`

    const linkElement = document.createElement("a")
    linkElement.setAttribute("href", dataUri)
    linkElement.setAttribute("download", exportFileDefaultName)
    linkElement.click()
  }

  const exportConfiguration = () => {
    const configData = {
      ...inputData,
      exported_at: new Date().toISOString(),
      version: "1.1",
    }

    const dataStr = JSON.stringify(configData, null, 2)
    const dataUri = "data:application/json;charset=utf-8," + encodeURIComponent(dataStr)
    const exportFileDefaultName = `configuracion_${new Date().toISOString().split("T")[0]}.json`

    const linkElement = document.createElement("a")
    linkElement.setAttribute("href", dataUri)
    linkElement.setAttribute("download", exportFileDefaultName)
    linkElement.click()
  }

  const importShapes = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (e) => {
        try {
          const data = JSON.parse(e.target?.result as string)

          // Check if it's a shapes-only file or complete configuration
          if (data.shapes && Array.isArray(data.shapes)) {
            // It's a shapes-only export
            updateInputField("pieces", data.shapes)
            if (data.unit) {
              handleUnitChange(data.unit)
            }
          } else if (data.pieces && Array.isArray(data.pieces)) {
            // It's a complete configuration file
            Object.keys(data).forEach((key) => {
              if (key !== "exported_at" && key !== "version") {
                updateInputField(key, data[key])
              }
            })
          } else {
            throw new Error("Formato de archivo no válido")
          }
        } catch (err) {
          alert("Error al importar: " + (err instanceof Error ? err.message : "Formato inválido"))
        }
      }
      reader.readAsText(file)
    }
    // Reset the input value so the same file can be selected again
    event.target.value = ""
  }

  const clearAllShapes = () => {
    if (confirm("¿Estás seguro de que quieres eliminar todas las figuras?")) {
      updateInputField("pieces", [])
    }
  }

  const handleUpdatePieces = (pieces: typeof inputData.pieces) => {
    updateInputField("pieces", pieces)
  }

  const warnings = checkPieceFit()
  const currentUnit = inputData.unit || "mm"
  const binWidthReal = inputData.bin_width_real || 200
  const binHeightReal = inputData.bin_height_real || 150

  const handleAddPresetShapes = (shapes: Array<{ id: string; points: [number, number][]; quantity: number }>) => {
    const updatedPieces = [...inputData.pieces, ...shapes]
    updateInputField("pieces", updatedPieces)
  }

  return (
    <div className="space-y-6">
      {/* Panel de configuración principal */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h2 className="text-xl font-semibold mb-4 flex items-center">
          <Settings className="mr-2" size={20} />
          Configuración
        </h2>

        {/* Controles de archivo */}
        <div className="mb-4 space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={exportShapes}
              disabled={inputData.pieces.length === 0}
              className="flex items-center justify-center px-3 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
            >
              <span className="mr-1">📤</span>
              Exportar Figuras
            </button>
            <button
              onClick={() => shapesInputRef.current?.click()}
              className="flex items-center justify-center px-3 py-2 bg-cyan-500 text-white rounded-lg hover:bg-cyan-600 transition-colors text-sm"
            >
              <span className="mr-1">📥</span>
              Importar Figuras
            </button>
            <button
              onClick={handleOpenPresetShapes}
              className="flex items-center justify-center px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 transition-colors"
            >
              <PlusCircle className="mr-2" size={16} />
              Agregar Figuras Predeterminadas
            </button>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center justify-center px-3 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm"
            >
              <Upload className="mr-1" size={14} />
              Cargar Configuración
            </button>
            <button
              onClick={exportConfiguration}
              className="flex items-center justify-center px-3 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors text-sm"
            >
              <span className="mr-1">💾</span>
              Exportar Configuración
            </button>
            <button
              onClick={() => {
                setEditingShape(null)
                setShowShapeDesigner(true)
              }}
              className="flex items-center justify-center px-3 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition-colors text-sm"
            >
              <span className="mr-1">✏️</span>
              Diseñar Figura
            </button>
          </div>

          <input ref={fileInputRef} type="file" accept=".json" onChange={onFileUpload} className="hidden" />
          <input ref={shapesInputRef} type="file" accept=".json" onChange={importShapes} className="hidden" />
        </div>

        {/* Unidad de medida global */}
        <div className="mb-6 p-4 bg-blue-50 rounded-lg">
          <h3 className="font-semibold mb-3 flex items-center text-blue-800">
            <Ruler className="mr-2" size={16} />
            Unidad de Medida Global
          </h3>
          <select
            value={currentUnit}
            onChange={(e) => handleUnitChange(e.target.value as UnitType)}
            className="w-full px-3 py-2 border border-blue-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          >
            {Object.entries(UNITS).map(([key, unit]) => (
              <option key={key} value={key}>
                {unit.label} ({unit.symbol})
              </option>
            ))}
          </select>
          <p className="text-sm text-blue-600 mt-2">
            Esta unidad se aplicará tanto al contenedor como a todas las figuras
          </p>
        </div>

        {/* Configuración del contenedor */}
        <div className="mb-6 p-4 bg-gray-50 rounded-lg">
          <h3 className="font-semibold mb-3">Dimensiones del Contenedor</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Ancho ({UNITS[currentUnit].symbol})
              </label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                value={binWidthReal}
                onChange={(e) => handleBinWidthChange(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Alto ({UNITS[currentUnit].symbol})</label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                value={binHeightReal}
                onChange={(e) => handleBinHeightChange(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Información del contenedor */}
          <div className="mt-3 p-3 bg-white rounded-md border">
            <div className="text-sm text-gray-600">
              <p>
                <strong>Dimensiones:</strong> {binWidthReal} × {binHeightReal} {UNITS[currentUnit].symbol}
              </p>
              <p>
                <strong>Área:</strong> {(binWidthReal * binHeightReal).toFixed(2)} {UNITS[currentUnit].symbol}²
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Píxeles internos: {inputData.bin_width} × {inputData.bin_height}
              </p>
            </div>
          </div>
        </div>

        {/* Advertencias de tamaño */}
        {warnings.length > 0 && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <h3 className="font-semibold mb-2 flex items-center text-red-800">
              <AlertTriangle className="mr-2" size={16} />
              Advertencias de Tamaño
            </h3>
            <div className="space-y-2">
              {warnings.map((warning, index) => (
                <div key={index} className="text-sm text-red-700 bg-red-100 p-2 rounded">
                  <strong>{warning.piece}</strong>: La pieza ({warning.pieceWidth} × {warning.pieceHeight}{" "}
                  {UNITS[currentUnit].symbol}) es más grande que el contenedor en {warning.issue}
                </div>
              ))}
            </div>
            <p className="text-xs text-red-600 mt-2">
              Estas piezas podrían no caber en el contenedor. Considera redimensionar las piezas o aumentar el tamaño
              del contenedor.
            </p>
          </div>
        )}

        {/* Selector de algoritmo */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">Algoritmo de Optimización</label>
          <select
            value={inputData.strategy}
            onChange={(e) => updateInputField("strategy", e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {algorithmOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label} {option.description}
              </option>
            ))}
          </select>

          {/* Información del algoritmo seleccionado */}
          {selectedAlgorithm && (
            <div className="mt-2 p-3 bg-gray-50 rounded-md">
              <div className="text-sm font-medium text-gray-700 mb-1">{selectedAlgorithm.label}</div>
              <div className="flex justify-between text-xs text-gray-600">
                <span>Velocidad: {selectedAlgorithm.speed}</span>
                <span>Precisión: {selectedAlgorithm.precision}</span>
              </div>
            </div>
          )}
        </div>

        {/* Configuración adicional */}
        <div className="space-y-4">
          <div className="flex items-center">
            <input
              type="checkbox"
              id="allow_rotation"
              checked={inputData.allow_rotation}
              onChange={(e) => updateInputField("allow_rotation", e.target.checked)}
              className="mr-2"
            />
            <label htmlFor="allow_rotation" className="text-sm font-medium text-gray-700">
              Permitir rotación de piezas
            </label>
          </div>

          {/* Selector de ángulos de rotación */}
          {inputData.allow_rotation && (
            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <h4 className="font-semibold mb-3 text-yellow-800 flex items-center">
                🔄 Ángulos de Rotación Permitidos
              </h4>

              {/* Grid de ángulos */}
              <div className="grid grid-cols-4 gap-2 mb-3">
                {[0, 45, 90, 135, 180, 225, 270, 315].map((angle) => {
                  const isSelected = inputData.rotation_angles.includes(angle)
                  return (
                    <button
                      key={angle}
                      type="button"
                      onClick={() => {
                        const currentAngles = [...inputData.rotation_angles]
                        if (isSelected) {
                          // Remover ángulo
                          const newAngles = currentAngles.filter((a) => a !== angle)
                          updateInputField(
                            "rotation_angles",
                            newAngles.sort((a, b) => a - b),
                          )
                        } else {
                          // Agregar ángulo
                          const newAngles = [...currentAngles, angle].sort((a, b) => a - b)
                          updateInputField("rotation_angles", newAngles)
                        }
                      }}
                      className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                        isSelected
                          ? "bg-blue-500 text-white border-2 border-blue-600"
                          : "bg-white text-gray-700 border-2 border-gray-300 hover:border-blue-300 hover:bg-blue-50"
                      }`}
                    >
                      {angle}°
                    </button>
                  )
                })}
              </div>

              {/* Botones de acción rápida */}
              <div className="flex gap-2 mb-3">
                <button
                  type="button"
                  onClick={() => updateInputField("rotation_angles", [0, 90, 180, 270])}
                  className="px-3 py-1 bg-gray-500 text-white rounded-md hover:bg-gray-600 text-xs"
                >
                  Por Defecto
                </button>
                <button
                  type="button"
                  onClick={() => updateInputField("rotation_angles", [0, 45, 90, 135, 180, 225, 270, 315])}
                  className="px-3 py-1 bg-green-500 text-white rounded-md hover:bg-green-600 text-xs"
                >
                  Todos
                </button>
              </div>

              {/* Información */}
              <div className="text-sm text-yellow-700">
                <p className="mb-1">
                  <strong>Seleccionados:</strong> {inputData.rotation_angles.length} ángulos
                  {inputData.rotation_angles.length > 0 && (
                    <span className="ml-2">({inputData.rotation_angles.sort((a, b) => a - b).join(", ")}°)</span>
                  )}
                </p>
                {inputData.rotation_angles.length === 0 && (
                  <p className="text-red-600 text-xs mt-1">
                    ⚠️ Sin ángulos seleccionados, las piezas solo podrán usar su orientación original
                  </p>
                )}
                <p className="text-xs text-yellow-600 mt-1">
                  Más ángulos = mayor flexibilidad pero mayor tiempo de procesamiento
                </p>
              </div>
            </div>
          )}

          {/* Margen entre piezas */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Margen entre piezas ({UNITS[currentUnit].symbol})
            </label>
            <input
              type="number"
              step="0.1"
              min="0"
              value={convertDimension(inputData.margin || 0, "mm", currentUnit)}
              onChange={(e) => {
                const realValue = Number.parseFloat(e.target.value) || 0
                const pixelValue = realToPixels(realValue, currentUnit)
                updateInputField("margin", pixelValue)
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Botones de acción */}
        <div className="mt-6 space-y-2">
          <button
            onClick={onSubmit}
            disabled={loading || inputData.pieces.length === 0}
            className="w-full flex items-center justify-center px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors disabled:opacity-50"
          >
            {loading ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
            ) : (
              <span className="mr-2">▶</span>
            )}
            {loading ? "Procesando..." : "Optimizar"}
          </button>

          {hasResults && (
            <button
              onClick={onDownloadResults}
              className="w-full flex items-center justify-center px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors"
            >
              <span className="mr-2">⬇</span>
              Descargar Resultados
            </button>
          )}
        </div>
      </div>

      {/* Lista de piezas separada */}
      <PiecesList
        pieces={inputData.pieces}
        onUpdatePieces={handleUpdatePieces}
        onClearAll={clearAllShapes}
        onEditShape={handleEditShape}
        currentUnit={currentUnit}
      />

      <ShapeDesignerModal
        isOpen={showShapeDesigner}
        onClose={handleCloseDesigner}
        onSaveShape={handleSaveShape}
        editingShape={editingShape}
        globalUnit={currentUnit}
      />

      <PresetShapesModal
        isOpen={isPresetShapesOpen}
        onClose={handleClosePresetShapes}
        onAddShapes={handleAddPresetShapes}
        globalUnit={inputData.unit}
      />
    </div>
  )
}

export default ConfigurationPanel
