from dataclasses import dataclass, fields
from typing import Any
from flask.json.provider import DefaultJSONProvider

class _Unset:
    _inst = None
    def __new__(cls):
        if cls._inst is None:
            cls._inst = super().__new__(cls)
        return cls._inst
    def __repr__(self): return "UNSET"
    def __bool__(self): return False

UNSET = _Unset()


def _serialize(v: Any):
    if isinstance(v, DTO):
        return v.to_dict()
    if isinstance(v, (list, tuple)):
        return [_serialize(i) for i in v if i is not UNSET]
    if isinstance(v, dict):
        return {k: _serialize(i) for k, i in v.items() if i is not UNSET}
    return v


@dataclass
class DTO:
    def to_dict(self) -> dict:
        # UNSET fields are skipped; None is kept as null
        return {
            f.name: _serialize(getattr(self, f.name))
            for f in fields(self)
            if getattr(self, f.name) is not UNSET
        }

class DTOJSONProvider(DefaultJSONProvider):
    @staticmethod
    def default(o):
        if isinstance(o, DTO):
            return o.to_dict()
        return DefaultJSONProvider.default(o)