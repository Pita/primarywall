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

var NoteManager = require("./NoteManager");

var session2wall = {};
var wall2sessions = {};

var socketio;

/**
 * Sets the socketio. This function is needed to initalize the MessageHandler
 */
exports.setSocketIO = function(socket_io)
{
  socketio=socket_io;
}

/**
 * Handles the connect of a client
 */
exports.handleConnect = function(client)
{
  //empty
}

/**
 * Handles the disconnect of a client
 */
exports.handleDisconnect = function(client)
{
  //remove all locks that this user is holding and broadcast the unlocks
  var locks = NoteManager.removeLocksFromThisSession(client.sessionId);
  for(i in locks)
  {
    broadcastToTheOtherOnTheWall(client, {type:"unlock", data:locks[i]});
  }
  
  //save the wall of this session before we deleting the entry
  var wallid = session2wall[client.sessionId];
  
  //Broadcast the new user_count
  broadcastToTheOtherOnTheWall(client, {type:"user_count", data: wall2sessions[wallid].length-1});
  
  //delete the session2wall entry
  delete session2wall[client.sessionId];
  
  //Search in the wall2sessionarray for this session and delete it
  for(i in wall2sessions[wallid])
  {
    if(wall2sessions[wallid][i] == client.sessionId)
    {
      wall2sessions[wallid].splice(i,1);
      break;
    }
  }
  
  //Search for walls with no users on it. Flush them out of NoteManager and delete the array entry
  for(index in wall2sessions)
  {
    if(wall2sessions[index].length == 0)
    {
      delete wall2sessions[index];
    
      NoteManager.flushAllNotesOfThisWall(index);
    }
  }  
}

/**
 * Handles the message of a Client
 */
exports.handleMessage = function(client, message)
{
  //Message have always two attributes, type and data
  //type can be handshake, lock, unlock, new, delete, edit, move
   
  console.log(message);
   
  if(message.type == null)
  {
    throw "Message have no type";
  }
  if(message.data == null)
  {
    throw "Message have no data";
  }
   
  if(message.type == "handshake")
  {
    handleHandshake(client, message);
  }
  else if(message.type == "lock")
  {
    handleLock(client, message);
  }
  else if(message.type == "unlock")
  {
    handleUnlock(client, message);
  }
  else if(message.type == "new")
  {
    handleNew(client, message);
  }
  else if(message.type == "delete")
  {
    handleDelete(client, message);
  }
  else if(message.type == "edit")
  {
    handleEdit(client, message);
  }
  else if(message.type == "move")
  {
    handleMove(client, message);
  }
  else
  {
    throw "Unkown type of Message '" + message.type + "'";
  }
}

/**
 * Handles the message of a Client
 */
function handleHandshake(client, message)
{
  if(message.data.wallid == null)
  {
    throw "Handshake have no wallid";
  }
  
  wallid = message.data.wallid;
  
  //Save relation between Wall and Session
  session2wall[client.sessionId] = wallid;
  if(wall2sessions[wallid] == null)
    wall2sessions[wallid] = [];
  wall2sessions[wallid].push(client.sessionId);
      
  //Tell everybody about the user count
  var msg = {type:"user_count", data: wall2sessions[wallid].length};
  broadcastToTheOtherOnTheWall(client, msg);
  client.send(msg);
  
  NoteManager.ensureAllNotesOfThisWallAreLoaded(wallid, function(success)
  {
    if(!success)
    {
      client.disconnect();
      return;
    }
  
    var notes = NoteManager.getAllNotesFromWall(wallid);
    
    for(i in notes)
    {
      var data = {
        guid: i,
        title: notes[i].title,
        content: notes[i].content,
        author: notes[i].author,
        x: notes[i].x,
        y: notes[i].y,
        locked: notes[i].locksession == null ? false : true
      };
      
      client.send({"type": "new", "data": data});
    }
  });
}

/**
 * Handles the message of a Client
 */
function handleLock(client, message)
{
  NoteManager.lockNote(message.data, client.sessionId);
  
  broadcastToTheOtherOnTheWall(client, message);
}

/**
 * Handles the message of a Client
 */
function handleUnlock(client, message)
{
  NoteManager.unlockNote(message.data);
  
  broadcastToTheOtherOnTheWall(client, message);
}

/**
 * Handles the message of a Client
 */
function handleNew(client, message)
{ 
  if(message.data.guid == null)
  {
    throw "New Message have no guid";
  }
  if(message.data.title == null)
  {
    throw "New Message have no title:";
  }
  if(message.data.content == null)
  {
    throw "New Message have no content";
  }
  if(message.data.author == null)
  {
    throw "New Message have no author";
  }
  if(message.data.x == null)
  {
    throw "New Message have no x";
  }
  if(message.data.y == null)
  {
    throw "New Message have no y";
  }
  
  var wallid = session2wall[client.sessionId];
  
  NoteManager.newNote (message.data.guid, wallid, message.data.title, message.data.content, message.data.author, message.data.x, message.data.y, function(success){
    if(!success)
    {
      client.disconnect();
      return;
    }
    
    broadcastToTheOtherOnTheWall(client, message);
  });
}

/**
 * Handles the message of a Client
 */
function handleDelete(client, message)
{
  NoteManager.deleteNote (message.data, client.sessionId, function(success){
    if(!success)
    {
      client.disconnect();
      return;
    }
    
    broadcastToTheOtherOnTheWall(client, message);
  });
}

/**
 * Handles the message of a Client
 */
function handleEdit(client, message)
{  
  if(message.data.guid == null)
  {
    throw "Edit Message have no guid";
  }
  if(message.data.title == null)
  {
    throw "Edit Message have no title:";
  }
  if(message.data.content == null)
  {
    throw "Edit Message have no content";
  }
  if(message.data.author == null)
  {
    throw "Edit Message have no author";
  }
  
  NoteManager.editNote (message.data.guid, message.data.title, message.data.content, message.data.author, client.sessionId, function(success){
    if(!success)
    {
      client.disconnect();
      return;
    }
    
    broadcastToTheOtherOnTheWall(client, message);
  });
}

/**
 * Handles the message of a Client
 */
function handleMove(client, message)
{
  if(message.data.guid == null)
  {
    throw "Move Message have no guid";
  }
  if(message.data.x == null)
  {
    throw "Move Message have no x";
  }
  if(message.data.y == null)
  {
    throw "Move Message have no y";
  }
  
  NoteManager.moveNote (message.data.guid, message.data.x, message.data.y, client.sessionId, function(success){
    if(!success)
    {
      client.disconnect();
      return;
    }
    
    broadcastToTheOtherOnTheWall(client, message);
  });
}

/**
 * Broadcast the Message to the other Clients on the Wall
 */
function broadcastToTheOtherOnTheWall(client, message)
{
  var wallid = session2wall[client.sessionId];
  
  for(i in wall2sessions[wallid])
  {
    if(wall2sessions[wallid][i] != client.sessionId)
    {
      socketio.clients[wall2sessions[wallid][i]].send(message);
    }
  }
}

