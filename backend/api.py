from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from backend import main


api = FastAPI()

@api.get('/')
def root():
    return {'message':"API RUNNING"}

@api.get('/options/{ticker}')
def get_option_chain(ticker: str):
    try:
        calls, puts = main.get_options_chain(ticker)

        # Clean NaNs in entire data
        calls = main.clean_dict(calls)
        puts = main.clean_dict(puts)

        if not calls and not puts:
            raise ValueError("No option data found")

        return {"calls": calls, "puts": puts}

    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid ticker or error fetching options: {str(e)}")
