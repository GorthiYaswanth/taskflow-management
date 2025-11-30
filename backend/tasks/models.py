from django.db import models
from django.conf import settings


class Task(models.Model):
    """
    Task model for task management
    """
    PRIORITY_CHOICES = [
        ('low', 'Low'),
        ('medium', 'Medium'),
        ('high', 'High'),
        ('critical', 'Critical'),
    ]
    
    STATUS_CHOICES = [
        ('todo', 'To Do'),
        ('in_progress', 'In Progress'),
        ('review', 'Review'),
        ('done', 'Done'),
    ]
    
    title = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    project = models.ForeignKey('projects.Project', on_delete=models.CASCADE, related_name='tasks')
    assignee = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name='assigned_tasks')
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='created_tasks')
    priority = models.CharField(max_length=10, choices=PRIORITY_CHOICES, default='medium')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='todo')
    due_date = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'tasks'
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.title} - {self.get_status_display()}"
    
    @property
    def is_overdue(self):
        if self.due_date and self.status != 'done':
            from django.utils import timezone
            return timezone.now() > self.due_date
        return False
    
    @property
    def assignees(self):
        """Get all active assignees for this task"""
        return [assignment.user for assignment in self.assignments.filter(is_active=True)]
    
    @property
    def assignee_count(self):
        """Get count of active assignees"""
        return self.assignments.filter(is_active=True).count()


class TaskAssignment(models.Model):
    """
    Model for task assignments (many-to-many relationship between tasks and users)
    """
    task = models.ForeignKey(Task, on_delete=models.CASCADE, related_name='assignments')
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='task_assignments')
    assigned_at = models.DateTimeField(auto_now_add=True)
    is_active = models.BooleanField(default=True)
    
    class Meta:
        db_table = 'task_assignments'
        unique_together = ['task', 'user']
        ordering = ['-assigned_at']
    
    def __str__(self):
        return f"{self.user.get_full_name()} assigned to {self.task.title}"


class TaskComment(models.Model):
    """
    Task comment model for task discussions
    """
    task = models.ForeignKey(Task, on_delete=models.CASCADE, related_name='comments')
    author = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    content = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'task_comments'
        ordering = ['created_at']
    
    def __str__(self):
        return f"Comment by {self.author.get_full_name()} on {self.task.title}"


class TaskActivity(models.Model):
    """
    Task activity log for tracking changes
    """
    ACTIVITY_TYPES = [
        ('created', 'Created'),
        ('updated', 'Updated'),
        ('assigned', 'Assigned'),
        ('status_changed', 'Status Changed'),
        ('commented', 'Commented'),
        ('due_date_changed', 'Due Date Changed'),
    ]
    
    task = models.ForeignKey(Task, on_delete=models.CASCADE, related_name='activities')
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    activity_type = models.CharField(max_length=20, choices=ACTIVITY_TYPES)
    description = models.TextField()
    old_value = models.TextField(blank=True, null=True)
    new_value = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'task_activities'
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.get_activity_type_display()} by {self.user.get_full_name()} on {self.task.title}"


class TimeSession(models.Model):
    """
    Time tracking session model
    """
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='time_sessions')
    task = models.ForeignKey(Task, on_delete=models.CASCADE, related_name='time_sessions', null=True, blank=True)
    task_title = models.CharField(max_length=200, blank=True)  # Store task title for reference
    start_time = models.DateTimeField()
    end_time = models.DateTimeField(null=True, blank=True)
    duration = models.PositiveIntegerField(default=0)  # Duration in milliseconds
    is_active = models.BooleanField(default=False)
    description = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'time_sessions'
        ordering = ['-start_time']
    
    def __str__(self):
        return f"Time session for {self.task_title or 'General Work'} by {self.user.get_full_name()}"
    
    @property
    def formatted_duration(self):
        """Return formatted duration as HH:MM:SS"""
        total_seconds = self.duration // 1000
        hours = total_seconds // 3600
        minutes = (total_seconds % 3600) // 60
        seconds = total_seconds % 60
        return f"{hours:02d}:{minutes:02d}:{seconds:02d}"