import argon2 from "argon2";
import {model,Schema,Document,Types} from "mongoose";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
dotenv.config();

export interface UserTypes extends Document {
  username:string;
  email:string;
  password:string;
  phone:string;
  avatar?:string;
  status:'active'|'suspended';
  product:Types.ObjectId[]
  role:"user"|"home"|"adder"|"admin";

  comparePassword(password:string):Promise<boolean>;
  generateAccessToken():Promise<string | undefined>;
  generateRefreshToken():Promise<string|undefined>;
}

const userSchema = new Schema<UserTypes>({
username : {
    type : String,
    required:true
},
email:{
    type:String,
    required:true
},
password:{
    type:String,
    required:true
},
phone:{
    type:String,
    required:true
},
avatar:String,
role:{
    type:String,
    enum:["user","home","adder","admin"],
    default:"user",
},
status:{
type:String,
enum:['active','suspended'],
default:'active'
},
product:[
    {
        type:Schema.Types.ObjectId,
        ref:"product",
    },
],
},
{
timestamps:true,
});

userSchema.pre<UserTypes>("save",async function(next){
    if(!this.isModified("password"))
    {
        return next();
    }
    try {
        const hash_password = await argon2.hash(this.password);
        this.password = hash_password;
        next();
    } catch (error) {
        console.error("Error is hashing pwd",error);
        next(error as any);
    }
});

userSchema.methods.comparePassword = async function(password:string):Promise<boolean>{
    return await argon2.verify(this.password,password);
};

userSchema.methods.generateAccessToken = async function(): Promise<string|undefined>{
    try {
        return jwt.sign({
            userId:this._id.toString(),
        },
        process.env.JWT_ACCESSTOKEN_SECRET_KEY as string,
        {expiresIn:"30h"}
    );
    } catch (error) {
      console.error("Error in genrating access_token",error)  
    }
};

userSchema.methods.generateRefreshToken = async function():Promise<string | undefined>{
    try {
        const generate_refresh_token = jwt.sign(
            {
                userId:this._id.toString(),
            },
            process.env.JWT_REFRESHTOKEN_SECRET_KEY as string,
            {expiresIn:"32d"}
        );
return generate_refresh_token;
    } catch (error) {
        console.error("Error in generating refresh token",error);

    }
};

const User = model<UserTypes>("user",userSchema);

export default User;

