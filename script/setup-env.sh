#!/bin/bash
#
# ------------------------------------------------------------------
# Quentin Métroz setup-env.sh
# ------------------------------------------------------------------
# Description:
# This script sets up the environment variables for the database
# connection by writing them to a .env file.
#
# Usage:
# ./setup-env.sh DB_USER DB_PASSWORD DB_HOST DB_PORT DB_NAME
#
# Parameters:
# DB_USER      - The database user
# DB_PASSWORD  - The database password
# DB_HOST      - The database host
# DB_PORT      - The database port
# DB_NAME      - The database name
# ------------------------------------------------------------------

if [ "$#" -ne 5 ]; then
    echo "Usage: $0 DB_USER DB_PASSWORD DB_HOST DB_PORT DB_NAME"
    exit 1
fi

echo -e "DB_USER=$1\nDB_PASSWORD=$2\nDB_HOST=$3\nDB_PORT=$4\nDB_NAME=$5\n" > .env
echo ".env file created successfully."
