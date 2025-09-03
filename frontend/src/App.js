import { useState } from "react";
import axios from "axios";
import {
  ResponsiveContainer,
  ScatterChart,
  XAxis,
  YAxis,
  ZAxis,
  CartesianGrid,
  Tooltip,
  Scatter,
} from "recharts";

function App() {
  const [ticker, setTicker] = useState("");
  const [optionChain, setOptionChain] = useState(null);
  const [selectedExp, setSelectedExp] = useState("");
  const [selectedStrike, setSelectedStrike] = useState(null);
  const [selectedType, setSelectedType] = useState("calls");
  const [contract, setContract] = useState(null);
  const [heatmap, setHeatmap] = useState(null);
  const [heatmapData, setHeatmapData] = useState([]);

  // Fetch option chain
  const fetchOptions = async () => {
    try {
      const res = await axios.get(`http://127.0.0.1:8000/options/${ticker}`);
      setOptionChain(res.data);
      setSelectedExp("");
      setSelectedStrike(null);
      setContract(null);
      setHeatmap(null);
      setHeatmapData([]);
    } catch (err) {
      alert("Error fetching option chain: " + err.response?.data?.detail);
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
      alert("Error fetching contract: " + err.response?.data?.detail);
    }
  };

  // Generate heatmap
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

    console.log("Heatmap raw data:", res.data); // Debug: see backend response

    setHeatmap(res.data);

    // Convert backend dict into array for Recharts
    const cols = Object.keys(res.data);
    if (cols.length === 0) {
      alert("Heatmap returned empty data.");
      setHeatmapData([]);
      return;
    }

    const rows = Object.keys(res.data[cols[0]]);
    const formatted = [];

    rows.forEach((row) => {
      cols.forEach((col) => {
        let z = parseFloat(res.data[col][row]);
        if (isNaN(z)) z = 0; // fallback if value is null or invalid

        formatted.push({
          x: parseFloat(col),      // days to expiration
          y: parseFloat(row),      // underlying price
          z: z,                    // % change
        });
      });
    });

    console.log("Formatted heatmap data:", formatted); // Debug: see array ready for chart
    setHeatmapData(formatted);
  } catch (err) {
    console.error(err);
    alert("Error generating heatmap: " + err.response?.data?.detail || err.message);
  }
};


  // Custom color scale
  const getColor = (z) => {
    if (z > 50) return "#ff0000"; // deep red (overpriced)
    if (z > 20) return "#ff6666";
    if (z > 0) return "#ffd580";
    if (z > -20) return "#b3ffb3";
    if (z > -50) return "#66ff66";
    return "#00cc00"; // deep green (undervalued)
  };

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Options Heatmap Tool</h1>

      {/* Ticker Input */}
      <div className="flex gap-2 mb-4">
        <input
          type="text"
          value={ticker}
          onChange={(e) => setTicker(e.target.value)}
          placeholder="Enter ticker (e.g. AAPL)"
          className="border rounded p-2 flex-grow"
        />
        <button
          onClick={fetchOptions}
          className="bg-blue-500 text-white px-4 py-2 rounded"
        >
          Fetch Options
        </button>
      </div>

      {/* Option Chain */}
      {optionChain && (
        <div className="mb-4">
          <div className="flex gap-4 mb-2">
            <button
              onClick={() => setSelectedType("calls")}
              className={`px-3 py-1 rounded ${
                selectedType === "calls" ? "bg-green-500 text-white" : "bg-gray-200"
              }`}
            >
              Calls
            </button>
            <button
              onClick={() => setSelectedType("puts")}
              className={`px-3 py-1 rounded ${
                selectedType === "puts" ? "bg-red-500 text-white" : "bg-gray-200"
              }`}
            >
              Puts
            </button>
          </div>

          {/* Expiration Dropdown */}
          <select
            value={selectedExp}
            onChange={(e) => setSelectedExp(e.target.value)}
            className="border p-2 rounded mb-2 w-full"
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

          <button
            disabled={!selectedExp || !selectedStrike}
            onClick={fetchContract}
            className="bg-purple-500 text-white px-4 py-2 rounded"
          >
            Get Contract
          </button>
        </div>
      )}

      {/* Contract Info */}
      {contract && (
        <div className="mb-4 border p-3 rounded bg-gray-100">
          <h2 className="font-semibold mb-2">Contract Info</h2>
          <pre className="text-sm">{JSON.stringify(contract, null, 2)}</pre>

          <button
            onClick={fetchHeatmap}
            className="bg-orange-500 text-white px-4 py-2 rounded mt-2"
          >
            Generate Heatmap
          </button>
        </div>
      )}

      {/* Heatmap Chart */}
      {heatmapData.length > 0 && (
        <div className="w-full h-[500px] bg-white shadow-md rounded-lg p-4">
          <h2 className="font-semibold mb-2">Heatmap Visualization</h2>
          <ResponsiveContainer width="100%" height="100%">
            <ScatterChart>
              <CartesianGrid />
              <XAxis type="number" dataKey="x" name="Days" unit="d" />
              <YAxis type="number" dataKey="y" name="Price" />
              <ZAxis type="number" dataKey="z" range={[50, 400]} />
              <Tooltip cursor={{ strokeDasharray: "3 3" }} />
              <Scatter
                data={heatmapData}
                shape={(props) => {
                  const { cx, cy, payload } = props;
                  return (
                    <rect
                      x={cx - 5}
                      y={cy - 5}
                      width={10}
                      height={10}
                      fill={getColor(payload.z)}
                      stroke="black"
                      strokeWidth={0.2}
                    />
                  );
                }}
              />
            </ScatterChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

export default App;

