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
