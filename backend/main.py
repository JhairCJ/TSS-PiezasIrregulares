from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
from models import NestingRequest, NestingResponse
from nesting_service import NestingService

# Crear aplicación FastAPI
app = FastAPI(
    title="Nesting API", 
    description="API para optimización de nesting de piezas irregulares en múltiples bins",
    version="3.0.0"
)

# Configurar CORS para permitir conexiones desde React
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Instancia del servicio de nesting
nesting_service = NestingService()

@app.post("/nest", response_model=NestingResponse)
async def nest_pieces(request: NestingRequest):
    """Endpoint principal para realizar nesting de piezas en múltiples bins"""
    try:
        return nesting_service.process_nesting_request(request)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error en nesting: {str(e)}")

@app.get("/")
async def root():
    """Endpoint de prueba"""
    return {"message": "Nesting API está funcionando", "version": "3.0.0"}

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "service": "nesting-api"}

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=True)