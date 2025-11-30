from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import Task, TaskComment, TaskActivity, TaskAssignment, TimeSession
from projects.serializers import ProjectSerializer

User = get_user_model()


class TaskAssignmentSerializer(serializers.ModelSerializer):
    """
    Serializer for TaskAssignment model
    """
    user_name = serializers.CharField(source='user.get_full_name', read_only=True)
    user_email = serializers.CharField(source='user.email', read_only=True)
    
    class Meta:
        model = TaskAssignment
        fields = ('id', 'user', 'user_name', 'user_email', 'assigned_at', 'is_active')
        read_only_fields = ('id', 'assigned_at')


class TaskCommentSerializer(serializers.ModelSerializer):
    """
    Serializer for TaskComment model
    """
    author_name = serializers.CharField(source='author.get_full_name', read_only=True)
    
    class Meta:
        model = TaskComment
        fields = ('id', 'content', 'author', 'author_name', 'created_at', 'updated_at')
        read_only_fields = ('id', 'author', 'created_at', 'updated_at')


class TaskActivitySerializer(serializers.ModelSerializer):
    """
    Serializer for TaskActivity model
    """
    user_name = serializers.CharField(source='user.get_full_name', read_only=True)
    
    class Meta:
        model = TaskActivity
        fields = ('id', 'activity_type', 'description', 'old_value', 'new_value', 'user_name', 'created_at')
        read_only_fields = ('id', 'user', 'created_at')


class TaskSerializer(serializers.ModelSerializer):
    """
    Serializer for Task model
    """
    assignee_name = serializers.CharField(source='assignee.get_full_name', read_only=True)
    created_by_name = serializers.CharField(source='created_by.get_full_name', read_only=True)
    project_name = serializers.CharField(source='project.name', read_only=True)
    is_overdue = serializers.BooleanField(read_only=True)
    comments_count = serializers.SerializerMethodField()
    latest_comment = serializers.SerializerMethodField()
    assignees = serializers.SerializerMethodField()
    assignee_count = serializers.IntegerField(read_only=True)
    
    class Meta:
        model = Task
        fields = (
            'id', 'title', 'description', 'project', 'project_name', 'assignee', 'assignee_name',
            'created_by', 'created_by_name', 'priority', 'status', 'due_date', 'created_at',
            'updated_at', 'is_overdue', 'comments_count', 'latest_comment', 'assignees', 'assignee_count'
        )
        read_only_fields = ('id', 'created_by', 'created_at', 'updated_at')
    
    def get_comments_count(self, obj):
        return obj.comments.count()
    
    def get_latest_comment(self, obj):
        latest_comment = obj.comments.order_by('-created_at').first()
        if latest_comment:
            return TaskCommentSerializer(latest_comment).data
        return None
    
    def get_assignees(self, obj):
        """Get all active assignees for this task"""
        assignments = obj.assignments.filter(is_active=True)
        return TaskAssignmentSerializer(assignments, many=True).data


class TaskCreateUpdateSerializer(serializers.ModelSerializer):
    """
    Serializer for creating and updating tasks
    """
    assignee_ids = serializers.ListField(
        child=serializers.IntegerField(),
        write_only=True,
        required=False,
        help_text="List of user IDs to assign to this task"
    )
    
    class Meta:
        model = Task
        fields = ('title', 'description', 'project', 'assignee', 'assignee_ids', 'priority', 'status', 'due_date')
    
    def create(self, validated_data):
        assignee_ids = validated_data.pop('assignee_ids', [])
        request_user = self.context['request'].user
        
        # Validation for required fields
        from rest_framework import serializers as drf_serializers
        errors = {}
        
        # Scrum Master must assign at least one employee when creating a task
        if request_user.is_scrum_master() and not assignee_ids:
            errors['assignee_ids'] = 'At least one employee must be assigned to the task.'
        
        # Priority is required
        if not validated_data.get('priority'):
            errors['priority'] = 'Priority is required.'
        
        # Status is required
        if not validated_data.get('status'):
            errors['status'] = 'Status is required.'
        
        if errors:
            raise drf_serializers.ValidationError(errors)
        
        validated_data['created_by'] = request_user
        task = Task.objects.create(**validated_data)
        
        # Create task assignments for multiple assignees
        first_assignee = None
        for user_id in assignee_ids:
            try:
                user = User.objects.get(id=user_id)
                TaskAssignment.objects.create(task=task, user=user)
                if first_assignee is None:
                    first_assignee = user
                # Ensure the assignee is also a member of the project
                try:
                    from projects.models import ProjectMember
                    ProjectMember.objects.get_or_create(project=task.project, user=user, defaults={'role': 'employee', 'is_active': True})
                except Exception:
                    pass
            except User.DoesNotExist:
                continue

        # Keep backward compatibility with single assignee field for analytics/UI
        if first_assignee and not task.assignee_id:
            task.assignee = first_assignee
            task.save(update_fields=['assignee'])
        
        # Create activity log
        TaskActivity.objects.create(
            task=task,
            user=validated_data['created_by'],
            activity_type='created',
            description=f'Task "{task.title}" was created'
        )
        
        return task
    
    def update(self, instance, validated_data):
        assignee_ids = validated_data.pop('assignee_ids', None)
        old_status = instance.status
        old_assignee = instance.assignee
        old_due_date = instance.due_date
        
        # Update the task
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        
        # Handle assignee updates
        if assignee_ids is not None:
            # Get current assignees
            current_assignees = set(instance.assignments.filter(is_active=True).values_list('user_id', flat=True))
            new_assignees = set(assignee_ids)
            
            # Remove assignees that are no longer assigned
            to_remove = current_assignees - new_assignees
            for user_id in to_remove:
                TaskAssignment.objects.filter(task=instance, user_id=user_id).update(is_active=False)
            
            # Add new assignees
            to_add = new_assignees - current_assignees
            for user_id in to_add:
                try:
                    user = User.objects.get(id=user_id)
                    TaskAssignment.objects.get_or_create(task=instance, user=user, defaults={'is_active': True})
                    # Ensure project membership exists
                    try:
                        from projects.models import ProjectMember
                        ProjectMember.objects.get_or_create(project=instance.project, user=user, defaults={'role': 'employee', 'is_active': True})
                    except Exception:
                        pass
                except User.DoesNotExist:
                    continue
        
        # Create activity logs for changes
        user = self.context['request'].user
        
        if old_status != instance.status:
            TaskActivity.objects.create(
                task=instance,
                user=user,
                activity_type='status_changed',
                description=f'Status changed from {old_status} to {instance.status}',
                old_value=old_status,
                new_value=instance.status
            )
        
        if old_assignee != instance.assignee:
            old_assignee_name = old_assignee.get_full_name() if old_assignee else 'Unassigned'
            new_assignee_name = instance.assignee.get_full_name() if instance.assignee else 'Unassigned'
            
            TaskActivity.objects.create(
                task=instance,
                user=user,
                activity_type='assigned',
                description=f'Task assigned from {old_assignee_name} to {new_assignee_name}',
                old_value=old_assignee_name,
                new_value=new_assignee_name
            )
        
        if old_due_date != instance.due_date:
            TaskActivity.objects.create(
                task=instance,
                user=user,
                activity_type='due_date_changed',
                description=f'Due date changed',
                old_value=str(old_due_date) if old_due_date else 'No due date',
                new_value=str(instance.due_date) if instance.due_date else 'No due date'
            )
        
        return instance


class TimeSessionSerializer(serializers.ModelSerializer):
    """
    Serializer for TimeSession model
    """
    user_name = serializers.CharField(source='user.get_full_name', read_only=True)
    task_title = serializers.CharField(read_only=True)
    formatted_duration = serializers.CharField(read_only=True)
    
    class Meta:
        model = TimeSession
        fields = (
            'id', 'user', 'user_name', 'task', 'task_title', 'start_time', 'end_time',
            'duration', 'formatted_duration', 'is_active', 'description', 'created_at', 'updated_at'
        )
        read_only_fields = ('id', 'user', 'created_at', 'updated_at', 'formatted_duration')
    
    def create(self, validated_data):
        validated_data['user'] = self.context['request'].user
        if validated_data.get('task'):
            validated_data['task_title'] = validated_data['task'].title
        return super().create(validated_data)


class TaskDetailSerializer(TaskSerializer):
    """
    Detailed task serializer with comments and activities
    """
    comments = TaskCommentSerializer(many=True, read_only=True)
    activities = TaskActivitySerializer(many=True, read_only=True)
    
    class Meta(TaskSerializer.Meta):
        fields = TaskSerializer.Meta.fields + ('comments', 'activities')
