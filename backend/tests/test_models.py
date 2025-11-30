from django.test import TestCase
from django.contrib.auth import get_user_model
from django.utils import timezone
from datetime import timedelta
from accounts.models import User
from tasks.models import Task, TaskComment, TaskActivity
from projects.models import Project

User = get_user_model()


class UserModelTest(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123',
            first_name='Test',
            last_name='User',
            role='employee'
        )

    def test_user_creation(self):
        self.assertEqual(self.user.username, 'testuser')
        self.assertEqual(self.user.email, 'test@example.com')
        self.assertEqual(self.user.role, 'employee')
        self.assertTrue(self.user.check_password('testpass123'))

    def test_user_str(self):
        expected = f"{self.user.get_full_name()} (Employee)"
        self.assertEqual(str(self.user), expected)

    def test_user_role_methods(self):
        self.assertTrue(self.user.is_employee())
        self.assertFalse(self.user.is_scrum_master())

        scrum_master = User.objects.create_user(
            username='scrummaster',
            email='scrum@example.com',
            password='testpass123',
            role='scrum_master'
        )
        self.assertTrue(scrum_master.is_scrum_master())
        self.assertFalse(scrum_master.is_employee())

    def test_user_full_name(self):
        self.assertEqual(self.user.get_full_name(), 'Test User')
        
        user_no_name = User.objects.create_user(
            username='noname',
            email='noname@example.com',
            password='testpass123'
        )
        self.assertEqual(user_no_name.get_full_name(), 'noname')


class ProjectModelTest(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123',
            role='scrum_master'
        )
        self.project = Project.objects.create(
            name='Test Project',
            description='Test Description',
            created_by=self.user
        )

    def test_project_creation(self):
        self.assertEqual(self.project.name, 'Test Project')
        self.assertEqual(self.project.description, 'Test Description')
        self.assertEqual(self.project.created_by, self.user)
        self.assertTrue(self.project.is_active)

    def test_project_str(self):
        self.assertEqual(str(self.project), 'Test Project')


class TaskModelTest(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123',
            role='scrum_master'
        )
        self.employee = User.objects.create_user(
            username='employee',
            email='employee@example.com',
            password='testpass123',
            role='employee'
        )
        self.project = Project.objects.create(
            name='Test Project',
            created_by=self.user
        )
        self.task = Task.objects.create(
            title='Test Task',
            description='Test Description',
            project=self.project,
            assignee=self.employee,
            created_by=self.user,
            priority='high',
            status='todo',
            due_date=timezone.now() + timedelta(days=1)
        )

    def test_task_creation(self):
        self.assertEqual(self.task.title, 'Test Task')
        self.assertEqual(self.task.description, 'Test Description')
        self.assertEqual(self.task.project, self.project)
        self.assertEqual(self.task.assignee, self.employee)
        self.assertEqual(self.task.created_by, self.user)
        self.assertEqual(self.task.priority, 'high')
        self.assertEqual(self.task.status, 'todo')
        self.assertFalse(self.task.is_overdue)

    def test_task_str(self):
        expected = f"{self.task.title} - {self.task.get_status_display()}"
        self.assertEqual(str(self.task), expected)

    def test_task_overdue(self):
        overdue_task = Task.objects.create(
            title='Overdue Task',
            project=self.project,
            created_by=self.user,
            due_date=timezone.now() - timedelta(days=1),
            status='todo'
        )
        self.assertTrue(overdue_task.is_overdue)

        completed_overdue_task = Task.objects.create(
            title='Completed Overdue Task',
            project=self.project,
            created_by=self.user,
            due_date=timezone.now() - timedelta(days=1),
            status='done'
        )
        self.assertFalse(completed_overdue_task.is_overdue)


class TaskCommentModelTest(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123',
            role='scrum_master'
        )
        self.project = Project.objects.create(
            name='Test Project',
            created_by=self.user
        )
        self.task = Task.objects.create(
            title='Test Task',
            project=self.project,
            created_by=self.user
        )
        self.comment = TaskComment.objects.create(
            task=self.task,
            author=self.user,
            content='Test comment'
        )

    def test_comment_creation(self):
        self.assertEqual(self.comment.task, self.task)
        self.assertEqual(self.comment.author, self.user)
        self.assertEqual(self.comment.content, 'Test comment')

    def test_comment_str(self):
        expected = f"Comment by {self.user.get_full_name()} on {self.task.title}"
        self.assertEqual(str(self.comment), expected)


class TaskActivityModelTest(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123',
            role='scrum_master'
        )
        self.project = Project.objects.create(
            name='Test Project',
            created_by=self.user
        )
        self.task = Task.objects.create(
            title='Test Task',
            project=self.project,
            created_by=self.user
        )
        self.activity = TaskActivity.objects.create(
            task=self.task,
            user=self.user,
            activity_type='created',
            description='Task was created'
        )

    def test_activity_creation(self):
        self.assertEqual(self.activity.task, self.task)
        self.assertEqual(self.activity.user, self.user)
        self.assertEqual(self.activity.activity_type, 'created')
        self.assertEqual(self.activity.description, 'Task was created')

    def test_activity_str(self):
        expected = f"{self.activity.get_activity_type_display()} by {self.user.get_full_name()} on {self.task.title}"
        self.assertEqual(str(self.activity), expected)
