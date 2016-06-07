
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

Right now the MTO js library is poorly integrated, need to manually run webpack and move generated
bundle to static directory for python server. Look into
[webpack plugin for flask][https://github.com/nickjj/flask-webpack] to simplify this process if
possible.

```bash
bower install
pushd bower_components/mto && webpack && cp build/MTO.js ../../static/ && popd
```

## Run Server

```bash
FLASK_APP=aiur.py flask run --host 0.0.0.0

# if FLASK_APP is already set you can omit the declaration
flask run --host 0.0.0.0
```
