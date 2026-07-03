#!/bin/bash
npx concurrently -n "server,client" -c "blue,green" "npm run dev:server" "npm run dev:client"
