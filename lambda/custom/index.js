'use strict';
var Alexa = require("alexa-sdk");
var request = require("request");
var Asterisk = require("./asterisk");

exports.handler = function(event, context) {
    var alexa = Alexa.handler(event, context);
    alexa.appId = 'amzn1.ask.skill.0eadf3be-15c0-4b16-a84f-3038d0a59b8a';
    alexa.registerHandlers(handlers);
    alexa.execute();
};

//
// Alexa can't manage these words, so provide some assistance
//
function wordPronounce(name, possessive) {
  // borS"in
  // stVttArd
  if (possessive) {
    name = name.replace("Bourgein", "<phoneme alphabet=\"x-sampa\" ph='borS\"inz'>Bourgein's</phoneme>");
    name = name.replace("Stuttard", "<phoneme alphabet=\"x-sampa\" ph=\"stVtArdz\">Stuttard's</phoneme>");
  } else {
    name = name.replace("Stuttard", "<phoneme alphabet=\"x-sampa\" ph=\"stVtArd\">Stuttard</phoneme>");
    name = name.replace("Bourgein", "<phoneme alphabet=\"x-sampa\" ph='borS\"in'>Bourgein</phoneme>");
  }
  return name;
}

//
// Query the first/next name that has a phone number
//
function queryRing(alexa, firstTime) {

  if (firstTime) {
    this.attributes.callIndex = 0;
  } else {
    this.attributes.callIndex++;
  }

  var output = "Do you want me to ring ";
  var index = alex.attributes.callIndex;
  while (index < alex.attributes.results.length)
  {
    if (alex.attributes.results[index].Number) {
      alex.attributes.callIndex = index;
      var name = alex.attributes.results[index].Fullname;
      output += wordPronounce(name, false) + '?';
      console.log("Try contact: ", alex.attributes.results[index].Fullname);
      alex.emit(':ask', output);
    }
    index++;
  }
  if (firstTime) {
    output = "Sorry, I could not find a contact matching " + wordPronounce(alexa.attributes.phrase, false);
  } else {
    output = "OK, that was the last match, bye."
  }
  this.emit(':tell', output);
}

//
// Check authorization is valid and get the server details from the user's
// account.
//
function checkAuth(alexa) {
  if (alexa.event.session.user.accessToken) {
    var options =  {
      url: 'https://alexa-skill.eu.auth0.com/userinfo',
        headers:{
          authorization: 'Bearer ' + alexa.event.session.user.accessToken,
        }
    };

    request(options, (error,response,body) => {
      if (!error && response.statusCode == 200) {
        var info = JSON.parse(body);
        alexa.attributes.url = info['http://fiz/ProxyURL'];
        alexa.attributes.user = info['http://fiz/ProxyUsername'];
        alexa.attributes.pass = info['http://fiz/ProxyPassword'];
        alexa.emit('FindContact');
      }
    });
  } else {
    alexa.response.linkAccountCard();
    alexa.emit(':tell', "You need to Link your account, <say-as interpret-as='interjection'>cheerio</say-as>.");
  }
}

var handlers = {
    'LaunchRequest': function () {
        this.emit(':ask', 'Who would you like to ring?', 'Please say that again.')
    },
    'ContactAddress': function () {
      this.attributes.myState = 'GETADDRESS';
      checkAuth(this);
    },
    'ContactRing': function () {
      this.attributes.myState = 'RINGCONTACT';
      checkAuth(this);
    },
    'ContactBirthday': function () {
      this.attributes.myState = 'GETBIRTHDAY';
      checkAuth(this);
    },
    'FindContact' : function () {

      var phrase = "";
      if (this.event.request.intent.slots.name &&
          this.event.request.intent.slots.name.value) {
        phrase = phrase + " " + this.event.request.intent.slots.name.value;
        console.log("Slot[name]: ", this.event.request.intent.slots.name.value)
      }
      if (this.event.request.intent.slots.type &&
          this.event.request.intent.slots.type.value) {
        phrase = phrase + " " + this.event.request.intent.slots.type.value;
        console.log("Slot[name]: ", this.event.request.intent.slots.type.value)
      }
      this.attributes.phrase = phrase;
      var Proxy = new Asterisk();
      Proxy.connect(this.attributes.url, this.attributes.user, this.attributes.pass);
      Proxy.getNumbers(phrase , (results) => {

        // Store the results in the session attributes
        if (results.Status != 'OK') {

          console.log("Error: ", results.Reason);
          // Failed to get any contacts, inform the user and finish
          this.emit(':tell', results.Reason);

        } else {

          this.attributes.results = results.Results;
          // Got some results, ask them one at a time if they want to ring them
          if (this.attributes.myState == 'RINGCONTACT') {
            this.attributes.myState = 'CHECKCONTACT';
            queryRing(this, true);

          } else if (this.attributes.myState == 'GETADDRESS'){
            var name = this.attributes.results[0].Fullname;
            var output = wordPronounce(name, true);
            output += " address is, "
            output += this.attributes.results[0].Address;
            this.emit(':tell', output);
          } else if (this.attributes.myState == 'GETBIRTHDAY'){
            var name = this.attributes.results[0].Fullname;
            var output = wordPronounce(name, true);
            output += " birthday is <say-as interpret-as=\"date\">";
            output += this.attributes.results[0].Birthday + "</say-as>";
            this.emit(':tell', output);
          }
        }
      });
    },
    'SessionEndedRequest' : function() {
      console.log('Session ended with reason: ' + this.event.request.reason);
    },
    'AMAZON.YesIntent' : function() {
      if (this.attributes.myState == 'CHECKCONTACT') {
        var output = "Dialing ";
        var name = this.attributes.results[this.attributes.callIndex].Fullname;
        output += wordPronounce(name,false);
        //
        var Proxy = new Asterisk();
        Proxy.connect(this.attributes.url, this.attributes.user, this.attributes.pass);
        Proxy.dialNumber(this.attributes.results[this.attributes.callIndex].Number, (results) => {
          console.log("Dial Results: ", results);
          this.emit(':tell', output);
        });
      }
      else {
        this.emit(':tell', 'OK');
      }
    },
    'AMAZON.NoIntent' : function() {
      if (this.attributes.myState == 'CHECKCONTACT') {
        dialQuery(this, false);
      }
    },
    'AMAZON.StopIntent' : function() {
      this.emit(':tell', 'OK, bye.');
    },
    'AMAZON.HelpIntent' : function() {
      this.emit(':ask', "You can try: 'ring David' or 'ring David at home' or 'ask address book for David's address' or 'ask address book for David's Birthday'");
    },
    'AMAZON.CancelIntent' : function() {
      this.emit(':tell', 'OK, bye.');
    },
    'Unhandled' : function() {
      console.log("Unhandled", this.event.request.intent);
      this.response.speak("Sorry, I didn't get that.");
      this.emit(':responseReady');
    }
};
