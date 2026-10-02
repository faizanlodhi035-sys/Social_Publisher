import { Router } from "express";
import multer from "multer";
import { deleteMedia, getMedia, uploadMedia } from "../controllers/mediaController.js";

const upload = multer({
  limits: { fileSize: 100 * 1024 * 1024 }, // 100 MB limit
});

const router = Router();

router.get("/media", getMedia);
router.post("/media/upload", upload.single("file"), uploadMedia);
router.delete("/media/:id", deleteMedia);

export default router;
