from rest_framework import serializers
from .models import Project, ProjectMember, ProjectMessage


class ProjectMemberSerializer(serializers.ModelSerializer):
    """
    Serializer for ProjectMember model
    """
    user_name = serializers.SerializerMethodField()
    user_email = serializers.SerializerMethodField()
    
    class Meta:
        model = ProjectMember
        fields = ('id', 'user', 'user_name', 'user_email', 'role', 'joined_at', 'is_active')
        read_only_fields = ('id', 'joined_at')
    
    def get_user_name(self, obj):
        return obj.user.get_full_name()
    
    def get_user_email(self, obj):
        return obj.user.email


class ProjectMessageSerializer(serializers.ModelSerializer):
    """
    Serializer for ProjectMessage model
    """
    author_name = serializers.SerializerMethodField()
    author_role = serializers.SerializerMethodField()
    project = serializers.PrimaryKeyRelatedField(read_only=True)
    author = serializers.PrimaryKeyRelatedField(read_only=True)
    content = serializers.CharField(allow_blank=False, trim_whitespace=True)
    
    class Meta:
        model = ProjectMessage
        fields = ('id', 'project', 'author', 'author_name', 'author_role', 'content', 'created_at', 'updated_at', 'is_edited')
        read_only_fields = ('id', 'project', 'author', 'created_at', 'updated_at', 'is_edited')
    
    def validate_content(self, value):
        if not value or not value.strip():
            raise serializers.ValidationError("Message content cannot be empty.")
        return value.strip()
    
    def get_author_name(self, obj):
        return obj.author.get_full_name()
    
    def get_author_role(self, obj):
        # Get the author's role in this specific project
        try:
            member = ProjectMember.objects.get(project=obj.project, user=obj.author)
            return member.get_role_display()
        except ProjectMember.DoesNotExist:
            return obj.author.get_role_display()


class ProjectSerializer(serializers.ModelSerializer):
    """
    Serializer for Project model
    """
    created_by_name = serializers.SerializerMethodField()
    task_count = serializers.SerializerMethodField()
    member_count = serializers.SerializerMethodField()
    progress_percentage = serializers.SerializerMethodField()
    task_stats = serializers.SerializerMethodField()
    members = ProjectMemberSerializer(many=True, read_only=True)
    
    class Meta:
        model = Project
        fields = (
            'id', 'name', 'description', 'created_by', 'created_by_name', 
            'created_at', 'updated_at', 'is_active', 'task_count', 
            'member_count', 'progress_percentage', 'task_stats', 'members'
        )
        read_only_fields = ('id', 'created_by', 'created_at', 'updated_at')
    
    def get_task_count(self, obj):
        # Use annotated task_count if available, otherwise count manually
        if hasattr(obj, 'task_count') and obj.task_count is not None:
            task_count = obj.task_count
            print(f"Project {obj.name} - Using annotated task count: {task_count}")
        else:
            task_count = obj.tasks.count()
            print(f"Project {obj.name} - Using manual task count: {task_count}")
        
        # Additional debugging - show actual tasks
        actual_tasks = list(obj.tasks.values_list('id', 'title', 'status'))
        print(f"Project {obj.name} - Actual tasks: {actual_tasks}")
        
        return task_count

    def get_created_by_name(self, obj):
        try:
            return obj.created_by.get_full_name()
        except Exception:
            return getattr(obj.created_by, 'username', '')
    
    def get_member_count(self, obj):
        try:
            member_count = obj.effective_member_count
            print(f"Project {obj.name} - Member count: {member_count}")
            return member_count
        except Exception as e:
            print(f"Project {obj.name} - Member count error: {e}")
            return 0
    
    def get_progress_percentage(self, obj):
        try:
            progress = obj.progress_percentage
            print(f"Project {obj.name} - Progress: {progress}% (Total tasks: {obj.tasks.count()}, Completed: {obj.tasks.filter(status='done').count()})")
            return progress
        except Exception as e:
            print(f"Project {obj.name} - Progress error: {e}")
            return 0
    
    def get_task_stats(self, obj):
        try:
            return obj.task_stats
        except Exception as e:
            return {
                'total': 0,
                'todo': 0,
                'in_progress': 0,
                'done': 0,
            }


class ProjectDetailSerializer(ProjectSerializer):
    """
    Enhanced serializer for project detail view with messages
    """
    recent_messages = serializers.SerializerMethodField()
    
    class Meta(ProjectSerializer.Meta):
        fields = ProjectSerializer.Meta.fields + ('recent_messages',)
    
    def get_recent_messages(self, obj):
        # Get last 10 messages for preview
        messages = obj.messages.all()[:10]
        return ProjectMessageSerializer(messages, many=True).data


class ProjectCreateUpdateSerializer(serializers.ModelSerializer):
    """
    Serializer for creating and updating projects
    """
    member_ids = serializers.ListField(
        child=serializers.IntegerField(),
        write_only=True,
        required=False,
        help_text="List of user IDs to add as project members"
    )
    class Meta:
        model = Project
        fields = ('name', 'description', 'is_active', 'member_ids')
    
    def create(self, validated_data):
        member_ids = validated_data.pop('member_ids', [])
        user = self.context['request'].user
        validated_data['created_by'] = user
        project = super().create(validated_data)
        
        # Ensure the creator is added as Scrum Master member
        from .models import ProjectMember
        ProjectMember.objects.get_or_create(
            project=project,
            user=user,
            defaults={'role': 'scrum_master', 'is_active': True}
        )
        
        # Add provided employees as members
        from accounts.models import User as AccountUser
        for uid in member_ids:
            try:
                employee = AccountUser.objects.get(id=uid)
                ProjectMember.objects.get_or_create(
                    project=project,
                    user=employee,
                    defaults={'role': 'employee', 'is_active': True}
                )
            except AccountUser.DoesNotExist:
                continue
        
        return project
