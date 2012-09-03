// Simple Node & Socket server
var http = require('http');
var url = require('url');
var fs = require('fs');
var io = require('socket.io');
var sys = require('sys');
var ajaxHandler = require('./ajaxHandler');
var Cookies = require("cookies");
var userManager = require("./UserManager");

var server;

server = http.createServer(function(req, res){
  try
  {
    var path = url.parse(req.url).pathname;
    
    if(path == "/")
    {
      sendFile(res, path, __dirname + "/static/index.html");
    }
    else if(path == "/static/login.html")
    {
      handleLoginRequest(req, res);
    }
    else if(path.substring(0,"/static".length) == "/static")
    {
      sendFile(res, path, __dirname + path);
    }
    else if(path.substring(0,"/ajax/".length) == "/ajax/")
    {
      ajaxHandler.handle(req, res, path);
    }
    else if(path == "/newwall")
    {
      sendRedirect(res, path, "/" + randomWallName());
    }
    else
    {
      if(path.lastIndexOf("/")==0)
      {
        sendFile(res, path, __dirname + "/static/wall.html");
      }
      else
      {
        send404(res, path);
      }
    }
  }catch(e){errorlog(e)}
});
server.listen(8000);

function randomWallName() {
	var chars = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXTZabcdefghiklmnopqrstuvwxyz";
	var string_length = 10;
	var randomstring = '';
	for (var i=0; i<string_length; i++) {
		var rnum = Math.floor(Math.random() * chars.length);
		randomstring += chars.substring(rnum,rnum+1);
	}
	return randomstring;
}

function sendFile(res, reqPath, path)
{
  path=path.replace("../","");

  fs.readFile(path, function(err, data){
    if (err){
      send404(res, reqPath);
    } else {
      var contentType = "text/html";
    
      if (path.substring(path.length -3, path.length) == ".js")
        contentType = "text/javascript";
      else if (path.substring(path.length -4, path.length) == ".css")
        contentType = "text/css";
      else if (path.substring(path.length -4, path.length) == ".gif")
        contentType = "image/gif";
      else if (path.substring(path.length -4, path.length) == ".png")
        contentType = "image/png";   
      else if (path.substring(path.length -4, path.length) == ".ico")
        contentType = "image/x-icon";

    
      res.writeHead(200, {'Content-Type': contentType});
      res.write(data, 'utf8');
      res.end();
      
      requestLog(200, reqPath, "-> " + path);
    }
  });
}

function handleLoginRequest(req, res)
{
  var path = url.parse(req.url).pathname;

  //extract the session cookie
  var cookies = new Cookies(req, res);
  var sessionId = cookies.get("session");
  
  //if there is no sessionId, send the static file
  if(sessionId == null)
  {
    sendFile(res, path, __dirname + "/static/login.html");
  }
  //else we should check what we know about this session
  else
  {
    userManager.getUserSession(sessionId, function(success, sessionObject){
      //the database don't like this cookie
      if(!success || sessionObject == null)
      {
        //delete cookie and serve login
        cookies.set("session", "", new Date(0));
        sendFile(res, path, __dirname + "/static/login.html");
      }
      else
      {
        //redirect the user to the logedin page
        sendRedirect(res, "/static/loggedin.html", "http://" + sessionObject.domain + ".primarywall.com/static/loggedin.html")
      }
    });
  }
}

function send404(res, reqPath)
{
  res.writeHead(404);
  res.write("404 - Not Found");
  res.end();
  
  requestLog(404, reqPath, "NOT FOUND!");
}

function sendRedirect(res, reqPath, location)
{
  res.writeHead(302, {'Location': location});
  res.end();
  
  requestLog(302, reqPath, "-> " + location);
}

function requestLog(code, path, desc, ip)
{
  if(path != "/")
    console.log(new Date().toUTCString() + ", " + code +", " + path + ", " + desc);
}

var io = io.listen(server);
var messageHandler = require("./MessageHandler");
messageHandler.setSocketIO(io);

io.on('connection', function(client){
  try{
    messageHandler.handleConnect(client);
  }catch(e){console.error(errorlog(e));}
  
  client.on('message', function(message){
    try{
      messageHandler.handleMessage(client, message);
    }catch(e){console.error(errorlog(e));}
  });

  client.on('disconnect', function(){
    try{
      messageHandler.handleDisconnect(client);
    }catch(e){console.error(errorlog(e));}
  });
});

function errorlog(e)
{
  var timeStr = new Date().toUTCString() + ": ";

  if(typeof e == "string")
  {
    console.error(timeStr + e);
    console.log("ERROR: " + timeStr + e);
  }
  else if(e.stack != null)
  {
    console.error(timeStr + e.stack);
    console.log("ERROR: " + timeStr + e.stack);
  }
  else
  {
    console.error(timeStr + JSON.stringify(e));
    console.log("ERROR: " + timeStr + JSON.stringify(e));
  }
}
