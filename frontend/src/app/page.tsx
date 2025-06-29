"use client";
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Upload, Play, Settings, Download, Trash2, RotateCw, Move, Square, Info } from 'lucide-react';
import { postNestData } from '../services/nestAPI'

// Tipos TypeScript
interface Point2D {
  x: number;
  y: number;
}

interface PieceData {
  id: string;
  points: Point2D[];
  quantity: number;
}

interface PlacedPiece {
  id: string;
  points: Point2D[];
  x: number;
  y: number;
  rotation: number;
}

interface NestingRequest {
  pieces: PieceData[];
  bin_width: number;
  bin_height: number;
  algorithm: 'genetic' | 'bottom_left' | 'best_fit';
  rotation_step: number;
}

interface NestingResponse {
  placed_pieces: PlacedPiece[];
  bins_used: number;
  utilization: number;
  computation_time: number;
}

type Tool = 'draw' | 'select';
type Algorithm = 'genetic' | 'bottom_left' | 'best_fit';

interface Offset {
  x: number;
  y: number;
}

const NestingInterface: React.FC = () => {
  const [pieces, setPieces] = useState<PieceData[]>([]);
  const [binWidth, setBinWidth] = useState<number>(1000);
  const [binHeight, setBinHeight] = useState<number>(800);
  const [algorithm, setAlgorithm] = useState<Algorithm>('genetic');
  const [rotationStep, setRotationStep] = useState<number>(90);
  const [results, setResults] = useState<NestingResponse | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [currentTool, setCurrentTool] = useState<Tool>('draw');
  const [currentPiece, setCurrentPiece] = useState<Point2D[]>([]);
  const [isDrawing, setIsDrawing] = useState<boolean>(false);
  const [scale, setScale] = useState<number>(0.5);
  const [offset, setOffset] = useState<Offset>({ x: 50, y: 50 });
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Configuración del canvas
  const drawCanvas = useCallback((ctx: CanvasRenderingContext2D): void => {
    const canvas = ctx.canvas;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Dibujar fondo
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Dibujar bin
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 2;
    ctx.strokeRect(
      offset.x,
      offset.y,
      binWidth * scale,
      binHeight * scale
    );
    
    // Etiqueta del bin
    ctx.fillStyle = '#475569';
    ctx.font = '12px sans-serif';
    ctx.fillText(
      `Bin: ${binWidth} x ${binHeight}`,
      offset.x,
      offset.y - 5
    );

    if (results) {
      // Dibujar piezas colocadas
      results.placed_pieces.forEach((piece, index) => {
        ctx.save();
        
        const colors = [
          '#ef4444', '#f97316', '#eab308', '#22c55e',
          '#06b6d4', '#3b82f6', '#8b5cf6', '#ec4899'
        ];
        ctx.fillStyle = colors[index % colors.length] + '40';
        ctx.strokeStyle = colors[index % colors.length];
        ctx.lineWidth = 2;
        
        // Dibujar polígono
        if (piece.points && piece.points.length > 0) {
          ctx.beginPath();
          const firstPoint = piece.points[0];
          ctx.moveTo(
            offset.x + firstPoint.x * scale,
            offset.y + firstPoint.y * scale
          );
          
          piece.points.slice(1).forEach(point => {
            ctx.lineTo(
              offset.x + point.x * scale,
              offset.y + point.y * scale
            );
          });
          
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
          
          // Etiqueta de la pieza
          ctx.fillStyle = '#1e293b';
          ctx.font = '10px sans-serif';
          ctx.fillText(
            piece.id,
            offset.x + piece.x * scale + 5,
            offset.y + piece.y * scale + 15
          );
        }
        
        ctx.restore();
      });
    } else {
      // Dibujar piezas sin colocar
      pieces.forEach((piece, index) => {
        ctx.save();
        
        const colors = [
          '#ef4444', '#f97316', '#eab308', '#22c55e',
          '#06b6d4', '#3b82f6', '#8b5cf6', '#ec4899'
        ];
        ctx.fillStyle = colors[index % colors.length] + '60';
        ctx.strokeStyle = colors[index % colors.length];
        ctx.lineWidth = 2;
        
        // Posición inicial para mostrar las piezas
        const startX = offset.x + binWidth * scale + 50;
        const startY = offset.y + index * 100;
        
        if (piece.points && piece.points.length > 0) {
          ctx.beginPath();
          const firstPoint = piece.points[0];
          ctx.moveTo(startX + firstPoint.x * scale, startY + firstPoint.y * scale);
          
          piece.points.slice(1).forEach(point => {
            ctx.lineTo(startX + point.x * scale, startY + point.y * scale);
          });
          
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
          
          // Etiqueta
          ctx.fillStyle = '#1e293b';
          ctx.font = '12px sans-serif';
          ctx.fillText(piece.id, startX, startY - 10);
          ctx.fillText(`Qty: ${piece.quantity}`, startX, startY + 80);
        }
        
        ctx.restore();
      });
    }
    
    // Dibujar pieza actual siendo dibujada
    if (currentPiece.length > 0) {
      ctx.save();
      ctx.strokeStyle = '#dc2626';
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]);
      
      ctx.beginPath();
      const firstPoint = currentPiece[0];
      ctx.moveTo(firstPoint.x, firstPoint.y);
      
      currentPiece.slice(1).forEach(point => {
        ctx.lineTo(point.x, point.y);
      });
      
      ctx.stroke();
      
      // Dibujar puntos
      ctx.fillStyle = '#dc2626';
      currentPiece.forEach(point => {
        ctx.beginPath();
        ctx.arc(point.x, point.y, 3, 0, 2 * Math.PI);
        ctx.fill();
      });
      
      ctx.restore();
    }
  }, [pieces, results, binWidth, binHeight, scale, offset, currentPiece]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        drawCanvas(ctx);
      }
    }
  }, [drawCanvas]);

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>): void => {
    if (currentTool !== 'draw') return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    if (!isDrawing) {
      setIsDrawing(true);
      setCurrentPiece([{ x, y }]);
    } else {
      setCurrentPiece(prev => [...prev, { x, y }]);
    }
  };

  const handleCanvasDoubleClick = (): void => {
    if (currentTool === 'draw' && currentPiece.length >= 3) {
      finishDrawing();
    }
  };

  const finishDrawing = (): void => {
    if (currentPiece.length >= 3) {
      // Convertir coordenadas del canvas a coordenadas del mundo
      const worldPoints: Point2D[] = currentPiece.map(point => ({
        x: (point.x - offset.x) / scale,
        y: (point.y - offset.y) / scale
      }));
      
      const newPiece: PieceData = {
        id: `Pieza_${pieces.length + 1}`,
        points: worldPoints,
        quantity: 1
      };
      
      setPieces(prev => [...prev, newPiece]);
    }
    
    setCurrentPiece([]);
    setIsDrawing(false);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target?.result as string);
        if (data.pieces && Array.isArray(data.pieces)) {
          setPieces(data.pieces);
        } else {
          alert('Formato de archivo inválido');
        }
      } catch (error) {
        alert('Error al leer el archivo: ' + (error as Error).message);
      }
    };
    reader.readAsText(file);
  };

  const handleNesting = async (): Promise<void> => {
    if (pieces.length === 0) {
      alert('Agrega al menos una pieza antes de procesar');
      return;
    }
    
    setIsProcessing(true);
    setResults(null);
    
    try {
      const requestData: NestingRequest = {
        pieces,
        bin_width: binWidth,
        bin_height: binHeight,
        algorithm,
        rotation_step: rotationStep
      };
      
      const result = await postNestData(requestData);
      setResults(result);
    } catch (error) {
      alert('Error al procesar nesting: ' + (error as Error).message);
    } finally {
      setIsProcessing(false);
    }
  };

  const clearPieces = (): void => {
    setPieces([]);
    setResults(null);
    setCurrentPiece([]);
    setIsDrawing(false);
  };

  const deletePiece = (index: number): void => {
    setPieces(prev => prev.filter((_, i) => i !== index));
    setResults(null);
  };

  const updatePieceQuantity = (index: number, quantity: number): void => {
    setPieces(prev => prev.map((piece, i) => 
      i === index ? { ...piece, quantity: Math.max(1, quantity) } : piece
    ));
    setResults(null);
  };

  const exportResults = (): void => {
    if (!results) return;
    
    const dataStr = JSON.stringify(results, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'nesting_results.json';
    link.click();
    URL.revokeObjectURL(url);
  };

  const addSamplePieces = (): void => {
    const samples: PieceData[] = [
      {
        id: 'Rectángulo',
        points: [
          { x: 0, y: 0 },
          { x: 100, y: 0 },
          { x: 100, y: 60 },
          { x: 0, y: 60 }
        ],
        quantity: 3
      },
      {
        id: 'Triángulo',
        points: [
          { x: 0, y: 0 },
          { x: 80, y: 0 },
          { x: 40, y: 70 }
        ],
        quantity: 2
      },
      {
        id: 'L-Shape',
        points: [
          { x: 0, y: 0 },
          { x: 60, y: 0 },
          { x: 60, y: 30 },
          { x: 30, y: 30 },
          { x: 30, y: 90 },
          { x: 0, y: 90 }
        ],
        quantity: 2
      }
    ];
    setPieces(samples);
    setResults(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Sistema de Nesting de Piezas Irregulares
          </h1>
          <p className="text-gray-600">
            Optimiza la disposición de piezas en contenedores usando algoritmos avanzados
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Panel de Control */}
          <div className="lg:col-span-1 space-y-4">
            {/* Configuración del Bin */}
            <div className="bg-white rounded-lg shadow-md p-4">
              <h3 className="text-lg font-semibold mb-3 flex items-center">
                <Square className="mr-2 h-5 w-5" />
                Configuración del Contenedor
              </h3>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Ancho
                  </label>
                  <input
                    type="number"
                    value={binWidth}
                    onChange={(e) => setBinWidth(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Alto
                  </label>
                  <input
                    type="number"
                    value={binHeight}
                    onChange={(e) => setBinHeight(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>

            {/* Configuración del Algoritmo */}
            <div className="bg-white rounded-lg shadow-md p-4">
              <h3 className="text-lg font-semibold mb-3 flex items-center">
                <Settings className="mr-2 h-5 w-5" />
                Algoritmo
              </h3>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tipo
                  </label>
                  <select
                    value={algorithm}
                    onChange={(e) => setAlgorithm(e.target.value as Algorithm)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="genetic">Genético</option>
                    <option value="bottom_left">Bottom-Left</option>
                    <option value="best_fit">Best Fit</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Paso de Rotación (°)
                  </label>
                  <input
                    type="number"
                    value={rotationStep}
                    onChange={(e) => setRotationStep(Number(e.target.value))}
                    min="1"
                    max="180"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>

            {/* Herramientas */}
            <div className="bg-white rounded-lg shadow-md p-4">
              <h3 className="text-lg font-semibold mb-3">Herramientas</h3>
              <div className="space-y-2">
                <button
                  onClick={() => setCurrentTool('draw')}
                  className={`w-full flex items-center justify-center px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    currentTool === 'draw'
                      ? 'bg-blue-100 text-blue-700 border-2 border-blue-300'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  <Move className="mr-2 h-4 w-4" />
                  Dibujar Pieza
                </button>
                
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  accept=".json"
                  className="hidden"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full flex items-center justify-center px-3 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 text-sm font-medium transition-colors"
                >
                  <Upload className="mr-2 h-4 w-4" />
                  Cargar JSON
                </button>
                
                <button
                  onClick={addSamplePieces}
                  className="w-full flex items-center justify-center px-3 py-2 bg-green-100 text-green-700 rounded-md hover:bg-green-200 text-sm font-medium transition-colors"
                >
                  <Info className="mr-2 h-4 w-4" />
                  Piezas de Ejemplo
                </button>
                
                <button
                  onClick={clearPieces}
                  className="w-full flex items-center justify-center px-3 py-2 bg-red-100 text-red-700 rounded-md hover:bg-red-200 text-sm font-medium transition-colors"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Limpiar Todo
                </button>
              </div>
            </div>

            {/* Lista de Piezas */}
            <div className="bg-white rounded-lg shadow-md p-4">
              <h3 className="text-lg font-semibold mb-3">
                Piezas ({pieces.length})
              </h3>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {pieces.map((piece, index) => (
                  <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                    <div className="flex-1">
                      <div className="text-sm font-medium">{piece.id}</div>
                      <div className="flex items-center space-x-2 mt-1">
                        <span className="text-xs text-gray-500">Qty:</span>
                        <input
                          type="number"
                          value={piece.quantity}
                          onChange={(e) => updatePieceQuantity(index, Number(e.target.value))}
                          min="1"
                          className="w-12 px-1 py-0.5 text-xs border border-gray-300 rounded"
                        />
                      </div>
                    </div>
                    <button
                      onClick={() => deletePiece(index)}
                      className="text-red-500 hover:text-red-700 p-1"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Botón de Procesamiento */}
            <button
              onClick={handleNesting}
              disabled={isProcessing || pieces.length === 0}
              className={`w-full flex items-center justify-center px-4 py-3 rounded-md text-white font-medium transition-colors ${
                isProcessing || pieces.length === 0
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700'
              }`}
            >
              {isProcessing ? (
                <>
                  <RotateCw className="mr-2 h-5 w-5 animate-spin" />
                  Procesando...
                </>
              ) : (
                <>
                  <Play className="mr-2 h-5 w-5" />
                  Ejecutar Nesting
                </>
              )}
            </button>
          </div>

          {/* Área de Visualización */}
          <div className="lg:col-span-3">
            <div className="bg-white rounded-lg shadow-md p-4">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">
                  Visualización
                  {currentTool === 'draw' && (
                    <span className="ml-2 text-sm text-blue-600">
                      (Haz clic para dibujar, doble clic para terminar)
                    </span>
                  )}
                </h3>
                <div className="flex items-center space-x-2">
                  <label className="text-sm text-gray-600">Zoom:</label>
                  <input
                    type="range"
                    min="0.1"
                    max="2"
                    step="0.1"
                    value={scale}
                    onChange={(e) => setScale(Number(e.target.value))}
                    className="w-20"
                  />
                  <span className="text-sm text-gray-600">{Math.round(scale * 100)}%</span>
                  {results && (
                    <button
                      onClick={exportResults}
                      className="ml-4 flex items-center px-3 py-1 bg-green-600 text-white rounded-md hover:bg-green-700 text-sm"
                    >
                      <Download className="mr-1 h-4 w-4" />
                      Exportar
                    </button>
                  )}
                </div>
              </div>
              
              <canvas
                ref={canvasRef}
                width={800}
                height={600}
                onClick={handleCanvasClick}
                onDoubleClick={handleCanvasDoubleClick}
                className="border border-gray-300 rounded cursor-crosshair"
              />
              
              {isDrawing && currentPiece.length > 0 && (
                <div className="mt-2 flex items-center space-x-2">
                  <button
                    onClick={finishDrawing}
                    disabled={currentPiece.length < 3}
                    className={`px-3 py-1 rounded text-sm ${
                      currentPiece.length >= 3
                        ? 'bg-green-600 text-white hover:bg-green-700'
                        : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    }`}
                  >
                    Terminar Pieza ({currentPiece.length} puntos)
                  </button>
                  <button
                    onClick={() => {
                      setCurrentPiece([]);
                      setIsDrawing(false);
                    }}
                    className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700"
                  >
                    Cancelar
                  </button>
                </div>
              )}
            </div>

            {/* Resultados */}
            {results && (
              <div className="mt-4 bg-white rounded-lg shadow-md p-4">
                <h3 className="text-lg font-semibold mb-3">Resultados del Nesting</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">
                      {results.placed_pieces.length}
                    </div>
                    <div className="text-sm text-gray-600">Piezas Colocadas</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">
                      {results.bins_used}
                    </div>
                    <div className="text-sm text-gray-600">Contenedores</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-purple-600">
                      {results.utilization.toFixed(1)}%
                    </div>
                    <div className="text-sm text-gray-600">Utilización</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-orange-600">
                      {results.computation_time.toFixed(2)}s
                    </div>
                    <div className="text-sm text-gray-600">Tiempo</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default NestingInterface;