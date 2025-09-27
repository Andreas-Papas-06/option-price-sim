// src/App.js
import { useState, useEffect } from "react";
import axios from "axios";
import Plot from "react-plotly.js";

function App() {
  const [ticker, setTicker] = useState("");
  const [optionChain, setOptionChain] = useState(null);
  const [selectedExp, setSelectedExp] = useState("");
  const [selectedStrike, setSelectedStrike] = useState(null);
  const [selectedType, setSelectedType] = useState("calls");
  const [contract, setContract] = useState(null);
  const [heatmapData, setHeatmapData] = useState([]);



// Clear contract & heatmap when user changes selections
useEffect(() => {
  setContract(null);
  setHeatmapData([]);
}, [selectedExp, selectedStrike, selectedType]);

  const fetchOptions = async () => {
    try {
      const res = await axios.get(`http://127.0.0.1:8000/options/${ticker}`);
      setOptionChain(res.data);
      setSelectedExp("");
      setSelectedStrike(null);
      setContract(null);
      setHeatmapData([]);
    } catch (err) {
      console.error(err);
      alert("Error fetching option chain: " + (err.response?.data?.detail || err.message));
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
        range_max: 0,
        range_min: 0,
      });

      console.log("Heatmap raw data:", res.data);

      // Defensive: ensure x,y,z are numbers (Plotly / sorting needs numeric types)
      const numericData = Array.isArray(res.data)
        ? res.data.map((d) => ({
            x: Number(d.x),
            y: Number(d.y),
            z: Number(d.z),
          }))
        : [];

      setHeatmapData(numericData);
    } catch (err) {
      console.error(err);
      alert("Error generating heatmap: " + (err.response?.data?.detail || err.message));
    }
  };

  // helper for building z matrix
  function buildGrid(data) {
    // extract sorted unique x and y
    const xVals = [...new Set(data.map((d) => d.x))].sort((a, b) => b - a);
    const yVals = [...new Set(data.map((d) => d.y))].sort((a, b) => a - b);

    // build z matrix where rows correspond to y (same order as yVals)
    const z = yVals.map((y) =>
      xVals.map((x) => {
        const pt = data.find((p) => p.x === x && p.y === y);
        return pt ? pt.z : null;
      })
    );

    return { xVals, yVals, z };
  }

  // simple color scaling - Plotly will show its own colorscale but you can override
  const colorscale = [
    [0, "rgba(156, 35, 1, 1)"],
    [0.2, "rgba(224, 34, 5, 1)"],
    [0.4, "rgba(251, 111, 111, 1)"],
    [0.5, "rgba(250, 250, 247, 1)"],
    [0.6, "rgba(175, 244, 180, 1)"],
    [0.8, "rgba(152, 247, 123, 1)"],
    [1, "rgba(6, 215, 23, 1)"],
  ];

  // Render layout
  const { xVals, yVals, z } = heatmapData.length ? buildGrid(heatmapData) : { xVals: [], yVals: [], z: [] };

  return (
    <div className="p-6 max-w-5xl mx-auto">
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

      <br />
      <br />

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
            <img src="/media/searchticker.png" alt="search" style={{ width: '35px', height: '35px', verticalAlign: 'middle', borderRadius: "50%"}}/>
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
              className={`px-3 py-1 rounded ${
                selectedType === "calls"
                  ? "bg-green-500 text-white"
                  : "bg-gray-200"
              }`}
            >
              Calls
            </button>
            <button
              onClick={() => setSelectedType("puts")}
              className={`px-3 py-1 rounded ${
                selectedType === "puts"
                  ? "bg-red-500 text-white"
                  : "bg-gray-200"
              }`}
            >
              Puts
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
          <p><strong>Contract: {ticker} ${selectedStrike} {selectedExp} {selectedType}</strong></p>
          

          <button
            onClick={fetchHeatmap}
            className="bg-orange-500 text-white px-4 py-2 rounded mt-2"
            style={{background: "#424141ff", color: "white", height: "30px", width: "250px", borderRadius: "8px", fontSize: "16px"}}
          >
            <strong>Simulate</strong>
          </button>
        </div>
      )}

      {/* Heatmap */}
      {heatmapData.length > 0 && (
        <div className="w-full h-[600px] bg-white shadow-md rounded-lg p-4 mt-6">
          <h2 className="font-semibold mb-2 text-center">
            Chart:
          </h2>

          <Plot
            data={[
              {
                z: z,
                x: xVals,
                y: yVals,
                type: "heatmap",
                colorscale: colorscale,
                zsmooth: "best",
                hovertemplate:
                  "Days: %{x}<br>Price: %{y}<br>Z: %{z}<extra></extra>",
              },
            ]}
            layout={{
              autosize: true,
              margin: { t: 40, r: 40, l: 60, b: 60 },
              xaxis: { title: "Days to Expiration" },
              yaxis: { title: "Underlying Price" },
            }}
            style={{ width: "100%", height: "100%" }}
            useResizeHandler={true}
          />
        </div>
      )}
    </div>
  );
}

export default App;


