
If you Intending to run the Bash script alone.
```
bash ./natural_protected_areas.sh --env development --url "<downloadable_zip_file_url>" --dburl "<database_url>"
```

Building the Docker Image
```
docker build -t natural_protected_areas:latest .
```
Running the Docker Image using compose.
```
docker-compose run natural_protected_areas \
 --env development \
 --url <downloadable_zip_file_url> \
 --dburl "<database_url>"
```