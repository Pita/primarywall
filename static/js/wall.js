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

/* Setting up some horrible global vars */
var editcolor = false;
var readonly = false;
var exporting = false;
var userName = false;
var dragging = false;

// Socket IO w/ lovely fall back I choo choo choose you.
$(document).ready(function ()
{
  // stop firefox breaking sockets on escape key...
  $(this).keypress(function(e){ 
    if(e.keyCode == 27){ 
      $('#editpage').hide();       
      return false; 
    }
  }); 

  // hide the loading page
  $('#loading').hide();
  socket = io.connect();
  getParams();

  socket.on('connect', function ()
  {
    var url = document.URL.split("?")[0];
    var wallid = url.substring(url.lastIndexOf("/") + 1);
    var wallidParams = wallid.substring(wallid.lastIndexOf("."));  // Ie read only
    if(wallidParams.length !== wallid.length){
      var wallid = wallid.replace(wallidParams, "");
    }
    readOnly = wallidParams.indexOf(".ro") != -1;
    exporting = wallidParams.indexOf(".export") != -1;
    if(exporting === true){
      readOnly = true
    };
    $('#newconnect').hide();
    if(readOnly === true)
    {
      showAsReadOnly();
    }
    else
    {
      // hide the connection warning and show first helper
      $('#superninja').show();
    }
    socket.json.send(
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
      newpost(obj.data.title, obj.data.content, obj.data.author, obj.data.x, obj.data.y, obj.data.guid, obj.data.color)
      if (obj.data.locked == true)
      {
        $('#' + obj.data.guid + ' > .notecontents').hide();
        $('#' + obj.data.guid + ' > .notename').fadeOut();
        $('#' + obj.data.guid + ' > .noteeditoption').fadeOut();
        $('#' + obj.data.guid + ' > .noteeditlocked').fadeIn();
      }
      if(readOnly === true){
        showAsReadOnly();
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
      $('#' + obj.data).hide();
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
      $('#' + obj.data.guid).css({"background-color":obj.data.color});
      
      notearray[obj.data.guid].title = obj.data.title;
      notearray[obj.data.guid].contents = obj.data.content;
      notearray[obj.data.guid].notename = obj.data.author;
      notearray[obj.data.guid].color = obj.data.color;
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
  $('#values').bind('click', function (event){
    if(readOnly !== true && !dragging){ // if we're not inr ead only mode and were not dragging an existing note
      newnote(event, dontshow, false);
    }
  });

  $('.colorBlock').click(function(){
    var pickedColor = $(this).css("background-color");
    editcolor = rgb2hex(pickedColor);
    $('#editpage').css({"background-color":editcolor});
  });

  if(exporting === true){
    // if we're exporting..
    showAsExportable();
  }
});

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
  if (window.console)
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
      if (notearray[note].x > maxNoteX)
      {
        maxNoteX = notearray[note].x;
      }
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
        left: x
      });
    }
  }
}


// Make notes pep

function reset()
{
  if(readOnly !== true)
  {
    $('.note').pep({"constrainToParent":true});
  }
  else{
    showAsReadOnly();
  }
  if(exporting === true){
    // if we're exporting..
    showAsExportable();
  }
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

function newnote(event, dontshow, charCode)
{
  if (dontshow == 0 || charCode == 0)
  {
    errlog("Dont show during function is: " + dontshow);
    // What is the mouse X Y?
    // console.log(event);
    if (currmouseX(event))
    {
      mouseX = event.pageX;
      // console.log(mouseX);
      mouseY = event.pageY;
      // console.log(mouseY);
    }
    else
    {
      mouseX = randomXToY(50, 800);
      mouseY = randomXToY(120, 600);
    }
    if(editcolor){
      $('#editpage').css({"background-color":editcolor});
    }else{
      editcolor = randomNoteColor();
      $('#editpage').css({"backgroundColor":editcolor}); //cake
    }

    // Is this action a misfire AKA is there already a note in this space?
    var noteDoesntAlreadyExists = true;
    $('.note').each(function(){
      // console.log("NOTE");
      var badleft = $(this).css("left"); // how far to the left is this note
      var topHeight = $("#top").css("height"); // the height of the top bar
      /* Most of the code below is really poorly written due to having to hack it to make IE work, it needs a rewrite */
      var badtop = $(this).css("top");
      var topHeight = topHeight.replace("px","");
      var topHeight = parseInt(topHeight);
      var badtop = badtop.replace("px","");
      var badleft = badleft.replace("px","");
      var badHeight = $(this).outerHeight(true);
      var badtop = parseInt(badtop);
      var badleft = parseInt(badleft);
      var badtop = badtop + topHeight;
      var badright = 210 + badleft; 
      var badbottom = badHeight + badtop; 
      // errlog("Badleft is " + badleft + "-- Badright is " + badright + " badtop is " + badtop + " and badbottom is " + badbottom);
      errlog("IF "+mouseX + " IS > "+badleft+ " AND "+mouseX +" IS < " +badright);
      errlog("AND IF "+mouseY + " IS < "+badbottom+ " AND "+mouseY +" IS > " +badtop);
      /* End of really badly written code */
      if (mouseX > badleft && mouseX < badright){
        errlog("x looks good");
        if(mouseY < badbottom && mouseY > badtop){
          // we wont proceed because we are clicking on an already existing note
          noteDoesntAlreadyExists = false;
          errlog("Note already in this space, not continuing with creating new note");
          // we should edit the current note
          if(readOnly !== true)
          {
            editnote(notearray[note].guid);// cake john
          }
        }
      }
    });

    if (noteDoesntAlreadyExists === true)
    {
      // Reset input values to blank as this is a new note
      errlog("Making new note");
      $('#editnotetitle').val("");
      $('#editnotecontents').val("");
      $('#editnoteguid').val("");
      $('#editnotecolor').val("");
      if(userName){ // if a username has been passed as a parameter
        $('#editnotename').val(userName);
      }

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
        $('.note').pep({"constrainToParent":true});
        // Here we need some code that sets a function for when the note has finished being dragged
      }
      else
      {
        // hide the drop down
        if (dropdownmode != 'search' || $('#search').val() == "") $('#extradropdown').hide('slow');
      }
      // make edit page pep
      if(readOnly !== true)
      {
        $('.note').pep({"constrainToParent":true});
        // Make first input box the focus object
        var input = $('#editnotetitle');
        input.focus();
        input.val(''); 
        if(charCode){
          input.val(charCode);
        }
      }
    }
  }
  if(exporting === true){
    // if we're exporting..
    showAsExportable();
  }
}
// delete note

function deleteprompt(noteguid)
{
  dontshow = 1;
  errlog("Dont show before time out is " + dontshow);
  setTimeout("dontshow = 0", 2000);
  errlog("Dont show after timeout is " + dontshow);
  socket.json.send(
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
  socket.json.send(
  {
    type: "unlock",
    "data": noteguid
  });
}

function deletenote(noteguid)
{
  deletefunc(noteguid);
  $('#' + noteguid).hide();
  //Send new Position to the Server
  socket.json.send(
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
  if(readOnly !== true)
  {
    socket.json.send(
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
    var notecolor = notearray[noteguid].color;
    // console.log("NOTECOLOR: "+notecolor);
    $('#editpage').fadeIn();
    $('#editnotetitle').val(notetitle);
    $('#editnotecontents').val(notecontents);
    $('#editnotename').val(notename);
    $('#editnoteguid').val(noteguid);
    $('#editnotecolor').val(notecolor);
    $('#editpage').css({"background-color":notecolor});
  }
}

// get the values from the note creation page

function post()
{
  // get values from input boxes
  var editnotetitle = $('#editnotetitle').val();
  var editnotecontents = $('#editnotecontents').val();
  var editnotename = $('#editnotename').val();
  var editnoteguid = $('#editnoteguid').val();
  var editnotecolor = editcolor;
  if(editnotecontents.length > 200)
  {
    editnotecontents = editnotecontents.substr(0,197) + "...";
  }

  // Is this a new post or a post edit?
  if (editnoteguid)
  {
    errlog("Note Guid is set so we should only edit and not create a new note");
    // We need to update the UI and the array.  First the array
    notearray[editnoteguid].title = editnotetitle;
    notearray[editnoteguid].contents = editnotecontents;
    notearray[editnoteguid].notename = editnotename;
    notearray[editnoteguid].color = editnotecolor;
    errlog(notearray);
    // Now the UI
    $('#' + editnoteguid + ' > .notetitle').html(htmlescape(editnotetitle));
    if(editnotecontents.length == 200){
      $('#' + editnoteguid + ' > .notecontents').html(htmlescape(editnotecontents) + "<b style='color:red'>(Text too long)</b>");
    }
    else{
      $('#' + editnoteguid + ' > .notecontents').html(htmlescape(editnotecontents));
    }
    $('#' + editnoteguid + ' > .notename').html(htmlescape(editnotename));
    $('#' + editnoteguid).css({"background-color":editnotecolor});
    //send to the Server
    errlog("updating server w/ edited contents");
    var data = {
      guid: editnoteguid,
      title: editnotetitle,
      content: editnotecontents,
      author: editnotename,
      color: editnotecolor
    };
    socket.json.send(
    {
      "type": "edit",
      "data": data
    });
    socket.json.send(
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
    newpost(editnotetitle, editnotecontents, editnotename, mouseX, mouseY, false, editcolor);
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

function newpost(editnotetitle, editnotecontents, editnotename, mouseX, mouseY, noteguid, color)
{
  // First a bit of code in so we can debug
  errlog("Edit note title is " + editnotetitle);
  errlog("Edit note contents is " + editnotecontents);
  errlog("Edit note name is " + editnotename);
  errlog("Mouse X is " + mouseX);
  errlog("Mouse Y is " + mouseY);

  if(!color){
    var color = randomNoteColor();
  }

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
      y: mouseY,
      color: color
    };

    socket.json.send(
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
  if(color){
    notearray[noteguid].color = color;
  }
  errlog(notearray);

  // Now lets append the note to the UI
  var notehtmlcont = '<div class="note" id=' + noteguid + ' style="display:none;background-color:'+ color + '">';
  var notehtmltitle = '<div class="notetitle">' + htmlescape(editnotetitle) + '</div>';
  editnotecontents = htmlescape(editnotecontents);
  editnotecontents = urlify(editnotecontents);
  if(editnotecontents.length == 200){
    var notehtmlcontents = '<div class="notecontents">' + editnotecontents + '<b style=\'color:red\'>(Text too long)</b></div>';
  }
  else{
    var notehtmlcontents = '<div class="notecontents">' + editnotecontents + '</div>';
  }
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

  // Remind the UI that all of these objects are pep
  $('#' + noteguid).css("left", mouseX);
  $('#' + noteguid).css("top", mouseY);

  if (resizeTimer) clearTimeout(resizeTimer);
  resizeTimer = setTimeout(scaleNotePositions2Window, 500);
  if(readOnly !== true){
    $('.note').pep(
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
        // set dragging to true, this is a global value to say if we are dragging a new note
        dragging = true;
  
        //errlog({"ui":ui});
        //errlog({"event.target.id":event.target.id});
        // tell teh server to lock teh note
        socket.json.send(
        {
          type: "lock",
          "data": event.target.id
        });
      },
      drag: function (event, ui)
      {
        newY = $(ui.el).offset().top;
        newX = $(ui.el).offset().left;
        noteguid = ui.el.id;
        // Detect if we are near the bin..  If so panic!
        // get x and y co-ordinate of bin.
        var binY = $('#bin').position().top;
        var binX = $('#bin').position().left;
        var noteHeight = $("#"+noteguid).css("height").replace("px",""); // get teh note Height
        noteHeight = parseInt(noteHeight); // Turn a string into an int
        var newYBinDetect = newY +noteHeight; // add the noteheight to the Y coord
        var newXBinDetect = newX +200;
        if(newYBinDetect > binY && newXBinDetect > binX){
           $('#binImage').height("80px");
        }
        else{
          $('#binImage').height("60px");
        }
      },
      rest: function (event, ui)
      {
        newY = $(ui.el).offset().top;
        newX = $(ui.el).offset().left;
        // Now we should update the array with the new X and Y values
        // noteguid should be the div id of the div we just moved
        noteguid = ui.el.id;
        notearray[noteguid].y = Math.round(newY / scale);
        notearray[noteguid].x = Math.round(newX / scale);
        errlog("New drag Y is " + newY);
        errlog("New drag X is " + newX);
        errlog(notearray);
        setTimeout(function(){
          dragging = false; // remove the global reference to dragging true..  we need this so we can create new notes..
        },100);
  
        // Collision detection for Bin
 
        // get x and y co-ordinate of bin.
        var binY = $('#bin').position().top;
        var binX = $('#bin').position().left;

        // Because the note top loeft corner might not actually be in the bin we need to add 100px to the X and 50px to the Y
        var noteHeight = $("#"+noteguid).css("height").replace("px",""); // get teh note Height
        noteHeight = parseInt(noteHeight); // Turn a string into an int

        var newYBinDetect = newY +noteHeight; // add the noteheight to the Y coord
        // There is a bug here, we need to get the actual height of the note, not an assumed height
        var newXBinDetect = newX +200;

        // next we need to know if the new X AND Y are greater than the X and Y of the bin
        /* Leave in for bin debug */
        /*
        console.log("NEW positions");
        console.log("newX:" +newXBinDetect + " AND newY:" +newYBinDetect);
        console.log("BIN positions");
        console.log("binX:" +binX + " AND binY:" +binY);
        */
        /* End of bin debug */

        if(newYBinDetect > binY && newXBinDetect > binX){
          // console.log("im in the bin");
          deletenote(notearray[noteguid].guid);
          $('#binImage').height("60px");
        }
        else
        {
        // we aren't deleting the note we are sending an update

          //Send new Position to the Server
          var data = {
            guid: noteguid,
            x: notearray[noteguid].x,
            y: notearray[noteguid].y
          };
          socket.json.send(
          {
            type: "move",
            "data": data
         });
          socket.json.send(
          {
            type: "unlock",
           "data": noteguid
          });
          $('#transoverlay').fadeOut('slow');
        }
      },
      containment: "#values"
    });
  }
  else{ // if it is readonly
    $('.pencil').addClass('hidden');
  }
  if(exporting === true){
    // if we're exporting..
    showAsExportable();
  }
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

    dropdownvalue = "Search for a note<br><input type='text' id='search' onkeyup='search()' value=" + savestring + "><button type='button' onclick='clearsearch()' id='clearsearch'>x</button>";
    break;
  }
  $('#extradropdown').html(dropdownvalue);
}

function clearsearch()
{
  $('.note').css('opacity', '1');
  $('#search').val('');
  savestring='';
  $('#extradropdown').hide();
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
    socket.json.send(
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
  socket.json.send(
  {
    type: "unlock",
    "data": editnoteguid
  });
}

function begin()
{
  $("body").keypress(function(event){
    if ($('#editpage').is(":visible") || ($('#extradropdown').is(":visible"))){
      errlog("Not displaying new note because new note dialogue is visible");
    }
    else{
      var charCode = String.fromCharCode(event.charCode);
      errlog("Making new note due to new keystroke");
      newnote(event, dontshow, charCode);
    }
  });
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

function getParams()
{
  var params = getUrlVars();
  /* Add more parameter checks here */
  userName = params["userName"];
}

function getUrlVars()
{
  var vars = [], hash;
  var hashes = window.location.href.slice(window.location.href.indexOf('?') + 1).split('&');
  for(var i = 0; i < hashes.length; i++)
  {
    hash = hashes[i].split('=');
    vars.push(hash[0]);
    vars[hash[0]] = hash[1];
  }
  return vars;
}

function showAsExportable(){
  errlog("Showing as exportable");
  $('.note').addClass('readyForExport');
  $('.notetitle').css({"font-size":"24px","width":"800px","background":"#fff"});
  $('.noteeditoption').hide();
  $('#top').hide();
  $('#values').css({"top":"0px"});
  $('body').css({"backgroundImage":"none"});
  $('#footer').hide();
  $('.notecontents').css({"word-wrap":"normal", "width":"800px"});
  $('.notename').css({"width":"800px"});
  $('#users').hide();
  $('.pencil').addClass("hidden");
}

function showAsReadOnly(){
  errlog("Showing as readOnly");
  $('#bin').css({"opacity":"0"});
  $('.pencil').addClass("hidden");
  $('#users').addClass("hidden");
  $('#top').addClass("hidden");
  $('#newnote').addClass("hidden");
  $('#values').css({"top":"0px"});
  $('.noteeditoption').addClass("hidden");
  $('.notetitle').css({"cursor":"default"});
}

function randomNoteColor()
{
  var colors = ["#4CC2E6","#FDDF20","#C6DE6A","#F49BBA"];
  randno = Math.floor ( Math.random() * colors.length );
  return(colors[randno]);
}

var hexDigits = new Array ("0","1","2","3","4","5","6","7","8","9","a","b","c","d","e","f");

//Function to convert hex format to a rgb color
function rgb2hex(rgb) {
  rgb = rgb.match(/^rgb\((\d+),\s*(\d+),\s*(\d+)\)$/);
  return "#" + hex(rgb[1]) + hex(rgb[2]) + hex(rgb[3]);
}

function hex(x) {
  return isNaN(x) ? "00" : hexDigits[(x - x % 16) / 16] + hexDigits[x % 16];
}

function htmlescape(str)
{
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function urlify(text) {
  var urlRegex = /(https?:\/\/[^\s]+)/g;
  return text.replace(urlRegex, function(url) {
    return '<a target="_blank" href="' + url + '">' + url + '</a>';
  })
}
