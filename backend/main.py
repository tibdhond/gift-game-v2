from flask import Flask, render_template, make_response, request, send_from_directory
from flask_cors import CORS, cross_origin
import os

import controllers.shared_controller as shared
import controllers.client_controller as client
import controllers.host_controller as host

from entities.exceptions import *
from random import choice

app = Flask(__name__)
app.config['CORS_HEADERS'] = 'Content-Type'
app.config['CORS_ALLOW_HEADERS'] = '*'
app.config['CORS_METHODS'] = ['GET', 'POST', 'DELETE']
CORS(app, resources={r"/*": {"origins": "*", "allow_headers": "content-type", "expose_headers": "*"}})

# region shared 
@app.route('/', methods=["GET"])
@app.route('/game/', methods=["GET"])
@app.route('/game/<path:file_path>', methods=["GET"])
def index(file_path=None):
    if file_path:
        if os.path.exists(f"static/{file_path}"):
            return send_from_directory("static", file_path)

    return render_template('index.html')

@app.route('/api/gif', methods=['Get'])
def get_gif():
    return send_from_directory('static/images', choice(os.listdir('static/images')))


@app.route('/api/new-game', methods=['POST'])
def new_game():
    game_id = shared.new_game()
    return make_response({ "game_id": game_id }, 201)

# endregion

# region host

@app.route('/api/<string:game_id>/players', methods=['GET'])
def get_players(game_id: str):
    players = shared.get_players(game_id)
    return make_response({"players": players})

@app.route('/api/<string:game_id>/players/<string:user_id>', methods=['DELETE'])
def delete_player(game_id: str, user_id: str):
    try:
        host.delete_player(game_id, user_id)
        return make_response("", 204)
    except Exception as e:
        print(e)
        return make_response(e, 404)
    
@app.route('/api/<string:game_id>/round', methods=['POST'])
def new_round(game_id: str):
    try:
        host.new_round(game_id)
        return make_response('', 201)
    except InvalidRoundException as e:
        return make_response({"errCode": "InvalidRound", "msg": "You cannot start a new round while the current round is invalid. Reset the round to continue."}, 403)
    except OngoingRoundException as e:
        return make_response({"errCode": "RoundOngoing", "msg": "You cannot start a new round while the current round is underway. Finish the round to continue."}, 403)
    except Exception as e:
        print(e)
        return make_response(e, 400)
    
@app.route('/api/<string:game_id>/round/progress', methods=['GET'])
def round_progress(game_id: str):
    return make_response(host.get_round_progress(game_id), 200)

@app.route('/api/<string:game_id>/round/reset', methods=['POST'])
def reset_round(game_id: str):
    host.reset_round(game_id)
    return make_response("", 204)

@app.route('/api/<string:game_id>/round/result', methods=["GET"])
def round_result(game_id: str):
    try:
        result: dict = host.get_round_result(game_id)
        return make_response(result, 200)
    except InvalidRoundException as e:
        return make_response({"errCode": "InvalidRound", "msg": "You cannot start a new round while the current round is invalid. Reset the round to continue."}, 403)
    except OngoingRoundException as e:
        return make_response({"errCode": "RoundOngoing", "msg": "You cannot start a new round while the current round is underway. Finish the round to continue."}, 403)
    except Exception as e:
        print(e)
        return make_response(e, 400)
    
@app.route('/api/<string:game_id>/phase', methods=["GET"])
def get_game_phase(game_id: str):
    return make_response(host.get_game_phase(game_id), 200)

@app.route('/api/<string:game_id>/result', methods=["GET"])
def get_game_result(game_id: str):
    return make_response(host.get_result(game_id), 200)

# endregion

# region client
@cross_origin(origin='*',headers=['Content- Type','Authorization'])
@app.route('/api/<string:game_id>/login', methods=['POST'])
def login(game_id: str):
    result = request.get_json()
    name: str = result["name"]

    user_id: str = client.login(game_id, name)
    return make_response({"user_id": user_id}, 201)

@app.route('/api/<string:game_id>/vote', methods=['POST'])
def vote(game_id: str):
    result = request.get_json()
    voter_id: str = result["voter_id"]
    target_id: str = result["target_id"]

    try:
        client.vote(game_id, voter_id, target_id)
        return make_response("", 201)
    except Exception as e:
        print(e)
        return make_response(e, 400)

@app.route('/api/<string:game_id>/players/<string:user_id>/phase', methods=["GET"])
def get_user_phase(game_id: str, user_id: str):
    return client.get_user_phase(game_id, user_id)

@app.route('/api/<string:game_id>/gifts', methods=['POST'])
def add_gift(game_id: str):
    result = request.get_json()
    user_id: str = result["user_id"]
    description: str = result["description"]

    try:
        client.add_gift(game_id, user_id, description)
        return make_response("", 201)
    except GiftCreationException as e:
        return make_response({"errCode": "GiftCreationError", "msg": "You are not allowed to create a gift at this time"}, 403)
    except Exception as e:
        print(e)
        return make_response(e, 400)
    
@app.route('/api/<string:game_id>/round/assign', methods=["POST"])
def assign_gift(game_id: str):
    host.assign_gift(game_id)
    return make_response("", 201)

@app.route('/api/<string:game_id>/players/<string:user_id>/result', methods=["GET"])
def get_user_result(game_id: str, user_id: str):
    return make_response(client.get_result(game_id, user_id), 200)

@app.after_request
def apply_global_headers(response):
    response.headers["Access-Control-Allow-Origin"] = "*"
    response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization')
    response.headers.add('Access-Control-Allow-Methods', 'GET,POST,DELETE')
    return response

# endregion


if __name__  == '__main__':
    app.run(host="0.0.0.0")

