import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  FileCode2,
  UploadCloud,
  FileText,
  Trash2,
  Key,
  Link2,
  ShieldCheck,
  X,
  Sparkles,
  RefreshCw,
  Cpu,
  Code2,
  GraduationCap,
} from "lucide-react";
import toast from "react-hot-toast";
import api from "../../api/axios";

export function CustomImportForm({
  onSubmit,
  loading = false,
  onCancel,
  isModal = false,
  isAdmin = false,
}) {
  const [title, setTitle] = useState("");
  const [sheetUrl, setSheetUrl] = useState("");
  const [file, setFile] = useState(null);
  const [mode, setMode] = useState("file");
  const [apiKey, setApiKey] = useState(() => localStorage.getItem("sb_gemini_api_key") || "");
  const [showKey, setShowKey] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [publishAsDeveloper, setPublishAsDeveloper] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState("dsa"); // "dsa" | "core" | "rk"
  const inputRef = useRef(null);

  const handleFileSelect = (selectedFile) => {
    if (!selectedFile) return;
    if (selectedFile.size > 25 * 1024 * 1024) {
      return toast.error("File is too large. Max size is 25MB.");
    }
    const reader = new FileReader();
    reader.onload = () => {
      setFile({
        name: selectedFile.name,
        size: selectedFile.size,
        type: selectedFile.type || "application/octet-stream",
        base64: reader.result,
      });
      if (!title.trim()) {
        const cleanName = selectedFile.name
          .replace(/\.[^/.]+$/, "")
          .replace(/[-_]+/g, " ")
          .replace(/\b\w/g, (c) => c.toUpperCase());
        setTitle(cleanName);
      }
      toast.success(`Attached "${selectedFile.name}"`);
    };
    reader.onerror = () => toast.error("Failed to read file");
    reader.readAsDataURL(selectedFile);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!title.trim()) return toast.error("Please enter a roadmap title");
    if (mode === "file" && !file) {
      return toast.error("Please drop or browse a document file");
    }
    if (mode === "link" && !sheetUrl.trim()) {
      return toast.error("Please enter a Google Drive, Google Sheets, or Excel link");
    }
    if (apiKey.trim()) {
      localStorage.setItem("sb_gemini_api_key", apiKey.trim());
    }

    const payload = {
      title: title.trim(),
      file: mode === "file" ? file : null,
      sheetUrl: mode === "link" ? sheetUrl.trim() : "",
      apiKey: apiKey.trim(),
      publishAsDeveloper: Boolean(publishAsDeveloper && isAdmin),
    };

    if (publishAsDeveloper && isAdmin) {
      payload.group = selectedGroup;
      payload.category =
        selectedGroup === "core"
          ? "Core Computer Science"
          : selectedGroup === "rk"
          ? "Special Tracks"
          : "DSA Patterns";
    }

    onSubmit(payload);
  };

  const formatSize = (bytes) =>
    bytes < 1048576 ? `${(bytes / 1024).toFixed(1)} KB` : `${(bytes / 1048576).toFixed(1)} MB`;

  return (
    <form onSubmit={handleSubmit} className="space-y-4 text-left">
      {/* Roadmap Name */}
      <div>
        <label className="text-xs font-semibold text-neutral-300 block mb-1.5 flex items-center justify-between">
          <span>Roadmap Name</span>
          <span className="text-[10px] text-neutral-500 font-mono">Required</span>
        </label>
        <input
          type="text"
          required
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Meta Top 50, OS Sem V, NeetCode 150..."
          className="w-full bg-[#0E0E12] border border-neutral-800 rounded-xl px-3.5 py-2.5 text-xs text-neutral-100 placeholder-neutral-500 outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500/20 font-sans transition"
        />
      </div>

      {/* Mode Switcher */}
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-neutral-300">Problem Source</span>
        <div className="flex rounded-lg bg-[#0E0E12] p-0.5 border border-neutral-800 text-[11px]">
          <button
            type="button"
            onClick={() => setMode("file")}
            className={`px-2.5 py-1 rounded-md transition cursor-pointer font-medium ${
              mode === "file"
                ? "bg-red-500/15 text-red-400 border border-red-500/30 font-semibold"
                : "text-neutral-400 hover:text-neutral-200"
            }`}
          >
            File Drop (Gemini 2.5)
          </button>
          <button
            type="button"
            onClick={() => setMode("link")}
            className={`px-2.5 py-1 rounded-md transition cursor-pointer font-medium flex items-center gap-1.5 ${
              mode === "link"
                ? "bg-red-500/15 text-red-400 border border-red-500/30 font-semibold"
                : "text-neutral-400 hover:text-neutral-200"
            }`}
          >
            <Link2 className="w-3 h-3" />
            <span>Sheet / Drive Link</span>
          </button>
        </div>
      </div>

      {/* File Drag & Drop or Link Input */}
      {mode === "file" ? (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragOver(true);
          }}
          onDragLeave={() => setIsDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setIsDragOver(false);
            if (e.dataTransfer.files?.[0]) handleFileSelect(e.dataTransfer.files[0]);
          }}
          onClick={() => {
            if (!file) inputRef.current?.click();
          }}
          className={`relative rounded-xl border-2 border-dashed p-5 transition-all text-center select-none ${
            isDragOver
              ? "border-red-500 bg-red-500/10 scale-[1.01]"
              : file
              ? "border-emerald-500/40 bg-emerald-950/15"
              : "border-neutral-800 bg-[#0E0E12] hover:border-neutral-700 hover:bg-neutral-900/40 cursor-pointer"
          }`}
        >
          <input
            type="file"
            ref={inputRef}
            className="hidden"
            accept=".pdf,.png,.jpg,.jpeg,.webp,.csv,.txt,.xlsx,.xls,.doc,.docx"
            onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
          />

          {file ? (
            <div className="flex items-center justify-between gap-3 text-left">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
                  <FileText className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-neutral-100 truncate">{file.name}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[10px] font-mono text-neutral-400">{formatSize(file.size)}</span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-red-500/20 text-red-400 border border-red-500/30 font-medium">
                      Gemini 2.5 Scan Ready
                    </span>
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setFile(null);
                  if (inputRef.current) inputRef.current.value = "";
                }}
                className="p-1.5 rounded-lg text-neutral-400 hover:text-red-400 hover:bg-red-950/40 transition cursor-pointer"
                title="Remove file"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="w-10 h-10 rounded-xl bg-neutral-900 border border-neutral-800 flex items-center justify-center text-red-400 mx-auto shadow-xs">
                <UploadCloud className="w-5 h-5 text-red-400" />
              </div>
              <div>
                <p className="text-xs font-medium text-neutral-200">
                  <span className="text-red-400 font-semibold underline underline-offset-2">Click to browse</span> or drag & drop document
                </p>
                <p className="text-[10px] text-neutral-500 mt-1">
                  PDF, Images, CSV, Spreadsheets, or TXT • Auto-extracted via Google Gemini 2.5
                </p>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-neutral-500">
            <Link2 className="w-4 h-4 text-red-400" />
          </div>
          <input
            type="url"
            value={sheetUrl}
            onChange={(e) => setSheetUrl(e.target.value)}
            placeholder="Paste Google Sheets, Google Drive, or Excel link..."
            className="w-full bg-[#0E0E12] border border-neutral-800 rounded-xl pl-10 pr-3.5 py-2.5 text-xs text-neutral-100 placeholder-neutral-500 outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500/20 font-sans transition"
          />
        </div>
      )}

      {/* Gemini API Key Toggle */}
      <div className="pt-0.5">
        <button
          type="button"
          onClick={() => setShowKey((prev) => !prev)}
          className="text-[11px] text-neutral-500 hover:text-neutral-300 flex items-center gap-1.5 transition cursor-pointer"
        >
          <Key className="w-3 h-3 text-neutral-400" />
          <span>{showKey ? "Hide Gemini API Key" : "Custom Gemini API Key (optional)"}</span>
        </button>

        {showKey && (
          <div className="mt-2 space-y-1">
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="AIzaSy... (leave blank to use server .env key)"
              className="w-full bg-[#0E0E12] border border-neutral-800 rounded-xl px-3 py-2 text-xs text-neutral-200 placeholder-neutral-500 outline-none focus:border-red-500 font-mono"
            />
            <p className="text-[10px] text-neutral-500">
              Uses server <code className="text-red-400">GEMINI_API_KEY</code> by default.
            </p>
          </div>
        )}
      </div>

      {/* Admin Publish Settings */}
      {isAdmin && (
        <div className="p-3.5 rounded-xl bg-red-950/20 border border-red-500/25 space-y-3">
          <label className="flex items-start gap-2.5 cursor-pointer">
            <input
              type="checkbox"
              checked={publishAsDeveloper}
              onChange={(e) => setPublishAsDeveloper(e.target.checked)}
              className="mt-0.5 rounded border-neutral-700 text-red-500 focus:ring-0 cursor-pointer"
            />
            <div className="text-left select-none">
              <p className="text-xs font-semibold text-neutral-200 flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-red-400 shrink-0" />
                <span>Publish as Developer / Admin Sheet</span>
              </p>
              <p className="text-[10px] text-neutral-400 mt-0.5">
                Makes this roadmap globally available in Workspace and Practice Studio for all students across the platform.
              </p>
            </div>
          </label>

          {publishAsDeveloper && (
            <div className="pt-2 border-t border-red-500/20 space-y-1.5 text-left">
              <span className="text-[11px] font-semibold text-neutral-300 block">
                Workspace Section (Tab)
              </span>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedGroup("dsa")}
                  className={`flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-medium transition cursor-pointer ${
                    selectedGroup === "dsa"
                      ? "bg-red-500/20 border-red-500/50 text-white font-semibold shadow-xs"
                      : "bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-white"
                  }`}
                >
                  <Code2 className="w-3 h-3 text-red-400" />
                  <span>DSA Tab</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedGroup("core")}
                  className={`flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-medium transition cursor-pointer ${
                    selectedGroup === "core"
                      ? "bg-red-500/20 border-red-500/50 text-white font-semibold shadow-xs"
                      : "bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-white"
                  }`}
                >
                  <Cpu className="w-3 h-3 text-red-400" />
                  <span>CORE CS</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedGroup("rk")}
                  className={`flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-medium transition cursor-pointer ${
                    selectedGroup === "rk"
                      ? "bg-red-500/20 border-red-500/50 text-white font-semibold shadow-xs"
                      : "bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-white"
                  }`}
                >
                  <GraduationCap className="w-3 h-3 text-red-400" />
                  <span>Special</span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Form Buttons */}
      <div className={`flex items-center ${isModal ? "justify-end gap-2.5 pt-2 border-t border-neutral-800/80" : "pt-1"}`}>
        {isModal && (
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="px-4 py-2 rounded-xl border border-neutral-800 bg-neutral-900 text-neutral-300 text-xs font-medium hover:bg-neutral-800 transition cursor-pointer disabled:opacity-50"
          >
            Cancel
          </button>
        )}

        <button
          type="submit"
          disabled={loading || !title.trim() || (mode === "file" ? !file : !sheetUrl.trim())}
          className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#BA3C3C] to-[#E04D4D] hover:opacity-90 text-white text-xs font-semibold transition cursor-pointer shadow-md shadow-red-500/20 disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              <span>Processing with Gemini 2.5...</span>
            </>
          ) : (
            <>
              <Sparkles className="w-3.5 h-3.5" />
              <span>{isAdmin && publishAsDeveloper ? "Publish Roadmap" : "Import Roadmap"}</span>
            </>
          )}
        </button>
      </div>
    </form>
  );
}

export default function CustomImportModal({ isOpen, onClose, onSuccess, isAdmin = false }) {
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen) setLoading(false);
  }, [isOpen]);

  if (!isOpen) return null;

  const handleFormSubmit = async (payload) => {
    try {
      setLoading(true);
      const res = await api.post("/practice/custom-sheet", {
        title: payload.title,
        fileBase64: payload.file?.base64,
        fileName: payload.file?.name,
        mimeType: payload.file?.type,
        sheetUrl: payload.sheetUrl || undefined,
        geminiApiKey: payload.apiKey || undefined,
        publishAsDeveloper: payload.publishAsDeveloper,
        group: payload.group,
        category: payload.category,
      });

      if (res.data.success) {
        toast.success(res.data.message || `Roadmap "${payload.title}" created successfully!`);
        onClose();
        if (onSuccess) onSuccess(res.data.sheetId);
      }
    } catch (err) {
      console.error("[CustomImportModal:submit]", err);
      toast.error(err.response?.data?.message || "Failed to import roadmap");
    } finally {
      setLoading(false);
    }
  };

  return createPortal(
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget && !loading) onClose();
      }}
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm animate-fade-in"
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-lg rounded-2xl border border-neutral-800 bg-[#121214] p-5 sm:p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-red-500/15 border border-red-500/30 flex items-center justify-center text-red-400">
              <FileCode2 className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-neutral-100">
                {isAdmin ? "Upload & Publish Roadmap" : "Import Custom Sheet"}
              </h2>
              <p className="text-[11px] text-neutral-400">
                Extract problems from documents or Google Sheets via Gemini 2.5
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="p-1 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <CustomImportForm
          onSubmit={handleFormSubmit}
          loading={loading}
          onCancel={onClose}
          isModal={true}
          isAdmin={isAdmin}
        />
      </div>
    </div>,
    document.body
  );
}
