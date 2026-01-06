import mongoose from "mongoose";

const schema = new mongoose.Schema(
  {
    seasonUid: { type: String, required: true, index: true },
    campaignName: { type: String, required: true },
    fetchedAt: { type: Date, required: true },
    displayName: { type: String, required: true },

    rankInIndia: { type: Number, required: true }, // 1..10
    accountId: { type: String, required: true },
    points: { type: Number, required: true } // "sp" from campaign leaderboard
  },
  { versionKey: false }
);

schema.index({ seasonUid: 1, accountId: 1 }, { unique: true });

export const IndiaTop10 = mongoose.model("IndiaTop10", schema);
