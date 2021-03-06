const mongoose = require('mongoose');
const multer = require('multer');
const jimp = require('jimp');
const uuid = require('uuid');

const Store = mongoose.model('Store');
const User = mongoose.model('User');

const multerOptions = {
  storage: multer.memoryStorage(),
  fileFilter(req, file, next) {
    const isPhoto = file.mimetype.startsWith('image/');
    if (isPhoto) {
      next(null, true);
    } else {
      next({ message: 'This file type is not allowed!' }, false);
    }
  }
};

exports.homePage = (req, res) => {
  res.render('index', { title: 'Home' });
};

exports.addStore = (req, res) => {
  res.render('editStore', { title: 'Add Store' });
};

exports.upload = multer(multerOptions).single('photo');

exports.resize = async (req, res, next) => {
  if (!req.file) return next();

  const extension = req.file.mimetype.split('/')[1];
  req.body.photo = `${uuid.v4()}.${extension}`;

  const photo = await jimp.read(req.file.buffer);
  await photo.resize(800, jimp.AUTO);
  await photo.write(`./public/uploads/${req.body.photo}`);
  next();
};

exports.createStore = async (req, res) => {
  req.body.author = req.user._id;

  const store = await new Store(req.body).save();
  req.flash(
    'success',
    `Successfully created store <strong>${
      store.name
    }</strong>. Care to leave a review?`
  );
  res.redirect(`/store/${store.slug}`);
};

exports.getStores = async (req, res) => {
  const stores = await Store.find();
  res.render('stores', { title: 'Stores', stores });
};

const confirmOwner = (store, user) => {
  if (!user || !store.author.equals(user._id)) {
    throw Error('You must own the store in order to edit it');
  }
};

exports.editStore = async (req, res) => {
  const store = await Store.findById(req.params.id);

  confirmOwner(store, req.user);

  res.render('editStore', { title: `Edit ${store.name}`, store });
};

exports.updateStore = async (req, res) => {
  req.body.location.type = 'Point'; // schema defaults do not run on updates

  const store = await Store.findByIdAndUpdate(req.params.id, req.body, {
    new: true, //returns the updated doc
    runValidators: true
  }).exec();

  req.flash(
    'success',
    `Successfully updated store <strong>${
      store.name
    }</strong>. <a href="/stores/${store.slug}">View Store</a>`
  );
  res.redirect(`/stores/${store._id}/edit`);
};

exports.getStoreBySlug = async (req, res, next) => {
  const store = await Store.findOne({ slug: req.params.slug }).populate(
    'author reviews'
  );
  if (!store) return next();
  res.render('store', { store, title: store.name });
};

exports.getStoresByTag = async (req, res, next) => {
  const tag = req.params.tag;
  const tagQuery = tag || { $exists: true };
  const tagsPromise = Store.getTagsList();
  const storesPromise = Store.find({ tags: tagQuery });

  const [tags, stores] = await Promise.all([tagsPromise, storesPromise]);

  res.render('tag', { title: 'Tags', tags, stores, tag });
};

exports.searchStores = async (req, res) => {
  const stores = await Store.find(
    {
      $text: {
        $search: req.query.q
      }
    },
    {
      score: { $meta: 'textScore' }
    }
  )
    .sort({
      score: { $meta: 'textScore' }
    })
    .limit(5);

  res.json(stores);
};

exports.mapStores = async (req, res) => {
  const coordinates = [req.query.lng, req.query.lat].map(parseFloat);

  const q = {
    location: {
      $near: {
        $geometry: {
          type: 'Point',
          coordinates
        },
        $maxDistance: 10000
      }
    }
  };

  const stores = await Store.find(q)
    .select('slug name description photo location')
    .limit(10);

  res.json(stores);
};

exports.mapPage = (req, res) => {
  res.render('map', { title: 'Map' });
};

exports.heartStore = async (req, res) => {
  const hearts = req.user.hearts.map(obj => obj.toString());
  const operator = hearts.includes(req.params.id) ? '$pull' : '$addToSet';
  const user = await User.findByIdAndUpdate(
    req.user._id,
    {
      [operator]: { hearts: req.params.id }
    },
    { new: true }
  );

  res.json(hearts);
};

exports.getHearts = async (req, res) => {
  const stores = await Store.find({ _id: { $in: req.user.hearts } });
  res.render('stores', { title: 'Hearted Stores', stores });
};

exports.getTopStores = async (req, res) => {
  const stores = await Store.getTopStores();
  res.render('topStores', { title: 'Top Stores', stores });
};

