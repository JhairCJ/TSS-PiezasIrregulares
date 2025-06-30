import jsPDF from "jspdf"

interface PdfResults {
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

interface ConfigData {
  bin_width_real: number
  bin_height_real: number
  unit: string
  strategy: string
  allow_rotation: boolean
  rotation_angles: number[]
  margin: number
  pieces: Array<{
    id: string
    quantity: number
    points: [number, number][]
  }>
}

export const generatePDFReport = (results: PdfResults, config: ConfigData) => {
  const doc = new jsPDF()
  let yPosition = 20

  // Configuración de colores
  const primaryColor = [41, 128, 185] // Azul
  const secondaryColor = [52, 73, 94] // Gris oscuro
  const accentColor = [231, 76, 60] // Rojo
  const successColor = [39, 174, 96] // Verde

  // Colores para las piezas
  const pieceColors = [
    [255, 107, 107], // Rojo claro
    [78, 205, 196], // Turquesa
    [69, 183, 209], // Azul claro
    [150, 206, 180], // Verde claro
    [255, 234, 167], // Amarillo claro
    [221, 160, 221], // Violeta claro
    [152, 216, 200], // Verde agua
    [247, 220, 111], // Amarillo
    [187, 143, 206], // Púrpura
    [133, 193, 233], // Azul cielo
  ]

  // Función para agregar nueva página si es necesario
  const checkPageBreak = (requiredSpace: number) => {
    if (yPosition + requiredSpace > 280) {
      doc.addPage()
      yPosition = 20
    }
  }

  // Función para crear tabla manual
  const createTable = (headers: string[], rows: string[][], startY: number) => {
    const colWidth = 170 / headers.length
    const rowHeight = 8
    let currentY = startY

    // Encabezados
    doc.setFillColor(...primaryColor)
    doc.rect(20, currentY, 170, rowHeight, "F")

    doc.setTextColor(255, 255, 255)
    doc.setFontSize(10)
    doc.setFont("helvetica", "bold")

    headers.forEach((header, index) => {
      doc.text(header, 22 + index * colWidth, currentY + 5)
    })

    currentY += rowHeight

    // Filas
    doc.setTextColor(...secondaryColor)
    doc.setFont("helvetica", "normal")

    rows.forEach((row, rowIndex) => {
      // Alternar color de fondo
      if (rowIndex % 2 === 0) {
        doc.setFillColor(248, 249, 250)
        doc.rect(20, currentY, 170, rowHeight, "F")
      }

      row.forEach((cell, colIndex) => {
        doc.text(cell, 22 + colIndex * colWidth, currentY + 5)
      })

      currentY += rowHeight
    })

    return currentY
  }

  // Función para obtener color de pieza
  const getColorForPiece = (originalId: string, index: number) => {
    const colorMap: Record<string, number[]> = {
      rectangulo_1: pieceColors[0],
      triangulo_1: pieceColors[1],
      L_shape: pieceColors[2],
      pequeño_cuadrado: pieceColors[3],
    }
    return colorMap[originalId] || pieceColors[index % pieceColors.length]
  }

  // Función para dibujar un bin con sus piezas
  const drawBin = (bin: any, startX: number, startY: number, scale = 0.8) => {
    const binWidth = bin.bin_width * scale
    const binHeight = bin.bin_height * scale

    // Dibujar el contorno del contenedor
    doc.setDrawColor(100, 100, 100)
    doc.setLineWidth(1)
    doc.rect(startX, startY, binWidth, binHeight)

    // Dibujar grid de fondo
    doc.setDrawColor(220, 220, 220)
    doc.setLineWidth(0.2)

    // Líneas verticales del grid
    for (let x = 10; x < bin.bin_width; x += 10) {
      const scaledX = x * scale
      doc.line(startX + scaledX, startY, startX + scaledX, startY + binHeight)
    }

    // Líneas horizontales del grid
    for (let y = 10; y < bin.bin_height; y += 10) {
      const scaledY = y * scale
      doc.line(startX, startY + scaledY, startX + binWidth, startY + scaledY)
    }

    // Dibujar las piezas colocadas
    bin.placed_pieces.forEach((piece: any, index: number) => {
      const color = getColorForPiece(piece.original_id, index)

      // Configurar color de relleno
      doc.setFillColor(...color)
      doc.setDrawColor(60, 60, 60)
      doc.setLineWidth(0.5)

      // Convertir puntos y escalar
      const scaledPoints = piece.points.map(([x, y]: [number, number]) => [startX + x * scale, startY + y * scale])

      // Dibujar polígono (pieza)
      if (scaledPoints.length >= 3) {
        // jsPDF no tiene función polygon directa, así que usamos path
        doc.setFillColor(...color)
        doc.setDrawColor(60, 60, 60)

        // Comenzar path
        const [firstX, firstY] = scaledPoints[0]
        let pathString = `M ${firstX} ${firstY}`

        // Agregar líneas a los otros puntos
        for (let i = 1; i < scaledPoints.length; i++) {
          const [x, y] = scaledPoints[i]
          pathString += ` L ${x} ${y}`
        }

        // Cerrar path
        pathString += " Z"

        // Dibujar usando path (esto es una aproximación, jsPDF tiene limitaciones)
        // Como alternativa, usaremos rectángulos para aproximar las formas
        const minX = Math.min(...scaledPoints.map(([x]) => x))
        const maxX = Math.max(...scaledPoints.map(([x]) => x))
        const minY = Math.min(...scaledPoints.map(([, y]) => y))
        const maxY = Math.max(...scaledPoints.map(([, y]) => y))

        doc.rect(minX, minY, maxX - minX, maxY - minY, "FD")
      }

      // Agregar etiqueta de la pieza
      const centerX = scaledPoints.reduce((sum, [x]) => sum + x, 0) / scaledPoints.length
      const centerY = scaledPoints.reduce((sum, [, y]) => sum + y, 0) / scaledPoints.length

      doc.setTextColor(255, 255, 255)
      doc.setFontSize(8)
      doc.setFont("helvetica", "bold")

      const label = `${piece.original_id.split("_")[0].charAt(0).toUpperCase()}${piece.copy_number}`
      doc.text(label, centerX, centerY, { align: "center" })
    })

    return binHeight
  }

  // ENCABEZADO
  doc.setFillColor(...primaryColor)
  doc.rect(0, 0, 210, 30, "F")

  doc.setTextColor(255, 255, 255)
  doc.setFontSize(24)
  doc.setFont("helvetica", "bold")
  doc.text("INFORME DE OPTIMIZACIÓN", 105, 20, { align: "center" })

  doc.setFontSize(12)
  doc.setFont("helvetica", "normal")
  doc.text("Bin Packing - Análisis de Resultados", 105, 26, { align: "center" })

  yPosition = 45

  // INFORMACIÓN DEL DOCUMENTO
  doc.setTextColor(...secondaryColor)
  doc.setFontSize(10)
  doc.text(
    `Fecha de generación: ${new Date().toLocaleDateString("es-ES", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })}`,
    20,
    yPosition,
  )

  yPosition += 15

  // RESUMEN EJECUTIVO
  checkPageBreak(40)
  doc.setFillColor(240, 240, 240)
  doc.rect(15, yPosition - 5, 180, 8, "F")

  doc.setTextColor(...primaryColor)
  doc.setFontSize(16)
  doc.setFont("helvetica", "bold")
  doc.text("RESUMEN EJECUTIVO", 20, yPosition)
  yPosition += 15

  doc.setTextColor(...secondaryColor)
  doc.setFontSize(11)
  doc.setFont("helvetica", "normal")

  const executiveSummary = [
    `Se ha completado exitosamente la optimización de empaquetado utilizando el algoritmo ${getAlgorithmName(config.strategy)}.`,
    `Se procesaron ${config.pieces.reduce((sum, p) => sum + p.quantity, 0)} piezas de ${config.pieces.length} tipos diferentes.`,
    `El proceso utilizó ${results.summary.total_bins} contenedor(es) con una eficiencia promedio del ${results.summary.average_efficiency.toFixed(2)}%.`,
    `Tiempo total de procesamiento: ${(results.summary.total_execution_time * 1000).toFixed(0)} milisegundos.`,
  ]

  executiveSummary.forEach((line) => {
    const splitText = doc.splitTextToSize(line, 170)
    doc.text(splitText, 20, yPosition)
    yPosition += splitText.length * 5
  })

  yPosition += 15

  // PARÁMETROS DE CONFIGURACIÓN
  checkPageBreak(60)
  doc.setFillColor(240, 240, 240)
  doc.rect(15, yPosition - 5, 180, 8, "F")

  doc.setTextColor(...primaryColor)
  doc.setFontSize(16)
  doc.setFont("helvetica", "bold")
  doc.text("PARÁMETROS DE CONFIGURACIÓN", 20, yPosition)
  yPosition += 15

  const configHeaders = ["Parámetro", "Valor"]
  const configRows = [
    ["Dimensiones del contenedor", `${config.bin_width_real} × ${config.bin_height_real} ${config.unit}`],
    ["Área del contenedor", `${(config.bin_width_real * config.bin_height_real).toFixed(2)} ${config.unit}²`],
    ["Algoritmo utilizado", getAlgorithmName(config.strategy)],
    ["Rotación permitida", config.allow_rotation ? "Sí" : "No"],
    ["Ángulos de rotación", config.allow_rotation ? `${config.rotation_angles.join(", ")}°` : "N/A"],
    ["Margen entre piezas", `${config.margin} píxeles`],
    ["Unidad de medida", config.unit.toUpperCase()],
  ]

  yPosition = createTable(configHeaders, configRows, yPosition) + 15

  // RESULTADOS PRINCIPALES
  checkPageBreak(80)
  doc.setFillColor(240, 240, 240)
  doc.rect(15, yPosition - 5, 180, 8, "F")

  doc.setTextColor(...primaryColor)
  doc.setFontSize(16)
  doc.setFont("helvetica", "bold")
  doc.text("RESULTADOS PRINCIPALES", 20, yPosition)
  yPosition += 15

  // Métricas principales en cajas
  const metrics = [
    { label: "Contenedores Utilizados", value: results.summary.total_bins.toString(), color: primaryColor },
    { label: "Piezas Colocadas", value: results.summary.total_pieces_placed.toString(), color: successColor },
    {
      label: "Eficiencia Promedio",
      value: `${results.summary.average_efficiency.toFixed(2)}%`,
      color: results.summary.average_efficiency >= 80 ? successColor : accentColor,
    },
    {
      label: "Tiempo de Ejecución",
      value: `${(results.summary.total_execution_time * 1000).toFixed(0)} ms`,
      color: secondaryColor,
    },
  ]

  const boxWidth = 40
  const boxHeight = 25
  let xPos = 20

  metrics.forEach((metric, index) => {
    if (index === 2) {
      xPos = 20
      yPosition += 35
    }

    // Caja de métrica
    doc.setFillColor(...metric.color)
    doc.rect(xPos, yPosition, boxWidth, boxHeight, "F")

    // Valor
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(16)
    doc.setFont("helvetica", "bold")
    doc.text(metric.value, xPos + boxWidth / 2, yPosition + 12, { align: "center" })

    // Etiqueta
    doc.setTextColor(...secondaryColor)
    doc.setFontSize(10)
    doc.setFont("helvetica", "normal")
    doc.text(metric.label, xPos + boxWidth / 2, yPosition + 20, { align: "center" })

    xPos += boxWidth + 15
  })

  yPosition += 40

  // ANÁLISIS POR CONTENEDOR
  checkPageBreak(60)
  doc.setFillColor(240, 240, 240)
  doc.rect(15, yPosition - 5, 180, 8, "F")

  doc.setTextColor(...primaryColor)
  doc.setFontSize(16)
  doc.setFont("helvetica", "bold")
  doc.text("ANÁLISIS POR CONTENEDOR", 20, yPosition)
  yPosition += 15

  const binHeaders = ["Contenedor", "Dimensiones", "Piezas", "Eficiencia", "Tiempo"]
  const binRows = results.bins.map((bin) => [
    `Contenedor ${bin.bin_id}`,
    `${bin.bin_width} × ${bin.bin_height}`,
    bin.placed_pieces.length.toString(),
    `${bin.material_efficiency.toFixed(2)}%`,
    `${(bin.execution_time * 1000).toFixed(0)} ms`,
  ])

  yPosition = createTable(binHeaders, binRows, yPosition) + 15

  // VISUALIZACIONES DE CONTENEDORES
  checkPageBreak(100)
  doc.setFillColor(240, 240, 240)
  doc.rect(15, yPosition - 5, 180, 8, "F")

  doc.setTextColor(...primaryColor)
  doc.setFontSize(16)
  doc.setFont("helvetica", "bold")
  doc.text("VISUALIZACIONES DE CONTENEDORES", 20, yPosition)
  yPosition += 15

  // Dibujar cada contenedor
  results.bins.forEach((bin, index) => {
    // Calcular espacio necesario para este bin
    const binScale = Math.min(150 / bin.bin_width, 100 / bin.bin_height, 0.8)
    const binDisplayHeight = bin.bin_height * binScale + 40 // +40 para título y info

    checkPageBreak(binDisplayHeight + 20)

    // Título del contenedor
    doc.setTextColor(...secondaryColor)
    doc.setFontSize(14)
    doc.setFont("helvetica", "bold")
    doc.text(`Contenedor ${bin.bin_id}`, 20, yPosition)

    // Información del contenedor
    doc.setFontSize(10)
    doc.setFont("helvetica", "normal")
    doc.text(
      `Dimensiones: ${bin.bin_width} × ${bin.bin_height} | Eficiencia: ${bin.material_efficiency.toFixed(2)}% | Piezas: ${bin.placed_pieces.length}`,
      20,
      yPosition + 8,
    )

    yPosition += 20

    // Dibujar el contenedor
    const binHeight = drawBin(bin, 20, yPosition, binScale)
    yPosition += binHeight + 15

    // Leyenda de colores para este contenedor
    if (bin.placed_pieces.length > 0) {
      doc.setFontSize(9)
      doc.setFont("helvetica", "bold")
      doc.text("Leyenda:", 20, yPosition)
      yPosition += 8

      const uniquePieces = Array.from(new Set(bin.placed_pieces.map((p) => p.original_id)))
      let legendX = 20
      let legendY = yPosition

      uniquePieces.forEach((pieceId, index) => {
        const color = getColorForPiece(pieceId, index)

        // Cuadrado de color
        doc.setFillColor(...color)
        doc.rect(legendX, legendY - 3, 4, 4, "F")

        // Texto
        doc.setTextColor(...secondaryColor)
        doc.setFontSize(8)
        doc.text(pieceId, legendX + 6, legendY)

        legendX += 35
        if (legendX > 150) {
          legendX = 20
          legendY += 8
        }
      })

      yPosition = legendY + 15
    }

    // Separador entre contenedores
    if (index < results.bins.length - 1) {
      doc.setDrawColor(200, 200, 200)
      doc.line(20, yPosition, 190, yPosition)
      yPosition += 10
    }
  })

  // DETALLE DE PIEZAS
  checkPageBreak(60)
  doc.setFillColor(240, 240, 240)
  doc.rect(15, yPosition - 5, 180, 8, "F")

  doc.setTextColor(...primaryColor)
  doc.setFontSize(16)
  doc.setFont("helvetica", "bold")
  doc.text("DETALLE DE PIEZAS PROCESADAS", 20, yPosition)
  yPosition += 15

  const pieceHeaders = ["Pieza", "Solicitadas", "Colocadas", "Dimensiones", "Éxito"]
  const pieceRows = config.pieces.map((piece) => {
    const placedCount = results.bins.reduce((count, bin) => {
      return count + bin.placed_pieces.filter((p) => p.original_id === piece.id).length
    }, 0)

    const minX = Math.min(...piece.points.map(([x]) => x))
    const maxX = Math.max(...piece.points.map(([x]) => x))
    const minY = Math.min(...piece.points.map(([, y]) => y))
    const maxY = Math.max(...piece.points.map(([, y]) => y))

    const width = maxX - minX
    const height = maxY - minY

    return [
      piece.id,
      piece.quantity.toString(),
      placedCount.toString(),
      `${width.toFixed(1)} × ${height.toFixed(1)}`,
      `${((placedCount / piece.quantity) * 100).toFixed(1)}%`,
    ]
  })

  yPosition = createTable(pieceHeaders, pieceRows, yPosition) + 15

  // ANÁLISIS DE EFICIENCIA
  checkPageBreak(50)
  doc.setFillColor(240, 240, 240)
  doc.rect(15, yPosition - 5, 180, 8, "F")

  doc.setTextColor(...primaryColor)
  doc.setFontSize(16)
  doc.setFont("helvetica", "bold")
  doc.text("ANÁLISIS DE EFICIENCIA", 20, yPosition)
  yPosition += 15

  doc.setTextColor(...secondaryColor)
  doc.setFontSize(11)
  doc.setFont("helvetica", "normal")

  const totalArea = results.bins.reduce((sum, bin) => sum + bin.bin_width * bin.bin_height, 0)
  const usedArea = results.bins.reduce(
    (sum, bin) => sum + (bin.bin_width * bin.bin_height * bin.material_efficiency) / 100,
    0,
  )
  const wastedArea = totalArea - usedArea

  const efficiencyAnalysis = [
    `Área total disponible: ${totalArea.toFixed(2)} unidades²`,
    `Área utilizada: ${usedArea.toFixed(2)} unidades² (${((usedArea / totalArea) * 100).toFixed(2)}%)`,
    `Área desperdiciada: ${wastedArea.toFixed(2)} unidades² (${((wastedArea / totalArea) * 100).toFixed(2)}%)`,
    "",
    "Interpretación de resultados:",
    results.summary.average_efficiency >= 90
      ? "• Excelente eficiencia de empaquetado (≥90%)"
      : results.summary.average_efficiency >= 80
        ? "• Buena eficiencia de empaquetado (80-89%)"
        : results.summary.average_efficiency >= 70
          ? "• Eficiencia moderada de empaquetado (70-79%)"
          : "• Eficiencia baja de empaquetado (<70%)",

    results.summary.total_bins === 1
      ? "• Todas las piezas cupieron en un solo contenedor"
      : `• Se requirieron ${results.summary.total_bins} contenedores para todas las piezas`,
  ]

  efficiencyAnalysis.forEach((line) => {
    if (line) {
      const splitText = doc.splitTextToSize(line, 170)
      doc.text(splitText, 20, yPosition)
      yPosition += splitText.length * 5
    } else {
      yPosition += 5
    }
  })

  yPosition += 10

  // RECOMENDACIONES
  checkPageBreak(50)
  doc.setFillColor(240, 240, 240)
  doc.rect(15, yPosition - 5, 180, 8, "F")

  doc.setTextColor(...primaryColor)
  doc.setFontSize(16)
  doc.setFont("helvetica", "bold")
  doc.text("RECOMENDACIONES", 20, yPosition)
  yPosition += 15

  doc.setTextColor(...secondaryColor)
  doc.setFontSize(11)
  doc.setFont("helvetica", "normal")

  const recommendations = []

  if (results.summary.average_efficiency < 80) {
    recommendations.push("• Considere ajustar las dimensiones del contenedor para mejorar la eficiencia")
    recommendations.push("• Evalúe permitir más ángulos de rotación si no están habilitados")
  }

  if (results.summary.total_bins > 1) {
    recommendations.push("• Analice si es posible aumentar el tamaño del contenedor para reducir la cantidad necesaria")
  }

  if (!config.allow_rotation) {
    recommendations.push("• Considere habilitar la rotación de piezas para mejorar el empaquetado")
  }

  if (config.rotation_angles.length < 4 && config.allow_rotation) {
    recommendations.push("• Evalúe permitir más ángulos de rotación para mayor flexibilidad")
  }

  recommendations.push("• Revise si el margen entre piezas es el mínimo necesario")
  recommendations.push("• Considere agrupar piezas similares para optimizar el algoritmo")

  recommendations.forEach((rec) => {
    const splitText = doc.splitTextToSize(rec, 170)
    doc.text(splitText, 20, yPosition)
    yPosition += splitText.length * 5
  })

  // PIE DE PÁGINA
  const pageCount = doc.getNumberOfPages()
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i)
    doc.setFontSize(8)
    doc.setTextColor(128, 128, 128)
    doc.text(`Página ${i} de ${pageCount}`, 105, 290, { align: "center" })
    doc.text("Generado por Optimizador de Piezas Irregulares en Planos Rectangulares", 20, 290)
    doc.text(new Date().toLocaleDateString("es-ES"), 190, 290, { align: "right" })
  }

  // Guardar el PDF
  const fileName = `informe_bin_packing_${new Date().toISOString().split("T")[0]}.pdf`
  doc.save(fileName)
}

// Función auxiliar para obtener el nombre del algoritmo
const getAlgorithmName = (strategy: string): string => {
  const algorithms: Record<string, string> = {
    bottom_left: "Esquina Inferior Izquierda",
    best_fit: "Mejor Ajuste",
    genetic_algorithm: "Algoritmo Genético",
  }
  return algorithms[strategy] || strategy
}
