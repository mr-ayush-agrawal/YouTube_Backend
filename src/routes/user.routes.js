import { Router } from "express";
import { upload } from '../middlewares/multer.middleware.js'
import { verifyJWT } from '../middlewares/auth.middleware.js'
import { 
    registerUser, 
    loginUser, 
    logoutUser, 
    refreshAcessToken, 
    changePassword, 
    getCurrentUser,
    updateUser,
    updateUserAvatar,
    getUserProfile,
    getWatchHistory } from "../controllers/user.controller.js";


const router = Router();

router.route('/register').post(
    upload.fields([
        {
            name: 'avatar',
            maxCount: 1
        },
        {
            name: 'coverImage',
            maxCount: 1
        }
    ]), registerUser)

router.route('/login').post(loginUser)
// Can be changed as per the need.

//secured Routes
router.route('/logout').post(verifyJWT, logoutUser)
router.route('/refresh-token').post(refreshAcessToken)
router.route('/change-password').post(verifyJWT,changePassword)
router.route('/current-user').get(verifyJWT,getCurrentUser)
router.route('/update-user').patch(verifyJWT,updateUser)
router.route('/update-avatar').patch(
    verifyJWT,
    upload.single({ name: 'avatat'}), 
    updateUserAvatar)
router.route('/update-cover-Image').patch(
        verifyJWT,
        upload.single({name: 'coverImage',}), 
        updateCoverImage)
router.route('.channel/:username').get(verifyJWT, getUserProfile)
router.route('/watch-history').get(verifyJWT, getWatchHistory)

export default router;