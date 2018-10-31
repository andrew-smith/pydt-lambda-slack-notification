
const PLAYERS = require('./players');
const GAMES = require('./game-details')


module.exports.run = (event, context, callback) => {

    console.log(PLAYERS);
    console.log(GAMES);

    callback(null, "done");
};
