#!/usr/bin/env python3
import requests
import json

# Test the dashboard API to see if it returns data
try:
    # Login with test user
    login_data = {
        "email": "test@example.com",
        "password": "test123"
    }
    
    print("🔐 Logging in...")
    login_response = requests.post('http://localhost:8000/api/auth/login/', json=login_data)
    
    if login_response.status_code == 200:
        auth_data = login_response.json()
        access_token = auth_data.get('access')
        print(f"✅ Login successful!")
        
        # Test dashboard API
        headers = {
            'Authorization': f'Bearer {access_token}',
            'Content-Type': 'application/json'
        }
        
        print("📊 Testing dashboard API...")
        dashboard_response = requests.get('http://localhost:8000/api/auth/dashboard/', headers=headers)
        
        if dashboard_response.status_code == 200:
            dashboard_data = dashboard_response.json()
            print(f"✅ Dashboard API successful!")
            print(f"📊 Dashboard data: {json.dumps(dashboard_data, indent=2)}")
        else:
            print(f"❌ Dashboard API failed: {dashboard_response.status_code}")
            print(dashboard_response.text)
    else:
        print(f"❌ Login failed: {login_response.status_code}")
        
except Exception as e:
    print(f"❌ Error: {e}")
