import { model, Schema } from "mongoose";

const  subscriptionSchema = new Schema({
    subscriber: {
        type: Schema.Types.ObjectId,  // One who is subscibing
        ref: "User"
    },
    channel: {
        type: Schema.Types.ObjectId,  // One who is owner
        ref: "User"
    }
}, {
    timestamps : true
})

export const Subscription = model("Subscription", subscriptionSchema)