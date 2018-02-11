var request = require("request");

function Asterisk() {
  var proxyURL = "";
  var proxyUsername = "";
  var proxyPassword = "";
  var contactsQuery = "?Name=";
  var dialQuery = "?Number=";

  function connect(url, pass, user) {
    proxyUsername = user;
    proxyPassword = pass;
    proxyURL = url;
  }

  function getNumbers(phrase, callback) {
    var url = proxyURL + contactsQuery + phrase;
    var options = {
      uri : url,
      method : 'GET',
      auth : {
        username : proxyUsername,
        password : proxyPassword
      }
    }
    request(options, function (error, response, body) {
      if (!error && response.statusCode == 200) {
        var results = JSON.parse(body);
        callback(results);
      }

    }
  }
}
