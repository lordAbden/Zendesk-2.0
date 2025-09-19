from django.db import models
from django.conf import settings
from django.utils import timezone
import uuid
import os


def ticket_attachment_path(instance, filename):
    return f'tickets/{instance.ticket.id}/attachments/{filename}'


class Ticket(models.Model):
    STATUS_CHOICES = [
        ('open', 'Open'),
        ('in_progress', 'En cours'),
        ('closed', 'Closed'),
        ('reopened', 'Reopened'),
    ]
    
    TYPE_CHOICES = [
        ('Network', 'Network'),
        ('Hardware', 'Hardware'),
        ('Software', 'Software'),
    ]
    
    PRIORITY_CHOICES = [
        ('P1', 'P1 - Highest'),
        ('P2', 'P2 - High'),
        ('P3', 'P3 - Medium'),
        ('P4', 'P4 - Low'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    short_id = models.CharField(max_length=20, unique=True, editable=False)
    subject = models.CharField(max_length=200)
    type = models.CharField(max_length=20, choices=TYPE_CHOICES)
    description = models.TextField(help_text="Description du problème (peut contenir du HTML)")
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='open')
    priority = models.CharField(max_length=10, choices=PRIORITY_CHOICES, editable=False)
    
    requester = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='requested_tickets'
    )
    assigned_to = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='assigned_tickets'
    )
    
    # New fields for the updated system
    claimed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='claimed_tickets',
        help_text='First technician who claimed this ticket'
    )
    
    additional_technicians = models.ManyToManyField(
        settings.AUTH_USER_MODEL,
        blank=True,
        related_name='additional_tickets',
        help_text='Additional technicians assigned to this ticket'
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    closed_at = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        ordering = ['-priority', '-created_at']
        indexes = [
            # Most frequently queried fields for fast filtering
            models.Index(fields=['status']),  # For status filtering (Open/Closed)
            models.Index(fields=['priority']), # For priority sorting
            models.Index(fields=['type']),    # For type filtering (Network/Hardware/Software)
            
            # Foreign key fields for fast joins
            models.Index(fields=['requester']),    # For user's requested tickets
            models.Index(fields=['assigned_to']),  # For user's assigned tickets
            models.Index(fields=['claimed_by']),   # For user's claimed tickets
            
            # Date fields for time-based queries
            models.Index(fields=['created_at']),   # For date filtering and sorting
            models.Index(fields=['updated_at']),   # For recent activity
            models.Index(fields=['closed_at']),    # For closed ticket queries
            
            # Composite indexes for common query combinations
            models.Index(fields=['status', 'priority']),      # Status + Priority filtering
            models.Index(fields=['status', 'created_at']),     # Status + Date filtering
            models.Index(fields=['assigned_to', 'status']),   # User's active tickets
        ]
    
    def __str__(self):
        return f"{self.short_id} - {self.subject}"
    
    def save(self, *args, **kwargs):
        if not self.short_id:
            # Generate short ID like INC-1, INC-2, etc.
            from django.db import transaction
            import uuid
            
            with transaction.atomic():
                # Get the highest existing number
                try:
                    existing_tickets = Ticket.objects.filter(short_id__regex=r'^INC-\d+$').order_by('-short_id')
                    if existing_tickets.exists():
                        last_ticket = existing_tickets.first()
                        last_number = int(last_ticket.short_id.split('-')[1])
                        new_number = last_number + 1
                    else:
                        new_number = 1
                    
                    # Add a small random component to avoid race conditions
                    import random
                    random_suffix = random.randint(0, 999)
                    self.short_id = f"INC-{new_number:04d}-{random_suffix:03d}"
                    
                except (ValueError, IndexError, Exception):
                    # Fallback: use timestamp with random component
                    import time
                    timestamp = int(time.time()) % 100000
                    random_suffix = random.randint(100, 999)
                    self.short_id = f"INC-{timestamp}-{random_suffix}"
        
        if not self.priority:
            # Auto-assign priority based on requester's group
            from django.conf import settings
            priority_mapping = getattr(settings, 'PRIORITY_MAPPING', {})
            requester_group = getattr(self.requester, 'group', None) if self.requester else None
            self.priority = priority_mapping.get(requester_group, 'P4')
        
        super().save(*args, **kwargs)
    
    def close(self):
        self.status = 'closed'
        self.closed_at = timezone.now()
        self.save()


class TicketAttachment(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    ticket = models.ForeignKey(Ticket, on_delete=models.CASCADE, related_name='attachments')
    file_name = models.CharField(max_length=255)
    mime_type = models.CharField(max_length=100)
    size_bytes = models.BigIntegerField()
    storage_url = models.FileField(upload_to=ticket_attachment_path)
    uploaded_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        indexes = [
            models.Index(fields=['ticket']),      # For fast ticket attachment lookups
            models.Index(fields=['uploaded_by']), # For user's uploaded files
            models.Index(fields=['created_at']),  # For date-based queries
        ]
    
    def __str__(self):
        return f"{self.file_name} - {self.ticket.short_id}"
    
    def clean(self):
        from django.core.exceptions import ValidationError
        from django.conf import settings
        
        # Check file size
        if self.size_bytes > settings.MAX_UPLOAD_SIZE:
            raise ValidationError(f'File size must be under {settings.MAX_UPLOAD_SIZE / (1024*1024)}MB')
        
        # Check file type
        file_ext = os.path.splitext(self.file_name)[1][1:].lower()
        if file_ext not in settings.ALLOWED_FILE_TYPES:
            raise ValidationError(f'File type {file_ext} is not allowed')


class TicketEvent(models.Model):
    EVENT_TYPE_CHOICES = [
        ('created', 'Created'),
        ('claimed', 'Claimed'),
        ('assigned', 'Assigned'),
        ('technician_added', 'Technician Added'),
        ('status_changed', 'Status Changed'),
        ('closed', 'Closed'),
        ('reopened', 'Reopened'),
        ('attachment_added', 'Attachment Added'),
        ('message_sent', 'Message Sent'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    ticket = models.ForeignKey(Ticket, on_delete=models.CASCADE, related_name='events')
    actor = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    event_type = models.CharField(max_length=20, choices=EVENT_TYPE_CHOICES)
    from_value = models.CharField(max_length=255, blank=True, null=True)
    to_value = models.CharField(max_length=255, blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['ticket']),      # For fast ticket event lookups
            models.Index(fields=['actor']),       # For user's activity history
            models.Index(fields=['event_type']),  # For event type filtering
            models.Index(fields=['created_at']),  # For date-based queries
            models.Index(fields=['ticket', 'created_at']), # For ticket timeline
        ]
    
    def __str__(self):
        return f"{self.event_type} by {self.actor.username} on {self.ticket.short_id}"


class TicketMessage(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    ticket = models.ForeignKey(Ticket, on_delete=models.CASCADE, related_name='messages')
    sender = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    message_text = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['created_at']
        indexes = [
            models.Index(fields=['ticket']),      # For fast ticket message lookups
            models.Index(fields=['sender']),      # For user's message history
            models.Index(fields=['created_at']),  # For date-based queries
            models.Index(fields=['ticket', 'created_at']), # For ticket conversation timeline
        ]
    
    def __str__(self):
        return f"Message from {self.sender.username} on {self.ticket.short_id}"


class TicketClosureReport(models.Model):
    """Rapport de fermeture obligatoire pour chaque ticket fermé"""
    
    PROBLEM_TYPE_CHOICES = [
        ('hardware', 'Hardware'),
        ('software', 'Software'),
        ('network', 'Network'),
        ('other', 'Autre'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    ticket = models.ForeignKey(Ticket, on_delete=models.CASCADE, related_name='closure_reports')
    
    # Informations du rapport
    problem_type = models.CharField(max_length=20, choices=PROBLEM_TYPE_CHOICES)
    problem_subtype = models.CharField(max_length=100, help_text="Sous-type spécifique du problème")
    root_cause = models.TextField(help_text="Cause principale du problème")
    solution_applied = models.TextField(help_text="Solution appliquée")
    parts_used = models.TextField(blank=True, help_text="Pièces ou logiciels utilisés")
    technical_notes = models.TextField(blank=True, help_text="Notes techniques importantes")
    recommendations = models.TextField(blank=True, help_text="Recommandations pour éviter le problème")
    
    # Nouveaux champs
    is_recurring_problem = models.BooleanField(default=False, help_text="Problème récurrent")
    
    # Métadonnées
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='closure_reports')
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['ticket']),      # For fast ticket closure report lookups
            models.Index(fields=['created_by']),  # For user's closure reports
            models.Index(fields=['created_at']),  # For date-based queries
            models.Index(fields=['problem_type']), # For problem type filtering
            models.Index(fields=['is_recurring_problem']), # For recurring problem filtering
        ]
    
    def __str__(self):
        return f"Rapport de fermeture - {self.ticket.short_id}"
    
    @property
    def resolution_time_hours(self):
        """Calcule automatiquement les heures de résolution"""
        return self.total_resolution_time_minutes // 60
    
    @property
    def resolution_time_minutes(self):
        """Calcule automatiquement les minutes de résolution"""
        return self.total_resolution_time_minutes % 60
    
    @property
    def total_resolution_time_minutes(self):
        """Calcule automatiquement le temps total de résolution en minutes"""
        if not self.ticket.closed_at:
            return 0
        
        # Utiliser la date de revendication si disponible, sinon la date de création
        start_date = self.ticket.claimed_by and self.ticket.updated_at or self.ticket.created_at
        end_date = self.ticket.closed_at
        
        if start_date and end_date:
            duration = end_date - start_date
            return int(duration.total_seconds() / 60)
        return 0


class ReplacedPart(models.Model):
    """Pièces remplacées avec numéros de série pour les rapports de fermeture"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    closure_report = models.ForeignKey(TicketClosureReport, on_delete=models.CASCADE, related_name='replaced_parts')
    part_name = models.CharField(max_length=200, help_text="Nom de la pièce remplacée")
    serial_number = models.CharField(max_length=100, blank=True, help_text="Numéro de série de la pièce")
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['created_at']
        indexes = [
            models.Index(fields=['closure_report']), # For fast closure report part lookups
            models.Index(fields=['part_name']),      # For part name filtering
        ]
    
    def __str__(self):
        return f"{self.part_name} - {self.closure_report.ticket.short_id}"


def closure_report_attachment_path(instance, filename):
    return f'closure_reports/{instance.closure_report.ticket.id}/attachments/{filename}'


class TicketClosureReportAttachment(models.Model):
    """Pièces jointes pour les rapports de fermeture"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    closure_report = models.ForeignKey(TicketClosureReport, on_delete=models.CASCADE, related_name='attachments')
    file_name = models.CharField(max_length=255)
    mime_type = models.CharField(max_length=100)
    size_bytes = models.BigIntegerField()
    storage_url = models.FileField(upload_to=closure_report_attachment_path)
    uploaded_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        indexes = [
            models.Index(fields=['closure_report']), # For fast closure report attachment lookups
            models.Index(fields=['uploaded_by']),    # For user's uploaded closure report files
            models.Index(fields=['created_at']),     # For date-based queries
        ]
    
    def __str__(self):
        return f"{self.file_name} - {self.closure_report.ticket.short_id}"
    
    def clean(self):
        from django.core.exceptions import ValidationError
        from django.conf import settings
        
        # Check file size
        if self.size_bytes > settings.MAX_UPLOAD_SIZE:
            raise ValidationError(f'File size must be under {settings.MAX_UPLOAD_SIZE / (1024*1024)}MB')
        
        # Check file type
        file_ext = os.path.splitext(self.file_name)[1][1:].lower()
        if file_ext not in settings.ALLOWED_FILE_TYPES:
            raise ValidationError(f'File type {file_ext} is not allowed') 