import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

const connectDB = async (): Promise<void> => {
  try {
    const mongoUrl = process.env.MONGODB_URL;

    if (!mongoUrl) {
      throw new Error("MONGODB_URL is not defined");
    }

    const connected = await mongoose.connect(mongoUrl);
    if (connected) {
      console.log("Database connected");
    }
  } catch (error) {
    console.log("error in connecting database", error);
    throw error; // optional: rethrow so caller can handle
  }
};

export default connectDB;