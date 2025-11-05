#!/usr/bin/env python3
"""
Generate secure keys for deployment
Run this script to generate JWT_SECRET_KEY and APP_SECRET_KEY
"""

import secrets

def generate_key(name):
    """Generate a secure random key"""
    key = secrets.token_urlsafe(32)
    print(f"{name}: {key}")
    return key

if __name__ == "__main__":
    print("=" * 60)
    print("Generating Secure Keys for Deployment")
    print("=" * 60)
    print()
    print("Copy these keys and use them in your Render environment variables:")
    print()
    
    jwt_key = generate_key("JWT_SECRET_KEY")
    app_key = generate_key("APP_SECRET_KEY")
    
    print()
    print("=" * 60)
    print("IMPORTANT: Save these keys securely!")
    print("You'll need them when setting up Render environment variables")
    print("=" * 60)

