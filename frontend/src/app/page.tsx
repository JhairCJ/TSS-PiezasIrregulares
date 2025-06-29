// src/App.jsx

import React from "react";
import NestForm from "../components/nestForm";

const App = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      <h1 className="text-2xl font-bold text-center mt-6">Nesting API Client</h1>
      <NestForm />
    </div>
  );
};

export default App;
