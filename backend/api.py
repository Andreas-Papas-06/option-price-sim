from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from backend import main
from typing import Dict, List
from fastapi.middleware.cors import CORSMiddleware


api = FastAPI()

api.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # frontend
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class ContractRequest(BaseModel):
    exp: str
    strike: float
    chain: Dict[str, List[dict]] 

class HeatmapRequest(BaseModel):
    contract: dict   # the contract returned earlier from /contract
    option_type: str = "c"   # "c" for call, "p" for put
    range_max: float = 0
    range_min: float = 0

@api.get('/')
def root():
    return {'message':"API RUNNING"}

@api.get('/options/{ticker}')
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

@api.post('/contract')
def get_contract(req: ContractRequest):
    try:
        contract = main.get_contract(req.exp, req.strike, req.chain)
        return contract
    
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error fetching contract: {str(e)}")
    
@api.post('/heatmap')
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

        df_reset = df.reset_index()
        df_melted = df_reset.melt(id_vars=df.index.name or "index", var_name="x", value_name="z")
        df_melted = df_melted.rename(columns={df.index.name or "index": "y"})

        return df_melted.to_dict(orient="records")

    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error generating heatmap: {str(e)}")

