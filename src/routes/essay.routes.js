import express from "express";
import multer from "multer";
import { documentEssay, promptEssay, voiceEssay } from "../controller/essay.controller.js";


const router = express.Router();

const upload = multer({ dest: "uploads/" });

router.post("/prompt", promptEssay);
router.post("/voice", upload.single("audio"), voiceEssay);
router.post("/document", upload.single("file"), documentEssay);

export const EssayRoutes = router;
