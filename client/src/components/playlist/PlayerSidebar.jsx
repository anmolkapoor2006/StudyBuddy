import { useState, useEffect, useRef, useCallback } from "react";
import { ListOrdered, FileText, Plus, Play, Trash2, Edit2, Save, X, Clock } from "lucide-react";
import toast from "react-hot-toast";
import QueueVideoCard from "./QueueVideoCard";
import formatTime from "../../utils/formatTime";
import api from "../../api/axios";

export default function PlayerSidebar({
  videos = [],
  currentVideo,
  currentIndex = 0,
  player,
  onVideoSelect,
  activeTab = "queue",
  onTabChange,
  onVideoUpdated,
}) {
  const activeItemRef = useRef(null);

  // Timestamp Notes state
  const [timestampNotes, setTimestampNotes] = useState([]);
  const [loadingNotes, setLoadingNotes] = useState(false);
  const [newNoteText, setNewNoteText] = useState("");
  const [savingNote, setSavingNote] = useState(false);
  const [editingNoteId, setEditingNoteId] = useState(null);
  const [editingText, setEditingText] = useState("");

  // General notes state
  const [generalNotesText, setGeneralNotesText] = useState("");
  const [savingGeneral, setSavingGeneral] = useState(false);
  const [showGeneralNotes, setShowGeneralNotes] = useState(false);

  // Auto-scroll active video into view in Queue tab
  useEffect(() => {
    if (activeTab === "queue" && activeItemRef.current) {
      activeItemRef.current.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
      });
    }
  }, [currentIndex, activeTab]);

  // Fetch timestamp notes when video ID changes
  const fetchNotes = useCallback(async (vidId) => {
    if (!vidId) return;
    try {
      setLoadingNotes(true);
      const res = await api.get(`/videos/${vidId}/notes`);
      setTimestampNotes(res.data.notes || []);
    } catch (err) {
      console.error("[PlayerSidebar] Fetch Notes Error:", err.message);
    } finally {
      setLoadingNotes(false);
    }
  }, []);

  useEffect(() => {
    if (currentVideo?._id) {
      setGeneralNotesText(currentVideo.notes || "");
      fetchNotes(currentVideo._id);
    }
  }, [currentVideo?._id, currentVideo?.notes, fetchNotes]);

  // Capture current playback timestamp directly from player
  const getPlaybackTime = () => {
    if (player && typeof player.getCurrentTime === "function") {
      try {
        return Math.floor(player.getCurrentTime() || 0);
      } catch (_err) {
        // Player may not be initialized yet
      }
    }
    return 0;
  };

  // Add new timestamp note
  const handleAddNote = async (e) => {
    e.preventDefault();
    if (!newNoteText.trim() || savingNote || !currentVideo?._id) return;

    const time = getPlaybackTime();

    try {
      setSavingNote(true);
      const res = await api.post(`/videos/${currentVideo._id}/notes`, {
        timestamp: time,
        noteText: newNoteText.trim(),
      });

      setTimestampNotes((prev) =>
        [...prev, res.data.note].sort((a, b) => a.timestamp - b.timestamp)
      );
      setNewNoteText("");
      toast.success("Timestamp note added!");
    } catch (err) {
      console.error("[Add Note]", err.message);
      toast.error(err.response?.data?.message || "Failed to add note");
    } finally {
      setSavingNote(false);
    }
  };

  // Save edit on timestamp note
  const handleSaveEdit = async (noteId) => {
    if (!editingText.trim()) return;
    try {
      const res = await api.put(`/notes/${noteId}`, {
        noteText: editingText.trim(),
      });
      setTimestampNotes((prev) =>
        prev.map((n) => (n._id === noteId ? res.data.note : n))
      );
      setEditingNoteId(null);
      toast.success("Note updated");
    } catch (err) {
      console.error("[Update Note]", err.message);
      toast.error("Failed to update note");
    }
  };

  // Delete timestamp note
  const handleDeleteNote = async (noteId) => {
    try {
      await api.delete(`/notes/${noteId}`);
      setTimestampNotes((prev) => prev.filter((n) => n._id !== noteId));
      toast.success("Note removed");
    } catch (err) {
      console.error("[Delete Note]", err.message);
      toast.error("Failed to delete note");
    }
  };

  // Seek video player to timestamp
  const handleSeek = (timestamp) => {
    if (player && typeof player.seekTo === "function") {
      player.seekTo(timestamp, true);
      toast.success(`Jumped to ${formatTime(timestamp)}`);
    }
  };

  // Save General notes
  const handleSaveGeneral = async () => {
    if (savingGeneral || !currentVideo?._id) return;
    try {
      setSavingGeneral(true);
      const res = await api.patch(`/videos/${currentVideo._id}/notes`, {
        notes: generalNotesText.trim(),
      });
      if (onVideoUpdated) {
        onVideoUpdated(res.data.video);
      }
      toast.success("Lesson summary saved");
    } catch (err) {
      console.error("[Save General Notes]", err.message);
      toast.error("Failed to save summary notes");
    } finally {
      setSavingGeneral(false);
    }
  };

  return (
    <aside className="w-full lg:w-[380px] xl:w-[420px] shrink-0 border border-slate-200 dark:border-neutral-800/80 bg-white dark:bg-[#0B0C10] rounded-2xl overflow-hidden flex flex-col h-[520px] lg:h-[calc(100vh-140px)] max-h-[850px] shadow-xl shadow-black/5 dark:shadow-black/60 transition-colors">
      {/* Tab Navigation Header */}
      <div className="p-2 border-b border-slate-200 dark:border-neutral-800 bg-slate-50/80 dark:bg-neutral-900/40 shrink-0">
        <div className="grid grid-cols-2 gap-1 p-0.5 bg-slate-200/60 dark:bg-neutral-950 rounded-xl">
          <button
            type="button"
            onClick={() => onTabChange("queue")}
            className={`py-2 px-3 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-2 cursor-pointer ${
              activeTab === "queue"
                ? "bg-white dark:bg-neutral-800 text-slate-900 dark:text-neutral-100 shadow-xs dark:shadow-none"
                : "text-slate-500 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-neutral-200"
            }`}
          >
            <ListOrdered className="w-3.5 h-3.5" />
            <span>Course Queue</span>
            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-100 dark:bg-neutral-900 text-slate-500 dark:text-neutral-400">
              {currentIndex + 1}/{videos.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => onTabChange("notes")}
            className={`py-2 px-3 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-2 cursor-pointer ${
              activeTab === "notes"
                ? "bg-white dark:bg-neutral-800 text-slate-900 dark:text-neutral-100 shadow-xs dark:shadow-none"
                : "text-slate-500 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-neutral-200"
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Timestamped Notes</span>
            {timestampNotes.length > 0 && (
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-red-500/15 text-red-500 dark:text-red-400 font-bold">
                {timestampNotes.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* TAB 1: COURSE QUEUE */}
      {activeTab === "queue" && (
        <div className="flex-1 overflow-y-auto p-2.5 space-y-1.5 overscroll-contain">
          {videos.map((video, index) => {
            const isActive = video._id === currentVideo?._id;
            return (
              <div
                key={video._id}
                ref={isActive ? activeItemRef : null}
              >
                <QueueVideoCard
                  video={video}
                  index={index}
                  isActive={isActive}
                  onVideoSelect={onVideoSelect}
                  onNotesClick={() => onTabChange("notes")}
                />
              </div>
            );
          })}
        </div>
      )}

      {/* TAB 2: TIMESTAMPED NOTES */}
      {activeTab === "notes" && (
        <div className="flex-1 overflow-y-auto flex flex-col p-3 space-y-4 overscroll-contain">
          {/* Note Input Bar */}
          <form
            onSubmit={handleAddNote}
            className="p-3 rounded-xl bg-slate-50 dark:bg-neutral-900/60 border border-slate-200 dark:border-neutral-800/80 space-y-2 shrink-0"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium text-slate-500 dark:text-neutral-400 flex items-center gap-1.5 font-mono">
                <Clock className="w-3 h-3 text-red-500" />
                Auto-captures playback time
              </span>
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                value={newNoteText}
                onChange={(e) => setNewNoteText(e.target.value)}
                placeholder="Take a quick note at this moment..."
                className="flex-1 bg-white dark:bg-neutral-950 border border-slate-200 dark:border-neutral-800 rounded-lg px-3 py-1.5 text-xs text-slate-900 dark:text-neutral-100 placeholder-slate-400 dark:placeholder-neutral-500 outline-none focus:border-red-500 transition-colors"
              />
              <button
                type="submit"
                disabled={savingNote || !newNoteText.trim()}
                className="px-3 py-1.5 bg-gradient-to-r from-[#BA3C3C] to-[#E04D4D] hover:opacity-90 disabled:opacity-40 text-white rounded-lg text-xs font-semibold flex items-center gap-1 shrink-0 cursor-pointer shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Save</span>
              </button>
            </div>
          </form>

          {/* Timestamp Notes List */}
          <div className="flex-1 space-y-2 min-h-0">
            <div className="flex items-center justify-between px-1">
              <span className="text-[11px] font-mono font-semibold uppercase tracking-wider text-slate-400 dark:text-neutral-500">
                Moments ({timestampNotes.length})
              </span>
            </div>

            {loadingNotes ? (
              <div className="py-8 text-center text-xs text-slate-400 dark:text-neutral-500 font-mono">
                Loading notes...
              </div>
            ) : timestampNotes.length === 0 ? (
              <div className="py-8 px-4 text-center rounded-xl bg-slate-50 dark:bg-neutral-900/30 border border-dashed border-slate-200 dark:border-neutral-800 space-y-1.5">
                <p className="text-xs font-medium text-slate-700 dark:text-neutral-300">
                  No timestamped notes yet
                </p>
                <p className="text-[11px] text-slate-400 dark:text-neutral-500 leading-relaxed">
                  Jot down formulas, code explanations, or key interview answers while watching.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {timestampNotes.map((note) => (
                  <div
                    key={note._id}
                    className="group p-2.5 rounded-xl border border-slate-200 dark:border-neutral-800/80 bg-white dark:bg-neutral-900/50 hover:border-slate-300 dark:hover:border-neutral-700 transition-all flex flex-col gap-1.5"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <button
                        type="button"
                        onClick={() => handleSeek(note.timestamp)}
                        className="px-2 py-0.5 rounded-md bg-red-500/10 hover:bg-red-500/20 text-red-500 dark:text-red-400 text-[11px] font-mono font-semibold flex items-center gap-1 cursor-pointer transition-colors"
                        title="Seek to timestamp"
                      >
                        <Play className="w-2.5 h-2.5 fill-current" />
                        <span>{formatTime(note.timestamp)}</span>
                      </button>

                      <div className="flex items-center gap-1 opacity-60 group-hover:opacity-100 transition-opacity">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingNoteId(note._id);
                            setEditingText(note.noteText);
                          }}
                          className="p-1 rounded text-slate-400 hover:text-slate-700 dark:hover:text-neutral-200"
                          title="Edit note"
                        >
                          <Edit2 className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteNote(note._id)}
                          className="p-1 rounded text-slate-400 hover:text-red-500"
                          title="Delete note"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>

                    {editingNoteId === note._id ? (
                      <div className="flex gap-1.5 mt-1">
                        <input
                          type="text"
                          value={editingText}
                          onChange={(e) => setEditingText(e.target.value)}
                          className="flex-1 bg-slate-50 dark:bg-neutral-950 border border-slate-200 dark:border-neutral-700 rounded px-2 py-1 text-xs text-slate-900 dark:text-neutral-100 outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => handleSaveEdit(note._id)}
                          className="p-1 rounded bg-red-500 text-white cursor-pointer"
                        >
                          <Save className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingNoteId(null)}
                          className="p-1 rounded text-slate-400 cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <p className="text-xs text-slate-700 dark:text-neutral-300 leading-relaxed break-words">
                        {note.noteText}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* General Lesson Summary Section */}
          <div className="pt-2 border-t border-slate-200 dark:border-neutral-800 shrink-0">
            <button
              type="button"
              onClick={() => setShowGeneralNotes((prev) => !prev)}
              className="w-full flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-neutral-300 py-1 cursor-pointer"
            >
              <span>Lesson Summary Notes</span>
              <span className="text-[10px] text-red-500">
                {showGeneralNotes ? "Hide" : "Open"}
              </span>
            </button>

            {showGeneralNotes && (
              <div className="mt-2 space-y-2">
                <textarea
                  rows={3}
                  value={generalNotesText}
                  onChange={(e) => setGeneralNotesText(e.target.value)}
                  placeholder="General notes, takeaways, or references for this lesson..."
                  className="w-full bg-slate-50 dark:bg-neutral-950 border border-slate-200 dark:border-neutral-800 rounded-lg p-2.5 text-xs text-slate-900 dark:text-neutral-100 placeholder-slate-400 dark:placeholder-neutral-500 outline-none focus:border-red-500 transition-colors resize-none"
                />
                <button
                  type="button"
                  onClick={handleSaveGeneral}
                  disabled={savingGeneral}
                  className="w-full py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-slate-800 dark:text-neutral-200 text-xs font-medium border border-slate-200 dark:border-neutral-700 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{savingGeneral ? "Saving..." : "Save Summary"}</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </aside>
  );
}
