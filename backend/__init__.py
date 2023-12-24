from flask import Flask
from flask_sqlalchemy import SQLAlchemy

db = SQLAlchemy()


def create_app() -> Flask:
    app = Flask(__name__)

    app.config['SECRET_KEY'] = b'\xb0\x04\x1e\xb3\xdeN\xb3\xb9V\xec\x1f\xc1'
    app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///db.sqlite'

    db.init_app(app)

    # blueprint for auth routes in our app
    from .auth import auth as auth_blueprint
    app.register_blueprint(auth_blueprint)

    # blueprint for non-auth parts of app
    from .main import app as main_blueprint
    app.register_blueprint(main_blueprint)

    return app


db.create_all(app=create_app())
