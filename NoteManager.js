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

/*********************************/
/* Build up the MySQL Connection */
/*********************************/
var config = require("./MySQL_config");
var client = require('mysql').createClient({'host':config.host,'port':3306,'user':config.user,'password':config.password,'database':config.database});

/*********************************/
/* Note Manager Functions        */
/*********************************/

/**
 * Saves the cached Informations about all Notes
 * key = guid
 * values = wallid, title, content, author, x, y, locksession
 */
var notes = {};


/**
 * Saves all walls that are loaded in Memory
 */
var loadedWalls = [];

/**
 * Loads all Notes of this Wall in Memory if they not in it
 */
exports.ensureAllNotesOfThisWallAreLoaded = function (wallid, callback)
{
  var foundInLoadedWalls = false;
  
  for(i in loadedWalls)
  {
    if(loadedWalls[i] == wallid)
    {
      foundInLoadedWalls = true;
      break;
    }
  }

  if(!foundInLoadedWalls)
  {
    client.query("SELECT * FROM `note` WHERE  `wallid` =  ?", [wallid], function(err, results, fields)
    {
      if(err == null)
      {
        for (i in results)
        {
          notes[results[i].guid] = {"wallid": results[i].wallid, "title": results[i].title, 
                                   "content": results[i].content, "author": results[i].author,
                                   "x": results[i].x, "y": results[i].y, 
                                   "color": results[i].color, "locksession":null};
        }
        
        loadedWalls.push(wallid);
      }
      else{
        console.error(err.message);
      }          
      callback(err == null);
    });
  }
  else
  {
    callback(true);
  }
}

/**
 * Flush all Notes of this Wall out of Memory
 */
exports.flushAllNotesOfThisWall = function (wallid)
{
  for( i in notes )
  {
    if(notes[i].wallid == wallid)
    {
      delete notes[i];
    }
  }
  
  for(i in loadedWalls)
  {
    if(loadedWalls[i] == wallid)
    {
      loadedWalls.splice (i,1);
      break;
    }
  }
}

/**
 * Returns all Notes from a specific Wall
 * @return a Object with all Notes, key is guid
 */
exports.getAllNotesFromWall = function (wallid)
{
  var notesFromWall = [];

  for( i in notes )
  {
    if(notes[i].wallid == wallid)
    {
      notesFromWall[i] = notes[i];
    }
  }
  
  return notesFromWall;
}

/**
 * Removes all Locks that a sessions holts.
 * @return a Array with the Locks that this session had. 
 */
exports.removeLocksFromThisSession = function (session)
{
  var locks = [];

  for( i in notes )
  {
    if(notes[i].locksession == session)
    {
      notes[i].locksession = null;
      locks.push(i);
    }
  }
  
  return locks;
}

/**
 * Creates a new note
 */
exports.newNote = function (guid, wallid, title, content, author, x, y, color, callback)
{
  throwExceptionIfCallbackIsntOk(callback);
  console.log(color);

  client.query("INSERT INTO `note` (`guid`, `title`, `content`, `author`, `x`, `y`, `color`, `wallid`) " +
               "VALUES (?, ?, ?, ?, ?, ?, ?, ?)", [guid, title, content, author, x, y, color, wallid], function(err)
  {
    if(err == null)
      notes[guid] = {"wallid": wallid, "title": title, "content": content, "author": author, "x":x, "y":y, "color": color, "locksession":null};
    else{
      console.error(err.message);
    }
    callback(err == null);
  });
}

/**
 * Move a Note to a new x and y
 */
exports.moveNote = function (guid, x, y, session, callback)
{
  throwExceptionIfGuidIsntOk(guid, session);
  throwExceptionIfCallbackIsntOk(callback);

  client.query("UPDATE `note` SET `x` = ?, `y` = ? WHERE `note`.`guid` = ?", 
              [x, y, guid], function(err)
  {
    if(err == null)
    {
      notes[guid].x = x;
      notes[guid].y = y;
    }
    else
    {
      console.error(err.message);
    }
                 
    callback(err == null);
  });
}

/**
 * Sets the new Values 
 */
exports.editNote = function (guid, title, content, author, color, session, callback)
{
  throwExceptionIfGuidIsntOk(guid, session);
  throwExceptionIfCallbackIsntOk(callback);
  
  client.query("UPDATE `note` SET `title` = ?, `content` = ?, `author` = ?, `color` = ? WHERE `note`.`guid` = ?", 
              [title, content, author, color, guid], function(err)
  {
    if(err == null)
    {
      notes[guid].title = title;
      notes[guid].content = content;
      notes[guid].author = author;
      notes[guid].color = color;
    }
    else
    {
      console.error(err.message);
    }
                 
    callback(err == null);
  });
}

/**
 * Deletes a Note
 */
exports.deleteNote = function (guid, session, callback)
{
  throwExceptionIfGuidIsntOk(guid, session);
  throwExceptionIfCallbackIsntOk(callback);
  
  client.query("DELETE FROM `note` WHERE `note`.`guid` = ?", 
              [guid], function(err)
  {
    if(err == null)
    {
      delete notes[guid];
    }
    else
    {
      console.error(err.message);
    }
                 
    callback(err == null);
  });
}

/**
 * Locks a Note
 */
exports.lockNote = function (guid, session)
{
  throwExceptionIfGuidIsntOk(guid, session);
  
  notes[guid].locksession = session;
}

/**
 * Unlocks a Note
 */
exports.unlockNote = function (guid)
{
  if(notes[guid] == null)
  {
    // Why the elaborate string below?
    throw "There is no Note with guid '" + guid + "'";
  }
  
  if(notes[guid].locksession == null)
  {
    throw "The Note '" + guid + "' isn't locked'";
  }
  
  notes[guid].locksession = null;
}

function throwExceptionIfCallbackIsntOk(callback)
{
  if(callback == null)
  {
    throw "You didn't set a callback Function!'"
  }
  
  if(typeof callback != 'function')
  {
    throw "Your Callback isn't a Function!'"
  }
}

function throwExceptionIfGuidIsntOk(guid, session)
{
  if(notes[guid] == null)
  {
    throw "There is no Note with guid " + guid;
  }
  
  if(notes[guid].locksession != null && notes[guid].locksession != session)
  {
    throw "The Note '" + guid + "' is locked";
  }
}
