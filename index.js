
const PLAYERS = require('./config/players').players;
const GAMES = require('./config/game-details').games;

const request = require('request');
const moment = require('moment');

const PYDT_URL = 'https://api.playyourdamnturn.com/game/';

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
                    
            }
            else {
                console.log("Still waiting on", nextPlayerName, "to take their turn");
                console.log("Last turn was", lastTurnTime.fromNow());
                resolve(nextPlayerName);
            }

            resolve();

		});

	});
};

