import { asyncHandler } from "../utils/asyncHandler.js"
import { ApiError } from '../utils/ApiError.js'
import { User } from '../models/users.models.js'
import { uploadOnCloudinary } from '../utils/cloudinary.js'
import { ApiResponse } from "../utils/ApiResponse.js"
import { jwt } from "jsonwebtoken"
import mongoose from "mongoose"

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
        $unset: {
            refreshToken: 1
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
        .json(new ApiResponse(200, {}, "User Logged Out"))
})


const refreshAcessToken = asyncHandler(async (req, res) => {
    try {
        const incommingToken = req.cookies.refreshToken || req.body.refreshToken;
        if (!incommingToken)
            throw new ApiError(401, 'Unauthorized request')

        const decodedToken = jwt.verify(incommingToken, process.env.REFRESH_TOKEN_SECRET)
        const user = await User.findById(decodedToken?._id)

        if (!user)
            throw new ApiError(401, 'Invalid Refresh Token')

        if (incommingToken !== user?.refreshToken)
            throw new ApiError(401, 'Refreshed token is used or expired ')

        const cookieOptions = {
            httpOnly: true,
            secure: true
        }

        const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(user._id)
        return res
            .status(200)
            .Cookie('accessToken', accessToken, cookieOptions)
            .Cookie('refreshToken', refreshToken, cookieOptions)
            .json(new ApiResponse(200, {}, "Access Token refreshed Succesully"))
    } catch (error) {
        throw new ApiError(401, error?.message || "Invelid refresh Token")
    }
})


const changePassword = asyncHandler(async (req, res) => {
    const { oldPassword, newPassword } = req.body
    const user = await User.findById(req?.user._id)
    const authorized = await user.isCorrectPassword(oldPassword);
    if (!authorized)
        throw new ApiError(400, 'Wrong Password')

    user.password = newPassword
    await user.save({ validateBeforeSave: false })

    return res
        .status(200)
        .json(new ApiResponse(200, {}, "Password changed Successfully"))
})


const getCurrentUser = asyncHandler(async (req, res) => {
    return res
        .status(200)
        .json(new ApiResponse(200, req.user, "Current Usre Info"))
})

const updateUser = asyncHandler(async (req, res) => {
    const { email, fullname } = req.body
    if (!fullname || !email)
        throw new ApiError(400, "Both email and fullname required")

    const user = await user.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                fullname,
                email: email
            }
        }, {
        new: true
    }
    ).select('-password -refreshToken')

    return res
        .status(200)
        .json(new ApiResponse(200, user, "User Updated Successfully"))
})

const updateUserAvatar = asyncHandler(async (req, res) => {
    // multer middleware will give us a k-v pair for fiels in req
    const avatarLocalPath = req.file?.path
    if (!avatarLocalPath)
        throw new ApiError(400, "Please upload the avatar file")

    const avatar = await uploadOnCloudinary(avatarLocalPath)
    if (!avatar.url)
        throw new ApiError(400, "Error while uploading the avatar")

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                avatar: avatar.url
            }
        }, {
        new: true
    }
    ).select('-password -refreshToken')

    return res
        .status(200)
        .json(new ApiResponse(200, user, "Avatar Updated successfully"))
})

const updateCoverImage = asyncHandler(async (req, res) => {
    const coverImageLocalPfath = req.feild?.path
    if (!coverImageLocalPath)
        throw new ApiError(400, "Please upload the cover Image")

    const coverImage = await uploadOnCloudinary(coverImageLocalPath)

    if (!coverImage.url)
        throw new ApiError(400, "Error while uploading the Cover Image")

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                coverImage: coverImage.url
            }
        }, {
        new: true
    }
    ).select('-password -refreshToken')

    // if(!user)
    return res
        .status(200)
        .json(new ApiResponse(200, user, "Cover Image updated Successfully"))

})

const getUserProfile = asyncHandler(async (req, res) => {
    const { username } = req.params
    if (!username)
        throw new ApiError(400, "Username Missing")

    const channel = await User.aggregate([
        {
            $match: {
                username: username?.toLowerCase()
            }
        }, {
            $lookup: {
                from: 'subscriptions',
                localField: "_id",
                foreignField: "channel",
                as: "subscribers"
            }
        }, {
            $lookup: {
                from: "subscriptions",
                localField: "_id",
                foreignField: "subscriber",
                as: "subscribedTo"
            }
        }, {
            $addFields: {
                SubsctiberCount: {
                    $size: "$subscribers"
                },
                channelsSubscribed: {
                    $size: "$subscribedTo"
                },
                isSubscribed: {
                    $condition: {
                        if: { $in: [req.user?._id, "#subscribers.subscriber"] },
                        then: true,
                        else: false
                    }
                }
            }
        }, {
            $project: {
                fullname: 1,
                username: 1,
                SubsctiberCount: 1,
                channelsSubscribed: 1,
                isSubscribed: 1,
                avatar: 1,
                coverImage: 1,
                // email: 1  -> Not passing,
            }
        }
    ])

    console.log(channel)
    if (!channel)
        throw new ApiError(404, "Channel Not found")

    return res
        .status(200)
        .json(new ApiResponse(200, channel[0], "Channel Fetched Successfully"))
})

const getWatchHistory = asyncHandler(async (req, res) => {
    const user = await User.aggregate([
        {
            $match: {
                _id: mongoose.Types.ObjectId(req.user._id)
            }
        }, {
            $lookup: {
                from: "videos",
                localField: "watchHistory",
                foreignField: "_id",
                as: "watchHistory",
                // getting the owner of each video of the WatchHistory
                pipeline: [
                    {
                        $lookup: {
                            from: "users",
                            localField: "owner",
                            foreignField: "_id",
                            as: "owner",
                            // Info available to the viewer
                            pipeline: [
                                {
                                    $project : {
                                        fullname: 1,
                                        username: 1,
                                        avatar: 1
                                    }
                                }
                            ]
                        }
                    }, {
                        // Over writing the owner feild with only 1 feild
                        $addFields: {
                            owner: {
                                $first : "$owner"
                            }
                        }
                    }
                ]
            }
        }
    ])

    return res
        .status(200)
        .json(new ApiResponse(200, user[0].watchHistory, "Watch History fetch successfully" ))
})

export {
    registerUser,
    loginUser,
    logoutUser,
    refreshAcessToken,
    getCurrentUser,
    changePassword,
    updateUser,
    updateUserAvatar,
    updateCoverImage,
    getUserProfile,
    getWatchHistory
}