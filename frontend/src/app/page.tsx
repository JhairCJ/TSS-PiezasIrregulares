"use client";
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Upload, Play, Settings, Download, Trash2, RotateCw, Move, Square, Info, Plus, Eye, Edit3 } from 'lucide-react';
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

type Tool = 'draw' | 'select' | 'view';
type Algorithm = 'genetic' | 'bottom_left' | 'best_fit';
type ViewMode = 'design' | 'result';

const NestingInterface: React.FC = () => {
  const [pieces, setPieces] = useState<PieceData[]>([]);
  const [binWidth, setBinWidth] = useState<number>(800);
  const [binHeight, setBinHeight] = useState<number>(600);
  const [algorithm, setAlgorithm] = useState<Algorithm>('genetic');
  const [rotationStep, setRotationStep] = useState<number>(90);
  const [results, setResults] = useState<NestingResponse | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [currentTool, setCurrentTool] = useState<Tool>('draw');
  const [currentPiece, setCurrentPiece] = useState<Point2D[]>([]);
  const [isDrawing, setIsDrawing] = useState<boolean>(false);
  const [viewMode, setViewMode] = useState<ViewMode>('design');
  const [selectedPiece, setSelectedPiece] = useState<number | null>(null);
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Configuración del canvas
  const CANVAS_WIDTH = 800;
  const CANVAS_HEIGHT = 600;
  const MARGIN = 20;
  const BIN_START_X = MARGIN;
  const BIN_START_Y = MARGIN;

  // Calcular escala para que el bin quepa en el área designada
  const availableWidth = CANVAS_WIDTH - MARGIN * 2;
  const availableHeight = CANVAS_HEIGHT - MARGIN * 2;
  const scaleX = availableWidth / binWidth;
  const scaleY = availableHeight / binHeight;
  const scale = Math.min(scaleX, scaleY, 1); // Máximo escala 1:1

  const drawCanvas = useCallback((ctx: CanvasRenderingContext2D): void => {
    const canvas = ctx.canvas;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Fondo del canvas
    ctx.fillStyle = '#f1f5f9';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Área del bin
    const binPixelWidth = binWidth * scale;
    const binPixelHeight = binHeight * scale;
    
    // Fondo del bin
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(BIN_START_X, BIN_START_Y, binPixelWidth, binPixelHeight);
    
    // Borde del bin
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 2;
    ctx.strokeRect(BIN_START_X, BIN_START_Y, binPixelWidth, binPixelHeight);
    
    // Etiqueta del bin
    ctx.fillStyle = '#475569';
    ctx.font = 'bold 14px sans-serif';
    ctx.fillText(
      `Contenedor: ${binWidth} × ${binHeight} mm`,
      BIN_START_X,
      BIN_START_Y - 8
    );

    if (viewMode === 'result' && results) {
      // Dibujar piezas colocadas
      results.placed_pieces.forEach((piece, index) => {
        ctx.save();
        
        const colors = [
          '#ef4444', '#f97316', '#eab308', '#22c55e',
          '#06b6d4', '#3b82f6', '#8b5cf6', '#ec4899'
        ];
        const color = colors[index % colors.length];
        ctx.fillStyle = color + '40';
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        
        if (piece.points && piece.points.length > 0) {
          ctx.beginPath();
          const firstPoint = piece.points[0];
          ctx.moveTo(
            BIN_START_X + (piece.x + firstPoint.x) * scale,
            BIN_START_Y + (piece.y + firstPoint.y) * scale
          );
          
          piece.points.slice(1).forEach(point => {
            ctx.lineTo(
              BIN_START_X + (piece.x + point.x) * scale,
              BIN_START_Y + (piece.y + point.y) * scale
            );
          });
          
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
          
          // Etiqueta de la pieza
          ctx.fillStyle = '#1f2937';
          ctx.font = 'bold 12px sans-serif';
          ctx.fillText(
            piece.id,
            BIN_START_X + piece.x * scale + 5,
            BIN_START_Y + piece.y * scale + 15
          );
        }
        
        ctx.restore();
      });
    }
    
    // Dibujar pieza actual siendo dibujada
    if (viewMode === 'design' && currentPiece.length > 0) {
      ctx.save();
      ctx.strokeStyle = '#dc2626';
      ctx.fillStyle = '#dc262620';
      ctx.lineWidth = 3;
      
      if (currentPiece.length > 2) {
        ctx.beginPath();
        const firstPoint = currentPiece[0];
        ctx.moveTo(firstPoint.x, firstPoint.y);
        
        currentPiece.slice(1).forEach(point => {
          ctx.lineTo(point.x, point.y);
        });
        
        ctx.closePath();
        ctx.fill();
      }
      
      ctx.setLineDash([8, 4]);
      ctx.beginPath();
      if (currentPiece.length > 0) {
        ctx.moveTo(currentPiece[0].x, currentPiece[0].y);
        currentPiece.slice(1).forEach(point => {
          ctx.lineTo(point.x, point.y);
        });
      }
      ctx.stroke();
      
      // Dibujar puntos
      ctx.setLineDash([]);
      ctx.fillStyle = '#dc2626';
      currentPiece.forEach((point, index) => {
        ctx.beginPath();
        ctx.arc(point.x, point.y, 4, 0, 2 * Math.PI);
        ctx.fill();
        
        // Número del punto
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 10px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText((index + 1).toString(), point.x, point.y + 3);
        ctx.fillStyle = '#dc2626';
        ctx.textAlign = 'left';
      });
      
      ctx.restore();
    }

    // Mostrar instrucciones de dibujo
    if (viewMode === 'design' && currentTool === 'draw') {
      ctx.fillStyle = '#64748b';
      ctx.font = '14px sans-serif';
      const instructions = isDrawing 
        ? `Puntos: ${currentPiece.length} - Doble clic para terminar (mín. 3 puntos)`
        : 'Haz clic dentro del contenedor para comenzar a dibujar';
      ctx.fillText(instructions, BIN_START_X, CANVAS_HEIGHT - 10);
    }
  }, [pieces, results, binWidth, binHeight, scale, currentPiece, viewMode, currentTool, isDrawing]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        drawCanvas(ctx);
      }
    }
  }, [drawCanvas]);

  const isPointInBin = (x: number, y: number): boolean => {
    const binPixelWidth = binWidth * scale;
    const binPixelHeight = binHeight * scale;
    return x >= BIN_START_X && x <= BIN_START_X + binPixelWidth &&
           y >= BIN_START_Y && y <= BIN_START_Y + binPixelHeight;
  };

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>): void => {
  if (currentTool !== 'draw' || viewMode !== 'design') return;
  
  const canvas = canvasRef.current;
  if (!canvas) return;
  
  const rect = canvas.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;
  
  // Coordenadas relativas al canvas
  const canvasX = x * (canvas.width / rect.width);
  const canvasY = y * (canvas.height / rect.height);
  
  // Verificar que el punto esté dentro del área del contenedor
  if (canvasX < 0 || canvasX > binWidth || canvasY < 0 || canvasY > binHeight) {
    if (isDrawing) {
      alert('Por favor dibuja solo dentro del área del contenedor');
    }
    return;
  }
  
  if (!isDrawing) {
    setIsDrawing(true);
    setCurrentPiece([{ x: canvasX, y: canvasY }]);
  } else {
    setCurrentPiece(prev => [...prev, { x: canvasX, y: canvasY }]);
  }
};

  const handleCanvasDoubleClick = (e: React.MouseEvent<HTMLCanvasElement>): void => {
    if (currentTool === 'draw' && currentPiece.length >= 3 && viewMode === 'design') {
      e.preventDefault();
      finishDrawing();
    }
  };

  const finishDrawing = (): void => {
    if (currentPiece.length >= 3) {
      // Convertir coordenadas del canvas a coordenadas del mundo
      const worldPoints: Point2D[] = currentPiece.map(point => ({
        x: (point.x - BIN_START_X) / scale,
        y: (point.y - BIN_START_Y) / scale
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
          setViewMode('design');
          setResults(null);
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
      setViewMode('result');
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
    setViewMode('design');
    setSelectedPiece(null);
  };

  const deletePiece = (index: number): void => {
    setPieces(prev => prev.filter((_, i) => i !== index));
    setResults(null);
    if (selectedPiece === index) {
      setSelectedPiece(null);
    }
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
          { x: 120, y: 0 },
          { x: 120, y: 80 },
          { x: 0, y: 80 }
        ],
        quantity: 3
      },
      {
        id: 'Triángulo',
        points: [
          { x: 0, y: 0 },
          { x: 100, y: 0 },
          { x: 50, y: 87 }
        ],
        quantity: 2
      },
      {
        id: 'Forma_L',
        points: [
          { x: 0, y: 0 },
          { x: 80, y: 0 },
          { x: 80, y: 40 },
          { x: 40, y: 40 },
          { x: 40, y: 120 },
          { x: 0, y: 120 }
        ],
        quantity: 2
      }
    ];
    setPieces(samples);
    setResults(null);
    setViewMode('design');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <div className="flex h-screen">
        {/* Panel Izquierdo - Piezas */}
        <div className="w-80 bg-white rounded-lg shadow-md border border-gray-200 flex flex-col">
          {/* Header del Panel */}
          <div className="p-4 border-b border-gray-200 bg-gradient-to-r from-blue-600 to-indigo-600">
            <h2 className="text-xl font-bold text-white flex items-center">
              <Square className="mr-2 h-6 w-6" />
              Piezas de Trabajo
            </h2>
            <p className="text-blue-100 text-sm mt-1">
              {pieces.length} pieza{pieces.length !== 1 ? 's' : ''} definida{pieces.length !== 1 ? 's' : ''}
            </p>
          </div>

          {/* Herramientas de Piezas */}
          <div className="p-4 border-b border-gray-200 bg-gray-50">
            <div className="grid grid-cols-2 gap-2 mb-3">
              <button
                onClick={addSamplePieces}
                className="flex items-center justify-center px-3 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 text-sm font-medium transition-colors"
              >
                <Plus className="mr-1 h-4 w-4" />
                Ejemplos
              </button>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center justify-center px-3 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 text-sm font-medium transition-colors"
              >
                <Upload className="mr-1 h-4 w-4" />
                Cargar
              </button>
            </div>
            <button
              onClick={clearPieces}
              disabled={pieces.length === 0}
              className="w-full flex items-center justify-center px-3 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 text-sm font-medium transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Limpiar Todo
            </button>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              accept=".json"
              className="hidden"
            />
          </div>

          {/* Lista de Piezas */}
          <div className="flex-1 overflow-y-auto p-4">
            {pieces.length === 0 ? (
              <div className="text-center text-gray-500 mt-8">
                <Square className="mx-auto h-12 w-12 text-gray-300 mb-4" />
                <p className="text-lg font-medium mb-2">No hay piezas</p>
                <p className="text-sm">Dibuja una pieza o carga ejemplos para comenzar</p>
              </div>
            ) : (
              <div className="space-y-3">
                {pieces.map((piece, index) => (
                  <div 
                    key={index} 
                    className={`p-4 rounded-lg border-2 transition-all cursor-pointer ${
                      selectedPiece === index 
                        ? 'border-blue-500 bg-blue-50 shadow-md' 
                        : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm'
                    }`}
                    onClick={() => setSelectedPiece(selectedPiece === index ? null : index)}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-semibold text-gray-900">{piece.id}</h4>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deletePiece(index);
                        }}
                        className="text-red-500 hover:text-red-700 p-1 rounded hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                    
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-gray-600">Cantidad:</span>
                      <input
                        type="number"
                        value={piece.quantity}
                        onChange={(e) => {
                          e.stopPropagation();
                          updatePieceQuantity(index, Number(e.target.value));
                        }}
                        min="1"
                        className="w-16 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                        onClick={(e) => e.stopPropagation()}
                      />
                    </div>
                    
                    <div className="text-xs text-gray-500">
                      {piece.points.length} vértices
                    </div>
                    
                    {selectedPiece === index && (
                      <div className="mt-3 pt-3 border-t border-gray-200">
                        <div className="text-xs text-gray-600">
                          <strong>Coordenadas:</strong>
                          <div className="mt-1 max-h-20 overflow-y-auto">
                            {piece.points.map((point, i) => (
                              <div key={i} className="flex justify-between">
                                <span>P{i + 1}:</span>
                                <span>({point.x.toFixed(1)}, {point.y.toFixed(1)})</span>
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

        {/* Área Principal */}
        <div className="flex-1 bg-white rounded-lg shadow-md border border-gray-200 flex flex-col">
          {/* Barra de Herramientas Superior */}
          <div className="p-3 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <h1 className="text-2xl font-bold text-gray-900">
                  Sistema de Nesting
                </h1>
                
                {/* Selector de Modo */}
                <div className="flex bg-gray-100 rounded-lg p-1">
                  <button
                    onClick={() => setViewMode('design')}
                    className={`flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                      viewMode === 'design'
                        ? 'bg-white text-blue-700 shadow-sm'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    <Edit3 className="mr-2 h-4 w-4" />
                    Diseño
                  </button>
                  <button
                    onClick={() => setViewMode('result')}
                    disabled={!results}
                    className={`flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                      viewMode === 'result' && results
                        ? 'bg-white text-green-700 shadow-sm'
                        : 'text-gray-400 cursor-not-allowed'
                    }`}
                  >
                    <Eye className="mr-2 h-4 w-4" />
                    Resultado
                  </button>
                </div>
              </div>

              {/* Herramientas de Dibujo */}
              {viewMode === 'design' && (
                <div className="flex items-center space-x-2">
                  <div className="flex bg-gray-100 rounded-lg p-1">
                    <button
                      onClick={() => setCurrentTool('draw')}
                      className={`flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                        currentTool === 'draw'
                          ? 'bg-white text-blue-700 shadow-sm'
                          : 'text-gray-600 hover:text-gray-900'
                      }`}
                    >
                      <Move className="mr-2 h-4 w-4" />
                      Dibujar
                    </button>
                  </div>
                  
                  {isDrawing && (
                    <div className="flex items-center space-x-2 ml-4">
                      <button
                        onClick={finishDrawing}
                        disabled={currentPiece.length < 3}
                        className={`px-3 py-2 rounded-lg text-sm font-medium ${
                          currentPiece.length >= 3
                            ? 'bg-green-500 text-white hover:bg-green-600'
                            : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                        }`}
                      >
                        Terminar ({currentPiece.length})
                      </button>
                      <button
                        onClick={() => {
                          setCurrentPiece([]);
                          setIsDrawing(false);
                        }}
                        className="px-3 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 text-sm font-medium"
                      >
                        Cancelar
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Área de Canvas */}
          <div className="flex-1 flex">
            {/* Canvas Principal */}
            <div className="flex-1 p-6">
              <div className="bg-white rounded-xl shadow-lg border border-gray-200 h-full flex flex-col">
                <div className="p-4 border-b border-gray-200">
                  <div className="flex justify-between items-center">
                    <h3 className="text-lg font-semibold text-gray-900">
                      {viewMode === 'design' ? 'Área de Diseño' : 'Resultado del Nesting'}
                    </h3>
                    <div className="flex items-center space-x-2 text-sm text-gray-600">
                      <span>Escala: {Math.round(scale * 100)}%</span>
                      {results && viewMode === 'result' && (
                        <button
                          onClick={exportResults}
                          className="ml-4 flex items-center px-3 py-1 bg-green-500 text-white rounded-lg hover:bg-green-600 text-sm"
                        >
                          <Download className="mr-1 h-4 w-4" />
                          Exportar
                        </button>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="flex-1 p-4 overflow-hidden">
                  <canvas
                    ref={canvasRef}
                    width={CANVAS_WIDTH}
                    height={CANVAS_HEIGHT}
                    onClick={handleCanvasClick}
                    onDoubleClick={handleCanvasDoubleClick}
                    className={`border-2 border-gray-300 rounded-lg shadow-inner ${
                      currentTool === 'draw' && viewMode === 'design' 
                        ? 'cursor-crosshair' 
                        : 'cursor-default'
                    }`}
                    style={{ maxWidth: '100%', maxHeight: '100%' }}
                  />
                </div>
              </div>
            </div>

            {/* Panel Derecho - Configuración */}
            <div className="w-80 bg-white rounded-lg shadow-md border border-gray-200 flex flex-col">
              {/* Configuración del Contenedor */}
              <div className="p-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold mb-4 flex items-center text-gray-900">
                  <Square className="mr-2 h-5 w-5" />
                  Contenedor
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Ancho (mm)
                    </label>
                    <input
                      type="number"
                      value={binWidth}
                      onChange={(e) => setBinWidth(Number(e.target.value))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Alto (mm)
                    </label>
                    <input
                      type="number"
                      value={binHeight}
                      onChange={(e) => setBinHeight(Number(e.target.value))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>

              {/* Configuración del Algoritmo */}
              <div className="p-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold mb-4 flex items-center text-gray-900">
                  <Settings className="mr-2 h-5 w-5" />
                  Algoritmo
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Tipo de Algoritmo
                    </label>
                    <select
                      value={algorithm}
                      onChange={(e) => setAlgorithm(e.target.value as Algorithm)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="genetic">Genético</option>
                      <option value="bottom_left">Bottom Left</option>
                      <option value="best_fit">Best Fit</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Paso de Rotación (grados)
                    </label>
                    <input
                      type="number"
                      value={rotationStep}
                      onChange={(e) => setRotationStep(Number(e.target.value))}
                      min="1"
                      max="360"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>

              {/* Botón de Procesamiento */}
              <div className="p-4 border-b border-gray-200">
                <button
                  onClick={handleNesting}
                  disabled={pieces.length === 0 || isProcessing}
                  className={`w-full flex items-center justify-center px-4 py-3 rounded-lg font-semibold text-white transition-all duration-200 ${
                    pieces.length === 0 || isProcessing
                      ? 'bg-gray-400 cursor-not-allowed'
                      : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5'
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

              {/* Resultados */}
              {results && (
                <div className="p-4 flex-1 overflow-y-auto">
                  <h3 className="text-lg font-semibold mb-4 flex items-center text-gray-900">
                    <Info className="mr-2 h-5 w-5" />
                    Estadísticas
                  </h3>
                  <div className="space-y-4">
                    <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-4 rounded-lg border border-green-200">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm font-medium text-green-800">Utilización</span>
                        <span className="text-2xl font-bold text-green-600">
                          {results.utilization.toFixed(1)}%
                        </span>
                      </div>
                      <div className="w-full bg-green-200 rounded-full h-2">
                        <div 
                          className="bg-gradient-to-r from-green-500 to-emerald-500 h-2 rounded-full transition-all duration-500"
                          style={{ width: `${results.utilization}%` }}
                        ></div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
                        <div className="text-xs font-medium text-blue-800 mb-1">Contenedores</div>
                        <div className="text-xl font-bold text-blue-600">{results.bins_used}</div>
                      </div>
                      <div className="bg-purple-50 p-3 rounded-lg border border-purple-200">
                        <div className="text-xs font-medium text-purple-800 mb-1">Tiempo (s)</div>
                        <div className="text-xl font-bold text-purple-600">{results.computation_time.toFixed(2)}</div>
                      </div>
                    </div>

                    <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                      <div className="text-xs font-medium text-gray-700 mb-2">Piezas Colocadas</div>
                      <div className="text-lg font-bold text-gray-800">{results.placed_pieces.length}</div>
                      <div className="text-xs text-gray-600 mt-1">
                        de {pieces.reduce((sum, piece) => sum + piece.quantity, 0)} totales
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Información de Ayuda */}
              {!results && (
                <div className="p-4 flex-1">
                  <h3 className="text-lg font-semibold mb-4 flex items-center text-gray-900">
                    <Info className="mr-2 h-5 w-5" />
                    Instrucciones
                  </h3>
                  <div className="space-y-3 text-sm text-gray-600">
                    <div className="flex items-start">
                      <div className="bg-blue-100 text-blue-600 rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold mr-3 mt-0.5">1</div>
                      <div>
                        <p className="font-medium text-gray-800">Configura el contenedor</p>
                        <p>Define las dimensiones del área de trabajo</p>
                      </div>
                    </div>
                    <div className="flex items-start">
                      <div className="bg-blue-100 text-blue-600 rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold mr-3 mt-0.5">2</div>
                      <div>
                        <p className="font-medium text-gray-800">Dibuja las piezas</p>
                        <p>Haz clic dentro del contenedor para crear puntos, doble clic para terminar</p>
                      </div>
                    </div>
                    <div className="flex items-start">
                      <div className="bg-blue-100 text-blue-600 rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold mr-3 mt-0.5">3</div>
                      <div>
                        <p className="font-medium text-gray-800">Ejecuta el algoritmo</p>
                        <p>Presiona "Ejecutar Nesting" para optimizar la disposición</p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                    <h4 className="font-medium text-amber-800 mb-2 flex items-center">
                      <Info className="mr-1 h-4 w-4" />
                      Consejos
                    </h4>
                    <ul className="text-xs text-amber-700 space-y-1">
                      <li>• Usa al menos 3 puntos para crear una pieza</li>
                      <li>• Las piezas se dibujan en sentido horario</li>
                      <li>• Puedes ajustar la cantidad de cada pieza</li>
                      <li>• Cambia el algoritmo para diferentes resultados</li>
                    </ul>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NestingInterface;