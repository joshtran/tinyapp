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
  "b2xVn2": "http://www.lighthouselabs.ca",
  "9sm5xK": "http://www.google.com"
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

//Not CRUD - for user experience
app.get("/urls/new", (req, res) => {
  let templateVars = {
  username: req.cookies["username"],
  };
  res.render("urls_new", templateVars);
});

app.get("/register", (req, res) => {
  let templateVars = {
  username: req.cookies["username"],
  };
  res.render("urls_register", templateVars);
});


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
      // console.log(users);
      res.redirect("/");
    }
  }

});

app.get("/login", (req, res) => {
  let templateVars = {
  username: req.cookies["username"],
  };
  res.render("urls_login", templateVars);
});

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

app.post("/logout", (req, res) => {
  res.clearCookie("username");
  res.clearCookie("user_id");
  res.redirect("/");
});

//CRUD - Create
app.post("/urls/create", (req, res) => {
  let shortenedURL = generateRandomString();
  urlDatabase[shortenedURL] = req.body.longURL;
  console.log(`http://localhost:8080/urls/${shortenedURL}`);
  res.redirect(`/urls/${shortenedURL}`);
});

//CRUD - Delete
app.post("/urls/:id/delete", (req, res) => {
  delete urlDatabase[req.params.id];
  res.redirect("/urls");
});

//CRUD - Update
app.post("/urls/:id/update", (req, res) => {
  urlDatabase[req.params.id] = req.body.newURL;
  res.send(`Updated URL to ${req.body.newURL}`);
});

//CRUD - Read
app.get("/u/:shortURL", (req, res) => {
  let longURL = urlDatabase[req.params.shortURL];
  res.redirect(longURL);
});

app.get("/urls", (req, res) => {
  let currentUser = users[req.cookies["user_id"]];
  let currentEmail = null;
  if (currentUser) {
    currentEmail = currentUser.email
  };
  let templateVars = {
    urls: urlDatabase,
    username: req.cookies["username"],
    userEmail: currentEmail
  };
  res.render("urls_index", templateVars);
});

app.get("/urls/:id", (req, res) => {
  let templateVars = {
    shortURL: req.params.id,
    fullURL: urlDatabase[req.params.id],
    username: req.cookies["username"],
  };;
  res.render("urls_show", templateVars);
});


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