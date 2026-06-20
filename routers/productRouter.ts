import { Router } from "express";
import auth from "../utils/auth";
import productController from "../controllers/productController";
import upload, { processUpload } from "../utils/multer";
import { updateProcessUpload } from "../utils/updateProcessUpload";

const router = Router();
router.route('/add-product').post(auth,upload.array('photos',30),processUpload('images'),productController.productRegister);
router.route('/update-product').patch(auth,upload.array('photos',30),updateProcessUpload('images'),productController.productUpdate);
router.route('/get-product').get(productController.allProduct);
router.route('/get-not-product').get(productController.allNotAvailableProduct);

router.route('/get-product-all-details').get(productController.productDetail);
router.route('/get-product-in-city').get(productController.getAllCityProduct);
router.route('/get-coords-products').get(productController.getProductbyCoords);
router.route('/delete-product').delete(auth,productController.deleteProduct);
router.route('/avail-status-product').patch(auth,productController.updateAvailStatus);
router.route('/change-avail-stat').patch(auth,productController.changeAvailStatus);


export default router;    