const bodyParser = require("body-parser");
const express = require("express");
const cookieSession = require('cookie-session')
const bcrypt = require("bcrypt");
const app = express();
const PORT = process.env.PORT || 3000;

//Configuration
app.set("view engine", "ejs");
app.use(bodyParser.urlencoded({extended: true}));
app.use(cookieSession({
  name: "session",
  secret: "somesecret"
}));

app.use(function(req, res, next){
  res.locals.user = users[req.session.user_id];
  res.locals.urls = urlDatabase[req.session.user_id];
  next();
});

//URL Database
const urlDatabase = {
  "test-1" : {
      "b2xVn2": "http://www.lighthouselabs.ca",
    "9sm5xK": "http://www.google.com"
  }
};

//User Database
const users = {
  "test-1": {
    id: "test-1",
    email: "jondoe@example.com",
    password: bcrypt.hashSync("testpass", 10)
  },

};

//Generate short URL
function generateRandomString() {
  let uniqueURL = Math.random().toString(36).substr(2, 6);
  return uniqueURL;
}

//Check login status and access current user info
function checkLogin(user_id) {
  let currentUser = users[user_id];
  let currentID = null;
  let currentEmail = null;
  let currentURLs = null;
  let loginStatus = false;
  if (currentUser) {
    currentID = currentUser.id;
    currentEmail = currentUser.email;
    currentURLs = urlDatabase[currentUser.id];
    loginStatus = true;
  };

  let loginInfo = {
    userID: currentID,
    urls: currentURLs,
    userEmail: currentEmail,
    loggedIn: loginStatus
  };

  return loginInfo;

}


//New URL Page
app.get("/urls/new", (req, res) => {
  if (!req.session.user_id) {
    res.status(401).redirect("/error");
  } else {
    res.status(200).render("urls_new");
  }
});

//Registration Page
app.get("/register", (req, res) => {
  if (!req.session.user_id) {
    res.status(200).render("urls_register");
  } else {
    res.redirect("/");
  }
});

// Register new user and add to usrs object
app.post("/register", (req, res) => {
  const shortenedURL = generateRandomString();
  let currentInfo = checkLogin(req.session.user_id);
  let currentLoginStatus = currentInfo.loggedIn;

  if (!currentLoginStatus) {

    let newID = generateRandomString();
    req.session.user_id = newID;
    const newEmail = req.body.email;
    const newPass = bcrypt.hashSync(req.body.password, 10);

    for (key in users) {
      let existingEmail = users[key].email;
      if (newEmail === "" || newPass === "" || newEmail === existingEmail) {
        res.status(400).send("All fields must be filled. If you have already registred, you can't register again.");
      } else {
        users[newID] = {
          "id" : newID,
          "email" : newEmail,
          "password" : newPass
          };
        res.redirect("/");
      }
    }
  } else {
    res.send("You're already logged in.")
  }

});

//Login page
app.get("/login", (req, res) => {
  res.render("urls_login");
});

//Log user into tinyapp
app.post("/login", (req, res) => {
  const shortenedURL = generateRandomString();
  let currentInfo = checkLogin(req.session.user_id);
  let currentLoginStatus = currentInfo.loggedIn;

  if (!currentLoginStatus) {


    let loginEmail = req.body.email;
    let loginPass = req.body.password;
    let notFound = true;

    for (key in users) {

      let existingEmail = users[key].email;
      let existingPass = users[key].password;
      let existingID = users[key].id;

      if (loginEmail === existingEmail) {
        notFound = false;

        if (bcrypt.compareSync(loginPass, existingPass)) {
          req.session.user_id = existingID;
          res.redirect("/");
        } else {
          res.status(401).send("Email and password do not match -- please try again.");
        }

      }
    }

    if (notFound === true) {
      res.sendStatus(403);
    };
  } else {
    res.send("You're already logged in.")
  }
});

//Log user out of tinyapp
app.post("/logout", (req, res) => {
  req.session = null;
  res.redirect("/");
});

//Create new short URL and assign to long URL - add to urlDatabase object
app.post("/urls/create", (req, res) => {
  const shortenedURL = generateRandomString();
  let currentInfo = checkLogin(req.session.user_id);
  let currentLoginStatus = currentInfo.loggedIn;

  if (!currentLoginStatus) {
    res.redirect("/login");
  } else {
      //Add short-long URL pair to current user's associated list of URLs in urlDatabase object


      //if user's associated URL list doesn't already exist - create and add new URL
      for (key in urlDatabase) {
        if (!urlDatabase[currentInfo.userID]) {
          urlDatabase[currentInfo.userID] = {};
          urlDatabase[currentInfo.userID][shortenedURL] = req.body.longURL;
        } else {
          //if user's associated URL list already exists - just add new URL
          urlDatabase[currentInfo.userID][shortenedURL] = req.body.longURL;
        }
      }
      res.redirect(`/urls/${shortenedURL}`);
  }

});

//Delete existing short URL from urlDatabase object
app.post("/urls/:id/delete", (req, res) => {
  let currentInfo = checkLogin(req.session.user_id);
  let templateVars = currentInfo;
  delete currentInfo.urls[req.params.id];
  res.render("urls_index", templateVars);
});

//Modify existing short URL-long URL value pair in urlDatabase object
app.post("/urls/:id/update", (req, res) => {
  let currentInfo = checkLogin(req.session.user_id);
  currentInfo.urls[req.params.id] = req.body.newURL;
  res.send(`Updated URL to ${req.body.newURL}`);
});

//Receive shortURL and redirect to Long URL
app.get("/u/:shortURL", (req, res) => {
  let pageVisits = 0;
  console.log(pageVisits);
  res.locals.userEmail = users[req.session.user_id].email;
  let longURL = "";
  for (key in urlDatabase) {
    if (urlDatabase[key][req.params.shortURL]) {
      longURL = urlDatabase[key][req.params.shortURL];
      pageVisits += 1;
      console.log(pageVisits);
      res.redirect(longURL);
    }
  }
  if (!longURL) {
    res.sendStatus(400);
  }
});

//Index page
app.get("/urls", (req, res) => {
  if (!req.session.user_id) {
    res.status(401).redirect("/error");
  } else {
    res.status(200).render("urls_index");
  }
});

//Error page
app.get("/error", (req, res) => {
    res.render("status_error");
});

//Edit URL Page
app.get("/urls/:id", (req, res) => {
  let currentInfo = checkLogin(req.session.user_id);
  let currentLoginStatus = currentInfo.loggedIn;
  //the person who has a URL list that contains URL
  let ownerofURL = "";
//Loop through URL database
  for (key in urlDatabase) {
    //Find object that has a key matching req.params.id
    if (urlDatabase[key][req.params.id]) {
      //This is the user
      ownerofURL = key;
    }
  }

  console.log("currentInfo.userID", currentInfo.userID);
  console.log("req.session.user_id", req.session.user_id);
  console.log("req.params.id", req.params.id);

  if (!currentLoginStatus) {
    res.status(404).redirect("/error");
  }

  if (ownerofURL !== req.session.user_id) {
    res.status(403).send("Sorry, this URL doesn't belong to you");
  } else {
    let templateVars = {
      shortURL: req.params.id,
      fullURL: urlDatabase[currentInfo.userID][req.params.id]
    };
    res.render("urls_show", templateVars);
  }
});

//Root and testing pages
app.get("/", (req, res) => {
  if (req.session.user_id) {
    res.redirect("/urls");
  } else {
    res.redirect("/login")
  }
});

app.get("/urls.json", (req, res) => {
  res.json(urlDatabase);
});

app.get("/hello", (req, res) => {
  res.end("<html><body>Hello <b>World</b></body></html>\n");
});

app.listen(PORT, () => {
});