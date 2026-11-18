from flask import Response, make_response


def user_does_not_exist() -> Response:
    return make_error(errCode="EUserNotExist", message="User does not exist", status=404)

def game_does_not_exist() -> Response:
    return make_error(errCode="EInvalidGame", message="This game does not exist", status=404)

def make_error(errCode: str, message: str, status: int) -> Response:
    return make_response({"errCode": errCode, "msg": message}, status)