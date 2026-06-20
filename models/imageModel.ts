import { Schema } from "mongoose";

export interface ImageGroup {
    id:string;
    images: {
        320?:string;
        640:string;
        1200:string;
    }
}

export const ImageGrpSchema = new Schema<ImageGroup>({
    id:String,
    images:{
        320:String,
        640:String,
        1200:String,
    }
});
