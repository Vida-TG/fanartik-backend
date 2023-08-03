import express from 'express';
import expressAsyncHandler from 'express-async-handler';
import Request from '../models/requestModel.js';
import User from '../models/userModel.js';
import { isAuth, isAdmin,  } from '../utils.js';

const requestRouter = express.Router();


requestRouter.get('/', isAuth, expressAsyncHandler(async (req, res) => {
  const requests = await Request.find({}).populate('user');
  res.send(requests);
}));


requestRouter.get('/create', isAuth, isAdmin, expressAsyncHandler(async (req, res) => {
  const request = await Request.find({user: req.user._id,});
  if (request) return res.send({request: true});
  else return res.send({request: false});
}));


requestRouter.post(
  '/',
  isAuth,
  expressAsyncHandler(async (req, res) => {
    const request = await Request.findOne({user: req.user._id,});
    if (request) { return res.send({ message: 'You have previously requested' }) }
    const newRequest = new Request({
        user: req.user._id,
    });
    await newRequest.save();
    return res.send({ message: 'You have successfully requested to become a creator' });
  })
);


requestRouter.post(
    '/approve/:id',
    isAuth,
    isAdmin,
    expressAsyncHandler(async (req, res) => {
      const request = await Request.findById(req.params.id).populate('user');
      const user = await User.findById(request.user._id)
      if (request && user) {
        user.isCreator = true;
        await user.save();
        res.send({ message: 'Successful' });
      } else {
        res.status(404).send({ message: 'An error occured' });
      }
    })
  );
  

requestRouter.delete(
  '/:id',
  isAuth,
  isAdmin,
  expressAsyncHandler(async (req, res) => {
    const request = await Request.findById(req.params.id);
    if (request) {
      await request.remove();
      res.send({ message: 'Request Deleted' });
    } else {
      res.status(404).send({ message: 'Request Not Found' });
    }
  })
);


export default requestRouter;
