const express = require("express");
const router = express.Router({ mergeParams: true });
const authMiddleware = require("../middleware/authMiddleware");
const noteController = require("../controllers/noteController");

// Video notes endpoints (protected)
router.get("/videos/:videoId/notes", authMiddleware, noteController.getNotesByVideo);
router.post("/videos/:videoId/notes", authMiddleware, noteController.createNote);

// Specific note endpoints (protected)
router.put("/notes/:id", authMiddleware, noteController.updateNote);
router.delete("/notes/:id", authMiddleware, noteController.deleteNote);

module.exports = router;
