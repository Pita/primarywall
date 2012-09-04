var client = require("mysql").client;

/*********************************/
/* User Manager Functions        */
/*********************************/

var bcrypt = require('bcrypt');
var async = require('async');

/**
 * Check to see if User/Password is correct, returns correctauth = true with the callback if successful
 */

exports.checkUserPass = function (user, pass, callback)
{
  var correctauth = false;
  client.query("SELECT * FROM `primarywall`.`user` WHERE `UserID` =  ?", [user], function (err, results, fields)
  {
    var success=err == null && results.length==1;
  
    if (success)
    {
      var user = JSON.parse(results[0].JSON);
      
      correctauth = bcrypt.compare_sync(pass, user.password);
    }
    else if(err)
    {
      //mysql problem
      console.error("MYSQL_ERROR: " + JSON.stringify(err));
    }
    
    callback(success, correctauth);
  });
}

/**
 * Check to see if User/Password is correct, returns correctauth = true with the callback if successful
 */

exports.getAllDomainsOfUser = function (user, callback)
{
  var correctauth = false;
  client.query("SELECT domainID FROM `primarywall`.`domain` WHERE JSON like ?", ["%"+user+"%"], function (err, results, fields)
  {
    var domainArray = [];
  
    var success=err == null;
  
    if (success)
    {
      for(var i in results)
      {
        domainArray.push(results[i].domainID);
      }
    }
    else if(err)
    {
      //mysql problem
      console.error("MYSQL_ERROR: " + JSON.stringify(err));
    }
    
    callback(success, domainArray);
  });
}

/**
 * Saves a user session to the database
 * @param sessionID the unique ID of the session
 * @param sessionObject all information about this session in a object
 * @param the callback(err)
 */
exports.saveUserSession = function (sessionID, sessionObject, callback)
{
  var sessionJSON = JSON.stringify(sessionObject);
  
  client.query("INSERT INTO `primarywall`.`session` VALUES (?,?)", [sessionID, sessionJSON], function (err)
  {
    if(err)
    {
      //mysql problem
      console.error("MYSQL_ERROR: " + JSON.stringify(err));
    }
    
    if(callback) callback(err == null);
  });
}

/**
 * Get a user session
 * @param sessionID the unique ID of the session
 * @param the callback(err, sessionObject)
 */
exports.getUserSession = function (sessionID, callback)
{ 

 
  client.query("SELECT JSON FROM `primarywall`.`session` WHERE sessionID = ?", [sessionID], function (err, results, fields)
  {
    var success=err == null;

    var sessionObject = null;
  
    if (success && results.length == 1)
    {
      sessionObject = JSON.parse(results[0].JSON);
    }
    else if(err)
    {
      //mysql problem
      console.error("MYSQL_ERROR: " + JSON.stringify(err));
    }
    
    callback(success, sessionObject);
  });
}

/**
 * Creates a new User
 * @param userId The Email Adrress of the new User
 */
exports.createUser = function (userId, password, fullname, callback)
{  
  var salt = bcrypt.gen_salt_sync(10);
  var hash = bcrypt.encrypt_sync(password, salt);
  
  var userJSON = JSON.stringify({password: hash, fullname: fullname, dateRegistered:new Date().getTime()});

  client.query("INSERT INTO `primarywall`.`user` VALUES(?,?)", [userId, userJSON], function (err, results, fields)
  {
    var success=err == null;
  
    if(err)
    {
      //mysql problem
      console.error("MYSQL_ERROR: " + JSON.stringify(err));
    }
    
    if(callback) callback(success);
  });
}

/**
 * Changes the password of a user
 */
exports.changePassword = function (userId, password, callback)
{  
  var userObj;

  async.series([
    function(callback)
    {
      client.query("SELECT * FROM `primarywall`.`user` WHERE `UserID` =  ?", [userId], function (err, results, fields)
      {
        if(err)
        {
          callback(err);
          return;
        }
      
        userObj = JSON.parse(results[0].JSON); 
        callback(null);
      });
    }, 
    function(callback)
    {
      var salt = bcrypt.gen_salt_sync(10);
      var hash = bcrypt.encrypt_sync(password, salt);
      userObj.password = hash;
       
      client.query("UPDATE `primarywall`.`user` SET JSON = ? WHERE UserID = ?", [JSON.stringify(userObj), userId], callback);
    }
  ],callback);
}
