// DB Getter
global.Get = function(key, timeout, callback) {
  client.query("SELECT `value`, `TimeStamp` FROM " + dbName + '.' + dbTablePrefix + "Configs WHERE `room_id` = ? AND `key` = ?", [currentRoomId, key], function select(err, results, fields) {
    if(results !== undefined) {
      if(results.length !== 0) {
        if(timeout == 0 || moment(results[0]['TimeStamp']).diff(new Date(), 'minutes') <= timeout) {
          callback(results[0]['value']);
        } else {
          callback(null);
        }
      } else {
        callback(null);
      }
    } else {
      callback(null);
    }
  });
};
// DB Setter
global.Set = function(key, value) {
  client.query("SELECT `value` FROM " + dbName + '.' + dbTablePrefix + "Configs WHERE `room_id` = ? and `key` = ?", [CurrentRoomId, key], function select(err, results, fields) {
    if(results !== undefined || results.length !== 0) {
      if(results.length !== 0) P
        client.query("UPDATE " + dbName + '.' + dbTablePrefix + "Configs SET `value` = ? WHERE `room_id` = ? AND `key` = ?", [value, CurrentRoomId, key]);
      } else {
        client.query("INSERT INTO " + dbName + '.' + dbTablePrefix + "Configs(`room_id`, `key`, `value`, `TimeStamp`) VALUES (?, ?, ?, CURRENT_TIMESTAMP)", [CurrentRoomId, key, value]);
      }
  });
};
// DB Delete
global.Remove = function(key) {
  client.query("DELETE FROM " + dbName + '.' + dbTablePrefix + "Configs WHERE `roomId` = ? AND `key` = ?", [CurrentRoomId, key]);
};

// Add Song To DB
global.AddSong = function(data) {
  client.query("INSERT INTO " + dbName + '.' + dbTablePrefix + "Song(`room_id`, `artist`, `song`, `dj_id`, `up`, `down`, `listeners`, `started`, `snags`) VALUES(?, ?, ?, ?, ?, ?, ?, NOW(), ?", [CurrentRoomId, CurrentSong.Artist, CurrentSong.Song, CurrentSong.DJ_id, CurrentSong.Up, CurrentSong.Down, CurrentSong.Listeners, CurrentSong.Snags]);  
};

// DB Setup
global.SetUpDatabase = function() {
  Log("DB Setup :: Start");
  client.query('CREATE DATABASE '+ dbName, function(err) {
    if(err){
      if(err.number != mysql.ER_DB_CREATE_EXISTS) {
        throw(err);
      }
      else {
        Log('Database already exists.', 'green');
      }
    }
  });
  client.query('USE ' + dbName);
  
  Log("DB Setup :: Creating Tables");
  create = 'CREATE TABLE ' + dbName + '.' + dbTablePrefix;
  exists = 'CREATE TABLE IF NOT EXISTS ' + dbName + '.' + dbTablePrefix;
  
  Log("DB Setup :: Tables :: Song");
  client.query(create + 'Song(`room_id` VARCHAR(255) NOT NULL, `id` INT(11) AUTO_INCREMENT PRIMARY KEY, `artist` VARCHAR(255), `song` VARCHAR(255), `dj_id` VARCHAR(255), `up` INT(3), `down` INT(3), `listeners` INT(3), `started` DATETIME, `snags` INT(3))', function(err) {
    if(err && err.number != mysql.ER_TABLE_EXISTS_ERROR) {
      throw(err);
    }
  });

  Log("DB Setup :: Tables :: User");
  client.query(create + 'User(`room_id` VARCHAR(255) NOT NULL, `userid` VARCHAR(255), `username` VARCHAR(255), `lastseen` DATETIME, PRIMARY KEY (userid, username))', function(err) {
    if(err && err.number != mysql.ER_TABLE_EXISTS_ERROR) {
      throw(err);
    }
  });

  Log("DB Setup :: Tables :: Banned Users");
  client.query(exists + 'Banned(`id` INT(11) AUTO_INCREMENT PRIMARY KEY, `userid` VARCHAR(255), `banned_by` VARCHAR(255), `timestamp` DATETIME)', function(err) {
    if(err && err.number != mysql.ER_TABLE_EXISTS_ERROR) {
      throw err;
    }
  });

  Log("DB Setup :: Tables :: Configs");
  client.query(exists + 'Configs(`room_id` VARCHAR(255) NOT NULL, `key` varchar(50) NOT NULL, `value` varchar(4096) NOT NULL, `TimeStamp` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP)', function(err) {
    if(err && err.number != mysql.ER_TABLE_EXISTS_ERROR) {
      throw(err);
    }
  });

  SetUpRoom();
  Log("DB Setup :: End");
};

// Setup Room Stats
global.SetUpRoom = function() {
  Log("Room Setup :: Start");
  Get("AnnounceSongStats", 0, function(value) {
    if(value == null) {
      Set("AnnounceSongStats", "false");
    }
  });
  Get("AutoBop", 0, function(value) {
    if(value == null) {
      Set("AutoBop", "false");
    }
  });
  Get("AutoDJ", 0, function(value) {
    if(value == null) {
      Set("AutoDJ", "false");
    }
  });
  Get("EnableDJQueue", 0, function(value) {
    if(value == null) {
      Set("EnableDJQueue", "false");
    }
  });
  Get("BootSongLength", 0, function(value) {
    if (value == null) {
      Set("BootSongLength", "7");
    }
  });
  Get("IdleTime", 0, function(value) {
    if(value == null) {
      Set("IdleTime", "8");
    }
  });
  Get("BootOnIdle", 0, function(value) {
    if(value == null) {
      Set("BootOnIdle", "false");
    }
  });	
  Log("Room Setup :: End");
};