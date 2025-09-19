from django.urls import path
from . import views

urlpatterns = [
    path('ticket-analytics/', views.get_ticket_analytics, name='ticket_analytics'),
    path('user-performance/', views.get_user_performance, name='user_performance'),
    path('employee-statistics/', views.get_employee_statistics, name='employee_statistics'),
    path('technician-statistics/', views.get_technician_statistics, name='technician_statistics'),
    path('group-statistics/', views.get_group_statistics, name='group_statistics'),
    path('sla-tracking/', views.get_sla_tracking, name='sla_tracking'),
    path('quality-metrics/', views.get_quality_metrics, name='quality_metrics'),
    path('recurring-problems/', views.get_recurring_problems, name='recurring_problems'),
    path('performance-statistics/', views.get_performance_statistics, name='performance_statistics'),
    path('trends-statistics/', views.get_trends_statistics, name='trends_statistics'),
    path('workload-statistics/', views.get_workload_statistics, name='workload_statistics'),
    path('system-statistics/', views.get_system_statistics, name='system_statistics'),
    path('employees-list/', views.get_employees_list, name='employees_list'),
    path('technicians-list/', views.get_technicians_list, name='technicians_list'),
]
