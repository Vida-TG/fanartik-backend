import express from 'express';
import expressAsyncHandler from 'express-async-handler';
import Book from '../models/bookModel.js';
import User from '../models/userModel.js';
import { isAuth, isCreator,  } from '../utils.js';

const bookRouter = express.Router();


bookRouter.get('/', isAuth, isCreator, expressAsyncHandler(async (req, res) => {
  const bookings = await Book.find({creator: req.user._id,}).populate('user');
  if (!bookings) return res.send({ message: "You have not gotten any booking yet"});
  return res.send({bookings});
}));
  


bookRouter.post(
  '/creator/:creatorId',
  isAuth,
  expressAsyncHandler(async (req, res) => {
    const booking = await Book.findOne({user: req.user._id, creator: req.params.creatorId});
    if (booking) { return res.send({ message: 'You have a pending booking with this artist' }) }
    const newBooking = new Book({
        user: req.user._id,
        price: req.body.price,
        description: req.body.description,
        creator: req.params.creatorId,
    });
    await newBooking.save();
    return res.send({ message: 'You have successfully booked this creator' });
  })
);






export default bookRouter;
