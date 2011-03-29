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

$(document).ready(function(){
  //When mouse rolls over
  $("li").mouseover(function(){
    $(this).stop().animate({height:'180px'},{queue:false, duration:600, easing: 'easeOutBounce'})
  });
  //When mouse is removed
  $("li").mouseout(function(){
    $(this).stop().animate({height:'50px'},{queue:false, duration:600, easing: 'easeOutBounce'})
  });
});
