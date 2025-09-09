import os
from flask import Flask
from flask_mail import Mail 
from auth.routes import auth_bp
from admin.routes import admin_bp
from advisor.routes import advisor_bp
from client.routes import client_bp
from flask_cors import CORS
from config import Config
from shared.routes import shared_bp 


app = Flask(__name__)
app.config.from_object(Config) 

frontend_url = os.environ.get('FRONTEND_URL') or "http://localhost:3000"
CORS(app, resources={r"/api/*": {"origins": frontend_url}})



mail = Mail(app)

app.register_blueprint(auth_bp, url_prefix='/api/auth')
app.register_blueprint(admin_bp, url_prefix='/api/admin')
app.register_blueprint(advisor_bp, url_prefix='/api/advisor')
app.register_blueprint(client_bp, url_prefix='/api/client') 
app.register_blueprint(shared_bp, url_prefix='/api') 

@app.route('/')
def index():
    return "Regal Wealth Advisors API is running."

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)