from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from fastapi.responses import JSONResponse
from backend import main
from typing import Dict, List
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pathlib import Path
import os


api = FastAPI()

#api.add_middleware(
   # CORSMiddleware,
    #allow_origins=["http://localhost:3000"],  
    #allow_credentials=True,
    #allow_methods=["*"],
    #allow_headers=["*"],
#)
# Mount the React build folder as static files
BASE_DIR = Path(__file__).resolve().parent.parent
FRONTEND_DIR = BASE_DIR / "frontend" / "build"

if FRONTEND_DIR.exists():
    api.mount("/static", StaticFiles(directory=FRONTEND_DIR / "static"), name="static")

    @api.get("/")
    async def serve_react():
        return FileResponse(FRONTEND_DIR / "index.html")
else:
    print(f"Frontend directory not found at {FRONTEND_DIR}")

class ContractRequest(BaseModel):
    exp: str
    strike: float
    chain: Dict[str, List[dict]] 

class HeatmapRequest(BaseModel):
    contract: dict   
    option_type: str = "c"   # "c" for call, "p" for put
    range_max: float = 0
    range_min: float = 0

@api.get('/api/')
def root():
    return {'message':"API RUNNING"}

@api.get('/api/options/{ticker}')
def get_option_chain(ticker: str):
    try:
        calls, puts = main.get_options_chain(ticker)

        
        calls = main.clean_dict(calls)
        puts = main.clean_dict(puts)

        if not calls and not puts:
            raise ValueError("No option data found")

        return {"calls": calls, "puts": puts}

    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid ticker or error fetching options: {str(e)}")

@api.post('/api/contract')
def get_contract(req: ContractRequest):
    try:
        contract = main.get_contract(req.exp, req.strike, req.chain)
        return contract
    
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error fetching contract: {str(e)}")
    
@api.post('/api/heatmap')
def generate_heatmap(req: HeatmapRequest):
    try:
        contract = req.contract

        df = main.make_heat_map(
            under_price=contract["under_price"],
            strike_price=contract["strike_price"],
            time=contract["time"],
            vol=contract["vol"],
            intrest=contract["intrest"],
            option_price=contract["option_price"],
            types=req.option_type,
            range_max=req.range_max,
            range_min=req.range_min
        )

        data = {
            "index": df.index.tolist(),      # price levels
            "columns": df.columns.tolist(),  # days to expiration
            "values": df.values.tolist()     # 2D matrix of cell values
        }

        return JSONResponse(content=data)

    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error generating heatmap: {str(e)}")

