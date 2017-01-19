const bodyParser = require("body-parser");
const express = require("express");
const cookieParser = require('cookie-parser')
const app = express();
const PORT = process.env.PORT || 8080;

//Configuration
app.set("view engine", "ejs");
app.use(bodyParser.urlencoded({extended: true}));
app.use(cookieParser());

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
    password: "testpass"
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


//Create new URL Page
app.get("/urls/new", (req, res) => {
  let templateVars = {
  username: req.cookies["username"],
  };
  res.render("urls_new", templateVars);
});

//Registration Page
app.get("/register", (req, res) => {
  let templateVars = {
  username: req.cookies["username"],
  };
  res.render("urls_register", templateVars);
});

//Register new user and add to users object
app.post("/register", (req, res) => {
  let newID = generateRandomString();
  res.cookie("user_id", newID);
  let newEmail = req.body.email;
  let newPass = req.body.password;

  for (key in users) {
    let existingEmail = users[key].email;
    if (newEmail === "" || newPass === "" || newEmail === existingEmail) {
      res.sendStatus(400);
    } else {
      users[newID] = {
        "id" : newID,
        "email" : newEmail,
        "password" : newPass
        };
      res.redirect("/");
    }
  }
});

//Login page
app.get("/login", (req, res) => {
  let templateVars = {
  username: req.cookies["username"],
  };
  res.render("urls_login", templateVars);
});

//Log user into tinyapp
app.post("/login", (req, res) => {
  let loginEmail = req.body.email;
  let loginPass = req.body.password;
  let notFound = true;

  for (key in users) {

    let existingEmail = users[key].email;
    let existingPass = users[key].password;
    let existingID = users[key].id;

    if (loginEmail === existingEmail) {
      notFound = false;

      if (loginPass === existingPass){
        res.cookie("user_id", existingID);
        res.redirect("/");
      } else {
        res.sendStatus(403);
      }

    }
  }

  if (notFound === true) {
    res.sendStatus(403);
  };

});

//Log user out of tinyapp
app.post("/logout", (req, res) => {
  res.clearCookie("user_id");
  res.redirect("/");
});

//Create new short URL and assign to long URL - add to urlDatabase object
app.post("/urls/create", (req, res) => {
  const shortenedURL = generateRandomString();
  let currentInfo = checkLogin(req.cookies["user_id"]);
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
  let currentInfo = checkLogin(req.cookies["user_id"]);
  let templateVars = currentInfo;
  delete currentInfo.urls[req.params.id];
  res.render("urls_index", templateVars);
});

//Modify existing short URL-long URL value pair in urlDatabase object
app.post("/urls/:id/update", (req, res) => {
  let currentInfo = checkLogin(req.cookies["user_id"]);
  currentInfo.urls[req.params.id] = req.body.newURL;
  res.send(`Updated URL to ${req.body.newURL}`);
});

//Receive shortURL and redirect to Long URL
app.get("/u/:shortURL", (req, res) => {
  let longURL = "";
  for (key in urlDatabase) {
    if (urlDatabase[key][req.params.shortURL]) {
      longURL = urlDatabase[key][req.params.shortURL];
      res.redirect(longURL);
    }
  }
  if (!longURL) {
    res.sendStatus(400);
  }
});

//Index page
app.get("/urls", (req, res) => {
  let currentInfo = checkLogin(req.cookies["user_id"]);
  let templateVars = currentInfo;
  res.render("urls_index", templateVars);
});

app.get("/urls/:id", (req, res) => {
  let currentInfo = checkLogin(req.cookies["user_id"]);

  let currentLoginStatus = currentInfo.loggedIn;

  if (!currentLoginStatus) {
    res.send("not logged in");
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
  res.end("Hello!");
});

app.get("/urls.json", (req, res) => {
  res.json(urlDatabase);
});

app.get("/hello", (req, res) => {
  res.end("<html><body>Hello <b>World</b></body></html>\n");
});

app.listen(PORT, () => {
  console.log(`Example app listening on port ${PORT}!`);
});