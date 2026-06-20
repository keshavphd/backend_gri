import type { NextFunction, Request, Response } from "express";
import jwt, { JwtPayload } from "jsonwebtoken"

declare global {
    namespace Express {
        interface Request {
            userId?:string;
        }
    }
}

const auth = async(req:Request,res:Response,next:NextFunction):Promise<void> =>{
  try {
    const token = req.cookies.access_token || req.headers.authorization?.split(" ")[1];

    if(!token){
        res.status(500).json({msg:"Login again"});
        return;
    }

    let verifyToken: string | JwtPayload;
    try {
      
        verifyToken = jwt.verify(token,process.env.JWT_ACCESSTOKEN_SECRET_KEY as string);
    } catch (error) {
      
         res.status(401).json({msg:"Session timeout Login again"});
         return;
    }
    if(!verifyToken || typeof verifyToken === "string" || !("userId" in verifyToken)){
         res.status(400).json({msg:"Unathorize access"});
         return;
    }

    req.userId = (verifyToken as {userId:string}).userId;
next();
  } catch (error) {
    res.status(402).json({msg:"Please login first"}) ;
    return;
  }
}

export default auth;