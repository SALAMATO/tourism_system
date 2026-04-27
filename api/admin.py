# api/admin.py
from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import Destination, User


@admin.register(User)
class CustomUserAdmin(UserAdmin):
    pass


@admin.register(Destination)
class DestinationAdmin(admin.ModelAdmin):
    list_display = (
        'name', 'city', 'category', 'recommendation_type', 'is_featured',
        'is_hot', 'rating', 'views', 'sort_order', 'updated_at'
    )
    list_filter = ('recommendation_type', 'is_featured', 'is_hot', 'category', 'city', 'best_season')
    search_fields = ('name', 'city', 'location', 'description')
    ordering = ('sort_order', '-is_hot', '-rating', '-views')

