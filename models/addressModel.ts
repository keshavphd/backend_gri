import { Schema } from "mongoose";

export interface AddressType {
    addressline1:string;
        addressline2?:string;
        village?:string;
        city:string;
        district:string;
        state:string;
        pincode:number;
}

const addressSchema = new Schema<AddressType>({
    addressline1:{type:String,required:true},
    addressline2:{type:String,required:false},
    village:{type:String,required:false},
    city:{type:String,required:true},
    district:{type:String,required:true,default:'gurugram'},
    state:{type:String,required:true,default:'haryana'},
    pincode:{type:Number,required:true}
})
export default addressSchema;

