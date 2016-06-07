# all the imports
import os
import sqlite3
import json, hashlib
from flask import Flask, request, session, g, redirect, url_for, abort, render_template, flash

# create our little application :)
app = Flask(__name__)
app.config.from_object(__name__)

# Load default config and override config from an environment variable
app.config.update(dict(
    DATABASE=os.path.join(app.root_path, 'flaskr.db'),
    SECRET_KEY='development key',
    USERNAME='admin',
    PASSWORD='default'
))
app.config.from_envvar('FLASKR_SETTINGS', silent=True)

def connect_db():
    """Connects to the specific database."""
    rv = sqlite3.connect(app.config['DATABASE'])
    rv.row_factory = sqlite3.Row
    return rv

def get_db():
    """Opens a new database connection if there is none yet for the
    current application context.
    """
    if not hasattr(g, 'sqlite_db'):
        g.sqlite_db = connect_db()
    return g.sqlite_db

@app.teardown_appcontext
def close_db(error):
    """Closes the database again at the end of the request."""
    if hasattr(g, 'sqlite_db'):
        g.sqlite_db.close()

def init_db():
    db = get_db()
    with app.open_resource('schema.sql', mode='r') as f:
        db.cursor().executescript(f.read())
    db.commit()

@app.cli.command('initdb')
def initdb_command():
    """Initializes the database."""
    init_db()
    print("Initialized the database")

@app.route('/')
def show_charm_defs():
    db = get_db()
    cur = db.execute('select bucket, refType, key, version, hash from cloud_reference order by id desc')
    charmDefs = cur.fetchall()
    return render_template('show_charm_defs.html', entries=charmDefs)

@app.route('/charmdef', methods=['POST'])
def add_charm_definition():
    if not session.get('logged_in'):
        abort(401)
    db = get_db()

    bucket = request.form['bucket']
    refType = request.form['refType']
    key = request.form['key']
    version = request.form['version']

    width = request.form['width']
    height = request.form['height']
    anchorString = request.form['anchors']

    charmDef = {}
    charmDef['width'] = width
    charmDef['height'] = height
    charmDef['anchors'] = json.loads(anchorString)

    # TODO: upload file to bucket
    definitionJSON = json.dumps(charmDef)
    def_hash = hashlib.sha224(definitionJSON.encode('utf-8')).hexdigest()

    db.execute('insert into cloud_reference (bucket, refType, key, version, hash) values (?, ?, ?, ?, ?)',
                 [bucket, refType, key, version, def_hash])
    db.commit()
    return redirect(url_for('show_charm_defs'))

@app.route('/login', methods=['GET', 'POST'])
def login():
    error = None
    if request.method == 'POST':
        if request.form['username'] != app.config['USERNAME']:
            error = 'Invalid username'
        elif request.form['password'] != app.config['PASSWORD']:
            error = 'Invalid password'
        else:
            session['logged_in'] = True
            flash('You were logged in')
            return redirect(url_for('show_charm_defs'))
    return render_template('login.html', error=error)

@app.route('/logout')
def logout():
    session.pop('logged_in', None)
    flash('You were logged out')
    return redirect(url_for('show_charm_defs'))
