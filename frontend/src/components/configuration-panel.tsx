"use client"

import type React from "react"
import { useRef } from "react"
import { Upload, Settings } from "lucide-react"
import { algorithmOptions } from "./algorithm-options"

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
  const selectedAlgorithm = algorithmOptions.find((alg) => alg.value === inputData.strategy)

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <h2 className="text-xl font-semibold mb-4 flex items-center">
        <Settings className="mr-2" size={20} />
        Configuración
      </h2>

      {/* Controles de archivo */}
      <div className="mb-4">
        <button
          onClick={() => fileInputRef.current?.click()}
          className="w-full flex items-center justify-center px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors mb-2"
        >
          <Upload className="mr-2" size={16} />
          Cargar JSON
        </button>
        <input ref={fileInputRef} type="file" accept=".json" onChange={onFileUpload} className="hidden" />
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

      {/* Resumen de piezas */}
      <div className="mt-6">
        <h3 className="text-lg font-medium mb-2">Piezas a empaquetar</h3>
        <div className="space-y-2">
          {inputData.pieces.map((piece, index) => (
            <div key={index} className="flex justify-between items-center p-2 bg-gray-50 rounded">
              <span className="font-medium">{piece.id}</span>
              <span className="text-sm text-gray-600">×{piece.quantity}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default ConfigurationPanel
