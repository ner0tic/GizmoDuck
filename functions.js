global.Log = function(data) {
  if(LogToConsole) {
    console.log(BotName, ">>>", new Date().toISOString(), " | ", data);
  }
};
global.Speak = function(text, username, source, userid) {
  var output = "";
  
  if(username !== undefined) {
    output = text.replace(/\{u\}/gi, username);
  } else {
    output = text;
  }
  
  if(source !== undefined && source == "pm") {
    Bot.Pm(output, userid);
  } else {
    Bot.Speak(output);
  }
};
global.Command = function(source, data) {
  var userid = "";
  if(source == "pm") {
    userid = data.senderid;
  } else {
    userid = data.userid;
  }
  
  for(i in Commands) {
    if(Commands[i].enabled) {
      if(Commands[i].matchStart && (data.text.toLowerCase().indexOf(Commands[i].name) == 0)) {
        Commands[i].handler(data, userid, source);
        break;
      } else if(Commands[i].name == data.text.toLowerCase()) {
        Commands[i].handler(data, userid, source);
        break;
      }
    }
  }
  
  var result = data.text.match(/^\@(.*?)( .*)?$/);
  if(result && result[1].trim().toLowerCase() == BotName.toLowerCase()) {
    var command = '';
    if(result.length == 3 && result[2]) {
      command = result[2].trime().toLowerCase();
    }
    var index = FindAction(command, Dictation.ChatResponses);
    if(index != -1) {
      Speak(Dictation.ChatResponses[index].response1, data.name);
      if(Diction.ChatResponses[index].response2 !== "") {
        setTimeout(function() {
          Speak(Diction.ChatResponses[index].response2, data.name);
        }, 500);
      }
    }
  }
};
global.LikeSong = function() {
  Bot.Vote("up");
  SpeakRandom(Diction.Like);
  Voted = true;
};
global.HateSong = function() {
  Bot.Vote("down");
  SpeakRandom(Doction.Hate);
  Voted = true;
};
global.PopulateSongData = function(data) {
	CurrentSong.Id = data.room.metadata.current_song._id;
	CurrentSong.Artist = data.room.metadata.current_song.metadata.artist;
	CurrentSong.Song = data.room.metadata.current_song.metadata.song;
	CurrentSong.DJ_name = data.room.metadata.current_song.djname;
	CurrentSong.DJ_id = data.room.metadata.current_song.djid;
	CurrentSong.Up = data.room.metadata.upvotes;
	CurrentSong.Down = data.room.metadata.downvotes;
	CurrentSong.Listeners = data.room.metadata.listeners;
	CurrentSong.Started = data.room.metadata.current_song.starttime;
	CurrentSong.Snags = 0;
	CurrentSong.Length = data.room.metadata.current_song.metadata.length;
};
global.FindAction = function(query, arr) {
  query = escape(query);
  for(var i = 0, l = arr.length; i < l; i++) {
    var item = arr[i];
    var reg = RegExp(escape(item.name), "i");
    if(reg.test(query)) return i;
  }
  return -1;
};
global.BotDJCheck = function() {
  Get("AutoDJ", 0, function(value) {
    if(value == "true") {
      setTimeout(function() {
        Bot.RoomInfo(function(data) {
          if(data.room.metadata.djcount <= 2 && !BotDJing) {
            Log("Bot is now DJing.");
            Bot.AddDJ();
            Bot.Vote("up");
            Voted = true;
            Bot.Speak(Dictation.BotStepUp);
            BotDJing = true;
            return;
          }
          if(data.room.metadata.djcount > 3) {
            if(BotDJing && !BotIsPlayingSong) {
              Speak(Dictation.BotStepDown);
              setTimeout(function() {
                Bot.RemoveDJ();
              }, 500);
              BotDJing = false;
              return;
            } else if(BotOnTable && BotIsPlayingSong) {
              BotStepDownAfterSong = true;
            }
          }
        });
      }, 5000);
    }
  });
};
global.AnnounceRemainingPlays = function() {
  var count = ['x', 'x', 'x', 'x', 'x'];
  var x = 0;
  for(var i in Djs) {
    count[x] = Djs[i].remainingPlays;
    x++;
  }
  var playCount = count[0] + '-' + count[1] + '-' + count[2] + '-' + count[3] + '-' + count[4];
  Speak(Diction.RemaingingPlays + playCount);
};
global.AddDJToQueue = function(userid) {
  var text = "";
  Get("EnableQueue", 0, function(queueEnabled) {
    if(queueEnabled === "true") {
      if(DJs[userid] === undefined) {
        if(DJQueue[userid] === undefined && AllUsers[userid] !== undefined) {
          DJQueue[userid] = {
            "id": userid,
            "name": AllUsers[userid].name,
            "isAfk": false,
            "afkCount": 0,
            "afkTime": null
          };
          DJQueue.length++;
          bot.speak(Diction.AddedToQueue + (DJQueue.length - 1), DJQueue[userid].name);
          Set('DJQueue', JSON.stringify(DJQueue));
          if (NextDj === null){
            NextDj = userid;
          }
        } else {
          result = array_search(userid, DJQueue);
          if(result) {
            Bot.Speak(Diction.PosInQueue + result, DJQueue[result].name);
          }
          else {
            Bot.Speak(Diction.NotInQueue, AllUsers[userid].name);
          }
        }
      } else {
        bot.speak(Diction.AlreadyDJing, AllUsers[userid].name);
      }
    }
  });
};
global.CutDJInLine = function(userid, position) {
  /* @TODO: 
   * 1) is user in queue?
   * 2) is the user allowed to move up in the queue?
   * 2a) if yes, move to position (array_push)
   * 2b) if no, tell them their not allowed
   * 
   */
};
global.RemoveDJFromQueue = function(userid) {
  get("EneableQueue", 0, function(queueEnabled) {
    if(queueEnabled == "true") {
      if(DJQueue[userid] !== undefined) {
        delete DJQueue[userid];
        DJQueue.length--;
        Bot.Speak(Diction.RemovedFromQueue, AllUsers[userid].name);
        Set('DJQueue', JSON.stringify(DJQueue));       
      }
    }
  })
};
global.DJOnDeck = function() {
  qPos = 0;
  NextDJ = null;
  Get("enableQueue", 0, function(queueEnabled) {
    if(queueEnabled == "true" && !WaitingOnNextDJ) {
      Log("Waiting on next DJ " + WaitingOnNextDJ);
      if(DJQueue.length > 0) {
        Log(DJQueue);
        for(var i in DJQueue) {
          if(DJQueue[i].id !== undefined) {
            if(DJQueue[i].isAfk) {
              DJQueue[i].afkCount++;
            } else {
              NextDJ = DJQueue[i].id;
              Log("Next DJ is: " + DJQueue[i].name);
              break;
            }
          }
        }
        if(NextDJ == null) {
          Bot.Speak(Diction.EmptyQueue);
          return;
        }
        if(!queueRefreshIntervalRunning) {
          Get("NextDJQueueTimeout", 0, function(NextDJQueueTimeout) {
            WaitingOnNextDJ = true;
            Bot.Speak(Diction.DJTurn.replace('{t}', NextDJQueueTimeout), DJQueue[NextDJ].name);
            Bot.Pm(Diction.YourDJTurn, NextDJ);
            NextDJTime = new Date();
            queueRefreshIntervalId = setInterval(CheckForNextDJFromQueue, 5000);
          });
          queueRefreshIntervalRunning = true;
        }
      } else {
        Bot.Speak(Diction.EmptyQueue);
      }
    }
  });
};
global.QueueStatus = function() {
  Get("EnableQueue", 0, function(QueueEnabled) {
    if(QueueEnabled === "true") {
      var DJ_List = "";
      for(var i in DJQueue) {
        var queuedDj = DJQueue[i];
        if(!queuedDj.isAfk) {
          if(queuedDj.name !== undefined) {
            DJ_List += queuedDj.name + ", ";
          }
        } else {
          var afkTime = new Date(queuedDj.afkTime);
          var afkFor = moment(afkTime).diff(new Date(), 'minutes');
          Log(afkFor);
          if(queuedDj.isAfk && afkFor >= 5) {
            Log("Remove DJ: " + DJQueue[i].name);
            delete DJQueue[i];
          }
        }
      }

      if(DJ_List !== "") {
        var text = DJQueue.length + Diction.QueueList + DJ_List;
        Bot.speak(text.substring(0, text.length - 2));
      } else {
        Bot.speak(Diction.EmptyQueue);
      }
      Set('DJQueue', JSON.stringify(DJQueue));
    }
  });
};