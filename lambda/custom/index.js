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
    'RingContact': function () {

      this.attributes.myState = 'RINGCONTACT';
      checkAuth(this);

    },
    'FindContact' : function () {

      // This intent can have a few different slots
      // (fullname | name) [type]
      var phrase = "";
      if (this.event.request.intent.slots.fullname.value) {
        phrase = phrase + " " + this.event.request.intent.slots.fullname.value;
      }
      if (this.event.request.intent.slots.name.value) {
        phrase = phrase + " " + this.event.request.intent.slots.name.value;
      }
      if (this.event.request.intent.slots.type.value) {
        phrase = phrase + " " + this.event.request.intent.slots.type.value;
      }
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
            this.attributes.callIndex = 0;

            var output = "Do you want me to ring ";
            output += this.attributes.results[this.attributes.callIndex].Fullname; + '?';
            console.log("Try contact: ", this.attributes.results[this.attributes.callIndex].Fullname);
            this.emit(':ask', output);

          } else if (this.attributes.myState == 'GETADDRESS'){
            var output = this.attributes.results[0].Fullname;
            output += "'s address is ";
            output += this.attributes.results[0].Address;
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
        var output = "Dialing " + this.attributes.results[this.attributes.callIndex].Fullname;
        //
        var Proxy = new Asterisk();
        Proxy.connect(this.attributes.url, this.attributes.user, this.attributes.pass);
        Proxy.dialNumber(this.attributes.results[this.attributes.callIndex].Number, (results) => {
          console.log("Dial Results: ", results);
        });
        this.emit(':tell', output);
      }
      else {
        this.emit(':tell', 'OK');
      }
    },
    'AMAZON.NoIntent' : function() {
      if (this.attributes.myState == 'CHECKCONTACT') {
        this.attributes.callIndex++;
        if (this.attributes.callindex >= this.attributes.results.length){
          this.emit(':tell', 'OK, bye.');
        } else {
          var output = "Do you want me to ring ";
          output += this.attributes.results[this.attributes.callIndex].Fullname; + '?';
          console.log("Try contact: ", this.attributes.results[this.attributes.callIndex].Fullname);
          this.emit(':ask', output);
        }
      } else {
        this.emit(':tell', 'OK, bye.');
      }
    },
    'AMAZON.StopIntent' : function() {
      this.emit(':tell', 'OK, bye.');
    },
    'AMAZON.HelpIntent' : function() {
      this.emit(':ask', "You can try: 'alexa, start dialing David' or 'alexa, start dialing David at home'");
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

/*
var Proxy = new Asterisk();
Proxy.connect("https://stutty.zapto.org/asterisk/dial.php", "paul", "foxtrot1");
Proxy.getNumbers("David", function(results) {
  console.log("Results:", results);
});
*/
