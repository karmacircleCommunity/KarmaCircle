import mongoose, { Document, Schema } from "mongoose";

export type EventMode = "Online" | "Offline";

export interface IEvent extends Document {
  name: string;
  uid: string;
  description: string;
  hostUsername: string;
  hostName: string;
  coverImage?: string;
  mode: EventMode;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  mapIframe?: string;
  platform?: string;
  platformLink?: string;
  startTime: Date;
  endTime: Date;
  startDate: Date;
  endDate: Date;
  createdAt: Date;
  updatedAt: Date;
}

const eventSchema = new Schema<IEvent>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    uid: {
      type: String,
      required: true,
      unique: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    hostUsername: {
      type: String,
      required: true,
    },
    hostName: {
      type: String,
      required: true,
      trim: true,
    },
    coverImage: {
      type: String,
      trim: true,
    },
    mode: {
      type: String,
      required: true,
      enum: ["Online", "Offline"],
    },
    address: {
      type: String,
      trim: true,
    },
    city: {
      type: String,
      trim: true,
    },
    state: {
      type: String,
      trim: true,
    },
    country: {
      type: String,
      trim: true,
    },
    mapIframe: {
      type: String,
      trim: true,
    },
    platform: {
      type: String,
      trim: true,
    },
    platformLink: {
      type: String,
      trim: true,
    },
    startTime: {
      type: Date,
      required: true,
    },
    endTime: {
      type: Date,
      required: true,
    },
    startDate: {
      type: Date,
      required: true,
    },
    endDate: {
      type: Date,
      required: true,
    },
  },
  { timestamps: true },
);

export const Event = mongoose.model<IEvent>("Event", eventSchema);
