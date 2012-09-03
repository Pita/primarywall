var userManager = require('./UserManager');
var domainManager = require("./DomainManager");
var securityManager = require("./SecurityManager");
var registrationManager = require("./RegistrationManager");
var wallManager = require("./WallManager");
var resetManager = require("./ResetManager");
var Cookies = require("cookies");
var email = require('mailer');
var async = require("async");

/**
 * Handles a ajax Request
 *
 * @param req the http request
 * @param res the http response
 * @param path the path that is requested
 */

exports.handle = function (req, res, path)
{
  req.setEncoding("utf8");
  req.content = '';

  //first we have to collect all post data until we can start
  req.addListener("data", function (chunk)
  {
    req.content += chunk;
  });

  //all post data is here :)
  req.addListener("end", function ()
  {
    //objectifiy what we get
    var values = parsePOST(req.content);

    //cookies? COOKIES!
    var cookies = new Cookies(req, res);

    
    console.log(new Date().toUTCString() + ", " + "AJAX-REQUEST:" + path + ", "+ JSON.stringify (values).replace(/\"password\":\"\w*\"/g, "\"password\":\"***\""));

    //is it a login?
    if (path == "/ajax/login")
    {
      handleLogin(req, res, values, cookies);
    }
    else if(path == "/ajax/register")
    {
      handleRegister(req, res, values, cookies);
    }
    else if(path == "/ajax/registered")
    {
      handleRegistered(req, res, values, cookies);
    }
    else if(path == "/ajax/overview")
    {
      handleOverview(req, res, values, cookies);
    }
    else if(path == "/ajax/resetreq")
    {
      handleResetReq(req, res, values, cookies);
    }
    else if(path == "/ajax/reset")
    {
      handleReset(req, res, values, cookies);
    }
    else if(path == "/ajax/deleteWall")
    {
      handleDeleteWall(req, res, values, cookies);
    }
    else if(path == "/ajax/copyNotes")
    {
      handleCopyWall(req, res, values, cookies);
    }
  });
}

/**
 * Handles copying a Wall
 *
 * @param values the Post values
 * @param cookies the cookie values
 */
function handleCopyWall(req, res, values, cookies)
{
  //get domain
  var domain = values.domain;
  var source = values.sourcewallid;
  var dest = values.destwallid;
  var session = cookies.get("session");

  var responseJSON = {};
  var userId;
  var walls = [];
  var nextWallNum = 1;

  async.waterfall([
    //check security
    function(callback)
    {
      //if there is no session, say goodbye to this user
      if(session == null)
      {
        responseJSON = {error: "No session cookie set"};
        callback("stop");
      }
      else if(domain == null)
      {
        responseJSON = {error: "No domain in the POST data"};
        callback("stop");
      }
      //there is a session, check if its correct
      else
      {
        securityManager.getDomainPermissions4Session(session, domain, function(success, permissionType)
        {
          callback(success ? null : false, permissionType);
        });
      }
    },
    //get the user of the session
    function(permissionType, callback)
    {
      //The User have no permission, say goodbye
      if(permissionType == "noMember")
      {
        responseJSON = {error: "No Permission for this domain"};
        callback("stop");
      }
      //The User have permission, find out his email
      else
      {
        userManager.getUserSession(session, function(success, sessionObject){
          callback(success ? null : false, sessionObject);
        });
      }
    },
    //save the userid for a later response
    //get all walls from domains
    function(sessionObject, callback)
    {
      userId = sessionObject.userId;

        domainManager.CopyDomainWall(domain, source, dest, function(success){
        callback(success ? null : false);
      });
    },
    function(callback)
    {
      callback(null);
    }
  ], function(err){
    sendJSON(res, responseJSON);

    if(err && err != "stop")
    {
      console.error(err);
    }
  });
}


/**
 * Handles deleting a Wall
 * 
 * @param values the Post values
 * @param cookies the cookie values
 */
function handleDeleteWall(req, res, values, cookies)
{
  //get domain
  var domain = values.domain;
  var wallID = values.wallid;
  var session = cookies.get("session");

  var responseJSON = {};
  var userId;
  var walls = [];
  var nextWallNum = 1;

  async.waterfall([
    //check security
    function(callback)
    {
      //if there is no session, say goodbye to this user
      if(session == null)
      {
        responseJSON = {error: "No session cookie set"};
        callback("stop");
      }
      else if(domain == null)
      {
        responseJSON = {error: "No domain in the POST data"};
        callback("stop");
      }
      //there is a session, check if its correct
      else
      {
        securityManager.getDomainPermissions4Session(session, domain, function(success, permissionType)
        {
          callback(success ? null : false, permissionType);
        });
      }
    },
    //get the user of the session
    function(permissionType, callback)
    {
      //The User have no permission, say goodbye
      if(permissionType == "noMember")
      {
        responseJSON = {error: "No Permission for this domain"};
        callback("stop");
      }
      //The User have permission, find out his email
      else
      {
        userManager.getUserSession(session, function(success, sessionObject){
          callback(success ? null : false, sessionObject);
        });
      }
    },
    //save the userid for a later response
    //get all walls from domains
    function(sessionObject, callback)
    {
      userId = sessionObject.userId;

      domainManager.deleteDomainWall(domain, wallID, function(success){
        callback(success ? null : false);
      });
    },
    function(callback)
    {
      callback(null);
    }
  ], function(err){
    sendJSON(res, responseJSON);

    if(err && err != "stop")
    {
      console.error(err);
    }
  });
}

/**
 * Handles a request for passwort reset
 *
 * @param values the Post values
 * @param cookies the cookie values
 */
function handleResetReq(req, res, values, cookies)
{  
  //validate the email
  if(!validateEmail(values.email))
  {
    sendJSON(res, {status: "emailInvalid"});
    return;
  }
  
  userManager.getAllDomainsOfUser(values.email, function(success, domainArray)
  {
    if(!domainArray || domainArray.length == 0)
    {
      sendJSON(res, {status: "emailUnkown"});
      return;
    }
    else
    {
      var id = randomSessionID();
      
      //generate requestObject
      var reqObj = {email: values.email, timestamp: new Date().getTime()};
      
      //put it into the database async
      resetManager.addRequest(id, reqObj, function(err)
      {
        if(err) throw err;
        
        console.error("Please go to http://primarywall.com/static/reset.html?id=" + id);
        
        //Send him a email
        email.send({
          host : "localhost",              // smtp server hostname
          port : "25",                     // smtp server port
          domain : "localhost",            // domain used by client to identify itself to server
          to : values.email,
          from : "no-reply@primarywall.com",
          subject : "Your PrimaryWall passwort reset",
          body: "Hello,\n\nPlease go to http://primarywall.com/static/reset.html?id=" + id + "\n\nYour PrimaryWall team",
        }, function(err){
          if(err) throw err;
        });

        //answer with ok sync
        sendJSON(res, {status: "ok"});
      });   
    }
  });
}

/**
 * Handles a request for passwort reset
 *
 * @param values the Post values
 * @param cookies the cookie values
 */
function handleReset(req, res, values, cookies)
{  
  var requestObj;

  async.series([
    //check the reqID
    function(callback)
    {
      resetManager.getRequest(values.id, function(err, _requestObj)
      {
        requestObj = _requestObj;
        callback(err);
      });
    }, 
    
    function(callback)
    {
      //check if the request Obj exist, else stop
      if(requestObj == null)
      {
        sendJSON(res, {status: "invalidResetId"});
        callback("stop");
        return;
      }
      
      //set the new password into the database async 
      userManager.changePassword(requestObj.email, values.password, callback);
    },
    
    //delete the old req entry
    function(callback)
    {
      resetManager.delRequest(values.id, callback);
    },
    
    //send ok
    function(callback)
    {
      sendJSON(res, {status: "ok"});
      callback(null);
    }
  ], function(err)
  {
    if(err && err != "stop") throw err;
  });
}

/**
 * Handles a ajax registered Request, registred means this is the second step 
 * after the user followed the link of the email
 *
 * @param values the Post values
 * @param cookies the cookie values
 */
function handleRegistered(req, res, values, cookies)
{   
  if(values.password == "")
  {
    sendJSON(res, {status: "PasswordIsEmpty"});
    return;
  }

  //Let's get the entry for this registrationId
  registrationManager.getRegistrationEntry (values.id, function(success, registrationObject){
    if(registrationObject == null )
    {
      sendJSON(res, {status: "TokenIsNotValid"});
      return;
    }
    else
    {
      domainManager.createDomain(registrationObject.subdomain, registrationObject.email);
      userManager.createUser(registrationObject.email, values.password, registrationObject.fullName);
      saveSession(registrationObject.email, registrationObject.subdomain, cookies, res);
    }
  });
}

/**
 * Handles a ajax register Request
 *
 * @param values the Post values
 * @param cookies the cookie values
 */
function handleRegister(req, res, values, cookies)
{ 
  console.error("values");
  console.error(values);

  //check if email is correct
  if(values.email == null || !validateEmail(values.email))
  {
    sendJSON(res, {status: "emailInvalid"});
    return;
  }
  
  values.email = values.email.toLowerCase();
  
  //check if subdomain don't have illegal characters
  if(values.subdomain == null || !validateSubdomain(values.subdomain))
  {
    sendJSON(res, {status: "subdomainInvalid"});
    return;
  }
  
  //check if fullname is not a empty string
  if(values.fullName == "")
  {
    sendJSON(res, {status: "fullNameIsEmpty"});
    return;
  }
  
  //check if domain alread exist
  domainManager.checkIfDomainExists(values.subdomain,function(success, domainExist){
    if(!success)
    {
      return;
    }
    
    if(domainExist)
    {
      sendJSON(res, {status: "subdomainAlreadyRegistered"});
    }
    else
    {
      //check if user already exist
      userManager.getAllDomainsOfUser(values.email, function(success, domainArray){
        if(!success)
        {
          return;
        }
        
        //if the user is already registrated
        if(domainArray.length > 0)
        {
           sendJSON(res, {status: "userAlreadyRegistered"});
        }
        //everything is fine, create a registration entry for this registration
        else
        {
          registrationManager.createRegistrationEntry(values.email, values.fullName, values.subdomain, function(success, registrationId)
          {
            //send him a email and send a ok
            if(success)
            {
              sendJSON(res, {status: "ok"});
              
              console.error("Send Email to:" + values.email);

              //Send him a email
              email.send({
                host : "localhost",              // smtp server hostname
                port : "25",                     // smtp server port
                domain : "localhost",            // domain used by client to identify itself to server
                to : values.email,
                from : "no-reply@primarywall.com",
                subject : "Your PrimaryWall Registration",
                body: "Hello " + values.fullName + "!\n\nPlease go to http://primarywall.com/static/registered.html?id=" + registrationId + "\n\nYour PrimaryWall team",
              },
              function(err, result){
                if(err){ console.error(err); }
                console.error("email-result:" + err);
              });
            }
          });
        }
      });
    }
  });
  
  
}

/**
 * Handles a ajax Login Request
 *
 * @param values the Post values
 * @param cookies the cookie values
 */
function handleLogin(req, res, values, cookies)
{
  values.email = values.email.toLowerCase();

  //ask the database if these data is correct
  userManager.checkUserPass(values.email, values.password, function (success, correctauth)
  {
    //we have a problem with the database or the user authentication is wrong, anyway, send a wrong
    if (!success || !correctauth)
    {
      sendJSON(res, {
        status: "wrong"
      });
    }
    //The Authentication is correct
    else
    {
      //In which domains is this user known?
      userManager.getAllDomainsOfUser(values.email, function (success, domains)
      {
        //the database had a problem, send wrong
        if (!success)
        {
          sendJSON(res, {
            status: "wrong"
          });
        }
        //database is fine
        else
        {
          //Does this user mention to which domain he wants to login, if yes, check if he is a member of this group
          if (values.domain)
          {
            var foundInDomains = false;

            //search in the domains for this domain the user want to log in
            for (var i in domains)
            {
              if (domains[i] == values.domain)
              {
                foundInDomains = true;
                break;
              }
            }

            //everything is fine, the authentication is correct and the user is known in this domain
            if (foundInDomains)
            {
              //save session is doing the rest
              saveSession(values.email, values.domain, cookies, res);
            }
            //The Authentication is correct, but the is user is not known in this domain
            else
            {
              sendJSON(res, {
                status: "wrong"
              });
            }
          }
          //The User is only in one domain known, so we create a session at this domain
          else if (domains.length == 1)
          {
            //save session is doing the rest
            saveSession(values.email, domains[0], cookies, res)
          }
          //The User is known in more than one domain, so we send the client a list where it can choose from
          else
          {
            sendJSON(res, {
              status: "needDomain",
              domains: domains
            });
          }

        }
      });
    }
  });
}

/**
 * Handles a ajax Overview Request. Overview means the information about the last walls edited 
 *
 * @param values the Post values
 * @param cookies the cookie values
 */
function handleOverview(req, res, values, cookies)
{
  //get domain
  var domain = values.domain;
  
  var session = cookies.get("session");
  
  var responseJSON = {};
  var userId;
  var walls = [];
  var nextWallNum = 1;
  
  async.waterfall([
    //check security
    function(callback)
    {
      //if there is no session, say goodbye to this user
      if(session == null)
      {
        responseJSON = {error: "No session cookie set"};
        callback("stop");
      }
      else if(domain == null)
      {
        responseJSON = {error: "No domain in the POST data"};
        callback("stop");
      }
      //there is a session, check if its correct
      else
      {
        securityManager.getDomainPermissions4Session(session, domain, function(success, permissionType)
        {
          callback(success ? null : false, permissionType);
        });
      }
    },
    //get the user of the session
    function(permissionType, callback)
    {
      //The User have no permission, say goodbye
      if(permissionType == "noMember")
      {
        responseJSON = {error: "No Permission for this domain"};
        callback("stop");
      }
      //The User have permission, find out his email
      else
      {
        userManager.getUserSession(session, function(success, sessionObject){
          callback(success ? null : false, sessionObject);
        });
      }
    },
    //save the userid for a later response
    //get all walls from domains
    function(sessionObject, callback)
    {
      userId = sessionObject.userId;
      
      domainManager.getDomainWalls(domain, function(success, walls){
        callback(success ? null : false, walls);
      });
    },
    //map the walls and find out the lastEdit for everyone
    function(_walls, callback)
    {
      //map all wallids in a array full of objects that saves the lastEdit
      for(var i in _walls)
      {
        walls.push({wallid: _walls[i], lastEdit: 0});
      }
      
      //find the nextWallNum
      while(_walls.indexOf(domain + "$" + nextWallNum) != -1)
      {
        nextWallNum++;
      }
      
      //get the lastEdit date from all walls
      async.forEach(walls, function(item, callback){
        wallManager.getWallLastEdit(item.wallid, function(success, lastEdit){
          item.lastEdit = lastEdit;
          callback(success ? null : false);
        });
      }, callback);
    },
    //sort array and respond 
    function(callback)
    {
      //sort walls array
      walls.sort(function(a,b){
        return b.lastEdit-a.lastEdit;
      });
      
      //set response data and response :)
      responseJSON.walls = walls;
      responseJSON.userId = userId;
      responseJSON.nextWallNum = nextWallNum;
      callback(null); 
    }
  ], function(err){
    sendJSON(res, responseJSON);
  
    if(err && err != "stop") 
    {
      console.error(err);
    }
  });
}

/**
 * parse the POST string and returns a object with values
 *
 * @param str The Post String
 */

function parsePOST(str)
{
  var returnValues = {};

  if(str && typeof str == "string")
  {
    var parts = str.split("&");

    for (var i in parts)
    {
      var partsparts = parts[i].split("=");
      returnValues[decode(partsparts[0])] = decode(partsparts[1]);
    }
  }
  
  return returnValues;
}

function decode(str) {
  return decodeURIComponent(str.replace(/\+/g, " "));
}

/**
 * Send json as a http response
 * This is a small helper function
 * @param response The Response Object
 * @param object the object that should be sended
 */

function sendJSON(res, object)
{
  console.log(new Date().toUTCString() + ", " + "AJAX-RESPONSE:"+ JSON.stringify (object));

  res.writeHead(200, {
    'Content-Type': 'text/plain'
  });
  res.write(JSON.stringify(object), 'utf8');
  res.end();
}

/**
 * Generates a random String for the sessionID
 * This is a small helper function
 */

function randomSessionID()
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

/**
 * Save a session to the database
 * This is a small helper function
 * @param user the user that belongs to this session
 * @param domain the domain this user logged in
 */

function saveSession(user, domain, cookies, res)
{
  var sessionId = randomSessionID();
  var sessionObject = {
    userId: user,
    domain: domain, 
    timestamp: new Date().getTime()
  };

  userManager.saveUserSession(sessionId, sessionObject, function (err)
  {
    cookies.set("session", sessionId, { 
                                        httpOnly: false, 
                                        domain: ".primarywall.com", 
                                        //let it expire in two months
                                        expires: new Date(new Date().getTime()+1000*60*60*24*30*2)});
    sendJSON(res, {
      status: "ok",
      domain: domain
    });
  });
}

/**
 * Validates a email with a regular expression
 * @param email The Email Adress
 */
function validateEmail(email) {
   var reg = /^([A-Za-z0-9_\-\.])+\@([A-Za-z0-9_\-\.])+\.([A-Za-z]{2,4})$/;
   return reg.test(email);
}

/**
 * Validates a subdomain
 * @param domain The Subdomain
 */
function validateSubdomain(domain)
{
  var regex=/^[0-9A-Za-z]+$/; //^[a-zA-z]+$/
  if(regex.test(domain)){
    return true;
    } else {
    return false;
  }
}
