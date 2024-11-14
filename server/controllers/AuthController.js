import jwt from "jsonwebtoken";
import User from "../models/UserModel.js";
import { compare } from "bcrypt";
import { renameSync, unlinkSync } from "fs";
import nodemailer from "nodemailer";
import dotenv from "dotenv";
import { generateVerificationCode, sendMail } from "../utils/SendEmail.js";
import Token from "../models/Token.js";
import bcrypt from "bcrypt";

dotenv.config();

const maxAge = 3 * 24 * 60 * 60 * 1000;
const createToken = (email, userId) => {
  return jwt.sign({ email, userId }, process.env.JWT_KEY, {
    expiresIn: maxAge,
  });
};

export const singup = async (request, response, next) => {
  try {
    const { email, password } = request.body;
    if (!email || !password) {
      return response.status(400).send("Email and password is required");
    }

    const userExists = await User.findOne({ email });
    if (userExists) {
      return response.status(400).send("Duplicate email");
    }

    const code = generateVerificationCode();

    const expirationTime = new Date(Date.now() + 60 * 60 * 1000);

    const savedUser = await User.create({
      email,
      password,
      verifyCode: code,
      expirationTime,
    });

    sendMail(email, "Verify Email", code);

    response.cookie("jwt", createToken(email, savedUser.id), {
      maxAge,
      secure: true,
      sameSite: "None",
    });

    return response.status(201).json({
      user: {
        id: savedUser.id,
        email: savedUser.email,
        profileSetup: savedUser.profileSetup,
      },
    });
  } catch (error) {
    console.log(error);
    return response.status(500).send("Internal Server Error");
  }
};

export const verifyCode = async (req, res, next) => {
  const userId = req.userId;
  const { code } = req.body;

  const user = await User.findOne({ _id: userId });

  if (!user) {
    return next(
      new ErrorException(ErrorCode.Unauthenticated, "Unauthenticated")
    );
  }

  if (code !== user.verifyCode)
    return next(
      new ErrorException(ErrorCode.BadRequest, "Incorrect verification code")
    );

  if (Date.now() > user.expirationTime.getTime()) {
    return next(
      new ErrorException(ErrorCode.RequestTimeout, "Verification code expired")
    );
  }

  await User.updateOne(
    { _id: user._id },
    { $set: { verified: true, verifyCode: null, expirationTime: null } }
  );

  res.status(200).json({ message: "Registration successfully" });
};

export const getToken = async (req, res) => {
  try {
    const user = await User.findOne({ id: req.params.id });
    if (!user) return res.status(400).send({ message: "Invalid link" });

    const token = await Token.findOne({
      userId: user.id,
      token: req.params.token,
    });

    if (!token) return res.status(400).send({ message: "Invalid token" });

    await User.updateOne({ _id: user._id, verified: true });
    await token.remove();

    res.status(200).send({ message: "Email verified successfully" });
  } catch (error) {
    res.status(500).send({ message: "Internal Server Error" });
  }
};

export const login = async (request, response, next) => {
  try {
    const { email, password } = request.body;

    if (!email || !password) {
      return response.status(400).send("Email and password is required");
    }

    const user = await User.findOne({ email });
    if (!user) {
      return response.status(404).send("User with the given email not found");
    }

    const auth = await compare(password, user.password);
    if (!auth) {
      return response.status(400).send("Password is incorrect");
    }
    response.cookie("jwt", createToken(email, user.id), {
      maxAge,
      secure: true,
      sameSite: "None",
    });

    return response.status(200).json({
      user: {
        id: user.id,
        email: user.email,
        profileSetup: user.profileSetup,
        firstName: user.firstName,
        lastName: user.lastName,
        image: user.image,
        color: user.color,
        role: user.role,
        verified: user.verified,
      },
    });
  } catch (error) {
    console.log(error);
    return response.status(500).send("Internal Server Error");
  }
};

export const getUserInfo = async (request, response, next) => {
  try {
    const userData = await User.findById(request.userId);
    if (!userData) {
      return response.status(404).send("User with the given id not found");
    }

    return response.status(200).json({
      id: userData.id,
      email: userData.email,
      profileSetup: userData.profileSetup,
      firstName: userData.firstName,
      lastName: userData.lastName,
      image: userData.image,
      color: userData.color,
    });
  } catch (error) {
    console.log(error);
    return response.status(500).send("Internal Server Error");
  }
};

export const updateProfile = async (request, response, next) => {
  try {
    const { userId } = request;
    const { firstName, lastName, color, newPassword } = request.body;
    if (!firstName || !lastName) {
      return response
        .status(400)
        .send("Firstname, lastname and color are required");
    }

    const updateData = {
      firstName,
      lastName,
      color,
      profileSetup: true,
    };

    if (newPassword) {
      try {
        const saltRounds = 10;
        updateData.password = await bcrypt.hash(newPassword, saltRounds);
      } catch (error) {
        console.error("Password hashing error:", error);
        return res.status(500).json({ message: "Failed to update password" });
      }
    }

    const userData = await User.findByIdAndUpdate(userId, updateData, {
      new: true,
      runValidators: true,
    });

    return response.status(200).json({
      id: userData.id,
      email: userData.email,
      profileSetup: userData.profileSetup,
      firstName: userData.firstName,
      lastName: userData.lastName,
      image: userData.image,
      color: userData.color,
    });
  } catch (error) {
    console.log(error);
    return response.status(500).send("Internal Server Error");
  }
};

export const addProfileImage = async (request, response, next) => {
  try {
    if (!request.file) {
      return response.status(400).send("File is required");
    }

    const date = Date.now();
    let fileName = "uploads/profiles/" + date + request.file.originalname;
    renameSync(request.file.path, fileName);

    const updateUser = await User.findByIdAndUpdate(
      request.userId,
      { image: fileName },
      { new: true, runValidators: true }
    );

    return response.status(200).json({
      image: updateUser.image,
    });
  } catch (error) {
    console.log(error);
    return response.status(500).send("Internal Server Error");
  }
};

export const removeProfileImage = async (request, response, next) => {
  try {
    const { userId } = request;
    const user = await User.findById(userId);

    if (!user) {
      return response.status(404).send("user not found");
    }

    if (user) {
      unlinkSync(user.image);
    }

    user.image = null;
    await user.save();

    return response.status(200).send("Profile image removed successfully");
  } catch (error) {
    console.log(error);
    return response.status(500).send("Internal Server Error");
  }
};

export const logout = async (request, response, next) => {
  try {
    response.cookie("jwt", "", { maxAge: 1, secure: true, sameSite: "None" });
    return response.status(200).send("Logout successfull");
  } catch (error) {
    console.log(error);
    return response.status(500).send("Internal Server Error");
  }
};
