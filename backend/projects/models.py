from django.db import models
from django.conf import settings


class Project(models.Model):
    """
    Project model for organizing tasks
    """
    name = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='created_projects')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    is_active = models.BooleanField(default=True)
    
    class Meta:
        db_table = 'projects'
        ordering = ['-created_at']
    
    def __str__(self):
        return self.name
    
    @property
    def member_count(self):
        """Return the number of members assigned to this project"""
        return self.members.count()
    
    @property
    def all_members(self):
        """Return all members including task assignees"""
        from tasks.models import TaskAssignment
        
        # Get direct project members
        direct_members = set(self.members.filter(is_active=True).values_list('user_id', flat=True))
        
        # Get task assignees (both direct assignees and TaskAssignment records)
        direct_task_assignees = set(self.tasks.filter(assignee__isnull=False).values_list('assignee_id', flat=True))
        task_assignees = set(
            TaskAssignment.objects.filter(
                task__project=self,
                is_active=True
            ).values_list('user_id', flat=True)
        )
        
        # Combine all sets
        all_member_ids = direct_members.union(direct_task_assignees).union(task_assignees)
        return all_member_ids
    
    @property
    def effective_member_count(self):
        """Return the count of all members including task assignees"""
        return len(self.all_members)
    
    @property
    def progress_percentage(self):
        """Calculate project progress based on task completion"""
        total_tasks = self.tasks.count()
        if total_tasks == 0:
            return 0
        completed_tasks = self.tasks.filter(status='done').count()
        return round((completed_tasks / total_tasks) * 100, 1)
    
    @property
    def task_stats(self):
        """Return task statistics for the project"""
        tasks = self.tasks.all()
        total_count = tasks.count()
        return {
            'total': total_count,
            'todo': tasks.filter(status='todo').count(),
            'in_progress': tasks.filter(status='in_progress').count(),
            'review': tasks.filter(status='review').count(),
            'done': tasks.filter(status='done').count(),
        }


class ProjectMember(models.Model):
    """
    Model to track project members and their roles
    """
    ROLE_CHOICES = [
        ('scrum_master', 'Scrum Master'),
        ('employee', 'Employee'),
    ]
    
    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name='members')
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='project_memberships')
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='employee')
    joined_at = models.DateTimeField(auto_now_add=True)
    is_active = models.BooleanField(default=True)
    
    class Meta:
        db_table = 'project_members'
        unique_together = ['project', 'user']
        ordering = ['-joined_at']
    
    def __str__(self):
        return f"{self.user.get_full_name()} - {self.project.name} ({self.get_role_display()})"


class ProjectMessage(models.Model):
    """
    Model for project-specific messaging/chat
    """
    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name='messages')
    author = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='project_messages')
    content = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    is_edited = models.BooleanField(default=False)
    
    class Meta:
        db_table = 'project_messages'
        ordering = ['created_at']
    
    def __str__(self):
        return f"Message by {self.author.get_full_name()} in {self.project.name}"