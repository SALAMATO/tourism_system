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
        'name', 'city', 'category', 'get_recommendation_types', 'is_featured',
        'is_hot', 'rating', 'views', 'sort_order', 'publish_date', 'updated_at'
    )
    list_filter = ('is_featured', 'is_hot', 'category', 'city', 'best_season', 'is_domestic')
    search_fields = ('name', 'city', 'location', 'description')
    ordering = ('sort_order', '-is_hot', '-rating', '-views')
    
    def get_recommendation_types(self, obj):
        """显示推荐类型列表"""
        if isinstance(obj.recommendation_type, list):
            type_names = []
            type_map = {choice[0]: choice[1] for choice in Destination.RECOMMENDATION_CHOICES}
            for t in obj.recommendation_type:
                type_names.append(type_map.get(t, t))
            return ', '.join(type_names)
        return obj.recommendation_type
    get_recommendation_types.short_description = '推荐类型'
