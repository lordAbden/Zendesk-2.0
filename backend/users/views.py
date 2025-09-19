from rest_framework import generics, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from django.contrib.auth import authenticate, logout
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters
from django.utils import timezone
from .models import User
from .serializers import UserSerializer, AdminUserCreateSerializer
from django.db.models import Q

@api_view(['POST'])
@permission_classes([AllowAny])
def register(request):
    """User registration endpoint"""
    serializer = AdminUserCreateSerializer(data=request.data)
    if serializer.is_valid():
        user = serializer.save()
        return Response(UserSerializer(user).data, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

@api_view(['POST'])
@permission_classes([AllowAny])
def login_view(request):
    """User login endpoint"""
    email = request.data.get('email')
    password = request.data.get('password')
    
    if not email or not password:
        return Response({'error': 'Email and password are required'}, status=status.HTTP_400_BAD_REQUEST)
    
    user = authenticate(request, username=email, password=password)
    
    if user is not None:
        # Update last_login timestamp
        from django.utils import timezone
        user.last_login = timezone.now()
        user.save()
        
        # Generate JWT token
        from rest_framework_simplejwt.tokens import RefreshToken
        refresh = RefreshToken.for_user(user)
        
        return Response({
            'access': str(refresh.access_token),
            'refresh': str(refresh),
            'user': UserSerializer(user).data
        })
    else:
        return Response({'error': 'Invalid credentials'}, status=status.HTTP_401_UNAUTHORIZED)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def logout_view(request):
    """User logout endpoint"""
    from django.utils import timezone
    
    # Track logout timestamp
    user = request.user
    user.last_logout = timezone.now()
    user.save()
    
    logout(request)
    return Response({'message': 'Logged out successfully'})

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def profile(request):
    """Get user profile"""
    return Response(UserSerializer(request.user).data)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def profile_view(request):
    """Get user profile"""
    return Response(UserSerializer(request.user).data)

@api_view(['PUT'])
@permission_classes([IsAuthenticated])
def update_profile_view(request):
    """Update user profile"""
    user = request.user
    
    # Track changes before updating
    changes = {}
    if 'first_name' in request.data and request.data['first_name'] != user.first_name:
        changes['first_name'] = {'old': user.first_name, 'new': request.data['first_name']}
    if 'last_name' in request.data and request.data['last_name'] != user.last_name:
        changes['last_name'] = {'old': user.last_name, 'new': request.data['last_name']}
    if 'email' in request.data and request.data['email'] != user.email:
        changes['email'] = {'old': user.email, 'new': request.data['email']}
    if 'phone' in request.data and request.data['phone'] != user.phone:
        changes['phone'] = {'old': user.phone, 'new': request.data['phone']}
    
    serializer = UserSerializer(user, data=request.data, partial=True)
    
    if serializer.is_valid():
        serializer.save()
        
        # Send email notification to admin if there were changes
        if changes:
            from tickets.email_service import email_service
            email_service.notify_admin_user_changed(user, changes)
        
        return Response(serializer.data)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def change_password_view(request):
    """Change user password"""
    user = request.user
    current_password = request.data.get('current_password')
    new_password = request.data.get('new_password')
    
    if not user.check_password(current_password):
        return Response({'error': 'Current password is incorrect'}, status=status.HTTP_400_BAD_REQUEST)
    
    user.set_password(new_password)
    user.save()
    
    # Send email notification to admin about password change
    changes = {'password': {'old': '[HIDDEN]', 'new': '[CHANGED]'}}
    from tickets.email_service import email_service
    email_service.notify_admin_user_changed(user, changes)
    
    return Response({'message': 'Password changed successfully'})

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def admin_dashboard_stats(request):
    """Admin dashboard statistics - optimized with single queries"""
    if request.user.role != 'admin':
        return Response({'error': 'Only admins can access dashboard stats'}, status=status.HTTP_403_FORBIDDEN)

    from tickets.models import Ticket
    from django.db.models import Count, Q

    # Single optimized query for user statistics
    user_stats = User.objects.aggregate(
        total_users=Count('id'),
        admin_users=Count('id', filter=Q(role='admin')),
        employee_users=Count('id', filter=Q(role='employee')),
        technician_users=Count('id', filter=Q(role='technician'))
    )

    # Single optimized query for ticket statistics
    ticket_stats = Ticket.objects.aggregate(
        total_tickets=Count('id'),
        open_tickets=Count('id', filter=Q(status='open')),
        closed_tickets=Count('id', filter=Q(status='closed')),
        p1_tickets=Count('id', filter=Q(priority='P1')),
        p2_tickets=Count('id', filter=Q(priority='P2')),
        p3_tickets=Count('id', filter=Q(priority='P3')),
        p4_tickets=Count('id', filter=Q(priority='P4')),
        network_tickets=Count('id', filter=Q(type='Network')),
        hardware_tickets=Count('id', filter=Q(type='Hardware')),
        software_tickets=Count('id', filter=Q(type='Software'))
    )

    return Response({
        'total_users': user_stats['total_users'],
        'total_tickets': ticket_stats['total_tickets'],
        'open_tickets': ticket_stats['open_tickets'],
        'closed_tickets': ticket_stats['closed_tickets'],
        'users_by_role': {
            'admin': user_stats['admin_users'],
            'employee': user_stats['employee_users'],
            'technician': user_stats['technician_users'],
        },
        'tickets_by_priority': {
            'P1': ticket_stats['p1_tickets'],
            'P2': ticket_stats['p2_tickets'],
            'P3': ticket_stats['p3_tickets'],
            'P4': ticket_stats['p4_tickets'],
        },
        'tickets_by_type': {
            'Network': ticket_stats['network_tickets'],
            'Hardware': ticket_stats['hardware_tickets'],
            'Software': ticket_stats['software_tickets'],
        },
    })

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def dashboard_stats(request):
    """General dashboard statistics for technicians and employees"""
    from tickets.models import Ticket
    from django.db.models import Count, Q
    
    user = request.user
    
    if user.role == 'admin':
        # Redirect to admin dashboard stats
        return admin_dashboard_stats(request)
    
    # For technicians and employees
    if user.role == 'technician':
        current_time = timezone.now()
        
        # Technician-specific stats - using claimed_by and additional_technicians
        unassigned_tickets = Ticket.objects.filter(status='open', claimed_by__isnull=True).count()
        
        # Total open tickets in the system
        total_open_tickets = Ticket.objects.filter(status='open').count()
        
        # My open tickets (claimed by me or I'm additional technician)
        my_open_tickets = Ticket.objects.filter(
            Q(claimed_by=user) | Q(additional_technicians=user),
            status='open'
        ).distinct().count()
        
        # My closed tickets (claimed by me or I'm additional technician)
        closed_tickets = Ticket.objects.filter(
            Q(claimed_by=user) | Q(additional_technicians=user),
            status='closed'
        ).distinct().count()
        
        # My in progress tickets (claimed by me or I'm additional technician)
        in_progress_tickets = Ticket.objects.filter(
            Q(claimed_by=user) | Q(additional_technicians=user),
            status='in_progress'
        ).distinct().count()
        
        # My reopened tickets (tickets that were closed and reopened)
        reopened_tickets = Ticket.objects.filter(
            Q(claimed_by=user) | Q(additional_technicians=user),
            events__event_type='reopened'
        ).distinct().count()
        
        # New tickets since last logout (tickets created while user was away)
        new_tickets_since_login = 0
        
        if user.last_logout:
            # Count tickets created between last logout and current time
            # This shows tickets created while the user was away
            new_tickets_since_login = Ticket.objects.filter(
                created_at__gt=user.last_logout,
                created_at__lt=current_time
            ).count()
            
        elif user.last_login:
            # If no last_logout recorded, count tickets since last login (fallback)
            new_tickets_since_login = Ticket.objects.filter(
                created_at__gt=user.last_login
            ).count()
        
        return Response({
            'unassigned_tickets': unassigned_tickets,
            'total_open_tickets': total_open_tickets,
            'my_open_tickets': my_open_tickets,
            'in_progress_tickets': in_progress_tickets,
            'closed_tickets': closed_tickets,
            'reopened_tickets': reopened_tickets,
            'new_tickets_since_login': new_tickets_since_login,
            'role': 'technician'
        })
    
    elif user.role == 'employee':
        # Employee-specific stats
        my_tickets = Ticket.objects.filter(requester=user).count()
        my_open_tickets = Ticket.objects.filter(requester=user, status='open').count()
        my_in_progress_tickets = Ticket.objects.filter(requester=user, status='in_progress').count()
        my_closed_tickets = Ticket.objects.filter(requester=user, status='closed').count()
        my_reopened_tickets = Ticket.objects.filter(requester=user, status='reopened').count()
        unassigned_tickets = Ticket.objects.filter(status='open', assigned_to__isnull=True).count()
        
        return Response({
            'total_tickets': my_tickets,
            'opened_tickets': my_open_tickets,
            'in_progress_tickets': my_in_progress_tickets,
            'closed_tickets': my_closed_tickets,
            'reopened_tickets': my_reopened_tickets,
            'unassigned_tickets': unassigned_tickets,
            'role': 'employee'
        })
    
    else:
        return Response({'error': 'Invalid user role'}, status=status.HTTP_400_BAD_REQUEST)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def recent_activity(request):
    """Get recent activity for the current user"""
    from tickets.models import TicketEvent
    from django.db.models import Q
    
    user = request.user
    limit = request.GET.get('limit', 10)
    
    try:
        limit = int(limit)
    except ValueError:
        limit = 10
    
    if user.role == 'technician':
        # Get recent events where the technician was the actor
        recent_events = TicketEvent.objects.filter(
            actor=user,
            event_type__in=['claimed', 'closed', 'reopened', 'status_changed']
        ).select_related('ticket', 'actor').order_by('-created_at')[:limit]
        
        activity_data = []
        for event in recent_events:
            activity_data.append({
                'id': event.id,
                'event_type': event.event_type,
                'ticket_id': event.ticket.id,
                'ticket_short_id': event.ticket.short_id,
                'ticket_subject': event.ticket.subject,
                'from_value': event.from_value,
                'to_value': event.to_value,
                'created_at': event.created_at,
                'actor': {
                    'id': event.actor.id,
                    'first_name': event.actor.first_name,
                    'last_name': event.actor.last_name,
                    'email': event.actor.email
                }
            })
        
        return Response(activity_data)
    
    elif user.role == 'employee':
        # Get recent events on tickets created by the employee
        recent_events = TicketEvent.objects.filter(
            ticket__requester=user
        ).select_related('ticket', 'actor').order_by('-created_at')[:limit]
        
        activity_data = []
        for event in recent_events:
            activity_data.append({
                'id': event.id,
                'event_type': event.event_type,
                'ticket_id': event.ticket.id,
                'ticket_short_id': event.ticket.short_id,
                'ticket_subject': event.ticket.subject,
                'from_value': event.from_value,
                'to_value': event.to_value,
                'created_at': event.created_at,
                'actor': {
                    'id': event.actor.id,
                    'first_name': event.actor.first_name,
                    'last_name': event.actor.last_name,
                    'email': event.actor.email
                }
            })
        
        return Response(activity_data)
    
    elif user.role == 'admin':
        # Get all recent events across the system for admin
        recent_events = TicketEvent.objects.all().select_related('ticket', 'actor').order_by('-created_at')[:limit]
        
        activity_data = []
        for event in recent_events:
            activity_data.append({
                'id': event.id,
                'event_type': event.event_type,
                'ticket_id': event.ticket.id,
                'ticket_short_id': event.ticket.short_id,
                'ticket_subject': event.ticket.subject,
                'from_value': event.from_value,
                'to_value': event.to_value,
                'created_at': event.created_at,
                'actor': {
                    'id': event.actor.id,
                    'first_name': event.actor.first_name,
                    'last_name': event.actor.last_name,
                    'email': event.actor.email
                }
            })
        
        return Response(activity_data)
    
    else:
        return Response({'error': 'Invalid user role'}, status=status.HTTP_400_BAD_REQUEST)

@api_view(['POST'])
@permission_classes([AllowAny])
def token_refresh(request):
    """JWT token refresh endpoint"""
    try:
        from rest_framework_simplejwt.tokens import RefreshToken
        refresh_token = request.data.get('refresh')
        if not refresh_token:
            return Response({'error': 'Refresh token is required'}, status=status.HTTP_400_BAD_REQUEST)
        
        refresh = RefreshToken(refresh_token)
        access_token = str(refresh.access_token)
        
        return Response({
            'access': access_token,
            'refresh': str(refresh)
        })
    except Exception as e:
        return Response({'error': 'Invalid refresh token'}, status=status.HTTP_401_UNAUTHORIZED)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_user(request):
    """Create a new user (admin only)"""
    if request.user.role != 'admin':
        return Response({'error': 'Only admins can create users'}, status=status.HTTP_403_FORBIDDEN)
    
    print(f"Received data: {request.data}")
    serializer = AdminUserCreateSerializer(data=request.data)
    if serializer.is_valid():
        user = serializer.save()
        return Response(UserSerializer(user).data, status=status.HTTP_201_CREATED)
    else:
        print(f"Validation errors: {serializer.errors}")
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

@api_view(['PUT'])
@permission_classes([IsAuthenticated])
def update_user(request, user_id):
    """Update a user (admin only)"""
    if request.user.role != 'admin':
        return Response({'error': 'Only admins can update users'}, status=status.HTTP_403_FORBIDDEN)
    
    try:
        user = User.objects.get(id=user_id)
    except User.DoesNotExist:
        return Response({'error': 'User not found'}, status=status.HTTP_404_NOT_FOUND)
    
    serializer = AdminUserCreateSerializer(user, data=request.data, partial=True)
    if serializer.is_valid():
        user = serializer.save()
        return Response(UserSerializer(user).data)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def delete_user(request, user_id):
    """Delete a user (admin only)"""
    if request.user.role != 'admin':
        return Response({'error': 'Only admins can delete users'}, status=status.HTTP_403_FORBIDDEN)
    
    try:
        user = User.objects.get(id=user_id)
        if user == request.user:
            return Response({'error': 'Cannot delete yourself'}, status=status.HTTP_400_BAD_REQUEST)
        
        user.delete()
        return Response({'message': 'User deleted successfully'})
    except User.DoesNotExist:
        return Response({'error': 'User not found'}, status=status.HTTP_404_NOT_FOUND)

class UserListView(generics.ListAPIView):
    serializer_class = UserSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['role', 'group']
    search_fields = ['email', 'first_name', 'last_name']
    ordering_fields = ['date_joined', 'email']
    ordering = ['-date_joined']
    pagination_class = None  # Disable pagination for this view
    
    def get_queryset(self):
        queryset = User.objects.all() if self.request.user.role == 'admin' else User.objects.filter(id=self.request.user.id)
        return queryset
    
    def list(self, request, *args, **kwargs):
        """Override list method to handle limit parameter after filtering and ordering"""
        queryset = self.filter_queryset(self.get_queryset())
        
        # Apply limit parameter after filtering and ordering
        limit = request.query_params.get('limit')
        if limit and limit.isdigit():
            queryset = queryset[:int(limit)]
        
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data) 