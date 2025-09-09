from functools import wraps
from flask import request, jsonify, current_app
import jwt
from config import Config

def token_required(f):
    """A decorator to ensure a valid JWT is present."""
    @wraps(f)
    def decorated(*args, **kwargs):
        token = None
        if 'Authorization' in request.headers:
          
            token = request.headers['Authorization'].split(" ")[1]

        if not token:
            return jsonify({'message': 'Token is missing!'}), 401

        try:
            data = jwt.decode(token, Config.JWT_SECRET_KEY, algorithms=["HS256"])
            
            kwargs['current_user'] = data 
        except jwt.ExpiredSignatureError:
            return jsonify({'message': 'Token has expired!'}), 401
        except jwt.InvalidTokenError:
            return jsonify({'message': 'Token is invalid!'}), 401

        return f(*args, **kwargs)
    return decorated

def document_token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = None
        
        if 'Authorization' in request.headers:
            auth_header = request.headers['Authorization']
            try:
                token = auth_header.split(" ")[1]
            except IndexError:
                pass 

        if not token and 'token' in request.args:
            token = request.args.get('token')

        if not token:
            return jsonify({'message': 'Token is missing!'}), 401

        try:
           
            data = jwt.decode(token, current_app.config['JWT_SECRET_KEY'], algorithms=["HS256"])
            kwargs['current_user'] = data
        except jwt.ExpiredSignatureError:
            return jsonify({'message': 'Token has expired!'}), 401
        except jwt.InvalidTokenError:
            return jsonify({'message': 'Token is invalid!'}), 401
        
        return f(*args, **kwargs)
    return decorated

def admin_required(f):
    """A decorator to ensure the user is an admin."""
    @wraps(f)
    @token_required
    def decorated(*args, **kwargs):
        
        current_user = kwargs.get('current_user') 
        if current_user and current_user['role'] != 'admin':
            return jsonify({'message': 'Admin access required!'}), 403
        
        
        kwargs.pop('current_user', None)
        return f(*args, **kwargs)
    return decorated

def advisor_document_required(f):
    @wraps(f)
    @document_token_required
    def decorated(current_user, *args, **kwargs):
        if current_user['role'] != 'advisor':
            return jsonify({"message": "Advisor role required!"}), 403
        return f(current_user, *args, **kwargs)
    return decorated



def advisor_required(f):
    """A decorator to ensure the user is an advisor."""
    @wraps(f)
    @token_required
    def decorated(*args, **kwargs):
        current_user = kwargs.get('current_user')
        if current_user and current_user['role'] != 'advisor':
            return jsonify({'message': 'Advisor access required!'}), 403
        
        return f(*args, **kwargs)
    return decorated


def client_required(f):
    """A decorator to ensure the user is a client."""
    @wraps(f)
    @token_required 
    def decorated(*args, **kwargs):
        current_user = kwargs.get('current_user')
        if current_user and current_user['role'] != 'client':
            return jsonify({'message': 'Client access required!'}), 403
        
        return f(*args, **kwargs)
    return decorated