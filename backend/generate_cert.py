import subprocess
import os
from pathlib import Path
import shutil

project_dir = Path(__file__).resolve().parent

config = project_dir / "certs/openssl.cnf"

env = os.environ.copy()
env["OPENSSL_CONF"] = str(config)

print("Generating private key")
subprocess.run(["openssl", "genrsa", "-des3", "-out", str(project_dir / "certs/server.key"), "3072"], env=env)

print("Generating CSR")
subprocess.run(["openssl", "req", "-new", "-key", str(project_dir / "certs/server.key"), "-out", str(project_dir / "certs/server.csr")], env=env)

print("Removing passphrase from key")
shutil.copy(str(project_dir / "certs/server.key"), str(project_dir / "certs/server.key.org"))
subprocess.run(["openssl", "rsa", "-in", str(project_dir / "certs/server.key.org"), "-out", str(project_dir / "certs/server.key")], env=env)

print("Generating self signed certificate")
subprocess.run(["openssl", "x509", "-req", "-days", "365", "-in", str(project_dir / "certs/server.csr"), "-signkey", str(project_dir / "certs/server.key"), "-out", str(project_dir / "certs/server.crt")], env=env)
