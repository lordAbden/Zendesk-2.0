from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from django.db.models import Count, Q, Avg, F, Case, When, IntegerField
from django.utils import timezone
from datetime import datetime, timedelta
from tickets.models import Ticket, TicketEvent
from users.models import User
import json


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_ticket_analytics(request):
    """Get ticket analytics with filters"""
    if request.user.role != 'admin':
        return Response({'error': 'Access denied'}, status=status.HTTP_403_FORBIDDEN)
    
    # Get filter parameters
    time_filter = request.GET.get('time_filter', 'all')
    status_filter = request.GET.get('status_filter', 'all')
    priority_filter = request.GET.get('priority_filter', 'all')
    type_filter = request.GET.get('type_filter', 'all')
    user_filter = request.GET.get('user_filter', 'all')
    technician_filter = request.GET.get('technician_filter', 'all')
    group_filter = request.GET.get('group_filter', 'all')
    
    # Build base queryset
    queryset = Ticket.objects.all()
    
    # Apply time filter
    now = timezone.now()
    if time_filter == 'today':
        queryset = queryset.filter(created_at__date=now.date())
    elif time_filter == 'week':
        week_ago = now - timedelta(days=7)
        queryset = queryset.filter(created_at__gte=week_ago)
    elif time_filter == 'month':
        month_ago = now - timedelta(days=30)
        queryset = queryset.filter(created_at__gte=month_ago)
    elif time_filter == 'quarter':
        quarter_ago = now - timedelta(days=90)
        queryset = queryset.filter(created_at__gte=quarter_ago)
    elif time_filter == 'year':
        year_ago = now - timedelta(days=365)
        queryset = queryset.filter(created_at__gte=year_ago)
    elif time_filter == 'custom':
        start_date = request.GET.get('start_date')
        end_date = request.GET.get('end_date')
        if start_date and end_date:
            queryset = queryset.filter(created_at__date__range=[start_date, end_date])
    
    # Apply status filter
    if status_filter == 'open':
        queryset = queryset.filter(status='open')
    elif status_filter == 'in_progress':
        queryset = queryset.filter(status='in_progress')
    elif status_filter == 'closed':
        queryset = queryset.filter(status='closed')
    elif status_filter == 'reopened':
        queryset = queryset.filter(events__event_type='reopened').distinct()
    
    # Apply priority filter
    if priority_filter in ['P1', 'P2', 'P3', 'P4']:
        queryset = queryset.filter(priority=priority_filter)
    
    # Apply type filter
    if type_filter in ['Network', 'Hardware', 'Software']:
        queryset = queryset.filter(type=type_filter)
    
    # Apply user filter (employee who created the ticket)
    if user_filter != 'all':
        try:
            user = User.objects.get(id=user_filter)
            queryset = queryset.filter(requester=user)
        except User.DoesNotExist:
            pass
    
    # Apply technician filter (technician who worked on the ticket)
    if technician_filter != 'all':
        try:
            technician = User.objects.get(id=technician_filter)
            queryset = queryset.filter(
                Q(claimed_by=technician) | Q(additional_technicians=technician)
            ).distinct()
        except User.DoesNotExist:
            pass
    
    # Apply group filter
    if group_filter != 'all':
        queryset = queryset.filter(requester__group=group_filter)
    
    # Calculate statistics
    total_tickets = queryset.count()
    closed_tickets = queryset.filter(status='closed').count()
    reopened_tickets = queryset.filter(events__event_type='reopened').distinct().count()
    
    # Resolution rate
    resolution_rate = (closed_tickets / total_tickets * 100) if total_tickets > 0 else 0
    
    # Average resolution time (for closed tickets)
    closed_tickets_with_times = queryset.filter(
        status='closed',
        closed_at__isnull=False,
        created_at__isnull=False
    )
    avg_resolution_time = 0
    if closed_tickets_with_times.exists():
        total_hours = 0
        for ticket in closed_tickets_with_times:
            resolution_hours = (ticket.closed_at - ticket.created_at).total_seconds() / 3600
            total_hours += resolution_hours
        avg_resolution_time = total_hours / closed_tickets_with_times.count()
    
    # First response time (time to first technician response)
    avg_first_response_time = 0
    # Use only tickets that have been claimed by a technician
    claimed_tickets = queryset.filter(claimed_by__isnull=False)
    
    if claimed_tickets.exists():
        total_frt_hours = 0
        valid_tickets = 0
        
        for ticket in claimed_tickets:
            # Try to get exact claim time from events first
            claim_event = ticket.events.filter(event_type='claimed').order_by('created_at').first()
            
            if claim_event:
                # Use exact claim time from event
                frt_hours = (claim_event.created_at - ticket.created_at).total_seconds() / 3600
                total_frt_hours += frt_hours
                valid_tickets += 1
            elif ticket.claimed_by:
                # Fallback: estimate based on when ticket was first claimed
                # This is an approximation since we don't have exact claim time
                frt_hours = (ticket.updated_at - ticket.created_at).total_seconds() / 3600
                total_frt_hours += frt_hours
                valid_tickets += 1
        
        if valid_tickets > 0:
            avg_first_response_time = total_frt_hours / valid_tickets
    
    # Status distribution with French labels
    status_distribution_raw = list(queryset.values('status').annotate(count=Count('id')).order_by('status'))
    status_labels = {
        'open': 'Ouvert',
        'in_progress': 'En cours',
        'closed': 'Fermé',
        'reopened': 'Rouvert'
    }
    status_distribution = []
    for item in status_distribution_raw:
        status_distribution.append({
            'status': status_labels.get(item['status'], item['status']),
            'count': item['count']
        })
    
    # Ticket types distribution
    type_distribution = list(queryset.values('type').annotate(count=Count('id')).order_by('-count'))
    
    # Priority distribution
    priority_distribution = list(queryset.values('priority').annotate(count=Count('id')).order_by('priority'))
    
    # Ticket resolution time distribution (how long tickets took to resolve)
    # For this chart, we need to filter by closure date, not creation date
    # and ignore today/week filters for better business insights
    
    # Start with all closed tickets
    resolution_queryset = Ticket.objects.filter(status='closed', closed_at__isnull=False)
    
    # Initialize resolution time distribution
    resolution_time_distribution = {
        '0-1_day': 0,
        '1-3_days': 0,
        '3-7_days': 0,
        '7-14_days': 0,
        '14+_days': 0
    }
    
    # If no closed tickets exist, return empty distribution
    if not resolution_queryset.exists():
        pass  # Keep empty distribution
    else:
        # Apply closure date filters based on time_filter
        if time_filter == 'month':
            # Show tickets closed in the current month
            now = timezone.now()
            month_start = datetime(now.year, now.month, 1)
            if now.month == 12:
                month_end = datetime(now.year + 1, 1, 1) - timedelta(days=1)
            else:
                month_end = datetime(now.year, now.month + 1, 1) - timedelta(days=1)
            
            resolution_queryset = resolution_queryset.filter(closed_at__date__range=[month_start.date(), month_end.date()])
            
        elif time_filter == 'year':
            # Show tickets closed in the current year
            now = timezone.now()
            year_start = datetime(now.year, 1, 1)
            year_end = datetime(now.year, 12, 31)
            
            resolution_queryset = resolution_queryset.filter(closed_at__date__range=[year_start.date(), year_end.date()])
        elif time_filter == 'quarter':
            # Show tickets closed in the current quarter
            now = timezone.now()
            current_quarter = (now.month - 1) // 3 + 1
            quarter_start_month = (current_quarter - 1) * 3 + 1
            quarter_end_month = quarter_start_month + 2
            
            quarter_start = datetime(now.year, quarter_start_month, 1)
            if quarter_end_month == 12:
                quarter_end = datetime(now.year + 1, 1, 1) - timedelta(days=1)
            else:
                quarter_end = datetime(now.year, quarter_end_month + 1, 1) - timedelta(days=1)
            resolution_queryset = resolution_queryset.filter(closed_at__date__range=[quarter_start.date(), quarter_end.date()])
        elif time_filter == 'custom' and start_date and end_date:
            # Show tickets closed within the custom date range
            resolution_queryset = resolution_queryset.filter(closed_at__date__range=[start_date, end_date])
        # For 'today', 'week', and 'all' - show all closed tickets (ignore time filter)
    
        # Apply other filters (priority, type, user, technician, group) to resolution queryset
        if priority_filter in ['P1', 'P2', 'P3', 'P4']:
            resolution_queryset = resolution_queryset.filter(priority=priority_filter)
        
        if type_filter in ['Network', 'Hardware', 'Software']:
            resolution_queryset = resolution_queryset.filter(type=type_filter)
        
        if user_filter != 'all':
            try:
                user = User.objects.get(id=user_filter)
                resolution_queryset = resolution_queryset.filter(requester=user)
            except User.DoesNotExist:
                pass
        
        if technician_filter != 'all':
            try:
                technician = User.objects.get(id=technician_filter)
                resolution_queryset = resolution_queryset.filter(
                    Q(claimed_by=technician) | Q(additional_technicians=technician)
                ).distinct()
            except User.DoesNotExist:
                pass
        
        if group_filter != 'all':
            resolution_queryset = resolution_queryset.filter(requester__group=group_filter)
        
        # Calculate resolution time distribution
        if resolution_queryset.exists():
            for ticket in resolution_queryset:
                resolution_hours = (ticket.closed_at - ticket.created_at).total_seconds() / 3600
                resolution_days = resolution_hours / 24
                
                if resolution_days <= 1:
                    resolution_time_distribution['0-1_day'] += 1
                elif resolution_days <= 3:
                    resolution_time_distribution['1-3_days'] += 1
                elif resolution_days <= 7:
                    resolution_time_distribution['3-7_days'] += 1
                elif resolution_days <= 14:
                    resolution_time_distribution['7-14_days'] += 1
                else:
                    resolution_time_distribution['14+_days'] += 1
    
    # Monthly trends (current year: January to December)
    monthly_trends = []
    current_year = datetime.now().year
    
    # Month names in French
    month_names = [
        'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
        'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
    ]
    
    for month_num in range(1, 13):  # January to December
        # Calculate month start and end for the current year
        month_start = datetime(current_year, month_num, 1)
        
        # Calculate month end
        if month_num == 12:
            month_end = datetime(current_year + 1, 1, 1) - timedelta(days=1)
        else:
            month_end = datetime(current_year, month_num + 1, 1) - timedelta(days=1)
        
        count = queryset.filter(created_at__date__range=[month_start.date(), month_end.date()]).count()
        monthly_trends.append({
            'month': month_names[month_num - 1],  # Use French month name
            'count': count
        })
        print(f"Month {month_names[month_num - 1]} {current_year}: {count} tickets")
    
    # Calculate month-over-month comparisons
    current_month = datetime.now().month
    current_year = datetime.now().year
    
    # Current month data
    current_month_start = datetime(current_year, current_month, 1)
    if current_month == 12:
        current_month_end = datetime(current_year + 1, 1, 1) - timedelta(days=1)
    else:
        current_month_end = datetime(current_year, current_month + 1, 1) - timedelta(days=1)
    
    # Previous month data
    if current_month == 1:
        prev_month_start = datetime(current_year - 1, 12, 1)
        prev_month_end = datetime(current_year, 1, 1) - timedelta(days=1)
    else:
        prev_month_start = datetime(current_year, current_month - 1, 1)
        prev_month_end = datetime(current_year, current_month, 1) - timedelta(days=1)
    
    # Current month metrics
    current_month_tickets = queryset.filter(created_at__date__range=[current_month_start.date(), current_month_end.date()])
    current_month_closed = current_month_tickets.filter(status='closed').count()
    current_month_total = current_month_tickets.count()
    current_month_resolution_rate = (current_month_closed / current_month_total * 100) if current_month_total > 0 else 0
    
    # Previous month metrics
    prev_month_tickets = queryset.filter(created_at__date__range=[prev_month_start.date(), prev_month_end.date()])
    prev_month_closed = prev_month_tickets.filter(status='closed').count()
    prev_month_total = prev_month_tickets.count()
    prev_month_resolution_rate = (prev_month_closed / prev_month_total * 100) if prev_month_total > 0 else 0
    
    # Calculate resolution time for current and previous month
    current_month_resolution_time = 0
    current_closed_with_times = current_month_tickets.filter(status='closed', closed_at__isnull=False)
    if current_closed_with_times.exists():
        total_hours = sum((ticket.closed_at - ticket.created_at).total_seconds() / 3600 for ticket in current_closed_with_times)
        current_month_resolution_time = total_hours / current_closed_with_times.count()
    
    prev_month_resolution_time = 0
    prev_closed_with_times = prev_month_tickets.filter(status='closed', closed_at__isnull=False)
    if prev_closed_with_times.exists():
        total_hours = sum((ticket.closed_at - ticket.created_at).total_seconds() / 3600 for ticket in prev_closed_with_times)
        prev_month_resolution_time = total_hours / prev_closed_with_times.count()
    
    # Calculate first response time for current and previous month
    current_month_frt = 0
    current_frt_tickets = current_month_tickets.filter(events__event_type__in=['claimed', 'technician_added']).distinct()
    if current_frt_tickets.exists():
        total_frt = 0
        for ticket in current_frt_tickets:
            first_response_event = ticket.events.filter(event_type__in=['claimed', 'technician_added']).order_by('created_at').first()
            if first_response_event:
                total_frt += (first_response_event.created_at - ticket.created_at).total_seconds() / 3600
        current_month_frt = total_frt / current_frt_tickets.count()
    
    prev_month_frt = 0
    prev_frt_tickets = prev_month_tickets.filter(events__event_type__in=['claimed', 'technician_added']).distinct()
    if prev_frt_tickets.exists():
        total_frt = 0
        for ticket in prev_frt_tickets:
            first_response_event = ticket.events.filter(event_type__in=['claimed', 'technician_added']).order_by('created_at').first()
            if first_response_event:
                total_frt += (first_response_event.created_at - ticket.created_at).total_seconds() / 3600
        prev_month_frt = total_frt / prev_frt_tickets.count()
    
    # Calculate percentage changes
    resolution_rate_change = current_month_resolution_rate - prev_month_resolution_rate
    resolution_time_change = prev_month_resolution_time - current_month_resolution_time  # Negative is good (faster)
    frt_change = prev_month_frt - current_month_frt  # Negative is good (faster)
    
    # Calculate tickets per employee (average)
    total_employees = User.objects.filter(role='employee').count()
    avg_tickets_per_employee = (total_tickets / total_employees) if total_employees > 0 else 0
    
    # Calculate month-over-month changes for Total Tickets and Tickets per Employee
    total_tickets_change = 0
    avg_tickets_per_employee_change = 0
    
    # Current month total tickets
    current_month_tickets = queryset.filter(
        created_at__gte=current_month_start,
        created_at__lte=current_month_end
    ).count()
    
    # Previous month total tickets
    prev_month_tickets_count = queryset.filter(
        created_at__gte=prev_month_start,
        created_at__lte=prev_month_end
    ).count()
    
    if prev_month_tickets_count > 0:
        total_tickets_change = ((current_month_tickets - prev_month_tickets_count) / prev_month_tickets_count) * 100
    
    # Previous month tickets per employee
    prev_month_avg_tickets_per_employee = (prev_month_tickets_count / total_employees) if total_employees > 0 else 0
    if prev_month_avg_tickets_per_employee > 0:
        avg_tickets_per_employee_change = ((avg_tickets_per_employee - prev_month_avg_tickets_per_employee) / prev_month_avg_tickets_per_employee) * 100
    
    return Response({
        'total_tickets': total_tickets,
        'resolution_rate': round(resolution_rate, 1),
        'avg_resolution_time': round(avg_resolution_time, 1),
        'avg_first_response_time': round(avg_first_response_time, 1),
        'reopened_tickets': reopened_tickets,
        'status_distribution': status_distribution,
        'type_distribution': type_distribution,
        'priority_distribution': priority_distribution,
        'resolution_time_distribution': resolution_time_distribution,
        'monthly_trends': monthly_trends,
        'avg_tickets_per_employee': round(avg_tickets_per_employee, 1),
        'monthly_comparisons': {
            'resolution_rate_change': round(resolution_rate_change, 1),
            'resolution_time_change': round(resolution_time_change, 1),
            'frt_change': round(frt_change, 1),
            'total_tickets_change': round(total_tickets_change, 1),
            'avg_tickets_per_employee_change': round(avg_tickets_per_employee_change, 1)
        }
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_user_performance(request):
    """Get user performance statistics"""
    if request.user.role != 'admin':
        return Response({'error': 'Access denied'}, status=status.HTTP_403_FORBIDDEN)
    
    # Get filter parameters
    time_filter = request.GET.get('time_filter', 'all')
    status_filter = request.GET.get('status_filter', 'all')
    priority_filter = request.GET.get('priority_filter', 'all')
    type_filter = request.GET.get('type_filter', 'all')
    group_filter = request.GET.get('group_filter', 'all')
    
    # Build base queryset
    queryset = Ticket.objects.all()
    
    # Apply filters (same logic as ticket analytics)
    now = timezone.now()
    if time_filter == 'today':
        queryset = queryset.filter(created_at__date=now.date())
    elif time_filter == 'week':
        week_ago = now - timedelta(days=7)
        queryset = queryset.filter(created_at__gte=week_ago)
    elif time_filter == 'month':
        month_ago = now - timedelta(days=30)
        queryset = queryset.filter(created_at__gte=month_ago)
    elif time_filter == 'quarter':
        quarter_ago = now - timedelta(days=90)
        queryset = queryset.filter(created_at__gte=quarter_ago)
    elif time_filter == 'year':
        year_ago = now - timedelta(days=365)
        queryset = queryset.filter(created_at__gte=year_ago)
    elif time_filter == 'custom':
        start_date = request.GET.get('start_date')
        end_date = request.GET.get('end_date')
        if start_date and end_date:
            queryset = queryset.filter(created_at__date__range=[start_date, end_date])
    
    if status_filter == 'open':
        queryset = queryset.filter(status='open')
    elif status_filter == 'in_progress':
        queryset = queryset.filter(status='in_progress')
    elif status_filter == 'closed':
        queryset = queryset.filter(status='closed')
    elif status_filter == 'reopened':
        queryset = queryset.filter(events__event_type='reopened').distinct()
    
    if priority_filter in ['P1', 'P2', 'P3', 'P4']:
        queryset = queryset.filter(priority=priority_filter)
    
    # Apply type filter
    if type_filter in ['Network', 'Hardware', 'Software']:
        queryset = queryset.filter(type=type_filter)
    
    # Apply group filter
    if group_filter != 'all':
        queryset = queryset.filter(requester__group=group_filter)
    
    # Top employees (ticket creators)
    top_employees = list(queryset.values(
        'requester__first_name', 'requester__last_name', 'requester__group'
    ).annotate(
        tickets_created=Count('id')
    ).order_by('-tickets_created')[:5])
    
    # Top technicians (ticket resolvers)
    top_technicians = list(queryset.filter(
        Q(claimed_by__isnull=False) | Q(additional_technicians__isnull=False)
    ).values(
        'claimed_by__first_name', 'claimed_by__last_name'
    ).annotate(
        tickets_resolved=Count('id')
    ).order_by('-tickets_resolved')[:5])
    
    # Top departments
    top_departments = list(queryset.values('requester__group').annotate(
        tickets_created=Count('id')
    ).order_by('-tickets_created')[:5])
    
    # Group distribution for the chart
    group_distribution_raw = list(queryset.values('requester__group').annotate(
        count=Count('id')
    ).order_by('-count'))
    
    # Transform to match frontend expectations
    group_distribution = []
    for item in group_distribution_raw:
        group_distribution.append({
            'group': item['requester__group'],
            'count': item['count']
        })
    
    return Response({
        'top_employees': top_employees,
        'top_technicians': top_technicians,
        'top_departments': top_departments,
        'group_distribution': group_distribution
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_sla_tracking(request):
    """Get SLA tracking statistics"""
    if request.user.role != 'admin':
        return Response({'error': 'Access denied'}, status=status.HTTP_403_FORBIDDEN)
    
    # Get filter parameters
    time_filter = request.GET.get('time_filter', 'all')
    status_filter = request.GET.get('status_filter', 'all')
    priority_filter = request.GET.get('priority_filter', 'all')
    
    # Build base queryset
    queryset = Ticket.objects.filter(status='closed')
    
    # Apply filters
    now = timezone.now()
    if time_filter == 'today':
        queryset = queryset.filter(created_at__date=now.date())
    elif time_filter == 'week':
        week_ago = now - timedelta(days=7)
        queryset = queryset.filter(created_at__gte=week_ago)
    elif time_filter == 'month':
        month_ago = now - timedelta(days=30)
        queryset = queryset.filter(created_at__gte=month_ago)
    elif time_filter == 'quarter':
        quarter_ago = now - timedelta(days=90)
        queryset = queryset.filter(created_at__gte=quarter_ago)
    elif time_filter == 'year':
        year_ago = now - timedelta(days=365)
        queryset = queryset.filter(created_at__gte=year_ago)
    elif time_filter == 'custom':
        start_date = request.GET.get('start_date')
        end_date = request.GET.get('end_date')
        if start_date and end_date:
            queryset = queryset.filter(created_at__date__range=[start_date, end_date])
    
    if priority_filter in ['P1', 'P2', 'P3', 'P4']:
        queryset = queryset.filter(priority=priority_filter)
    
    # Calculate SLA metrics
    total_closed = queryset.count()
    
    # SLA targets (in hours) - you can adjust these
    sla_targets = {'P1': 2, 'P2': 4, 'P3': 8, 'P4': 24}
    
    sla_compliant = 0
    total_resolution_time = 0
    
    for ticket in queryset:
        if ticket.closed_at and ticket.created_at:
            resolution_time = (ticket.closed_at - ticket.created_at).total_seconds() / 3600  # hours
            total_resolution_time += resolution_time
            
            target_hours = sla_targets.get(ticket.priority, 24)
            if resolution_time <= target_hours:
                sla_compliant += 1
    
    sla_compliance_rate = (sla_compliant / total_closed * 100) if total_closed > 0 else 0
    avg_resolution_time = (total_resolution_time / total_closed) if total_closed > 0 else 0
    sla_breaches = total_closed - sla_compliant
    
    return Response({
        'sla_compliance_rate': round(sla_compliance_rate, 1),
        'avg_resolution_time': round(avg_resolution_time, 1),
        'sla_breaches': sla_breaches,
        'total_closed': total_closed
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_quality_metrics(request):
    """Get quality control metrics"""
    if request.user.role != 'admin':
        return Response({'error': 'Access denied'}, status=status.HTTP_403_FORBIDDEN)
    
    # Get filter parameters
    time_filter = request.GET.get('time_filter', 'all')
    status_filter = request.GET.get('status_filter', 'all')
    priority_filter = request.GET.get('priority_filter', 'all')
    
    # Build base queryset
    queryset = Ticket.objects.all()
    
    # Apply filters
    now = timezone.now()
    if time_filter == 'today':
        queryset = queryset.filter(created_at__date=now.date())
    elif time_filter == 'week':
        week_ago = now - timedelta(days=7)
        queryset = queryset.filter(created_at__gte=week_ago)
    elif time_filter == 'month':
        month_ago = now - timedelta(days=30)
        queryset = queryset.filter(created_at__gte=month_ago)
    elif time_filter == 'quarter':
        quarter_ago = now - timedelta(days=90)
        queryset = queryset.filter(created_at__gte=quarter_ago)
    elif time_filter == 'year':
        year_ago = now - timedelta(days=365)
        queryset = queryset.filter(created_at__gte=year_ago)
    elif time_filter == 'custom':
        start_date = request.GET.get('start_date')
        end_date = request.GET.get('end_date')
        if start_date and end_date:
            queryset = queryset.filter(created_at__date__range=[start_date, end_date])
    
    if status_filter == 'open':
        queryset = queryset.filter(status='open')
    elif status_filter == 'in_progress':
        queryset = queryset.filter(status='in_progress')
    elif status_filter == 'closed':
        queryset = queryset.filter(status='closed')
    elif status_filter == 'reopened':
        queryset = queryset.filter(events__event_type='reopened').distinct()
    
    if priority_filter in ['P1', 'P2', 'P3', 'P4']:
        queryset = queryset.filter(priority=priority_filter)
    
    # Calculate quality metrics
    total_tickets = queryset.count()
    reopened_tickets = queryset.filter(events__event_type='reopened').distinct().count()
    closed_tickets = queryset.filter(status='closed').count()
    
    reopen_rate = (reopened_tickets / closed_tickets * 100) if closed_tickets > 0 else 0
    
    return Response({
        'reopened_tickets': reopened_tickets,
        'reopen_rate': round(reopen_rate, 1),
        'total_tickets': total_tickets,
        'closed_tickets': closed_tickets
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_recurring_problems(request):
    """Get top recurring problems"""
    if request.user.role != 'admin':
        return Response({'error': 'Access denied'}, status=status.HTTP_403_FORBIDDEN)
    
    # Get filter parameters
    time_filter = request.GET.get('time_filter', 'all')
    status_filter = request.GET.get('status_filter', 'all')
    priority_filter = request.GET.get('priority_filter', 'all')
    
    # Build base queryset
    queryset = Ticket.objects.all()
    
    # Apply filters
    now = timezone.now()
    if time_filter == 'today':
        queryset = queryset.filter(created_at__date=now.date())
    elif time_filter == 'week':
        week_ago = now - timedelta(days=7)
        queryset = queryset.filter(created_at__gte=week_ago)
    elif time_filter == 'month':
        month_ago = now - timedelta(days=30)
        queryset = queryset.filter(created_at__gte=month_ago)
    elif time_filter == 'quarter':
        quarter_ago = now - timedelta(days=90)
        queryset = queryset.filter(created_at__gte=quarter_ago)
    elif time_filter == 'year':
        year_ago = now - timedelta(days=365)
        queryset = queryset.filter(created_at__gte=year_ago)
    elif time_filter == 'custom':
        start_date = request.GET.get('start_date')
        end_date = request.GET.get('end_date')
        if start_date and end_date:
            queryset = queryset.filter(created_at__date__range=[start_date, end_date])
    
    if status_filter == 'open':
        queryset = queryset.filter(status='open')
    elif status_filter == 'in_progress':
        queryset = queryset.filter(status='in_progress')
    elif status_filter == 'closed':
        queryset = queryset.filter(status='closed')
    elif status_filter == 'reopened':
        queryset = queryset.filter(events__event_type='reopened').distinct()
    
    if priority_filter in ['P1', 'P2', 'P3', 'P4']:
        queryset = queryset.filter(priority=priority_filter)
    
    # Get most common issues by subject similarity
    recurring_problems = list(queryset.values('subject').annotate(
        occurrences=Count('id')
    ).order_by('-occurrences')[:10])
    
    return Response({
        'recurring_problems': recurring_problems
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_employee_statistics(request):
    """Get employee statistics"""
    if request.user.role != 'admin':
        return Response({'error': 'Access denied'}, status=status.HTTP_403_FORBIDDEN)
    
    # Get filter parameters
    time_filter = request.GET.get('time_filter', 'all')
    status_filter = request.GET.get('status_filter', 'all')
    priority_filter = request.GET.get('priority_filter', 'all')
    type_filter = request.GET.get('type_filter', 'all')
    user_filter = request.GET.get('user_filter', 'all')
    group_filter = request.GET.get('group_filter', 'all')
    
    # Build base queryset
    queryset = Ticket.objects.all()
    
    # Apply filters (same logic as other functions)
    now = timezone.now()
    if time_filter == 'today':
        queryset = queryset.filter(created_at__date=now.date())
    elif time_filter == 'week':
        week_ago = now - timedelta(days=7)
        queryset = queryset.filter(created_at__gte=week_ago)
    elif time_filter == 'month':
        month_ago = now - timedelta(days=30)
        queryset = queryset.filter(created_at__gte=month_ago)
    elif time_filter == 'quarter':
        quarter_ago = now - timedelta(days=90)
        queryset = queryset.filter(created_at__gte=quarter_ago)
    elif time_filter == 'year':
        year_ago = now - timedelta(days=365)
        queryset = queryset.filter(created_at__gte=year_ago)
    elif time_filter == 'custom':
        start_date = request.GET.get('start_date')
        end_date = request.GET.get('end_date')
        if start_date and end_date:
            queryset = queryset.filter(created_at__date__range=[start_date, end_date])
    
    if status_filter == 'open':
        queryset = queryset.filter(status='open')
    elif status_filter == 'in_progress':
        queryset = queryset.filter(status='in_progress')
    elif status_filter == 'closed':
        queryset = queryset.filter(status='closed')
    elif status_filter == 'reopened':
        queryset = queryset.filter(events__event_type='reopened').distinct()
    
    if priority_filter in ['P1', 'P2', 'P3', 'P4']:
        queryset = queryset.filter(priority=priority_filter)
    
    if type_filter in ['Network', 'Hardware', 'Software']:
        queryset = queryset.filter(type=type_filter)
    
    # Apply user filter (for employee statistics)
    if user_filter != 'all':
        try:
            user = User.objects.get(id=user_filter)
            queryset = queryset.filter(requester=user)
        except User.DoesNotExist:
            pass
    
    if group_filter != 'all':
        queryset = queryset.filter(requester__group=group_filter)
    
    # Top employees (most tickets created)
    top_employees = list(queryset.values(
        'requester__id', 'requester__first_name', 'requester__last_name', 'requester__group'
    ).annotate(
        tickets_created=Count('id')
    ).order_by('-tickets_created')[:10])
    
    # Employee performance analysis with evolution
    employee_performance = []
    current_month = datetime.now().month
    current_year = datetime.now().year
    
    # Current month data
    current_month_start = datetime(current_year, current_month, 1)
    if current_month == 12:
        current_month_end = datetime(current_year + 1, 1, 1) - timedelta(days=1)
    else:
        current_month_end = datetime(current_year, current_month + 1, 1) - timedelta(days=1)
    
    # Previous month data
    if current_month == 1:
        prev_month_start = datetime(current_year - 1, 12, 1)
        prev_month_end = datetime(current_year, 1, 1) - timedelta(days=1)
    else:
        prev_month_start = datetime(current_year, current_month - 1, 1)
        prev_month_end = datetime(current_year, current_month, 1) - timedelta(days=1)
    
    for emp_data in top_employees:
        emp_id = emp_data['requester__id']
        emp_tickets = queryset.filter(requester__id=emp_id)
        closed_tickets = emp_tickets.filter(status='closed')
        
        # Calculate current month tickets for this employee
        current_month_tickets = emp_tickets.filter(created_at__date__range=[current_month_start.date(), current_month_end.date()]).count()
        
        # Calculate previous month tickets for this employee
        prev_month_tickets = emp_tickets.filter(created_at__date__range=[prev_month_start.date(), prev_month_end.date()]).count()
        
        # Calculate evolution percentage
        evolution_percentage = 0
        if prev_month_tickets > 0:
            evolution_percentage = ((current_month_tickets - prev_month_tickets) / prev_month_tickets) * 100
        elif current_month_tickets > 0:
            evolution_percentage = 100  # 100% increase if no previous tickets
        
        # Calculate average resolution time for this employee's tickets
        avg_resolution_time = 0
        if closed_tickets.exists():
            total_hours = 0
            for ticket in closed_tickets:
                if ticket.closed_at and ticket.created_at:
                    resolution_hours = (ticket.closed_at - ticket.created_at).total_seconds() / 3600
                    total_hours += resolution_hours
            avg_resolution_time = total_hours / closed_tickets.count()
        
        employee_performance.append({
            'employee_id': emp_id,
            'first_name': emp_data['requester__first_name'],
            'last_name': emp_data['requester__last_name'],
            'group': emp_data['requester__group'],
            'tickets_created': emp_data['tickets_created'],
            'tickets_closed': closed_tickets.count(),
            'avg_resolution_time': round(avg_resolution_time, 1),
            'evolution_percentage': round(evolution_percentage, 1)
        })
    
    # Calculate the 3 new metrics
    # 1. Tickets per hour (based on filtered period)
    total_tickets = queryset.count()
    
    # Safety check: if no tickets, return early with default values
    if total_tickets == 0:
        return Response({
            'top_employees': [],
            'employee_performance': [],
            'tickets_per_hour': 0,
            'avg_tickets_per_employee': 0,
            'avg_resolution_by_creator': 0
        })
    
    # Calculate total hours in the filtered period
    total_hours = 0
    if time_filter == 'today':
        total_hours = 24
    elif time_filter == 'week':
        total_hours = 168  # 7 days * 24 hours
    elif time_filter == 'month':
        total_hours = 720  # 30 days * 24 hours
    elif time_filter == 'quarter':
        total_hours = 2160  # 90 days * 24 hours
    elif time_filter == 'year':
        total_hours = 8760  # 365 days * 24 hours
    elif time_filter == 'custom':
        start_date = request.GET.get('start_date')
        end_date = request.GET.get('end_date')
        if start_date and end_date:
            try:
                start_dt = datetime.strptime(start_date, '%Y-%m-%d')
                end_dt = datetime.strptime(end_date, '%Y-%m-%d')
                time_diff = end_dt - start_dt
                total_hours = max(time_diff.total_seconds() / 3600, 1)  # At least 1 hour
            except (ValueError, TypeError):
                total_hours = 1  # Default to 1 hour if date parsing fails
        else:
            total_hours = 1  # Default to 1 hour to avoid division by zero
    else:  # 'all' or any other value
        # For 'all' time filter, calculate based on actual data range
        try:
            if queryset.exists():
                first_ticket = queryset.order_by('created_at').first()
                last_ticket = queryset.order_by('-created_at').first()
                if first_ticket and last_ticket:
                    time_diff = last_ticket.created_at - first_ticket.created_at
                    total_hours = max(time_diff.total_seconds() / 3600, 1)  # At least 1 hour
                else:
                    total_hours = 1
            else:
                total_hours = 1
        except Exception:
            total_hours = 1  # Default to 1 hour if any error occurs
    
    tickets_per_hour = (total_tickets / total_hours) if total_hours > 0 else 0
    
    # Debug logging
    print(f"Employee Stats Debug - Time Filter: {time_filter}, Total Tickets: {total_tickets}, Total Hours: {total_hours}, Tickets per Hour: {tickets_per_hour}")
    
    # 2. Average tickets per employee
    total_employees = User.objects.filter(role='employee').count()
    avg_tickets_per_employee = (total_tickets / total_employees) if total_employees > 0 else 0
    
    # 3. Average resolution time by employee creator
    avg_resolution_by_creator = 0
    closed_tickets = queryset.filter(status='closed', closed_at__isnull=False)
    if closed_tickets.exists():
        total_resolution_hours = 0
        for ticket in closed_tickets:
            resolution_hours = (ticket.closed_at - ticket.created_at).total_seconds() / 3600
            total_resolution_hours += resolution_hours
        avg_resolution_by_creator = total_resolution_hours / closed_tickets.count()
    
    # 4. SLA On-Time Closure Rate for tickets created by employees
    sla_on_time_rate = 0
    closed_tickets_for_sla = queryset.filter(status='closed')
    if closed_tickets_for_sla.exists():
        sla_compliant_tickets = 0
        total_closed_for_sla = closed_tickets_for_sla.count()
        
        for ticket in closed_tickets_for_sla:
            if ticket.closed_at and ticket.created_at:
                resolution_hours = (ticket.closed_at - ticket.created_at).total_seconds() / 3600
                # Define SLA targets based on priority (same as main SLA tracking)
                sla_targets = {'P1': 2, 'P2': 4, 'P3': 8, 'P4': 24}
                sla_target = sla_targets.get(ticket.priority, 24)
                
                if resolution_hours <= sla_target:
                    sla_compliant_tickets += 1
        
        sla_on_time_rate = (sla_compliant_tickets / total_closed_for_sla * 100) if total_closed_for_sla > 0 else 0
    
    # Calculate month-over-month changes for Employee Statistics
    tickets_per_hour_change = 0
    sla_on_time_rate_change = 0
    avg_resolution_by_creator_change = 0
    
    # Current month data for comparison
    current_month_queryset = queryset.filter(
        created_at__gte=current_month_start,
        created_at__lte=current_month_end
    )
    
    # Previous month data for comparison
    prev_month_queryset = queryset.filter(
        created_at__gte=prev_month_start,
        created_at__lte=prev_month_end
    )
    
    # Tickets per hour change
    prev_month_tickets = prev_month_queryset.count()
    if prev_month_tickets > 0:
        prev_month_hours = 0
        if time_filter == 'today':
            prev_month_hours = 24
        elif time_filter == 'week':
            prev_month_hours = 168
        elif time_filter == 'month':
            prev_month_hours = 720
        elif time_filter == 'quarter':
            prev_month_hours = 2160
        elif time_filter == 'year':
            prev_month_hours = 8760
        elif time_filter == 'custom':
            try:
                if custom_start_date and custom_end_date:
                    start_date = datetime.strptime(custom_start_date, '%Y-%m-%d')
                    end_date = datetime.strptime(custom_end_date, '%Y-%m-%d')
                    prev_month_hours = (end_date - start_date).total_seconds() / 3600
            except ValueError:
                prev_month_hours = 1
        else:  # all
            prev_month_hours = 1
        
        prev_month_tickets_per_hour = prev_month_tickets / prev_month_hours if prev_month_hours > 0 else 0
        if prev_month_tickets_per_hour > 0:
            tickets_per_hour_change = ((tickets_per_hour - prev_month_tickets_per_hour) / prev_month_tickets_per_hour) * 100
    
    # SLA on-time rate change
    prev_month_closed_tickets = prev_month_queryset.filter(status='closed')
    if prev_month_closed_tickets.exists():
        prev_month_sla_compliant = 0
        prev_month_total_closed = prev_month_closed_tickets.count()
        
        for ticket in prev_month_closed_tickets:
            if ticket.closed_at and ticket.created_at:
                resolution_hours = (ticket.closed_at - ticket.created_at).total_seconds() / 3600
                # Use same SLA targets as main calculation
                sla_targets = {'P1': 2, 'P2': 4, 'P3': 8, 'P4': 24}
                sla_target = sla_targets.get(ticket.priority, 24)
                
                if resolution_hours <= sla_target:
                    prev_month_sla_compliant += 1
        
        prev_month_sla_rate = (prev_month_sla_compliant / prev_month_total_closed * 100) if prev_month_total_closed > 0 else 0
        sla_on_time_rate_change = sla_on_time_rate - prev_month_sla_rate
    
    # Average resolution by creator change
    prev_month_closed_for_resolution = prev_month_queryset.filter(status='closed')
    if prev_month_closed_for_resolution.exists():
        prev_month_total_resolution_hours = 0
        for ticket in prev_month_closed_for_resolution:
            resolution_hours = (ticket.closed_at - ticket.created_at).total_seconds() / 3600
            prev_month_total_resolution_hours += resolution_hours
        prev_month_avg_resolution = prev_month_total_resolution_hours / prev_month_closed_for_resolution.count()
        avg_resolution_by_creator_change = prev_month_avg_resolution - avg_resolution_by_creator  # Negative is good (faster)
    
    # Employee Performance Chart Data
    employee_chart_data = {
        'chart_type': 'line' if user_filter == 'all' else 'bar',
        'labels': [],
        'datasets': []
    }
    
    if user_filter == 'all':
        # Line Chart: Tickets Created vs Tickets Closed over time
        if time_filter == 'all':
            # 12 months of current year
            current_year = datetime.now().year
            months = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 
                     'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre']
            employee_chart_data['labels'] = months
            
            created_data = []
            closed_data = []
            
            for i in range(1, 13):
                month_start = datetime(current_year, i, 1)
                if i == 12:
                    month_end = datetime(current_year + 1, 1, 1) - timedelta(days=1)
                else:
                    month_end = datetime(current_year, i + 1, 1) - timedelta(days=1)
                
                # Apply all filters except time
                month_queryset = Ticket.objects.all()
                if status_filter == 'open':
                    month_queryset = month_queryset.filter(status='open')
                elif status_filter == 'closed':
                    month_queryset = month_queryset.filter(status='closed')
                elif status_filter == 'reopened':
                    month_queryset = month_queryset.filter(events__event_type='reopened').distinct()
                
                if priority_filter in ['P1', 'P2', 'P3', 'P4']:
                    month_queryset = month_queryset.filter(priority=priority_filter)
                
                if type_filter in ['Network', 'Hardware', 'Software']:
                    month_queryset = month_queryset.filter(type=type_filter)
                
                if group_filter != 'all':
                    month_queryset = month_queryset.filter(requester__group=group_filter)
                
                # Count created and closed tickets for this month
                created_count = month_queryset.filter(created_at__gte=month_start, created_at__lte=month_end).count()
                closed_count = month_queryset.filter(closed_at__gte=month_start, closed_at__lte=month_end).count()
                
                created_data.append(created_count)
                closed_data.append(closed_count)
        else:
            # Use the filtered period
            if time_filter == 'today':
                period_start = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
                period_end = datetime.now()
                employee_chart_data['labels'] = [f"{i}h" for i in range(24)]
                
                created_data = []
                closed_data = []
                
                for hour in range(24):
                    hour_start = period_start + timedelta(hours=hour)
                    hour_end = hour_start + timedelta(hours=1)
                    
                    # Apply filters
                    hour_queryset = Ticket.objects.all()
                    if status_filter == 'open':
                        hour_queryset = hour_queryset.filter(status='open')
                    elif status_filter == 'closed':
                        hour_queryset = hour_queryset.filter(status='closed')
                    elif status_filter == 'reopened':
                        hour_queryset = hour_queryset.filter(events__event_type='reopened').distinct()
                    
                    if priority_filter in ['P1', 'P2', 'P3', 'P4']:
                        hour_queryset = hour_queryset.filter(priority=priority_filter)
                    
                    if type_filter in ['Network', 'Hardware', 'Software']:
                        hour_queryset = hour_queryset.filter(type=type_filter)
                    
                    if group_filter != 'all':
                        hour_queryset = hour_queryset.filter(requester__group=group_filter)
                    
                    created_count = hour_queryset.filter(created_at__gte=hour_start, created_at__lte=hour_end).count()
                    closed_count = hour_queryset.filter(closed_at__gte=hour_start, closed_at__lte=hour_end).count()
                    
                    created_data.append(created_count)
                    closed_data.append(closed_count)
            else:
                # For other time filters, use the existing queryset logic
                employee_chart_data['labels'] = ['Période']
                created_data = [queryset.count()]
                closed_data = [queryset.filter(status='closed').count()]
        
        # Add datasets for line chart based on status filter
        if status_filter == 'all':
            # Show both created and closed tickets
            employee_chart_data['datasets'] = [
                {
                    'label': 'Tickets Créés',
                    'data': created_data,
                    'borderColor': 'rgb(59, 130, 246)',
                    'backgroundColor': 'rgba(59, 130, 246, 0.1)',
                    'tension': 0.1
                },
                {
                    'label': 'Tickets Fermés',
                    'data': closed_data,
                    'borderColor': 'rgb(34, 197, 94)',
                    'backgroundColor': 'rgba(34, 197, 94, 0.1)',
                    'tension': 0.1
                }
            ]
        else:
            # Show only the selected status with appropriate color
            status_colors = {
                'open': {'border': 'rgb(251, 146, 60)', 'background': 'rgba(251, 146, 60, 0.1)'},  # Orange
                'closed': {'border': 'rgb(34, 197, 94)', 'background': 'rgba(34, 197, 94, 0.1)'},  # Green
                'reopened': {'border': 'rgb(239, 68, 68)', 'background': 'rgba(239, 68, 68, 0.1)'}  # Red
            }
            
            status_labels = {
                'open': 'Tickets Ouverts',
                'closed': 'Tickets Fermés',
                'reopened': 'Tickets Rouverts'
            }
            
            color = status_colors.get(status_filter, status_colors['open'])
            label = status_labels.get(status_filter, 'Tickets')
            
            # For specific status, show only that status data
            if status_filter == 'open':
                status_data = created_data  # For open status, show created tickets that are open
            elif status_filter == 'in_progress':
                # For in progress status, show tickets that are in progress
                if time_filter == 'all':
                    status_data = []
                    for i in range(1, 13):
                        month_start = datetime(current_year, i, 1)
                        month_end = datetime(current_year, i + 1, 1) if i < 12 else datetime(current_year + 1, 1, 1)
                        in_progress_count = Ticket.objects.filter(
                            status='in_progress',
                            created_at__date__range=[month_start, month_end]
                        ).count()
                        status_data.append(in_progress_count)
                else:
                    status_data = [queryset.filter(status='in_progress').count()]
            elif status_filter == 'closed':
                status_data = closed_data  # For closed status, show closed tickets
            elif status_filter == 'reopened':
                # For reopened status, we need to recalculate the data
                if time_filter == 'all':
                    status_data = []
                    for i in range(1, 13):
                        month_start = datetime(current_year, i, 1)
                        if i == 12:
                            month_end = datetime(current_year + 1, 1, 1) - timedelta(days=1)
                        else:
                            month_end = datetime(current_year, i + 1, 1) - timedelta(days=1)
                        
                        month_queryset = Ticket.objects.all()
                        if priority_filter in ['P1', 'P2', 'P3', 'P4']:
                            month_queryset = month_queryset.filter(priority=priority_filter)
                        if type_filter in ['Network', 'Hardware', 'Software']:
                            month_queryset = month_queryset.filter(type=type_filter)
                        if group_filter != 'all':
                            month_queryset = month_queryset.filter(requester__group=group_filter)
                        
                        reopened_count = month_queryset.filter(events__event_type='reopened').distinct().count()
                        status_data.append(reopened_count)
                else:
                    status_data = [queryset.filter(events__event_type='reopened').distinct().count()]
            else:
                status_data = created_data
            
            employee_chart_data['datasets'] = [
                {
                    'label': label,
                    'data': status_data,
                    'borderColor': color['border'],
                    'backgroundColor': color['background'],
                    'tension': 0.1
                }
            ]
    else:
        # Bar Chart: Tickets Created vs Closed for the specific employee
        try:
            selected_user = User.objects.get(id=user_filter)
            employee_name = f"{selected_user.first_name} {selected_user.last_name}"
            
            # Get tickets created by this specific employee
            employee_queryset = queryset.filter(requester__id=user_filter)
            
            # Count created and closed tickets for this employee
            created_count = employee_queryset.count()
            closed_count = employee_queryset.filter(status='closed').count()
            
            employee_chart_data['labels'] = [employee_name]
            
            # Add datasets for bar chart based on status filter
            if status_filter == 'all':
                # Show both created and closed tickets
                employee_chart_data['datasets'] = [
                    {
                        'label': 'Tickets Créés',
                        'data': [created_count],
                        'backgroundColor': 'rgba(59, 130, 246, 0.8)'
                    },
                    {
                        'label': 'Tickets Fermés',
                        'data': [closed_count],
                        'backgroundColor': 'rgba(34, 197, 94, 0.8)'
                    }
                ]
            else:
                # Show only the selected status with appropriate color
                status_colors = {
                    'open': 'rgba(251, 146, 60, 0.8)',  # Orange
                    'closed': 'rgba(34, 197, 94, 0.8)',  # Green
                    'reopened': 'rgba(239, 68, 68, 0.8)'  # Red
                }
                
                status_labels = {
                    'open': 'Tickets Ouverts',
                    'closed': 'Tickets Fermés',
                    'reopened': 'Tickets Rouverts'
                }
                
                color = status_colors.get(status_filter, status_colors['open'])
                label = status_labels.get(status_filter, 'Tickets')
                
                # For specific status, show only that status data
                if status_filter == 'open':
                    data_count = employee_queryset.filter(status='open').count()
                elif status_filter == 'in_progress':
                    data_count = employee_queryset.filter(status='in_progress').count()
                elif status_filter == 'closed':
                    data_count = employee_queryset.filter(status='closed').count()
                elif status_filter == 'reopened':
                    data_count = employee_queryset.filter(events__event_type='reopened').distinct().count()
                else:
                    data_count = created_count
                
                employee_chart_data['datasets'] = [
                    {
                        'label': label,
                        'data': [data_count],
                        'backgroundColor': color
                    }
                ]
        except User.DoesNotExist:
            # Fallback if user doesn't exist
            employee_chart_data['labels'] = ['Employé']
            employee_chart_data['datasets'] = [
                {
                    'label': 'Tickets Créés',
                    'data': [0],
                    'backgroundColor': 'rgba(59, 130, 246, 0.8)'
                },
                {
                    'label': 'Tickets Fermés',
                    'data': [0],
                    'backgroundColor': 'rgba(34, 197, 94, 0.8)'
                }
            ]
    
    return Response({
        'top_employees': top_employees,
        'employee_performance': employee_performance,
        'tickets_per_hour': round(tickets_per_hour, 2),
        'avg_tickets_per_employee': round(avg_tickets_per_employee, 1),
        'avg_resolution_by_creator': round(avg_resolution_by_creator, 1),
        'sla_on_time_rate': round(sla_on_time_rate, 1),
        'employee_chart_data': employee_chart_data,
        'monthly_comparisons': {
            'tickets_per_hour_change': round(tickets_per_hour_change, 1),
            'sla_on_time_rate_change': round(sla_on_time_rate_change, 1),
            'avg_resolution_by_creator_change': round(avg_resolution_by_creator_change, 1)
        }
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_technician_statistics(request):
    """Get technician statistics"""
    if request.user.role != 'admin':
        return Response({'error': 'Access denied'}, status=status.HTTP_403_FORBIDDEN)
    
    # Get filter parameters
    time_filter = request.GET.get('time_filter', 'all')
    status_filter = request.GET.get('status_filter', 'all')
    priority_filter = request.GET.get('priority_filter', 'all')
    type_filter = request.GET.get('type_filter', 'all')
    technician_filter = request.GET.get('technician_filter', 'all')
    
    # Build base queryset
    queryset = Ticket.objects.all()
    
    # Apply filters (same logic as other functions)
    now = timezone.now()
    if time_filter == 'today':
        queryset = queryset.filter(created_at__date=now.date())
    elif time_filter == 'week':
        week_ago = now - timedelta(days=7)
        queryset = queryset.filter(created_at__gte=week_ago)
    elif time_filter == 'month':
        month_ago = now - timedelta(days=30)
        queryset = queryset.filter(created_at__gte=month_ago)
    elif time_filter == 'quarter':
        quarter_ago = now - timedelta(days=90)
        queryset = queryset.filter(created_at__gte=quarter_ago)
    elif time_filter == 'year':
        year_ago = now - timedelta(days=365)
        queryset = queryset.filter(created_at__gte=year_ago)
    elif time_filter == 'custom':
        start_date = request.GET.get('start_date')
        end_date = request.GET.get('end_date')
        if start_date and end_date:
            queryset = queryset.filter(created_at__date__range=[start_date, end_date])
    
    if status_filter == 'open':
        queryset = queryset.filter(status='open')
    elif status_filter == 'in_progress':
        queryset = queryset.filter(status='in_progress')
    elif status_filter == 'closed':
        queryset = queryset.filter(status='closed')
    elif status_filter == 'reopened':
        queryset = queryset.filter(events__event_type='reopened').distinct()
    
    if priority_filter in ['P1', 'P2', 'P3', 'P4']:
        queryset = queryset.filter(priority=priority_filter)
    
    if type_filter in ['Network', 'Hardware', 'Software']:
        queryset = queryset.filter(type=type_filter)
    
    # Apply technician filter (for technician statistics)
    if technician_filter != 'all':
        try:
            technician = User.objects.get(id=technician_filter)
            queryset = queryset.filter(
                Q(claimed_by=technician) | Q(additional_technicians=technician)
            ).distinct()
        except User.DoesNotExist:
            pass
    
    # Top technicians (most tickets resolved)
    top_technicians = list(queryset.filter(
        Q(claimed_by__isnull=False) | Q(additional_technicians__isnull=False)
    ).values(
        'claimed_by__id', 'claimed_by__first_name', 'claimed_by__last_name'
    ).annotate(
        tickets_resolved=Count('id')
    ).order_by('-tickets_resolved')[:10])
    
    # Technician performance analysis
    technician_performance = []
    for tech_data in top_technicians:
        tech_id = tech_data['claimed_by__id']
        tech_tickets = queryset.filter(
            Q(claimed_by__id=tech_id) | Q(additional_technicians__id=tech_id)
        ).distinct()
        closed_tickets = tech_tickets.filter(status='closed')
        
        # Calculate average resolution time for this technician's tickets
        avg_resolution_time = 0
        if closed_tickets.exists():
            total_hours = 0
            for ticket in closed_tickets:
                if ticket.closed_at and ticket.created_at:
                    resolution_hours = (ticket.closed_at - ticket.created_at).total_seconds() / 3600
                    total_hours += resolution_hours
            avg_resolution_time = total_hours / closed_tickets.count()
        
        # Calculate average response time
        avg_response_time = 0
        tickets_with_response = tech_tickets.filter(
            events__event_type__in=['claimed', 'technician_added']
        ).distinct()
        if tickets_with_response.exists():
            total_frt_hours = 0
            for ticket in tickets_with_response:
                first_response_event = ticket.events.filter(
                    event_type__in=['claimed', 'technician_added']
                ).order_by('created_at').first()
                if first_response_event:
                    frt_hours = (first_response_event.created_at - ticket.created_at).total_seconds() / 3600
                    total_frt_hours += frt_hours
            avg_response_time = total_frt_hours / tickets_with_response.count()
        
        technician_performance.append({
            'technician_id': tech_id,
            'first_name': tech_data['claimed_by__first_name'],
            'last_name': tech_data['claimed_by__last_name'],
            'tickets_resolved': tech_data['tickets_resolved'],
            'tickets_closed': closed_tickets.count(),
            'avg_resolution_time': round(avg_resolution_time, 1),
            'avg_response_time': round(avg_response_time, 1)
        })
    
    return Response({
        'top_technicians': top_technicians,
        'technician_performance': technician_performance
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_group_statistics(request):
    """Get group/department statistics"""
    if request.user.role != 'admin':
        return Response({'error': 'Access denied'}, status=status.HTTP_403_FORBIDDEN)
    
    # Get filter parameters
    time_filter = request.GET.get('time_filter', 'all')
    status_filter = request.GET.get('status_filter', 'all')
    priority_filter = request.GET.get('priority_filter', 'all')
    type_filter = request.GET.get('type_filter', 'all')
    group_filter = request.GET.get('group_filter', 'all')
    
    # Build base queryset
    queryset = Ticket.objects.all()
    
    # Apply filters (same logic as other functions)
    now = timezone.now()
    if time_filter == 'today':
        queryset = queryset.filter(created_at__date=now.date())
    elif time_filter == 'week':
        week_ago = now - timedelta(days=7)
        queryset = queryset.filter(created_at__gte=week_ago)
    elif time_filter == 'month':
        month_ago = now - timedelta(days=30)
        queryset = queryset.filter(created_at__gte=month_ago)
    elif time_filter == 'quarter':
        quarter_ago = now - timedelta(days=90)
        queryset = queryset.filter(created_at__gte=quarter_ago)
    elif time_filter == 'year':
        year_ago = now - timedelta(days=365)
        queryset = queryset.filter(created_at__gte=year_ago)
    elif time_filter == 'custom':
        start_date = request.GET.get('start_date')
        end_date = request.GET.get('end_date')
        if start_date and end_date:
            queryset = queryset.filter(created_at__date__range=[start_date, end_date])
    
    if status_filter == 'open':
        queryset = queryset.filter(status='open')
    elif status_filter == 'in_progress':
        queryset = queryset.filter(status='in_progress')
    elif status_filter == 'closed':
        queryset = queryset.filter(status='closed')
    elif status_filter == 'reopened':
        queryset = queryset.filter(events__event_type='reopened').distinct()
    
    if priority_filter in ['P1', 'P2', 'P3', 'P4']:
        queryset = queryset.filter(priority=priority_filter)
    
    if type_filter in ['Network', 'Hardware', 'Software']:
        queryset = queryset.filter(type=type_filter)
    
    if group_filter != 'all':
        queryset = queryset.filter(requester__group=group_filter)
    
    # Top groups/departments (most tickets created)
    top_groups = list(queryset.values('requester__group').annotate(
        tickets_created=Count('id')
    ).order_by('-tickets_created')[:10])
    
    # Group performance analysis
    group_performance = []
    for group_data in top_groups:
        group_name = group_data['requester__group']
        group_tickets = queryset.filter(requester__group=group_name)
        closed_tickets = group_tickets.filter(status='closed')
        
        # Calculate average resolution time for this group's tickets
        avg_resolution_time = 0
        if closed_tickets.exists():
            total_hours = 0
            for ticket in closed_tickets:
                if ticket.closed_at and ticket.created_at:
                    resolution_hours = (ticket.closed_at - ticket.created_at).total_seconds() / 3600
                    total_hours += resolution_hours
            avg_resolution_time = total_hours / closed_tickets.count()
        
        group_performance.append({
            'group_name': group_name,
            'tickets_created': group_data['tickets_created'],
            'tickets_closed': closed_tickets.count(),
            'avg_resolution_time': round(avg_resolution_time, 1)
        })
    
    return Response({
        'top_groups': top_groups,
        'group_performance': group_performance
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_performance_statistics(request):
    """Get performance statistics (First Response Time)"""
    if request.user.role != 'admin':
        return Response({'error': 'Access denied'}, status=status.HTTP_403_FORBIDDEN)
    
    # Get filter parameters
    time_filter = request.GET.get('time_filter', 'all')
    priority_filter = request.GET.get('priority_filter', 'all')
    type_filter = request.GET.get('type_filter', 'all')
    technician_filter = request.GET.get('technician_filter', 'all')
    group_filter = request.GET.get('group_filter', 'all')
    response_time_range = request.GET.get('response_time_range', 'all')
    
    # Build base queryset
    queryset = Ticket.objects.all()
    
    # Apply filters (same logic as other functions)
    now = timezone.now()
    if time_filter == 'today':
        queryset = queryset.filter(created_at__date=now.date())
    elif time_filter == 'week':
        week_ago = now - timedelta(days=7)
        queryset = queryset.filter(created_at__gte=week_ago)
    elif time_filter == 'month':
        month_ago = now - timedelta(days=30)
        queryset = queryset.filter(created_at__gte=month_ago)
    elif time_filter == 'quarter':
        quarter_ago = now - timedelta(days=90)
        queryset = queryset.filter(created_at__gte=quarter_ago)
    elif time_filter == 'year':
        year_ago = now - timedelta(days=365)
        queryset = queryset.filter(created_at__gte=year_ago)
    elif time_filter == 'custom':
        start_date = request.GET.get('start_date')
        end_date = request.GET.get('end_date')
        if start_date and end_date:
            queryset = queryset.filter(created_at__date__range=[start_date, end_date])
    
    if priority_filter in ['P1', 'P2', 'P3', 'P4']:
        queryset = queryset.filter(priority=priority_filter)
    
    if type_filter in ['Network', 'Hardware', 'Software']:
        queryset = queryset.filter(type=type_filter)
    
    if technician_filter != 'all':
        try:
            technician = User.objects.get(id=technician_filter)
            queryset = queryset.filter(
                Q(claimed_by=technician) | Q(additional_technicians=technician)
            ).distinct()
        except User.DoesNotExist:
            pass
    
    if group_filter != 'all':
        queryset = queryset.filter(requester__group=group_filter)
    
    # Calculate FRT statistics
    tickets_with_response = queryset.filter(
        events__event_type__in=['claimed', 'technician_added']
    ).distinct()
    
    avg_frt = 0
    frt_by_priority = []
    frt_distribution = []
    
    if tickets_with_response.exists():
        total_frt_hours = 0
        frt_data = []
        
        for ticket in tickets_with_response:
            first_response_event = ticket.events.filter(
                event_type__in=['claimed', 'technician_added']
            ).order_by('created_at').first()
            if first_response_event:
                frt_hours = (first_response_event.created_at - ticket.created_at).total_seconds() / 3600
                total_frt_hours += frt_hours
                frt_data.append({
                    'ticket_id': str(ticket.id),
                    'frt_hours': frt_hours,
                    'priority': ticket.priority
                })
        
        avg_frt = total_frt_hours / tickets_with_response.count()
        
        # FRT by priority
        priority_frt = {}
        for data in frt_data:
            priority = data['priority']
            if priority not in priority_frt:
                priority_frt[priority] = []
            priority_frt[priority].append(data['frt_hours'])
        
        for priority, frt_list in priority_frt.items():
            frt_by_priority.append({
                'priority': priority,
                'avg_frt': round(sum(frt_list) / len(frt_list), 1),
                'count': len(frt_list)
            })
        
        # FRT distribution (response time ranges)
        range_counts = {
            '0-1h': 0,
            '1-4h': 0,
            '4-8h': 0,
            '8-24h': 0,
            '>24h': 0
        }
        
        for data in frt_data:
            frt_hours = data['frt_hours']
            if frt_hours <= 1:
                range_counts['0-1h'] += 1
            elif frt_hours <= 4:
                range_counts['1-4h'] += 1
            elif frt_hours <= 8:
                range_counts['4-8h'] += 1
            elif frt_hours <= 24:
                range_counts['8-24h'] += 1
            else:
                range_counts['>24h'] += 1
        
        frt_distribution = [{'range': k, 'count': v} for k, v in range_counts.items()]
    
    return Response({
        'avg_frt': round(avg_frt, 1),
        'frt_by_priority': frt_by_priority,
        'frt_distribution': frt_distribution,
        'total_tickets_with_response': tickets_with_response.count()
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_trends_statistics(request):
    """Get trends statistics (Ticket Volume Trends)"""
    if request.user.role != 'admin':
        return Response({'error': 'Access denied'}, status=status.HTTP_403_FORBIDDEN)
    
    # Get filter parameters
    time_filter = request.GET.get('time_filter', 'all')
    type_filter = request.GET.get('type_filter', 'all')
    priority_filter = request.GET.get('priority_filter', 'all')
    group_filter = request.GET.get('group_filter', 'all')
    status_filter = request.GET.get('status_filter', 'all')
    
    # Build base queryset
    queryset = Ticket.objects.all()
    
    # Apply filters (same logic as other functions)
    now = timezone.now()
    if time_filter == 'today':
        queryset = queryset.filter(created_at__date=now.date())
    elif time_filter == 'week':
        week_ago = now - timedelta(days=7)
        queryset = queryset.filter(created_at__gte=week_ago)
    elif time_filter == 'month':
        month_ago = now - timedelta(days=30)
        queryset = queryset.filter(created_at__gte=month_ago)
    elif time_filter == 'quarter':
        quarter_ago = now - timedelta(days=90)
        queryset = queryset.filter(created_at__gte=quarter_ago)
    elif time_filter == 'year':
        year_ago = now - timedelta(days=365)
        queryset = queryset.filter(created_at__gte=year_ago)
    elif time_filter == 'custom':
        start_date = request.GET.get('start_date')
        end_date = request.GET.get('end_date')
        if start_date and end_date:
            queryset = queryset.filter(created_at__date__range=[start_date, end_date])
    
    if status_filter == 'open':
        queryset = queryset.filter(status='open')
    elif status_filter == 'in_progress':
        queryset = queryset.filter(status='in_progress')
    elif status_filter == 'closed':
        queryset = queryset.filter(status='closed')
    elif status_filter == 'reopened':
        queryset = queryset.filter(events__event_type='reopened').distinct()
    
    if priority_filter in ['P1', 'P2', 'P3', 'P4']:
        queryset = queryset.filter(priority=priority_filter)
    
    if type_filter in ['Network', 'Hardware', 'Software']:
        queryset = queryset.filter(type=type_filter)
    
    if group_filter != 'all':
        queryset = queryset.filter(requester__group=group_filter)
    
    # Daily trends (last 30 days)
    daily_trends = []
    for i in range(30):
        date = now.date() - timedelta(days=i)
        count = queryset.filter(created_at__date=date).count()
        daily_trends.append({
            'date': date.strftime('%Y-%m-%d'),
            'count': count
        })
    daily_trends.reverse()
    
    # Weekly trends (last 12 weeks)
    weekly_trends = []
    for i in range(12):
        week_start = now.date() - timedelta(weeks=i+1)
        week_end = now.date() - timedelta(weeks=i)
        count = queryset.filter(created_at__date__range=[week_start, week_end]).count()
        weekly_trends.append({
            'week': f"Week {12-i}",
            'count': count
        })
    weekly_trends.reverse()
    
    # Monthly trends (last 12 months)
    monthly_trends = []
    for i in range(12):
        month_start = now.replace(day=1) - timedelta(days=30*i)
        month_end = month_start + timedelta(days=30)
        count = queryset.filter(created_at__date__range=[month_start.date(), month_end.date()]).count()
        monthly_trends.append({
            'month': month_start.strftime('%Y-%m'),
            'count': count
        })
    monthly_trends.reverse()
    
    # Growth rate calculation
    current_period = queryset.filter(created_at__gte=now - timedelta(days=30)).count()
    previous_period = queryset.filter(
        created_at__gte=now - timedelta(days=60),
        created_at__lt=now - timedelta(days=30)
    ).count()
    
    growth_rate = 0
    if previous_period > 0:
        growth_rate = ((current_period - previous_period) / previous_period) * 100
    
    # Volume by type
    volume_by_type = list(queryset.values('type').annotate(count=Count('id')).order_by('-count'))
    
    # Volume by priority
    volume_by_priority = list(queryset.values('priority').annotate(count=Count('id')).order_by('priority'))
    
    # Volume by department
    volume_by_department = list(queryset.values('requester__group').annotate(count=Count('id')).order_by('-count'))
    
    return Response({
        'daily_trends': daily_trends,
        'weekly_trends': weekly_trends,
        'monthly_trends': monthly_trends,
        'growth_rate': round(growth_rate, 1),
        'volume_by_type': volume_by_type,
        'volume_by_priority': volume_by_priority,
        'volume_by_department': volume_by_department
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_workload_statistics(request):
    """Get workload statistics"""
    if request.user.role != 'admin':
        return Response({'error': 'Access denied'}, status=status.HTTP_403_FORBIDDEN)
    
    # Get filter parameters
    time_filter = request.GET.get('time_filter', 'all')
    technician_filter = request.GET.get('technician_filter', 'all')
    priority_filter = request.GET.get('priority_filter', 'all')
    type_filter = request.GET.get('type_filter', 'all')
    
    # Build base queryset
    queryset = Ticket.objects.filter(status='open')  # Only active tickets
    
    # Apply filters (same logic as other functions)
    now = timezone.now()
    if time_filter == 'today':
        queryset = queryset.filter(created_at__date=now.date())
    elif time_filter == 'week':
        week_ago = now - timedelta(days=7)
        queryset = queryset.filter(created_at__gte=week_ago)
    elif time_filter == 'month':
        month_ago = now - timedelta(days=30)
        queryset = queryset.filter(created_at__gte=month_ago)
    elif time_filter == 'quarter':
        quarter_ago = now - timedelta(days=90)
        queryset = queryset.filter(created_at__gte=quarter_ago)
    elif time_filter == 'year':
        year_ago = now - timedelta(days=365)
        queryset = queryset.filter(created_at__gte=year_ago)
    elif time_filter == 'custom':
        start_date = request.GET.get('start_date')
        end_date = request.GET.get('end_date')
        if start_date and end_date:
            queryset = queryset.filter(created_at__date__range=[start_date, end_date])
    
    if priority_filter in ['P1', 'P2', 'P3', 'P4']:
        queryset = queryset.filter(priority=priority_filter)
    
    if type_filter in ['Network', 'Hardware', 'Software']:
        queryset = queryset.filter(type=type_filter)
    
    if technician_filter != 'all':
        try:
            technician = User.objects.get(id=technician_filter)
            queryset = queryset.filter(
                Q(claimed_by=technician) | Q(additional_technicians=technician)
            ).distinct()
        except User.DoesNotExist:
            pass
    
    # Get all technicians
    technicians = User.objects.filter(role='technician')
    
    # Current workload per technician
    workload_data = []
    total_active_tickets = 0
    
    for technician in technicians:
        active_tickets = queryset.filter(
            Q(claimed_by=technician) | Q(additional_technicians=technician)
        ).distinct().count()
        
        total_active_tickets += active_tickets
        
        workload_data.append({
            'technician_id': str(technician.id),
            'first_name': technician.first_name,
            'last_name': technician.last_name,
            'active_tickets': active_tickets,
            'capacity_utilization': min(active_tickets * 10, 100)  # Assuming 10 tickets = 100% capacity
        })
    
    # Workload distribution
    workload_distribution = {
        'under_capacity': len([w for w in workload_data if w['active_tickets'] < 5]),
        'normal_capacity': len([w for w in workload_data if 5 <= w['active_tickets'] < 10]),
        'over_capacity': len([w for w in workload_data if w['active_tickets'] >= 10])
    }
    
    # Overload alerts
    overload_alerts = [w for w in workload_data if w['active_tickets'] >= 10]
    
    # Workload trends (last 7 days)
    workload_trends = []
    for i in range(7):
        date = now.date() - timedelta(days=i)
        daily_workload = queryset.filter(created_at__date=date).count()
        workload_trends.append({
            'date': date.strftime('%Y-%m-%d'),
            'workload': daily_workload
        })
    workload_trends.reverse()
    
    return Response({
        'workload_data': workload_data,
        'workload_distribution': workload_distribution,
        'overload_alerts': overload_alerts,
        'workload_trends': workload_trends,
        'total_active_tickets': total_active_tickets
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_system_statistics(request):
    """Get system performance statistics"""
    if request.user.role != 'admin':
        return Response({'error': 'Access denied'}, status=status.HTTP_403_FORBIDDEN)
    
    # Get filter parameters
    time_filter = request.GET.get('time_filter', 'all')
    system_component = request.GET.get('system_component', 'all')
    metric_type = request.GET.get('metric_type', 'all')
    
    # Mock system performance data (in real implementation, this would come from monitoring systems)
    now = timezone.now()
    
    # System response time (mock data)
    response_times = []
    for i in range(24):  # Last 24 hours
        hour = now - timedelta(hours=i)
        avg_response_time = 150 + (i % 5) * 20  # Mock data: 150-250ms
        response_times.append({
            'hour': hour.strftime('%H:00'),
            'response_time': avg_response_time
        })
    response_times.reverse()
    
    # Uptime (mock data)
    uptime_percentage = 99.8
    
    # Error rates (mock data)
    error_rates = []
    for i in range(7):  # Last 7 days
        date = now.date() - timedelta(days=i)
        error_rate = 0.1 + (i % 3) * 0.05  # Mock data: 0.1-0.2%
        error_rates.append({
            'date': date.strftime('%Y-%m-%d'),
            'error_rate': error_rate
        })
    error_rates.reverse()
    
    # Resource usage (mock data)
    resource_usage = {
        'cpu_usage': 45.2,
        'memory_usage': 67.8,
        'disk_usage': 23.1,
        'network_usage': 12.5
    }
    
    # Performance trends (mock data)
    performance_trends = []
    for i in range(30):  # Last 30 days
        date = now.date() - timedelta(days=i)
        performance_score = 85 + (i % 10) * 1.5  # Mock data: 85-100
        performance_trends.append({
            'date': date.strftime('%Y-%m-%d'),
            'performance_score': round(performance_score, 1)
        })
    performance_trends.reverse()
    
    # System health metrics
    system_health = {
        'overall_health': 92.5,
        'database_health': 95.2,
        'api_health': 89.7,
        'frontend_health': 94.1
    }
    
    return Response({
        'response_times': response_times,
        'uptime_percentage': uptime_percentage,
        'error_rates': error_rates,
        'resource_usage': resource_usage,
        'performance_trends': performance_trends,
        'system_health': system_health
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_employees_list(request):
    """Get list of all employees for filter dropdowns"""
    if request.user.role != 'admin':
        return Response({'error': 'Access denied'}, status=status.HTTP_403_FORBIDDEN)
    
    employees = User.objects.filter(role='employee').values('id', 'first_name', 'last_name', 'group')
    return Response({
        'employees': list(employees)
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_technicians_list(request):
    """Get list of all technicians for filter dropdowns and ticket assignment"""
    # Allow both admin and technician users to access this endpoint
    if request.user.role not in ['admin', 'technician']:
        return Response({'error': 'Access denied'}, status=status.HTTP_403_FORBIDDEN)
    
    technicians = User.objects.filter(role='technician').values('id', 'first_name', 'last_name')
    return Response({
        'technicians': list(technicians)
    })