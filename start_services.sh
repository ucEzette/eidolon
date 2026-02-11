#!/bin/bash
# Start Redis if not running
if ! pgrep -x "redis-server" > /dev/null
then
    echo "Starting Redis..."
    /usr/local/Cellar/redis/8.6.0/bin/redis-server --daemonize yes
else
    echo "Redis is already running."
fi

# Start Receptionist & Monitor
echo "Starting Backend Services..."
cd medium
npm run dev &
BACKEND_PID=$!

echo "Backend PID: $BACKEND_PID"
wait $BACKEND_PID
