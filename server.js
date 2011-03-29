/*
 * Copyright 2011 Primary Technology Ltd
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

// Simple Node & Socket server
var http = require('http')
  , url = require('url')
  , fs = require('fs')
  , io = require('socket.io')
  , sys = require('sys')
  , server;

server = http.createServer(function(req, res){
  var path = url.parse(req.url).pathname;
  
  if(path == "/")
  {
    sendFile(res, path, __dirname + "/static/index.html");
  }
  else if(path.substring(0,"/static".length) == "/static")
  {
    sendFile(res, path, __dirname + path);
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
});
server.listen(1337);

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

function requestLog(code, path, desc)
{
  console.log(code +", " + path + ", " + desc);
}

var io = io.listen(server);
var messageHandler = require("./MessageHandler");
messageHandler.setSocketIO(io);

io.on('connection', function(client){
  try{
    messageHandler.handleConnect(client);
  }catch(e){console.error(e);}
  
  client.on('message', function(message){
    try{
      messageHandler.handleMessage(client, message);
    }catch(e){console.error(e.message);}
  });

  client.on('disconnect', function(){
    try{
      messageHandler.handleDisconnect(client);
    }catch(e){console.error(e);}
  });
});




