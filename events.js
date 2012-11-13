var BotWasBooted = false;
var PlayCount = 0;

global.OnTcpConnect = function(socket) {
  Log(color("EVENT :: TCP Connect: ", "blue") + socket);
};
global.OnTcpMessage = function(socket, msg) {
  Log(color("EVENT :: TCP Message: ", "blue") + socket + msg);
};
global.OnTcpEnd = function(socket) {
  Log(color("EVENT :: TCP End: ", "blue") + socket);
};
global.OnHttpRequest = function(request, response) {
  Log(color("EVENT :: HTTP Request: ", "blue") + request + response);
};
global.OnReady = function(data) {
  Log(color("EVENT :: Ready", "blue"));
  Get("MaxPlays", 0, function(max) {
    totalPlays = Number(max);
  });
  Get("DjQueue", 10, function(results) {
    if(results !== null && results.length !== 0) {
      Log(results);
      var jsonResult = JSON.parse(results);
      DjQueue.length = jsonResult.length;
      for(var i in jsonResult) {
        var dj = jsonResult[i];
        DjQueue[i] = dj;
      }
      Log(DjQueue);
    }
  });

  // Get the subscribers for the PM list
  Get("Subscribers", 0, function(results) {
    if(results !== null) {
      var jsonResult = JSON.parse(results);
      Subscribers = jsonResult;
    }
  });
};
global.OnRoomChanged = function(data) {
  try {
    Log(color("EVENT :: Room Changed to " + data.room.name, "blue"));
    if(botWasBooted) {
      Speak(Diction.BotKicked);
      botWasBooted = false;
    } else {
      Speak(Diction.BotRoomChange);
    }
    
    if(CurrentRoomId !== data.room.roomid) {
      CurrentRoomId = data.room.roomid;
      SetUpRoom();
    }

    Set("roomName", data.room.name);

    if(data.room.metadata.current_song != null) {
        PopulateSongData(data);
    }

    Log("Loading Users");
    var users = data.users;
    for(var i in users) {
      var user = users[i];
      user.lastActivity = user.loggedIn = new Date();
      AllUsers[user.user_id] = user;
      if(users[i].name !== null) {
        client.query("INSERT INTO " + dbName + '.' + dbTablePrefix + "User(`roomid`, `userid`, `username`, `lastseen`) VALUES (?, ?, ?, NOW()) ON DUPLICATE KEY UPDATE lastseen = NOW()", [CurrentRoomId, users[i].userid, users[i].name]);
      }
    }

    setTimeout(function() {
      Log("Loading DJs");
      var tt_DJs = data.room.metadata.djs;

      Get("DJs", 10, function(results) {
      if(results !== null) {
        if(results.length !== 0 && results !== " ") {
          var jsonResult = JSON.parse(results);
          Log(JSON.stringify(jsonResult));
          Log(JSON.stringify(tt_DJs));
          for(var i = 0; i < tt_DJs.length; i++) {
            if(jsonResult[tt_DJs[i]] !== undefined) {
              Log("Cached DJ :: " + tt_DJs[i]);
              var DJ_Info = {
                userid: tt_DJs[i],
                name: AllUsers[tt_DJs[i]].name,
                remainingPlays: jsonResult[tt_DJs[i]].remainingPlays,
                afkCount: jsonResult[tt_DJs[i]].afkCount,
                waitDJs: jsonResult[tt_DJs[i]].waitDJs
              }
              DJs[tt_DJs[i]] = DJ_Info;
            } else {
              Log("DJ not cached in DB:" + tt_DJs[i]);
              var DJ_Info = {
                userid: tt_DJs[i],
                name: AllUsers[tt_DJs[i]].name,
                remainingPlays: totalPlays,
                afkCount: 0,
                waitDJs: 0
              }
              DJs[tt_DJs[i]] = DJ_Info;
            }
          }
        }
        } else {
          Log("No DJs cached in DB");
          for(var i = 0; i < tt_DJs.length; i++) {
            var DJ_Info = {
              userid: tt_DJs[i],
              name: AllUsers[tt_DJs[i]].name,
              remainingPlays: totalPlays,
              afkCount: 0,
              waitDJs: 0
            }
            DJs[tt_DJs[i]] = DJ_Info;
          }
        }
        setTimeout(function() {
          Set('DJs', JSON.stringify(DJs));
          Log(JSON.stringify(DJs));
        }, 5000);
      });
    }, 5000);

    CurrentDj = data.room.metadata.current_dj;

    setTimeout(function() {
      BotDJCheck();
    }, 5000);

  } catch(e) {
    Log(color("ERROR :: Room Changed ", "red") + e);
  }
};
global.OnRegistered = function(data) {
  try {
    Log(color("EVENT :: Registered: ", "blue") + data.user[0].name + " - " + data.user[0].userid);

    if(CurrentSong != null) {
      CurrentSong.Listeners++;
    }

    var users = data.user;
    for(var i in users) {
      var user = users[i];
      user.lastActivity = user.loggedIn = new Date();
      AllUsers[user.userid] = user;
    }

    if(data.user[0].name !== null) {
      client.query("INSERT INTO " + dbName + '.' + dbTablePrefix + "User(`roomid`, `userid`, `username`, `lastseen`) VALUES (?, ?, ?, NOW()) ON DUPLICATE KEY UPDATE lastseen = NOW()", [CurrentRoomId, data.user[0].userid, data.user[0].name]);
    }
    
    client.query("SELECT `userid`, `banned_by`, DATE_FORMAT(`timestamp`, \'%c/%e/%y\') as timestamp FROM " + dbName + '.' + dbTablePrefix + "BANNED WHERE `userid` LIKE '" + user.userid + "'", function cb(error, results, fields) {
      if(results != null && results.length > 0) {
        bot.boot(user.userid, 'You were banned from this room by ' + results[0]['banned_by'] + ' on ' + results[0]['timestamp']);
      }
    });

    Get("EnableQueue", 0, function(queueEnabled) {
      if(QueueEnabled === "true") {
        if(DJQueue[data.user[0].userid] !== undefined) {
          DJQueue[data.user[0].userid].isAfk = false;
          DJQueue[data.user[0].userid].akfTime = null;
          DJQueue.length++;
          Set('DjQueue', JSON.stringify(DjQueue));
        }
        bot.pm("Greetings @" + data.user[0].name + ". If you would like to DJ, please type 'q+' to get added to the queue.", data.user[0].userid);
      }
    });
  } catch(e) {
    Log(color("ERROR :: Room Changed ", "red") + e);
  }
};
global.OnDeregistered = function(data) {
  try {
    Log(color("EVENT :: Deregistered: ", "blue") + data.user[0].name + " - " + data.user[0].userid);

    if(CurrentSong != null) {
      CurrentSong.listeners--;
    }

    var users = data.user;
    for(var i in users) {
      delete AllUsers[users[i].userid];
    }

    Get("EnableQueue", 0, function(QueueEnabled) {
      if(QueueEnabled === "true") {
        if(DJQueue[data.user[0].userid] !== undefined) {
          DJQueue[data.user[0].userid].isAfk = true;
          DJQueue[data.user[0].userid].akfTime = new Date();
          DJQueue.length--;
          Set('DJQueue', JSON.stringify(DjQueue));
        }
      }
    });
  } catch(e) {
    Log(color("ERROR :: Room Changed ", "red") + e);
  }
};
global.OnSpeak = function(data) {
  Command("speak", data);
  if(AllUsers[data.userid] !== undefined) {
    AllUsers[data.userid].lastActivity = new Date();
  }
};
global.OnEndSong = function(data) {
  Log(color("EVENT :: End Song: ", "blue") + data.room.metadata.current_song.metadata.artist + " - " + data.room.metadata.current_song.metadata.song);

  AddSong();

  DanceRequesters = [];
  Voted = false;

  var EndSongResponse = CurrentSong.Song + ' stats: :+1: ' + CurrentSong.Up + ' :-1: ' + CurrentSong.Down + ' <3 ' + CurrentSong.Snags;
	Get("SongStats", 0, function(value) {
      if(value === "true") {
        Speak(EndSongResponse);
      }
	});

	if(data.room.metadata.current_dj === botUserId) {
      BotIsPlayingSong = false;
      Log("Song has ended.");
	}

	if(BotStepDownAfterSong) {
      Speak(stepDownText);
      setTimeout(function() {
        bot.RemoveDJ();
      }, 500);
      BotDJing = false;
      BotStepDownAfterSong = false;
	}
	clearTimeout(SongWarningIntervalId);
	clearTimeout(SongBootIntervalId);
};
global.OnNewSong = function(data) {
  var SongLength = Number(data.room.metadata.current_song.metadata.length) / 60;
  Log(color("EVENT :: New Song: ", "blue") + data.room.metadata.current_song.metadata.artist + " - " + data.room.metadata.current_song.metadata.song + " | Length: " + SongLength + " minutes.");
  DanceCount = 0;
  LameCount = 0;
  SnagCount = 0;

  PopulateSongData(data);

  if(BotDJing) {
    var rand = Math.ceil(Math.random() * 20);
    var wait = rand * 1000;
    setTimeout(function() {
      bot.vote('up');
      Voted = true;
    }, wait);
  }

  if(data.room.metadata.current_dj === BotUserId) {
    BotIsPlayingSong = true;
    Log("Playing song right now.");
  }

  PreviousDJ = CurrentDJ;
  CurrentDJ = data.room.metadata.current_dj;
  if(DJs[CurrentDJ] !== undefined) {
    DJs[CurrentDJ].remainingPlays--;
    Set('DJs', JSON.stringify(DJs));
  }
};
global.OnNoSong = function(data) {
  Log(color("EVENT :: No Song: ", "Red") + JSON.stringify(data));
  if(BotDJing) {
    Bot.Skip();
  }
};
global.OnUpdateVotes = function(data) {
  if(data.room.metadata.votelog[0][1] == "down") {
    Get("Lamer", 0, function(value) {
      if(value === "true" && BotUserId !== data.room.metadata.votelog[0][0]) {
        SpeakRandom(Diction.DownVote);
      }
    });
  }

  var votelog = data.room.metadata.votelog;
  for(var i = 0; i < votelog.length; i++) {
    var userid = votelog[i][0];
	if(userid !== "") {
      if(AllUsers[userid] !== undefined) {
        AllUsers[userid].lastActivity = new Date();
      }
    } else {
      Log("Update Vote: " + userid);
    }
  }

  CurrentSong.Up = data.room.metadata.upvotes;
  CurrentSong.Down = data.room.metadata.downvotes;
  CurrentSong.Listeners = data.room.metadata.listeners;

  Get("autobop", 0, function(value) {
    if(value === "true") {
      var percentAwesome = 0;
      var percentLame = 0;

      if(data.room.metadata.upvotes !== 0) {
        percentAwesome = (data.room.metadata.upvotes / data.room.metadata.listeners) * 100;
      }
      if(data.room.metadata.downvotes !== 0) {
        percentLame = (data.room.metadata.downvotes / data.room.metadata.listeners) * 100;
      }

      if((percentAwesome - percentLame) > 40) {
        Bot.Vote('up');
        Voted = true;
      }

      if((percentLame - percentAwesome) > 40) {
        Bot.Vote('down');
        Voted = true;
      }
    }
  });
};
global.OnBootedUser = function(data) {
  Log(color("EVENT :: Booted User: ", "blue") + JSON.stringify(data));
  if(data.userid == BotUserId) {
    BotWasBooted = true;
    Bot.RoomDeregister();
    Bot.RoomRegister(BotRoomId);
  }
};
global.OnUpdateUser = function(data) {
  Log(color("EVENT :: Update User: ", "blue") + JSON.stringify(data));
};
global.OnAddDJ = function(data) {
  Log(color("EVENT :: Add DJ: ", "blue") + data.user[0].name);

  NewDJFromQueue(data);

  var user = data.user[0];
  if(AllUsers[user.userid] !== undefined) {
	AllUsers[user.userid].lastActivity = new Date();
  }

  if (reserveredFor !== null && reserveredFor !== user.userid) {
    Bot.RemoveDJ(user.userid);
    Speak("Sorry, this spot is reserved for " + AllUsers[reserveredFor].name + ".");
  }

  if (reserveredFor !== null && reserveredFor === user.userid){
    Speak("Your welcome " + AllUsers[reserveredFor].name);
    reserveredFor = null;
  }

  Get("MaxPlays", 0, function(max) {
    var DJ_Info = {
      userid: user.userid,
      name: AllUsers[user.userid].name,
      remainingPlays: Number(max),
      afkCount: 0,
      waitDjs: 0
    }
    DJs[user.userid] = DJ_Info;
  });
  Set('DJs', JSON.stringify(DJs));
  BotDJCheck();  
};
global.OnRemoveDJ = function(data) {
  Log(color("EVENT :: Remove DJ: ", "blue") + data.user[0].name);

  WaitingOnNextDj = false;

  NextDJOnQueue();

  if(data.user[0].userid === botUserId) {
    BotDJing = false;
    Log("Bot no longer DJing");
  }

  var user = data.user[0];
  delete DJs[user.userid];
  Set('DJs', JSON.stringify(DJs));
  AddToQueue(data.user[0].userid);

  BotDJCheck();
};
global.OnSnagged = function(data) {
  Log(color("EVENT :: Snagged: ", "blue") + JSON.stringify(data));
  CurrentSong.Snags++;

  var userid = data.userid;
  if(AllUsers[userid] !== undefined) {
    AllUsers[userid].lastActivity = new Date();
  }

  if(CurrentSong.Snags === 2) {
    Log("Snagging the song " + CurrentSong.song + " by " + CurrentSong.artist);
    Bot.vote('up');
    Voted = true;
    Bot.playlistAll(function(data) {
    Bot.PlaylistAdd(CurrentSong.id, data.list.length);
    });
    Bot.Snag();
  }
};
global.OnPmmed = function(data) {
  Log(color("EVENT :: PMmed: ", "blue") + JSON.stringify(data));
  Command("pm", data);
  if(AllUsers[data.senderid] !== undefined) {
    AllUsers[data.senderid].lastActivity = new Date();
  }
};
global.OnError = function(data) {
  Log(color("ERROR :: EVENT:  ", "red") + JSON.stringify(data));
};