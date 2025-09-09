from flask import Blueprint


client_bp = Blueprint('client_bp', __name__)

from . import client_forms, documents, family, financials, personal, questionnaire, settings, spouse, summary