'use strict';
var Alexa = require("alexa-sdk");
var request = require("request");
var Asterisk = require("./asterisk");

var states = {
  RINGCONTACT : '_RINGCONTACT'
  GETADDRESS : '_GETADDRESS'
  CHECKCONTACT : '_CHECKCONTACT',
};

exports.handler = function(event, context) {
    var alexa = Alexa.handler(event, context);
    alexa.registerHandlers(handlers);
    alexa.execute();
};

function checkAuth(alexa) {
  if (session.user.accessToken) {
    var options =  {
      url: 'https://alexa-skill.eu.auth0.com/userinfo',
        headers:{
          authorization: 'Bearer ' + session.user.accessToken,
        }
    };

    request(options, (error,response,body) => {
      if (!error && response.statusCode == 200) {
        var info = JSON.parse(body);
        alexa.attributes.url = info['http://fiz/ProxyURL'];
        alexa.attributes.user = info['http://fiz/Proxy/Username'];
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
        this.response.ask('Who would you like to ring?', 'Please say that again.')
    },
    'RingContact': function () {

      this.handler.state = states.RINGCONTACT;
      checkAuth(this);

    },
    'FindContact' : function () {

      // This intent can have a few different slots
      // (fullname | name) [type]
      var fullname = this.event.request.intent.slots.fullname.value;
      var name = this.event.request.intent.slots.name.name;
      var type = this.event.request.intent.slots.type.value;
      Asterisk.connect(this.attributes.url, this.attributes.user, this.attributes.pass);
      Asterisk.getNumbers(fullname + name + " " + type, (results) => {

        // Store the results in the session attributes
        this.attributes.results = results;
        if (results.Error) {

          // Failed to get any contacts, inform the user and finish
          this.emit(':tell', results.Reason);

        } else {

          // Got some results, ask them one at a time if they want to ring them
          if (this.handler.state == state.RINGCONTACT) {
            this.handler.state = states.CHECKCONTACT;
            this.attributes.callIndex = 0;
            var output = "Do you want me to ring ";
            output += results[this.attributes.callIndex].Fullname; + '?';
            this.emit(':ask', output);
          } else if (this.handler.state == state.GETADDRESS){
            var output = results[0].Fullname;
            output += "'s address is ";
            output += results[0].Address;
            this.emit(':tell', output);
          }
        }
      });
    },
    'SessionEndedRequest' : function() {
        console.log('Session ended with reason: ' + this.event.request.reason);
    },
    'AMAZON.StopIntent' : function() {
        this.response.speak('Bye');
        this.emit(':responseReady');
    },
    'AMAZON.HelpIntent' : function() {
        this.response.speak("You can try: 'alexa, start dialing David' or 'alexa, start dialing David at home'");
        this.emit(':responseReady');
    },
    'AMAZON.CancelIntent' : function() {
        this.response.speak('Bye');
        this.emit(':responseReady');
    },
    'Unhandled' : function() {
        this.response.speak("Sorry, I didn't get that.");
        this.emit(':responseReady');
    }
};
