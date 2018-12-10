
const PLAYERS = require('./config/players').players;
const GAMES = require('./config/game-details').games;
const MESSAGES = require('./config/messages').messages;

const request = require('request');
const moment = require('moment');
const luxon = require('luxon');

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

const SLEEP_START = moment().hour(11).minute(0).second(0).millisecond(0);
const SLEEP_END = moment().hour(17).minute(0).second(0).millisecond(0);

// helper switches to test
const SLACK_DEBUG = false;
const FORCE_SLACK_PUSH = false;

// use civ leader specific messaging as opposed to standard messages
const LEADER_MESSAGES = true;

var NAG_SLEEP = false;
var playerDetails;
var nextPlayerId;
var nextPlayerName;
var lastTurnTime;
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

	let fiveMinutesAgo = moment().subtract(5, 'minutes');
  let minorNagWindowOpen = moment().subtract(MINOR_NAG_WINDOW_OPEN, 'minutes');
  let minorNagWindowClose = moment().subtract(MINOR_NAG_WINDOW_CLOSE, 'minutes');
  let moderateNagWindowOpen = moment().subtract(MODERATE_NAG_WINDOW_OPEN, 'minutes');
  let moderateNagWindowClose = moment().subtract(MODERATE_NAG_WINDOW_CLOSE, 'minutes');
  let majorNagWindowOpen = moment().subtract(MAJOR_NAG_WINDOW_OPEN, 'minutes');
  let majorNagWindowClose = moment().subtract(MAJOR_NAG_WINDOW_CLOSE, 'minutes');
  let giganticNagWindowOpen = moment().subtract(GIGANTIC_NAG_WINDOW_OPEN, 'minutes');
  let giganticNagWindowClose = moment().subtract(GIGANTIC_NAG_WINDOW_CLOSE, 'minutes');

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
			lastTurnTime = moment(body.lastTurnEndDate);
      nextPlayerName = PLAYERS[nextPlayerId];

      console.log("id: ", nextPlayerId);
      console.log("name: ", nextPlayerName);
      console.log("last turn time: ", lastTurnTime);
      console.log("sleep start: ", SLEEP_START);
      console.log("sleep end: ", SLEEP_END);

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
      let duration = moment.duration(moment().diff(sinceTurn, 'hours'));
      let QUICKEST = false;
      let SLOWEST = false;

      let slowTurnsArray = [];
      let averageTurnTimeArray = [];
      let civType = "";
      let turnsPlayed = 0;
      let timeTaken = 0;
      let averageTurnTime = 0;
      let slowTurns = 0;
      let playerCount = 0;

      playerDetails.forEach(function(player) {
        averageTurnTime = luxon.Duration.fromMillis(player.timeTaken/player.turnsPlayed);
        averageTurnTimeArray.push(averageTurnTime.as('milliseconds'));
        slowTurnsArray.push(player.slowTurns);
        playerCount++;
      });
      averageTurnTimeArray.sort((x, y) => x - y);
      slowTurnsArray.sort((x, y) => x - y);

      playerDetails.forEach(function(player) {
        if(player.steamId == nextPlayerId){
          averageTurnTime = luxon.Duration.fromMillis(player.timeTaken/player.turnsPlayed).shiftTo('hours', 'minutes', 'seconds');
          slowTurns = player.slowTurns;
          civType = player.civType;
        }
      });

      //Option to rank by slow turns instead of average turn time
      //let rank = slowTurnsArray.indexOf(slowTurns) + 1;

      let rank = averageTurnTimeArray.indexOf(averageTurnTime.as('milliseconds')) + 1;

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
            text = "<@" + nextPlayerName + ">\n";
            if (LEADER_MESSAGES){
              text += MESSAGES.minor_nag.general.intro[civType];
            } else {
              text += MESSAGES.minor_nag.general.intro.standard;
            }
            text += MESSAGES.minor_nag.general.message;
          break;
        case 2:
          if(QUICKEST){
            text = "<@" + nextPlayerName + ">\n";
            if (LEADER_MESSAGES){
              text += MESSAGES.moderate_nag.quickest.intro[civType];
            } else {
              text += MESSAGES.moderate_nag.quickest.intro.standard;
            }
            text += "It's been " + duration + " hours, and it's still your turn!\n" +
                    "Your average turn time is " + averageTurnTime.hours + " hour(s) and " + averageTurnTime.minutes + " minutes, which ranks you as the best!\n" +
                    //"You have only had " + slowTurns + " slow turns, which ranks you as the best!\n" +
                    MESSAGES.moderate_nag.quickest.message;
          } else if(SLOWEST){
            text = "<@" + nextPlayerName + ">\n";
            if (LEADER_MESSAGES){
              text += MESSAGES.moderate_nag.slowest.intro[civType];
            } else {
              text += MESSAGES.moderate_nag.slowest.intro.standard;
            }
            text += "It's been " + duration + " hours, and it's still your turn!\n" +
                    "Your average turn time is " + averageTurnTime.hours + " hour(s) and " + averageTurnTime.minutes + " minutes, which ranks you as the worst!\n" +
                    //"You have had " + slowTurns + " slow turns, which ranks you as the worst!\n" +
                    MESSAGES.moderate_nag.slowest.message;
          } else {
            text = "<@" + nextPlayerName + ">\n";
            if (LEADER_MESSAGES){
              text += MESSAGES.moderate_nag.general.intro[civType];
            } else {
              text += MESSAGES.moderate_nag.general.intro.standard;
            }
            text += "It's been " + duration + " hours, and it's still your turn!\n" +
                    "Your average turn time is " + averageTurnTime.hours + " hour(s) and " + averageTurnTime.minutes + " minutes, which ranks you " + rank + " out of " + playerCount + ".\n" +
                    //"You have had " + slowTurns + " slow turns, which ranks you " + rank + " out of " + playerCount + ".\n" +
                    MESSAGES.moderate_nag.general.message;
          }
          break;
        case 3:
          if(QUICKEST){
            text = "<@" + nextPlayerName + ">\n";
            if (LEADER_MESSAGES){
              text += MESSAGES.major_nag.quickest.intro[civType];
            } else {
              text += MESSAGES.major_nag.quickest.intro.standard;
            }
            text += "It's been " + duration + " hours, and it's still your turn!\n" +
                    "Your average turn time is " + averageTurnTime.hours + " hour(s) and " + averageTurnTime.minutes + " minutes, which ranks you as the best!\n" +
                    //"You've only had " + slowTurns + " slow turns, which ranks you as the best!\n" +
                    MESSAGES.major_nag.quickest.message;
          } else if(SLOWEST){
            text = "<@" + nextPlayerName + ">\n";
            if (LEADER_MESSAGES){
              text += MESSAGES.major_nag.slowest.intro[civType];
            } else {
              text += MESSAGES.major_nag.slowest.intro.standard;
            }
            text += "It's been " + duration + " hours, and it's still your turn!\n" +
                    "Your average turn time is " + averageTurnTime.hours + " hour(s) and " + averageTurnTime.minutes + " minutes, which ranks you as the worst!\n" +
                    //"You've had " + slowTurns + " slow turns, which ranks you as the worst!\n" +
                    MESSAGES.major_nag.slowest.message;
          } else {
            text = "<@" + nextPlayerName + ">\n";
            if (LEADER_MESSAGES){
              text += MESSAGES.major_nag.general.intro[civType];
            } else {
              text += MESSAGES.major_nag.general.intro.standard;
            }
            text += "It's been " + duration + " hours, and it's still your turn!\n" +
                    "Your average turn time is " + averageTurnTime.hours + " hour(s) and " + averageTurnTime.minutes + " minutes, which ranks you " + rank + " out of " + playerCount + ".\n" +
                    //"You've had " + slowTurns + " slow turns, which ranks you " + rank + " out of " + playerCount + ".\n" +
                    MESSAGES.major_nag.general.message;
          }
          break;
        case 4:
          if(QUICKEST){
            text = "<@" + nextPlayerName + ">\n";
            if (LEADER_MESSAGES){
              text += MESSAGES.gigantic_nag.quickest.intro[civType];
            } else {
              text += MESSAGES.gigantic_nag.quickest.intro.standard;
            }
            text += "IT'S BEEN " + duration + " HOURS NOW, AND IT'S STILL YOUR TURN!\n" +
                    "Your average turn time is " + averageTurnTime.hours + " hour(s) and " + averageTurnTime.minutes + " minutes, which ranks you as the best,\n" +
                    //"You've only had " + slowTurns + " slow turns, which ranks you as the best,\n" +
                    MESSAGES.gigantic_nag.quickest.message;
          } else if(SLOWEST){
            text = "<@" + nextPlayerName + ">\n";
            if (LEADER_MESSAGES){
              text += MESSAGES.gigantic_nag.slowest.intro[civType];
            } else {
              text += MESSAGES.gigantic_nag.slowest.intro.standard;
            }
            text += "IT'S BEEN " + duration + " HOURS NOW, AND IT'S STILL YOUR BLOODY TURN!\n" +
                    "YOUR AVERAGE TURN TIME IS " + averageTurnTime.hours + " HOUR(S) AND " + averageTurnTime.minutes + " MINUTES, WHICH RANKS YOU AS THE WORST!\n" +
                    //"YOU HAVE HAD " + slowTurns + " SLOW TURNS, WHICH RANKS YOU AS THE WORST!\n" +
                    MESSAGES.gigantic_nag.slowest.message;
          } else {
            text = "<@" + nextPlayerName + ">\n";
            if (LEADER_MESSAGES){
              text += MESSAGES.gigantic_nag.general.intro[civType];
            } else {
              text += MESSAGES.gigantic_nag.general.intro.standard;
            }
            text += "IT'S BEEN " + duration + " HOURS NOW, AND IT'S STILL YOUR TURN!\n" +
                    "YOUR AVERAGE TURN TIME IS " + averageTurnTime.hours + " HOUR(S) AND " + averageTurnTime.minutes + " MINUTES, WHICH RANKS YOU " + rank + " OUT OF " + playerCount + ".\n" +
                    //"YOU HAVE HAD " + slowTurns + " SLOW TURNS, WHICH RANKS YOU " + rank + " OUT OF " + playerCount + ".\n" +
                    MESSAGES.gigantic_nag.general.message;
          }
          break;
      }

      return text;
}

function isSleeping() {
   let currentTime = moment();
   console.log("current time: ", currentTime);
   return (currentTime.isAfter(SLEEP_START) && currentTime.isBefore(SLEEP_END));
}
