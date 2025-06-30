"use client"

import type React from "react"
import { useState } from "react"
import { algorithmOptions } from "./algorithm-options"
import PiecesList from "./pieces-list"
import ShapeDesignerModal from "./shape-designer-modal"
import PresetShapesModal from "./preset-shapes-modal"
import { Download, Upload, PlusCircle, Settings } from "lucide-react"

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

interface ConfigurationPanelProps {
  inputData: any
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
  const [isShapeDesignerOpen, setIsShapeDesignerOpen] = useState(false)
  const [isPresetShapesOpen, setIsPresetShapesOpen] = useState(false)
  const [editingShape, setEditingShape] = useState<{
    id: string
    points: [number, number][]
    quantity: number
    index: number
  } | null>(null)

  const handleOpenShapeDesigner = () => {
    setIsShapeDesignerOpen(true)
    setEditingShape(null)
  }

  const handleCloseShapeDesigner = () => {
    setIsShapeDesignerOpen(false)
    setEditingShape(null)
  }

  const handleOpenPresetShapes = () => {
    setIsPresetShapesOpen(true)
  }

  const handleClosePresetShapes = () => {
    setIsPresetShapesOpen(false)
  }

  const handleSaveShape = (shape: { id: string; points: [number, number][]; quantity: number; editIndex?: number }) => {
    let updatedPieces = [...inputData.pieces]

    if (shape.editIndex !== undefined) {
      // Editar figura existente
      updatedPieces[shape.editIndex] = {
        id: shape.id,
        points: shape.points,
        quantity: shape.quantity,
      }
    } else {
      // Agregar nueva figura
      updatedPieces = [...updatedPieces, shape]
    }

    updateInputField("pieces", updatedPieces)
  }

  const handleUpdatePieces = (pieces: Piece[]) => {
    updateInputField("pieces", pieces)
  }

  const handleClearAllPieces = () => {
    if (confirm("¿Estás seguro de que quieres eliminar todas las figuras?")) {
      updateInputField("pieces", [])
    }
  }

  const handleEditShape = (piece: Piece, index: number) => {
    setEditingShape({ ...piece, index })
    setIsShapeDesignerOpen(true)
  }

  const handleAddPresetShapes = (shapes: Array<{ id: string; points: [number, number][]; quantity: number }>) => {
    const updatedPieces = [...inputData.pieces, ...shapes]
    updateInputField("pieces", updatedPieces)
  }

  return (
    <div className="space-y-6">
      {/* Configuración general */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h2 className="text-xl font-semibold mb-4 flex items-center">
          <Settings className="mr-2" size={20} />
          Configuración General
        </h2>

        <div className="space-y-4">
          {/* Dimensiones del Bin */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Ancho del Bin ({UNITS[inputData.unit].symbol})
            </label>
            <input
              type="number"
              value={inputData.bin_width}
              onChange={(e) => updateInputField("bin_width", Number(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Alto del Bin ({UNITS[inputData.unit].symbol})
            </label>
            <input
              type="number"
              value={inputData.bin_height}
              onChange={(e) => updateInputField("bin_height", Number(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            />
          </div>

          {/* Unidad de Medida */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Unidad de Medida</label>
            <select
              value={inputData.unit}
              onChange={(e) => updateInputField("unit", e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            >
              {Object.entries(UNITS).map(([key, unit]) => (
                <option key={key} value={key}>
                  {unit.label} ({unit.symbol})
                </option>
              ))}
            </select>
          </div>

          {/* Estrategia de Optimización */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Estrategia de Optimización</label>
            <select
              value={inputData.strategy}
              onChange={(e) => updateInputField("strategy", e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            >
              {algorithmOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label} {option.description}
                </option>
              ))}
            </select>
          </div>

          {/* Rotación */}
          <label className="flex items-center space-x-3">
            <input
              type="checkbox"
              checked={inputData.allow_rotation}
              onChange={(e) => updateInputField("allow_rotation", e.target.checked)}
              className="h-5 w-5 text-blue-500 focus:ring-blue-500 border-gray-300 rounded"
            />
            <span className="text-gray-700 text-sm font-medium">Permitir rotación</span>
          </label>

          {/* Margen */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Margen ({UNITS[inputData.unit].symbol})
            </label>
            <input
              type="number"
              value={inputData.margin}
              onChange={(e) => updateInputField("margin", Number(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            />
          </div>
        </div>
      </div>

      {/* Lista de piezas */}
      <PiecesList
        pieces={inputData.pieces}
        onUpdatePieces={handleUpdatePieces}
        onClearAll={handleClearAllPieces}
        onEditShape={handleEditShape}
        currentUnit={inputData.unit}
      />

      {/* Acciones */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h2 className="text-xl font-semibold mb-4">Acciones</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <button
            onClick={handleOpenShapeDesigner}
            className="flex items-center justify-center px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
          >
            <PlusCircle className="mr-2" size={16} />
            Diseñar Nueva Figura
          </button>

          <button
            onClick={handleOpenPresetShapes}
            className="flex items-center justify-center px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 transition-colors"
          >
            <PlusCircle className="mr-2" size={16} />
            Agregar Figuras Predeterminadas
          </button>

          <label className="flex items-center justify-center px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors cursor-pointer">
            <Upload className="mr-2" size={16} />
            Importar JSON
            <input type="file" accept=".json" className="hidden" onChange={onFileUpload} />
          </label>

          {hasResults && (
            <button
              onClick={onDownloadResults}
              className="flex items-center justify-center px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
            >
              <Download className="mr-2" size={16} />
              Descargar Resultados
            </button>
          )}
        </div>

        <div className="mt-4">
          <button
            onClick={onSubmit}
            disabled={loading}
            className="w-full px-6 py-3 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-opacity-50 font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Optimizando..." : "Optimizar"}
          </button>
        </div>
      </div>

      {/* Modals */}
      <ShapeDesignerModal
        isOpen={isShapeDesignerOpen}
        onClose={handleCloseShapeDesigner}
        onSaveShape={handleSaveShape}
        editingShape={editingShape}
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
