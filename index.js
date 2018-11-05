
const PLAYERS = require('./config/players').players;
const GAMES = require('./config/game-details').games;
const TIMEZONE = process.env.timezone;

const request = require('request');
const moment = require('moment');
const momentTZ = require('moment-timezone');

const PYDT_URL = 'https://api.playyourdamnturn.com/game/';

// nagging config
const MINOR_NAG = true;
const MODERATE_NAG = true;
const MAJOR_NAG = true;
const GIGANTIC_NAG = true;

const MINOR_NAG_WINDOW_OPEN = 180;
const MINOR_NAG_WINDOW_CLOSE = 176;

const MODERATE_NAG_WINDOW_OPEN = 300;
const MODERATE_NAG_WINDOW_CLOSE = 296;

const MAJOR_NAG_WINDOW_OPEN = 780;
const MAJOR_NAG_WINDOW_CLOSE = 776;

const GIGANTIC_NAG_WINDOW_OPEN = 1440;
const GIGANTIC_NAG_WINDOW_CLOSE = 1436;

const NAG_LEVEL = Object.freeze({"NO_NAG":0, "MINOR_NAG":1, "MODERATE_NAG":2, "MAJOR_NAG":3, "GIGANTIC_NAG":4});

const SLEEP_START = moment().tz(TIMEZONE).hour(1).minute(0).second(0).millisecond(0);
const SLEEP_END = moment().tz(TIMEZONE).hour(7).minute(0).second(0).millisecond(0);

// helper switches to test
const SLACK_DEBUG = false;
const FORCE_SLACK_PUSH = false;

var NAG_SLEEP = false;
var playerDetails;
var nextPlayerId;
var nextPlayerName;
var lastTurnTime;
var game;
var text;


module.exports.run = (event, context, callback) => {

    console.log(PLAYERS);
    console.log(GAMES);

    let gamePromises = [];

    Object.keys(GAMES).forEach((gameId) => {
    	gamePromises.push(checkGame(gameId));
    });


    Promise.all(gamePromises)
    .then((games) => {
    	callback(null, "done");
    })
    .catch((err) => {
    	console.log("Error:");
    	console.log(err);
    	callback(err);
    });
};

const checkGame = (gameId) => {

	console.log("gameId", gameId);

	let fiveMinutesAgo = moment().tz(TIMEZONE).subtract(5, 'minutes');
  let minorNagWindowOpen = moment().tz(TIMEZONE).subtract(MINOR_NAG_WINDOW_OPEN, 'minutes');
  let minorNagWindowClose = moment().tz(TIMEZONE).subtract(MINOR_NAG_WINDOW_CLOSE, 'minutes');
  let moderateNagWindowOpen = moment().tz(TIMEZONE).subtract(MODERATE_NAG_WINDOW_OPEN, 'minutes');
  let moderateNagWindowClose = moment().tz(TIMEZONE).subtract(MODERATE_NAG_WINDOW_CLOSE, 'minutes');
  let majorNagWindowOpen = moment().tz(TIMEZONE).subtract(MAJOR_NAG_WINDOW_OPEN, 'minutes');
  let majorNagWindowClose = moment().tz(TIMEZONE).subtract(MAJOR_NAG_WINDOW_CLOSE, 'minutes');
  let giganticNagWindowOpen = moment().tz(TIMEZONE).subtract(GIGANTIC_NAG_WINDOW_OPEN, 'minutes');
  let giganticNagWindowClose = moment().tz(TIMEZONE).subtract(GIGANTIC_NAG_WINDOW_CLOSE, 'minutes');

	return new Promise((resolve, reject) => {

		let game = GAMES[gameId];

		request(PYDT_URL + gameId, (err, res, body) => {

			if(err) {
				console.log("Error getting PYDT API");
				console.log(err);
				return reject(err);
			}

			if(res.statusCode !== 200) {
				return reject("Game " + gameId + " not found. StatusCode: " + res.statusCode);
			}

			body = JSON.parse(body);

      playerDetails = body.players;
			nextPlayerId = body.currentPlayerSteamId;
			lastTurnTime = moment(body.lastTurnEndDate).tz(TIMEZONE);
      nextPlayerName = PLAYERS[nextPlayerId];

      console.log("id: ", nextPlayerId);
      console.log("name: ", nextPlayerName);
      console.log("last turn time: ", lastTurnTime);

      NAG_SLEEP = isSleeping();
      console.log("is sleeping: ", NAG_SLEEP);



			// this lambda function polls every 4 minutes. Check if the last turn happened at least 5 minutes ago
			if(fiveMinutesAgo.isBefore(lastTurnTime) || SLACK_DEBUG) {
          console.log("Last turn was within 5 minutes");
          text = craftMessage(NAG_LEVEL.NO_NAG, fiveMinutesAgo);
          let options = { method: 'POST',
              url: game.slack_url,
              body: { text: text },
              json: true
          };

          if(game.channel) {
            options.body.channel = game.channel;
          }

          if(!SLACK_DEBUG || FORCE_SLACK_PUSH) {
              request(options, function (err2, res2, body2) {
                  if (err2) {
                      return reject(err2);
                  }
                  resolve(nextPlayerName);
              });
          }
          else {
              console.log(JSON.stringify(options, null, 4));
              resolve(nextPlayerName);
          }
      } else if((MINOR_NAG && !NAG_SLEEP && (minorNagWindowOpen.isBefore(lastTurnTime) && minorNagWindowClose.isAfter(lastTurnTime))) || SLACK_DEBUG) {
          console.log("Minor Nagging!");
          text = craftMessage(NAG_LEVEL.MINOR_NAG, minorNagWindowOpen);
          let options = { method: 'POST',
              url: game.slack_url,
              body: { text: text },
              json: true
          };

          if(game.channel) {
            options.body.channel = game.channel;
          }

          if(!SLACK_DEBUG || FORCE_SLACK_PUSH) {
              request(options, function (err2, res2, body2) {
                  if (err2) {
                      return reject(err2);
                  }
                  resolve(nextPlayerName);
              });
          }
          else {
              console.log(JSON.stringify(options, null, 4));
              resolve(nextPlayerName);
          }
      } else if((MODERATE_NAG && !NAG_SLEEP && (moderateNagWindowOpen.isBefore(lastTurnTime) && moderateNagWindowClose.isAfter(lastTurnTime))) || SLACK_DEBUG) {
          console.log("Moderate Nagging!");
          text = craftMessage(NAG_LEVEL.MODERATE_NAG, moderateNagWindowOpen);
          let options = { method: 'POST',
              url: game.slack_url,
              body: { text: text },
              json: true
          };

          if(game.channel) {
            options.body.channel = game.channel;
          }

          if(!SLACK_DEBUG || FORCE_SLACK_PUSH) {
              request(options, function (err2, res2, body2) {
                  if (err2) {
                      return reject(err2);
                  }
                  resolve(nextPlayerName);
              });
          }
          else {
              console.log(JSON.stringify(options, null, 4));
              resolve(nextPlayerName);
          }
      } else if((MAJOR_NAG && !NAG_SLEEP && (majorNagWindowOpen.isBefore(lastTurnTime) && majorNagWindowClose.isAfter(lastTurnTime))) || SLACK_DEBUG) {
          console.log("Major Nagging!");
          text = craftMessage(NAG_LEVEL.MAJOR_NAG, majorNagWindowOpen);
          let options = { method: 'POST',
              url: game.slack_url,
              body: { text: text },
              json: true
          };

          if(game.channel) {
            options.body.channel = game.channel;
          }

          if(!SLACK_DEBUG || FORCE_SLACK_PUSH) {
              request(options, function (err2, res2, body2) {
                  if (err2) {
                      return reject(err2);
                  }
                  resolve(nextPlayerName);
              });
          }
          else {
              console.log(JSON.stringify(options, null, 4));
              resolve(nextPlayerName);
          }
      } else if ((GIGANTIC_NAG && (giganticNagWindowOpen.isBefore(lastTurnTime) && giganticNagWindowClose.isAfter(lastTurnTime))) || SLACK_DEBUG) {
          console.log("Gigantic Nagging!");
          text = craftMessage(NAG_LEVEL.GIGANTIC_NAG, giganticNagWindowOpen);
          let options = { method: 'POST',
              url: game.slack_url,
              body: { text: text },
              json: true
          };

          if(game.channel) {
            options.body.channel = game.channel;
          }

          if(!SLACK_DEBUG || FORCE_SLACK_PUSH) {
              request(options, function (err2, res2, body2) {
                  if (err2) {
                      return reject(err2);
                  }
                  resolve(nextPlayerName);
              });
          }
          else {
              console.log(JSON.stringify(options, null, 4));
              resolve(nextPlayerName);
          }
      } else {
          console.log("Still waiting on", nextPlayerName, "to take their turn");
          console.log("Last turn was", lastTurnTime.fromNow());
          resolve(nextPlayerName);
      }
      resolve();
		});
	});
};

function craftMessage(nagLevel, sinceTurn) {
      let duration = moment.duration(moment().tz(TIMEZONE).diff(sinceTurn, 'hours'));;
      let QUICKEST = false;
      let SLOWEST = false;

      let slowTurnsArray = [];
      let slowTurns = 0;
      let playerCount = 0;
      playerDetails.forEach(function(player) {
        slowTurnsArray.push(player.slowTurns);
        playerCount++;
      });
      slowTurnsArray.sort((x, y) => x - y);

      playerDetails.forEach(function(player) {
        if(player.steamId == nextPlayerId){
          slowTurns = player.slowTurns;
        }
      });

      let rank = slowTurnsArray.indexOf(slowTurns) + 1;

      if(rank == 1){
        QUICKEST = true;
      } else if(rank == playerCount){
        SLOWEST = true;
      }

      switch(nagLevel) {
        case 0:
          text = "It's your turn <@" + nextPlayerName + ">!";
          break;
        case 1:
          text = "Hello <@" + nextPlayerName + ">, what's happening?\nUm, I'm gonna need you to go ahead and do your turn.\n...Soooo if you could do that for me, that'd be great..mkay?";
          break;
        case 2:
          if(QUICKEST){
            text = "Hey <@" + nextPlayerName + ">! It has been " + duration + " hours, and it's still your turn!\nYou have only had " + slowTurns + " slow turns, which ranks you as the best!\nKeep your lead by doing your turn!"
          } else if(SLOWEST){
            text = "Hey <@" + nextPlayerName + ">! It has been " + duration + " hours, and it's still your turn!\nYou have had " + slowTurns + " slow turns, which ranks you as the worst!\nPick up the pace to increase your rank!"
          } else {
            text = "Hey <@" + nextPlayerName + ">! It has been " + duration + " hours, and it's still your turn!\nYou have had " + slowTurns + " slow turns, which ranks you " + rank + " out of " + playerCount + ".\nDo your turn quickly before your rank drops!"
          }
          break;
        case 3:
          if(QUICKEST){
            text = "Heeey <@" + nextPlayerName + ">! It's been " + duration + " hours, and it's still your turn!\nAre you okay chief? Just checking in.\nYou've only had " + slowTurns + " slow turns, which ranks you as the best!\nSo yeah...you wanna maybe logon and do your turn to keep your reputation intact?"
          } else if(SLOWEST){
            text = "(_sigh_) Heeey <@" + nextPlayerName + ">! It's been " + duration + " hours, and it's still your turn!\nWhat a surprise right. I just...you know what...nevermind.\nYou've had " + slowTurns + " slow turns, which ranks you as the worst!\nDo your turns faster man! COME ON!"
          } else {
            text = "Heeey <@" + nextPlayerName + ">! It's been " + duration + " hours, and it's still your turn!\nIf you don't do your turn in the next hour, I'm calling the cops.\nhaha, no but seriously..you've had " + slowTurns + " slow turns, which ranks you " + rank + " out of " + playerCount + ".\n...Sooo how's about you get your shit together and do your turn aye?"
          }
          break;
        case 4:
          if(QUICKEST){
            text = "Oi <@" + nextPlayerName + ">! I can't believe I have to tell you this but IT'S BEEN " + duration + " HOURS NOW, AND IT'S STILL YOUR TURN!\nYou have only had " + slowTurns + " slow turns, which ranks you as the best,\nBUT COME ON THIS IS TERRIBLE!!"
          } else if(SLOWEST){
            text = "Oi <@" + nextPlayerName + ">! Frankly, I'm not surprised I have to tell you this but IT'S BEEN " + duration + " HOURS NOW, AND IT'S STILL YOUR BLOODY TURN!\nYOU HAVE HAD " + slowTurns + " SLOW TURNS, WHICH RANKS YOU AS THE WORST!\nYOU ARE AN ABSOLUTE DISGRACE!!"
          } else {
            text = "Oi <@" + nextPlayerName + ">! Come on man...IT'S BEEN " + duration + " HOURS NOW, AND IT'S STILL YOUR TURN!\nYou have had " + slowTurns + " slow turns, which ranks you " + rank + " out of " + playerCount + ".\nAT THIS RATE YOU ARE GOING TO BE WORST!!\nIS THAT WHAT YOU WANT? DO YOU WANT TO BE THE WORST?"
          }
          break;
      }

      return text;
}

function isSleeping() {
   currentTime = moment().tz(TIMEZONE);
   return (currentTime.isAfter(SLEEP_START) && currentTime.isBefore(SLEEP_END));
}
