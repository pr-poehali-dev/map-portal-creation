import json
import zipfile
import io
import base64
import xml.etree.ElementTree as ET
import math
from typing import List, Dict, Tuple, Optional

def msk50_to_wgs84(x: float, y: float) -> Tuple[float, float]:
    '''
    Конвертация координат из МСК-50 (Projection Gauss-Kruger, зона 1) в WGS-84
    '''
    a = 6378137.0
    e2 = 0.00669438002290
    n = 1.0
    
    x0 = 500000.0
    y0 = -5714743.504
    lat0 = 55.0 * math.pi / 180
    lon0 = 37.5 * math.pi / 180
    
    x_rel = x - x0
    y_rel = y - y0
    
    M0 = a * ((1 - e2/4 - 3*e2*e2/64 - 5*e2*e2*e2/256) * lat0)
    M = M0 + y_rel / n
    
    mu = M / (a * (1 - e2/4 - 3*e2*e2/64 - 5*e2*e2*e2/256))
    
    e1 = (1 - math.sqrt(1 - e2)) / (1 + math.sqrt(1 - e2))
    
    phi1 = mu + (3*e1/2 - 27*e1*e1*e1/32) * math.sin(2*mu)
    phi1 += (21*e1*e1/16 - 55*e1*e1*e1*e1/32) * math.sin(4*mu)
    phi1 += (151*e1*e1*e1/96) * math.sin(6*mu)
    
    N1 = a / math.sqrt(1 - e2 * math.sin(phi1)**2)
    T1 = math.tan(phi1)**2
    C1 = e2 * math.cos(phi1)**2 / (1 - e2)
    R1 = a * (1 - e2) / ((1 - e2 * math.sin(phi1)**2)**1.5)
    D = x_rel / (N1 * n)
    
    lat = phi1 - (N1 * math.tan(phi1) / R1) * (D*D/2 - (5 + 3*T1 + 10*C1 - 4*C1*C1 - 9*e2) * D**4/24)
    lat += (N1 * math.tan(phi1) / R1) * (61 + 90*T1 + 298*C1 + 45*T1*T1 - 252*e2 - 3*C1*C1) * D**6/720
    
    lon = (D - (1 + 2*T1 + C1) * D**3/6 + (5 - 2*C1 + 28*T1 - 3*C1*C1 + 8*e2 + 24*T1*T1) * D**5/120) / math.cos(phi1)
    lon = lon0 + lon
    
    lat_deg = lat * 180 / math.pi
    lon_deg = lon * 180 / math.pi
    
    return lat_deg, lon_deg

def parse_egrn_xml(xml_content: str) -> Optional[Dict]:
    '''
    Парсинг XML выписки ЕГРН и извлечение данных участка
    '''
    try:
        root = ET.fromstring(xml_content)
        
        ns = {
            'extract': 'urn:ExtractAboutPropertyLand',
            'smev': 'urn://x-artefacts-smev-gov-ru/supplementary/commons/1.0.1',
            'spa': 'urn://x-artefacts-rosreestr-ru/commons/complex-types/entity-spatial/5.0.1'
        }
        
        result = {}
        
        cad_number = root.find('.//extract:CadastralNumber', ns)
        if cad_number is not None:
            result['cadastral_number'] = cad_number.text
        
        area = root.find('.//extract:Area', ns)
        if area is not None:
            result['area'] = float(area.text)
        
        category = root.find('.//extract:CategoryType', ns)
        if category is not None:
            result['category'] = category.text
        
        permitted_use = root.find('.//extract:PermittedUseText', ns)
        if permitted_use is not None:
            result['permitted_use'] = permitted_use.text
        
        address = root.find('.//extract:Address/extract:Content', ns)
        if address is not None:
            result['address'] = address.text
        
        coordinates = []
        entity_spatial = root.findall('.//spa:EntitySpatial', ns)
        
        for entity in entity_spatial:
            spatials = entity.findall('.//spa:SpatialElement', ns)
            for spatial in spatials:
                ordinates = spatial.findall('.//spa:Ordinate', ns)
                coords_text = ''.join([ord.text for ord in ordinates if ord.text])
                
                if coords_text:
                    coords_list = coords_text.split()
                    for i in range(0, len(coords_list), 2):
                        if i + 1 < len(coords_list):
                            x = float(coords_list[i])
                            y = float(coords_list[i + 1])
                            lat, lon = msk50_to_wgs84(x, y)
                            coordinates.append([lon, lat])
        
        if not coordinates:
            coords_elem = root.findall('.//extract:Ordinate', ns)
            if coords_elem:
                coords_text = ''.join([c.text for c in coords_elem if c.text])
                coords_list = coords_text.split()
                for i in range(0, len(coords_list), 2):
                    if i + 1 < len(coords_list):
                        x = float(coords_list[i])
                        y = float(coords_list[i + 1])
                        lat, lon = msk50_to_wgs84(x, y)
                        coordinates.append([lon, lat])
        
        if coordinates:
            result['coordinates'] = coordinates
            return result
        
        return None
        
    except Exception as e:
        print(f"Error parsing XML: {str(e)}")
        return None

def handler(event: dict, context) -> dict:
    '''
    Обработка ZIP-файла с выпиской ЕГРН, парсинг XML и конвертация координат из МСК-50 в WGS-84
    '''
    method = event.get('httpMethod', 'POST')
    
    if method == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, X-User-Id'
            },
            'body': ''
        }
    
    if method != 'POST':
        return {
            'statusCode': 405,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({'error': 'Method not allowed'})
        }
    
    try:
        body_text = event.get('body', '{}')
        if not body_text or body_text.strip() == '':
            return {
                'statusCode': 400,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'body': json.dumps({'error': 'No file provided'})
            }
        
        body = json.loads(body_text)
        
        if 'file' not in body:
            return {
                'statusCode': 400,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'body': json.dumps({'error': 'No file provided'})
            }
        
        file_data = base64.b64decode(body['file'])
        
        zip_buffer = io.BytesIO(file_data)
        
        results = []
        
        with zipfile.ZipFile(zip_buffer, 'r') as zip_ref:
            for file_name in zip_ref.namelist():
                if file_name.endswith('.xml'):
                    xml_content = zip_ref.read(file_name).decode('utf-8')
                    parsed_data = parse_egrn_xml(xml_content)
                    
                    if parsed_data and 'coordinates' in parsed_data:
                        results.append({
                            'file_name': file_name,
                            'data': parsed_data
                        })
        
        if not results:
            return {
                'statusCode': 400,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'body': json.dumps({'error': 'No valid EGRN data found in ZIP'})
            }
        
        return {
            'statusCode': 200,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({
                'success': True,
                'parcels': results,
                'count': len(results)
            })
        }
        
    except zipfile.BadZipFile:
        return {
            'statusCode': 400,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({'error': 'Invalid ZIP file'})
        }
    except Exception as e:
        return {
            'statusCode': 500,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({'error': f'Server error: {str(e)}'})
        }