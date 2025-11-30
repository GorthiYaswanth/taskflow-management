"""
URL configuration for taskflow project.
"""
from django.contrib import admin
from django.urls import path, include
from tasks import views as task_views
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from django.conf import settings
from django.conf.urls.static import static

@api_view(['GET'])
@permission_classes([AllowAny])
def root_view(_request):
    return Response({
        'message': 'TaskFlow API',
        'api_base': '/api/',
        'endpoints': [
            '/api/auth/',
            '/api/tasks/',
            '/api/projects/',
            '/admin/'
        ]
    })


urlpatterns = [
    path('', root_view, name='root'),
    path('admin/', admin.site.urls),
    path('api-auth/', include('rest_framework.urls')),  # DRF login/logout for browsable API
    path('api/auth/', include('accounts.urls')),
    # Also expose auth without the /api prefix to match clients calling /auth/*
    path('auth/', include('accounts.urls')),
    path('api/tasks/', include('tasks.urls')),
    path('api/projects/', include('projects.urls')),
    # Expose non-/api routes to match frontend calls
    path('tasks/', include('tasks.urls')),
    path('projects/', include('projects.urls')),
    # Time-tracking routes at root level (frontend calls /time-tracking/*)
    path('time-tracking/sessions/', task_views.TimeSessionListCreateView.as_view(), name='time_session_list_create_root'),
    path('time-tracking/sessions/<int:pk>/', task_views.TimeSessionDetailView.as_view(), name='time_session_detail_root'),
    path('time-tracking/active-session/', task_views.get_active_session, name='get_active_session_root'),
    path('time-tracking/start/', task_views.start_time_session, name='start_time_session_root'),
    path('time-tracking/stop/<int:session_id>/', task_views.stop_time_session, name='stop_time_session_root'),
    path('time-tracking/analytics/', task_views.time_analytics, name='time_analytics_root'),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
