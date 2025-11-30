from rest_framework import status, generics, permissions
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenObtainPairView
from django.contrib.auth import login
from django.db.models import Q
from .models import User
from .serializers import (
    UserRegistrationSerializer, 
    UserSerializer, 
    LoginSerializer,
    ChangePasswordSerializer
)


class CustomTokenObtainPairView(TokenObtainPairView):
    """
    Custom JWT token view that includes user data
    """
    def post(self, request, *args, **kwargs):
        serializer = LoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.validated_data['user']
        
        refresh = RefreshToken.for_user(user)
        access = refresh.access_token
        
        return Response({
            'access': str(access),
            'refresh': str(refresh),
            'user': UserSerializer(user).data
        })


@api_view(['POST'])
@permission_classes([permissions.AllowAny])
def register(request):
    """
    User registration endpoint
    """
    serializer = UserRegistrationSerializer(data=request.data)
    if serializer.is_valid():
        user = serializer.save()
        refresh = RefreshToken.for_user(user)
        access = refresh.access_token
        
        return Response({
            'access': str(access),
            'refresh': str(refresh),
            'user': UserSerializer(user).data
        }, status=status.HTTP_201_CREATED)
    
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def profile(request):
    """
    Get current user profile
    """
    serializer = UserSerializer(request.user)
    return Response(serializer.data)


@api_view(['PUT'])
@permission_classes([permissions.IsAuthenticated])
def update_profile(request):
    """
    Update current user profile
    """
    serializer = UserSerializer(request.user, data=request.data, partial=True)
    if serializer.is_valid():
        serializer.save()
        return Response(serializer.data)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def change_password(request):
    """
    Change user password
    """
    serializer = ChangePasswordSerializer(data=request.data, context={'request': request})
    if serializer.is_valid():
        user = request.user
        user.set_password(serializer.validated_data['new_password'])
        user.save()
        return Response({'message': 'Password changed successfully'})
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class UserListView(generics.ListCreateAPIView):
    """
    List all users or create a new user (Scrum Master only)
    """
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        user = self.request.user
        if user.is_scrum_master():
            return User.objects.all().order_by('-date_joined')
        return User.objects.none()

    def create(self, request, *args, **kwargs):
        if not request.user.is_scrum_master():
            return Response({'detail': 'Permission denied'}, status=status.HTTP_403_FORBIDDEN)
        # Allow Scrum Master to create a user with a temporary password if not provided
        data = request.data.copy()
        temp_password = data.get('password') or User.objects.make_random_password()
        if 'password' not in data:
            data['password'] = temp_password
            data['password_confirm'] = temp_password
        reg_serializer = UserRegistrationSerializer(data=data)
        reg_serializer.is_valid(raise_exception=True)
        user = reg_serializer.save()
        return Response(UserSerializer(user).data, status=status.HTTP_201_CREATED)


class UserDetailView(generics.RetrieveUpdateDestroyAPIView):
    """
    Retrieve, update or delete a user (Scrum Master only)
    """
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        user = self.request.user
        if user.is_scrum_master():
            return User.objects.all()
        return User.objects.none()


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def employees_list(request):
    """
    Get list of employees (Scrum Master only)
    """
    if not request.user.is_scrum_master():
        return Response({'error': 'Permission denied'}, status=status.HTTP_403_FORBIDDEN)
    
    employees = User.objects.filter(role='employee').order_by('first_name', 'last_name')
    serializer = UserSerializer(employees, many=True)
    return Response(serializer.data)
