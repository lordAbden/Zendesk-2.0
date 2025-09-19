from django.urls import path
from . import views

urlpatterns = [
    path('tickets/', views.TicketListView.as_view(), name='ticket_list'),
    path('tickets/<uuid:pk>/', views.TicketDetailView.as_view(), name='ticket_detail'),
    path('tickets/<uuid:ticket_id>/attachments/', views.TicketAttachmentView.as_view(), name='ticket_attachments'),
    path('tickets/<uuid:ticket_id>/messages/', views.TicketMessageView.as_view(), name='ticket_messages'),
    path('tickets/<uuid:ticket_id>/accept/', views.accept_ticket, name='accept_ticket'),
    path('tickets/<uuid:ticket_id>/add-technician/', views.add_technician, name='add_technician'),
    path('tickets/<uuid:ticket_id>/close/', views.close_ticket, name='close_ticket'),
    path('tickets/<uuid:ticket_id>/reopen/', views.reopen_ticket, name='reopen_ticket'),
    path('tickets/<uuid:ticket_id>/closure-report/', views.create_closure_report, name='create_closure_report'),
    path('tickets/<uuid:ticket_id>/closure-report/view/', views.get_closure_report, name='get_closure_report'),
    path('tickets/<uuid:ticket_id>/closure-report/attachments/', views.upload_closure_report_attachment, name='upload_closure_report_attachment'),
    path('dashboard/', views.TicketDashboardView.as_view(), name='ticket_dashboard'),
    path('performance-stats/', views.performance_stats, name='performance_stats'),
    path('tickets/top-technicians-stats/', views.top_technicians_stats, name='top_technicians_stats'),
] 