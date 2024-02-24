import dotenv from 'dotenv'
dotenv.config()
import { v2 as cloudinary } from "cloudinary";
import fs from "fs"

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

const uploadOnCloudinary = async (localFilePath) => {
    try {
        if (!localFilePath)
            return null;
        
        // Upload the files in cloudinary
        const response = await cloudinary.uploader.upload(localFilePath, {
            resource_type: "auto"
        })

        // files have been uploaded successfully
        fs.unlinkSync(localFilePath)

        return response;
    }
    catch (err) {
        console.log(err)
        fs.unlinkSync(localFilePath)
        // Removes the locally saved temporary file as the upload opeartion got failed  
        return null
    }
}

export { uploadOnCloudinary }