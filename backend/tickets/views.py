from rest_framework import generics, status, serializers
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters
from django.db.models import Q, Count
from django.utils import timezone
from .models import Ticket, TicketAttachment, TicketEvent, TicketMessage, TicketClosureReport, TicketClosureReportAttachment, ReplacedPart
from .serializers import (
    TicketSerializer, TicketListSerializer, TicketCreateSerializer, TicketAttachmentSerializer,
    TicketEventSerializer, TicketMessageSerializer, TicketClosureReportSerializer,
    TicketClosureReportAttachmentSerializer, ReplacedPartSerializer
)
from .email_service import email_service
from users.models import User

class TicketListView(generics.ListCreateAPIView):
    serializer_class = TicketListSerializer  # Use list serializer with all needed fields
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['status', 'type', 'priority']
    search_fields = ['subject', 'description', 'short_id']
    ordering_fields = ['created_at', 'priority', 'status']
    ordering = ['status', 'priority', '-created_at']  # Custom ordering will be handled in get_queryset
    # Pagination is handled by Django REST Framework settings (PAGE_SIZE: 20)
    
    def get_queryset(self):
        user = self.request.user
        
        if user.role == 'admin':
            queryset = Ticket.objects.select_related(
                'requester', 'assigned_to', 'claimed_by'
            ).prefetch_related(
                'additional_technicians', 'attachments', 'messages', 'events'
            )
            
            status_filter = self.request.query_params.get('status', None)
            if status_filter:
                queryset = queryset.filter(status=status_filter)
                
            priority_filter = self.request.query_params.get('priority', None)
            if priority_filter:
                queryset = queryset.filter(priority=priority_filter)
                
            group_filter = self.request.query_params.get('group', None)
            if group_filter:
                queryset = queryset.filter(requester__group=group_filter)
            
            # Time filter support
            created_after = self.request.query_params.get('created_after', None)
            if created_after:
                from datetime import datetime
                try:
                    created_after_date = datetime.fromisoformat(created_after.replace('Z', '+00:00'))
                    queryset = queryset.filter(created_at__gte=created_after_date)
                except ValueError:
                    pass  # Invalid date format, ignore
                
            filter_type = self.request.query_params.get('filter', None)
            if filter_type == 'reopened':
                queryset = queryset.filter(events__event_type='reopened').distinct()
            
            # Apply custom ordering: En cours → Rouvert → Ouvert (by priority) → Fermé
            # Only apply custom ordering if no specific ordering is requested
            ordering_param = self.request.query_params.get('ordering', None)
            if not ordering_param:
                from django.db.models import Case, When, IntegerField
                queryset = queryset.annotate(
                    status_order=Case(
                        When(status='in_progress', then=1),
                        When(status='reopened', then=2),
                        When(status='open', then=3),
                        When(status='closed', then=4),
                        default=5,
                        output_field=IntegerField(),
                    ),
                    priority_order=Case(
                        When(priority='P1', then=1),
                        When(priority='P2', then=2),
                        When(priority='P3', then=3),
                        When(priority='P4', then=4),
                        default=5,
                        output_field=IntegerField(),
                    )
                ).order_by('status_order', 'priority_order', '-created_at')
                
            return queryset
            
        elif user.role == 'technician':
            # Base queryset: tickets that are unassigned OR claimed by user OR user is additional technician
            base_queryset = Ticket.objects.select_related(
                'requester', 'assigned_to', 'claimed_by'
            ).prefetch_related(
                'additional_technicians', 'attachments', 'messages', 'events'
            )
            
            queryset = base_queryset.filter(
                Q(claimed_by__isnull=True) | 
                Q(claimed_by=user) | 
                Q(additional_technicians=user)
            ).distinct()
            
            # Apply same filters as admin
            status_filter = self.request.query_params.get('status', None)
            if status_filter:
                queryset = queryset.filter(status=status_filter)
                
            priority_filter = self.request.query_params.get('priority', None)
            if priority_filter:
                queryset = queryset.filter(priority=priority_filter)
                
            group_filter = self.request.query_params.get('group', None)
            if group_filter:
                queryset = queryset.filter(requester__group=group_filter)
            
            # Time filter support
            created_after = self.request.query_params.get('created_after', None)
            if created_after:
                from datetime import datetime
                try:
                    created_after_date = datetime.fromisoformat(created_after.replace('Z', '+00:00'))
                    queryset = queryset.filter(created_at__gte=created_after_date)
                except ValueError:
                    pass  # Invalid date format, ignore
            
            filter_type = self.request.query_params.get('filter', None)
            if filter_type == 'unassigned':
                queryset = queryset.filter(claimed_by__isnull=True)
            elif filter_type == 'my-open':
                # Show all open tickets in the system, not just technician's tickets
                queryset = base_queryset.filter(status='open')
            elif filter_type == 'closed':
                assigned_to = self.request.query_params.get('assigned', None)
                if assigned_to == 'me':
                    queryset = queryset.filter(
                        Q(claimed_by=user) | Q(additional_technicians=user),
                        status='closed'
                    )
                else:
                    queryset = queryset.filter(status='closed')
            elif filter_type == 'reopened':
                queryset = queryset.filter(
                    Q(claimed_by=user) | Q(additional_technicians=user),
                    events__event_type='reopened'
                ).distinct()
            
            # Apply custom ordering: En cours → Rouvert → Ouvert (by priority) → Fermé
            # Only apply custom ordering if no specific ordering is requested
            ordering_param = self.request.query_params.get('ordering', None)
            if not ordering_param:
                from django.db.models import Case, When, IntegerField
                queryset = queryset.annotate(
                    status_order=Case(
                        When(status='in_progress', then=1),
                        When(status='reopened', then=2),
                        When(status='open', then=3),
                        When(status='closed', then=4),
                        default=5,
                        output_field=IntegerField(),
                    ),
                    priority_order=Case(
                        When(priority='P1', then=1),
                        When(priority='P2', then=2),
                        When(priority='P3', then=3),
                        When(priority='P4', then=4),
                        default=5,
                        output_field=IntegerField(),
                    )
                ).order_by('status_order', 'priority_order', '-created_at')
                
            return queryset
            
        else:  # employee role
            queryset = Ticket.objects.select_related(
                'requester', 'assigned_to', 'claimed_by'
            ).prefetch_related(
                'additional_technicians', 'attachments', 'messages', 'events'
            ).filter(requester=user)
            
            # Apply same filters as admin and technician
            status_filter = self.request.query_params.get('status', None)
            if status_filter:
                queryset = queryset.filter(status=status_filter)
                
            priority_filter = self.request.query_params.get('priority', None)
            if priority_filter:
                queryset = queryset.filter(priority=priority_filter)
                
            group_filter = self.request.query_params.get('group', None)
            if group_filter:
                queryset = queryset.filter(requester__group=group_filter)
            
            # Time filter support
            created_after = self.request.query_params.get('created_after', None)
            if created_after:
                from datetime import datetime
                try:
                    created_after_date = datetime.fromisoformat(created_after.replace('Z', '+00:00'))
                    queryset = queryset.filter(created_at__gte=created_after_date)
                except ValueError:
                    pass  # Invalid date format, ignore
            
            mine = self.request.query_params.get('mine', None)
            if mine:
                assigned = self.request.query_params.get('assigned', None)
                if assigned == 'none':
                    queryset = queryset.filter(claimed_by__isnull=True)
                elif assigned == 'me':
                    queryset = queryset.filter(claimed_by=user)
            
            # Apply custom ordering: En cours → Rouvert → Ouvert (by priority) → Fermé
            # Only apply custom ordering if no specific ordering is requested
            ordering_param = self.request.query_params.get('ordering', None)
            if not ordering_param:
                from django.db.models import Case, When, IntegerField
                queryset = queryset.annotate(
                    status_order=Case(
                        When(status='in_progress', then=1),
                        When(status='reopened', then=2),
                        When(status='open', then=3),
                        When(status='closed', then=4),
                        default=5,
                        output_field=IntegerField(),
                    ),
                    priority_order=Case(
                        When(priority='P1', then=1),
                        When(priority='P2', then=2),
                        When(priority='P3', then=3),
                        When(priority='P4', then=4),
                        default=5,
                        output_field=IntegerField(),
                    )
                ).order_by('status_order', 'priority_order', '-created_at')
                
            return queryset
    
    def get_serializer_class(self):
        if self.request.method == 'POST':
            return TicketCreateSerializer
        return TicketListSerializer  # Use list serializer with all needed fields
    
    def create(self, request, *args, **kwargs):
        print(f"TicketListView.create called with request data: {request.data}")
        print(f"Request FILES: {request.FILES}")
        print(f"Request user: {request.user}")
        
        try:
            return super().create(request, *args, **kwargs)
        except Exception as e:
            print(f"Error in TicketListView.create: {e}")
            print(f"Error type: {type(e)}")
            import traceback
            traceback.print_exc()
            raise

class TicketDetailView(generics.RetrieveUpdateAPIView):
    serializer_class = TicketSerializer
    permission_classes = [IsAuthenticated]
    lookup_field = 'pk'
    
    def get_queryset(self):
        user = self.request.user
        
        if user.role == 'admin':
            return Ticket.objects.select_related(
                'requester', 'assigned_to', 'claimed_by'
            ).prefetch_related(
                'additional_technicians', 'attachments', 'messages', 'events'
            )
        elif user.role == 'technician':
            return Ticket.objects.select_related(
                'requester', 'assigned_to', 'claimed_by'
            ).prefetch_related(
                'additional_technicians', 'attachments', 'messages', 'events'
            ).filter(
                Q(claimed_by__isnull=True) | 
                Q(claimed_by=user) | 
                Q(additional_technicians=user)
            ).distinct()
        else:
            return Ticket.objects.select_related(
                'requester', 'assigned_to', 'claimed_by'
            ).prefetch_related(
                'additional_technicians', 'attachments', 'messages', 'events'
            ).filter(requester=user)

class TicketDashboardView(generics.GenericAPIView):
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        user = request.user
        
        if user.role == 'technician':
            # Single optimized query for technician dashboard
            ticket_stats = Ticket.objects.filter(
                Q(claimed_by__isnull=True) | Q(claimed_by=user) | Q(additional_technicians=user)
            ).aggregate(
                unassigned_tickets=Count('id', filter=Q(claimed_by__isnull=True, status='open')),
                my_open_tickets=Count('id', filter=Q(
                    (Q(claimed_by=user) | Q(additional_technicians=user)) & Q(status='open')
                )),
                closed_tickets=Count('id', filter=Q(
                    (Q(claimed_by=user) | Q(additional_technicians=user)) & Q(status='closed')
                ))
            )
            
            return Response(ticket_stats)
        
        elif user.role == 'employee':
            # Single optimized query for employee dashboard
            ticket_stats = Ticket.objects.filter(requester=user).aggregate(
                opened_tickets=Count('id', filter=Q(status='open')),
                unassigned_tickets=Count('id', filter=Q(status='open', claimed_by__isnull=True)),
                closed_tickets=Count('id', filter=Q(status='closed')),
                total_tickets=Count('id')
            )
            
            return Response(ticket_stats)
        
        else:
            return Response({'error': 'Invalid user role'}, status=status.HTTP_400_BAD_REQUEST)

class TicketAttachmentView(generics.ListCreateAPIView):
    serializer_class = TicketAttachmentSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        ticket_id = self.kwargs['ticket_id']
        return TicketAttachment.objects.filter(ticket_id=ticket_id)
    
    def create(self, request, *args, **kwargs):
        """Handle file upload for ticket attachments"""
        ticket_id = self.kwargs['ticket_id']
        
        # Get the uploaded file
        file = request.FILES.get('file')
        if not file:
            return Response({'error': 'No file provided'}, status=status.HTTP_400_BAD_REQUEST)
        
        print(f"Uploading file: {file.name}, size: {file.size}, type: {file.content_type}")
        
        try:
            # Create the attachment directly
            attachment = TicketAttachment.objects.create(
                ticket_id=ticket_id,
                uploaded_by=request.user,
                file_name=file.name,
                mime_type=file.content_type,
                size_bytes=file.size,
                storage_url=file
            )
            
            # Serialize the response
            serializer = self.get_serializer(attachment)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
            
        except Exception as e:
            print(f"Error creating attachment: {e}")
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

class TicketMessageView(generics.ListCreateAPIView):
    serializer_class = TicketMessageSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        ticket_id = self.kwargs['ticket_id']
        return TicketMessage.objects.filter(ticket_id=ticket_id)
    
    def perform_create(self, serializer):
        """Set the sender and ticket when creating a message"""
        ticket_id = self.kwargs['ticket_id']
        serializer.save(sender=self.request.user, ticket_id=ticket_id)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def accept_ticket(request, ticket_id):
    """Accept a ticket (technician only)"""
    if request.user.role != 'technician':
        return Response({'error': 'Only technicians can accept tickets'}, status=status.HTTP_403_FORBIDDEN)
    
    try:
        ticket = Ticket.objects.get(id=ticket_id)
        if ticket.claimed_by:
            return Response({'error': 'Ticket already claimed'}, status=status.HTTP_400_BAD_REQUEST)
        
        ticket.claimed_by = request.user
        ticket.status = 'in_progress'
        ticket.save()
        
        # Create event log
        event = TicketEvent.objects.create(
            ticket=ticket,
            actor=request.user,
            event_type='claimed',
            from_value='open',
            to_value='in_progress'
        )
        
        # Send email notification to the employee who created the ticket
        email_service.notify_ticket_claimed(ticket, event)
        
        return Response({'message': 'Ticket accepted successfully'})
    except Ticket.DoesNotExist:
        return Response({'error': 'Ticket not found'}, status=status.HTTP_404_NOT_FOUND)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def add_technician(request, ticket_id):
    """Add additional technician to ticket (admin only)"""
    if request.user.role != 'admin':
        return Response({'error': 'Only admins can add technicians'}, status=status.HTTP_403_FORBIDDEN)
    
    try:
        ticket = Ticket.objects.get(id=ticket_id)
        technician_id = request.data.get('technician_id')
        
        if not technician_id:
            return Response({'error': 'Technician ID required'}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            technician = User.objects.get(id=technician_id, role='technician')
            ticket.additional_technicians.add(technician)
            
            # Create event log
            event = TicketEvent.objects.create(
                ticket=ticket,
                actor=request.user,
                event_type='technician_added',
                from_value='',
                to_value=technician.get_full_name()
            )
            
            # Send email notification to the added technician
            email_service.notify_technician_added(ticket, event, technician)
            
            return Response({'message': 'Technician added successfully'})
        except User.DoesNotExist:
            return Response({'error': 'Technician not found'}, status=status.HTTP_404_NOT_FOUND)
            
    except Ticket.DoesNotExist:
        return Response({'error': 'Ticket not found'}, status=status.HTTP_404_NOT_FOUND)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def close_ticket(request, ticket_id):
    """Close a ticket (technician only)"""
    if request.user.role != 'technician':
        return Response({'error': 'Only technicians can close tickets'}, status=status.HTTP_403_FORBIDDEN)
    
    try:
        ticket = Ticket.objects.get(id=ticket_id)
        if ticket.claimed_by != request.user and request.user not in ticket.additional_technicians.all():
            return Response({'error': 'You can only close tickets you are working on'}, status=status.HTTP_403_FORBIDDEN)
        
        ticket.close()
        
        return Response({'message': 'Ticket closed successfully'})
    except Ticket.DoesNotExist:
        return Response({'error': 'Ticket not found'}, status=status.HTTP_404_NOT_FOUND)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def reopen_ticket(request, ticket_id):
    """Reopen a closed ticket (technician only)"""
    if request.user.role != 'technician':
        return Response({'error': 'Only technicians can reopen tickets'}, status=status.HTTP_403_FORBIDDEN)
    
    try:
        ticket = Ticket.objects.get(id=ticket_id)
        
        # Check if ticket is closed
        if ticket.status != 'closed':
            return Response({'error': 'Only closed tickets can be reopened'}, status=status.HTTP_400_BAD_REQUEST)
        
        # Check if technician has permission (owner or assigned technician)
        if ticket.claimed_by != request.user and request.user not in ticket.additional_technicians.all():
            return Response({'error': 'You can only reopen tickets you are working on'}, status=status.HTTP_403_FORBIDDEN)
        
        # Reopen the ticket
        ticket.status = 'reopened'
        ticket.closed_at = None  # Reset closed timestamp
        ticket.save()
        
        # Create event log
        event = TicketEvent.objects.create(
            ticket=ticket,
            actor=request.user,
            event_type='reopened',
            from_value='closed',
            to_value='open'
        )
        
        # Send email notification to the employee who created the ticket
        email_service.notify_ticket_reopened(ticket, event)
        
        return Response({'message': 'Ticket reopened successfully'})
    except Ticket.DoesNotExist:
        return Response({'error': 'Ticket not found'}, status=status.HTTP_404_NOT_FOUND)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def performance_stats(request):
    """Simple performance monitoring endpoint"""
    from django.db import connection
    from django.utils import timezone
    
    # Get basic database stats
    with connection.cursor() as cursor:
        cursor.execute("SELECT COUNT(*) FROM tickets_ticket")
        total_tickets = cursor.fetchone()[0]
        
        cursor.execute("SELECT COUNT(*) FROM tickets_ticket WHERE status = 'Open'")
        open_tickets = cursor.fetchone()[0]
        
        cursor.execute("SELECT COUNT(*) FROM tickets_ticket WHERE created_at >= %s", 
                     [timezone.now() - timezone.timedelta(hours=24)])
        tickets_last_24h = cursor.fetchone()[0]
    
    return Response({
        'total_tickets': total_tickets,
        'open_tickets': open_tickets,
        'tickets_last_24h': tickets_last_24h,
        'timestamp': timezone.now().isoformat(),
        'database': connection.settings_dict['ENGINE'].split('.')[-1]
    })

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def top_technicians_stats(request):
    """Get top 5 technicians with their ticket statistics"""
    if request.user.role not in ['admin', 'technician']:
        return Response({'error': 'Only admins and technicians can access technician stats'}, status=status.HTTP_403_FORBIDDEN)
    
    from django.contrib.auth import get_user_model
    from django.db.models import Count, Q
    from django.utils import timezone
    from datetime import timedelta
    
    User = get_user_model()
    
    # Get filter parameters
    technician_filter = request.GET.get('technician_filter', 'all')
    time_filter = request.GET.get('time_filter', 'all')
    
    # Calculate date range based on time filter
    now = timezone.now()
    if time_filter == 'today':
        start_date = now.replace(hour=0, minute=0, second=0, microsecond=0)
    elif time_filter == 'week':
        start_date = now - timedelta(days=7)
    elif time_filter == 'month':
        start_date = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    else:
        start_date = None
    
    # Base queryset for tickets
    tickets_qs = Ticket.objects.all()
    if start_date:
        tickets_qs = tickets_qs.filter(created_at__gte=start_date)
    
    # Get all technicians
    technicians = User.objects.filter(role='technician')
    
    # If specific technician is selected, return their time series data
    if technician_filter != 'all':
        try:
            technician = User.objects.get(id=technician_filter, role='technician')
            
            # Get time series data for the last 30 days
            time_series_data = []
            for i in range(30):
                date = now - timedelta(days=i)
                day_start = date.replace(hour=0, minute=0, second=0, microsecond=0)
                day_end = day_start + timedelta(days=1)
                
                day_tickets = tickets_qs.filter(created_at__gte=day_start, created_at__lt=day_end)
                
                claimed = day_tickets.filter(
                    Q(claimed_by=technician) | Q(additional_technicians=technician)
                ).distinct().count()
                
                closed = day_tickets.filter(
                    Q(claimed_by=technician) | Q(additional_technicians=technician),
                    status='closed'
                ).distinct().count()
                
                reopened = day_tickets.filter(
                    Q(claimed_by=technician) | Q(additional_technicians=technician),
                    events__event_type='reopened'
                ).distinct().count()
                
                time_series_data.append({
                    'date': day_start.strftime('%Y-%m-%d'),
                    'ticketsClaimed': claimed,
                    'ticketsClosed': closed,
                    'ticketsReopened': reopened
                })
            
            return Response({
                'technician': {
                    'id': str(technician.id),
                    'name': f"{technician.first_name} {technician.last_name}",
                    'email': technician.email
                },
                'timeSeriesData': list(reversed(time_series_data))  # Reverse to show oldest first
            })
            
        except User.DoesNotExist:
            return Response({'error': 'Technician not found'}, status=status.HTTP_404_NOT_FOUND)
    
    # Get top 5 technicians with their stats
    technician_stats = []
    for technician in technicians:
        # Tickets claimed (claimed by or additional technician)
        claimed_tickets = tickets_qs.filter(
            Q(claimed_by=technician) | Q(additional_technicians=technician)
        ).distinct().count()
        
        # Tickets closed
        closed_tickets = tickets_qs.filter(
            Q(claimed_by=technician) | Q(additional_technicians=technician),
            status='closed'
        ).distinct().count()
        
        # Tickets reopened
        reopened_tickets = tickets_qs.filter(
            Q(claimed_by=technician) | Q(additional_technicians=technician),
            events__event_type='reopened'
        ).distinct().count()
        
        technician_stats.append({
            'id': str(technician.id),
            'name': f"{technician.first_name} {technician.last_name}",
            'email': technician.email,
            'ticketsClaimed': claimed_tickets,
            'ticketsClosed': closed_tickets,
            'ticketsReopened': reopened_tickets,
            'totalActivity': claimed_tickets + closed_tickets + reopened_tickets
        })
    
    # Sort by total activity and get top 5
    top_technicians = sorted(technician_stats, key=lambda x: x['totalActivity'], reverse=True)[:5]
    
    return Response({
        'topTechnicians': top_technicians
    })


@api_view(['PATCH'])
@permission_classes([IsAuthenticated])
def update_ticket_type(request, ticket_id):
    """Update ticket type when closure form is opened"""
    try:
        ticket = Ticket.objects.get(id=ticket_id)
    except Ticket.DoesNotExist:
        return Response({'error': 'Ticket not found'}, status=status.HTTP_404_NOT_FOUND)
    
    # Check if user is the ticket owner (technician who claimed it)
    if ticket.claimed_by != request.user:
        return Response({'error': 'Not authorized to update this ticket'}, status=status.HTTP_403_FORBIDDEN)
    
    # Get the problem type from request
    problem_type = request.data.get('problem_type')
    if not problem_type:
        return Response({'error': 'Problem type is required'}, status=status.HTTP_400_BAD_REQUEST)
    
    # Update the ticket type
    ticket.type = problem_type.title()  # Convert to title case
    ticket.save()
    
    return Response({'message': 'Ticket type updated successfully', 'type': ticket.type})

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_closure_report(request, ticket_id):
    """Create a closure report for a ticket (technician only)"""
    if request.user.role != 'technician':
        return Response({'error': 'Only technicians can create closure reports'}, status=status.HTTP_403_FORBIDDEN)
    
    try:
        ticket = Ticket.objects.get(id=ticket_id)
        
        # Check if ticket is already closed
        if ticket.status == 'closed':
            return Response({'error': 'Ticket is already closed'}, status=status.HTTP_400_BAD_REQUEST)
        
        # Check if technician has permission (owner or assigned technician)
        if ticket.claimed_by != request.user and request.user not in ticket.additional_technicians.all():
            return Response({'error': 'You can only create closure reports for tickets you are working on'}, status=status.HTTP_403_FORBIDDEN)
        
        # Note: We allow multiple closure reports for the same ticket (e.g., when reopened and closed again)
        # The latest closure report will be the most relevant one
        
        # Prepare data for serializer
        data = request.data.copy()
        
        # Debug logging
        print(f"Closure report data received: {data}")
        
        # Handle replaced_parts if it's a JSON string
        if 'replaced_parts' in data and isinstance(data['replaced_parts'], str):
            try:
                import json
                data['replaced_parts'] = json.loads(data['replaced_parts'])
                print(f"Parsed replaced_parts: {data['replaced_parts']}")
            except json.JSONDecodeError as e:
                print(f"JSON decode error: {e}")
                data['replaced_parts'] = []
        
        # Create closure report
        serializer = TicketClosureReportSerializer(data=data)
        if serializer.is_valid():
            closure_report = serializer.save(
                ticket=ticket,
                created_by=request.user
            )
            
            # Update the ticket's type to match the closure report's problem_type
            ticket.type = closure_report.problem_type.title()  # Convert to title case
            ticket.save()
            print(f"Created closure report with ID: {closure_report.id}")
            print(f"Replaced parts count: {closure_report.replaced_parts.count()}")
            for part in closure_report.replaced_parts.all():
                print(f"  - Part: {part.part_name}, Serial: {part.serial_number}")
            
            # Close the ticket
            ticket.status = 'closed'
            ticket.closed_at = timezone.now()
            ticket.save()
            
            # Create event log
            event = TicketEvent.objects.create(
                ticket=ticket,
                actor=request.user,
                event_type='closed',
                from_value='open',
                to_value='closed'
            )
            
            # Send email notification to the employee who created the ticket
            email_service.notify_ticket_closed(ticket, event)
            
            # Send email notification to admin with closure report
            email_service.notify_admin_closure_report(ticket, closure_report)
            
            return Response(TicketClosureReportSerializer(closure_report).data, status=status.HTTP_201_CREATED)
        else:
            print(f"Serializer validation errors: {serializer.errors}")
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
            
    except Ticket.DoesNotExist:
        return Response({'error': 'Ticket not found'}, status=status.HTTP_404_NOT_FOUND)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_closure_report(request, ticket_id):
    """Get closure report for a ticket"""
    try:
        ticket = Ticket.objects.get(id=ticket_id)
        
        # Check permissions
        if request.user.role == 'employee' and ticket.requester != request.user:
            return Response({'error': 'You can only view closure reports for your own tickets'}, status=status.HTTP_403_FORBIDDEN)
        
        if hasattr(ticket, 'closure_report'):
            serializer = TicketClosureReportSerializer(ticket.closure_report)
            return Response(serializer.data)
        else:
            return Response({'error': 'No closure report found for this ticket'}, status=status.HTTP_404_NOT_FOUND)
            
    except Ticket.DoesNotExist:
        return Response({'error': 'Ticket not found'}, status=status.HTTP_404_NOT_FOUND)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def upload_closure_report_attachment(request, ticket_id):
    """Upload attachment for closure report"""
    if request.user.role != 'technician':
        return Response({'error': 'Only technicians can upload closure report attachments'}, status=status.HTTP_403_FORBIDDEN)
    
    try:
        ticket = Ticket.objects.get(id=ticket_id)
        
        if not hasattr(ticket, 'closure_report'):
            return Response({'error': 'No closure report found for this ticket'}, status=status.HTTP_404_NOT_FOUND)
        
        closure_report = ticket.closure_report
        
        # Check if technician has permission
        if closure_report.created_by != request.user:
            return Response({'error': 'You can only upload attachments to your own closure reports'}, status=status.HTTP_403_FORBIDDEN)
        
        if 'file' not in request.FILES:
            return Response({'error': 'No file provided'}, status=status.HTTP_400_BAD_REQUEST)
        
        file = request.FILES['file']
        
        # Create attachment
        attachment = TicketClosureReportAttachment.objects.create(
            closure_report=closure_report,
            file_name=file.name,
            mime_type=file.content_type,
            size_bytes=file.size,
            storage_url=file,
            uploaded_by=request.user
        )
        
        serializer = TicketClosureReportAttachmentSerializer(attachment)
        return Response(serializer.data, status=status.HTTP_201_CREATED)
        
    except Ticket.DoesNotExist:
        return Response({'error': 'Ticket not found'}, status=status.HTTP_404_NOT_FOUND) 