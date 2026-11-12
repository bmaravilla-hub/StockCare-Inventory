import os
import pyodbc
from dotenv import load_dotenv

load_dotenv(override=True)


def obtenerConexion():
    servidor = os.getenv("DB_SERVER", r"localhost\MSSQLSERVER01")
    base = os.getenv("DB_NAME", "DB_StockCare")
    driver = os.getenv("DB_DRIVER", "ODBC Driver 18 for SQL Server")

    cadena = (
        f"DRIVER={{{driver}}};"
        f"SERVER={servidor};"
        f"DATABASE={base};"
        "Trusted_Connection=yes;"
        "TrustServerCertificate=yes;"
    )

    try:
        conexion = pyodbc.connect(cadena, timeout=10)
        print("¡Conexión exitosa con StockCare!")
        return conexion

    except Exception as error:
        print("Error al conectar con SQL Server:", error)
        return None