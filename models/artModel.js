import mongoose from 'mongoose';

const artSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true },
    slug: { type: String, required: true, unique: true },
    image: { type: String, required: true },
    images: [String],
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    category: { type: String, required: true },
    description: { type: String, required: true },
    price: { type: Number, required: true },
    noOfPieces: { type: Number, required: true },
  },
  {
    timestamps: true,
  }
);

const Art = mongoose.model('Art', artSchema);
export default Art;
