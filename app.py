from flask import Flask, jsonify, request
from flask_cors import CORS  # Para que React pueda conectarse sin bloqueos CORS

from dao.inventory_dao import (
    obtener_inventario,
    registrar_entrada as registrar_entrada_dao,
    registrar_salida as registrar_salida_dao,
    obtener_proximos_vencer,
    obtener_stock_bajo,
    obtener_lotes, registrar_entrada_multiple,
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

    items = data.get("items")
    id_proveedor = data.get("id_proveedor")

    if not isinstance(items, list) or not items:
        return jsonify({"error": "Debe incluir al menos un producto en items"}), 400

    try:
        for item in items:
            if not isinstance(item, dict):
                return jsonify({"error": "Cada producto debe ser un objeto válido"}), 400

            campos = ("id_producto", "numero_lote", "fecha_vencimiento", "cantidad")
            faltantes = [campo for campo in campos if item.get(campo) in (None, "")]

            if faltantes:
                return jsonify({
                    "error": f"Faltan campos en un producto: {', '.join(faltantes)}"
                }), 400

            id_producto = int(item["id_producto"])
            cantidad = int(item["cantidad"])

            if id_producto <= 0 or cantidad <= 0:
                return jsonify({"error": "El producto y la cantidad deben ser mayores que cero"}), 400

        registrar_entrada_multiple(items, id_proveedor)

        return jsonify({"mensaje": "Entrada registrada exitosamente"}), 201

    except (ValueError, TypeError) as e:
        return jsonify({"error": str(e)}), 400
    except ConnectionError as e:
        return jsonify({"error": str(e)}), 503
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/salidas", methods=["POST"])
def registrar_salida():
    data = request.get_json(silent=True)

    if not isinstance(data, dict):
        return jsonify({"error": "Se requiere un cuerpo JSON"}), 400

    if data.get("id_producto") in (None, "") or data.get("cantidad") in (None, ""):
        return jsonify({"error": "Faltan campos obligatorios"}), 400

    try:
        id_producto = int(data["id_producto"])
        cantidad = int(data["cantidad"])

        if id_producto <= 0 or cantidad <= 0:
            return jsonify({"error": "Los valores deben ser mayores que cero"}), 400

        registrar_salida_dao(
            id_producto=id_producto,
            cantidad=cantidad,
            motivo=data.get("motivo", "Salida de inventario")
        )

        return jsonify({"mensaje": "Salida registrada exitosamente"}), 201

    except ValueError as e:
        return jsonify({"error": str(e)}), 400
    except ConnectionError as e:
        return jsonify({"error": str(e)}), 503
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/api/vencimientos", methods=["GET"])
def get_vencimientos():
    try:
        return jsonify(obtener_proximos_vencer())
    except ConnectionError as e:
        return jsonify({"error": str(e)}), 503
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/api/stock-bajo", methods=["GET"])
def get_stock_bajo():
    try:
        return jsonify(obtener_stock_bajo())
    except ConnectionError as e:
        return jsonify({"error": str(e)}), 503
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/api/lotes", methods=["GET"])
def get_lotes():
    try:
        return jsonify(obtener_lotes())
    except ConnectionError as e:
        return jsonify({"error": str(e)}), 503
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)
