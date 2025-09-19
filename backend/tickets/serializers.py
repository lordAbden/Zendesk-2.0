from rest_framework import serializers
from .models import Ticket, TicketAttachment, TicketEvent, TicketMessage, TicketClosureReport, TicketClosureReportAttachment, ReplacedPart
from django.contrib.auth import get_user_model

User = get_user_model()


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'first_name', 'last_name', 'email', 'phone', 'role', 'group']


class TicketAttachmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = TicketAttachment
        fields = ['id', 'file_name', 'mime_type', 'size_bytes', 'storage_url', 'uploaded_by', 'created_at']
        read_only_fields = ['id', 'file_name', 'mime_type', 'size_bytes', 'uploaded_by', 'created_at']
    
    def validate(self, data):
        print(f"TicketAttachmentSerializer validate called with data: {data}")
        return data


class TicketEventSerializer(serializers.ModelSerializer):
    actor = UserSerializer(read_only=True)
    
    class Meta:
        model = TicketEvent
        fields = ['id', 'event_type', 'actor', 'from_value', 'to_value', 'created_at']


class TicketMessageSerializer(serializers.ModelSerializer):
    sender = UserSerializer(read_only=True)
    
    class Meta:
        model = TicketMessage
        fields = ['id', 'sender', 'message_text', 'created_at']


class ReplacedPartSerializer(serializers.ModelSerializer):
    class Meta:
        model = ReplacedPart
        fields = ['id', 'part_name', 'serial_number']


class TicketClosureReportAttachmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = TicketClosureReportAttachment
        fields = ['id', 'file_name', 'mime_type', 'size_bytes', 'storage_url', 'uploaded_by', 'created_at']


class TicketClosureReportSerializer(serializers.ModelSerializer):
    created_by = UserSerializer(read_only=True)
    replaced_parts = ReplacedPartSerializer(many=True, required=False)
    attachments = TicketClosureReportAttachmentSerializer(many=True, read_only=True)
    resolution_time_hours = serializers.ReadOnlyField()
    resolution_time_minutes = serializers.ReadOnlyField()
    
    class Meta:
        model = TicketClosureReport
        fields = [
            'id', 'problem_type', 'problem_subtype', 'root_cause', 'solution_applied',
            'resolution_time_hours', 'resolution_time_minutes', 'parts_used',
            'technical_notes', 'recommendations', 'is_recurring_problem',
            'created_by', 'created_at', 'replaced_parts', 'attachments'
        ]
    
    def create(self, validated_data):
        replaced_parts_data = validated_data.pop('replaced_parts', [])
        closure_report = TicketClosureReport.objects.create(**validated_data)
        
        for part_data in replaced_parts_data:
            ReplacedPart.objects.create(closure_report=closure_report, **part_data)
        
        return closure_report


class TicketSerializer(serializers.ModelSerializer):
    requester = UserSerializer(read_only=True)
    assigned_to = UserSerializer(read_only=True)
    claimed_by = UserSerializer(read_only=True)
    additional_technicians = UserSerializer(many=True, read_only=True)
    attachments = TicketAttachmentSerializer(many=True, read_only=True)
    events = TicketEventSerializer(many=True, read_only=True)
    messages = TicketMessageSerializer(many=True, read_only=True)
    closure_reports = serializers.SerializerMethodField()
    
    class Meta:
        model = Ticket
        fields = [
            'id', 'short_id', 'subject', 'type', 'description', 'status',
            'priority', 'requester', 'assigned_to', 'claimed_by', 'additional_technicians',
            'created_at', 'updated_at', 'closed_at', 'attachments', 'events',
            'messages', 'closure_reports'
        ]
        read_only_fields = ['id', 'short_id', 'created_at', 'updated_at', 'closed_at']
    
    def get_closure_reports(self, obj):
        """Get all closure reports for this ticket"""
        try:
            reports = obj.closure_reports.all().order_by('created_at')
            return TicketClosureReportSerializer(reports, many=True).data
        except Exception as e:
            print(f"Error getting closure reports: {e}")
            return []


class TicketCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Ticket
        fields = [
            'subject', 'type', 'description'
        ]
    
    def create(self, validated_data):
        print(f"TicketCreateSerializer.create called with validated_data: {validated_data}")
        
        # Set the requester to the current user
        validated_data['requester'] = self.context['request'].user
        
        print(f"About to create ticket with data: {validated_data}")
        
        # Create the ticket
        ticket = Ticket.objects.create(**validated_data)
        
        print(f"Ticket created successfully: {ticket.id}")
        
        # Handle attachments if they exist in the request
        request = self.context['request']
        if hasattr(request, 'FILES') and request.FILES:
            print(f"Processing {len(request.FILES)} attachments for ticket {ticket.id}")
            for file in request.FILES.getlist('attachments'):
                try:
                    attachment = TicketAttachment.objects.create(
                        ticket=ticket,
                        uploaded_by=request.user,
                        file_name=file.name,
                        mime_type=file.content_type,
                        size_bytes=file.size,
                        storage_url=file
                    )
                    print(f"Created attachment: {attachment.file_name}")
                except Exception as e:
                    print(f"Error creating attachment {file.name}: {e}")
        
        # Create the "created" event
        TicketEvent.objects.create(
            ticket=ticket,
            actor=self.context['request'].user,
            event_type='created'
        )
        
        # Send email notification to all technicians
        from .email_service import email_service
        email_service.notify_ticket_created(ticket)
        
        return ticket


class TicketListSerializer(serializers.ModelSerializer):
    requester = UserSerializer(read_only=True)
    assigned_to = UserSerializer(read_only=True)
    claimed_by = UserSerializer(read_only=True)
    attachments = TicketAttachmentSerializer(many=True, read_only=True)
    
    class Meta:
        model = Ticket
        fields = [
            'id', 'short_id', 'subject', 'type', 'description', 'status',
            'priority', 'requester', 'assigned_to', 'claimed_by', 'created_at', 'updated_at', 'attachments'
        ]