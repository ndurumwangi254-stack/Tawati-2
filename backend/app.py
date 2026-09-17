import os
from flask import Flask, jsonify
from flask_cors import CORS
from dotenv import load_dotenv

load_dotenv()

from db import init_pool
from blueprints.auth import bp as auth_bp
from blueprints.medicines import bp as medicines_bp
from blueprints.products import bp as products_bp
from blueprints.catalog import bp as catalog_bp
from blueprints.patients import bp as patients_bp
from blueprints.sales import bp as sales_bp
from blueprints.stock_movements import bp as stock_movements_bp
from blueprints.alerts import bp as alerts_bp
from blueprints.reports import bp as reports_bp
from blueprints.users import bp as users_bp
from blueprints.settings import bp as settings_bp


def create_app():
    app = Flask(__name__)
    app.url_map.strict_slashes = False
    app.config["PROPAGATE_EXCEPTIONS"] = False

    cors_origins = [o.strip() for o in os.environ.get("CORS_ORIGIN", "http://localhost:5173").split(",")]
    CORS(app, origins=cors_origins)

    init_pool()

    app.register_blueprint(auth_bp, url_prefix="/api/auth")
    app.register_blueprint(medicines_bp, url_prefix="/api/medicines")
    app.register_blueprint(products_bp, url_prefix="/api/products")
    app.register_blueprint(catalog_bp, url_prefix="/api")  # exposes /categories, /suppliers
    app.register_blueprint(patients_bp, url_prefix="/api/patients")
    app.register_blueprint(sales_bp, url_prefix="/api/sales")
    app.register_blueprint(stock_movements_bp, url_prefix="/api/stock-movements")
    app.register_blueprint(alerts_bp, url_prefix="/api/alerts")
    app.register_blueprint(reports_bp, url_prefix="/api/reports")
    app.register_blueprint(users_bp, url_prefix="/api/users")
    app.register_blueprint(settings_bp, url_prefix="/api/settings")

    @app.get("/health")
    def health():
        return jsonify({"ok": True})

    @app.errorhandler(404)
    def not_found(_err):
        return jsonify({"error": "Not found"}), 404

    @app.errorhandler(Exception)
    def handle_unexpected(err):
        # Anything a route didn't already catch and turn into a clean
        # error response lands here instead of a raw 500 with no body.
        print("Unhandled error:", err)
        return jsonify({"error": "Something went wrong"}), 500

    return app


app = create_app()

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 4000))
    app.run(host="0.0.0.0", port=port, debug=True)
