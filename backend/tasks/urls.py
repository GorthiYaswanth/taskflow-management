from django.urls import path
from . import views

urlpatterns = [
    path('', views.TaskListCreateView.as_view(), name='task_list_create'),
    path('<int:pk>/', views.TaskDetailView.as_view(), name='task_detail'),
    path('<int:task_id>/comments/', views.TaskCommentListCreateView.as_view(), name='task_comments'),
    path('analytics/', views.task_analytics, name='task_analytics'),
    path('kanban/', views.kanban_tasks, name='kanban_tasks'),
    path('<int:task_id>/status/', views.update_task_status, name='update_task_status'),
    path('notifications/', views.notifications, name='notifications'),
    # Time tracking URLs
    path('time-tracking/sessions/', views.TimeSessionListCreateView.as_view(), name='time_session_list_create'),
    path('time-tracking/sessions/<int:pk>/', views.TimeSessionDetailView.as_view(), name='time_session_detail'),
    path('time-tracking/active-session/', views.get_active_session, name='get_active_session'),
    path('time-tracking/start/', views.start_time_session, name='start_time_session'),
    path('time-tracking/stop/<int:session_id>/', views.stop_time_session, name='stop_time_session'),
    path('time-tracking/analytics/', views.time_analytics, name='time_analytics'),
]
