import { asyncHandler } from "../utils/asyncHandler.js"
import { ApiError } from '../utils/ApiError.js'
import { User } from '../models/users.models.js'
import { uploadOnCloudinary } from '../utils/cloudinary.js'
import { ApiResponse } from "../utils/ApiResponse.js"

const generateAccessAndRefreshTokens = async (userId) => {
    try {
        const user = await User.findById(userId)
        const accessToken = user.generateAccessToken();
        const refreshToken = user.generateRefreshToken();

        user.refreshToken = refreshToken
        await user.save({ validateBeforeSave: false })
        // This is use to save the data to the data base

        return { accessToken, refreshToken };
    }
    catch (err) {
        // console.error("Error While generating token : ", err)
        throw new ApiError(500, "Something went wrong while generating tokens");
    }
}

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
        $or: [{ email }, { username }]
    })

    // 3
    if (existedUser)
        throw new ApiError(409, 'User with email or username alredy exist')

    // 4
    const avatarLocalPath = req.files?.avatar[0]?.path;
    if (!avatarLocalPath)
        throw new ApiError(400, "Avatar is required")

    let coverImageLocalPath
    if (req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0)
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

    if (!createdUser)
        throw new ApiError(500, "Something went wrong while registering the User");

    // 9
    return res.status(201).json(
        new ApiResponse(200, createdUser, "User registered Successfully")
    );

})


const loginUser = asyncHandler(async (req, res) => {
    /* Steps 
    // - Refresh token check
    - get data from form 
    - search user and check passwod
    - create access and reresh token
    - send cokie
    */

    const { username, email, password } = req.body

    if (!username && !email) {
        throw new ApiError(400, "Anyone of the 2 Email or username is required")
    }

    let reqUser = await User.findOne({
        $or: [{ email }, { username }]
    })


    if (!reqUser) {
        throw new ApiError(404, "No User Found");
    }

    const isValidPass = await reqUser.isCorrectPassword(password)
    if (!isValidPass) {
        throw new ApiError(403, "Wrong Password")
    }

    const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(reqUser._id)

    const loggedInUser = await User.findById(reqUser._id).select("-password -refreshToken")

    // The above call can be omited -> Tried but failed to remove password from regUser
    // 2 Possible solution -> only taking the required feilds abs pass aas another obj
    // -> Replacing the content in teh password as NULL/Hidden;

    const cookieOptions = {
        httpOnly: true,
        secure: true
    }

    return res
        .status(200)
        .cookie("accessToken", accessToken, cookieOptions)
        .cookie("refreshToken", refreshToken, cookieOptions)
        .json(new ApiResponse(200, { user: loggedInUser, accessToken, refreshToken }, "Login SuccessFul "))
})


const logoutUser = asyncHandler(async (req, res) => {
    await User.findByIdAndUpdate(
        req.user._id, {
        $set: {
            refreshToken: undefined
        }
    }, {
        new: true
    }
    )
    const cookieOptions = {
        httpOnly: true,
        secure: true
    }
    return res
        .status(200)
        .clearCookie('accessToken', cookieOptions)
        .clearCookie('refreshToken', cookieOptions)
})

export { registerUser, loginUser, logoutUser }