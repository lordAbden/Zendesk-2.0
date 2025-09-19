from django.urls import path
from . import views

urlpatterns = [
    path('register/', views.register, name='register'),
    path('login/', views.login_view, name='login'),
    path('logout/', views.logout_view, name='logout'),
    path('profile/', views.profile, name='profile'),
    path('profile/update/', views.update_profile_view, name='update_profile'),
    path('dashboard/', views.dashboard_stats, name='dashboard'),
    path('recent-activity/', views.recent_activity, name='recent_activity'),
    path('admin/dashboard-stats/', views.admin_dashboard_stats, name='admin_dashboard_stats'),
    path('token/refresh/', views.token_refresh, name='token_refresh'),
    path('users/', views.UserListView.as_view(), name='user_list'),
    # Admin user management endpoints
    path('admin/users/create/', views.create_user, name='create_user'),
    path('admin/users/<str:user_id>/update/', views.update_user, name='update_user'),
    path('admin/users/<str:user_id>/delete/', views.delete_user, name='delete_user'),
] 