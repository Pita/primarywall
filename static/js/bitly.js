// Bitlyify the current URL

function bitly(url)
{
  // set up default options
  var defaults = {
    version: '2.0.1',
    login: 'loginname',
    apiKey: 'api_key',
    history: '0',
    longUrl: url
  };

  if(defaults.login == "loginname")
  {
    alert("You didn't set any bit.ly key!'");
    return;
  }

  // Build the URL to query
  var daurl = "http://api.bit.ly/shorten?" + "version=" + defaults.version + "&longUrl=" + defaults.longUrl + "&login=" + defaults.login + "&apiKey=" + defaults.apiKey + "&history=" + defaults.history + "&format=json&callback=?";

  // Utilize the bit.ly API
  $.getJSON(daurl, function (data)
  {

    // Make a good use of short URL
    $('#extradropdown').html('Copy and paste the below link to share this wall<br><input type=text class=biglink value=' + data.results[url].shortUrl + '>');
  });
}
