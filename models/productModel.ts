import { model, Schema, Types, type Document } from "mongoose";

import type { AddressType } from "./addressModel";
import addressSchema from "./addressModel";

import { ImageGrpSchema, type ImageGroup } from "./imageModel";
import coordinatesSchema from "./coordinatesSchema";
import type { CoordsType } from "./coordinatesSchema";

export interface ProductType extends Document {
  propertyname: string;
  propertytype: string;
  propertysubtype: string;
  description: string;
  price: number;
  typeofaccomodation: string | string[];
  amenities: string | string[];
  address: AddressType;
  area?: number;
  views:number;
  newfield?:string;
  videos?:string[];
  owner: Types.ObjectId | string;
  coordinates: CoordsType;
  photos: ImageGroup[];
    productStatus:"uploaded"|"active"|"inactive"|"live";
    availStatus:'available'|'notavailable';
}

const productSchema = new Schema<ProductType>(
  {
    propertyname: {
      type: String,
      required: true,
    },
    propertytype: {
      type: String,
      required: true,
    },
    propertysubtype: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    price: {
      type: Number,
      required: true,
    },
    typeofaccomodation: {
      type: [String],
      required: true,
      default: [],
    },
    amenities: {
      type: [String],
      required: true,
      default: [],
    },
    area: {
      type: Number,
      required: false,
    },
    videos: {
      type: [String],
      required: false,
      default: [],
    },
    address: {
      type: addressSchema,
      required: true,
    },
    
      views:{
 type:Number,
 default:0
      }
    ,
    coordinates: {
      type: coordinatesSchema,
      required: true,
    },
    photos: {
      type: [ImageGrpSchema],
      required: true,
    },
    owner: {
      type: Schema.Types.ObjectId,
      ref: "user",
      required: false,
    },
    availStatus:{
      type:String,
      enum:["available","notavailable"],
      default:'notavailable'
    },
    newfield:{
      type:String,
      required:false
    },
    productStatus:{
      type:String,
      enum:['uploaded','active','inactive','live'],
      default:'uploaded',
    }
  },
  {
    timestamps: true,
  }
);
productSchema.index({ "coordinates": "2dsphere" });
const Product = model<ProductType>("product", productSchema);

export default Product;
