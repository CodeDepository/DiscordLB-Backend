import mongoose from "mongoose";

const schema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true }, // "nadeo_live", "nadeo_core"
    accessToken: { type: String, required: true },
    expiresAt: { type: Date, required: true },
    updatedAt: { type: Date, required: true }
  },
  { versionKey: false }
);

export const ApiToken = mongoose.model("ApiToken", schema);
