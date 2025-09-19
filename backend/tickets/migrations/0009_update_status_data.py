# Generated manually to update existing status data

from django.db import migrations

def update_status_values(apps, schema_editor):
    """Update existing status values from text to codes"""
    Ticket = apps.get_model('tickets', 'Ticket')
    
    # Update status values
    status_mapping = {
        'Open': 'open',
        'In Progress': 'in_progress', 
        'Closed': 'closed',
        'Reopened': 'reopened'
    }
    
    for old_status, new_status in status_mapping.items():
        Ticket.objects.filter(status=old_status).update(status=new_status)

def reverse_status_values(apps, schema_editor):
    """Reverse the status value updates"""
    Ticket = apps.get_model('tickets', 'Ticket')
    
    # Reverse status values
    status_mapping = {
        'open': 'Open',
        'in_progress': 'In Progress',
        'closed': 'Closed', 
        'reopened': 'Reopened'
    }
    
    for new_status, old_status in status_mapping.items():
        Ticket.objects.filter(status=new_status).update(status=old_status)

class Migration(migrations.Migration):

    dependencies = [
        ('tickets', '0008_update_status_codes'),
    ]

    operations = [
        migrations.RunPython(update_status_values, reverse_status_values),
    ]
