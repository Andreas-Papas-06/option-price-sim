// src/App.js
import { useState, useEffect } from "react";
import axios from "axios";

function App() {
  const [ticker, setTicker] = useState("");
  const [optionChain, setOptionChain] = useState(null);
  const [selectedExp, setSelectedExp] = useState("");
  const [selectedStrike, setSelectedStrike] = useState(null);
  const [selectedType, setSelectedType] = useState("calls");
  const [contract, setContract] = useState(null);
  const [heatmapData, setHeatmapData] = useState({
    columns: [],
    index: [],
    values: [],
  });
  const [loading, setLoading] = useState(false);
  const [rangeMin, setRangeMin] = useState(0);
  const [rangeMax, setRangeMax] = useState(0);

const getColor = (val) => {
    if (val < -90) return '#7b0202ff';
    if (val < -75) return '#aa0202ff';
    if (val < -50) return '#c60202ff';
    if (val < -30) return '#ef1e1eff';
    if (val < -15) return '#f24848ff';
    if (val < -7) return '#f97575ff'  ;
    if (val < -3) return '#fdababff';
    if (val < 3) return '#ffffff';
    if (val < 7) return '#b1f6beff';
    if (val < 15) return '#98f793ff';
    if (val < 30) return '#7df77bff';
    if (val < 50) return '#3df756ff';
    if (val < 75) return '#12c02cff';
    if (val < 100) return '#04a91dff';
    if (val >= 100) return '#038120ff';
    return "white";
  };
// Clear contract & heatmap when user changes selections
useEffect(() => {
  setContract(null);
  setHeatmapData({
    columns: [],
    index: [],
    values: [],
  });
  setRangeMin(0); 
  setRangeMax(0);
}, [selectedExp, selectedStrike, selectedType]);
  const fetchOptions = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`http://127.0.0.1:8000/options/${ticker}`);
      setOptionChain(res.data);
      setSelectedExp("");
      setSelectedStrike(null);
      setContract(null);
      setHeatmapData({ columns: [], index: [], values: [] });
    } catch (err) {
      console.error(err);
      alert("Error fetching option chain: " + (err.response?.data?.detail || err.message));
    } finally {
      setLoading(false);
    }
  };

  // Pick a contract
  const fetchContract = async () => {
    try {
      const res = await axios.post("http://127.0.0.1:8000/contract", {
        exp: selectedExp,
        strike: selectedStrike,
        chain: optionChain[selectedType],
      });
      setContract(res.data);
    } catch (err) {
      console.error(err);
      alert("Error fetching contract: " + (err.response?.data?.detail || err.message));
    }
  };

  // Generate heatmap
  const fetchHeatmap = async () => {
  if (!contract) {
    alert("No contract selected!");
    return;
  }

  try {
    const res = await axios.post("http://127.0.0.1:8000/heatmap", {
      contract: contract,
      option_type: selectedType === "calls" ? "c" : "p",
      range_max: rangeMax,
      range_min: rangeMin,
    });

    setHeatmapData(res.data); // this is the {index, columns, values} JSON
  } catch (err) {
    console.error(err);
    alert("Error generating heatmap: " + (err.response?.data?.detail || err.message));
  }
};


  return (
    <div
    className="p-6 max-w-5xl mx-auto"
    style={{ paddingBottom: "120px" }}  // 👈 prevents footer overlap
  >
      {/* Header */}
      
      <header style={{ position: "relative", width: "1600px", height: "160px" }}>
  {/* Background */}
  <img 
    src="/media/headerbackground.png" 
    alt="Option Profit Simulator" 
    style={{ width: "100%", height: "100%", objectFit: "cover" }} 
  />

  {/* Logo overlay */}
  <img 
    src="/media/transplogo.png" 
    alt="Option Profit Simulator logo" 
    style={{ 
      position: "absolute", 
      top: "50%", 
      left: "45%", 
      transform: "translate(-50%, -50%)", 
      width: "800px", 
      height: "auto" 
    }} 
  />
</header>
      <p style={{fontSize: "10px", marginbottom: '3px'}}>*All data is 15 minutes delayed*</p>
      {/* Stock Ticker */}
      <div className="flex flex-col items-center mt-4">
        <h2>Stock Ticker:</h2>
        <div className="flex gap-6 items-center">
          <input
            type="text"
            value={ticker}
            onChange={(e) => setTicker(e.target.value)}
            placeholder="Enter ticker (e.g. AAPL)"
            className="border rounded px-2"
            style={{ height: "30px" }}
          />
          
          <button
            onClick={fetchOptions}
            className="rounded-full flex items-center justify-center"
            style={{ width: "30px", height: "30px", padding: "5px", border: "none", background: "transparent", borderRadius: "50%"}}
          >
            {loading ? (
    // Spinner only
    <svg
      className="animate-spin h-5 w-5 text-white"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      ></circle>
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
      ></path>
    </svg>
  ) : (
            <img src="/media/searchticker.png" alt="search" style={{ width: '35px', height: '35px', verticalAlign: 'middle', borderRadius: "50%"}}/>
  )}
          </button>
        </div>
      </div>
      <br></br>
      {/* Option Chain */}
      {optionChain && (
        <div className="flex flex-col items-center mb-4 mt-6">
          <div className="flex gap-4 mb-2">
            <button
              onClick={() => setSelectedType("calls")}
              className={`px-3 py-1 rounded transition-colors ${
                selectedType === "calls"
                  ? "bg-[#9ca3af] text-white"
                  : "bg-[#374151] text-white hover:bg-[#424141ff]"
              }`}
              style={{
                      backgroundColor: selectedType === "calls" ? "#7f7f80ff" : "#424141ff", // lighter when active, darker otherwise
                      color: "white",
                      cursor: "pointer",
                      transition: "background-color 0.2s ease",
                     }}
            >
              Call
            </button>
            <button
              onClick={() => setSelectedType("puts")}
              className={`px-3 py-1 rounded transition-colors ${
                selectedType === "puts"
                  ? "bg-[#9ca3af] text-white"
                  : "bg-[#374151] text-white hover:bg-[#424141ff]"
              }`}
              style={{
                      backgroundColor: selectedType === "puts" ? "#7f7f80ff" : "#424141ff", // lighter when active, darker otherwise
                      color: "white",
                      cursor: "pointer",
                      transition: "background-color 0.2s ease",
                     }}
            >
              Put
            </button>
          </div>
          <h2>Expiration Date:</h2>

          {/* Expiration Dropdown */}
          <select
            value={selectedExp}
            onChange={(e) => setSelectedExp(e.target.value)}
            className="border p-2 rounded mb-2"
          >
            <option value="">Select Expiration</option>
            {Object.keys(optionChain[selectedType]).map((exp) => (
              <option key={exp} value={exp}>
                {exp}
              </option>
            ))}
          </select>

          {/* Strike Dropdown */}
          {selectedExp && (
            <select
              value={selectedStrike || ""}
              onChange={(e) => setSelectedStrike(parseFloat(e.target.value))}
              className="border p-2 rounded mb-2"
            >
              <option value="">Select Strike</option>
              {optionChain[selectedType][selectedExp].map((c) => (
                <option key={c.Strike} value={c.Strike}>
                  {c.Strike}
                </option>
              ))}
            </select>
          )}

          <button
            disabled={!selectedExp || !selectedStrike}
            onClick={fetchContract}
            className="bg-purple-500 text-white px-4 py-2 rounded mt-4"
            style={{background: "#424141ff", color: "white", borderRadius: "8px"}}
          >
            Get Contract
          </button>
        </div>
      )}

      {/* Contract Info */}
      {contract && (
        <div className="flex flex-col items-center mb-4 border p-3 rounded bg-gray-100 mt-6 w-full max-w-lg mx-auto">
          <h2 className="font-semibold mb-2">Contract Info:</h2>
          <p><strong>Contract: ${selectedStrike} {selectedExp} {selectedType}</strong></p>
          

          <button
            onClick={fetchHeatmap}
            className="bg-orange-500 text-white px-4 py-2 rounded mt-2"
            style={{background: "#424141ff", color: "white", height: "30px", width: "250px", borderRadius: "8px", fontSize: "16px"}}
          >
            <strong>Simulate</strong>
          </button>
        </div> 
      )}

      <footer style={{ position: "fixed", bottom: "0", width: "100%", height: "100px", background: "#8554ffff" }}>
        <p style={{fontSize: "12px"}}><strong>Disclaimer:</strong> All option prices, probabilities, and analytics shown on this site are estimates for informational 
          purposes only and may not reflect real market prices.<br /> No content here constitutes financial advice.<br />
          Always verify data independently before making investment decisions.
        </p>
        <strong>© 2025 Andreas Papas</strong>
      </footer>

      {/* Heatmap */}
            {heatmapData.values.length > 0 && (
        <div className="w-full h-[600px] bg-white shadow-md rounded-lg p-4 mt-6">
          <h2 className="font-semibold mb-2 text-center">Chart:</h2>

          <div className="flex items-center gap-2">
            <label className="font-medium">Custom Range: </label>
            <input
              type="number"
              value={rangeMin}
              onChange={(e) => setRangeMin(parseFloat(e.target.value))}
              placeholder="Min"
              className="border rounded p-2 w-24"
              style={{ width: "30px", height: "20px" }}
            />
            <span> - </span>
            <input
              type="number"
              value={rangeMax}
              onChange={(e) => setRangeMax(parseFloat(e.target.value))}
              placeholder="Max"
              className="border rounded p-2 w-24"
              style={{ width: "30px", height: "20px" }}
            />
          </div>

          <div className="overflow-x-auto mt-6">
            <table className="border-collapse text-xs" style={{bordercollapse: "collapse", borderSpacing: 1}}>
              <thead>
                <tr>
                  <th style={{backgroundColor: "#dcdadaff"}}>Days → Price ↓</th>
                  {heatmapData.columns.map((col, i) => (
                    <th key={i} style={{backgroundColor: "#dcdadaff"}}>{col}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {heatmapData.index.map((price, i) => (
                  <tr key={i}>
                    <td style={{backgroundColor: "#dcdadaff"}}>{price}</td>
                    {heatmapData.values[i].map((val, j) => (
                      <td
                        key={j}
                        style={{
                          backgroundColor: getColor(val),
                          border: "none",
                          textAlign: "center",
                          padding: "3px",
                        }}
                      >
                        {val.toFixed(1)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div> 
  );         
}   

export default App;


