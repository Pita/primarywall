"use strict";

var client = require("mysql").client;
var async = require("async");

async.waterfall([
  //Select everything from the old table
  function (callback)
  {
    console.log("Select everything from the old table...");
    client.query("SELECT * FROM `primarywall`.`note`", [], function(err, results, fields)
    {
      if(!err) console.log("done");
      callback(err, results);
    }); 
  },
  //rename the old table
  function (results, callback)
  {
    console.log("Rename the old table...");
    client.query("RENAME TABLE `note` TO `note_old`", [], function(err)
    {
      if(!err) console.log("done");
      callback(err, results);
    }); 
  },
  //create the new table
  function (results, callback)
  {
    console.log("create the new table...");
    var createSQL = "CREATE TABLE IF NOT EXISTS `note` (" +
      "`guid` varchar(99) NOT NULL," +
      "`JSON` text NOT NULL," +
      "PRIMARY KEY  (`guid`)" +
      ") ENGINE=MyISAM DEFAULT CHARSET=latin1;";
  
    client.query(createSQL, [], function(err)
    {
      if(!err) console.log("done");
      callback(err, results);
    }); 
  },
  //insert everything in the new table
  function (results, callback)
  {
    console.log("insert everything in the new table...");
    
    var walls = {};
  
    async.forEach(results, function(item, callback)
    {
      //lets get the guid, this will be our new id, so we don't need it in the json
      var guid = item.guid;
      delete item.guid;
      
      if(!walls[item.wallid])
      {
        walls[item.wallid] = [];
      }
      walls[item.wallid].push(guid);
      
      //set the LastEdit to now
      item.lastEdit = new Date().getTime();
      
      //lets get the json
      var json = JSON.stringify(item);
      
      client.query("INSERT INTO `note` VALUES  (?,?)", [guid, json], callback);
    }, function(err){
      if(!err) console.log("done");
      callback(err, walls);
    });
  },
  //truncate the wall table
  function(walls, callback)
  {
    console.log("truncate the wall table...");
    client.query("TRUNCATE TABLE wall", [], function(err){
      if(!err) console.log("done");
      callback(err, walls);
    });
  },
  //fill the wall table
  function(walls, callback)
  {
    console.log("fill the wall table...");
  
    //we have to collect all wallids of the wall array. So we have a normal array we can foreach over
    var wallKeys = [];
    for(var i in walls)
    {
      wallKeys.push(i);
    }
  
    //foreach trough the wall array
    async.forEach(wallKeys, function(item, callback)
    {
      var wallid = item;
      var json = JSON.stringify({"notes":walls[item]});
      client.query("INSERT INTO `wall` VALUES  (?,?)", [wallid, json], function(err)
      {
        callback();
      });
    }, callback);
  }
], function(err){
  if(err) 
  {
    console.error(err.stack);
  }
  else
  {
    console.log("finished.")
  }
  client.end();
});

