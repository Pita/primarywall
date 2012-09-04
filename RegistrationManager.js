var client = require('mysql').client;

/*********************************/
/* Registration Manager Functions*/
/*********************************/

/**
 * creates a registration Entry
 */
exports.createRegistrationEntry = function (email, fullName, subdomain, callback)
{
  var registrationId = randomRegistrationID();
  var registrationObject = JSON.stringify({email: email, fullName: fullName, subdomain:subdomain});

  client.query("INSERT INTO `primarywall`.`registration` VALUES(?,?)", [registrationId, registrationObject], function (err, results, fields)
  {
    var success=err == null;
  
    if(err)
    {
      //mysql problem
      console.error("MYSQL_ERROR: " + JSON.stringify(err));
    }
    
    callback(success, registrationId);
  });
}

/**
 * gets the registration Informations for a registrationId
 */
exports.getRegistrationEntry = function (registrationId, callback)
{
  client.query("SELECT JSON FROM `primarywall`.`registration` WHERE registrationID = ?", [registrationId], function (err, results, fields)
  {
    var success=err == null;
    var registrationObject = null;
  
    if (success && results.length == 1)
    {
      registrationObject = JSON.parse(results[0].JSON);
      
      client.query("DELETE FROM `primarywall`.`registration` WHERE registrationID = ?", [registrationId]);
    }
    else 
    {
      //mysql problem
      console.error("MYSQL_ERROR: " + JSON.stringify(err));
    }
    
    callback(success, registrationObject);
  });
}

/**
 * Creates a random registrationId
 */ 
function randomRegistrationID()
{
  var chars = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXTZabcdefghiklmnopqrstuvwxyz";
  var string_length = 20;
  var randomstring = '';
  for (var i = 0; i < string_length; i++)
  {
    var rnum = Math.floor(Math.random() * chars.length);
    randomstring += chars.substring(rnum, rnum + 1);
  }
  return randomstring;
}
