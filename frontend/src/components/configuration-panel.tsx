"use client"

import type React from "react"
import { useRef, useState } from "react"
import { Upload, Settings } from "lucide-react"
import { algorithmOptions } from "./algorithm-options"
import ShapeDesignerModal from "./shape-designer-modal"
import PiecesList from "./pieces-list"

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
  const [editingShape, setEditingShape] = useState<{
    id: string
    points: [number, number][]
    quantity: number
    index: number
  } | null>(null)
  const selectedAlgorithm = algorithmOptions.find((alg) => alg.value === inputData.strategy)

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

  const exportShapes = () => {
    const shapesData = {
      shapes: inputData.pieces,
      exported_at: new Date().toISOString(),
      total_shapes: inputData.pieces.length,
      version: "1.0",
    }

    const dataStr = JSON.stringify(shapesData, null, 2)
    const dataUri = "data:application/json;charset=utf-8," + encodeURIComponent(dataStr)
    const exportFileDefaultName = `figuras_${new Date().toISOString().split("T")[0]}.json`

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
          } else if (data.pieces && Array.isArray(data.pieces)) {
            // It's a complete configuration file
            updateInputField("pieces", data.pieces)
          } else {
            throw new Error("Formato de archivo no válido")
          }
        } catch (err) {
          alert("Error al importar figuras: " + (err instanceof Error ? err.message : "Formato inválido"))
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
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center justify-center px-3 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm"
            >
              <Upload className="mr-1" size={14} />
              Cargar Config
            </button>
            <button
              onClick={() => shapesInputRef.current?.click()}
              className="flex items-center justify-center px-3 py-2 bg-cyan-500 text-white rounded-lg hover:bg-cyan-600 transition-colors text-sm"
            >
              <span className="mr-1">📥</span>
              Importar Figuras
            </button>
          </div>

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

        {/* Configuración del bin */}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Ancho del Bin</label>
            <input
              type="number"
              value={inputData.bin_width}
              onChange={(e) => updateInputField("bin_width", Number.parseInt(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Alto del Bin</label>
            <input
              type="number"
              value={inputData.bin_height}
              onChange={(e) => updateInputField("bin_height", Number.parseInt(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="allow_rotation"
              checked={inputData.allow_rotation}
              onChange={(e) => updateInputField("allow_rotation", e.target.checked)}
              className="mr-2"
            />
            <label htmlFor="allow_rotation" className="text-sm font-medium text-gray-700">
              Permitir rotación
            </label>
          </div>
        </div>

        {/* Botones de acción */}
        <div className="mt-6 space-y-2">
          <button
            onClick={onSubmit}
            disabled={loading}
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
      />

      <ShapeDesignerModal
        isOpen={showShapeDesigner}
        onClose={handleCloseDesigner}
        onSaveShape={handleSaveShape}
        editingShape={editingShape}
      />
    </div>
  )
}

export default ConfigurationPanel
