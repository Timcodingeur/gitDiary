cd ../database
docker build -t db:v1.0.0 .
cd ..
docker run --name db -d -p 3306:3306 db:v1.0.0
