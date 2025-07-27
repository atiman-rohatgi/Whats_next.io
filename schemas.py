# backend/app/schemas.py
from pydantic import BaseModel

# This is the NEW schema you need to add for the response
class User(BaseModel):
    id: int
    username: str

    class Config:
        from_attributes = True # Allows Pydantic to work with SQLAlchemy models

# This is your existing schema for the input
class UserCreate(BaseModel):
    username: str
    password: str

# This is your existing schema for the token
class Token(BaseModel):
    access_token: str
    token_type: str