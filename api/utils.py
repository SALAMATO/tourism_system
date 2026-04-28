import requests
from django.conf import settings


def get_client_ip(request):
    """
    获取客户端真实IP地址
    """
    x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
    if x_forwarded_for:
        ip = x_forwarded_for.split(',')[0].strip()
    else:
        ip = request.META.get('REMOTE_ADDR', '127.0.0.1')
    return ip


def parse_location_by_ip(ip):
    """
    根据IP地址解析地理位置信息
    
    Args:
        ip: 客户端IP地址
        
    Returns:
        dict: 包含国家、省份、城市、经纬度等信息的字典，失败时返回None
    """
    # 高德地图IP定位API
    amap_key = getattr(settings, 'AMAP_API_KEY', '8fe3ebb5ad6cfbb67e7394f20668e0c7')
    
    try:
        # 如果是本地IP，不传ip参数给高德API，让它自动识别请求来源IP
        is_local_ip = ip in ['127.0.0.1', 'localhost', '::1', '0.0.0.0']
        
        if is_local_ip:
            amap_url = f'https://restapi.amap.com/v3/ip?key={amap_key}'
        else:
            amap_url = f'https://restapi.amap.com/v3/ip?key={amap_key}&ip={ip}'
        
        response = requests.get(amap_url, timeout=3)
        data = response.json()
        
        if data.get('status') != '1':
            print(f'高德地图API调用失败: {data.get("info", "未知错误")}')
            return None
        
        # 提取位置信息
        country = data.get('country', '中国')
        province = data.get('province', '')
        city = data.get('city', '')
        
        # 处理直辖市等情况
        if not city or city == '[]':
            city = province
            
        # 去除后缀
        province = province.replace('省', '').replace('自治区', '').replace('市', '').strip()
        city = city.replace('市', '').strip()
        
        # 获取经纬度（矩形区域中心点）
        rectangle = data.get('rectangle', '')
        latitude = None
        longitude = None
        
        if rectangle:
            try:
                # rectangle格式: "左下角经度,左下角纬度;右上角经度,右上角纬度"
                coords = rectangle.split(';')
                if len(coords) == 2:
                    left_bottom = coords[0].split(',')
                    right_top = coords[1].split(',')
                    
                    if len(left_bottom) == 2 and len(right_top) == 2:
                        # 计算中心点
                        longitude = round((float(left_bottom[0]) + float(right_top[0])) / 2, 6)
                        latitude = round((float(left_bottom[1]) + float(right_top[1])) / 2, 6)
            except Exception as e:
                print(f'解析经纬度失败: {str(e)}')
        
        result = {
            'country': country,
            'province': province,
            'city': city,
            'latitude': latitude,
            'longitude': longitude,
        }
        
        return result
        
    except Exception as e:
        print(f'IP位置解析失败: {str(e)}')
        return None
