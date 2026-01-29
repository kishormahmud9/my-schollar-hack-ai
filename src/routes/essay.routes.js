import express from "express";
import multer from "multer";
import { essayHandler } from "../controller/essay.controller.js";


const router = express.Router();

const upload = multer({ dest: "uploads/" });

const multipartUpload = upload.fields([
    { name: "audio", maxCount: 1 },
    { name: "file", maxCount: 1 }
]);

function maybeMultipart(req, res, next) {
    // Allow BOTH:
    // - application/json (prompt only)
    // - multipart/form-data (any mix of prompt/audio/file)
    if (req.is("multipart/form-data")) {
        return multipartUpload(req, res, next);
    }
    return next();
}

// Single unified route:
// POST /api/essay
router.post("/:userId", maybeMultipart, essayHandler);

export const EssayRoutes = router;
