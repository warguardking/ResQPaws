from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime, date


class UserCreate(BaseModel):
    full_name: str
    email: EmailStr
    password: str
    role: str = "public"
    phone: Optional[str] = None
    location: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    organization_name: Optional[str] = None
    available_from: Optional[str] = None
    available_to: Optional[str] = None
    services: Optional[str] = None
    emergency_available: bool = False


class UserResponse(BaseModel):
    id: int
    full_name: str
    email: str
    role: str
    phone: Optional[str] = None
    location: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    organization_name: Optional[str] = None
    available_from: Optional[str] = None
    available_to: Optional[str] = None
    services: Optional[str] = None
    emergency_available: bool
    is_available: bool
    is_verified: bool

    class Config:
        from_attributes = True


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str


class RescueRequestCreate(BaseModel):
    animal_type: str
    description: str
    location: str
    latitude: float
    longitude: float
    emergency_level: str = "medium"


class RescueRequestResponse(BaseModel):
    id: int
    reporter_id: int
    accepted_by: Optional[int] = None
    animal_type: str
    description: str
    location: str
    latitude: float
    longitude: float
    emergency_level: str
    status: str
    photo_urls: list[str] = []

    class Config:
        from_attributes = True


class AvailabilityUpdate(BaseModel):
    is_available: bool


class AvailabilityLocationUpdate(BaseModel):
    is_available: bool
    latitude: Optional[float] = None
    longitude: Optional[float] = None


class RescueStatusUpdate(BaseModel):
    status: str


class RescueStatusHistoryResponse(BaseModel):
    id: int
    rescue_request_id: int
    status: str
    updated_by: int
    updated_by_name: str
    created_at: Optional[str] = None

    class Config:
        from_attributes = True


class NotificationResponse(BaseModel):
    id: int
    user_id: int
    rescue_request_id: Optional[int] = None
    announcement_id: Optional[int] = None
    title: str
    message: str
    notification_type: str
    is_read: bool
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class RescueResponseResponse(BaseModel):
    id: int
    rescue_request_id: int
    volunteer_id: int
    response: str
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class RescueDetailsResponse(BaseModel):
    id: int
    reporter_id: int
    accepted_by: Optional[int] = None
    animal_type: str
    description: str
    location: str
    latitude: float
    longitude: float
    emergency_level: str
    status: str
    created_at: Optional[datetime] = None
    photo_urls: list[str] = []

    class Config:
        from_attributes = True


class NearbyHelperResponse(BaseModel):
    id: int
    full_name: str
    role: str
    phone: Optional[str] = None
    location: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    organization_name: Optional[str] = None
    available_from: Optional[str] = None
    available_to: Optional[str] = None
    services: Optional[str] = None
    emergency_available: bool
    is_available: bool
    is_verified: bool
    distance_km: float

    class Config:
        from_attributes = True


class AnnouncementResponse(BaseModel):
    id: int
    author_id: int
    title: str
    description: str
    location: Optional[str] = None
    poster_url: Optional[str] = None
    event_date: Optional[date] = None
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class AIRescueGuidanceResponse(BaseModel):
    observations: str
    immediate_steps: list[str]
    avoid_steps: list[str]
    urgent_help: str
