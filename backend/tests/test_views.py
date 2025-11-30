from django.test import TestCase
from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework.test import APITestCase
from rest_framework import status
from rest_framework_simplejwt.tokens import RefreshToken
from accounts.models import User
from tasks.models import Task, TaskComment, TaskActivity
from projects.models import Project

User = get_user_model()


class AuthenticationAPITest(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123',
            first_name='Test',
            last_name='User',
            role='employee'
        )

    def test_user_registration(self):
        url = reverse('register')
        data = {
            'username': 'newuser',
            'email': 'newuser@example.com',
            'first_name': 'New',
            'last_name': 'User',
            'role': 'employee',
            'password': 'newpass123',
            'password_confirm': 'newpass123'
        }
        response = self.client.post(url, data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIn('access', response.data)
        self.assertIn('user', response.data)

    def test_user_login(self):
        url = reverse('login')
        data = {
            'email': 'test@example.com',
            'password': 'testpass123'
        }
        response = self.client.post(url, data)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('access', response.data)
        self.assertIn('user', response.data)

    def test_user_profile(self):
        # Get JWT token
        refresh = RefreshToken.for_user(self.user)
        access_token = str(refresh.access_token)
        
        # Set authorization header
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {access_token}')
        
        url = reverse('profile')
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['email'], self.user.email)


class TaskAPITest(APITestCase):
    def setUp(self):
        self.scrum_master = User.objects.create_user(
            username='scrummaster',
            email='scrum@example.com',
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
            created_by=self.scrum_master
        )
        self.task = Task.objects.create(
            title='Test Task',
            description='Test Description',
            project=self.project,
            assignee=self.employee,
            created_by=self.scrum_master,
            priority='high',
            status='todo'
        )

    def get_auth_headers(self, user):
        refresh = RefreshToken.for_user(user)
        access_token = str(refresh.access_token)
        return {'HTTP_AUTHORIZATION': f'Bearer {access_token}'}

    def test_create_task_as_scrum_master(self):
        url = reverse('task_list_create')
        data = {
            'title': 'New Task',
            'description': 'New Description',
            'project': self.project.id,
            'assignee': self.employee.id,
            'priority': 'medium',
            'status': 'todo'
        }
        response = self.client.post(url, data, **self.get_auth_headers(self.scrum_master))
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Task.objects.count(), 2)

    def test_create_task_as_employee_denied(self):
        url = reverse('task_list_create')
        data = {
            'title': 'New Task',
            'description': 'New Description',
            'project': self.project.id,
            'assignee': self.employee.id,
            'priority': 'medium',
            'status': 'todo'
        }
        response = self.client.post(url, data, **self.get_auth_headers(self.employee))
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_get_tasks_as_employee(self):
        url = reverse('task_list_create')
        response = self.client.get(url, **self.get_auth_headers(self.employee))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 1)
        self.assertEqual(response.data['results'][0]['id'], self.task.id)

    def test_get_tasks_as_scrum_master(self):
        url = reverse('task_list_create')
        response = self.client.get(url, **self.get_auth_headers(self.scrum_master))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 1)

    def test_update_task_status_as_employee(self):
        url = reverse('task_detail', kwargs={'pk': self.task.id})
        data = {
            'title': self.task.title,
            'description': self.task.description,
            'project': self.task.project.id,
            'assignee': self.task.assignee.id,
            'priority': self.task.priority,
            'status': 'in_progress'
        }
        response = self.client.put(url, data, **self.get_auth_headers(self.employee))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.task.refresh_from_db()
        self.assertEqual(self.task.status, 'in_progress')

    def test_add_comment_to_task(self):
        url = reverse('task_comments', kwargs={'task_id': self.task.id})
        data = {
            'content': 'Test comment'
        }
        response = self.client.post(url, data, **self.get_auth_headers(self.employee))
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(TaskComment.objects.count(), 1)

    def test_get_task_analytics(self):
        url = reverse('task_analytics')
        response = self.client.get(url, **self.get_auth_headers(self.employee))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('total_tasks', response.data)
        self.assertIn('completed_tasks', response.data)

    def test_get_kanban_tasks(self):
        url = reverse('kanban_tasks')
        response = self.client.get(url, **self.get_auth_headers(self.employee))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('todo', response.data)
        self.assertIn('in_progress', response.data)
        self.assertIn('done', response.data)


class ProjectAPITest(APITestCase):
    def setUp(self):
        self.scrum_master = User.objects.create_user(
            username='scrummaster',
            email='scrum@example.com',
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
            description='Test Description',
            created_by=self.scrum_master
        )

    def get_auth_headers(self, user):
        refresh = RefreshToken.for_user(user)
        access_token = str(refresh.access_token)
        return {'HTTP_AUTHORIZATION': f'Bearer {access_token}'}

    def test_create_project_as_scrum_master(self):
        url = reverse('project_list_create')
        data = {
            'name': 'New Project',
            'description': 'New Description'
        }
        response = self.client.post(url, data, **self.get_auth_headers(self.scrum_master))
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Project.objects.count(), 2)

    def test_create_project_as_employee_denied(self):
        url = reverse('project_list_create')
        data = {
            'name': 'New Project',
            'description': 'New Description'
        }
        response = self.client.post(url, data, **self.get_auth_headers(self.employee))
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_get_projects(self):
        url = reverse('project_list_create')
        response = self.client.get(url, **self.get_auth_headers(self.employee))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)

    def test_get_project_analytics(self):
        url = reverse('project_analytics', kwargs={'project_id': self.project.id})
        response = self.client.get(url, **self.get_auth_headers(self.scrum_master))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('project', response.data)
        self.assertIn('total_tasks', response.data)


class UserManagementAPITest(APITestCase):
    def setUp(self):
        self.scrum_master = User.objects.create_user(
            username='scrummaster',
            email='scrum@example.com',
            password='testpass123',
            role='scrum_master'
        )
        self.employee = User.objects.create_user(
            username='employee',
            email='employee@example.com',
            password='testpass123',
            role='employee'
        )

    def get_auth_headers(self, user):
        refresh = RefreshToken.for_user(user)
        access_token = str(refresh.access_token)
        return {'HTTP_AUTHORIZATION': f'Bearer {access_token}'}

    def test_get_users_as_scrum_master(self):
        url = reverse('user_list')
        response = self.client.get(url, **self.get_auth_headers(self.scrum_master))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 2)

    def test_get_users_as_employee_denied(self):
        url = reverse('user_list')
        response = self.client.get(url, **self.get_auth_headers(self.employee))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 0)  # Empty queryset

    def test_get_employees_list(self):
        url = reverse('employees_list')
        response = self.client.get(url, **self.get_auth_headers(self.scrum_master))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)  # Only employee
        self.assertEqual(response.data[0]['role'], 'employee')
