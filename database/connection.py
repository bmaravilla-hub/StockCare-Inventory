#Conexión a SQL Server para StockCare

import os
import struct

import pyodbc
from dotenv import load_dotenv

load_dotenv()


def _es_wsl() -> bool:
    #Indica si el proceso se ejecuta dentro de WSL
    if os.environ.get("WSL_DISTRO_NAME"):
        return True

    try:
        with open("/proc/version", encoding="utf-8") as archivo:
            return "microsoft" in archivo.read().lower()
    except OSError:
        return False


def _host_wsl() -> str | None:
    #Devuelve el gateway de WSL que normalmente es el host de Windows
    try:
        with open("/proc/net/route", encoding="utf-8") as archivo:
            for linea in archivo.readlines()[1:]:
                campos = linea.split()
                if len(campos) > 2 and campos[1] == "00000000":
                    return ".".join(
                        str(byte) for byte in struct.pack("<L", int(campos[2], 16))
                    )
    except (OSError, ValueError, IndexError):
        pass

    return None


def _servidor_por_defecto() -> str:
    
    if _es_wsl():
        host = _host_wsl()
        if host:
            return host

    return "127.0.0.1"


def obtenerConexion():
    #Abre una conexión a SQL Server usando autenticación SQL
    servidor = os.getenv("DB_SERVER", "").strip() or _servidor_por_defecto()
    puerto = os.getenv("DB_PORT", "1433").strip()
    base = os.getenv("DB_NAME", "DB_StockCare").strip()
    usuario = os.getenv("DB_USER", "").strip()
    clave = os.getenv("DB_PASSWORD", "")
    driver = os.getenv("DB_DRIVER", "ODBC Driver 18 for SQL Server").strip()
    encrypt = os.getenv("DB_ENCRYPT", "yes").strip()
    trust = os.getenv("DB_TRUST_SERVER_CERTIFICATE", "yes").strip()

    if not usuario or not clave:
        print(
            "Error: DB_USER y DB_PASSWORD son obligatorios. "
            "La conexion solo admite autenticacion de SQL Server."
        )
        return None

    if "," not in servidor:
        servidor = f"{servidor},{puerto}"

    cadena = (
        f"DRIVER={{{driver}}};"
        f"SERVER={servidor};"
        f"DATABASE={base};"
        f"UID={usuario};PWD={clave};"
        f"Encrypt={encrypt};"
        f"TrustServerCertificate={trust};"
    )

    try:
        return pyodbc.connect(cadena, timeout=10)
    except Exception as e:
        print(f"Error en la conexion a la base de datos: {e}")
        return None
