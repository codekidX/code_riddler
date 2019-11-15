const express = require('express');
const app = express();
const path = require('path');
const request = require('request');
const bp = require('body-parser');
const cookieParser = require('cookie-parser');
const config = require('config');

const ObjectId = require('mongodb').ObjectId;
const mongoose = require('mongoose');
const Schemas = require('./db/schemas').Schemas;

mongoose.connect(config.get('mongo.url'), {
  useNewUrlParser: true,
  useUnifiedTopology: true
});
console.log('Connected to mongodb');

const schemas = new Schemas(mongoose);

async function jwtAuth(req, res, next) {
  if (!req.cookies.sid) {
    res.redirect('/');
    return;
  }
  console.log(req.cookies);
  const user = await schemas.User.findOne({ ghId: Number(req.cookies.sid) });
  req.user = user;
  next();
}

app.set('view engine', 'ejs');
app.use(cookieParser());
app.use(bp.json());
app.use(bp.urlencoded({ extended: true }));
app.use('/static', express.static(path.join(__dirname, 'static')));

const initialGlobalState = {
  loggedIn: false
};

app.get('/', async (req, res) => {
  const user = await schemas.User.findOne({ ghId: Number(req.cookies.sid ? req.cookies.sid : 0) });
  req.user = user ? user : undefined;
  res.render('index', {
    title: 'Code Riddler',
    home: true,
    authPage: false,
    pageId: 'index',
    stylesPath: './',
    env: process.NODE_ENV,
    id: req.user !== undefined ? req.user._id : '',
    username: req.user !== undefined ? req.user.username : 'Profile',
    loggedIn: req.user !== undefined,
    points: req.user !== undefined ? req.user.points : 0
  });
});

app.get('/riddle/:id', [jwtAuth], async (req, res) => {
  // TODO: add aggregate to see if user has solved or not
  const $match = {
    _id: ObjectId(req.params.id),
    is_approved: true
  };
  const riddle = await schemas.Riddle.aggregate([
    {
      $match
    },
    {
      $addFields: {
        is_solved: {
          $cond: {
            if: { $in: ['$_id', req.user.solved_riddles] },
            then: true,
            else: false
          }
        },
        published_by_me: {
          $cond: {
            if: { $eq: ['$publisher_id', req.user._id] },
            then: true,
            else: false
          }
        }
      }
    }
  ]);
  res.render('single_riddle', {
    title: 'Code Riddler',
    home: false,
    pageId: 'single_riddle',
    riddleBannerText: 'Riddle',
    env: process.NODE_ENV,
    id: req.user !== undefined ? req.user._id : '',
    username: req.user !== undefined ? req.user.username : 'Profile',
    stylesPath: '../',
    loggedIn: req.user !== undefined,
    points: req.user !== undefined ? req.user.points : 0,
    riddle: riddle[0]
  });
});

app.get('/riddles', [jwtAuth], async (req, res) => {
  // TODO: add aggregate to see if user has solved or not
  const $match = {
    is_approved: true
  };
  const riddles = await schemas.Riddle.aggregate([
    {
      $match
    },
    {
      $addFields: {
        is_solved: {
          $cond: {
            if: { $in: ['$_id', req.user.solved_riddles] },
            then: true,
            else: false
          }
        },
        published_by_me: {
          $cond: {
            if: { $eq: ['$publisher_id', req.user._id] },
            then: true,
            else: false
          }
        }
      }
    }
  ]);

  res.render('riddles', {
    title: 'Code Riddler',
    home: false,
    authPage: false,
    pageId: 'riddles',
    riddleBannerText: 'Riddles',
    env: process.NODE_ENV,
    id: req.user !== undefined ? req.user._id : '',
    username: req.user !== undefined ? req.user.username : 'Profile',
    stylesPath: './',
    loggedIn: req.user !== undefined,
    points: req.user !== undefined ? req.user.points : 0,
    riddles
  });
});

app.get('/submit', (req, res) => {
  res.render('submit', {
    title: 'Code Riddler',
    home: false,
    authPage: false,
    pageId: 'submit',
    env: process.NODE_ENV,
    id: req.user !== undefined ? req.user._id : '',
    username: req.user !== undefined ? req.user.username : 'Profile',
    points: req.user !== undefined ? req.user.points : 0,
    stylesPath: './',
    loggedIn: req.user !== undefined
  });
});

app.post('/submit/riddle', [jwtAuth], async (req, res) => {
  const riddle = new schemas.Riddle({
      ...req.body,
      worth: 10,
      is_approved: false,
      hint: '',
      publisher_id: req.user._id,
      publisher_name: req.user.username
  });
  await riddle.save();
  await schemas.User.updateOne({
      _id: req.user._id
    }, {
        $inc: {
            points: 2
        }
    });
  res.json({
    message: 'haha'
  });
});

app.post('/submit/answer/:id', [jwtAuth], async (req, res) => {
  const riddle = await schemas.Riddle.findOne({
    _id: ObjectId(req.params.id)
  });
  let answers = riddle.answers.split(',');
  answers = answers.map(e => e.trim());
  if (answers.includes(String(req.body.answer).toLowerCase())) {
    await schemas.User.updateOne(
      { _id: req.user._id },
      {
        $inc: {
          points: riddle.worth
        },
        $addToSet: {
          solved_riddles: riddle._id
        }
      }
    );
    return res.json({
      success: true,
      message: 'success'
    });
  } else {
    res.json({
      success: false,
      message: 'Wrong answer'
    });
  }
});

app.get('/profile/:id', async (req, res) => {
    const user = await schemas.User.findOne({_id: ObjectId(req.params.id)});
    const riddlesPublishedByMe = await schemas.Riddle.find({publisher_id: ObjectId(req.params.id)}).count();
    res.render('profile', {
        title: 'Code Riddler',
        home: false,
        authPage: false,
        pageId: 'profile',
        env: process.NODE_ENV,
        id: req.user !== undefined ? req.user._id : '',
        username: req.user !== undefined ? req.user.username : 'Profile',
        points: req.user !== undefined ? req.user.points : 0,
        stylesPath: '../',
        profileUser: user,
        riddlesPublishedByMe,
        loggedIn: req.user !== undefined
      });
});

app.get('/auth/ghcallback', (req, res) => {
  const code = req.query.code;
  // do a post call for access token here
  request(
    'https://github.com/login/oauth/access_token',
    {
      method: 'POST',
      json: true,
      body: {
        client_id: config.get('github.clientId'),
        client_secret: config.get('github.clientSecret'),
        code
      }
    },
    (err, resp, body) => {
      if (err) {
        throw err;
      }
      request(
        'https://api.github.com/user',
        {
          headers: {
            Authorization: `token ${body.access_token}`,
            'User-Agent': 'CodeRiddlerServer'
          }
        },
        async (err, userResp, userBody) => {
          if (userResp.statusCode != 200) {
            res.render('error', {
              title: 'Code Riddler',
              home: false,
              authPage: false,
              username: 'Profile',
              pageId: 'error',
              env: process.NODE_ENV,
              id: req.user !== undefined ? req.user._id : '',
              points: req.user !== undefined ? req.user.points : 0,
              stylesPath: '../', // 2 level api end point so we need to go one folder back
              ...initialGlobalState
            });
            return;
          }
          const userData = JSON.parse(userBody);
          const riddler = await schemas.User.findOne({ ghId: userData.id });
          if (!riddler) {
            const user = new schemas.User({
              username: userData.login,
              ghId: userData.id,
              ghInfo: userData,
              points: 50
            });
            await user.save();
          }

          res.render('login_mw', {
            title: 'Code Riddler',
            home: false,
            authPage: false,
            username: userData.login,
            token: userData.id,
            pageId: 'login_mw',
            env: process.NODE_ENV,
            id: req.user !== undefined ? req.user._id : '',
            points: req.user !== undefined ? req.user.points : 0,
            stylesPath: '../', // 2 level api end point so we need to go one folder back
            ...initialGlobalState
          });
        }
      );
    }
  );
});

/**
 * PUBLIC APIs
 */

const public = express.Router();

public.post('/auth', (req, res) => {
  if (!req.user) {
    return res.sendStatus(401);
  }
  return res.json({
    token: 'sometoken'
  });
});

app.use('/public', public);

app.listen(3000, () => {
  console.log('server has started');
});
