from flask import Flask, jsonify, request
from flask_cors import CORS  # Para que React pueda conectarse sin bloqueos CORS

from dao.inventory_dao import (
    obtener_inventario,
    registrar_entrada as registrar_entrada_dao,
)

app = Flask(__name__)
CORS(app)  # Se habilita CORS para las peticiones de REACT


@app.route("/api/inventario", methods=["GET"])
def get_inventario():
    try:
        return jsonify(obtener_inventario())
    except ConnectionError as e:
        return jsonify({"error": str(e)}), 503
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/entradas", methods=["POST"])
def registrar_entrada():
    data = request.get_json(silent=True)
    if not isinstance(data, dict):
        return jsonify({"error": "Se requiere un cuerpo JSON"}), 400

    campos_obligatorios = (
        "id_producto",
        "numero_lote",
        "fecha_vencimiento",
        "cantidad",
    )
    faltantes = [
        campo for campo in campos_obligatorios if data.get(campo) in (None, "")
    ]
    if faltantes:
        return jsonify({"error": f"Faltan campos: {', '.join(faltantes)}"}), 400

    try:
        cantidad = int(data["cantidad"])
    except (TypeError, ValueError):
        return jsonify({"error": "cantidad debe ser un número entero"}), 400

    if cantidad <= 0:
        return jsonify({"error": "cantidad debe ser mayor que cero"}), 400

    try:
        registrar_entrada_dao(
            id_producto=data["id_producto"],
            numero_lote=data["numero_lote"],
            fecha_vencimiento=data["fecha_vencimiento"],
            cantidad=cantidad,
            id_proveedor=data.get("id_proveedor"),
        )
        return jsonify({"mensaje": "Entrada registrada exitosamente"}), 201
    except ConnectionError as e:
        return jsonify({"error": str(e)}), 503
    except Exception as e:
        return jsonify({"error": str(e)}), 400


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)
