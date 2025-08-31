import math
from scipy.stats import norm
import yfinance as yf
from datetime import datetime
from decimal import Decimal
import numpy as np
import pandas as pd

def clean_dict(obj):
    if isinstance(obj, dict):
        return {k: clean_dict(v) for k, v in obj.items()}
    elif isinstance(obj, list):
        return [clean_dict(x) for x in obj]
    elif isinstance(obj, float) and math.isnan(obj):
        return None
    else:
        return obj
# Get option chain for ticker
def get_options_chain(ticker):
    stock = yf.Ticker(ticker)
    exp_dates = stock.options
    underlying_price = stock.fast_info["last_price"]
    all_calls = {}
    all_puts = {}

    for exp_date in exp_dates:
        
        options = stock.option_chain(exp_date)
        
        calls_data = []
        puts_data = []

        for call in options.calls.itertuples():
            call_data = {
                "Contract Name": call.contractSymbol,
                "Strike": call.strike,
                "Last Price": call.lastPrice,
                "Bid": call.bid,
                "Ask": call.ask,
                "Change": call.change,
                "% Change": call.percentChange,
                "Volume": call.volume if call.volume is not None else "-",
                "Open Interest": call.openInterest if call.openInterest is not None else "-",
                "Implied Volatility": f"{call.impliedVolatility * 100:.2f}%" if call.impliedVolatility else "-",
                "Underlying Price": underlying_price
            }
            calls_data.append(call_data)

        all_calls[exp_date] = calls_data

        for put in options.puts.itertuples():
            put_data = {
                "Contract Name": put.contractSymbol,
                "Strike": put.strike,
                "Last Price": put.lastPrice,
                "Bid": put.bid,
                "Ask": put.ask,
                "Change": put.change,
                "% Change": put.percentChange,
                "Volume": put.volume if put.volume is not None else "-",
                "Open Interest": put.openInterest if put.openInterest is not None else "-",
                "Implied Volatility": f"{put.impliedVolatility * 100:.2f}%" if put.impliedVolatility else "-",
                "Underlying Price": underlying_price
            }
            puts_data.append(put_data)

        all_puts[exp_date] = puts_data
    
    return all_calls, all_puts

#calls, puts = get_options_chain("AMD")

def get_contract(exp, strikep, chain):
    # [Underlying Price, Strike Price, Time to exp, Vol, intrest rate]
    option_data = []
    for date in chain:
        if exp == date:
            for contract in chain[date]:
                if strikep == contract["Strike"]:
                    option_data.append(contract["Underlying Price"])
                    option_data.append(contract["Strike"])
                    today = datetime.today().date()
                    exp_datef = datetime.strptime(exp, "%Y-%m-%d").date()
                    option_data.append(((exp_datef - today).days)/365.00)
                    option_data.append(float(contract["Implied Volatility"].replace('%', '')) / 100.00)
                    irx = yf.Ticker("^IRX")
                    rate = irx.history(period="1d")["Close"].iloc[-1] / 100
                    option_data.append(float(rate))
                    option_data.append(contract["Last Price"])
                    return option_data

# Get Contract from option chain    
#contract = get_contract("2025-09-05", 180.0, calls)
#print(contract)

def blackscholes(under_price, strike_price, time, vol, intrest, types='c'):
    if time == 0:
        time = 0.0000001
    d1 = (np.log(under_price/strike_price) + (intrest + vol**2/2)*time)/(vol*np.sqrt(time))
    d2 = d1 - vol*np.sqrt(time)
    try:
        if types == "c":
            price = under_price*norm.cdf(d1, 0, 1) - strike_price*np.exp(-intrest*time)*norm.cdf(d2, 0, 1)
        elif types =="p":
            price = strike_price*np.exp(-intrest*time)*norm.cdf(-d2, 0, 1) - under_price*norm.cdf(-d1, 0, 1)
    except:
        print("ERROR")
    return price

#p = blackscholes(166.62, 170, 3/365, 0.595, 0.0409)
#print(p)

def make_heat_map(under_price, strike_price, time, vol, intrest, option_price, types='c', range_max=0, range_min=0):
    if time*365 < 51:
        cols = list(range(round(time*365), -1, -1))
    else:
        step = round(time*365/50)
        cols = list(range(round(time*365), -1, -step))
    
    # Rows: 30 prices, each +1% increase from previous, bottom = price
    if time*365 <= 30:
        percent_inc = 1.005
        percent_dec = 0.995
    else:
        percent_inc = 1.01
        percent_dec = 0.99

    if range_max == 0 and range_min == 0:
        if types == 'c':
            pricesi = [round(under_price * (percent_inc)**i, 2) for i in range(25)]
            pricesd = [round(under_price * (percent_dec)**i, 2) for i in range(5)]
            pricesd = pricesd[::-1]
            prices = pricesd + pricesi
        elif types == 'p':
            pricesi = [round(under_price * (percent_inc)**i, 2) for i in range(5)]
            pricesd = [round(under_price * (percent_dec)**i, 2) for i in range(25)]
            pricesd = pricesd[::-1]
            prices = pricesd + pricesi
    elif range_max > range_min and (range_max > 0 and range_min >= 0):
        new_range = range_max - range_min
        increment = new_range/30
        prices = [round(range_min + increment*i, 2) for i in range(30)]
    else:
        print("INVALID RANGE")

    
    
    prices = prices[::-1]
    df = pd.DataFrame(np.tile(prices, (len(cols), 1)).T, columns=cols, index=prices)
    for row_label in df.index:
        for col_label in df.columns:
            df.at[row_label, col_label] = round((blackscholes(row_label, strike_price, col_label/365.00, vol, intrest, types) - option_price)/option_price*100, 1)
    
    return df

#chart = make_heat_map(*contract)
#print(chart)



