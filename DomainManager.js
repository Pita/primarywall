var client = require('mysql').client;
var async = require("async");

/*********************************/
/* User Manager Functions        */
/*********************************/

/**
 * Check to see if User/Password is correct, returns correctauth = true with the callback if successful
 */

exports.checkIfDomainExists = function (domain, callback)
{
  client.query("SELECT * FROM `primarywall`.`domain` WHERE `domainID` =  ?", [domain], function (err, results, fields)
  {
    var success=err == null;
  
    if(err)
    {
      //mysql problem
      console.error("MYSQL_ERROR: " + JSON.stringify(err));
    }
    
    callback(success, results.length==1);
  });
}

/**
 * Creates a new subdomain with the given owner
 * @param domain The new Subdomain that should be created
 * @param owner The Owner of the subdomain
 */
exports.createDomain = function (domain, owner, callback)
{
  var domainJSON=JSON.stringify({owner:[owner]});

  client.query("INSERT INTO`primarywall`.`domain` VALUES (?,?)", [domain, domainJSON], function (err, results, fields)
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
 * Returns the object of a domain
 * @param domain The Domain 
 */
exports.getDomainObject = function (domain, callback)
{
  client.query("SELECT JSON FROM `primarywall`.`domain` WHERE `domainID` =  ?", [domain], function (err, results, fields)
  {
    var success=err == null;
    var domainObject = null;
  
    if(success && results.length == 1)
    {
      domainObject = JSON.parse(results[0].JSON);
    }
    else
    {
      //mysql problem
      console.error("MYSQL_ERROR: " + JSON.stringify(err));
    }
    
    callback(success, domainObject);
  });
}

/**
 * Returns all walls of a domain
 * @param domain The Domain 
 */
exports.getDomainWalls = function (domain, callback)
{
  var escapedDomain = client.escape(domain);
  escapedDomain = escapedDomain.substring(1,escapedDomain.length-1);

  client.query("SELECT wallID FROM `primarywall`.`wall` WHERE `wallID` LIKE  '" + escapedDomain + "$%'", [], function (err, results, fields)
  {
    var success=err == null;
    var walls = [];
    //var walls = {};
  
    if(success)
    {
      //map all walls in a object
      for(var i in results)
      {
        //walls[results[i].wallID] = JSON.parse(results[i].JSON);
        walls.push(results[i].wallID);
      }
    }
    else
    {
      //mysql problem
      console.error("MYSQL_ERROR: " + JSON.stringify(err));
    }
    
    callback(success, walls);
  });
}

/**
 * Delete a wall from a domain
 * @param domain The Domain
 */
exports.deleteDomainWall = function (domain, wallID, callback)
{
  // console.log("in the handler of deleting a wall");
  var escapedDomain = client.escape(domain);
  escapedDomain = escapedDomain.substring(1,escapedDomain.length-1);
  client.query("DELETE FROM `primarywall`.`wall` WHERE `wallID` LIKE  '" + escapedDomain + "$" + wallID + "'", [], function (err, results, fields)
  {
    var success=err == null;
    var walls = [];
    
    if(success)
    {
      console.log("successfully deleted a wall");
    }
    else
    {
      //mysql problem
      console.error("MYSQL_ERROR: " + JSON.stringify(err));
    }
    callback(success);
  });
}



/**
 * Delete a wall from a domain
 * @param domain The Domain
 */

exports.CopyDomainWall = function (domain, source, dest, callback)
{
  var escapedDomain = client.escape(domain);
  escapedDomain = escapedDomain.substring(1,escapedDomain.length-1);
  source = escapedDomain + "$" + source;
  dest = escapedDomain + "$" + dest;
  async.waterfall([
    //Get the entry of the wall
    function(callback){
      client.query("SELECT * FROM `wall` WHERE `wallID` = ?", [source], callback);
    },
    //if it exists load it into, else create a empty table entry
    function(results, fields, callback)
    {
      //If there is no result, create a wall entry

      if(results.length == 0)
      {
      }
      //Else load all notes
      else
      {
        console.log(results);

        var wallObject = JSON.parse(results[0].JSON);
        //if there are no notes on this wall, return
        if(wallObject.notes.length == 0)
        {
          callback();
          return;
        }

        //load all notes with a second waterfall
        async.waterfall([
          //create a select with all wallids
          function(callback){
            //build sql
            var sql = "SELECT * FROM `note` WHERE ";
            for(var i=0;i<wallObject.notes.length;i++)
            {
              sql+= "`guid` = " + client.escape(wallObject.notes[i]);

              if(i != wallObject.notes.length - 1)
              {
                sql+=" OR ";
              }
            }
            //query
            client.query(sql, [], callback);
          },
          //loop trough all values and put them into the interal note array
          function(results, fields, callback)
          {
            var noteGuids = [];
            //loop trough the results of NOTES
            for(var i=0;i<results.length;i++)
            {
              function guidGenerator()
              {
                var S4 = function ()
                {
                return (((1 + Math.random()) * 0x10000) | 0).toString(16).substring(1);
                };
                return (S4() + S4() + "-" + S4() + "-" + S4() + "-" + S4() + "-" + S4() + S4() + S4());
              }

              var newGuid = guidGenerator(); // get a new GUID
              noteGuids.push(newGuid); // write the note GUID to an array
              var JSONval = results[i].JSON; // JSON contains the WALLID as a STRING
              console.log("OLD ARR");
//              console.log(JSONval);
              var JSONarr = JSON.parse(results[i].JSON); // Turn the JSON String into an Array
              console.log(JSONarr);
              JSONarr.wallid = dest; // change the array to include the new destination
              console.log("NEW ARR");
              console.log(JSONarr);
              JSONval = JSON.stringify(JSONarr); // turn the JSON array back into a string
              // insert the note into the database witha new wallID
              client.query("INSERT INTO `note` VALUES(?,?)", [newGuid, JSONval], callback);
            };

          //create wall
          var wallStr = JSON.stringify({notes: noteGuids, createdAt: new Date().getTime()});
          console.log(noteGuids);
          client.query("INSERT INTO `wall` VALUES(?,?)", [dest, wallStr], callback);
          // return with the dest
          callback();
        }
      ], callback);
      }
    }
  ], function(err){
    if(err)
    {
      console.error("MYSQL_ERROR: " + JSON.stringify(err));
    }
    else
    {
      //save that this wall is loaded
      // loadedWalls.push(wallid);
      // return dest;
    }

    callback(err == null);
  });
}

