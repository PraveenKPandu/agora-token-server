require("dotenv").config();
require("./config/database").connect();
const express = require("express");
const bcrypt = require("bcryptjs");

const jwt = require("jsonwebtoken");
var {
  RtcTokenBuilder,
  RtcRole,
  RtmTokenBuilder,
  RtmRole,
} = require("agora-access-token");

const User = require("./model/user");
const auth = require("./middleware/auth");

const APP_ID = process.env.APP_ID;
const APP_CERTIFICATE = process.env.APP_CERTIFICATE;

const app = express();

app.use(express.json({ limit: "50mb" }));

function getNextSequence(db, name, callback) {
  db.collection("counters").findAndModify(
    { _id: name },
    null,
    { $inc: { seq: 1 } },
    function (err, result) {
      if (err) callback(err, result);
      callback(err, result.value.seq);
    }
  );
}

app.get("/register", async (req, res) => {
  try {
    // Get user input
    const { name, email, password } = req.query;

    // Validate user input
    if (!(email && password && name)) {
      res.status(400).json({ message: "All input is required" });
    }

    // check if user already exist
    // Validate if user exist in our database
    const oldUser = await User.findOne({ email });

    if (oldUser) {
      return res
        .status(409)
        .json({ error: "User Already Exist. Please Login" });
    } else {
      //Encrypt user password
      encryptedPassword = await bcrypt.hash(password, 10);

      // Create user in our database
      const user = await User.create({
        name,
        email: email.toLowerCase(), // sanitize: convert email to lowercase
        password: encryptedPassword,
      });

      // Create token
      const token = jwt.sign(
        { user_id: user._id, email },
        process.env.TOKEN_KEY,
        {
          expiresIn: "2h",
        }
      );
      // save user token
      user.token = token;

      // return new user
      res.status(201).json(user);
    }
  } catch (err) {
    console.log(err);
  }
});

app.get("/login", async (req, res) => {
  try {
    // Get user input
    const { email, password } = req.query;

    // Validate user input
    if (!(email && password)) {
      res.status(400).send("All input is required");
    }
    // Validate if user exist in our database
    const user = await User.findOne({ email });

    if (user && (await bcrypt.compare(password, user.password))) {
      // Create token
      const token = jwt.sign(
        { user_id: user._id, email },
        process.env.TOKEN_KEY,
        {
          expiresIn: "2h",
        }
      );

      // save user token
      user.token = token;

      // user
      res.status(200).json(user);
    } else {
      res.status(400).json({ error: "Invalid Credentials" });
    }
  } catch (err) {
    console.log(err);
  }
});

app.post("/addFriend", auth, (req, res) => {
  const friendEmail = req.query.email;
  if (!friendEmail) {
    return res.status(500).json({ error: "Email is required" });
  }
  User.findOne({ email: req.query.email }, function (err, user) {
    if (err) {
      console.log(err);
    }
    var message;
    if (user) {
      console.log(user);
      message = "user exists";
      console.log(message);
    } else {
      message = "user doesn't exist";
      console.log(message);
    }
    res.status(200).json({ message: message });
  });
});

app.get("/welcome", auth, (req, res) => {
  res.status(200).send("Welcome 🙌 ");
});

const nocache = (req, res, next) => {
  res.header("Cache-Control", "private, no-cache, no-store, must-revalidate");
  res.header("Expires", "-1");
  res.header("Pragma", "no-cache");
  next();
};

const generateRTCToken = (req, res) => {
  // set response header
  res.header("Acess-Control-Allow-Origin", "*");
  // get channel name
  const channelName = req.query.channelName;
  if (!channelName) {
    return res.status(500).json({ error: "channel is required" });
  }
  // get uid
  let uid = req.query.uid;
  if (!uid || uid == "") {
    uid = 0;
  }
  // get role
  let role = RtcRole.SUBSCRIBER;
  if (req.query.role == "publisher") {
    role = RtcRole.PUBLISHER;
  }
  // get the expire time
  let expireTime = req.query.expireTime;
  if (!expireTime || expireTime == "") {
    expireTime = 3600;
  } else {
    expireTime = parseInt(expireTime, 10);
  }
  // calculate privilege expire time
  const currentTime = Math.floor(Date.now() / 1000);
  const privilegeExpireTime = currentTime + expireTime;
  // build the token
  const token = RtcTokenBuilder.buildTokenWithUid(
    APP_ID,
    APP_CERTIFICATE,
    channelName,
    uid,
    role,
    privilegeExpireTime
  );
  // return the token
  return res.json({ token: token });
};

const generateRTMToken = (req, res) => {
  // set response header
  res.header("Acess-Control-Allow-Origin", "*");
  // get channel name
  const channelName = req.query.channelName;
  if (!channelName) {
    return res.status(500).json({ error: "channel is required" });
  }
  // get uid
  let account = req.query.account;
  if (!account || account == "") {
    account = "ABC";
  }
  // get role
  let role = RtcRole.SUBSCRIBER;
  if (req.query.role == "publisher") {
    role = RtcRole.PUBLISHER;
  }
  // get the expire time
  let expireTime = req.query.expireTime;
  if (!expireTime || expireTime == "") {
    expireTime = 3600;
  } else {
    expireTime = parseInt(expireTime, 10);
  }
  // calculate privilege expire time
  const currentTime = Math.floor(Date.now() / 1000);
  const privilegeExpireTime = currentTime + expireTime;

  const token = RtmTokenBuilder.buildToken(
    APP_ID,
    APP_CERTIFICATE,
    account,
    role,
    privilegeExpireTime
  );
  // return the token
  return res.json({ token: token });
};

app.get("/friends", async function (req, res) {
  const filter = {};
  const all = await User.find(filter)
    .then((data) => {
      console.log(data);
      var returnData = [];
      data.forEach((element) => {
        var tmpJson = { name: element.name, id: element._id };
        returnData.push(tmpJson);
      });
      console.log(returnData);
      res.status(200).json(data);
    })
    .catch((err) => {
      console.log(err);
      res.status(400).json({ error: err.message });
    });
});

app.get("/deleteall", async function (req, res) {
  const filter = {};
  const all = await User.deleteMany({})
    .then((data) => {
      res.status(200);
    })
    .catch((err) => {
      console.log(err);
      res.status(400).json({ error: err.message });
    });
});

app.get("/get_rtm_token", nocache, generateRTMToken);
app.get("/get_rtc_token", nocache, generateRTCToken);

// This should be the last route else any after it won't work
app.use("*", (req, res) => {
  res.status(404).json({
    success: "false",
    message: "Page not found",
    error: {
      statusCode: 404,
      message: "You reached a route that is not defined on this server",
    },
  });
});

module.exports = app;
