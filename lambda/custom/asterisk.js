var request = require("request");

function Asterisk() {
  this.proxyURL = "";
  this.proxyUsername = "";
  this.proxyPassword = "";
  this.contactsQuery = "?Name=";
  this.dialQuery = "?Number=";

};

Asterisk.prototype.connect = function (url, user, pass) {
  this.proxyUsername = user;
  this.proxyPassword = pass;
  this.proxyURL = url;
  console.log("Asterisk.connect", this.proxyURL);
};

Asterisk.prototype.getNumbers = function (phrase, clientCallback) {
  var url = this.proxyURL + "?Name=" + phrase;
  var options = {
    uri : url,
    auth : {
      username : this.proxyUsername,
      password : this.proxyPassword,
      sendImmediately : false
    }
  };
  request(options, function (error, response, body) {
    if (!error && response.statusCode == 200) {
      var results = '';
      console.log("getNumbers body:", body);
      try {
        results = JSON.parse(body);
      } catch (e) {
        console.log("Parse Failed:", e);
        var results = {
          Status : 'ParseError',
          Reason : 'Could not parse response from Server.'
        };
        clientCallback(results);
      }
      console.log("getNumbers result:", results);
      clientCallback(results);
    } else {
      console.log("error Response:", response );
      var results = {
        Status : 'RequestFail',
        Reason : 'Could not connect to Server.'
      };
      clientCallback(results);
    }
  });
}
module.exports = Asterisk;
