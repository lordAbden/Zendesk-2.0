from django.contrib.auth.models import AbstractUser, BaseUserManager
from django.db import models
import uuid


class UserManager(BaseUserManager):
    def create_user(self, email, password=None, **extra_fields):
        if not email:
            raise ValueError('The Email field must be set')
        email = self.normalize_email(email)
        
        # If username is not provided, use email as username
        if 'username' not in extra_fields:
            extra_fields['username'] = email
            
        user = self.model(email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, email, password=None, **extra_fields):
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        extra_fields.setdefault('role', 'admin')
        extra_fields.setdefault('group', 'Director')

        if extra_fields.get('is_staff') is not True:
            raise ValueError('Superuser must have is_staff=True.')
        if extra_fields.get('is_superuser') is not True:
            raise ValueError('Superuser must have is_superuser=True.')

        return self.create_user(email, password, **extra_fields)


class User(AbstractUser):
    ROLE_CHOICES = [
        ('admin', 'Admin'),
        ('employee', 'Employee'),
        ('technician', 'Technician'),
    ]
    
    GROUP_CHOICES = [
        ('Director', 'Director'),
        ('Manager', 'Manager'),
        ('HR', 'HR'),
        ('Supervisor', 'Supervisor'),
        ('Employee', 'Employee'),
        ('Intern', 'Intern'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    email = models.EmailField(unique=True)
    phone = models.CharField(max_length=20, blank=True, null=True)
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='employee')
    group = models.CharField(max_length=20, choices=GROUP_CHOICES, default='Employee')
    last_logout = models.DateTimeField(blank=True, null=True, help_text='Last logout timestamp')
    
    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['username', 'role', 'group']
    
    objects = UserManager()
    
    class Meta:
        indexes = [
            models.Index(fields=['email']),     # For fast email lookups (already unique)
            models.Index(fields=['role']),      # For role-based filtering
            models.Index(fields=['group']),     # For group-based filtering
            models.Index(fields=['role', 'group']), # For role + group combinations
        ]
    
    def __str__(self):
        return f"{self.get_full_name()} ({self.email})"
    
    @property
    def is_technician(self):
        return self.role == 'technician'
    
    @property
    def is_employee(self):
        return self.role == 'employee'
    
    @property
    def is_admin(self):
        return self.role == 'admin' 