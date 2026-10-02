import { Router } from "express";
import { createPost, deletePost, getPosts, getPostById } from "../controllers/postController.js";

const router = Router();

router.get("/posts", getPosts);
router.get("/posts/:id", getPostById);
router.post("/posts", createPost);
router.delete("/posts/:id", deletePost);

export default router;
