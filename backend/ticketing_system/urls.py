from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/auth/', include('users.urls')),  # Changed from 'api/' to 'api/auth/'
    path('api/', include('tickets.urls')),  # This will make tickets accessible at /api/tickets/
    path('api/reports/', include('reports.urls')),  # Reports API endpoints
] + static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT) 