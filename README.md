
# Aiur

Based off [flaskr tutorial][http://flask.pocoo.org/docs/0.11/tutorial/introduction/]

## Setup

```bash
virtualenv -p python3 VENV
source VENV/bin/activate
pip install Flask
FLASK_APP=aiur.py
FLASK_DEBUG=1
flask initdb
```

## Run Server

```bash
FLASK_APP=aiur.py flask run --host 0.0.0.0

# if FLASK_APP is already set you can omit the declaration
flask run --host 0.0.0.0
```
