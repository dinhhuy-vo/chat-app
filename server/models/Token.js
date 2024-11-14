import mongoose, { Schema } from "mongoose";

const tokenSchema = new Schema({
  userId: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true,
    unique: true,
  },
  token: {
    type: String,
    required: true,
  },
  createAt: { type: Date, default: Date.now(), expires: 3600 },
});

const Token = mongoose.model("Token", tokenSchema);

export default Token;
