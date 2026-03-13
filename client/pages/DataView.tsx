import { useState, useEffect } from "react";
import { Search, Download, Database, X, ArrowLeft, RefreshCw, AlertCircle } from "lucide-react";
import { Link } from "react-router-dom";
import * as XLSX from "xlsx";

export default function DataView() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchPrn, setSearchPrn] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/data");
      const json = await res.json();
      if (json.success) {
        setData(json.data);
      } else {
        setError(json.message || "Failed to load data.");
      }
    } catch (err: any) {
      setError("Network error fetching data. Make sure API and MongoDB credentials are set.");
    } finally {
      setLoading(false);
    }
  };

  const downloadExcel = () => {
    if (data.length === 0) return;
    const table = document.getElementById("consolidated-table");
    if (!table) return;

    const ws = XLSX.utils.table_to_sheet(table);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Farmers Data");

    const dateStr = new Date().toISOString().split("T")[0];
    const filename = searchPrn ? `PRN_${searchPrn}_Data_${dateStr}.xlsx` : `Complete_Data_${dateStr}.xlsx`;
    XLSX.writeFile(wb, filename);
  };

  const filteredData = data.filter((item) => {
    if (!searchPrn) return true;
    return String(item.prn_no).includes(searchPrn);
  });

  const renderValue = (val: any, className = "text-emerald-700 bg-emerald-50 font-medium") => {
    if (val === null || val === undefined || val === "") return <td className="p-3 border-b text-slate-400 italic bg-slate-50">0</td>;
    if (typeof val === "number") {
      const formatted = Math.abs(val) < 1 ? val.toFixed(4) : val % 1 !== 0 ? val.toFixed(2) : val;
      return <td className={`p-3 border-b ${className}`}>{formatted}</td>;
    }
    return <td className={`p-3 border-b ${className}`}>{val}</td>;
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8">
      <div className="max-w-[1600px] mx-auto">
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <div>
            <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-3">
              <Database className="w-8 h-8 text-emerald-600" />
              Complete Farmer Data View
            </h1>
            <p className="text-slate-500 mt-1 pl-11">Consolidated view of all deployed sensor & manual data.</p>
          </div>
          <div className="flex gap-3 w-full md:w-auto">
            <Link to="/upload" className="btn btn-secondary whitespace-nowrap bg-white text-slate-700 border border-slate-300 hover:bg-slate-50">
              <ArrowLeft className="w-4 h-4" />
              Upload Data
            </Link>
            <button onClick={fetchData} className="btn bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-300" title="Refresh Data">
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-emerald-600" : ""}`} />
            </button>
            <button onClick={downloadExcel} className="btn btn-primary whitespace-nowrap shadow-md">
              <Download className="w-4 h-4" />
              Export Excel
            </button>
          </div>
        </header>

        {error && (
          <div className="mb-6 p-4 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg flex items-center gap-3">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <p>{error}</p>
          </div>
        )}

        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
          <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-center gap-4 bg-slate-50/50">
            <div className="relative w-full max-w-sm">
              <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search by PRN Number..."
                value={searchPrn}
                onChange={(e) => setSearchPrn(e.target.value)}
                className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-shadow bg-white"
              />
              {searchPrn && (
                <button onClick={() => setSearchPrn("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
            <div className="text-sm font-medium text-slate-500 bg-white px-4 py-2 rounded-full border border-slate-200 shadow-sm">
              Showing {filteredData.length} Records
            </div>
          </div>

          <div className="overflow-x-auto w-full relative h-[70vh] custom-scrollbar">
            {loading ? (
              <div className="absolute inset-0 z-10 bg-white/50 backdrop-blur-sm flex items-center justify-center">
                <RefreshCw className="w-8 h-8 text-emerald-500 animate-spin" />
              </div>
            ) : filteredData.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full p-12 text-slate-400">
                <Database className="w-16 h-16 mb-4 text-slate-300" />
                <h3 className="text-xl font-medium text-slate-600">No Data Found</h3>
                <p>Upload a JSON dataset to populate this dashboard.</p>
              </div>
            ) : (
              <table id="consolidated-table" className="w-full text-sm text-left whitespace-nowrap border-collapse">
                <thead className="text-xs uppercase bg-slate-800 text-white sticky top-0 z-20 shadow-md">
                  <tr>
                    <th rowSpan={2} className="px-4 py-3 border-r border-slate-700 bg-slate-900 sticky left-0 z-30 min-w-[120px]">📅 Date</th>
                    <th rowSpan={2} className="px-4 py-3 border-r border-slate-700 bg-slate-900 sticky left-[120px] z-30 min-w-[100px]">🔢 PRN</th>
                    <th rowSpan={2} className="px-4 py-3 border-r border-slate-700 bg-slate-900 sticky left-[220px] z-30 min-w-[150px]">👤 Farmer Name</th>
                    <th colSpan={19} className="px-4 py-2 border-r border-slate-700 text-center bg-blue-900/60 border-b border-blue-800">🌾 MapMyCrop Data</th>
                    <th colSpan={18} className="px-4 py-2 border-r border-slate-700 text-center bg-emerald-900/60 border-b border-emerald-800">🌡️ Fasal History Data</th>
                    <th colSpan={4} className="px-4 py-2 text-center bg-amber-900/60 border-b border-amber-800">🧪 KVK Data</th>
                  </tr>
                  <tr>
                    <th className="px-3 py-2 border-r border-slate-700 bg-blue-900/40">ID</th>
                    <th className="px-3 py-2 border-r border-slate-700 bg-blue-900/40">FarmID</th>
                    <th className="px-3 py-2 border-r border-slate-700 bg-blue-900/40">Phone</th>
                    <th className="px-3 py-2 border-r border-slate-700 bg-blue-900/40">MinT</th>
                    <th className="px-3 py-2 border-r border-slate-700 bg-blue-900/40">MaxT</th>
                    <th className="px-3 py-2 border-r border-slate-700 bg-blue-900/40">Rain</th>
                    <th className="px-3 py-2 border-r border-slate-700 bg-blue-900/40">Hum</th>
                    <th className="px-3 py-2 border-r border-slate-700 bg-blue-900/40">Clouds</th>
                    <th className="px-3 py-2 border-r border-slate-700 bg-blue-900/40">Status</th>
                    <th className="px-3 py-2 border-r border-slate-700 bg-blue-900/40">Wind</th>
                    <th className="px-3 py-2 border-r border-slate-700 bg-blue-900/40">Sat Date</th>
                    <th className="px-3 py-2 border-r border-slate-700 bg-blue-900/40">NDVI</th>
                    <th className="px-3 py-2 border-r border-slate-700 bg-blue-900/40">NDWI</th>
                    <th className="px-3 py-2 border-r border-slate-700 bg-blue-900/40">RECI</th>
                    <th className="px-3 py-2 border-r border-slate-700 bg-blue-900/40">NDRE</th>
                    <th className="px-3 py-2 border-r border-slate-700 bg-blue-900/40">NDMI</th>
                    <th className="px-3 py-2 border-r border-slate-700 bg-blue-900/40">EVI</th>
                    <th className="px-3 py-2 border-r border-slate-700 bg-blue-900/40">SAVI</th>
                    <th className="px-3 py-2 border-r border-slate-700 bg-blue-900/40">MSI</th>

                    <th className="px-3 py-2 border-r border-slate-700 bg-emerald-900/40">Plot</th>
                    <th className="px-3 py-2 border-r border-slate-700 bg-emerald-900/40">Farm</th>
                    <th className="px-3 py-2 border-r border-slate-700 bg-emerald-900/40">Lat</th>
                    <th className="px-3 py-2 border-r border-slate-700 bg-emerald-900/40">Lng</th>
                    <th className="px-3 py-2 border-r border-slate-700 bg-emerald-900/40">CustID</th>
                    <th className="px-3 py-2 border-r border-slate-700 bg-emerald-900/40">PlotID</th>
                    <th className="px-3 py-2 border-r border-slate-700 bg-emerald-900/40">Hum</th>
                    <th className="px-3 py-2 border-r border-slate-700 bg-emerald-900/40">Pres</th>
                    <th className="px-3 py-2 border-r border-slate-700 bg-emerald-900/40">Leaf Wet</th>
                    <th className="px-3 py-2 border-r border-slate-700 bg-emerald-900/40">Lux</th>
                    <th className="px-3 py-2 border-r border-slate-700 bg-emerald-900/40">Rain</th>
                    <th className="px-3 py-2 border-r border-slate-700 bg-emerald-900/40">Moist L1</th>
                    <th className="px-3 py-2 border-r border-slate-700 bg-emerald-900/40">Moist L2</th>
                    <th className="px-3 py-2 border-r border-slate-700 bg-emerald-900/40">Soil T</th>
                    <th className="px-3 py-2 border-r border-slate-700 bg-emerald-900/40">Solar</th>
                    <th className="px-3 py-2 border-r border-slate-700 bg-emerald-900/40">Temp</th>
                    <th className="px-3 py-2 border-r border-slate-700 bg-emerald-900/40">VPD</th>
                    <th className="px-3 py-2 border-r border-slate-700 bg-emerald-900/40">Wind</th>

                    <th className="px-3 py-2 border-r border-slate-700 bg-amber-900/40">Week</th>
                    <th className="px-3 py-2 border-r border-slate-700 bg-amber-900/40">pH</th>
                    <th className="px-3 py-2 border-r border-slate-700 bg-amber-900/40">EC</th>
                    <th className="px-3 py-2 bg-amber-900/40">Notes</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-slate-100">
                  {filteredData.map((row, idx) => {
                    const map = row.map_data || {};
                    const fasal = row.fasal_data || {};
                    const kvk = row.kvk_data || {};

                    return (
                      <tr key={idx} className="hover:bg-slate-50 transition-colors">
                        <td className="px-4 py-3 font-medium text-slate-700 bg-slate-50 sticky left-0 z-10 border-r border-slate-200">{row.date}</td>
                        <td className="px-4 py-3 font-bold text-emerald-600 bg-slate-50 sticky left-[120px] z-10 border-r border-slate-200">#{row.prn_no}</td>
                        <td className="px-4 py-3 font-medium text-slate-800 bg-slate-50 sticky left-[220px] z-10 border-r border-slate-200 shadow-[2px_0_5px_rgba(0,0,0,0.05)]">{row.farmer_name}</td>

                        {renderValue(map.record_id, "text-blue-700 bg-blue-50")}
                        {renderValue(map.farm_id, "text-blue-700 bg-blue-50")}
                        {renderValue(map.phone, "text-blue-700 bg-blue-50")}
                        {renderValue(map.min_temp, "text-blue-700 bg-blue-50")}
                        {renderValue(map.max_temp, "text-blue-700 bg-blue-50")}
                        {renderValue(map.rainfall, "text-blue-700 bg-blue-50")}
                        {renderValue(map.humidity, "text-blue-700 bg-blue-50")}
                        {renderValue(map.clouds_cover, "text-blue-700 bg-blue-50")}
                        <td className="p-3 border-b border-r bg-blue-50">
                          {map.status ? (
                            <span className="px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800 border border-blue-200">{map.status}</span>
                          ) : <span className="text-slate-400 italic">0</span>}
                        </td>
                        {renderValue(map.wind_speed, "text-blue-700 bg-blue-50")}
                        {renderValue(map.satellite_date, "text-blue-700 bg-blue-50")}
                        {renderValue(map.ndvi, "text-blue-700 bg-blue-50")}
                        {renderValue(map.ndwi, "text-blue-700 bg-blue-50")}
                        {renderValue(map.reci, "text-blue-700 bg-blue-50")}
                        {renderValue(map.ndre, "text-blue-700 bg-blue-50")}
                        {renderValue(map.ndmi, "text-blue-700 bg-blue-50")}
                        {renderValue(map.evi, "text-blue-700 bg-blue-50")}
                        {renderValue(map.savi, "text-blue-700 bg-blue-50")}
                        {renderValue(map.msi, "text-blue-700 bg-blue-50 border-r border-slate-200")}

                        {renderValue(fasal.plot_name)}
                        {renderValue(fasal.farm_name)}
                        {renderValue(fasal.latitude)}
                        {renderValue(fasal.longitude)}
                        {renderValue(fasal.cust_id)}
                        {renderValue(fasal.plot_id)}
                        {renderValue(fasal.humidity)}
                        {renderValue(fasal.pressure)}
                        {renderValue(fasal.leaf_wetness)}
                        {renderValue(fasal.lux)}
                        {renderValue(fasal.rainfall)}
                        {renderValue(fasal.soil_moisture_l1)}
                        {renderValue(fasal.soil_moisture_l2)}
                        {renderValue(fasal.soil_temperature)}
                        {renderValue(fasal.solar_intensity)}
                        {renderValue(fasal.temperature)}
                        {renderValue(fasal.vpd)}
                        {renderValue(fasal.wind_speed, "text-emerald-700 bg-emerald-50 border-r border-slate-200")}

                        {renderValue(kvk.week, "text-amber-700 bg-amber-50")}
                        {renderValue(kvk.ph, "text-amber-700 bg-amber-50")}
                        {renderValue(kvk.ec, "text-amber-700 bg-amber-50")}
                        <td className="p-3 border-b text-slate-400 italic bg-amber-50">-</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
