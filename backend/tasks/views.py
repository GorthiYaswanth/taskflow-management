from rest_framework import generics, permissions, status, filters
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from django.db.models import Q, Count
from django.utils import timezone
from django_filters.rest_framework import DjangoFilterBackend
from .models import Task, TaskComment, TaskActivity, TimeSession
from .serializers import (
    TaskSerializer, 
    TaskCreateUpdateSerializer, 
    TaskDetailSerializer,
    TaskCommentSerializer,
    TaskActivitySerializer,
    TimeSessionSerializer
)


class TaskListCreateView(generics.ListCreateAPIView):
    """
    List all tasks or create a new task
    """
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['status', 'priority', 'assignee', 'project']
    search_fields = ['title', 'description']
    ordering_fields = ['created_at', 'updated_at', 'due_date', 'priority']
    ordering = ['-created_at']
    
    def get_serializer_class(self):
        if self.request.method == 'POST':
            return TaskCreateUpdateSerializer
        return TaskSerializer
    
    def get_queryset(self):
        user = self.request.user
        
        if user.is_scrum_master():
            # Scrum Master can see all tasks from active projects only
            return Task.objects.filter(project__is_active=True).select_related('assignee', 'created_by', 'project').prefetch_related('comments')
        else:
            # Employee can see tasks directly assigned or via TaskAssignment from active projects only
            from .models import TaskAssignment
            assigned_task_ids = TaskAssignment.objects.filter(user=user, is_active=True).values_list('task_id', flat=True)
            return Task.objects.filter(
                Q(assignee=user) | Q(id__in=assigned_task_ids),
                project__is_active=True
            ).select_related('assignee', 'created_by', 'project').prefetch_related('comments')
    
    def perform_create(self, serializer):
        if not self.request.user.is_scrum_master():
            raise permissions.PermissionDenied("Only Scrum Masters can create tasks")
        serializer.save()


class TaskDetailView(generics.RetrieveUpdateDestroyAPIView):
    """
    Retrieve, update or delete a task
    """
    permission_classes = [permissions.IsAuthenticated]
    
    def get_serializer_class(self):
        if self.request.method in ['PUT', 'PATCH']:
            return TaskCreateUpdateSerializer
        return TaskDetailSerializer
    
    def get_queryset(self):
        user = self.request.user
        
        if user.is_scrum_master():
            return Task.objects.select_related('assignee', 'created_by', 'project').prefetch_related('comments', 'activities')
        else:
            from .models import TaskAssignment
            assigned_task_ids = TaskAssignment.objects.filter(user=user, is_active=True).values_list('task_id', flat=True)
            return Task.objects.filter(Q(assignee=user) | Q(id__in=assigned_task_ids)).select_related('assignee', 'created_by', 'project').prefetch_related('comments', 'activities')
    
    def perform_update(self, serializer):
        user = self.request.user
        task = self.get_object()
        
        # Employees can only update their own tasks and only certain fields
        if user.is_employee() and task.assignee_id != user.id:
            raise permissions.PermissionDenied("You can only update your assigned tasks")
        
        # Employees can only update status and add comments, not assign or change priority
        if user.is_employee():
            allowed_fields = ['status']
            for field in serializer.validated_data:
                if field not in allowed_fields:
                    raise permissions.PermissionDenied(f"You cannot update {field}")
        
        serializer.save()
    
    def perform_destroy(self, instance):
        if not self.request.user.is_scrum_master():
            raise permissions.PermissionDenied("Only Scrum Masters can delete tasks")
        instance.delete()


class TaskCommentListCreateView(generics.ListCreateAPIView):
    """
    List comments for a task or create a new comment
    """
    serializer_class = TaskCommentSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        task_id = self.kwargs['task_id']
        user = self.request.user
        
        # Check if user has access to this task
        if user.is_scrum_master():
            task = Task.objects.get(id=task_id)
        else:
            task = Task.objects.get(id=task_id, assignee=user)
        
        return TaskComment.objects.filter(task=task).order_by('created_at')
    
    def perform_create(self, serializer):
        task_id = self.kwargs['task_id']
        user = self.request.user
        
        # Check if user has access to this task
        if user.is_scrum_master():
            task = Task.objects.get(id=task_id)
        else:
            task = Task.objects.get(id=task_id, assignee=user)
        
        comment = serializer.save(task=task, author=user)
        
        # Create activity log
        TaskActivity.objects.create(
            task=task,
            user=user,
            activity_type='commented',
            description=f'Added a comment: "{comment.content[:50]}..."'
        )


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def task_analytics(request):
    """
    Get task analytics dashboard data
    """
    user = request.user
    
    if user.is_scrum_master():
        # Scrum Master analytics - all tasks from active projects only
        total_tasks = Task.objects.filter(project__is_active=True).count()
        completed_tasks = Task.objects.filter(project__is_active=True, status='done').count()
        in_progress_tasks = Task.objects.filter(project__is_active=True, status='in_progress').count()
        review_tasks = Task.objects.filter(project__is_active=True, status='review').count()
        todo_tasks = Task.objects.filter(project__is_active=True, status='todo').count()
        overdue_tasks = Task.objects.filter(
            project__is_active=True,
            due_date__lt=timezone.now(),
            status__in=['todo', 'in_progress', 'review']
        ).count()
        
        # Tasks by assignee - get all unique assignees and their task counts
        from .models import TaskAssignment
        from accounts.models import User
        
        # Get all users who have tasks assigned (either directly or via TaskAssignment)
        direct_assignee_ids = Task.objects.filter(project__is_active=True, assignee__isnull=False).values_list('assignee_id', flat=True).distinct()
        task_assignee_ids = TaskAssignment.objects.filter(task__project__is_active=True, is_active=True).values_list('user_id', flat=True).distinct()
        all_assignee_ids = set(direct_assignee_ids) | set(task_assignee_ids)
        
        tasks_by_assignee = []
        for user_id in all_assignee_ids:
            try:
                user = User.objects.get(id=user_id)
                # Get tasks assigned directly to this user
                direct_tasks = Task.objects.filter(project__is_active=True, assignee=user)
                # Get tasks assigned via TaskAssignment
                assigned_task_ids = TaskAssignment.objects.filter(task__project__is_active=True, user=user, is_active=True).values_list('task_id', flat=True)
                assigned_tasks = Task.objects.filter(id__in=assigned_task_ids)
                # Combine both
                user_tasks = (direct_tasks | assigned_tasks).distinct()
                
                tasks_by_assignee.append({
                    'assignee__first_name': user.first_name,
                    'assignee__last_name': user.last_name,
                    'assignee_name': user.get_full_name(),
                    'total': user_tasks.count(),
                    'completed': user_tasks.filter(status='done').count(),
                    'in_progress': user_tasks.filter(status='in_progress').count(),
                    'review': user_tasks.filter(status='review').count(),
                    'todo': user_tasks.filter(status='todo').count()
                })
            except User.DoesNotExist:
                continue
        
        # Tasks by priority
        tasks_by_priority = Task.objects.filter(project__is_active=True).values('priority').annotate(
            count=Count('id')
        ).order_by('priority')
        
        # Recent activities
        recent_activities = TaskActivity.objects.select_related('task', 'user').order_by('-created_at')[:10]
        
        # Calculate average task duration for completed tasks (Scrum Master)
        completed_tasks_with_dates = Task.objects.filter(
            project__is_active=True,
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
        
    else:
        # Employee analytics - tasks directly assigned or via TaskAssignment from active projects only
        from .models import TaskAssignment
        assigned_task_ids = TaskAssignment.objects.filter(user=user, is_active=True).values_list('task_id', flat=True)
        user_tasks = Task.objects.filter(
            Q(assignee=user) | Q(id__in=assigned_task_ids),
            project__is_active=True
        )
        total_tasks = user_tasks.count()
        completed_tasks = user_tasks.filter(status='done').count()
        in_progress_tasks = user_tasks.filter(status='in_progress').count()
        review_tasks = user_tasks.filter(status='review').count()
        todo_tasks = user_tasks.filter(status='todo').count()
        overdue_tasks = user_tasks.filter(
            due_date__lt=timezone.now(),
            status__in=['todo', 'in_progress', 'review']
        ).count()
        
        # For employees, also show their own task performance
        tasks_by_assignee = [{
            'assignee__first_name': user.first_name,
            'assignee__last_name': user.last_name,
            'assignee_name': user.get_full_name(),
            'total': total_tasks,
            'completed': completed_tasks,
            'in_progress': in_progress_tasks,
            'todo': todo_tasks
        }]
        
        tasks_by_priority = user_tasks.values('priority').annotate(
            count=Count('id')
        ).order_by('priority')
        
        recent_activities = TaskActivity.objects.filter(task__assignee=user).select_related('task', 'user').order_by('-created_at')[:10]
    
        # Calculate average task duration for completed tasks (Employee)
        completed_tasks_with_dates = user_tasks.filter(
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
        'total_tasks': total_tasks,
        'completed_tasks': completed_tasks,
        'in_progress_tasks': in_progress_tasks,
        'review_tasks': review_tasks if 'review_tasks' in locals() else 0,
        'todo_tasks': todo_tasks,
        'overdue_tasks': overdue_tasks,
        'completion_rate': round((completed_tasks / total_tasks * 100) if total_tasks > 0 else 0, 2),
        'tasks_by_assignee': list(tasks_by_assignee),
        'tasks_by_priority': list(tasks_by_priority),
        'recent_activities': TaskActivitySerializer(recent_activities, many=True).data,
        'avg_task_duration': round(avg_duration, 1),
        'avg_task_duration_minutes': round(avg_duration_minutes, 1)
    }
    
    return Response(analytics)


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def kanban_tasks(request):
    """
    Get tasks organized by status for Kanban board
    """
    user = request.user
    project_id = request.GET.get('project')
    
    if user.is_scrum_master():
        tasks = Task.objects.filter(project__is_active=True).select_related('assignee', 'project').prefetch_related('comments')
    else:
        # Include tasks assigned via TaskAssignment in addition to direct assignee from active projects only
        from .models import TaskAssignment
        assigned_task_ids = TaskAssignment.objects.filter(user=user, is_active=True).values_list('task_id', flat=True)
        tasks = Task.objects.filter(
            Q(assignee=user) | Q(id__in=assigned_task_ids),
            project__is_active=True
        ).select_related('assignee', 'project').prefetch_related('comments')
    
    # Filter by project if specified
    if project_id:
        tasks = tasks.filter(project_id=project_id)
    
    # Group tasks by status
    kanban_data = {
        'todo': TaskSerializer(tasks.filter(status='todo'), many=True).data,
        'in_progress': TaskSerializer(tasks.filter(status='in_progress'), many=True).data,
        'review': TaskSerializer(tasks.filter(status='review'), many=True).data,
        'done': TaskSerializer(tasks.filter(status='done'), many=True).data,
    }
    
    return Response(kanban_data)


@api_view(['PATCH'])
@permission_classes([permissions.IsAuthenticated])
def update_task_status(request, task_id):
    """
    Update task status (for drag and drop in Kanban)
    """
    try:
        task = Task.objects.get(id=task_id)
    except Task.DoesNotExist:
        return Response({'error': 'Task not found'}, status=status.HTTP_404_NOT_FOUND)
    
    user = request.user
    
    # Check permissions: allow if employee is direct assignee OR in TaskAssignment
    if user.is_employee():
        is_direct = (task.assignee_id == user.id)
        if not is_direct:
            from .models import TaskAssignment
            is_indirect = TaskAssignment.objects.filter(task=task, user=user, is_active=True).exists()
        else:
            is_indirect = True
        if not is_indirect:
            return Response({'error': 'You can only update your assigned tasks'}, status=status.HTTP_403_FORBIDDEN)
    
    new_status = request.data.get('status')
    if new_status not in ['todo', 'in_progress', 'review', 'done']:
        return Response({'error': 'Invalid status'}, status=status.HTTP_400_BAD_REQUEST)
    
    old_status = task.status
    task.status = new_status
    task.save()
    
    # Create activity log
    TaskActivity.objects.create(
        task=task,
        user=user,
        activity_type='status_changed',
        description=f'Status changed from {old_status} to {new_status}',
        old_value=old_status,
        new_value=new_status
    )
    
    return Response(TaskSerializer(task).data)


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def notifications(request):
    """
    Unified notifications feed for the current user:
    - Recent TaskActivity on tasks the user owns (SM: all tasks) or is assigned to
    - Recent ProjectMessage in projects the user belongs to or has tasks in
    """
    user = request.user
    from projects.models import ProjectMessage, ProjectMember, Project
    from tasks.models import TaskAssignment

    if user.is_scrum_master():
        # Only include activities from active projects
        recent_activities = TaskActivity.objects.filter(
            task__project__is_active=True
        ).select_related('task', 'user').order_by('-created_at')[:20]
        # All messages in projects created by this SM or where SM is member (only active projects)
        sm_project_ids = list(Project.objects.filter(created_by=user, is_active=True).values_list('id', flat=True))
        sm_member_project_ids = list(ProjectMember.objects.filter(user=user, is_active=True).values_list('project_id', flat=True))
        project_ids = set(sm_project_ids + sm_member_project_ids)
        recent_messages = ProjectMessage.objects.filter(
            project_id__in=project_ids,
            project__is_active=True
        ).select_related('author', 'project').order_by('-created_at')[:20]
    else:
        assigned_task_ids = TaskAssignment.objects.filter(user=user, is_active=True).values_list('task_id', flat=True)
        # Only include activities from active projects
        recent_activities = TaskActivity.objects.filter(
            Q(task__assignee=user) | Q(task_id__in=assigned_task_ids),
            task__project__is_active=True
        ).select_related('task', 'user').order_by('-created_at')[:20]
        member_project_ids = list(ProjectMember.objects.filter(user=user, is_active=True).values_list('project_id', flat=True))
        assignee_project_ids = list(TaskAssignment.objects.filter(user=user, is_active=True).values_list('task__project_id', flat=True))
        project_ids = set(member_project_ids + assignee_project_ids)
        recent_messages = ProjectMessage.objects.filter(
            project_id__in=project_ids,
            project__is_active=True
        ).select_related('author', 'project').order_by('-created_at')[:20]

    activity_items = [
        {
            'type': 'activity',
            'id': a.id,
            'task_id': a.task_id,
            'task_title': getattr(a.task, 'title', ''),
            'user_name': getattr(a.user, 'first_name', '') + ' ' + getattr(a.user, 'last_name', ''),
            'description': a.description,
            'created_at': a.created_at,
        } for a in recent_activities
    ]

    message_items = [
        {
            'type': 'message',
            'id': m.id,
            'project_id': m.project_id,
            'project_name': getattr(m.project, 'name', ''),
            'author_name': m.author.get_full_name(),
            'content': m.content,
            'created_at': m.created_at,
        } for m in recent_messages
    ]

    # Due soon items (next 48h) for relevant tasks (only from active projects)
    from datetime import timedelta
    soon = timezone.now() + timedelta(hours=48)
    if user.is_scrum_master():
        due_qs = Task.objects.filter(
            due_date__isnull=False, 
            due_date__lte=soon, 
            status__in=['todo', 'in_progress'],
            project__is_active=True
        ).select_related('project')
    else:
        assigned_task_ids = TaskAssignment.objects.filter(user=user, is_active=True).values_list('task_id', flat=True)
        due_qs = Task.objects.filter(
            Q(assignee=user) | Q(id__in=assigned_task_ids),
            due_date__isnull=False,
            due_date__lte=soon,
            status__in=['todo', 'in_progress'],
            project__is_active=True
        ).select_related('project')

    def human_eta(dt):
        diff = dt - timezone.now()
        hours = int(diff.total_seconds() // 3600)
        if hours <= 0:
            return 'now'
        if hours < 24:
            return f'in {hours}h'
        days = hours // 24
        return f'in {days}d'

    due_items = [
        {
            'type': 'due_soon',
            'id': t.id,
            'task_id': t.id,
            'task_title': t.title,
            'project_name': getattr(t.project, 'name', ''),
            'content': f'Task "{t.title}" is due {human_eta(t.due_date)}',
            'created_at': timezone.now(),
        }
        for t in due_qs.order_by('due_date')[:20]
    ]

    items = sorted(activity_items + message_items + due_items, key=lambda x: x['created_at'], reverse=True)[:20]
    return Response({'items': items})


# Time Tracking Views
class TimeSessionListCreateView(generics.ListCreateAPIView):
    """
    List all time sessions or create a new time session
    """
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = TimeSessionSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['task', 'is_active']
    search_fields = ['task_title', 'description']
    ordering_fields = ['start_time', 'duration']
    ordering = ['-start_time']
    
    def get_queryset(self):
        return TimeSession.objects.filter(user=self.request.user).select_related('task')


class TimeSessionDetailView(generics.RetrieveUpdateDestroyAPIView):
    """
    Retrieve, update or delete a time session
    """
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = TimeSessionSerializer
    
    def get_queryset(self):
        return TimeSession.objects.filter(user=self.request.user)


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def get_active_session(request):
    """
    Get the currently active time session for the user
    """
    try:
        active_session = TimeSession.objects.filter(
            user=request.user, 
            is_active=True
        ).select_related('task').first()
        
        if active_session:
            serializer = TimeSessionSerializer(active_session)
            return Response(serializer.data)
        else:
            return Response({'is_active': False})
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def start_time_session(request):
    """
    Start a new time tracking session
    """
    try:
        # Stop any existing active session
        TimeSession.objects.filter(user=request.user, is_active=True).update(is_active=False)
        
        task_id = request.data.get('task_id')
        task = None
        task_title = 'General Work'
        
        if task_id:
            try:
                task = Task.objects.get(id=task_id)
                task_title = task.title
            except Task.DoesNotExist:
                return Response({'error': 'Task not found'}, status=status.HTTP_404_NOT_FOUND)
        
        # Create new session
        session = TimeSession.objects.create(
            user=request.user,
            task=task,
            task_title=task_title,
            start_time=timezone.now(),
            is_active=True
        )
        
        serializer = TimeSessionSerializer(session)
        return Response(serializer.data, status=status.HTTP_201_CREATED)
        
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def stop_time_session(request, session_id):
    """
    Stop a time tracking session
    """
    try:
        session = TimeSession.objects.get(id=session_id, user=request.user)
        
        if not session.is_active:
            return Response({'error': 'Session is not active'}, status=status.HTTP_400_BAD_REQUEST)
        
        # Calculate duration
        end_time = timezone.now()
        duration = int((end_time - session.start_time).total_seconds() * 1000)  # Convert to milliseconds
        
        # Update session
        session.end_time = end_time
        session.duration = duration
        session.is_active = False
        session.save()
        
        serializer = TimeSessionSerializer(session)
        return Response(serializer.data)
        
    except TimeSession.DoesNotExist:
        return Response({'error': 'Session not found'}, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def time_analytics(request):
    """
    Get time tracking analytics for the user
    """
    try:
        from django.db.models import Sum, Avg
        from datetime import datetime, timedelta
        
        # Get date range (default to last 30 days)
        days = int(request.GET.get('days', 30))
        start_date = timezone.now() - timedelta(days=days)
        
        # Get sessions in date range
        sessions = TimeSession.objects.filter(
            user=request.user,
            start_time__gte=start_date
        ).select_related('task')
        
        # Calculate analytics
        total_time = sessions.aggregate(total=Sum('duration'))['total'] or 0
        avg_session_duration = sessions.aggregate(avg=Avg('duration'))['avg'] or 0
        total_sessions = sessions.count()
        active_sessions = sessions.filter(is_active=True).count()
        
        # Today's sessions
        today = timezone.now().date()
        today_sessions = sessions.filter(start_time__date=today)
        today_time = today_sessions.aggregate(total=Sum('duration'))['total'] or 0
        
        # Sessions by task
        sessions_by_task = sessions.values('task_title').annotate(
            total_time=Sum('duration'),
            session_count=Count('id')
        ).order_by('-total_time')[:10]
        
        return Response({
            'total_time': total_time,
            'total_time_formatted': format_time(total_time),
            'avg_session_duration': avg_session_duration,
            'avg_session_duration_formatted': format_time(avg_session_duration),
            'total_sessions': total_sessions,
            'active_sessions': active_sessions,
            'today_time': today_time,
            'today_time_formatted': format_time(today_time),
            'sessions_by_task': list(sessions_by_task),
            'period_days': days
        })
        
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)


def format_time(milliseconds):
    """Helper function to format milliseconds as HH:MM:SS"""
    if not milliseconds:
        return "00:00:00"
    
    total_seconds = milliseconds // 1000
    hours = total_seconds // 3600
    minutes = (total_seconds % 3600) // 60
    seconds = total_seconds % 60
    return f"{hours:02d}:{minutes:02d}:{seconds:02d}"
