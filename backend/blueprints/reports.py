from flask import Blueprint, request, jsonify

from db import query, to_jsonable
from auth_utils import require_auth, require_owner

bp = Blueprint("reports", __name__)


def range_to_interval(months_param):
    try:
        n = int(months_param) if months_param else 1
    except (TypeError, ValueError):
        n = 1
    return f"{n} months"


@bp.get("")
@require_auth
@require_owner
def get_reports():
    interval = range_to_interval(request.args.get("months"))

    best_sellers = query(
        """SELECT m.brand_name AS name, SUM(si.quantity) AS value
           FROM sale_items si
           JOIN sales s ON s.id = si.sale_id
           JOIN medicines m ON m.id = si.medicine_id
           WHERE s.created_at >= now() - %s::interval
           GROUP BY m.brand_name
           ORDER BY value DESC
           LIMIT 10""",
        [interval],
    )

    least_sellers = query(
        """SELECT m.brand_name AS name, COALESCE(SUM(si.quantity), 0) AS value
           FROM medicines m
           LEFT JOIN sale_items si ON si.medicine_id = m.id
             AND si.sale_id IN (SELECT id FROM sales WHERE created_at >= now() - %s::interval)
           GROUP BY m.brand_name
           ORDER BY value ASC
           LIMIT 10""",
        [interval],
    )

    margin_by_medicine = query(
        """SELECT m.brand_name AS name, SUM(si.subtotal - (si.unit_cost * si.quantity)) AS value
           FROM sale_items si
           JOIN sales s ON s.id = si.sale_id
           JOIN medicines m ON m.id = si.medicine_id
           WHERE s.created_at >= now() - %s::interval
           GROUP BY m.brand_name
           ORDER BY value DESC
           LIMIT 10""",
        [interval],
    )

    monthly_sales = query(
        """SELECT to_char(date_trunc('month', created_at), 'Mon') AS name, SUM(total_amount) AS value
           FROM sales
           WHERE created_at >= now() - interval '12 months'
           GROUP BY date_trunc('month', created_at)
           ORDER BY date_trunc('month', created_at)"""
    )

    monthly_margin = query(
        """SELECT to_char(date_trunc('month', created_at), 'Mon') AS name, SUM(total_amount - total_cost) AS value
           FROM sales
           WHERE created_at >= now() - interval '12 months'
           GROUP BY date_trunc('month', created_at)
           ORDER BY date_trunc('month', created_at)"""
    )

    sales_by_category = query(
        """SELECT COALESCE(c.name, 'Uncategorized') AS name, SUM(si.subtotal) AS value
           FROM sale_items si
           JOIN sales s ON s.id = si.sale_id
           JOIN medicines m ON m.id = si.medicine_id
           LEFT JOIN categories c ON c.id = m.category_id
           WHERE s.created_at >= now() - %s::interval
           GROUP BY c.name
           ORDER BY value DESC""",
        [interval],
    )

    expiry_losses = query(
        """SELECT to_char(date_trunc('month', sm.created_at), 'Mon') AS name,
               SUM(-sm.quantity * b.cost_price) AS value
           FROM stock_movements sm
           JOIN batches b ON b.id = sm.batch_id
           WHERE sm.type = 'expired' AND sm.created_at >= now() - interval '12 months'
           GROUP BY date_trunc('month', sm.created_at)
           ORDER BY date_trunc('month', sm.created_at)"""
    )

    peak_hours = query(
        """SELECT to_char(created_at, 'HH12 AM') AS name, COUNT(*) AS value
           FROM sales
           WHERE created_at >= now() - %s::interval
           GROUP BY to_char(created_at, 'HH12 AM'), EXTRACT(HOUR FROM created_at)
           ORDER BY EXTRACT(HOUR FROM created_at)""",
        [interval],
    )

    result = {
        "bestSellers": best_sellers,
        "leastSellers": least_sellers,
        "marginByMedicine": margin_by_medicine,
        "monthlySales": monthly_sales,
        "monthlyMargin": monthly_margin,
        "salesByCategory": sales_by_category,
        "expiryLosses": expiry_losses,
        "peakHours": peak_hours,
    }
    return jsonify(to_jsonable(result))
