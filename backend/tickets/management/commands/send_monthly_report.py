from django.core.management.base import BaseCommand
from django.utils import timezone
from django.db.models import Count, Q, Avg
from datetime import datetime, timedelta
from tickets.models import Ticket, TicketEvent, TicketClosureReport
from tickets.email_service import email_service
from users.models import User
import os
import tempfile
import logging

logger = logging.getLogger(__name__)

class Command(BaseCommand):
    help = 'Send monthly statistics report to admin'

    def add_arguments(self, parser):
        parser.add_argument(
            '--month',
            type=int,
            help='Month to generate report for (1-12)',
        )
        parser.add_argument(
            '--year',
            type=int,
            help='Year to generate report for',
        )
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Generate report without sending email',
        )

    def handle(self, *args, **options):
        # Determine the month and year for the report
        now = timezone.now()
        if options['month'] and options['year']:
            month = options['month']
            year = options['year']
        else:
            # Default to previous month
            last_month = now - timedelta(days=30)
            month = last_month.month
            year = last_month.year

        self.stdout.write(f"Generating monthly report for {month}/{year}")

        # Generate statistics
        stats = self.generate_monthly_stats(month, year)
        
        # Generate screenshots (placeholder for now)
        screenshots = self.generate_screenshots(month, year)
        stats['screenshots'] = screenshots

        # Get month name in French
        month_names = {
            1: 'Janvier', 2: 'Février', 3: 'Mars', 4: 'Avril',
            5: 'Mai', 6: 'Juin', 7: 'Juillet', 8: 'Août',
            9: 'Septembre', 10: 'Octobre', 11: 'Novembre', 12: 'Décembre'
        }
        month_name = month_names.get(month, f'Mois {month}')

        if options['dry_run']:
            self.stdout.write("DRY RUN - Would send email with stats:")
            self.stdout.write(f"Total tickets: {stats['total_tickets']}")
            self.stdout.write(f"Open tickets: {stats['open_tickets']}")
            self.stdout.write(f"Closed tickets: {stats['closed_tickets']}")
            self.stdout.write(f"Average resolution time: {stats['avg_resolution_time']}")
        else:
            # Send email
            success = email_service.send_monthly_report(stats, month_name, year)
            if success:
                self.stdout.write(
                    self.style.SUCCESS(f'Monthly report sent successfully for {month_name} {year}')
                )
            else:
                self.stdout.write(
                    self.style.ERROR('Failed to send monthly report')
                )

        # Clean up temporary files
        for screenshot in screenshots:
            try:
                if os.path.exists(screenshot):
                    os.remove(screenshot)
            except Exception as e:
                logger.error(f"Failed to clean up screenshot {screenshot}: {e}")

    def generate_monthly_stats(self, month, year):
        """Generate statistics for the specified month and year"""
        # Date range for the month
        start_date = datetime(year, month, 1)
        if month == 12:
            end_date = datetime(year + 1, 1, 1)
        else:
            end_date = datetime(year, month + 1, 1)
        
        # Convert to timezone-aware dates
        start_date = timezone.make_aware(start_date)
        end_date = timezone.make_aware(end_date)

        # Basic ticket statistics
        tickets_in_month = Ticket.objects.filter(
            created_at__gte=start_date,
            created_at__lt=end_date
        )

        total_tickets = tickets_in_month.count()
        
        # Current status statistics (tickets created in the month)
        open_tickets = tickets_in_month.filter(status='open').count()
        closed_tickets = tickets_in_month.filter(status='closed').count()
        in_progress_tickets = tickets_in_month.filter(status='in_progress').count()
        reopened_tickets = tickets_in_month.filter(status='reopened').count()

        # Tickets by type
        tickets_by_type = {}
        for ticket_type, _ in Ticket.TYPE_CHOICES:
            count = tickets_in_month.filter(type=ticket_type).count()
            if count > 0:
                tickets_by_type[ticket_type] = count

        # Tickets by priority
        tickets_by_priority = {}
        for priority, _ in Ticket.PRIORITY_CHOICES:
            count = tickets_in_month.filter(priority=priority).count()
            if count > 0:
                tickets_by_priority[priority] = count

        # Technician performance
        technician_performance = {}
        technicians = User.objects.filter(role='technician')
        
        for tech in technicians:
            # Tickets resolved by this technician in the month
            resolved_tickets = TicketClosureReport.objects.filter(
                created_by=tech,
                created_at__gte=start_date,
                created_at__lt=end_date
            )
            
            tickets_resolved = resolved_tickets.count()
            if tickets_resolved > 0:
                # Calculate average resolution time manually since it's a property
                total_hours = 0
                for report in resolved_tickets:
                    total_hours += report.resolution_time_hours
                avg_time = total_hours / tickets_resolved if tickets_resolved > 0 else 0
                
                technician_performance[tech.get_full_name()] = {
                    'tickets_resolved': tickets_resolved,
                    'avg_time': f"{avg_time:.1f}h" if avg_time else "N/A"
                }

        # Calculate average resolution time for all tickets
        closure_reports = TicketClosureReport.objects.filter(
            created_at__gte=start_date,
            created_at__lt=end_date
        )
        
        # Calculate average resolution time manually since it's a property
        total_hours = 0
        report_count = closure_reports.count()
        for report in closure_reports:
            total_hours += report.resolution_time_hours
        
        avg_resolution = total_hours / report_count if report_count > 0 else 0
        avg_resolution_time = f"{avg_resolution:.1f} heures" if avg_resolution else "N/A"

        return {
            'total_tickets': total_tickets,
            'open_tickets': open_tickets,
            'closed_tickets': closed_tickets,
            'in_progress_tickets': in_progress_tickets,
            'reopened_tickets': reopened_tickets,
            'tickets_by_type': tickets_by_type,
            'tickets_by_priority': tickets_by_priority,
            'technician_performance': technician_performance,
            'avg_resolution_time': avg_resolution_time
        }

    def generate_screenshots(self, month, year):
        """Generate screenshots of statistics (placeholder implementation)"""
        # This is a placeholder implementation
        # In a real implementation, you would:
        # 1. Use selenium or similar to take screenshots of your statistics page
        # 2. Generate charts using matplotlib or similar
        # 3. Save them as image files
        
        screenshots = []
        
        # For now, we'll create placeholder files
        # In production, you would generate actual screenshots
        try:
            # Create a temporary directory for screenshots
            temp_dir = tempfile.mkdtemp()
            
            # Placeholder screenshot files (in production, these would be actual screenshots)
            screenshot_files = [
                'statistics_overview.png',
                'tickets_by_type.png',
                'technician_performance.png'
            ]
            
            for filename in screenshot_files:
                filepath = os.path.join(temp_dir, filename)
                # Create a placeholder file
                with open(filepath, 'w') as f:
                    f.write(f"Placeholder screenshot for {filename}")
                screenshots.append(filepath)
                
        except Exception as e:
            logger.error(f"Failed to generate screenshots: {e}")
        
        return screenshots
