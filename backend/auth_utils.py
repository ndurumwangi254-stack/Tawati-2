import os
import functools

import jwt
from flask import request, jsonify, g

JWT_ALGORITHM = "HS256"
JWT_EXPIRY_HOURS = 12


def make_token(payload):
    return jwt.encode(
        {**payload, "exp": _expiry()},
        os.environ["JWT_SECRET"],
        algorithm=JWT_ALGORITHM,
    )


def _expiry():
    import datetime

    return datetime.datetime.utcnow() + datetime.timedelta(hours=JWT_EXPIRY_HOURS)


def require_auth(fn):
    @functools.wraps(fn)
    def wrapper(*args, **kwargs):
        header = request.headers.get("Authorization", "")
        token = header[7:] if header.startswith("Bearer ") else None
        if not token:
            return jsonify({"error": "Missing or invalid Authorization header"}), 401
        try:
            payload = jwt.decode(token, os.environ["JWT_SECRET"], algorithms=[JWT_ALGORITHM])
        except jwt.PyJWTError:
            return jsonify({"error": "Invalid or expired token"}), 401
        # Drop JWT's own "exp" claim before exposing the payload as the
        # user object elsewhere — it's not part of the user record.
        payload.pop("exp", None)
        g.user = payload
        return fn(*args, **kwargs)

    return wrapper


def require_owner(fn):
    @functools.wraps(fn)
    def wrapper(*args, **kwargs):
        if g.user.get("role") != "owner":
            return jsonify({"error": "Owner access only"}), 403
        return fn(*args, **kwargs)

    return wrapper
