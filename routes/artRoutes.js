import express from 'express';
import expressAsyncHandler from 'express-async-handler';
import Art from '../models/artModel.js';
import { isAuth, isCreator, isAdmin, slugify } from '../utils.js';
import upload from '../uploadUtils.js';
import fs from 'fs';
import { v2 as cloudinary } from 'cloudinary';

const artRouter = express.Router();

artRouter.get('/', async (req, res) => {
  const arts = await Art.find();
  res.send(arts);
});


artRouter.get('/recent-artworks', async (req, res) => {
  try {
    const recentArtworks = await Art.find()
      .sort({ createdAt: -1 })
      .limit(10)
      .populate('creator', 'username');

    const formattedArtworks = recentArtworks.map((artwork) => {
      return {
        name: artwork.name,
        slug: artwork.slug,
        image: artwork.image,
        price: artwork.price,
        creator: artwork.creator.username,
      };
    });

    res.status(200).json(formattedArtworks);
  } catch (err) {
    res.status(500).json({ message: 'Internal Server Error', error: err });
  }
});



artRouter.get('/get-by-category', async (req, res) => {
  try {
    const categories = ['painting', 'digital', 'craft'];
    const recentArtworksByCategory = {};

    for (const category of categories) {
      const artworks = await Art.find({ category })
        .sort({ createdAt: -1 })
        .limit(4);
      recentArtworksByCategory[category] = artworks;
    }

    res.status(200).json(recentArtworksByCategory);
  } catch (err) {
    res.status(500).json({ message: 'Internal Server Error', error: err });
  }
});



artRouter.post(
  '/',
  isAuth,
  isCreator,
  upload.single('image'), 
  expressAsyncHandler(async (req, res) => {
    const payload = req.body
    
    let imageUrl = "https://raw.githubusercontent.com/Vida-TG/fanartik-frontend/main/default.png";
    if (req.file) {
      const result = await cloudinary.uploader.upload(req.file.path);
      imageUrl = result.secure_url;
      fs.unlink(req.file.path, (err) => {
        if (err) {
          console.error('Error deleting file:', err);
        } else {
          console.log('File deleted successfully');
        }
      });
    }

    const newArt = new Art({
      name: payload.name,
      slug: slugify(payload.name) + Date.now(),
      image: imageUrl,
      price: payload.price,
      category: payload.category,
      noOfPieces: payload.noOfPieces,
      description: payload.description,
      creator: req.user._id,
    });
    const art = await newArt.save();
    res.send({ message: 'Art Created', art });
  })
);

artRouter.put(
  '/:id',
  isAuth,
  isCreator,
  upload.single('image'), 
  expressAsyncHandler(async (req, res) => {
    const artId = req.params.id;
    const art = await Art.findById(artId);

    if (art) {
      let imageUrl = ""
      if (req.file) {
        const result = await cloudinary.uploader.upload(req.file.path);
        imageUrl = result.secure_url;
        fs.unlink(req.file.path, (err) => {
          if (err) {
            console.error('Error deleting file:', err);
          } else {
            console.log('File deleted successfully');
          }
        });
      }


      art.name = req.body.name;
      art.price = req.body.price;
      art.image = imageUrl || art.image;
      art.category = req.body.category;
      art.noOfPieces = req.body.noOfPieces;
      art.description = req.body.description;
      await art.save();
      res.send({ message: 'Art Updated' });
    } else {
      res.status(404).send({ message: 'Art Not Found' });
    }
  })
);

artRouter.delete(
  '/:id',
  isAuth,
  isAdmin,
  expressAsyncHandler(async (req, res) => {
    const art = await Art.findById(req.params.id);
    if (art) {
      await art.remove();
      res.send({ message: 'Art Deleted' });
    } else {
      res.status(404).send({ message: 'Art Not Found' });
    }
  })
);

const PAGE_SIZE = 3;

artRouter.get(
  '/admin',
  isAuth,
  isAdmin,
  expressAsyncHandler(async (req, res) => {
    const { query } = req;
    const page = query.page || 1;
    const pageSize = query.pageSize || PAGE_SIZE;

    const arts = await Art.find()
      .skip(pageSize * (page - 1))
      .limit(pageSize);
    const countArts = await Art.countDocuments();
    res.send({
      arts,
      countArts,
      page,
      pages: Math.ceil(countArts / pageSize),
    });
  })
);

artRouter.get(
  '/search',
  expressAsyncHandler(async (req, res) => {
    const { query } = req;
    const pageSize = query.pageSize || PAGE_SIZE;
    const page = query.page || 1;
    const category = query.category || '';
    const price = query.price || '';
    const order = query.order || '';
    const searchQuery = query.query || '';

    const queryFilter =
      searchQuery && searchQuery !== 'all'
        ? {
            name: {
              $regex: searchQuery,
              $options: 'i',
            },
          }
        : {};
    const categoryFilter = category && category !== 'all' ? { category } : {};
    const priceFilter =
      price && price !== 'all'
        ? {
            // 1-50
            price: {
              $gte: Number(price.split('-')[0]),
              $lte: Number(price.split('-')[1]),
            },
          }
        : {};
    const sortOrder =
      order === 'featured'
        ? { featured: -1 }
        : order === 'lowest'
        ? { price: 1 }
        : order === 'highest'
        ? { price: -1 }
        : { _id: -1 };

    const arts = await Art.find({
      ...queryFilter,
      ...categoryFilter,
      ...priceFilter,
    })
      .sort(sortOrder)
      .skip(pageSize * (page - 1))
      .limit(pageSize);

    const countArts = await Art.countDocuments({
      ...queryFilter,
      ...categoryFilter,
      ...priceFilter,
    });
    res.send({
      arts,
      countArts,
      page,
      pages: Math.ceil(countArts / pageSize),
    });
  })
);

artRouter.get(
  '/categories',
  expressAsyncHandler(async (req, res) => {
    const categories = await Art.find().distinct('category');
    res.send(categories);
  })
);

artRouter.get('/slug/:slug', async (req, res) => {
  const art = await Art.findOne({ slug: req.params.slug });
  if (art) {
    res.send(art);
  } else {
    res.status(404).send({ message: 'Art Not Found' });
  }
});
artRouter.get('/:id', async (req, res) => {
  const art = await Art.findById(req.params.id);
  if (art) {
    res.send(art);
  } else {
    res.status(404).send({ message: 'Art Not Found' });
  }
});

export default artRouter;
