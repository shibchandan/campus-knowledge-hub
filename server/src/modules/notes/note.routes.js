import { Router } from "express";
import { createNote, getNotes } from "./note.controller.js";
import { protect } from "../../middleware/authMiddleware.js";

export const noteRouter = Router();

noteRouter.get("/", getNotes);
noteRouter.post("/", protect, createNote);
