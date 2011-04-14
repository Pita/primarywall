// Socket IO w/ lovely fall back I choo choo choose you.
$(document).ready(function ()
{
  // hide the loading page
  $('#loading').hide();
//  socket = new io.Socket();
  socket = new io.Socket('socket.primarywall.com',{port: 1337});

  socket.connect();

  socket.on('connect', function ()
  {
    var url = document.URL.split("?")[0];
    var wallid = url.substring(url.lastIndexOf("/") + 1);
    // hide the connection warning and show first helper
    $('#newconnect').hide();
    $('#superninja').show();
    socket.send(
    {
      type: "handshake",
      data: {
        "wallid": wallid
      }
    });
  });

  socket.on('message', function (obj)
  {
    errlog(obj);
    if (obj.type == "new")
    {
      newpost(obj.data.title, obj.data.content, obj.data.author, obj.data.x, obj.data.y, obj.data.guid)
      if (obj.data.locked == true)
      {
        $('#' + obj.data.guid + ' > .notecontents').hide();
        $('#' + obj.data.guid + ' > .notename').fadeOut();
        $('#' + obj.data.guid + ' > .noteeditoption').fadeOut();
        $('#' + obj.data.guid + ' > .noteeditlocked').fadeIn();
      }
    }

    // move
    else if (obj.type == "move")
    {
      notearray[obj.data.guid].x = obj.data.x;
      notearray[obj.data.guid].y = obj.data.y;

      $("#" + obj.data.guid).animate(
      {
        top: obj.data.y * scale,
        left: obj.data.x * scale
      });

      if (resizeTimer) clearTimeout(resizeTimer);
      resizeTimer = setTimeout(scaleNotePositions2Window, 500);
    }

    // delete
    else if (obj.type == "delete")
    {
      // remove from screen
      $('#' + obj.data).hide("explode", 1000);
      // remove from array
      delete notearray[obj.data];
    }

    // lock
    else if (obj.type == "lock")
    {
      // cake
      $('#' + obj.data + ' > .notecontents').hide();
      $('#' + obj.data + ' > .notename').fadeOut();
      $('#' + obj.data + ' > .noteeditoption').fadeOut();
      $('#' + obj.data + ' > .noteeditlocked').fadeIn();
    }

    // unlock
    else if (obj.type == "unlock")
    {
      $('#' + obj.data + ' > .noteeditlocked').hide();
      $('#' + obj.data + ' > .notecontents').fadeIn();
      $('#' + obj.data + ' > .notename').fadeIn();
      $('#' + obj.data + ' > .noteeditoption').fadeIn();
    }

    // edit note
    else if (obj.type == "edit")
    {
      $('#' + obj.data.guid + ' > .notetitle').html(htmlescape(obj.data.title));
      $('#' + obj.data.guid + ' > .notecontents').html(htmlescape(obj.data.content));
      $('#' + obj.data.guid + ' > .notename').html(htmlescape(obj.data.author));
    }

    // user count
    else if (obj.type == "user_count")
    {
      errlog("Firing user_count");
      // remove from screen
      user_count(obj.data);
      // remove from array
    }

  });

  socket.on('disconnect', function ()
  {
    $('#values').fadeOut();
    $('#superninja2').fadeIn();

  });

  // listen for clicks in values
  $('#values').bind('click', function (event)
  {
    newnote(event, dontshow);
  });

});

// Should we debug?
var debug = 0;

// For now we initialize a clear array bceause we don't have any server side data 
var notearray = {};
var numberofnotes = 0;

// Let's get the browsers sizes
var x = $(window).width();
errlog("Screen x is:" + x);
var y = $(window).height();
errlog("Screen y is:" + y);

// We can allow the mouseX and Y to be global
var mouseX;
var mouseY;

// set a stupid zindex value
var zindexhighest = 90000;

// dont show is needed because for some weird reason when we call a delete on an array it fires a new screen event and that makes the newnote window pop up
var dontshow = 0;

// error logging

function errlog(error)
{
  if (window.console && debug == 1)
  {
    console.log(error);
  }
}

// On browser resize
var resizeTimer = null;
$(window).resize(function ()
{
  if (resizeTimer) clearTimeout(resizeTimer);
  resizeTimer = setTimeout(scaleNotePositions2Window, 500);
});

var scale = 1;

function scaleNotePositions2Window()
{
  //What width is avaiable?
  var useableWidth = $(window).width() - 220;

  //Find out how much width is needed for the notes
  var maxNoteX = 0;
  for (note in notearray)
  {
    if (note)
    {
      if (notearray[note].x > maxNoteX) maxNoteX = notearray[note].x;
    }
  }

  //calculate what scale we need to fit x
  scale = useableWidth / maxNoteX;

  if (scale > 1) scale = 1;
  if (scale < 0.85) scale = 0.85;

  //go trough a
  for (note in notearray)
  {
    if (note)
    {
      //var noteguid = notearray[note].guid;
      var x = notearray[note].x * scale;
      var y = notearray[note].y * scale;

      $('#' + note).animate(
      {
        left: x,
        top: y
      });
    }
  }
}


// Make notes draggable

function reset()
{
  $('.note').draggable("option", "cursor", 'hand');
}

// What's the mouse position?

function currmouseX(event)
{
  return event.offsetX ? (event.offsetX) : event.pageX - document.getElementById("values").offsetLeft;
}

function currmouseY(event)
{
  return event.offsetY ? (event.offsetY) : event.pageY - document.getElementById("values").offsetTop;
}

//function to get random number upto m

function randomXToY(minVal, maxVal, floatVal)
{
  var randVal = minVal + (Math.random() * (maxVal - minVal));
  return typeof floatVal == 'undefined' ? Math.round(randVal) : randVal.toFixed(floatVal);
}

// new user, edit user and deleted user

function user_count(count)
{
  var usercount = 0;
  var i = 0;
  // remove self
  count = count - 1;
  $('#users').html("");
  while (count > i)
  {
    usercount++;
    var userstring = "<div class=user id='" + i + "'><img src='/static/user.png' class='usericon' title='This person is on this wall'></div>";
    $('#users').append(userstring);
    i++;
  }
  errlog(i + " users connected");
}

// Create a new note

function newnote(event, dontshow)
{
  if (dontshow == 0)
  {
    errlog("Dont show during function is: " + dontshow);
    // What is the mouse X Y?
    if (currmouseX(event))
    {
      mouseX = currmouseX(event);
      mouseY = currmouseY(event);
    }
    else
    {
      mouseX = randomXToY(50, 800);
      mouseY = randomXToY(120, 600);
    }

    // Is this action a misfire AKA is there already a note in this space?
    var cool = 1;
/*for (note in notearray)
    {
      if (note)
      {
        var badleft = notearray[note].x;
        var badright = 200 + badleft;
        var badtop = notearray[note].y;
        var badbottom = 100 + badtop;
        errlog("Badleft is " + badleft + "-- Badright is " + badright + " badtop is " + badtop + " and badbottom is " + badbottom);
        if (mouseX > badleft && mouseX < badright && mouseY < badbottom && mouseY > badtop)
        {
          // we wont proceed because we are clicking on an already existing note
          cool = 0;
          errlog("Note already in this space, not continuing with creating new note");
        }
      }
    }*/

    if (cool == 1)
    {
      // Reset input values to blank as this is a new note
      errlog("Making new note");
      $('#editnotetitle').val("");
      $('#editnotecontents').val("");
      $('#editnoteguid').val("");

      // If the  mouse click is from the last 200px of the page then put the note in the middle of the page
      var allowedX = x - 200;
      if (mouseX > allowedX)
      {
        mouseX = (x / 2) - 100;
        mouseY = 480
      };

      // only create a note if we're not removing focus
      if ($('#extradropdown').css('display') == 'none')
      {
        $('#editpage').show();
        $('.note').draggable("option", "containment", '#values');
        $('.note').draggable("option", "cursor", 'pointer');
        $('.note').draggable("option", "cursor", 'hand');
        // Here we need some code that sets a function for when the note has finished being dragged
      }
      else
      {
        // hide the drop down
        if (dropdownmode != 'search' || $('#search').val() == "") $('#extradropdown').hide('slow');
      }
      // make edit page draggable
      $('#editpage').draggable();
      $('#editpage').draggable("option", "cursor", "hand");
      $('#editpage').draggable({containment: "#values"});
      // Make first input box the focus object
      $('#editnotetitle').focus();
    }
  }
}
// delete note

function deleteprompt(noteguid)
{
  dontshow = 1;
  errlog("Dont show before time out is " + dontshow);
  setTimeout("dontshow = 0", 2000);
  errlog("Dont show after timeout is " + dontshow);
  socket.send(
  {
    type: "lock",
    "data": noteguid
  });
  $('#' + noteguid + ' > .notename').hide();
  $('#' + noteguid + ' > .noteeditoption').html('Are you sure?  <a onClick=deletenote("' + noteguid + '");>Yes</a> / <a onClick=dontdelete("' + noteguid + '");>No</a>');
}

function dontdelete(noteguid)
{
  var notehtmledit = '<a onclick=deleteprompt("' + noteguid + '");>delete</a> | <a style="z-index:999999;" onclick=editnote("' + noteguid + '");>edit</a>';
  dontshow = 1;
  errlog("Dont show before time out is " + dontshow);
  setTimeout("dontshow = 0", 2000);
  errlog("Dont show after timeout is " + dontshow);
  $('#' + noteguid + ' > .noteeditoption').html(notehtmledit);
  $('#' + noteguid + ' > .notename').show();
  socket.send(
  {
    type: "unlock",
    "data": noteguid
  });
}

function deletenote(noteguid)
{
  deletefunc(noteguid);
  $('#' + noteguid).hide("explode", 1000);
  //Send new Position to the Server
  socket.send(
  {
    type: "delete",
    "data": noteguid
  });

  errlog(notearray);
  // Get the number of notes
  for (wut in notearray)
  {
    numberofnotes++;
  }
  errlog("There are " + numberofnotes + " notes currently in the UI");
  if (numberofnotes == 0)
  {
    // Show the tip for how to drag
    $('#transoverlay').fadeOut('slow');
    // tool tip for how to create a new note
    $('#superninja').fadeIn('slow');
  }
}

// testing delete from array func

function deletefunc(noteguid)
{
  dontshow = 1;
  errlog("Dont show before time out is " + dontshow);
  delete notearray[noteguid];
  setTimeout("dontshow = 0", 2000);
  errlog("Dont show after timeout is " + dontshow);
}


// edit an existing note

function editnote(noteguid)
{
  socket.send(
  {
    type: "lock",
    "data": noteguid
  });
  dontshow = 1;
  errlog("Dont show before time out is " + dontshow);
  setTimeout("dontshow = 0", 2000);
  errlog("Dont show after timeout is " + dontshow);
  // tool tip for how to create a new note
  $('#superninja').fadeOut('slow');
  // Show the tip for how to drag
  $('#transoverlay').hide('slow');
  var notetitle = notearray[noteguid].title;
  var notecontents = notearray[noteguid].contents;
  var notename = notearray[noteguid].notename;
  var noteguid = notearray[noteguid].guid;
  $('#editpage').fadeIn();
  $('#editnotetitle').val(notetitle);
  $('#editnotecontents').val(notecontents);
  $('#editnotename').val(notename);
  $('#editnoteguid').val(noteguid);
}

// get the values from the note creation page

function post()
{
  // get values from input boxes
  var editnotetitle = $('#editnotetitle').val();
  var editnotecontents = $('#editnotecontents').val();
  var editnotename = $('#editnotename').val();
  var editnoteguid = $('#editnoteguid').val();

  // Is this a new post or a post edit?
  if (editnoteguid)
  {
    errlog("Note Guid is set so we should only edit and not create a new note");
    // We need to update the UI and the array.  First the array
    notearray[editnoteguid].title = editnotetitle;
    notearray[editnoteguid].contents = editnotecontents;
    notearray[editnoteguid].notename = editnotename;
    errlog(notearray);
    // Now the UI
    $('#' + editnoteguid + ' > .notetitle').html(htmlescape(editnotetitle));
    $('#' + editnoteguid + ' > .notecontents').html(htmlescape(editnotecontents));
    $('#' + editnoteguid + ' > .notename').html(htmlescape(editnotename));
    //send to the Server
    errlog("updating server w/ edited contents");
    var data = {
      guid: editnoteguid,
      title: editnotetitle,
      content: editnotecontents,
      author: editnotename
    };
    socket.send(
    {
      "type": "edit",
      "data": data
    });
    socket.send(
    {
      type: "unlock",
      "data": editnoteguid
    });


  }
  else
  {
    // Create a new post
    if(window.send_ga_event) {
		send_ga_event('new-post', editnotetitle);
	}
    newpost(editnotetitle, editnotecontents, editnotename, mouseX, mouseY);
    // tool tip for how to create a new note
    $('#superninja').fadeOut('slow');
    // Show the tip for how to drag
    $('#transoverlay').fadeIn('slow');
  }
  // now we have the values lets close the input box
  $('#editpage').hide();
}

// guid generator

function guidGenerator()
{
  var S4 = function ()
  {
    return (((1 + Math.random()) * 0x10000) | 0).toString(16).substring(1);
  };
  return (S4() + S4() + "-" + S4() + "-" + S4() + "-" + S4() + "-" + S4() + S4() + S4());
}

function newpost(editnotetitle, editnotecontents, editnotename, mouseX, mouseY, noteguid)
{
  // First a bit of code in so we can debug
  errlog("Edit note title is " + editnotetitle);
  errlog("Edit note contents is " + editnotecontents);
  errlog("Edit note name is " + editnotename);
  errlog("Mouse X is " + mouseX);
  errlog("Mouse Y is " + mouseY);

  // if no name was given then set it as anonymous
  if (!editnotename)
  {
    editnotename = "Anonymous";
  }
  if (!editnotetitle)
  {
    editnotetitle = "No title set";
  }
  if (!editnotecontents)
  {
    editnotecontents = "No contents set";
  }

  //Check if came from the Server, if 
  if (!noteguid)
  {
    // Let's create a GUID for the note
    noteguid = guidGenerator();

    //send to the Server
    var data = {
      guid: noteguid,
      title: editnotetitle,
      content: editnotecontents,
      author: editnotename,
      x: mouseX,
      y: mouseY
    };

    socket.send(
    {
      "type": "new",
      "data": data
    });
  }


  // Write the note to the notesarray
  notearray[noteguid] = {};
  notearray[noteguid].guid = noteguid;
  notearray[noteguid].title = editnotetitle;
  notearray[noteguid].contents = editnotecontents;
  notearray[noteguid].notename = editnotename;
  notearray[noteguid].x = Math.round(mouseX / scale);
  notearray[noteguid].y = Math.round(mouseY / scale);
  errlog(notearray);

  // Now lets append the note to the UI
  var notehtmlcont = '<div class="note" id=' + noteguid + ' style="display:none;">';
  var notehtmltitle = '<div class="notetitle">' + htmlescape(editnotetitle) + '</div>';
  var notehtmlcontents = '<div class="notecontents">' + htmlescape(editnotecontents) + '</div>';
  var notehtmlname = '<div class="notename">by ' + htmlescape(editnotename) + '</div>';
  var notehtmledit = '<div class="noteeditoption"><a onclick=deleteprompt("' + noteguid + '");>delete</a> | <a style="z-index:999999;" onclick=editnote("' + noteguid + '");>edit</a></div>';
  var notehtmllock = '<div class="noteeditlocked"><img src="/static/lock.png" width="50px"></div>';
  var notehtmlend = '</div>';

  // Create one big string we can append
  notehtmlstring = notehtmlcont + notehtmltitle + notehtmlcontents + notehtmlname + notehtmledit + notehtmllock + notehtmlend;
  errlog("Html string is " + notehtmlstring);
  $('#values').append(notehtmlstring);
  // animate it onto the UI
  $('#' + noteguid).fadeIn();

  // Remind the UI that all of these objects are draggable
  $('#' + noteguid).css("left", mouseX);
  $('#' + noteguid).css("top", mouseY);

  if (resizeTimer) clearTimeout(resizeTimer);
  resizeTimer = setTimeout(scaleNotePositions2Window, 500);

  $('.note').draggable(
  {
    start: function (event, ui)
    {
      var zindex = $("#" + event.target.id).css("z-index");
      errlog(event.target.id + " Z-index is " + zindex);
      // set a higher z-index
      zindex = Number(zindex);
      zindex = zindexhighest + 1;
      zindexhighest = zindexhighest + 1;
      errlog(zindexhighest);
      $("#" + event.target.id).css("z-index", zindex);

      //errlog({"ui":ui});
      //errlog({"event.target.id":event.target.id});
      // tell teh server to lock teh note
      socket.send(
      {
        type: "lock",
        "data": event.target.id
      });
    },
    stop: function (event, ui)
    {
      newY = ui.position.top;
      newX = ui.position.left;
      errlog(this);
      // Now we should update the array with the new X and Y values
      // noteguid should be the div id of the div we just moved
      noteguid = ui.helper.context.id;
      notearray[noteguid].y = Math.round(newY / scale);
      notearray[noteguid].x = Math.round(newX / scale);
      errlog("New drag Y is " + newY);
      errlog("New drag X is " + newX);
      errlog(notearray);

      //Send new Position to the Server
      var data = {
        guid: noteguid,
        x: notearray[noteguid].x,
        y: notearray[noteguid].y
      };
      socket.send(
      {
        type: "move",
        "data": data
      });
      socket.send(
      {
        type: "unlock",
        "data": noteguid
      });
      $('#transoverlay').fadeOut('slow');
    },
    containment: "#values"
  });
}

var dropdownmode;

// Show the drop down box 


function extradropdown(request)
{
  var dropdownvalue;
  $('#extradropdown').show('slow');
  dropdownmode = request;
  switch (request)
  {
  case 'share':
    bitlyurl = 'http://' + location.host + location.pathname;
    bitly(bitlyurl);
    break;
  case 'font':
    dropdownvalue = 'Font selection coming soon';
    break;
  case 'background':
    dropdownvalue = 'Background selection coming soon';
    break;
  case 'sort':
    dropdownvalue = "Are you sure you want to sort your notes?<br><font size=2px>This will update everyones screen</font><br><input type='button' class='yesno' value='Yes' onClick='sort();'><input type='button' class='yesno' value='No' onClick='hidedrop();'>";
    break;
  case 'search':
    if (!savestring) savestring = "";

    dropdownvalue = "Search for a note<br><input type='text' id='search' onkeyup='search()' value=" + savestring + "><button type='button' onclick=\"$('.note').css('opacity', '1');$('#search').val('');savestring=''\" id='clearsearch'>x</button>";
    break;
  }
  $('#extradropdown').html(dropdownvalue);
}

var savestring = "";

function search()
{
  errlog(savestring);
  string = $('#search').val().toLowerCase();
  errlog("Searching for " + string);
  $('.note').css("opacity", ".3");
  $('#search').focus();
  savestring = string;

  // for each note search for the string then
  for (note in notearray)
  {
    var found = 0;
    var noteguid = notearray[note].guid;
/*var notetitle = $('#'+noteguid + ' > .notetitle').html();
    var notecontents = $('#'+noteguid + ' > .notecontents').html();
    var notename = $('#'+noteguid + ' > .notename').html();*/
    var notetitle = notearray[noteguid].title;
    var notecontents = notearray[noteguid].contents;
    var notename = notearray[noteguid].notename;
    // join the values
    var notedata = notetitle + notecontents + notename;
    notedata = notedata.toLowerCase();
    // do the actual search
    // errlog("Searching for " + string + " in " + notedata);
    var found = notedata.search(string);
    if (found > -1)
    {
      errlog("Found a string in " + noteguid);
      $('#' + noteguid).css("opacity", "1");
    }
  }
}

function hidedrop()
{
  $('#extradropdown').hide();
  savestring = $('#search').val();
}

// Sort the notes into some sort of easy to see view

function sort()
{
  //hide dropdown
  $('#extradropdown').hide('slow');

  //constants
  var startx = 10;
  var starty = 10;
  var noteWidth = 200;
  var noteHeight = 100;
  var gap = 40;
  var notesInOneRow = 4;

  //variables
  var row = 0;
  var col = 0;

  //loop through all notes
  for (guid in notearray)
  {
    //calculate new position
    var noteX = startx + (noteWidth + gap) * col;
    var noteY = starty + (noteHeight + gap) * row;

    //save the new position
    notearray[guid].x = noteX;
    notearray[guid].y = noteY;

    //send it to the server
    var data = {
      "guid": guid,
      "x": noteX,
      "y": noteY
    };
    socket.send(
    {
      type: "move",
      "data": data
    });

    //move to the next col/row
    col++;
    if (col == notesInOneRow)
    {
      col = 0;
      row++;
    }
  }

  if (resizeTimer) clearTimeout(resizeTimer);
  resizeTimer = setTimeout(scaleNotePositions2Window, 500);
}

function abortedit()
{
  var editnoteguid = $('#editnoteguid').val();
  $('#editpage').hide();
  socket.send(
  {
    type: "unlock",
    "data": editnoteguid
  });
}

function begin(event)
{
  if ($('#editpage').is(":visible") || ($('#extradropdown').is(":visible")))
  {
    errlog("Not displaying new note because new note dialogue is visible");
  }
  else
  {
    errlog("Making new note due to new keystroke");
    var event = "foo";
    newnote(event, dontshow);
  }
}

// listen for enter in editnotename

function lfe(event)
{
  dontshow = 1;
  errlog("Dont show before time out is " + dontshow);
  setTimeout("dontshow = 0", 2000);
  if (event.keyCode == '13')
  {
    // submit the form
    post();
  }
}


function htmlescape(str)
{
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
