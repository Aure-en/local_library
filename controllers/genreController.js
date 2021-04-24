const async = require('async');
const { body, validationResult } = require('express-validator');
const Genre = require('../models/genre');
const Book = require('../models/book');

// Display list of all Genre.
exports.genre_list = function (req, res, next) {
  Genre.find()
    .sort([['name', 'ascending']])
    .exec((err, list_genres) => {
      if (err) return next(err);
      res.render('genre_list', { title: 'Genre List', genre_list: list_genres });
    });
};

// Display detail page for a specific Genre.
exports.genre_detail = function (req, res, next) {
  async.parallel({
    genre(callback) {
      Genre.findById(req.params.id)
        .exec(callback);
    },

    genre_books(callback) {
      Book.find({ genre: req.params.id })
        .exec(callback);
    },
  }, (err, results) => {
    if (err) return next(err);
    if (results.genre == null) { // No results
      const err = new Error('Genre not found');
      err.status = 404;
      return next(err);
    }
    // Successful, so render
    res.render('genre_detail', { title: 'Genre Detail', genre: results.genre, genre_books: results.genre_books });
  });
};

// Display Genre create form on GET.
exports.genre_create_get = function (req, res) {
  res.render('genre_form', { title: 'Create Genre' });
};

// Handle Genre create on POST.
exports.genre_create_post = [
  // Validate and sanitize the name field
  body('name', 'Genre name required').trim().isLength({ min: 1 }).escape(),
  // Process request after validation and sanitization
  (req, res, next) => {
    const errors = validationResult(req);
    const genre = new Genre({ name: req.body.name });
    if (!errors.isEmpty()) {
      // There are errors. Render the form again with sanitized values / error messages
      res.render('genre_form', { title: 'Create Genre', genre, errors: errors.array() });
      return;
    }
    // Data is valid
    // Check if Genre with same name already exists
    Genre.findOne({ name: req.body.name })
      .exec((err, found_genre) => {
        if (err) return next(err);
        if (found_genre) {
          // Genre exists, redirect to its detail page
          res.redirect(found_genre.url);
        } else {
          genre.save((err) => {
            if (err) return next(err);
            // Genre saved. Redirect to genre detail page.
            res.redirect(genre.url);
          });
        }
      });
  },
];

// Display Genre delete form on GET.
exports.genre_delete_get = function (req, res, next) {
  async.parallel({
    genre(callback) {
      Genre.findById(req.params.id).exec(callback);
    },

    books(callback) {
      Book.find({ genre: req.params.id }).populate('author').populate('genre').exec(callback);
    },
  }, (err, results) => {
    if (err) return next(err);
    if (results.genre == null) {
      res.redirect('/catalog/genres');
    }
    res.render('genre_delete', { title: 'Delete Genre', genre: results.genre, books: results.books });
  });
};

// Handle Genre delete on POST.
exports.genre_delete_post = function (req, res, next) {
  async.parallel({
    genre(callback) {
      Genre.findById(req.params.id).exec(callback);
    },

    books(callback) {
      Book.find({ genre: req.params.id }).populate('author').populate('genre').exec(callback);
    },
  }, (err, results) => {
    if (err) return next(err);

    // Success
    // If the genre has books, it can't be deleted
    if (results.books.length > 0) {
      res.render('genre_delete', { title: 'Delete Genre', genre: results.genre, books: results.books });
    } else {
      // Genre has no books, delete object and redirect to list of genres.
      Genre.findByIdAndRemove(req.body.genreid, (err) => {
        if (err) return next(err);
        // Success - go to genre list
        res.redirect('/catalog/genres');
      });
    }
  });
};

// Display Genre update form on GET.
exports.genre_update_get = function (req, res, next) {
  Genre.findById(req.params.id).exec((err, genre) => {
    if (err) return next(err);
    if (!genre) {
      const err = new Error('Genre not found');
      err.status = 404;
      return next(err);
    }
    res.render('genre_form', { title: 'Update Genre', genre });
  });
};

// Handle Genre update on POST.
exports.genre_update_post = [
  body('name', 'Genre name required').trim().isLength({ min: 1 }).escape(),

  (req, res, next) => {
    const errors = validationResult(req);
    const genre = new Genre({
      name: req.body.name,
      _id: req.params.id,
    });

    if (!errors.isEmpty()) {
      // There are errors
      // Render form with current value and error messages
      res.render('genre_form', { title: 'Update Genre', genre, errors: errors.array() });
    } else {
      Genre.findByIdAndUpdate(req.params.id, genre, {}, (err) => {
        if (err) return next(err);
        res.redirect(genre.url);
      });
    }
  },
];
