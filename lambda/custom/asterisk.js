var request = require("request");

function Asterisk() {
  var proxyURL = "";
  var userName = "";
  var password = "";
  var contactsQuery = "?Name=";
  var dialQuery = "?Number=";

  function connect(url, pass, user) {
    userName = user;
    password = pass;
    proxyURL = url;
  }
  
}
