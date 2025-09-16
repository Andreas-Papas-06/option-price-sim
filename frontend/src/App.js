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

  // Fetch option chain
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
    const xVals = [...new Set(data.map((d) => d.x))].sort((a, b) => a - b);
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
    [0, "rgb(0,204,0)"],
    [0.25, "rgb(102,255,102)"],
    [0.5, "rgb(179,255,179)"],
    [0.6, "rgb(255,213,128)"],
    [0.8, "rgb(255,102,102)"],
    [1, "rgb(255,0,0)"],
  ];

  // Render layout
  const { xVals, yVals, z } = heatmapData.length ? buildGrid(heatmapData) : { xVals: [], yVals: [], z: [] };

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Options Simulator</h1>

      {/* Ticker Input */}
      <div className="flex gap-2 mb-4">
        <input
          type="text"
          value={ticker}
          onChange={(e) => setTicker(e.target.value)}
          placeholder="Enter ticker (e.g. AAPL)"
          className="border rounded p-2 flex-grow"
        />
        <button onClick={fetchOptions} className="bg-blue-500 text-white px-4 py-2 rounded">
          Fetch Options
        </button>
      </div>

      {/* Option Chain */}
      {optionChain && (
        <div className="mb-4">
          <div className="flex gap-4 mb-2">
            <button
              onClick={() => setSelectedType("calls")}
              className={`px-3 py-1 rounded ${selectedType === "calls" ? "bg-green-500 text-white" : "bg-gray-200"}`}
            >
              Calls
            </button>
            <button
              onClick={() => setSelectedType("puts")}
              className={`px-3 py-1 rounded ${selectedType === "puts" ? "bg-red-500 text-white" : "bg-gray-200"}`}
            >
              Puts
            </button>
          </div>

          {/* Expiration Dropdown */}
          <select value={selectedExp} onChange={(e) => setSelectedExp(e.target.value)} className="border p-2 rounded mb-2 w-full">
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
              className="border p-2 rounded mb-2 w-full"
            >
              <option value="">Select Strike</option>
              {optionChain[selectedType][selectedExp].map((c) => (
                <option key={c.Strike} value={c.Strike}>
                  {c.Strike}
                </option>
              ))}
            </select>
          )}

          <button disabled={!selectedExp || !selectedStrike} onClick={fetchContract} className="bg-purple-500 text-white px-4 py-2 rounded">
            Get Contract
          </button>
        </div>
      )}

      {/* Contract Info */}
      {contract && (
        <div className="mb-4 border p-3 rounded bg-gray-100">
          <h2 className="font-semibold mb-2">Contract Info</h2>
          <pre className="text-sm">{JSON.stringify(contract, null, 2)}</pre>

          <button onClick={fetchHeatmap} className="bg-orange-500 text-white px-4 py-2 rounded mt-2">
            Generate Heatmap
          </button>
        </div>
      )}

      {/* Heatmap (Plotly) */}
      {heatmapData.length > 0 && (
        <div className="w-full h-[600px] bg-white shadow-md rounded-lg p-4">
          <h2 className="font-semibold mb-2">Heatmap Visualization</h2>

          <Plot
            data={[
              {
                z: z,
                x: xVals,
                y: yVals,
                type: "heatmap",
                colorscale: colorscale,
                zsmooth: "best",
                hovertemplate: "Days: %{x}<br>Price: %{y}<br>Z: %{z}<extra></extra>",
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


