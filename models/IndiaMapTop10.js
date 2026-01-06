import mongoose from "mongoose";

const schema = new mongoose.Schema(
  {
    tmxId: { type: String, required: true, index: true },
    mapUid: { type: String, required: true, index: true },
    country: { type: String, required: true },

    fetchedAt: { type: Date, required: true, index: true },

    top10: [
      {
        accountId: String,
        displayName: String,
        timeOrScore: Number,
        positionWorld: Number
      }
    ]
  },
  { versionKey: false }
);

schema.index({ mapUid: 1, country: 1 }, { unique: true });

export const IndiaMapTop10 = mongoose.model("IndiaMapTop10", schema);
