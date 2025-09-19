# Email Notification System - Support Ticket DGM

## Overview

This system provides comprehensive email notifications for all ticket events and user activities in the Support Ticket DGM system. All emails are sent in French language.

## Features

### 1. Real-time Ticket Event Notifications

#### For Technicians:
- **Ticket Created by Employee** → All technicians receive notification
- **Technician Added to Ticket** → The added technician receives notification

#### For Employees:
- **Ticket Claimed** → Employee who created the ticket receives notification
- **Ticket Closed** → Employee who created the ticket receives notification
- **Ticket Reopened** → Employee who created the ticket receives notification

### 2. Admin Notifications

- **User Account Changes** → Admin receives notification when users change:
  - Full name (first_name and last_name)
  - Email address
  - Password
  - Telephone number
- **Ticket Closure Reports** → Admin receives email with closure report attached
- **Monthly Statistics Report** → Admin receives comprehensive monthly report on the 1st of every month

### 3. Priority-Based Notifications

- **P1/P2 High Priority Tickets** → Special "URGENT" email structure
- **P3/P4 Regular Tickets** → Standard email structure

## Configuration

### Email Settings

The system is configured to use Gmail SMTP:

```python
EMAIL_BACKEND = 'django.core.mail.backends.smtp.EmailBackend'
EMAIL_HOST = 'smtp.gmail.com'
EMAIL_PORT = 587
EMAIL_USE_TLS = True
EMAIL_HOST_USER = 'ticketit8@gmail.com'
EMAIL_HOST_PASSWORD = 'LordAbden2018'
DEFAULT_FROM_EMAIL = 'Support Ticket DGM <ticketit8@gmail.com>'
```

### Frontend URL

```python
FRONTEND_URL = 'http://localhost:3000'
```

## Email Templates

All email templates are located in `backend/tickets/templates/emails/`:

- `base_email.html` - Base template with styling
- `ticket_created.html` - New ticket notification
- `ticket_claimed.html` - Ticket claimed notification
- `ticket_closed.html` - Ticket closed notification
- `ticket_reopened.html` - Ticket reopened notification
- `technician_added.html` - Technician added notification
- `admin_user_changed.html` - User account change notification
- `admin_closure_report.html` - Closure report notification
- `admin_monthly_report.html` - Monthly statistics report

## Usage

### Automatic Notifications

Email notifications are sent automatically when:

1. **Ticket Events Occur**:
   - Ticket created (in `TicketCreateSerializer`)
   - Ticket claimed (in `accept_ticket` view)
   - Ticket closed (in `create_closure_report` view)
   - Ticket reopened (in `reopen_ticket` view)
   - Technician added (in `add_technician` view)

2. **User Account Changes**:
   - Profile updates (in `update_profile_view`)
   - Password changes (in `change_password_view`)

### Manual Monthly Report

To send the monthly statistics report manually:

```bash
# Send report for previous month
python manage.py send_monthly_report

# Send report for specific month/year
python manage.py send_monthly_report --month 11 --year 2024

# Test without sending email
python manage.py send_monthly_report --dry-run
```

### Automated Monthly Report

To set up automated monthly reports, add this to your crontab:

```bash
# Send monthly report on the 1st of every month at 9:00 AM
0 9 1 * * cd /path/to/your/project && python manage.py send_monthly_report
```

## Testing

### Test Email System

Run the test script to verify email functionality:

```bash
cd backend
python test_email_system.py
```

This will:
1. Check email configuration
2. Find admin email
3. Send test email
4. Test ticket creation notification
5. Test user change notification

### Test Individual Notifications

You can test individual notification types by creating test data in the Django shell:

```python
from tickets.email_service import email_service
from tickets.models import Ticket
from users.models import User

# Test ticket creation notification
ticket = Ticket.objects.get(id='your-ticket-id')
email_service.notify_ticket_created(ticket)

# Test user change notification
user = User.objects.get(id='your-user-id')
changes = {'first_name': {'old': 'Old', 'new': 'New'}}
email_service.notify_admin_user_changed(user, changes)
```

## Email Service API

### Main Methods

```python
from tickets.email_service import email_service

# Ticket notifications
email_service.notify_ticket_created(ticket)
email_service.notify_ticket_claimed(ticket, event)
email_service.notify_ticket_closed(ticket, event)
email_service.notify_ticket_reopened(ticket, event)
email_service.notify_technician_added(ticket, event, technician)

# Admin notifications
email_service.notify_admin_user_changed(user, changes)
email_service.notify_admin_closure_report(ticket, closure_report)
email_service.send_monthly_report(stats, month_name, year)

# Utility methods
email_service.get_admin_email()
email_service.get_ticket_url(ticket)
```

## Troubleshooting

### Common Issues

1. **Emails not being sent**:
   - Check `EMAIL_NOTIFICATIONS_ENABLED` setting
   - Verify Gmail credentials
   - Check Gmail app password (not regular password)

2. **Admin email not found**:
   - Ensure at least one user has `role='admin'`
   - Check user email is valid

3. **Template errors**:
   - Verify all template files exist in `templates/emails/`
   - Check template syntax

### Logging

Email service logs all activities. Check Django logs for:
- Email sending success/failure
- Template rendering errors
- SMTP connection issues

### Gmail Setup

For Gmail SMTP to work:

1. Enable 2-factor authentication on Gmail account
2. Generate an "App Password" (not regular password)
3. Use the app password in `EMAIL_HOST_PASSWORD`

## Security Notes

- Email credentials are stored in Django settings
- Use environment variables in production
- Consider using dedicated email service (SendGrid, etc.) for production
- App passwords are more secure than regular passwords

## Production Considerations

1. **Email Service**: Consider using a dedicated email service like SendGrid or AWS SES
2. **Environment Variables**: Store email credentials in environment variables
3. **Rate Limiting**: Implement rate limiting for email sending
4. **Monitoring**: Set up monitoring for email delivery failures
5. **Backup**: Have backup email service configured

## Support

For issues with the email notification system:

1. Check Django logs for error messages
2. Run the test script to identify issues
3. Verify email configuration settings
4. Test with a simple email first
5. Check Gmail account settings and app passwords

