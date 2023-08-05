import express from 'express';
import bcrypt from 'bcryptjs';
import expressAsyncHandler from 'express-async-handler';
import jwt from 'jsonwebtoken';
import User from '../models/userModel.js';
import Art from '../models/artModel.js'
import upload from '../uploadUtils.js';
import fs from 'fs';
import { v2 as cloudinary } from 'cloudinary';
import { isAuth, isAdmin, generateToken, baseUrl, mailgun } from '../utils.js';

const userRouter = express.Router();

userRouter.get(
  '/',
  isAuth,
  isAdmin,
  expressAsyncHandler(async (req, res) => {
    const users = await User.find({});
    return res.send(users);
  })
);

userRouter.get('/creators', expressAsyncHandler(async (req, res) => {
    const users = await User.find({isCreator: true})
    return res.send(users);
  })
);


userRouter.put(
  '/creators/:id',
  isAuth,
  isAdmin,
  expressAsyncHandler(async (req, res) => {
    const user = await User.findById(req.params.id);
    if (user) {
      user.isCreator = !user.isCreator;
      const updatedUser = await user.save();
      return res.send({
        _id: updatedUser._id,
        name: updatedUser.name,
        isCreator: updatedUser.isCreator,
      });
    } else {
      return res.status(404).send({ message: 'User not found' });
    }
  })
);


userRouter.get('/top-creators', async (req, res) => {
  try {
    const topCreators = await User.aggregate([
      {
        $match: { isCreator: true },
      },
      {
        $lookup: {
          from: 'arts',
          let: { userId: '$_id' },
          pipeline: [
            { $match: { $expr: { $eq: ['$creator', '$$userId'] } } },
          ],
          as: 'artworks',
        },
      },
      {
        $project: {
          _id: 1,
          name: 1,
          username: 1,
          email: 1,
          artCount: { $size: '$artworks' },
        },
      },
      { $sort: { artCount: -1 } },
      { $limit: 5 },
    ]);

    res.status(200).json(topCreators);
  } catch (err) {
    res.status(500).json({ message: 'Internal Server Error', error: err });
  }
});



userRouter.get(
  '/:id',
  isAuth,
  isAdmin,
  expressAsyncHandler(async (req, res) => {
    const user = await User.findById(req.params.id);
    if (user) {
      return res.send(user);
    } else {
      res.status(404).send({ message: 'User Not Found' });
    }
  })
);


userRouter.get('/creator-profile/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const creator = await User.findById(id);
    if (!creator || !creator.isCreator) {
      return res.status(404).json({ message: 'Creator not found' });
    }

    const arts = await Art.find({ creator: creator._id }).select('name image price');
    const totalArts = await Art.countDocuments({ creator: creator._id });
    res.status(200).json({ creator, arts, totalArts });
  } catch (err) {
    res.status(500).json({ message: 'Internal Server Error', error: err });
  }
});

userRouter.put(
  '/profile',
  isAuth,
  upload.single('image'), 
  expressAsyncHandler(async (req, res) => {
    const userExists = await User.findOne({ username: req.body.username });
    if (userExists && userExists._id.toString() !== req.user._id.toString()) {
      throw new Error('Username is already taken');
    }
    const user = await User.findById(req.user._id);
    let imageUrl;

    if (user) {
      console.log("user")
      if (req.file) {
        console.log("file")
        const result = await cloudinary.uploader.upload(req.file.path);
        imageUrl = result.secure_url;
        console.log("upload")
        fs.unlink(req.file.path, (err) => {
          if (err) {
            throw new Error('An error occured');
          } else {
            console.log('File deleted successfully');
          }
        });
      }
      user.name = req.body.name || user.name;
      user.username = req.body.username || user.username;
      user.image = imageUrl || "";
      user.email = req.body.email || user.email;
      if (req.body.password) {
        user.password = bcrypt.hashSync(req.body.password, 8);
      }

      const updatedUser = await user.save();
      return res.send({
        _id: updatedUser._id,
        name: updatedUser.name,
        username: updatedUser.username,
        image: updatedUser.image,
        email: updatedUser.email,
        isCreator: updatedUser.isCreator,
        isAdmin: updatedUser.isAdmin,
        token: generateToken(updatedUser),
      });
    } else {
      throw new Error('User not found');
    }
  })
);

userRouter.post(
  '/forget-password',
  expressAsyncHandler(async (req, res) => {
    const user = await User.findOne({ email: req.body.email });

    if (user) {
      const token = jwt.sign({ _id: user._id }, process.env.JWT_SECRET, {
        expiresIn: '3h',
      });
      user.resetToken = token;
      await user.save();

      //reset link
      console.log(`${baseUrl()}/reset-password/${token}`);

      mailgun()
        .messages()
        .send(
          {
            from: 'FanArtiks <me@mg.yourdomain.com>',
            to: `${user.name} <${user.email}>`,
            subject: `Reset Password`,
            html: ` 
             <p>Please Click the following link to reset your password:</p> 
             <a href="${baseUrl()}/reset-password/${token}"}>Reset Password</a>
             `,
          },
          (error, body) => {
            console.log(error);
            console.log(body);
          }
        );
      return res.send({ message: 'We sent reset password link to your email.' });
    } else {
      res.status(404).send({ message: 'User not found' });
    }
  })
);

userRouter.post(
  '/reset-password',
  expressAsyncHandler(async (req, res) => {
    jwt.verify(req.body.token, process.env.JWT_SECRET, async (err, decode) => {
      if (err) {
        res.status(401).send({ message: 'Invalid Token' });
      } else {
        const user = await User.findOne({ resetToken: req.body.token });
        if (user) {
          if (req.body.password) {
            user.password = bcrypt.hashSync(req.body.password, 8);
            await user.save();
            return res.send({
              message: 'Password reseted successfully',
            });
          }
        } else {
          res.status(404).send({ message: 'User not found' });
        }
      }
    });
  })
);

userRouter.put(
  '/:id',
  isAuth,
  isAdmin,
  expressAsyncHandler(async (req, res) => {
    const user = await User.findById(req.params.id);
    if (user) {
      user.name = req.body.name || user.name;
      user.email = req.body.email || user.email;
      user.isAdmin = Boolean(req.body.isAdmin);
      const updatedUser = await user.save();
      return res.send({ message: 'User Updated', user: updatedUser });
    } else {
      res.status(404).send({ message: 'User Not Found' });
    }
  })
);

userRouter.delete(
  '/:id',
  isAuth,
  isAdmin,
  expressAsyncHandler(async (req, res) => {
    const user = await User.findById(req.params.id);
    if (user) {
      if (user.email === 'admin@example.com') {
        res.status(400).send({ message: 'Cannot Delete Admin User' });
        return;
      }
      await user.remove();
      return res.send({ message: 'User Deleted' });
    } else {
      res.status(404).send({ message: 'User Not Found' });
    }
  })
);
userRouter.post(
  '/signin',
  expressAsyncHandler(async (req, res) => {
    const user = await User.findOne({ email: req.body.email });
    if (user) {
      if (bcrypt.compareSync(req.body.password, user.password)) {
        return res.send({
          _id: user._id,
          name: user.name,
          username: user.username,
          email: user.email,
          isCreator: user.isCreator,
          isAdmin: user.isAdmin,
          token: generateToken(user),
        });
      }
    }
    res.status(401).send({ message: 'Invalid email or password' });
  })
);

userRouter.post(
  '/signup',
  expressAsyncHandler(async (req, res) => {
    const initialUsername = `${req.body.name.replace(/\s+/g, '_')}${Math.random().toString().substring(2, 7)}`
    const newUser = new User({
      name: req.body.name,
      email: req.body.email,
      username: initialUsername,
      password: bcrypt.hashSync(req.body.password),
    });
    const user = await newUser.save();    
    return res.send({
      _id: user._id,
      name: user.name,
      username: user.username,
      email: user.email,
      isCreator: user.isCreator,
      isAdmin: user.isAdmin,
      token: generateToken(user),
    });
  })
);



userRouter.post(
  '/creator-signup',
  expressAsyncHandler(async (req, res) => {
    const userExists = await User.findOne({ username: req.body.username });
    if (userExists && userExists._id.toString() !== req.user._id.toString()) {
      throw new Error('Username is already taken');
    }
    const newUser = new User({
      name: req.body.name,
      email: req.body.email,
      username: req.body.username,
      isCreator: true,
      password: bcrypt.hashSync(req.body.password),
    });
    const user = await newUser.save();    
    return res.send({
      _id: user._id,
      name: user.name,
      username: user.username,
      email: user.email,
      isCreator: user.isCreator,
      isAdmin: user.isAdmin,
      token: generateToken(user),
    });
  })
);


export default userRouter;
