import Userbook from "../models/userModel.js";
import type { Request, Response } from "express";
import type { UserTypes } from "../models/userModel.js";
import type { CookieOptions } from "express";
import jwt from "jsonwebtoken";

interface RegisterRequestBody {
  username: string;
  email: string;
  phone: string;
  password: string;
}

interface RegisterResponseBody {
  createUser?: UserTypes | null;
  msg: string;
}

const userRegister = async (
  req: Request<{}, {}, RegisterRequestBody>,
  res: Response<RegisterResponseBody>
): Promise<Response<RegisterResponseBody>> => {
  try {
    const { username, email, phone, password } = req.body;
    const userExist = await Userbook.findOne({ $or: [{ email }, { phone }] });
    if (userExist) {
      return res.status(409).json({
        createUser: null as any,
        msg: "User already exist with this credentials please enter another email or phone ",
      });
    }
    const createUser = await Userbook.create(req.body);

    return res.status(201).json({
      msg: "User created successfully",
    });
  } catch (error) {
    return res.status(500).json({
      createUser: null as any,
      msg: "Internal server error! Try after sometime",
    });
  }
};

type LoginRequestBody = Omit<RegisterRequestBody, "username">;

interface LoginResponseBody {
  msg: string;
  userToken?: {
    accessToken: string | undefined;
    refreshToken: string | undefined;
  };
}

const userLogin = async (
  req: Request<{}, {}, LoginRequestBody>,
  res: Response<LoginResponseBody>
): Promise<Response<LoginResponseBody>> => {
  try {
    const { email, phone, password } = req.body;

    if (!password || (!email && !phone)) {
      return res.status(400).json({ msg: "All fields required" });
    }

    const userExist = email
      ? await Userbook.findOne({ email })
      : await Userbook.findOne({ phone });

    if (!userExist) {
      return res.status(404).json({
        msg: email
          ? "Email not registered! Please register first"
          : "Mobile not registered! Please register first",
      });
    }

    if (userExist.status !== "active") {
      return res
        .status(403)
        .json({ msg: "Your account is suspended! Please contact support" });
    }

    const checkPassword = await userExist.comparePassword(password);
    if (!checkPassword)
      return res.status(404).json({ msg: "Invalid password" });

    const accessToken = await userExist.generateAccessToken();
    const refreshToken = await userExist.generateRefreshToken();

    if (!accessToken || !refreshToken) {
      return res
        .status(500)
        .json({ msg: "Failed to create authentication tokens" });
    }

    const isWebClient = req.headers["x-client-type"] === "web";

    const cookieOption: CookieOptions = {
      httpOnly: true,
      secure: true,
      sameSite: "none" as const,
      maxAge: 32 * 24 * 60 * 60 * 1000,
    };

    if (isWebClient) {
      res.cookie("access_token", accessToken, cookieOption);
      res.cookie("refresh_token", refreshToken, cookieOption);

      return res.status(200).json({ msg: "Login successful" });
    }

    return res.status(200).json({
      msg: "Login successful",
      userToken: { accessToken, refreshToken },
    });
  } catch (error) {
    return res.status(500).json({ msg: "Internal server error" });
  }
};

const userLogout = (req: Request, res: Response) => {
  res.clearCookie("access_token", {
    httpOnly: true,
    secure: true,
    sameSite: "none",
  });
  res.clearCookie("refresh_token", {
    httpOnly: true,
    secure: true,
    sameSite: "none",
  });

  return res.status(200).json({ msg: "Logout successful" });
};


interface UpdateTokenResponseBody {
  msg: string;
  userToken?: {
    accessToken: string;
  };
}

const updatedToken = async (
  req: Request,
  res: Response<UpdateTokenResponseBody>
): Promise<Response<UpdateTokenResponseBody>> => {
  try {
    const refreshToken =
      req.cookies.refresh_token || req.headers.authorization?.split(" ")[1];

    if (!refreshToken) {
      return res.status(402).json({ msg: "signin again" });
    }

    let verifyToken;
    try {
      verifyToken = jwt.verify(
        refreshToken,
        process.env.JWT_REFRESHTOKEN_SECRET_KEY as string
       
        
      );
    } catch (err) {
      return res
        .status(400)
        .json({ msg: "Session timeout! Please login again" });
    }
    if (
      !verifyToken ||
      typeof verifyToken === "string" ||
      !("userId" in verifyToken)
    ) {
      return res
        .status(400)
        .json({ msg: "Session timeout! Please login again" });
    }
    const userId = verifyToken.userId;
    const data = await Userbook.findOne({ _id: userId });

    if (!data) {
      return res.status(404).json({ msg: "User not found" });
    }

    const accessToken = await data.generateAccessToken();

    if (!accessToken) {
      return res.status(500).json({ msg: "Unable to generate access token" });
    }
    const isWebClient = req.headers["x-client-type"] === "web";
    const cookieOption: CookieOptions = {
      httpOnly: true,
      secure: true,
      sameSite: "none" as const,
      maxAge: 32 * 24 * 60 * 60 * 1000,
    };
    if (isWebClient) {
      res.cookie("access_token", accessToken, cookieOption);
      return res.status(200).json({ msg: "New token generated" });
    }
    return res
      .status(200)
      .json({ msg: "token generated", userToken: { accessToken } });
  } catch (error) {
    return res.status(400).json({ msg: "Error in token generation" });
  }
};

type UserDataResponseBody = {
  msg?: string;
  user?: object;
};

type UserDataRequestBody = {
  _id: string;
};

const userData = async (
  req: Request<{}, UserDataResponseBody, UserDataRequestBody>,
  res: Response<UserDataResponseBody>
): Promise<Response<UserDataResponseBody>> => {
  try {
    const _id = req.userId;
    if (!_id) {
      return res.status(400).json({ msg: "UserId missing" });
    }
    const userDetail = await Userbook.findOne({ _id })
      .select({ password: 0,_id:0 })
      .populate({
        path: "product",
        select:{"address.addressline1": 1,
            "address.city": 1,
            "address.district": 1,
            "address.state": 1,
            "address.pincode": 1,
            'address._id':1,
            "propertyname": 1,
            "price": 1,
            "views":1,
            "availStatus":1,
            "propertytype": 1,
            "typeofaccomodation":1,
            'propertysubtype':1,
           "photos": { $slice: 1 }}
      });

    if (!userDetail) {
      return res.status(404).json({ msg: "User not found" });
    }

    return res.status(200).json({ user: userDetail });
  } catch (error) {
    return res.status(500).json({ msg: "unable to find user" });
  }
};

export default { userRegister,userLogout, userLogin, updatedToken, userData };
