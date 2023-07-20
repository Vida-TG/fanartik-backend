import express from 'express';
import Art from '../models/artModel.js';
import data from '../data.js';
import User from '../models/userModel.js';

const seedRouter = express.Router();

seedRouter.get('/', async (req, res) => {
  await Art.remove({});
  const createdArts = await Art.insertMany(data.arts);
  await User.remove({});
  const createdUsers = await User.insertMany(data.users);
  res.send({ createdArts, createdUsers });
});
export default seedRouter;
