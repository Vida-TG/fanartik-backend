import express from 'express';
import expressAsyncHandler from 'express-async-handler';
import Art from '../models/artModel.js';
import { isAuth, isAdmin } from '../utils.js';

const artRouter = express.Router();

artRouter.get('/', async (req, res) => {
  const arts = await Art.find();
  res.send(arts);
});

artRouter.post(
  '/',
  isAuth,
  isAdmin,
  expressAsyncHandler(async (req, res) => {
    const newArt = new Art({
      name: 'sample name ' + Date.now(),
      slug: 'sample-name-' + Date.now(),
      image: '/images/p1.jpg',
      price: 0,
      category: 'sample category',
      brand: 'sample brand',
      countInStock: 0,
      rating: 0,
      numReviews: 0,
      description: 'sample description',
    });
    const art = await newArt.save();
    res.send({ message: 'Art Created', art });
  })
);

artRouter.put(
  '/:id',
  isAuth,
  isAdmin,
  expressAsyncHandler(async (req, res) => {
    const artId = req.params.id;
    const art = await Art.findById(artId);
    if (art) {
      art.name = req.body.name;
      art.slug = req.body.slug;
      art.price = req.body.price;
      art.image = req.body.image;
      art.images = req.body.images;
      art.category = req.body.category;
      art.brand = req.body.brand;
      art.countInStock = req.body.countInStock;
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

artRouter.post(
  '/:id/reviews',
  isAuth,
  expressAsyncHandler(async (req, res) => {
    const artId = req.params.id;
    const art = await Art.findById(artId);
    if (art) {
      if (art.reviews.find((x) => x.name === req.user.name)) {
        return res
          .status(400)
          .send({ message: 'You already submitted a review' });
      }

      const review = {
        name: req.user.name,
        rating: Number(req.body.rating),
        comment: req.body.comment,
      };
      art.reviews.push(review);
      art.numReviews = art.reviews.length;
      art.rating =
        art.reviews.reduce((a, c) => c.rating + a, 0) /
        art.reviews.length;
      const updatedArt = await art.save();
      res.status(201).send({
        message: 'Review Created',
        review: updatedArt.reviews[updatedArt.reviews.length - 1],
        numReviews: art.numReviews,
        rating: art.rating,
      });
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
    const rating = query.rating || '';
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
    const ratingFilter =
      rating && rating !== 'all'
        ? {
            rating: {
              $gte: Number(rating),
            },
          }
        : {};
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
        : order === 'toprated'
        ? { rating: -1 }
        : order === 'newest'
        ? { createdAt: -1 }
        : { _id: -1 };

    const arts = await Art.find({
      ...queryFilter,
      ...categoryFilter,
      ...priceFilter,
      ...ratingFilter,
    })
      .sort(sortOrder)
      .skip(pageSize * (page - 1))
      .limit(pageSize);

    const countArts = await Art.countDocuments({
      ...queryFilter,
      ...categoryFilter,
      ...priceFilter,
      ...ratingFilter,
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
