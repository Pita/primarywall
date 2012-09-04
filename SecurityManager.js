var client = require('mysql').client;
var userManager = require('./UserManager');
var domainManager = require('./DomainManager');
var wallManager = require('./WallManager');
var bcrypt = require('bcrypt');
var async = require("async");

/*********************************/
/* Security Manager Functions    */
/*********************************/

/**
 * Returns the permission of a session is a specific domain
 * This can be: owner, user, noMember
 * @param sessionID the unique ID of the session
 * @param domain the domain
 * @param the callback(err)
 */
exports.getDomainPermissions4Session = function (sessionID, domain, callback)
{ 
  userManager.getUserSession(sessionID, function(success, sessionObject){
    //check if had problems and call the callback if yes
    if(!success)
    {
      callback(success, "noMember");
      return;
    }
      
    //We couldn't find a session with this sessionID, so we return a nomember
    if(sessionObject == null)
    {
      callback(true, "noMember");
    }  
    //we recieved a session
    else
    {
      //get the domain object and check the Permissions
      domainManager.getDomainObject(domain, function(success, domainObject){
      
        if(!success || domainObject == null)
        {
          callback(success, "noMember");
          return;
        }
        
        //initalize permission Type with noMember  
        var permissionType = "noMember";  
        
        //If the domainObject have a user array, run trough this and search for our session User
        if(domainObject.user)  
        {
          for(var i in domainObject.user) 
          {
            if(domainObject.user[i]==sessionObject.userId)
            {
              permissionType = "user";  
            }
          }
        }
        
        //do the same with the owner array
        if(domainObject.owner)  
        {
          for(var i in domainObject.owner) 
          {
            if(domainObject.owner[i]==sessionObject.userId)
            {
              permissionType = "owner";  
            }
          }
        }
        
        //return the permissionType
        callback(success, permissionType);
      });
    }  
  });
}

/**
 * Returns if the user is allowed to access the wall
 * @param sessionID the unique ID of the session
 * @param wallid the wallid
 * @param callback the callback(err, status)
 */
exports.checkWallPermission= function (sessionID, wallid, password, callback)
{
  var wallparts = wallid.split("$");
  
  //if the wallparts is one, means its no pro wall, return that the access is allowed
  if(wallparts.length == 1)
  {
    callback(true, "ok");
    return;
  }
  
  var domain = wallparts[0];
  
  var status = "denied";
  var role = "noMember";
  
  async.waterfall([
    //get the security 
    function (callback)
    {
      wallManager.getWallsSecurity(wallid, function(success, wallSecurity){
        callback(success ? null : false, wallSecurity);
      });
    },
    //check the secu
    function (wallSecurity, callback)
    {
      //is everyone allowed to access? so return true
      /*if(wallSecurity.securitylevel == "everyone")
      {
        status = "ok";
        callback(null);
      }
      //only domain users are allowed to access, so check the status. But we skip this when we don't have a session to identify
      else */
      if(sessionID != null)
      {      
        exports.getDomainPermissions4Session(sessionID, domain, function(success, permissionType){
          role = permissionType;
          
          if(permissionType == "owner" || permissionType == "user" || wallSecurity.securitylevel == "everyone")
          {
            status = "ok";
          }
          else
          {
            if(wallSecurity.securitylevel == "everyonewithpass")
            {
              status = "needPass";

              if(password != null)
              {              
                if(bcrypt.compare_sync(password, wallSecurity.password))
                {
                  status = "ok";
                }
              }
            }
          }
          callback(success ? null : false);
        });
      }
      else
      {
        callback(null);
      }
    }
  ], function(error){
    if(error) console.error("MYSQL_ERROR: " + JSON.stringify(error));
    
    callback(error == null, status, role);
  });
}
