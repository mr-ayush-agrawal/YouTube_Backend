import { Schema, model } from "mongoose";
import mongooseAggregatePaginate from "mongoose-aggregate-paginate-v2";


const videoSchema = Schema({
    thumbnail: {
        type: String,  // Image URL
        required: ture
    },
    videoFile: {
        type: String,
        requird: true
    },
    title: {
        type: String,
        required: true,
        trim: true
    },
    description: {
        type: String,
        required: true,
    },
    duration: {
        type: Number,
        required: true
    },
    views: {
        type: Number,
        default: 0,
    },
    isPublished: {
        type: Boolean,
        default: true
    },
    owner: {
        type : Schema.Types.ObjectId,
        ref: "User"
    }
}, {
    timestamps: true
})

videoSchema.plugin(mongooseAggregatePaginate)

export const Video = model("Video", videoSchema)