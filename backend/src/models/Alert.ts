import { Schema, model, Document } from "mongoose";

export interface IAlert extends Document {
  origin: string;
  destination: string;
  departureDate: Date;
  returnDate?: Date;
  maxPrice: number;
  pushToken?: string;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const alertSchema = new Schema<IAlert>(
  {
    origin: { type: String, required: true },
    destination: { type: String, required: true },
    departureDate: { type: Date, required: true },
    returnDate: { type: Date },
    maxPrice: { type: Number, required: true },
    pushToken: { type: String },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export const Alert = model<IAlert>("Alert", alertSchema);
