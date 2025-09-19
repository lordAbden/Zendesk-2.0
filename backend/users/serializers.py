from rest_framework import serializers
from .models import User

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = [
            'id', 'email', 'username', 'first_name', 'last_name', 'phone', 'role', 'group',
            'is_active', 'date_joined', 'last_login', 'last_logout'
        ]
        read_only_fields = ['id', 'date_joined', 'last_login', 'last_logout']
    
    def validate_email(self, value):
        """Validate email uniqueness, excluding current user during updates"""
        # Get the current instance (user being updated)
        instance = getattr(self, 'instance', None)
        
        # Check if email already exists for another user
        if User.objects.filter(email=value).exclude(pk=instance.pk if instance else None).exists():
            raise serializers.ValidationError("A user with this email already exists.")
        return value
    
    def validate_username(self, value):
        """Validate username uniqueness, excluding current user during updates"""
        # Get the current instance (user being updated)
        instance = getattr(self, 'instance', None)
        
        # Check if username already exists for another user
        if User.objects.filter(username=value).exclude(pk=instance.pk if instance else None).exists():
            raise serializers.ValidationError("A user with this username already exists.")
        return value
    
    def to_representation(self, instance):
        """Custom representation to handle UUID serialization"""
        data = super().to_representation(instance)
        # Convert UUID to string for JSON serialization
        if 'id' in data:
            data['id'] = str(data['id'])
        return data

class AdminUserCreateSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8)
    
    class Meta:
        model = User
        fields = ['email', 'username', 'first_name', 'last_name', 'phone', 'role', 'group', 'password']
    
    def validate_password(self, value):
        if len(value) < 8:
            raise serializers.ValidationError("Password must be at least 8 characters long.")
        return value
    
    def validate_email(self, value):
        """Validate email uniqueness, excluding current user during updates"""
        # Get the current instance (user being updated)
        instance = getattr(self, 'instance', None)
        
        # Check if email already exists for another user
        if User.objects.filter(email=value).exclude(pk=instance.pk if instance else None).exists():
            raise serializers.ValidationError("A user with this email already exists.")
        return value
    
    def validate_username(self, value):
        """Validate username uniqueness, excluding current user during updates"""
        # Get the current instance (user being updated)
        instance = getattr(self, 'instance', None)
        
        # Check if username already exists for another user
        if User.objects.filter(username=value).exclude(pk=instance.pk if instance else None).exists():
            raise serializers.ValidationError("A user with this username already exists.")
        return value
    
    def create(self, validated_data):
        password = validated_data.pop('password')
        user = User(**validated_data)
        user.set_password(password)
        user.save()
        return user 