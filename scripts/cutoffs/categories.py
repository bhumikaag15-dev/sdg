"""Decode CET Cell seat-category codes, e.g. GOPENS, LOBCH, PWDROBCS, TFWS."""
import re
BASES = ["OPEN", "SC", "ST", "VJ", "NT1", "NT2", "NT3", "OBC", "SEBC"]
SCOPE = {"S": "STATE", "H": "HOME_UNIVERSITY", "O": "OTHER_THAN_HOME_UNIVERSITY"}

def decode(code):
    m = re.fullmatch(r"([GL])(OPEN|SC|ST|VJ|NT1|NT2|NT3|OBC|SEBC)([SHO])", code)
    if m:
        return dict(kind="GENERAL", gender="FEMALE_ONLY" if m[1] == "L" else "ANY", base=m[2], scope=SCOPE[m[3]])
    m = re.fullmatch(r"(PWD|DEF)(R?)(OPEN|SC|ST|VJ|NT1|NT2|NT3|OBC|SEBC)([SHO])", code)
    if m:
        return dict(kind="PWD" if m[1] == "PWD" else "DEFENCE", gender="ANY", base=m[3], scope=SCOPE[m[4]])
    if code in ("TFWS", "EWS", "ORPHAN", "MI"):
        return dict(kind=code, gender="ANY", base=None, scope=None)
    return dict(kind="OTHER", gender="ANY", base=None, scope=None)
