import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestRegressor
from sklearn.preprocessing import StandardScaler
import joblib
from datetime import datetime, timedelta
import tensorflow as tf
from tensorflow import keras
from tensorflow.keras import layers
import redis
import json
import requests

class TransiMioAIService:
    def __init__(self):
        self.redis_client = redis.Redis(
            host='localhost',
            port=6379,
            decode_responses=True
        )
        self.delay_model = self.load_delay_model()
        self.congestion_model = self.load_congestion_model()
        self.anomaly_detector = self.load_anomaly_detector()
        
    def load_delay_model(self):
        """Cargar modelo de predicción de retrasos"""
        try:
            return joblib.load('models/delay_predictor.pkl')
        except:
            return self.train_delay_model()
    
    def train_delay_model(self):
        """Entrenar modelo inicial si no existe"""
        # Obtener datos históricos
        historical_data = self.get_historical_data()
        
        if len(historical_data) < 100:
            return None
            
        X = historical_data[['hour', 'day_of_week', 'route_id', 
                            'weather_score', 'traffic_score']]
        y = historical_data['delay_minutes']
        
        model = RandomForestRegressor(n_estimators=100, random_state=42)
        model.fit(X, y)
        
        joblib.dump(model, 'models/delay_predictor.pkl')
        return model
    
    def predict_delays(self, route_id, hour, day, weather, traffic):
        """Predecir retrasos para una ruta específica"""
        if self.delay_model is None:
            return 0
            
        features = np.array([[hour, day, route_id, weather, traffic]])
        prediction = self.delay_model.predict(features)[0]
        
        return max(0, prediction)
    
    def detect_congestion(self, vehicle_positions):
        """Detectar congestión basada en densidad de vehículos"""
        if len(vehicle_positions) < 5:
            return []
            
        # Algoritmo de clustering para detectar aglomeraciones
        from sklearn.cluster import DBSCAN
        
        coords = np.array([[v['lat'], v['lng']] for v in vehicle_positions])
        clustering = DBSCAN(eps=0.01, min_samples=5).fit(coords)
        
        congestion_points = []
        for label in set(clustering.labels_):
            if label != -1:  # Ignorar ruido
                cluster = coords[clustering.labels_ == label]
                if len(cluster) >= 10:  # Congestión significativa
                    center = cluster.mean(axis=0)
                    congestion_points.append({
                        'lat': float(center[0]),
                        'lng': float(center[1]),
                        'vehicle_count': len(cluster),
                        'severity': 'high' if len(cluster) > 20 else 'medium'
                    })
        
        return congestion_points
    
    def detect_anomalies(self, vehicle_id, current_data):
        """Detectar comportamientos anómalos en vehículos"""
        # Obtener historial del vehículo
        history_key = f'vehicle_history:{vehicle_id}'
        history = self.redis_client.lrange(history_key, 0, -1)
        
        if len(history) < 10:
            return None
            
        # Analizar patrones
        speeds = [float(json.loads(h)['speed']) for h in history]
        avg_speed = np.mean(speeds)
        std_speed = np.std(speeds)
        
        current_speed = current_data.get('speed', 0)
        
        # Detectar velocidad anormal
        if current_speed > avg_speed + 3 * std_speed:
            return {
                'type': 'excessive_speed',
                'severity': 'orange',
                'description': f'Velocidad anormalmente alta: {current_speed} km/h'
            }
        
        # Detectar paradas prolongadas
        if current_speed < 1 and len([s for s in speeds[-5:] if s < 1]) == 5:
            return {
                'type': 'prolonged_stop',
                'severity': 'yellow',
                'description': 'Vehículo detenido por tiempo prolongado'
            }
        
        return None
    
    def recommend_route(self, origin, destination, user_preferences):
        """Recomendar ruta personalizada basada en IA"""
        # Obtener posibles rutas
        routes = self.get_possible_routes(origin, destination)
        
        scored_routes = []
        for route in routes:
            score = 0
            
            # Tiempo estimado
            time_score = 100 / (route['duration'] + 1)
            
            # Transbordos
            transfers_score = 100 / (route['transfers'] + 1)
            
            # Accesibilidad
            accessibility_score = route.get('accessibility_score', 50)
            
            # Preferencias del usuario
            if user_preferences.get('min_transfers'):
                score += transfers_score * 2
            if user_preferences.get('accessible'):
                score += accessibility_score * 3
                
            score += time_score
            
            scored_routes.append({
                **route,
                'score': score
            })
        
        # Ordenar por puntuación
        scored_routes.sort(key=lambda x: x['score'], reverse=True)
        
        return scored_routes[:3]  # Top 3 rutas
    
    def get_historical_data(self):
        """Obtener datos históricos de Google Sheets"""
        # Implementar llamada a API de Sheets
        return pd.DataFrame()
    
    def get_possible_routes(self, origin, destination):
        """Obtener rutas posibles desde motor de rutas"""
        # Integrar con OTP o GraphHopper
        return []

# Inicializar servicio
ai_service = TransiMioAIService()

# API endpoints (FastAPI)
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

app = FastAPI()

class DelayRequest(BaseModel):
    route_id: int
    hour: int
    day: int
    weather: float
    traffic: float

@app.post("/predict/delay")
async def predict_delay(request: DelayRequest):
    prediction = ai_service.predict_delays(
        request.route_id,
        request.hour,
        request.day,
        request.weather,
        request.traffic
    )
    return {"predicted_delay": prediction}

@app.post("/detect/congestion")
async def detect_congestion(positions: list):
    congestion = ai_service.detect_congestion(positions)
    return {"congestion_points": congestion}

@app.post("/detect/anomaly/{vehicle_id}")
async def detect_anomaly(vehicle_id: str, data: dict):
    anomaly = ai_service.detect_anomalies(vehicle_id, data)
    return {"anomaly": anomaly}