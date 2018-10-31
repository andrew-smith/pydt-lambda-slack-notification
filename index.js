
const PLAYERS = require('./config/players');
const GAMES = require('./config/game-details')


module.exports.run = (event, context, callback) => {

    console.log(PLAYERS);
    console.log(GAMES);

    callback(null, "done");
};
