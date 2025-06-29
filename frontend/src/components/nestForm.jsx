// src/components/NestForm.jsx
"use client";
import React, { useState } from "react";
import { postNestData } from "../services/nestAPI"

const NestForm = () => {
  const [response, setResponse] = useState(null);
  const [error, setError] = useState(null);

  const handleNest = async () => {
    const requestData = {
      pieces: [
        {
          id: "pieza1",
          points: [
            { x: 0, y: 0 },
            { x: 10, y: 0 },
            { x: 10, y: 5 },
            { x: 0, y: 5 }
          ],
          quantity: 2
        }
      ],
      bin_width: 100,
      bin_height: 50,
      algorithm: "genetic",
      rotation_step: 90
    };

    try {
      const data = await postNestData(requestData);
      setResponse(data);
      setError(null);
    } catch (err) {
      setError("No se pudo obtener respuesta del servidor.");
      setResponse(null);
    }
  };

  return (
    <div className="p-4 max-w-xl mx-auto">
      <button onClick={handleNest} className="bg-blue-500 text-white px-4 py-2 rounded">
        Enviar datos de nesting
      </button>

      {response && (
        <pre className="bg-gray-100 p-4 mt-4 rounded">
          {JSON.stringify(response, null, 2)}
        </pre>
      )}

      {error && <p className="text-red-500 mt-4">{error}</p>}
    </div>
  );
};

export default NestForm;
