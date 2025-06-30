import type React from "react"
import { Eye } from "lucide-react"
import BinVisualization from "./bin-visualization"

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
}

const ResultsPanel: React.FC<ResultsPanelProps> = ({ results, loading, error }) => {
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
          <h2 className="text-xl font-semibold mb-4 flex items-center">
            <Eye className="mr-2" size={20} />
            Resumen de Optimización
          </h2>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">{results.summary.total_bins}</div>
              <div className="text-sm text-gray-600">Bins utilizados</div>
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
