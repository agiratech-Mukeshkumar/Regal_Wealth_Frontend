from flask import Blueprint

advisor_bp = Blueprint('advisor_bp', __name__)


from . import clients, appointments, dashboard, documents, settings

