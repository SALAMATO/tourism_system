import re
import logging
from rest_framework.viewsets import ModelViewSet
from rest_framework.authentication import BasicAuthentication, TokenAuthentication
from rest_framework import viewsets, filters, status
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.authtoken.models import Token
from django.contrib.auth import authenticate, get_user_model
from .models import Policy, News, SafetyAlert, Message, MessageComment, MessageLike, Statistic, Destination, ChinaCity
from .serializers import (
    PolicySerializer, NewsSerializer, SafetyAlertSerializer,
    MessageSerializer, MessageCommentSerializer, MessageLikeSerializer,
    StatisticSerializer, DestinationSerializer,
    UserSerializer, UserRegisterSerializer
)
from ai import lowsky_ai
from .utils import get_client_ip, parse_location_by_ip

# 配置日志
logger = logging.getLogger(__name__)


# 禁用CSRF类
class PublicModelViewSet(ModelViewSet):
    """
    所有继承该基类的 ViewSet 默认：
    1. 不使用 SessionAuthentication -> 禁用 CSRF
    2. 允许匿名访问
    """
    authentication_classes = [TokenAuthentication]
    permission_classes = [AllowAny]

    @action(detail=True, methods=['post'])
    def increment_views(self, request, pk=None):
        news = self.get_object()
        news.views += 1
        news.save()
        return Response({'views': news.views})

User = get_user_model()


def update_user_location(user, request):
    """
    根据用户IP更新用户位置信息
    只有当IP地址变更时才更新
    """
    ip = get_client_ip(request)
    
    # 如果IP没有变化，不更新
    if user.last_login_ip == ip:
        return
    
    result = parse_location_by_ip(ip)
    
    if result:
        user.country = result.get("country", user.country)
        user.province = result.get("province", user.province)
        user.city = result.get("city", user.city)
        user.latitude = result.get("latitude", user.latitude)
        user.longitude = result.get("longitude", user.longitude)
        user.last_login_ip = ip
        
        user.save(update_fields=['country', 'province', 'city', 'latitude', 'longitude', 'last_login_ip'])
class UserViewSet(PublicModelViewSet):
    """用户管理（管理员可管理用户）"""
    queryset = User.objects.all()
    serializer_class = UserSerializer
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['username', 'email']
    ordering_fields = ['date_joined']

    # -------------------
    # 注册
    # -------------------
    @action(detail=False, methods=['post'], permission_classes=[AllowAny])
    def register(self, request):
        serializer = UserRegisterSerializer(data=request.data)
        if serializer.is_valid():
            user = serializer.save()
            
            # 更新用户位置信息
            update_user_location(user, request)
            
            token, _ = Token.objects.get_or_create(user=user)
            return Response({
                'token': token.key,
                'user': UserSerializer(user).data
            }, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    # -------------------
    # 登录
    # -------------------
    @action(detail=False, methods=['post'], permission_classes=[AllowAny])
    def login(self, request):
        account = request.data.get('username')  # 兼容前端字段名
        password = request.data.get('password')

        if not account or not password:
            return Response({'error': '请提供账号和密码'}, status=status.HTTP_400_BAD_REQUEST)

        # 尝试多种登录方式
        user = None
        
        # 1. 尝试用户名登录（不区分大小写）
        user = User.objects.filter(username__iexact=account).first()
        
        # 2. 如果用户名登录失败，尝试邮箱登录
        if not user and '@' in account:
            user = User.objects.filter(email__iexact=account).first()
        
        # 3. 如果邮箱登录失败，尝试手机号登录
        if not user and account.isdigit():
            user = User.objects.filter(phone=account).first()
        
        # 验证密码
        if user and user.check_password(password):
            # 检查账号是否被冻结
            if not user.is_active:
                return Response({'error': '账号已被冻结，请联系管理员'}, status=status.HTTP_403_FORBIDDEN)
            
            # 更新用户位置信息
            update_user_location(user, request)
            
            token, _ = Token.objects.get_or_create(user=user)
            return Response({
                'token': token.key,
                'user': UserSerializer(user).data
            })
        
        return Response({'error': '账号或密码错误'}, status=status.HTTP_401_UNAUTHORIZED)

    # -------------------
    # 登出
    # -------------------
    @action(detail=False, methods=['post'], permission_classes=[IsAuthenticated])
    def logout(self, request):
        request.user.auth_token.delete()
        return Response({'message': '登出成功'})

    # -------------------
    # 当前用户信息
    # -------------------
    @action(detail=False, methods=['get'], permission_classes=[IsAuthenticated])
    def me(self, request):
        serializer = UserSerializer(request.user)
        return Response(serializer.data)

    @action(detail=False, methods=['post'], permission_classes=[IsAuthenticated])
    def change_password(self, request):
        """修改当前用户密码"""
        old_password = request.data.get('old_password')
        new_password = request.data.get('new_password')
        if not old_password or not new_password:
            return Response({'error': '请提供原密码和新密码'}, status=status.HTTP_400_BAD_REQUEST)
        user = request.user
        if not user.check_password(old_password):
            return Response({'error': '原密码不正确'}, status=status.HTTP_400_BAD_REQUEST)
        if len(new_password) < 6:
            return Response({'error': '新密码长度至少6位'}, status=status.HTTP_400_BAD_REQUEST)
        user.set_password(new_password)
        user.save()
        # 修改密码后使旧 token 失效
        Token.objects.filter(user=user).delete()
        return Response({'message': '密码修改成功，请使用新密码重新登录'})

    @action(detail=False, methods=['post'], permission_classes=[IsAuthenticated])
    def update_profile(self, request):
        """修改当前用户的昵称、邮箱、手机号和用户名"""
        user = request.user
        nickname = request.data.get('nickname')
        email = request.data.get('email')
        phone = request.data.get('phone')
        username = request.data.get('username')
        
        if nickname is not None:
            user.nickname = nickname
        
        if email is not None:
            # 验证邮箱格式
            if email and '@' not in email:
                return Response({'error': '邮箱格式不正确'}, status=status.HTTP_400_BAD_REQUEST)
            # 检查邮箱是否已被其他用户使用
            if email and User.objects.filter(email=email).exclude(id=user.id).exists():
                return Response({'error': '该邮箱已被使用'}, status=status.HTTP_400_BAD_REQUEST)
            user.email = email
        
        if phone is not None:
            # 检查手机号是否已被其他用户使用
            if phone and User.objects.filter(phone=phone).exclude(id=user.id).exists():
                return Response({'error': '该手机号已被使用'}, status=status.HTTP_400_BAD_REQUEST)
            user.phone = phone
        
        if username is not None:
            # 验证用户名格式
            if not username or len(username.strip()) == 0:
                return Response({'error': '用户名不能为空'}, status=status.HTTP_400_BAD_REQUEST)
            
            # 检查60天内修改次数限制
            from django.utils import timezone as django_timezone
            now = django_timezone.now()
            
            # 如果用户已经有修改记录，检查是否在60天限制内
            if user.last_username_change_at:
                days_since_last_change = (now - user.last_username_change_at).days
                if days_since_last_change < 60 and user.username_change_count >= 2:
                    remaining_days = 60 - days_since_last_change
                    return Response({
                        'error': f'60天内只能修改两次用户名，还需等待{remaining_days}天才能再次修改'
                    }, status=status.HTTP_400_BAD_REQUEST)
                
                # 如果超过60天，重置计数
                if days_since_last_change >= 60:
                    user.username_change_count = 0
            
            # 检查用户名是否已被其他用户使用
            if User.objects.filter(username=username).exclude(id=user.id).exists():
                return Response({'error': '该用户名已被使用'}, status=status.HTTP_400_BAD_REQUEST)
            
            # 更新用户名和追踪信息
            old_username = user.username
            user.username = username
            user.username_change_count += 1
            user.last_username_change_at = now
        
        user.save()
        return Response({
            'message': '个人信息修改成功',
            'user': UserSerializer(user).data
        })

    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated])
    def reset_password(self, request, pk=None):
        """管理员重置用户密码"""
        if not request.user.is_staff:
            return Response({'error': '只有管理员可以重置密码'}, status=status.HTTP_403_FORBIDDEN)
        
        user = self.get_object()
        new_password = request.data.get('new_password', '123456')
        
        if len(new_password) < 6:
            return Response({'error': '密码长度至少6位'}, status=status.HTTP_400_BAD_REQUEST)
        
        user.set_password(new_password)
        user.save()
        
        # 删除该用户的所有token，强制重新登录
        Token.objects.filter(user=user).delete()
        
        return Response({'message': f'密码已重置为：{new_password}'}, status=status.HTTP_200_OK)


# 目的地视图集
class DestinationViewSet(PublicModelViewSet):
    """旅游目的地"""
    queryset = Destination.objects.all()
    serializer_class = DestinationSerializer
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['name', 'city', 'location', 'description']
    ordering_fields = ['sort_order', 'rating', 'views', 'created_at']

    def get_queryset(self):
        from django.db import connection
        
        queryset = super().get_queryset()
        recommendation_type = self.request.query_params.get('recommendation_type')
        city = self.request.query_params.get('city')
        is_featured = self.request.query_params.get('is_featured')
        is_hot = self.request.query_params.get('is_hot')
        is_domestic = self.request.query_params.get('is_domestic')

        # SQLite不支持JSONField的__contains查询，需要特殊处理
        if recommendation_type:
            if connection.vendor == 'sqlite':
                # SQLite: 先获取所有数据，然后在Python中过滤
                queryset = list(queryset)
                queryset = [dest for dest in queryset if recommendation_type in (dest.recommendation_type or [])]
            else:
                # MySQL/PostgreSQL: 使用JSONField的contains查询
                queryset = queryset.filter(recommendation_type__contains=[recommendation_type])
        
        if city:
            queryset = queryset.filter(city=city) if not isinstance(queryset, list) else [dest for dest in queryset if dest.city == city]
        if is_featured is not None:
            queryset = queryset.filter(is_featured=is_featured.lower() == 'true') if not isinstance(queryset, list) else [dest for dest in queryset if dest.is_featured == (is_featured.lower() == 'true')]
        if is_hot is not None:
            queryset = queryset.filter(is_hot=is_hot.lower() == 'true') if not isinstance(queryset, list) else [dest for dest in queryset if dest.is_hot == (is_hot.lower() == 'true')]
        if is_domestic is not None:
            queryset = queryset.filter(is_domestic=is_domestic.lower() == 'true') if not isinstance(queryset, list) else [dest for dest in queryset if dest.is_domestic == (is_domestic.lower() == 'true')]

        return queryset

    def get_parser_classes(self):
        from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
        return [MultiPartParser, FormParser, JSONParser]

    @action(detail=False, methods=['get'])
    def hot(self, request):
        """获取热门目的地"""
        hot_destinations = self.get_queryset().filter(is_hot=True)[:8]
        serializer = self.get_serializer(hot_destinations, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def nearby_by_ip(self, request):
        """基于IP地理位置的周边推荐"""
        import requests
        import traceback
            
        print("\n" + "="*50)
        print("开始处理 nearby_by_ip 请求")
        print("="*50)
        
        def is_neighboring_province(province1, province2):
            """判断两个省份是否邻近（降级方案使用）"""
            if not province1 or not province2:
                return False
            
            # 定义中国各省份的邻近关系
            neighboring_map = {
                '广东': ['广西', '湖南', '江西', '福建', '海南'],
                '广西': ['广东', '湖南', '贵州', '云南', '海南'],
                '北京': ['天津', '河北'],
                '上海': ['江苏', '浙江'],
                '江苏': ['上海', '浙江', '安徽', '山东'],
                '浙江': ['上海', '江苏', '安徽', '江西', '福建'],
                # 可以继续添加更多省份...
            }
            
            neighbors = neighboring_map.get(province1, [])
            return province2 in neighbors
        
        def _normalize_province_name(province):
            """标准化省份名称，将简称转换为全称"""
            # 省份简称到全称的映射
            province_map = {
                '北京': '北京市',
                '天津': '天津市',
                '上海': '上海市',
                '重庆': '重庆市',
                '河北': '河北省',
                '山西': '山西省',
                '辽宁': '辽宁省',
                '吉林': '吉林省',
                '黑龙江': '黑龙江省',
                '江苏': '江苏省',
                '浙江': '浙江省',
                '安徽': '安徽省',
                '福建': '福建省',
                '江西': '江西省',
                '山东': '山东省',
                '河南': '河南省',
                '湖北': '湖北省',
                '湖南': '湖南省',
                '广东': '广东省',
                '海南': '海南省',
                '四川': '四川省',
                '贵州': '贵州省',
                '云南': '云南省',
                '陕西': '陕西省',
                '甘肃': '甘肃省',
                '青海': '青海省',
                '台湾': '台湾省',
                '内蒙古': '内蒙古自治区',
                '广西': '广西壮族自治区',
                '西藏': '西藏自治区',
                '宁夏': '宁夏回族自治区',
                '新疆': '新疆维吾尔自治区',
                '香港': '香港特别行政区',
                '澳门': '澳门特别行政区',
            }
            
            # 如果已经是全称，直接返回
            if province in province_map.values():
                return province
            
            # 如果是简称，转换为全称
            return province_map.get(province, province)
        
        def _save_to_china_city(city, province, lng, lat):
            """将获取到的城市经纬度保存到ChinaCity表中"""
            try:
                # 标准化省份名称
                normalized_province = _normalize_province_name(province)
                
                # 检查是否已存在
                existing = ChinaCity.objects.filter(
                    city__icontains=city.replace('市', ''),
                    state__icontains=normalized_province
                ).first()
                
                if existing:
                    print(f'  💾 城市 {normalized_province}-{city} 已存在于数据库中，跳过保存')
                    return True
                
                # 创建新记录
                ChinaCity.objects.create(
                    country='中国',
                    state=normalized_province,
                    city=city.replace('市', ''),
                    longitude=lng,
                    latitude=lat,
                    is_domestic=True
                )
                print(f'  ✅ 已将 {normalized_province}-{city} 的经纬度 ({lng}, {lat}) 保存到 ChinaCity 表')
                return True
            except Exception as e:
                print(f'  ⚠️ 保存到 ChinaCity 表失败: {str(e)}')
                return False
        
        def _get_city_coordinates(city, province, api_key):
            """获取城市的经纬度坐标，并自动保存到数据库"""
            import requests
            try:
                # 高德地图地理编码API
                # 优化地址格式，避免重复
                if not city or not province:
                    print(f'  ⚠️ 城市或省份为空')
                    return None
                
                # 处理直辖市：如果城市和省份相同，只使用一个
                if city == province:
                    address = city
                else:
                    address = f"{province}{city}"
                
                geo_url = f'https://restapi.amap.com/v3/geocode/geo?key={api_key}&address={address}'
                print(f'  查询地址: {address}')
                
                response = requests.get(geo_url, timeout=3)
                data = response.json()
                
                if data.get('status') == '1' and data.get('geocodes'):
                    location_str = data['geocodes'][0].get('location', '')
                    if location_str:
                        lng, lat = location_str.split(',')
                        result = {'lng': float(lng), 'lat': float(lat)}
                        print(f'  ✅ 成功: {result}')
                        
                        # 自动保存到 ChinaCity 表
                        _save_to_china_city(city, province, float(lng), float(lat))
                        
                        return result
                
                print(f'  ⚠️ 未找到地址: {address}, 响应: {data}')
                return None
            except Exception as e:
                print(f'  ❌ 获取经纬度失败: {str(e)}')
                return None
        
        def _calculate_distance_haversine(lng1, lat1, lng2, lat2):
            """使用Haversine公式计算两点之间的距离（公里）- 本地计算"""
            import math
            try:
                # 将角度转换为弧度
                lat1_rad = math.radians(lat1)
                lat2_rad = math.radians(lat2)
                lng1_rad = math.radians(lng1)
                lng2_rad = math.radians(lng2)
                
                # 计算差值
                dlat = lat2_rad - lat1_rad
                dlng = lng2_rad - lng1_rad
                
                # Haversine公式
                a = math.sin(dlat / 2) ** 2 + math.cos(lat1_rad) * math.cos(lat2_rad) * math.sin(dlng / 2) ** 2
                c = 2 * math.asin(math.sqrt(a))
                
                # 地球半径（公里）
                earth_radius = 6371.0
                distance = earth_radius * c
                
                return round(distance, 2)
            except Exception as e:
                print(f'  ❌ Haversine距离计算异常: {str(e)}')
                return None
        
        def _calculate_distance(lng1, lat1, lng2, lat2, api_key):
            """使用高德地图API计算两点之间的距离（公里）- 备用方案"""
            import requests
            try:
                # 高德地图距离测量API
                origins = f'{lng1},{lat1}'
                destination = f'{lng2},{lat2}'
                distance_url = f'https://restapi.amap.com/v3/distance?key={api_key}&origins={origins}&destination={destination}&type=1'
                
                response = requests.get(distance_url, timeout=3)
                data = response.json()
                
                if data.get('status') == '1' and data.get('results'):
                    # 返回的距离单位是米，转换为公里
                    distance_meters = int(data['results'][0].get('distance', 0))
                    distance_km = round(distance_meters / 1000, 2)
                    return distance_km
                
                print(f'  ⚠️ 距离计算失败')
                return None
            except Exception as e:
                print(f'  ❌ 距离计算异常: {str(e)}')
                return None
        
        # 高德地图API密钥
        amap_key = '8fe3ebb5ad6cfbb67e7394f20668e0c7'
        
        # 检查用户是否已登录且有缓存的位置信息
        user_city = None
        user_province = None
        user_latitude = None
        user_longitude = None
        ip_source = 'cached'  # 标记位置信息来源
        
        # 优先从 session 中获取缓存的位置信息（未登录用户）
        if not request.user.is_authenticated:
            cached_location = request.session.get('user_location_cache')
            if cached_location:
                import time
                cache_time = cached_location.get('timestamp', 0)
                current_time = time.time()
                # 缓存有效期24小时（86400秒）
                if current_time - cache_time < 86400:
                    user_city = cached_location.get('city')
                    user_province = cached_location.get('province')
                    user_latitude = cached_location.get('latitude')
                    user_longitude = cached_location.get('longitude')
                    ip_source = 'session_cached'
                    print(f'✅ 使用Session缓存的位置信息: {user_province} {user_city}')
                    print(f'   经纬度: ({user_latitude}, {user_longitude})')
        
        if request.user.is_authenticated:
            # 用户已登录，检查是否有缓存的位置信息
            user = request.user
            if user.city and user.province and user.latitude and user.longitude:
                user_city = user.city
                user_province = user.province
                user_latitude = user.latitude
                user_longitude = user.longitude
                ip_source = 'cached'
                print(f'✅ 使用用户缓存的位置信息: {user_province} {user_city}')
                print(f'   经纬度: ({user_latitude}, {user_longitude})')
        
        # 如果没有缓存的位置信息，则通过IP获取
        if not user_city or not user_province:
            ip_source = 'ip_lookup'
            
            # 获取用户IP
            x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
            if x_forwarded_for:
                ip = x_forwarded_for.split(',')[0].strip()
            else:
                ip = request.META.get('REMOTE_ADDR', '127.0.0.1')
            
            print(f'原始IP地址: {ip}')
            
            # 如果是本地IP，不传ip参数给高德API，让它自动识别请求来源IP
            is_local_ip = ip in ['127.0.0.1', 'localhost', '::1', '0.0.0.0']
            
            print(f'原始IP地址: {ip}')
            if is_local_ip:
                print('检测到本地IP，将使用高德API自动识别功能')
            else:
                print(f'使用公网IP: {ip}')
            
            try:
                if is_local_ip:
                    amap_url = f'https://restapi.amap.com/v3/ip?key={amap_key}'
                else:
                    amap_url = f'https://restapi.amap.com/v3/ip?key={amap_key}&ip={ip}'
                
                print(f'请求高德地图API: {amap_url}')
                amap_resp = requests.get(amap_url, timeout=3)
                print(f'高德地图API响应状态码: {amap_resp.status_code}')
                amap_data = amap_resp.json()
                print(f'高德地图API响应数据: {amap_data}')
                    
                # 获取城市信息
                user_city = amap_data.get('city', '')
                user_province = amap_data.get('province', '')
                
                print(f'原始API返回数据 - city类型: {type(user_city)}, 值: {user_city}')
                print(f'原始API返回数据 - province类型: {type(user_province)}, 值: {user_province}')
                
                # 处理API返回可能是列表的情况
                if isinstance(user_city, list):
                    user_city = user_city[0] if user_city else ''
                if isinstance(user_province, list):
                    user_province = user_province[0] if user_province else ''
                
                # 确保是字符串
                user_city = str(user_city).strip() if user_city else ''
                user_province = str(user_province).strip() if user_province else ''
                
                print(f'处理后的城市数据: city="{user_city}", province="{user_province}"')
                
                # 如果API返回城市为空，使用默认城市
                if not user_city or user_city == '[]':
                    print('高德地图API未返回城市信息，使用默认值')
                    user_city = '南京'  # 114.114.114.114是南京DNS
                    user_province = '江苏'
                    
                # 去除城市后缀（如"市"）
                user_city = user_city.replace('市', '').strip()
                user_province = user_province.replace('省', '').replace('自治区', '').replace('市', '').strip()
                                    
                print(f'定位结果: {user_province} {user_city}')
                                
                # 通过地理编码API获取该城市的经纬度，并保存到数据库（只调用一次）
                if user_city and user_province:
                    print(f'🔍 正在获取 {user_province}-{user_city} 的经纬度并保存到数据库...')
                    city_coords = _get_city_coordinates(user_city, user_province, amap_key)
                    if city_coords:
                        print(f'✅ 已获取并保存 {user_province}-{user_city} 的经纬度: {city_coords}')
                        # 更新user_latitude和user_longitude
                        user_latitude = city_coords['lat']
                        user_longitude = city_coords['lng']
                        
                        # 将位置信息缓存到session（24小时有效期）
                        import time
                        request.session['user_location_cache'] = {
                            'city': user_city,
                            'province': user_province,
                            'latitude': user_latitude,
                            'longitude': user_longitude,
                            'timestamp': time.time()
                        }
                        print(f'💾 已将位置信息缓存到Session')
            except Exception as e:
                error_traceback = traceback.format_exc()
                print("\n" + "!"*50)
                print(f'IP定位失败: {str(e)}')
                print("错误堆栈:")
                print(error_traceback)
                print("!"*50 + "\n")
                
                # IP定位失败，使用默认值
                user_city = '北京'
                user_province = '北京'
        
        try:
                        
            # 获取所有国内目的地
            # 注意：SQLite不支持JSONField的__contains查询，需要特殊处理
            from django.db import connection
                        
            if connection.vendor == 'sqlite':
                # SQLite: 使用原始SQL或过滤后在Python中处理
                domestic_destinations = list(
                    Destination.objects.filter(is_domestic=True)
                    .order_by('sort_order', '-rating', '-views')
                )
                # 在Python中过滤包含'nearby'的目的地
                domestic_destinations = [
                    dest for dest in domestic_destinations
                    if 'nearby' in (dest.recommendation_type or [])
                ]
                print(f'SQLite模式：找到 {len(domestic_destinations)} 个标记为nearby的国内目的地')
            else:
                # MySQL/PostgreSQL: 使用JSONField的contains查询
                domestic_destinations = Destination.objects.filter(
                    is_domestic=True,
                    recommendation_type__contains=['nearby']
                ).order_by('sort_order', '-rating', '-views')
                print(f'找到 {domestic_destinations.count()} 个标记为nearby的国内目的地')
                
            # 计算每个目的地与用户城市的匹配度
            scored_destinations = []
            
            # 从 ChinaCity 表获取用户位置的经纬度
            user_location = None
            if user_city and user_province:
                china_city = ChinaCity.objects.filter(
                    city__icontains=user_city.replace('市', ''),
                    state__icontains=user_province
                ).first()
                
                if china_city:
                    user_location = {'lng': china_city.longitude, 'lat': china_city.latitude}
                    print(f'✅ 从 ChinaCity 表获取用户位置: {user_location}')
                else:
                    # 如果找不到精确匹配，尝试只匹配城市
                    china_city = ChinaCity.objects.filter(
                        city__icontains=user_city.replace('市', '')
                    ).first()
                    if china_city:
                        user_location = {'lng': china_city.longitude, 'lat': china_city.latitude}
                        print(f'✅ 从 ChinaCity 表获取用户位置(仅城市): {user_location}')
            
            # 如果 ChinaCity 表中没有，使用缓存的经纬度
            if not user_location and user_latitude and user_longitude:
                user_location = {'lng': user_longitude, 'lat': user_latitude}
                print(f'✅ 使用缓存的用户位置经纬度: {user_location}')
            
            # 如果还是没有，才调用高德地图 API
            if not user_location:
                user_location = _get_city_coordinates(user_city, user_province, amap_key)
                print(f'🔍 通过高德API获取用户位置经纬度: {user_location}')
            
            for dest in domestic_destinations:
                score = 0
                distance_km = 0  # 保存真实距离
                dest_city = dest.city.replace('市', '').strip() if dest.city else ''
                dest_state = (dest.state or '').replace('省', '').replace('自治区', '').replace('市', '').strip()
                
                print(f'检查目的地: {dest.name}, 城市: {dest_city}, 省份: {dest_state}')
                print(f'用户位置: {user_city}, {user_province}')
                
                # 从 ChinaCity 表获取目的地的经纬度
                dest_location = None
                china_city = ChinaCity.objects.filter(
                    city__icontains=dest_city,
                    state__icontains=dest_state
                ).first()
                
                if china_city:
                    dest_location = {'lng': china_city.longitude, 'lat': china_city.latitude}
                    print(f'✅ 从 ChinaCity 表获取目的地位置: {dest_location}')
                else:
                    # 如果找不到精确匹配，尝试只匹配城市
                    china_city = ChinaCity.objects.filter(
                        city__icontains=dest_city
                    ).first()
                    if china_city:
                        dest_location = {'lng': china_city.longitude, 'lat': china_city.latitude}
                        print(f'✅ 从 ChinaCity 表获取目的地位置(仅城市): {dest_location}')
                
                # 如果 ChinaCity 表中没有，才调用高德地图 API
                if not dest_location:
                    dest_location = _get_city_coordinates(dest_city, dest_state, amap_key)
                    if dest_location:
                        print(f'🔍 通过高德API获取目的地位置: {dest_location}')
                
                # 如果两个位置都有经纬度，优先使用Haversine公式本地计算距离
                if user_location and dest_location:
                    # 首先尝试使用Haversine公式本地计算
                    distance_km = _calculate_distance_haversine(
                        user_location['lng'], user_location['lat'],
                        dest_location['lng'], dest_location['lat']
                    )
                    print(f'  -> 使用Haversine公式计算距离: {distance_km}公里')
                    
                    # 如果Haversine计算失败，才调用高德API
                    if distance_km is None:
                        print(f'  -> Haversine计算失败，尝试调用高德API')
                        distance_km = _calculate_distance(
                            user_location['lng'], user_location['lat'],
                            dest_location['lng'], dest_location['lat'],
                            amap_key
                        )
                        if distance_km:
                            print(f'  -> 高德API计算距离: {distance_km}公里')
                    
                    if distance_km is not None:
                        # 直接使用负距离作为分数（距离越小，分数越高，排序越靠前）
                        score = -distance_km
                        print(f'  -> 排序分数: {score}（负距离）')
                    else:
                        # 两种方法都失败，使用降级方案
                        print('  -> 所有距离计算方法都失败，使用降级方案')
                        if dest_city and dest_city == user_city:
                            score = -1  # 同城，距离设为1公里
                            distance_km = 1
                            print(f'  -> 同城匹配: 距离约1公里')
                        elif dest_state and dest_state == user_province:
                            score = -50  # 同省，距离设为50公里
                            distance_km = 50
                            print(f'  -> 同省匹配: 距离约50公里')
                        else:
                            score = -9999  # 其他，距离设为9999公里
                            distance_km = 9999
                            print(f'  -> 其他城市: 距离很远')
                else:
                    # 降级方案：使用原来的省份匹配逻辑
                    print('  -> 无法获取经纬度，使用降级方案')
                    if dest_city and dest_city == user_city:
                        score = -1  # 同城，距离设为1公里
                        distance_km = 1
                        print(f'  -> 同城匹配: 距离约1公里')
                    elif dest_state and dest_state == user_province:
                        score = -50  # 同省，距离设为50公里
                        distance_km = 50
                        print(f'  -> 同省匹配: 距离约50公里')
                    else:
                        score = -9999  # 其他，距离设为9999公里
                        distance_km = 9999
                        print(f'  -> 其他城市: 距离很远')
                    
                # 保存 (分数, 目的地, 距离)
                scored_destinations.append((score, dest, distance_km))
                
            # 按分数排序（高到低，即距离从小到大），分数相同时按 rating和views排序
            scored_destinations.sort(key=lambda x: (-x[0], -x[1].rating, -x[1].views))
            
            print(f'\n排序后的目的地列表:')
            for idx, (score, dest, distance) in enumerate(scored_destinations[:20]):
                print(f'  {idx + 1}. {dest.name} ({dest.city}) - 距离: {round(distance)}公里, 分数: {score}')
                
            # 获取前20个
            top_destinations = [dest for score, dest, distance in scored_destinations[:20]]
                
            print(f'返回 {len(top_destinations)} 个周边推荐目的地')
            
            # 序列化结果
            serializer = self.get_serializer(top_destinations, many=True)
            result_data = serializer.data
            
            # 为每个目的地添加真实距离（四舍五入到整数）
            distance_map = {dest.id: round(distance) for score, dest, distance in scored_destinations[:20]}
            for item in result_data:
                item['match_score'] = distance_map.get(item['id'], 0)
            
            print("="*50)
            print("请求处理成功\n")
            return Response({
                'ip': ip if ip_source == 'ip_lookup' else None,
                'user_city': user_city,
                'user_province': user_province,
                'ip_source': ip_source,  # 标记位置信息来源: 'cached' 或 'ip_lookup'
                'destinations': result_data
            })
                
        except Exception as e:
            error_traceback = traceback.format_exc()
            print("\n" + "!"*50)
            print(f'IP定位失败: {str(e)}')
            print("错误堆栈:")
            print(error_traceback)
            print("!"*50 + "\n")
                
            # 失败时返回默认推荐
            try:
                from django.db import connection
                
                if connection.vendor == 'sqlite':
                    # SQLite: 在Python中过滤
                    default_destinations = list(
                        Destination.objects.filter(is_domestic=True)
                        .order_by('sort_order', '-rating', '-views')
                    )
                    default_destinations = [
                        dest for dest in default_destinations
                        if 'nearby' in (dest.recommendation_type or [])
                    ][:20]
                else:
                    # MySQL/PostgreSQL: 使用JSONField查询
                    default_destinations = Destination.objects.filter(
                        is_domestic=True,
                        recommendation_type__contains=['nearby']
                    ).order_by('sort_order', '-rating', '-views')[:20]
                
                print(f'失败时使用默认推荐，共 {len(default_destinations) if isinstance(default_destinations, list) else default_destinations.count()} 个目的地')
                    
                serializer = self.get_serializer(default_destinations, many=True)
                return Response({
                    'ip': ip if ip_source == 'ip_lookup' else None,
                    'user_city': user_city or '北京',
                    'user_province': user_province or '北京',
                    'ip_source': ip_source,
                    'error': str(e),
                    'destinations': serializer.data
                })
            except Exception as e2:
                print(f' fallback 也失败: {str(e2)}')
                return Response({
                    'ip': None,
                    'user_city': user_city or '北京',
                    'user_province': user_province or '北京',
                    'ip_source': ip_source,
                    'error': str(e2),
                    'destinations': []
                }, status=500)

    @action(detail=False, methods=['get'])
    def cities(self, request):
        """获取目的地城市列表"""
        cities = list(
            self.get_queryset()
            .values_list('city', flat=True)
            .distinct()
        )
        return Response(cities)

    @action(detail=False, methods=['get'])
    def homepage_modules(self, request):
        """获取首页目的地模块数据"""
        from django.db import connection
        
        nearby_city = request.query_params.get('nearby_city') or '北京'
        managed_city = request.query_params.get('managed_city')

        # SQLite不支持JSONField的__contains查询，需要特殊处理
        if connection.vendor == 'sqlite':
            # SQLite: 获取所有is_featured=True的目的地，然后在Python中过滤
            all_featured = list(
                Destination.objects.filter(is_featured=True)
                .order_by('sort_order', '-rating', '-views')
            )
            nearby_items = [dest for dest in all_featured if 'nearby' in (dest.recommendation_type or [])]
            managed_items = [dest for dest in all_featured if 'managed' in (dest.recommendation_type or [])]
        else:
            # MySQL/PostgreSQL: 使用JSONField的contains查询
            nearby_items = list(
                Destination.objects.filter(recommendation_type__contains=['nearby'], is_featured=True)
                .order_by('sort_order', '-rating', '-views')
            )
            managed_items = list(
                Destination.objects.filter(recommendation_type__contains=['managed'], is_featured=True)
                .order_by('sort_order', '-rating', '-views')
            )

        nearby_cities = sorted({item.city for item in nearby_items})
        managed_cities = sorted({item.city for item in managed_items})

        if nearby_city not in nearby_cities and nearby_cities:
            nearby_city = nearby_cities[0]
        if managed_city not in managed_cities and managed_cities:
            managed_city = managed_cities[0]

        nearby_selected = [item for item in nearby_items if item.city == nearby_city][:4]
        managed_selected = [item for item in managed_items if item.city == managed_city][:4]

        serializer_context = self.get_serializer_context()
        return Response({
            'nearby': {
                'title': '基于网络IP的周边低空旅行',
                'current_city': nearby_city,
                'cities': nearby_cities,
                'items': DestinationSerializer(nearby_selected, many=True, context=serializer_context).data,
            },
            'managed': {
                'title': '探索更多低空旅行目的地',
                'current_city': managed_city,
                'cities': managed_cities,
                'items': DestinationSerializer(managed_selected, many=True, context=serializer_context).data,
            }
        })

    @action(detail=False, methods=['get'])
    def smart_recommend(self, request):
        """智能推荐：基于综合评分+时间衰减算法"""
        import math
        from datetime import datetime, timezone
        from django.db import connection
        
        # 获取查询参数
        is_domestic = request.query_params.get('is_domestic')  # 默认为None，不过滤
        city = request.query_params.get('city')
        recommendation_type = request.query_params.get('recommendation_type')
        
        # 构建查询
        queryset = Destination.objects.all()
        
        # 应用过滤（只有当参数明确提供时才过滤）
        if is_domestic is not None:
            queryset = queryset.filter(is_domestic=is_domestic.lower() == 'true')
        if city:
            queryset = queryset.filter(city=city)
        
        # 获取所有目的地
        destinations = list(queryset)
        
        # 调试日志：打印目的地统计信息
        print(f"\n=== smart_recommend API 调试 ===")
        print(f"查询参数: is_domestic={is_domestic}, city={city}, recommendation_type={recommendation_type}")
        print(f"查询到的目的地总数: {len(destinations)}")
        domestic_count = sum(1 for d in destinations if d.is_domestic)
        overseas_count = sum(1 for d in destinations if not d.is_domestic)
        print(f"国内目的地: {domestic_count}个, 国外目的地: {overseas_count}个")
        if destinations:
            print(f"目的地列表:")
            for d in destinations[:10]:  # 只打印前10个
                print(f"  - {d.name} (is_domestic={d.is_domestic}, country={d.country})")
        print(f"==============================\n")
        
        # 如果指定了recommendation_type，在Python中过滤（兼容SQLite）
        if recommendation_type:
            destinations = [dest for dest in destinations if recommendation_type in (dest.recommendation_type or [])]
        
        if not destinations:
            return Response([])
        
        # 计算max_views用于标准化
        max_views = max([d.views for d in destinations] + [0])
        
        def get_days_since_created(created_time):
            """计算发布时间距今天数"""
            now = datetime.now(timezone.utc)
            if created_time.tzinfo is None:
                created_time = created_time.replace(tzinfo=timezone.utc)
            delta = now - created_time
            return max(delta.days, 0)
        
        def normalize_rating(rating):
            """rating标准化到0~1"""
            if not rating:
                return 0
            return min(rating / 5, 1)
        
        def normalize_views(views, max_views):
            """浏览量标准化"""
            if not views or not max_views:
                return 0
            return min(views / max_views, 1)
        
        def normalize_hot(is_hot):
            """热门标记"""
            return 1 if is_hot else 0
        
        def calculate_base_score(item, max_views):
            """计算基础评分"""
            rating_score = normalize_rating(item.rating)
            views_score = normalize_views(item.views, max_views)
            hot_score = normalize_hot(item.is_hot)
            
            base_score = (
                0.40 * rating_score +
                0.35 * views_score +
                0.25 * hot_score
            )
            return round(base_score, 4)
        
        def apply_time_decay(base_score, created_time, decay_lambda=0.03):
            """应用时间衰减"""
            days = get_days_since_created(created_time)
            final_score = base_score * math.exp(-decay_lambda * days)
            return round(final_score, 4)
        
        # 为每个目的地计算分数
        scored_destinations = []
        for dest in destinations:
            base_score = calculate_base_score(dest, max_views)
            final_score = apply_time_decay(base_score, dest.created_at, decay_lambda=0.03)
            scored_destinations.append({
                'destination': dest,
                'sort_order': dest.sort_order,
                'base_score': base_score,
                'final_score': final_score
            })
        
        # 排序：先按sort_order（升序），再按final_score（降序）
        scored_destinations.sort(key=lambda x: (x['sort_order'], -x['final_score']))
        
        # 序列化结果
        serializer_context = self.get_serializer_context()
        result = []
        for item in scored_destinations:
            dest_data = DestinationSerializer(item['destination'], context=serializer_context).data
            dest_data['recommend_score'] = item['final_score']
            dest_data['base_score'] = item['base_score']
            result.append(dest_data)
        
        return Response(result)

    @action(detail=True, methods=['post'])
    def increment_views(self, request, pk=None):
        """增加浏览次数"""
        destination = self.get_object()
        destination.views += 1
        destination.save()
        return Response({'views': destination.views})


# 政策法规视图集
class PolicyViewSet(PublicModelViewSet):
    queryset = Policy.objects.all()
    serializer_class = PolicySerializer
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['title', 'department', 'content']
    ordering_fields = ['created_at', 'publish_date']

    @action(detail=True, methods=['post'])
    def increment_views(self, request, pk=None):
        """增加浏览次数"""
        policy = self.get_object()
        policy.views += 1
        policy.save()
        return Response({'views': policy.views})

    @action(detail=False, methods=['post'], permission_classes=[IsAuthenticated])
    def fetch_from_url(self, request):
        from .fetchers import PolicyFetcher

        url = request.data.get('url')
        if not url:
            return Response({'error': '请提供URL'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            fetcher = PolicyFetcher(url)
            data = fetcher.fetch()
            return Response(data)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=['post'], permission_classes=[IsAuthenticated])
    def format_content(self, request):
        """独立的内容格式化功能（不生成摘要）"""
        content = request.data.get('content', '').strip()
        if not content:
            return Response({'error': '请提供内容'}, status=status.HTTP_400_BAD_REQUEST)

        format_prompt = (
            f"请将以下文本整理为规范的 HTML 格式，要求：\n"
            f"1. 识别标题层级，使用 <h2>、<h3>、<h4> 标签\n"
            f"2. 段落使用 <p> 标签，段落首行缩进 2 字符（使用 &emsp;&emsp;）\n"
            f"3. 去除多余空格、换行和无用符号\n"
            f"4. 保持内容完整，不要省略\n"
            f"5. 只输出 HTML 代码，不要包含任何解释\n\n"
            f"原文：\n{content}"
        )

        try:
            from openai import OpenAI
            from ai.config import QIANWEN_API_KEY, QIANWEN_BASE_URL

            client = OpenAI(api_key=QIANWEN_API_KEY, base_url=QIANWEN_BASE_URL)
            
            format_resp = client.chat.completions.create(
                model='qwen-turbo',
                messages=[{'role': 'user', 'content': format_prompt}],
                max_tokens=4000,
                temperature=0.2,
            )
            formatted_content = format_resp.choices[0].message.content.strip()
            formatted_content = re.sub(r'^```(?:html)?\s*', '', formatted_content, flags=re.MULTILINE)
            formatted_content = re.sub(r'```\s*$', '', formatted_content, flags=re.MULTILINE).strip()
            
            return Response({'formatted_content': formatted_content})
        except Exception as e:
            logger.error(f'格式化失败: {str(e)}')
            return Response({'error': f'格式化失败: {str(e)}'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=False, methods=['post'], permission_classes=[IsAuthenticated])
    def ai_summary(self, request):
        """对政策全文进行 AI 摘要 + 格式化原文"""
        content = request.data.get('content', '').strip()
        title = request.data.get('title', '').strip()
        if not content:
            return Response({'error': '请提供政策内容'}, status=status.HTTP_400_BAD_REQUEST)

        text_for_ai = content[:3000]
        summary_prompt = (
            f"请对以下政策法规内容进行分析，输出严格的 JSON 格式，不要包含任何 Markdown 代码块标记。"
            f"JSON 结构如下："
            f'{{"summary": "100字以内的关键摘要", '
            f'"key_points": ["核心观点1", "核心观点2", "核心观点3"], '
            f'"tags": ["标签1", "标签2", "标签3"], '
            f'"category": "最匹配的分类（安全管理/运营规范/市场监管/环境保护/基础设施/综合政策之一）"}}\n\n'
            f"标题：{title}\n\n内容：{text_for_ai}"
        )

        format_prompt = (
            f"请将以下文本整理为规范的 HTML 格式，要求：\n"
            f"1. 识别标题层级，使用 <h2>、<h3>、<h4> 标签\n"
            f"2. 段落使用 <p> 标签，段落首行缩进 2 字符（使用 &emsp;&emsp;）\n"
            f"3. 去除多余空格、换行和无用符号\n"
            f"4. 保持内容完整，不要省略\n"
            f"5. 只输出 HTML 代码，不要包含任何解释\n\n"
            f"原文：\n{content}"
        )

        try:
            from openai import OpenAI
            from ai.config import QIANWEN_API_KEY, QIANWEN_BASE_URL
            import json as _json

            client = OpenAI(api_key=QIANWEN_API_KEY, base_url=QIANWEN_BASE_URL)
            
            # 1. 生成摘要
            summary_resp = client.chat.completions.create(
                model='qwen-turbo',
                messages=[{'role': 'user', 'content': summary_prompt}],
                max_tokens=800,
                temperature=0.3,
            )
            raw = summary_resp.choices[0].message.content.strip()
            raw = re.sub(r'^```(?:json)?\s*', '', raw, flags=re.MULTILINE)
            raw = re.sub(r'```\s*$', '', raw, flags=re.MULTILINE).strip()
            result = _json.loads(raw)
            
            # 2. 格式化原文
            format_resp = client.chat.completions.create(
                model='qwen-turbo',
                messages=[{'role': 'user', 'content': format_prompt}],
                max_tokens=4000,
                temperature=0.2,
            )
            formatted_content = format_resp.choices[0].message.content.strip()
            formatted_content = re.sub(r'^```(?:html)?\s*', '', formatted_content, flags=re.MULTILINE)
            formatted_content = re.sub(r'```\s*$', '', formatted_content, flags=re.MULTILINE).strip()
            
            result['formatted_content'] = formatted_content
            return Response(result)
        except Exception as e:
            logger.error(f'AI 处理失败: {str(e)}')
            return Response({'error': f'AI 处理失败: {str(e)}'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

# 新闻资讯视图集
class NewsViewSet(PublicModelViewSet):
    queryset = News.objects.all()
    serializer_class = NewsSerializer
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['title', 'content', 'author']
    ordering_fields = ['created_at', 'publish_date', 'views']

    @action(detail=True, methods=['post'])
    def increment_views(self, request, pk=None):
        """增加浏览次数"""
        news = self.get_object()
        news.views += 1
        news.save()
        return Response({'views': news.views})

    @action(detail=False, methods=['post'], permission_classes=[IsAuthenticated])
    def fetch_from_url(self, request):
        from .fetchers import NewsFetcher

        url = request.data.get('url')
        if not url:
            return Response({'error': '请提供URL'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            fetcher = NewsFetcher(url)
            data = fetcher.fetch()
            return Response(data)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=['post'], permission_classes=[IsAuthenticated])
    def format_content(self, request):
        """独立的内容格式化功能（不生成摘要）"""
        content = request.data.get('content', '').strip()
        if not content:
            return Response({'error': '请提供内容'}, status=status.HTTP_400_BAD_REQUEST)

        format_prompt = (
            f"请将以下文本整理为规范的 HTML 格式，要求：\n"
            f"1. 识别标题层级，使用 <h2>、<h3>、<h4> 标签\n"
            f"2. 段落使用 <p> 标签，段落首行缩进 2 字符（使用 &emsp;&emsp;）\n"
            f"3. 去除多余空格、换行和无用符号\n"
            f"4. 保持内容完整，不要省略\n"
            f"5. 只输出 HTML 代码，不要包含任何解释\n\n"
            f"原文：\n{content}"
        )

        try:
            from openai import OpenAI
            from ai.config import QIANWEN_API_KEY, QIANWEN_BASE_URL

            client = OpenAI(api_key=QIANWEN_API_KEY, base_url=QIANWEN_BASE_URL)
            
            format_resp = client.chat.completions.create(
                model='qwen-turbo',
                messages=[{'role': 'user', 'content': format_prompt}],
                max_tokens=4000,
                temperature=0.2,
            )
            formatted_content = format_resp.choices[0].message.content.strip()
            formatted_content = re.sub(r'^```(?:html)?\s*', '', formatted_content, flags=re.MULTILINE)
            formatted_content = re.sub(r'```\s*$', '', formatted_content, flags=re.MULTILINE).strip()
            
            return Response({'formatted_content': formatted_content})
        except Exception as e:
            logger.error(f'格式化失败: {str(e)}')
            return Response({'error': f'格式化失败: {str(e)}'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=False, methods=['post'], permission_classes=[IsAuthenticated])
    def ai_summary(self, request):
        """对新闻全文进行 AI 摘要 + 格式化原文"""
        content = request.data.get('content', '').strip()
        title = request.data.get('title', '').strip()
        if not content:
            return Response({'error': '请提供新闻内容'}, status=status.HTTP_400_BAD_REQUEST)

        text_for_ai = content[:3000]
        summary_prompt = (
            f"请对以下新闻内容进行分析，输出严格的 JSON 格式，不要包含任何 Markdown 代码块标记。"
            f"JSON 结构如下："
            f'{{"summary": "100字以内的关键摘要", '
            f'"key_points": ["核心观点1", "核心观点2", "核心观点3"], '
            f'"tags": ["标签1", "标签2", "标签3"], '
            f'"category": "最匹配的分类（行业动态/政策解读/技术创新/企业新闻/市场分析之一）"}}\n\n'
            f"标题：{title}\n\n内容：{text_for_ai}"
        )

        format_prompt = (
            f"请将以下文本整理为规范的 HTML 格式，要求：\n"
            f"1. 识别标题层级，使用 <h2>、<h3>、<h4> 标签\n"
            f"2. 段落使用 <p> 标签，段落首行缩进 2 字符（使用 &emsp;&emsp;）\n"
            f"3. 去除多余空格、换行和无用符号\n"
            f"4. 保持内容完整，不要省略\n"
            f"5. 只输出 HTML 代码，不要包含任何解释\n\n"
            f"原文：\n{content}"
        )

        try:
            from openai import OpenAI
            from ai.config import QIANWEN_API_KEY, QIANWEN_BASE_URL
            import json as _json

            client = OpenAI(api_key=QIANWEN_API_KEY, base_url=QIANWEN_BASE_URL)
            
            # 1. 生成摘要
            summary_resp = client.chat.completions.create(
                model='qwen-turbo',
                messages=[{'role': 'user', 'content': summary_prompt}],
                max_tokens=800,
                temperature=0.3,
            )
            raw = summary_resp.choices[0].message.content.strip()
            raw = re.sub(r'^```(?:json)?\s*', '', raw, flags=re.MULTILINE)
            raw = re.sub(r'```\s*$', '', raw, flags=re.MULTILINE).strip()
            result = _json.loads(raw)
            
            # 2. 格式化原文
            format_resp = client.chat.completions.create(
                model='qwen-turbo',
                messages=[{'role': 'user', 'content': format_prompt}],
                max_tokens=4000,
                temperature=0.2,
            )
            formatted_content = format_resp.choices[0].message.content.strip()
            formatted_content = re.sub(r'^```(?:html)?\s*', '', formatted_content, flags=re.MULTILINE)
            formatted_content = re.sub(r'```\s*$', '', formatted_content, flags=re.MULTILINE).strip()
            
            result['formatted_content'] = formatted_content
            return Response(result)
        except Exception as e:
            logger.error(f'AI 处理失败: {str(e)}')
            return Response({'error': f'AI 处理失败: {str(e)}'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# 安全隐患视图集
class SafetyAlertViewSet(PublicModelViewSet):
    queryset = SafetyAlert.objects.all()
    serializer_class = SafetyAlertSerializer
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['title', 'description']
    ordering_fields = ['created_at', 'report_date']


# 留言反馈视图集
class MessageViewSet(PublicModelViewSet):
    queryset = Message.objects.all()
    serializer_class = MessageSerializer
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['content']
    ordering_fields = ['created_at', 'likes_count']

    def get_permissions(self):
        """
        未登录用户只能查看留言；
        登录用户才能创建留言、回复、修改、删除，以及查看自己的留言列表。
        """
        if self.action in ['create', 'reply', 'update', 'partial_update', 'destroy', 'my', 'like', 'unlike', 'add_comment']:
            permission_classes = [IsAuthenticated]
        else:
            permission_classes = [AllowAny]
        return [permission() for permission in permission_classes]

    def get_serializer_context(self):
        context = super().get_serializer_context()
        context['request'] = self.request
        return context

    def perform_create(self, serializer):
        """创建留言时关联当前用户（已登录才允许创建）"""
        serializer.save(user=self.request.user)

    @action(detail=True, methods=['patch'])
    def reply(self, request, pk=None):
        """回复留言（仅登录用户使用后台回复）"""
        message = self.get_object()
        reply_content = request.data.get('reply')
        if reply_content:
            message.reply = reply_content
            message.status = '已回复'
            message.save()
            serializer = self.get_serializer(message)
            return Response(serializer.data)
        return Response({'error': '回复内容不能为空'}, status=400)

    @action(detail=False, methods=['get'])
    def my(self, request):
        """当前用户自己发表的留言列表"""
        qs = self.get_queryset().filter(user=request.user).order_by('-created_at')
        serializer = self.get_serializer(qs, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def like(self, request, pk=None):
        """点赞留言"""
        message = self.get_object()
        user = request.user
        
        # 检查是否已经点赞
        if MessageLike.objects.filter(message=message, user=user).exists():
            return Response({'error': '您已经点赞过了'}, status=400)
        
        # 创建点赞记录
        MessageLike.objects.create(message=message, user=user)
        
        # 更新点赞数
        message.likes_count += 1
        message.save()
        
        serializer = self.get_serializer(message)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def unlike(self, request, pk=None):
        """取消点赞"""
        message = self.get_object()
        user = request.user
        
        # 查找点赞记录
        like = MessageLike.objects.filter(message=message, user=user).first()
        if not like:
            return Response({'error': '您还没有点赞'}, status=400)
        
        # 删除点赞记录
        like.delete()
        
        # 更新点赞数
        message.likes_count = max(0, message.likes_count - 1)
        message.save()
        
        serializer = self.get_serializer(message)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def add_comment(self, request, pk=None):
        """添加评论"""
        message = self.get_object()
        content = request.data.get('content')
        
        if not content:
            return Response({'error': '评论内容不能为空'}, status=400)
        
        comment = MessageComment.objects.create(
            message=message,
            user=request.user,
            content=content
        )
        
        serializer = MessageCommentSerializer(comment)
        return Response(serializer.data, status=201)

    @action(detail=True, methods=['get'])
    def comments(self, request, pk=None):
        """获取留言的所有评论"""
        message = self.get_object()
        comments = message.comments.all()
        serializer = MessageCommentSerializer(comments, many=True)
        return Response(serializer.data)


# 统计数据视图集
class StatisticViewSet(PublicModelViewSet):
    queryset = Statistic.objects.all()
    serializer_class = StatisticSerializer
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['region']
    ordering_fields = ['year', 'region']


# 留言评论视图集
class MessageCommentViewSet(PublicModelViewSet):
    queryset = MessageComment.objects.all()
    serializer_class = MessageCommentSerializer
    permission_classes = [IsAuthenticated]

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


# LowSkyAI 智能助手视图集
class LowSkyAIViewSet(viewsets.ViewSet):
    """LowSkyAI智能助手API"""
    authentication_classes = [TokenAuthentication]
    permission_classes = [AllowAny]
    
    @action(detail=False, methods=['post'])
    def chat(self, request):
        """与AI对话（非流式）"""
        message = request.data.get('message')
        context = request.data.get('context', {})
        
        if not message:
            return Response({'error': '消息不能为空'}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            response = lowsky_ai.chat(message, context, stream=False)
            return Response(response)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    @action(detail=False, methods=['post'])
    def chat_stream(self, request):
        """与AI对话（流式）
        
        支持 tool_mode 参数：
          - 'auto'     : 默认，AI 自行决定是否调用工具
          - 'db_only'  : 强制只查询本地数据库（db_query 工具）
          - 'web_only' : 强制只使用联网搜索（search_web 工具）
        """
        from django.http import StreamingHttpResponse
        import json
        
        message = request.data.get('message')
        context = request.data.get('context', {})
        tool_mode = request.data.get('tool_mode', 'auto')  # 新增：工具模式
        
        if not message:
            return Response({'error': '消息不能为空'}, status=status.HTTP_400_BAD_REQUEST)
        
        def event_stream():
            try:
                # ── 本地数据库模式：直接走 qwen-turbo 快速链路 ────────────────
                if tool_mode == 'db_only':
                    from ai.db_tools import get_db, get_llm, SQLDatabaseChain
                    from ai.config import QIANWEN_API_KEY, QIANWEN_BASE_URL
                    
                    yield f"data: {json.dumps({'content': '🔍 正在查询本地数据库...'})}\n\n"
                    
                    db = get_db()
                    llm = get_llm(
                        api_key=QIANWEN_API_KEY,
                        api_base=QIANWEN_BASE_URL,
                    )  # 内部固定使用 qwen-turbo
                    db_chain = SQLDatabaseChain.from_llm(llm, db)
                    result = db_chain.run(message)
                    
                    # 分块输出结果（模拟流式）
                    chunk_size = 20
                    for i in range(0, len(result), chunk_size):
                        yield f"data: {json.dumps({'content': result[i:i+chunk_size]})}\n\n"
                    yield f"data: {json.dumps({'done': True})}\n\n"
                    return
                
                # ── 联网搜索模式：在消息前加强制指令 ────────────────────────
                forced_message = message
                if tool_mode == 'web_only':
                    forced_message = f'[强制使用联网搜索，必须调用search_web工具] {message}'
                
                for chunk in lowsky_ai.chat_stream(forced_message, context):
                    yield f"data: {json.dumps({'content': chunk})}\n\n"
                yield f"data: {json.dumps({'done': True})}\n\n"
            except Exception as e:
                yield f"data: {json.dumps({'error': str(e)})}\n\n"
        
        response = StreamingHttpResponse(event_stream(), content_type='text/event-stream')
        response['Cache-Control'] = 'no-cache'
        response['X-Accel-Buffering'] = 'no'
        return response
    
    @action(detail=False, methods=['post'], permission_classes=[IsAuthenticated])
    def add_model(self, request):
        """添加AI模型配置（需要管理员权限）"""
        if not request.user.is_staff:
            return Response({'error': '需要管理员权限'}, status=status.HTTP_403_FORBIDDEN)
        
        model_id = request.data.get('model_id')
        model_name = request.data.get('model_name')
        api_key = request.data.get('api_key')
        api_base = request.data.get('api_base')
        max_tokens = request.data.get('max_tokens', 8000)
        temperature = request.data.get('temperature', 0.7)
        
        if not all([model_id, model_name, api_key]):
            return Response({'error': '缺少必要参数'}, status=status.HTTP_400_BAD_REQUEST)
        
        success = lowsky_ai.add_model(
            model_id=model_id,
            model_name=model_name,
            api_key=api_key,
            api_base=api_base,
            max_tokens=max_tokens,
            temperature=temperature
        )
        
        if success:
            return Response({'message': '模型添加成功', 'model_id': model_id})
        else:
            return Response({'error': '模型添加失败'}, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=False, methods=['delete'], permission_classes=[IsAuthenticated])
    def remove_model(self, request):
        """移除AI模型配置（需要管理员权限）"""
        if not request.user.is_staff:
            return Response({'error': '需要管理员权限'}, status=status.HTTP_403_FORBIDDEN)
        
        model_id = request.data.get('model_id')
        if not model_id:
            return Response({'error': '缺少model_id参数'}, status=status.HTTP_400_BAD_REQUEST)
        
        success = lowsky_ai.remove_model(model_id)
        if success:
            return Response({'message': '模型移除成功'})
        else:
            return Response({'error': '模型不存在'}, status=status.HTTP_404_NOT_FOUND)
    
    @action(detail=False, methods=['post'], permission_classes=[IsAuthenticated])
    def switch_model(self, request):
        """切换当前使用的模型（需要管理员权限）"""
        if not request.user.is_staff:
            return Response({'error': '需要管理员权限'}, status=status.HTTP_403_FORBIDDEN)
        
        model_id = request.data.get('model_id')
        if not model_id:
            return Response({'error': '缺少model_id参数'}, status=status.HTTP_400_BAD_REQUEST)
        
        success = lowsky_ai.switch_model(model_id)
        if success:
            return Response({'message': '模型切换成功', 'current_model': model_id})
        else:
            return Response({'error': '模型不存在'}, status=status.HTTP_404_NOT_FOUND)
    
    @action(detail=False, methods=['get'])
    def models(self, request):
        """获取所有已配置的模型"""
        models = lowsky_ai.get_models()
        return Response({'models': models})
    
    @action(detail=False, methods=['get'])
    def history(self, request):
        """获取对话历史"""
        limit = int(request.query_params.get('limit', 10))
        history = lowsky_ai.get_history(limit)
        return Response({'history': history})
    
    @action(detail=False, methods=['post'])
    def clear_history(self, request):
        """清空对话历史"""
        lowsky_ai.clear_history()
        return Response({'message': '对话历史已清空'})

@api_view(['POST'])
@permission_classes([AllowAny])
def clear_ai_history(request):
    """Clear AI conversation history"""
    try:
        lowsky_ai.clear_history()
        return Response({
            'success': True,
            'message': 'Conversation history cleared'
        })
    except Exception as e:
        return Response({
            'success': False,
            'error': str(e)
        }, status=500)

