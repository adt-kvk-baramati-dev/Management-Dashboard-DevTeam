import { useState, useRef, ChangeEvent, DragEvent } from "react";
import { UploadCloud, FileCode, CheckCircle, AlertCircle, X, Download } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";

export default function UploadData() {
  const navigate = useNavigate();
  const [file, setFile] = useState<File | null>(null);
  const [isHovering, setIsHovering] = useState(false);
  const [uploadState, setUploadState] = useState<"idle" | "uploading" | "success" | "error">("idle");
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsHovering(true);
  };

  const handleDragLeave = () => {
    setIsHovering(false);
  };

  const validateAndSetFile = (selectedFile: File) => {
    if (selectedFile.type !== "application/json" && !selectedFile.name.endsWith(".json")) {
      setUploadState("error");
      setMessage("Please select a JSON file only.");
      return;
    }
    setFile(selectedFile);
    setUploadState("idle");
    setMessage("");
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsHovering(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      validateAndSetFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      validateAndSetFile(e.target.files[0]);
    }
  };

  const clearFile = () => {
    setFile(null);
    setUploadState("idle");
    setMessage("");
    setProgress(0);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const uploadFile = async () => {
    if (!file) return;

    setUploadState("uploading");
    setProgress(10);
    setMessage("Reading file and preparing upload...");

    let progressInterval: ReturnType<typeof setInterval> | null = null;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    const controller = new AbortController();
    let serverProcessingShown = false;

    try {
      const text = await file.text();
      setProgress(25);
      setMessage("Validating JSON data...");

      let parsed: unknown;
      try {
        parsed = JSON.parse(text);
      } catch {
        setUploadState("error");
        setMessage("Invalid JSON format. Please upload a valid JSON file.");
        return;
      }

      const records = Array.isArray(parsed)
        ? parsed
        : parsed && typeof parsed === "object" && Array.isArray((parsed as any).records)
          ? (parsed as any).records
          : null;

      if (!records || records.length === 0) {
        setUploadState("error");
        setMessage("JSON must be an array or an object containing a non-empty records array.");
        return;
      }

      setMessage(`Uploading ${records.length} records to server...`);
      setProgress(40);

      progressInterval = setInterval(() => {
        setProgress((prev) => {
          const next = prev < 90 ? prev + 15 : 90;
          if (next >= 90 && !serverProcessingShown) {
            serverProcessingShown = true;
            setMessage("Server is processing your records. Large files may take a few minutes...");
          }
          return next;
        });
      }, 500);

      timeoutId = setTimeout(() => {
        controller.abort();
      }, 300000);

      const response = await fetch("/api/upload", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ records }),
        signal: controller.signal,
      });

      setProgress(100);
      setMessage("Upload complete. Finalizing...");

      const result = await response.json();

      if (response.ok && result.success) {
        setUploadState("success");
        const summary = result.summary
          ? ` Register: ${result.summary.register}, MapMyCrop: ${result.summary.map_my_crop}, Fasal: ${result.summary.fasal_history}, KVK: ${result.summary.kvk_data}.`
          : "";
        setMessage(`${result.message || "Upload complete!"}${summary}`);
        setTimeout(() => {
          navigate("/data");
        }, 2000);
      } else {
        setUploadState("error");
        setMessage(result.message || "Upload failed. Please try again.");
      }
    } catch (error: any) {
      setUploadState("error");
      if (error?.name === "AbortError") {
        setMessage("Upload timed out after 5 minutes. Please try again with a smaller file or split it into chunks.");
      } else {
        setMessage("Network error. Could not connect to the server.");
      }
    } finally {
      if (progressInterval) clearInterval(progressInterval);
      if (timeoutId) clearTimeout(timeoutId);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(2) + " MB";
  };

  return (
    <div className="min-h-screen p-6 md:p-12 max-w-2xl mx-auto flex flex-col justify-center">
      <div className="mb-8 text-center">
        <h1 className="title text-3xl md:text-4xl text-emerald-600 mb-2">Krishi Vidnyan Kendra</h1>
        <p className="text-slate-500 font-medium">Farmer Data Management System - Upload Dataset</p>
      </div>

      <div className="glass-panel p-8 shadow-xl relative overflow-hidden">
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        {uploadState === "success" && (
          <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 rounded-lg flex items-start gap-3 animate-fade-in text-emerald-800">
            <CheckCircle className="w-5 h-5 text-emerald-500 mt-0.5" />
            <div>
              <p className="font-semibold">Success!</p>
              <p className="text-sm opacity-90">{message}</p>
            </div>
          </div>
        )}

        {uploadState === "error" && (
          <div className="mb-6 p-4 bg-rose-50 border border-rose-200 rounded-lg flex items-start gap-3 animate-fade-in text-rose-800">
            <AlertCircle className="w-5 h-5 text-rose-500 mt-0.5" />
            <div>
              <p className="font-semibold">Upload Failed</p>
              <p className="text-sm opacity-90">{message}</p>
            </div>
          </div>
        )}

        <div
          onClick={() => fileInputRef.current?.click()}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all duration-300 ${
            isHovering
              ? "border-emerald-500 bg-emerald-50"
              : "border-slate-300 bg-slate-50 hover:bg-slate-100 hover:border-emerald-400"
          } ${file ? "hidden" : "block"}`}
        >
          <input
            type="file"
            className="hidden"
            accept=".json"
            ref={fileInputRef}
            onChange={handleFileChange}
          />
          <UploadCloud className="w-16 h-16 mx-auto mb-4 text-emerald-500/80" />
          <p className="text-lg font-semibold text-slate-700 mb-1">Click or drag JSON file here</p>
          <p className="text-sm text-slate-500">.json files only • Max 200MB</p>
        </div>

        {file && (
          <div className="animate-fade-in bg-slate-50 border border-emerald-200 p-5 rounded-xl flex items-center justify-between shadow-sm">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-emerald-100 text-emerald-600 rounded-lg">
                <FileCode className="w-8 h-8" />
              </div>
              <div className="max-w-[200px] md:max-w-xs overflow-hidden">
                <p className="font-semibold text-slate-800 truncate" title={file.name}>
                  {file.name}
                </p>
                <p className="text-sm text-slate-500">{formatFileSize(file.size)}</p>
              </div>
            </div>
            <button
              onClick={clearFile}
              className="p-2 text-rose-500 hover:bg-rose-50 rounded-full transition-colors"
              title="Remove file"
              disabled={uploadState === "uploading"}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        )}

        {uploadState === "uploading" && (
          <div className="mt-8 animate-fade-in">
            <div className="flex justify-between text-sm font-medium text-slate-600 mb-2">
              <span>{message}</span>
              <span>{progress}%</span>
            </div>
            <div className="w-full h-2.5 bg-slate-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-500 rounded-full transition-all duration-300 ease-out"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}

        <button
          onClick={uploadFile}
          disabled={!file || uploadState === "uploading" || uploadState === "success"}
          className={`w-full mt-8 btn btn-primary py-4 text-lg shadow-lg ${
            !file || uploadState === "uploading" || uploadState === "success"
              ? "opacity-50 cursor-not-allowed"
              : ""
          }`}
        >
          {uploadState === "uploading" ? "Uploading Dataset..." : "Upload and Process File"}
        </button>

        <div className="mt-8 flex items-center justify-center gap-4 text-sm font-medium text-slate-500">
          <div className="h-px w-16 bg-slate-200" />
          <span>or</span>
          <div className="h-px w-16 bg-slate-200" />
        </div>

        <Link to="/data" className="mt-6 w-full btn btn-secondary py-3 bg-white text-slate-700 border border-slate-300 hover:bg-slate-50 hover:text-emerald-600 hover:border-emerald-300 shadow-sm">
          <Download className="w-4 h-4 mr-2" />
          View Farmers Data Dashboard
        </Link>
      </div>

      <div className="mt-8 flex justify-center">
        <Link to="/" className="text-emerald-600 hover:text-emerald-700 font-medium inline-flex items-center gap-1 transition-colors">
          &larr; Back to App Home
        </Link>
      </div>
    </div>
  );
}
