from django.contrib import admin
from .models import Ticket, TicketAttachment, TicketEvent, TicketMessage


@admin.register(Ticket)
class TicketAdmin(admin.ModelAdmin):
    list_display = ('short_id', 'subject', 'type', 'status', 'priority', 'requester', 'assigned_to', 'created_at')
    list_filter = ('status', 'type', 'priority', 'created_at')
    search_fields = ('short_id', 'subject', 'description', 'requester__email', 'assigned_to__email')
    readonly_fields = ('short_id', 'priority', 'created_at', 'updated_at', 'closed_at')
    ordering = ('-priority', '-created_at')
    
    fieldsets = (
        ('Basic Information', {
            'fields': ('short_id', 'subject', 'type', 'description', 'priority')
        }),
        ('Status', {
            'fields': ('status',)
        }),
        ('Assignment', {
            'fields': ('requester', 'assigned_to')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at', 'closed_at'),
            'classes': ('collapse',)
        }),
    )


@admin.register(TicketAttachment)
class TicketAttachmentAdmin(admin.ModelAdmin):
    list_display = ('file_name', 'ticket', 'mime_type', 'size_bytes', 'uploaded_by', 'created_at')
    list_filter = ('mime_type', 'created_at')
    search_fields = ('file_name', 'ticket__short_id', 'uploaded_by__email')
    readonly_fields = ('id', 'created_at')
    ordering = ('-created_at',)


@admin.register(TicketEvent)
class TicketEventAdmin(admin.ModelAdmin):
    list_display = ('ticket', 'event_type', 'actor', 'from_value', 'to_value', 'created_at')
    list_filter = ('event_type', 'created_at')
    search_fields = ('ticket__short_id', 'actor__email')
    readonly_fields = ('id', 'created_at')
    ordering = ('-created_at',)


@admin.register(TicketMessage)
class TicketMessageAdmin(admin.ModelAdmin):
    list_display = ('ticket', 'sender', 'message_text', 'created_at')
    list_filter = ('created_at',)
    search_fields = ('ticket__short_id', 'sender__email', 'message_text')
    readonly_fields = ('id', 'created_at')
    ordering = ('-created_at',) 