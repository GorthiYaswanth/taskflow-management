from django.contrib import admin
from .models import Task, TaskComment, TaskActivity


@admin.register(Task)
class TaskAdmin(admin.ModelAdmin):
    list_display = ('title', 'project', 'assignee', 'status', 'priority', 'due_date', 'created_at')
    list_filter = ('status', 'priority', 'project', 'created_at')
    search_fields = ('title', 'description')
    readonly_fields = ('created_at', 'updated_at')
    raw_id_fields = ('assignee', 'created_by', 'project')


@admin.register(TaskComment)
class TaskCommentAdmin(admin.ModelAdmin):
    list_display = ('task', 'author', 'created_at')
    list_filter = ('created_at',)
    search_fields = ('content', 'task__title')
    readonly_fields = ('created_at', 'updated_at')
    raw_id_fields = ('task', 'author')


@admin.register(TaskActivity)
class TaskActivityAdmin(admin.ModelAdmin):
    list_display = ('task', 'user', 'activity_type', 'created_at')
    list_filter = ('activity_type', 'created_at')
    search_fields = ('description', 'task__title')
    readonly_fields = ('created_at',)
    raw_id_fields = ('task', 'user')
