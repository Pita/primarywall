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
