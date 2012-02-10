/*
 * Copyright 2011 Primary Technology Ltd
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as
 * published by the Free Software Foundation, either version 3 of the
 * License, or (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
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
  var locks = NoteManager.removeLocksFromThisSession(client.id);
  for(i in locks)
  {
    broadcastToTheOtherOnTheWall(client, {type:"unlock", data:locks[i]});
  }
  
  //save the wall of this session before we deleting the entry
  var wallid = session2wall[client.id];
  
  //Broadcast the new user_count
  broadcastToTheOtherOnTheWall(client, {type:"user_count", data: wall2sessions[wallid].length-1});
  
  //delete the session2wall entry
  delete session2wall[client.id];
  
  //Search in the wall2sessionarray for this session and delete it
  for(i in wall2sessions[wallid])
  {
    if(wall2sessions[wallid][i] == client.id)
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

  // console.log(client);
  // console.log("FIN");   
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
  session2wall[client.id] = wallid;
  console.log("saved "+client.id+" into "+wallid);
  if(wall2sessions[wallid] == null)
    wall2sessions[wallid] = [];
  wall2sessions[wallid].push(client.id);
      
  //Tell everybody about the user count
  var msg = {type:"user_count", data: wall2sessions[wallid].length};
  broadcastToTheOtherOnTheWall(client, msg);
  client.json.send(msg);
  
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
      
      client.json.send({"type": "new", "data": data});
    }
  });
}

/**
 * Handles the message of a Client
 */
function handleLock(client, message)
{
  NoteManager.lockNote(message.data, client.id);
  
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
  
  var wallid = session2wall[client.id];
  
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
  NoteManager.deleteNote (message.data, client.id, function(success){
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
  
  NoteManager.editNote (message.data.guid, message.data.title, message.data.content, message.data.author, client.id, function(success){
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
  
  NoteManager.moveNote (message.data.guid, message.data.x, message.data.y, client.id, function(success){
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
  // console.log("CLIENT DATA:");
  // console.log(client);
  var wallid = session2wall[client.id];
  for(i in wall2sessions[wallid])
  {
//    console.log("JAM");
    console.log(wall2sessions[wallid][i]);
    if(wall2sessions[wallid][i] != client.id) // broadcast to everyone except the creator
    {
// console.log("broadcasting");
      socketio.sockets.sockets[wall2sessions[wallid][i]].json.send(message);
    }
  }
}

