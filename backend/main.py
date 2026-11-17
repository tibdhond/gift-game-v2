from typing import Any

from flask import Flask, Response, current_app, make_response, request, send_from_directory, g
from werkzeug.datastructures import FileStorage
from flask_cors import CORS, cross_origin

import os
from pathlib import Path

from models.dto import DTO, DTOJSONProvider
from models.claim import Claim, ClaimDTO, ClaimState
from models.game import Game
from models.user import User, UserDTO

from util.auth import set_auth_cookie
from util.routing_utils import make_error, user_does_not_exist, game_does_not_exist
from controllers.auth_controller import auth_required

import controllers.shared_controller as shared
import controllers.client_controller as client
import controllers.host_controller as host

from entities.exceptions import *
from random import choice

class MyFlask(Flask):
    json_provider_class = DTOJSONProvider
    def make_response(self, rv):
        status = headers = None
        if isinstance(rv, tuple) and rv and isinstance(rv[0], DTO):
            # support (dto, status) / (dto, status, headers) / (dto, headers)
            rv, *rest = rv
            for r in rest:
                if isinstance(r, int): status = r
                else: headers = r
        if isinstance(rv, DTO):
            resp = self.json.response(rv.to_dict())
            if status: resp.status_code = status
            if headers: resp.headers.update(headers)
            return resp
        return super().make_response(rv)

app = MyFlask(__name__, static_folder="static/frontend")
app.config['CORS_HEADERS'] = 'Content-Type'
app.config['CORS_ALLOW_HEADERS'] = '*'
app.config['CORS_METHODS'] = ['GET', 'POST', 'DELETE']
CORS(app, resources={r"/*": {"origins": "*", "allow_headers": "content-type", "expose_headers": "*"}})


ROOT_PATH = Path(app.root_path) / "static" / "frontend"

# region shared 
@app.route('/', methods=["GET"])
@app.route('/<path:path>', methods=["GET"])
def index(path:str=""):
    requested_file = ROOT_PATH / path
    if path != "" and requested_file.exists():
        return send_from_directory(ROOT_PATH, path)

    # Otherwise, return index.html for Angular routing
    return send_from_directory(ROOT_PATH, "index.html")

@app.route('/api/gif', methods=['Get'])
def get_gif():
    ROOT_PATH = Path(current_app.root_path)
    file = choice(os.listdir(f'{ROOT_PATH}/static/images'))
    return send_from_directory(f'{ROOT_PATH}/static/images', file)

@app.route('/api/frontend-assets/<path:path>', methods=['GET'])
def get_frontend_assets(path: str=""):
    ROOT_PATH: Path = Path(current_app.root_path)
    BASE_DIR: str = f'{ROOT_PATH}/static/frontend/assets'
    
    requested_file = path
    if (path != "" and os.path.exists(f'{BASE_DIR}/{requested_file}')):
        return send_from_directory(BASE_DIR, requested_file)

    return make_response({"errCode": "File not found"}, 404)

@app.route('/api/new-game', methods=['POST'])
def new_game():
    game: Game = shared.new_game()

    resp = make_response({ "game_id": game.id }, 201)
    return set_auth_cookie(resp, f"host_{game.id}", game.host_token)

@app.route('/api/<string:game_id>', methods=['HEAD'])
def game_exists(game_id: str):
    if shared.game_exists(game_id):
        return make_response('', 200)
    return game_does_not_exist()

@app.route('/api/ip', methods=['GET'])
def get_ip():
    ip = shared.get_local_ip()
    response = make_response([ip])
    response.headers["Content-Type"] = "text/plain"
    return response


@app.route('/api/<string:game_id>/players/<string:user_id>/avatar', methods=['GET'])
@auth_required("host", "player")
def get_avatar(game_id: str, user_id: str):
    ROOT_PATH = Path(current_app.root_path)

    player: User | None = g.player
    
    if user_id == "me":
        if player is None:
            return make_error(errCode="EBadRequest", message="Host cannot request personal avatar", status=400)
        user_id = player.get_id()

    if os.path.isfile(f'{ROOT_PATH}/static/avatars/{game_id}/{user_id}.jpg'):
        return send_from_directory(f'{ROOT_PATH}/static/avatars/{game_id}', f'{user_id}.jpg')
    else:
        return make_response("User does not have an avatar", 404)

@app.route('/api/<string:game_id>/players', methods=['GET'])
@auth_required("host", "player")
def get_players():
    try:
        filtered = request.args.get('filtered')
        players = shared.get_players(True if filtered is not None else False)
        return make_response({"players": players})
    except InvalidGameException:
        return game_does_not_exist()

# endregion

# region host

@app.route('/api/<string:game_id>/token', methods=['GET'])
def get_host_token(game_id: str):
    try:
        game: Game = shared.assign_host_token(game_id)

        resp = make_response({ "game_id": game.id }, 201)
        return set_auth_cookie(resp, f"host_{game.id}", game.host_token)
    except GameHasHostException:
        make_error(errCode="EGameHasHost", message="This game already has a host", status=403)


@app.route('/api/<string:game_id>/players/<string:user_id>', methods=['DELETE'])
@auth_required("host")
def delete_player(user_id: str):
    try:
        host.delete_player(user_id)
        return make_response("", 204)
    except Exception as e:
        print(e)
        return make_response(e, 404)
    
@app.route('/api/<string:game_id>/round', methods=['POST'])
@auth_required("host")
def new_round():
    try:
        host.new_round()
        return make_response('', 201)
    except InvalidRoundException as e:
        return make_response(errCode="InvalidRound", message="You cannot start a new round while the current round is invalid. Reset the round to continue.", status=403)
    except OngoingRoundException as e:
        return make_error(errCode="ERoundOngoing", message="You cannot start a new round while the current round is underway. Finish the round to continue.", status=403)
    except Exception as e:
        print(e)
        return make_response(e, 400)
    
@app.route('/api/<string:game_id>/round/progress', methods=['GET'])
@auth_required("host")
def round_progress():
    return make_response(host.get_round_progress(), 200)

@app.route('/api/<string:game_id>/round/reset', methods=['POST'])
@auth_required("host")
def reset_round():
    host.reset_round()
    return make_response("", 204)

@app.route('/api/<string:game_id>/round/result', methods=["GET"])
@auth_required("host")
def round_result():
    try:
        result: dict[str, Any] = host.get_round_result()
        return make_response(result, 200)
    except InvalidRoundException as e:
        return make_error(errCode="EInvalidRound", message="You cannot start a new round while the current round is invalid. Reset the round to continue.", status=403)
    except OngoingRoundException as e:
        return make_error(errCode="ERoundOngoing", message="You cannot start a new round while the current round is underway. Finish the round to continue.", status=403)
    except Exception as e:
        print(e)
        return make_response(e, 400)
    
@app.route('/api/<string:game_id>/phase', methods=["GET"])
@auth_required("host")
def get_game_phase():
    return make_response(host.get_game_phase(), 200)

@app.route('/api/<string:game_id>/result', methods=["GET"])
@auth_required("host")
def get_game_result():
    return make_response(host.get_result(), 200)

@app.route('/api/<string:game_id>/round/assign', methods=["POST"])
@auth_required("host")
def assign_gift():
    result: bool = host.assign_gift()
    return make_response({"result": result}, 201)

@app.route('/api/<string:game_id>/claims', methods=["GET"])
@auth_required("host")
def get_claims():
    claims: list[ClaimDTO] = host.get_claims()
    
    return make_response({"claims": claims}, 200)

@app.route('/api/<string:game_id>/claims/<string:claim_id>/resolve', methods=["POST"])
@auth_required("host")
def resolve_claim(claim_id: str):
    result = request.get_json()
    claim_state_str: str = result["claimState"].lower() if result["claimState"] else "*NO STATE PROVIDED*"
    if claim_state_str == ClaimState.APPROVED.name.lower():
        claim_state: ClaimState = ClaimState.APPROVED
    elif claim_state_str == ClaimState.DENIED.name.lower():
        claim_state: ClaimState = ClaimState.DENIED
    else:
        err_message: str = f"Must either APPROVE or DENY claim. Got: {claim_state_str}"
        return make_error(errCode="EBadRequest", message=err_message, status=400)


    claim: ClaimDTO = host.resolve_claim(claim_id=claim_id, claim_state=claim_state)
    
    return make_response(claim, 200) 

# endregion

# region client
@cross_origin(origin='*',headers=['Content-Type','Authorization'])
@app.route('/api/<string:game_id>/login', methods=['POST'])
def login(game_id: str):
    result = request.get_json()
    name: str | None = result["name"].strip() if result["name"] else None

    if name is None or name == "":
        return make_error(errCode="EBadRequest", message="Name must be provided", status=400)

    try:
        user: User = client.login(game_id, name)
        resp: Response = make_response(UserDTO.from_model(user, "player", True), 201)
        return set_auth_cookie(resp, f"player_{game_id}", user.token)
    except UserExistsException:
        return make_error(errCode="EUserExists", message="Username already in use", status=409)

@app.route('/api/<string:game_id>/logout', methods=['POST'])
@auth_required("player")
def logout():
    user: User = g.player
    client.logout(user.get_id())

    game: Game = g.game

    resp = make_response({}, 201)
    resp.delete_cookie(f"player_{game.id}", path=f"/")
        

@app.route('/api/<string:game_id>/vote', methods=['POST'])
@auth_required("player")
def vote():
    result = request.get_json()
    player: User = g.player
    target_id: str = result["target_id"]

    try:
        client.vote(player.get_id(), target_id)
        return make_response("", 201)
    except Exception as e:
        print(e)
        return make_response(e, 400)

@app.route('/api/<string:game_id>/players/<string:user_id>', methods=["GET"])
@auth_required("player")
def get_user_info(user_id: str):
    player: User = g.player
    
    if user_id == "me":
        user_id = player.get_id()
    if user_id == player.get_id():
        return client.get_user_info(player.get_id())
    if user_id == "":
        raise BadRequestException
    return user_does_not_exist()

@app.route('/api/<string:game_id>/players/<string:user_id>/phase', methods=["GET"])
@auth_required("player")
def get_user_phase(user_id: str):
    player: User = g.player

    if user_id == "me":
        user_id = player.get_id()
    if user_id == player.get_id():
        return client.get_user_phase(user_id)
    return user_does_not_exist()

@app.route('/api/<string:game_id>/gifts', methods=['POST'])
@auth_required("player")
def add_gift():
    result = request.get_json()
    player: User = g.player
    description: str = result["description"]

    try:
        client.add_gift(player.get_id(), description)
        return make_response("", 201)
    except GiftCreationException as e:
        return make_error(errCode="EGiftCreationError", message="You are not allowed to create a gift at this time", status=403)
    except Exception as e:
        print(e)
        return make_response(e, 400)

@app.route('/api/<string:game_id>/players/<string:user_id>/result', methods=["GET"])
@auth_required("player")
def get_user_result(game_id: str, user_id: str):
    player: User = g.player
    
    if user_id == "me":
        user_id = player.get_id()
    if user_id == player.get_id():
        return make_response(client.get_result(game_id, user_id), 200)
    return user_does_not_exist()


@app.route('/api/<string:game_id>/players/<string:user_id>/avatar', methods=['POST'])
@auth_required("player")
def upload_avatar(user_id: str):
    player: User = g.player

    if user_id == "me":
        user_id = player.get_id()
    if user_id != player.get_id():
        return user_does_not_exist()
    file: FileStorage | None = request.files.get('avatar')

    if not file:
        return make_response({"errCode": "NoFile", "msg": "No avatar file provided"}, 400)
    
    try:
        client.upload_avatar(player.get_id(), file)
        return make_response("", 201)
    except Exception as e:
        print(e)
        return make_error(errCode="UploadError", messgage="Something went wrong while uploading the image", status=500)

@app.route('/api/<string:game_id>/claims', methods=['POST'])
def make_claim(game_id: str):
    result = request.get_json()
    name: str = result["name"]

    try:
        claim: Claim = client.make_claim(game_id, name)
        resp: Response = make_response(ClaimDTO.from_model(claim), 201)
        resp = set_auth_cookie(resp, f"claim_id_{game_id}", claim.get_id())
        return set_auth_cookie(resp, f"claimant_{game_id}", claim.get_token())
    except ClaimInProgressException:
        return make_error(errCode="EClaimInProgres", message="A claim for this username is already being handled", status=409)

@app.route('/api/<string:game_id>/claims/<string:claim_id>', methods=['GET'])
@auth_required("claimant")
def get_claim(claim_id: str):
    try:
        if claim_id == "me":
            claim_id = request.cookies.get(f"claim_id_{g.game.id}", "")
        if claim_id == "":
            raise BadRequestException

        claim: ClaimDTO = client.get_claim(claim_id)
        return make_response(claim, 200)
    except InvalidClaimException:
        return make_error(errCode="EInvalidClaim", message="No claim with this id exists", status=404)
    except BadRequestException:
        return make_error(errCode="EBadRequest", message="Invalid claim id", status=400)

@app.route('/api/<string:game_id>/claims/<string:claim_id>/redeem', methods=['POST'])
@auth_required("claimant")
def redeem_claim(claim_id: str):
    game: Game = g.game
    game_id: str = game.id
    try:
        if claim_id == "me":
            claim_id = request.cookies.get(f"claim_id_{game_id}", "")
        if claim_id == "":
            return make_error(errCode="EBadRequest", message="ClaimId was empty", status=400)
        user: User = client.redeem_claim(claim_id)

        resp: Response = make_response(UserDTO.from_model(user, g.role, True), 200)
        resp.delete_cookie(f"claimant_{game_id}")
        resp.delete_cookie(f"claim_id_{game_id}")
        return set_auth_cookie(resp, f"player_{game_id}", user.token)
    except InvalidClaimException:
        return make_error(errCode="EInvalidClaim", message="No claim with this id exists", status=404)

@app.after_request
def apply_global_headers(response):
    response.headers["Access-Control-Allow-Origin"] = "*"
    response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization')
    response.headers.add('Access-Control-Allow-Methods', 'GET,POST,DELETE')
    return response

# endregion


if __name__  == '__main__':
    app.run(host="0.0.0.0")