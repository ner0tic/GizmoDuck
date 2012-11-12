global.version = "0.0.1";

// Node.js needed modules
var Bot           = require('ttapi');
global.util       = require('util');
global.fs         = require('fs');
global.color      = require("ansi-color").set;
global.mysql      = require("mysql");
global.Moment     = require('moment');
require("datejs");

// Local modules
global.Database   = require('./database.js');
global.Events     = require('./events.js');
global.Functions  = require('./functions.js');
global.Dictionary = require('./dictionary.js');


// Database initialization
try {
  global.client     = mysql.createClient({
    "host": dbHost,
    "user": dbUser,
    "password": dbPassword
  });
  SetupDatabase();
} catch(e) {
    Log(e);
    Log('Database setup failed.');
    process.exit(0);
}

global.Users        = {}
global.Commands     = new Array();

global.DJs          = {};
global.PreviousDJs  = {};
global.PreviousDJ   = '';
global.CurrentDJ    = '';
global.NextDJ       = '';
global.NextDJTime   = '';
global.DJQueue      = {
  "length": 0
};

global.BotDJ                = false;
global.BotOnTable           = false;
global.BotPlayingSong       = false;
global.BotStepDownAfterSong = false;

global.DanceCount       = 0;
global.DanceRequesters  = [];
global.LameCount        = 0;
global.Voted            = false;
global.SnagCount        = 0;

global.CurrentSong      = {
  artist:     null,
  song:       null,
  dj_name:    null,
  dj_id:      null,
  up:         0,
  down:       0,
  listeners:  0,
  snagged:    0,
  id:         null,
  length:     0
};

// Initialize Bot
global.Bot = AddBot(authId, UserId, Name, RoomId);

// Load Commands
var files = fs.readdirSync('Commands');
for(i in files) {
  if(files[i].substr(files[i].lastIndexOf('.') + 1) == 'js') {
    var command = require('commands/' + file[i]);
    Commands.push({
      name: command.name,
      handler: commands.handler,
      enabled: commands.enabled,
      matchStart: command.matchStart
    });
  }
}

// Event Hooks
Bot.on('tcpConnect', OnTcpConnect);
Bot.on('tcpMessage', OnTcpMessage);
Bot.on('tcpEnd', OnTcpEnd);
Bot.on('httpRequest', OnHttpRequest);
Bot.on("ready", OnReady);
Bot.on("roomChanged", OnRoomChanged);
Bot.on("registered", OnRegistered);
Bot.on("deregistered", OnDeregistered);
Bot.on("speak", OnSpeak);
Bot.on("endsong", OnEndSong);
Bot.on("newsong", OnNewSong);
Bot.on("nosong", OnNoSong);
Bot.on("update_votes", OnUpdateVotes);
Bot.on("booted_user", OnBootedUser);
Bot.on("update_user", OnUpdateUser);
Bot.on("add_dj", OnAddDJ);
Bot.on("rem_dj", OnRemDJ);
Bot.on("snagged", OnSnagged);
Bot.on("pmmed", OnPmmed);
Bot.on("error", OnError);