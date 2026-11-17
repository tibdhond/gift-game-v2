import secrets
import hmac


def new_token() -> str:
    return secrets.token_urlsafe(16)   # 128 bits of randomness

def tokens_match(expected: str | None, given: str) -> bool:
    return bool(expected) and hmac.compare_digest(expected, given)

def set_auth_cookie(resp, name: str, token: str):
    resp.set_cookie(name, token, httponly=True, samesite="Lax",
                    max_age=60 * 60 * 24 * 7, path="/")
    return resp