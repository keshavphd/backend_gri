import { Schema } from "mongoose";
export interface CoordsType extends Document{
    latitude:number;
        longitude:number;
}
const coordinatesSchema = new Schema<CoordsType>({
    latitude:{type:Number,required:true},
    longitude:{type:Number,required:true},
}, {
  _id: false
})
export default coordinatesSchema;