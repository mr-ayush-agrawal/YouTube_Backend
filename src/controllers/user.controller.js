import { asyncHandler } from "../utils/asyncHandler.js"
import { ApiError } from '../utils/ApiError.js'
import { User } from '../models/users.models.js'
import {uploadOnCloudinary} from '../utils/cloudinary.js'
import { ApiResponse } from "../utils/ApiResponse.js"

const registerUser = asyncHandler(async (req, res) => {
    /* Steps for creation
    1. Get info from front end
    2. Validate info -> not empty, correct format
    3. Chcck if user already exist -> username , email
    4. checks for the images
    5. upload images to cloudinary
    6. Create user object
    7. Uplaod the User objet to Data Base
    8. Remove Password and Token from the object
    9. Check for user creation
    10. Return Obj as response
    */

    const { username, fullname, email, password } = req.body

    // 1
    if ([fullname, email, username, password].some((feild) => feild.trim() === ''))
        throw new ApiError(400, 'All feilds are mendatory')
    // can also check for the format of email or other stuffs -> skipping for now.

    // 2
    const existedUser = await User.findOne({
        $or : [{email}, {username}]
    })

    // 3
    if(existedUser)
        throw new ApiError(409, 'User with email or username alredy exist')

    // 4
    const avatarLocalPath = req.files?.avatar[0]?.path;
    if(!avatarLocalPath)
        throw new ApiError(400, "Avatar is required")

    let coverImageLocalPath
    if(req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0)
        coverImageLocalPath = req.files.coverImage[0].path


    // 5
    const avatar = await uploadOnCloudinary(avatarLocalPath)
    const coverImage = await uploadOnCloudinary(coverImageLocalPath)

    if (!avatar)
        throw new ApiError(400, 'Avatar is required')

    // 6-7
    const newUser = await User.create({
        fullname,
        avatar: avatar.url,
        coverImage: coverImage?.url || "",
        email,
        username: username.toLowerCase(),
        password
    })

    // 8
    const createdUser = await User.findById(newUser._id).select(
        "-password -refreshToken"
    )

    if(!createdUser)
        throw new ApiError(500, "Something went wrong while registering the User");

    // 9
    return res.status(201).json(
        new ApiResponse(200, createdUser, "User registered Successfully")
    );

})

export { registerUser }