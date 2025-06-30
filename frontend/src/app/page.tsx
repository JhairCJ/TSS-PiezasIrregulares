"use client"
import type React from "react"
import { useState } from "react"
import ConfigurationPanel from "@/components/configuration-panel"
import ResultsPanel from "@/components/results-panel"
import { postNestData } from "@/services/nest-api"

const BinPackingApp = () => {
  const [inputData, setInputData] = useState({
    pieces: [
      {
        id: "rectangulo_1",
        points: [
          [0, 0],
          [50, 0],
          [50, 30],
          [0, 30],
        ] as [number, number][],
        quantity: 3,
      },
      {
        id: "triangulo_1",
        points: [
          [0, 0],
          [40, 0],
          [20, 35],
        ] as [number, number][],
        quantity: 2,
      },
      {
        id: "L_shape",
        points: [
          [0, 0],
          [60, 0],
          [60, 20],
          [20, 20],
          [20, 50],
          [0, 50],
        ] as [number, number][],
        quantity: 2,
      },
      {
        id: "pequeño_cuadrado",
        points: [
          [0, 0],
          [15, 0],
          [15, 15],
          [0, 15],
        ] as [number, number][],
        quantity: 5,
      },
    ],
    bin_width: 200,
    bin_height: 150,
    bin_width_real: 200, // Dimensiones reales
    bin_height_real: 150,
    unit: "cm" as const, // Unidad por defecto
    allow_rotation: true,
    rotation_angles: [0, 90, 180, 270],
    margin: 0,
    strategy: "bottom_left",
  })

  const [results, setResults] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async () => {
    setLoading(true)
    setError(null)

    try {
      const response = await postNestData(inputData)
      setResults(response)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido")
    } finally {
      setLoading(false)
    }
  }

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (e) => {
        try {
          const data = JSON.parse(e.target?.result as string)
          setInputData(data)
        } catch (err) {
          setError("Error al parsear el archivo JSON")
        }
      }
      reader.readAsText(file)
    }
  }

  const downloadResults = () => {
    if (results) {
      const dataStr = JSON.stringify(results, null, 2)
      const dataUri = "data:application/json;charset=utf-8," + encodeURIComponent(dataStr)
      const exportFileDefaultName = "bin_packing_results.json"

      const linkElement = document.createElement("a")
      linkElement.setAttribute("href", dataUri)
      linkElement.setAttribute("download", exportFileDefaultName)
      linkElement.click()
    }
  }

  const updateInputField = (field: string, value: any) => {
    setInputData((prev) => ({
      ...prev,
      [field]: value,
    }))
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-7xl mx-auto">
        <header className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Optimizador de Bin Packing</h1>
          <p className="text-gray-600">Visualiza y optimiza el empaquetado de piezas geométricas con medidas reales</p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Panel de configuración */}
          <div className="lg:col-span-1">
            <ConfigurationPanel
              inputData={inputData}
              updateInputField={updateInputField}
              onFileUpload={handleFileUpload}
              onSubmit={handleSubmit}
              onDownloadResults={downloadResults}
              loading={loading}
              hasResults={!!results}
            />
          </div>

          {/* Panel de resultados */}
          <div className="lg:col-span-2">
            <ResultsPanel results={results} loading={loading} error={error} />
          </div>
        </div>
      </div>
    </div>
  )
}

export default BinPackingApp
