const bodyParser = require("body-parser");
const express = require("express");
const cookieSession = require('cookie-session');
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
let users = {
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

// Register new user and add to users object
app.post("/register", (req, res) => {
  const shortenedURL = generateRandomString();

  //If user not already logged in
  if (!req.session.user_id) {

    //If any fields are empty, send error
    if (!req.body.email || !req.body.password) {
      res.status(400).send("All fields must be filled.");
    };

    let foundUserConflict = false;
    //Loop through user database
    for (key in users) {
      let existingEmail = users[key].email;
      let newEmail = req.body.email;
      //Check to see if submitted email matches existing user
      if (newEmail === existingEmail) {
        //If user already exists, send error
        res.status(400).send("If you have already registred, you can't register again.");
        foundUserConflict = true;
      }
    }

    //If submitted email does not exist on database, create new user
    if (!foundUserConflict) {
      let newID = generateRandomString();
      req.session.user_id = newID;
      const newPass = bcrypt.hashSync(req.body.password, 10);

      users[newID] = {
        "id" : newID,
        "email" : req.body.email,
        "password" : newPass
      };

      res.redirect("/");
    }

  } else {
    //If already logged in, do not allow registration
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
  res.redirect(`/urls/${req.params.id}`);
});

//Receive shortURL and redirect to Long URL
app.get("/u/:shortURL", (req, res) => {
  let longURL = undefined;
  let urlNotFound = true;
  for (key in urlDatabase) {
    if (urlDatabase[key][req.params.shortURL]) {
      longURL = urlDatabase[key][req.params.shortURL];
      res.redirect(longURL);
      urlNotFound = false;
    }
  }
  if (urlNotFound) {
    res.status(400).send("Sorry, this tiny URL doesn't exist");
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
  let ownerofURL = "";
  let urlNotFound = true;

  //Loop through URL database and find owner of URL
  for (key in urlDatabase) {
    if (urlDatabase[key][req.params.id]) {
      ownerofURL = key;
      urlNotFound = false;
    }
  }

  //If URL doesn't exist, send error
  if (urlNotFound) {
    res.status(404).send("Sorry, this URL page doesn't exist");
  }

  //If user not logged in, send error
  if (!currentLoginStatus) {
    res.status(401).redirect("/error");
  }

  //If user not authorized to see URL, send error
  if (ownerofURL !== req.session.user_id) {
    res.status(403).send("Sorry, this URL doesn't belong to you");
  } else {
    //Otherwise, show them this specific URL page
    let templateVars = {
      shortURL: req.params.id,
      fullURL: urlDatabase[currentInfo.userID][req.params.id]
    };
    res.render("urls_show", templateVars);
  }
});

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

app.listen(PORT, () => {
  console.log(`tinyApp listening on port ${PORT}!`);
});