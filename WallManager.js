var client = require('mysql').client;
var async = require('async');
var bcrypt = require('bcrypt');

/*********************************/
/* Wall Manager Functions        */
/*********************************/

exports.getWallsFont = function (wallid, callback)
{
  client.query("SELECT * FROM `primarywall`.`wall` WHERE `wallID` = ?", [wallid], function (err, results, fields)
  {
    var wallFont;
    if (err == null)
    {
      if (results.length == 1)
      {
        try
        {
          var wallJSON = JSON.parse(results[0].JSON);
          wallFont = wallJSON.font;
        }
        catch(e){
          console.error("JSON PROBLEM, wallID is " + wallid);
          console.error(results[0].JSON);
          console.error(e.stack);
        }
        
      }
      else
      {
        // return default value to the database cause its not there...
      }
    }
    else
    // mysql problem
    {
      console.error("MYSQL_ERROR: " + JSON.stringify(err));
    }
    callback(err == null, wallFont);
  });
}

exports.getWallsBackground = function (wallid, callback)
{
  client.query("SELECT * FROM `primarywall`.`wall` WHERE `wallID` = ?", [wallid], function (err, results, fields)
  {
    var wallBackground;
    if (err == null)
    {
      //console.error("WALL-SQL:" + JSON.stringify(results));
    
      if (results.length == 1)
      {
        var wallJSON = JSON.parse(results[0].JSON);
        wallBackground = wallJSON.background;
      }
      else
      {
        // return default value to the database cause its not there...
      }
    }
    else
    // mysql problem
    {
      console.error("MYSQL_ERROR: " + JSON.stringify(err));
    }
    callback(err == null, wallBackground);
  });
}

exports.getWallsSecurity = function (wallid, callback)
{
  client.query("SELECT * FROM `primarywall`.`wall` WHERE `wallID` = ?", [wallid], function (err, results, fields)
  {
    var wallSecurity;
    if (err == null)
    {
      if (results.length == 1)
      {
        var wallJSON = JSON.parse(results[0].JSON);
        wallSecurity = wallJSON.security;
      }
console.error(wallSecurity);      
      if(wallSecurity == null)
      {
        wallSecurity = {securitylevel:"onlyme"};
      }
    }
    else
    // mysql problem
    {
      console.error("MYSQL_ERROR: " + JSON.stringify(err));
    }
    callback(err == null, wallSecurity);
  });
}

exports.setWallsFont = function (wallid, font, callback)
{
  async.waterfall([
    function (callback)
    {
      // Get the data from MySQL
      client.query("SELECT * FROM `primarywall`.`wall` WHERE `wallID` = ?", [wallid], callback)
    },

    // Edit the data from MySQL and write to MySQL
    function (results, fields, callback)
    {
      if (results.length == 1)
      {
        var wallFont = font;
        var wallJSON = JSON.parse(results[0].JSON);
        wallJSON.font = wallFont;
        wallJSON = JSON.stringify(wallJSON);
        client.query("UPDATE `primarywall`.`wall` SET `JSON`=? WHERE `wallID` = ?", [wallJSON, wallid], callback)
      }
    }], 
  // Report any errors
  function(error){
    if(error) console.error("MYSQL_ERROR: " + JSON.stringify(error));
  }
  );
}

exports.setWallsBackground = function (wallid, background, callback)
{
  async.waterfall([
    function (callback)
    {
      // Get the data from MySQL
      client.query("SELECT * FROM `primarywall`.`wall` WHERE `wallID` = ?", [wallid], callback)
    },

    // Edit the data from MySQL and write to MySQL
    function (results, fields, callback)
    {
      if (results.length == 1)
      {
        var wallBackground = background;
        var wallJSON = JSON.parse(results[0].JSON);
        wallJSON.background = wallBackground;
        wallJSON = JSON.stringify(wallJSON);
        client.query("UPDATE `primarywall`.`wall` SET `JSON`= ? WHERE `wallID` = ?", [wallJSON, wallid], callback)
      }
    }],
  // Report any errors
  function(error){
    if(error) console.error("MYSQL_ERROR: " + JSON.stringify(error));
  }
  );
}

exports.setWallsSecurity = function (wallid, security, callback)
{
  //encrypt the password with bcrypt
  if(security.password.length > 0)
  {
    var salt = bcrypt.gen_salt_sync(10);
    security.password = bcrypt.encrypt_sync(security.password, salt);
  }

  async.waterfall([
    function (callback)
    {
      // Get the data from MySQL
      client.query("SELECT * FROM `primarywall`.`wall` WHERE `wallID` = ?", [wallid], callback)
    },

    // Edit the data from MySQL and write to MySQL
    function (results, fields, callback)
    {
      if (results.length == 1)
      {
        var wallSecurity = security;
        var wallJSON = JSON.parse(results[0].JSON);
        wallJSON.security = wallSecurity;
        wallJSON = JSON.stringify(wallJSON);
        client.query("UPDATE `primarywall`.`wall` SET `JSON`= ? WHERE `wallID` = ?", [wallJSON, wallid], callback)
      }
    }],
  // Report any errors
  function(error){
    if(error) console.error("MYSQL_ERROR: " + JSON.stringify(error));
  }
  );
}

exports.getWallLastEdit = function (wallid, callback)
{
  var lastEdit = null;

  async.waterfall([
    //get the wall from the database to find out what notes are on the wall
    function (callback)
    {
      client.query("SELECT * FROM `primarywall`.`wall` WHERE `wallID` = ?", [wallid], callback)
    },
    //get all notes from the wall. If the wall is empty, return create Date of the Wall
    function (results, fields, callback)
    {
      //we got one result, all fine, build the sql string for the note request
      if (results.length == 1)
      {        
        var wallJSON = JSON.parse(results[0].JSON);
        
        //there is no note, so we should try to access createdAt, if this doesn't exist too, set it to zero
        if(wallJSON.notes.length == 0)
        {
          lastEdit = wallJSON.createdAt ? wallJSON.createdAt : 0;
          callback("stop");
        }
        //Build the sql with all notes
        else
        {
          var sql = "SELECT JSON FROM `primarywall`.`note` WHERE ";
          
          for(var i=0;i<wallJSON.notes.length;i++)
          {
             sql+= "`guid` = " + client.escape(wallJSON.notes[i]);
              
             if(i != wallJSON.notes.length - 1)
             {
               sql+=" OR ";
             }
          }
          
          //query 
          client.query(sql, [], callback);
        }
      }
      //we didn't get a result or more than excpect, throw exception
      else
      {
        callback("wall does not exist");
      }
    },
    //iterate trough all notes and search the highest lastEdit
    function (results, fields, callback)
    {
      for(var i=0;i<results.length;i++)
      {
        var noteObject = JSON.parse(results[i].JSON);
      
        if(noteObject.lastEdit>lastEdit)
        {
          lastEdit = noteObject.lastEdit;
        }
      }
      
      callback(null);
    }
  ], function(err){
    if(err && err!="stop") console.error("MYSQL_ERROR: " + JSON.stringify(err));
  
    callback(err == null, lastEdit);
  });
}

