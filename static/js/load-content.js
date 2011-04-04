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

function loadcontent(url)
{
  $("#content").empty().html('<div id="contentholder"><center><img src="/static/loading.gif" /></center></div>');
  if (url.search("http") !=-1){
    // Load into iframe
  $('#content').html('<iframe src='+url+' width=780 height=600 frameBorder=0></iframe>');
  }
  else{
  var prefix='<div id="contentholder">';
  var suffix='</div>';
  $.ajax({
    url: url,
    success: function(data){
    $('#content').html(prefix + data +suffix);
    }
  });
  }
}
