
const PLAYERS = require('./config/players').players;
const GAMES = require('./config/game-details').games;

const request = require('request');
const moment = require('moment');

const PYDT_URL = 'https://api.playyourdamnturn.com/game/';

// nagging config
const NAG = true;
const MAJOR_NAG = true;

const NAG_WINDOW_OPEN = 300;
const NAG_WINDOW_CLOSE = 295;

const MAJOR_NAG_WINDOW_OPEN = 1440;
const MAJOR_NAG_WINDOW_CLOSE = 1435;

// helper switches to test
const SLACK_DEBUG = false;
const FORCE_SLACK_PUSH = false;


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
  let nagWindowOpen = moment().subtract(NAG_WINDOW_OPEN, 'minutes');
  let nagWindowClose = moment().subtract(NAG_WINDOW_CLOSE, 'minutes');
  let majorNagWindowOpen = moment().subtract(MAJOR_NAG_WINDOW_OPEN, 'minutes');
  let majorNagWindowClose = moment().subtract(MAJOR_NAG_WINDOW_CLOSE, 'minutes');

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

      let playerDetails = body.players;
			let nextPlayerId = body.currentPlayerSteamId;
			let lastTurnTime = moment(body.lastTurnEndDate);
            let nextPlayerName = PLAYERS[nextPlayerId];

            console.log("id", nextPlayerId);
            console.log("name", nextPlayerName);
            console.log("time", lastTurnTime);

			// this lambda function polls every 4 minutes. Check if the last turn happened at least 5 minutes ago
			if(fiveMinutesAgo.isBefore(lastTurnTime) || SLACK_DEBUG) {
          console.log("Last turn was within 5 minutes");

          let options = { method: 'POST',
              url: game.slack_url,
              body: { text: "It's your turn <@" + nextPlayerName + ">!"},
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

      } else if((NAG && (nagWindowOpen.isBefore(lastTurnTime) && nagWindowClose.isAfter(lastTurnTime))) || SLACK_DEBUG) {
          console.log("Nagging!");
          let duration = moment.duration(moment().diff(nagWindowOpen, 'hours'));

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

          let nagText = "";
          if(QUICKEST){
            nagText = "Hey <@" + nextPlayerName + ">! It has been " + duration + " hours, and it's still your turn! \n You have only had " + slowTurns + " slow turns, which ranks you as the best! \n Keep your lead by doing your turn!"
          } else if(SLOWEST){
            nagText = "Hey <@" + nextPlayerName + ">! It has been " + duration + " hours, and it's still your turn! \n You have had " + slowTurns + " slow turns, which ranks you as the worst! \n Pick up the pace to increase your rank!"
          } else {
            nagText = "Hey <@" + nextPlayerName + ">! It has been " + duration + " hours, and it's still your turn! \n You have had " + slowTurns + " slow turns, which ranks you " + rank + " out of " + playerCount + ". Do your turn quickly before your rank drops!"
          }

          let options = { method: 'POST',
              url: game.slack_url,
              body: { text: nagText},
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

      } else if((MAJOR_NAG && (majorNagWindowOpen.isBefore(lastTurnTime) && majorNagWindowClose.isAfter(lastTurnTime))) || SLACK_DEBUG) {
        console.log("Major Nagging!");
        let duration = moment.duration(moment().diff(majorNagWindowOpen, 'hours'));

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

        let nagText = "";
        if(QUICKEST){
          nagText = "HEY <@" + nextPlayerName + ">! IT HAS BEEN " + duration + " HOURS NOW, AND IT'S STILL YOUR TURN! \n You have only had " + slowTurns + " slow turns, which ranks you as the best, \n BUT THIS IS TERRIBLE!"
        } else if(SLOWEST){
          nagText = "HEY <@" + nextPlayerName + ">! IT HAS BEEN " + duration + " HOURS NOW, AND IT'S STILL YOUR TURN! \n You have had " + slowTurns + " slow turns, which ranks you as the worst! \n YOU ARE A DISGRACE!"
        } else {
          nagText = "HEY <@" + nextPlayerName + ">! IT HAS BEEN " + duration + " HOURS NOW, AND IT'S STILL YOUR TURN! \n You have had " + slowTurns + " slow turns, which ranks you " + rank + " out of " + playerCount + ". AT THIS RATE YOU ARE GOING TO BE WORST!"
        }

        let options = { method: 'POST',
            url: game.slack_url,
            body: { text: nagText},
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
