from django.urls import path
from . import views

urlpatterns = [
    path('', views.ProjectListCreateView.as_view(), name='project_list_create'),
    path('my/', views.MyProjectsListView.as_view(), name='my_projects_list'),
    path('assigned/', views.MyProjectsListView.as_view(), name='assigned_projects_list'),
    path('<int:pk>/', views.ProjectDetailView.as_view(), name='project_detail'),
    path('<int:project_id>/analytics/', views.project_analytics, name='project_analytics'),
    path('<int:project_id>/member-performance/', views.project_member_performance, name='project_member_performance'),
    path('<int:project_id>/members/', views.ProjectMemberListView.as_view(), name='project_members'),
    path('<int:project_id>/members/<int:pk>/', views.ProjectMemberDetailView.as_view(), name='project_member_detail'),
    path('<int:project_id>/messages/', views.ProjectMessageListView.as_view(), name='project_messages'),
    path('messages/project/<int:project_id>/', views.ProjectMessageListView.as_view(), name='project_messages_alt'),
]
