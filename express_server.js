const bodyParser = require("body-parser");
const express = require("express");
const cookieParser = require('cookie-parser')
const app = express();
const PORT = process.env.PORT || 8080;

//Configuration
app.set("view engine", "ejs");
app.use(bodyParser.urlencoded({extended: true}));
app.use(cookieParser());

//Database
const urlDatabase = {
  "b2xVn2": "http://www.lighthouselabs.ca",
  "9sm5xK": "http://www.google.com"
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

app.post("/login", (req, res) => {
  res.cookie("username", req.body.username);
  res.redirect("/");
});

app.post("/logout", (req, res) => {
  res.clearCookie("username");
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
  let templateVars = {
    urls: urlDatabase,
    username: req.cookies["username"]
  };
  res.render("urls_index", templateVars);
});

app.get("/urls/:id", (req, res) => {
  let templateVars = {
    shortURL: req.params.id,
    fullURL: urlDatabase[req.params.id],
    username: req.cookies["username"]
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