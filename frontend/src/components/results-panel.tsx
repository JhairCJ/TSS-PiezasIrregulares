"use client"

import type React from "react"
import { Eye, FileText } from "lucide-react"
import BinVisualization from "./bin-visualization"
import { generatePDFReport } from "@/services/pdf-generator"

interface Results {
  summary: {
    total_bins: number
    total_pieces_placed: number
    average_efficiency: number
    total_execution_time: number
  }
  bins: Array<{
    bin_id: number
    bin_width: number
    bin_height: number
    material_efficiency: number
    execution_time: number
    placed_pieces: Array<{
      id: string
      original_id: string
      copy_number: number
      points: [number, number][]
    }>
  }>
}

interface ResultsPanelProps {
  results: Results | null
  loading: boolean
  error: string | null
  configData?: any // Datos de configuración para el PDF
}

const ResultsPanel: React.FC<ResultsPanelProps> = ({ results, loading, error, configData }) => {
  const handleGeneratePDF = () => {
    if (results && configData) {
      try {
        generatePDFReport(results, configData)
      } catch (err) {
        console.error("Error generando PDF:", err)
        alert("Error al generar el informe PDF. Por favor, intente nuevamente.")
      }
    }
  }

  if (error) {
    return (
      <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
        <strong>Error:</strong> {error}
      </div>
    )
  }

  if (results) {
    return (
      <div className="space-y-6">
        {/* Resumen */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold flex items-center">
              <Eye className="mr-2" size={20} />
              Resumen de Optimización
            </h2>

            {/* Botón para generar PDF */}
            <button
              onClick={handleGeneratePDF}
              className="flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
              title="Generar informe PDF"
            >
              <FileText className="mr-2" size={16} />
              Generar Informe PDF
            </button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">{results.summary.total_bins}</div>
              <div className="text-sm text-gray-600">Contenedores utilizados</div>
            </div>

            <div className="text-center p-4 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">{results.summary.total_pieces_placed}</div>
              <div className="text-sm text-gray-600">Piezas colocadas</div>
            </div>

            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <div className="text-2xl font-bold text-purple-600">{results.summary.average_efficiency.toFixed(2)}%</div>
              <div className="text-sm text-gray-600">Eficiencia promedio</div>
            </div>

            <div className="text-center p-4 bg-orange-50 rounded-lg">
              <div className="text-2xl font-bold text-orange-600">
                {(results.summary.total_execution_time * 1000).toFixed(0)}ms
              </div>
              <div className="text-sm text-gray-600">Tiempo total</div>
            </div>
          </div>

          {/* Información adicional para el PDF */}
          <div className="mt-4 p-3 bg-gray-50 rounded-lg">
            <div className="text-sm text-gray-600">
              <p className="mb-1">
                <strong>Análisis de eficiencia:</strong>
                {results.summary.average_efficiency >= 90
                  ? " Excelente"
                  : results.summary.average_efficiency >= 80
                    ? " Buena"
                    : results.summary.average_efficiency >= 70
                      ? " Moderada"
                      : " Baja"}{" "}
                ({results.summary.average_efficiency.toFixed(2)}%)
              </p>
              <p className="text-xs text-gray-500">
                El informe PDF incluye análisis detallado, recomendaciones y visualizaciones completas
              </p>
            </div>
          </div>
        </div>

        {/* Visualizaciones */}
        <div className="space-y-6">
          {results.bins.map((bin, index) => (
            <BinVisualization key={index} bin={bin} />
          ))}
        </div>
      </div>
    )
  }

  if (!loading) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-12 text-center">
        <div className="text-gray-400 mb-4">
          <Eye size={48} className="mx-auto" />
        </div>
        <h3 className="text-xl font-medium text-gray-600 mb-2">Listo para optimizar</h3>
        <p className="text-gray-500">Configura los parámetros y presiona "Optimizar" para ver los resultados</p>
      </div>
    )
  }

  return null
}

export default ResultsPanel
