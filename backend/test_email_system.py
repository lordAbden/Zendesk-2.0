#!/usr/bin/env python
"""
Test script for the email notification system
Run this script to test if emails are being sent correctly
"""

import os
import sys
import django

# Add the backend directory to the Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# Set up Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'ticketing_system.settings')
django.setup()

from tickets.email_service import email_service
from tickets.models import Ticket, TicketEvent
from users.models import User
from django.utils import timezone

def test_email_system():
    """Test the email notification system"""
    print("🧪 Testing Email Notification System")
    print("=" * 50)
    
    # Test 1: Check if email service is enabled
    print("1. Checking email service configuration...")
    if email_service.enabled:
        print("   ✅ Email notifications are enabled")
    else:
        print("   ❌ Email notifications are disabled")
        return
    
    # Test 2: Check admin email
    print("2. Checking admin email...")
    admin_email = email_service.get_admin_email()
    if admin_email:
        print(f"   ✅ Admin email found: {admin_email}")
    else:
        print("   ❌ No admin email found")
        return
    
    # Test 3: Test basic email sending
    print("3. Testing basic email sending...")
    try:
        success = email_service.send_email(
            subject="Test Email - Support Ticket DGM",
            template_name='base_email.html',
            context={'subject': 'Test Email'},
            recipient_list=[admin_email]
        )
        if success:
            print("   ✅ Basic email sent successfully")
        else:
            print("   ❌ Failed to send basic email")
    except Exception as e:
        print(f"   ❌ Error sending email: {e}")
    
    # Test 4: Test ticket creation notification
    print("4. Testing ticket creation notification...")
    try:
        # Find an employee user
        employee = User.objects.filter(role='employee').first()
        if not employee:
            print("   ⚠️  No employee found, skipping test")
        else:
            # Find a technician
            technician = User.objects.filter(role='technician').first()
            if not technician:
                print("   ⚠️  No technician found, skipping test")
            else:
                # Create a test ticket
                test_ticket = Ticket.objects.create(
                    subject="Test Ticket for Email System",
                    type="Software",
                    description="This is a test ticket to verify email notifications",
                    requester=employee,
                    priority="P3"
                )
                
                # Test the notification
                success = email_service.notify_ticket_created(test_ticket)
                if success:
                    print("   ✅ Ticket creation notification sent")
                else:
                    print("   ❌ Failed to send ticket creation notification")
                
                # Clean up test ticket
                test_ticket.delete()
    except Exception as e:
        print(f"   ❌ Error testing ticket creation: {e}")
    
    # Test 5: Test user change notification
    print("5. Testing user change notification...")
    try:
        # Find any user (not admin)
        test_user = User.objects.exclude(role='admin').first()
        if not test_user:
            print("   ⚠️  No non-admin user found, skipping test")
        else:
            changes = {
                'first_name': {'old': 'Old Name', 'new': 'New Name'},
                'email': {'old': 'old@example.com', 'new': 'new@example.com'}
            }
            success = email_service.notify_admin_user_changed(test_user, changes)
            if success:
                print("   ✅ User change notification sent")
            else:
                print("   ❌ Failed to send user change notification")
    except Exception as e:
        print(f"   ❌ Error testing user change notification: {e}")
    
    print("\n🎉 Email system test completed!")
    print("Check your email inbox for test messages.")

if __name__ == "__main__":
    test_email_system()

