"use client";
import React, { useState, useRef } from 'react';
import { Upload, Play, RotateCcw, Download, Eye, Settings } from 'lucide-react';

// Servicio API
const postNestData = async (data) => {
  try {
    const response = await fetch("http://127.0.0.1:8000/nest", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error(`Error ${response.status}: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Error en la solicitud:", error);
    throw error;
  }
};

// Componente de visualización del bin
const BinVisualization = ({ bin, scale = 2 }) => {
  const colors = [
    '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
    '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9'
  ];

  const getColorForPiece = (originalId, index) => {
    const colorMap = {
      'rectangulo_1': colors[0],
      'triangulo_1': colors[1],
      'L_shape': colors[2],
      'pequeño_cuadrado': colors[3]
    };
    return colorMap[originalId] || colors[index % colors.length];
  };

  return (
    <div className="bg-white p-4 rounded-lg shadow-lg">
      <h3 className="text-lg font-semibold mb-4 text-gray-800">
        Bin {bin.bin_id} - Eficiencia: {bin.material_efficiency.toFixed(2)}%
      </h3>
      
      <div className="relative border-2 border-gray-300 inline-block">
        <svg 
          width={bin.bin_width * scale} 
          height={bin.bin_height * scale}
          className="bg-gray-50"
        >
          {/* Grid de fondo */}
          <defs>
            <pattern id="grid" width="10" height="10" patternUnits="userSpaceOnUse">
              <path d="M 10 0 L 0 0 0 10" fill="none" stroke="#e5e7eb" strokeWidth="0.5"/>
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
          
          {/* Piezas colocadas */}
          {bin.placed_pieces.map((piece, index) => {
            const color = getColorForPiece(piece.original_id, index);
            const points = piece.points.map(([x, y]) => `${x * scale},${y * scale}`).join(' ');
            
            return (
              <g key={piece.id}>
                <polygon
                  points={points}
                  fill={color}
                  stroke="#374151"
                  strokeWidth="1"
                  opacity="0.8"
                />
                <text
                  x={(piece.points.reduce((sum, [x]) => sum + x, 0) / piece.points.length) * scale}
                  y={(piece.points.reduce((sum, [, y]) => sum + y, 0) / piece.points.length) * scale}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fontSize="10"
                  fill="#1f2937"
                  fontWeight="bold"
                >
                  {piece.original_id.split('_')[0].charAt(0).toUpperCase()}{piece.copy_number}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
      
      <div className="mt-4 text-sm text-gray-600">
        <p>Dimensiones: {bin.bin_width} × {bin.bin_height}</p>
        <p>Piezas colocadas: {bin.placed_pieces.length}</p>
        <p>Tiempo de ejecución: {(bin.execution_time * 1000).toFixed(2)}ms</p>
      </div>
    </div>
  );
};

// Componente principal
const BinPackingApp = () => {
  const [inputData, setInputData] = useState({
    pieces: [
      {
        id: "rectangulo_1",
        points: [[0, 0], [50, 0], [50, 30], [0, 30]],
        quantity: 3
      },
      {
        id: "triangulo_1",
        points: [[0, 0], [40, 0], [20, 35]],
        quantity: 2
      },
      {
        id: "L_shape",
        points: [[0, 0], [60, 0], [60, 20], [20, 20], [20, 50], [0, 50]],
        quantity: 2
      },
      {
        id: "pequeño_cuadrado",
        points: [[0, 0], [15, 0], [15, 15], [0, 15]],
        quantity: 5
      }
    ],
    bin_width: 200,
    bin_height: 150,
    allow_rotation: true,
    rotation_angles: [0, 90, 180, 270],
    margin: 2,
    strategy: "bottom_left"
  });

  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const fileInputRef = useRef(null);

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await postNestData(inputData);
      setResults(response);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = JSON.parse(e.target.result);
          setInputData(data);
        } catch (err) {
          setError('Error al parsear el archivo JSON');
        }
      };
      reader.readAsText(file);
    }
  };

  const downloadResults = () => {
    if (results) {
      const dataStr = JSON.stringify(results, null, 2);
      const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
      const exportFileDefaultName = 'bin_packing_results.json';
      
      const linkElement = document.createElement('a');
      linkElement.setAttribute('href', dataUri);
      linkElement.setAttribute('download', exportFileDefaultName);
      linkElement.click();
    }
  };

  const updateInputField = (field, value) => {
    setInputData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-7xl mx-auto">
        <header className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Optimizador de Bin Packing
          </h1>
          <p className="text-gray-600">
            Visualiza y optimiza el empaquetado de piezas geométricas
          </p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Panel de configuración */}
          <div className="lg:col-span-1">
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
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </div>

              {/* Configuración del bin */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Ancho del Bin
                  </label>
                  <input
                    type="number"
                    value={inputData.bin_width}
                    onChange={(e) => updateInputField('bin_width', parseInt(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Alto del Bin
                  </label>
                  <input
                    type="number"
                    value={inputData.bin_height}
                    onChange={(e) => updateInputField('bin_height', parseInt(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Margen
                  </label>
                  <input
                    type="number"
                    value={inputData.margin}
                    onChange={(e) => updateInputField('margin', parseInt(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="allow_rotation"
                    checked={inputData.allow_rotation}
                    onChange={(e) => updateInputField('allow_rotation', e.target.checked)}
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
                  onClick={handleSubmit}
                  disabled={loading}
                  className="w-full flex items-center justify-center px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors disabled:opacity-50"
                >
                  {loading ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  ) : (
                    <Play className="mr-2" size={16} />
                  )}
                  {loading ? 'Procesando...' : 'Optimizar'}
                </button>

                {results && (
                  <button
                    onClick={downloadResults}
                    className="w-full flex items-center justify-center px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors"
                  >
                    <Download className="mr-2" size={16} />
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
          </div>

          {/* Panel de resultados */}
          <div className="lg:col-span-2">
            {error && (
              <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
                <strong>Error:</strong> {error}
              </div>
            )}

            {results && (
              <div className="space-y-6">
                {/* Resumen */}
                <div className="bg-white rounded-lg shadow-lg p-6">
                  <h2 className="text-xl font-semibold mb-4 flex items-center">
                    <Eye className="mr-2" size={20} />
                    Resumen de Optimización
                  </h2>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center p-4 bg-blue-50 rounded-lg">
                      <div className="text-2xl font-bold text-blue-600">
                        {results.summary.total_bins}
                      </div>
                      <div className="text-sm text-gray-600">Bins utilizados</div>
                    </div>
                    
                    <div className="text-center p-4 bg-green-50 rounded-lg">
                      <div className="text-2xl font-bold text-green-600">
                        {results.summary.total_pieces_placed}
                      </div>
                      <div className="text-sm text-gray-600">Piezas colocadas</div>
                    </div>
                    
                    <div className="text-center p-4 bg-purple-50 rounded-lg">
                      <div className="text-2xl font-bold text-purple-600">
                        {results.summary.average_efficiency.toFixed(2)}%
                      </div>
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
            )}

            {!results && !loading && (
              <div className="bg-white rounded-lg shadow-lg p-12 text-center">
                <div className="text-gray-400 mb-4">
                  <Eye size={48} className="mx-auto" />
                </div>
                <h3 className="text-xl font-medium text-gray-600 mb-2">
                  Listo para optimizar
                </h3>
                <p className="text-gray-500">
                  Configura los parámetros y presiona "Optimizar" para ver los resultados
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default BinPackingApp;