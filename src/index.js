import { app } from './app.js'
import dotenv from 'dotenv'
import connectDB from "./db/index.js";
dotenv.config()

connectDB()
    .then(() => {
        const PORT = process.env.PORT || 5000;
        app.listen(PORT, () => console.log(`Listning to PORT ${PORT}`))
    })
    .catch((err) => console.error("Databse connection failed ", err))

