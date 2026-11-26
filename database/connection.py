import os
import pyodbc
from dotenv import load_dotenv

load_dotenv(override=True)


def obtenerConexion():
    servidor = os.getenv("DB_SERVER", r"localhost\MSSQLSERVER01")
    puerto = os.getenv("DB_PORT", "1433")
    base = os.getenv("DB_NAME", "DB_StockCare")
    driver = os.getenv("DB_DRIVER", "ODBC Driver 18 for SQL Server")
    usuario = os.getenv("DB_USER")
    password = os.getenv("DB_PASSWORD")
    encrypt = os.getenv("DB_ENCRYPT", "yes")
    trust_cert = os.getenv("DB_TRUST_SERVER_CERTIFICATE", "yes")

    if not usuario or not password:
        print("Error: Faltan DB_USER o DB_PASSWORD en las variables de entorno.")
        return None

    cadena = (
        f"DRIVER={{{driver}}};"
        f"SERVER={servidor},{puerto};"
        f"DATABASE={base};"
        f"UID={usuario};"
        f"PWD={password};"
        f"Encrypt={encrypt};"
        f"TrustServerCertificate={trust_cert};"
    )

    try:
        conexion = pyodbc.connect(cadena, timeout=10)
        print("¡Conexión exitosa con StockCare!")
        return conexion

    except Exception as error:
        print("Error al conectar con SQL Server:", error)
        return None
