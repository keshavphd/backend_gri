import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

const connectDB = async():Promise<void>=>{
    try {
        const connected = await mongoose.connect(process.env.MONGODB_URL);
        if(connected){
            console.log("Database connected");
        }
    } catch (error) {
        console.log("error in connecting database",error);
        
    }
}
export default connectDB;
