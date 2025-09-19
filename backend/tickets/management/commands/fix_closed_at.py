from django.core.management.base import BaseCommand
from django.utils import timezone
from tickets.models import Ticket


class Command(BaseCommand):
    help = 'Fix closed_at timestamps for tickets that are closed but missing closed_at'

    def handle(self, *args, **options):
        # Find all tickets that are closed but have no closed_at timestamp
        closed_tickets_without_timestamp = Ticket.objects.filter(
            status='Closed',
            closed_at__isnull=True
        )
        
        count = closed_tickets_without_timestamp.count()
        
        if count == 0:
            self.stdout.write(
                self.style.SUCCESS('No tickets found that need closed_at timestamps.')
            )
            return
        
        self.stdout.write(f'Found {count} tickets that need closed_at timestamps.')
        
        # Update them with the updated_at timestamp as a fallback
        # This is not perfect but better than NULL
        updated_count = 0
        for ticket in closed_tickets_without_timestamp:
            # Use updated_at as closed_at since we don't know the exact close time
            ticket.closed_at = ticket.updated_at
            ticket.save()
            updated_count += 1
        
        self.stdout.write(
            self.style.SUCCESS(
                f'Successfully updated {updated_count} tickets with closed_at timestamps.'
            )
        )
        
        # Show some statistics
        total_closed = Ticket.objects.filter(status='Closed').count()
        with_timestamps = Ticket.objects.filter(status='Closed', closed_at__isnull=False).count()
        
        self.stdout.write(f'Total closed tickets: {total_closed}')
        self.stdout.write(f'Closed tickets with timestamps: {with_timestamps}')
        
        if with_timestamps == total_closed:
            self.stdout.write(
                self.style.SUCCESS('All closed tickets now have closed_at timestamps!')
            )
        else:
            self.stdout.write(
                self.style.WARNING(
                    f'Still {total_closed - with_timestamps} closed tickets without timestamps.'
                )
            )

