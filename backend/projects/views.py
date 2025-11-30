from rest_framework import generics, permissions, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from django.db.models import Count, Q
from django.shortcuts import get_object_or_404
from .models import Project, ProjectMember, ProjectMessage
from .serializers import (
    ProjectSerializer, ProjectDetailSerializer, ProjectCreateUpdateSerializer,
    ProjectMemberSerializer, ProjectMessageSerializer
)


class ProjectListCreateView(generics.ListCreateAPIView):
    """
    List all projects or create a new project (Scrum Master only)
    """
    serializer_class = ProjectSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        user = self.request.user
        if user.is_scrum_master():
            projects = Project.objects.filter(is_active=True).annotate(
                task_count=Count('tasks', distinct=True)
            ).order_by('-created_at')
            
            # Debug logging
            for project in projects:
                print(f"Scrum Master View - Project: {project.name}, Annotated task_count: {project.task_count}")
            
            return projects
        return Project.objects.none()
    
    def perform_create(self, serializer):
        if not self.request.user.is_scrum_master():
            raise permissions.PermissionDenied("Only Scrum Masters can create projects")
        serializer.save(created_by=self.request.user)


class MyProjectsListView(generics.ListAPIView):
    """
    List projects assigned to the current user (Employee only)
    """
    serializer_class = ProjectSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        user = self.request.user
        if user.is_employee():
            # Get projects where user is a member OR assigned to tasks
            from tasks.models import TaskAssignment
            
            # Projects where user is a direct member
            direct_member_projects = Project.objects.filter(
                is_active=True,
                members__user=user,
                members__is_active=True
            )
            
            # Projects where user is assigned to tasks
            task_assigned_projects = Project.objects.filter(
                is_active=True,
                tasks__assignments__user=user,
                tasks__assignments__is_active=True
            )
            
            # Combine both querysets
            all_projects = (direct_member_projects | task_assigned_projects).distinct().annotate(
                task_count=Count('tasks', distinct=True)
            ).order_by('-created_at')
            
            # Debug logging
            for project in all_projects:
                print(f"Employee View - Project: {project.name}, Annotated task_count: {project.task_count}")
            
            return all_projects
        return Project.objects.none()


class ProjectDetailView(generics.RetrieveUpdateDestroyAPIView):
    """
    Retrieve, update or delete a project (Scrum Master only)
    """
    serializer_class = ProjectDetailSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        user = self.request.user
        if user.is_scrum_master():
            return Project.objects.filter(is_active=True)
        return Project.objects.none()
    
    def perform_update(self, serializer):
        if not self.request.user.is_scrum_master():
            raise permissions.PermissionDenied("Only Scrum Masters can update projects")
        serializer.save()
    
    def perform_destroy(self, instance):
        if not self.request.user.is_scrum_master():
            raise permissions.PermissionDenied("Only Scrum Masters can delete projects")
        instance.is_active = False
        instance.save()


class ProjectMemberListView(generics.ListCreateAPIView):
    """
    List and add project members (Scrum Master only)
    """
    serializer_class = ProjectMemberSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        project_id = self.kwargs['project_id']
        user = self.request.user
        
        if user.is_scrum_master():
            return ProjectMember.objects.filter(
                project_id=project_id,
                project__is_active=True,
                is_active=True
            ).order_by('-joined_at')
        return ProjectMember.objects.none()
    
    def perform_create(self, serializer):
        if not self.request.user.is_scrum_master():
            raise permissions.PermissionDenied("Only Scrum Masters can add project members")
        
        project_id = self.kwargs['project_id']
        project = get_object_or_404(Project, id=project_id, is_active=True)
        serializer.save(project=project)


class ProjectMemberDetailView(generics.DestroyAPIView):
    """
    Remove project member (Scrum Master only)
    """
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        project_id = self.kwargs['project_id']
        user = self.request.user
        
        if user.is_scrum_master():
            return ProjectMember.objects.filter(
                project_id=project_id,
                project__is_active=True,
                is_active=True
            )
        return ProjectMember.objects.none()
    
    def perform_destroy(self, instance):
        if not self.request.user.is_scrum_master():
            raise permissions.PermissionDenied("Only Scrum Masters can remove project members")
        instance.is_active = False
        instance.save()


class ProjectMessageListView(generics.ListCreateAPIView):
    """
    List and create project messages (Project members only)
    """
    serializer_class = ProjectMessageSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        project_id = self.kwargs['project_id']
        user = self.request.user
        
        # Check if user is a member of this project OR assigned to tasks in this project
        from tasks.models import TaskAssignment
        
        # Allow project owner (Scrum Master who created the project)
        try:
            project_obj = Project.objects.only('id', 'created_by_id', 'is_active').get(id=project_id, is_active=True)
            is_project_owner = project_obj.created_by_id == user.id
        except Project.DoesNotExist:
            is_project_owner = False

        is_project_member = ProjectMember.objects.filter(
            project_id=project_id,
            user=user,
            is_active=True
        ).exists()
        
        is_task_assignee = TaskAssignment.objects.filter(
            task__project_id=project_id,
            user=user,
            is_active=True
        ).exists()
        
        if is_project_owner or is_project_member or is_task_assignee:
            return ProjectMessage.objects.filter(
                project_id=project_id
            ).order_by('created_at')
        return ProjectMessage.objects.none()
    
    def perform_create(self, serializer):
        project_id = self.kwargs['project_id']
        user = self.request.user
        
        # Check if user is a member of this project OR assigned to tasks in this project
        from tasks.models import TaskAssignment
        
        # Allow project owner (Scrum Master who created the project)
        try:
            project_obj = Project.objects.only('id', 'created_by_id', 'is_active').get(id=project_id, is_active=True)
            is_project_owner = project_obj.created_by_id == user.id
        except Project.DoesNotExist:
            is_project_owner = False

        is_project_member = ProjectMember.objects.filter(
            project_id=project_id,
            user=user,
            is_active=True
        ).exists()
        
        is_task_assignee = TaskAssignment.objects.filter(
            task__project_id=project_id,
            user=user,
            is_active=True
        ).exists()
        
        if not (is_project_owner or is_project_member or is_task_assignee):
            raise permissions.PermissionDenied("You must be a project member or task assignee to send messages")
        
        project = get_object_or_404(Project, id=project_id, is_active=True)
        serializer.save(project=project, author=user)


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def project_analytics(request, project_id):
    """
    Get project analytics (Scrum Master only)
    """
    try:
        # Allow both scrum masters and employees to access project analytics
        if not (request.user.is_scrum_master() or request.user.is_employee()):
            return Response({'error': 'Permission denied'}, status=status.HTTP_403_FORBIDDEN)
        
        try:
            project = Project.objects.get(id=project_id, is_active=True)
        except Project.DoesNotExist:
            return Response({'error': 'Project not found'}, status=status.HTTP_404_NOT_FOUND)
    
        from tasks.models import Task, TaskAssignment
        from django.utils import timezone
        from datetime import timedelta
        
        tasks = project.tasks.all()
        total_tasks = tasks.count()
        completed_tasks = tasks.filter(status='done').count()
        in_progress_tasks = tasks.filter(status='in_progress').count()
        review_tasks = tasks.filter(status='review').count()
        todo_tasks = tasks.filter(status='todo').count()
        
        
        
        # Calculate completion rate
        completion_rate = (completed_tasks / total_tasks * 100) if total_tasks > 0 else 0
        
        # Get team members count - users who have tasks assigned in this project
        # Include both direct assignees and TaskAssignment records
        direct_assignee_ids = tasks.filter(assignee__isnull=False).values_list('assignee_id', flat=True).distinct()
        task_assignee_ids = TaskAssignment.objects.filter(
            task__project=project,
            is_active=True
        ).values_list('user_id', flat=True).distinct()
        
        # Combine both sets and get unique count
        all_assignee_ids = set(direct_assignee_ids) | set(task_assignee_ids)
        team_members = len(all_assignee_ids)
        
        
        # Get recently completed tasks
        recent_completed_tasks = tasks.filter(status='done').order_by('-updated_at')[:10]
        recent_completed_data = []
        for task in recent_completed_tasks:
            recent_completed_data.append({
                'title': task.title,
                'completed_at': task.updated_at,
                'completed_by': task.assignee.get_full_name() if task.assignee else 'Unknown',
                'priority': task.priority
            })
        
        # Get tasks by priority for charts
        from django.db.models import Count as DjCount
        tasks_by_priority = list(
            tasks.values('priority').annotate(count=DjCount('id')).order_by('priority')
        )

        # Get team performance - users who have tasks assigned in this project
        team_performance = []
        
        # Get all users who have tasks assigned in this project (both direct and via TaskAssignment)
        for user_id in all_assignee_ids:
            try:
                from accounts.models import User
                user = User.objects.get(id=user_id)
                
                # Get tasks assigned directly to this user
                direct_tasks = tasks.filter(assignee=user)
                
                # Get tasks assigned via TaskAssignment
                assigned_task_ids = TaskAssignment.objects.filter(
                    task__project=project,
                    user=user,
                    is_active=True
                ).values_list('task_id', flat=True)
                assigned_tasks = tasks.filter(id__in=assigned_task_ids)
                
                # Combine both sets of tasks
                user_tasks = (direct_tasks | assigned_tasks).distinct()
                completed_count = user_tasks.filter(status='done').count()
                in_progress_count = user_tasks.filter(status='in_progress').count()
                review_count = user_tasks.filter(status='review').count()
                
                team_performance.append({
                    'name': user.get_full_name(),
                    'email': user.email,
                    'completed_tasks': completed_count,
                    'in_progress_tasks': in_progress_count,
                    'review_tasks': review_count,
                    'total_assigned': user_tasks.count()
                })
            except User.DoesNotExist:
                continue
        
        # Calculate average task duration
        completed_tasks_with_dates = tasks.filter(
            status='done',
            created_at__isnull=False,
            updated_at__isnull=False
        )
        avg_duration = 0
        avg_duration_minutes = 0
        if completed_tasks_with_dates.exists():
            total_duration_seconds = 0
            for task in completed_tasks_with_dates:
                duration_seconds = (task.updated_at - task.created_at).total_seconds()
                total_duration_seconds += duration_seconds
            avg_duration_seconds = total_duration_seconds / completed_tasks_with_dates.count()
            avg_duration = avg_duration_seconds / (24 * 60 * 60)  # Convert to days
            avg_duration_minutes = avg_duration_seconds / 60  # Convert to minutes
        
        analytics = {
            'project': ProjectSerializer(project).data,
            'total_tasks': total_tasks,
            'completed_tasks': completed_tasks,
            'in_progress_tasks': in_progress_tasks,
            'review_tasks': review_tasks,
            'todo_tasks': todo_tasks,
            'tasks_by_priority': tasks_by_priority,
            'completion_rate': round(completion_rate, 2),
            'team_members': team_members,
            'recent_completed_tasks': recent_completed_data,
            'team_performance': team_performance,
            'project_start_date': project.created_at,
            'last_activity': project.updated_at,
            'avg_task_duration': round(avg_duration, 1),
            'avg_task_duration_minutes': round(avg_duration_minutes, 1)
        }
        
        return Response(analytics)
    
    except Exception as e:
        print(f"Error in project analytics: {str(e)}")
        return Response({'error': f'Analytics calculation failed: {str(e)}'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def project_member_performance(request, project_id):
    """
    Per-member performance and recent history for a project (Scrum Master only)
    """
    try:
        project = Project.objects.get(id=project_id, is_active=True)
    except Project.DoesNotExist:
        return Response({'error': 'Project not found'}, status=status.HTTP_404_NOT_FOUND)

    # Allow scrum masters, project creators, and employees to access member performance
    if not (request.user.is_scrum_master() or project.created_by_id == request.user.id or request.user.is_employee()):
        return Response({'error': 'Permission denied'}, status=status.HTTP_403_FORBIDDEN)

    from tasks.models import Task, TaskAssignment

    # Only show users who have tasks assigned in this project (both direct and via TaskAssignment)
    direct_assignee_ids = project.tasks.filter(assignee__isnull=False).values_list('assignee_id', flat=True).distinct()
    task_assignee_ids = TaskAssignment.objects.filter(task__project=project, is_active=True).values_list('user_id', flat=True).distinct()
    assignee_user_ids = set(direct_assignee_ids) | set(task_assignee_ids)
    
    # Helper to get role label if exists
    def role_label_for(user_id: int) -> str:
        try:
            member = ProjectMember.objects.get(project=project, user_id=user_id, is_active=True)
            return member.get_role_display()
        except ProjectMember.DoesNotExist:
            return 'Employee'

    from accounts.models import User
    users = User.objects.filter(id__in=assignee_user_ids)

    data = []
    for u in users:
        direct = Task.objects.filter(project=project, assignee=u)
        assigned_ids = TaskAssignment.objects.filter(task__project=project, user=u, is_active=True).values_list('task_id', flat=True)
        indirect = Task.objects.filter(id__in=assigned_ids)
        user_tasks = (direct | indirect).distinct().order_by('-updated_at')

        data.append({
            'user_id': u.id,
            'name': u.get_full_name(),
            'email': u.email,
            'role': role_label_for(u.id),
            'total_tasks': user_tasks.count(),
            'completed_tasks': user_tasks.filter(status='done').count(),
            'in_progress_tasks': user_tasks.filter(status='in_progress').count(),
            'todo_tasks': user_tasks.filter(status='todo').count(),
            'recent_tasks': [
                {
                    'id': t.id,
                    'title': t.title,
                    'status': t.status,
                    'priority': t.priority,
                    'updated_at': t.updated_at,
                }
                for t in user_tasks[:5]
            ],
        })

    return Response({'project': ProjectSerializer(project).data, 'members': data})
