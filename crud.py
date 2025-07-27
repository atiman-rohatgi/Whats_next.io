# backend/app/crud.py
from sqlalchemy.orm import Session
from . import models, security, schemas # Make sure 'schemas' is imported

def get_user_by_username(db: Session, username: str):
    return db.query(models.User).filter(models.User.username == username).first()

# CORRECTED: Changed 'models.UserCreate' to 'schemas.UserCreate'
def create_user(db: Session, user: schemas.UserCreate):
    hashed_password = security.hash_password(user.password)
    db_user = models.User(username=user.username, hashed_pw=hashed_password)
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user