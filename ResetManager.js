var client = require('mysql').client;
var async = require('async');

/**
 * Sets the data for a request
 */
exports.addRequest = function (id, requestObject, callback)
{  
  client.query("INSERT INTO `primarywall`.`reset` VALUES (?,?)", [id, JSON.stringify(requestObject)], callback);
}

/**
 * Returns the data of a request
 */
exports.getRequest = function (id, callback)
{  
  client.query("SELECT JSON FROM `primarywall`.`reset` WHERE resetID = ?", [id], function(err, results, fields)
  {
    if(err)
    {
      callback(err);
    }    
    else
    {
      var requestObject = results.length == 1 ? JSON.parse(results[0]['JSON']) : null;
      callback(err, requestObject);
    }
  });
}

/**
 * Deletes the data of a request
 */
exports.delRequest = function (id, callback)
{  
  client.query("DELETE FROM `primarywall`.`reset` WHERE resetID = ?", [id], callback);
}

