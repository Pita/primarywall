#!/bin/sh

#Stop the script if its started as root
#if [[ $EUID -eq 0 ]]; then
#   echo "Please start it as the user node, NOT ROOT!" 1>&2
#   exit 1
#fi

while [ 1 ]
do
  su -l node -c "/usr/local/bin/node primarywall/server.js >> /var/log/node/wall.log 2>> /var/log/node/wall.err.log"

#  /usr/local/bin/node server.js >> log/wall.log 2>> log/wall.err.log
  sleep 30
# uncomment the below line and add your email address if you want emails on crashes
#  echo "Server was restared at:" $(date) $(tail -n 100 log/wall.err.log) | mail -s "Primarywall Server was restarted" john@primaryt.co.uk
  echo "RESTART!" >> /var/log/node/wall.log
  echo "RESTART!" >> /var/log/node/wall.err.log
done

