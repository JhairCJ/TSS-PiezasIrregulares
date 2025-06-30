"use client"
import type React from "react"
import { useState, useRef, useEffect, useCallback } from "react"
import { Upload, Play, Settings, Download, Trash2, RotateCw, Move, Square, Info, Plus, Eye, Edit3 } from "lucide-react"
import { postNestData } from '../services/nestAPI'

// Tipos TypeScript
interface Point2D {
  x: number
  y: number
}

interface PieceData {
  id: string
  points: Point2D[]
  quantity: number
}

interface PlacedPiece {
  id: string
  points: Point2D[]
  x: number
  y: number
  rotation: number
}

interface NestingRequest {
  pieces: PieceData[]
  bin_width: number
  bin_height: number
  algorithm: "genetic" | "bottom_left" | "best_fit"
  rotation_step: number
}

interface NestingResponse {
  placed_pieces: PlacedPiece[]
  bins_used: number
  utilization: number
  computation_time: number
}

type Tool = "draw" | "select" | "view"
type Algorithm = "genetic" | "bottom_left" | "best_fit"
type ViewMode = "design" | "result"

const NestingInterface: React.FC = () => {
  const [pieces, setPieces] = useState<PieceData[]>([])
  const [binWidth, setBinWidth] = useState<number>(800)
  const [binHeight, setBinHeight] = useState<number>(600)
  const [algorithm, setAlgorithm] = useState<Algorithm>("genetic")
  const [rotationStep, setRotationStep] = useState<number>(90)
  const [results, setResults] = useState<NestingResponse | null>(null)
  const [isProcessing, setIsProcessing] = useState<boolean>(false)
  const [currentTool, setCurrentTool] = useState<Tool>("draw")
  const [currentPiece, setCurrentPiece] = useState<Point2D[]>([])
  const [isDrawing, setIsDrawing] = useState<boolean>(false)
  const [viewMode, setViewMode] = useState<ViewMode>("design")
  const [selectedPiece, setSelectedPiece] = useState<number | null>(null)

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Configuración del canvas
  const CANVAS_WIDTH = 800
  const CANVAS_HEIGHT = 600
  const MARGIN = 20
  const BIN_START_X = MARGIN
  const BIN_START_Y = MARGIN

  // Calcular escala para que el bin quepa en el área designada
  const availableWidth = CANVAS_WIDTH - MARGIN * 2
  const availableHeight = CANVAS_HEIGHT - MARGIN * 2
  const scaleX = availableWidth / binWidth
  const scaleY = availableHeight / binHeight
  const scale = Math.min(scaleX, scaleY, 1)

  const drawCanvas = useCallback(
    (ctx: CanvasRenderingContext2D): void => {
      const canvas = ctx.canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      // Fondo del canvas
      ctx.fillStyle = "#f8fafc"
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      // Área del bin
      const binPixelWidth = binWidth * scale
      const binPixelHeight = binHeight * scale

      // Fondo del bin
      ctx.fillStyle = "#ffffff"
      ctx.fillRect(BIN_START_X, BIN_START_Y, binPixelWidth, binPixelHeight)

      // Borde del bin
      ctx.strokeStyle = "#1e293b"
      ctx.lineWidth = 2
      ctx.strokeRect(BIN_START_X, BIN_START_Y, binPixelWidth, binPixelHeight)

      // Grid del contenedor
      ctx.strokeStyle = "#e2e8f0"
      ctx.lineWidth = 1
      const gridSize = 50 * scale
      for (let x = BIN_START_X + gridSize; x < BIN_START_X + binPixelWidth; x += gridSize) {
        ctx.beginPath()
        ctx.moveTo(x, BIN_START_Y)
        ctx.lineTo(x, BIN_START_Y + binPixelHeight)
        ctx.stroke()
      }
      for (let y = BIN_START_Y + gridSize; y < BIN_START_Y + binPixelHeight; y += gridSize) {
        ctx.beginPath()
        ctx.moveTo(BIN_START_X, y)
        ctx.lineTo(BIN_START_X + binPixelWidth, y)
        ctx.stroke()
      }

      // Etiqueta del bin
      ctx.fillStyle = "#475569"
      ctx.font = "bold 14px sans-serif"
      ctx.fillText(`Contenedor: ${binWidth} × ${binHeight} mm`, BIN_START_X, BIN_START_Y - 8)

      if (viewMode === "result" && results) {
        // Dibujar piezas colocadas
        results.placed_pieces.forEach((piece, index) => {
          ctx.save()

          const colors = ["#ef4444", "#f97316", "#eab308", "#22c55e", "#06b6d4", "#3b82f6", "#8b5cf6", "#ec4899"]
          const color = colors[index % colors.length]
          ctx.fillStyle = color + "40"
          ctx.strokeStyle = color
          ctx.lineWidth = 2

          if (piece.points && piece.points.length > 0) {
            ctx.beginPath()
            const firstPoint = piece.points[0]
            ctx.moveTo(BIN_START_X + (piece.x + firstPoint.x) * scale, BIN_START_Y + (piece.y + firstPoint.y) * scale)

            piece.points.slice(1).forEach((point) => {
              ctx.lineTo(BIN_START_X + (piece.x + point.x) * scale, BIN_START_Y + (piece.y + point.y) * scale)
            })

            ctx.closePath()
            ctx.fill()
            ctx.stroke()

            // Etiqueta de la pieza
            ctx.fillStyle = "#1f2937"
            ctx.font = "bold 12px sans-serif"
            ctx.fillText(piece.id, BIN_START_X + piece.x * scale + 5, BIN_START_Y + piece.y * scale + 15)
          }

          ctx.restore()
        })
      }

      // Dibujar pieza actual siendo dibujada
      if (viewMode === "design" && currentPiece.length > 0) {
        ctx.save()
        ctx.strokeStyle = "#3b82f6"
        ctx.fillStyle = "#3b82f620"
        ctx.lineWidth = 3

        if (currentPiece.length > 2) {
          ctx.beginPath()
          const firstPoint = currentPiece[0]
          ctx.moveTo(firstPoint.x, firstPoint.y)

          currentPiece.slice(1).forEach((point) => {
            ctx.lineTo(point.x, point.y)
          })

          ctx.closePath()
          ctx.fill()
        }

        ctx.setLineDash([8, 4])
        ctx.beginPath()
        if (currentPiece.length > 0) {
          ctx.moveTo(currentPiece[0].x, currentPiece[0].y)
          currentPiece.slice(1).forEach((point) => {
            ctx.lineTo(point.x, point.y)
          })
        }
        ctx.stroke()

        // Dibujar puntos
        ctx.setLineDash([])
        ctx.fillStyle = "#3b82f6"
        currentPiece.forEach((point, index) => {
          ctx.beginPath()
          ctx.arc(point.x, point.y, 4, 0, 2 * Math.PI)
          ctx.fill()

          // Número del punto
          ctx.fillStyle = "#ffffff"
          ctx.font = "bold 10px sans-serif"
          ctx.textAlign = "center"
          ctx.fillText((index + 1).toString(), point.x, point.y + 3)
          ctx.fillStyle = "#3b82f6"
          ctx.textAlign = "left"
        })

        ctx.restore()
      }

      // Mostrar instrucciones de dibujo
      if (viewMode === "design" && currentTool === "draw") {
        ctx.fillStyle = "#64748b"
        ctx.font = "14px sans-serif"
        const instructions = isDrawing
          ? `Puntos: ${currentPiece.length} - Doble clic para terminar (mín. 3 puntos)`
          : "Haz clic dentro del contenedor para comenzar a dibujar"
        ctx.fillText(instructions, BIN_START_X, CANVAS_HEIGHT - 10)
      }
    },
    [pieces, results, binWidth, binHeight, scale, currentPiece, viewMode, currentTool, isDrawing],
  )

  useEffect(() => {
    const canvas = canvasRef.current
    if (canvas) {
      const ctx = canvas.getContext("2d")
      if (ctx) {
        drawCanvas(ctx)
      }
    }
  }, [drawCanvas])

  const isPointInBin = (x: number, y: number): boolean => {
    const binPixelWidth = binWidth * scale
    const binPixelHeight = binHeight * scale
    return x >= BIN_START_X && x <= BIN_START_X + binPixelWidth && y >= BIN_START_Y && y <= BIN_START_Y + binPixelHeight
  }

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>): void => {
    if (currentTool !== "draw" || viewMode !== "design") return

    const canvas = canvasRef.current
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    const canvasX = x * (canvas.width / rect.width)
    const canvasY = y * (canvas.height / rect.height)

    if (!isPointInBin(canvasX, canvasY)) {
      if (isDrawing) {
        alert("Por favor dibuja solo dentro del área del contenedor")
      }
      return
    }

    if (!isDrawing) {
      setIsDrawing(true)
      setCurrentPiece([{ x: canvasX, y: canvasY }])
    } else {
      setCurrentPiece((prev) => [...prev, { x: canvasX, y: canvasY }])
    }
  }

  const handleCanvasDoubleClick = (e: React.MouseEvent<HTMLCanvasElement>): void => {
    if (currentTool === "draw" && currentPiece.length >= 3 && viewMode === "design") {
      e.preventDefault()
      finishDrawing()
    }
  }

  const finishDrawing = (): void => {
    if (currentPiece.length >= 3) {
      const worldPoints: Point2D[] = currentPiece.map((point) => ({
        x: (point.x - BIN_START_X) / scale,
        y: (point.y - BIN_START_Y) / scale,
      }))

      const newPiece: PieceData = {
        id: `Pieza_${pieces.length + 1}`,
        points: worldPoints,
        quantity: 1,
      }

      setPieces((prev) => [...prev, newPiece])
    }

    setCurrentPiece([])
    setIsDrawing(false)
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target?.result as string)
        if (data.pieces && Array.isArray(data.pieces)) {
          setPieces(data.pieces)
          setViewMode("design")
          setResults(null)
        } else {
          alert("Formato de archivo inválido")
        }
      } catch (error) {
        alert("Error al leer el archivo: " + (error as Error).message)
      }
    }
    reader.readAsText(file)
  }

  const handleNesting = async (): Promise<void> => {
    if (pieces.length === 0) {
      alert("Agrega al menos una pieza antes de procesar")
      return
    }

    setIsProcessing(true)
    setResults(null)

    try {
      const requestData: NestingRequest = {
        pieces,
        bin_width: binWidth,
        bin_height: binHeight,
        algorithm,
        rotation_step: rotationStep,
      }

      const result = await postNestData(requestData)
      setResults(result)
      setViewMode("result")
    } catch (error) {
      alert("Error al procesar nesting: " + (error as Error).message)
    } finally {
      setIsProcessing(false)
    }
  }

  const clearPieces = (): void => {
    setPieces([])
    setResults(null)
    setCurrentPiece([])
    setIsDrawing(false)
    setViewMode("design")
    setSelectedPiece(null)
  }

  const deletePiece = (index: number): void => {
    setPieces((prev) => prev.filter((_, i) => i !== index))
    setResults(null)
    if (selectedPiece === index) {
      setSelectedPiece(null)
    }
  }

  const updatePieceQuantity = (index: number, quantity: number): void => {
    setPieces((prev) => prev.map((piece, i) => (i === index ? { ...piece, quantity: Math.max(1, quantity) } : piece)))
    setResults(null)
  }

  const exportResults = (): void => {
    if (!results) return

    const dataStr = JSON.stringify(results, null, 2)
    const dataBlob = new Blob([dataStr], { type: "application/json" })
    const url = URL.createObjectURL(dataBlob)
    const link = document.createElement("a")
    link.href = url
    link.download = "nesting_results.json"
    link.click()
    URL.revokeObjectURL(url)
  }

  const addSamplePieces = (): void => {
    const samples: PieceData[] = [
      {
        id: "Rectángulo",
        points: [
          { x: 0, y: 0 },
          { x: 120, y: 0 },
          { x: 120, y: 80 },
          { x: 0, y: 80 },
        ],
        quantity: 3,
      },
      {
        id: "Triángulo",
        points: [
          { x: 0, y: 0 },
          { x: 100, y: 0 },
          { x: 50, y: 87 },
        ],
        quantity: 2,
      },
      {
        id: "Forma_L",
        points: [
          { x: 0, y: 0 },
          { x: 80, y: 0 },
          { x: 80, y: 40 },
          { x: 40, y: 40 },
          { x: 40, y: 120 },
          { x: 0, y: 120 },
        ],
        quantity: 2,
      },
    ]
    setPieces(samples)
    setResults(null)
    setViewMode("design")
  }

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#f9fafb" }}>
      {/* Header */}
      <header
        style={{
          backgroundColor: "white",
          boxShadow: "0 1px 3px 0 rgba(0, 0, 0, 0.1)",
          borderBottom: "1px solid #e5e7eb",
        }}
      >
        <div
          style={{
            maxWidth: "1280px",
            margin: "0 auto",
            padding: "1rem 1.5rem",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
              <div
                style={{
                  padding: "0.5rem",
                  background: "linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)",
                  borderRadius: "0.5rem",
                }}
              >
                <Square style={{ height: "1.5rem", width: "1.5rem", color: "white" }} />
              </div>
              <div>
                <h1
                  style={{
                    fontSize: "1.5rem",
                    fontWeight: "bold",
                    color: "#111827",
                    margin: 0,
                  }}
                >
                  Sistema de Nesting
                </h1>
                <p
                  style={{
                    fontSize: "0.875rem",
                    color: "#6b7280",
                    margin: 0,
                  }}
                >
                  Optimización de corte de materiales
                </p>
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
              {/* Selector de Modo */}
              <div
                style={{
                  display: "flex",
                  backgroundColor: "#f3f4f6",
                  borderRadius: "0.5rem",
                  padding: "0.25rem",
                }}
              >
                <button
                  onClick={() => setViewMode("design")}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    padding: "0.5rem 1rem",
                    borderRadius: "0.375rem",
                    fontSize: "0.875rem",
                    fontWeight: "500",
                    border: "none",
                    cursor: "pointer",
                    backgroundColor: viewMode === "design" ? "white" : "transparent",
                    color: viewMode === "design" ? "#1d4ed8" : "#6b7280",
                    boxShadow: viewMode === "design" ? "0 1px 2px 0 rgba(0, 0, 0, 0.05)" : "none",
                    transition: "all 0.2s ease-in-out",
                  }}
                >
                  <Edit3 style={{ marginRight: "0.5rem", height: "1rem", width: "1rem" }} />
                  Diseño
                </button>
                <button
                  onClick={() => setViewMode("result")}
                  disabled={!results}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    padding: "0.5rem 1rem",
                    borderRadius: "0.375rem",
                    fontSize: "0.875rem",
                    fontWeight: "500",
                    border: "none",
                    cursor: results ? "pointer" : "not-allowed",
                    backgroundColor: viewMode === "result" && results ? "white" : "transparent",
                    color: viewMode === "result" && results ? "#059669" : "#9ca3af",
                    boxShadow: viewMode === "result" && results ? "0 1px 2px 0 rgba(0, 0, 0, 0.05)" : "none",
                    transition: "all 0.2s ease-in-out",
                  }}
                >
                  <Eye style={{ marginRight: "0.5rem", height: "1rem", width: "1rem" }} />
                  Resultado
                </button>
              </div>

              {/* Botón principal */}
              <button
                onClick={handleNesting}
                disabled={pieces.length === 0 || isProcessing}
                className="btn-primary"
                style={{
                  display: "flex",
                  alignItems: "center",
                  opacity: pieces.length === 0 || isProcessing ? 0.5 : 1,
                }}
              >
                {isProcessing ? (
                  <>
                    <RotateCw
                      style={{ marginRight: "0.5rem", height: "1.25rem", width: "1.25rem" }}
                      className="animate-spin"
                    />
                    Procesando...
                  </>
                ) : (
                  <>
                    <Play style={{ marginRight: "0.5rem", height: "1.25rem", width: "1.25rem" }} />
                    Ejecutar Nesting
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </header>

      <div
        style={{
          maxWidth: "1280px",
          margin: "0 auto",
          padding: "1.5rem",
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(12, minmax(0, 1fr))",
            gap: "1.5rem",
          }}
          className="responsive-grid"
        >
          {/* Panel Izquierdo - Piezas */}
          <div style={{ gridColumn: "span 3 / span 3" }} className="responsive-col">
            <div className="card" style={{ height: "100%", display: "flex", flexDirection: "column" }}>
              {/* Header del Panel */}
              <div
                style={{
                  padding: "1rem",
                  borderBottom: "1px solid #e5e7eb",
                  background: "linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)",
                  borderRadius: "0.75rem 0.75rem 0 0",
                }}
              >
                <h2
                  style={{
                    fontSize: "1.125rem",
                    fontWeight: "bold",
                    color: "white",
                    display: "flex",
                    alignItems: "center",
                    margin: 0,
                  }}
                >
                  <Square style={{ marginRight: "0.5rem", height: "1.25rem", width: "1.25rem" }} />
                  Piezas de Trabajo
                </h2>
                <p
                  style={{
                    color: "#bfdbfe",
                    fontSize: "0.875rem",
                    marginTop: "0.25rem",
                    margin: "0.25rem 0 0 0",
                  }}
                >
                  {pieces.length} pieza{pieces.length !== 1 ? "s" : ""} •{" "}
                  {pieces.reduce((sum, piece) => sum + piece.quantity, 0)} total
                </p>
              </div>

              {/* Herramientas */}
              <div
                style={{
                  padding: "1rem",
                  borderBottom: "1px solid #e5e7eb",
                  backgroundColor: "#f9fafb",
                }}
              >
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                    gap: "0.5rem",
                    marginBottom: "0.75rem",
                  }}
                >
                  <button
                    onClick={addSamplePieces}
                    className="btn-success"
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "0.875rem",
                    }}
                  >
                    <Plus style={{ marginRight: "0.25rem", height: "1rem", width: "1rem" }} />
                    Ejemplos
                  </button>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="btn-primary"
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "0.875rem",
                      padding: "0.5rem 1rem",
                    }}
                  >
                    <Upload style={{ marginRight: "0.25rem", height: "1rem", width: "1rem" }} />
                    Cargar
                  </button>
                </div>
                <button
                  onClick={clearPieces}
                  disabled={pieces.length === 0}
                  className="btn-danger"
                  style={{
                    width: "100%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "0.875rem",
                    opacity: pieces.length === 0 ? 0.5 : 1,
                  }}
                >
                  <Trash2 style={{ marginRight: "0.5rem", height: "1rem", width: "1rem" }} />
                  Limpiar Todo
                </button>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  accept=".json"
                  style={{ display: "none" }}
                />
              </div>

              {/* Lista de Piezas */}
              <div
                style={{
                  flex: 1,
                  overflowY: "auto",
                  padding: "1rem",
                }}
              >
                {pieces.length === 0 ? (
                  <div
                    style={{
                      textAlign: "center",
                      color: "#6b7280",
                      marginTop: "2rem",
                    }}
                  >
                    <div
                      style={{
                        padding: "1rem",
                        backgroundColor: "#f3f4f6",
                        borderRadius: "9999px",
                        width: "4rem",
                        height: "4rem",
                        margin: "0 auto 1rem auto",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Square style={{ height: "2rem", width: "2rem", color: "#9ca3af" }} />
                    </div>
                    <p
                      style={{
                        fontSize: "1.125rem",
                        fontWeight: "500",
                        marginBottom: "0.5rem",
                        margin: "0 0 0.5rem 0",
                      }}
                    >
                      No hay piezas
                    </p>
                    <p
                      style={{
                        fontSize: "0.875rem",
                        margin: 0,
                      }}
                    >
                      Dibuja una pieza o carga ejemplos
                    </p>
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                    {pieces.map((piece, index) => (
                      <div
                        key={index}
                        onClick={() => setSelectedPiece(selectedPiece === index ? null : index)}
                        style={{
                          padding: "1rem",
                          borderRadius: "0.5rem",
                          border: selectedPiece === index ? "2px solid #3b82f6" : "2px solid #e5e7eb",
                          backgroundColor: selectedPiece === index ? "#eff6ff" : "white",
                          cursor: "pointer",
                          transition: "all 0.2s ease-in-out",
                          boxShadow:
                            selectedPiece === index
                              ? "0 4px 6px -1px rgba(0, 0, 0, 0.1)"
                              : "0 1px 2px 0 rgba(0, 0, 0, 0.05)",
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            marginBottom: "0.5rem",
                          }}
                        >
                          <h4
                            style={{
                              fontWeight: "600",
                              color: "#111827",
                              display: "flex",
                              alignItems: "center",
                              margin: 0,
                            }}
                          >
                            <div
                              style={{
                                width: "0.75rem",
                                height: "0.75rem",
                                borderRadius: "9999px",
                                marginRight: "0.5rem",
                                backgroundColor: ["#ef4444", "#f97316", "#eab308", "#22c55e", "#3b82f6", "#8b5cf6"][
                                  index % 6
                                ],
                              }}
                            ></div>
                            {piece.id}
                          </h4>
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              deletePiece(index)
                            }}
                            style={{
                              color: "#ef4444",
                              padding: "0.25rem",
                              borderRadius: "0.25rem",
                              border: "none",
                              backgroundColor: "transparent",
                              cursor: "pointer",
                              transition: "all 0.2s ease-in-out",
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.backgroundColor = "#fef2f2"
                              e.currentTarget.style.color = "#dc2626"
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.backgroundColor = "transparent"
                              e.currentTarget.style.color = "#ef4444"
                            }}
                          >
                            <Trash2 style={{ height: "1rem", width: "1rem" }} />
                          </button>
                        </div>

                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            marginBottom: "0.5rem",
                          }}
                        >
                          <span style={{ fontSize: "0.875rem", color: "#6b7280" }}>Cantidad:</span>
                          <input
                            type="number"
                            value={piece.quantity}
                            onChange={(e) => {
                              e.stopPropagation()
                              updatePieceQuantity(index, Number(e.target.value))
                            }}
                            min="1"
                            className="input-field"
                            style={{
                              width: "4rem",
                              padding: "0.25rem 0.5rem",
                              fontSize: "0.875rem",
                            }}
                            onClick={(e) => e.stopPropagation()}
                          />
                        </div>

                        <div style={{ fontSize: "0.75rem", color: "#6b7280" }}>{piece.points.length} vértices</div>

                        {selectedPiece === index && (
                          <div
                            style={{
                              marginTop: "0.75rem",
                              paddingTop: "0.75rem",
                              borderTop: "1px solid #e5e7eb",
                            }}
                          >
                            <div style={{ fontSize: "0.75rem", color: "#6b7280" }}>
                              <strong style={{ color: "#374151" }}>Coordenadas:</strong>
                              <div
                                style={{
                                  marginTop: "0.25rem",
                                  maxHeight: "5rem",
                                  overflowY: "auto",
                                  backgroundColor: "#f9fafb",
                                  borderRadius: "0.25rem",
                                  padding: "0.5rem",
                                }}
                              >
                                {piece.points.map((point, i) => (
                                  <div
                                    key={i}
                                    style={{
                                      display: "flex",
                                      justifyContent: "space-between",
                                    }}
                                  >
                                    <span>P{i + 1}:</span>
                                    <span>
                                      ({point.x.toFixed(1)}, {point.y.toFixed(1)})
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Área Principal - Canvas */}
          <div style={{ gridColumn: "span 6 / span 6" }} className="responsive-col">
            <div className="card" style={{ height: "100%", display: "flex", flexDirection: "column" }}>
              {/* Header del Canvas */}
              <div style={{ padding: "1rem", borderBottom: "1px solid #e5e7eb" }}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <div>
                    <h3
                      style={{
                        fontSize: "1.125rem",
                        fontWeight: "600",
                        color: "#111827",
                        margin: 0,
                      }}
                    >
                      {viewMode === "design" ? "Área de Diseño" : "Resultado del Nesting"}
                    </h3>
                    <p
                      style={{
                        fontSize: "0.875rem",
                        color: "#6b7280",
                        margin: "0.25rem 0 0 0",
                      }}
                    >
                      Contenedor: {binWidth} × {binHeight} mm • Escala: {Math.round(scale * 100)}%
                    </p>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                    {viewMode === "design" && (
                      <div
                        style={{
                          display: "flex",
                          backgroundColor: "#f3f4f6",
                          borderRadius: "0.5rem",
                          padding: "0.25rem",
                        }}
                      >
                        <button
                          onClick={() => setCurrentTool("draw")}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            padding: "0.5rem 0.75rem",
                            borderRadius: "0.375rem",
                            fontSize: "0.875rem",
                            fontWeight: "500",
                            border: "none",
                            cursor: "pointer",
                            backgroundColor: currentTool === "draw" ? "white" : "transparent",
                            color: currentTool === "draw" ? "#1d4ed8" : "#6b7280",
                            boxShadow: currentTool === "draw" ? "0 1px 2px 0 rgba(0, 0, 0, 0.05)" : "none",
                            transition: "all 0.2s ease-in-out",
                          }}
                        >
                          <Move style={{ marginRight: "0.5rem", height: "1rem", width: "1rem" }} />
                          Dibujar
                        </button>
                      </div>
                    )}

                    {results && viewMode === "result" && (
                      <button
                        onClick={exportResults}
                        className="btn-success"
                        style={{
                          display: "flex",
                          alignItems: "center",
                          fontSize: "0.875rem",
                        }}
                      >
                        <Download style={{ marginRight: "0.5rem", height: "1rem", width: "1rem" }} />
                        Exportar
                      </button>
                    )}
                  </div>
                </div>

                {/* Estado de dibujo */}
                {isDrawing && viewMode === "design" && (
                  <div
                    style={{
                      marginTop: "0.75rem",
                      padding: "0.75rem",
                      backgroundColor: "#eff6ff",
                      border: "1px solid #bfdbfe",
                      borderRadius: "0.5rem",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          color: "#1e40af",
                        }}
                      >
                        <div
                          style={{
                            width: "0.5rem",
                            height: "0.5rem",
                            backgroundColor: "#3b82f6",
                            borderRadius: "9999px",
                            marginRight: "0.5rem",
                          }}
                          className="animate-pulse"
                        ></div>
                        <span style={{ fontSize: "0.875rem", fontWeight: "500" }}>
                          Dibujando • {currentPiece.length} puntos
                        </span>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                        <button
                          onClick={finishDrawing}
                          disabled={currentPiece.length < 3}
                          className="btn-success"
                          style={{
                            padding: "0.25rem 0.75rem",
                            fontSize: "0.875rem",
                            opacity: currentPiece.length >= 3 ? 1 : 0.5,
                          }}
                        >
                          Terminar
                        </button>
                        <button
                          onClick={() => {
                            setCurrentPiece([])
                            setIsDrawing(false)
                          }}
                          className="btn-danger"
                          style={{
                            padding: "0.25rem 0.75rem",
                            fontSize: "0.875rem",
                          }}
                        >
                          Cancelar
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Canvas */}
              <div className="canvas-container">
                <canvas
                  ref={canvasRef}
                  width={CANVAS_WIDTH}
                  height={CANVAS_HEIGHT}
                  onClick={handleCanvasClick}
                  onDoubleClick={handleCanvasDoubleClick}
                  className="canvas-border"
                  style={{
                    cursor: currentTool === "draw" && viewMode === "design" ? "crosshair" : "default",
                    maxWidth: "100%",
                    maxHeight: "100%",
                  }}
                />
              </div>
            </div>
          </div>

          {/* Panel Derecho - Configuración */}
          <div style={{ gridColumn: "span 3 / span 3" }} className="responsive-col">
            <div className="card" style={{ height: "100%", display: "flex", flexDirection: "column" }}>
              {/* Configuración del Contenedor */}
              <div style={{ padding: "1rem", borderBottom: "1px solid #e5e7eb" }}>
                <h3
                  style={{
                    fontSize: "1.125rem",
                    fontWeight: "600",
                    marginBottom: "1rem",
                    display: "flex",
                    alignItems: "center",
                    color: "#111827",
                    margin: "0 0 1rem 0",
                  }}
                >
                  <Square style={{ marginRight: "0.5rem", height: "1.25rem", width: "1.25rem", color: "#3b82f6" }} />
                  Contenedor
                </h3>
                <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                  <div>
                    <label
                      style={{
                        display: "block",
                        fontSize: "0.875rem",
                        fontWeight: "500",
                        color: "#374151",
                        marginBottom: "0.5rem",
                      }}
                    >
                      Ancho (mm)
                    </label>
                    <input
                      type="number"
                      value={binWidth}
                      onChange={(e) => setBinWidth(Number(e.target.value))}
                      className="input-field"
                    />
                  </div>
                  <div>
                    <label
                      style={{
                        display: "block",
                        fontSize: "0.875rem",
                        fontWeight: "500",
                        color: "#374151",
                        marginBottom: "0.5rem",
                      }}
                    >
                      Alto (mm)
                    </label>
                    <input
                      type="number"
                      value={binHeight}
                      onChange={(e) => setBinHeight(Number(e.target.value))}
                      className="input-field"
                    />
                  </div>
                </div>
              </div>

              {/* Configuración del Algoritmo */}
              <div style={{ padding: "1rem", borderBottom: "1px solid #e5e7eb" }}>
                <h3
                  style={{
                    fontSize: "1.125rem",
                    fontWeight: "600",
                    marginBottom: "1rem",
                    display: "flex",
                    alignItems: "center",
                    color: "#111827",
                    margin: "0 0 1rem 0",
                  }}
                >
                  <Settings style={{ marginRight: "0.5rem", height: "1.25rem", width: "1.25rem", color: "#6366f1" }} />
                  Algoritmo
                </h3>
                <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                  <div>
                    <label
                      style={{
                        display: "block",
                        fontSize: "0.875rem",
                        fontWeight: "500",
                        color: "#374151",
                        marginBottom: "0.5rem",
                      }}
                    >
                      Tipo de Algoritmo
                    </label>
                    <select
                      value={algorithm}
                      onChange={(e) => setAlgorithm(e.target.value as Algorithm)}
                      className="select-field"
                    >
                      <option value="genetic">Genético</option>
                      <option value="bottom_left">Bottom Left</option>
                      <option value="best_fit">Best Fit</option>
                    </select>
                  </div>
                  <div>
                    <label
                      style={{
                        display: "block",
                        fontSize: "0.875rem",
                        fontWeight: "500",
                        color: "#374151",
                        marginBottom: "0.5rem",
                      }}
                    >
                      Paso de Rotación (grados)
                    </label>
                    <input
                      type="number"
                      value={rotationStep}
                      onChange={(e) => setRotationStep(Number(e.target.value))}
                      min="1"
                      max="360"
                      className="input-field"
                    />
                  </div>
                </div>
              </div>

              {/* Resultados o Instrucciones */}
              <div
                style={{
                  padding: "1rem",
                  flex: 1,
                  overflowY: "auto",
                }}
              >
                {results ? (
                  <>
                    <h3
                      style={{
                        fontSize: "1.125rem",
                        fontWeight: "600",
                        marginBottom: "1rem",
                        display: "flex",
                        alignItems: "center",
                        color: "#111827",
                        margin: "0 0 1rem 0",
                      }}
                    >
                      <Info style={{ marginRight: "0.5rem", height: "1.25rem", width: "1.25rem", color: "#10b981" }} />
                      Estadísticas
                    </h3>
                    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                      <div
                        style={{
                          backgroundColor: "#ecfdf5",
                          padding: "1rem",
                          borderRadius: "0.5rem",
                          border: "1px solid #bbf7d0",
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            marginBottom: "0.5rem",
                          }}
                        >
                          <span style={{ fontSize: "0.875rem", fontWeight: "500", color: "#065f46" }}>Utilización</span>
                          <span style={{ fontSize: "1.5rem", fontWeight: "bold", color: "#10b981" }}>
                            {results.utilization.toFixed(1)}%
                          </span>
                        </div>
                        <div className="progress-bar">
                          <div className="progress-fill" style={{ width: `${results.utilization}%` }}></div>
                        </div>
                      </div>

                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                          gap: "0.75rem",
                        }}
                      >
                        <div
                          style={{
                            backgroundColor: "#eff6ff",
                            padding: "0.75rem",
                            borderRadius: "0.5rem",
                            border: "1px solid #bfdbfe",
                          }}
                        >
                          <div
                            style={{
                              fontSize: "0.75rem",
                              fontWeight: "500",
                              color: "#1e40af",
                              marginBottom: "0.25rem",
                            }}
                          >
                            Contenedores
                          </div>
                          <div style={{ fontSize: "1.25rem", fontWeight: "bold", color: "#3b82f6" }}>
                            {results.bins_used}
                          </div>
                        </div>
                        <div
                          style={{
                            backgroundColor: "#faf5ff",
                            padding: "0.75rem",
                            borderRadius: "0.5rem",
                            border: "1px solid #d8b4fe",
                          }}
                        >
                          <div
                            style={{
                              fontSize: "0.75rem",
                              fontWeight: "500",
                              color: "#5b21b6",
                              marginBottom: "0.25rem",
                            }}
                          >
                            Tiempo (s)
                          </div>
                          <div style={{ fontSize: "1.25rem", fontWeight: "bold", color: "#8b5cf6" }}>
                            {results.computation_time.toFixed(2)}
                          </div>
                        </div>
                      </div>

                      <div
                        style={{
                          backgroundColor: "#f9fafb",
                          padding: "0.75rem",
                          borderRadius: "0.5rem",
                          border: "1px solid #e5e7eb",
                        }}
                      >
                        <div
                          style={{ fontSize: "0.75rem", fontWeight: "500", color: "#374151", marginBottom: "0.5rem" }}
                        >
                          Piezas Colocadas
                        </div>
                        <div style={{ fontSize: "1.125rem", fontWeight: "bold", color: "#111827" }}>
                          {results.placed_pieces.length}
                        </div>
                        <div style={{ fontSize: "0.75rem", color: "#6b7280", marginTop: "0.25rem" }}>
                          de {pieces.reduce((sum, piece) => sum + piece.quantity, 0)} totales
                        </div>
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <h3
                      style={{
                        fontSize: "1.125rem",
                        fontWeight: "600",
                        marginBottom: "1rem",
                        display: "flex",
                        alignItems: "center",
                        color: "#111827",
                        margin: "0 0 1rem 0",
                      }}
                    >
                      <Info style={{ marginRight: "0.5rem", height: "1.25rem", width: "1.25rem", color: "#3b82f6" }} />
                      Instrucciones
                    </h3>
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: "0.75rem",
                        fontSize: "0.875rem",
                        color: "#6b7280",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "flex-start" }}>
                        <div
                          style={{
                            backgroundColor: "#dbeafe",
                            color: "#3b82f6",
                            borderRadius: "9999px",
                            width: "1.5rem",
                            height: "1.5rem",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: "0.75rem",
                            fontWeight: "bold",
                            marginRight: "0.75rem",
                            marginTop: "0.125rem",
                            flexShrink: 0,
                          }}
                        >
                          1
                        </div>
                        <div>
                          <p style={{ fontWeight: "500", color: "#111827", margin: "0 0 0.25rem 0" }}>
                            Configura el contenedor
                          </p>
                          <p style={{ margin: 0 }}>Define las dimensiones del área de trabajo</p>
                        </div>
                      </div>
                      <div style={{ display: "flex", alignItems: "flex-start" }}>
                        <div
                          style={{
                            backgroundColor: "#dbeafe",
                            color: "#3b82f6",
                            borderRadius: "9999px",
                            width: "1.5rem",
                            height: "1.5rem",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: "0.75rem",
                            fontWeight: "bold",
                            marginRight: "0.75rem",
                            marginTop: "0.125rem",
                            flexShrink: 0,
                          }}
                        >
                          2
                        </div>
                        <div>
                          <p style={{ fontWeight: "500", color: "#111827", margin: "0 0 0.25rem 0" }}>
                            Dibuja las piezas
                          </p>
                          <p style={{ margin: 0 }}>
                            Haz clic dentro del contenedor para crear puntos, doble clic para terminar
                          </p>
                        </div>
                      </div>
                      <div style={{ display: "flex", alignItems: "flex-start" }}>
                        <div
                          style={{
                            backgroundColor: "#dbeafe",
                            color: "#3b82f6",
                            borderRadius: "9999px",
                            width: "1.5rem",
                            height: "1.5rem",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: "0.75rem",
                            fontWeight: "bold",
                            marginRight: "0.75rem",
                            marginTop: "0.125rem",
                            flexShrink: 0,
                          }}
                        >
                          3
                        </div>
                        <div>
                          <p style={{ fontWeight: "500", color: "#111827", margin: "0 0 0.25rem 0" }}>
                            Ejecuta el algoritmo
                          </p>
                          <p style={{ margin: 0 }}>Presiona "Ejecutar Nesting" para optimizar la disposición</p>
                        </div>
                      </div>
                    </div>

                    <div
                      style={{
                        marginTop: "1.5rem",
                        padding: "0.75rem",
                        backgroundColor: "#fffbeb",
                        border: "1px solid #fed7aa",
                        borderRadius: "0.5rem",
                      }}
                    >
                      <h4
                        style={{
                          fontWeight: "500",
                          color: "#92400e",
                          marginBottom: "0.5rem",
                          display: "flex",
                          alignItems: "center",
                          margin: "0 0 0.5rem 0",
                        }}
                      >
                        <Info style={{ marginRight: "0.25rem", height: "1rem", width: "1rem" }} />
                        Consejos
                      </h4>
                      <ul
                        style={{
                          fontSize: "0.75rem",
                          color: "#92400e",
                          display: "flex",
                          flexDirection: "column",
                          gap: "0.25rem",
                          margin: 0,
                          paddingLeft: "1rem",
                        }}
                      >
                        <li>Usa al menos 3 puntos para crear una pieza</li>
                        <li>Las piezas se dibujan en sentido horario</li>
                        <li>Puedes ajustar la cantidad de cada pieza</li>
                        <li>Cambia el algoritmo para diferentes resultados</li>
                      </ul>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default NestingInterface
