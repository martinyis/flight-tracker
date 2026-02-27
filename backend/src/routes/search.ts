import { Router } from "express";
import * as searchController from "../controllers/searchController";

const router = Router();

router.post("/", searchController.search);

export default router;
