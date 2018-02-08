'use strict';
var Alexa = require("alexa-sdk");
var request = require("request");
var Asterisk = require("./asterisk");

var states = { CHECKCONTACT : '_CHECKCONTACT'};

exports.handler = function(event, context) {
    var alexa = Alexa.handler(event, context);
    alexa.registerHandlers(handlers);
    alexa.execute();
};

var handlers = {
    'LaunchRequest': function () {
        this.response.ask('Who would you like to ring?', 'Please say that again.')
    },
    'RingContact': function () {
      // This intent can have a few different slots
      // (fullname | name) [type]
      var fullname = this.event.request.intent.slots.fullname.value;
      var name = this.event.request.intent.slots.name.name;
      var type = this.event.request.intent.slots.type.value;
      Asterisk.getNumbers(fullname + name + " " + type, (results) => {

        // Store the results in the session attributes
        this.attributes.results = results;
        if (results.Error) {

          // Failed to get any contacts, inform the user and finish
          this.emit(':tell', results.Reason);

        } else {

          // Got some results, ask them one at a time if they want to ring them
          this.handler.state = states.CHECKCONTACT;
          this.attributes.callIndex = 0;
          var output = "Do you want me to ring ";
          output += results[this.attributes.callIndex].Fullname; + '?';
          this.emit(':ask', output);

        }
      });
    },
    'MyNameIsIntent': function () {
        this.emit('SayHelloName');
    },
    'SayHello': function () {
        this.response.speak('Hello World!')
                     .cardRenderer('hello world', 'hello world');
        this.emit(':responseReady');
    },
    'SayHelloName': function () {
        var name = this.event.request.intent.slots.name.value;
        this.response.speak('Hello ' + name)
            .cardRenderer('hello world', 'hello ' + name);
        this.emit(':responseReady');
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
