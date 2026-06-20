import { Router } from "express";
import userController from "../controllers/userController.js";
import auth from "../utils/auth.js";

const router = Router();
router.route("/register").post(userController.userRegister);
router.route("/login").post(userController.userLogin);
router.route("/refresh-token").post(userController.updatedToken);
router.route("/user-data").get(auth,userController.userData)
router.route("/logout").post(userController.userLogout)

export default router;