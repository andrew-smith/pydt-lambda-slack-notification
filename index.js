
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

const MAJOR_NAG_WINDOW_OPEN = 720;
const MAJOR_NAG_WINDOW_CLOSE = 716;

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
var QUICKEST = false;
var SLOWEST = false;
var playerDetails;
var userDetails;
var playerCount = 0;
var nextPlayerId;
var nextPlayerName;
var lastTurnTime;
var civType;
var turnsPlayed;
var timeTaken;
var averageTurnTime;
var slowTurns;
var fastTurns;
var doTurnWithin;
var targetPlayer;
var fastTurnsRequired;
var text;


module.exports.run = (event, context, callback) => {

    console.log(PLAYERS);
    console.log(GAMES);
    let userPromises = [];

    Object.keys(GAMES).forEach((gameId) => {
    	userPromises.push(checkUsers(gameId));
    });

    Promise.all(userPromises)
    .then((users) => {
    	callback(null, "done");
    })
    .then(function() {
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
    })
    .catch((err) => {
    	console.log("Error:");
    	console.log(err);
    	callback(err);
    });
};

//get all slack users
const checkUsers = (gameId) => {

  return new Promise((resolve, reject) => {

		let game = GAMES[gameId];
    request(game.slack_getUsers, (err, res, body) => {

      if(err) {
        console.log("Error getting Slack Users");
        console.log(err);
        return reject(err);
      }

      if(res.statusCode !== 200) {
        return reject("getUser: " + game.slack_getUsers + " returns nothing. StatusCode: " + res.statusCode);
      }

      body = JSON.parse(body);
      userDetails = body.members;
      resolve();
    });
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
      QUICKEST = false;
      SLOWEST = false;
      playerCount = 0;
      let duration = moment.duration(moment().diff(sinceTurn, 'hours'));
      let slowTurnsArray = [];
      let fastTurnsArray = [];
      let averageTurnTimeArray = [];

      //Gather and sort all player stats
      playerDetails.forEach(function(player) {
        averageTurnTimeArray.push(luxon.Duration.fromMillis(player.timeTaken/player.turnsPlayed).as('milliseconds'));
        slowTurnsArray.push(player.slowTurns);
        fastTurnsArray.push(player.fastTurns);
        playerCount++;
      });
      averageTurnTimeArray.sort((x, y) => x - y);
      console.log("averageTurnTimeArray: ", averageTurnTimeArray);
      slowTurnsArray.sort((x, y) => x - y);
      console.log("slowTurnsArray: ", slowTurnsArray);
      fastTurnsArray.sort((x, y) => x - y);
      console.log("fastTurnsArray: ", fastTurnsArray);

      //Gather current player stats
      playerDetails.forEach(function(player) {
        if(player.steamId == nextPlayerId){
          timeTaken = player.timeTaken;
          turnsPlayed = player.turnsPlayed;
          averageTurnTime = luxon.Duration.fromMillis(timeTaken/turnsPlayed).shiftTo('hours', 'minutes', 'seconds');
          slowTurns = player.slowTurns;
          fastTurns = player.fastTurns;
          civType = player.civType;
        }
      });

      //Set rank by average turn time
      let rank = averageTurnTimeArray.indexOf(averageTurnTime.as('milliseconds')) + 1;
      console.log("rank: ", rank);
      console.log("playerCount: ", playerCount);

      if(rank == 1){
        QUICKEST = true;
      } else if(rank == playerCount){
        SLOWEST = true;
      }

      console.log("QUICKEST: ", QUICKEST);
      console.log("SLOWEST: ", SLOWEST);

      switch(nagLevel) {
        case 0:
          text = "It's your turn <@" + nextPlayerName + ">!\n";
          if(improveAverageTurnTime(averageTurnTimeArray, rank)){
            text += "If you do your turn within " + doTurnWithin.minutes + " minutes, your average turn time will be better than " + targetPlayer + "!";
          } else if(equalFastTurns(fastTurnsArray, fastTurns)){
            text += "If you do your turn within " + doTurnWithin.hours + " hour, you will have as many fast turns as " + targetPlayer + "!";
          } else if (betterFastTurns(fastTurnsArray, fastTurns)){
            text += "If you do your turn within " + doTurnWithin.hours + " hour, you will have more fast turns than " + targetPlayer + "!";
          } else if(avoidEqualSlowTurns(slowTurnsArray, slowTurns)){
            text += "If you don't do your turn within " + doTurnWithin.hours + " hours, you will have as many slow turns as " + targetPlayer + "!";
          } else if(avoidWorseSlowTurns(slowTurnsArray, slowTurns)){
            text += "If you don't do your turn within " + doTurnWithin.hours + " hours, you will have more slow turns than " + targetPlayer + "!";
          } else if(worseningAverageTurnTime(averageTurnTimeArray, rank)){
            text += "If you don't do your turn within " + doTurnWithin.hours + " hour(s) and " + doTurnWithin.minutes + " minutes, your average turn time will drop below " + targetPlayer + "!";
          } else if(fastTurnsToImproveAverage(averageTurnTimeArray, rank)){
            text += "I've calculated that, all other things being equal, if you do your next " + fastTurnsRequired + " turns each within 30 minutes, you will have surpassed " + targetPlayer + "'s average turn time!";
          }
          break;
        case 1:
          if(QUICKEST){
            text = "<@" + nextPlayerName + ">\n";
            if (LEADER_MESSAGES){
              text += MESSAGES.minor_nag.quickest.intro[civType] || MESSAGES.minor_nag.quickest.intro.standard;
            } else {
              text += MESSAGES.minor_nag.quickest.intro.standard;
            }
            text += "It's been " + duration + " hours, and it's still your turn!\n" +
                    "Your average turn time is " + averageTurnTime.hours + " hour(s) and " + averageTurnTime.minutes + " minutes, which ranks you as the best!\n" +
                    MESSAGES.minor_nag.quickest.message;
          } else if(SLOWEST){
            text = "<@" + nextPlayerName + ">\n";
            if (LEADER_MESSAGES){
              text += MESSAGES.minor_nag.slowest.intro[civType] || MESSAGES.minor_nag.slowest.intro.standard;
            } else {
              text += MESSAGES.minor_nag.slowest.intro.standard;
            }
            text += "It's been " + duration + " hours, and it's still your turn!\n" +
                    "Your average turn time is " + averageTurnTime.hours + " hour(s) and " + averageTurnTime.minutes + " minutes, which ranks you as the worst!\n" +
                    MESSAGES.minor_nag.slowest.message;
          } else {
            text = "<@" + nextPlayerName + ">\n";
            if (LEADER_MESSAGES){
              text += MESSAGES.minor_nag.general.intro[civType] || MESSAGES.minor_nag.general.intro.standard;
            } else {
              text += MESSAGES.minor_nag.general.intro.standard;
            }
            text += "It's been " + duration + " hours, and it's still your turn!\n" +
                    "Your average turn time is " + averageTurnTime.hours + " hour(s) and " + averageTurnTime.minutes + " minutes, which ranks you " + rank + " out of " + playerCount + ".\n" +
                    MESSAGES.minor_nag.general.message;
          }
          break;
        case 2:
          if(QUICKEST){
            text = "<@" + nextPlayerName + ">\n";
            if (LEADER_MESSAGES){
              text += MESSAGES.moderate_nag.quickest.intro[civType] || MESSAGES.moderate_nag.quickest.intro.standard;
            } else {
              text += MESSAGES.moderate_nag.quickest.intro.standard;
            }
            text += "It's been " + duration + " hours, and it's still your turn!\n" +
                    "Your average turn time is " + averageTurnTime.hours + " hour(s) and " + averageTurnTime.minutes + " minutes, which ranks you as the best!\n" +
                    MESSAGES.moderate_nag.quickest.message;
          } else if(SLOWEST){
            text = "<@" + nextPlayerName + ">\n";
            if (LEADER_MESSAGES){
              text += MESSAGES.moderate_nag.slowest.intro[civType] || MESSAGES.moderate_nag.slowest.intro.standard;
            } else {
              text += MESSAGES.moderate_nag.slowest.intro.standard;
            }
            text += "It's been " + duration + " hours, and it's still your turn!\n" +
                    "Your average turn time is " + averageTurnTime.hours + " hour(s) and " + averageTurnTime.minutes + " minutes, which ranks you as the worst!\n" +
                    MESSAGES.moderate_nag.slowest.message;
          } else {
            text = "<@" + nextPlayerName + ">\n";
            if (LEADER_MESSAGES){
              text += MESSAGES.moderate_nag.general.intro[civType] || MESSAGES.moderate_nag.general.intro.standard;
            } else {
              text += MESSAGES.moderate_nag.general.intro.standard;
            }
            text += "It's been " + duration + " hours, and it's still your turn!\n" +
                    "Your average turn time is " + averageTurnTime.hours + " hour(s) and " + averageTurnTime.minutes + " minutes, which ranks you " + rank + " out of " + playerCount + ".\n" +
                    MESSAGES.moderate_nag.general.message;
          }
          break;
        case 3:
          if(QUICKEST){
            text = "<@" + nextPlayerName + ">\n";
            if (LEADER_MESSAGES){
              text += MESSAGES.major_nag.quickest.intro[civType] || MESSAGES.major_nag.quickest.intro.standard;
            } else {
              text += MESSAGES.major_nag.quickest.intro.standard;
            }
            text += "IT'S BEEN " + duration + " HOURS NOW, AND IT'S STILL YOUR TURN!\n" +
                    "Your average turn time is " + averageTurnTime.hours + " hour(s) and " + averageTurnTime.minutes + " minutes, which ranks you as the best,\n" +
                    MESSAGES.major_nag.quickest.message;
          } else if(SLOWEST){
            text = "<@" + nextPlayerName + ">\n";
            if (LEADER_MESSAGES){
              text += MESSAGES.major_nag.slowest.intro[civType] || MESSAGES.major_nag.slowest.intro.standard;
            } else {
              text += MESSAGES.major_nag.slowest.intro.standard;
            }
            text += "IT'S BEEN " + duration + " HOURS NOW, AND IT'S STILL YOUR BLOODY TURN!\n" +
                    "YOUR AVERAGE TURN TIME IS " + averageTurnTime.hours + " HOUR(S) AND " + averageTurnTime.minutes + " MINUTES, WHICH RANKS YOU AS THE WORST!\n" +
                    MESSAGES.major_nag.slowest.message;
          } else {
            text = "<@" + nextPlayerName + ">\n";
            if (LEADER_MESSAGES){
              text += MESSAGES.major_nag.general.intro[civType] || MESSAGES.major_nag.general.intro.standard;
            } else {
              text += MESSAGES.major_nag.general.intro.standard;
            }
            text += "IT'S BEEN " + duration + " HOURS NOW, AND IT'S STILL YOUR TURN!\n" +
                    "YOUR AVERAGE TURN TIME IS " + averageTurnTime.hours + " HOUR(S) AND " + averageTurnTime.minutes + " MINUTES, WHICH RANKS YOU " + rank + " OUT OF " + playerCount + ".\n" +
                    MESSAGES.major_nag.general.message;
          }
          break;
        case 4:
          text = "<@" + nextPlayerName + ">\n";
          if (LEADER_MESSAGES){
            text += MESSAGES.gigantic_nag.general.intro[civType] || MESSAGES.gigantic_nag.general.intro.standard;
          } else {
            text += MESSAGES.gigantic_nag.general.intro.standard;
          }
          text += "IT'S BEEN " + duration + " HOURS!!!!!\n" +
                  MESSAGES.gigantic_nag.general.message;
      }

      return text;
}

function isSleeping() {
   let currentTime = moment();
   console.log("current time: ", currentTime);
   return (currentTime.isAfter(SLEEP_START) && currentTime.isBefore(SLEEP_END));
}

//checks whether the player 1 rank higher has an average turn time which can be beaten if the current player does their turn within 30 minutes
//note that this doesn't apply to the highest ranked player
function improveAverageTurnTime(array, rank) {
  let index = rank-2; //for code-readability, translating to index (even if just for semantics) for the array look-up in this function.
  if(rank != 1) {
    let target = array[index]; //finds the average turn time of the player 1 rank higher in this array (e.g. player at rank 2, searching for player at rank 1, uses an index of 0).
    let timeToBeat = target * (turnsPlayed+1);
    if (timeToBeat - timeTaken > 900000){ // if the player has more than 15 minutes (900000 milliseconds) in which to rank-up
      doTurnWithin = luxon.Duration.fromMillis(timeToBeat - timeTaken).shiftTo('minutes', 'seconds');
      playerDetails.forEach(function(player) {
        if((player.timeTaken/player.turnsPlayed) == target) {
          userDetails.forEach(function(user) {
            if(PLAYERS[player.steamId] == user.id){
              targetPlayer = user.real_name;
            }
          });
        }
      });
      return true;
    }
  }
  return false;
}

//checks how long the player has before their average turn time drops below the player 1 rank below them.
//note that this doesn't apply to the lowest ranked player
function worseningAverageTurnTime(array, rank) {
  let index = rank; //for code-readability, translating to index (even if just for semantics) for the array look-up in this function.
  if(rank != playerCount) {
    let target = array[index]; //finds the average turn time of the player 1 rank lower in this array
    let timeToBeat = target * (turnsPlayed+1);
    if (timeToBeat - timeTaken < 43200000){ // if the player has less than 12 hours (43200000 milliseconds) before rank drops
      doTurnWithin = luxon.Duration.fromMillis(timeToBeat - timeTaken).shiftTo('hours', 'minutes', 'seconds');
      playerDetails.forEach(function(player) {
        if((player.timeTaken/player.turnsPlayed) == target) {
          userDetails.forEach(function(user) {
            if(PLAYERS[player.steamId] == user.id){
              targetPlayer = user.real_name;
            }
          });
        }
      });
      return true;
    }
  }
  return false;
}

//checks whether the player can equal the number of fast turns of the player 1 rank higher than them.
function equalFastTurns(array, number) {
  let index = array.indexOf(number)+1;
  if (index in array) {
    if (array[index] == number+1) {
      doTurnWithin = luxon.Duration.fromMillis(3600000).shiftTo('hours');
      playerDetails.forEach(function(player) {
        if((player.fastTurns) == array[index]) {
          userDetails.forEach(function(user) {
            if(PLAYERS[player.steamId] == user.id){
              targetPlayer = user.real_name;
            }
          });
        }
      });
      return true;
    }
  }
  return false;
}

//checks whether the player can get a higher number of fast turns than the player they are equal with.
function betterFastTurns(array, number) {
  let index = array.indexOf(number)+1;
  if (index in array) {
    if (array[index] == number) {
      doTurnWithin = luxon.Duration.fromMillis(3600000).shiftTo('hours');
      playerDetails.forEach(function(player) {
        if((player.fastTurns == array[index]) && (player.steamId != nextPlayerId)) {
          userDetails.forEach(function(user) {
            if(PLAYERS[player.steamId] == user.id){
              targetPlayer = user.real_name;
            }
          });
        }
      });
      return true;
    }
  }
  return false;
}

//checks whether the player can equal the amount of slow turns that the player 1 rank below them has.
function avoidEqualSlowTurns(array, number) {
  let index = array.indexOf(number)+1;
  if (index in array) {
    if (array[index] == number+1) {
      doTurnWithin = luxon.Duration.fromMillis(21600000).shiftTo('hours');
      playerDetails.forEach(function(player) {
        if((player.slowTurns) == array[index]) {
          userDetails.forEach(function(user) {
            if(PLAYERS[player.steamId] == user.id){
              targetPlayer = user.real_name;
            }
          });
        }
      });
      return true;
    }
  }
  return false;
}

//checks whether the player runs the risk of having more slow turns than the player they are currently equal with.
function avoidWorseSlowTurns(array, number) {
  let index = array.indexOf(number)+1;
  if (index in array) {
    if (array[index] == number) {
      doTurnWithin = luxon.Duration.fromMillis(21600000).shiftTo('hours');
      playerDetails.forEach(function(player) {
        if((player.slowTurns == array[index]) && (player.steamId != nextPlayerId)) {
          userDetails.forEach(function(user) {
            if(PLAYERS[player.steamId] == user.id){
              targetPlayer = user.real_name;
            }
          });
        }
      });
      return true;
    }
  }
  return false;
}

//attempts to work out how many fast turns (up to 100) would be needed for a player to improve their average turn time rank
//note that this doesn't apply to the highest ranked player
function fastTurnsToImproveAverage(array, rank){
  let index = rank-2; //for code-readability, translating to index (even if just for semantics) for the array look-up in this function.
  if(rank != 1) {
    let target = array[index]; //finds the average turn time of the player 1 rank higher in this array (e.g. player at rank 2, searching for player at rank 1, uses an index of 0).
    let cumulativeTimeTaken = timeTaken;
    let counter = 0;
    for(var i = turnsPlayed+1; i < (turnsPlayed + 100); i++){
      cumulativeTimeTaken += 1800000; //add 30 minutes (within the fast turn limit)
      counter++;
      if(cumulativeTimeTaken/i < target){
        fastTurnsRequired = counter;
        playerDetails.forEach(function(player) {
          if((player.timeTaken/player.turnsPlayed) == target) {
            userDetails.forEach(function(user) {
              if(PLAYERS[player.steamId] == user.id){
                targetPlayer = user.real_name;
              }
            });
          }
        });
        return true;
      }
    }
    return false;
  }
}
